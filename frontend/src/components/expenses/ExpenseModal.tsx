'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { ExpenseCategoriesModal } from './ExpenseCategoriesModal';
import {
  Receipt,
  Plus,
  AlertTriangle,
  Upload,
  X,
  Loader2,
  FileText,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: any | null;
  onSaved?: () => void;
}

export default function ExpenseModal({
  isOpen,
  onClose,
  expenseToEdit,
  onSaved,
}: ExpenseModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentBranch = useBranchStore((s) => s.currentBranch);

  const isEditing = Boolean(expenseToEdit);

  // Categories list
  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.expenses.categories.list(),
    enabled: isOpen,
  });

  // Active register shift check
  const { data: currentShift } = useQuery({
    queryKey: ['register-session-current', currentBranch?.id],
    queryFn: () => api.sales.registerSessions.current(),
    enabled: isOpen && Boolean(currentBranch?.id),
    staleTime: 10_000,
  });

  // Sub-modal for creating category
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form states
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [vendorName, setVendorName] = useState<string>('');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paidFromRegister, setPaidFromRegister] = useState<boolean>(false);
  const [editReason, setEditReason] = useState<string>('');

  // Attachment state
  const [attachment, setAttachment] = useState<{
    fileName: string;
    mimeType: string;
    fileContentBase64: string;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Populate form on edit
  useEffect(() => {
    if (expenseToEdit) {
      setCategoryId(expenseToEdit.expense_category_id || expenseToEdit.categoryId || '');
      setAmount(Number(expenseToEdit.amount || 0));
      setTaxAmount(Number(expenseToEdit.tax_amount || expenseToEdit.taxAmount || 0));
      setExpenseDate(
        expenseToEdit.expense_date
          ? new Date(expenseToEdit.expense_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      );
      setVendorName(expenseToEdit.vendor_name || '');
      setReceiptNo(expenseToEdit.receipt_no || '');
      setDescription(expenseToEdit.description || '');
      setPaymentMethod(expenseToEdit.payment_method || 'CASH');
      setPaidFromRegister(Boolean(expenseToEdit.register_session_id));
      setEditReason('');
      setAttachment(null);
      setPreviewUrl(null);
    } else {
      setCategoryId('');
      setAmount(0);
      setTaxAmount(0);
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setVendorName('');
      setReceiptNo('');
      setDescription('');
      setPaymentMethod('CASH');
      setPaidFromRegister(false);
      setEditReason('');
      setAttachment(null);
      setPreviewUrl(null);
    }
  }, [expenseToEdit, isOpen]);

  // Local estimate (Server authoritative total calculated on backend)
  const estimatedTotal = useMemo(() => {
    return new Decimal(amount || 0).plus(taxAmount || 0).toNumber();
  }, [amount, taxAmount]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client size limit 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size cannot exceed 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setAttachment({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileContentBase64: base64Data,
      });
      if (file.type.startsWith('image/')) {
        setPreviewUrl(reader.result as string);
      } else {
        setPreviewUrl(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Check if editing linked to closed shift
  const isLinkedToClosedSession =
    isEditing &&
    expenseToEdit?.register_session_id &&
    expenseToEdit?.register_session?.status === 'CLOSED';

  // Validation
  const isAmountInvalid = amount <= 0;
  const isCategoryMissing = !categoryId;
  const isReasonMissing = isLinkedToClosedSession && !editReason.trim();
  const canSubmit = !isAmountInvalid && !isCategoryMissing && !isReasonMissing;

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        return api.expenses.update(expenseToEdit.id, {
          expenseCategoryId: categoryId,
          amount,
          taxAmount,
          vendorName: vendorName.trim() || undefined,
          receiptNo: receiptNo.trim() || undefined,
          description: description.trim() || undefined,
          reason: isLinkedToClosedSession ? editReason.trim() : undefined,
        });
      } else {
        return api.expenses.create({
          expenseCategoryId: categoryId,
          amount,
          taxAmount,
          expenseDate,
          vendorName: vendorName.trim() || undefined,
          receiptNo: receiptNo.trim() || undefined,
          description: description.trim() || undefined,
          paymentMethod,
          paidFromRegister: paymentMethod === 'CASH' ? paidFromRegister : false,
          attachment: attachment || undefined,
        });
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Expense voucher updated' : 'Expense voucher recorded');
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      queryClient.invalidateQueries({ queryKey: ['register-session-current'] });
      if (onSaved) onSaved();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save expense';
      toast.error(msg, 'Save Refused');
    },
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <span>{isEditing ? t('expenses.editExpense') : t('expenses.addExpense')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record operational expenses, store utilities, and drawer disbursements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Category with inline + New Category button */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-foreground">
                  {t('expenses.categories')} <span className="text-rose-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="h-6 px-1.5 text-[11px] text-primary gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('expenses.addCategory')}</span>
                </Button>
              </div>

              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">-- Select Expense Category --</option>
                {(categories || []).map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.code ? `(${cat.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount & Tax */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  {t('expenses.amount')} <span className="text-rose-500">*</span>
                </label>
                <MoneyInput value={amount} onChange={setAmount} />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">{t('expenses.taxAmount')}</label>
                <MoneyInput value={taxAmount} onChange={setTaxAmount} />
              </div>
            </div>

            {/* Estimated Total Display */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Estimated Total:</span>
              <span className="font-mono font-bold text-foreground text-sm">
                BDT {estimatedTotal.toFixed(2)}
              </span>
            </div>

            {/* Date & Vendor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">{t('expenses.expenseDate')}</label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">{t('expenses.vendorName')}</label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Electric Co, Cafe..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* Receipt No & Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">{t('expenses.receiptNo')}</label>
                <Input
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  placeholder="e.g. BILL-9823"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">{t('expenses.paymentMethod')}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPaymentMethod(val);
                    if (val !== 'CASH') setPaidFromRegister(false);
                  }}
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="CASH">CASH</option>
                  <option value="BKASH">BKASH</option>
                  <option value="NAGAD">NAGAD</option>
                  <option value="BANK">BANK</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">{t('expenses.description')}</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly showroom power bill..."
                className="text-xs"
              />
            </div>

            {/* Paid from Register Cash Toggle */}
            {!isEditing && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground block">{t('expenses.paidFromRegister')}</span>
                    <span className="text-[11px] text-muted-foreground">{t('expenses.paidFromRegisterDesc')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paidFromRegister}
                    disabled={paymentMethod !== 'CASH' || !currentShift}
                    onChange={(e) => setPaidFromRegister(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                {paymentMethod !== 'CASH' && (
                  <p className="text-[10px] text-muted-foreground italic">
                    {t('expenses.paidFromRegisterCashOnly')}
                  </p>
                )}

                {paymentMethod === 'CASH' && !currentShift && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>No open register session in this branch.</span>
                  </p>
                )}
              </div>
            )}

            {/* Edit Reason if linked session is closed */}
            {isLinkedToClosedSession && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 space-y-2">
                <span className="font-semibold text-amber-800 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>{t('expenses.editClosedSessionReason')}</span>
                </span>
                <Input
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Justification for modifying past shift expense..."
                  className="text-xs bg-white dark:bg-slate-900"
                />
              </div>
            )}

            {/* Bill / Receipt Attachment Upload */}
            {!isEditing && (
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">{t('expenses.attachment')}</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{attachment ? 'Change File' : 'Upload Receipt Image'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {attachment && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                      <span>{attachment.fileName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachment(null);
                          setPreviewUrl(null);
                        }}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {previewUrl && (
                  <div className="mt-2 p-1 border rounded-lg max-w-[160px] bg-slate-50 dark:bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="w-full h-auto rounded max-h-28 object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              {t('cancel')}
            </Button>
            <Button
              type="button"
              disabled={!canSubmit || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Update Voucher' : 'Save Expense Voucher'}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Modal for creating Category */}
      <ExpenseCategoriesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryCreated={(newCat) => {
          setCategoryId(newCat.id);
          setIsCategoryModalOpen(false);
        }}
      />
    </>
  );
}
