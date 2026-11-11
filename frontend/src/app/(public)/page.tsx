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

        {/* 4 Colorful Stats Cards */}
        <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {/* Card 1: 100% Offline (Cyan theme) */}
          <div className="relative group p-5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-cyan-200/80 dark:border-cyan-900/50 shadow-xs hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-400/80 hover:-translate-y-0.5 transition-all text-center overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-500 dark:from-cyan-400 dark:to-teal-300 bg-clip-text text-transparent">
              {locale === 'bn' ? '১০০%' : '100%'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-normal">
              {locale === 'bn' ? 'অফলাইন পিওএস সাপোর্ট' : 'Offline POS Support'}
            </p>
          </div>

          {/* Card 2: 5x Faster (Purple theme) */}
          <div className="relative group p-5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-purple-200/80 dark:border-purple-900/50 shadow-xs hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-400/80 hover:-translate-y-0.5 transition-all text-center overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-500 dark:from-purple-400 dark:to-indigo-300 bg-clip-text text-transparent">
              {locale === 'bn' ? '৫x' : '5x'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-normal">
              {locale === 'bn' ? 'দ্রুত ক্যাশিয়ার চেকআউট' : 'Faster Checkout'}
            </p>
          </div>

          {/* Card 3: ৳ BDT Payment (Pink theme) */}
          <div className="relative group p-5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-pink-200/80 dark:border-pink-900/50 shadow-xs hover:shadow-lg hover:shadow-pink-500/10 hover:border-pink-400/80 hover:-translate-y-0.5 transition-all text-center overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-pink-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 dark:from-pink-400 dark:to-rose-300 bg-clip-text text-transparent">
              {locale === 'bn' ? '৳ BDT' : 'BDT'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-normal">
              {locale === 'bn' ? 'বিকাশ/নগদ অটো ট্র্যাকিং' : 'bKash/Nagad Auto Tracking'}
            </p>
          </div>

          {/* Card 4: 30 Days Trial (Amber theme) */}
          <div className="relative group p-5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-amber-200/80 dark:border-amber-900/50 shadow-xs hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-400/80 hover:-translate-y-0.5 transition-all text-center overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-orange-300 bg-clip-text text-transparent">
              {locale === 'bn' ? '৩০ দিন' : '30 Days'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-normal">
              {locale === 'bn' ? 'বিনামূল্যে পূর্ণাঙ্গ ট্রায়াল' : 'Full Free Trial'}
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center w-full max-w-5xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs font-normal text-purple-700 dark:text-purple-300">
            <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>{locale === 'bn' ? 'শক্তিশালী সুবিধাসমূহ' : 'Core Capabilities'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-wide">
            {t('landing.featuresTitle')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal">
            {locale === 'bn'
              ? 'যেকোনো দোকানের ইনভেন্টরি, বারকোড এবং হিসাব-নিকাশ পরিচালনার আধুনিক প্রযুক্তি'
              : 'Modern technology to manage inventory, barcodes, sales, and accounts for all businesses'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1: Cyan / Sky Theme */}
          <div className="group p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs hover:shadow-xl hover:shadow-sky-500/10 hover:border-sky-300 dark:hover:border-sky-700/70 hover:-translate-y-1 transition-all duration-300 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              {t('landing.feature1Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature1Desc')}
            </p>
          </div>

          {/* Feature 2: Purple / Indigo Theme */}
          <div className="group p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-300 dark:hover:border-purple-700/70 hover:-translate-y-1 transition-all duration-300 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 group-hover:scale-110 transition-transform">
              <Barcode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {t('landing.feature2Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature2Desc')}
            </p>
          </div>

          {/* Feature 3: Pink / Rose Theme */}
          <div className="group p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs hover:shadow-xl hover:shadow-pink-500/10 hover:border-pink-300 dark:hover:border-pink-700/70 hover:-translate-y-1 transition-all duration-300 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-pink-500/25 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
              {t('landing.feature3Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature3Desc')}
            </p>
          </div>

          {/* Feature 4: Emerald / Teal Theme */}
          <div className="group p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-700/70 hover:-translate-y-1 transition-all duration-300 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {t('landing.feature4Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature4Desc')}
            </p>
          </div>

          {/* Feature 5: Amber / Orange Theme */}
          <div className="group p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-300 dark:hover:border-amber-700/70 hover:-translate-y-1 transition-all duration-300 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-110 transition-transform">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {t('landing.feature5Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature5Desc')}
            </p>
          </div>

          {/* Feature 6: Violet / Cyan Theme */}
          <div className="group p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-300 dark:hover:border-violet-700/70 hover:-translate-y-1 transition-all duration-300 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-violet-500/25 group-hover:scale-110 transition-transform">
              <Cloud className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {t('landing.feature6Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {t('landing.feature6Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center w-full max-w-5xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-xs font-normal text-cyan-700 dark:text-cyan-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{locale === 'bn' ? 'স্বচ্ছ ও সাশ্রয়ী সাবস্ক্রিপশন' : 'Simple Transparent Pricing'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-wide">
            {t('landing.pricingPlaceholderTitle')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
            {t('landing.pricingPlaceholderDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto items-stretch">
          {/* Starter Plan (Cyan Accent) */}
          <div className="p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md space-y-6 shadow-sm hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-200/60 dark:border-cyan-800/60">
                  {locale === 'bn' ? 'একক দোকানের জন্য' : 'For Single Store'}
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">Starter Store</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
                  {locale === 'bn' ? 'নতুন শুরু করা একক দোকান বা ব্যবসার জন্য উপযুক্ত' : 'Perfect for small shops, retail stores, and single outlets'}
                </p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {locale === 'bn' ? '৳ ১,৫০০' : 'BDT 1,500'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'bn' ? '/প্রতি মাস' : '/month'}
                </span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>{locale === 'bn' ? '১টি সক্রিয় দোকান/শাখা' : '1 Active Branch / Store'}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>{locale === 'bn' ? 'সর্বোচ্চ ৩ জন স্টাফ ইউজার' : 'Up to 3 Staff Users'}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>{locale === 'bn' ? '৫০০ পণ্য ও ১,৫০০ ভ্যারিয়েন্ট' : '500 Products & 1,500 Variants'}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>{locale === 'bn' ? 'প্রতি মাসে ১,০০০ ইনভয়েস মেমো' : '1,000 Invoices per Month'}</span>
                </li>
              </ul>
            </div>
            <Link href="/register?plan=STARTER" className="block pt-2">
              <Button variant="outline" className="w-full rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-slate-300 dark:border-slate-700 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                {t('landing.ctaRegister')}
              </Button>
            </Link>
          </div>

          {/* Business Growth Plan (Signature Colorful Gradient Highlight) */}
          <div className="p-[2px] rounded-3xl bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] shadow-xl shadow-purple-500/20 hover:shadow-2xl hover:shadow-purple-500/30 transition-all flex flex-col">
            <div className="rounded-[22px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-8 space-y-6 flex-1 flex flex-col justify-between relative">
              <span className="absolute -top-3 right-6 bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] text-white text-[11px] font-bold px-3.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                {locale === 'bn' ? 'জনপ্রিয় চয়েস' : 'Popular Choice'}
              </span>
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200/60 dark:border-purple-800/60">
                    {locale === 'bn' ? 'মাল্টি-ব্রাঞ্চ চেইন শপ' : 'Multi-Branch Chain Shop'}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">Business Growth</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
                    {locale === 'bn' ? 'একাধিক শাখা ও দ্রুত বর্ধনশীল যেকোনো ব্যবসার জন্য' : 'For multi-branch and fast-growing businesses'}
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {locale === 'bn' ? '৳ ৩,৫০০' : 'BDT 3,500'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {locale === 'bn' ? '/প্রতি মাস' : '/month'}
                  </span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{locale === 'bn' ? '৫টি পর্যন্ত সক্রিয় ব্রাঞ্চ শাখা' : 'Up to 5 Branch Outlets'}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{locale === 'bn' ? '১৫ জন পর্যন্ত স্টাফ ইউজার' : 'Up to 15 Staff Users'}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{locale === 'bn' ? '৫,০০০ পণ্য ও ২৫,০০০ ভ্যারিয়েন্ট' : '5,000 Products & 25,000 Variants'}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{locale === 'bn' ? 'কাস্টম সেলস ও প্রফিট রিপোর্টস' : 'Custom Sales & Profit Reports'}</span>
                  </li>
                </ul>
              </div>
              <Link href="/register?plan=BUSINESS" className="block pt-2">
                <Button className="w-full rounded-xl bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] text-white font-normal shadow-md shadow-purple-500/25 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all border-none">
                  {t('landing.ctaRegister')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* View all plans link */}
        <div className="text-center pt-2">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline transition-all"
          >
            <span>{locale === 'bn' ? 'সকল প্যাকেজ ও বিস্তারিত ফিচার তুলনা দেখুন' : 'Compare all plans and full features'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-white p-8 sm:p-14 text-center space-y-6 shadow-2xl shadow-purple-950/40 border border-purple-500/30 overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-wide">
              {locale === 'bn'
                ? 'আজই আপনার ব্যবসাকে নিয়ে যান পরবর্তী ধাপে'
                : 'Take your business to the next level today'}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto font-normal">
              {locale === 'bn'
                ? 'কোন ক্রেডিট কার্ড প্রয়োজন নেই। বিনামূল্যে নিবন্ধন করুন এবং ৩০ দিন সম্পূর্ণ ফিচার ব্যবহার করুন।'
                : 'No credit card required. Register for free and explore all features for 30 days.'}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="rounded-full bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] text-white font-normal px-8 py-3.5 shadow-lg shadow-purple-500/30 hover:opacity-95 hover:scale-105 active:scale-95 transition-all border-none">
                  <span>{t('landing.ctaRegister')}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="rounded-full border-slate-700 bg-slate-900/60 text-slate-200 hover:text-white hover:bg-slate-800/80 px-7 py-3.5 transition-all">
                  <span>{locale === 'bn' ? 'যোগাযোগ করুন' : 'Contact Us'}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
