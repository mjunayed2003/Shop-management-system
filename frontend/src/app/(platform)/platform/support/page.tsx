'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform-client';
import { usePlatformAuthStore } from '@/lib/store/platform-auth-store';
import { formatDate, formatDateTime } from '@/lib/utils/formatters';
import { useToast } from '@/components/feedback/ToastContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  LifeBuoy,
  MessageSquare,
  Send,
  UserCheck,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Filter,
  User,
  Shield,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function PlatformSupportDeskPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const currentAdmin = usePlatformAuthStore((state) => state.admin);

  const initialBusinessId = searchParams.get('businessId') || '';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Query: Tickets list
  const { data: ticketsData, isLoading: listLoading, refetch: refetchList } = useQuery({
    queryKey: ['platform-support-tickets', page, statusFilter, priorityFilter, initialBusinessId],
    queryFn: () =>
      platformApi.support.list({
        page,
        limit: 30,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
        businessId: initialBusinessId || undefined,
      }),
  });

  // Query: Admins list for assignment
  const { data: adminsList = [] } = useQuery({
    queryKey: ['platform-admins-list-for-support'],
    queryFn: () => platformApi.admins.list().catch(() => []),
  });

  // Automatically select first ticket if none selected
  useEffect(() => {
    if (!selectedTicketId && ticketsData?.data && ticketsData.data.length > 0) {
      setSelectedTicketId(ticketsData.data[0].id);
    }
  }, [ticketsData, selectedTicketId]);

  // Query: Selected Ticket Thread with gentle polling
  const { data: ticketThread, isLoading: threadLoading } = useQuery({
    queryKey: ['platform-support-thread', selectedTicketId],
    queryFn: () => (selectedTicketId ? platformApi.support.getThread(selectedTicketId) : null),
    enabled: Boolean(selectedTicketId),
    refetchInterval: 12000, // gentle 12s polling
  });

  // Mutation: Reply
  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      platformApi.support.reply(id, message),
    onSuccess: () => {
      showToast('Reply dispatched to shop.', 'success');
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['platform-support-thread', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['platform-support-tickets'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to send reply.', 'error');
    },
  });

  // Mutation: Assign Admin
  const assignMutation = useMutation({
    mutationFn: ({ id, adminId }: { id: string; adminId: string }) =>
      platformApi.support.assign(id, adminId),
    onSuccess: () => {
      showToast('Ticket assigned.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-support-thread', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['platform-support-tickets'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to assign ticket.', 'error');
    },
  });

  // Mutation: Update Status
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      platformApi.support.updateStatus(id, status),
    onSuccess: () => {
      showToast('Ticket status updated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-support-thread', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['platform-support-tickets'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update status.', 'error');
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    replyMutation.mutate({
      id: selectedTicketId,
      message: replyText.trim(),
    });
  };

  // Filter tickets by "Assigned to me" in UI if checked
  const displayedTickets = (ticketsData?.data || []).filter((t: any) => {
    if (assignedToMeOnly && currentAdmin) {
      return t.assigned_admin?.id === currentAdmin.id;
    }
    return true;
  });

  // Stats calculation
  const openCount = (ticketsData?.data || []).filter((t: any) => t.status === 'OPEN').length;
  const inProgressCount = (ticketsData?.data || []).filter((t: any) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = (ticketsData?.data || []).filter((t: any) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-indigo-400" />
            Platform Support Desk
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Cross-tenant ticket resolution, billing issue escalations, and merchant communication.
          </p>
        </div>

        {initialBusinessId && (
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs text-indigo-300">
            <span>Filtered for Business UUID:</span>
            <span className="font-mono font-bold text-slate-100">{initialBusinessId.slice(0, 8)}...</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/platform/support')}
              className="text-xs text-indigo-400 hover:text-indigo-200 h-6 px-1.5"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400 font-medium">Open Tickets Awaiting Action</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{openCount}</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400 font-medium">In Progress Under Review</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">{inProgressCount}</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400 font-medium">Resolved / Closed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{resolvedCount}</div>
        </Card>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* Left: Ticket List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Filters Bar */}
          <Card className="bg-slate-900 border-slate-800 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`text-[11px] px-2 py-1 rounded transition-colors ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={assignedToMeOnly}
                  onChange={(e) => setAssignedToMeOnly(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Assigned to Me</span>
              </label>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </Card>

          {/* Ticket Cards List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {listLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : displayedTickets.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-lg text-slate-500 text-xs">
                No tickets match selected criteria.
              </div>
            ) : (
              displayedTickets.map((t: any) => {
                const isSelected = selectedTicketId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/50 shadow-sm'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono text-xs font-semibold text-indigo-400">
                        {t.ticket_no}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            t.priority === 'URGENT'
                              ? 'border-rose-500/50 text-rose-400'
                              : t.priority === 'HIGH'
                              ? 'border-amber-500/50 text-amber-400'
                              : 'border-slate-700 text-slate-400'
                          }`}
                        >
                          {t.priority}
                        </Badge>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${
                            t.status === 'OPEN'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {t.status}
                        </Badge>
                      </div>
                    </div>

                    <p className="font-medium text-slate-200 text-sm mt-1 line-clamp-1">
                      {t.subject}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {t.business?.name || 'Shop'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(t.updated_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Ticket Thread (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          {selectedTicketId && ticketThread ? (
            <Card className="bg-slate-900 border-slate-800 text-slate-100 flex-1 flex flex-col h-full">
              {/* Header */}
              <CardHeader className="border-b border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-400">
                        {ticketThread.ticket_no}
                      </span>
                      <Badge variant="outline">{ticketThread.priority}</Badge>
                    </div>
                    <CardTitle className="text-base text-slate-100 mt-1">
                      {ticketThread.subject}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span
                        onClick={() =>
                          router.push(`/platform/businesses/${ticketThread.business?.id}`)
                        }
                        className="text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        {ticketThread.business?.name}
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </span>
                      <span>•</span>
                      <span>
                        User: {ticketThread.user?.first_name} ({ticketThread.user?.email})
                      </span>
                    </div>
                  </div>

                  {/* Actions: Assign & Status Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={ticketThread.assigned_admin_id || ''}
                      onChange={(e) =>
                        assignMutation.mutate({
                          id: ticketThread.id,
                          adminId: e.target.value,
                        })
                      }
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {currentAdmin && (
                        <option value={currentAdmin.id}>Assign to Me</option>
                      )}
                      {adminsList.map((adm: any) => (
                        <option key={adm.id} value={adm.id}>
                          {adm.first_name} {adm.last_name} ({adm.role})
                        </option>
                      ))}
                    </select>

                    <select
                      value={ticketThread.status}
                      onChange={(e) =>
                        statusMutation.mutate({
                          id: ticketThread.id,
                          status: e.target.value,
                        })
                      }
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>
              </CardHeader>

              {/* Messages Thread Scroll Area */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px] bg-slate-950/40">
                {ticketThread.messages?.map((msg: any) => {
                  const isPlatformAdmin = msg.sender_type === 'PLATFORM_ADMIN';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isPlatformAdmin ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                        {isPlatformAdmin ? (
                          <>
                            <span className="font-semibold text-indigo-400 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Platform Support Specialist
                            </span>
                            <span>•</span>
                            <span>{formatDateTime(msg.created_at)}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-slate-300 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {ticketThread.user?.first_name || 'Shop Staff'} ({ticketThread.business?.name})
                            </span>
                            <span>•</span>
                            <span>{formatDateTime(msg.created_at)}</span>
                          </>
                        )}
                      </div>

                      <div
                        className={`p-3 rounded-lg text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap break-words ${
                          isPlatformAdmin
                            ? 'bg-indigo-600/20 border border-indigo-500/30 text-slate-100 rounded-br-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box Footer */}
              <div className="p-3 border-t border-slate-800 bg-slate-900">
                <form onSubmit={handleSendReply} className="space-y-2">
                  <Textarea
                    rows={3}
                    placeholder="Type official response to merchant (notifies shop instantly)..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Dispatched with server-side push notification to tenant.
                    </span>
                    <Button
                      type="submit"
                      disabled={replyMutation.isPending || !replyText.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-lg text-center text-slate-500">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
              <p className="font-medium text-slate-400 text-sm">No Ticket Selected</p>
              <p className="text-xs text-slate-600 mt-1">
                Select a ticket from the left queue to inspect thread history and dispatch official support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
