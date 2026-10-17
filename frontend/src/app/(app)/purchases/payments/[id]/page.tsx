'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  ArrowLeft,
  Printer,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import { useTranslation } from '@/lib/i18n';

export default function PaymentVoucherPage() {
  const params = useParams();
  const { t } = useTranslation();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const paymentId = params.id as string;

  const { data: payment, isLoading } = useQuery({
    queryKey: ['supplier-payment', paymentId, currentBranchId],
    queryFn: () => api.purchases.payments.get(paymentId),
    enabled: Boolean(paymentId),
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
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-8 text-center text-slate-500">
        Payment voucher not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Non-printed navigation header */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/purchases/payments"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Payments</span>
        </Link>

        <Button
          onClick={handlePrint}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 gap-1.5 text-xs h-9"
        >
          <Printer className="w-4 h-4" />
          <span>Print Voucher</span>
        </Button>
      </div>

      {/* Printable Payment Voucher Slip */}
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6">
        {/* Header */}
        <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold tracking-widest text-emerald-600 uppercase">
            Official Payment Voucher
          </span>
          <h2 className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {payment.payment_no}
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            Date: {formatDate(payment.payment_date, 'en')}
          </p>
        </div>

        {/* Details Grid */}
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Paid To (Vendor):</span>
            <div className="text-right">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {payment.supplier?.name}
              </span>
              {payment.supplier?.code && (
                <span className="block text-[10px] text-slate-400 font-mono">
                  Code: {payment.supplier.code}
                </span>
              )}
            </div>
          </div>

          {payment.purchase && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Settled Against Purchase:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {payment.purchase.purchase_no}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Payment Method:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {payment.payment_method}
            </span>
          </div>

          {payment.reference_no && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Transaction Ref / Cheque #:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {payment.reference_no}
              </span>
            </div>
          )}

          {payment.notes && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-500 block">Remarks:</span>
              <p className="text-slate-700 dark:text-slate-300 italic">{payment.notes}</p>
            </div>
          )}

          {/* Amount Paid Callout */}
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Total Amount Disbursed
            </span>
            <div className="text-3xl font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {formatBDT(payment.amount)}
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
          <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2">
            Authorized Signature
          </div>
          <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2">
            Vendor Received By
          </div>
        </div>
      </div>
    </div>
  );
}
