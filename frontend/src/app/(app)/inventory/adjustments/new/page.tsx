'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Sliders,
  ArrowLeft,
  Search,
  Barcode,
  Trash2,
  Save,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT } from '@/lib/utils/formatters';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

interface AdjustmentItemRow {
  variantId: string;
  sku: string;
  barcode?: string;
  productName: string;
  sizeName?: string;
  colorName?: string;
  systemQty: number;
  physicalQty: number;
  unitCost: number;
  trackIndividually?: boolean;
}

export default function NewStockAdjustmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const initialVariantId = searchParams.get('variantId');
  const initialSuggestedQty = searchParams.get('suggestedQty');

  const [reason, setReason] = useState<string>('PHYSICAL_COUNT_DISCREPANCY');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<AdjustmentItemRow[]>([]);
  const [variantSearch, setVariantSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Variant search
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['variants-adj-search', currentBranchId, variantSearch],
    queryFn: () =>
      api.catalog.products.list({
        search: variantSearch,
        limit: 10,
      }),
    enabled: variantSearch.trim().length >= 2,
  });

  const addVariantRow = async (variant: any, defaultPhysicalQty?: number) => {
    // Check if variant is already in items
    const existingIdx = items.findIndex((i) => i.variantId === variant.id);
    if (existingIdx >= 0) {
      showToast('Variant already in adjustment list', 'info');
      return;
    }

    // Fetch system balance for this variant in current branch
    let systemQty = 0;
    let unitCost = Number(variant.cost_price || variant.costPrice || 0);

    try {
      const stockRes = await api.inventory.stock.list({
        search: variant.sku,
        limit: 1,
      });
      const bal = stockRes.data?.[0];
      if (bal) {
        systemQty = Number(bal.quantity || 0);
        if (bal.avg_cost_price) unitCost = Number(bal.avg_cost_price);
      }
    } catch {
      // fallback
    }

    const physical = defaultPhysicalQty !== undefined ? defaultPhysicalQty : systemQty;

    setItems((prev) => [
      ...prev,
      {
        variantId: variant.id,
        sku: variant.sku,
        barcode: variant.barcode,
        productName: variant.product?.name || variant.name || 'Product',
        sizeName: variant.size?.name,
        colorName: variant.color?.name,
        systemQty,
        physicalQty: physical,
        unitCost,
        trackIndividually: Boolean(variant.product?.track_individually),
      },
    ]);
    setVariantSearch('');
  };

  // Prefill initial variant if passed via URL
  useEffect(() => {
    if (initialVariantId) {
      api.catalog.barcodes
        .lookup(initialVariantId)
        .then((res) => {
          if (res?.variant) {
            addVariantRow(res.variant, initialSuggestedQty ? Number(initialSuggestedQty) : undefined);
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [initialVariantId]);

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const res = await api.catalog.barcodes.lookup(barcode);
      if (res?.variant) {
        await addVariantRow(res.variant);
        showToast(`Added ${res.variant.sku}`, 'success');
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

  const updatePhysicalQty = (idx: number, qty: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx].physicalQty = qty;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      showToast('Please add at least one item to adjust', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        reason,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          variantId: i.variantId,
          physicalQty: i.physicalQty,
        })),
      };

      const res = await api.inventory.adjustments.create(payload);
      showToast('Stock adjustment draft created successfully!', 'success');
      router.push(`/inventory/adjustments/${res.id || ''}`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to create adjustment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory/adjustments">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary" />
            {t('inventory.newAdjustment') || 'New Stock Adjustment'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('inventory.newAdjustmentSubtitle') ||
              'Create a draft adjustment by reconciling recorded system quantities with physically counted stock.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Adjustment Metadata */}
        <div className="bg-card border border-border rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('common.reason') || 'Adjustment Reason *'}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="PHYSICAL_COUNT_DISCREPANCY">Physical Count Discrepancy</option>
              <option value="DAMAGED_EXPIRED">Damaged / Expired Goods</option>
              <option value="DATA_ENTRY_CORRECTION">Data Entry Correction</option>
              <option value="INTERNAL_USE">Internal Use / Sampling</option>
              <option value="OTHER">Other Reason</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('common.notes') || 'Notes / Justification (Optional)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Audit reconciliation after quarterly stocktake..."
              className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Toolbar: Barcode & Variant Search */}
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('purchasing.scanBarcode') || 'Scan Barcode (Add)'}
            </label>
            <BarcodeInput onScan={handleBarcodeScan} autoFocus placeholder="Scan barcode..." />
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('purchasing.searchVariant') || 'Search Variant / SKU'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                placeholder="Search variant name or SKU..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {variantSearch.trim().length >= 2 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    Searching...
                  </div>
                ) : searchResults?.data?.length ? (
                  searchResults.data.flatMap((product: any) =>
                    (product.variants || []).map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => addVariantRow({ ...v, product })}
                        className="w-full px-3 py-2 text-left hover:bg-muted border-b border-border/50 last:border-0 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-medium text-foreground">{product.name}</div>
                          <div className="text-muted-foreground flex gap-2">
                            <span>SKU: {v.sku}</span>
                            {v.size && <span>Size: {v.size.name}</span>}
                            {v.color && <span>Color: {v.color.name}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Select
                        </Badge>
                      </button>
                    )),
                  )
                ) : (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No matching variants found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm">
              {t('inventory.itemsList') || 'Variants to Adjust'} ({items.length})
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Sliders className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">No items added</p>
              <p className="text-xs">Scan or search variants above to enter physically counted quantities.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left">Product / Variant</th>
                    <th className="px-4 py-3 text-right w-28">System Qty</th>
                    <th className="px-4 py-3 text-left w-36">Physical Qty</th>
                    <th className="px-4 py-3 text-right w-28">Difference</th>
                    <th className="px-4 py-3 text-right w-16">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => {
                    const diff = item.physicalQty - item.systemQty;

                    return (
                      <tr key={item.variantId} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.productName}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>SKU: {item.sku}</span>
                            {item.barcode && <span>• Barcode: {item.barcode}</span>}
                          </div>
                          {(item.sizeName || item.colorName) && (
                            <div className="text-xs text-muted-foreground flex gap-1 mt-0.5">
                              {item.sizeName && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1">
                                  {item.sizeName}
                                </Badge>
                              )}
                              {item.colorName && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1">
                                  {item.colorName}
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-right text-muted-foreground">
                          {item.systemQty}
                        </td>
                        <td className="px-4 py-3">
                          <QuantityInput
                            value={item.physicalQty}
                            onChange={(qty) => updatePhysicalQty(idx, qty)}
                            trackIndividually={item.trackIndividually}
                            min={0}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {diff === 0 ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              0
                            </Badge>
                          ) : (
                            <Badge
                              variant={diff > 0 ? 'secondary' : 'destructive'}
                              className="font-mono text-xs"
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(idx)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Form Actions */}
          <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/inventory/adjustments">
                {t('common.cancel') || 'Cancel'}
              </Link>
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting
                ? t('common.saving') || 'Submitting...'
                : t('inventory.submitDraftAdjustment') || 'Save as Draft Adjustment'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
