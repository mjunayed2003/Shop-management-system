'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { AlertCircle, Clock, CreditCard, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/button';

export function SubscriptionBanner() {
  const { business } = useAuthStore();
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(false);

  const sub = business?.subscription;
  if (!sub || isDismissed) return null;

  const status = sub.status;

  // 1. PAYMENT_DUE or GRACE
  if (status === 'PAYMENT_DUE' || status === 'GRACE') {
    let daysLeft = 0;
    if (sub.graceEndsAt) {
      const diff = new Date(sub.graceEndsAt).getTime() - Date.now();
      daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return (
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-medium z-40 transition-all">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-100 animate-bounce" />
          <div className="truncate">
            <span className="font-bold">
              {status === 'GRACE' ? 'গ্রেস পিরিয়ড চলমান (Grace Period)' : 'সাবস্ক্রিপশন ফি বকেয়া (Payment Due)'}:
            </span>{' '}
            {daysLeft > 0 ? (
              <span>গ্রেস শেষ হতে আর মাত্র <strong>{daysLeft} দিন</strong> বাকি। সাময়িক স্থগিতাদেশ এড়াতে দ্রুত পরিশোধ করুন।</span>
            ) : (
              <span>বিলিং মেয়াদ শেষ। সার্ভিস সচল রাখতে অবিলম্বে বকেয়া পরিশোধ করুন।</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Link href="/billing">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/90 hover:bg-white text-orange-950 font-bold border-none text-xs h-7 px-3 rounded-lg shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1 text-orange-600" />
              <span>বিল পরিশোধ করুন</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. TRIAL BANNER
  if (status === 'TRIAL' && sub.trialEndsAt) {
    const diff = new Date(sub.trialEndsAt).getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    // Only show if 15 days or fewer left in trial, or always for visibility
    return (
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white px-4 py-2 text-xs font-medium shadow-sm flex items-center justify-between z-40">
        <div className="flex items-center gap-2 overflow-hidden">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="truncate">
            ফ্রি ট্রায়াল চলছে: আপনার ট্রায়াল শেষ হতে <strong>{daysLeft} দিন</strong> বাকি।
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Link href="/billing">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/95 hover:bg-white text-indigo-900 font-bold border-none text-[11px] h-6 px-2.5 rounded-lg"
            >
              <span>প্ল্যান আপগ্রেড করুন</span>
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-white/70 hover:text-white p-1 rounded-md"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
