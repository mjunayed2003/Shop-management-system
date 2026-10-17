'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  RotateCcw,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  Save,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT } from '@/lib/utils/formatters';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

interface ReturnItemRow {
  variantId: string;
  sku: string;
  productName: string;
  sizeName?: string;
  colorName?: string;
  quantity: number;
  maxReturnable?: number;
  unitCost: number;
}

export default function NewPurchaseReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const purchaseIdParam = searchParams.get('purchaseId') || '';
  const supplierIdParam = searchParams.get('supplierId') || '';

  const [supplierId, setSupplierId] = useState(supplierIdParam);
  const [purchaseId, setPurchaseId] = useState(purchaseIdParam);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'COMPLETED'>('COMPLETED');
  const [items, setItems] = useState<ReturnItemRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [variantSearch, setVariantSearch] = useState('');

  // Suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-return-new', currentBranchId],
    queryFn: () => api.purchases.suppliers.list({ limit: 100, isActive: true }),
  });

  // If purchaseId is present, load purchase items with max returnable
  const { data: purchaseData } = useQuery({
    queryKey: ['purchase-for-return', purchaseId, currentBranchId],
    queryFn: () => api.purchases.purchases.get(purchaseId),
    enabled: Boolean(purchaseId),
  });

  useEffect(() => {
    if (purchaseData) {
      setSupplierId(purchaseData.supplier_id || purchaseData.supplier?.id);

      // Calculate max returnable per item: purchased - already returned
      const rows: ReturnItemRow[] = (purchaseData.items || []).map((item: any) => {
        let alreadyReturned = 0;
        if (Array.isArray(purchaseData.purchase_returns)) {
          for (const pr of purchaseData.purchase_returns) {
            if (pr.status !== 'CANCELLED' && Array.isArray(pr.items)) {
              for (const pri of pr.items) {
                if (pri.product_variant_id === item.product_variant_id) {
                  alreadyReturned += Number(pri.quantity);
                }
              }
            }
          }
        }

        const maxReturnable = Math.max(0, Number(item.quantity) - alreadyReturned);

        return {
          variantId: item.product_variant_id,
          sku: item.variant?.sku || '',
          productName: item.variant?.product?.name || 'Garment',
          sizeName: item.variant?.size?.name,
          colorName: item.variant?.color?.name,
          quantity: maxReturnable > 0 ? 1 : 0,
          maxReturnable,
          unitCost: Number(item.unit_cost),
        };
      });

      setItems(rows.filter((r) => (r.maxReturnable || 0) > 0));
    }
  }, [purchaseData]);

  // Variant search for standalone return
  const { data: searchResults } = useQuery({
    queryKey: ['variant-search-return', currentBranchId, variantSearch],
    queryFn: () =>
      api.catalog.products.list({
        search: variantSearch,
        limit: 10,
      }),
    enabled: variantSearch.trim().length >= 2 && !purchaseId,
  });

  const addVariantStandalone = (variant: any) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id);
      if (existing) {
        return prev.map((i) =>
          i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          sku: variant.sku,
          productName: variant.product?.name || 'Garment',
          sizeName: variant.size?.name,
          colorName: variant.color?.name,
          quantity: 1,
          unitCost: Number(variant.cost_price || 0),
        },
      ];
    });
    setVariantSearch('');
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalAmount = items.reduce((acc, item) => {
    return acc.plus(new Decimal(item.quantity).times(new Decimal(item.unitCost)));
  }, new Decimal(0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!supplierId) {
      showToast('Please select a supplier', 'error');
      return;
    }

    if (items.length === 0) {
      showToast('Please add at least one item to return', 'error');
      return;
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        showToast(`Return quantity for ${item.sku} must be greater than zero`, 'error');
        return;
      }
      if (item.maxReturnable !== undefined && item.quantity > item.maxReturnable) {
        setServerError(
          `Return quantity (${item.quantity}) for ${item.sku} exceeds max returnable limit (${item.maxReturnable}).`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const created = await api.purchases.returns.create({
        supplierId,
        purchaseId: purchaseId || undefined,
        reason: reason.trim() || undefined,
        status,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      });

      showToast('Purchase return created successfully', 'success');
      router.push(`/purchases/returns/${created.id}`);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create purchase return';
      setServerError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/purchases/returns"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Purchase Returns</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Create Purchase Return Note
        </h1>
      </div>

      {serverError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Details Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                disabled={Boolean(purchaseId)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select vendor...</option>
                {suppliersData?.data?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Return Reason *
              </label>
              <Input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Color bleeding / torn fabric / excess stock"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status on Save
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="COMPLETED">COMPLETED (Immediately deducts stock & balance)</option>
                <option value="DRAFT">DRAFT (Review before deduction)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Return Items ({items.length})
            </h3>
            {purchaseData && (
              <Badge variant="outline" className="text-xs">
                Linked to {purchaseData.purchase_no}
              </Badge>
            )}
          </div>

          {!purchaseId && (
            <div className="relative">
              <Input
                type="text"
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                placeholder="Search garment name or SKU to add items to return note..."
                leftIcon={<Search className="w-4 h-4" />}
              />

              {variantSearch.trim().length >= 2 && searchResults?.data && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.data.flatMap((p: any) =>
                    (p.variants || []).map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => addVariantStandalone({ ...v, product: p })}
                        className="w-full p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {p.name}
                          </span>
                          <span className="text-slate-400 ml-2">
                            [{v.size?.name || '-'} / {v.color?.name || '-'}]
                          </span>
                          <span className="block text-[11px] font-mono text-slate-500">
                            SKU: {v.sku}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-600">
                          {formatBDT(v.cost_price || 0)}
                        </span>
                      </button>
                    )),
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Item / SKU</th>
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Size / Color</th>
                  {purchaseId && (
                    <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-center w-32">
                      Max Returnable
                    </th>
                  )}
                  <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-center w-36">
                    Return Qty
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
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No items in return note.
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
                        {purchaseId && (
                          <td className="p-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {item.maxReturnable}
                          </td>
                        )}
                        <td className="p-3 text-center">
                          <QuantityInput
                            value={item.quantity}
                            onChange={(val) => {
                              const next = [...items];
                              next[idx].quantity = val;
                              setItems(next);
                            }}
                            min={0}
                            max={item.maxReturnable}
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

          <div className="flex justify-end pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 w-full sm:w-72 flex items-center justify-between text-sm font-bold">
              <span className="text-slate-700 dark:text-slate-300">Return Total Value:</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">
                {formatBDT(totalAmount.toNumber())}
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/purchases/returns')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white min-w-[160px] gap-2 font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting Return...' : 'Submit Return Note'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
