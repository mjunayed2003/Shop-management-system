'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  RotateCcw,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PaymentModal } from '@/components/purchases/PaymentModal';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import { downloadCsv } from '@/lib/utils/csv';
import { useTranslation } from '@/lib/i18n';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const supplierId = params.id as string;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Supplier profile query
  const { data: supplier, isLoading: isLoadingSupplier } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => api.purchases.suppliers.get(supplierId),
    enabled: Boolean(supplierId),
  });

  // Supplier ledger query
  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['supplier-ledger', supplierId, startDate, endDate],
    queryFn: () =>
      api.purchases.suppliers.ledger(supplierId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: Boolean(supplierId),
  });

  const handleExportLedgerCsv = () => {
    if (!ledgerData?.ledger || ledgerData.ledger.length === 0) return;

    const headers = [
      'Date',
      'Type',
      'Reference No',
      'Description',
      'Debit (Decreases Due)',
      'Credit (Increases Due)',
      'Running Balance',
    ];

    const rows = ledgerData.ledger.map((entry: any) => [
      formatDate(entry.date, 'en'),
      entry.type,
      entry.referenceNo,
      entry.description || '',
      entry.debit,
      entry.credit,
      entry.runningBalance,
    ]);

    downloadCsv(`supplier_ledger_${supplier?.code || 'export'}.csv`, headers, rows);
  };

  const ledgerColumns = [
    {
      key: 'date',
      header: 'Date',
      render: (entry: any) => (
        <span className="text-xs font-mono">{formatDate(entry.date, 'en')}</span>
      ),
    },
    {
      key: 'type',
      header: 'Transaction Type',
      render: (entry: any) => {
        let badgeColor = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
        if (entry.type === 'PURCHASE') {
          badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200';
        } else if (entry.type === 'PAYMENT') {
          badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';
        } else if (entry.type === 'RETURN') {
          badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200';
        }
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badgeColor}`}>
            {entry.type}
          </span>
        );
      },
    },
    {
      key: 'referenceNo',
      header: 'Ref / Voucher #',
      render: (entry: any) => (
        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
          {entry.referenceNo}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description / Remarks',
      render: (entry: any) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {entry.description || '-'}
        </span>
      ),
    },
    {
      key: 'debit',
      header: 'Debit (- Due)',
      render: (entry: any) => (
        <div className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          {entry.debit > 0 ? formatBDT(entry.debit) : '-'}
        </div>
      ),
    },
    {
      key: 'credit',
      header: 'Credit (+ Due)',
      render: (entry: any) => (
        <div className="text-right font-mono text-xs text-rose-600 dark:text-rose-400 font-semibold">
          {entry.credit > 0 ? formatBDT(entry.credit) : '-'}
        </div>
      ),
    },
    {
      key: 'runningBalance',
      header: 'Running Balance',
      render: (entry: any) => {
        const bal = Number(entry.runningBalance);
        return (
          <div
            className={`text-right font-mono text-xs font-bold ${
              bal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {formatBDT(bal)}
          </div>
        );
      },
    },
  ];

  if (isLoadingSupplier) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const currentBal = Number(supplier?.current_balance ?? 0);
  const owesMoney = currentBal > 0;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/purchases/suppliers"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Suppliers List</span>
        </Link>
      </div>

      {/* Supplier Profile Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {supplier?.name}
              </h1>
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {supplier?.code}
              </span>
              <StatusBadge status={supplier?.is_active ? 'ACTIVE' : 'INACTIVE'} />
            </div>

            {supplier?.company_name && (
              <p className="text-xs text-slate-500 font-medium">{supplier.company_name}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{supplier?.phone}</span>
              </div>
              {supplier?.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{supplier?.email}</span>
                </div>
              )}
              {supplier?.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{supplier?.city}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Balance Card & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
              Current Due Balance
            </span>
            <div
              className={`text-2xl font-mono font-bold ${
                owesMoney ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {formatBDT(currentBal)}
            </div>
            {owesMoney && (
              <span className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>We owe this vendor</span>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              onClick={() => router.push(`/purchases/new?supplierId=${supplier.id}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-9"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>New Purchase</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPaymentModalOpen(true)}
                className="gap-1.5 text-xs h-8 flex-1"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pay Supplier</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push(`/purchases/returns/new?supplierId=${supplier.id}`)}
                className="gap-1.5 text-xs h-8 flex-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Return Goods</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Supplier Ledger & Running Statement
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
              />
            </div>

            <Button
              variant="outline"
              onClick={handleExportLedgerCsv}
              disabled={!ledgerData?.ledger || ledgerData.ledger.length === 0}
              className="gap-1.5 text-xs h-8"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Ledger</span>
            </Button>
          </div>
        </div>

        <DataTable
          columns={ledgerColumns}
          data={ledgerData?.ledger || []}
          isLoading={isLoadingLedger}
          total={ledgerData?.ledger?.length || 0}
          page={1}
          limit={100}
          onPageChange={() => {}}
          onLimitChange={() => {}}
          emptyMessage="No ledger transactions found for this supplier."
        />
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        supplierId={supplier?.id}
        supplierName={supplier?.name}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['supplier', supplierId] });
          queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplierId] });
        }}
      />
    </div>
  );
}
