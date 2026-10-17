'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  ArrowLeft,
  Printer,
  Building2,
  Calendar,
  CheckCircle2,
  Ban,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function PurchaseReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const returnId = params.id as string;

  const { data: ret, isLoading } = useQuery({
    queryKey: ['purchase-return', returnId, currentBranchId],
    queryFn: () => api.purchases.returns.get(returnId),
    enabled: Boolean(returnId),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.purchases.returns.complete(returnId),
    onSuccess: () => {
      showToast('Return note marked COMPLETED. Stock & liability deducted.', 'success');
      queryClient.invalidateQueries({ queryKey: ['purchase-return', returnId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to complete return', 'error');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.purchases.returns.cancel(returnId),
    onSuccess: () => {
      showToast('Return note cancelled successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['purchase-return', returnId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to cancel return', 'error');
    },
  });

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!ret) {
    return (
      <div className="p-8 text-center text-slate-500">
        Return note not found.
      </div>
    );
  }

  const isDraft = ret.status === 'DRAFT';

  return (
    <div className="space-y-6">
      {/* Back button & Print */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/purchases/returns"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Purchase Returns</span>
        </Link>

        <div className="flex items-center gap-2">
          {isDraft && (
            <PermissionGate permission="purchases:return">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1 text-xs"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Return</span>
              </Button>

              <Button
                size="sm"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete Return Note</span>
              </Button>
            </PermissionGate>
          )}

          <Button
            onClick={handlePrint}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 gap-1.5 text-xs h-9"
          >
            <Printer className="w-4 h-4" />
            <span>Print Return Note</span>
          </Button>
        </div>
      </div>

      {/* Printable Return Slip */}
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-widest text-amber-600 uppercase">
              Debit Memo / Goods Return Note
            </span>
            <h2 className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {ret.return_no}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Date: {formatDate(ret.return_date, 'en')}
            </p>
          </div>

          <div className="text-right space-y-1">
            <StatusBadge status={ret.status} />
            <p className="text-xs text-slate-500">
              Supplier: <strong className="text-slate-900 dark:text-slate-100">{ret.supplier?.name}</strong>
            </p>
          </div>
        </div>

        {ret.reason && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 block mb-0.5">Return Reason:</span>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{ret.reason}</p>
          </div>
        )}

        {/* Returned Items Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Garment / SKU</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Size / Color</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Return Qty</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Unit Cost</th>
                <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Debit Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ret.items?.map((item: any) => {
                const lineTotal = new Decimal(item.quantity).times(new Decimal(item.unit_cost));
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
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
                    <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      {formatBDT(lineTotal.toNumber())}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Total Callout */}
        <div className="flex justify-end">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 w-72 flex items-center justify-between text-sm font-bold">
            <span className="text-amber-800 dark:text-amber-300">Total Debit Value:</span>
            <span className="font-mono text-base text-amber-700 dark:text-amber-400">
              {formatBDT(ret.total_amount)}
            </span>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
          <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2">
            Dispatched By (Shop Staff)
          </div>
          <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2">
            Supplier Representative Acknowledgement
          </div>
        </div>
      </div>
    </div>
  );
}
