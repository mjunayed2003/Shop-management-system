'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { api } from '@/lib/api/endpoints';
import { formatBDT } from '@/lib/utils/formatters';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

const paymentSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  purchaseId: z.string().optional().or(z.literal('')),
  amount: z.number().min(0.01, 'Payment amount must be greater than zero'),
  paymentMethod: z.enum(['CASH', 'BANK', 'BKASH', 'NAGAD', 'CHEQUE', 'OTHER']),
  referenceNo: z.string().optional(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId?: string;
  supplierName?: string;
  purchaseId?: string;
  purchaseNo?: string;
  purchaseDue?: number;
  onSuccess: (payment: any) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  supplierId = '',
  supplierName,
  purchaseId = '',
  purchaseNo,
  purchaseDue,
  onSuccess,
}: PaymentModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      supplierId: supplierId || '',
      purchaseId: purchaseId || '',
      amount: purchaseDue && purchaseDue > 0 ? purchaseDue : 0,
      paymentMethod: 'BANK',
      referenceNo: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const enteredAmount = watch('amount');

  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
      reset({
        supplierId: supplierId || '',
        purchaseId: purchaseId || '',
        amount: purchaseDue && purchaseDue > 0 ? purchaseDue : 0,
        paymentMethod: 'BANK',
        referenceNo: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: purchaseNo ? `Payment for purchase ${purchaseNo}` : '',
      });
    }
  }, [isOpen, supplierId, purchaseId, purchaseDue, purchaseNo, reset]);

  if (!isOpen) return null;

  const onSubmit = async (values: PaymentFormValues) => {
    // Overpayment check in the UI:
    // If paying against a specific purchase, amount cannot exceed purchaseDue
    if (purchaseDue !== undefined && purchaseDue > 0 && values.amount > purchaseDue) {
      setValidationError(
        `Payment amount (${formatBDT(values.amount)}) cannot exceed purchase due amount (${formatBDT(purchaseDue)}).`,
      );
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    try {
      const payment = await api.purchases.payments.create({
        supplierId: values.supplierId,
        purchaseId: values.purchaseId || undefined,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        referenceNo: values.referenceNo || undefined,
        paymentDate: values.paymentDate ? `${values.paymentDate}T12:00:00Z` : undefined,
        notes: values.notes || undefined,
      });

      showToast('Supplier payment recorded successfully', 'success');
      onSuccess(payment);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to record supplier payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('purchasing.payments')}
              </h3>
              <p className="text-xs text-slate-500">
                {supplierName ? `Pay to: ${supplierName}` : 'Record payment to vendor'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {purchaseNo && purchaseDue !== undefined && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Linked Purchase:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {purchaseNo}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Current Due:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatBDT(purchaseDue)}
                </span>
              </div>
            </div>
          )}

          <FormFieldWrapper label="Payment Amount (BDT) *" error={errors.amount?.message}>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <MoneyInput
                  value={field.value}
                  onChange={(val) => {
                    field.onChange(val);
                    if (purchaseDue !== undefined && val > purchaseDue) {
                      setValidationError(
                        `Payment amount cannot exceed purchase due (${formatBDT(purchaseDue)}).`,
                      );
                    } else {
                      setValidationError(null);
                    }
                  }}
                  isError={Boolean(errors.amount || validationError)}
                  placeholder="0.00"
                />
              )}
            />
          </FormFieldWrapper>

          <div className="grid grid-cols-2 gap-3">
            <FormFieldWrapper label="Payment Method *" error={errors.paymentMethod?.message}>
              <select
                {...register('paymentMethod')}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="BANK">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </FormFieldWrapper>

            <FormFieldWrapper label="Payment Date *" error={errors.paymentDate?.message}>
              <Input
                {...register('paymentDate')}
                type="date"
                isError={Boolean(errors.paymentDate)}
              />
            </FormFieldWrapper>
          </div>

          <FormFieldWrapper label="Reference / Cheque # (Optional)" error={errors.referenceNo?.message}>
            <Input
              {...register('referenceNo')}
              placeholder="e.g. CHQ-99120 or TXN-449"
            />
          </FormFieldWrapper>

          <FormFieldWrapper label="Notes (Optional)" error={errors.notes?.message}>
            <Input
              {...register('notes')}
              placeholder="e.g. Partial installment payment"
            />
          </FormFieldWrapper>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (purchaseDue !== undefined && enteredAmount > purchaseDue)
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
            >
              {isSubmitting ? t('submitting') : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
