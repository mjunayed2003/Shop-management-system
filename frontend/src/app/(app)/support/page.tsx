'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  LifeBuoy,
  PlusCircle,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';

export default function TenantSupportPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  // New ticket state
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [invoiceRef, setInvoiceRef] = useState('');

  // Active Thread Modal
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // 1. Fetch own tickets
  const {
    data: ticketsData,
    isLoading: isTicketsLoading,
    refetch: refetchTickets,
  } = useQuery({
    queryKey: ['support', 'tickets', page, statusFilter],
    queryFn: () =>
      api.support.listTickets({
        page,
        limit: 15,
      }),
  });

  // 2. Fetch active ticket thread with gentle polling (15s)
  const {
    data: activeTicket,
    isLoading: isThreadLoading,
    refetch: refetchThread,
  } = useQuery({
    queryKey: ['support', 'thread', selectedTicketId],
    queryFn: () => (selectedTicketId ? api.support.getTicketThread(selectedTicketId) : null),
    enabled: Boolean(selectedTicketId),
    refetchInterval: 15000,
  });

  // Create Ticket Mutation
  const createTicketMutation = useMutation({
    mutationFn: () => {
      const fullDesc = invoiceRef
        ? `[ইনভয়েস রেফারেন্স: ${invoiceRef}]\n\n${newDescription}`
        : newDescription;

      return api.support.createTicket({
        subject: newSubject.trim(),
        description: fullDesc.trim(),
        priority: newPriority,
      });
    },
    onSuccess: () => {
      toast.show('সাপোর্ট টিকিট সফলভাবে তৈরি হয়েছে।', 'success');
      setIsNewTicketOpen(false);
      setNewSubject('');
      setNewDescription('');
      setInvoiceRef('');
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      refetchTickets();
    },
    onError: (err: any) => {
      toast.show(err.message || 'টিকিট তৈরি করা যায়নি।', 'error');
    },
  });

  // Reply Mutation
  const replyMutation = useMutation({
    mutationFn: () => api.support.reply(selectedTicketId!, replyMessage.trim()),
    onSuccess: () => {
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['support', 'thread', selectedTicketId] });
      refetchThread();
      refetchTickets();
    },
    onError: (err: any) => {
      toast.show(err.message || 'উত্তর পাঠানো যায়নি।', 'error');
    },
  });

  // Close Ticket Mutation
  const closeMutation = useMutation({
    mutationFn: () => api.support.close(selectedTicketId!),
    onSuccess: () => {
      toast.show('টিকিট সফলভাবে সম্পন্ন (Closed) করা হয়েছে।', 'info');
      queryClient.invalidateQueries({ queryKey: ['support', 'thread', selectedTicketId] });
      refetchThread();
      refetchTickets();
    },
    onError: (err: any) => {
      toast.show(err.message || 'টিকিট সম্পন্ন করা যায়নি।', 'error');
    },
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge className="bg-rose-600 text-white text-[10px] font-bold">জরুরি (Urgent)</Badge>;
      case 'HIGH':
        return <Badge className="bg-amber-500 text-white text-[10px] font-bold">উচ্চ (High)</Badge>;
      case 'LOW':
        return <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px]">সাধারণ (Low)</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px]">মাঝারি (Medium)</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">উন্মুক্ত (Open)</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold">প্রক্রিয়াধীন (In Progress)</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">সমাধানকৃত (Resolved)</Badge>;
      case 'CLOSED':
        return <Badge variant="outline" className="text-slate-400 text-[10px]">সম্পন্ন (Closed)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <LifeBuoy className="w-8 h-8 text-emerald-600" />
            <span>সাপোর্ট ও হেল্পডেস্ক</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            সফটওয়্যার ব্যবহার, সাবস্ক্রিপশন বা পেমেন্ট সংক্রান্ত যেকোনো সমস্যায় সরাসরি টিকিট খুলুন।
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsNewTicketOpen(true)}
          className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>নতুন টিকিট খুলুন</span>
        </Button>
      </div>

      {/* Tickets List Card */}
      <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>আপনার টিকিটের তালিকা</span>
          </CardTitle>

          {/* Status filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">ফিল্টার:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-700 dark:text-slate-200"
            >
              <option value="">সকল স্ট্যাটাস</option>
              <option value="OPEN">OPEN (উন্মুক্ত)</option>
              <option value="IN_PROGRESS">IN_PROGRESS (প্রক্রিয়াধীন)</option>
              <option value="RESOLVED">RESOLVED (সমাধানকৃত)</option>
              <option value="CLOSED">CLOSED (সম্পন্ন)</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="p-3.5">টিকিট নং</th>
                  <th className="p-3.5">বিষয় (Subject)</th>
                  <th className="p-3.5">অগ্রাধিকার</th>
                  <th className="p-3.5">স্ট্যাটাস</th>
                  <th className="p-3.5">বার্তা সংখ্যা</th>
                  <th className="p-3.5">সর্বশেষ আপডেট</th>
                  <th className="p-3.5 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isTicketsLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      টিকিট লোড হচ্ছে...
                    </td>
                  </tr>
                ) : !ticketsData?.data || ticketsData.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      কোনো সাপোর্ট টিকিট পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  ticketsData.data.map((t: any) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        #{t.ticket_no}
                      </td>
                      <td className="p-3.5 font-medium max-w-xs truncate text-slate-900 dark:text-slate-100">
                        {t.subject}
                      </td>
                      <td className="p-3.5">{getPriorityBadge(t.priority)}</td>
                      <td className="p-3.5">{getStatusBadge(t.status)}</td>
                      <td className="p-3.5 text-slate-500 font-mono">
                        {t._count?.messages || 1} টি
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicketId(t.id);
                          }}
                          className="h-7 text-xs rounded-lg text-emerald-600 hover:text-emerald-700"
                        >
                          কথোপকথন দেখুন
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Ticket Modal */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="max-w-lg p-6 space-y-4 rounded-3xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-1">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              নতুন সাপোর্ট টিকিট তৈরি করুন
            </DialogTitle>
            <DialogDescription className="text-xs">
              সমস্যা বা প্রশ্নের বিবরণ লিখুন। আমাদের সাপোর্ট টিম দ্রুত উত্তর প্রদান করবে।
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">
                বিষয় (Subject) <span className="text-rose-500">*</span>
              </label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="উদাঃ পেমেন্ট ভেরিফিকেশন বা স্টক ক্যালকুলেশন সমস্যা"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">অগ্রাধিকার (Priority)</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="LOW">LOW (সাধারণ)</option>
                  <option value="MEDIUM">MEDIUM (মাঝারি)</option>
                  <option value="HIGH">HIGH (জরুরি)</option>
                  <option value="URGENT">URGENT (অতি জরুরি)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">ইনভয়েস রেফারেন্স (ঐচ্ছিক)</label>
                <Input
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  placeholder="INV-2026-..."
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">
                বিস্তারিত বিবরণ (Description) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="সমস্যাটি বিস্তারিতভাবে বর্ণনা করুন..."
                rows={5}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewTicketOpen(false)}
              className="text-xs h-9 rounded-xl"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={createTicketMutation.isPending || !newSubject.trim() || !newDescription.trim()}
              onClick={() => createTicketMutation.mutate()}
              className="text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
            >
              {createTicketMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1" />
              )}
              টিকিট সাবমিট করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Conversation Thread Modal */}
      <Dialog open={Boolean(selectedTicketId)} onOpenChange={(open) => !open && setSelectedTicketId(null)}>
        <DialogContent className="max-w-2xl p-6 space-y-4 rounded-3xl max-h-[90vh] flex flex-col justify-between">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  #{activeTicket?.ticket_no}
                </span>
                {activeTicket && getStatusBadge(activeTicket.status)}
                {activeTicket && getPriorityBadge(activeTicket.priority)}
              </div>

              {activeTicket?.status !== 'CLOSED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending}
                  className="h-7 text-xs rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300"
                >
                  টিকিট ক্লোজ করুন
                </Button>
              )}
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {activeTicket?.subject}
            </DialogTitle>
          </DialogHeader>

          {/* Messages Thread Container */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[50vh] text-xs">
            {isThreadLoading ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                মেসেজ লোড হচ্ছে...
              </div>
            ) : !activeTicket?.messages || activeTicket.messages.length === 0 ? (
              <div className="p-8 text-center text-slate-400">কোনো বার্তা নেই।</div>
            ) : (
              activeTicket.messages.map((m: any) => {
                const isPlatformAdmin = m.sender_type === 'PLATFORM_ADMIN';

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isPlatformAdmin
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 ml-4 sm:ml-8'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 mr-4 sm:mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800/60 text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {isPlatformAdmin ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 dark:text-emerald-400">
                              সাপোর্ট টিম (Platform Admin)
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-slate-800 dark:text-slate-200">
                              আপনি ({user?.fullName || 'দোকান ইউজার'})
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(m.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
                      {m.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Form */}
          {activeTicket?.status === 'CLOSED' ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center text-xs text-slate-400">
              এই সাপোর্ট টিকিটটি সম্পন্ন (Closed) করা হয়েছে। নতুন অনুসন্ধানের জন্য নতুন টিকিট খুলুন।
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="এখানে আপনার উত্তর বা প্রতিক্রিয়া লিখুন..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => replyMutation.mutate()}
                  disabled={replyMutation.isPending || !replyMessage.trim()}
                  className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <Send className="w-3.5 h-3.5 mr-1" />
                  )}
                  উত্তর পাঠান
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
