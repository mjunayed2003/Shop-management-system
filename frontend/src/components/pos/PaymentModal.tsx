'use client';

import React, { useState, useEffect } from 'react';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useCartStore } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useOfflineStore } from '@/lib/store/offline-store';
import { createOfflineSale } from '@/lib/offline/offline-sales';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MoneyInput } from '@/components/shared/MoneyInput';
import {
  defaultPrinterAdapter,
  getPrintSettings,
} from '@/lib/utils/printer';
import {
  generateReceiptHtml,
  SaleReceiptData,
} from '@/lib/utils/receipt-template';
import { soundFx } from '@/lib/utils/audio';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface PaymentRow {
  id: string;
  method: 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'CARDS' | 'CHEQUE';
  amount: number;
  transactionNo?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  registerSessionId?: string;
}

const PAYMENT_METHODS: Array<{
  value: PaymentRow['method'];
  label: string;
  isMfsOrCard: boolean;
}> = [
  { value: 'CASH', label: 'Cash', isMfsOrCard: false },
  { value: 'BKASH', label: 'bKash', isMfsOrCard: true },
  { value: 'NAGAD', label: 'Nagad', isMfsOrCard: true },
  { value: 'CARDS', label: 'Card (POS)', isMfsOrCard: true },
  { value: 'BANK', label: 'Bank Transfer', isMfsOrCard: true },
  { value: 'CHEQUE', label: 'Cheque', isMfsOrCard: true },
];

