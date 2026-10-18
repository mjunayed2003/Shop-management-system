'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  defaultPrinterAdapter,
  getPrintSettings,
} from '@/lib/utils/printer';
import {
  generateReceiptHtml,
  SaleReceiptData,
} from '@/lib/utils/receipt-template';
import {
  ArrowLeft,
  Printer,
  Ban,
  RotateCcw,
  User,
  Clock,
  Store,
  CreditCard,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Loader2,
  FileText,
} from 'lucide-react';

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = String(params.id);
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, business, hasPermission } = useAuthStore();

  const canVoid =
    hasPermission('sale.void') ||
    hasPermission('sales:void') ||
    hasPermission('*');

  const canViewCost =
    user?.isOwner ||
    hasPermission('cost.view') ||
    hasPermission('stock.cost');

  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const { data: sale, isLoading, error } = useQuery({
    queryKey: ['sale-detail', saleId],
    queryFn: async () => {
      return api.sales.get(saleId);
    },
    enabled: Boolean(saleId),
  });

  // Void mutation
  const voidMutation = useMutation({
    mutationFn: async (reason: string) => {
      return api.sales.void(sale.id, { reason });
    },
    onSuccess: () => {
      toast.success(t('pos.saleVoided'));
      setIsVoidDialogOpen(false);
      setVoidError(null);
      queryClient.invalidateQueries({ queryKey: ['sale-detail', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to void invoice';
      setVoidError(msg);
      toast.error(msg, 'Void Refused');
    },
  });

  const handleReprint = async () => {
    if (!sale) return;
    try {
      const printSettings = getPrintSettings();
      const receiptData: SaleReceiptData = {
        ...sale,
        businessName: business?.name,
        cashierName: sale.cashier?.name,
      };
      const html = generateReceiptHtml(receiptData, printSettings, true);
      await defaultPrinterAdapter.printReceipt(html, {
        copies: 1,
        format: printSettings.format,
      });
    } catch {
      toast.error('Print request failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span>Loading invoice details...</span>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
        <h2 className="text-lg font-bold text-foreground">Sale Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Could not find any invoice matching &quot;{saleId}&quot; in the current branch.
        </p>
        <Button asChild variant="outline" className="mt-4 gap-1.5">
          <Link href="/sales">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sales</span>
          </Link>
        </Button>
      </div>
    );
  }

  const isVoided = sale.status === 'VOIDED';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <Link href="/sales">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
                {sale.invoiceNo}
              </h1>
              <StatusBadge status={sale.status} />
              <Badge variant="outline" className="text-xs font-mono">
                {sale.saleType}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(sale.saleDate).toLocaleString([], {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Reprint Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReprint}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>{t('pos.reprintReceipt')}</span>
          </Button>

          {/* Return / Exchange (F5 placeholder) */}
          {!isVoided && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Link href={`/sales/${sale.id}/return`}>
                <RotateCcw className="w-4 h-4 text-indigo-600" />
                <span>Return / Exchange</span>
              </Link>
            </Button>
          )}

          {/* Void Invoice Button */}
          {canVoid && !isVoided && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setVoidError(null);
                setIsVoidDialogOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Ban className="w-4 h-4" />
              <span>{t('pos.voidSale')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Void Notice Banner if Voided */}
      {isVoided && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Ban className="w-4 h-4 text-rose-600" />
            <span>THIS INVOICE HAS BEEN VOIDED</span>
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-300">
            Void Reason: <strong>{sale.voidReason || 'No reason specified'}</strong>
            {sale.voidedAt && ` (Voided on ${new Date(sale.voidedAt).toLocaleString()})`}
          </p>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
            Reversed inventory stock movements and restored tracked product units. Customer due balances have been debited back. Note: auto-transfers between branches are not reversed.
          </p>
        </div>
      )}

      {/* Auto-Transfer Banner if any items were auto-transferred */}
      {sale.autoTransfers && sale.autoTransfers.length > 0 && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Cross-Branch Auto-Transfers Dispatched</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sale.autoTransfers.map((t: any, idx: number) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-card/60 border border-indigo-100 dark:border-indigo-900 text-xs font-mono space-y-0.5"
              >
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">{t.variantSku || 'Variant'}</span>
                  <span className="font-bold text-indigo-600">Transfer #{t.transferNo}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Source Branch: <strong>{t.sourceBranch}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Card */}
        <Card className="border-border">
          <CardHeader className="p-3.5 pb-2 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>{t('pos.customer')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 text-xs space-y-1.5">
            {sale.customer ? (
              <>
                <p className="font-bold text-foreground text-sm">{sale.customer.name}</p>
                <p className="text-muted-foreground font-mono">{sale.customer.phone}</p>
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-muted-foreground">Customer Due:</span>
                  <span className="font-bold text-rose-600 font-mono">
                    ৳{Number(sale.customer.currentDue || 0).toFixed(2)}
                  </span>
                </div>
                <div className="pt-1">
                  <Button asChild variant="outline" size="sm" className="w-full h-7 text-[11px]">
                    <Link href={`/customers/${sale.customer.id}/collect-due`}>
                      Collect Due
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground italic">Walk-in Customer (No customer account attached)</p>
            )}
          </CardContent>
        </Card>

        {/* Branch & Register Card */}
        <Card className="border-border">
          <CardHeader className="p-3.5 pb-2 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-primary" />
              <span>Outlet & Register</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch:</span>
              <span className="font-semibold text-foreground">{sale.branch?.name} ({sale.branch?.code})</span>
            </div>
            {sale.cashRegister && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Register:</span>
                <span className="font-mono text-foreground">{sale.cashRegister.name} ({sale.cashRegister.code})</span>
              </div>
            )}
            {sale.cashier && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cashier:</span>
                <span className="text-foreground">{sale.cashier.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Summary Overview */}
        <Card className="border-border">
          <CardHeader className="p-3.5 pb-2 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              <span>Totals Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-mono">৳{Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {Number(sale.discountAmount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span className="font-mono">-৳{Number(sale.discountAmount).toFixed(2)}</span>
              </div>
            )}
            {sale.coupon && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Coupon ({sale.coupon}):</span>
                <span>Applied</span>
              </div>
            )}
            {Number(sale.roundOff) !== 0 && (
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Round-off:</span>
                <span className="font-mono">{Number(sale.roundOff) > 0 ? '+' : ''}৳{Number(sale.roundOff).toFixed(2)}</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-border flex justify-between font-extrabold text-sm text-foreground">
              <span>Total Payable:</span>
              <span className="font-mono">৳{Number(sale.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Paid:</span>
              <span className="font-mono">৳{Number(sale.paidAmount).toFixed(2)}</span>
            </div>
            {Number(sale.dueAmount) > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Due Balance:</span>
                <span className="font-mono">৳{Number(sale.dueAmount).toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sale Items Table */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="p-3.5 pb-2 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground">
            Invoice Items ({sale.items?.length || 0})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Product / Variant</th>
                <th className="p-3 font-mono">SKU / Unit</th>
                <th className="p-3 text-right">Price</th>
                {canViewCost && <th className="p-3 text-right">Cost (WAC)</th>}
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Discount</th>
                <th className="p-3 text-right">Total</th>
                {canViewCost && <th className="p-3 text-right">Profit</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sale.items?.map((item: any, idx: number) => {
                const lineTotal = Number(item.totalAmount);
                const lineCost = Number(item.totalCost || item.unitCost * item.quantity);
                const profit = lineTotal - lineCost;

                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-bold text-foreground">{item.productName}</p>
                      {(item.size || item.color) && (
                        <p className="text-[10px] text-muted-foreground">
                          {[item.size, item.color].filter(Boolean).join(' / ')}
                        </p>
                      )}
                    </td>
                    <td className="p-3 font-mono">
                      <div>{item.sku}</div>
                      {item.productUnitBarcode && (
                        <Badge variant="outline" className="text-[9px] mt-0.5 font-mono">
                          Unit: {item.productUnitBarcode}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono">৳{Number(item.unitPrice).toFixed(2)}</td>
                    {canViewCost && (
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        ৳{Number(item.unitCost || 0).toFixed(2)}
                      </td>
                    )}
                    <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {Number(item.discountAmount) > 0 ? `৳${Number(item.discountAmount).toFixed(2)}` : '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">
                      ৳{lineTotal.toFixed(2)}
                    </td>
                    {canViewCost && (
                      <td className={`p-3 text-right font-mono font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ৳{profit.toFixed(2)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payments Record Table */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="p-3.5 pb-2 border-b border-border bg-muted/20">
          <CardTitle className="text-sm font-bold text-foreground">
            Payment Tenders ({sale.payments?.length || 0})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Method</th>
                <th className="p-3 font-mono">Transaction No / Ref</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sale.payments?.map((pay: any) => (
                <tr key={pay.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-bold text-foreground">{pay.method}</td>
                  <td className="p-3 font-mono text-muted-foreground">
                    {pay.transactionNo || '—'}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(pay.date || sale.saleDate).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">
                    ৳{Number(pay.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Void Dialog with required reason */}
      <ConfirmDialog
        isOpen={isVoidDialogOpen}
        onClose={() => setIsVoidDialogOpen(false)}
        onConfirm={(reason) => {
          if (reason) voidMutation.mutate(reason);
        }}
        title={t('pos.voidSale')}
        description={
          <div className="space-y-2 text-xs">
            <p>{t('pos.voidConfirm', { invoiceNo: sale.invoiceNo })}</p>
            <p className="text-muted-foreground">{t('pos.voidNotice')}</p>
            {voidError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-medium">
                {voidError}
              </div>
            )}
          </div>
        }
        variant="destructive"
        requireReason
        reasonLabel={t('pos.voidReason')}
        confirmText="Confirm Void"
        cancelText={t('cancel')}
        isLoading={voidMutation.isPending}
      />
    </div>
  );
}
