'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  defaultPrinterAdapter,
  getPrintSettings,
} from '@/lib/utils/printer';
import {
  generateReceiptHtml,
  SaleReceiptData,
} from '@/lib/utils/receipt-template';
import {
  Receipt,
  Search,
  Calendar,
  Filter,
  Eye,
  Printer,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Plus,
} from 'lucide-react';

export default function SalesListPage() {
  const { t } = useTranslation();
  const { business } = useAuthStore();
  const { currentBranchId, currentBranch } = useBranchStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [saleType, setSaleType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'sales-list',
      currentBranchId,
      page,
      pageSize,
      search,
      status,
      saleType,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      return api.sales.list({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        status: status || undefined,
        saleType: saleType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    },
    enabled: Boolean(currentBranchId),
  });

  const sales = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 15, totalPages: 1 };
  const summary = data?.summary;

  const handleQuickReprint = async (sale: any) => {
    try {
      const printSettings = getPrintSettings();
      const fullDetail = await api.sales.get(sale.id);
      const receiptData: SaleReceiptData = {
        ...fullDetail,
        businessName: business?.name,
        cashierName: fullDetail.cashier?.name,
      };
      const html = generateReceiptHtml(receiptData, printSettings, true);
      await defaultPrinterAdapter.printReceipt(html, {
        copies: 1,
        format: printSettings.format,
      });
    } catch {
      // ignore
    }
  };

  const columns = [
    {
      header: t('pos.invoiceNo'),
      key: 'invoiceNo',
      render: (row: any) => (
        <div className="space-y-0.5">
          <Link
            href={`/sales/${row.id}`}
            className="font-bold text-xs text-primary hover:underline font-mono"
          >
            {row.invoiceNo}
          </Link>
          <p className="text-[10px] text-muted-foreground font-mono">
            {new Date(row.saleDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ),
    },
    {
      header: 'Date',
      key: 'saleDate',
      render: (row: any) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.saleDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: t('pos.customer'),
      key: 'customer',
      render: (row: any) => (
        <div className="text-xs">
          {row.customer ? (
            <div>
              <p className="font-semibold text-foreground">{row.customer.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{row.customer.phone}</p>
            </div>
          ) : (
            <span className="text-muted-foreground italic">Walk-in</span>
          )}
        </div>
      ),
    },
    {
      header: 'Items',
      key: 'itemsCount',
      render: (row: any) => (
        <span className="text-xs font-mono font-medium">
          {row.items?.length || 0}
        </span>
      ),
    },
    {
      header: 'Sale Type',
      key: 'saleType',
      render: (row: any) => (
        <Badge variant="outline" className="text-[10px] font-mono">
          {row.saleType}
        </Badge>
      ),
    },
    {
      header: t('pos.total'),
      key: 'totalAmount',
      render: (row: any) => (
        <div className="text-right space-y-0.5">
          <span className="font-extrabold text-xs text-foreground font-mono block">
            ৳{Number(row.totalAmount).toFixed(2)}
          </span>
          {Number(row.dueAmount) > 0 && (
            <span className="text-[10px] text-rose-600 font-bold block">
              Due: ৳{Number(row.dueAmount).toFixed(2)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t('status'),
      key: 'status',
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: t('actions'),
      key: 'actions',
      render: (row: any) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="View Sale Detail"
          >
            <Link href={`/sales/${row.id}`}>
              <Eye className="w-4 h-4" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleQuickReprint(row)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            title="Reprint Receipt (COPY)"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('pos.salesList')}
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              {currentBranch?.name || 'Branch'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of POS retail and wholesale invoices, receipts, and returns.
          </p>
        </div>

        <Button asChild className="gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold rounded-xl shadow-xs">
          <Link href="/pos">
            <Plus className="w-4 h-4" />
            <span>New Sale (POS)</span>
          </Link>
        </Button>
      </div>

      {/* Summary Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Total Invoices</span>
              <div className="w-7 h-7 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center font-bold text-xs">
                #
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {summary.totalSalesCount}
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Total Sales Volume</span>
              <div className="w-7 h-7 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center font-bold text-xs">
                ৳
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              ৳{Number(summary.totalSalesAmount || 0).toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Total Tendered Paid</span>
              <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-xs">
                ৳
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              ৳{Number(summary.totalPaidAmount || 0).toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Total Customer Due</span>
              <div className="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-xs">
                !
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              ৳{Number(summary.totalDueAmount || 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search by invoice / customer */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search invoice number, customer name, phone..."
              className="pl-9 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 h-9"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="DUE">Due</option>
            <option value="VOIDED">Voided</option>
          </select>

          {/* Sale Type Filter */}
          <select
            value={saleType}
            onChange={(e) => {
              setSaleType(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 h-9"
          >
            <option value="">All Sale Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
          </select>

          {/* Date Range */}
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 text-xs font-mono rounded-xl border-slate-200 dark:border-slate-800 focus:ring-sky-500/20"
            title="Start Date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 text-xs font-mono rounded-xl border-slate-200 dark:border-slate-800 focus:ring-sky-500/20"
            title="End Date"
          />

          {(search || status || saleType || startDate || endDate) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatus('');
                setSaleType('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="h-9 text-xs text-muted-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Sales DataTable */}
      <DataTable
        columns={columns}
        data={sales}
        isLoading={isLoading}
        pagination={{
          page,
          limit: pageSize,
          totalItems: meta.total,
          totalPages: meta.totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
        emptyMessage="No sales invoices found matching filters."
      />
    </div>
  );
}
