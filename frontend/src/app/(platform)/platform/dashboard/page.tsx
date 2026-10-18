'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { platformApi } from '@/lib/api/platform-client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  CreditCard,
  AlertTriangle,
  Zap,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Users,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export default function PlatformDashboardPage() {
  const {
    data: metrics,
    isLoading,
    isRefetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: () => platformApi.dashboard.getMetrics(),
    refetchInterval: 60000, // auto refresh every minute
  });

  const fmtBdt = (num?: number) =>
    `BDT ${(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Zap className="w-8 h-8 text-indigo-400" />
            <span>Platform Overview &amp; Health</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time cross-tenant metrics, subscription status, MRR estimate and system volume.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5" />
            Updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'now'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs h-8 rounded-xl border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
          <p className="text-xs font-mono uppercase tracking-wider">Loading Platform Telemetry...</p>
        </div>
      ) : (
        <>
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Revenue Collected */}
            <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-sm p-5 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                <span>Revenue (All Time)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-white font-mono">{fmtBdt(metrics?.revenueCollected)}</p>
              <p className="text-[11px] text-emerald-400 font-medium">Aggregated paid subscription revenue</p>
            </Card>

            {/* 2. Overdue Invoices */}
            <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-sm p-5 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                <span>Overdue Invoices</span>
                <div className="w-8 h-8 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-400 font-mono">
                {fmtBdt(metrics?.overdue?.amount)}
              </p>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">{metrics?.overdue?.count || 0} overdue invoice(s)</span>
                <Link href="/platform/invoices?status=OVERDUE" className="text-indigo-400 hover:underline">
                  Review &rarr;
                </Link>
              </div>
            </Card>

            {/* 3. Trials Expiring Soon */}
            <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-sm p-5 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                <span>Trials Expiring (&le; 7 days)</span>
                <div className="w-8 h-8 rounded-xl bg-amber-950/80 text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-300 font-mono">{metrics?.trialsExpiringSoon || 0}</p>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Potential conversions</span>
                <Link href="/platform/businesses?subscriptionStatus=TRIAL" className="text-indigo-400 hover:underline">
                  View Trials &rarr;
                </Link>
              </div>
            </Card>

            {/* 4. Sync Conflicts & Failures */}
            <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-sm p-5 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                <span>Sync Conflicts / Errors</span>
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 text-purple-400 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-300 font-mono">{metrics?.syncErrors || 0}</p>
              <p className="text-[11px] text-slate-400">Offline transactions needing review</p>
            </Card>
          </div>

          {/* Second Row: Businesses & Subscriptions Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Businesses Breakdown */}
            <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Businesses Breakdown</span>
                </CardTitle>
                <Link href="/platform/businesses" className="text-xs text-indigo-400 hover:underline">
                  All Businesses &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Active</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {metrics?.businesses?.ACTIVE || 0}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Suspended</span>
                  <span className="text-xl font-black text-rose-400 font-mono">
                    {metrics?.businesses?.SUSPENDED || 0}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Verification</span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {metrics?.businesses?.PENDING_VERIFICATION || 0}
                  </span>
                </div>
              </div>
            </Card>

            {/* Subscriptions Breakdown */}
            <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>Subscriptions Breakdown</span>
                </CardTitle>
                <Link href="/platform/invoices" className="text-xs text-indigo-400 hover:underline">
                  Invoices &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Active</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {metrics?.subscriptions?.ACTIVE || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Trial</span>
                  <span className="text-lg font-black text-blue-400 font-mono">
                    {metrics?.subscriptions?.TRIAL || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Grace</span>
                  <span className="text-lg font-black text-amber-400 font-mono">
                    {metrics?.subscriptions?.GRACE || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Due</span>
                  <span className="text-lg font-black text-orange-400 font-mono">
                    {metrics?.subscriptions?.PAYMENT_DUE || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Locked</span>
                  <span className="text-lg font-black text-rose-400 font-mono">
                    {(metrics?.subscriptions?.SUSPENDED || 0) + (metrics?.subscriptions?.CANCELLED || 0)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Third Row: SMS Volume & Quick Action Links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-sm p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SMS Gateway Activity</span>
                <MessageSquare className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-3xl font-black text-white font-mono">
                {(metrics?.smsVolume || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Total SMS dispatched across all active tenants.</p>
            </Card>

            <Card className="lg:col-span-2 rounded-3xl bg-slate-900/90 border-slate-800 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Administrative Shortcuts</h3>
                <p className="text-xs text-slate-400 mb-4">Common platform administrative operations.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <Link href="/platform/businesses">
                    <Button variant="outline" className="w-full h-10 rounded-xl text-xs border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white">
                      Businesses
                    </Button>
                  </Link>
                  <Link href="/platform/invoices">
                    <Button variant="outline" className="w-full h-10 rounded-xl text-xs border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white">
                      Record Payment
                    </Button>
                  </Link>
                  <Link href="/platform/support">
                    <Button variant="outline" className="w-full h-10 rounded-xl text-xs border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white">
                      Support Desk
                    </Button>
                  </Link>
                  <Link href="/platform/plans">
                    <Button variant="outline" className="w-full h-10 rounded-xl text-xs border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white">
                      Edit Plans
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
