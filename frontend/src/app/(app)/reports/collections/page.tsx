'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadCsv } from '@/lib/utils/csv';
import {
  Receipt,
  Building2,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  CreditCard,
  DollarSign,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

type PeriodType = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

export default function CollectionsReportPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.isOwner;

  // Period State (Asia/Dhaka helper)
  const [period, setPeriod] = useState<PeriodType>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const dateRange = useMemo(() => {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const dhakaNow = new Date(utcTime + 6 * 3600000);

    const formatDateStr = (d: Date) => d.toISOString().slice(0, 10);

    if (period === 'today') {
      const todayStr = formatDateStr(dhakaNow);
      return { startDate: todayStr, endDate: todayStr };
    }

    if (period === 'yesterday') {
      const yest = new Date(dhakaNow);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDateStr(yest);
      return { startDate: yestStr, endDate: yestStr };
    }

    if (period === 'this_week') {
      const day = dhakaNow.getDay();
      const diff = dhakaNow.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(dhakaNow);
      monday.setDate(diff);
      return { startDate: formatDateStr(monday), endDate: formatDateStr(dhakaNow) };
    }

    if (period === 'this_month') {
      const firstDay = new Date(dhakaNow.getFullYear(), dhakaNow.getMonth(), 1);
      return { startDate: formatDateStr(firstDay), endDate: formatDateStr(dhakaNow) };
    }

    return {
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
    };
  }, [period, customStart, customEnd]);

  // Query Collections Report
  const {
    data: collectionsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['collections-report', currentBranch?.id, dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      api.sales.reports.collections({
        startDate: dateRange.startDate ? new Date(dateRange.startDate).toISOString() : undefined,
        endDate: dateRange.endDate
          ? new Date(dateRange.endDate + 'T23:59:59.999Z').toISOString()
          : undefined,
      }),
  });

  const branchCollections: any[] = useMemo(() => {
    if (!collectionsData) return [];
    if (Array.isArray(collectionsData)) return collectionsData;
    return [collectionsData];
  }, [collectionsData]);

  // Aggregate tender totals across all branches
  const aggregatedTenders = useMemo(() => {
    const result: Record<string, { collected: Decimal; refunded: Decimal; net: Decimal }> = {
      CASH: { collected: new Decimal(0), refunded: new Decimal(0), net: new Decimal(0) },
      BKASH: { collected: new Decimal(0), refunded: new Decimal(0), net: new Decimal(0) },
      NAGAD: { collected: new Decimal(0), refunded: new Decimal(0), net: new Decimal(0) },
      BANK: { collected: new Decimal(0), refunded: new Decimal(0), net: new Decimal(0) },
      CARDS: { collected: new Decimal(0), refunded: new Decimal(0), net: new Decimal(0) },
      CHEQUE: { collected: new Decimal(0), refunded: new Decimal(0), net: new Decimal(0) },
    };

    let totalNet = new Decimal(0);

    for (const b of branchCollections) {
      if (b.tenders) {
        for (const [m, tData] of Object.entries(b.tenders as Record<string, any>)) {
          if (!result[m]) {
            result[m] = { collected: new Decimal(0), refunded: new Decimal(0), net: new Decimal(0) };
          }
          result[m].collected = result[m].collected.plus(tData.collected || 0);
          result[m].refunded = result[m].refunded.plus(tData.refunded || 0);
          result[m].net = result[m].net.plus(tData.net || 0);
          totalNet = totalNet.plus(tData.net || 0);
        }
      }
    }

    return { tenders: result, totalNet };
  }, [branchCollections]);

  // Export CSV
  const handleExportCsv = () => {
    if (branchCollections.length === 0) {
      toast.warning('No collections data to export.');
      return;
    }

    const rows: any[] = [];
    for (const b of branchCollections) {
      for (const [tender, data] of Object.entries(b.tenders || {})) {
        rows.push({
          Branch: b.branchName,
          Tender: tender,
          'Collected (BDT)': (data as any).collected,
          'Refunded (BDT)': (data as any).refunded,
          'Net Inflow (BDT)': (data as any).net,
        });
      }
    }

    downloadCsv(
      rows,
      `collections_summary_${dateRange.startDate || 'all'}_${dateRange.endDate || 'all'}.csv`,
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/reports/profit">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              {t('reports.collectionsTitle')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('reports.collectionsSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/reports/profit">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>{t('reports.profitTitle')}</span>
            </Button>
          </Link>

          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.print()}>
            <Printer className="w-4 h-4 text-slate-600" />
            <span>{t('reports.printReport')}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExportCsv}
            disabled={branchCollections.length === 0}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{t('reports.exportCsv')}</span>
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
            <Calendar className="w-4 h-4 text-slate-400" />
            Period (Asia/Dhaka):
          </span>

          {(
            [
              { key: 'today', label: t('reports.periodToday') },
              { key: 'yesterday', label: t('reports.periodYesterday') },
              { key: 'this_week', label: t('reports.periodThisWeek') },
              { key: 'this_month', label: t('reports.periodThisMonth') },
              { key: 'custom', label: t('reports.periodCustom') },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-36 h-8 text-xs bg-white dark:bg-slate-800"
            />
            <span className="text-slate-500">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-36 h-8 text-xs bg-white dark:bg-slate-800"
            />
          </div>
        )}

        {isOwner && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Building2 className="w-3.5 h-3.5" />
            <span>Multi-Branch Collections</span>
          </div>
        )}
      </div>

      {/* Aggregate Tenders Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(aggregatedTenders.tenders).map(([tender, data]) => (
          <div
            key={tender}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
          >
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {tender}
            </span>
            <div className="mt-1.5 text-xl font-bold font-mono text-slate-900 dark:text-white">
              ৳{Number(data.net.toFixed(2)).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 space-y-0.5">
              <div>In: ৳{Number(data.collected.toFixed(2)).toLocaleString('en-BD')}</div>
              <div>Out: -৳{Number(data.refunded.toFixed(2)).toLocaleString('en-BD')}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Net Hero Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-emerald-100">
            {t('reports.totalNet')}
          </span>
          <div className="text-3xl sm:text-4xl font-mono font-bold mt-1">
            ৳{aggregatedTenders.totalNet.toFixed(2)}
          </div>
          <span className="text-xs text-emerald-100 mt-1 block">
            Net cash and digital liquidity acquired (sales + due collections - refunds)
          </span>
        </div>
        <DollarSign className="w-12 h-12 text-white/20" />
      </div>

      {/* Branch Collections Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Tender Receipts & Refunds per Branch
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {branchCollections.length} Branch{branchCollections.length > 1 ? 'es' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 text-left">Branch</th>
                <th className="py-3 px-4 text-left">Tender Channel</th>
                <th className="py-3 px-4 text-right">Collected (In)</th>
                <th className="py-3 px-4 text-right">Refunded (Out)</th>
                <th className="py-3 px-4 text-right font-bold">Net Inflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">
                    Calculating tender collections...
                  </td>
                </tr>
              ) : branchCollections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">
                    No payment collection records found for this period.
                  </td>
                </tr>
              ) : (
                branchCollections.flatMap((b: any, bIdx: number) =>
                  Object.entries(b.tenders || {}).map(([tender, tData]: [string, any], tIdx: number) => (
                    <tr
                      key={`${bIdx}-${tIdx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-left font-sans font-semibold text-slate-800 dark:text-slate-200">
                        {tIdx === 0 ? b.branchName : ''}
                      </td>
                      <td className="py-2.5 px-4 text-left font-sans">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          {tender}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-600 font-semibold">
                        +৳{Number(tData.collected).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-600">
                        -৳{Number(tData.refunded).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                        ৳{Number(tData.net).toFixed(2)}
                      </td>
                    </tr>
                  )),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
