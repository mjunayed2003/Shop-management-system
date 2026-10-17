'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Phone,
  Mail,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SupplierModal } from '@/components/purchases/SupplierModal';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT } from '@/lib/utils/formatters';
import { exportToCsv, downloadCsv } from '@/lib/utils/csv';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<any | null>(null);

  const queryKey = [
    'suppliers',
    currentBranchId,
    page,
    limit,
    search,
    statusFilter,
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api.purchases.suppliers.list({
        page,
        limit,
        search: search || undefined,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.purchases.suppliers.delete(id),
    onSuccess: () => {
      showToast('Supplier deactivated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSupplierToDelete(null);
    },
    onError: (err: any) => {
      showToast(err?.message || 'Failed to delete supplier', 'error');
    },
  });

  const handleExportCsv = () => {
    if (!data?.data || data.data.length === 0) {
      showToast('No suppliers to export', 'info');
      return;
    }

    const headers = [
      'Code',
      'Name',
      'Company',
      'Phone',
      'Email',
      'City',
      'Opening Balance',
      'Current Balance',
      'Status',
    ];

    const rows = data.data.map((s: any) => [
      s.code,
      s.name,
      s.company_name || s.companyName || '',
      s.phone,
      s.email || '',
      s.city || '',
      s.opening_balance || s.openingBalance || 0,
      s.current_balance || s.currentBalance || 0,
      s.is_active ? 'Active' : 'Inactive',
    ]);

    downloadCsv('suppliers_export.csv', headers, rows);
  };

  const columns = [
    {
      key: 'name',
      header: 'Supplier Name',
      render: (s: any) => (
        <div>
          <Link
            href={`/purchases/suppliers/${s.id}`}
            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5"
          >
            <span>{s.name}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </Link>
          {(s.company_name || s.companyName) && (
            <p className="text-xs text-slate-500">{s.company_name || s.companyName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (s: any) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {s.code}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (s: any) => (
        <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{s.phone}</span>
          </div>
          {s.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{s.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Location',
      render: (s: any) => s.city || s.address || '-',
    },
    {
      key: 'balance',
      header: 'Current Balance',
      render: (s: any) => {
        const bal = Number(s.current_balance || s.currentBalance || 0);
        const owesMoney = bal > 0;
        return (
          <div className="text-right">
            <span
              className={`font-mono font-bold text-sm ${
                owesMoney
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {formatBDT(bal)}
            </span>
            {owesMoney && (
              <span className="block text-[10px] text-rose-500 font-medium">
                (We owe supplier)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: any) => (
        <StatusBadge status={s.is_active ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s: any) => (
        <div className="flex items-center gap-1 justify-end">
          <PermissionGate permission="suppliers:manage">
            <button
              type="button"
              onClick={() => {
                setSelectedSupplier(s);
                setIsModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Edit Supplier"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSupplierToDelete(s)}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Deactivate Supplier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('purchasing.suppliers')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Business-wide vendors, garment factories, and fabric mill partners
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

          <PermissionGate permission="suppliers:manage">
            <Button
              onClick={() => {
                setSelectedSupplier(null);
                setIsModalOpen(true);
              }}
              className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by name, code, phone, company..."
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Suppliers Table */}
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
        emptyMessage="No suppliers found matching your query."
      />

      {/* Supplier Create/Edit Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSupplier(null);
        }}
        supplier={selectedSupplier}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        }}
      />

      {/* Delete / Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(supplierToDelete)}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={() => {
          if (supplierToDelete) {
            deleteMutation.mutate(supplierToDelete.id);
          }
        }}
        title="Deactivate Supplier"
        description={
          <div>
            Are you sure you want to deactivate{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {supplierToDelete?.name}
            </strong>
            ? They will no longer be available for new purchase orders.
          </div>
        }
        confirmText="Deactivate"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
