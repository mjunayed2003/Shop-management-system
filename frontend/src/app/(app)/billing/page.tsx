'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { DEFAULT_PLANS, PricingPlan } from '@/lib/config/pricing-plans';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  CreditCard,
  Shield,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  Download,
  HelpCircle,
  Building2,
  Users,
  Boxes,
  Layers,
  Receipt,
  Radio,
  ExternalLink,
  Loader2,
} from 'lucide-react';

export default function TenantBillingPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, business } = useAuthStore();
  const isOwner = Boolean(user?.isOwner);

  // States
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPayHelpOpen, setIsPayHelpOpen] = useState(false);
  const [payHelpInvoiceNo, setPayHelpInvoiceNo] = useState('');
  const [payTxId, setPayTxId] = useState('');
  const [payMethod, setPayMethod] = useState('bKash');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');

  // 1. Fetch Current Subscription, Limits & Usage
  const {
    data: subData,
    isLoading: isSubLoading,
    refetch: refetchSub,
  } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: () => api.subscription.getCurrent(),
  });

  // 2. Fetch Invoices
  const {
    data: invoicesData,
    isLoading: isInvoicesLoading,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['subscription', 'invoices', invoicePage, invoiceStatusFilter],
    queryFn: () =>
      api.subscription.getInvoices({
        page: invoicePage,
        limit: 10,
      }),
  });

  // 3. Fetch Payments History
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ['subscription', 'payments'],
    queryFn: () => api.subscription.getPayments({ page: 1, limit: 10 }),
  });

  // Upgrade Plan Mutation
  const upgradeMutation = useMutation({
    mutationFn: (planId: string) =>
      api.subscription.upgrade({
        planId,
        billingCycle,
      }),
    onSuccess: (res) => {
      toast.show(res.message || 'প্ল্যান সফলভাবে আপগ্রেড করা হয়েছে।', 'success');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      refetchSub();
      refetchInvoices();
    },
    onError: (err: any) => {
      toast.show(err.message || 'প্ল্যান আপগ্রেড ব্যর্থ হয়েছে।', 'error');
    },
  });

  // Cancel Subscription Mutation
  const cancelMutation = useMutation({
    mutationFn: () => api.subscription.cancel({ reason: cancelReason }),
    onSuccess: () => {
      toast.show('সাবস্ক্রিপশন বাতিল করা হয়েছে।', 'info');
      setIsCancelConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      refetchSub();
    },
    onError: (err: any) => {
      toast.show(err.message || 'সাবস্ক্রিপশন বাতিল ব্যর্থ হয়েছে।', 'error');
    },
  });

  // Submit "I Have Paid" Support Ticket
  const handlePaidTicketSubmit = async () => {
    if (!payTxId.trim()) {
      toast.show('অনুগ্রহ করে ট্রানজ্যাকশন আইডি (Transaction ID) প্রদান করুন।', 'error');
      return;
    }
    setIsSubmittingTicket(true);
    try {
      const subject = `Payment Submission for Invoice #${payHelpInvoiceNo || 'Pending'}`;
      const description = `পেমেন্ট সম্পন্ন হয়েছে:\n- মাধ্যম: ${payMethod}\n- Transaction ID / TrxID: ${payTxId}\n- ইনভয়েস: ${payHelpInvoiceNo}\n- অতিরিক্ত বিবরণ: ${payNotes || 'N/A'}`;

      await api.support.createTicket({
        subject,
        description,
        priority: 'HIGH',
      });

      toast.show('পেমেন্ট ভেরিফিকেশন টিকিট সফলভাবে সাবমিট করা হয়েছে। অ্যাডমিন রিভিউ করবেন।', 'success');
      setIsPayHelpOpen(false);
      setPayTxId('');
      setPayNotes('');
    } catch (err: any) {
      toast.show(err.message || 'টিকিট সাবমিট করা যায়নি।', 'error');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const currentSub = subData?.subscription;
  const effectiveLimits = subData?.effectiveLimits;
  const usage = subData?.usage;
  const overrides = subData?.activeOverrides || [];

  // Helper to format BDT
  const fmtBdt = (amt?: number | string | null) => {
    const num = Number(amt || 0);
    return `BDT ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to check if a plan is downgrade and if blocked by current usage
  const checkPlanEligibility = (targetPlan: PricingPlan) => {
    if (!usage) return { isBlocked: false, reasons: [] };

    const reasons: string[] = [];
    if (usage.branches > targetPlan.limits.maxBranches) {
      reasons.push(`আউটলেট সংখ্যা (${usage.branches}) অনুমোদিত সীমার (${targetPlan.limits.maxBranches}) বেশি`);
    }
    if (usage.users > targetPlan.limits.maxUsers) {
      reasons.push(`ইউজার সংখ্যা (${usage.users}) অনুমোদিত সীমার (${targetPlan.limits.maxUsers}) বেশি`);
    }
    if (usage.products > targetPlan.limits.maxProducts) {
      reasons.push(`পণ্য সংখ্যা (${usage.products}) অনুমোদিত সীমার (${targetPlan.limits.maxProducts}) বেশি`);
    }
    if (usage.variants > targetPlan.limits.maxVariants) {
      reasons.push(`ভ্যারিয়েন্ট সংখ্যা (${usage.variants}) অনুমোদিত সীমার (${targetPlan.limits.maxVariants}) বেশি`);
    }

    return {
      isBlocked: reasons.length > 0,
      reasons,
    };
  };

  const getUsagePercent = (used = 0, max = 1) => {
    if (max === Infinity || max <= 0) return 0;
    return Math.min(100, Math.round((used / max) * 100));
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-rose-500';
    if (percent >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CreditCard className="w-8 h-8 text-emerald-600" />
            <span>বিলিং ও সাবস্ক্রিপশন ব্যবস্থাপনা</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            আপনার অ্যাকাউন্টের বর্তমান সাবস্ক্রিপশন স্ট্যাটাস, প্ল্যান কোটা ও ইনভয়েস বিবরণী।
          </p>
        </div>

        {currentSub && currentSub.status !== 'CANCELLED' && isOwner && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCancelConfirmOpen(true)}
            className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 rounded-xl"
          >
            সাবস্ক্রিপশন বাতিল
          </Button>
        )}
      </div>

      {/* Grid: Current Plan & Usage Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Active Subscription Overview */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">বর্তমান প্ল্যান</span>
              {currentSub && (
                <Badge
                  className={`text-[11px] font-bold uppercase ${
                    currentSub.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : currentSub.status === 'TRIAL'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : currentSub.status === 'GRACE' || currentSub.status === 'PAYMENT_DUE'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {currentSub.status}
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {currentSub?.plan?.name || 'Starter Plan'}
            </CardTitle>
            <CardDescription className="text-xs">
              বিলিং সাইকেল: <strong className="uppercase">{currentSub?.billingCycle || 'MONTHLY'}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4 text-xs">
            {effectiveLimits?.isFreeAccess && (
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 text-purple-800 dark:text-purple-300 flex items-center gap-2 font-semibold">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>ফ্রি অ্যাক্সেস সক্রিয় (Free Access Override)</span>
              </div>
            )}

            <div className="space-y-2.5 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                <span>বর্তমান বিলিং পিরিয়ড:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {currentSub?.currentPeriodEnd
                    ? new Date(currentSub.currentPeriodEnd).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>

              {currentSub?.trialEndsAt && currentSub.status === 'TRIAL' && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-semibold">
                  <span>ট্রায়াল শেষ:</span>
                  <span>{new Date(currentSub.trialEndsAt).toLocaleDateString()}</span>
                </div>
              )}

              {currentSub?.graceEndsAt && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-semibold">
                  <span>গ্রেস পিরিয়ড শেষ:</span>
                  <span>{new Date(currentSub.graceEndsAt).toLocaleDateString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1">
                <span>ফিচার অ্যাক্সেস:</span>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {effectiveLimits?.hasOfflineSync && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      Offline POS
                    </Badge>
                  )}
                  {effectiveLimits?.hasCustomReports && (
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      Reports
                    </Badge>
                  )}
                  {effectiveLimits?.hasApiAccess && (
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                      API
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Payment instructions trigger */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={() => setIsPayHelpOpen(true)}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>পেমেন্ট নির্দেশনা ও TrxID সাবমিট</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2 & 3: Resource Usage vs Limits */}
        <Card className="lg:col-span-2 rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>প্ল্যান কোটা ও বর্তমান ব্যবহার (Usage vs Limits)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              রিসোর্স কোটা অতিক্রম করলে অতিরিক্ত ব্যবহারের পূর্বে প্ল্যান আপগ্রেড প্রয়োজন হবে।
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* 1. Branches */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  আউটলেট / ব্রাঞ্চ সংখ্যা
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  {usage?.branches || 0} / {effectiveLimits?.maxBranches === Infinity ? 'Unlimited' : effectiveLimits?.maxBranches}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                    getUsagePercent(usage?.branches, effectiveLimits?.maxBranches)
                  )}`}
                  style={{ width: `${getUsagePercent(usage?.branches, effectiveLimits?.maxBranches)}%` }}
                />
              </div>
            </div>

            {/* 2. Users */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Users className="w-4 h-4 text-slate-400" />
                  সিস্টেম ইউজার সংখ্যা
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  {usage?.users || 0} / {effectiveLimits?.maxUsers === Infinity ? 'Unlimited' : effectiveLimits?.maxUsers}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                    getUsagePercent(usage?.users, effectiveLimits?.maxUsers)
                  )}`}
                  style={{ width: `${getUsagePercent(usage?.users, effectiveLimits?.maxUsers)}%` }}
                />
              </div>
            </div>

            {/* 3. Products */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Boxes className="w-4 h-4 text-slate-400" />
                  সর্বমোট পণ্য (Products)
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  {usage?.products || 0} / {effectiveLimits?.maxProducts === Infinity ? 'Unlimited' : effectiveLimits?.maxProducts}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                    getUsagePercent(usage?.products, effectiveLimits?.maxProducts)
                  )}`}
                  style={{ width: `${getUsagePercent(usage?.products, effectiveLimits?.maxProducts)}%` }}
                />
              </div>
            </div>

            {/* 4. Variants */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Layers className="w-4 h-4 text-slate-400" />
                  সর্বমোট ভ্যারিয়েন্ট (SKUs)
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  {usage?.variants || 0} / {effectiveLimits?.maxVariants === Infinity ? 'Unlimited' : effectiveLimits?.maxVariants}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                    getUsagePercent(usage?.variants, effectiveLimits?.maxVariants)
                  )}`}
                  style={{ width: `${getUsagePercent(usage?.variants, effectiveLimits?.maxVariants)}%` }}
                />
              </div>
            </div>

            {/* 5. Monthly Invoices */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  চলতি মাসের বিক্রয় ইনভয়েস
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  {usage?.monthlyInvoices || 0} / {effectiveLimits?.maxMonthlyInvoices === Infinity ? 'Unlimited' : effectiveLimits?.maxMonthlyInvoices}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                    getUsagePercent(usage?.monthlyInvoices, effectiveLimits?.maxMonthlyInvoices)
                  )}`}
                  style={{ width: `${getUsagePercent(usage?.monthlyInvoices, effectiveLimits?.maxMonthlyInvoices)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online Gateway Integration Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
            SSL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">অনলাইন পেমেন্ট গেটওয়ে (SSLCommerz / bKash Direct)</span>
              <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">
                শীঘ্রই আসছে (Coming Soon)
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              বর্তমানে সরাসরি bKash মার্চেন্ট বা ব্যাংক অ্যাকাউন্টে ফি পাঠিয়ে TrxID সাবমিট করুন।
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsPayHelpOpen(true)}
          className="text-xs border-blue-300 text-blue-700 dark:text-blue-300 rounded-xl"
        >
          ম্যানুয়াল পেমেন্ট নির্দেশিকা
        </Button>
      </div>

      {/* Upgrade / Compare Plans Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>প্ল্যান পরিবর্তন ও আপগ্রেড করুন</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ব্যবসায়ের পরিধি বৃদ্ধিতে যেকোনো সময় উপযুক্ত প্যাকেজে আপগ্রেড করুন।
            </p>
          </div>

          {/* Monthly / Yearly Toggle */}
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                billingCycle === 'MONTHLY'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              মাসিক বিলিং
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                billingCycle === 'YEARLY'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>বার্ষিক বিলিং</span>
              <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded-full">
                -১৭% ছাড়
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {DEFAULT_PLANS.map((p) => {
            const isCurrent = currentSub?.plan?.code === p.code;
            const price = billingCycle === 'YEARLY' ? p.yearlyPrice : p.monthlyPrice;
            const { isBlocked, reasons } = checkPlanEligibility(p);

            return (
              <div
                key={p.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                  p.isPopular
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 shadow-lg ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-slate-900 dark:text-white">{p.name}</span>
                    {p.isPopular && (
                      <Badge className="bg-emerald-500 text-white text-[10px] font-bold">জনপ্রিয়</Badge>
                    )}
                    {isCurrent && (
                      <Badge variant="outline" className="border-emerald-500 text-emerald-600 text-[10px] font-bold">
                        বর্তমান প্ল্যান
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.description}</p>

                  <div className="my-4">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      ৳{price.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">
                      /{billingCycle === 'YEARLY' ? 'বছর' : 'মাস'}
                    </span>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 my-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Downgrade block reason if usage exceeds */}
                  {isBlocked && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-[11px] text-rose-700 dark:text-rose-300 space-y-1 mb-2">
                      <span className="font-bold block">ডাউনগ্রেড করা সম্ভব নয়:</span>
                      {reasons.map((r, i) => (
                        <p key={i}>• {r}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  {isCurrent ? (
                    <Button disabled className="w-full h-10 text-xs font-semibold rounded-xl bg-slate-100 text-slate-400">
                      সক্রিয় প্ল্যান
                    </Button>
                  ) : isBlocked ? (
                    <Button disabled className="w-full h-10 text-xs font-semibold rounded-xl bg-slate-100 text-slate-400">
                      কোটা অতিক্রমিত
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => upgradeMutation.mutate(p.id)}
                      disabled={upgradeMutation.isPending || !isOwner}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      {upgradeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>প্ল্যান বেছে নিন</span>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription Invoices Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>সাবস্ক্রিপশন ইনভয়েস হিস্ট্রি</span>
          </h2>
        </div>

        <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="p-3.5">ইনভয়েস নং</th>
                  <th className="p-3.5">প্ল্যান</th>
                  <th className="p-3.5">বিলিং মেয়াদ</th>
                  <th className="p-3.5">নিট ফি (BDT)</th>
                  <th className="p-3.5">স্ট্যাটাস</th>
                  <th className="p-3.5">পরিশোধের শেষ তারিখ</th>
                  <th className="p-3.5 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isInvoicesLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      ইনভয়েস লোড হচ্ছে...
                    </td>
                  </tr>
                ) : !invoicesData?.data || invoicesData.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      কোনো সাবস্ক্রিপশন ইনভয়েস পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  invoicesData.data.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        {inv.invoice_no}
                      </td>
                      <td className="p-3.5 font-medium">{inv.plan?.name || 'Standard'}</td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(inv.billing_start).toLocaleDateString()} -{' '}
                        {new Date(inv.billing_end).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                        {fmtBdt(inv.net_amount)}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          className={`text-[10px] font-bold uppercase ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : inv.status === 'OVERDUE'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'PAID' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPayHelpInvoiceNo(inv.invoice_no);
                                setIsPayHelpOpen(true);
                              }}
                              className="h-7 text-[11px] border-emerald-300 text-emerald-700 rounded-lg"
                            >
                              পরিশোধ করুন
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsInvoiceModalOpen(true);
                            }}
                            className="h-7 text-[11px] rounded-lg"
                          >
                            বিস্তারিত
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* "I Have Paid" Payment Verification Dialog */}
      <Dialog open={isPayHelpOpen} onOpenChange={setIsPayHelpOpen}>
        <DialogContent className="max-w-md p-6 space-y-4 rounded-3xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-1">
              <CreditCard className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              পেমেন্ট ভেরিফিকেশন ও ট্রানজ্যাকশন আইডি সাবমিট
            </DialogTitle>
            <DialogDescription className="text-xs">
              bKash, Nagad বা ব্যাংকে ফি পাঠানোর পর নিচের ফর্মে TrxID প্রদান করুন।
            </DialogDescription>
          </DialogHeader>

          {/* Payment Account Details */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">bKash Merchant:</span>
              <strong className="font-mono text-emerald-600">+৮৮০ ১৭০০০০০০০০</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nagad Merchant:</span>
              <strong className="font-mono text-emerald-600">+৮৮০ ১৬০০০০০০০০</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">City Bank A/C:</span>
              <strong className="font-mono">1102938475001</strong>
            </div>
            <p className="text-[10px] text-slate-400 pt-1">রেফারেন্সে আপনার দোকানের নাম বা ইনভয়েস নং উল্লেখ করুন।</p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">ইনভয়েস নম্বর</label>
              <Input
                value={payHelpInvoiceNo}
                onChange={(e) => setPayHelpInvoiceNo(e.target.value)}
                placeholder="INV-2026-..."
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">পেমেন্ট মাধ্যম</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs"
              >
                <option value="bKash">bKash Merchant</option>
                <option value="Nagad">Nagad Merchant</option>
                <option value="Bank Transfer">Bank Transfer (City Bank)</option>
                <option value="Cards">Debit/Credit Card</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">
                Transaction ID (TrxID) <span className="text-rose-500">*</span>
              </label>
              <Input
                value={payTxId}
                onChange={(e) => setPayTxId(e.target.value)}
                placeholder="উদাঃ 9H82J3K8LS"
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">অতিরিক্ত নোট (ঐচ্ছিক)</label>
              <Input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="প্রেরকের ফোন নম্বর বা ব্রাঞ্চ বিবরণ"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPayHelpOpen(false)}
              className="text-xs h-9 rounded-xl"
            >
              বাতিল
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingTicket}
              onClick={handlePaidTicketSubmit}
              className="text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
            >
              {isSubmittingTicket ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              ভেরিফিকেশন টিকিট পাঠান
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail & A4 Print Modal */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="max-w-2xl p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>সাবস্ক্রিপশন ইনভয়েস: {selectedInvoice?.invoice_no}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="text-xs h-7 rounded-lg print:hidden"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                প্রিন্ট (A4)
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <div>
                  <span className="text-slate-400 block">বিল গ্রহীতা:</span>
                  <strong className="text-sm text-slate-900 dark:text-white">{business?.name}</strong>
                  <p className="text-slate-500">{business?.slug}.posbd.com</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">ইনভয়েস স্ট্যাটাস:</span>
                  <Badge className="font-bold text-xs uppercase">{selectedInvoice.status}</Badge>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">বিবরণ</th>
                      <th className="p-3 text-right">পরিমাণ (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="p-3 font-medium">
                        {selectedInvoice.plan?.name || 'SaaS Subscription'} (
                        {new Date(selectedInvoice.billing_start).toLocaleDateString()} -{' '}
                        {new Date(selectedInvoice.billing_end).toLocaleDateString()})
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {fmtBdt(selectedInvoice.amount)}
                      </td>
                    </tr>
                    {Number(selectedInvoice.discount_amount || 0) > 0 && (
                      <tr className="text-emerald-600">
                        <td className="p-3">প্রোমোর ডিসকাউন্ট</td>
                        <td className="p-3 text-right font-mono font-bold">
                          -{fmtBdt(selectedInvoice.discount_amount)}
                        </td>
                      </tr>
                    )}
                    <tr className="font-bold bg-slate-50 dark:bg-slate-850 text-sm">
                      <td className="p-3">সর্বমোট প্রদেয়</td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {fmtBdt(selectedInvoice.net_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscription Cancellation Confirm Dialog */}
      <ConfirmDialog
        open={isCancelConfirmOpen}
        onOpenChange={setIsCancelConfirmOpen}
        title="সাবস্ক্রিপশন বাতিল করতে নিশ্চিত?"
        description="সাবস্ক্রিপশন বাতিল করলে বর্তমান বিলিং পিরিয়ড শেষ হওয়ার পর আপনার অ্যাকাউন্টটি স্থগিত (Suspended) অবস্থায় চলে যাবে। শুধুমাত্র বিলিং ও সাপোর্ট পেজ ব্যবহারযোগ্য থাকবে।"
        confirmText="হ্যাঁ, বাতিল নিশ্চিত করুন"
        variant="destructive"
        requireReason={true}
        reasonPlaceholder="বাতিলের কারণ বিস্তারিত লিখুন..."
        onConfirm={(reason?: string) => {
          if (reason) setCancelReason(reason);
          cancelMutation.mutate();
        }}
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
