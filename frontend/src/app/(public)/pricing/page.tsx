'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DEFAULT_PLANS } from '@/lib/config/pricing-plans';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Zap, Sparkles, ShieldCheck } from 'lucide-react';

export default function PublicPricingPage() {
  const { locale } = useTranslation();
  // Default to MONTHLY billing as requested
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  return (
    <div className="min-h-screen bg-transparent py-12 sm:py-16 px-4 sm:px-6 lg:px-8 space-y-16 animate-fadeIn max-w-7xl mx-auto">
      {/* Hero Strip */}
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
          <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{locale === 'bn' ? 'স্বচ্ছ ও সাশ্রয়ী প্যাকেজ' : 'Transparent & Affordable Plans'}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {locale === 'bn' ? 'আপনার ব্যবসার জন্য সেরা পিওএস প্ল্যান' : 'Choose the Best POS Plan for Your Business'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
          {locale === 'bn'
            ? 'কোনো লুকানো চার্জ নেই। ৩০ দিনের ফ্রি ট্রায়াল শুরু করুন কোনো ক্রেডিট কার্ডের তথ্য ছাড়াই।'
            : 'No hidden fees. Start your 30-day free trial today without any credit card required.'}
        </p>

        {/* Toggle Billing Cycle */}
        <div className="pt-4 flex justify-center">
          <div className="inline-flex items-center p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-semibold shadow-inner border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-5 py-2 rounded-xl transition-all cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {locale === 'bn' ? 'মাসিক বিলিং' : 'Monthly Billing'}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'YEARLY'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{locale === 'bn' ? 'বার্ষিক বিলিং' : 'Yearly Billing'}</span>
              <span className="text-[10px] text-white font-bold bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] px-2 py-0.5 rounded-full shadow-xs">
                {locale === 'bn' ? '২ মাস ফ্রি!' : '2 Months Free!'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">
        {DEFAULT_PLANS.map((plan) => {
          const price = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
          const planName = locale === 'bn' && plan.nameBn ? plan.nameBn : plan.name;
          const planDesc = locale === 'bn' && plan.descriptionBn ? plan.descriptionBn : plan.description;
          const planFeatures = locale === 'bn' && plan.featuresBn ? plan.featuresBn : plan.features;
          const isStarter = plan.code === 'STARTER';
          const isEnterprise = plan.code === 'ENTERPRISE';

          if (plan.isPopular) {
            // Standout Popular Card with Signature Cyan-Purple-Pink Gradient
            return (
              <div
                key={plan.id}
                className="p-[2px] rounded-3xl bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] shadow-xl shadow-purple-500/20 hover:shadow-2xl hover:shadow-purple-500/30 transition-all md:-translate-y-2 flex flex-col"
              >
                <div className="rounded-[22px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-8 flex-1 flex flex-col justify-between relative space-y-6">
                  {/* Popular Badge */}
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                    {locale === 'bn' ? 'সবচেয়ে জনপ্রিয় চয়েস' : 'Most Popular Choice'}
                  </span>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200/60 dark:border-purple-800/60">
                        {locale === 'bn' ? 'মাল্টি-ব্রাঞ্চ শপ' : 'Multi-Branch'}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{planName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">{planDesc}</p>

                    <div className="my-6 flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                        {locale === 'bn' ? `৳${price.toLocaleString()}` : `BDT ${price.toLocaleString()}`}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        /{billingCycle === 'YEARLY' ? (locale === 'bn' ? 'বছর' : 'year') : (locale === 'bn' ? 'মাস' : 'month')}
                      </span>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                        {locale === 'bn' ? 'প্যাকেজে অন্তর্ভুক্ত সুবিধাসমূহ:' : 'Included Features:'}
                      </p>
                      <ul className="space-y-2.5">
                        {planFeatures.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Link href={`/register?plan=${plan.code.toLowerCase()}`} className="block">
                      <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] text-white font-bold text-xs shadow-md shadow-purple-500/25 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all border-none flex items-center justify-center gap-1.5 cursor-pointer">
                        <span>{locale === 'bn' ? '৩০ দিনের ফ্রি ট্রায়াল শুরু করুন' : 'Start 30-Day Free Trial'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                      {locale === 'bn' ? 'কোনো ক্রেডিট কার্ডের তথ্য প্রয়োজন নেই' : 'No credit card required'}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          // Non-popular cards (Starter & Enterprise)
          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl ${
                isStarter
                  ? 'hover:border-cyan-300 dark:hover:border-cyan-700/70 hover:shadow-cyan-500/10'
                  : 'hover:border-indigo-300 dark:hover:border-indigo-700/70 hover:shadow-indigo-500/10'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      isStarter
                        ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200/60 dark:border-cyan-800/60'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60'
                    }`}
                  >
                    {isStarter
                      ? locale === 'bn' ? 'একক দোকান' : 'Single Store'
                      : locale === 'bn' ? 'লার্জ চেইন এন্টারপ্রাইজ' : 'Enterprise'}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{planName}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">{planDesc}</p>

                <div className="my-6 flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                    {locale === 'bn' ? `৳${price.toLocaleString()}` : `BDT ${price.toLocaleString()}`}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    /{billingCycle === 'YEARLY' ? (locale === 'bn' ? 'বছর' : 'year') : (locale === 'bn' ? 'মাস' : 'month')}
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    {locale === 'bn' ? 'প্যাকেজে অন্তর্ভুক্ত সুবিধাসমূহ:' : 'Included Features:'}
                  </p>
                  <ul className="space-y-2.5">
                    {planFeatures.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isStarter ? 'text-cyan-500' : 'text-indigo-500'
                          }`}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                <Link href={`/register?plan=${plan.code.toLowerCase()}`} className="block">
                  <Button
                    variant="outline"
                    className={`w-full h-11 rounded-xl font-bold text-xs border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isStarter
                        ? 'hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400'
                        : 'hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    <span>{locale === 'bn' ? '৩০ দিনের ফ্রি ট্রায়াল শুরু করুন' : 'Start 30-Day Free Trial'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                  {locale === 'bn' ? 'কোনো ক্রেডিট কার্ডের তথ্য প্রয়োজন নেই' : 'No credit card required'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & FAQ Strip */}
      <div className="max-w-4xl mx-auto space-y-6 pt-10 border-t border-slate-200/80 dark:border-slate-800 text-center">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>{locale === 'bn' ? 'বিশ্বস্ত সেবা ও শর্তাবলী' : 'Trust & Guarantee'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {locale === 'bn' ? 'সাধারণ জিজ্ঞাসা (FAQ)' : 'Frequently Asked Questions (FAQ)'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs pt-4">
          <div className="p-5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-xs">
            <h4 className="font-bold text-slate-900 dark:text-white">
              {locale === 'bn' ? 'ইন্টারনেট সংযোগ না থাকলে কি পিওএস চলবে?' : 'Will POS work without internet?'}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {locale === 'bn'
                ? 'হ্যাঁ! আমাদের সফটওয়্যারে পূর্ণাঙ্গ অফলাইন পিডব্লিউএ সুবিধা রয়েছে। ইন্টারনেট সংযোগ বিচ্ছিন্ন হলেও আপনি অফলাইনে বিক্রি ও রসিদ প্রিন্ট চালিয়ে যেতে পারবেন।'
                : 'Yes! Our system has complete offline PWA capability. Even if internet connection is lost, you can continue sales and receipt printing.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-xs">
            <h4 className="font-bold text-slate-900 dark:text-white">
              {locale === 'bn' ? 'পরবর্তীতে কি প্ল্যান আপগ্রেড করা যাবে?' : 'Can I upgrade my plan later?'}
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {locale === 'bn'
                ? 'অবশ্যই। আপনার ব্যবসার পরিধি বাড়লে যেকোনো সময় ড্যাশবোর্ড থেকে এক ক্লিকেই উচ্চতর প্ল্যানে আপগ্রেড বা ডাউনগ্রেড করতে পারবেন।'
                : 'Absolutely. As your business grows, you can upgrade or adjust your plan anytime with one click directly from your control panel.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
