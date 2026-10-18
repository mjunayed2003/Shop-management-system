'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DEFAULT_PLANS } from '@/lib/config/pricing-plans';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Zap, ArrowRight, HelpCircle, Shield, Building2, Store } from 'lucide-react';

export default function PublicPricingPage() {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 space-y-16 animate-fadeIn">
      {/* Hero Strip */}
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-3 py-1 text-xs rounded-full">
          🇧🇩 স্বচ্ছ ও সাশ্রয়ী প্যাকেজ
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          আপনার ব্যবসার জন্য সঠিক পিওএস প্ল্যান বেছে নিন
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          কোনো লুকানো চার্জ নেই। ৩০ দিনের ফ্রি ট্রায়াল শুরু করুন কোনো ক্রেডিট কার্ড ছাড়াই।
        </p>

        {/* Toggle Billing Cycle */}
        <div className="pt-4 flex justify-center">
          <div className="inline-flex items-center p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl text-xs font-semibold shadow-inner">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-5 py-2 rounded-xl transition-all ${
                billingCycle === 'MONTHLY'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              মাসিক বিলিং
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                billingCycle === 'YEARLY'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>বার্ষিক বিলিং</span>
              <span className="text-[10px] text-emerald-700 font-black bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                ২ মাস ফ্রি!
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {DEFAULT_PLANS.map((plan) => {
          const price = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                plan.isPopular
                  ? 'bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-2xl relative md:-translate-y-2'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-black text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">
                  সবচেয়ে জনপ্রিয় চয়েস
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{plan.name}</h3>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{plan.description}</p>

                <div className="my-6">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                    ৳{price.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 ml-1.5 font-medium">
                    /{billingCycle === 'YEARLY' ? 'বছর' : 'মাস'}
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    প্যাকেজে অন্তর্ভুক্ত সুবিধাসমূহ:
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                <Link href={`/register?plan=${plan.code.toLowerCase()}`}>
                  <Button
                    className={`w-full h-12 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm ${
                      plan.isPopular
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                    }`}
                  >
                    <span>৩০ দিনের ফ্রি ট্রায়াল শুরু করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                  কোনো ক্রেডিট কার্ডের তথ্য প্রয়োজন নেই
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & FAQ Strip */}
      <div className="max-w-3xl mx-auto space-y-6 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">সাধারণ জিজ্ঞাসা (FAQ)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">ইন্টারনেট না থাকলে কি পিওএস চলবে?</h4>
            <p className="text-slate-500 dark:text-slate-400">
              হ্যাঁ! আমাদের সফটওয়্যারে পূর্ণাঙ্গ অফলাইন পিডব্লিউএ সুবিধা রয়েছে। ইন্টারনেট সংযোগ বিচ্ছিন্ন হলেও আপনি অফলাইনে বিক্রি চালিয়ে যেতে পারবেন।
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">পরবর্তীতে কি প্ল্যান আপগ্রেড করা যাবে?</h4>
            <p className="text-slate-500 dark:text-slate-400">
              অবশ্যই। আপনার ব্যবসার পরিধি বাড়লে যেকোনো সময় কন্ট্রোল প্যানেল থেকে এক ক্লিকেই উচ্চতর প্ল্যানে আপগ্রেড করতে পারবেন।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
