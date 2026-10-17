'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  Ban,
  Barcode,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PaymentModal } from '@/components/purchases/PaymentModal';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const purchaseId = params.id as string;

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['purchase', purchaseId, currentBranchId],
    queryFn: () => api.purchases.purchases.get(purchaseId),
    enabled: Boolean(purchaseId),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => api.purchases.purchases.cancel(purchaseId),
    onSuccess: () => {
      showToast('Purchase consignment cancelled successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['purchase', purchaseId] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setIsCancelDialogOpen(false);
      setCancelErrorMessage(null);
    },
    onError: (err: any) => {
      const msg = err?.message || 'Cannot cancel purchase: Stock has already been sold or moved.';
      setCancelErrorMessage(msg);
      showToast(msg, 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="p-8 text-center text-slate-500">
        Purchase not found.
      </div>
    );
  }

  const due = Number(purchase.due_amount || 0);
  const canPay = purchase.status !== 'CANCELLED' && due > 0;
  const canCancel = purchase.status !== 'CANCELLED';

  const trackedUnits = purchase.product_units || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/purchases"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Purchases List</span>
        </Link>
      </div>

      {/* Header Info Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Truck className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {purchase.purchase_no}
              </h1>
              <StatusBadge status={purchase.status} />
              {purchase.landed_cost && (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                  Landed Cost Active
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Supplier:</span>
              <Link
                href={`/purchases/suppliers/${purchase.supplier?.id}`}
                className="font-bold text-slate-900 dark:text-slate-100 hover:underline"
              >
                {purchase.supplier?.name}
              </Link>
              {purchase.supplier?.code && (
                <span className="font-mono text-slate-400">({purchase.supplier.code})</span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date: {formatDate(purchase.purchase_date, 'en')}</span>
              </div>
              {purchase.supplier_invoice_no && (
                <div>
                  <span>Supplier Inv: </span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {purchase.supplier_invoice_no}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Numbers & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-6 text-xs text-slate-500">
              <span>Total Amount:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                {formatBDT(purchase.total_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6 text-xs text-slate-500">
              <span>Paid:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatBDT(purchase.paid_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6 text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Due:</span>
              <span
                className={`font-mono font-bold text-base ${
                  due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {formatBDT(due)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {canPay && (
              <PermissionGate permission="purchases:create">
                <Button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-9"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Add Payment</span>
                </Button>
              </PermissionGate>
            )}

            {canCancel && (
              <PermissionGate permission="purchases:create">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelErrorMessage(null);
                    setIsCancelDialogOpen(true);
                  }}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950 gap-1.5 text-xs h-8"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Purchase</span>
                </Button>
              </PermissionGate>
            )}
          </div>
        </div>
      </div>

      {/* Items Received Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Received Garment Items ({purchase.items?.length || 0})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Garment / SKU</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Size / Color</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Quantity</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Unit Cost</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {purchase.items?.map((item: any) => {
                const lineTotal = new Decimal(item.quantity).times(new Decimal(item.unit_cost));
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.variant?.product?.name || 'Garment'}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">
                        SKU: {item.variant?.sku || '-'}
                      </p>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {item.variant?.size?.name || '-'} / {item.variant?.color?.name || '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {Number(item.quantity)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatBDT(item.unit_cost)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatBDT(lineTotal.toNumber())}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individually Tracked Product Units */}
      {trackedUnits.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Tracked Product Units ({trackedUnits.length})
              </h3>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                const barcodes = trackedUnits.map((u: any) => u.barcode_value).join(',');
                router.push(`/catalog/barcodes?prefillUnits=${barcodes}`);
              }}
              className="gap-1.5 text-xs h-8"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Barcode Labels</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
            {trackedUnits.map((u: any) => (
              <div
                key={u.id}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between"
              >
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {u.barcode_value}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {u.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Payments & Returns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payments List */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payments Applied ({purchase.payments?.length || 0})</span>
            </h4>
          </div>

          {(!purchase.payments || purchase.payments.length === 0) ? (
            <p className="text-xs text-slate-400 py-3">No payments recorded against this purchase.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {purchase.payments.map((pm: any) => (
                <div key={pm.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                      {pm.payment_no}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(pm.payment_date, 'en')} via {pm.payment_method}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBDT(pm.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Returns List */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Purchase Returns ({purchase.purchase_returns?.length || 0})</span>
            </h4>
          </div>

          {(!purchase.purchase_returns || purchase.purchase_returns.length === 0) ? (
            <p className="text-xs text-slate-400 py-3">No returns filed for this purchase.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {purchase.purchase_returns.map((ret: any) => (
                <div key={ret.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <Link
                      href={`/purchases/returns/${ret.id}`}
                      className="font-mono font-bold text-slate-900 dark:text-slate-100 hover:underline block"
                    >
                      {ret.return_no}
                    </Link>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(ret.return_date, 'en')} | Status: {ret.status}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatBDT(ret.total_amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Purchase Confirm Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => {
          setIsCancelDialogOpen(false);
          setCancelErrorMessage(null);
        }}
        onConfirm={(reason) => {
          cancelMutation.mutate(reason);
        }}
        title="Cancel Purchase Consignment"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to cancel Purchase{' '}
              <strong className="text-slate-900 dark:text-slate-100 font-mono">
                {purchase.purchase_no}
              </strong>
              ? This will deduct the received items from stock and reverse the supplier due balance.
            </p>
            {cancelErrorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{cancelErrorMessage}</span>
              </div>
            )}
          </div>
        }
        requireReason={true}
        reasonLabel="Cancellation Reason (required)"
        confirmText="Cancel Purchase"
        variant="destructive"
        isLoading={cancelMutation.isPending}
      />

      {/* Add Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        supplierId={purchase.supplier?.id}
        supplierName={purchase.supplier?.name}
        purchaseId={purchase.id}
        purchaseNo={purchase.purchase_no}
        purchaseDue={due}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['purchase', purchaseId] });
        }}
      />
    </div>
  );
}
