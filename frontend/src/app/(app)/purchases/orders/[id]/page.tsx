'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  ArrowLeft,
  Send,
  Ban,
  PackageCheck,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const orderId = params.id as string;

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', orderId, currentBranchId],
    queryFn: () => api.purchases.orders.get(orderId),
    enabled: Boolean(orderId),
  });

  const issueMutation = useMutation({
    mutationFn: () => api.purchases.orders.issue(orderId),
    onSuccess: () => {
      showToast('Purchase Order issued successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to issue purchase order', 'error');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => api.purchases.orders.cancel(orderId),
    onSuccess: () => {
      showToast('Purchase Order cancelled successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setIsCancelDialogOpen(false);
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to cancel purchase order', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-8 text-center text-slate-500">
        Purchase Order not found.
      </div>
    );
  }

  const isDraft = po.status === 'DRAFT';
  const canReceive = po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED';

  // Calculate fulfillment percentage
  const totalOrdered = po.items?.reduce(
    (acc: number, item: any) => acc + Number(item.quantity),
    0,
  ) || 0;
  const totalReceived = po.items?.reduce(
    (acc: number, item: any) => acc + Number(item.received_quantity || 0),
    0,
  ) || 0;
  const overallProgress =
    totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Top back link */}
      <div>
        <Link
          href="/purchases/orders"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Purchase Orders</span>
        </Link>
      </div>

      {/* Header Info Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {po.po_no}
              </h1>
              <StatusBadge status={po.status} />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Supplier:</span>
              <strong className="text-slate-900 dark:text-slate-100">
                {po.supplier?.name}
              </strong>
              {po.supplier?.code && (
                <span className="font-mono text-slate-400">({po.supplier.code})</span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Ordered: {formatDate(po.order_date, 'en')}</span>
              </div>
              {po.expected_delivery && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Expected: {formatDate(po.expected_delivery, 'en')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Total Cost & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
              Total Order Cost
            </span>
            <div className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100">
              {formatBDT(po.total_amount)}
            </div>
            <span className="text-xs text-slate-500">
              {totalReceived} of {totalOrdered} units received ({overallProgress}%)
            </span>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {isDraft && (
              <PermissionGate permission="purchases:create">
                <Button
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs h-9"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Issue Order</span>
                </Button>
              </PermissionGate>
            )}

            {canReceive && (
              <PermissionGate permission="purchases:create">
                <Button
                  onClick={() => router.push(`/purchases/new?poId=${po.id}`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-9"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Receive Goods</span>
                </Button>
              </PermissionGate>
            )}

            {isDraft && (
              <PermissionGate permission="purchases:create">
                <Button
                  variant="outline"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950 gap-1.5 text-xs h-8"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel PO</span>
                </Button>
              </PermissionGate>
            )}
          </div>
        </div>
      </div>

      {/* Progress Overview Card */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-700 dark:text-slate-300">
            Overall Fulfillment Progress
          </span>
          <span className="text-slate-900 dark:text-slate-100 font-mono">
            {overallProgress}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              overallProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Ordered Items Table with Individual Progress Bars */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm space-y-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Ordered Items vs. Goods Received
          </h3>
          <Badge variant="outline" className="text-xs">
            {po.items?.length || 0} Lines
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Variant / SKU</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Size / Color</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Ordered</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Received</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Remaining</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 w-48">Fulfillment</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Unit Cost</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {po.items?.map((item: any) => {
                const orderedQty = Number(item.quantity);
                const receivedQty = Number(item.received_quantity || 0);
                const remainingQty = Math.max(0, orderedQty - receivedQty);
                const itemProgress =
                  orderedQty > 0 ? Math.min(100, Math.round((receivedQty / orderedQty) * 100)) : 0;
                const lineTotal = new Decimal(orderedQty).times(new Decimal(item.unit_cost));

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.variant?.product?.name || 'Product'}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">
                        SKU: {item.variant?.sku || '-'}
                      </p>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {item.variant?.size?.name || '-'} / {item.variant?.color?.name || '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {orderedQty}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {receivedQty}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {remainingQty}
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{itemProgress}%</span>
                          {itemProgress >= 100 && (
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete</span>
                            </span>
                          )}
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              itemProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${itemProgress}%` }}
                          />
                        </div>
                      </div>
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

      {/* Cancel PO Dialog */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={(reason) => {
          cancelMutation.mutate(reason);
        }}
        title="Cancel Purchase Order"
        description="Are you sure you want to cancel this purchase order? This action cannot be undone."
        requireReason={true}
        reasonLabel="Cancellation Reason (required)"
        confirmText="Cancel Order"
        variant="destructive"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
