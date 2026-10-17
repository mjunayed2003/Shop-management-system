'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  RotateCcw,
  Plus,
  ExternalLink,
  Printer,
  Calendar,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import { downloadCsv } from '@/lib/utils/csv';
import { useTranslation } from '@/lib/i18n';

export default function PurchaseReturnsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const queryKey = ['purchase-returns', currentBranchId, page, limit, statusFilter];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api.purchases.returns.list({
        page,
        limit,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const handleExportCsv = () => {
    if (!data?.data || data.data.length === 0) return;

    const headers = [
      'Return #',
      'Date',
      'Supplier',
      'Purchase #',
      'Total Amount',
      'Status',
      'Reason',
    ];

    const rows = data.data.map((r: any) => [
      r.return_no,
      formatDate(r.return_date, 'en'),
      r.supplier?.name || '',
      r.purchase?.purchase_no || '',
      r.total_amount,
      r.status,
      r.reason || '',
    ]);

    downloadCsv('purchase_returns_export.csv', headers, rows);
  };

  const columns = [
    {
      key: 'return_no',
      header: 'Return #',
      render: (r: any) => (
        <Link
          href={`/purchases/returns/${r.id}`}
          className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5"
        >
          <span>{r.return_no}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </Link>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (r: any) => (
        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
          {r.supplier?.name}
        </span>
      ),
    },
    {
      key: 'purchase',
      header: 'Linked Purchase',
      render: (r: any) =>
        r.purchase?.purchase_no ? (
          <Link
            href={`/purchases/${r.purchase.id}`}
            className="font-mono text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {r.purchase.purchase_no}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">Standalone Return</span>
        ),
    },
    {
      key: 'date',
      header: 'Return Date',
      render: (r: any) => (
        <span className="text-xs">{formatDate(r.return_date, 'en')}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r: any) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {r.reason || '-'}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Value',
      render: (r: any) => (
        <div className="text-right font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
          {formatBDT(r.total_amount)}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: any) => <StatusBadge status={r.status} />,
    },
    {
      key: 'print',
      header: '',
      render: (r: any) => (
        <div className="flex justify-end">
          <Link
            href={`/purchases/returns/${r.id}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Print Return Note"
          >
            <Printer className="w-4 h-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('purchasing.returns')}
            </h1>
            <p className="text-xs text-slate-500">
              Returned damaged fabric, defective garments, or overstock debit memos to vendors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs h-9"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </Button>

          <PermissionGate permission="purchases:return">
            <Button
              onClick={() => router.push('/purchases/returns/new')}
              className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              <span>Create Return Note</span>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 w-fit text-xs font-semibold">
        {['ALL', 'DRAFT', 'COMPLETED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === st
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {st === 'ALL' ? 'All Returns' : st.charAt(0) + st.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
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
        emptyMessage="No purchase return memos found."
      />
    </div>
  );
}
