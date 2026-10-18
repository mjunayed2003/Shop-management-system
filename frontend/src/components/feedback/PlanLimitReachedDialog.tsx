'use client';

import React from 'react';
import Link from 'next/link';
import { usePlanLimitModalStore } from '@/lib/store/plan-limit-modal-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Zap } from 'lucide-react';

export function PlanLimitReachedDialog() {
  const { isOpen, limitInfo, closePlanLimitModal } = usePlanLimitModalStore();

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closePlanLimitModal()}>
      <DialogContent className="max-w-md p-6 space-y-4 rounded-3xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
            প্ল্যান সীমা সমাপ্ত (Plan Limit Reached)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
          <p className="leading-relaxed">
            {limitInfo?.message ||
              'আপনার বর্তমান সাবস্ক্রিপশন প্ল্যানের অনুমোদিত কোটা পূর্ণ হয়েছে। নতুন এন্ট্রি যোগ করতে বা পরিষেবা সচল রাখতে আপনার প্ল্যান আপগ্রেড করুন।'}
          </p>

          {limitInfo?.limitType && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {limitInfo.limitType}
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {limitInfo.current ?? 'Max'} / {limitInfo.max ?? 'Quota'}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={closePlanLimitModal}
            className="text-xs h-9 rounded-xl"
          >
            বাতিল (Close)
          </Button>

          <Link href="/billing" onClick={closePlanLimitModal} className="w-full sm:w-auto">
            <Button
              type="button"
              size="sm"
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>আপগ্রেড প্ল্যান দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
