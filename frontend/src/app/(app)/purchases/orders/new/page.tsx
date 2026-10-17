'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  Barcode,
  Search,
  Save,
  Building2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { SupplierModal } from '@/components/purchases/SupplierModal';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT } from '@/lib/utils/formatters';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

interface PoItemRow {
  variantId: string;
  sku: string;
  productName: string;
  sizeName?: string;
  colorName?: string;
  barcode?: string;
  quantity: number;
  unitCost: number;
  trackIndividually?: boolean;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const initialSupplierId = searchParams.get('supplierId') || '';

  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PoItemRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [variantSearch, setVariantSearch] = useState('');
  const [isSearchingVariants, setIsSearchingVariants] = useState(false);

  // Load suppliers list
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-dropdown', currentBranchId],
    queryFn: () => api.purchases.suppliers.list({ limit: 100, isActive: true }),
  });

  // Prefill items from low stock reorder shortcut if present
  React.useEffect(() => {
    if (searchParams.get('source') === 'low_stock') {
      try {
        const raw = sessionStorage.getItem('po_prefill_items');
        if (raw) {
          const prefill = JSON.parse(raw);
          if (Array.isArray(prefill) && prefill.length > 0) {
            setItems(prefill);
            sessionStorage.removeItem('po_prefill_items');
            showToast(t('purchasing.prefilledFromLowStock') || 'Prefilled items from low stock report', 'info');
          }
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams, showToast, t]);

  // Variant search query
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['variants-search', currentBranchId, variantSearch],
    queryFn: () =>
      api.catalog.products.list({
        search: variantSearch,
        limit: 10,
      }),
    enabled: variantSearch.trim().length >= 2,
  });

  const addOrIncrementVariant = (variant: any, defaultQty = 1) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.variantId === variant.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].quantity += defaultQty;
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
          quantity: defaultQty,
          unitCost: Number(variant.cost_price || variant.costPrice || 0),
          trackIndividually: Boolean(variant.product?.track_individually),
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
        showToast(`Added ${res.variant.sku} to order`, 'success');
      } else {
        showToast('Barcode not found', 'error');
      }
    } catch {
      showToast('Barcode lookup failed', 'error');
    }
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Compute total with decimal.js
  const totalAmount = items.reduce((acc, item) => {
    return acc.plus(new Decimal(item.quantity).times(new Decimal(item.unitCost)));
  }, new Decimal(0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      showToast('Please select a supplier', 'error');
      return;
    }

    if (items.length === 0) {
      showToast('Please add at least one item to the purchase order', 'error');
      return;
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        showToast(`Quantity for ${item.sku} must be greater than zero`, 'error');
        return;
      }
      if (item.unitCost < 0) {
        showToast(`Unit cost for ${item.sku} cannot be negative`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const created = await api.purchases.orders.create({
        supplierId,
        expectedDelivery: expectedDelivery ? `${expectedDelivery}T12:00:00Z` : undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      });

      showToast('Purchase Order draft created successfully', 'success');
      router.push(`/purchases/orders/${created.id}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to create purchase order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href="/purchases/orders"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Purchase Orders</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Create Purchase Order (DRAFT)
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Details Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <option value="">Select a vendor...</option>
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
                  title="Add New Supplier"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Delivery Date
              </label>
              <Input
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                leftIcon={<Calendar className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes / Instructions
              </label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Urgent winter batch order"
              />
            </div>
          </div>
        </div>

        {/* Item Entry Section */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Order Items
            </h3>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Barcode scanner */}
              <div className="w-full sm:w-64">
                <BarcodeInput
                  onScan={handleBarcodeScan}
                  placeholder="Scan barcode to add item..."
                  autoFocus={false}
                />
              </div>
            </div>
          </div>

          {/* Search by variant */}
          <div className="relative">
            <Input
              type="text"
              value={variantSearch}
              onChange={(e) => setVariantSearch(e.target.value)}
              placeholder="Search products by title, SKU or category to add to order..."
              leftIcon={<Search className="w-4 h-4" />}
            />

            {variantSearch.trim().length >= 2 && searchResults?.data && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {searchResults.data.flatMap((p: any) =>
                  (p.variants || []).map((v: any) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => addOrIncrementVariant({ ...v, product: p }, 1)}
                      className="w-full p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {p.name}
                        </span>
                        <span className="text-slate-400 ml-2">
                          [{v.size?.name || '-'} / {v.color?.name || '-'}]
                        </span>
                        <span className="block text-[11px] font-mono text-slate-500">
                          SKU: {v.sku} | Barcode: {v.barcode || '-'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatBDT(v.cost_price || v.costPrice || 0)}
                        </span>
                      </div>
                    </button>
                  )),
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Item / SKU</th>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Size / Color</th>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-center w-36">
                    Ordered Qty
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
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      No items added yet. Scan barcodes or use the search box above to add items.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const lineTotal = new Decimal(item.quantity).times(new Decimal(item.unitCost));
                    return (
                      <tr key={item.variantId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.productName}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">SKU: {item.sku}</p>
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

          {/* Totals Summary */}
          {items.length > 0 && (
            <div className="flex justify-end pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 w-full sm:w-72 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Total Items:</span>
                  <span className="font-bold">{items.length} lines</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Estimated Total:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {formatBDT(totalAmount.toNumber())}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/purchases/orders')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px] gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Order...' : 'Save Purchase Order (Draft)'}</span>
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
