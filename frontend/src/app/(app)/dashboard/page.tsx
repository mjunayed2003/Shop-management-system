'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useOfflineStore } from '@/lib/store/offline-store';
import { usePermission } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Warehouse,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  Store,
  RefreshCw,
  CreditCard,
  Building2,
  Lock,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isOwner = Boolean(user?.isOwner);
  const { currentBranch, currentBranchId } = useBranchStore();
  const { pendingCount } = useOfflineStore();
  const { hasPermission: canViewProfit } = usePermission(['report.view_profit', 'report.view']);

  const [period, setPeriod] = useState<'today' | 'thisWeek' | 'thisMonth'>('today');
  const [activeTab, setActiveTab] = useState<'business' | 'cashier'>('business');

  // Business / Management Dashboard query
  const {
    data: businessData,
    isLoading: isBusinessLoading,
    refetch: refetchBusiness,
    dataUpdatedAt: businessUpdatedAt,
  } = useQuery({
    queryKey: ['dashboards', 'business', currentBranchId, canViewProfit],
    queryFn: () => api.dashboards.business(),
    staleTime: 30000,
  });

  // Cashier Dashboard query
  const {
    data: cashierData,
    isLoading: isCashierLoading,
    refetch: refetchCashier,
  } = useQuery({
    queryKey: ['dashboards', 'cashier', currentBranchId, user?.id],
    queryFn: () => api.dashboards.cashier(),
    staleTime: 30000,
  });

  const salesMetric = businessData?.sales?.[period] || { revenue: 0, count: 0 };
  const expenseMetric = businessData?.expenses?.[period] || 0;
  const profitMetric = businessData?.profit?.[period];
  const cogsMetric = businessData?.cogs?.[period];

  const salesTrend = businessData?.salesTrend || [];
  const maxTrendTotal = Math.max(...salesTrend.map((t) => t.total), 1);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Executive Dashboard
            </h1>
            {isOwner && (
              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                Multi-Branch Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Store performance, revenue aggregates, cashier shift metrics, and sales trend (Asia/Dhaka)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Dashboard Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'business'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Management View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cashier')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'cashier'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Cashier Shift
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              refetchBusiness();
              refetchCashier();
            }}
            className="text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Cache Notice */}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>
          Branch Context: <strong className="text-slate-700 dark:text-slate-300">{currentBranch?.name || 'All Branches'}</strong>
        </span>
        <span>
          Updated: {businessUpdatedAt ? new Date(businessUpdatedAt).toLocaleTimeString() : 'Just now'} (cached 30s)
        </span>
      </div>

      {activeTab === 'business' ? (
        /* ================= MANAGEMENT / BUSINESS VIEW ================= */
        <div className="space-y-6">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 w-fit text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'today'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPeriod('thisWeek')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'thisWeek'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setPeriod('thisMonth')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'thisMonth'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales Revenue */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Gross Sales Revenue</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {salesMetric.revenue.toLocaleString()} BDT
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{salesMetric.count} completed sale(s)</span>
              </p>
            </div>

            {/* Expenses */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Showroom Expenses</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {expenseMetric.toLocaleString()} BDT
              </div>
              <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Vouchers &amp; drawer disbursements</span>
              </p>
            </div>

            {/* Profit (Permission Gated) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Estimated Net Profit</span>
              {profitMetric ? (
                <>
                  <div className={`text-2xl font-black ${profitMetric.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {profitMetric.net.toLocaleString()} BDT
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Gross: {profitMetric.gross.toLocaleString()} BDT
                  </p>
                </>
              ) : (
                <div className="py-2 text-xs text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hidden (Requires report.view_profit)</span>
                </div>
              )}
            </div>

            {/* Receivables & Low Stock */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Customer Due Receivable</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {(businessData?.receivables || 0).toLocaleString()} BDT
              </div>
              <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5" />
                <span>Stock: {(businessData?.stockValue || 0).toLocaleString()} BDT ({businessData?.lowStockCount || 0} low)</span>
              </p>
            </div>
          </div>

          {/* 30-Day Sales Trend SVG Chart */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>30-Day Daily Sales Progression (BDT)</span>
                </h3>
                <p className="text-xs text-slate-400">Daily turnover aggregated across active showroom sales</p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Peak: {maxTrendTotal.toLocaleString()} BDT
              </span>
            </div>

            {/* Responsive SVG Bar Chart */}
            <div className="h-44 w-full flex items-end gap-1.5 pt-4 pb-2 px-1 border-b border-slate-100 dark:border-slate-800">
              {salesTrend.map((t, idx) => {
                const heightPct = Math.max(4, Math.round((t.total / maxTrendTotal) * 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-9 hidden group-hover:flex px-2 py-1 bg-slate-900 text-white text-[10px] rounded-md font-mono whitespace-nowrap z-20 shadow-md">
                      {t.date}: {t.total.toLocaleString()} BDT
                    </div>
                    {/* Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t-sm bg-emerald-500/80 group-hover:bg-emerald-400 transition-all cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{salesTrend[0]?.date || ''}</span>
              <span>30 Days</span>
              <span>{salesTrend[salesTrend.length - 1]?.date || ''}</span>
            </div>
          </div>

          {/* Two-Column Grid: Top Products & Branch Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Top Selling Products</span>
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {(businessData?.topProducts || []).length === 0 ? (
                  <div className="py-8 text-center text-slate-400">No sales recorded yet</div>
                ) : (
                  (businessData?.topProducts || []).map((prod) => (
                    <div key={prod.variantId} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{prod.productName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{prod.sku}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{prod.revenue.toLocaleString()} BDT</div>
                        <span className="text-[10px] text-slate-400">{prod.quantitySold} pcs sold</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Branch Comparison (Admins) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Branch Performance (This Month)</span>
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {(businessData?.branchComparison || []).length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    Single branch view or no other branches configured
                  </div>
                ) : (
                  (businessData?.branchComparison || []).map((b) => (
                    <div key={b.branchId} className="py-2.5 flex items-center justify-between">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{b.branchName}</div>
                      <div className="font-extrabold text-slate-900 dark:text-white font-mono">
                        {b.monthRevenue.toLocaleString()} BDT
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= CASHIER SHIFT VIEW ================= */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Active Session Status */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Register Shift</span>
              {cashierData?.activeSession ? (
                <>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>OPEN ({cashierData.activeSession.registerName})</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Opened at: {new Date(cashierData.activeSession.openedAt).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    Opening float: <strong>{Number(cashierData.activeSession.openingBalance || 0).toLocaleString()} BDT</strong>
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-amber-600">No Open Shift</div>
                  <Link href="/pos">
                    <Button size="sm" className="text-xs h-8 bg-emerald-600 text-white rounded-xl">
                      Open Shift in POS
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Today Sales Count */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">My Sales Count Today</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {cashierData?.today?.salesCount || 0}
              </div>
              <p className="text-xs text-slate-400">Total bills issued by your cashier account</p>
            </div>

            {/* Today Sales Amount */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">My Sales Total (BDT)</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {(cashierData?.today?.salesAmount || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400">Gross turnover collected across tenders</p>
            </div>
          </div>

          {/* Quick Action Links for Cashier */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <Link href="/pos">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 rounded-xl font-semibold">
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                Go to POS Terminal
              </Button>
            </Link>
            <Link href="/pos/register/close">
              <Button variant="outline" size="sm" className="text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800">
                Close Register Shift (Z Report)
              </Button>
            </Link>
            <Link href="/sync">
              <Button variant="outline" size="sm" className="text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800">
                View Offline Queue ({pendingCount})
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
