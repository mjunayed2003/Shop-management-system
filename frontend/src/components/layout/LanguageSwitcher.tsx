'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, toggleLocale } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      aria-label="Switch language"
      title={locale === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
    >
      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      <span>{locale === 'bn' ? 'English' : 'বাংলা'}</span>
    </button>
  );
}
