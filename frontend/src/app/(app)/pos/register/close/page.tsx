'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { usePermission } from '@/components/shared/PermissionGate';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Printer,
  DollarSign,
  Coins,
  Banknote,
  Calculator,
  User,
  Store,
  Clock,
  ShieldAlert,
  Loader2,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { generateZReportHtml, printHtml } from '@/lib/utils/receipt-template';

import { useOfflineStore } from '@/lib/store/offline-store';

const NOTE_DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const COIN_DENOMINATIONS = [5, 2, 1];

export default function CloseRegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const user = useAuthStore((s) => s.user);
  const { hasPermission: canCloseAnyPerm } = usePermission('register.close_any');
  const canCloseAny = canCloseAnyPerm || Boolean(user?.isOwner);
  const { pendingCount, conflictCount } = useOfflineStore();
  const hasUnsyncedItems = pendingCount > 0 || conflictCount > 0;

  // Selected Target Session (for manager view)
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);

  // Wizard Step: 1 = Count, 2 = Review, 3 = Notes & Confirm, 4 = Success/Z-Report
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Denominations State
  const [useFreeEntry, setUseFreeEntry] = useState(false);
  const [freeEntryTotal, setFreeEntryTotal] = useState<number>(0);
  const [notesCount, setNotesCount] = useState<Record<number, number>>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  });
  const [coinsCount, setCoinsCount] = useState<Record<number, number>>({
    5: 0,
    2: 0,
    1: 0,
  });

  // Notes & Submission
  const [closingNotes, setClosingNotes] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [closedSessionResult, setClosedSessionResult] = useState<any | null>(null);
  const [blockingError, setBlockingError] = useState<string | null>(null);

  // 1. Fetch current user session
  const { data: mySession, isLoading: isLoadingMySession } = useQuery({
    queryKey: ['register-session', 'current', currentBranch?.id],
    queryFn: () => api.sales.registerSessions.current(),
  });

  // 2. Fetch all branch sessions for today (to allow manager to close other sessions)
  const { data: cashBookData } = useQuery({
    queryKey: ['register-cash-book', currentBranch?.id, 'today'],
    queryFn: () => api.sales.registerSessions.cashBook({ date: new Date().toISOString() }),
    enabled: Boolean(canCloseAny),
  });

  const openBranchSessions = useMemo(() => {
    if (!cashBookData || !Array.isArray(cashBookData)) return [];
    return cashBookData.filter((s: any) => s.status === 'OPEN');
  }, [cashBookData]);

  // Active target session ID
  const activeSessionId = selectedSessionId || mySession?.id;

  // 3. Fetch summary for the targeted session
  const {
    data: summary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['register-session-summary', currentBranch?.id, activeSessionId],
    queryFn: () =>
      activeSessionId
        ? api.sales.registerSessions.summaryById(activeSessionId)
        : api.sales.registerSessions.summary(),
    enabled: Boolean(activeSessionId),
  });

  // Calculate counted total via Decimal.js
  const countedTotal = useMemo(() => {
    if (useFreeEntry) {
      return new Decimal(freeEntryTotal || 0);
    }

    let sum = new Decimal(0);
    for (const denom of NOTE_DENOMINATIONS) {
      const count = notesCount[denom] || 0;
      if (count > 0) {
        sum = sum.plus(new Decimal(denom).times(count));
      }
    }
    for (const denom of COIN_DENOMINATIONS) {
      const count = coinsCount[denom] || 0;
      if (count > 0) {
        sum = sum.plus(new Decimal(denom).times(count));
      }
    }
    return sum;
  }, [useFreeEntry, freeEntryTotal, notesCount, coinsCount]);

  const expectedBalance = useMemo(() => {
    return new Decimal(summary?.expected_balance || 0);
  }, [summary]);

  const discrepancy = useMemo(() => {
    return countedTotal.minus(expectedBalance);
  }, [countedTotal, expectedBalance]);

  const hasDiscrepancy = !discrepancy.isZero();

  // Close Session Mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      // Build denomination JSON audit text
      const breakdownPayload = {
        mode: useFreeEntry ? 'FREE_ENTRY' : 'DENOMINATIONS',
        notesCount: useFreeEntry ? undefined : notesCount,
        coinsCount: useFreeEntry ? undefined : coinsCount,
        countedTotal: countedTotal.toNumber(),
        expectedBalance: expectedBalance.toNumber(),
        discrepancy: discrepancy.toNumber(),
        userNotes: closingNotes.trim(),
      };

      return api.sales.registerSessions.close({
        registerSessionId: activeSessionId,
        closingBalance: countedTotal.toNumber(),
        closingNotes: JSON.stringify(breakdownPayload),
      });
    },
    onSuccess: (data) => {
      toast.success(t('reconciliation.sessionClosedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      queryClient.invalidateQueries({ queryKey: ['register-session-summary'] });
      queryClient.invalidateQueries({ queryKey: ['register-cash-book'] });
      setClosedSessionResult(data);
      setStep(4);
      setIsConfirmOpen(false);
      setBlockingError(null);
    },
    onError: (err: any) => {
      setIsConfirmOpen(false);
      const msg = err?.response?.data?.message || err?.message || 'Failed to close register shift';
      setBlockingError(msg);
      toast.error(msg);
    },
  });

  const handlePrintZReport = (format: 'THERMAL_58' | 'THERMAL_80' | 'A4') => {
    if (!summary) return;
    const reportData = {
      registerName: summary.session?.cash_register?.name || 'REG-1',
      cashierName: `${summary.session?.user?.first_name || ''} ${
        summary.session?.user?.last_name || ''
      }`.trim(),
      branchName: currentBranch?.name || 'Branch',
      openedAt: summary.session?.opened_at || new Date().toISOString(),
      closedAt: new Date().toISOString(),
      openingBalance: summary.opening_balance,
      cashSales: summary.cash_sales,
      cashDueCollections: summary.cash_due_collections,
      payIns: summary.pay_ins,
      payOuts: summary.pay_outs,
      cashRefunds: summary.cash_refunds,
      cashExpenses: summary.cash_expenses,
      expectedBalance: expectedBalance.toFixed(2),
      closingBalance: countedTotal.toFixed(2),
      discrepancy: discrepancy.toFixed(2),
      salesCount: summary.sales_count,
      returnsCount: summary.returns_count,
      voidsCount: summary.voids_count,
      nonCashTotals: summary.non_cash_totals,
      closingNotes: closingNotes.trim() || undefined,
    };

    const html = generateZReportHtml(reportData, format, false);
    printHtml(html, format);
  };

  // If no open session found
  if (!isLoadingMySession && !mySession && openBranchSessions.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 shadow-lg text-center">
          <CardHeader>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-2">
              <Lock className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold">No Active Shift to Close</CardTitle>
            <CardDescription className="text-xs">
              You do not have an active open register session in {currentBranch?.name || 'this branch'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/pos">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Go to POS Terminal
              </Button>
            </Link>
            <Link href="/pos/register/cash-book">
              <Button variant="outline" className="w-full gap-1.5 text-xs">
                <BookOpen className="w-4 h-4 text-slate-500" />
                View Daily Cash Book
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/pos" className="hover:text-indigo-600 transition-colors">
              POS Terminal
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">Shift Close</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-rose-600" />
            {t('reconciliation.closeSessionTitle')}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/pos/register/cash-book">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>{t('reconciliation.cashBookTitle')}</span>
            </Button>
          </Link>
          <Link href="/pos">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel & Back</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Blocking Alert: Unsynced Offline Items */}
      {hasUnsyncedItems && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Cannot close register shift: Unsynced offline transactions detected ({pendingCount} pending, {conflictCount} conflicts)</span>
          </div>
          <p>
            There are offline transactions linked to this device or shift that have not been reconciled with the server yet. Please sync all pending sales or resolve conflicts before closing the register shift.
          </p>
          <div className="pt-1">
            <Link href="/sync">
              <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl">
                Go to Sync Hub &amp; Push Outbox
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Manager Session Switcher (if register.close_any) */}
      {canCloseAny && openBranchSessions.length > 0 && (
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold text-indigo-950 dark:text-indigo-200">
              Manager Control: {t('reconciliation.closeOtherSession')}
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={activeSessionId || ''}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                setStep(1);
              }}
              className="text-xs rounded-lg border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {mySession && (
                <option value={mySession.id}>
                  My Active Shift ({mySession.cash_register?.name || 'My Register'})
                </option>
              )}
              {openBranchSessions
                .filter((s: any) => s.sessionId !== mySession?.id)
                .map((s: any) => (
                  <option key={s.sessionId} value={s.sessionId}>
                    Cashier: {s.cashier} ({s.register}) - Opened ৳{s.openingBalance}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Blocking Alert if Server Error / Unsynced Sales */}
      {blockingError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold">Shift Close Refused</h4>
            <p>{blockingError}</p>
            <p className="text-[11px] text-rose-600/80 mt-1">
              If this is due to unsynced offline sales, visit the sales list to review and sync them before closing.
            </p>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className={`p-3 rounded-lg border text-center transition-all ${
            step === 1
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold'
              : step > 1
              ? 'border-emerald-300 bg-emerald-50/30 text-emerald-700 dark:text-emerald-400 font-medium'
              : 'border-slate-200 text-slate-400'
          }`}
        >
          <span className="text-xs">{t('reconciliation.step1Count')}</span>
        </div>

        <div
          className={`p-3 rounded-lg border text-center transition-all ${
            step === 2
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold'
              : step > 2
              ? 'border-emerald-300 bg-emerald-50/30 text-emerald-700 dark:text-emerald-400 font-medium'
              : 'border-slate-200 text-slate-400'
          }`}
        >
          <span className="text-xs">{t('reconciliation.step2Review')}</span>
        </div>

        <div
          className={`p-3 rounded-lg border text-center transition-all ${
            step === 3 || step === 4
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold'
              : 'border-slate-200 text-slate-400'
          }`}
        >
          <span className="text-xs">{t('reconciliation.step3Notes')}</span>
        </div>
      </div>

      {/* STEP 1: PHYSICAL CASH COUNT */}
      {step === 1 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                {t('reconciliation.denominationCounter')}
              </CardTitle>
              <CardDescription className="text-xs">
                Count notes and coins in drawer. Quantities are calculated with decimal precision.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={useFreeEntry ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setUseFreeEntry(!useFreeEntry)}
                className="text-xs h-8"
              >
                {useFreeEntry ? 'Switch to Breakdown Counter' : t('reconciliation.freeEntryTotal')}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            {useFreeEntry ? (
              <div className="max-w-md mx-auto p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                  Direct Counted Cash Entry (BDT)
                </label>
                <MoneyInput
                  value={freeEntryTotal}
                  onChange={(val) => setFreeEntryTotal(val)}
                  placeholder="0.00"
                  min={0}
                  className="text-2xl font-bold h-12"
                  autoFocus
                />
                <p className="text-xs text-slate-500">
                  Enter the exact total amount counted manually in the register drawer.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Banknotes */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-indigo-600" />
                    {t('reconciliation.notesDenominations')}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {NOTE_DENOMINATIONS.map((denom) => {
                      const count = notesCount[denom] || 0;
                      const subtotal = new Decimal(denom).times(count);
                      return (
                        <div
                          key={denom}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              ৳{denom}
                            </span>
                            <span className="font-mono text-slate-500">
                              ৳{subtotal.toFixed(0)}
                            </span>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={count || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setNotesCount((prev) => ({ ...prev, [denom]: val }));
                            }}
                            className="h-8 text-center font-mono font-semibold text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Coins */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    {t('reconciliation.coinsDenominations')}
                  </h3>

                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    {COIN_DENOMINATIONS.map((denom) => {
                      const count = coinsCount[denom] || 0;
                      const subtotal = new Decimal(denom).times(count);
                      return (
                        <div
                          key={denom}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              ৳{denom} Coin
                            </span>
                            <span className="font-mono text-slate-500">
                              ৳{subtotal.toFixed(0)}
                            </span>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={count || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setCoinsCount((prev) => ({ ...prev, [denom]: val }));
                            }}
                            className="h-8 text-center font-mono font-semibold text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Total Counted Banner */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('reconciliation.countedCash')}
                </span>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                  ৳{countedTotal.toFixed(2)}
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setStep(2)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold"
              >
                <span>Proceed to Review</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: DISCREPANCY REVIEW */}
      {step === 2 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              {t('reconciliation.step2Review')}
            </CardTitle>
            <CardDescription className="text-xs">
              Compare your counted drawer balance with the authoritative server expectation.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            {/* Reconciliation Comparison Table */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-center">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-xs text-slate-500 font-sans uppercase font-semibold">
                  {t('reconciliation.expectedBalance')}
                </span>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-2">
                  ৳{expectedBalance.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-400 font-sans mt-1 block">
                  Authoritative Server Balance
                </span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-xs text-slate-500 font-sans uppercase font-semibold">
                  {t('reconciliation.countedCash')}
                </span>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                  ৳{countedTotal.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-400 font-sans mt-1 block">
                  Physical Cash Counted
                </span>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  discrepancy.isZero()
                    ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                    : discrepancy.greaterThan(0)
                    ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300'
                    : 'border-rose-300 bg-rose-50/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
                }`}
              >
                <span className="text-xs font-sans uppercase font-semibold">
                  {t('reconciliation.discrepancy')}
                </span>
                <div className="text-2xl font-bold mt-2">
                  {discrepancy.isZero()
                    ? '৳0.00'
                    : `${discrepancy.greaterThan(0) ? '+' : ''}৳${discrepancy.toFixed(2)}`}
                </div>
                <span className="text-[11px] font-sans mt-1 block font-semibold">
                  {discrepancy.isZero()
                    ? t('reconciliation.balanced')
                    : discrepancy.greaterThan(0)
                    ? t('reconciliation.overage', { amount: discrepancy.toFixed(2) })
                    : t('reconciliation.shortage', { amount: discrepancy.abs().toFixed(2) })}
                </span>
              </div>
            </div>

            {/* Warning if Discrepancy Exists */}
            {hasDiscrepancy && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Discrepancy Detected</h4>
                  <p className="mt-0.5">
                    {t('reconciliation.closingNotesRequired')} An explanation will be permanently recorded in the audit log and alerted to management.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Count</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setStep(3)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold"
              >
                <span>Continue to Notes & Confirm</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: CLOSING NOTES & FINAL CONFIRM */}
      {step === 3 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-600" />
              {t('reconciliation.step3Notes')}
            </CardTitle>
            <CardDescription className="text-xs">
              Provide handover remarks before permanently closing this register shift.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>
                  {t('reconciliation.closingNotes')}{' '}
                  {hasDiscrepancy && <strong className="text-rose-600">* (Mandatory)</strong>}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Stored as structured JSON alongside denomination counter
                </span>
              </label>

              <Textarea
                value={closingNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setClosingNotes(e.target.value)}
                placeholder="e.g., Handed over to night shift cashier. ৳20 shortage due to coin rounding..."
                rows={4}
                className="text-xs"
                required={hasDiscrepancy}
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                Shift Closure Terms:
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Once closed, this session becomes completely read-only.</li>
                <li>No sales, returns, refunds, or expenses can be rung under this session.</li>
                <li>A printable Z Report will be generated immediately.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="outline" size="sm" onClick={() => setStep(2)} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Review</span>
              </Button>

              <Button
                size="sm"
                disabled={(hasDiscrepancy && !closingNotes.trim()) || hasUnsyncedItems}
                onClick={() => setIsConfirmOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Submit & Close Register Shift</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: SUCCESS & Z-REPORT PRINT */}
      {step === 4 && (
        <Card className="border-emerald-300 dark:border-emerald-800 shadow-md">
          <CardHeader className="text-center pb-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('reconciliation.sessionClosedSuccess')}
            </CardTitle>
            <CardDescription className="text-xs">
              The register session is now closed and sealed. The drawer has been reconciled.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* Summary Ticket Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md mx-auto text-xs space-y-2 font-mono">
              <div className="flex justify-between py-1 border-b dark:border-slate-800">
                <span className="text-slate-500">Register:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {summary?.session?.cash_register?.name}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-slate-800">
                <span className="text-slate-500">Expected Cash:</span>
                <span>৳{expectedBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-slate-800">
                <span className="text-slate-500">Counted Cash:</span>
                <span className="font-bold text-indigo-600">৳{countedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-slate-800">
                <span className="text-slate-500">Discrepancy:</span>
                <span
                  className={`font-bold ${
                    discrepancy.isZero()
                      ? 'text-emerald-600'
                      : discrepancy.greaterThan(0)
                      ? 'text-indigo-600'
                      : 'text-rose-600'
                  }`}
                >
                  {discrepancy.isZero() ? '৳0.00' : `৳${discrepancy.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Print Options */}
            <div className="text-center space-y-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                {t('reconciliation.printZReport')}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintZReport('THERMAL_80')}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  Thermal 80mm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintZReport('THERMAL_58')}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  Thermal 58mm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintZReport('A4')}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  A4 Report
                </Button>
              </div>
            </div>

            <div className="border-t pt-4 flex items-center justify-between">
              <Link href="/pos/register/cash-book">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span>{t('reconciliation.cashBookTitle')}</span>
                </Button>
              </Link>

              <Link href="/pos">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  Return to POS Terminal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Submission Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={t('reconciliation.confirmCloseTitle')}
        description={
          <div className="space-y-2 text-xs">
            <p>{t('reconciliation.confirmCloseDesc')}</p>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono space-y-1">
              <div>Counted Cash: ৳{countedTotal.toFixed(2)}</div>
              <div>Expected Cash: ৳{expectedBalance.toFixed(2)}</div>
              <div
                className={`font-bold ${
                  discrepancy.isZero() ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                Discrepancy: ৳{discrepancy.toFixed(2)}
              </div>
            </div>
          </div>
        }
        confirmText="Confirm & Seal Shift"
        variant="danger"
        onConfirm={() => closeMutation.mutate()}
        isLoading={closeMutation.isPending}
      />
    </div>
  );
}
