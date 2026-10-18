'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { DataTable, Column } from '@/components/shared/DataTable';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  RotateCcw,
  Search,
  Calendar,
  Filter,
  Eye,
  Printer,
  Plus,
  ArrowRight,
  ScanLine,
} from 'lucide-react';

export default function SalesReturnsListPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const user = useAuthStore((s) => s.user);

  // Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [isFindSaleOpen, setIsFindSaleOpen] = useState(false);
  const [findInvoiceNo, setFindInvoiceNo] = useState('');

  // Fetch returns list
  const { data, isLoading } = useQuery({
    queryKey: ['sales-returns-list', currentBranchId, page, limit, searchInvoice, customerId],
    queryFn: () =>
      api.sales.returns.list({
        page,
        limit,
        saleId: searchInvoice ? undefined : undefined,
        customerId: customerId || undefined,
      }),
  });

  const returns = data?.items || [];
  const total = data?.total || 0;

  // Handle Find Sale redirect
  const handleFindSaleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!findInvoiceNo.trim()) return;
    router.push(`/sales/${encodeURIComponent(findInvoiceNo.trim())}/return`);
  };

  const columns: Column<any>[] = [
    {
      key: 'return_no',
      header: t('returns.returnNo'),
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-foreground">{item.return_no}</span>
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
      key: 'sale',
      header: t('returns.invoice'),
      render: (item) => (
        item.sale ? (
          <Link
            href={`/sales/${item.sale.id}`}
            className="font-mono text-primary hover:underline font-semibold"
          >
            {item.sale.invoice_no}
          </Link>
        ) : (
          <span className="text-muted-foreground font-mono">-</span>
        )
      ),
    },
    {
      key: 'customer',
      header: t('returns.customer'),
      render: (item) =>
        item.customer ? (
          <div>
            <div className="font-medium text-foreground">{item.customer.name}</div>
            <div className="text-[10px] text-muted-foreground">{item.customer.phone}</div>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Walk-in</span>
        ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (item) =>
        item.branch ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{item.branch.name}</span>
            {item.branch.code && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                {item.branch.code}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    {
      key: 'refund_method',
      header: t('returns.refundMethod'),
      render: (item) => (
        <Badge variant="secondary" className="font-mono text-[10px]">
          {item.refund_method}
        </Badge>
      ),
    },
    {
      key: 'total_refund_amount',
      header: t('returns.totalRefund'),
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-foreground">
          BDT {Number(item.total_refund_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('actions'),
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Return Slip">
            <Link href={`/sales/returns/${item.id}`}>
              <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-indigo-600" />
              <span>{t('returns.returnList')}</span>
            </h1>
            {user?.isOwner && (
              <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Multi-Branch Admin View
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit trail of customer product returns, restocked goods, damaged write-offs, and refund vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setIsFindSaleOpen(!isFindSaleOpen)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Process New Return</span>
          </Button>
        </div>
      </div>

      {/* Find Sale Accordion / Scanner Box */}
      {isFindSaleOpen && (
        <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <ScanLine className="w-4 h-4 text-indigo-600" />
              <span>{t('returns.findSaleTitle')}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {t('returns.findSaleDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFindSaleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <div className="flex-1">
                <BarcodeInput
                  onScan={(barcode: string) => {
                    setFindInvoiceNo(barcode);
                    router.push(`/sales/${encodeURIComponent(barcode)}/return`);
                  }}
                  placeholder={t('returns.scanPrompt')}
                  className="bg-white dark:bg-slate-900"
                />
              </div>
              <Button type="submit" disabled={!findInvoiceNo.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs">
                <span>Find Sale</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <DataTable
        data={returns}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={
          <div className="p-8 text-center space-y-2">
            <RotateCcw className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm font-medium text-foreground">{t('returns.noReturnsFound')}</p>
            <p className="text-xs text-muted-foreground">
              Sales returns processed in this branch will appear here with printable return slips.
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
