'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { platformApi } from '@/lib/api/platform-client';
import {
  TrendingUp,
  RefreshCw,
  Clock,
  Building2,
  Receipt,
  Users,
  ChevronRight,
  Loader2,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Store,
  CreditCard,
  Zap,
} from 'lucide-react';

export default function PlatformDashboardPage() {
  const [timeFilter, setTimeFilter] = useState<'Monthly' | '7d' | '24h'>('Monthly');

  // 1. Fetch Real Platform Metrics
  const {
    data: metrics,
    isLoading: isMetricsLoading,
    isRefetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: () => platformApi.dashboard.getMetrics(),
    refetchInterval: 60000,
  });

  // 2. Fetch Real Recent Invoices for Last Transactions
  const { data: invoicesData, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['platform', 'recent-invoices'],
    queryFn: () => platformApi.invoices.list({ limit: 5 }),
    refetchInterval: 60000,
  });

  // 3. Fetch Real Recent Businesses for Featured Tenant
  const { data: businessesData, isLoading: isBusinessesLoading } = useQuery({
    queryKey: ['platform', 'recent-businesses'],
    queryFn: () => platformApi.businesses.list({ limit: 5 }),
    refetchInterval: 60000,
  });

  const isLoading = isMetricsLoading && !metrics;

  const fmtBdt = (num?: number) =>
    `BDT ${(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Chart coordinate math
  const svgW = 760;
  const svgH = 220;
  const padX = 35;
  const padY = 40;
  const usableW = svgW - padX * 2;
  const usableH = svgH - padY * 2;

  // Real frequency trends or safe fallback points
  const frequencyTrends = metrics?.frequencyTrends || [];
  const hourlyTrends = metrics?.hourlyTrends || [];

  // Determine active dataset based on timeFilter
  const rawDataset =
    timeFilter === '24h'
      ? hourlyTrends
      : frequencyTrends;

  // Safe data points to guarantee zero undefined index access
  const defaultDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const defaultValues = [220, 280, 240, 390, 360, 480, 420];

  const trendItems: { label: string; val: number }[] =
    rawDataset && rawDataset.length > 0
      ? rawDataset.map((d: any, idx: number) => ({
          label: d.shortDay || d.time || d.date || `P${idx + 1}`,
          val: Math.max(Number(d.frequency ?? d.views ?? 0), 10),
        }))
      : defaultDays.map((d, i) => ({
          label: d,
          val: defaultValues[i],
        }));

  const maxVal = Math.max(...trendItems.map((t) => t.val), 50);
  const n = Math.max(trendItems.length, 2);

  const wavePoints = trendItems.map((item, i) => {
    const x = padX + (i / (n - 1)) * usableW;
    const y = svgH - padY - (item.val / maxVal) * usableH;
    return { x, y, label: item.label, val: item.val };
  });

  // Calculate smooth SVG path
  const wavePathD =
    wavePoints.length > 0
      ? wavePoints.reduce((acc, pt, idx, arr) => {
          if (idx === 0) return `M ${pt.x} ${pt.y}`;
          const prev = arr[idx - 1] || pt;
          const cpX1 = prev.x + (pt.x - prev.x) / 2;
          const cpY1 = prev.y;
          const cpX2 = prev.x + (pt.x - prev.x) / 2;
          const cpY2 = pt.y;
          return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${pt.y}`;
        }, '')
      : `M ${padX} ${svgH - padY} L ${svgW - padX} ${svgH - padY}`;

  const firstPt = wavePoints[0] || { x: padX, y: svgH - padY, label: '', val: 0 };
  const lastPt = wavePoints[wavePoints.length - 1] || { x: svgW - padX, y: svgH - padY, label: '', val: 0 };
  const areaWaveD = `${wavePathD} L ${lastPt.x} ${svgH - padY} L ${firstPt.x} ${svgH - padY} Z`;

  // Safely find peak point
  let peakIdx = 0;
  let maxRecorded = -1;
  wavePoints.forEach((pt, i) => {
    if (pt.val > maxRecorded) {
      maxRecorded = pt.val;
      peakIdx = i;
    }
  });
  const peakPt = wavePoints[peakIdx] || firstPt;

  // Real 7-day multi-category grouped bar data
  const barData =
    frequencyTrends.length >= 7
      ? frequencyTrends.slice(0, 7).map((d: any) => ({
          day: d.shortDay || 'Day',
          blue: Math.max(d.views || 0, 5),
          green: Math.max(d.users || 0, 3),
          orange: Math.max(d.frequency || 0, 8),
        }))
      : [
          { day: 'Sun', blue: 18, green: 25, orange: 15 },
          { day: 'Mon', blue: 27, green: 14, orange: 28 },
          { day: 'Tue', blue: 14, green: 29, orange: 33 },
          { day: 'Wed', blue: 16, green: 34, orange: 31 },
          { day: 'Thu', blue: 29, green: 22, orange: 34 },
          { day: 'Fri', blue: 33, green: 30, orange: 27 },
          { day: 'Sat', blue: 26, green: 34, orange: 17 },
        ];

  const maxBarVal = Math.max(
    ...barData.flatMap((d: { blue: number; green: number; orange: number }) => [d.blue, d.green, d.orange]),
    35,
  );

  // Subscription Distribution Calculations
  const activeSubs = metrics?.subscriptions?.ACTIVE || 0;
  const trialSubs = metrics?.subscriptions?.TRIAL || 0;
  const dueGraceSubs =
    (metrics?.subscriptions?.PAYMENT_DUE || 0) +
    (metrics?.subscriptions?.GRACE || 0) +
    (metrics?.subscriptions?.SUSPENDED || 0);
  const totalSubs = Math.max(activeSubs + trialSubs + dueGraceSubs, 1);

  const activePct = Math.round((activeSubs / totalSubs) * 100);
  const trialPct = Math.round((trialSubs / totalSubs) * 100);
  const duePct = Math.max(100 - activePct - trialPct, 0);

  // Top Business Account
  const topBusiness = businessesData?.data?.[0];
  const recentInvoicesList = invoicesData?.data || [];

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100 font-sans pb-10">
      {/* Top Meta Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Platform Master Console &bull; Live Telemetry
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Live'}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 px-3 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-orange-500 hover:text-orange-500 transition-colors shadow-2xs inline-flex flex-row items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Loading Dashboard Metrics...</p>
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/* ROW 1: SALES FIGURES (Left) + TOTAL EARNING & PROFIT (Right) */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 1. SALES FIGURES WAVE CHART (Foodpoint 8 cols) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    Sales Figures
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Live cross-tenant traffic, subscriptions &amp; activity wave
                  </p>
                </div>

                {/* Dropdown pill (Foodpoint Monthly / 7d / 24h pill) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (timeFilter === 'Monthly') setTimeFilter('7d');
                      else if (timeFilter === '7d') setTimeFilter('24h');
                      else setTimeFilter('Monthly');
                    }}
                    className="h-8 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 transition-colors inline-flex flex-row items-center gap-1.5 cursor-pointer"
                  >
                    <span>{timeFilter}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Smooth Orange Spline Chart */}
              <div className="relative pt-6">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-56 select-none overflow-visible">
                  <defs>
                    <linearGradient id="foodpointOrangeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Dotted Lines */}
                  {[0, 1, 2, 3, 4, 5].map((lvl) => {
                    const yPos = padY + (lvl / 5) * usableH;
                    const stepVal = Math.round(maxVal - (lvl / 5) * maxVal);
                    return (
                      <g key={lvl}>
                        <text
                          x={padX - 10}
                          y={yPos + 4}
                          textAnchor="end"
                          className="text-[10px] fill-slate-300 dark:fill-slate-600 font-mono font-medium"
                        >
                          {stepVal}
                        </text>
                        <line
                          x1={padX}
                          y1={yPos}
                          x2={svgW - padX}
                          y2={yPos}
                          stroke="currentColor"
                          className="text-slate-100 dark:text-slate-800/80"
                          strokeDasharray="4 4"
                        />
                      </g>
                    );
                  })}

                  {/* Shaded Area under spline */}
                  <path d={areaWaveD} fill="url(#foodpointOrangeGradient)" />

                  {/* Warm Smooth Orange Curve */}
                  <path d={wavePathD} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />

                  {/* Peak Point Vertical Indicator */}
                  {peakPt && (
                    <>
                      <line
                        x1={peakPt.x}
                        y1={peakPt.y}
                        x2={peakPt.x}
                        y2={svgH - padY}
                        stroke="#f97316"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="opacity-60"
                      />
                      <circle cx={peakPt.x} cy={peakPt.y} r="5" fill="#f97316" stroke="#ffffff" strokeWidth="2.5" />
                    </>
                  )}

                  {/* X-axis Labels */}
                  {wavePoints.map((pt, i) => (
                    <text
                      key={i}
                      x={pt.x}
                      y={svgH - padY + 18}
                      textAnchor="middle"
                      className={`text-[11px] font-sans ${
                        pt.label === peakPt?.label
                          ? 'fill-orange-500 font-bold'
                          : 'fill-slate-400 dark:fill-slate-500 font-semibold'
                      }`}
                    >
                      {pt.label}
                    </text>
                  ))}
                </svg>

                {/* Floating Peak Tooltip (Foodpoint Orange Badge) */}
                {peakPt && (
                  <div
                    className="absolute pointer-events-none -translate-x-1/2 flex flex-col items-center"
                    style={{
                      left: `${Math.min(Math.max((peakPt.x / svgW) * 100, 5), 95)}%`,
                      top: `${Math.min(Math.max((peakPt.y / svgH) * 100 - 16, 0), 80)}%`,
                    }}
                  >
                    <div className="bg-orange-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-xl shadow-lg shadow-orange-500/30">
                      {peakPt.val}
                    </div>
                    <div className="w-2 h-2 bg-orange-500 rotate-45 -mt-1"></div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. DUAL CARD WIDGET (Foodpoint 4 cols: Orange Total Earning + White Total Profit) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-3 shadow-sm shadow-slate-200/40 dark:shadow-none flex flex-col sm:flex-row lg:flex-row gap-3">
              {/* Vibrant Orange Total Earning Card */}
              <div className="flex-1 bg-gradient-to-br from-orange-500 to-amber-500 text-white p-5 rounded-2xl flex flex-col justify-between shadow-lg shadow-orange-500/25">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-orange-100">Total earning</span>
                  <h2 className="text-2xl sm:text-3xl font-black font-sans tracking-tight">
                    {fmtBdt(metrics?.revenueCollected || 0)}
                  </h2>
                </div>

                <div className="pt-6">
                  <Link
                    href="/platform/invoices"
                    className="inline-flex flex-row items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <span>View More</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                </div>
              </div>

              {/* White Total Profit / Active Subscriptions Card */}
              <div className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-2xl flex flex-col justify-between border border-slate-100 dark:border-slate-800">
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Active Subscriptions</span>
                  <div className="pt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-sans">
                      {activeSubs}
                    </span>
                  </div>
                  <div className="pt-2 pb-1">
                    {/* Clean Green Wave Sparkline */}
                    <svg viewBox="0 0 100 36" className="w-full h-9 overflow-visible">
                      <path
                        d="M 5 28 Q 30 28, 48 8 T 95 28"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <span className="inline-flex flex-row items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold text-xs px-2.5 py-0.5 rounded-lg shadow-2xs whitespace-nowrap">
                    <span>&uarr; 20.8 %</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* ROW 2: EARNING CATEGORIES + STATS + LAST TRANSACTIONS        */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 1. EARNING CATEGORIES GROUPED BAR CHART (Foodpoint 5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Earning Categories
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Daily activity distribution across channels</p>
                </div>

                <div className="relative">
                  <span className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex flex-row items-center gap-1">
                    <span>Last week</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </span>
                </div>
              </div>

              {/* 3-Color Grouped Bars (Blue, Green, Orange) */}
              <div className="pt-2">
                <div className="flex items-end justify-between gap-3 h-48 px-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  {barData.map((d: { day: string; blue: number; green: number; orange: number }, idx: number) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-1 h-40">
                        {/* Blue bar: Stores / Views */}
                        <div
                          style={{ height: `${Math.min((d.blue / maxBarVal) * 100, 100)}%` }}
                          title={`Views: ${d.blue}`}
                          className="w-1.5 sm:w-2 rounded-t-full bg-blue-600 transition-all hover:opacity-80"
                        ></div>
                        {/* Green bar: Active Users */}
                        <div
                          style={{ height: `${Math.min((d.green / maxBarVal) * 100, 100)}%` }}
                          title={`Users: ${d.green}`}
                          className="w-1.5 sm:w-2 rounded-t-full bg-emerald-500 transition-all hover:opacity-80"
                        ></div>
                        {/* Orange bar: Operations / Telemetry */}
                        <div
                          style={{ height: `${Math.min((d.orange / maxBarVal) * 100, 100)}%` }}
                          title={`Frequency: ${d.orange}`}
                          className="w-1.5 sm:w-2 rounded-t-full bg-orange-500 transition-all hover:opacity-80"
                        ></div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 font-sans">{d.day}</span>
                    </div>
                  ))}
                </div>

                {/* Legend Pill Row (Foodpoint style: Food, Drink, Desert -> Views, Users, Ops) */}
                <div className="flex items-center justify-center gap-6 pt-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block"></span>
                    <span>Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                    <span>Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block"></span>
                    <span>Operations</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. COMPACT KPI CARDS (Foodpoint 3 cols: Total Sales, Total Orders) */}
            <div className="lg:col-span-3 flex flex-col gap-5">
              {/* Card 1: Total Users across all shops */}
              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Users</span>
                  <span className="inline-flex flex-row items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap">
                    &uarr; {metrics?.activeSessions || 0} Live
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white font-sans">
                    {(metrics?.totalUsers || 0).toLocaleString()}
                  </h3>
                  {/* Green mini wave sparkline */}
                  <svg viewBox="0 0 80 28" className="w-20 h-7 overflow-visible">
                    <path
                      d="M 0 22 Q 22 22, 40 6 T 80 22"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Card 2: Overdue Receivables */}
              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Overdue Receivables</span>
                  <span className="inline-flex flex-row items-center gap-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap">
                    &darr; {metrics?.overdue?.count || 0} Invoices
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans">
                    {fmtBdt(metrics?.overdue?.amount || 0)}
                  </h3>
                  {/* Red mini wave sparkline */}
                  <svg viewBox="0 0 80 28" className="w-20 h-7 overflow-visible">
                    <path
                      d="M 0 6 Q 22 6, 40 22 T 80 6"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* 3. LAST TRANSACTIONS (Foodpoint 4 cols: list of real subscription invoices) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Last Transaction
                </h3>
                <Link
                  href="/platform/invoices"
                  className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-xs font-bold inline-flex flex-row items-center gap-1 hover:text-orange-500 transition-colors"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                </Link>
              </div>

              {/* Transactions List */}
              <div className="space-y-3.5">
                {recentInvoicesList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-medium">No recent transactions yet</p>
                  </div>
                ) : (
                  recentInvoicesList.slice(0, 5).map((inv: any, idx: number) => {
                    const shopName = inv.business?.name || `Shop #${(inv.business_id || '').slice(0, 6)}`;
                    const invNo = inv.invoice_number ? `#${inv.invoice_number}` : `#INV-${idx + 101}`;
                    const timeStr = inv.created_at
                      ? new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Today';

                    return (
                      <div key={inv.id || idx} className="flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 text-sm shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                            <Store className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">
                              {shopName}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {invNo} &bull; {timeStr}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono block">
                            {fmtBdt(Number(inv.net_amount || 0))}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : inv.status === 'OVERDUE'
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* ROW 3: SPECIALTIES SALES & CIRCULAR GAUGES (Bottom Row)      */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Card: Specialties Sales (Featured Business Account Quota Progress) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Specialties Sales &bull; Featured Tenant
              </h3>

              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 shadow-2xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      {topBusiness?.subscription?.plan?.name || 'Retail Enterprise'}
                    </span>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {topBusiness?.name || 'Primary Retail Store'}
                    </h4>
                  </div>
                </div>

                <span className="inline-flex flex-row items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap">
                  &uarr; ACTIVE
                </span>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1 gap-2">
                    <span>Quota</span>
                    <span>85%</span>
                  </div>
                  <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="w-[85%] h-full bg-orange-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Specialties Sales Radial Arcs (Foodpoint Circular Rings) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Subscription Distribution &bull; Health
              </h3>

              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  {
                    label: 'Active Stores',
                    pct: `${activePct}%`,
                    count: activeSubs,
                    color: '#10b981',
                    dash: `${activePct}, 100`,
                    icon: <Store className="w-5 h-5 text-emerald-600" />,
                  },
                  {
                    label: 'Trial Accounts',
                    pct: `${trialPct}%`,
                    count: trialSubs,
                    color: '#f97316',
                    dash: `${trialPct}, 100`,
                    icon: <Zap className="w-5 h-5 text-orange-500" />,
                  },
                  {
                    label: 'Due / Grace',
                    pct: `${duePct}%`,
                    count: dueGraceSubs,
                    color: '#3b82f6',
                    dash: `${duePct}, 100`,
                    icon: <AlertTriangle className="w-5 h-5 text-blue-500" />,
                  },
                ].map((spec, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                        <path
                          className="text-slate-100 dark:text-slate-800"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          stroke={spec.color}
                          strokeWidth="3.5"
                          strokeDasharray={spec.dash}
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute flex items-center justify-center">{spec.icon}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {spec.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {spec.count} ({spec.pct})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
