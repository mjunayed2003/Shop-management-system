'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  Package,
  Store,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export default function NegativeStockPage() {
  const { currentBranchId, currentBranch } = useBranchStore();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['inventory', 'negative-stock', currentBranchId],
    queryFn: () => api.sync.negativeStock(),
  });

  return (
    <PermissionGate
      permission={['inventory:read', 'inventory:adjust', '*']}
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          You lack permission to inspect negative inventory balances.
        </div>
      }
    >
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <AlertOctagon className="w-6 h-6 text-rose-600" />
              <span>Negative Stock to Resolve</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Inventory variants that dropped below zero balance due to offline sales. Create adjustments or stock counts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs h-9 rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Link href="/inventory/adjustments">
              <Button
                type="button"
                size="sm"
                className="text-xs h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                <span>Open Stock Adjustments</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Table of Negative Stock */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading negative inventory balances...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clean Inventory Ledger</h3>
              <p className="text-xs text-slate-400">
                No variants currently have negative stock balances.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Negative Balance</th>
                    <th className="py-3 px-4">Retail Price</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {items.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {b.variant?.product?.name || 'Unknown Product'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {b.variant?.sku}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {b.branch?.name || currentBranch?.name}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">
                          {b.quantity} pcs
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {b.variant?.retail_price} BDT
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/inventory/adjustments?sku=${encodeURIComponent(b.variant?.sku || '')}`}
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Adjust Balance</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
