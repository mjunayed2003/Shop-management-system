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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-400" />
            Invoices & Payment Records
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Monitor billing cycles, register payments with idempotency keys, and track overdue receivables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Revenue Summary Cards (BILLING_ADMIN / SUPER_ADMIN) */}
      {canManageBilling && revenueSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 font-medium">Monthly Recurring Revenue (MRR)</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {formatBDT(revenueSummary.mrrEstimate)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Based on active monthly & yearly subs</p>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 font-medium">Collected This Month</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {formatBDT(revenueSummary.collectedThisMonth)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Cleared tenant subscription dues</p>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 font-medium">Overdue Amount</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400">
              {formatBDT(revenueSummary.overdueAmount)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Unpaid past grace deadline</p>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 font-medium">Active Subscriptions</span>
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-indigo-400">
              {revenueSummary.activeSubscriptionsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Paid tenant businesses</p>
          </Card>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Status:
            </span>
            {['ALL', 'ISSUED', 'PAID', 'OVERDUE', 'VOID'].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? 'default' : 'outline'}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`text-xs h-7 px-2.5 ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {st}
              </Button>
            ))}
          </div>

          <div className="w-full md:w-64">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Filter by Business UUID..."
                value={businessSearch}
                onChange={(e) => {
                  setBusinessSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Loading subscription invoices...
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
                      <tr key={inv.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-slate-100">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-200">{inv.business?.name || 'N/A'}</p>
                          <p className="text-xs text-slate-500 font-mono">{inv.business?.slug}</p>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-indigo-400">
                          {inv.plan?.name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {formatDate(inv.period_start)} - {formatDate(inv.period_end)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-100">
                          {formatBDT(inv.net_amount)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="text-emerald-400 font-medium">
                            {formatBDT(inv.paid_amount || 0)}
                          </span>
                          {!isFullyPaid && !isVoid && (
                            <span className="block text-rose-400 font-medium">
                              Due: {formatBDT(remaining.toNumber())}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {formatDate(inv.due_date)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              inv.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : inv.status === 'OVERDUE'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : inv.status === 'VOID'
                                ? 'bg-slate-800 text-slate-500'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
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
                              className="text-xs text-slate-300 hover:bg-slate-800 h-7 px-2"
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

      {/* RECORD PAYMENT MODAL */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <DollarSign className="w-5 h-5" />
              Record Manual Payment
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Record verified bank deposit, bKash, or cash receipt against invoice #{selectedInvoice?.invoice_number}.
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <form onSubmit={handlePreSubmitPayment} className="space-y-4 py-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Business</span>
                  <span className="font-semibold text-slate-200">{selectedInvoice.business?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Invoice Amount</span>
                  <span className="font-semibold text-slate-100">{formatBDT(selectedInvoice.net_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Remaining Balance Due</span>
                  <span className="font-semibold text-rose-400">
                    {formatBDT(getRemainingBalance(selectedInvoice).toNumber())}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">
                  Payment Amount (BDT) <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1 font-semibold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Partial payment is accepted. UI strictly blocks overpayment beyond remaining balance.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Payment Channel / Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-md py-2 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="BKASH">bKash Merchant / MFS</option>
                  <option value="NAGAD">Nagad MFS</option>
                  <option value="BANK_TRANSFER">Bank Direct Deposit / BEFTN</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="CASH">Physical Cash Office Collection</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Transaction ID / Reference</label>
                <Input
                  placeholder="e.g. 9B76XA34DF or Bank Deposit Slip #"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1 font-mono text-xs"
                />
              </div>

              <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-800">
                <span>Idempotency Key:</span>
                <span className="font-mono text-slate-400">{idempotencyKey.slice(0, 13)}...</span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentModalOpen(false)}
                  className="border-slate-800 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Review & Confirm Payment
                </Button>
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

      {/* INVOICE DETAIL MODAL */}
      <Dialog open={Boolean(viewDetailInvoice)} onOpenChange={(open) => !open && setViewDetailInvoice(null)}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Receipt className="w-5 h-5 text-indigo-400" />
              Invoice #{viewDetailInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Complete invoice breakdown and payment transaction logs
            </DialogDescription>
          </DialogHeader>

          {viewDetailInvoice && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 block">Business Shop</span>
                  <span className="font-semibold text-slate-200">{viewDetailInvoice.business?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Plan Tier</span>
                  <span className="font-semibold text-indigo-400">{viewDetailInvoice.plan?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Billing Period</span>
                  <span className="text-slate-200">
                    {formatDate(viewDetailInvoice.period_start)} - {formatDate(viewDetailInvoice.period_end)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Due Date</span>
                  <span className="text-slate-200">{formatDate(viewDetailInvoice.due_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Amount</span>
                  <span className="text-base font-bold text-slate-100">
                    {formatBDT(viewDetailInvoice.net_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status</span>
                  <Badge className="mt-0.5">{viewDetailInvoice.status}</Badge>
                </div>
              </div>

              {/* Payments History on this invoice */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Recorded Payments ({(viewDetailInvoice.payments || []).length})
                </h4>
                {(!viewDetailInvoice.payments || viewDetailInvoice.payments.length === 0) ? (
                  <p className="text-xs text-slate-500 py-3 text-center bg-slate-950/50 rounded border border-slate-800/60">
                    No payments have been recorded for this invoice yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-lg overflow-hidden">
                    {viewDetailInvoice.payments.map((pm: any) => (
                      <div key={pm.id} className="p-3 bg-slate-950/40 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-emerald-400">{formatBDT(pm.amount)}</p>
                          <p className="text-[11px] text-slate-400">
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDetailInvoice(null)}
              className="border-slate-800 text-slate-300 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
