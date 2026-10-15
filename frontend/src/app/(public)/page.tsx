'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Store,
  Barcode,
  CreditCard,
  ShieldCheck,
  WifiOff,
  Cloud,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Users,
} from 'lucide-react';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-24 py-10 sm:py-16">
      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold shadow-sm animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t('landing.heroBadge')}</span>
        </div>

        {/* Main Title */}
        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.15]">
            {t('landing.heroTitle')}
          </h1>
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            {t('landing.heroSubtitle')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto px-8 py-4 text-base shadow-lg shadow-emerald-600/25">
              <span>{t('landing.ctaRegister')}</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-7 py-4 text-base">
              <Store className="w-4 h-4 mr-2" />
              <span>{t('landing.ctaLogin')}</span>
            </Button>
          </Link>
          <Link href="/dev/components" className="w-full sm:w-auto">
            <Button variant="ghost" size="lg" className="w-full sm:w-auto text-sm text-slate-500 hover:text-emerald-600">
              <Zap className="w-4 h-4 mr-1 text-emerald-500" />
              <span>{t('landing.ctaDocs')}</span>
            </Button>
          </Link>
        </div>

        {/* Stats strip */}
        <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">১০০%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">অফলাইন পিওএস সাপোর্ট</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">৫x</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">দ্রুত ক্যাশিয়ার চেকআউট</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">৳ BDT</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">বিকাশ/নগদ অটো ট্র্যাকিং</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">৩০ দিন</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">বিনামূল্যে পূর্ণাঙ্গ ট্রায়াল</p>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('landing.featuresTitle')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            পোশাক শোরুমের ইনভেন্টরি, বারকোড এবং অ্যাকাউন্টস নিয়ন্ত্রণের আধুনিক প্রযুক্তি
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('landing.feature1Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('landing.feature1Desc')}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Barcode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('landing.feature2Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('landing.feature2Desc')}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('landing.feature3Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('landing.feature3Desc')}
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('landing.feature4Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('landing.feature4Desc')}
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('landing.feature5Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('landing.feature5Desc')}
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Cloud className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('landing.feature6Title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('landing.feature6Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Placeholder */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {t('landing.pricingPlaceholderTitle')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('landing.pricingPlaceholderDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Starter Plan */}
          <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-sm">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">একক শোরুমের জন্য</span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Starter Boutique</h3>
              <p className="text-xs text-slate-500 mt-1">নতুন শুরু করা বুটিক বা একক শোরুমের জন্য পারফেক্ট</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">৳ ১,৫০০</span>
              <span className="text-xs text-slate-500">/প্রতি মাস</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>১টি সক্রিয় শোরুম শাখা</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>সর্বোচ্চ ৩ জন স্টাফ ইউজার</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>৫০০ পোশাক পণ্য ও ১৫০০ ভ্যারিয়েন্ট</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>প্রতি মাসে ১,০০০ ইনভয়েস মেমো</span>
              </li>
            </ul>
            <Link href="/register?plan=STARTER" className="block">
              <Button variant="outline" className="w-full">
                {t('landing.ctaRegister')}
              </Button>
            </Link>
          </div>

          {/* Business Growth Plan */}
          <div className="p-8 rounded-2xl border-2 border-emerald-500 bg-emerald-50/20 dark:bg-slate-900 space-y-6 shadow-md relative">
            <span className="absolute -top-3 right-6 bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              জনপ্রিয় চয়েস
            </span>
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">মাল্টি-ব্রাঞ্চ রিটেইল চেইন</span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Business Growth</h3>
              <p className="text-xs text-slate-500 mt-1">একাধিক শাখা ও দ্রুত বর্ধনশীল ফ্যাশন ব্র্যান্ডের জন্য</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">৳ ৩,৫০০</span>
              <span className="text-xs text-slate-500">/প্রতি মাস</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>৫টি পর্যন্ত সক্রিয় শোরুম শাখা</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>১৫ জন পর্যন্ত স্টাফ ইউজার</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>৫,০০০ পোশাক পণ্য ও ২৫,০০০ ভ্যারিয়েন্ট</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>কাস্টম সেলস ও প্রফিট রিপোর্টস</span>
              </li>
            </ul>
            <Link href="/register?plan=BUSINESS" className="block">
              <Button className="w-full">
                {t('landing.ctaRegister')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 text-white p-8 sm:p-14 text-center space-y-6 shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            আজই আপনার পোশাক ব্যবসাকে নিয়ে যান পরবর্তী ধাপে
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-xl mx-auto">
            কোন ক্রেডিট কার্ড প্রয়োজন নেই। বিনামূল্যে নিবন্ধন করুন এবং ৩০ দিন সম্পূর্ণ ফিচার ব্যবহার করুন।
          </p>
          <div className="pt-2">
            <Link href="/register">
              <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-8 shadow-md">
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
