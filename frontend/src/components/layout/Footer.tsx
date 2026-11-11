'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { ShoppingBag, Phone, Mail, MapPin } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Footer() {
  const { t, locale } = useTranslation();

  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md text-slate-600 dark:text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-base">
                {locale === 'bn' ? 'দোকান পিওএস' : 'Shop POS'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t('footer.aboutText')}
            </p>
            <div className="pt-2">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              {t('footer.quickLinks')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" prefetch={false} className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href="/#features" prefetch={false} className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('nav.features')}
                </Link>
              </li>
              <li>
                <Link href="/pricing" prefetch={false} className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('nav.pricing')}
                </Link>
              </li>
              <li>
                <Link href="/contact" prefetch={false} className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
              <li>
                <Link href="/register" prefetch={false} className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('nav.register')}
                </Link>
              </li>
              <li>
                <Link href="/login" prefetch={false} className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('nav.login')}
                </Link>
              </li>
              <li>
                <Link href="/dev/components" prefetch={false} className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('nav.componentDocs')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              {t('nav.features')}
            </h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li>{locale === 'bn' ? 'মাল্টি-ব্রাঞ্চ স্টক কন্ট্রোল' : 'Multi-Branch Stock Control'}</li>
              <li>{locale === 'bn' ? 'কাস্টম রোল ও পারমিশন ম্যাট্রিক্স' : 'Custom Roles & Permission Matrix'}</li>
              <li>{locale === 'bn' ? 'কোড ১২৮ বারকোড লেবেল জেনারেশন' : 'Code 128 Barcode Tag Generation'}</li>
              <li>{locale === 'bn' ? 'বিকাশ/নগদ পেমেন্ট ট্র্যাকিং' : 'bKash / Nagad Payment Tracking'}</li>
              <li>{locale === 'bn' ? 'অফলাইন পিওএস সিঙ্ক' : 'Offline POS Synchronization'}</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              {t('footer.contactUs')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <a href="tel:+8801700000000" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('footer.phone')}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <a href="mailto:support@shop-pos.com" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('footer.email')}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <Link href="/contact" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  {t('footer.dhaka')}
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <span>{locale === 'bn' ? 'সরাসরি বার্তা পাঠান →' : 'Send us a message →'}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>{t('footer.copyright')}</p>
          <div className="flex items-center gap-4">
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
              {t('footer.version')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
