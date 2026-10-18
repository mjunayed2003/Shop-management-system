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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Wallet,
  Search,
  Calendar,
  Clock,
  ArrowRight,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Phone,
  User,
} from 'lucide-react';
import { normalizeBDPhone } from '@/lib/utils/phone';

export default function DueCollectionsHubPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const user = useAuthStore((s) => s.user);

  // Phone search
  const [lookupPhone, setLookupPhone] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Collections list pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Phone lookup query
  const { data: customerLookup, isFetching: lookupFetching, error: lookupError } = useQuery({
    queryKey: ['customer-phone-lookup', lookupPhone],
    queryFn: () => api.customers.lookup(lookupPhone.trim()),
    enabled: Boolean(searchTriggered && lookupPhone.trim()),
    retry: false,
  });

  // Recent collections list
  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ['due-collections-list', currentBranchId, page, limit],
    queryFn: () => api.sales.dueCollections.list({ page, limit }),
  });

  const collections = collectionsData?.items || [];
  const total = collectionsData?.total || 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPhone.trim()) return;
    setSearchTriggered(true);
  };

  const columns: Column<any>[] = [
    {
      key: 'collection_no',
      header: t('due.collectionNo'),
      render: (item) => (
        <div>
          <span className="font-mono font-bold text-foreground">{item.collection_no}</span>
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
      key: 'customer',
      header: 'Customer',
      render: (item) =>
        item.customer ? (
          <div>
            <div className="font-semibold text-foreground">{item.customer.name}</div>
            <div className="text-[10px] text-muted-foreground font-mono">{item.customer.phone}</div>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        ),
    },
    {
      key: 'payment_method',
      header: 'Tender',
      render: (item) => (
        <Badge variant="outline" className="font-mono text-[10px]">
          {item.payment_method}
        </Badge>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (item) => <span className="text-xs">{item.branch?.name || '-'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount Collected',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          BDT {Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href={`/customers/${item.customer_id}/collect-due`}>
            <span>View</span>
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            <span>{t('due.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collect customer outstanding balances, view credit history, and inspect debt aging analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-1.5 text-xs font-semibold">
            <Link href="/customers/due/aging">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>{t('due.agingTitle')}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Phone-First Customer Search Card */}
      <Card className="border-emerald-200 dark:border-emerald-950/80 bg-emerald-50/30 dark:bg-emerald-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>{t('due.customerLookup')}</span>
          </CardTitle>
          <CardDescription className="text-xs">
            {t('due.lookupPrompt')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md">
            <Input
              value={lookupPhone}
              onChange={(e) => {
                setLookupPhone(e.target.value);
                setSearchTriggered(false);
              }}
              placeholder="e.g. 017XXXXXXXX..."
              className="text-xs bg-white dark:bg-slate-900"
            />
            <Button
              type="submit"
              disabled={!lookupPhone.trim() || lookupFetching}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </Button>
          </form>

          {/* Customer Result Card */}
          {customerLookup && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-xl animate-in fade-in">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">{customerLookup.name}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {customerLookup.phone}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Credit Limit: BDT {Number(customerLookup.credit_limit || 0).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Outstanding Due</span>
                  <div className="font-mono font-bold text-lg text-rose-600 dark:text-rose-400">
                    BDT {Number(customerLookup.current_due || 0).toFixed(2)}
                  </div>
                </div>

                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs">
                  <Link href={`/customers/${customerLookup.id}/collect-due`}>
                    <span>Collect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {searchTriggered && lookupError && !customerLookup && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>No customer found matching phone number &quot;{lookupPhone}&quot;.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Collections Table */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span>{t('due.collectionsList')}</span>
        </h2>

        <DataTable
          data={collections}
          columns={columns}
          isLoading={collectionsLoading}
          emptyMessage={
            <div className="p-8 text-center space-y-2">
              <Wallet className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm font-medium text-foreground">No due collections recorded</p>
              <p className="text-xs text-muted-foreground">
                Settled customer debts will appear here with printable money receipts.
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
    </div>
  );
}
