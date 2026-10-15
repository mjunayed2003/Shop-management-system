'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Users,
  Store,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Component,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, business } = useAuthStore();
  const { currentBranch, branches } = useBranchStore();
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 text-white p-6 sm:p-8 shadow-lg shadow-emerald-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{business?.name || 'দোকান পিওএস'}</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            স্বাগতম, {user?.fullName}!
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
            আপনার পোশাক শোরুমের মাল্টি-ব্রাঞ্চ স্টক, কর্মী ব্যবস্থাপনা এবং বিক্রয় কার্যক্রম এখন সম্পূর্ণ নিয়ন্ত্রণে।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/users">
            <Button variant="secondary" size="sm" className="bg-white text-emerald-900 hover:bg-emerald-50">
              <Users className="w-4 h-4 mr-1.5" />
              <span>{t('nav.users')}</span>
            </Button>
          </Link>
          <Link href="/roles">
            <Button size="sm" className="bg-emerald-900/60 hover:bg-emerald-900 text-white border border-white/20">
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              <span>{t('nav.roles')}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Subscription or Grace Warning Banner if applicable */}
      {business?.warning && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{business.warning}</div>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Branch Info Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('branch.currentBranch')}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {currentBranch?.name || 'প্রধান শোরুম'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              মোট শাখা: <strong className="text-slate-800 dark:text-slate-200">{branches.length}</strong> টি
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">কোড: </span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              {currentBranch?.code || 'MAIN'}
            </span>
          </div>
        </div>

        {/* User Role Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              আপনার রোল ও পদবী
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {user?.isOwner ? 'দোকান মালিক (Owner)' : user?.role?.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {user?.isOwner
                ? 'সম্পূর্ণ সিস্টেম ও সব শাখার প্রধান নিয়ন্ত্রক'
                : `রোল কোড: ${user?.role?.code}`}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <Link href="/profile" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1">
              <span>অনুমতিসমূহ দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Subscription Plan Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              সাবস্ক্রিপশন প্ল্যান
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {business?.subscription?.planName || 'Starter Boutique'}
              </h3>
              <StatusBadge status={business?.subscription?.status || 'TRIAL'} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              মুদ্রা: <strong>{business?.currency || 'BDT'}</strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>অটো ক্লাউড সিঙ্ক:</span>
            <span className="text-emerald-600 font-semibold">সক্রিয়</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/roles"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-600 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white mt-4">
            {t('nav.roles')}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            মডিউলভিত্তিক পারমিশন ম্যাট্রিক্স ও রোলের এক্সেস কনফিগার করুন
          </p>
        </Link>

        <Link
          href="/users"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-600 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white mt-4">
            {t('nav.users')}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            কর্মী তালিকা, ভূমিকা বরাদ্দ, পাসওয়ার্ড ও শাখা প্রবেশাধিকার নির্ধারণ করুন
          </p>
        </Link>

        <Link
          href="/dev/components"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-600 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <Component className="w-6 h-6" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white mt-4">
            {t('nav.componentDocs')}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            DataTable, PhoneInput, PermissionGate ও ConfirmDialog ইন্টারঅ্যাক্টিভ ডেমো
          </p>
        </Link>
      </div>
    </div>
  );
}
