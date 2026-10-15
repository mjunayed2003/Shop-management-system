'use client';

import React from 'react';
import { Button } from '../ui/button';
import { useTranslation } from '@/lib/i18n';
import { Zap, X, ArrowUpRight } from 'lucide-react';

export interface PlanLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  planName?: string;
}

export const PlanLimitDialog: React.FC<PlanLimitDialogProps> = ({
  isOpen,
  onClose,
  message,
  planName,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/60 p-6 space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Zap className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('shell.planLimitReachedTitle')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {message || t('shell.planLimitReachedDesc')}
          </p>
        </div>

        {planName && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
            বর্তমান প্ল্যান: <strong>{planName}</strong>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <a
            href="mailto:billing@shop-pos.com?subject=Plan%20Upgrade%20Request"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <span>{t('shell.upgradePlan')}</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
