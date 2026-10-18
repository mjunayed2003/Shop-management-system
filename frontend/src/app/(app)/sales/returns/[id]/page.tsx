'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  RotateCcw,
  ArrowLeft,
  Printer,
  Calendar,
  Package,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getPrintSettings, defaultPrinterAdapter } from '@/lib/utils/printer';
import { generateReturnSlipHtml, ReturnSlipData } from '@/lib/utils/receipt-template';

export default function SalesReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const returnId = resolvedParams.id;
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const [isReprint, setIsReprint] = useState(false);

  const { data: returnRecord, isLoading, error } = useQuery({
    queryKey: ['sales-return-detail', returnId],
    queryFn: () => api.sales.returns.get(returnId),
    enabled: Boolean(returnId),
  });

  const handleReprintSlip = async () => {
    if (!returnRecord) return;
    try {
      const printSettings = getPrintSettings();
      const slipData: ReturnSlipData = {
        returnNo: returnRecord.return_no,
        originalInvoiceNo: returnRecord.sale?.invoice_no || 'Invoice',
        date: returnRecord.created_at,
        businessName: currentBranch?.name,
        branchName: returnRecord.sale?.branch?.name || currentBranch?.name || 'Branch',
        branchPhone: currentBranch?.phone || undefined,
        customer: returnRecord.customer ? { name: returnRecord.customer.name, phone: returnRecord.customer.phone } : null,
        items: (returnRecord.items || []).map((i: any) => ({
          sku: i.variant?.sku || 'SKU',
          productName: i.variant?.sku,
          quantity: i.quantity,
          condition: i.condition,
          refundPrice: i.refund_price,
          totalRefund: i.total_refund,
        })),
        totalRefundAmount: returnRecord.total_refund_amount,
        refundMethod: returnRecord.refund_method,
        reason: returnRecord.reason,
      };

      const html = generateReturnSlipHtml(slipData, printSettings, isReprint);
      await defaultPrinterAdapter.printReceipt(html, {
        copies: 1,
        format: printSettings.format,
      });
      setIsReprint(true);
      toast.success('Return slip sent to printer (COPY marked)');
    } catch {
      toast.error('Print request failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span>{t('loading')}</span>
      </div>
    );
  }

  if (error || !returnRecord) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-foreground">Return Voucher Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Could not locate return record &quot;{returnId}&quot;.
        </p>
        <Button asChild variant="outline" className="mt-4 gap-2">
          <Link href="/sales/returns">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Returns</span>
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href="/sales/returns">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-indigo-600" />
                <span>{returnRecord.return_no}</span>
              </h1>
              <Badge variant="secondary" className="text-xs font-mono">
                {returnRecord.refund_method}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Processed on {new Date(returnRecord.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleReprintSlip}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs font-semibold"
        >
          <Printer className="w-4 h-4" />
          <span>{t('returns.printReturnSlip')} (COPY)</span>
        </Button>
      </div>

      {/* Meta Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <Card className="p-4 border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-muted-foreground">Original Invoice</span>
          <div className="font-mono font-bold text-sm text-primary">
            {returnRecord.sale ? (
              <Link href={`/sales/${returnRecord.sale.id}`} className="hover:underline">
                {returnRecord.sale.invoice_no}
              </Link>
            ) : (
              'N/A'
            )}
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-muted-foreground">Customer</span>
          <div className="font-semibold text-sm text-foreground">
            {returnRecord.customer ? `${returnRecord.customer.name} (${returnRecord.customer.phone})` : 'Walk-in'}
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-muted-foreground">Total Refund Paid</span>
          <div className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
            BDT {Number(returnRecord.total_refund_amount).toFixed(2)}
          </div>
        </Card>
      </div>

      {/* Items Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span>Returned Items</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3 text-center">Condition</th>
                <th className="p-3 text-center">Quantity</th>
                <th className="p-3 text-right">Unit Refund</th>
                <th className="p-3 text-right">Total Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(returnRecord.items || []).map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                  <td className="p-3 font-mono font-semibold">{item.variant?.sku || 'SKU'}</td>
                  <td className="p-3 text-center">
                    <Badge variant={item.condition === 'DAMAGED' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {item.condition}
                    </Badge>
                  </td>
                  <td className="p-3 text-center font-bold">{item.quantity}</td>
                  <td className="p-3 text-right font-mono">BDT {Number(item.refund_price).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-bold">BDT {Number(item.total_refund).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {returnRecord.reason && (
        <Card className="p-4 border-slate-200 dark:border-slate-800 text-xs">
          <span className="font-semibold text-muted-foreground">Reason for Return:</span>
          <p className="mt-1 text-foreground">{returnRecord.reason}</p>
        </Card>
      )}
    </div>
  );
}
