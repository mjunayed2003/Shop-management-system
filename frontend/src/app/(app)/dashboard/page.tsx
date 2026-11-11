'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useOfflineStore } from '@/lib/store/offline-store';
import { usePermission } from '@/components/shared/PermissionGate';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomSelect } from '@/components/ui/custom-select';
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
  Package,
  Activity,
  ChevronDown,
  ArrowUpRight,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  ShoppingBag,
  Calendar,
  CalendarRange,
  Filter,
  X,
  RotateCcw,
  Undo2,
  ArrowDownLeft,
  FileText,
  Receipt,
  CheckCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { t, locale } = useTranslation();
  const currSym = locale === 'bn' ? '৳' : 'BDT';
  const queryClient = useQueryClient();
  const { user, business } = useAuthStore();
  const isOwner = Boolean(user?.isOwner);
  const { branches, currentBranch, currentBranchId, switchBranch } = useBranchStore();
  const { pendingCount } = useOfflineStore();
  const { hasPermission: canViewProfit } = usePermission(['report.view_profit', 'report.view']);

  // =========================================================================
  // REAL API FILTER STATES
  // =========================================================================
  const [{ todayStr, sevenDaysAgoStr }] = useState(() => {
    const now = Date.now();
    return {
      todayStr: new Date(now).toISOString().slice(0, 10),
      sevenDaysAgoStr: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };
  });

  const [period, setPeriod] = useState<string>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>(sevenDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const [activeTab, setActiveTab] = useState<'business' | 'cashier'>('business');
  const [activeChartPoint, setActiveChartPoint] = useState<number>(3); // Default index 3 (Apr)
  const [chartYear, setChartYear] = useState<string>('2026');
  const [chartMetric, setChartMetric] = useState<'all' | 'sales' | 'revenue' | 'profit'>('all');

  // Widget specific filters connected to real API queries
  const [productTimeframe, setProductTimeframe] = useState<string>('30d');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productStatusFilter, setProductStatusFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState<string>('');

  const [categoryTimeframe, setCategoryTimeframe] = useState<string>('30d');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [ordersTimeframe, setOrdersTimeframe] = useState<string>('30d');
  const [paymentsTimeframe, setPaymentsTimeframe] = useState<string>('30d');

  // =========================================================================
  // 1. Business / Management Dashboard - 100% REAL LIVE API
  // =========================================================================
  const {
    data: businessData,
    isLoading: isBusinessLoading,
    refetch: refetchBusiness,
    dataUpdatedAt: businessUpdatedAt,
  } = useQuery({
    queryKey: [
      'dashboards',
      'business',
      currentBranchId,
      canViewProfit,
      period,
      period === 'custom' ? customStartDate : '',
      period === 'custom' ? customEndDate : '',
      chartYear,
      productTimeframe,
      categoryTimeframe,
      ordersTimeframe,
      paymentsTimeframe,
    ],
    queryFn: () =>
      api.dashboards.business({
        branchId: currentBranchId || undefined,
        startDate: period === 'custom' ? customStartDate : undefined,
        endDate: period === 'custom' ? customEndDate : undefined,
        year: chartYear,
        period,
        productTimeframe,
        categoryTimeframe,
        ordersTimeframe,
        paymentsTimeframe,
      }),
    staleTime: 30000,
  });

  // =========================================================================
  // 2. Cashier Dashboard - 100% REAL LIVE API
  // =========================================================================
  const {
    data: cashierData,
    isLoading: isCashierLoading,
    refetch: refetchCashier,
  } = useQuery({
    queryKey: ['dashboards', 'cashier', currentBranchId, user?.id],
    queryFn: () => api.dashboards.cashier(),
    staleTime: 30000,
  });

  // =========================================================================
  // REAL API METRICS DATA
  // =========================================================================
  const metricData = useMemo(() => {
    const salesObj = (businessData?.sales as any)?.[period] || { revenue: 0, count: 0 };
    const expVal = (businessData?.expenses as any)?.[period] || 0;
    const profitObj = (businessData?.profit as any)?.[period] || { gross: 0, net: 0 };
    const returnsObj = (businessData?.returns as any)?.[period] || { revenue: 0, count: 0 };

    let label = 'this month';
    if (period === 'today') label = locale === 'bn' ? 'আজকের' : 'today';
    else if (period === 'thisWeek') label = locale === 'bn' ? 'এই সপ্তাহের' : 'this week';
    else if (period === 'thisMonth') label = locale === 'bn' ? 'এই মাসের' : 'this month';
    else if (period === 'last30Days') label = locale === 'bn' ? 'গত ৩০ দিনের' : 'last 30 days';
    else if (period === 'thisYear') label = locale === 'bn' ? 'এই বছরের' : 'this year';
    else if (period === 'custom') label = `${customStartDate} → ${customEndDate}`;

    return {
      sales: salesObj,
      expense: expVal,
      profit: profitObj,
      returns: returnsObj,
      label,
    };
  }, [period, customStartDate, customEndDate, businessData, locale]);

  const salesMetric = metricData.sales;
  const profitMetric = metricData.profit;
  const returnsMetric = metricData.returns;
  const netSalesRevenue = Math.max(0, salesMetric.revenue - returnsMetric.revenue);

  // Currency Formatter (BDT)
  const fmtCurrency = (num: number = 0) =>
    `${currSym} ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  // =========================================================================
  // MULTI-LINE SPLINE SVG MATH - 100% REAL DATABASE SALES RECORDS
  // =========================================================================
  const svgW = 860;
  const svgH = 260;
  const padX = 50;
  const padY = 35;
  const usableW = svgW - padX * 2;
  const usableH = svgH - padY * 2;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

  const monthlyData = useMemo(() => {
    const raw =
      businessData?.monthlyPerformance && businessData.monthlyPerformance.length === 12
        ? businessData.monthlyPerformance
        : months.map((m) => ({ month: m, sales: 0, revenue: 0, profit: 0, orders: 0 }));

    return raw.map((item: any) => ({
      month: item.month,
      sales: Number(item.sales) || 0,
      revenue: Number(item.revenue) || 0,
      profit: Number(item.profit) || 0,
      orders: Number(item.orders) || 0,
    }));
  }, [businessData?.monthlyPerformance]);

  const chartMax = Math.max(
    ...monthlyData.map((m) => Math.max(Number(m.sales) || 0, Number(m.revenue) || 0, Number(m.profit) || 0)),
    Math.max(Number(salesMetric.revenue) || 0, 10000)
  );

  const getPoints = (key: 'sales' | 'profit' | 'revenue') => {
    return monthlyData.map((item, i) => {
      const val = Number(item[key]) || 0;
      const ratio = chartMax > 0 ? Math.min(val / chartMax, 1) : 0;
      const x = padX + (i / (months.length - 1)) * usableW;
      const y = svgH - padY - ratio * usableH;
      return { x, y, val };
    });
  };

  const salesPoints = getPoints('sales');
  const profitPoints = getPoints('profit');
  const revenuePoints = getPoints('revenue');

  const createSplineD = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points.reduce((acc, pt, idx, arr) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = arr[idx - 1] || pt;
      const cpX1 = prev.x + (pt.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (pt.x - prev.x) / 2;
      const cpY2 = pt.y;
      return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${pt.y}`;
    }, '');
  };

  const salesPathD = createSplineD(salesPoints);
  const profitPathD = createSplineD(profitPoints);
  const revenuePathD = createSplineD(revenuePoints);
  const trafficPathD = profitPathD;

  const activeSalesPt = salesPoints[activeChartPoint] || salesPoints[3] || { x: 0, y: 0, val: 0 };

  // =========================================================================
  // TOP PRODUCTS - 100% REAL LIVE SALES QUERY
  // =========================================================================
  const rawTopProducts = useMemo(() => {
    return (businessData?.topProducts || []).map((p: any) => ({
      name: p.productName || 'Product',
      category: p.category || 'Clothing Retail',
      sold: Number(p.quantitySold) || 0,
      status: p.status || (p.currentStock > 5 ? 'In Stock' : p.currentStock > 0 ? 'Low Stock' : 'Out of Stock'),
    }));
  }, [businessData?.topProducts]);

  // Distinct categories for product filter dropdown
  const distinctCategories = useMemo(() => {
    const cats = new Set<string>();
    rawTopProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [rawTopProducts]);

  // Client-side instant refinement (search, category, status)
  const filteredProductsList = useMemo(() => {
    return rawTopProducts.filter((p) => {
      if (productCategoryFilter !== 'all' && p.category !== productCategoryFilter) return false;
      if (productStatusFilter !== 'all' && p.status !== productStatusFilter) return false;
      if (
        productSearch.trim() &&
        !p.name.toLowerCase().includes(productSearch.toLowerCase().trim()) &&
        !p.category.toLowerCase().includes(productSearch.toLowerCase().trim())
      ) {
        return false;
      }
      return true;
    });
  }, [rawTopProducts, productCategoryFilter, productStatusFilter, productSearch]);

  // =========================================================================
  // CATEGORY SALES DISTRIBUTION - 100% REAL LIVE DATA
  // =========================================================================
  const categoryData = useMemo(() => {
    const raw = businessData?.categoryDistribution || [];
    const maxVal = Math.max(...raw.map((c: any) => Math.max(Number(c.sales) || 0, Number(c.revenue) || 0)), 1);

    return raw.map((c: any) => ({
      name: c.name || 'Category',
      salesVal: Number(c.sales) || 0,
      revenueVal: Number(c.revenue) || 0,
      sales: maxVal > 0 ? Math.min(Math.round(((Number(c.sales) || 0) / maxVal) * 100), 100) : 0,
      revenue: maxVal > 0 ? Math.min(Math.round(((Number(c.revenue) || 0) / maxVal) * 100), 100) : 0,
    }));
  }, [businessData?.categoryDistribution]);

  // =========================================================================
  // DONUT 1: PRODUCTS OVERVIEW - 100% REAL STOCK BALANCES
  // =========================================================================
  const totalStockCount = Number(businessData?.totalProducts ?? businessData?.stockOverview?.total ?? 0);
  const inStockCount = Number(businessData?.stockOverview?.inStock ?? 0);
  const lowStockCount = Number(businessData?.stockOverview?.lowStock ?? businessData?.lowStockCount ?? 0);
  const outOfStockCount = Number(businessData?.stockOverview?.outOfStock ?? 0);

  const displayedStockCount = useMemo(() => {
    if (stockFilter === 'in_stock') return inStockCount;
    if (stockFilter === 'low_stock') return lowStockCount;
    if (stockFilter === 'out_of_stock') return outOfStockCount;
    return totalStockCount;
  }, [stockFilter, inStockCount, lowStockCount, outOfStockCount, totalStockCount]);

  const inStockPct = totalStockCount > 0 ? Math.round((inStockCount / totalStockCount) * 100) : 0;
  const lowStockPct = totalStockCount > 0 ? Math.round((lowStockCount / totalStockCount) * 100) : 0;
  const outOfStockPct = totalStockCount > 0 ? Math.max(0, 100 - inStockPct - lowStockPct) : 0;

  const donutR = 56;
  const donutCirc = 2 * Math.PI * donutR; // ~351.85
  const inStockStroke = (inStockPct / 100) * donutCirc;
  const lowStockStroke = (lowStockPct / 100) * donutCirc;
  const outOfStockStroke = (outOfStockPct / 100) * donutCirc;

  // =========================================================================
  // DONUT 2: ORDERS OVERVIEW - 100% REAL LIVE ORDERS FROM PRISMA
  // =========================================================================
  const totalOrdersCount = Number(businessData?.ordersOverview?.total ?? businessData?.totalOrders ?? 0);
  const ordCompletedCount = Number(businessData?.ordersOverview?.completed ?? 0);
  const ordRefundedCount = Number(businessData?.ordersOverview?.refunded ?? 0);

  const ordCompletedPct = totalOrdersCount > 0 ? Math.round((ordCompletedCount / totalOrdersCount) * 100) : 0;
  const ordRefundedPct = totalOrdersCount > 0 ? Math.round((ordRefundedCount / totalOrdersCount) * 100) : 0;
  const ordInProgressPct = Math.max(0, 100 - ordCompletedPct - ordRefundedPct);

  const ordCompletedStroke = (ordCompletedPct / 100) * donutCirc;
  const ordRefundedStroke = (ordRefundedPct / 100) * donutCirc;
  const ordInProgressStroke = (ordInProgressPct / 100) * donutCirc;
  const ordCancelledStroke = ordRefundedStroke;

  // =========================================================================
  // PAYMENT CHANNELS - 100% REAL SALE PAYMENTS FROM PRISMA
  // =========================================================================
  const paymentSources = useMemo(() => {
    const raw = businessData?.paymentChannels || [];
    if (raw.length === 0) {
      return [
        { label: 'CASH', height: 0, val: `${currSym} 0` },
        { label: 'BKASH', height: 0, val: `${currSym} 0` },
        { label: 'NAGAD', height: 0, val: `${currSym} 0` },
        { label: 'CARD', height: 0, val: `${currSym} 0` },
      ];
    }
    const maxVal = Math.max(...raw.map((p: any) => Number(p.amount) || 0), 1);
    return raw.map((p: any) => ({
      label: p.label,
      height: maxVal > 0 ? Math.max(Math.round(((Number(p.amount) || 0) / maxVal) * 100), 10) : 0,
      val: fmtCurrency(Number(p.amount) || 0),
    }));
  }, [businessData?.paymentChannels, currSym]);

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100 font-sans pb-12">
      {/* ==================================================================== */}
      {/* TOP HEADER: Store Name & Mode Switcher + Live Refresh                */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {currentBranch?.name || business?.name || 'Store Dashboard'}
            </h1>
            {isOwner && (
              <Badge className="bg-[#3b7987]/10 dark:bg-[#3b7987]/20 text-[#3b7987] dark:text-[#52a7b7] border border-[#3b7987]/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Multi-Branch Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time sales velocity, revenue overview, order fulfillment, and stock telemetry
          </p>
        </div>

        {/* Right Topbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dashboard Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('business')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'business'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Management View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cashier')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'cashier'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cashier Shift
            </button>
          </div>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              refetchBusiness();
              refetchCashier();
            }}
            className="text-xs h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 hover:border-[#3b7987] hover:text-[#3b7987] bg-white dark:bg-slate-900 shadow-2xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isBusinessLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {activeTab === 'business' ? (
        /* ================================================================== */
        /* ==================== MANAGEMENT / EXECUTIVE VIEW ================= */
        /* ================================================================== */
        <div className="space-y-6">
          {/* ================================================================ */}
          {/* PERIOD FILTER CONTROLS: CustomSelect + Quick Pills + Date Range   */}
          {/* ================================================================ */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left: Custom Select for Timeframe Filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <Filter className="w-3.5 h-3.5 text-[#3b7987] dark:text-[#52a7b7]" />
                  <span>{locale === 'bn' ? 'সময়কাল ফিল্টার:' : 'Period Filter:'}</span>
                </div>

                {/* Main Custom Select Component */}
                <CustomSelect
                  value={period}
                  onChange={(val) => setPeriod(val)}
                  size="sm"
                  options={[
                    { value: 'today', label: locale === 'bn' ? 'আজকের (Today)' : 'Today', icon: Calendar },
                    { value: 'thisWeek', label: locale === 'bn' ? 'এই সপ্তাহের (This Week)' : 'This Week', icon: Calendar },
                    { value: 'thisMonth', label: locale === 'bn' ? 'এই মাসের (This Month)' : 'This Month', icon: Calendar },
                    { value: 'last30Days', label: locale === 'bn' ? 'গত ৩০ দিন (Last 30 Days)' : 'Last 30 Days', icon: Calendar },
                    { value: 'thisYear', label: locale === 'bn' ? 'এই বছরের (This Year)' : 'This Year', icon: Calendar },
                    { value: 'custom', label: locale === 'bn' ? 'কাস্টম সময়সীমা (Custom Range)' : 'Custom Range', icon: CalendarRange },
                  ]}
                />

                {/* Quick Selection Pills */}
                <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPeriod('today')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      period === 'today'
                        ? 'bg-[#c2d4d4] dark:bg-[#2c4246] text-slate-900 dark:text-slate-50 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('thisWeek')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      period === 'thisWeek'
                        ? 'bg-[#c2d4d4] dark:bg-[#2c4246] text-slate-900 dark:text-slate-50 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('thisMonth')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      period === 'thisMonth'
                        ? 'bg-[#c2d4d4] dark:bg-[#2c4246] text-slate-900 dark:text-slate-50 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('last30Days')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      period === 'last30Days'
                        ? 'bg-[#c2d4d4] dark:bg-[#2c4246] text-slate-900 dark:text-slate-50 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('custom')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      period === 'custom'
                        ? 'bg-[#c2d4d4] dark:bg-[#2c4246] text-slate-900 dark:text-slate-50 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Right: Live Sync Status */}
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3b7987] animate-pulse"></span>
                <span>
                  Active Period: <strong className="text-slate-700 dark:text-slate-200">{metricData.label}</strong>
                </span>
                <span className="hidden xl:inline text-slate-300 dark:text-slate-700">|</span>
                <span className="hidden xl:inline">
                  Updated: {businessUpdatedAt ? new Date(businessUpdatedAt).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            </div>

            {/* Custom Date Range Picker Inputs (Revealed when period === 'custom') */}
            {period === 'custom' && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500">{locale === 'bn' ? 'শুরুর তারিখ:' : 'From:'}</span>
                  <input
                    type="date"
                    value={customStartDate}
                    max={customEndDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3b7987]/30 focus:border-[#3b7987]"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500">{locale === 'bn' ? 'শেষ তারিখ:' : 'To:'}</span>
                  <input
                    type="date"
                    value={customEndDate}
                    min={customStartDate}
                    max={todayStr}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3b7987]/30 focus:border-[#3b7987]"
                  />
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCustomStartDate(sevenDaysAgoStr);
                    setCustomEndDate(todayStr);
                  }}
                  className="h-8 px-2 text-xs text-slate-500 hover:text-[#3b7987]"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* 1. TOP METRICS: 8 CARDS (4 COLS x 2 ROWS GRID)                   */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Total Sales */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Sales</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                    {fmtCurrency(salesMetric.revenue)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#3b7987]/10 dark:bg-[#3b7987]/20 text-[#3b7987] dark:text-[#52a7b7] flex items-center justify-center font-bold text-sm shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Sales revenue for <span className="text-slate-600 dark:text-slate-300 font-semibold">{metricData.label}</span>
              </p>
            </div>

            {/* Card 2: Total Revenue / Gross */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Revenue</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                    {profitMetric ? fmtCurrency(profitMetric.gross) : fmtCurrency(salesMetric.revenue)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#3b7987]/10 dark:bg-[#3b7987]/20 text-[#3b7987] dark:text-[#52a7b7] flex items-center justify-center font-bold text-sm shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Gross inflow recorded for <span className="text-slate-600 dark:text-slate-300 font-semibold">{metricData.label}</span>
              </p>
            </div>

            {/* Card 3: Total Returns & Refunds */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/50 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[120px] group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Total Returns</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      {returnsMetric.count} {locale === 'bn' ? 'টি' : 'returns'}
                    </Badge>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight mt-1">
                    {fmtCurrency(returnsMetric.revenue)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                <span>Refunded in <span className="text-slate-600 dark:text-slate-300 font-semibold">{metricData.label}</span></span>
                <Link href="/sales/returns" className="text-amber-600 dark:text-amber-400 hover:underline font-bold text-[10px]">
                  Details →
                </Link>
              </div>
            </div>

            {/* Card 4: Net Revenue (Sales minus Returns) */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/70 dark:border-emerald-900/50 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Net Revenue</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
                    {fmtCurrency(netSalesRevenue)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Net sales after refund deductions
              </p>
            </div>

            {/* Card 5: Total Orders */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Orders</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                    {salesMetric.count.toLocaleString()}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#3b7987]/10 dark:bg-[#3b7987]/20 text-[#3b7987] dark:text-[#52a7b7] flex items-center justify-center font-bold text-sm shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Completed invoices in <span className="text-slate-600 dark:text-slate-300 font-semibold">{metricData.label}</span>
              </p>
            </div>

            {/* Card 6: Total Products */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Products</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                    {totalStockCount.toLocaleString()}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#3b7987]/10 dark:bg-[#3b7987]/20 text-[#3b7987] dark:text-[#52a7b7] flex items-center justify-center font-bold text-sm shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Active catalog SKUs across inventory
              </p>
            </div>

            {/* Card 7: Customers & Receivables */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Customers</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
                    {(businessData?.totalCustomers || 0).toLocaleString()}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#3b7987]/10 dark:bg-[#3b7987]/20 text-[#3b7987] dark:text-[#52a7b7] flex items-center justify-center font-bold text-sm shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Registered clients ({fmtCurrency(businessData?.receivables || 0)} dues)
              </p>
            </div>

            {/* Card 8: Store Health / Low Stock Alert */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-md transition-shadow relative flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Low Stock Alert</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight mt-1">
                    {(businessData?.lowStockCount || 0).toLocaleString()}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                Items currently at or below minimum reorder threshold
              </p>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 2. PERFORMANCE OVERVIEW: MULTI-SPLINE CURVE CHART                */}
          {/* ================================================================ */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Performance Overview
                </h3>
                <p className="text-[11px] text-slate-400">
                  Annual 12-month metrics trend for year {chartYear} from database
                </p>
              </div>

              {/* Legends & Interactive CustomSelect Filters */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setChartMetric(chartMetric === 'sales' ? 'all' : 'sales')}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer ${
                      chartMetric === 'sales' || chartMetric === 'all'
                        ? 'text-slate-800 dark:text-slate-200 font-bold'
                        : 'opacity-40'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3b7987]"></span>
                    <span>Sales</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChartMetric(chartMetric === 'revenue' ? 'all' : 'revenue')}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer ${
                      chartMetric === 'revenue' || chartMetric === 'all'
                        ? 'text-slate-800 dark:text-slate-200 font-bold'
                        : 'opacity-40'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span>
                    <span>Revenue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChartMetric(chartMetric === 'profit' ? 'all' : 'profit')}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer ${
                      chartMetric === 'profit' || chartMetric === 'all'
                        ? 'text-slate-800 dark:text-slate-200 font-bold'
                        : 'opacity-40'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]"></span>
                    <span>Profit</span>
                  </button>
                </div>

                {/* Custom Select for Year Filter */}
                <CustomSelect
                  value={chartYear}
                  onChange={(val) => setChartYear(val)}
                  size="xs"
                  options={[
                    { value: '2026', label: 'Year 2026' },
                    { value: '2025', label: 'Year 2025' },
                    { value: '2024', label: 'Year 2024' },
                    { value: '2023', label: 'Year 2023' },
                  ]}
                />
              </div>
            </div>

            {/* SVG Spline Chart */}
            <div className="relative pt-2">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-64 select-none overflow-visible">
                {/* Horizontal Dotted Grid Lines */}
                {[0, 1, 2, 3, 4, 5].map((lvl) => {
                  const yPos = padY + (lvl / 5) * usableH;
                  const stepVal = Math.round(chartMax - (lvl / 5) * chartMax);
                  return (
                    <g key={lvl}>
                      <text
                        x={padX - 12}
                        y={yPos + 4}
                        textAnchor="end"
                        className="text-[10px] fill-slate-300 dark:fill-slate-600 font-mono font-medium"
                      >
                        {currSym} {Math.round(stepVal / 1000)}K
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

                {/* Right Axis Tick Labels */}
                {[0, 1, 2, 3, 4, 5].map((lvl) => {
                  const yPos = padY + (lvl / 5) * usableH;
                  const rightVal = Math.round(25 - (lvl / 5) * 25);
                  return (
                    <text
                      key={lvl}
                      x={svgW - padX + 12}
                      y={yPos + 4}
                      textAnchor="start"
                      className="text-[10px] fill-slate-300 dark:fill-slate-600 font-mono font-medium"
                    >
                      {rightVal}K
                    </text>
                  );
                })}

                {/* Vertical Dotted Indicator for Active Month */}
                {activeSalesPt && (
                  <line
                    x1={activeSalesPt.x}
                    y1={padY}
                    x2={activeSalesPt.x}
                    y2={svgH - padY}
                    stroke="#3b7987"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="opacity-40"
                  />
                )}

                {/* Curve 1: Slate Profit Wave */}
                {(chartMetric === 'all' || chartMetric === 'profit') && (
                  <path d={trafficPathD} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                )}

                {/* Curve 2: Rose Revenue Wave */}
                {(chartMetric === 'all' || chartMetric === 'revenue') && (
                  <path d={revenuePathD} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                )}

                {/* Curve 3: Teal Brand Sales Wave */}
                {(chartMetric === 'all' || chartMetric === 'sales') && (
                  <path d={salesPathD} fill="none" stroke="#3b7987" strokeWidth="3.5" strokeLinecap="round" />
                )}

                {/* Active Indicator Point Dots */}
                {activeSalesPt && (
                  <circle
                    cx={activeSalesPt.x}
                    cy={activeSalesPt.y}
                    r="5"
                    fill="#3b7987"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="shadow-md"
                  />
                )}

                {/* Month X-Axis Ticks */}
                {salesPoints.map((pt, i) => (
                  <text
                    key={i}
                    x={pt.x}
                    y={svgH - padY + 20}
                    textAnchor="middle"
                    onClick={() => setActiveChartPoint(i)}
                    className={`text-[11px] font-sans cursor-pointer transition-colors ${
                      i === activeChartPoint
                        ? 'fill-[#3b7987] font-bold'
                        : 'fill-slate-400 dark:fill-slate-500 font-semibold hover:fill-slate-700'
                    }`}
                  >
                    {months[i]}
                  </text>
                ))}
              </svg>

              {/* Tooltip Card over active point */}
              {activeSalesPt && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-200"
                  style={{
                    left: `${Math.min(Math.max((activeSalesPt.x / svgW) * 100, 8), 92)}%`,
                    top: `${Math.max((activeSalesPt.y / svgH) * 100 - 18, 0)}%`,
                  }}
                >
                  <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg">
                    {months[activeChartPoint]} ({chartYear}): {currSym} {(activeSalesPt.val).toLocaleString()}
                  </div>
                  <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* 3. ROW 3: TOP SELLING PRODUCTS + CATEGORY BREAKDOWN              */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Top Selling Products Table (Left 8 Cols) */}
            <div className="lg:col-span-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Top Selling Products
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Showing {filteredProductsList.length} products from live sales
                  </p>
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-8 pl-8 pr-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3b7987]/30 focus:border-[#3b7987] w-28 sm:w-36 transition-all"
                    />
                  </div>

                  {/* Category Filter */}
                  {distinctCategories.length > 0 && (
                    <CustomSelect
                      value={productCategoryFilter}
                      onChange={(val) => setProductCategoryFilter(val)}
                      size="xs"
                      options={[
                        { value: 'all', label: 'All Categories' },
                        ...distinctCategories.map((c) => ({ value: c, label: c })),
                      ]}
                    />
                  )}

                  {/* Status Filter */}
                  <CustomSelect
                    value={productStatusFilter}
                    onChange={(val) => setProductStatusFilter(val)}
                    size="xs"
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'In Stock', label: 'In Stock' },
                      { value: 'Low Stock', label: 'Low Stock' },
                      { value: 'Out of Stock', label: 'Out of Stock' },
                    ]}
                  />

                  {/* Timeframe Filter */}
                  <CustomSelect
                    value={productTimeframe}
                    onChange={(val) => setProductTimeframe(val)}
                    size="xs"
                    options={[
                      { value: '7d', label: '7 Days' },
                      { value: '30d', label: '30 Days' },
                      { value: '90d', label: '90 Days' },
                      { value: 'year', label: 'This Year' },
                      { value: 'all', label: 'All Time' },
                    ]}
                  />

                  <Link
                    href="/products"
                    className="h-8 px-3 rounded-xl bg-[#3b7987] hover:bg-[#326975] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Clean Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Product Name</th>
                      <th className="pb-3 font-semibold">Category</th>
                      <th className="pb-3 font-semibold">Quantity Sold</th>
                      <th className="pb-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {filteredProductsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-xs text-slate-400 font-medium">
                          No products match the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredProductsList.map((prod, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">
                            {prod.name}
                          </td>
                          <td className="py-3.5 text-slate-500 dark:text-slate-400 font-medium">
                            {prod.category}
                          </td>
                          <td className="py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            {prod.sold.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-right">
                            <span
                              className={`inline-block text-[11px] font-bold ${
                                prod.status === 'In Stock'
                                  ? 'text-emerald-500'
                                  : prod.status === 'Low Stock'
                                  ? 'text-amber-500'
                                  : 'text-rose-500'
                              }`}
                            >
                              {prod.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales Distribution by Category (Right 4 Cols) */}
            <div className="lg:col-span-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Category Distribution
                  </h3>

                  {/* CustomSelect Timeframe Filter */}
                  <CustomSelect
                    value={categoryTimeframe}
                    onChange={(val) => setCategoryTimeframe(val)}
                    size="xs"
                    options={[
                      { value: 'today', label: 'Today' },
                      { value: '7d', label: '7 Days' },
                      { value: '30d', label: '30 Days' },
                      { value: '90d', label: '90 Days' },
                      { value: 'year', label: 'This Year' },
                    ]}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold mt-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-[#3b7987]"></span>
                      <span>Sales</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                      <span>Revenue</span>
                    </span>
                  </div>
                  <span className="text-slate-400 font-medium">Live Aggregation</span>
                </div>
              </div>

              {/* Dual Bar Chart */}
              <div className="h-48 flex items-end justify-between gap-3 pt-4 pb-1 border-b border-slate-100 dark:border-slate-800">
                {categoryData.length === 0 ? (
                  <div className="w-full text-center text-xs text-slate-400 py-12">
                    No category data available
                  </div>
                ) : (
                  categoryData.map((cat, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="flex items-end gap-1 h-full">
                        {/* Teal Bar (Sales) */}
                        <div
                          style={{ height: `${cat.sales}%` }}
                          className="w-2.5 rounded-t-sm bg-[#3b7987] group-hover:bg-[#326975] transition-all"
                          title={`${cat.name} Sales: ${cat.salesVal}`}
                        />
                        {/* Rose Bar (Revenue) */}
                        <div
                          style={{ height: `${cat.revenue}%` }}
                          className="w-2.5 rounded-t-sm bg-[#f43f5e] group-hover:bg-[#e11d48] transition-all"
                          title={`${cat.name} Revenue: ${fmtCurrency(cat.revenueVal)}`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Category labels below bars */}
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                {categoryData.map((c, i) => (
                  <span key={i} className="truncate max-w-[45px] text-center" title={c.name}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 4. ROW 4: BOTTOM 3 WIDGETS (DONUTS & BAR CHART)                  */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Widget 1: Products Overview (Donut Chart) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Products Overview
                </h3>

                {/* CustomSelect Stock Filter */}
                <CustomSelect
                  value={stockFilter}
                  onChange={(val) => setStockFilter(val)}
                  size="xs"
                  options={[
                    { value: 'all', label: 'All Stock' },
                    { value: 'in_stock', label: 'In Stock' },
                    { value: 'low_stock', label: 'Low Stock' },
                    { value: 'out_of_stock', label: 'Out of Stock' },
                  ]}
                />
              </div>

              {/* Circular Donut Gauge */}
              <div className="relative flex items-center justify-center py-2">
                <svg width="150" height="150" viewBox="0 0 150 150" className="rotate-[-90deg]">
                  {/* Background Track */}
                  <circle
                    cx="75"
                    cy="75"
                    r={donutR}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="14"
                    className="dark:stroke-slate-800"
                  />
                  {/* Arc 1: In Stock (Emerald) */}
                  <circle
                    cx="75"
                    cy="75"
                    r={donutR}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray={`${inStockStroke} ${donutCirc}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Arc 2: Low Stock (Teal) */}
                  <circle
                    cx="75"
                    cy="75"
                    r={donutR}
                    fill="none"
                    stroke="#3b7987"
                    strokeWidth="14"
                    strokeDasharray={`${lowStockStroke} ${donutCirc}`}
                    strokeDashoffset={`-${inStockStroke}`}
                    strokeLinecap="round"
                  />
                  {/* Arc 3: Out of Stock (Rose) */}
                  <circle
                    cx="75"
                    cy="75"
                    r={donutR}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="14"
                    strokeDasharray={`${outOfStockStroke} ${donutCirc}`}
                    strokeDashoffset={`-${inStockStroke + lowStockStroke}`}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center text */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {displayedStockCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium capitalize">
                    {stockFilter === 'all' ? 'Total Products' : stockFilter.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Legend Bottom */}
              <div className="flex items-center justify-center gap-3.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                  <span>In Stock - {inStockPct}%</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3b7987]"></span>
                  <span>Low - {lowStockPct}%</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                  <span>Out - {outOfStockPct}%</span>
                </span>
              </div>
            </div>

            {/* Widget 2: Orders Overview (Donut Chart) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Orders Overview
                </h3>

                {/* CustomSelect Orders Timeframe Filter */}
                <CustomSelect
                  value={ordersTimeframe}
                  onChange={(val) => setOrdersTimeframe(val)}
                  size="xs"
                  options={[
                    { value: 'today', label: 'Today' },
                    { value: '7d', label: '7 Days' },
                    { value: '30d', label: '30 Days' },
                    { value: 'month', label: 'This Month' },
                    { value: 'year', label: 'This Year' },
                  ]}
                />
              </div>

              {/* Circular Donut Gauge */}
              <div className="relative flex items-center justify-center py-2">
                <svg width="150" height="150" viewBox="0 0 150 150" className="rotate-[-90deg]">
                  {/* Background Track */}
                  <circle
                    cx="75"
                    cy="75"
                    r={donutR}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="14"
                    className="dark:stroke-slate-800"
                  />
                  {/* Arc 1: Completed (Emerald) */}
                  <circle
                    cx="75"
                    cy="75"
                    r={donutR}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="14"
                    strokeDasharray={`${ordCompletedStroke} ${donutCirc}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Arc 2: Active / In-Store (Teal) */}
                  <circle
                    cx="75"
                    cy="75"
                    r={donutR}
                    fill="none"
                    stroke="#3b7987"
                    strokeWidth="14"
                    strokeDasharray={`${ordInProgressStroke} ${donutCirc}`}
                    strokeDashoffset={`-${ordCompletedStroke}`}
                    strokeLinecap="round"
                  />
                  {/* Arc 3: Cancelled / Refunded (Rose) */}
                  <circle
                    cx="75"
                    cy="75"
                    r={donutR}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="14"
                    strokeDasharray={`${ordCancelledStroke} ${donutCirc}`}
                    strokeDashoffset={`-${ordCompletedStroke + ordInProgressStroke}`}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center text */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {totalOrdersCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Orders ({ordersTimeframe})</span>
                </div>
              </div>

              {/* Legend Bottom */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                  <span>Done - {ordCompletedPct}%</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3b7987]"></span>
                  <span>Active - {ordInProgressPct}%</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                  <span>Refund - {ordRefundedPct}%</span>
                </span>
              </div>
            </div>

            {/* Widget 3: Traffic Sources / Tender Payment Breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Payment Channels
                </h3>

                {/* CustomSelect Payments Timeframe Filter */}
                <CustomSelect
                  value={paymentsTimeframe}
                  onChange={(val) => setPaymentsTimeframe(val)}
                  size="xs"
                  options={[
                    { value: 'today', label: 'Today' },
                    { value: '7d', label: '7 Days' },
                    { value: '30d', label: '30 Days' },
                    { value: 'month', label: 'This Month' },
                    { value: 'year', label: 'This Year' },
                  ]}
                />
              </div>

              {/* Clean Vertical Bar Chart */}
              <div className="h-36 flex items-end justify-between gap-3 pt-3 border-b border-slate-100 dark:border-slate-800">
                {paymentSources.map((source, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="text-[10px] font-mono text-slate-400 group-hover:text-[#3b7987] opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                      {source.val}
                    </div>
                    <div
                      style={{ height: `${source.height}%` }}
                      className="w-full max-w-[24px] rounded-t-md bg-[#3b7987] group-hover:bg-[#326975] transition-all cursor-pointer"
                      title={`${source.label}: ${source.val}`}
                    />
                  </div>
                ))}
              </div>

              {/* Source Labels */}
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1">
                {paymentSources.map((s, i) => (
                  <span key={i} className="truncate max-w-[50px] text-center" title={s.label}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 5. RETURNS & REFUNDS DETAILED AUDIT & RECENT ACTIVITY            */}
          {/* ================================================================ */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <span>Returns &amp; Refunds Overview ({locale === 'bn' ? 'পণ্য ফেরত ও রিফান্ড সংক্রান্ত তথ্য' : 'Customer & Supplier Returns'})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Audit trail of restocked goods, damaged write-offs, customer refunds, and supplier returns
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="text-xs h-8 px-3 rounded-xl border-slate-200 dark:border-slate-800 font-bold hover:border-[#3b7987] hover:text-[#3b7987]">
                  <Link href="/sales/returns">
                    <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    <span>Customer Returns</span>
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="text-xs h-8 px-3 rounded-xl border-slate-200 dark:border-slate-800 font-bold hover:border-[#3b7987] hover:text-[#3b7987]">
                  <Link href="/purchases/returns">
                    <Undo2 className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                    <span>Supplier Returns</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Return Health Mini Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Stat 1: Resellable Goods */}
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    {locale === 'bn' ? 'পুনরায় বিক্রয়যোগ্য স্টক' : 'Resellable Goods'}
                  </span>
                  <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                    {(businessData?.returnsOverview?.resellableItemsCount || 0).toLocaleString()} <span className="text-xs font-semibold">pcs</span>
                  </div>
                  <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/80 mt-1">
                    Returned in good shape &amp; restocked to branch ledger
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>

              {/* Stat 2: Damaged / Defect Items */}
              <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                    {locale === 'bn' ? 'ক্ষতিগ্রস্ত / ডিফেক্ট পণ্য' : 'Damaged / Defect Items'}
                  </span>
                  <div className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-0.5">
                    {(businessData?.returnsOverview?.damagedItemsCount || 0).toLocaleString()} <span className="text-xs font-semibold">pcs</span>
                  </div>
                  <p className="text-[11px] text-rose-600/90 dark:text-rose-400/80 mt-1">
                    Written-off &amp; isolated from active inventory
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>

              {/* Stat 3: Supplier Purchase Returns */}
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                    {locale === 'bn' ? 'সাপ্লায়ার ক্রয় ফেরত' : 'Supplier Purchase Returns'}
                  </span>
                  <div className="text-2xl font-black text-indigo-800 dark:text-indigo-300 mt-0.5">
                    {(businessData?.returnsOverview?.purchaseReturnsCount || 0).toLocaleString()} <span className="text-xs font-semibold">({fmtCurrency(businessData?.returnsOverview?.purchaseReturnsAmount || 0)})</span>
                  </div>
                  <p className="text-[11px] text-indigo-600/90 dark:text-indigo-400/80 mt-1">
                    Goods returned back to vendor with debit notes
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <Undo2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Recent Returns Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {locale === 'bn' ? 'সর্বশেষ ৫টি পণ্য ফেরতের বিবরণ (Recent Sales Returns)' : 'Recent Sales Returns Activity'}
                </span>
                <Link href="/sales/returns" className="text-xs font-bold text-[#3b7987] hover:underline flex items-center gap-1">
                  <span>View Full Return Audit Trail</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Return No</th>
                      <th className="py-2.5 px-3">Orig. Invoice</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Items Returned</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">Refund Amount</th>
                      <th className="py-2.5 px-3 text-center">Date</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {(!businessData?.returnsOverview?.recentReturns || businessData.returnsOverview.recentReturns.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          <RotateCcw className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                          <p className="font-semibold">No returns recorded in this branch yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Customer sales returns will automatically appear here with full audit history.</p>
                        </td>
                      </tr>
                    ) : (
                      businessData.returnsOverview.recentReturns.map((ret: any) => (
                        <tr key={ret.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {ret.returnNo}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {ret.invoiceNo}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{ret.customerName}</div>
                            {ret.customerPhone && (
                              <div className="text-[10px] text-slate-400 font-mono">{ret.customerPhone}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{ret.itemCount} pcs</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {ret.items?.slice(0, 2).map((it: any, idx: number) => (
                                <span
                                  key={idx}
                                  className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                    it.condition === 'DAMAGED'
                                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  }`}
                                >
                                  {it.productName} ({it.quantity})
                                </span>
                              ))}
                              {ret.items?.length > 2 && (
                                <span className="text-[9px] text-slate-400">+{ret.items.length - 2} more</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                              {ret.refundMethod}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 dark:text-rose-400">
                            {fmtCurrency(ret.refundAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(ret.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px] font-bold text-[#3b7987] hover:text-[#326975]">
                              <Link href={`/sales/returns/${ret.id}`}>
                                View Slip
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================================================================== */
        /* ==================== CASHIER SHIFT VIEW ========================== */
        /* ================================================================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Active Session Status */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Register Shift Status</span>
              {cashierData?.activeSession ? (
                <div className="space-y-2">
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>OPEN ({cashierData.activeSession.registerName})</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Opened at: <strong>{cashierData.activeSession.openedAt ? new Date(cashierData.activeSession.openedAt).toLocaleTimeString() : 'N/A'}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    Opening float:{' '}
                    <strong>{fmtCurrency(Number(cashierData.activeSession.openingBalance || 0))}</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="text-sm font-bold text-amber-600">No Open Shift Active</div>
                  <Button asChild size="sm" className="text-xs h-9 bg-[#3b7987] hover:bg-[#326975] text-white rounded-xl font-bold shadow-xs">
                    <Link href="/pos">Open Shift in POS Counter</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Today Sales Count */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Sales Count Today</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                {(cashierData?.today?.salesCount || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 pt-1 font-medium">Total retail invoices generated during shift</p>
            </div>

            {/* Today Sales Amount */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Sales Total ({currSym})</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {fmtCurrency(cashierData?.today?.salesAmount || 0)}
              </div>
              <p className="text-xs text-slate-400 pt-1 font-medium">Net cash &amp; digital collections processed</p>
            </div>

            {/* Today Returns Processed */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/50 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">My Returns Today</span>
              <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {(cashierData?.today?.returnsCount || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">({fmtCurrency(cashierData?.today?.refundAmount || 0)})</span>
              </div>
              <p className="text-xs text-slate-400 pt-1 font-medium">Customer refunds processed during shift</p>
            </div>
          </div>

          {/* Quick Action Links for Cashier */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" className="bg-[#3b7987] hover:bg-[#326975] text-white text-xs h-10 px-4 rounded-xl font-bold shadow-2xs cursor-pointer">
              <Link href="/pos">
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                <span>Go to POS Terminal</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold hover:border-[#3b7987] hover:text-[#3b7987] cursor-pointer">
              <Link href="/sales/returns">
                <RotateCcw className="w-4 h-4 mr-1.5 text-amber-600" />
                <span>Process Return / Exchange</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold hover:border-[#3b7987] hover:text-[#3b7987] cursor-pointer">
              <Link href="/pos/register/close">
                <span>Close Register Shift (Z-Report)</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold hover:border-[#3b7987] hover:text-[#3b7987] cursor-pointer">
              <Link href="/sync">
                <span>View Offline Queue ({pendingCount})</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
