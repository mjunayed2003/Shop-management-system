'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { formatBDT } from '@/lib/utils/formatters';
import { calculateStockValue } from '@/lib/utils/money';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { BarcodeRenderer } from '@/components/catalog/BarcodeRenderer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import {
  ArrowLeft,
  Edit,
  Printer,
  Boxes,
  Layers,
  Store,
  History,
  Barcode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Calendar,
  Filter,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function ProductDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const toast = useToast();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const isOwnerOrAdmin = user?.isOwner;
  const canViewCost = Boolean(user?.isOwner || permissions?.includes('products:update'));

  // Active tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'variants' | 'stock' | 'branches' | 'barcodes' | 'history'>('overview');

  // Deactivate Force Dialog State
  const [forceDeactivateBranchId, setForceDeactivateBranchId] = useState<string | null>(null);
  const [forceDeactivateBranchName, setForceDeactivateBranchName] = useState<string>('');
  const [forceDeactivateReason, setForceDeactivateReason] = useState<string>('');
  const [forceDeactivateStockCount, setForceDeactivateStockCount] = useState<number | null>(null);

  // History Tab Filters
  const [selectedHistoryVariantId, setSelectedHistoryVariantId] = useState<string>('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('');
  const [historyPage, setHistoryPage] = useState(1);

  // Activate Branch State
  const [branchToActivate, setBranchToActivate] = useState<string>('');

  // Queries
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId, currentBranchId],
    queryFn: () => api.catalog.products.get(productId),
    enabled: !!productId,
  });

  const { data: allBranches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.branches.list(false),
    enabled: !!isOwnerOrAdmin,
  });

  const { data: stockSummary } = useQuery({
    queryKey: ['stockSummary'],
    queryFn: () => api.inventory.stock.summary(),
    enabled: !!isOwnerOrAdmin && activeTab === 'stock',
  });

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['stockMovements', productId, selectedHistoryVariantId, movementTypeFilter, historyPage],
    queryFn: () =>
      api.inventory.stock.movements({
        page: historyPage,
        limit: 20,
        variantId: selectedHistoryVariantId || undefined,
        movementType: movementTypeFilter || undefined,
      }),
    enabled: activeTab === 'history',
  });

  // Branch Activation Mutation
  const activateMutation = useMutation({
    mutationFn: (branchId: string) =>
      api.catalog.productBranches.activate({ productId, branchId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success(t('products.branchActivated') || 'Product activated in branch successfully');
      setBranchToActivate('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to activate branch');
    },
  });

  // Branch Deactivation Mutation
  const deactivateMutation = useMutation({
    mutationFn: ({ branchId, force }: { branchId: string; force?: boolean }) =>
      api.catalog.productBranches.deactivate({ productId, branchId, force }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success(t('products.branchDeactivated') || 'Product deactivated in branch successfully');
      setForceDeactivateBranchId(null);
      setForceDeactivateReason('');
      setForceDeactivateStockCount(null);
    },
    onError: (err: any, variables) => {
      const msg = err?.response?.data?.message || err?.message || '';
      // Check if blocked by remaining stock
      if (err?.response?.status === 400 && msg.includes('unit(s) in stock')) {
        const match = msg.match(/there are still (\d+) active unit\(s\) in stock/);
        const count = match ? parseInt(match[1], 10) : 1;
        setForceDeactivateStockCount(count);
        // Find branch name
        const b = allBranches.find((x) => x.id === variables.branchId);
        setForceDeactivateBranchName(b?.name || 'Branch');
        setForceDeactivateBranchId(variables.branchId);
      } else {
        toast.error(msg || 'Failed to deactivate branch');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-destructive">
          <AlertTriangle className="w-6 h-6" />
          <p className="text-lg font-medium">{t('products.notFound') || 'Product not found or not active in current branch'}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/products')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  // Price Range calculation
  const variants = product.variants || [];
  const prices = variants.map((v: any) => Number(v.retailPrice || 0)).filter((p: number) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const priceRange =
    prices.length === 0
      ? '—'
      : minPrice === maxPrice
      ? formatBDT(minPrice)
      : `${formatBDT(minPrice)} - ${formatBDT(maxPrice)}`;

  // Matrix calculations for Admin Stock Tab
  const productVariantIds = new Set(variants.map((v: any) => v.id));
  const matrixVariants = (stockSummary?.variants || []).filter((v: any) =>
    productVariantIds.has(v.variantId),
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/products')}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{product.name}</h1>
              <Badge variant={product.isActive ? 'default' : 'secondary'}>
                {product.isActive ? t('common.active') : t('common.inactive')}
              </Badge>
              {product.trackIndividually && (
                <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
                  {t('products.trackIndividually') || 'Tracked Individually'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{product.code}</span>
              <span>•</span>
              <span>{product.category?.name || 'Uncategorized'}</span>
              <span>•</span>
              <span>{product.brand?.name || 'Unbranded'}</span>
              <span>•</span>
              <span>{product.gender || 'UNISEX'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/catalog/barcodes?productId=${product.id}`)}
          >
            <Printer className="w-4 h-4 mr-2" />
            {t('barcodes.printLabels') || 'Print Labels'}
          </Button>

          <PermissionGate permission="products:update">
            <Button
              size="sm"
              onClick={() => router.push(`/products/${product.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Info className="w-4 h-4" />
          {t('products.overview') || 'Overview'}
        </button>

        <button
          onClick={() => setActiveTab('variants')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'variants'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          {t('products.variants') || 'Variants'} ({variants.length})
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'stock'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Boxes className="w-4 h-4" />
          {t('products.stock') || 'Stock Inventory'}
        </button>

        {isOwnerOrAdmin && (
          <button
            onClick={() => setActiveTab('branches')}
            className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'branches'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Store className="w-4 h-4" />
            {t('products.branches') || 'Branches'} ({(product.branches || []).filter((b: any) => b.isActive).length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('barcodes')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'barcodes'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Barcode className="w-4 h-4" />
          {t('barcodes.title') || 'Barcodes'}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-4 h-4" />
          {t('products.history') || 'Movement History'}
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-card border rounded-lg p-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                {t('products.basicInfo') || 'Product Information'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">{t('products.category')}</span>
                  <span className="font-medium">{product.category?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">{t('products.brand')}</span>
                  <span className="font-medium">{product.brand?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">{t('products.season')}</span>
                  <span className="font-medium">{product.season?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">{t('products.unit')}</span>
                  <span className="font-medium">{product.unit?.name || 'Pcs'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">{t('products.gender')}</span>
                  <span className="font-medium">{product.gender || 'UNISEX'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">{t('products.fabric')}</span>
                  <span className="font-medium">{product.fabric || '—'}</span>
                </div>
              </div>

              {product.description && (
                <div className="pt-3 border-t">
                  <span className="text-xs text-muted-foreground block mb-1">{t('products.description')}</span>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{product.description}</p>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-card border rounded-lg p-4">
                <span className="text-xs text-muted-foreground">{t('products.currentBranchStock')}</span>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {product.currentBranchStock ?? 0}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{product.unit?.name || 'pcs'}</span>
                </p>
                <span className="text-xs text-muted-foreground block mt-1">
                  {currentBranch?.name || 'Current Branch'}
                </span>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <span className="text-xs text-muted-foreground">{t('products.retailPrice')}</span>
                <p className="text-2xl font-bold text-foreground mt-1">{priceRange}</p>
                <span className="text-xs text-muted-foreground block mt-1">{t('products.priceRange')}</span>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <span className="text-xs text-muted-foreground">{t('products.variantsCount')}</span>
                <p className="text-2xl font-bold text-foreground mt-1">{variants.length}</p>
                <span className="text-xs text-muted-foreground block mt-1">
                  {product.hasVariants ? t('products.hasVariants') : t('products.singleVariant')}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground">{t('products.systemDetails') || 'System Details'}</h2>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Product ID</span>
                  <span className="font-mono text-muted-foreground select-all">{product.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Inventory Mode</span>
                  <Badge variant="outline" className="mt-1">
                    {product.trackIndividually ? 'Individual Piece Barcodes' : 'Batch / SKU Managed'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block">Created At</span>
                  <span className="font-medium">
                    {product.createdAt ? new Date(product.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Last Updated</span>
                  <span className="font-medium">
                    {product.updatedAt ? new Date(product.updatedAt).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VARIANTS */}
      {activeTab === 'variants' && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">{t('products.variants')}</h2>
              <p className="text-xs text-muted-foreground">
                All SKU configurations, pricing, and branch stock balances
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4">{t('products.size')}</th>
                  <th className="py-3 px-4">{t('products.color')}</th>
                  <th className="py-3 px-4 text-right">{t('products.retailPrice')}</th>
                  <th className="py-3 px-4 text-right">{t('products.wholesalePrice')}</th>
                  {canViewCost && <th className="py-3 px-4 text-right">{t('products.costPrice')}</th>}
                  <th className="py-3 px-4 text-center">{t('products.reorderLevel')}</th>
                  <th className="py-3 px-4 text-right">{t('products.stock')}</th>
                  <th className="py-3 px-4 text-center">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variants.map((v: any) => (
                  <tr key={v.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-xs">{v.sku}</div>
                      {v.barcode && (
                        <div className="font-mono text-[11px] text-muted-foreground">{v.barcode}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {v.size?.name ? (
                        <Badge variant="outline" className="font-medium">
                          {v.size.name}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {v.color?.name ? (
                        <div className="flex items-center gap-1.5">
                          {v.color.hexCode && (
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20"
                              style={{ backgroundColor: v.color.hexCode }}
                            />
                          )}
                          <span>{v.color.name}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {formatBDT(v.retailPrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {formatBDT(v.wholesalePrice)}
                    </td>
                    {canViewCost && (
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {formatBDT(v.costPrice)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center font-mono text-xs">
                      {v.reorderLevel ?? 5}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-semibold ${
                          (v.currentBranchStock ?? 0) <= (v.reorderLevel ?? 5)
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-foreground'
                        }`}
                      >
                        {v.currentBranchStock ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={v.isActive ? 'default' : 'secondary'} className="text-[10px]">
                        {v.isActive ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK & INVENTORY */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Current Branch Stock Table */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  {t('products.currentBranchStock')} — {currentBranch?.name || 'Current Branch'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Real-time stock on hand, allocations, and valuation for this branch
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-3 px-4">Variant (SKU)</th>
                    <th className="py-3 px-4">Size / Color</th>
                    <th className="py-3 px-4 text-right">Total Quantity</th>
                    <th className="py-3 px-4 text-right">Allocated</th>
                    <th className="py-3 px-4 text-right">Available</th>
                    {canViewCost && <th className="py-3 px-4 text-right">Avg Unit Cost</th>}
                    {canViewCost && <th className="py-3 px-4 text-right">Total Valuation</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {variants.map((v: any) => {
                    const qty = Number(v.currentBranchStock || 0);
                    const cost = Number(v.costPrice || 0);
                    const val = calculateStockValue(qty, cost);
                    return (
                      <tr key={v.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-mono font-medium text-xs">
                          {v.sku}
                        </td>
                        <td className="py-3 px-4">
                          {[v.size?.name, v.color?.name].filter(Boolean).join(' / ') || 'Standard'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground">
                          {qty}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          0
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {qty}
                        </td>
                        {canViewCost && (
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                            {formatBDT(cost)}
                          </td>
                        )}
                        {canViewCost && (
                          <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                            {formatBDT(val)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Multi-Branch Matrix */}
          {isOwnerOrAdmin && (
            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  All-Branches Stock Matrix (Admin View)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Stock distribution across all registered branches
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4">Variant (SKU)</th>
                      <th className="py-3 px-4">Size / Color</th>
                      {allBranches.map((b) => (
                        <th key={b.id} className="py-3 px-4 text-right">
                          {b.name}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-right font-bold">Total Network</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {variants.map((v: any) => {
                      const summaryVariant = matrixVariants.find((mv: any) => mv.variantId === v.id);
                      let rowTotal = 0;
                      return (
                        <tr key={v.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono font-medium text-xs">{v.sku}</td>
                          <td className="py-3 px-4">
                            {[v.size?.name, v.color?.name].filter(Boolean).join(' / ') || 'Standard'}
                          </td>
                          {allBranches.map((branch) => {
                            const bStock = summaryVariant?.branches?.find(
                              (sb: any) => sb.branchId === branch.id,
                            );
                            const q = bStock ? Number(bStock.quantity) : 0;
                            rowTotal += q;
                            return (
                              <td key={branch.id} className="py-3 px-4 text-right font-mono">
                                <span className={q > 0 ? 'font-medium text-foreground' : 'text-muted-foreground/50'}>
                                  {q}
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                            {summaryVariant ? summaryVariant.totalQuantity : rowTotal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BRANCHES (ADMIN ONLY) */}
      {activeTab === 'branches' && isOwnerOrAdmin && (
        <div className="space-y-6">
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">{t('products.branchAvailability')}</h2>
                <p className="text-xs text-muted-foreground">
                  Control which branches have this product activated for catalog and POS sales
                </p>
              </div>

              {/* Add to Branch Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={branchToActivate}
                  onChange={(e) => setBranchToActivate(e.target.value)}
                  className="h-9 text-xs rounded-md border border-input bg-background px-3"
                >
                  <option value="">{t('products.selectBranchToActivate') || 'Select branch to activate...'}</option>
                  {allBranches
                    .filter((b) => !(product.branches || []).some((pb: any) => pb.branchId === b.id && pb.isActive))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                </select>
                <Button
                  size="sm"
                  disabled={!branchToActivate || activateMutation.isPending}
                  onClick={() => activateMutation.mutate(branchToActivate)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('products.activate') || 'Activate'}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-3 px-4">Branch Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4 text-center">Catalog Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allBranches.map((branch) => {
                    const pb = (product.branches || []).find((b: any) => b.branchId === branch.id);
                    const isActive = Boolean(pb && pb.isActive);
                    return (
                      <tr key={branch.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium">{branch.name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{branch.code}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={isActive ? 'default' : 'outline'} className="text-xs">
                            {isActive ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-muted-foreground" /> Inactive
                              </span>
                            )}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isActive ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={deactivateMutation.isPending}
                              onClick={() => deactivateMutation.mutate({ branchId: branch.id, force: false })}
                            >
                              {t('products.deactivate') || 'Deactivate'}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={activateMutation.isPending}
                              onClick={() => activateMutation.mutate(branch.id)}
                            >
                              {t('products.activate') || 'Activate'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BARCODE LABELS PREVIEW */}
      {activeTab === 'barcodes' && (
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">{t('barcodes.labels')}</h2>
                <p className="text-xs text-muted-foreground">
                  Quick preview of barcodes for this product. Use Print Labels screen for full thermal format settings.
                </p>
              </div>
              <Button
                onClick={() => router.push(`/catalog/barcodes?productId=${product.id}`)}
              >
                <Printer className="w-4 h-4 mr-2" />
                {t('barcodes.openPrintScreen') || 'Open Print Screen'}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {variants.map((v: any) => (
                <div key={v.id} className="border rounded-md p-4 bg-background flex flex-col items-center text-center space-y-2">
                  <div className="text-xs font-semibold text-foreground truncate w-full">{product.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {[v.size?.name, v.color?.name].filter(Boolean).join(' • ') || 'Standard'}
                  </div>
                  <div className="py-2">
                    <BarcodeRenderer
                      value={v.barcode || v.sku}
                      width={1.6}
                      height={40}
                      displayValue={false}
                    />
                  </div>
                  <div className="font-mono text-xs font-bold text-foreground">
                    {v.barcode || v.sku}
                  </div>
                  <div className="text-xs font-bold text-primary">
                    {formatBDT(v.retailPrice)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: MOVEMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-card border rounded-lg overflow-hidden space-y-4">
          <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">{t('products.history')}</h2>
              <p className="text-xs text-muted-foreground">
                Stock ledger movements (sales, purchases, adjustments, transfers)
              </p>
            </div>

            {/* History Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedHistoryVariantId}
                onChange={(e) => {
                  setSelectedHistoryVariantId(e.target.value);
                  setHistoryPage(1);
                }}
                className="h-8 text-xs rounded-md border border-input bg-background px-2.5"
              >
                <option value="">All Variants</option>
                {variants.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.sku} ({[v.size?.name, v.color?.name].filter(Boolean).join('/')})
                  </option>
                ))}
              </select>

              <select
                value={movementTypeFilter}
                onChange={(e) => {
                  setMovementTypeFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="h-8 text-xs rounded-md border border-input bg-background px-2.5"
              >
                <option value="">All Movement Types</option>
                <option value="PURCHASE_RECEIVE">Purchase Receive</option>
                <option value="SALE">Sale</option>
                <option value="SALE_RETURN">Sale Return</option>
                <option value="TRANSFER_IN">Transfer In</option>
                <option value="TRANSFER_OUT">Transfer Out</option>
                <option value="ADJUSTMENT_INCREASE">Adjustment (+)</option>
                <option value="ADJUSTMENT_DECREASE">Adjustment (-)</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isHistoryLoading ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                Loading movement ledger...
              </div>
            ) : !historyData?.data || historyData.data.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                No stock movements found for this product in current branch.
              </div>
            ) : (
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    {canViewCost && <th className="py-3 px-4 text-right">Unit Cost</th>}
                    {canViewCost && <th className="py-3 px-4 text-right">New WAC</th>}
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyData.data.map((m: any) => {
                    const isPositive = Number(m.quantity) > 0;
                    return (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 text-xs font-mono">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[11px] font-mono">
                            {m.movementType}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isPositive ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>
                        {canViewCost && (
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground text-xs">
                            {formatBDT(m.unitCost || 0)}
                          </td>
                        )}
                        {canViewCost && (
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground text-xs">
                            {formatBDT(m.newWac || 0)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                          {m.referenceType ? `${m.referenceType} #${m.referenceId?.slice(0, 8) || ''}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {m.remarks || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Force Deactivate Confirm Dialog */}
      <ConfirmDialog
        open={!!forceDeactivateBranchId}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setForceDeactivateBranchId(null);
            setForceDeactivateReason('');
          }
        }}
        title={`Force Deactivate in ${forceDeactivateBranchName}?`}
        description={
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>
                This branch still has <strong>{forceDeactivateStockCount} active unit(s)</strong> in stock. Deactivating will prevent sales in this branch while stock remains in the ledger.
              </span>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">
                Reason for force deactivation (Required):
              </label>
              <Input
                value={forceDeactivateReason}
                onChange={(e) => setForceDeactivateReason(e.target.value)}
                placeholder="e.g. Seasonal store closure, inventory pending return..."
                className="text-xs"
              />
            </div>
          </div>
        }
        confirmText="Force Deactivate Anyway"
        cancelText={t('common.cancel')}
        variant="destructive"
        disabled={!forceDeactivateReason.trim() || deactivateMutation.isPending}
        onConfirm={() => {
          if (forceDeactivateBranchId) {
            deactivateMutation.mutate({ branchId: forceDeactivateBranchId, force: true });
          }
        }}
      />
    </div>
  );
}
