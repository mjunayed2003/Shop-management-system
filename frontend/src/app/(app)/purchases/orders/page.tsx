'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  ExternalLink,
  Send,
  Ban,
  PackageCheck,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [poToCancel, setPoToCancel] = useState<any | null>(null);

  const queryKey = [
    'purchase-orders',
    currentBranchId,
    page,
    limit,
    search,
    statusFilter,
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api.purchases.orders.list({
        page,
        limit,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const issueMutation = useMutation({
    mutationFn: (id: string) => api.purchases.orders.issue(id),
    onSuccess: () => {
      showToast('Purchase Order issued successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to issue purchase order', 'error');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.purchases.orders.cancel(id),
    onSuccess: () => {
      showToast('Purchase Order cancelled successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setPoToCancel(null);
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to cancel purchase order', 'error');
    },
  });

  const columns = [
    {
      key: 'po_no',
      header: 'PO #',
      render: (po: any) => (
        <Link
          href={`/purchases/orders/${po.id}`}
          className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5"
        >
          <span>{po.po_no}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </Link>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (po: any) => (
        <div>
          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
            {po.supplier?.name}
          </span>
          {po.supplier?.code && (
            <span className="block text-[10px] text-slate-400 font-mono">
              {po.supplier.code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'order_date',
      header: 'Order Date',
      render: (po: any) => (
        <span className="text-xs">{formatDate(po.order_date, 'en')}</span>
      ),
    },
    {
      key: 'expected_delivery',
      header: 'Expected Delivery',
      render: (po: any) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {po.expected_delivery ? formatDate(po.expected_delivery, 'en') : '-'}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Cost',
      render: (po: any) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
          {formatBDT(po.total_amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po: any) => <StatusBadge status={po.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (po: any) => (
        <div className="flex items-center gap-1.5 justify-end">
          {po.status === 'DRAFT' && (
            <PermissionGate permission="purchases:create">
              <Button
                variant="outline"
                size="sm"
                onClick={() => issueMutation.mutate(po.id)}
                disabled={issueMutation.isPending}
                className="h-7 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Send className="w-3 h-3" />
                <span>Issue</span>
              </Button>
            </PermissionGate>
          )}

          {(po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED') && (
            <PermissionGate permission="purchases:create">
              <Button
                size="sm"
                onClick={() => router.push(`/purchases/new?poId=${po.id}`)}
                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <PackageCheck className="w-3 h-3" />
                <span>Receive Goods</span>
              </Button>
            </PermissionGate>
          )}

          {po.status === 'DRAFT' && (
            <PermissionGate permission="purchases:create">
              <button
                type="button"
                onClick={() => setPoToCancel(po)}
                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                title="Cancel PO"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            </PermissionGate>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('purchasing.purchaseOrders')}
            </h1>
            <p className="text-xs text-slate-500">
              Pre-order procurement requests to vendors with goods receipt fulfillment tracking
            </p>
          </div>
        </div>

        <PermissionGate permission="purchases:create">
          <Button
            onClick={() => router.push('/purchases/orders/new')}
            className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Order</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search PO #, supplier..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto text-xs">
          {['ALL', 'DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'].map(
            (st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL'
                  ? 'All'
                  : st === 'PARTIALLY_RECEIVED'
                  ? 'Partially Recv'
                  : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Orders Table */}
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
        emptyMessage="No purchase orders found matching your filters."
      />

      {/* Cancel PO Dialog */}
      <ConfirmDialog
        isOpen={Boolean(poToCancel)}
        onClose={() => setPoToCancel(null)}
        onConfirm={(reason) => {
          if (poToCancel) {
            cancelMutation.mutate(poToCancel.id);
          }
        }}
        title="Cancel Purchase Order"
        description={
          <div>
            Are you sure you want to cancel Purchase Order{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {poToCancel?.po_no}
            </strong>
            ? This action cannot be undone.
          </div>
        }
        requireReason={true}
        reasonLabel="Cancellation Reason (required)"
        confirmText="Cancel Order"
        variant="destructive"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
