'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { ShieldAlert, CreditCard, MessageSquare, PhoneCall } from 'lucide-react';
import { Button } from '../ui/button';

export function SuspendedNotice() {
  const isSuspended = useAuthStore((s) => s.isSuspended);
  const business = useAuthStore((s) => s.business);
  const { t, locale } = useTranslation();
  const pathname = usePathname();

  // Re-check session on window focus
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data?.business) {
            useAuthStore.getState().setAuth({
              user: data.user,
              business: data.business,
              permissions: data.permissions,
            });
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const subStatus = business?.subscription?.status;
  const isLocked = isSuspended || subStatus === 'SUSPENDED' || subStatus === 'CANCELLED';

  if (!isLocked) return null;

  // Allow access to /billing and /support pages as mandated by backend rules
  const isAllowedPath =
    pathname.startsWith('/billing') ||
    pathname.startsWith('/support');

  if (isAllowedPath) {
    return (
      <div className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            {locale === 'bn'
              ? 'সাবস্ক্রিপশন স্থগিত (Suspended): সেবা পুনরায় সক্রিয় করতে বকেয়া বিল পরিশোধ করুন অথবা সাপোর্টে যোগাযোগ করুন।'
              : 'Subscription Suspended: Please pay outstanding balance or contact support to reactivate your services.'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!pathname.startsWith('/billing') && (
            <Link href="/billing">
              <Button size="sm" variant="outline" className="h-6 text-[11px] bg-white text-rose-700 hover:bg-rose-50 border-none font-bold">
                {locale === 'bn' ? 'বিলিং ও ইনভয়েস' : 'Billing & Invoices'}
              </Button>
            </Link>
          )}
          {!pathname.startsWith('/support') && (
            <Link href="/support">
              <Button size="sm" variant="outline" className="h-6 text-[11px] bg-white text-rose-700 hover:bg-rose-50 border-none font-bold">
                {locale === 'bn' ? 'সাপোর্ট টিকিট' : 'Support Tickets'}
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Full screen lock on all other pages
  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-2xl p-6 sm:p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {subStatus === 'CANCELLED'
              ? (locale === 'bn' ? 'সাবস্ক্রিপশন বাতিল করা হয়েছে (Subscription Cancelled)' : 'Subscription Cancelled')
              : (locale === 'bn' ? 'সাবস্ক্রিপশন স্থগিত রয়েছে (Subscription Suspended)' : 'Subscription Suspended')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            {locale === 'bn' ? (
              `${business?.name || 'আপনার দোকান'} এর সফটওয়্যার সাবস্ক্রিপশন ফি অপরিশোধিত বা নির্ধারিত মেয়াদ উত্তীর্ণ হয়েছে। ডেটা সুরক্ষার জন্য সাধারণ বিক্রয় ও ইনভেন্টরি লেনদেন সাময়িকভাবে স্থগিত রয়েছে।`
            ) : (
              `Software subscription fee for ${business?.name || 'your store'} is unpaid or expired. To safeguard data, POS sales and inventory mutations are temporarily frozen.`
            )}
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs text-left space-y-2 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <span>{locale === 'bn' ? 'দোকানের নাম:' : 'Store Name:'}</span>
            <strong className="text-slate-900 dark:text-slate-100">{business?.name}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span>{locale === 'bn' ? 'বর্তমান স্ট্যাটাস:' : 'Current Status:'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {subStatus || 'SUSPENDED'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>{locale === 'bn' ? 'জরুরি হটলাইন:' : 'Urgent Hotline:'}</span>
            <strong className="text-sky-600 dark:text-sky-400">+880 1700000000</strong>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/billing" className="flex-1">
            <Button
              className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              <span>{locale === 'bn' ? 'বিলিং ও ইনভয়েস দেখুন' : 'View Billing & Invoices'}</span>
            </Button>
          </Link>

          <Link href="/support" className="flex-1">
            <Button
              variant="outline"
              className="w-full h-11 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-sky-600" />
              <span>{locale === 'bn' ? 'সাপোর্ট টিকিট খুলুন' : 'Open Support Ticket'}</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
