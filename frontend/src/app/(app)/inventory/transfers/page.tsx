'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Search,
  Building,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatDate } from '@/lib/utils/formatters';
import { useTranslation } from '@/lib/i18n';

export default function StockTransfersListPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const branches = useBranchStore((s) => s.branches);
  const isAllBranchAdmin = Boolean(user?.isOwner || branches.length > 1);

  // Tabs: 'OUTGOING' | 'INCOMING' | 'ALL'
  const [tab, setTab] = useState<'OUTGOING' | 'INCOMING' | 'ALL'>('OUTGOING');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);

  // Poll every 60s when on Incoming tab to catch new transfer requests
  const refetchInterval = tab === 'INCOMING' ? 60000 : false;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['stock-transfers-list', currentBranchId, tab, status, search, page, limit],
    queryFn: () =>
      api.inventory.transfers.list({
        page,
        limit,
        status: status || undefined,
        search: search || undefined,
      }),
    refetchInterval,
  });

  const rawTransfers = data?.data || [];

  // Filter transfers based on tab
  const filteredTransfers = rawTransfers.filter((transfer: any) => {
    if (tab === 'OUTGOING') {
      return transfer.from_branch_id === currentBranchId;
    }
    if (tab === 'INCOMING') {
      return transfer.to_branch_id === currentBranchId;
    }
    return true; // ALL tab
  });

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1 text-xs">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'IN_TRANSIT':
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10 gap-1 text-xs">
            <Truck className="w-3 h-3" />
            In Transit
          </Badge>
        );
      case 'RECEIVED':
        return (
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3" />
            Received
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 gap-1 text-xs">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="text-muted-foreground border-border bg-muted/40 gap-1 text-xs">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{statusStr}</Badge>;
    }
  };

  const isAutoTransfer = (transfer: any) => {
    const notes = (transfer.notes || '').toLowerCase();
    return (
      notes.includes('auto-transfer') ||
      notes.includes('pos sale') ||
      notes.includes('invoice') ||
      Boolean(transfer.is_auto)
    );
  };

  const columns = [
    {
      header: t('inventory.transferNo') || 'Transfer No',
      cell: (row: any) => (
        <div className="space-y-1">
          <Link
            href={`/inventory/transfers/${row.id}`}
            className="font-mono font-medium text-primary hover:underline flex items-center gap-1.5"
          >
            {row.transfer_no}
            {isAutoTransfer(row) && (
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30 gap-0.5 py-0 px-1">
                <Zap className="w-2.5 h-2.5" />
                Auto
              </Badge>
            )}
          </Link>
          <div className="text-xs text-muted-foreground">
            {formatDate(row.created_at)}
          </div>
        </div>
      ),
    },
    {
      header: t('inventory.route') || 'Source → Destination',
      cell: (row: any) => {
        const isFromCurrent = row.from_branch_id === currentBranchId;
        const isToCurrent = row.to_branch_id === currentBranchId;

        return (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`font-medium ${isFromCurrent ? 'text-primary' : 'text-foreground'}`}>
                {row.fromBranch?.name || row.from_branch?.name || 'Source Branch'}
              </span>
              <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
              <span className={`font-medium ${isToCurrent ? 'text-primary' : 'text-foreground'}`}>
                {row.toBranch?.name || row.to_branch?.name || 'Dest Branch'}
              </span>
            </div>
            {isFromCurrent && (
              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/20 py-0">
                Outgoing
              </Badge>
            )}
            {isToCurrent && (
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 py-0">
                Incoming
              </Badge>
            )}
          </div>
        );
      },
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
      cell: (row: any) => (
        <div className="space-y-1">
          {getStatusBadge(row.status)}
          {/* Action indicator badge */}
          {row.status === 'PENDING' && row.from_branch_id === currentBranchId && (
            <div className="text-[10px] text-amber-600 font-medium">Awaiting Dispatch</div>
          )}
          {row.status === 'IN_TRANSIT' && row.to_branch_id === currentBranchId && (
            <div className="text-[10px] text-blue-600 font-medium animate-pulse">Awaiting Your Receipt</div>
          )}
        </div>
      ),
    },
    {
      header: t('common.notes') || 'Notes',
      cell: (row: any) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
          {row.notes || '-'}
        </span>
      ),
    },
    {
      header: t('common.actions') || 'Actions',
      cell: (row: any) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/inventory/transfers/${row.id}`} className="text-xs">
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
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            {t('inventory.stockTransfers') || 'Stock Transfers'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('inventory.transfersSubtitle') ||
              'Inter-branch inventory movement, dispatches, receiving, and discrepancy verification.'}
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

          <PermissionGate permissions={['inventory:transfer', 'stock.*']}>
            <Button size="sm" asChild className="gap-2">
              <Link href="/inventory/transfers/new">
                <Plus className="w-4 h-4" />
                {t('inventory.newTransfer') || 'New Stock Transfer'}
              </Link>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('OUTGOING')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'OUTGOING'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            {t('inventory.outgoing') || 'Outgoing'}
          </button>

          <button
            type="button"
            onClick={() => setTab('INCOMING')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'INCOMING'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            {t('inventory.incoming') || 'Incoming'}
            {tab === 'INCOMING' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" title="Polling every 60s" />
            )}
          </button>

          {isAllBranchAdmin && (
            <button
              type="button"
              onClick={() => setTab('ALL')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Building className="w-4 h-4" />
              {t('inventory.allBranches') || 'All Branches (Admin)'}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5"
          >
            <option value="">{t('common.allStatuses') || 'All Statuses'}</option>
            <option value="PENDING">Pending</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="RECEIVED">Received</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('inventory.searchTransfers') || 'Search transfer # or notes...'}
            className="w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredTransfers}
          isLoading={isLoading}
          emptyMessage={t('inventory.noTransfersFound') || 'No stock transfers found.'}
        />
      </div>
    </div>
  );
}
