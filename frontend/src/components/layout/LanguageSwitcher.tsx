'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Globe, Check } from 'lucide-react';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, toggleLocale } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setShowToast(true);
    toggleLocale();

    setTimeout(() => {
      setIsAnimating(false);
    }, 500);

    setTimeout(() => {
      setShowToast(false);
    }, 1200);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        className={`relative h-8 px-2.5 rounded-lg border bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all duration-300 cursor-pointer select-none active:scale-95 ${
          showToast
            ? 'border-purple-500 ring-2 ring-purple-400/40 shadow-md shadow-purple-500/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
        } ${className}`}
        aria-label="Toggle language"
        title={locale === 'en' ? 'Switch to বাংলা' : 'Switch to English'}
      >
        {/* Black Globe Icon with 360-degree spin animation */}
        <Globe
          className={`w-3.5 h-3.5 text-black dark:text-white shrink-0 transition-transform duration-500 ease-out ${
            isAnimating ? 'rotate-[360deg] scale-125' : 'rotate-0'
          }`}
        />

        {/* Language text */}
        <span
          className={`tracking-tight font-extrabold transition-all duration-300 ${
            isAnimating ? 'scale-105 text-purple-600 dark:text-purple-400' : ''
          }`}
        >
          {locale === 'en' ? 'বাংলা' : 'English'}
        </span>

        {/* Active subtle brand pulse dot */}
        <span className="w-1.5 h-1.5 rounded-full bg-[#3b7987] animate-pulse shrink-0" />
      </button>

      {/* Floating micro notification badge on click */}
      {showToast && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold shadow-xl animate-fadeIn flex items-center gap-1 border border-slate-700 dark:border-slate-300">
          <Check className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
          <span>{locale === 'en' ? 'English activated' : 'বাংলা সক্রিয়'}</span>
        </div>
      )}
    </div>
  );
}
