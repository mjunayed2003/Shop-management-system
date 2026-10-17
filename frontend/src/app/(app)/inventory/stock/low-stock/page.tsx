'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ShoppingCart,
  FileSpreadsheet,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { PermissionGate, usePermission } from '@/components/shared/PermissionGate';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT } from '@/lib/utils/formatters';
import { downloadCsv } from '@/lib/utils/csv';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function LowStockReportPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const canViewCost = Boolean(
    user?.isOwner ||
      permissions?.includes('products:update') ||
      permissions?.includes('*'),
  );

  const [search, setSearch] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['low-stock-report', currentBranchId],
    queryFn: () => api.inventory.stock.lowStockReport(),
  });

  const rawItems = data?.items || [];

  const filteredItems = rawItems.filter((item: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.productName?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.barcode?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (variantId: string) => {
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedVariantIds.size === filteredItems.length) {
      setSelectedVariantIds(new Set());
    } else {
      setSelectedVariantIds(new Set(filteredItems.map((i: any) => i.variantId)));
    }
  };

  const handleCreatePurchaseOrder = () => {
    const selected = filteredItems.filter((i: any) => selectedVariantIds.has(i.variantId));
    if (selected.length === 0) {
      showToast(t('inventory.selectAtLeastOneItem') || 'Select at least one item', 'error');
      return;
    }

    const prefillData = selected.map((item: any) => ({
      variantId: item.variantId,
      sku: item.sku,
      productName: item.productName,
      sizeName: item.size || undefined,
      colorName: item.color || undefined,
      barcode: item.barcode || undefined,
      quantity: Math.max(1, Math.ceil(item.shortage || 1)),
      unitCost: item.unitCost || 0,
    }));

    try {
      sessionStorage.setItem('po_prefill_items', JSON.stringify(prefillData));
      router.push('/purchases/orders/new?source=low_stock');
    } catch {
      showToast('Could not store prefilled items', 'error');
    }
  };

  const handleExportCsv = () => {
    const rows = filteredItems.map((i: any) => ({
      Product: i.productName,
      SKU: i.sku,
      Barcode: i.barcode || '',
      Category: i.category || '',
      Brand: i.brand || '',
      Size: i.size || '',
      Color: i.color || '',
      'Current Stock': i.currentStock,
      Allocated: i.allocated,
      Available: i.available,
      'Reorder Level': i.reorderLevel,
      'Suggested Order Qty': i.shortage,
      ...(canViewCost ? { 'Unit Cost': i.unitCost } : {}),
    }));

    downloadCsv(rows, `low-stock-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const columns = [
    {
      header: (
        <button
          type="button"
          onClick={toggleSelectAll}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Select all"
        >
          {selectedVariantIds.size > 0 && selectedVariantIds.size === filteredItems.length ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      ),
      cell: (row: any) => (
        <button
          type="button"
          onClick={() => toggleSelect(row.variantId)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Select ${row.sku}`}
        >
          {selectedVariantIds.has(row.variantId) ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      ),
      className: 'w-10',
    },
    {
      header: t('common.product') || 'Product',
      cell: (row: any) => (
        <div>
          <div className="font-medium text-foreground">{row.productName}</div>
          <div className="text-xs text-muted-foreground flex gap-2">
            <span>SKU: {row.sku}</span>
            {row.barcode && <span>• Barcode: {row.barcode}</span>}
          </div>
          {(row.size || row.color) && (
            <div className="text-xs text-muted-foreground flex gap-1 mt-0.5">
              {row.size && <Badge variant="outline" className="text-[10px] py-0 px-1">{row.size}</Badge>}
              {row.color && <Badge variant="outline" className="text-[10px] py-0 px-1">{row.color}</Badge>}
            </div>
          )}
        </div>
      ),
    },
    {
      header: t('common.category') || 'Category',
      accessorKey: 'category',
    },
    {
      header: t('inventory.availableStock') || 'Available',
      cell: (row: any) => (
        <div className="font-mono text-sm">
          <span className={row.available <= 0 ? 'text-destructive font-semibold' : 'text-amber-500 font-semibold'}>
            {row.available}
          </span>
          <span className="text-xs text-muted-foreground ml-1">/ {row.currentStock}</span>
        </div>
      ),
    },
    {
      header: t('inventory.reorderLevel') || 'Reorder Level',
      cell: (row: any) => (
        <span className="font-mono text-sm">{row.reorderLevel}</span>
      ),
    },
    {
      header: t('inventory.suggestedReorder') || 'Suggested Order',
      cell: (row: any) => (
        <Badge variant="destructive" className="font-mono text-xs">
          +{row.shortage}
        </Badge>
      ),
    },
    ...(canViewCost
      ? [
          {
            header: t('inventory.unitCost') || 'Avg Cost',
            cell: (row: any) => (
              <span className="font-mono text-xs text-muted-foreground">
                {formatBDT(row.unitCost || 0)}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/inventory/stock">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              {t('inventory.lowStockReport') || 'Low Stock & Reorder Suggestions'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('inventory.lowStockReportSubtitle') ||
                'Variants at or below reorder level in this branch. Select items to generate a purchase order.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {t('common.refresh') || 'Refresh'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredItems.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('common.exportCsv') || 'Export CSV'}
          </Button>

          <PermissionGate permissions={['purchases:create', 'purchase.*']}>
            <Button
              size="sm"
              onClick={handleCreatePurchaseOrder}
              disabled={selectedVariantIds.size === 0}
              className="gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {t('inventory.createPoFromSelected') || 'Create PO from Selected'}
              {selectedVariantIds.size > 0 && ` (${selectedVariantIds.size})`}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('inventory.lowStockVariants') || 'Low Stock Variants'}</div>
            <div className="text-2xl font-bold font-mono">{rawItems.length}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('inventory.totalUnitsNeeded') || 'Total Shortage Units'}</div>
            <div className="text-2xl font-bold font-mono">
              {rawItems.reduce((acc: number, i: any) => acc + (i.shortage || 0), 0)}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('inventory.selectedForOrder') || 'Selected for Order'}</div>
            <div className="text-2xl font-bold font-mono text-primary">
              {selectedVariantIds.size}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.searchPlaceholder') || 'Search product, SKU, barcode, brand...'}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredItems}
          isLoading={isLoading}
          emptyMessage={t('inventory.noLowStockFound') || 'All products in this branch are above their reorder levels! 🎉'}
        />
      </div>
    </div>
  );
}