export function PaymentModal({
  isOpen,
  onClose,
  registerSessionId,
}: PaymentModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { business } = useAuthStore();
  const {
    items,
    customer,
    saleType,
    couponCode,
    idempotencyKey,
    serverTotals,
    resetAfterSaleSuccess,
  } = useCartStore();

  const totalPayable = serverTotals ? serverTotals.totalAmount : 0;

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isSmsSent, setIsSmsSent] = useState(false);

  // Initialize payment rows when modal opens
  useEffect(() => {
    if (isOpen) {
      setPayments([
        {
          id: 'pay-0',
          method: 'CASH',
          amount: totalPayable,
        },
      ]);
      setSaleNotes('');
      setIsSubmitting(false);
      setSubmissionError(null);
      setCompletedSale(null);
      setIsSmsSent(false);
    }
  }, [isOpen, totalPayable]);

  // Handle keyboard shortcut Enter for New Sale on success screen
  useEffect(() => {
    if (!isOpen || !completedSale) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleFinishAndNewSale();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, completedSale]);

  // Calculate live preview totals with decimal.js
  let totalPaidPreview = new Decimal(0);
  let totalCashTendered = new Decimal(0);
  let totalNonCash = new Decimal(0);

  for (const p of payments) {
    const amt = new Decimal(p.amount || 0);
    totalPaidPreview = totalPaidPreview.plus(amt);
    if (p.method === 'CASH') {
      totalCashTendered = totalCashTendered.plus(amt);
    } else {
      totalNonCash = totalNonCash.plus(amt);
    }
  }

  const payableDecimal = new Decimal(totalPayable);
  const nonCashExceedsPayable = totalNonCash.greaterThan(payableDecimal);

  // Cash change calculation
  let changePreview = new Decimal(0);
  let netCashRecorded = totalCashTendered;
  const remainingBeforeCash = payableDecimal.minus(totalNonCash);

  if (totalCashTendered.greaterThan(0) && remainingBeforeCash.greaterThan(0)) {
    if (totalCashTendered.greaterThan(remainingBeforeCash)) {
      changePreview = totalCashTendered.minus(remainingBeforeCash);
      netCashRecorded = remainingBeforeCash;
    }
  } else if (remainingBeforeCash.lessThanOrEqualTo(0)) {
    changePreview = totalCashTendered;
    netCashRecorded = new Decimal(0);
  }

  const effectiveTotalPaid = totalNonCash.plus(netCashRecorded);
  const remainingDue = payableDecimal.minus(effectiveTotalPaid);
  const duePreview = remainingDue.greaterThan(0) ? remainingDue.toNumber() : 0;

  // Validation rules
  const hasDue = duePreview > 0;
  const isCustomerMissingForDue = hasDue && !customer;
  const isCustomerMissingForWholesale = saleType === 'WHOLESALE' && !customer;

  // Credit limit check
  const creditLimitExceeded =
    Boolean(customer && customer.creditLimit > 0 && customer.currentDue + duePreview > customer.creditLimit);

  const canSubmit =
    !isSubmitting &&
    !nonCashExceedsPayable &&
    !isCustomerMissingForDue &&
    !isCustomerMissingForWholesale &&
    payments.length > 0 &&
    totalPaidPreview.greaterThan(0);

  const handleAddPaymentRow = () => {
    const remaining = payableDecimal.minus(totalPaidPreview);
    const defaultAmount = remaining.greaterThan(0) ? remaining.toNumber() : 0;

    setPayments([
      ...payments,
      {
        id: `pay-${Date.now()}`,
        method: 'BKASH',
        amount: defaultAmount,
      },
    ]);
  };

  const handleRemovePaymentRow = (id: string) => {
    if (payments.length <= 1) return;
    setPayments(payments.filter((p) => p.id !== id));
  };

  const handleUpdatePayment = (
    id: string,
    field: keyof PaymentRow,
    value: any,
  ) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const setCashAmount = (amount: number) => {
    setPayments([
      {
        id: 'pay-0',
        method: 'CASH',
        amount,
      },
    ]);
  };

  const handleQuickNote = (note: number) => {
    setCashAmount(note);
  };

  const handleExactCash = () => {
    setCashAmount(totalPayable);
  };

  const handleRoundUpCash = () => {
    const rounded = Math.ceil(totalPayable / 100) * 100;
    setCashAmount(rounded);
  };

  const { isOnline, isManualOffline, isSimulatingOffline } = useOfflineStore();
  const { currentBranchId } = useBranchStore();
  const { user } = useAuthStore();

  const handleProcessSale = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    const isCurrentlyOffline = !isOnline || isManualOffline || isSimulatingOffline;

    try {
      if (isCurrentlyOffline) {
        // Create Offline Sale
        const offlineResult = await createOfflineSale({
          businessId: business?.id || '',
          branchId: currentBranchId || '',
          userId: user?.id || '',
          registerSessionId,
          customer,
          saleType,
          items: items.map((i) => ({
            variantId: i.variantId,
            sku: i.sku,
            name: i.name,
            barcode: i.barcode,
            quantity: i.quantity,
            unitPrice: i.isCustomPrice ? i.unitPrice : undefined,
            basePrice: i.unitPrice,
            discountAmount: i.discountAmount > 0 ? i.discountAmount : undefined,
            sourceBranchId: i.sourceBranchId,
            productUnitBarcode: i.productUnitBarcode,
          })),
          payments: payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            transactionNo: p.transactionNo,
          })),
          couponCode: couponCode || undefined,
          notes: saleNotes.trim() || undefined,
        });

        soundFx.playSuccess();
        const saleForDisplay = {
          ...offlineResult.receiptData,
          isOffline: true,
          isProvisional: true,
          invoiceNo: offlineResult.invoiceNo,
          totalAmount: offlineResult.provisionalTotals.totalAmount,
          paidAmount: offlineResult.totalPaid,
          dueAmount: offlineResult.dueAmount,
          changeAmount: changePreview.toNumber(),
          branch: { id: currentBranchId || '', name: 'Current Branch', code: 'BR' },
        };
        setCompletedSale(saleForDisplay);

        // Auto-print receipt if configured
        const printSettings = getPrintSettings();
        if (printSettings.autoPrint) {
          const receiptData: SaleReceiptData = {
            ...saleForDisplay,
            businessName: business?.name,
            cashierName: user?.firstName || 'Cashier',
          };
          const html = generateReceiptHtml(receiptData, printSettings, false);
          defaultPrinterAdapter.printReceipt(html, {
            copies: printSettings.copies,
            format: printSettings.format,
          });
        }
      } else {
        // Online Sale
        const payload = {
          idempotencyKey,
          customerId: customer?.id,
          saleType,
          items: items.map((i) => ({
            variantId: i.variantId,
            barcode: i.barcode,
            quantity: i.quantity,
            unitPrice: i.isCustomPrice ? i.unitPrice : undefined,
            discountAmount: i.discountAmount > 0 ? i.discountAmount : undefined,
            sourceBranchId: i.sourceBranchId,
            productUnitBarcode: i.productUnitBarcode,
          })),
          payments: payments.map((p, idx) => ({
            paymentMethod: p.method,
            amount: p.amount,
            transactionNo: p.transactionNo || undefined,
            idempotencyKey: `${idempotencyKey}:pay:${idx}`,
          })),
          couponCode: couponCode || undefined,
          notes: saleNotes.trim() || undefined,
          registerSessionId,
        };

        const result = await api.sales.create(payload);

        soundFx.playSuccess();
        setCompletedSale(result);

        // Auto-print receipt if configured
        const printSettings = getPrintSettings();
        if (printSettings.autoPrint) {
          const receiptData: SaleReceiptData = {
            ...result,
            businessName: business?.name,
            cashierName: result.cashier?.name,
          };
          const html = generateReceiptHtml(receiptData, printSettings, false);
          defaultPrinterAdapter.printReceipt(html, {
            copies: printSettings.copies,
            format: printSettings.format,
          });
        }
      }
    } catch (err: any) {
      soundFx.playError();
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Transaction failed or network disconnected';
      setSubmissionError(msg);
      toast.error(msg, 'Payment Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!completedSale) return;
    const printSettings = getPrintSettings();
    const receiptData: SaleReceiptData = {
      ...completedSale,
      businessName: business?.name,
      cashierName: completedSale.cashier?.name,
    };
    const html = generateReceiptHtml(receiptData, printSettings, false);
    defaultPrinterAdapter.printReceipt(html, {
      copies: printSettings.copies,
      format: printSettings.format,
    });
  };

  const handleSendSms = () => {
    if (!completedSale?.customer?.phone) {
      toast.error('Customer phone number not available');
      return;
    }
    setIsSmsSent(true);
    toast.success(t('pos.smsSent'));
  };

  const handleFinishAndNewSale = () => {
    resetAfterSaleSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border bg-card shadow-2xl">
        {completedSale ? (
          /* ================= SUCCESS SCREEN ================= */
          <div className="p-6 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                {t('pos.invoiceCreated')}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {t('pos.invoiceNo')}: <strong className="text-foreground">{completedSale.invoiceNo}</strong>
              </p>
              {(completedSale.isOffline || completedSale.isProvisional) && (
                <div className="pt-1">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold">
                    OFFLINE / PROVISIONAL INVOICE (অফলাইন খসড়া)
                  </Badge>
                </div>
              )}
            </div>

            {/* Financial Summary Card */}
            <div className="p-4 rounded-2xl bg-muted/50 border border-border text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('pos.total')}:</span>
                <span className="font-bold text-foreground">
                  ৳{Number(completedSale.totalAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('pos.paidAmount')}:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ৳{Number(completedSale.paidAmount).toFixed(2)}
                </span>
              </div>

              {Number(completedSale.changeAmount) > 0 && (
                <div className="flex justify-between border-t border-border pt-2 text-emerald-700 dark:text-emerald-300 font-bold">
                  <span>{t('pos.changeAmount')}:</span>
                  <span>৳{Number(completedSale.changeAmount).toFixed(2)}</span>
                </div>
              )}

              {Number(completedSale.dueAmount) > 0 && (
                <div className="flex justify-between border-t border-border pt-2 text-rose-600 dark:text-rose-400 font-bold">
                  <span>{t('pos.dueAmount')}:</span>
                  <span>৳{Number(completedSale.dueAmount).toFixed(2)}</span>
                </div>
              )}

              {completedSale.autoTransfers && completedSale.autoTransfers.length > 0 && (
                <div className="mt-3 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cross-Branch Auto-Transfers Triggered:</span>
                  </div>
                  {completedSale.autoTransfers.map((t: any, idx: number) => (
                    <div key={idx} className="font-mono text-[10px]">
                      • {t.variantSku || 'Item'}: transferred from {t.sourceBranch} (Transfer #{t.transferNo})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintReceipt}
                className="flex-1 gap-2 text-xs font-semibold h-11"
              >
                <Printer className="w-4 h-4 text-primary" />
                <span>{t('pos.printReceipt')}</span>
              </Button>

              {customer?.phone && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSmsSent}
                  onClick={handleSendSms}
                  className="flex-1 gap-2 text-xs font-semibold h-11"
                >
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>{isSmsSent ? 'SMS Sent' : t('pos.sendSms')}</span>
                </Button>
              )}

              <Button
                type="button"
                onClick={handleFinishAndNewSale}
                className="flex-1 gap-2 text-xs font-semibold h-11 bg-primary text-primary-foreground shadow-md"
                autoFocus
              >
                <span>{t('pos.newSale')}</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ================= TENDER & PAYMENT SCREEN ================= */
          <>
            <DialogHeader className="p-4 pb-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <DialogTitle className="text-base font-bold">
                    {t('pos.splitPayment')}
                  </DialogTitle>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {t('pos.total')}
                  </span>
                  <p className="text-xl font-extrabold text-foreground font-mono">
                    ৳{totalPayable.toFixed(2)}
                  </p>
                </div>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Select tender methods, quick cash notes, or enter customer partial due.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Quick Cash Buttons */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Quick Cash Tenders:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExactCash}
                    className="h-8 text-xs font-semibold"
                  >
                    {t('pos.exactCash')} (৳{totalPayable.toFixed(0)})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRoundUpCash}
                    className="h-8 text-xs font-semibold"
                  >
                    {t('pos.roundUp')}
                  </Button>
                  {[500, 1000, 2000, 5000].map((note) => (
                    <Button
                      key={note}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickNote(note)}
                      className="h-8 text-xs font-mono"
                    >
                      ৳{note}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Payment Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Tender Rows
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddPaymentRow}
                    className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary/90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('pos.addPaymentMethod')}</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {payments.map((row, index) => {
                    const methodDef = PAYMENT_METHODS.find((m) => m.value === row.method);
                    return (
                      <div
                        key={row.id}
                        className="p-3 rounded-xl border border-border bg-card/60 shadow-sm space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <select
                            value={row.method}
                            onChange={(e) =>
                              handleUpdatePayment(row.id, 'method', e.target.value)
                            }
                            className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-36"
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>

                          <div className="flex-1">
                            <MoneyInput
                              value={row.amount}
                              onChange={(val) => handleUpdatePayment(row.id, 'amount', val)}
                              min={0}
                              className="h-9 text-sm font-semibold"
                            />
                          </div>

                          {payments.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePaymentRow(row.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* Transaction ID input for Digital / Cards / Bank */}
                        {methodDef?.isMfsOrCard && (
                          <Input
                            value={row.transactionNo || ''}
                            onChange={(e) =>
                              handleUpdatePayment(row.id, 'transactionNo', e.target.value)
                            }
                            placeholder="Transaction ID / TRX No / Card Slip No"
                            className="h-8 text-xs font-mono"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error messages / validations */}
              {nonCashExceedsPayable && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{t('pos.nonCashExceedsTotal')}</span>
                </div>
              )}

              {isCustomerMissingForDue && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{t('pos.creditSaleRequiresCustomer')}</span>
                </div>
              )}

              {isCustomerMissingForWholesale && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{t('pos.wholesaleRequiresCustomer')}</span>
                </div>
              )}

              {creditLimitExceeded && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{t('pos.creditLimitExceeded')}</p>
                    <p className="text-[11px] mt-0.5">
                      Current Due: ৳{customer?.currentDue.toFixed(2)} | Limit: ৳{customer?.creditLimit.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {submissionError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">{submissionError}</p>
                    <p className="text-[11px] mt-0.5 text-rose-700 dark:text-rose-300">
                      {t('pos.networkError')}
                    </p>
                  </div>
                </div>
              )}

              {/* Live Preview Summary Bar */}
              <div className="p-3 rounded-xl bg-muted/60 border border-border space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('pos.paidAmount')}:</span>
                  <span className="font-semibold text-foreground font-mono">
                    ৳{totalPaidPreview.toFixed(2)}
                  </span>
                </div>

                {changePreview.greaterThan(0) && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                    <span>{t('pos.changeAmount')}:</span>
                    <span className="font-mono">৳{changePreview.toFixed(2)}</span>
                  </div>
                )}

                {duePreview > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                    <span>{t('pos.dueAmount')}:</span>
                    <span className="font-mono">৳{duePreview.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Optional Sale Remarks */}
              <div>
                <Input
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="Optional sale remarks or reference..."
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-border bg-muted/20 flex gap-2 justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs"
              >
                {t('cancel')}
              </Button>

              <Button
                type="button"
                disabled={!canSubmit}
                onClick={handleProcessSale}
                className="h-10 px-6 text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : submissionError ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>{t('pos.retrySafe')}</span>
                  </>
                ) : (
                  <>
                    <Banknote className="w-4 h-4" />
                    <span>{t('pos.payBtn')} (৳{totalPayable.toFixed(2)})</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
