'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { DataTable, Column } from '@/components/shared/DataTable';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, Eye, Plus } from 'lucide-react';

export default function ExchangesListPage() {
  const { t } = useTranslation();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const user = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['sales-exchanges-list', currentBranchId, page, limit],
    queryFn: () => api.sales.exchanges.list({ page, limit }),
  });

  const exchanges = data?.items || [];
  const total = data?.total || 0;

  const columns: Column<any>[] = [
    {
      key: 'exchange_no',
      header: t('exchange.exchangeNo'),
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-foreground">{item.exchange_no}</span>
          <div className="text-[10px] text-muted-foreground">
            {new Date(item.created_at).toLocaleString([], {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ),
    },
    {
      key: 'original_sale',
      header: 'Orig. Invoice',
      render: (item) =>
        item.original_sale ? (
          <Link href={`/sales/${item.original_sale.id}`} className="font-mono text-primary hover:underline font-semibold">
            {item.original_sale.invoice_no}
          </Link>
        ) : (
          <span className="text-muted-foreground font-mono">-</span>
        ),
    },
    {
      key: 'new_sale',
      header: 'New Invoice',
      render: (item) =>
        item.new_sale ? (
          <Link href={`/sales/${item.new_sale.id}`} className="font-mono text-emerald-600 hover:underline font-semibold">
            {item.new_sale.invoice_no}
          </Link>
        ) : (
          <span className="text-muted-foreground font-mono">-</span>
        ),
    },
    {
      key: 'returned_total',
      header: 'Return Credit',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-medium text-foreground">
          BDT {Number(item.returned_total).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'new_items_total',
      header: 'New Items',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-medium text-foreground">
          BDT {Number(item.new_items_total).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'adjustment_status',
      header: 'Balance Status',
      render: (item) => {
        const isCustomerPaid = item.adjustment_status === 'CUSTOMER_PAID';
        const isShopRefunded = item.adjustment_status === 'SHOP_REFUNDED';
        return (
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${
              isCustomerPaid
                ? 'border-rose-300 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                : isShopRefunded
                ? 'border-emerald-300 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                : 'border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            {item.adjustment_status}
          </Badge>
        );
      },
    },
    {
      key: 'difference_amount',
      header: 'Difference',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-foreground">
          BDT {Number(item.difference_amount).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ArrowLeftRight className="w-6 h-6 text-indigo-600" />
              <span>{t('exchange.exchangeList')}</span>
            </h1>
            {user?.isOwner && (
              <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Multi-Branch Admin View
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit history of simultaneous item returns, exchange credits, and replacement sales.
          </p>
        </div>

        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold text-xs">
          <Link href="/sales/exchange">
            <Plus className="w-4 h-4" />
            <span>Process New Exchange</span>
          </Link>
        </Button>
      </div>

      <DataTable
        data={exchanges}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={
          <div className="p-8 text-center space-y-2">
            <ArrowLeftRight className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm font-medium text-foreground">{t('exchange.noExchangesFound')}</p>
            <p className="text-xs text-muted-foreground">
              Processed product exchanges will appear here linking returned items with replacement invoices.
            </p>
          </div>
        }
        pagination={{
          page,
          limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit) || 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
