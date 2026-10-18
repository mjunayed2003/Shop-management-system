'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import {
  Wallet,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Receipt,
  Building2,
  User,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { getPrintSettings, defaultPrinterAdapter } from '@/lib/utils/printer';
import { generateDueReceiptHtml, DueReceiptData } from '@/lib/utils/receipt-template';

export default function CustomerCollectDuePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const toast = useToast();

  const currentBranch = useBranchStore((s) => s.currentBranch);

  // Single Idempotency Key per collection intent
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, [customerId]);

  // Form states
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [transactionNo, setTransactionNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [completedCollection, setCompletedCollection] = useState<any | null>(null);
  const [isReprint, setIsReprint] = useState<boolean>(false);

  // Fetch customer details
  const { data: customer, isLoading: customerLoading, error: customerError } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: () => api.customers.get(customerId),
    enabled: Boolean(customerId),
  });

  // Fetch active register shift for cash requirement
  const { data: currentShift } = useQuery({
    queryKey: ['register-session-current', currentBranch?.id],
    queryFn: () => api.sales.registerSessions.current(),
    enabled: Boolean(currentBranch?.id),
    staleTime: 10_000,
  });

  const currentDue = Number(customer?.current_due ?? customer?.currentDue ?? 0);

  // Validation
  const isOverpayment = amount > currentDue;
  const isZeroOrNegative = amount <= 0;
  const isCashWithNoShift = paymentMethod === 'CASH' && !currentShift;
  const canSubmit = !isZeroOrNegative && !isOverpayment && !isCashWithNoShift && Boolean(customer);

  // Quick Buttons
  const handleSetFullDue = () => {
    setAmount(currentDue);
  };

  const handleSetHalfDue = () => {
    const half = new Decimal(currentDue).div(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    setAmount(half);
  };

  // Collect Due Mutation
  const collectMutation = useMutation({
    mutationFn: async () => {
      return api.sales.dueCollections.collect({
        customerId,
        amount,
        paymentMethod,
        transactionNo: transactionNo.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });
    },
    onSuccess: (data: any) => {
      toast.success(t('due.collectionSuccess'));
      setCompletedCollection(data);
      queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] });
      queryClient.invalidateQueries({ queryKey: ['due-collections-list'] });
      queryClient.invalidateQueries({ queryKey: ['register-session-current'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to collect due';
      toast.error(msg, 'Collection Refused');
    },
  });

  // Print Money Receipt
  const handlePrintReceipt = async () => {
    if (!completedCollection || !customer) return;
    try {
      const printSettings = getPrintSettings();
      const receiptData: DueReceiptData = {
        collectionNo: completedCollection.collection_no || completedCollection.collectionNo || 'COL-000',
        date: completedCollection.created_at || new Date().toISOString(),
        businessName: currentBranch?.name,
        branchName: currentBranch?.name || 'Branch',
        branchPhone: currentBranch?.phone || undefined,
        customer: {
          name: customer.name,
          phone: customer.phone,
          currentDue,
        },
        amountPaid: completedCollection.amount || amount,
        paymentMethod,
        transactionNo: completedCollection.transaction_no || transactionNo || undefined,
        notes: completedCollection.notes || notes || undefined,
        allocations: completedCollection.allocations || [],
        remainingDue: completedCollection.remainingDue || completedCollection.remaining_due,
      };

      const html = generateDueReceiptHtml(receiptData, printSettings, isReprint);
      await defaultPrinterAdapter.printReceipt(html, {
        copies: 1,
        format: printSettings.format,
      });
      setIsReprint(true);
    } catch {
      toast.error('Print failed');
    }
  };

  if (customerLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span>{t('loading')}</span>
      </div>
    );
  }

  if (customerError || !customer) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-foreground">Customer Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Could not locate customer with ID &quot;{customerId}&quot;.
        </p>
        <Button asChild variant="outline" className="mt-4 gap-2">
          <Link href="/customers/due">
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back')}</span>
          </Link>
        </Button>
      </div>
    );
  }

  // Success view with allocation breakdown
  if (completedCollection) {
    return (
      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        <Card className="border-emerald-200 dark:border-emerald-900 shadow-md">
          <CardHeader className="text-center pb-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {t('due.collectionSuccess')}
            </CardTitle>
            <CardDescription className="text-xs">
              Money Receipt #{completedCollection.collection_no || completedCollection.collectionNo}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between font-bold text-sm">
                <span>Amount Collected ({paymentMethod}):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  BDT {Number(completedCollection.amount || amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('due.remainingDue')}:</span>
                <span className="font-mono font-semibold text-foreground">
                  BDT {Number(completedCollection.remainingDue || completedCollection.remaining_due || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Oldest-First FIFO Allocation Breakdown */}
            {completedCollection.allocations && completedCollection.allocations.length > 0 && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-semibold text-foreground text-xs">{t('due.allocationTitle')}</span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {completedCollection.allocations.map((alloc: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1.5 text-[11px]">
                      <div>
                        <span className="font-mono font-bold text-primary">{alloc.invoiceNo}</span>
                        {alloc.branchId && alloc.branchId !== currentBranch?.id && (
                          <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 rounded">
                            Cross-Branch
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-foreground">
                        BDT {Number(alloc.amountApplied).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>{t('due.printReceipt')}</span>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/customers/due">Back to Collections</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Link href="/customers/due">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span>{t('due.title')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('due.subtitle')}</p>
        </div>
      </div>

      {/* Customer Info Card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-foreground">{customer.name}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {customer.phone}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Credit Limit: BDT {Number(customer.credit_limit || customer.creditLimit || 0).toLocaleString()}
            </p>
          </div>

          <div className="sm:text-right">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              {t('due.totalDue')}
            </span>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              BDT {currentDue.toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Register Shift Gate for CASH */}
      {isCashWithNoShift && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{t('due.requiresOpenSession')}</span>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <Link href="/pos">Open Register Shift</Link>
          </Button>
        </div>
      )}

      {/* Collection Form */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">Debt Settlement Voucher</CardTitle>
          <CardDescription className="text-xs">
            Amount entered will automatically settle the customer&apos;s oldest unpaid sales first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {/* Amount input with Quick buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground">
                {t('due.amountToCollect')} <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSetHalfDue}
                  disabled={currentDue <= 0}
                  className="h-6 px-2 text-[10px] font-semibold"
                >
                  {t('due.quickHalf')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSetFullDue}
                  disabled={currentDue <= 0}
                  className="h-6 px-2 text-[10px] font-semibold text-emerald-600"
                >
                  {t('due.quickFull')}
                </Button>
              </div>
            </div>

            <MoneyInput
              value={amount}
              onChange={setAmount}
              className="text-base font-mono font-bold"
            />

            {isOverpayment && (
              <p className="text-rose-500 text-[11px] font-medium">
                {t('due.advanceNotAllowed', { due: currentDue.toFixed(2) })}
              </p>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">{t('due.paymentMethod')}</label>
            <div className="grid grid-cols-4 gap-2">
              {['CASH', 'BKASH', 'NAGAD', 'BANK'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    paymentMethod === method
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction / Reference # for digital payment */}
          {paymentMethod !== 'CASH' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">{t('due.transactionNo')}</label>
              <Input
                value={transactionNo}
                onChange={(e) => setTransactionNo(e.target.value)}
                placeholder="e.g. TrxID / Check #..."
                className="text-xs"
              />
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">{t('due.notes')}</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid in showroom at evening shift..."
              className="text-xs"
            />
          </div>
        </CardContent>

        <CardFooter className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            disabled={!canSubmit || collectMutation.isPending || currentDue <= 0}
            onClick={() => collectMutation.mutate()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
          >
            {collectMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Debt Collection...</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4" />
                <span>{t('due.collectBtn')}</span>
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
