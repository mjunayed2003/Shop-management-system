'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  ShieldAlert,
  ArrowLeft,
  Building,
  Layers,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { downloadCsv } from '@/lib/utils/csv';
import { useTranslation } from '@/lib/i18n';

export default function StockConsistencyCheckPage() {
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const branches = useBranchStore((s) => s.branches);
  const isAllBranchAdmin = Boolean(user?.isOwner || branches.length > 1);

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['stock-consistency-check'],
    queryFn: () => api.inventory.stock.checkConsistency(),
    enabled: isAllBranchAdmin,
  });

  if (!isAllBranchAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">Admin Permission Required</h2>
        <p className="text-sm text-muted-foreground">
          The Stock Consistency Verification Tool is strictly restricted to multi-branch administrators and business owners.
        </p>
        <Button asChild variant="outline">
          <Link href="/inventory/stock">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stock Overview
          </Link>
        </Button>
      </div>
    );
  }

  const mismatches = data?.mismatches || [];
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  const handleExportCsv = () => {
    const rows = mismatches.map((m: any) => ({
      Branch: branchMap.get(m.branchId) || m.branchId,
      Product: m.productName,
      SKU: m.sku,
      'Balance Quantity': m.balanceQuantity,
      'Movement Ledger Sum': m.movementSum,
      'ProductUnit Count': m.unitCount ?? 'N/A',
      'Quantity Mismatch': m.quantityMismatch ? 'YES' : 'NO',
      'Unit Count Mismatch': m.unitMismatch ? 'YES' : 'NO',
    }));

    downloadCsv(rows, `stock-consistency-audit-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const columns = [
    {
      header: t('common.branch') || 'Branch',
      cell: (row: any) => (
        <span className="text-xs font-medium text-foreground">
          {branchMap.get(row.branchId) || 'Branch'}
        </span>
      ),
    },
    {
      header: t('common.product') || 'Product / Variant',
      cell: (row: any) => (
        <div>
          <div className="font-medium text-foreground text-xs">{row.productName}</div>
          <div className="text-[11px] text-muted-foreground font-mono">SKU: {row.sku}</div>
        </div>
      ),
    },
    {
      header: 'StockBalance Qty',
      cell: (row: any) => (
        <span className="font-mono text-xs font-semibold">{row.balanceQuantity}</span>
      ),
      className: 'text-right',
    },
    {
      header: 'Movements Sum',
      cell: (row: any) => (
        <span className="font-mono text-xs text-muted-foreground">{row.movementSum}</span>
      ),
      className: 'text-right',
    },
    {
      header: 'ProductUnit Count',
      cell: (row: any) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.unitCount !== undefined ? row.unitCount : 'N/A'}
        </span>
      ),
      className: 'text-right',
    },
    {
      header: 'Mismatch Flags',
      cell: (row: any) => (
        <div className="flex flex-wrap gap-1">
          {row.quantityMismatch && (
            <Badge variant="destructive" className="text-[10px] py-0 px-1">
              Balance ≠ Ledger
            </Badge>
          )}
          {row.unitMismatch && (
            <Badge variant="destructive" className="text-[10px] py-0 px-1">
              Units ≠ Balance
            </Badge>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Stock Ledger Consistency Check
          </h1>
          <p className="text-sm text-muted-foreground">
            Administrative read-only audit tool. Compares recorded StockBalances against the immutable StockMovement ledger and tracked ProductUnit barcodes.
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
            Run Audit Now
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={mismatches.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Balance Records Audited</div>
            <div className="text-2xl font-bold font-mono">
              {data?.totalBalancesChecked ?? 0}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              (data?.mismatchCount ?? 0) === 0
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {(data?.mismatchCount ?? 0) === 0 ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Detected Inconsistencies</div>
            <div
              className={`text-2xl font-bold font-mono ${
                (data?.mismatchCount ?? 0) === 0 ? 'text-emerald-500' : 'text-destructive'
              }`}
            >
              {data?.mismatchCount ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Status Banner */}
      {!isLoading && (data?.mismatchCount ?? 0) === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-foreground">
            All Stock Balances are 100% Consistent
          </h3>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto">
            Every variant balance matches its immutable movement audit trail and tracked physical unit counts with zero mathematical drift.
          </p>
        </div>
      )}

      {/* Inconsistency Warning Banner & Table */}
      {(data?.mismatchCount ?? 0) > 0 && (
        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-xs text-destructive flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Discrepancies Found: </span>
              {data?.mismatchCount} variant(s) have discrepancies between their StockBalance row and the movement ledger or tracked unit barcodes. This tool is read-only and does not automatically alter database state. Please investigate the audit history of these variants.
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <DataTable
              columns={columns}
              data={mismatches}
              isLoading={isLoading}
              emptyMessage="No discrepancies detected."
            />
          </div>
        </div>
      )}
    </div>
  );
}
