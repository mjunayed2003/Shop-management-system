'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { usePermission } from '@/components/shared/PermissionGate';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadCsv } from '@/lib/utils/csv';
import {
  TrendingUp,
  Building2,
  Calendar,
  Download,
  Printer,
  ShieldAlert,
  BarChart3,
  Receipt,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  EyeOff,
  Percent,
} from 'lucide-react';

type PeriodType = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

export default function ProfitReportPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const user = useAuthStore((s) => s.user);
  const { hasPermission: canViewProfitPerm } = usePermission('report.view_profit');
  const canViewProfit = canViewProfitPerm || Boolean(user?.isOwner);
  const isOwner = user?.isOwner;

  // Period State (Asia/Dhaka helper)
  const [period, setPeriod] = useState<PeriodType>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Calculate Start & End Date in Asia/Dhaka
  const dateRange = useMemo(() => {
    // Current time in Asia/Dhaka (UTC+6)
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
      const diff = dhakaNow.getDate() - day + (day === 0 ? -6 : 1); // Monday
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

  // Query Profit Report
  const {
    data: reportData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['profit-report', currentBranch?.id, dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      api.sales.reports.profit({
        startDate: dateRange.startDate ? new Date(dateRange.startDate).toISOString() : undefined,
        endDate: dateRange.endDate
          ? new Date(dateRange.endDate + 'T23:59:59.999Z').toISOString()
          : undefined,
      }),
  });

  // Extract branch reports and combined total
  const { branchList, combined } = useMemo(() => {
    if (!reportData) return { branchList: [], combined: null };

    if (reportData.branches && Array.isArray(reportData.branches)) {
      return {
        branchList: reportData.branches,
        combined: reportData.combinedTotal,
      };
    }

    // Single branch response
    return {
      branchList: [reportData],
      combined: reportData,
    };
  }, [reportData]);

  // Export CSV
  const handleExportCsv = () => {
    if (!branchList || branchList.length === 0) {
      toast.warning('No report data to export.');
      return;
    }

    const headers = [
      'Branch',
      'Gross Sales (BDT)',
      'Discounts (BDT)',
      'Returns (BDT)',
      'Net Sales (BDT)',
      'Damage Loss (BDT)',
      'Expenses (BDT)',
      ...(canViewProfit
        ? ['COGS (BDT)', 'Gross Profit (BDT)', 'Net Profit (BDT)']
        : []),
    ];

    const rows = branchList.map((b: any) => [
      b.branchName || b.branchCode || 'This Branch',
      b.grossSales,
      b.discounts,
      b.salesReturns,
      b.netSales,
      b.damageLoss,
      b.expenses,
      ...(canViewProfit ? [b.costOfGoodsSold, b.grossProfit, b.netProfit] : []),
    ]);

    if (combined && branchList.length > 1) {
      rows.push([
        'ALL BRANCHES COMBINED',
        combined.grossSales,
        combined.discounts,
        combined.salesReturns,
        combined.netSales,
        combined.damageLoss,
        combined.expenses,
        ...(canViewProfit
          ? [combined.costOfGoodsSold, combined.grossProfit, combined.netProfit]
          : []),
      ]);
    }

    downloadCsv(
      rows.map((row: any[]) =>
        headers.reduce((acc: Record<string, any>, h: string, idx: number) => ({ ...acc, [h]: row[idx] }), {}),
      ),
      `profit_report_${dateRange.startDate || 'all'}_${dateRange.endDate || 'all'}.csv`,
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            {t('reports.profitTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('reports.profitSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/reports/collections">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>{t('reports.collectionsTitle')}</span>
            </Button>
          </Link>

          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handlePrint}>
            <Printer className="w-4 h-4 text-slate-600" />
            <span>{t('reports.printReport')}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExportCsv}
            disabled={!branchList || branchList.length === 0}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{t('reports.exportCsv')}</span>
          </Button>
        </div>
      </div>

      {/* Period Filter Selector */}
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
                  ? 'bg-indigo-600 text-white shadow-xs'
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
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Building2 className="w-3.5 h-3.5" />
            <span>Multi-Branch Side-by-Side</span>
          </div>
        )}
      </div>

      {/* Permission warning banner if profit is hidden */}
      {!canViewProfit && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
          <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t('reports.costProfitHidden')}</span>
        </div>
      )}

      {/* Summary KPI Cards (Combined or Single Branch) */}
      {combined && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {t('reports.grossSales')}
            </span>
            <div className="mt-1.5 text-xl font-bold font-mono text-slate-900 dark:text-white">
              ৳{Number(combined.grossSales).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Subtotal of all sales</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {t('reports.salesReturns')}
            </span>
            <div className="mt-1.5 text-xl font-bold font-mono text-rose-600">
              ৳{Number(combined.salesReturns).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Refunded amounts</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {t('reports.netSales')}
            </span>
            <div className="mt-1.5 text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
              ৳{Number(combined.netSales).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Gross - Disc - Returns</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {t('reports.expenses')}
            </span>
            <div className="mt-1.5 text-xl font-bold font-mono text-slate-800 dark:text-slate-200">
              ৳{Number(combined.expenses).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Showroom vouchers</span>
          </div>

          {canViewProfit ? (
            <>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t('reports.grossProfit')}
                </span>
                <div className="mt-1.5 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ৳{Number(combined.grossProfit).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Net Sales - COGS</span>
              </div>

              <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  {t('reports.netProfit')}
                </span>
                <div className="mt-1.5 text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  ৳{Number(combined.netProfit).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-emerald-600/80 mt-0.5 block">
                  Gross Profit - Expenses
                </span>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 col-span-2 flex items-center justify-center text-center">
              <span className="text-xs text-slate-400 font-medium">
                Profit & Loss metrics restricted
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Comparison Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Branch Profitability Breakdown
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {branchList.length} Branch Report{branchList.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 text-left">Branch</th>
                <th className="py-3 px-4 text-right">Gross Sales</th>
                <th className="py-3 px-4 text-right">Discounts</th>
                <th className="py-3 px-4 text-right">Returns</th>
                <th className="py-3 px-4 text-right">Net Sales</th>
                <th className="py-3 px-4 text-right">Expenses</th>
                <th className="py-3 px-4 text-right">Damage Loss</th>
                {canViewProfit && (
                  <>
                    <th className="py-3 px-4 text-right">COGS</th>
                    <th className="py-3 px-4 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-right text-emerald-600">Net Profit</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={canViewProfit ? 10 : 7}
                    className="p-8 text-center text-slate-400 font-sans"
                  >
                    Calculating branch profit and ledger reports...
                  </td>
                </tr>
              ) : branchList.length === 0 ? (
                <tr>
                  <td
                    colSpan={canViewProfit ? 10 : 7}
                    className="p-8 text-center text-slate-400 font-sans"
                  >
                    No sales or financial records found for this period.
                  </td>
                </tr>
              ) : (
                branchList.map((b: any, idx: number) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-left font-sans font-semibold text-slate-900 dark:text-white">
                      {b.branchName} ({b.branchCode})
                    </td>
                    <td className="py-3 px-4 text-right text-slate-800 dark:text-slate-200">
                      ৳{Number(b.grossSales).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      ৳{Number(b.discounts).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600">
                      ৳{Number(b.salesReturns).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      ৳{Number(b.netSales).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                      ৳{Number(b.expenses).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-600">
                      ৳{Number(b.damageLoss).toFixed(2)}
                    </td>
                    {canViewProfit && (
                      <>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                          ৳{Number(b.costOfGoodsSold).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                          ৳{Number(b.grossProfit).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{Number(b.netProfit).toFixed(2)}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>

            {/* Combined Totals Footer Row */}
            {combined && branchList.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 font-mono font-bold text-xs text-slate-900 dark:text-white">
                  <td className="py-3 px-4 text-left font-sans flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Combined Total</span>
                  </td>
                  <td className="py-3 px-4 text-right">৳{Number(combined.grossSales).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">৳{Number(combined.discounts).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-rose-600">
                    ৳{Number(combined.salesReturns).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400">
                    ৳{Number(combined.netSales).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">৳{Number(combined.expenses).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-amber-600">
                    ৳{Number(combined.damageLoss).toFixed(2)}
                  </td>
                  {canViewProfit && (
                    <>
                      <td className="py-3 px-4 text-right">
                        ৳{Number(combined.costOfGoodsSold).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        ৳{Number(combined.grossProfit).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                        ৳{Number(combined.netProfit).toFixed(2)}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
