'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  const isVisible = open !== undefined ? open : Boolean(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible) {
      setReason('');
      setReasonError(false);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isVisible]);

  if (!mounted || !isVisible) return null;

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

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !effectiveLoading) {
          handleClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all p-6 space-y-4 my-auto animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isDestructive
                ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-900 shadow-rose-500/10'
                : 'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/80 dark:text-orange-400 dark:border-orange-900 shadow-orange-500/10'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{title}</h3>
            {typeof description === 'string' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={effectiveLoading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason variant if requireReason is true */}
        {requireReason && (
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
              className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 ${
                reasonError
                  ? 'border-rose-500 focus:ring-rose-400/30'
                  : 'border-slate-200 dark:border-slate-800 focus:border-orange-500 focus:ring-orange-500'
              }`}
            />
            {reasonError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                {t('reasonRequired')}
              </p>
            )}
          </div>
        )}

        {/* Custom Children */}
        {children}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 -mx-6 -mb-6 px-6 py-4 bg-slate-50/70 dark:bg-slate-900/60 rounded-b-3xl">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={effectiveLoading}
            className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer shadow-2xs"
          >
            {cancelText || t('cancel')}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            isLoading={effectiveLoading}
            disabled={effectiveLoading || disabled || (requireReason && !reason.trim())}
            className={`h-9 px-5 rounded-xl font-bold text-xs cursor-pointer shadow-md ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25'
            }`}
          >
            {confirmText || t('confirm')}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
