'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import {
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  Search,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShoppingBag,
  CreditCard,
  Printer,
  Loader2,
  Plus,
  Trash2,
  Package,
  Layers,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { CrossBranchModal, CrossBranchProductInfo } from '@/components/pos/CrossBranchModal';
import { getPrintSettings, defaultPrinterAdapter } from '@/lib/utils/printer';
import {
  generateExchangeSlipHtml,
  generateReceiptHtml,
  ExchangeSlipData,
  SaleReceiptData,
} from '@/lib/utils/receipt-template';

interface ReturnItemSelection {
  saleItemId: string;
  sku: string;
  productName: string;
  maxReturnable: number;
  unitRefundPrice: number;
  quantity: number;
  condition: 'RESELLABLE' | 'DAMAGED';
  selectedUnits: string[];
  availableUnits: string[];
}

interface NewExchangeItem {
  variantId: string;
  barcode?: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  sourceBranchId?: string;
  productUnitBarcode?: string;
}

export default function GuidedExchangePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSaleId = searchParams.get('saleId');
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const toast = useToast();

  const currentBranch = useBranchStore((s) => s.currentBranch);

  // Wizard Step: 1 = Find Sale, 2 = Return Items, 3 = Pick New Items, 4 = Review & Settle
  const [currentStep, setCurrentStep] = useState<number>(initialSaleId ? 2 : 1);

  // Idempotency Key (Single UUID per intent)
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  // Step 1: Sale Lookup
  const [searchInvoice, setSearchInvoice] = useState<string>(initialSaleId || '');
  const [activeSaleId, setActiveSaleId] = useState<string | null>(initialSaleId || null);

  const { data: sale, isLoading: saleLoading, refetch: fetchSale } = useQuery({
    queryKey: ['sale-for-exchange', activeSaleId],
    queryFn: () => (activeSaleId ? api.sales.get(activeSaleId) : null),
    enabled: Boolean(activeSaleId),
  });

  // Step 2: Return Items state
  const [returnItems, setReturnItems] = useState<Record<string, ReturnItemSelection>>({});

  useEffect(() => {
    if (!sale?.items) return;
    const initial: Record<string, ReturnItemSelection> = {};
    for (const item of sale.items) {
      const sold = Number(item.quantity || 0);
      const ret = Number(item.returnedQty || item.returned_qty || 0);
      const maxRet = Math.max(0, sold - ret);
      const totalAmount = Number(item.totalAmount || item.total_amount || 0);
      const unitRefundPrice = sold > 0 ? new Decimal(totalAmount).div(sold).toNumber() : Number(item.unitPrice || 0);

      const unitBarcodes: string[] = Array.isArray(item.productUnits)
        ? item.productUnits.map((u: any) => u.barcodeValue || u.barcode_value)
        : item.productUnitBarcode
        ? [item.productUnitBarcode]
        : [];

      initial[item.id] = {
        saleItemId: item.id,
        sku: item.sku || item.variant?.sku || 'SKU',
        productName: item.productName || item.variant?.product?.name || item.variant?.sku || 'Item',
        maxReturnable: maxRet,
        unitRefundPrice,
        quantity: 0,
        condition: 'RESELLABLE',
        selectedUnits: [],
        availableUnits: unitBarcodes,
      };
    }
    setReturnItems(initial);
  }, [sale]);

  // Step 3: New Items state
  const [newItems, setNewItems] = useState<NewExchangeItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [crossBranchProduct, setCrossBranchProduct] = useState<CrossBranchProductInfo | null>(null);

  // Search catalog products
  const { data: catalogResults, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalog-search-exchange', catalogSearch],
    queryFn: () => (catalogSearch.trim().length >= 2 ? api.products.list({ search: catalogSearch, limit: 8 }) : null),
    enabled: catalogSearch.trim().length >= 2,
  });

  // Step 4: Difference & Tender Payments
  const [payments, setPayments] = useState<Array<{ paymentMethod: string; amount: number; transactionNo?: string }>>([
    { paymentMethod: 'CASH', amount: 0 },
  ]);
  const [reason, setReason] = useState<string>('');
  const [completedExchange, setCompletedExchange] = useState<any | null>(null);

  // Fetch active register shift
  const { data: currentShift } = useQuery({
    queryKey: ['register-session-current', currentBranch?.id],
    queryFn: () => api.sales.registerSessions.current(),
    enabled: Boolean(currentBranch?.id),
  });

  // Authoritative calculations (preview via Decimal.js)
  const totals = useMemo(() => {
    let returnedCredit = new Decimal(0);
    const selectedReturns = Object.values(returnItems).filter((i) => i.quantity > 0);
    for (const item of selectedReturns) {
      returnedCredit = returnedCredit.plus(new Decimal(item.quantity).times(item.unitRefundPrice));
    }

    let newTotal = new Decimal(0);
    for (const item of newItems) {
      const lineSubtotal = new Decimal(item.quantity).times(item.unitPrice).minus(item.discountAmount);
      newTotal = newTotal.plus(lineSubtotal);
    }

    const diff = newTotal.minus(returnedCredit);
    const isEven = diff.isZero();
    const customerPays = diff.greaterThan(0);
    const shopRefunds = diff.lessThan(0);

    return {
      returnedCredit: returnedCredit.toNumber(),
      newTotal: newTotal.toNumber(),
      diff: diff.toNumber(),
      absDiff: diff.abs().toNumber(),
      isEven,
      customerPays,
      shopRefunds,
      selectedReturns,
    };
  }, [returnItems, newItems]);

  // Auto-populate payment amount when customer pays
  useEffect(() => {
    if (totals.customerPays) {
      setPayments([{ paymentMethod: 'CASH', amount: totals.absDiff }]);
    } else {
      setPayments([]);
    }
  }, [totals.customerPays, totals.absDiff]);

  // Barcode quick-add for new items
  const handleBarcodeScanNewItem = async (barcode: string) => {
    if (!barcode.trim()) return;
    try {
      const result = await api.barcodes.lookup(barcode.trim());
      if (result?.variant) {
        addNewItemFromVariant(result.variant, barcode.trim());
        toast.success(`Added ${result.variant.sku} to exchange cart`);
      } else {
        toast.error(`Barcode "${barcode}" not found`);
      }
    } catch {
      toast.error(`Barcode "${barcode}" not found`);
    }
  };

  const addNewItemFromVariant = (variant: any, barcode?: string) => {
    const existingIndex = newItems.findIndex((i) => i.variantId === variant.id);
    if (existingIndex >= 0) {
      setNewItems((prev) =>
        prev.map((item, idx) => (idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item)),
      );
    } else {
      setNewItems((prev) => [
        ...prev,
        {
          variantId: variant.id,
          barcode,
          sku: variant.sku || 'SKU',
          name: variant.product?.name || variant.sku || 'Product',
          quantity: 1,
          unitPrice: Number(variant.retailPrice || variant.selling_price || 0),
          discountAmount: 0,
        },
      ]);
    }
  };

  // Submit Exchange Mutation
  const exchangeMutation = useMutation({
    mutationFn: async () => {
      return api.sales.exchanges.create({
        originalSaleId: sale?.id,
        originalInvoiceNo: sale?.invoiceNo || sale?.invoice_no,
        returnedItems: totals.selectedReturns.map((r) => ({
          saleItemId: r.saleItemId,
          quantity: r.quantity,
          condition: r.condition,
          trackedUnitBarcodes: r.selectedUnits.length > 0 ? r.selectedUnits : undefined,
        })),
        newItems: newItems.map((n) => ({
          variantId: n.variantId,
          barcode: n.barcode,
          quantity: n.quantity,
          unitPrice: n.unitPrice,
          discountAmount: n.discountAmount,
          sourceBranchId: n.sourceBranchId,
        })),
        payments: totals.customerPays
          ? payments.map((p) => ({ paymentMethod: p.paymentMethod, amount: p.amount, transactionNo: p.transactionNo }))
          : undefined,
        reason: reason.trim() || undefined,
        idempotencyKey,
      });
    },
    onSuccess: (data: any) => {
      toast.success(t('exchange.exchangeSuccess'));
      setCompletedExchange(data);
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['sales-exchanges-list'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Exchange failed to process';
      toast.error(msg, 'Exchange Rolled Back');
    },
  });

  // Print Handlers
  const handlePrintExchangeSlip = async () => {
    if (!completedExchange || !sale) return;
    try {
      const printSettings = getPrintSettings();
      const slipData: ExchangeSlipData = {
        exchangeNo: completedExchange.exchange_no || completedExchange.exchangeNo || 'EXC-000',
        originalInvoiceNo: sale.invoiceNo || sale.invoice_no,
        newInvoiceNo: completedExchange.newSale?.invoice_no || 'New Invoice',
        date: completedExchange.created_at || new Date().toISOString(),
        businessName: currentBranch?.name,
        branchName: currentBranch?.name || 'Branch',
        branchPhone: currentBranch?.phone || undefined,
        customer: sale.customer ? { name: sale.customer.name, phone: sale.customer.phone } : null,
        returnedItems: totals.selectedReturns.map((r) => ({
          sku: r.sku,
          quantity: r.quantity,
          refundPrice: r.unitRefundPrice,
          total: new Decimal(r.quantity).times(r.unitRefundPrice).toNumber(),
        })),
        newItems: newItems.map((n) => ({
          sku: n.sku,
          quantity: n.quantity,
          price: n.unitPrice,
          total: new Decimal(n.quantity).times(n.unitPrice).minus(n.discountAmount).toNumber(),
        })),
        returnedTotal: totals.returnedCredit,
        newItemsTotal: totals.newTotal,
        differenceAmount: totals.diff,
        adjustmentStatus: completedExchange.adjustment_status || (totals.isEven ? 'EVEN' : totals.customerPays ? 'CUSTOMER_PAID' : 'SHOP_REFUNDED'),
      };

      const html = generateExchangeSlipHtml(slipData, printSettings, false);
      await defaultPrinterAdapter.printReceipt(html, { copies: 1, format: printSettings.format });
    } catch {
      toast.error('Print failed');
    }
  };

  // Success Screen
  if (completedExchange) {
    return (
      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        <Card className="border-emerald-200 dark:border-emerald-900 shadow-md">
          <CardHeader className="text-center pb-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {t('exchange.exchangeSuccess')}
            </CardTitle>
            <CardDescription className="text-xs">
              Exchange #{completedExchange.exchange_no || completedExchange.exchangeNo} completed in one atomic transaction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('exchange.returnedCreditLabel')}:</span>
                <span className="font-bold text-sm text-foreground">BDT {totals.returnedCredit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('exchange.newItemsTotal')}:</span>
                <span className="font-bold text-sm text-foreground">BDT {totals.newTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                <span>{t('exchange.difference')}:</span>
                <span>
                  {totals.isEven
                    ? 'BDT 0.00 (Even Exchange)'
                    : totals.customerPays
                    ? `+ BDT ${totals.absDiff.toFixed(2)} (Customer Paid)`
                    : `- BDT ${totals.absDiff.toFixed(2)} (Shop Refunded)`}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                type="button"
                onClick={handlePrintExchangeSlip}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>{t('exchange.printExchangeSlip')}</span>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/sales/returns">Returns & Exchanges List</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Wizard Steps Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
            <span>{t('exchange.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('exchange.subtitle')}</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {[
            { num: 1, label: t('exchange.step1') },
            { num: 2, label: t('exchange.step2') },
            { num: 3, label: t('exchange.step3') },
            { num: 4, label: t('exchange.step4') },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              disabled={s.num > 1 && !sale}
              onClick={() => setCurrentStep(s.num)}
              className={`px-3 py-1.5 rounded-lg transition-all text-xs ${
                currentStep === s.num
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : currentStep > s.num
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: Find Sale */}
      {currentStep === 1 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <span>Step 1: Find Original Sale</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Scan barcode from the customer receipt or type the invoice number to load items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md space-y-3">
              <BarcodeInput
                onScan={(barcode: string) => {
                  setSearchInvoice(barcode);
                  setActiveSaleId(barcode);
                }}
                placeholder="Scan or type invoice no (e.g. INV-000001)..."
              />
              <Button
                type="button"
                disabled={!searchInvoice.trim() || saleLoading}
                onClick={() => setActiveSaleId(searchInvoice.trim())}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs"
              >
                {saleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Lookup Invoice</span>
              </Button>
            </div>

            {sale && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 mt-4 max-w-lg">
                <div className="flex justify-between font-bold text-foreground">
                  <span>Invoice: {sale.invoiceNo}</span>
                  <span>BDT {Number(sale.totalAmount).toFixed(2)}</span>
                </div>
                <div className="text-muted-foreground">
                  Date: {new Date(sale.saleDate).toLocaleDateString()} • Branch: {sale.branch?.name}
                </div>
                <div>Customer: {sale.customer ? `${sale.customer.name} (${sale.customer.phone})` : 'Walk-in'}</div>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
                >
                  <span>Select Items to Return</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Choose Items to Return */}
      {currentStep === 2 && sale && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-600" />
                <span>Step 2: Choose Items to Return</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {sale.invoiceNo}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Selected return value acts as an EXCHANGE CREDIT toward new purchases.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Item / SKU</th>
                    <th className="p-3 text-center">Max Returnable</th>
                    <th className="p-3 text-right">Credit Value / Unit</th>
                    <th className="p-3 text-center w-28">Return Qty</th>
                    <th className="p-3 w-36">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.values(returnItems).map((item) => (
                    <tr
                      key={item.saleItemId}
                      className={item.quantity > 0 ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}
                    >
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{item.productName}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{item.sku}</div>
                      </td>
                      <td className="p-3 text-center font-bold">{item.maxReturnable}</td>
                      <td className="p-3 text-right font-mono font-medium">BDT {item.unitRefundPrice.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min={0}
                          max={item.maxReturnable}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(item.maxReturnable, Number(e.target.value) || 0));
                            setReturnItems((prev) => ({
                              ...prev,
                              [item.saleItemId]: { ...prev[item.saleItemId], quantity: val },
                            }));
                          }}
                          className="h-8 w-20 text-center mx-auto text-xs"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          disabled={item.quantity === 0}
                          value={item.condition}
                          onChange={(e) => {
                            const cond = e.target.value as 'RESELLABLE' | 'DAMAGED';
                            setReturnItems((prev) => ({
                              ...prev,
                              [item.saleItemId]: { ...prev[item.saleItemId], condition: cond },
                            }));
                          }}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="RESELLABLE">Resellable</option>
                          <option value="DAMAGED">Damaged</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">{t('exchange.returnedCreditLabel')}:</span>
                <div className="text-base font-bold text-foreground font-mono">
                  BDT {totals.returnedCredit.toFixed(2)}
                </div>
              </div>
              <Button
                type="button"
                disabled={totals.selectedReturns.length === 0}
                onClick={() => setCurrentStep(3)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs"
              >
                <span>Next: Pick New Items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Pick New Items */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>Step 3: Pick New Items</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Scan barcode or search products to add items to the exchange cart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <BarcodeInput
                  onScan={handleBarcodeScanNewItem}
                  placeholder="Scan barcode for instant add..."
                />
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search catalog products..."
                  className="text-xs"
                />
              </div>

              {/* Quick search dropdown */}
              {catalogResults?.data && catalogResults.data.length > 0 && (
                <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto text-xs">
                  {catalogResults.data.map((prod: any) =>
                    (prod.variants || []).map((v: any) => (
                      <div
                        key={v.id}
                        className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold">{prod.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {v.sku} • BDT {Number(v.retailPrice || 0).toFixed(2)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addNewItemFromVariant(v)}
                          className="h-7 text-xs gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </Button>
                      </div>
                    )),
                  )}
                </div>
              )}

              {/* New Items Cart Table */}
              <div className="overflow-x-auto border rounded-xl border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">New Item / SKU</th>
                      <th className="p-3 text-center w-24">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Line Total</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {newItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          No new items selected yet. Scan or search above.
                        </td>
                      </tr>
                    ) : (
                      newItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{item.name}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">{item.sku}</div>
                          </td>
                          <td className="p-3 text-center">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value) || 1);
                                setNewItems((prev) =>
                                  prev.map((i, iIdx) => (iIdx === idx ? { ...i, quantity: val } : i)),
                                );
                              }}
                              className="h-8 w-16 text-center mx-auto text-xs"
                            />
                          </td>
                          <td className="p-3 text-right font-mono">BDT {item.unitPrice.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono font-bold">
                            BDT {(item.quantity * item.unitPrice - item.discountAmount).toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setNewItems((prev) => prev.filter((_, iIdx) => iIdx !== idx))}
                              className="h-7 w-7 p-0 text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)} className="gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Return Items</span>
              </Button>
              <Button
                type="button"
                disabled={newItems.length === 0}
                onClick={() => setCurrentStep(4)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs"
              >
                <span>Next: Review & Settle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* STEP 4: Review & Settle Difference */}
      {currentStep === 4 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Summary Box */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Exchange Financial Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-muted-foreground">{t('exchange.returnedCreditLabel')}:</span>
                <span className="font-mono font-bold text-foreground">
                  BDT {totals.returnedCredit.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground italic">
                {t('exchange.creditNote')}
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-muted-foreground">{t('exchange.newItemsTotal')}:</span>
                <span className="font-mono font-bold text-foreground">
                  BDT {totals.newTotal.toFixed(2)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1 mt-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Exchange Balance Status
                </span>
                <div className="font-bold text-sm">
                  {totals.isEven && (
                    <span className="text-slate-800 dark:text-slate-200">{t('exchange.statusEven')}</span>
                  )}
                  {totals.customerPays && (
                    <span className="text-rose-600 dark:text-rose-400">
                      {t('exchange.statusCustomerPays')}: BDT {totals.absDiff.toFixed(2)}
                    </span>
                  )}
                  {totals.shopRefunds && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {t('exchange.statusShopRefunds')}: BDT {totals.absDiff.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {totals.shopRefunds && !currentShift && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs">
                  {t('returns.cashRefundSessionWarning')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment & Submit Box */}
          <Card className="border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Settlement Tender & Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {totals.customerPays && (
                <div className="space-y-3">
                  <label className="font-semibold text-foreground">Tender for Difference Payment</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['CASH', 'BKASH', 'NAGAD'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() =>
                          setPayments((prev) => [{ ...prev[0], paymentMethod: method }])
                        }
                        className={`p-2 rounded-lg border text-xs font-semibold ${
                          payments[0]?.paymentMethod === method
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {payments[0]?.paymentMethod !== 'CASH' && (
                    <Input
                      value={payments[0]?.transactionNo || ''}
                      onChange={(e) =>
                        setPayments((prev) => [{ ...prev[0], transactionNo: e.target.value }])
                      }
                      placeholder="Transaction / Reference #..."
                      className="text-xs mt-2"
                    />
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Exchange Remarks (Optional)</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Size exchange for polo shirt..."
                  className="text-xs"
                />
              </div>
            </CardContent>

            <CardFooter className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                disabled={
                  exchangeMutation.isPending ||
                  (totals.shopRefunds && !currentShift) ||
                  totals.selectedReturns.length === 0 ||
                  newItems.length === 0
                }
                onClick={() => exchangeMutation.mutate()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
              >
                {exchangeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Atomic Exchange...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>{t('exchange.submitExchange')}</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
