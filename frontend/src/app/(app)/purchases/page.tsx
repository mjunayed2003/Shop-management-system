'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  ExternalLink,
  Ban,
  CreditCard,
  Calendar,
  FileSpreadsheet,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PaymentModal } from '@/components/purchases/PaymentModal';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import { downloadCsv } from '@/lib/utils/csv';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function PurchasesListPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [supplierIdFilter, setSupplierIdFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [purchaseToCancel, setPurchaseToCancel] = useState<any | null>(null);
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string | null>(null);

  // Payment modal state
  const [paymentPurchase, setPaymentPurchase] = useState<any | null>(null);

  const queryKey = [
    'purchases',
    currentBranchId,
    page,
    limit,
    search,
    statusFilter,
    supplierIdFilter,
    startDate,
    endDate,
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api.purchases.purchases.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as any),
        supplierId: supplierIdFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  // Suppliers dropdown
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list-filter', currentBranchId],
    queryFn: () => api.purchases.suppliers.list({ limit: 100 }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.purchases.purchases.cancel(id),
    onSuccess: () => {
      showToast('Purchase receipt cancelled successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setPurchaseToCancel(null);
      setCancelErrorMessage(null);
    },
    onError: (err: any) => {
      // Show backend refusal clearly when stock was already sold
      const msg = err?.message || 'Cannot cancel purchase: Stock has already been sold or moved.';
      setCancelErrorMessage(msg);
      showToast(msg, 'error');
    },
  });

  // Calculate totals for currently displayed set
  const totalInvoiced = (data?.data || []).reduce(
    (acc: Decimal, p: any) => acc.plus(new Decimal(p.total_amount || 0)),
    new Decimal(0),
  );
  const totalPaid = (data?.data || []).reduce(
    (acc: Decimal, p: any) => acc.plus(new Decimal(p.paid_amount || 0)),
    new Decimal(0),
  );
  const totalDue = (data?.data || []).reduce(
    (acc: Decimal, p: any) => acc.plus(new Decimal(p.due_amount || 0)),
    new Decimal(0),
  );

  const handleExportCsv = () => {
    if (!data?.data || data.data.length === 0) return;

    const headers = [
      'Purchase #',
      'Supplier Invoice #',
      'Supplier',
      'Date',
      'Total Amount',
      'Paid Amount',
      'Due Amount',
      'Status',
    ];

    const rows = data.data.map((p: any) => [
      p.purchase_no,
      p.supplier_invoice_no || '',
      p.supplier?.name || '',
      formatDate(p.purchase_date, 'en'),
      p.total_amount,
      p.paid_amount,
      p.due_amount,
      p.status,
    ]);

    downloadCsv('purchases_inward_export.csv', headers, rows);
  };

  const columns = [
    {
      key: 'purchase_no',
      header: 'Purchase #',
      render: (p: any) => (
        <Link
          href={`/purchases/${p.id}`}
          className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5"
        >
          <span>{p.purchase_no}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </Link>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier / Inv #',
      render: (p: any) => (
        <div>
          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
            {p.supplier?.name}
          </span>
          {p.supplier_invoice_no && (
            <span className="block text-[11px] font-mono text-slate-500">
              Inv: {p.supplier_invoice_no}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'purchase_date',
      header: 'Date',
      render: (p: any) => (
        <span className="text-xs">{formatDate(p.purchase_date, 'en')}</span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Cost',
      render: (p: any) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
          {formatBDT(p.total_amount)}
        </span>
      ),
    },
    {
      key: 'paid_amount',
      header: 'Paid',
      render: (p: any) => (
        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          {formatBDT(p.paid_amount)}
        </span>
      ),
    },
    {
      key: 'due_amount',
      header: 'Due',
      render: (p: any) => {
        const due = Number(p.due_amount || 0);
        return (
          <span
            className={`font-mono text-xs font-bold ${
              due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
            }`}
          >
            {formatBDT(due)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: any) => <StatusBadge status={p.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p: any) => {
        const due = Number(p.due_amount || 0);
        const canPay = p.status !== 'CANCELLED' && due > 0;
        const canCancel = p.status !== 'CANCELLED';

        return (
          <div className="flex items-center gap-1.5 justify-end">
            {canPay && (
              <PermissionGate permission="purchases:create">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPaymentPurchase(p)}
                  className="h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  title="Add Payment"
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Pay</span>
                </Button>
              </PermissionGate>
            )}

            {canCancel && (
              <PermissionGate permission="purchases:create">
                <button
                  type="button"
                  onClick={() => {
                    setCancelErrorMessage(null);
                    setPurchaseToCancel(p);
                  }}
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  title="Cancel Purchase"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </PermissionGate>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('purchasing.title')}
            </h1>
            <p className="text-xs text-slate-500">
              Goods receipt notes (GRN), inventory batch arrivals, and supplier liabilities
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
              onClick={() => router.push('/purchases/new')}
              className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              <span>Receive New Goods</span>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search purchase #, supplier invoice..."
          />

          <select
            value={supplierIdFilter}
            onChange={(e) => {
              setSupplierIdFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Suppliers</option>
            {suppliersData?.data?.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
              placeholder="From date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
              placeholder="To date"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {['ALL', 'RECEIVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'PARTIALLY_PAID' ? 'Partial' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Purchases Data Table */}
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
        emptyMessage="No purchase consignments found matching your criteria."
      />

      {/* Totals Summary Row */}
      {data?.data && data.data.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
          <span className="text-slate-500 uppercase tracking-wider">
            Page Summary ({data.data.length} records)
          </span>

          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-500 mr-2">Invoiced Total:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatBDT(totalInvoiced.toNumber())}
              </span>
            </div>

            <div>
              <span className="text-slate-500 mr-2">Total Paid:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatBDT(totalPaid.toNumber())}
              </span>
            </div>

            <div>
              <span className="text-slate-500 mr-2">Outstanding Due:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {formatBDT(totalDue.toNumber())}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Purchase Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(purchaseToCancel)}
        onClose={() => {
          setPurchaseToCancel(null);
          setCancelErrorMessage(null);
        }}
        onConfirm={(reason) => {
          if (purchaseToCancel) {
            cancelMutation.mutate(purchaseToCancel.id);
          }
        }}
        title="Cancel Purchase Consignment"
        description={
          <div className="space-y-3">
            <p>
              Are you sure you want to cancel Purchase{' '}
              <strong className="text-slate-900 dark:text-slate-100 font-mono">
                {purchaseToCancel?.purchase_no}
              </strong>
              ? This will deduct the received items from stock and reverse the supplier due balance.
            </p>
            {cancelErrorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{cancelErrorMessage}</span>
              </div>
            )}
          </div>
        }
        requireReason={true}
        reasonLabel="Cancellation Reason (required)"
        confirmText="Cancel Purchase"
        variant="destructive"
        isLoading={cancelMutation.isPending}
      />

      {/* Record Payment Modal */}
      {paymentPurchase && (
        <PaymentModal
          isOpen={Boolean(paymentPurchase)}
          onClose={() => setPaymentPurchase(null)}
          supplierId={paymentPurchase.supplier_id || paymentPurchase.supplier?.id}
          supplierName={paymentPurchase.supplier?.name}
          purchaseId={paymentPurchase.id}
          purchaseNo={paymentPurchase.purchase_no}
          purchaseDue={Number(paymentPurchase.due_amount || 0)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
          }}
        />
      )}
    </div>
  );
}
