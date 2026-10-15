'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { formatBDT } from '@/lib/utils/formatters';
import { applyPriceAdjustment, toDecimal } from '@/lib/utils/money';
import { exportToCsv, downloadCsv, parseCsv } from '@/lib/utils/csv';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  Tag,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Edit2,
  Check,
  X,
} from 'lucide-react';

export default function PriceListDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const priceListId = params?.id as string;
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');

  // Bulk Set Modal State
  const [isBulkSetOpen, setIsBulkSetOpen] = useState(false);
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [bulkValue, setBulkValue] = useState<string>('-10'); // default 10% discount

  // CSV Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Add Item State
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [variantSearch, setVariantSearch] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');

  // Query Price List details
  const { data: priceList, isLoading } = useQuery({
    queryKey: ['priceList', priceListId],
    queryFn: () => api.catalog.priceLists.get(priceListId),
    enabled: !!priceListId,
  });

  // Query Catalog Variants for "Add Variant" search
  const { data: catalogProducts } = useQuery({
    queryKey: ['catalogProductsForPriceList', variantSearch],
    queryFn: () =>
      api.catalog.products.list({
        search: variantSearch,
        limit: 10,
        isActive: true,
      }),
    enabled: isAddVariantOpen && variantSearch.trim().length >= 2,
  });

  // Set / Update Item Mutation
  const setItemMutation = useMutation({
    mutationFn: ({ variantId, price }: { variantId: string; price: number }) =>
      api.catalog.priceLists.setItem(priceListId, { variantId, price }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceList', priceListId] });
      toast.success('Price list item updated');
      setEditingItemId(null);
      setEditingPrice('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update item price');
    },
  });

  // Remove Item Mutation
  const removeItemMutation = useMutation({
    mutationFn: (variantId: string) =>
      api.catalog.priceLists.removeItem(priceListId, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceList', priceListId] });
      toast.success('Variant removed from price list');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to remove variant');
    },
  });

  // Filtered items in the table
  const items = priceList?.items || [];
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item: any) => {
      const v = item.variant;
      const p = v?.product;
      return (
        p?.name?.toLowerCase().includes(q) ||
        v?.sku?.toLowerCase().includes(q) ||
        v?.barcode?.toLowerCase().includes(q) ||
        v?.size?.name?.toLowerCase().includes(q) ||
        v?.color?.name?.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery]);

  // Bulk Apply Price Adjustment using decimal.js
  const handleApplyBulk = async () => {
    const val = parseFloat(bulkValue);
    if (isNaN(val)) {
      toast.error('Please enter a valid numeric adjustment value.');
      return;
    }

    try {
      for (const item of items) {
        const standardRetail = Number(item.variant?.retail_price || item.variant?.retailPrice || 0);
        const adjusted = applyPriceAdjustment(standardRetail, bulkAdjustmentType, val);
        await api.catalog.priceLists.setItem(priceListId, {
          variantId: item.variant.id,
          price: adjusted,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['priceList', priceListId] });
      toast.success(`Bulk updated ${items.length} items using decimal.js`);
      setIsBulkSetOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to apply bulk adjustment');
    }
  };

  // CSV Export with formula injection prevention
  const handleExportCsv = () => {
    if (items.length === 0) {
      toast.error('No items to export.');
      return;
    }

    const headers = [
      'SKU',
      'Barcode',
      'ProductName',
      'Size',
      'Color',
      'StandardRetail',
      'PriceListPrice',
    ];

    const rows = items.map((item: any) => {
      const v = item.variant;
      return [
        v.sku,
        v.barcode || '',
        v.product?.name || '',
        v.size?.name || '',
        v.color?.name || '',
        v.retail_price || v.retailPrice || 0,
        item.price,
      ];
    });

    const csvContent = exportToCsv(headers, rows);
    downloadCsv(csvContent, `price_list_${priceList?.code || priceList?.name || 'items'}.csv`);
    toast.success('Price list CSV exported successfully');
  };

  // CSV File Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const { headers: rawHeaders, data: rowsData } = parseCsv(text);
      if (rawHeaders.length === 0) {
        toast.error('CSV file is empty');
        return;
      }

      const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
      const skuIdx = headers.findIndex((h) => h.includes('sku'));
      const priceIdx = headers.findIndex((h) => h.includes('price') || h.includes('pricelistprice'));

      if (skuIdx === -1 || priceIdx === -1) {
        toast.error('CSV must have columns for SKU and Price');
        return;
      }

      const validRows: any[] = [];
      const errs: { row: number; error: string }[] = [];

      for (let i = 0; i < rowsData.length; i++) {
        const row = rowsData[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const sku = row[skuIdx]?.trim();
        const priceStr = row[priceIdx]?.trim();
        const priceNum = parseFloat(priceStr);

        if (!sku) {
          errs.push({ row: i + 2, error: 'SKU cannot be empty' });
          continue;
        }

        if (isNaN(priceNum) || priceNum < 0) {
          errs.push({ row: i + 2, error: `Invalid price "${priceStr}" (must be >= 0)` });
          continue;
        }

        validRows.push({ sku, price: priceNum, rowNumber: i + 2 });
      }

      setImportRows(validRows);
      setImportErrors(errs);
      setIsImportOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  // Execute CSV Import
  const handleExecuteImport = async () => {
    if (importRows.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: importRows.length });

    // Build map of existing SKU -> variantId
    const skuMap = new Map<string, string>();
    items.forEach((item: any) => {
      if (item.variant?.sku) skuMap.set(item.variant.sku.toUpperCase(), item.variant.id);
    });

    let successCount = 0;
    const executionErrors: { row: number; error: string }[] = [];

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      const variantId = skuMap.get(row.sku.toUpperCase());

      if (!variantId) {
        executionErrors.push({
          row: row.rowNumber,
          error: `SKU "${row.sku}" not found in this price list. Add variant first.`,
        });
      } else {
        try {
          await api.catalog.priceLists.setItem(priceListId, {
            variantId,
            price: row.price,
          });
          successCount++;
        } catch (err: any) {
          executionErrors.push({
            row: row.rowNumber,
            error: err?.message || 'Failed to set price',
          });
        }
      }

      setImportProgress({ current: i + 1, total: importRows.length });
    }

    queryClient.invalidateQueries({ queryKey: ['priceList', priceListId] });
    setIsImporting(false);

    if (executionErrors.length > 0) {
      setImportErrors(executionErrors);
      toast.error(`Imported ${successCount} items with ${executionErrors.length} errors.`);
    } else {
      toast.success(`Successfully imported all ${successCount} prices!`);
      setIsImportOpen(false);
    }
  };

  // Add Single Variant
  const handleAddVariantSubmit = () => {
    if (!selectedVariant) {
      toast.error('Please select a variant.');
      return;
    }
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price >= 0.');
      return;
    }

    setItemMutation.mutate({
      variantId: selectedVariant.id,
      price,
    });
    setIsAddVariantOpen(false);
    setSelectedVariant(null);
    setNewPrice('');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!priceList) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive font-medium">Price list not found.</p>
        <Button variant="outline" onClick={() => router.push('/catalog/price-lists')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Price Lists
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden File Input for CSV Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/catalog/price-lists')}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {priceList.name}
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                {priceList.type}
              </Badge>
              {priceList.is_default && (
                <Badge variant="default" className="bg-amber-500 text-white text-[10px]">
                  Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Code: <span className="font-mono">{priceList.code || '—'}</span> • {items.length} items configured
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate permission="products:update">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkSetOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Bulk Set Prices</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5 text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </Button>
          </PermissionGate>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <PermissionGate permission="products:update">
            <Button
              size="sm"
              onClick={() => {
                setIsAddVariantOpen(true);
                setVariantSearch('');
                setSelectedVariant(null);
                setNewPrice('');
              }}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Variant</span>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3 bg-card border rounded-lg p-3">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter variants in this price list by name, SKU, barcode, size, color..."
          className="border-none shadow-none text-xs focus-visible:ring-0"
        />
      </div>

      {/* Items Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Size / Color</th>
                <th className="py-3 px-4 text-right">Standard Retail</th>
                <th className="py-3 px-4 text-right">Price List Price (BDT)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs">
                    {searchQuery ? 'No variants match your search filter.' : 'No variants assigned to this price list yet.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => {
                  const v = item.variant;
                  const isEditing = editingItemId === item.id;
                  const standardRetail = Number(v.retail_price || v.retailPrice || 0);

                  return (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground text-xs">{v.product?.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{v.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {[v.size?.name, v.color?.name].filter(Boolean).join(' • ') || 'Standard'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground text-xs">
                        {formatBDT(standardRetail)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Input
                              type="number"
                              step="any"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(e.target.value)}
                              className="w-24 h-7 text-xs text-right font-mono"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const p = parseFloat(editingPrice);
                                if (!isNaN(p) && p >= 0) {
                                  setItemMutation.mutate({ variantId: v.id, price: p });
                                }
                              }}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingItemId(null)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          formatBDT(item.price)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isEditing && (
                            <PermissionGate permission="products:update">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingPrice(String(item.price));
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeItemMutation.mutate(v.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </PermissionGate>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Set Modal */}
      {isBulkSetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Bulk Adjust Prices with decimal.js
            </h2>
            <p className="text-xs text-muted-foreground">
              Adjust prices across all {items.length} items in this price list relative to their standard retail price.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkAdjustmentType('PERCENT')}
                    className={`p-2 rounded text-xs border text-center transition-colors ${
                      bulkAdjustmentType === 'PERCENT'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-input hover:bg-muted/50'
                    }`}
                  >
                    Percentage (+ / - %)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkAdjustmentType('FIXED')}
                    className={`p-2 rounded text-xs border text-center transition-colors ${
                      bulkAdjustmentType === 'FIXED'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-input hover:bg-muted/50'
                    }`}
                  >
                    Fixed Offset (+ / - BDT)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {bulkAdjustmentType === 'PERCENT' ? 'Percentage Value (e.g. -10 for 10% off)' : 'BDT Amount (e.g. -50 for 50 BDT off)'}
                </label>
                <Input
                  type="number"
                  step="any"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="p-3 bg-muted/40 rounded border text-xs space-y-1">
                <span className="font-semibold block">Preview Calculation:</span>
                <span className="text-muted-foreground block">
                  A standard item priced at {formatBDT(1000)} will become{' '}
                  <strong className="text-primary font-bold">
                    {formatBDT(applyPriceAdjustment(1000, bulkAdjustmentType, parseFloat(bulkValue) || 0))}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkSetOpen(false)}
                className="text-xs"
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleApplyBulk}
                className="text-xs gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Apply to All Items
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Variant Modal */}
      {isAddVariantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add Variant to Price List
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Search Catalog Variant
                </label>
                <Input
                  value={variantSearch}
                  onChange={(e) => setVariantSearch(e.target.value)}
                  placeholder="Type product name, SKU, or barcode..."
                  className="text-xs"
                />
              </div>

              {/* Variant Results */}
              {catalogProducts?.data && catalogProducts.data.length > 0 && !selectedVariant && (
                <div className="border rounded max-h-48 overflow-y-auto divide-y bg-background">
                  {catalogProducts.data.flatMap((p: any) =>
                    (p.variants || []).map((v: any) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setSelectedVariant({ ...v, product: p });
                          setNewPrice(String(v.retailPrice || v.retail_price || 0));
                        }}
                        className="p-2 hover:bg-muted/50 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold">{p.name}</span>
                          <div className="text-[11px] text-muted-foreground">
                            SKU: {v.sku} • {[v.size?.name, v.color?.name].filter(Boolean).join('/') || 'Std'}
                          </div>
                        </div>
                        <div className="font-mono text-xs font-bold text-primary">
                          {formatBDT(v.retailPrice || v.retail_price || 0)}
                        </div>
                      </div>
                    )),
                  )}
                </div>
              )}

              {selectedVariant && (
                <div className="p-3 bg-muted/40 rounded border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold">{selectedVariant.product?.name}</span>
                      <div className="text-muted-foreground text-[11px]">SKU: {selectedVariant.sku}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-muted-foreground"
                      onClick={() => setSelectedVariant(null)}
                    >
                      Change
                    </Button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold block mb-1">
                      Price for this Price List (BDT)
                    </label>
                    <Input
                      type="number"
                      step="any"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddVariantOpen(false)}
                className="text-xs"
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                disabled={!selectedVariant || !newPrice}
                onClick={handleAddVariantSubmit}
                className="text-xs"
              >
                Add Variant
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Preview Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              CSV Price Import Preview
            </h2>

            <div className="text-xs space-y-1">
              <p>
                Parsed <strong>{importRows.length} valid row(s)</strong> ready to import.
              </p>
              {importErrors.length > 0 && (
                <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive space-y-1 max-h-32 overflow-y-auto">
                  <span className="font-semibold block">Errors detected:</span>
                  {importErrors.map((err, i) => (
                    <div key={i} className="text-[11px]">
                      Row {err.row}: {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isImporting && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Importing items...</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-200"
                    style={{
                      width: `${(importProgress.current / (importProgress.total || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={isImporting}
                onClick={() => setIsImportOpen(false)}
                className="text-xs"
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                disabled={isImporting || importRows.length === 0}
                onClick={handleExecuteImport}
                className="text-xs gap-1.5"
              >
                {isImporting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
