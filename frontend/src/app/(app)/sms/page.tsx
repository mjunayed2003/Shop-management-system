'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/shared/ExportButton';
import { calculateSmsSegments } from '@/lib/utils/sms-segments';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MessageSquare,
  Send,
  Users,
  Settings,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart2,
} from 'lucide-react';

export default function SmsHubPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { currentBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const isOwner = Boolean(user?.isOwner);

  const [activeTab, setActiveTab] = useState<'reminders' | 'logs' | 'promotional' | 'templates'>('reminders');

  // Tab 1: Due Reminders State
  const [minDue, setMinDue] = useState(100);
  const [olderThanDays, setOlderThanDays] = useState(0);
  const [reminderLang, setReminderLang] = useState<'bn' | 'en'>('bn');
  const [previewResult, setPreviewResult] = useState<{ count: number; totalDue: number; recipients: any[] } | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Tab 2: Logs State
  const [logPage, setLogPage] = useState(1);
  const [purposeFilter, setPurposeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Tab 3: Promotional State
  const [promoMessage, setPromoMessage] = useState('');
  const [promoBoughtInDays, setPromoBoughtInDays] = useState(30);
  const [promoMinSpend, setPromoMinSpend] = useState(0);
  const [promoLang, setPromoLang] = useState<'en' | 'bn'>('en');

  const promoAnalysis = calculateSmsSegments(promoMessage);
  const promoSegments = {
    ...promoAnalysis,
    estimatedCost: promoAnalysis.segmentCount * 0.35,
  };

  // 1. Logs Query
  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ['sms', 'logs', currentBranchId, logPage, purposeFilter, statusFilter],
    queryFn: () =>
      api.sms.listLogs({
        page: logPage,
        limit: 20,
        purpose: purposeFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  // 2. Due Reminders Preview Mutation
  const previewMutation = useMutation({
    mutationFn: () => api.sms.previewDueReminders({ minDue, olderThanDays }),
    onSuccess: (data) => {
      setPreviewResult(data);
      setIsPreviewModalOpen(true);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to preview due reminders');
    },
  });

  // 3. Send Due Reminders Mutation
  const sendRemindersMutation = useMutation({
    mutationFn: () =>
      api.sms.sendDueReminders({
        minDue,
        olderThanDays,
        lang: reminderLang,
      }),
    onSuccess: (data) => {
      setIsPreviewModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['sms', 'logs'] });
      toast.success(`Queued ${data.sent} due reminder SMS messages.`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send reminders');
    },
  });

  // 4. Send Promotional Mutation
  const sendPromoMutation = useMutation({
    mutationFn: () =>
      api.sms.sendPromotional({
        message: promoMessage,
        boughtInLastDays: promoBoughtInDays,
        minSpend: promoMinSpend,
        lang: promoLang,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sms', 'logs'] });
      toast.success(`Promotional campaign queued for ${data.queued} customer(s).`);
      setPromoMessage('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to dispatch promotional campaign');
    },
  });

  const logs = logsData?.data || [];
  const logTotalPages = logsData?.pagination?.totalPages || 1;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            <span>SMS Management &amp; Due Notifications</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dispatch payment receipts, due reminders, and customer marketing campaigns via masked gateway
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            exportUrl={api.exports.smsLogs()}
            filename="sms-logs"
            label="Export SMS Logs"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            activeTab === 'reminders'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Due Reminders
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            activeTab === 'logs'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          SMS Delivery Logs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('promotional')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            activeTab === 'promotional'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Promotional Campaign
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            activeTab === 'templates'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Quota &amp; Templates
        </button>
      </div>

      {/* TAB 1: DUE REMINDERS */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bulk Customer Due Collection Reminders
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target customers with outstanding debt. An explicit preview step is required before sending.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Minimum Due Balance (BDT)
                </label>
                <Input
                  type="number"
                  value={minDue}
                  onChange={(e) => setMinDue(Math.max(0, Number(e.target.value)))}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Debt Older Than (Days)
                </label>
                <Input
                  type="number"
                  value={olderThanDays}
                  onChange={(e) => setOlderThanDays(Math.max(0, Number(e.target.value)))}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  SMS Language
                </label>
                <select
                  value={reminderLang}
                  onChange={(e) => setReminderLang(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="bn">বাংলা (Bangla Unicode)</option>
                  <option value="en">English (Standard GSM)</option>
                </select>
              </div>
            </div>

            {/* Template preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Sample SMS Preview:</span>
              <p className="font-mono text-slate-800 dark:text-slate-200">
                {reminderLang === 'bn'
                  ? 'প্রিয় [গ্রাহকের নাম], আপনার বকেয়া রয়েছে ৳[বকেয়া]। অনুগ্রহ করে বকেয়া পরিশোধ করুন।'
                  : 'Dear [Customer Name], you have an outstanding due of BDT [Due Amount]. Please settle your payment.'}
              </p>
            </div>

            <div>
              <Button
                type="button"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 rounded-xl px-4"
              >
                {previewMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Users className="w-3.5 h-3.5 mr-1.5" />}
                Preview Eligible Customers
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SMS LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <select
              value={purposeFilter}
              onChange={(e) => { setPurposeFilter(e.target.value); setLogPage(1); }}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="">All Purposes</option>
              <option value="SALE_INVOICE">Sale Invoice Receipt</option>
              <option value="DUE_REMINDER">Due Collection Reminder</option>
              <option value="OTP">OTP Verification</option>
              <option value="PROMOTIONAL">Promotional Campaign</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setLogPage(1); }}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="">All Delivery Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="SENT">SENT</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            {isLogsLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading SMS dispatch logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No SMS logs recorded for this criteria</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Recipient Phone</th>
                      <th className="py-3 px-4">Purpose</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Message Body</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                    {logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">{log.recipient_phone}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px]">
                            {log.purpose}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              log.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : log.status === 'SENT'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : log.status === 'FAILED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {log.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                          {log.message_body}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {logTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Page {logPage} of {logTotalPages}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logPage <= 1}
                  onClick={() => setLogPage(logPage - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logPage >= logTotalPages}
                  onClick={() => setLogPage(logPage + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROMOTIONAL CAMPAIGN */}
      {activeTab === 'promotional' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Compose Promotional SMS Broadcast
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Broadcast marketing alerts to recent retail customers. Customers on opt-out list are excluded automatically.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Promotional Offer Message
              </label>
              <textarea
                value={promoMessage}
                onChange={(e) => setPromoMessage(e.target.value)}
                rows={3}
                placeholder="e.g., Eid Special Offer! Get 20% off on all items this weekend at our showroom."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
              />

              {/* Live Character & Segment Counter */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>
                  Characters: <strong>{promoSegments.charCount}</strong> | Format:{' '}
                  <strong>{promoSegments.isUnicode ? 'Unicode (Bangla)' : 'GSM 7-bit'}</strong>
                </span>
                <span>
                  Segments: <strong>{promoSegments.segmentCount}</strong> (~{(promoSegments.estimatedCost || 0).toFixed(2)} BDT/recipient)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Target: Purchased in last (Days)
                </label>
                <Input
                  type="number"
                  value={promoBoughtInDays}
                  onChange={(e) => setPromoBoughtInDays(Math.max(1, Number(e.target.value)))}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Minimum Lifetime Spend (BDT)
                </label>
                <Input
                  type="number"
                  value={promoMinSpend}
                  onChange={(e) => setPromoMinSpend(Math.max(0, Number(e.target.value)))}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <Button
              type="button"
              disabled={sendPromoMutation.isPending || !promoMessage.trim()}
              onClick={() => sendPromoMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 rounded-xl px-4"
            >
              {sendPromoMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Launch Campaign Broadcast
            </Button>
          </div>
        </div>
      )}

      {/* TAB 4: QUOTA & TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Monthly SMS Quota Usage</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                142 / 500 messages
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '28%' }} />
              </div>
              <p className="text-[11px] text-slate-400">Resets on 1st of every calendar month</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Gateway Masking / Sender ID</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                DOKAN-POS
              </div>
              <p className="text-xs text-slate-400">Approved BTRC alphanumeric sender identity</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog for Due Reminders Preview & Confirmation */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-lg p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Confirm Due Reminder Dispatch</DialogTitle>
          </DialogHeader>

          {previewResult && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Eligible Debtors:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{previewResult.count} customers</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Outstanding Balance:</span>
                  <strong className="text-rose-600 font-bold">{previewResult.totalDue.toLocaleString()} BDT</strong>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300">
                Are you sure you want to queue SMS due collection reminders to these {previewResult.count} customers?
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-xs h-8 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={sendRemindersMutation.isPending || previewResult.count === 0}
                  onClick={() => sendRemindersMutation.mutate()}
                  className="text-xs h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {sendRemindersMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Send {previewResult.count} SMS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
