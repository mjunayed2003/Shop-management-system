'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadCsv } from '@/lib/utils/csv';
import {
  BarChart3,
  Receipt,
  Download,
  ArrowLeft,
  Building2,
  Tag,
  Users,
  Calendar,
  Filter,
  PieChart,
  Table as TableIcon,
  RotateCcw,
} from 'lucide-react';

export default function ExpenseReportsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const currentBranch = useBranchStore((s) => s.currentBranch);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'charts' | 'table'>('both');

  // Query summary report
  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['expenses-summary-report', currentBranch?.id, startDate, endDate],
    queryFn: () =>
      api.expenses.summaryReport({
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59.999Z').toISOString() : undefined,
      }),
  });

  const totalAmount = new Decimal(report?.totalExpenseAmount || 0);

  // Export CSV
  const handleExportCsv = () => {
    if (!report) {
      toast.warning('No report data to export.');
      return;
    }

    const categoryRows = (report.byCategory || []).map((c: any) => ({
      Section: 'By Category',
      Name: c.categoryName,
      'Total (BDT)': c.total,
    }));

    const branchRows = (report.byBranch || []).map((b: any) => ({
      Section: 'By Branch',
      Name: b.branchName,
      'Total (BDT)': b.total,
    }));

    const vendorRows = (report.topVendors || []).map((v: any) => ({
      Section: 'Top Vendor',
      Name: v.vendorName,
      'Total (BDT)': v.total,
    }));

    const allRows = [...categoryRows, ...branchRows, ...vendorRows];

    downloadCsv(
      allRows,
      `expense_summary_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  // Helper for SVG bar chart percentages
  const maxCategory = Math.max(
    ...(report?.byCategory?.map((c: any) => Number(c.total)) || [1]),
    1,
  );
  const maxBranch = Math.max(
    ...(report?.byBranch?.map((b: any) => Number(b.total)) || [1]),
    1,
  );
  const maxVendor = Math.max(
    ...(report?.topVendors?.map((v: any) => Number(v.total)) || [1]),
    1,
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/expenses">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              {t('expenses.reportsTitle')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Expense analytics grouped by category, branch, and top vendors
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewMode === 'both'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewMode === 'charts'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Charts
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tables
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportCsv}
            disabled={!report}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            {t('expenses.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Date Range:</span>
        </div>

        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-36 h-8 text-xs bg-white dark:bg-slate-800"
          placeholder="Start Date"
        />
        <span className="text-xs text-slate-500">to</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-36 h-8 text-xs bg-white dark:bg-slate-800"
          placeholder="End Date"
        />

        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="h-8 text-xs text-slate-500 hover:text-slate-800 gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t('expenses.totalExpenses')}
          </span>
          <div className="mt-2 text-3xl font-bold font-mono text-slate-900 dark:text-white">
            ৳{Number(totalAmount.toFixed(2)).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Aggregated across filtered time window
          </span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t('expenses.voucherCount')}
          </span>
          <div className="mt-2 text-3xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {report?.count || 0}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Individual expense vouchers recorded
          </span>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Categories
          </span>
          <div className="mt-2 text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {report?.byCategory?.length || 0}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Distinct budget categories</span>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-500" />
              {t('expenses.byCategory')}
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {report?.byCategory?.length || 0} Categories
            </span>
          </div>

          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              Loading analytics...
            </div>
          ) : !report?.byCategory || report.byCategory.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              No category expense data available.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chart visualization */}
              {viewMode !== 'table' && (
                <div className="space-y-3 pt-2">
                  {report.byCategory.map((cat: any, idx: number) => {
                    const pct = maxCategory > 0 ? (Number(cat.total) / maxCategory) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {cat.categoryName}
                          </span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">
                            ৳{Number(cat.total).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table fallback */}
              {viewMode !== 'charts' && (
                <div className="overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 font-semibold border-b dark:border-slate-800">
                        <th className="text-left py-2">Category</th>
                        <th className="text-right py-2">Total Amount</th>
                        <th className="text-right py-2">% Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {report.byCategory.map((cat: any, idx: number) => {
                        const share = totalAmount.isZero()
                          ? '0'
                          : new Decimal(cat.total)
                              .dividedBy(totalAmount)
                              .times(100)
                              .toFixed(1);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2 font-medium text-slate-800 dark:text-slate-200">
                              {cat.categoryName}
                            </td>
                            <td className="py-2 text-right font-mono font-semibold text-slate-900 dark:text-white">
                              ৳{Number(cat.total).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 text-right font-mono text-slate-500">{share}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* By Branch */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              {t('expenses.byBranch')}
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {report?.byBranch?.length || 0} Branches
            </span>
          </div>

          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              Loading analytics...
            </div>
          ) : !report?.byBranch || report.byBranch.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              No branch expense data available.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chart visualization */}
              {viewMode !== 'table' && (
                <div className="space-y-3 pt-2">
                  {report.byBranch.map((b: any, idx: number) => {
                    const pct = maxBranch > 0 ? (Number(b.total) / maxBranch) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {b.branchName}
                          </span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">
                            ৳{Number(b.total).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table fallback */}
              {viewMode !== 'charts' && (
                <div className="overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 font-semibold border-b dark:border-slate-800">
                        <th className="text-left py-2">Branch</th>
                        <th className="text-right py-2">Total Amount</th>
                        <th className="text-right py-2">% Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {report.byBranch.map((b: any, idx: number) => {
                        const share = totalAmount.isZero()
                          ? '0'
                          : new Decimal(b.total)
                              .dividedBy(totalAmount)
                              .times(100)
                              .toFixed(1);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2 font-medium text-slate-800 dark:text-slate-200">
                              {b.branchName}
                            </td>
                            <td className="py-2 text-right font-mono font-semibold text-slate-900 dark:text-white">
                              ৳{Number(b.total).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 text-right font-mono text-slate-500">{share}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Payees / Vendors */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              {t('expenses.topVendors')}
            </h2>
            <span className="text-xs font-medium text-slate-500">Top 5 Vendors</span>
          </div>

          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">
              Loading analytics...
            </div>
          ) : !report?.topVendors || report.topVendors.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">
              No vendor expense records found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bars */}
              <div className="space-y-3">
                {report.topVendors.map((v: any, idx: number) => {
                  const pct = maxVendor > 0 ? (Number(v.total) / maxVendor) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {idx + 1}. {v.vendorName}
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          ৳{Number(v.total).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table */}
              <div className="overflow-x-auto border rounded-lg border-slate-100 dark:border-slate-800 p-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b dark:border-slate-800">
                      <th className="text-left py-1.5">Rank</th>
                      <th className="text-left py-1.5">Vendor Name</th>
                      <th className="text-right py-1.5">Disbursed Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.topVendors.map((v: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2 text-slate-500 font-mono">#{idx + 1}</td>
                        <td className="py-2 font-medium text-slate-800 dark:text-slate-200">
                          {v.vendorName}
                        </td>
                        <td className="py-2 text-right font-mono font-semibold text-slate-900 dark:text-white">
                          ৳{Number(v.total).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
