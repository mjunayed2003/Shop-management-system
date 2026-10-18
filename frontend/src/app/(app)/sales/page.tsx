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
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('pos.salesList')}
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              {currentBranch?.name || 'Branch'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit trail of POS retail and wholesale invoices, receipts, and returns.
          </p>
        </div>

        <Button asChild className="gap-2 bg-primary text-primary-foreground font-semibold">
          <Link href="/pos">
            <Plus className="w-4 h-4" />
            <span>New Sale (POS)</span>
          </Link>
        </Button>
      </div>

      {/* Summary Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Total Invoices
            </span>
            <p className="text-xl font-bold text-foreground font-mono">
              {summary.totalSalesCount}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Total Sales Volume
            </span>
            <p className="text-xl font-bold text-foreground font-mono">
              ৳{Number(summary.totalSalesAmount || 0).toFixed(2)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Total Tendered Paid
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              ৳{Number(summary.totalPaidAmount || 0).toFixed(2)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Total Customer Due
            </span>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              ৳{Number(summary.totalDueAmount || 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-3.5 rounded-2xl border border-border bg-card space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search by invoice / customer */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search invoice number, customer name, phone..."
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary h-9"
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
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary h-9"
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
            className="w-36 h-9 text-xs font-mono"
            title="Start Date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 text-xs font-mono"
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
