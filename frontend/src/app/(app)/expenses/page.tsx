'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { DataTable, Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ExpenseModal from '@/components/expenses/ExpenseModal';
import { ExpenseCategoriesModal } from '@/components/expenses/ExpenseCategoriesModal';
import { downloadCsv } from '@/lib/utils/csv';
import {
  Receipt,
  Plus,
  Tag,
  BarChart3,
  Download,
  Filter,
  RotateCcw,
  Edit2,
  Trash2,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
} from 'lucide-react';

export default function ExpensesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.isOwner;

  // Filter States
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchVendor, setSearchVendor] = useState('');

  // Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  // Delete State
  const [expenseToDelete, setExpenseToDelete] = useState<any | null>(null);

  // Categories for filter
  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.expenses.categories.list(),
  });

  // Query expenses
  const {
    data: expenseData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['expenses-list', currentBranch?.id, page, limit, categoryId, startDate, endDate],
    queryFn: () =>
      api.expenses.list({
        page,
        limit,
        categoryId: categoryId || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59.999Z').toISOString() : undefined,
      }),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.expenses.delete(id),
    onSuccess: () => {
      toast.success(t('expenses.deleteExpense') + ' - Success');
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      setExpenseToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete expense');
    },
  });

  const handleDeleteConfirm = async (reason?: string) => {
    if (!expenseToDelete) return;
    deleteMutation.mutate(expenseToDelete.id);
  };

  const handleResetFilters = () => {
    setCategoryId('');
    setStartDate('');
    setEndDate('');
    setSearchVendor('');
    setPage(1);
  };

  // Filter items by client-side vendor search if provided
  const items = React.useMemo(() => {
    if (!expenseData?.items) return [];
    if (!searchVendor.trim()) return expenseData.items;
    const term = searchVendor.toLowerCase();
    return expenseData.items.filter(
      (item) =>
        item.vendor_name?.toLowerCase().includes(term) ||
        item.expense_no?.toLowerCase().includes(term) ||
        item.receipt_no?.toLowerCase().includes(term),
    );
  }, [expenseData?.items, searchVendor]);

  // Compute server totals for display row
  const totals = React.useMemo(() => {
    let sumAmount = new Decimal(0);
    let sumTax = new Decimal(0);
    let sumTotal = new Decimal(0);
    let paidFromRegisterCount = 0;

    for (const item of items) {
      sumAmount = sumAmount.plus(item.amount || 0);
      sumTax = sumTax.plus(item.tax_amount || 0);
      sumTotal = sumTotal.plus(item.total_amount || 0);
      if (item.paid_from_register) paidFromRegisterCount++;
    }

    return {
      amount: sumAmount.toFixed(2),
      tax: sumTax.toFixed(2),
      total: sumTotal.toFixed(2),
      count: items.length,
      paidFromRegisterCount,
    };
  }, [items]);

  // Export CSV
  const handleExportCsv = () => {
    if (!items || items.length === 0) {
      toast.warning('No expenses to export.');
      return;
    }

    const headers = [
      'Date',
      'Expense No',
      'Category',
      'Vendor',
      'Receipt No',
      'Amount (BDT)',
      'Tax (BDT)',
      'Total (BDT)',
      'Paid From Register',
      'Branch',
    ];

    const rows = items.map((i) => [
      i.expense_date ? new Date(i.expense_date).toLocaleDateString() : '',
      i.expense_no,
      i.category?.name || '',
      i.vendor_name || '',
      i.receipt_no || '',
      i.amount,
      i.tax_amount,
      i.total_amount,
      i.paid_from_register ? 'YES' : 'NO',
      i.branch?.name || '',
    ]);

    downloadCsv(
      rows.map((row) => ({
        [headers[0]]: row[0],
        [headers[1]]: row[1],
        [headers[2]]: row[2],
        [headers[3]]: row[3],
        [headers[4]]: row[4],
        [headers[5]]: row[5],
        [headers[6]]: row[6],
        [headers[7]]: row[7],
        [headers[8]]: row[8],
        [headers[9]]: row[9],
      })),
      `expenses_${currentBranch?.code || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const columns: Column<any>[] = [
    {
      header: 'Date',
      accessor: (r) => (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {r.expense_date ? new Date(r.expense_date).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      header: 'Voucher #',
      accessor: (r) => (
        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {r.expense_no}
        </span>
      ),
    },
    {
      header: 'Category',
      accessor: (r) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Tag className="w-3 h-3 text-slate-400" />
          {r.category?.name || 'Uncategorized'}
        </span>
      ),
    },
    {
      header: 'Vendor / Payee',
      accessor: (r) => (
        <div className="text-sm">
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {r.vendor_name || <span className="text-slate-400 italic">None</span>}
          </div>
          {r.receipt_no && (
            <div className="text-xs text-slate-500 font-mono">Ref: {r.receipt_no}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Payment / Drawer',
      accessor: (r) => (
        <div>
          {r.paid_from_register ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
              <DollarSign className="w-3 h-3" />
              Drawer Cash
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              External / Bank
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Amount',
      align: 'right',
      accessor: (r) => (
        <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
          ৳{Number(r.amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Tax',
      align: 'right',
      accessor: (r) => (
        <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
          {Number(r.tax_amount) > 0
            ? `৳${Number(r.tax_amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`
            : '-'}
        </span>
      ),
    },
    {
      header: 'Total',
      align: 'right',
      accessor: (r) => (
        <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
          ৳{Number(r.total_amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    ...(isOwner
      ? [
          {
            header: 'Branch',
            accessor: (r: any) => (
              <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                <Building2 className="w-3 h-3 text-slate-400" />
                {r.branch?.name || '-'}
              </span>
            ),
          },
        ]
      : []),
    {
      header: 'Actions',
      align: 'right',
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <PermissionGate permissions={['expense.update']}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600"
              onClick={() => {
                setSelectedExpense(r);
                setIsExpenseModalOpen(true);
              }}
              title={t('expenses.editExpense')}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </PermissionGate>
          <PermissionGate permissions={['expense.delete']}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600"
              onClick={() => setExpenseToDelete(r)}
              title={t('expenses.deleteExpense')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            {t('expenses.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('expenses.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/expenses/reports">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              {t('expenses.reportsTitle')}
            </Button>
          </Link>

          <PermissionGate permissions={['expense.create', 'expense.view']}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsCategoriesModalOpen(true)}
            >
              <Tag className="w-4 h-4 text-slate-500" />
              {t('expenses.categories')}
            </Button>
          </PermissionGate>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportCsv}
            disabled={items.length === 0}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            {t('expenses.exportCsv')}
          </Button>

          <PermissionGate permissions={['expense.create']}>
            <Button
              size="sm"
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => {
                setSelectedExpense(null);
                setIsExpenseModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              {t('expenses.addExpense')}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t('expenses.totalExpenses')}
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            ৳{Number(totals.total).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Base: ৳{Number(totals.amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })} + Tax: ৳
            {Number(totals.tax).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t('expenses.voucherCount')}
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {totals.count}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Filtered vouchers</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Paid from Register
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {totals.paidFromRegisterCount}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Direct drawer disbursements</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Current Branch
          </span>
          <div className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-200 truncate">
            {currentBranch?.name || 'All Branches'}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {isOwner ? 'Multi-branch Admin Access' : 'Single Branch Scope'}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Filters:</span>
        </div>

        {/* Category selector */}
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({cat.code})
            </option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-36 h-8 text-xs bg-white dark:bg-slate-800"
            placeholder="Start Date"
          />
          <span>to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-36 h-8 text-xs bg-white dark:bg-slate-800"
            placeholder="End Date"
          />
        </div>

        {/* Vendor / Voucher search */}
        <div className="w-48">
          <Input
            type="text"
            placeholder="Search vendor / #..."
            value={searchVendor}
            onChange={(e) => setSearchVendor(e.target.value)}
            className="h-8 text-xs bg-white dark:bg-slate-800"
          />
        </div>

        {(categoryId || startDate || endDate || searchVendor) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Main Expenses Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          keyField="id"
          emptyMessage={
            <div className="p-8 text-center">
              <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No expense vouchers found for the selected filters.
              </p>
            </div>
          }
          pagination={
            expenseData
              ? {
                  page: expenseData.page,
                  totalPages: expenseData.totalPages,
                  totalItems: expenseData.total,
                  limit: expenseData.limit,
                  onPageChange: (newPage) => setPage(newPage),
                }
              : undefined
          }
        />

        {/* Server Totals Footer Row */}
        {items.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-6 py-3 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>
              Showing {items.length} vouchers on this page (Total {expenseData?.total || 0} recorded)
            </span>
            <div className="flex items-center gap-6 font-mono">
              <span>Page Subtotal: ৳{totals.amount}</span>
              <span>Page Tax: ৳{totals.tax}</span>
              <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                Page Total: ৳{totals.total}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Expense Modal (Create & Edit) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
        expenseToEdit={selectedExpense}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
          setIsExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
      />

      {/* Categories Modal */}
      <ExpenseCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        onClose={() => setExpenseToDelete(null)}
        title={t('expenses.deleteExpense')}
        description={
          <div className="space-y-2">
            <p>
              Are you sure you want to delete voucher{' '}
              <strong className="font-mono text-rose-600">{expenseToDelete?.expense_no}</strong>?
            </p>
            <p className="text-xs text-slate-500">
              An immutable audit log snapshot will be recorded before deletion.
            </p>
          </div>
        }
        confirmText="Delete Voucher"
        variant="destructive"
        requireReason={true}
        reasonLabel={t('expenses.deleteReason')}
        reasonPlaceholder="e.g., Duplicate voucher, entered with wrong amount..."
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
