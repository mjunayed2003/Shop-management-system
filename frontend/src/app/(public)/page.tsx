'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  Store,
  Barcode,
  CreditCard,
  ShieldCheck,
  WifiOff,
  Cloud,
  ArrowRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  const { t, locale } = useTranslation();

  return (
    <div className="space-y-24 py-10 sm:py-16">
      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">

        {/* Main Title */}
        <div className="w-full space-y-5">
          <h1 suppressHydrationWarning className="text-3xl sm:text-5xl lg:text-6xl font-normal font-sayed text-slate-950 dark:text-white tracking-wide leading-[1.25] w-full">
            {t('landing.heroTitle')}
          </h1>
          <p suppressHydrationWarning className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-5xl mx-auto leading-relaxed font-normal">
            {t('landing.heroSubtitle')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {/* Primary CTA (Register) - Signature Cyan-to-Fuchsia Gradient Pill */}
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] text-white font-normal shadow-lg shadow-purple-500/30 hover:opacity-95 hover:scale-105 active:scale-95 transition-all border-none"
            >
              <span>{t('landing.ctaRegister')}</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          {/* Secondary CTA (Login) - Gradient Outline Pill */}
          <Link
            href="/login"
            className="w-full sm:w-auto inline-block p-[2px] rounded-full bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] shadow-md shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <div className="w-full sm:w-auto px-8 py-3 rounded-full bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-normal flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Store className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{t('landing.ctaLogin')}</span>
            </div>
          </Link>

          {/* Tertiary CTA (Components) */}
          <Link href="/dev/components" className="w-full sm:w-auto">
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-sm font-normal text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/80 dark:hover:bg-purple-950/40 transition-colors"
            >
              <Zap className="w-4 h-4 mr-1 text-purple-500" />
              <span>{t('landing.ctaDocs')}</span>
            </Button>
          </Link>
        </div>

        {/* Stats strip - Spans full width matching navbar */}
        <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          <div className="p-4 rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {locale === 'bn' ? '১০০%' : '100%'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
              {locale === 'bn' ? 'অফলাইন পিওএস সাপোর্ট' : 'Offline POS Support'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {locale === 'bn' ? '৫x' : '5x'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
              {locale === 'bn' ? 'দ্রুত ক্যাশিয়ার চেকআউট' : 'Faster Checkout'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {locale === 'bn' ? '৳ BDT' : 'BDT'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
              {locale === 'bn' ? 'বিকাশ/নগদ অটো ট্র্যাকিং' : 'bKash/Nagad Auto Tracking'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {locale === 'bn' ? '৩০ দিন' : '30 Days'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
              {locale === 'bn' ? 'বিনামূল্যে পূর্ণাঙ্গ ট্রায়াল' : 'Full Free Trial'}
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center w-full max-w-5xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-wide">
            {t('landing.featuresTitle')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {locale === 'bn'
              ? 'যেকোনো দোকানের ইনভেন্টরি, বারকোড এবং হিসাব-নিকাশ পরিচালনার আধুনিক প্রযুক্তি'
              : 'Modern technology to manage inventory, barcodes, sales, and accounts for all businesses'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('landing.feature1Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature1Desc')}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
              <Barcode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('landing.feature2Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature2Desc')}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('landing.feature3Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature3Desc')}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('landing.feature4Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature4Desc')}
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('landing.feature5Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature5Desc')}
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
              <Cloud className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('landing.feature6Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature6Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Placeholder */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center w-full max-w-5xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-wide">
            {t('landing.pricingPlaceholderTitle')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('landing.pricingPlaceholderDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto">
          {/* Starter Plan */}
          <div className="p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md space-y-6 shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {locale === 'bn' ? 'একক দোকানের জন্য' : 'For Single Store'}
              </span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Starter Store</h3>
              <p className="text-xs text-slate-500 mt-1">
                {locale === 'bn' ? 'নতুন শুরু করা একক দোকান বা ব্যবসার জন্য উপযুক্ত' : 'Perfect for small shops, retail stores, and single outlets'}
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {locale === 'bn' ? '৳ ১,৫০০' : 'BDT 1,500'}
              </span>
              <span className="text-xs text-slate-500">
                {locale === 'bn' ? '/প্রতি মাস' : '/month'}
              </span>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{locale === 'bn' ? '১টি সক্রিয় দোকান/শাখা' : '1 Active Branch / Store'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{locale === 'bn' ? 'সর্বোচ্চ ৩ জন স্টাফ ইউজার' : 'Up to 3 Staff Users'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{locale === 'bn' ? '৫০০ পণ্য ও ১,৫০০ ভ্যারিয়েন্ট' : '500 Products & 1,500 Variants'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{locale === 'bn' ? 'প্রতি মাসে ১,০০০ ইনভয়েস মেমো' : '1,000 Invoices per Month'}</span>
              </li>
            </ul>
            <Link href="/register?plan=STARTER" className="block">
              <Button variant="outline" className="w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                {t('landing.ctaRegister')}
              </Button>
            </Link>
          </div>

          {/* Business Growth Plan */}
          <div className="p-8 rounded-2xl border-2 border-slate-900 dark:border-slate-100 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md space-y-6 shadow-md relative">
            <span className="absolute -top-3 right-6 bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              {locale === 'bn' ? 'জনপ্রিয় চয়েস' : 'Popular Choice'}
            </span>
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {locale === 'bn' ? 'মাল্টি-ব্রাঞ্চ চেইন শপ' : 'Multi-Branch Chain Shop'}
              </span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Business Growth</h3>
              <p className="text-xs text-slate-500 mt-1">
                {locale === 'bn' ? 'একাধিক শাখা ও দ্রুত বর্ধনশীল যেকোনো ব্যবসার জন্য' : 'For multi-branch and fast-growing businesses'}
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {locale === 'bn' ? '৳ ৩,৫০০' : 'BDT 3,500'}
              </span>
              <span className="text-xs text-slate-500">
                {locale === 'bn' ? '/প্রতি মাস' : '/month'}
              </span>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{locale === 'bn' ? '৫টি পর্যন্ত সক্রিয় ব্রাঞ্চ শাখা' : 'Up to 5 Branch Outlets'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{locale === 'bn' ? '১৫ জন পর্যন্ত স্টাফ ইউজার' : 'Up to 15 Staff Users'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{locale === 'bn' ? '৫,০০০ পণ্য ও ২৫,০০০ ভ্যারিয়েন্ট' : '5,000 Products & 25,000 Variants'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{locale === 'bn' ? 'কাস্টম সেলস ও প্রফিট রিপোর্টস' : 'Custom Sales & Profit Reports'}</span>
              </li>
            </ul>
            <Link href="/register?plan=BUSINESS" className="block">
              <Button className="w-full rounded-xl bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] text-white font-medium shadow-md shadow-purple-500/25 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all border-none">
                {t('landing.ctaRegister')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white p-8 sm:p-14 text-center space-y-6 shadow-xl border border-slate-700/50">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-wide">
            {locale === 'bn' ? 'আজই আপনার ব্যবসাকে নিয়ে যান পরবর্তী ধাপে' : 'Take your business to the next level today'}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            {locale === 'bn'
              ? 'কোন ক্রেডিট কার্ড প্রয়োজন নেই। বিনামূল্যে নিবন্ধন করুন এবং ৩০ দিন সম্পূর্ণ ফিচার ব্যবহার করুন।'
              : 'No credit card required. Register for free and explore all features for 30 days.'}
          </p>
          <div className="pt-2">
            <Link href="/register">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] text-white font-medium px-8 py-3.5 shadow-lg shadow-purple-500/30 hover:opacity-95 hover:scale-105 active:scale-95 transition-all border-none">
                <span>{t('landing.ctaRegister')}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
