'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/DataTable';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDateTime } from '@/lib/utils/formatters';

interface MovementHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  variantId: string | null;
  sku?: string;
  productName?: string;
}

export function MovementHistoryDrawer({
  isOpen,
  onClose,
  variantId,
  sku,
  productName,
}: MovementHistoryDrawerProps) {
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [movementType, setMovementType] = useState<string>('');

  const queryKey = [
    'variant-movements-drawer',
    variantId,
    currentBranchId,
    page,
    limit,
    movementType,
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api.inventory.stock.movements({
        variantId: variantId || undefined,
        movementType: movementType || undefined,
        page,
        limit,
      }),
    enabled: isOpen && Boolean(variantId),
  });

  if (!isOpen) return null;

  const getSourceRoute = (refType: string, refId: string) => {
    if (!refId) return null;
    if (refType === 'PURCHASE') return `/purchases/${refId}`;
    if (refType === 'TRANSFER') return `/inventory/transfers/${refId}`;
    if (refType === 'ADJUSTMENT') return `/inventory/adjustments/${refId}`;
    if (refType === 'PURCHASE_RETURN') return `/purchases/returns/${refId}`;
    return null;
  };

  const columns = [
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (m: any) => (
        <span className="text-[11px] font-mono text-slate-500">
          {formatDateTime(m.createdAt, 'en')}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (m: any) => {
        const isPositive = [
          'PURCHASE',
          'TRANSFER_IN',
          'OPENING',
          'ADJUSTMENT_ADD',
        ].includes(m.movementType);

        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`p-1 rounded-md ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
              }`}
            >
              {isPositive ? (
                <ArrowDownLeft className="w-3 h-3" />
              ) : (
                <ArrowUpRight className="w-3 h-3" />
              )}
            </span>
            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
              {m.movementType}
            </span>
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (m: any) => {
        const isPositive = [
          'PURCHASE',
          'TRANSFER_IN',
          'OPENING',
          'ADJUSTMENT_ADD',
        ].includes(m.movementType);

        return (
          <span
            className={`font-mono font-bold text-xs ${
              isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isPositive ? '+' : '-'}
            {Math.abs(Number(m.quantity))}
          </span>
        );
      },
    },
    {
      key: 'wac',
      header: 'WAC / Cost',
      render: (m: any) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {formatBDT(m.newWac || m.unitCost)}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (m: any) => {
        const route = getSourceRoute(m.referenceType, m.referenceId);
        if (route) {
          return (
            <Link
              href={route}
              className="font-mono text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
            >
              <span>{m.referenceType}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          );
        }
        return (
          <span className="text-xs text-slate-500 font-mono">
            {m.referenceType || '-'}
          </span>
        );
      },
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (m: any) => (
        <span className="text-[11px] text-slate-500">{m.remarks || '-'}</span>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Stock Movement Ledger
              </h3>
              <p className="text-xs text-slate-500">
                {productName ? `${productName} (${sku})` : sku || 'Variant History'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Filter Type:</span>
            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs"
            >
              <option value="">All Movements</option>
              <option value="PURCHASE">Purchase (Inward)</option>
              <option value="SALE">Sale (POS Outward)</option>
              <option value="TRANSFER_IN">Transfer In</option>
              <option value="TRANSFER_OUT">Transfer Out</option>
              <option value="ADJUSTMENT_ADD">Adjustment Add</option>
              <option value="ADJUSTMENT_SUB">Adjustment Deduct</option>
              <option value="DAMAGE">Damaged Write-off</option>
              <option value="RETURN">Purchase Return</option>
              <option value="OPENING">Opening Stock</option>
            </select>
          </div>

          <span className="text-slate-400 font-mono text-[11px]">
            {data?.meta?.total || 0} Total Movements
          </span>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <DataTable
            columns={columns}
            data={data?.data || []}
            isLoading={isLoading}
            total={data?.meta?.total || 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
            emptyMessage="No stock movements recorded for this variant."
          />
        </div>
      </div>
    </div>
  );
}
