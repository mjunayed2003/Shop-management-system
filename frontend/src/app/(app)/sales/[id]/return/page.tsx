'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import {
  RotateCcw,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Package,
  ArrowLeftRight,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { usePermission } from '@/components/shared/PermissionGate';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/feedback/ToastContext';
import { getPrintSettings, defaultPrinterAdapter } from '@/lib/utils/printer';
import { generateReturnSlipHtml, ReturnSlipData } from '@/lib/utils/receipt-template';

interface ItemReturnState {
  saleItemId: string;
  sku: string;
  productName: string;
  soldQty: number;
  returnedQty: number;
  maxReturnable: number;
  unitRefundPrice: number;
  returnQty: number;
  condition: 'RESELLABLE' | 'DAMAGED';
  selectedUnits: string[];
  availableUnits: string[];
}

export default function SalesReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const saleId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const toast = useToast();

  const currentBranch = useBranchStore((s) => s.currentBranch);
  const { hasPermission: canCrossBranch } = usePermission('return.cross_branch');
  const { hasPermission: canCreateReturn } = usePermission('return.create');

  // Single Idempotency Key per return intent
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, [saleId]);

  // Form states
  const [itemStates, setItemStates] = useState<Record<string, ItemReturnState>>({});
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BKASH' | 'NAGAD'>('CASH');
  const [reason, setReason] = useState<string>('');
  const [completedReturn, setCompletedReturn] = useState<any | null>(null);
  const [isReprint, setIsReprint] = useState<boolean>(false);

  // Fetch sale detail
  const { data: sale, isLoading: saleLoading, error: saleError } = useQuery({
    queryKey: ['sale-detail', saleId],
    queryFn: () => api.sales.get(saleId),
    enabled: Boolean(saleId),
  });

  // Fetch active register shift for cash refund check
  const { data: currentShift } = useQuery({
    queryKey: ['register-session-current', currentBranch?.id],
    queryFn: () => api.sales.registerSessions.current(),
    enabled: Boolean(currentBranch?.id),
    staleTime: 10_000,
  });

  // Populate item states on sale load
  useEffect(() => {
    if (!sale?.items) return;

    const initial: Record<string, ItemReturnState> = {};
    for (const item of sale.items) {
      const sold = Number(item.quantity || 0);
      const ret = Number(item.returnedQty || item.returned_qty || 0);
      const maxRet = Math.max(0, sold - ret);

      // Authoritative unit price paid after discounts
      const totalAmount = Number(item.totalAmount || item.total_amount || 0);
      const unitRefundPrice = sold > 0 ? new Decimal(totalAmount).div(sold).toNumber() : Number(item.unitPrice || 0);

      // Tracked unit barcodes if individually tracked
      const unitBarcodes: string[] = Array.isArray(item.productUnits)
        ? item.productUnits.map((u: any) => u.barcodeValue || u.barcode_value)
        : item.productUnitBarcode
        ? [item.productUnitBarcode]
        : [];

      initial[item.id] = {
        saleItemId: item.id,
        sku: item.sku || item.variant?.sku || 'SKU',
        productName: item.productName || item.variant?.product?.name || item.variant?.sku || 'Product',
        soldQty: sold,
        returnedQty: ret,
        maxReturnable: maxRet,
        unitRefundPrice,
        returnQty: 0,
        condition: 'RESELLABLE',
        selectedUnits: [],
        availableUnits: unitBarcodes,
      };
    }
    setItemStates(initial);
  }, [sale]);

  // Calculations for local preview (Authoritative comes from server on submit)
  const preview = useMemo(() => {
    let totalRefundDecimal = new Decimal(0);
    const selectedItemsList: Array<{
      saleItemId: string;
      quantity: number;
      condition: 'RESELLABLE' | 'DAMAGED';
      trackedUnitBarcodes?: string[];
      refundPrice: number;
    }> = [];

    for (const state of Object.values(itemStates)) {
      if (state.returnQty > 0) {
        const itemRefund = new Decimal(state.returnQty).times(state.unitRefundPrice);
        totalRefundDecimal = totalRefundDecimal.plus(itemRefund);
        selectedItemsList.push({
          saleItemId: state.saleItemId,
          quantity: state.returnQty,
          condition: state.condition,
          trackedUnitBarcodes: state.selectedUnits.length > 0 ? state.selectedUnits : undefined,
          refundPrice: state.unitRefundPrice,
        });
      }
    }

    const saleDue = new Decimal(sale?.dueAmount || sale?.due_amount || 0);
    const dueReduction = Decimal.min(totalRefundDecimal, saleDue);
    const payoutAmount = Decimal.max(0, totalRefundDecimal.minus(dueReduction));

    return {
      totalRefund: totalRefundDecimal.toNumber(),
      dueReduction: dueReduction.toNumber(),
      payoutAmount: payoutAmount.toNumber(),
      selectedItemsList,
    };
  }, [itemStates, sale]);

  // Validation checks
  const isVoided = sale?.status === 'VOIDED';
  const isCrossBranch = sale && currentBranch && sale.branchId && sale.branchId !== currentBranch.id;
  const isCrossBranchBlocked = isCrossBranch && !canCrossBranch;
  const isCashWithNoShift = refundMethod === 'CASH' && !currentShift;
  const hasNoItemsSelected = preview.selectedItemsList.length === 0;
  const isReasonMissing = !reason.trim();
  const canSubmit =
    canCreateReturn &&
    !isVoided &&
    !isCrossBranchBlocked &&
    !isCashWithNoShift &&
    !hasNoItemsSelected &&
    !isReasonMissing;

  // Return Mutation
  const returnMutation = useMutation({
    mutationFn: async () => {
      return api.sales.returns.create({
        saleId: sale.id,
        items: preview.selectedItemsList.map((i) => ({
          saleItemId: i.saleItemId,
          quantity: i.quantity,
          condition: i.condition,
          trackedUnitBarcodes: i.trackedUnitBarcodes,
        })),
        refundMethod,
        reason: reason.trim(),
        idempotencyKey,
      });
    },
    onSuccess: (data: any) => {
      toast.success(t('returns.returnSuccess'));
      setCompletedReturn(data);
      queryClient.invalidateQueries({ queryKey: ['sale-detail', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales-returns-list'] });
      queryClient.invalidateQueries({ queryKey: ['register-session-current'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to process return';
      toast.error(msg, 'Return Refused');
    },
  });

  // Print slip handler
  const handlePrintSlip = async () => {
    if (!completedReturn || !sale) return;
    try {
      const printSettings = getPrintSettings();
      const slipData: ReturnSlipData = {
        returnNo: completedReturn.return_no || completedReturn.returnNo || 'RET-000',
        originalInvoiceNo: sale.invoiceNo || sale.invoice_no,
        date: completedReturn.created_at || new Date().toISOString(),
        businessName: currentBranch?.name,
        branchName: currentBranch?.name || 'Main Branch',
        branchPhone: currentBranch?.phone || undefined,
        customer: sale.customer ? { name: sale.customer.name, phone: sale.customer.phone } : null,
        items: preview.selectedItemsList.map((i) => ({
          sku: itemStates[i.saleItemId]?.sku || 'SKU',
          quantity: i.quantity,
          condition: i.condition,
          refundPrice: i.refundPrice,
          totalRefund: new Decimal(i.quantity).times(i.refundPrice).toNumber(),
        })),
        totalRefundAmount: completedReturn.total_refund_amount || preview.totalRefund,
        refundMethod,
        dueReduction: completedReturn.dueReduction || preview.dueReduction,
        payoutAmount: completedReturn.payoutAmount || preview.payoutAmount,
        reason,
      };

      const html = generateReturnSlipHtml(slipData, printSettings, isReprint);
      await defaultPrinterAdapter.printReceipt(html, {
        copies: 1,
        format: printSettings.format,
      });
      setIsReprint(true);
    } catch {
      toast.error('Print failed. Please verify printer connection.');
    }
  };

  if (saleLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span>{t('loading')}</span>
      </div>
    );
  }

  if (saleError || !sale) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-foreground">Invoice Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Could not locate invoice with identifier &quot;{saleId}&quot;.
        </p>
        <Button asChild variant="outline" className="mt-4 gap-2">
          <Link href="/sales">
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back')}</span>
          </Link>
        </Button>
      </div>
    );
  }

  // Success view with return voucher details and print options
  if (completedReturn) {
    return (
      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        <Card className="border-emerald-200 dark:border-emerald-900 shadow-md">
          <CardHeader className="text-center pb-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {t('returns.returnSuccess')}
            </CardTitle>
            <CardDescription className="text-xs">
              Voucher #{completedReturn.return_no || completedReturn.returnNo} processed against invoice {sale.invoiceNo}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('returns.totalRefund')}:</span>
                <span className="font-bold text-sm">BDT {Number(completedReturn.total_refund_amount || preview.totalRefund).toFixed(2)}</span>
              </div>
              {Number(completedReturn.dueReduction || preview.dueReduction) > 0 && (
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                  <span>{t('returns.dueReduction')}:</span>
                  <span className="font-semibold">- BDT {Number(completedReturn.dueReduction || preview.dueReduction).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>{t('returns.paidBackToCustomer')} ({refundMethod}):</span>
                <span>BDT {Number(completedReturn.payoutAmount ?? preview.payoutAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                type="button"
                onClick={handlePrintSlip}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>{t('returns.printReturnSlip')}</span>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/sales/${sale.id}`}>View Invoice</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header & Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href={`/sales/${sale.id}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-indigo-600" />
                <span>{t('returns.title')}</span>
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                {sale.invoiceNo}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sale.customer ? `${sale.customer.name} (${sale.customer.phone})` : 'Walk-in Customer'} • Sold on{' '}
              {new Date(sale.saleDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Link to simultaneous exchange wizard */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="gap-2 text-xs font-semibold border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
        >
          <Link href={`/sales/exchange?saleId=${sale.id}`}>
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Switch to Exchange Wizard</span>
          </Link>
        </Button>
      </div>

      {/* Rules Banners */}
      {isVoided && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <span className="font-semibold">{t('returns.voidedSaleError')}</span>
            <p className="mt-0.5 opacity-90">
              This invoice has been voided. Goods and customer ledger have already been reversed.
            </p>
          </div>
        </div>
      )}

      {isCrossBranchBlocked && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-semibold">
              {t('returns.crossBranchRefused', { branch: sale.branch?.name || 'another branch' })}
            </span>
            <p className="mt-0.5 opacity-90">
              Only authorized staff with the &quot;return.cross_branch&quot; permission can accept returns across showroom locations.
            </p>
          </div>
        </div>
      )}

      {isCrossBranch && canCrossBranch && (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 flex items-start gap-2.5 text-xs text-indigo-800 dark:text-indigo-200">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
          <div>
            <span className="font-semibold">
              {t('returns.crossBranchNotice', { branch: sale.branch?.name || 'Other Branch' })}
            </span>
          </div>
        </div>
      )}

      {isCashWithNoShift && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{t('returns.cashRefundSessionWarning')}</span>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <Link href="/pos">Open Register Shift</Link>
          </Button>
        </div>
      )}

      {/* Item Selection Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span>{t('returns.itemsToReturn')}</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Select quantity and condition for each item being returned.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Item / SKU</th>
                  <th className="p-3 text-center">{t('returns.soldQty')}</th>
                  <th className="p-3 text-center">{t('returns.returnedQty')}</th>
                  <th className="p-3 text-center">{t('returns.maxReturnable')}</th>
                  <th className="p-3 text-right">{t('returns.refundPrice')}</th>
                  <th className="p-3 text-center w-28">{t('returns.returnQty')}</th>
                  <th className="p-3 w-40">{t('returns.condition')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.values(itemStates).map((item) => {
                  const isEligible = item.maxReturnable > 0 && !isVoided && !isCrossBranchBlocked;

                  return (
                    <tr
                      key={item.saleItemId}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors ${
                        item.returnQty > 0 ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{item.productName}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{item.sku}</div>
                        {/* Tracked units picker if tracked */}
                        {item.availableUnits.length > 0 && item.returnQty > 0 && (
                          <div className="mt-1.5 p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Tracked Units ({item.selectedUnits.length}/{item.returnQty}):
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.availableUnits.map((barcode) => {
                                const isSelected = item.selectedUnits.includes(barcode);
                                return (
                                  <button
                                    key={barcode}
                                    type="button"
                                    onClick={() => {
                                      setItemStates((prev) => {
                                        const cur = prev[item.saleItemId];
                                        const newSelected = isSelected
                                          ? cur.selectedUnits.filter((b) => b !== barcode)
                                          : cur.selectedUnits.length < cur.returnQty
                                          ? [...cur.selectedUnits, barcode]
                                          : cur.selectedUnits;
                                        return {
                                          ...prev,
                                          [item.saleItemId]: { ...cur, selectedUnits: newSelected },
                                        };
                                      });
                                    }}
                                    className={`px-1.5 py-0.5 rounded font-mono border text-[9px] ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300'
                                    }`}
                                  >
                                    {barcode}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">{item.soldQty}</td>
                      <td className="p-3 text-center text-muted-foreground">{item.returnedQty}</td>
                      <td className="p-3 text-center font-bold text-foreground">{item.maxReturnable}</td>
                      <td className="p-3 text-right font-mono font-medium">BDT {item.unitRefundPrice.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min={0}
                          max={item.maxReturnable}
                          step={1}
                          disabled={!isEligible}
                          value={item.returnQty}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(item.maxReturnable, Number(e.target.value) || 0));
                            setItemStates((prev) => ({
                              ...prev,
                              [item.saleItemId]: {
                                ...prev[item.saleItemId],
                                returnQty: val,
                                selectedUnits: prev[item.saleItemId].selectedUnits.slice(0, val),
                              },
                            }));
                          }}
                          className="h-8 w-20 text-center mx-auto text-xs"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          disabled={!isEligible || item.returnQty === 0}
                          value={item.condition}
                          onChange={(e) => {
                            const cond = e.target.value as 'RESELLABLE' | 'DAMAGED';
                            setItemStates((prev) => ({
                              ...prev,
                              [item.saleItemId]: { ...prev[item.saleItemId], condition: cond },
                            }));
                          }}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="RESELLABLE">Resellable</option>
                          <option value="DAMAGED">Damaged</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Return Controls & Server Calculation Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Return Metadata & Payment Method */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Return Details & Tender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Refund tender selector */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">{t('returns.refundMethod')}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'BKASH', 'NAGAD'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRefundMethod(m)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      refundMethod === m
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t('returns.storeCreditNotSupported')}
              </p>
            </div>

            {/* Mandatory Reason */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                {t('returns.reason')} <span className="text-rose-500">*</span>
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('returns.reasonPlaceholder')}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right: Authoritative Refund Split Breakdown */}
        <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">{t('returns.previewTitle')}</CardTitle>
            <CardDescription className="text-xs">
              Due reduction is applied first; remaining balance is paid out to customer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-muted-foreground">{t('returns.totalRefund')}:</span>
              <span className="font-bold text-base text-foreground font-mono">
                BDT {preview.totalRefund.toFixed(2)}
              </span>
            </div>

            {preview.dueReduction > 0 && (
              <div className="flex justify-between py-1 text-indigo-600 dark:text-indigo-400">
                <span>{t('returns.dueReduction')}:</span>
                <span className="font-semibold font-mono">- BDT {preview.dueReduction.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between py-1 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              <span>{t('returns.paidBackToCustomer')} ({refundMethod}):</span>
              <span className="font-mono">BDT {preview.payoutAmount.toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              type="button"
              disabled={!canSubmit || returnMutation.isPending}
              onClick={() => returnMutation.mutate()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
            >
              {returnMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Return...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('returns.confirmReturn')}</span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
