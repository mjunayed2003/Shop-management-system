'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  ArrowLeft,
  Plus,
  Trash2,
  Barcode,
  Search,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Printer,
  FileText,
  DollarSign,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { SupplierModal } from '@/components/purchases/SupplierModal';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT } from '@/lib/utils/formatters';
import { generateIdempotencyKey } from '@/lib/utils/idempotency';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

interface PurchaseItemRow {
  variantId: string;
  sku: string;
  productName: string;
  sizeName?: string;
  colorName?: string;
  barcode?: string;
  quantity: number;
  unitCost: number;
  currentCost: number;
  trackIndividually: boolean;
  vatPercentage: number;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const poIdParam = searchParams.get('poId') || '';
  const supplierIdParam = searchParams.get('supplierId') || '';

  // Stable idempotency key per form open
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey('purchase'));

  // Form states
  const [supplierId, setSupplierId] = useState(supplierIdParam);
  const [purchaseOrderId, setPurchaseOrderId] = useState(poIdParam);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK');
  const [paymentReference, setPaymentReference] = useState('');
  const [landedCost, setLandedCost] = useState(false);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<PurchaseItemRow[]>([]);
  const [variantSearch, setVariantSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [createdPurchase, setCreatedPurchase] = useState<any | null>(null);

  // Draft persistence check
  const draftKey = `purchase_draft_${currentBranchId}_${user?.id}`;
  const [hasDraft, setHasDraft] = useState(false);

  // Check draft on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !poIdParam) {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
            setHasDraft(true);
          }
        }
      } catch {
        // ignore parse error
      }
    }
  }, [draftKey, poIdParam]);

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.supplierId) setSupplierId(parsed.supplierId);
        if (parsed.supplierInvoiceNo) setSupplierInvoiceNo(parsed.supplierInvoiceNo);
        if (parsed.purchaseDate) setPurchaseDate(parsed.purchaseDate);
        if (parsed.discountAmount) setDiscountAmount(parsed.discountAmount);
        if (parsed.taxAmount) setTaxAmount(parsed.taxAmount);
        if (parsed.shippingCost) setShippingCost(parsed.shippingCost);
        if (parsed.paidAmount) setPaidAmount(parsed.paidAmount);
        if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
        if (parsed.paymentReference) setPaymentReference(parsed.paymentReference);
        if (parsed.landedCost !== undefined) setLandedCost(parsed.landedCost);
        if (parsed.notes) setNotes(parsed.notes);
        if (Array.isArray(parsed.items)) setItems(parsed.items);
        showToast('Draft restored successfully', 'info');
      }
    } catch {
      showToast('Failed to restore draft', 'error');
    }
    setHasDraft(false);
  };

  const discardDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(draftKey);
    }
    setHasDraft(false);
  };

  // Autosave draft on form changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !createdPurchase && items.length > 0) {
      const draft = {
        supplierId,
        supplierInvoiceNo,
        purchaseDate,
        discountAmount,
        taxAmount,
        shippingCost,
        paidAmount,
        paymentMethod,
        paymentReference,
        landedCost,
        notes,
        items,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [
    draftKey,
    createdPurchase,
    supplierId,
    supplierInvoiceNo,
    purchaseDate,
    discountAmount,
    taxAmount,
    shippingCost,
    paidAmount,
    paymentMethod,
    paymentReference,
    landedCost,
    notes,
    items,
  ]);

  // Load suppliers dropdown
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-dropdown', currentBranchId],
    queryFn: () => api.purchases.suppliers.list({ limit: 100, isActive: true }),
  });

  // If opened with ?poId=..., fetch PO details and pre-fill items with remaining quantities
  const { data: linkedPo } = useQuery({
    queryKey: ['po-prefill', poIdParam, currentBranchId],
    queryFn: () => api.purchases.orders.get(poIdParam),
    enabled: Boolean(poIdParam),
  });

  useEffect(() => {
    if (linkedPo) {
      setSupplierId(linkedPo.supplier_id || linkedPo.supplierId);
      setPurchaseOrderId(linkedPo.id);

      // Pre-fill items with remaining quantities: quantity - received_quantity
      const prefillItems: PurchaseItemRow[] = (linkedPo.items || [])
        .map((poi: any) => {
          const ordered = Number(poi.quantity);
          const received = Number(poi.received_quantity || 0);
          const remaining = Math.max(0, ordered - received);
          if (remaining <= 0) return null;

          return {
            variantId: poi.product_variant_id || poi.variantId || poi.variant?.id,
            sku: poi.variant?.sku || '',
            productName: poi.variant?.product?.name || 'Product',
            sizeName: poi.variant?.size?.name,
            colorName: poi.variant?.color?.name,
            barcode: poi.variant?.barcode,
            quantity: remaining,
            unitCost: Number(poi.unit_cost || 0),
            currentCost: Number(poi.variant?.cost_price || poi.unit_cost || 0),
            trackIndividually: Boolean(poi.variant?.product?.track_individually),
            vatPercentage: 0,
          };
        })
        .filter(Boolean) as PurchaseItemRow[];

      if (prefillItems.length > 0) {
        setItems(prefillItems);
        showToast(
          `Pre-filled ${prefillItems.length} items from PO ${linkedPo.po_no}`,
          'info',
        );
      }
    }
  }, [linkedPo, showToast]);

  // Variant search
  const { data: searchResults } = useQuery({
    queryKey: ['variant-search-purchase', currentBranchId, variantSearch],
    queryFn: () =>
      api.catalog.products.list({
        search: variantSearch,
        limit: 10,
      }),
    enabled: variantSearch.trim().length >= 2,
  });

  const addOrIncrementVariant = (variant: any, defaultQty = 1) => {
    const isTracked = Boolean(variant.product?.track_individually);
    const qtyToAdd = isTracked ? Math.round(defaultQty) : defaultQty;

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.variantId === variant.id);
      if (existingIdx >= 0) {
        // Merge duplicate variant by incrementing qty
        const next = [...prev];
        next[existingIdx].quantity += qtyToAdd;
        return next;
      }

      return [
        ...prev,
        {
          variantId: variant.id,
          sku: variant.sku,
          productName: variant.product?.name || variant.name || 'Product',
          sizeName: variant.size?.name,
          colorName: variant.color?.name,
          barcode: variant.barcode,
          quantity: qtyToAdd,
          unitCost: Number(variant.cost_price || variant.costPrice || 0),
          currentCost: Number(variant.cost_price || variant.costPrice || 0),
          trackIndividually: isTracked,
          vatPercentage: 0,
        },
      ];
    });
    setVariantSearch('');
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const res = await api.catalog.barcodes.lookup(barcode);
      if (res?.variant) {
        addOrIncrementVariant(res.variant, 1);
        showToast(`Scanned: ${res.variant.sku} (Quantity +1)`, 'success');
      } else {
        showToast(`No item found for barcode ${barcode}`, 'error');
      }
    } catch {
      showToast('Barcode lookup failed', 'error');
    }
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Local financial preview using Decimal.js (Rule 2: Never authoritative, preview only)
  const subtotal = items.reduce((acc, item) => {
    return acc.plus(new Decimal(item.quantity).times(new Decimal(item.unitCost)));
  }, new Decimal(0));

  const discountDec = new Decimal(discountAmount || 0);
  const taxDec = new Decimal(taxAmount || 0);
  const shippingDec = new Decimal(shippingCost || 0);

  const grandTotal = Decimal.max(
    0,
    subtotal.minus(discountDec).plus(taxDec).plus(shippingDec),
  );

  const paidDec = new Decimal(paidAmount || 0);
  const dueAmount = Decimal.max(0, grandTotal.minus(paidDec));

  // Check for unit cost divergence > 20%
  const costWarnings = items
    .filter((item) => {
      if (item.currentCost <= 0 || item.unitCost <= 0) return false;
      const diff = Math.abs(item.unitCost - item.currentCost);
      const pct = (diff / item.currentCost) * 100;
      return pct > 20;
    })
    .map((item) => ({
      sku: item.sku,
      unitCost: item.unitCost,
      currentCost: item.currentCost,
      pctDiff: Math.round(
        (Math.abs(item.unitCost - item.currentCost) / item.currentCost) * 100,
      ),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      showToast('Please select a supplier', 'error');
      return;
    }

    if (items.length === 0) {
      showToast('Please add at least one item to receive', 'error');
      return;
    }

    // Validation checks
    for (const item of items) {
      if (item.quantity <= 0) {
        showToast(`Quantity for ${item.sku} must be greater than zero`, 'error');
        return;
      }
      if (item.unitCost < 0) {
        showToast(`Unit cost for ${item.sku} cannot be negative`, 'error');
        return;
      }
      if (item.trackIndividually && !Number.isInteger(Number(item.quantity))) {
        showToast(
          `Item ${item.sku} is individually tracked: quantity must be an integer`,
          'error',
        );
        return;
      }
    }

    if (paidDec.greaterThan(grandTotal)) {
      showToast('Paid amount cannot exceed total purchase amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.purchases.purchases.create(
        {
          supplierId,
          purchaseOrderId: purchaseOrderId || undefined,
          supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
          purchaseDate: purchaseDate ? `${purchaseDate}T12:00:00Z` : undefined,
          discountAmount: discountDec.toNumber(),
          taxAmount: taxDec.toNumber(),
          shippingCost: shippingDec.toNumber(),
          paidAmount: paidDec.toNumber(),
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          landedCost,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            vatPercentage: i.vatPercentage || 0,
          })),
        },
        {
          idempotencyKey: idempotencyKeyRef.current,
        },
      );

      // Clear draft upon successful creation
      if (typeof window !== 'undefined') {
        localStorage.removeItem(draftKey);
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });

      showToast('Purchase goods received and stock updated successfully', 'success');
      setCreatedPurchase(response);
    } catch (err: any) {
      showToast(err?.message || 'Failed to receive purchase goods', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (createdPurchase) {
    const hasTrackedUnits =
      Array.isArray(createdPurchase.productUnits) &&
      createdPurchase.productUnits.length > 0;

    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6 animate-in fade-in duration-300">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Goods Received Successfully!
            </h1>
            <p className="text-xs text-slate-500">
              Stock balances and supplier liability have been updated on the server.
            </p>
          </div>

          {/* Authoritative Server Numbers */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Purchase #
              </span>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                {createdPurchase.purchase_no || createdPurchase.purchaseNo}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Total Amount
              </span>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatBDT(createdPurchase.total_amount || createdPurchase.totalAmount)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Paid Now
              </span>
              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatBDT(createdPurchase.paid_amount || createdPurchase.paidAmount)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Remaining Due
              </span>
              <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                {formatBDT(createdPurchase.due_amount || createdPurchase.dueAmount)}
              </span>
            </div>
          </div>

          {/* Tracked Units barcode printing button */}
          {hasTrackedUnits && (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-left space-y-3">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                  {createdPurchase.productUnits.length} Individually Tracked Unit(s) Generated
                </h4>
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                Unique serial barcode labels were created for each garment piece.
              </p>

              <Button
                onClick={() => {
                  const barcodes = createdPurchase.productUnits
                    .map((u: any) => u.barcodeValue)
                    .join(',');
                  router.push(`/catalog/barcodes?prefillUnits=${barcodes}`);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Barcode Labels for These Units</span>
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => router.push(`/purchases/${createdPurchase.id}`)}
              className="gap-1.5 text-xs w-full sm:w-auto"
            >
              <FileText className="w-4 h-4" />
              <span>View Purchase Details</span>
            </Button>

            <Button
              onClick={() => {
                setCreatedPurchase(null);
                setItems([]);
                setDiscountAmount(0);
                setTaxAmount(0);
                setShippingCost(0);
                setPaidAmount(0);
                setSupplierInvoiceNo('');
                idempotencyKeyRef.current = generateIdempotencyKey('purchase');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Receive Another Consignment</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/purchases"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Purchases List</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Receive Goods (Purchase Inward)</span>
            <Badge variant="outline" className="text-xs font-mono">
              Idemp: {idempotencyKeyRef.current.slice(0, 8)}...
            </Badge>
          </h1>
        </div>

        {hasDraft && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
            <span>A draft purchase is available.</span>
            <button
              type="button"
              onClick={restoreDraft}
              className="font-bold underline hover:text-amber-950"
            >
              Restore
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={discardDraft}
              className="hover:underline text-slate-500"
            >
              Discard
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Consignment Details Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Consignment & Vendor Header
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier *
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select vendor...</option>
                  {suppliersData?.data?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSupplierModalOpen(true)}
                  className="h-9 px-2.5 text-xs shrink-0"
                  title="Quick Add Supplier"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Invoice / Chalan #
              </label>
              <Input
                type="text"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="e.g. INV-APEX-9921"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Date
              </label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Optional PO Link
              </label>
              <Input
                type="text"
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value)}
                placeholder="PO UUID (optional)"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Speed-Optimized Item Entry */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Items Inward Entry
              </h3>
              <p className="text-xs text-slate-500">
                Scan barcode or search to quickly populate consignment rows
              </p>
            </div>

            {/* Hardware Barcode Scanner Input */}
            <div className="w-full sm:w-72">
              <BarcodeInput
                onScan={handleBarcodeScan}
                placeholder="Scan barcode tag to add..."
                autoFocus={true}
              />
            </div>
          </div>

          {/* Autocomplete Variant Search Box */}
          <div className="relative">
            <Input
              type="text"
              value={variantSearch}
              onChange={(e) => setVariantSearch(e.target.value)}
              placeholder="Type garment name, SKU or barcode to add items..."
              leftIcon={<Search className="w-4 h-4" />}
            />

            {variantSearch.trim().length >= 2 && searchResults?.data && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {searchResults.data.flatMap((p: any) =>
                  (p.variants || []).map((v: any) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => addOrIncrementVariant({ ...v, product: p }, 1)}
                      className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {p.name}
                        </span>
                        <span className="text-slate-500 ml-2">
                          [{v.size?.name || '-'} / {v.color?.name || '-'}]
                        </span>
                        {p.track_individually && (
                          <Badge variant="outline" className="ml-2 text-[10px] text-indigo-600">
                            Tracked Individually
                          </Badge>
                        )}
                        <span className="block text-[11px] font-mono text-slate-400">
                          SKU: {v.sku} | Barcode: {v.barcode || '-'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Cost: {formatBDT(v.cost_price || v.costPrice || 0)}
                        </span>
                      </div>
                    </button>
                  )),
                )}
              </div>
            )}
          </div>

          {/* Cost Warnings Banner */}
          {costWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Unit Cost Divergence Notice (&gt; 20% from historical average cost):</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                {costWarnings.map((w) => (
                  <li key={w.sku}>
                    Variant <strong>{w.sku}</strong>: Entered cost is {formatBDT(w.unitCost)} (Differs by {w.pctDiff}% from historical cost {formatBDT(w.currentCost)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Editable Items Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Garment / SKU</th>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Size / Color</th>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-center w-36">
                    Received Qty
                  </th>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right w-36">
                    Unit Cost (BDT)
                  </th>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-right w-32">
                    Line Total
                  </th>
                  <th className="p-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400">
                      No items entered yet. Scan a garment barcode or search above to begin receipt.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const lineTotal = new Decimal(item.quantity).times(new Decimal(item.unitCost));
                    return (
                      <tr key={item.variantId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.productName}
                              </p>
                              <p className="font-mono text-[11px] text-slate-400">
                                SKU: {item.sku}
                              </p>
                            </div>
                            {item.trackIndividually && (
                              <Badge className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                                Tracked
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {item.sizeName || '-'} / {item.colorName || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <QuantityInput
                            value={item.quantity}
                            onChange={(val) => {
                              const next = [...items];
                              next[idx].quantity = val;
                              setItems(next);
                            }}
                            min={1}
                            trackIndividually={item.trackIndividually}
                          />
                        </td>
                        <td className="p-3 text-right">
                          <MoneyInput
                            value={item.unitCost}
                            onChange={(val) => {
                              const next = [...items];
                              next[idx].unitCost = val;
                              setItems(next);
                            }}
                            min={0}
                          />
                          {item.currentCost > 0 && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Hist: {formatBDT(item.currentCost)}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatBDT(lineTotal.toNumber())}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Landed Cost Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Landed Cost & Notes */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Landed Cost & Remarks
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={landedCost}
                  onChange={(e) => setLandedCost(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                    {t('purchasing.landedCost')}
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight">
                    {t('purchasing.landedCostHelp')}
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Consignment Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Received via Sundarban Courier, 2 cartons verified intact"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Local Financial Preview Panel */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t('purchasing.totalsPreview')}
              </h3>
              <Badge variant="outline" className="text-[10px]">
                Decimal Math Preview
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {formatBDT(subtotal.toNumber())}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Discount Amount (-):</span>
                <div className="w-32">
                  <MoneyInput
                    value={discountAmount}
                    onChange={setDiscountAmount}
                    min={0}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Tax / VAT Amount (+):</span>
                <div className="w-32">
                  <MoneyInput
                    value={taxAmount}
                    onChange={setTaxAmount}
                    min={0}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Shipping / Freight (+):</span>
                <div className="w-32">
                  <MoneyInput
                    value={shippingCost}
                    onChange={setShippingCost}
                    min={0}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-bold">
                <span className="text-slate-900 dark:text-slate-100">Total Payable:</span>
                <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                  {formatBDT(grandTotal.toNumber())}
                </span>
              </div>

              {/* Payment Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Paid Now (BDT):
                  </span>
                  <div className="w-36">
                    <MoneyInput
                      value={paidAmount}
                      onChange={setPaidAmount}
                      min={0}
                      max={grandTotal.toNumber()}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="BANK">Bank</option>
                      <option value="CASH">Cash</option>
                      <option value="BKASH">bKash</option>
                      <option value="NAGAD">Nagad</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-0.5">Ref #</label>
                    <Input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. TXN-991"
                      className="text-xs py-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 font-bold">
                  <span className="text-slate-700 dark:text-slate-300">Derived Due:</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 text-sm">
                    {formatBDT(dueAmount.toNumber())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submission Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/purchases')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px] gap-2 font-semibold shadow-lg shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording Purchase...' : 'Receive & Update Stock'}</span>
          </Button>
        </div>
      </form>

      {/* Quick Add Supplier Modal */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={(created) => {
          setSupplierId(created.id);
        }}
      />
    </div>
  );
}
