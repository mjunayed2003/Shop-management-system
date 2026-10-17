'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ArrowLeft,
  Search,
  Barcode,
  Trash2,
  Building,
  AlertCircle,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

interface TransferItemRow {
  variantId: string;
  sku: string;
  barcode?: string;
  productName: string;
  sizeName?: string;
  colorName?: string;
  sentQty: number;
  availableStock: number;
  trackIndividually?: boolean;
}

export default function NewStockTransferPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const branches = useBranchStore((s) => s.branches);
  const currentBranch = branches.find((b) => b.id === currentBranchId);

  // CRITICAL RULE: Destination branch MUST exclude current branch!
  const destinationBranches = branches.filter((b) => b.id !== currentBranchId);

  const [toBranchId, setToBranchId] = useState<string>(
    destinationBranches.length > 0 ? destinationBranches[0].id : '',
  );
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<TransferItemRow[]>([]);
  const [variantSearch, setVariantSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Variant search in catalog
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['variants-transfer-search', currentBranchId, variantSearch],
    queryFn: () =>
      api.catalog.products.list({
        search: variantSearch,
        limit: 10,
      }),
    enabled: variantSearch.trim().length >= 2,
  });

  const addVariantItem = async (variant: any, defaultQty = 1) => {
    // Check if variant already exists in list
    const existingIdx = items.findIndex((i) => i.variantId === variant.id);
    if (existingIdx >= 0) {
      setItems((prev) => {
        const next = [...prev];
        const newQty = next[existingIdx].sentQty + defaultQty;
        if (newQty <= next[existingIdx].availableStock) {
          next[existingIdx].sentQty = newQty;
        } else {
          showToast(`Cannot exceed available stock (${next[existingIdx].availableStock})`, 'error');
        }
        return next;
      });
      setVariantSearch('');
      return;
    }

    // Fetch current available stock for this variant in current branch
    let available = 0;
    try {
      const stockRes = await api.inventory.stock.list({
        search: variant.sku,
        limit: 1,
      });
      const balance = stockRes.data?.[0];
      if (balance) {
        available = Math.max(0, Number(balance.quantity || 0) - Number(balance.allocated_quantity || 0));
      }
    } catch {
      // fallback
    }

    if (available <= 0) {
      showToast(`Warning: Variant ${variant.sku} has 0 available stock in this branch`, 'warning');
    }

    setItems((prev) => [
      ...prev,
      {
        variantId: variant.id,
        sku: variant.sku,
        barcode: variant.barcode,
        productName: variant.product?.name || variant.name || 'Product',
        sizeName: variant.size?.name,
        colorName: variant.color?.name,
        sentQty: available > 0 ? Math.min(defaultQty, available) : 1,
        availableStock: available,
        trackIndividually: Boolean(variant.product?.track_individually),
      },
    ]);
    setVariantSearch('');
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const res = await api.catalog.barcodes.lookup(barcode);
      if (res?.variant) {
        await addVariantItem(res.variant, 1);
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

  const updateItemQty = (idx: number, qty: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx].sentQty = qty;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toBranchId) {
      showToast('Please select a destination branch', 'error');
      return;
    }

    if (toBranchId === currentBranchId) {
      showToast('Destination branch cannot be the source branch', 'error');
      return;
    }

    if (items.length === 0) {
      showToast('Please add at least one item to transfer', 'error');
      return;
    }

    // Validate quantities
    const invalidStockItem = items.find((i) => i.sentQty <= 0);
    if (invalidStockItem) {
      showToast(`Invalid quantity for variant ${invalidStockItem.sku}`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        toBranchId,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          variantId: i.variantId,
          sentQty: i.sentQty,
        })),
      };

      const res = await api.inventory.transfers.create(payload);
      showToast('Stock transfer initiated successfully!', 'success');
      router.push(`/inventory/transfers/${res.id || ''}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create stock transfer';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory/transfers">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            {t('inventory.newTransfer') || 'New Stock Transfer'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('inventory.newTransferSubtitle') ||
              'Initiate a transfer request from current branch to another branch.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source & Destination Details */}
        <div className="bg-card border border-border rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('inventory.sourceBranch') || 'Source Branch (Current)'}
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-input rounded-md text-sm font-medium">
              <Building className="w-4 h-4 text-primary" />
              <span>{currentBranch?.name || 'Current Branch'}</span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                Origin
              </Badge>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('inventory.destinationBranch') || 'Destination Branch *'}
            </label>
            {destinationBranches.length === 0 ? (
              <div className="text-xs text-destructive flex items-center gap-1.5 p-2 bg-destructive/5 rounded-md border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                No other branches configured in your business.
              </div>
            ) : (
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                required
                className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {destinationBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code || 'Branch'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('common.notes') || 'Transfer Notes / Reason (Optional)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Stock replenishment for Dhanmondi showroom..."
              className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Item Entry Toolbar */}
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('purchasing.scanBarcode') || 'Scan Barcode (Add/Increment)'}
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
                placeholder="Type variant name, SKU..."
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
                        onClick={() => addVariantItem({ ...v, product })}
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
              {t('inventory.transferItems') || 'Items to Transfer'} ({items.length})
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ArrowLeftRight className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">No items added yet</p>
              <p className="text-xs">Scan barcodes or search products above to build your transfer list.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left">Product / Variant</th>
                    <th className="px-4 py-3 text-left w-36">Available</th>
                    <th className="px-4 py-3 text-left w-40">Transfer Qty</th>
                    <th className="px-4 py-3 text-right w-16">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => (
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
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-sm font-semibold ${
                            item.availableStock <= 0
                              ? 'text-destructive'
                              : item.availableStock < 5
                              ? 'text-amber-500'
                              : 'text-foreground'
                          }`}
                        >
                          {item.availableStock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <QuantityInput
                          value={item.sentQty}
                          onChange={(qty) => updateItemQty(idx, qty)}
                          trackIndividually={item.trackIndividually}
                          min={1}
                          max={item.availableStock > 0 ? item.availableStock : undefined}
                        />
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Form Submit Footer */}
          <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/inventory/transfers">
                {t('common.cancel') || 'Cancel'}
              </Link>
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || items.length === 0 || destinationBranches.length === 0}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting
                ? t('common.saving') || 'Submitting...'
                : t('inventory.initiateTransfer') || 'Initiate Transfer (PENDING)'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
