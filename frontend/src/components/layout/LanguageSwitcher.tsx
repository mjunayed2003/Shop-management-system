'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, toggleLocale } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`h-9 px-3 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:border-orange-500/50 ${className}`}
      aria-label="Toggle language"
      title={locale === 'en' ? 'বাংলায় দেখুন (Switch to Bangla)' : 'View in English (ইংরেজিতে দেখুন)'}
    >
      <Globe className="w-3.5 h-3.5 text-orange-500 shrink-0" />
      <span className="font-extrabold">{locale === 'en' ? 'বাংলা' : 'English'}</span>
    </button>
  );
}
