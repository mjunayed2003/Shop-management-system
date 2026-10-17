'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
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
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PaymentModal } from '@/components/purchases/PaymentModal';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import { downloadCsv } from '@/lib/utils/csv';
import { useTranslation } from '@/lib/i18n';

export default function SupplierPaymentsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const queryKey = ['supplier-payments', currentBranchId, page, limit, search];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api.purchases.payments.list({
        page,
        limit,
        search: search || undefined,
      }),
  });

  const handleExportCsv = () => {
    if (!data?.data || data.data.length === 0) return;

    const headers = [
      'Payment #',
      'Date',
      'Supplier',
      'Purchase #',
      'Payment Method',
      'Reference #',
      'Amount',
    ];

    const rows = data.data.map((pm: any) => [
      pm.payment_no,
      formatDate(pm.payment_date, 'en'),
      pm.supplier?.name || '',
      pm.purchase?.purchase_no || '',
      pm.payment_method,
      pm.reference_no || '',
      pm.amount,
    ]);

    downloadCsv('supplier_payments_export.csv', headers, rows);
  };

  const columns = [
    {
      key: 'payment_no',
      header: 'Payment Voucher #',
      render: (pm: any) => (
        <Link
          href={`/purchases/payments/${pm.id}`}
          className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5"
        >
          <span>{pm.payment_no}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </Link>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (pm: any) => (
        <div>
          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
            {pm.supplier?.name}
          </span>
          {pm.supplier?.code && (
            <span className="block text-[10px] text-slate-400 font-mono">
              {pm.supplier.code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'purchase',
      header: 'Linked Purchase',
      render: (pm: any) =>
        pm.purchase?.purchase_no ? (
          <Link
            href={`/purchases/${pm.purchase.id}`}
            className="font-mono text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {pm.purchase.purchase_no}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">General Advance</span>
        ),
    },
    {
      key: 'date',
      header: 'Payment Date',
      render: (pm: any) => (
        <span className="text-xs">{formatDate(pm.payment_date, 'en')}</span>
      ),
    },
    {
      key: 'method',
      header: 'Method / Ref',
      render: (pm: any) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {pm.payment_method}
          </span>
          {pm.reference_no && (
            <span className="block text-[10px] text-slate-400 font-mono">
              Ref: {pm.reference_no}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount Paid',
      render: (pm: any) => (
        <div className="text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
          {formatBDT(pm.amount)}
        </div>
      ),
    },
    {
      key: 'print',
      header: '',
      render: (pm: any) => (
        <div className="flex justify-end">
          <Link
            href={`/purchases/payments/${pm.id}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Print Voucher"
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
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('purchasing.payments')}
            </h1>
            <p className="text-xs text-slate-500">
              Disbursements against supplier purchase bills and general advance vouchers
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

          <PermissionGate permission="purchases:create">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search payment #, reference #..."
          />
        </div>
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
        emptyMessage="No supplier payment vouchers found."
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
        }}
      />
    </div>
  );
}
