'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Sliders,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatDate } from '@/lib/utils/formatters';
import { useTranslation } from '@/lib/i18n';

export default function StockAdjustmentsListPage() {
  const { t } = useTranslation();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['stock-adjustments-list', currentBranchId, status, search, page, limit],
    queryFn: () =>
      api.inventory.adjustments.list({
        page,
        limit,
        status: status || undefined,
        search: search || undefined,
      }),
  });

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'DRAFT':
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1 text-xs">
            <Clock className="w-3 h-3" />
            Draft
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="text-muted-foreground border-border bg-muted/40 gap-1 text-xs">
            <XCircle className="w-3 h-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{statusStr}</Badge>;
    }
  };

  const columns = [
    {
      header: t('inventory.adjustmentNo') || 'Adjustment No',
      cell: (row: any) => (
        <div className="space-y-1">
          <Link
            href={`/inventory/adjustments/${row.id}`}
            className="font-mono font-medium text-primary hover:underline"
          >
            {row.adjustment_no}
          </Link>
          <div className="text-xs text-muted-foreground">
            {formatDate(row.created_at)}
          </div>
        </div>
      ),
    },
    {
      header: t('common.reason') || 'Reason',
      cell: (row: any) => (
        <span className="text-xs font-medium text-foreground">
          {row.reason?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: t('inventory.itemsCount') || 'Items',
      cell: (row: any) => (
        <span className="font-mono text-xs">
          {row.items?.length || row._count?.items || 0} variants
        </span>
      ),
    },
    {
      header: t('common.status') || 'Status',
      cell: (row: any) => getStatusBadge(row.status),
    },
    {
      header: t('common.creator') || 'Created By',
      cell: (row: any) => (
        <span className="text-xs text-muted-foreground">
          {row.creator?.name || 'Staff'}
        </span>
      ),
    },
    {
      header: t('common.actions') || 'Actions',
      cell: (row: any) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/inventory/adjustments/${row.id}`} className="text-xs">
            {t('common.view') || 'View'}
          </Link>
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary" />
            {t('inventory.stockAdjustments') || 'Stock Adjustments'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('inventory.adjustmentsSubtitle') ||
              'Reconcile physical inventory discrepancies, corrections, and write-offs with audit tracking.'}
          </p>
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

          <PermissionGate permissions={['inventory:adjust', 'stock.*']}>
            <Button size="sm" asChild className="gap-2">
              <Link href="/inventory/adjustments/new">
                <Plus className="w-4 h-4" />
                {t('inventory.newAdjustment') || 'New Adjustment'}
              </Link>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border rounded-lg p-3">
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs bg-background border border-input rounded-md px-3 py-1.5"
          >
            <option value="">{t('common.allStatuses') || 'All Statuses'}</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('inventory.searchAdjustments') || 'Search adjustment #...'}
          className="w-64"
        />
      </div>

      {/* DataTable */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage={t('inventory.noAdjustmentsFound') || 'No stock adjustments found.'}
        />
      </div>
    </div>
  );
}
