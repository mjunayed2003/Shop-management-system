'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SessionSummaryModal } from '@/components/pos/SessionSummaryModal';
import { downloadCsv } from '@/lib/utils/csv';
import {
  BookOpen,
  Calendar,
  Building2,
  Download,
  Printer,
  ArrowLeft,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  FileText,
} from 'lucide-react';
import { generateZReportHtml, printHtml } from '@/lib/utils/receipt-template';

export default function DailyCashBookPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.isOwner;

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [selectedSessionForModal, setSelectedSessionForModal] = useState<string | null>(null);

  // Query Cash Book
  const {
    data: cashBookEntries,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['register-cash-book', currentBranch?.id, selectedDate],
    queryFn: () =>
      api.sales.registerSessions.cashBook({
        date: new Date(selectedDate).toISOString(),
      }),
  });

  const entries: any[] = Array.isArray(cashBookEntries) ? cashBookEntries : [];

  // Summary KPI Totals
  const totals = React.useMemo(() => {
    let sumOpening = new Decimal(0);
    let sumExpected = new Decimal(0);
    let sumClosing = new Decimal(0);
    let sumDiscrepancy = new Decimal(0);
    let openCount = 0;
    let closedCount = 0;

    for (const e of entries) {
      sumOpening = sumOpening.plus(e.openingBalance || 0);
      sumExpected = sumExpected.plus(e.expectedBalance || 0);
      sumClosing = sumClosing.plus(e.closingBalance || 0);
      sumDiscrepancy = sumDiscrepancy.plus(e.discrepancy || 0);
      if (e.status === 'OPEN') openCount++;
      if (e.status === 'CLOSED') closedCount++;
    }

    return {
      opening: sumOpening.toFixed(2),
      expected: sumExpected.toFixed(2),
      closing: sumClosing.toFixed(2),
      discrepancy: sumDiscrepancy.toFixed(2),
      totalSessions: entries.length,
      openCount,
      closedCount,
    };
  }, [entries]);

  // Export CSV
  const handleExportCsv = () => {
    if (entries.length === 0) {
      toast.warning('No cash book records to export.');
      return;
    }

    const headers = [
      'Branch',
      'Register',
      'Cashier',
      'Status',
      'Opened At',
      'Closed At',
      'Opening Balance (BDT)',
      'Expected Cash (BDT)',
      'Counted Closing (BDT)',
      'Discrepancy (BDT)',
      'Notes',
    ];

    const rows = entries.map((e) => [
      e.branch?.name || '',
      e.register || '',
      e.cashier || '',
      e.status,
      e.openedAt ? new Date(e.openedAt).toLocaleTimeString() : '',
      e.closedAt ? new Date(e.closedAt).toLocaleTimeString() : '',
      e.openingBalance,
      e.expectedBalance,
      e.closingBalance,
      e.discrepancy,
      e.closingNotes || '',
    ]);

    downloadCsv(
      rows.map((row) => ({
        [headers[0]]: row[0],
        [headers[1]]: row[1],
        [headers[2]]: row[2],
        [headers[3]]: row[3],
        [headers[4]]: row[4],
        [headers[5]]: row[5],
        [headers[6]]: row[6],
        [headers[7]]: row[7],
        [headers[8]]: row[8],
        [headers[9]]: row[9],
        [headers[10]]: row[10],
      })),
      `cash_book_${selectedDate}.csv`,
    );
  };

  const handlePrintEntryZReport = (entry: any) => {
    const reportData = {
      registerName: entry.register,
      cashierName: entry.cashier,
      branchName: entry.branch?.name || currentBranch?.name || 'Branch',
      openedAt: entry.openedAt,
      closedAt: entry.closedAt || new Date().toISOString(),
      openingBalance: entry.openingBalance,
      cashSales: '0.00',
      cashDueCollections: '0.00',
      payIns: '0.00',
      payOuts: '0.00',
      cashRefunds: '0.00',
      cashExpenses: '0.00',
      expectedBalance: entry.expectedBalance,
      closingBalance: entry.closingBalance,
      discrepancy: entry.discrepancy,
      salesCount: 0,
      returnsCount: 0,
      voidsCount: 0,
      closingNotes: entry.closingNotes || undefined,
    };

    const html = generateZReportHtml(reportData, 'THERMAL_80', true);
    printHtml(html);
  };

  const columns: Column<any>[] = [
    {
      header: 'Shift Status',
      accessor: (r) => (
        <div>
          {r.status === 'OPEN' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Unlock className="w-3 h-3" />
              Active Shift
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Lock className="w-3 h-3 text-slate-400" />
              Closed Shift
            </span>
          )}
        </div>
      ),
    },
    ...(isOwner
      ? [
          {
            header: 'Branch',
            accessor: (r: any) => (
              <span className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {r.branch?.name || '-'}
              </span>
            ),
          },
        ]
      : []),
    {
      header: 'Register & Cashier',
      accessor: (r) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-900 dark:text-white">{r.register}</div>
          <div className="text-slate-500">{r.cashier}</div>
        </div>
      ),
    },
    {
      header: 'Shift Timings',
      accessor: (r) => (
        <div className="text-xs font-mono text-slate-600 dark:text-slate-400 space-y-0.5">
          <div>
            In: {r.openedAt ? new Date(r.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
          </div>
          <div>
            Out: {r.closedAt ? new Date(r.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
              <span className="text-emerald-600 font-sans italic">In Progress</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Opening Float',
      align: 'right',
      accessor: (r) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          ৳{Number(r.openingBalance).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Expected Cash',
      align: 'right',
      accessor: (r) => (
        <span className="font-mono text-xs text-slate-800 dark:text-slate-200 font-medium">
          ৳{Number(r.expectedBalance).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Counted Cash',
      align: 'right',
      accessor: (r) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
          ৳{Number(r.closingBalance).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Discrepancy',
      align: 'right',
      accessor: (r) => {
        const disc = new Decimal(r.discrepancy || 0);
        return (
          <span
            className={`font-mono text-xs font-bold ${
              disc.isZero()
                ? 'text-emerald-600'
                : disc.greaterThan(0)
                ? 'text-indigo-600'
                : 'text-rose-600'
            }`}
          >
            {disc.isZero() ? 'Balanced' : `${disc.greaterThan(0) ? '+' : ''}৳${disc.toFixed(2)}`}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600"
            onClick={() => setSelectedSessionForModal(r.sessionId)}
            title="View Live Session Details"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {r.status === 'CLOSED' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600"
              onClick={() => handlePrintEntryZReport(r)}
              title="Print Z Report"
            >
              <Printer className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/pos">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              {t('reconciliation.cashBookTitle')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('reconciliation.cashBookDesc')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportCsv}
            disabled={entries.length === 0}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Cash Book CSV</span>
          </Button>
        </div>
      </div>

      {/* Date Filter & Branch Badges */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Accounting Date:</span>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 h-8 text-xs bg-white dark:bg-slate-800"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border text-slate-600 dark:text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Branch: <strong>{currentBranch?.name || 'All Branches'}</strong></span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 gap-1 text-xs text-slate-500"
          >
            <RotateCcw className="w-3 h-3" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Shifts
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {totals.totalSessions}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {totals.openCount} Open · {totals.closedCount} Closed
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Opening Float
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-800 dark:text-slate-200">
            ৳{Number(totals.opening).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Combined initial drawer cash</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Counted Cash
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            ৳{Number(totals.closing).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Physical cash accounted for
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Net Discrepancy
          </span>
          <div
            className={`mt-2 text-2xl font-bold font-mono ${
              Number(totals.discrepancy) === 0
                ? 'text-emerald-600'
                : Number(totals.discrepancy) > 0
                ? 'text-indigo-600'
                : 'text-rose-600'
            }`}
          >
            {Number(totals.discrepancy) === 0
              ? 'Balanced'
              : `${Number(totals.discrepancy) > 0 ? '+' : ''}৳${Number(
                  totals.discrepancy,
                ).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Variance across all cashier drawers
          </span>
        </div>
      </div>

      {/* Cash Book DataTable */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <DataTable
          columns={columns}
          data={entries}
          isLoading={isLoading}
          keyField="sessionId"
          emptyMessage={
            <div className="p-8 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No register sessions recorded for {selectedDate}.
              </p>
            </div>
          }
        />
      </div>

      {/* Modal for viewing individual session details */}
      {selectedSessionForModal && (
        <SessionSummaryModal
          isOpen={Boolean(selectedSessionForModal)}
          onClose={() => setSelectedSessionForModal(null)}
          sessionId={selectedSessionForModal}
        />
      )}
    </div>
  );
}
