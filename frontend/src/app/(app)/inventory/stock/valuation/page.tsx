'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  ArrowLeft,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  Tag,
  ShieldAlert,
  Coins,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT } from '@/lib/utils/formatters';
import { downloadCsv } from '@/lib/utils/csv';
import { useTranslation } from '@/lib/i18n';

export default function StockValuationReportPage() {
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const branches = useBranchStore((s) => s.branches);
  const currentBranch = branches.find((b) => b.id === currentBranchId);

  const canViewCost = Boolean(
    user?.isOwner ||
      permissions?.includes('products:update') ||
      permissions?.includes('*'),
  );

  const [activeTab, setActiveTab] = useState<'CATEGORY' | 'BRAND'>('CATEGORY');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['stock-valuation', currentBranchId],
    queryFn: () => api.inventory.stock.valuation(),
    enabled: canViewCost,
  });

  if (!canViewCost) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">{t('common.accessDenied') || 'Access Denied'}</h2>
        <p className="text-sm text-muted-foreground">
          {t('inventory.costPermissionRequired') ||
            'You do not have permission to view inventory cost valuation reports.'}
        </p>
        <Button asChild variant="outline">
          <Link href="/inventory/stock">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('inventory.backToStock') || 'Back to Stock Overview'}
          </Link>
        </Button>
      </div>
    );
  }

  const categoryRows = data?.byCategory || [];
  const brandRows = data?.byBrand || [];

  const handleExportCsv = () => {
    if (activeTab === 'CATEGORY') {
      const rows = categoryRows.map((r: any) => ({
        Category: r.category,
        Quantity: r.quantity,
        'Valuation (BDT)': r.costValue,
      }));
      downloadCsv(rows, `stock-valuation-by-category-${new Date().toISOString().slice(0, 10)}.csv`);
    } else {
      const rows = brandRows.map((r: any) => ({
        Brand: r.brand,
        Quantity: r.quantity,
        'Valuation (BDT)': r.costValue,
      }));
      downloadCsv(rows, `stock-valuation-by-brand-${new Date().toISOString().slice(0, 10)}.csv`);
    }
  };

  const categoryColumns = [
    {
      header: t('common.category') || 'Category',
      accessorKey: 'category',
      className: 'font-medium',
    },
    {
      header: t('inventory.quantity') || 'Total Quantity',
      accessorKey: 'quantity',
      className: 'font-mono text-right',
    },
    {
      header: t('inventory.valuation') || 'Total Cost Value',
      cell: (row: any) => (
        <span className="font-mono font-semibold text-primary">
          {formatBDT(row.costValue || 0)}
        </span>
      ),
      className: 'text-right',
    },
  ];

  const brandColumns = [
    {
      header: t('common.brand') || 'Brand',
      accessorKey: 'brand',
      className: 'font-medium',
    },
    {
      header: t('inventory.quantity') || 'Total Quantity',
      accessorKey: 'quantity',
      className: 'font-mono text-right',
    },
    {
      header: t('inventory.valuation') || 'Total Cost Value',
      cell: (row: any) => (
        <span className="font-mono font-semibold text-primary">
          {formatBDT(row.costValue || 0)}
        </span>
      ),
      className: 'text-right',
    },
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
              <BarChart3 className="w-6 h-6 text-primary" />
              {t('inventory.stockValuation') || 'Stock Valuation Report'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentBranch?.name ? `${currentBranch.name} • ` : ''}
              {t('inventory.valuationSubtitle') ||
                'Calculated from weighted average cost (WAC) and current on-hand quantities.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('common.exportCsv') || 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground font-medium">
              {t('inventory.totalValuation') || 'Total Valuation'}
            </div>
            <div className="text-2xl font-bold font-mono text-primary">
              {formatBDT(data?.totalCostValue || 0)}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground font-medium">
              {t('inventory.totalUnitsOnHand') || 'Total Units On-Hand'}
            </div>
            <div className="text-2xl font-bold font-mono">
              {(data?.totalQuantity ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground font-medium">
              {t('inventory.activeVariants') || 'Variants in Stock'}
            </div>
            <div className="text-2xl font-bold font-mono">
              {data?.totalItems ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('CATEGORY')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'CATEGORY'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Layers className="w-4 h-4" />
          {t('inventory.byCategory') || 'By Category'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BRAND')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'BRAND'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Tag className="w-4 h-4" />
          {t('inventory.byBrand') || 'By Brand'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {activeTab === 'CATEGORY' ? (
          <DataTable
            columns={categoryColumns}
            data={categoryRows}
            isLoading={isLoading}
            emptyMessage={t('inventory.noCategoryValuation') || 'No category valuation data available.'}
          />
        ) : (
          <DataTable
            columns={brandColumns}
            data={brandRows}
            isLoading={isLoading}
            emptyMessage={t('inventory.noBrandValuation') || 'No brand valuation data available.'}
          />
        )}
      </div>
    </div>
  );
}
