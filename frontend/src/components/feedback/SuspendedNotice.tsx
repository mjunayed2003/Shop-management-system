'use client';

import React from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { Button } from '../ui/button';
import { ShieldAlert, PhoneCall, HelpCircle } from 'lucide-react';

export function SuspendedNotice() {
  const isSuspended = useAuthStore((s) => s.isSuspended);
  const business = useAuthStore((s) => s.business);
  const { t } = useTranslation();

  if (!isSuspended) return null;

  return (
    <div
      className="fixed inset-0 z-[999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xl p-6 sm:p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {t('auth.subscriptionSuspended')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {business?.name || 'আপনার দোকান'} এর সফটওয়্যার সাবস্ক্রিপশন ফি অপরিশোধিত বা স্থগিত রয়েছে।
            ডেটা সুরক্ষার জন্য লেনদেন সাময়িকভাবে স্থগিত করা হয়েছে।
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-left space-y-1.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between">
            <span>দোকানের নাম:</span>
            <strong className="text-slate-900 dark:text-slate-100">{business?.name}</strong>
          </div>
          <div className="flex justify-between">
            <span>অবস্থা:</span>
            <strong className="text-rose-600 dark:text-rose-400">SUSPENDED (স্থগিত)</strong>
          </div>
          <div className="flex justify-between">
            <span>সহায়তা হটলাইন:</span>
            <strong className="text-emerald-600">+৮৮০ ১৭০০০০০০০০</strong>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <a
            href="tel:+8801700000000"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <PhoneCall className="w-4 h-4" />
            <span>সাপোর্টে সরাসরি কল করুন</span>
          </a>
          <a
            href="mailto:support@shop-pos.com?subject=Subscription%20Suspension%20Inquiry"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>ইমেইল পাঠান (support@shop-pos.com)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
