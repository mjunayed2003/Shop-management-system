'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  CreditCard,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { generateZReportHtml, printHtml } from '@/lib/utils/receipt-template';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export function SessionSummaryModal({
  isOpen,
  onClose,
  sessionId,
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const currentBranch = useBranchStore((s) => s.currentBranch);

  const [isBreakdownOpen, setIsBreakdownOpen] = useState(true);

  // Query live summary
  const {
    data: summary,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['register-session-summary', currentBranch?.id, sessionId],
    queryFn: () =>
      sessionId
        ? api.sales.registerSessions.summaryById(sessionId)
        : api.sales.registerSessions.summary(),
    enabled: isOpen,
    refetchOnWindowFocus: true,
  });

  // Print draft X report preview
  const handlePrintXReport = () => {
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
      expectedBalance: summary.expected_balance,
      closingBalance: summary.expected_balance,
      discrepancy: '0.00',
      salesCount: summary.sales_count,
      returnsCount: summary.returns_count,
      voidsCount: summary.voids_count,
      nonCashTotals: summary.non_cash_totals,
      closingNotes: '[X REPORT PREVIEW - DRAFT SHIFT SUMMARY]',
    };

    const html = generateZReportHtml(reportData, 'THERMAL_80', false);
    printHtml(html);
  };

  const expectedBalance = new Decimal(summary?.expected_balance || 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3 border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{t('reconciliation.sessionSummaryTitle')}</span>
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 gap-1.5 text-xs"
              title="Refresh live totals"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Live Refresh</span>
            </Button>
          </div>
          <DialogDescription className="text-xs">
            {t('reconciliation.sessionSummaryDesc')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Calculating live drawer reconciliation...
          </div>
        ) : !summary ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No active session summary available.
          </div>
        ) : (
          <div className="space-y-4 py-2 text-xs">
            {/* Session Info Bar */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Register</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {summary.session?.cash_register?.name} ({summary.session?.cash_register?.code})
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Cashier</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {summary.session?.user?.first_name} {summary.session?.user?.last_name}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Opened</span>
                <p className="font-mono text-slate-700 dark:text-slate-300">
                  {new Date(summary.session?.opened_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Expected Balance Hero Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 via-slate-50 to-emerald-500/10 dark:from-indigo-950/40 dark:via-slate-900 dark:to-emerald-950/40 border border-indigo-200/50 dark:border-indigo-800/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  {t('reconciliation.expectedBalance')}
                </span>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                  ৳{expectedBalance.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Authoritative live physical cash expected in drawer
                </span>
              </div>
              <DollarSign className="w-10 h-10 text-indigo-500/30" />
            </div>

            {/* Collapsible Cash Breakdown Calculation */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
              >
                <span>Live Cash Ledger Breakdown</span>
                {isBreakdownOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {isBreakdownOpen && (
                <div className="p-3 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-mono">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">
                      (+) {t('reconciliation.openingBalance')}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      ৳{Number(summary.opening_balance).toFixed(2)}
                    </span>
                  </div>

                  <div className="py-2 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>(+) {t('reconciliation.cashSales')}</span>
                    <span className="font-semibold">+৳{Number(summary.cash_sales).toFixed(2)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>(+) {t('reconciliation.cashDueCollections')}</span>
                    <span className="font-semibold">+৳{Number(summary.cash_due_collections).toFixed(2)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>(+) {t('reconciliation.payIns')}</span>
                    <span className="font-semibold">+৳{Number(summary.pay_ins).toFixed(2)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between text-rose-600 dark:text-rose-400">
                    <span>(-) {t('reconciliation.payOuts')}</span>
                    <span className="font-semibold">-৳{Number(summary.pay_outs).toFixed(2)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between text-rose-600 dark:text-rose-400">
                    <span>(-) {t('reconciliation.cashRefunds')}</span>
                    <span className="font-semibold">-৳{Number(summary.cash_refunds).toFixed(2)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between text-rose-600 dark:text-rose-400">
                    <span>(-) {t('reconciliation.cashExpenses')}</span>
                    <span className="font-semibold">-৳{Number(summary.cash_expenses).toFixed(2)}</span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-800/50 px-2 rounded-md">
                    <span>(=) {t('reconciliation.expectedBalance')}</span>
                    <span className="text-sm">৳{expectedBalance.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Non-Cash Digital Tenders */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                {t('reconciliation.nonCashTotals')}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                {Object.entries(summary.non_cash_totals || {}).map(([method, amt]) => (
                  <div
                    key={method}
                    className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                  >
                    <span className="text-[10px] text-slate-400 font-sans uppercase block">
                      {method}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      ৳{Number(amt as string).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Counts */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  {t('reconciliation.salesCount')}
                </span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {summary.sales_count}
                </span>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  {t('reconciliation.returnsCount')}
                </span>
                <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {summary.returns_count}
                </span>
              </div>
              <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  {t('reconciliation.voidsCount')}
                </span>
                <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                  {summary.voids_count}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-3 border-slate-100 dark:border-slate-800 flex justify-between sm:justify-between items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintXReport}
            disabled={!summary}
            className="gap-1.5 text-xs"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Print X Report</span>
          </Button>

          <Button type="button" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
