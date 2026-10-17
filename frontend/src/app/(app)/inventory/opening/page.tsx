'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  PlusCircle,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Search,
  Barcode,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { downloadCsv } from '@/lib/utils/csv';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

interface OpeningStockRow {
  variantId: string;
  sku: string;
  barcode?: string;
  productName: string;
  sizeName?: string;
  colorName?: string;
  quantity: number;
  unitCost: number;
  trackIndividually?: boolean;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  errorMessage?: string;
  hasExistingMovement?: boolean;
}

export default function OpeningStockPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const branches = useBranchStore((s) => s.branches);
  const currentBranch = branches.find((b) => b.id === currentBranchId);

  const [rows, setRows] = useState<OpeningStockRow[]>([]);
  const [variantSearch, setVariantSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variant search query
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['variants-opening-search', currentBranchId, variantSearch],
    queryFn: () =>
      api.catalog.products.list({
        search: variantSearch,
        limit: 10,
      }),
    enabled: variantSearch.trim().length >= 2,
  });

  const addVariantRow = (variant: any, defaultQty = 1, defaultCost = 0) => {
    setRows((prev) => {
      const existingIdx = prev.findIndex((r) => r.variantId === variant.id);
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
          barcode: variant.barcode,
          productName: variant.product?.name || variant.name || 'Product',
          sizeName: variant.size?.name,
          colorName: variant.color?.name,
          quantity: defaultQty,
          unitCost: defaultCost || Number(variant.cost_price || variant.costPrice || 0),
          trackIndividually: Boolean(variant.product?.track_individually),
          status: 'PENDING',
        },
      ];
    });
    setVariantSearch('');
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const res = await api.catalog.barcodes.lookup(barcode);
      if (res?.variant) {
        addVariantRow(res.variant, 1);
        showToast(`Added ${res.variant.sku}`, 'success');
      } else {
        showToast('Barcode not found', 'error');
      }
    } catch {
      showToast('Barcode lookup failed', 'error');
    }
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, updates: Partial<OpeningStockRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // CSV Template download
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        SKU_or_Barcode: 'PANJ-BLK-L',
        Quantity: 25,
        Unit_Cost: 850,
      },
      {
        SKU_or_Barcode: 'SHIRT-BLU-M',
        Quantity: 40,
        Unit_Cost: 650,
      },
    ];
    downloadCsv(templateData, 'opening_stock_template.csv');
  };

  // CSV File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        showToast('CSV file is empty or missing data rows', 'error');
        return;
      }

      // First line header
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const skuIdx = headers.findIndex((h) => h.includes('sku') || h.includes('barcode'));
      const qtyIdx = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'));
      const costIdx = headers.findIndex((h) => h.includes('cost') || h.includes('price') || h.includes('unit'));

      if (skuIdx === -1 || qtyIdx === -1) {
        showToast('CSV must have columns for SKU/Barcode and Quantity', 'error');
        return;
      }

      const importedRows: OpeningStockRow[] = [];
      let successCount = 0;
      let failCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const identifier = cols[skuIdx];
        const qty = parseFloat(cols[qtyIdx]);
        const cost = costIdx !== -1 ? parseFloat(cols[costIdx]) : 0;

        if (!identifier || isNaN(qty) || qty <= 0) {
          continue;
        }

        try {
          // Lookup by barcode or sku search
          const lookup = await api.catalog.barcodes.lookup(identifier).catch(() => null);
          let variant = lookup?.variant;
          if (!variant) {
            const search = await api.catalog.products.list({ search: identifier, limit: 1 });
            if (search.data?.[0]?.variants?.length) {
              variant = search.data[0].variants.find(
                (v: any) => v.sku === identifier || v.barcode === identifier,
              );
            }
          }

          if (variant) {
            importedRows.push({
              variantId: variant.id,
              sku: variant.sku,
              barcode: variant.barcode,
              productName: variant.product?.name || variant.name || 'Product',
              sizeName: variant.size?.name,
              colorName: variant.color?.name,
              quantity: Math.max(1, qty),
              unitCost: isNaN(cost) || cost < 0 ? 0 : cost,
              trackIndividually: Boolean(variant.product?.track_individually),
              status: 'PENDING',
            });
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (importedRows.length > 0) {
        setRows((prev) => [...prev, ...importedRows]);
        showToast(`Imported ${successCount} items from CSV${failCount > 0 ? ` (${failCount} not found)` : ''}`, 'success');
      } else {
        showToast('No matching product variants found in CSV', 'error');
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  // Submit bulk opening stock entries
  const handleSubmit = async () => {
    if (rows.length === 0) {
      showToast(t('inventory.addAtLeastOneVariant') || 'Add at least one variant to proceed', 'error');
      return;
    }

    // Client-side validations
    const invalidRow = rows.find((r) => r.quantity <= 0 || r.unitCost < 0);
    if (invalidRow) {
      showToast(`Invalid quantity or cost for variant ${invalidRow.sku}`, 'error');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let refusalCount = 0;

    const nextRows = [...rows];

    for (let i = 0; i < nextRows.length; i++) {
      const row = nextRows[i];
      if (row.status === 'SUCCESS') continue;

      try {
        await api.inventory.stock.enterOpening({
          variantId: row.variantId,
          quantity: row.quantity,
          unitCost: row.unitCost,
        });

        nextRows[i] = {
          ...row,
          status: 'SUCCESS',
          errorMessage: undefined,
          hasExistingMovement: false,
        };
        successCount++;
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || err?.message || 'Failed to enter opening stock';
        const isRefusal =
          errorMsg.toLowerCase().includes('stock movements already exist') ||
          errorMsg.toLowerCase().includes('adjustments instead');

        nextRows[i] = {
          ...row,
          status: 'ERROR',
          errorMessage: errorMsg,
          hasExistingMovement: isRefusal,
        };

        if (isRefusal) refusalCount++;
      }
    }

    setRows(nextRows);
    setIsSubmitting(false);

    if (refusalCount > 0) {
      showToast(
        `${refusalCount} variant(s) rejected: movements already exist. Use Stock Adjustments instead.`,
        'error',
      );
    } else if (successCount > 0) {
      showToast(`Successfully applied opening stock for ${successCount} variant(s)!`, 'success');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-primary" />
            {t('inventory.openingStock') || 'Opening Stock Entry'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentBranch?.name ? `${currentBranch.name} • ` : ''}
            {t('inventory.openingStockSubtitle') ||
              'Enter initial on-hand stock and unit cost for variants before any sales or transactions occur.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {t('inventory.csvTemplate') || 'CSV Template'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {t('inventory.importCsv') || 'Import CSV'}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">{t('inventory.openingStockRules') || 'Important Policy'}: </span>
          {t('inventory.openingStockNotice') ||
            'Opening stock can only be entered for variants that have NEVER had any stock movements in this branch. If movements already exist, the backend will refuse and you must use a Stock Adjustment.'}
        </div>
      </div>

      {/* Quick Entry Toolbar */}
      <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t('purchasing.scanBarcode') || 'Scan Barcode (Quick Add)'}
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
              placeholder="Search by product name or SKU..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Search Dropdown */}
          {variantSearch.trim().length >= 2 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="p-3 text-xs text-muted-foreground text-center">
                  Searching catalog...
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
                        Add
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

      {/* Bulk Entry Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">
              {t('inventory.itemsList') || 'Variants for Opening Stock'} ({rows.length})
            </span>
          </div>

          {rows.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRows([])}
              className="text-destructive hover:bg-destructive/10 text-xs h-8"
            >
              {t('common.clearAll') || 'Clear All'}
            </Button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <PlusCircle className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">No items added yet</p>
            <p className="text-xs">
              Scan barcodes, search products above, or upload a CSV to populate opening stock items.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Product / Variant</th>
                  <th className="px-4 py-3 text-left w-36">Quantity</th>
                  <th className="px-4 py-3 text-left w-44">Unit Cost (BDT)</th>
                  <th className="px-4 py-3 text-left">Status / Feedback</th>
                  <th className="px-4 py-3 text-right w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, idx) => (
                  <tr
                    key={row.variantId}
                    className={
                      row.status === 'ERROR'
                        ? 'bg-destructive/5'
                        : row.status === 'SUCCESS'
                        ? 'bg-emerald-500/5'
                        : 'hover:bg-muted/20'
                    }
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{row.productName}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>SKU: {row.sku}</span>
                        {row.barcode && <span>• Barcode: {row.barcode}</span>}
                      </div>
                      {(row.sizeName || row.colorName) && (
                        <div className="text-xs text-muted-foreground flex gap-1 mt-0.5">
                          {row.sizeName && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1">
                              {row.sizeName}
                            </Badge>
                          )}
                          {row.colorName && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1">
                              {row.colorName}
                            </Badge>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <QuantityInput
                        value={row.quantity}
                        onChange={(qty) => updateRow(idx, { quantity: qty })}
                        trackIndividually={row.trackIndividually}
                        disabled={row.status === 'SUCCESS'}
                        min={1}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MoneyInput
                        value={row.unitCost}
                        onChange={(cost) => updateRow(idx, { unitCost: cost })}
                        disabled={row.status === 'SUCCESS'}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.status === 'SUCCESS' ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Applied</span>
                        </div>
                      ) : row.status === 'ERROR' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-destructive font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{row.errorMessage}</span>
                          </div>
                          {row.hasExistingMovement && (
                            <div className="mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-primary text-primary hover:bg-primary/10"
                                onClick={() =>
                                  router.push(
                                    `/inventory/adjustments/new?variantId=${row.variantId}&suggestedQty=${row.quantity}`,
                                  )
                                }
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                {t('inventory.createAdjustmentShortcut') || 'Create Stock Adjustment'}
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status !== 'SUCCESS' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(idx)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Actions */}
        {rows.length > 0 && (
          <div className="p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              Total items: <span className="font-semibold text-foreground">{rows.length}</span> •
              Pending: <span className="font-semibold">{rows.filter((r) => r.status === 'PENDING').length}</span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || rows.every((r) => r.status === 'SUCCESS')}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Applying Opening Stock...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t('inventory.applyOpeningStock') || 'Apply Opening Stock'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
