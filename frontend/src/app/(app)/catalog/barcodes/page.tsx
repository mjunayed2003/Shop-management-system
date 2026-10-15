'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { formatBDT } from '@/lib/utils/formatters';
import { BarcodeRenderer } from '@/components/catalog/BarcodeRenderer';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  Printer,
  Barcode,
  Search,
  Plus,
  Trash2,
  Settings2,
  Check,
  AlertCircle,
  Layers,
  ArrowLeft,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface PrintItem {
  variantId: string;
  sku: string;
  barcode: string;
  productName: string;
  productCode: string;
  sizeName?: string;
  colorName?: string;
  price: number;
  quantity: number;
}

interface LabelSettings {
  preset: '50x30' | '38x25' | 'a4_grid' | 'custom';
  customWidth: number;
  customHeight: number;
  showShopName: boolean;
  showProductName: boolean;
  showSizeColor: boolean;
  showPrice: boolean;
  showBarcodeText: boolean;
}

const DEFAULT_SETTINGS: LabelSettings = {
  preset: '50x30',
  customWidth: 50,
  customHeight: 30,
  showShopName: true,
  showProductName: true,
  showSizeColor: true,
  showPrice: true,
  showBarcodeText: true,
};

function BarcodePrintContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('productId');
  const toast = useToast();

  const user = useAuthStore((s) => s.user);
  const currentBranch = useBranchStore((s) => s.currentBranch);

  // Settings loaded from localStorage
  const [settings, setSettings] = useState<LabelSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('agy_barcode_label_settings');
        if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings on update
  useEffect(() => {
    try {
      localStorage.setItem('agy_barcode_label_settings', JSON.stringify(settings));
    } catch (e) {
      // ignore
    }
  }, [settings]);

  // Queue of items to print
  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [printType, setPrintType] = useState<'INITIAL_PRINT' | 'REPRINT'>('INITIAL_PRINT');
  const [reprintReason, setReprintReason] = useState('');
  const [isLoggingPrint, setIsLoggingPrint] = useState(false);

  // Preload initial product if provided
  const { data: initialProduct, isLoading: isLoadingInitial } = useQuery({
    queryKey: ['product', initialProductId],
    queryFn: () => api.catalog.products.get(initialProductId!),
    enabled: !!initialProductId,
  });

  useEffect(() => {
    if (initialProduct?.variants && initialProduct.variants.length > 0) {
      const items: PrintItem[] = initialProduct.variants.map((v: any) => ({
        variantId: v.id,
        sku: v.sku,
        barcode: v.barcode || v.sku,
        productName: initialProduct.name,
        productCode: initialProduct.code,
        sizeName: v.size?.name,
        colorName: v.color?.name,
        price: Number(v.retailPrice || 0),
        quantity: 1,
      }));
      setPrintQueue(items);
    }
  }, [initialProduct]);

  // Search products query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['productsSearch', searchQuery],
    queryFn: () =>
      api.catalog.products.list({
        search: searchQuery,
        limit: 10,
        isActive: true,
      }),
    enabled: searchQuery.trim().length >= 2,
  });

  // Add all variants of a product from search
  const handleAddProductVariants = (product: any) => {
    if (!product.variants || product.variants.length === 0) return;
    const newItems: PrintItem[] = product.variants.map((v: any) => ({
      variantId: v.id,
      sku: v.sku,
      barcode: v.barcode || v.sku,
      productName: product.name,
      productCode: product.code,
      sizeName: v.size?.name,
      colorName: v.color?.name,
      price: Number(v.retailPrice || v.retail_price || 0),
      quantity: 1,
    }));

    setPrintQueue((prev) => {
      const existingIds = new Set(prev.map((i) => i.variantId));
      const filtered = newItems.filter((i) => !existingIds.has(i.variantId));
      return [...prev, ...filtered];
    });
    setSearchQuery('');
  };

  // Update quantity in queue
  const updateQuantity = (variantId: string, quantity: number) => {
    setPrintQueue((prev) =>
      prev.map((item) =>
        item.variantId === variantId ? { ...item, quantity: Math.max(1, quantity) } : item,
      ),
    );
  };

  // Remove from queue
  const removeItem = (variantId: string) => {
    setPrintQueue((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  // Total label count
  const totalLabels = useMemo(
    () => printQueue.reduce((acc, curr) => acc + (curr.quantity || 1), 0),
    [printQueue],
  );

  // Compute label dimensions (mm)
  const dimensions = useMemo(() => {
    if (settings.preset === '50x30') return { width: 50, height: 30 };
    if (settings.preset === '38x25') return { width: 38, height: 25 };
    if (settings.preset === 'custom')
      return { width: settings.customWidth || 50, height: settings.customHeight || 30 };
    return { width: 70, height: 36 }; // A4 cell estimate
  }, [settings]);

  // Execute print
  const handlePrint = async () => {
    if (printQueue.length === 0) {
      toast.error('Print queue is empty. Add products to print.');
      return;
    }

    if (printType === 'REPRINT' && !reprintReason.trim()) {
      toast.error(t('barcodes.reprintReasonRequired') || 'A reason is required when reprinting labels.');
      return;
    }

    setIsLoggingPrint(true);
    try {
      // Call backend to log print for each variant
      for (const item of printQueue) {
        await api.catalog.barcodes.print({
          variantId: item.variantId,
          quantity: item.quantity,
          printType,
          reason: printType === 'REPRINT' ? reprintReason.trim() : undefined,
        });
      }

      toast.success(t('barcodes.printLoggedSuccess') || 'Barcode print logged successfully.');

      // Allow DOM state to settle, then open browser print dialog
      setTimeout(() => {
        window.print();
        setIsLoggingPrint(false);
      }, 300);
    } catch (err: any) {
      setIsLoggingPrint(false);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to log barcode printing');
    }
  };

  // Expand print queue into individual label items for printing
  const expandedLabels = useMemo(() => {
    const list: PrintItem[] = [];
    printQueue.forEach((item) => {
      const q = Math.max(1, item.quantity);
      for (let i = 0; i < q; i++) {
        list.push(item);
      }
    });
    return list;
  }, [printQueue]);

  return (
    <>
      {/* Dynamic Print CSS */}
      <style jsx global>{`
        @media print {
          /* Hide all UI layout elements */
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }

          /* Thermal printer label sizing */
          ${settings.preset !== 'a4_grid'
            ? `
            @page {
              size: ${dimensions.width}mm ${dimensions.height}mm;
              margin: 0;
            }
            .printable-label {
              width: ${dimensions.width}mm !important;
              height: ${dimensions.height}mm !important;
              max-width: ${dimensions.width}mm !important;
              max-height: ${dimensions.height}mm !important;
              padding: 1.5mm !important;
              margin: 0 !important;
              page-break-after: always;
              break-after: page;
              box-sizing: border-box;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              text-align: center;
            }
          `
            : `
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            #print-area {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 2mm;
            }
            .printable-label {
              width: 100% !important;
              height: 34mm !important;
              padding: 2mm !important;
              border: 1px dashed #ccc;
              box-sizing: border-box;
              page-break-inside: avoid;
              break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              text-align: center;
            }
          `}
        }
      `}</style>

      <div className="space-y-6 no-print">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-9 w-9 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Barcode className="w-6 h-6 text-primary" />
                {t('barcodes.printLabels')}
              </h1>
              <p className="text-sm text-muted-foreground">
                Thermal & sheet label designer with audit logging and Bangladeshi currency formatting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs px-2.5 py-1">
              Total Labels: <strong className="ml-1 text-primary">{totalLabels}</strong>
            </Badge>
            <Button
              onClick={handlePrint}
              disabled={printQueue.length === 0 || isLoggingPrint}
              className="gap-2"
            >
              {isLoggingPrint ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {t('barcodes.printNow') || 'Print Labels'}
            </Button>
          </div>
        </div>

        {/* Main Content: Split 2 columns (Queue & Settings + Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Item Selection & Queue (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Search / Add Products */}
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                {t('barcodes.searchProducts') || 'Search & Add Products'}
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by product name, code, SKU or barcode..."
                  className="pl-9 text-xs"
                />
              </div>

              {/* Search Results Dropdown */}
              {isSearching && (
                <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  Searching catalog...
                </div>
              )}

              {searchResults?.data && searchResults.data.length > 0 && (
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto bg-background">
                  {searchResults.data.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-2.5 flex items-center justify-between hover:bg-muted/50 text-xs"
                    >
                      <div>
                        <span className="font-semibold">{p.name}</span>
                        <div className="text-muted-foreground text-[11px] flex gap-2 mt-0.5">
                          <span className="font-mono bg-muted px-1 rounded">{p.code}</span>
                          <span>• {p.variants?.length || 0} variant(s)</span>
                          <span>• {p.brand?.name || 'Unbranded'}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={() => handleAddProductVariants(p)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add ({p.variants?.length || 0})
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Print Queue Table */}
            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Print Queue ({printQueue.length} variants)
                  </h2>
                </div>
                {printQueue.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive h-7"
                    onClick={() => setPrintQueue([])}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {printQueue.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
                  <Barcode className="w-8 h-8 mx-auto opacity-30" />
                  <p>No variants in the queue.</p>
                  <p className="text-[11px]">Search products above or open from a product detail page.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-muted/50 uppercase text-[10px] text-muted-foreground sticky top-0 border-b">
                      <tr>
                        <th className="py-2.5 px-3">Product / Variant</th>
                        <th className="py-2.5 px-3">SKU / Barcode</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-center">Copies</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {printQueue.map((item) => (
                        <tr key={item.variantId} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground truncate max-w-[160px]">
                              {item.productName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {[item.sizeName, item.colorName].filter(Boolean).join(' • ') || 'Standard'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <div>{item.sku}</div>
                            <div className="text-[10px] text-muted-foreground">{item.barcode}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {formatBDT(item.price)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Input
                              type="number"
                              min="1"
                              max="1000"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(item.variantId, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-16 h-7 text-xs text-center mx-auto"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(item.variantId)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Format Settings & Live Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Label Format Configuration */}
            <div className="bg-card border rounded-lg p-4 space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                {t('barcodes.labelSettings') || 'Label Format & Settings'}
              </h2>

              {/* Preset Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Label Size Preset</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, preset: '50x30' }))}
                    className={`p-2 rounded text-xs border text-left transition-colors ${
                      settings.preset === '50x30'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-input hover:bg-muted/50'
                    }`}
                  >
                    <div>50 × 30 mm</div>
                    <div className="text-[10px] text-muted-foreground">Standard Thermal</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, preset: '38x25' }))}
                    className={`p-2 rounded text-xs border text-left transition-colors ${
                      settings.preset === '38x25'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-input hover:bg-muted/50'
                    }`}
                  >
                    <div>38 × 25 mm</div>
                    <div className="text-[10px] text-muted-foreground">Compact Jewelry/Apparel</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, preset: 'a4_grid' }))}
                    className={`p-2 rounded text-xs border text-left transition-colors ${
                      settings.preset === 'a4_grid'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-input hover:bg-muted/50'
                    }`}
                  >
                    <div>A4 Sheet Grid</div>
                    <div className="text-[10px] text-muted-foreground">3 × 8 (24 per page)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, preset: 'custom' }))}
                    className={`p-2 rounded text-xs border text-left transition-colors ${
                      settings.preset === 'custom'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-input hover:bg-muted/50'
                    }`}
                  >
                    <div>Custom Size</div>
                    <div className="text-[10px] text-muted-foreground">Set mm manually</div>
                  </button>
                </div>
              </div>

              {/* Custom Dimensions if selected */}
              {settings.preset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Width (mm)</label>
                    <Input
                      type="number"
                      min="20"
                      max="150"
                      value={settings.customWidth}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, customWidth: parseInt(e.target.value, 10) || 50 }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Height (mm)</label>
                    <Input
                      type="number"
                      min="15"
                      max="150"
                      value={settings.customHeight}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, customHeight: parseInt(e.target.value, 10) || 30 }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Field Visibility Toggles */}
              <div className="space-y-2 pt-2 border-t text-xs">
                <span className="font-medium text-muted-foreground block text-[11px]">Fields to Include:</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showShopName}
                      onChange={(e) => setSettings((s) => ({ ...s, showShopName: e.target.checked }))}
                      className="rounded border-input text-primary"
                    />
                    <span>Shop Name</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showProductName}
                      onChange={(e) => setSettings((s) => ({ ...s, showProductName: e.target.checked }))}
                      className="rounded border-input text-primary"
                    />
                    <span>Product Name</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showSizeColor}
                      onChange={(e) => setSettings((s) => ({ ...s, showSizeColor: e.target.checked }))}
                      className="rounded border-input text-primary"
                    />
                    <span>Size / Color</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showPrice}
                      onChange={(e) => setSettings((s) => ({ ...s, showPrice: e.target.checked }))}
                      className="rounded border-input text-primary"
                    />
                    <span>Retail Price (BDT)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showBarcodeText}
                      onChange={(e) => setSettings((s) => ({ ...s, showBarcodeText: e.target.checked }))}
                      className="rounded border-input text-primary"
                    />
                    <span>Barcode Digits</span>
                  </label>
                </div>
              </div>

              {/* Audit Logging: Initial vs Reprint */}
              <div className="space-y-2 pt-2 border-t text-xs">
                <span className="font-medium text-muted-foreground block text-[11px]">Audit Print Mode:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="printType"
                      checked={printType === 'INITIAL_PRINT'}
                      onChange={() => setPrintType('INITIAL_PRINT')}
                    />
                    <span>Initial Print</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="printType"
                      checked={printType === 'REPRINT'}
                      onChange={() => setPrintType('REPRINT')}
                    />
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Reprint</span>
                  </label>
                </div>

                {printType === 'REPRINT' && (
                  <div className="mt-2 space-y-1">
                    <label className="text-[11px] font-medium text-destructive block">
                      Reprint Reason (Required by Server):
                    </label>
                    <Input
                      value={reprintReason}
                      onChange={(e) => setReprintReason(e.target.value)}
                      placeholder="e.g. Label smudged, tag lost by customer, retagging..."
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Live Label Preview
              </h2>

              <div className="p-4 bg-muted/40 rounded-lg flex items-center justify-center min-h-[160px]">
                {printQueue.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Add products to view live preview</span>
                ) : (
                  <div
                    className="border border-border shadow-sm rounded bg-white text-black p-2 flex flex-col justify-between items-center text-center transition-all select-none"
                    style={{
                      width: `${Math.min(dimensions.width * 3.8, 260)}px`,
                      minHeight: `${Math.min(dimensions.height * 3.8, 160)}px`,
                    }}
                  >
                    {/* Shop Name */}
                    {settings.showShopName && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-black truncate w-full">
                        {currentBranch?.name || user?.fullName || 'Shop Management'}
                      </div>
                    )}

                    {/* Product Name */}
                    {settings.showProductName && (
                      <div className="text-xs font-semibold text-black truncate w-full px-1">
                        {printQueue[0].productName}
                      </div>
                    )}

                    {/* Size & Color */}
                    {settings.showSizeColor && (
                      <div className="text-[10px] text-neutral-600 font-medium truncate w-full">
                        {[printQueue[0].sizeName, printQueue[0].colorName].filter(Boolean).join(' / ') ||
                          'Standard'}
                      </div>
                    )}

                    {/* Barcode Graphic */}
                    <div className="py-1 w-full flex justify-center">
                      <BarcodeRenderer
                        value={printQueue[0].barcode || printQueue[0].sku}
                        width={1.4}
                        height={32}
                        displayValue={false}
                      />
                    </div>

                    {/* Barcode text */}
                    {settings.showBarcodeText && (
                      <div className="font-mono text-[10px] font-bold text-black tracking-widest">
                        {printQueue[0].barcode || printQueue[0].sku}
                      </div>
                    )}

                    {/* Price */}
                    {settings.showPrice && (
                      <div className="text-xs font-black text-black mt-0.5">
                        {formatBDT(printQueue[0].price)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HIDDEN PRINT AREA - Rendered only when window.print() is executed */}
      <div id="print-area">
        {expandedLabels.map((item, idx) => (
          <div key={`${item.variantId}-${idx}`} className="printable-label">
            {settings.showShopName && (
              <div
                style={{
                  fontSize: '8pt',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  lineHeight: '1',
                  marginBottom: '1mm',
                }}
              >
                {currentBranch?.name || user?.fullName || 'Shop Management'}
              </div>
            )}

            {settings.showProductName && (
              <div
                style={{
                  fontSize: '8.5pt',
                  fontWeight: '600',
                  lineHeight: '1.1',
                  maxHeight: '7mm',
                  overflow: 'hidden',
                }}
              >
                {item.productName}
              </div>
            )}

            {settings.showSizeColor && (
              <div
                style={{
                  fontSize: '7.5pt',
                  color: '#333',
                  lineHeight: '1',
                  marginTop: '0.5mm',
                }}
              >
                {[item.sizeName, item.colorName].filter(Boolean).join(' / ') || 'Standard'}
              </div>
            )}

            <div style={{ margin: '1mm 0' }}>
              <BarcodeRenderer
                value={item.barcode || item.sku}
                width={1.3}
                height={28}
                displayValue={false}
              />
            </div>

            {settings.showBarcodeText && (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '7.5pt',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                  lineHeight: '1',
                }}
              >
                {item.barcode || item.sku}
              </div>
            )}

            {settings.showPrice && (
              <div
                style={{
                  fontSize: '9.5pt',
                  fontWeight: '900',
                  lineHeight: '1.2',
                  marginTop: '1mm',
                }}
              >
                {formatBDT(item.price)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default function BarcodePrintPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate
      permission="barcodes:print"
      fallback={
        <div className="p-8 text-center text-muted-foreground">
          {t('common.unauthorized')}
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>}>
        <BarcodePrintContent />
      </Suspense>
    </PermissionGate>
  );
}
