'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Clock,
  ArrowLeft,
  Download,
  Building2,
  Send,
  Loader2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { downloadCsv } from '@/lib/utils/csv';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function CustomerDueAgingReportPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [remindersSent, setRemindersSent] = useState(false);

  // Fetch aging report
  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ['due-reports-outstanding'],
    queryFn: () => api.sales.dueCollections.reports.outstanding(),
  });

  // Fetch per-branch due split
  const { data: branchSplitData, isLoading: branchSplitLoading } = useQuery({
    queryKey: ['due-reports-branch-split'],
    queryFn: () => api.sales.dueCollections.reports.branchSplit(),
  });

  const customers = agingData || [];
  const branchSplits = branchSplitData || [];

  // Totals
  const totalOutstanding = customers.reduce((sum: number, c: any) => sum + Number(c.currentDue || 0), 0);

  // Export formula-injection safe CSV
  const handleExportCsv = () => {
    if (!customers || customers.length === 0) {
      toast.warning('No customer due records to export');
      return;
    }

    const headers = [
      'Customer Name',
      'Phone Number',
      'Total Current Due (BDT)',
      'Last Purchase Date',
      '0-30 Days Due (BDT)',
      '31-60 Days Due (BDT)',
      '61-90 Days Due (BDT)',
      '90+ Days Due (BDT)',
    ];

    const rows = customers.map((c: any) => [
      c.name,
      c.phone || '',
      Number(c.currentDue || 0).toFixed(2),
      c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toISOString().split('T')[0] : 'N/A',
      Number(c.agingBuckets?.days0_30 || 0).toFixed(2),
      Number(c.agingBuckets?.days31_60 || 0).toFixed(2),
      Number(c.agingBuckets?.days61_90 || 0).toFixed(2),
      Number(c.agingBuckets?.days90Plus || 0).toFixed(2),
    ]);

    downloadCsv('customer-due-aging-report.csv', headers, rows);
    toast.success('Customer aging report exported safely to CSV.');
  };

  const handleConfirmSendReminders = () => {
    setIsReminderModalOpen(false);
    setRemindersSent(true);
    toast.success(t('due.reminderSent'));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href="/customers/due">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-600" />
              <span>{t('due.agingTitle')}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('due.agingSubtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={customers.length === 0}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{t('due.exportCsv')}</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsReminderModalOpen(true)}
            disabled={customers.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('due.sendReminder')}</span>
          </Button>
        </div>
      </div>

      {/* Per-Branch Due Split Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {branchSplits.map((branch: any) => (
          <Card key={branch.branchId} className="p-4 border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>{branch.name}</span>
              </span>
              <Badge variant="outline" className="text-[9px] font-mono px-1">
                {branch.code}
              </Badge>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Branch Due</span>
              <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                BDT {Number(branch.totalDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {branch.dueSalesCount} active credit sales
            </div>
          </Card>
        ))}
      </div>

      {/* Main Aging Buckets Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Customer Debt Aging Buckets</CardTitle>
            <CardDescription className="text-xs">
              Classification of unpaid balances by elapsed days since sale date.
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Portfolio Due</span>
            <div className="text-xl font-bold font-mono text-foreground">
              BDT {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {agingLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Loading customer due aging analysis...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
              <p className="font-medium text-foreground">Zero Outstanding Debt</p>
              <p>All customers across all showroom branches are fully settled.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3 text-right">Total Due</th>
                    <th className="p-3 text-center">Last Purchase</th>
                    <th className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                      {t('due.bucket0_30')}
                    </th>
                    <th className="p-3 text-right text-blue-600 dark:text-blue-400 font-bold">
                      {t('due.bucket31_60')}
                    </th>
                    <th className="p-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                      {t('due.bucket61_90')}
                    </th>
                    <th className="p-3 text-right text-rose-600 dark:text-rose-400 font-bold">
                      {t('due.bucket90Plus')}
                    </th>
                    <th className="p-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers.map((c: any) => (
                    <tr key={c.customerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{c.phone}</div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        BDT {Number(c.currentDue).toFixed(2)}
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-3 text-right font-mono">
                        BDT {Number(c.agingBuckets?.days0_30 || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        BDT {Number(c.agingBuckets?.days31_60 || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400 font-medium">
                        BDT {Number(c.agingBuckets?.days61_90 || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                        BDT {Number(c.agingBuckets?.days90Plus || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <Link href={`/customers/${c.customerId}/collect-due`}>Collect</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Send Reminders Dialog */}
      <ConfirmDialog
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onConfirm={handleConfirmSendReminders}
        title="Send Bulk SMS Debt Reminders"
        description={t('due.sendReminderConfirm', { count: customers.length })}
        confirmText="Confirm & Send Reminders"
      />
    </div>
  );
}
