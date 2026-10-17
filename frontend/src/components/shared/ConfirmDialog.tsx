'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface ConfirmDialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default' | 'destructive' | 'warning';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  isLoading?: boolean;
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  open,
  onClose,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'default',
  requireReason = false,
  reasonLabel,
  reasonPlaceholder,
  isLoading = false,
  loading = false,
  disabled = false,
  children,
}) => {
  const effectiveLoading = isLoading || loading;
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);

  const isVisible = open !== undefined ? open : Boolean(isOpen);

  useEffect(() => {
    if (isVisible) {
      setReason('');
      setReasonError(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setReasonError(true);
      return;
    }
    await onConfirm(requireReason ? reason.trim() : undefined);
  };

  const isDestructive = variant === 'danger' || variant === 'destructive';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-full shrink-0 ${
              isDestructive
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {typeof description === 'string' ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason variant if requireReason is true */}
        {requireReason && (
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              {reasonLabel || t('reasonRequired')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError && e.target.value.trim()) {
                  setReasonError(false);
                }
              }}
              placeholder={reasonPlaceholder || t('reasonPlaceholder')}
              className={`w-full rounded-lg border bg-white dark:bg-slate-950 p-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                reasonError
                  ? 'border-rose-500 focus:ring-rose-400/30'
                  : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-400/30'
              }`}
            />
            {reasonError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {t('reasonRequired')}
              </p>
            )}
          </div>
        )}

        {/* Custom Children */}
        {children}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button variant="outline" onClick={handleClose} disabled={effectiveLoading}>
            {cancelText || t('cancel')}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            isLoading={effectiveLoading}
            disabled={effectiveLoading || disabled || (requireReason && !reason.trim())}
          >
            {confirmText || t('confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};
