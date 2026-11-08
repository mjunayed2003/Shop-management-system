'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform-client';
import { usePlatformAuthStore, PlatformRole } from '@/lib/store/platform-auth-store';
import { formatBDT, formatDate, formatDateTime } from '@/lib/utils/formatters';
import { useToast } from '@/components/feedback/ToastContext';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Receipt,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Download,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  ArrowRight,
  Filter,
  DollarSign,
  Layers,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import Decimal from 'decimal.js';

export default function PlatformInvoicesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const currentAdmin = usePlatformAuthStore((state) => state.admin);

  const canManageBilling =
    currentAdmin?.role === PlatformRole.SUPER_ADMIN ||
    currentAdmin?.role === PlatformRole.BILLING_ADMIN;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [businessSearch, setBusinessSearch] = useState('');

  // Modals & Action States
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [viewDetailInvoice, setViewDetailInvoice] = useState<any | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [confirmPaymentDialogOpen, setConfirmPaymentDialogOpen] = useState(false);
  const [voidInvoiceId, setVoidInvoiceId] = useState<string | null>(null);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'CARD' | 'CASH'>('BKASH');
  const [transactionId, setTransactionId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Query: Revenue Summary
  const { data: revenueSummary } = useQuery({
    queryKey: ['platform-revenue-summary'],
    queryFn: () => platformApi.invoices.getRevenueSummary(),
    enabled: canManageBilling,
  });

  // Query: Invoices List
  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['platform-invoices', page, statusFilter, businessSearch],
    queryFn: () =>
      platformApi.invoices.list({
        page,
        limit: 20,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        businessId: businessSearch.trim() || undefined,
      }),
  });

  // Mutation: Void Invoice
  const voidMutation = useMutation({
    mutationFn: (id: string) => platformApi.invoices.void(id),
    onSuccess: () => {
      showToast('Invoice voided successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
      setVoidInvoiceId(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to void invoice.', 'error');
    },
  });

  // Mutation: Mark Overdue
  const markOverdueMutation = useMutation({
    mutationFn: (id: string) => platformApi.invoices.markOverdue(id),
    onSuccess: () => {
      showToast('Invoice marked as OVERDUE.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to mark invoice overdue.', 'error');
    },
  });

  // Mutation: Record Payment
  const recordPaymentMutation = useMutation({
    mutationFn: ({
      invoiceId,
      amount,
      method,
      trxId,
      key,
    }: {
      invoiceId: string;
      amount: number;
      method: string;
      trxId?: string;
      key: string;
    }) =>
      platformApi.invoices.recordPayment(
        invoiceId,
        {
          amount,
          paymentMethod: method,
          transactionId: trxId?.trim() || undefined,
        },
        { idempotencyKey: key }
      ),
    onSuccess: (data) => {
      showToast(data.message || 'Payment successfully recorded.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['platform-revenue-summary'] });
      setPaymentModalOpen(false);
      setSelectedInvoice(null);
      setConfirmPaymentDialogOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || 'Payment recording failed.', 'error');
    },
  });

  // Calculate remaining balance helper using decimal.js for preview
  const getRemainingBalance = (inv: any): Decimal => {
    if (!inv) return new Decimal(0);
    const net = new Decimal(inv.net_amount || 0);
    const paid = (inv.payments || []).reduce(
      (acc: Decimal, p: any) => acc.plus(new Decimal(p.amount || 0)),
      new Decimal(0)
    );
    const balance = net.minus(paid);
    return balance.greaterThan(0) ? balance : new Decimal(0);
  };

  const handleOpenPayment = (inv: any) => {
    setSelectedInvoice(inv);
    const remaining = getRemainingBalance(inv);
    setPaymentAmount(remaining.toString());
    setPaymentMethod('BKASH');
    setTransactionId('');
    // Generate UUID idempotency key per payment intent
    setIdempotencyKey(crypto.randomUUID());
    setPaymentModalOpen(true);
  };

  const handlePreSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const remaining = getRemainingBalance(selectedInvoice);
    const amt = new Decimal(paymentAmount || 0);

    if (amt.lessThanOrEqualTo(0)) {
      showToast('Payment amount must be greater than zero.', 'error');
      return;
    }

    if (amt.greaterThan(remaining)) {
      showToast(
        `Overpayment blocked: entered amount (${formatBDT(amt.toNumber())}) exceeds remaining balance (${formatBDT(remaining.toNumber())}).`,
        'error'
      );
      return;
    }

    setConfirmPaymentDialogOpen(true);
  };

  const handleExecutePayment = () => {
    if (!selectedInvoice) return;
    recordPaymentMutation.mutate({
      invoiceId: selectedInvoice.id,
      amount: Number(paymentAmount),
      method: paymentMethod,
      trxId: transactionId,
      key: idempotencyKey,
    });
  };

  // CSV Export with formula injection sanitization
  const handleExportCsv = () => {
    if (!invoicesData?.data || invoicesData.data.length === 0) {
      showToast('No invoices to export.', 'info');
      return;
    }

    const headers = ['Invoice Number', 'Business', 'Slug', 'Plan', 'Net Amount', 'Paid Amount', 'Due Date', 'Status', 'Created At'];
    const rows = invoicesData.data.map((inv: any) => {
      const sanitize = (val: any) => {
        const str = String(val ?? '');
        return /^[=+\-@]/.test(str) ? `'${str}` : `"${str.replace(/"/g, '""')}"`;
      };
      return [
        sanitize(inv.invoice_number),
        sanitize(inv.business?.name),
        sanitize(inv.business?.slug),
        sanitize(inv.plan?.name),
        inv.net_amount,
        inv.paid_amount || 0,
        sanitize(formatDate(inv.due_date)),
        sanitize(inv.status),
        sanitize(formatDateTime(inv.created_at)),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `platform_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Invoices exported successfully.', 'success');
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100 font-sans pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Transactions &amp; Revenue
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Monitor billing cycles, register payments with idempotency keys, and track receivables.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-8 px-3.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-orange-500 hover:text-orange-500 transition-colors shadow-2xs inline-flex flex-row items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Revenue Summary Cards (BILLING_ADMIN / SUPER_ADMIN) - Foodpoint SaaS Style */}
      {canManageBilling && revenueSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                MRR Estimate
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatBDT(revenueSummary.mrrEstimate)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium pt-1">
                Active monthly &amp; yearly subs
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Collected This Month
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatBDT(revenueSummary.collectedThisMonth)}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                Cleared subscription dues
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Overdue Amount
              </span>
              <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {formatBDT(revenueSummary.overdueAmount)}
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-1">
                Unpaid past grace deadline
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Active Subscriptions
              </span>
              <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {revenueSummary.activeSubscriptionsCount}
              </p>
              <p className="text-[11px] text-slate-400 font-medium pt-1">
                Paid tenant businesses
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm shadow-slate-200/40 dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Status:
            </span>
            {['ALL', 'ISSUED', 'PAID', 'OVERDUE', 'VOID'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`text-xs h-7 px-3 rounded-full font-bold cursor-pointer transition-all ${
                  statusFilter === st
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-orange-500 hover:text-orange-500'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="w-full md:w-64">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Filter by Business UUID..."
                value={businessSearch}
                onChange={(e) => {
                  setBusinessSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-3xl shadow-sm shadow-slate-200/40 dark:shadow-none overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Net Amount</th>
                  <th className="py-3 px-4">Paid / Due</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Loading subscription invoices from server...
                    </td>
                  </tr>
                ) : !invoicesData?.data || invoicesData.data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No invoices found matching current filters.
                    </td>
                  </tr>
                ) : (
                  invoicesData.data.map((inv: any) => {
                    const remaining = getRemainingBalance(inv);
                    const isFullyPaid = inv.status === 'PAID';
                    const isVoid = inv.status === 'VOID';

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-slate-200">{inv.business?.name || 'N/A'}</p>
                          <p className="text-xs text-slate-500 font-mono">{inv.business?.slug}</p>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-orange-600 dark:text-orange-400 font-bold">
                          {inv.plan?.name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(inv.period_start)} - {formatDate(inv.period_end)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                          {formatBDT(inv.net_amount)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                            {formatBDT(inv.paid_amount || 0)}
                          </span>
                          {!isFullyPaid && !isVoid && (
                            <span className="block text-rose-600 dark:text-rose-400 font-medium font-mono">
                              Due: {formatBDT(remaining.toNumber())}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(inv.due_date)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                                : inv.status === 'OVERDUE'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800'
                                : inv.status === 'VOID'
                                ? 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewDetailInvoice(inv)}
                              className="text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 h-7 px-2"
                            >
                              Detail
                            </Button>

                            {canManageBilling && !isFullyPaid && !isVoid && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenPayment(inv)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5"
                                >
                                  <DollarSign className="w-3.5 h-3.5 mr-1" />
                                  Record Pay
                                </Button>

                                {inv.status !== 'OVERDUE' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markOverdueMutation.mutate(inv.id)}
                                    className="border-slate-800 text-slate-400 hover:text-amber-400 text-xs h-7 px-2"
                                  >
                                    Overdue
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setVoidInvoiceId(inv.id)}
                                  className="text-slate-500 hover:text-rose-400 text-xs h-7 px-2"
                                >
                                  Void
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {invoicesData?.pagination && invoicesData.pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Page {invoicesData.pagination.page} of {invoicesData.pagination.totalPages} (Total{' '}
                {invoicesData.pagination.total} invoices)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="border-slate-800 text-slate-300 text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= invoicesData.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="border-slate-800 text-slate-300 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RECORD PAYMENT MODAL (Foodpoint Theme) */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl rounded-3xl p-0">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Record Manual Payment
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Record verified bank deposit, bKash, or cash receipt against #{selectedInvoice?.invoice_number}.
              </DialogDescription>
            </div>
          </div>

          {selectedInvoice && (
            <form onSubmit={handlePreSubmitPayment} className="space-y-4 px-6 py-4 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Business</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedInvoice.business?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Net Invoice Amount</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{formatBDT(selectedInvoice.net_amount)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Remaining Balance Due</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 font-mono">
                    {formatBDT(getRemainingBalance(selectedInvoice).toNumber())}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Amount (BDT) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Partial payment is accepted. UI strictly blocks overpayment beyond remaining balance.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Payment Channel / Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer font-medium"
                >
                  <option value="BKASH">bKash Merchant / MFS</option>
                  <option value="NAGAD">Nagad MFS</option>
                  <option value="BANK_TRANSFER">Bank Direct Deposit / BEFTN</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="CASH">Physical Cash Office Collection</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Transaction ID / Reference</label>
                <Input
                  placeholder="e.g. 9B76XA34DF or Bank Deposit Slip #"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span>Idempotency Key:</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">{idempotencyKey.slice(0, 13)}...</span>
              </div>

              <DialogFooter className="px-6 py-3.5 -mx-6 -mb-4 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/25 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Review & Confirm Payment</span>
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM PAYMENT DIALOG */}
      <ConfirmDialog
        isOpen={confirmPaymentDialogOpen}
        onClose={() => setConfirmPaymentDialogOpen(false)}
        onConfirm={handleExecutePayment}
        title="Confirm Payment Collection"
        description={
          <div>
            <p>
              Are you sure you want to record a payment of{' '}
              <strong className="text-emerald-400">{formatBDT(Number(paymentAmount) || 0)}</strong> via{' '}
              <strong className="text-slate-100">{paymentMethod}</strong> for invoice{' '}
              <span className="font-mono">{selectedInvoice?.invoice_number}</span>?
            </p>
            <p className="mt-2 text-xs text-slate-400">
              The server will verify remaining due and automatically update the tenant's subscription status
              to <strong>ACTIVE</strong> if the invoice becomes fully settled.
            </p>
          </div>
        }
        confirmText="Confirm & Record"
        variant="default"
        isLoading={recordPaymentMutation.isPending}
      />

      {/* VOID INVOICE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(voidInvoiceId)}
        onClose={() => setVoidInvoiceId(null)}
        onConfirm={() => {
          if (voidInvoiceId) voidMutation.mutate(voidInvoiceId);
        }}
        title="Void Subscription Invoice"
        description="Voiding an invoice marks it permanently invalid. This action cannot be undone. Invoices with recorded payments cannot be voided."
        confirmText="Void Invoice"
        variant="destructive"
        isLoading={voidMutation.isPending}
      />

      {/* INVOICE DETAIL MODAL (Foodpoint Theme) */}
      <Dialog open={Boolean(viewDetailInvoice)} onOpenChange={(open) => !open && setViewDetailInvoice(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl rounded-3xl p-0">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Invoice #{viewDetailInvoice?.invoice_number}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Complete invoice breakdown and payment transaction logs
              </DialogDescription>
            </div>
          </div>

          {viewDetailInvoice && (
            <div className="space-y-4 px-6 py-5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Business Shop</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">{viewDetailInvoice.business?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Plan Tier</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400 text-sm mt-0.5 block font-mono">{viewDetailInvoice.plan?.name}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-semibold">Billing Period</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {formatDate(viewDetailInvoice.period_start)} - {formatDate(viewDetailInvoice.period_end)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-semibold">Due Date</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(viewDetailInvoice.due_date)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-semibold">Net Amount</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {formatBDT(viewDetailInvoice.net_amount)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-semibold">Status</span>
                  <Badge className="mt-0.5">{viewDetailInvoice.status}</Badge>
                </div>
              </div>

              {/* Payments History on this invoice */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  Recorded Payments ({(viewDetailInvoice.payments || []).length})
                </h4>
                {(!viewDetailInvoice.payments || viewDetailInvoice.payments.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    No payments have been recorded for this invoice yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {viewDetailInvoice.payments.map((pm: any) => (
                      <div key={pm.id} className="p-3 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatBDT(pm.amount)}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Channel: {pm.payment_method} {pm.transaction_id ? `• Trx: ${pm.transaction_id}` : ''}
                          </p>
                        </div>
                        <div className="text-right text-slate-400 font-mono text-[11px]">
                          {formatDateTime(pm.paid_at || pm.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end rounded-b-3xl">
            <button
              type="button"
              onClick={() => setViewDetailInvoice(null)}
              className="h-9 px-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
            >
              Close Breakdown
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
