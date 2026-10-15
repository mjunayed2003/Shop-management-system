'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useTranslation } from '@/lib/i18n';
import { useBranchStore } from '@/lib/store/branch-store';
import { formatBDT } from '@/lib/utils/formatters';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { OtherBranchStockPanel, BranchStockItem } from '@/components/catalog/OtherBranchStockPanel';
import { BarcodeRenderer } from '@/components/catalog/BarcodeRenderer';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Barcode,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Plus,
  ExternalLink,
  Printer,
  Boxes,
  Store,
  ArrowRight,
} from 'lucide-react';

export default function BarcodeLookupPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentBranch = useBranchStore((s) => s.currentBranch);

  const [searchedBarcode, setSearchedBarcode] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Barcode Lookup Mutation
  const lookupMutation = useMutation({
    mutationFn: (barcode: string) => api.catalog.barcodes.lookup(barcode),
    onSuccess: (data) => {
      setLookupResult(data);
      setLookupError(null);
      setIsNotFound(false);
    },
    onError: (err: any) => {
      setLookupResult(null);
      if (err?.response?.status === 404) {
        setIsNotFound(true);
        setLookupError(err?.response?.data?.message || `No product found for barcode "${searchedBarcode}".`);
      } else {
        setIsNotFound(false);
        setLookupError(err?.response?.data?.message || err?.message || 'Failed to lookup barcode.');
      }
    },
  });

  const handleScan = (barcode: string) => {
    setSearchedBarcode(barcode);
    setLookupResult(null);
    setLookupError(null);
    setIsNotFound(false);
    lookupMutation.mutate(barcode);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Barcode className="w-6 h-6 text-primary" />
          {t('barcodes.lookupTitle') || 'Barcode Lookup Tool'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan or enter a product barcode to view real-time branch availability, pricing, and stock across all branches
        </p>
      </div>

      {/* Scanner Input Card */}
      <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider">
            Scanner / Manual Input
          </span>
          <span className="text-xs text-muted-foreground">
            Current Branch: <strong className="text-foreground">{currentBranch?.name || 'Main Branch'}</strong>
          </span>
        </div>

        <BarcodeInput
          onScan={handleScan}
          isLoading={lookupMutation.isPending}
          placeholder="Scan barcode with hardware scanner or enter manually..."
        />
      </div>

      {/* Case 1: Active in Current Branch */}
      {lookupResult?.found && lookupResult.activeInCurrentBranch && (
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {lookupResult.product?.name}
                  </h2>
                  <Badge variant="default" className="bg-emerald-600 text-white text-xs">
                    Active in {currentBranch?.name || 'Current Branch'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Code: <span className="font-mono">{lookupResult.product?.code}</span> • Category:{' '}
                  <span>{lookupResult.product?.category?.name || '—'}</span> • Brand:{' '}
                  <span>{lookupResult.product?.brand?.name || '—'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/catalog/barcodes?productId=${lookupResult.product?.id}`)
                }
              >
                <Printer className="w-4 h-4 mr-1.5" />
                {t('barcodes.printLabels') || 'Print Labels'}
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/products/${lookupResult.product?.id}`)}
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                {t('common.view')}
              </Button>
            </div>
          </div>

          {/* Variant & Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Variant Card */}
            <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
              <span className="text-xs text-muted-foreground block font-semibold uppercase">Variant Details</span>
              <div className="font-mono text-sm font-semibold">{lookupResult.variant?.sku}</div>
              <div className="text-xs text-muted-foreground">
                Size:{' '}
                <strong className="text-foreground">
                  {lookupResult.variant?.size?.name || 'Standard'}
                </strong>{' '}
                • Color:{' '}
                <strong className="text-foreground">
                  {lookupResult.variant?.color?.name || 'Standard'}
                </strong>
              </div>
              <div className="pt-2">
                <BarcodeRenderer
                  value={lookupResult.variant?.barcode || lookupResult.variant?.sku}
                  width={1.4}
                  height={32}
                  displayValue
                />
              </div>
            </div>

            {/* Price Card */}
            <div className="bg-muted/30 border rounded-lg p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-semibold uppercase">Retail Price</span>
                <div className="text-3xl font-extrabold text-foreground mt-2">
                  {formatBDT(lookupResult.variant?.retailPrice)}
                </div>
                {lookupResult.variant?.wholesalePrice > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Wholesale: {formatBDT(lookupResult.variant?.wholesalePrice)}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground pt-3 border-t">
                Currency: Bangladeshi Taka (BDT)
              </div>
            </div>

            {/* Branch Stock Card */}
            <div className="bg-muted/30 border rounded-lg p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-semibold uppercase">Current Branch Stock</span>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 flex items-baseline gap-1.5">
                  {lookupResult.variant?.stock ?? 0}
                  <span className="text-xs font-normal text-muted-foreground">
                    {lookupResult.product?.unit?.name || 'pcs'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Reorder Level: {lookupResult.variant?.reorderLevel ?? 5}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground pt-3 border-t">
                Location: {currentBranch?.name || 'Current Branch'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case 2: PRODUCT_IN_OTHER_BRANCH */}
      {lookupResult?.found && !lookupResult.activeInCurrentBranch && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Product Not Available in {currentBranch?.name || 'Current Branch'}
              </h3>
              <p className="text-xs text-amber-700/90 dark:text-amber-400/90">
                This item exists in the company catalog, but is not currently activated for sales in your branch. Stock is available in the other branches shown below.
              </p>
            </div>
          </div>

          {/* Reusable OtherBranchStockPanel */}
          <OtherBranchStockPanel
            branches={lookupResult.otherBranchesStock || []}
            productName={lookupResult.product?.name}
            variantSku={lookupResult.variant?.sku}
          />
        </div>
      )}

      {/* Case 3: Not Found with Create Product Shortcut */}
      {isNotFound && (
        <div className="bg-card border rounded-xl p-8 text-center space-y-4 shadow-sm animate-in fade-in-50">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <HelpCircle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-foreground">Barcode Not Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {lookupError || `No catalog item exists matching barcode "${searchedBarcode}".`}
            </p>
          </div>

          <div className="pt-2">
            <PermissionGate permission="products:create">
              <Button
                onClick={() =>
                  router.push(`/products/new?barcode=${encodeURIComponent(searchedBarcode)}`)
                }
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Product with Barcode {searchedBarcode}</span>
              </Button>
            </PermissionGate>
          </div>
        </div>
      )}
    </div>
  );
}
