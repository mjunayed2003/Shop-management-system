'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '../ui/button';
import {
  ShoppingBag,
  Home,
  Layers,
  Tag,
  Send,
  Search,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react';

export function PublicNavbar() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Scroll direction state for smart hide-on-scroll-down, show-on-scroll-up
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Always visible at or near the top
          if (currentScrollY <= 15) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 70) {
            // Scrolling DOWN: hide navbar
            setIsVisible(false);
            setMobileMenuOpen(false); // Close mobile drawer if open
          } else if (currentScrollY < lastScrollY) {
            // Scrolling UP: reveal navbar immediately
            setIsVisible(true);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = searchQuery.toLowerCase().trim();
    if (q.includes('price') || q.includes('প্ল্যান') || q.includes('মূল্য')) {
      router.push('/pricing');
    } else if (q.includes('contact') || q.includes('যোগাযোগ') || q.includes('help')) {
      router.push('/contact');
    } else {
      if (pathname === '/') {
        const el = document.getElementById('features');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          router.push('/#features');
        }
      } else {
        router.push('/#features');
      }
    }
  };

  const navItems = [
    {
      href: '/',
      label: t('nav.home') || 'HOME',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      href: '/#features',
      label: t('nav.features') || 'FEATURES',
      icon: Layers,
      isActive: false,
    },
    {
      href: '/pricing',
      label: t('nav.pricing') || 'PRICING',
      icon: Tag,
      isActive: pathname === '/pricing',
    },
    {
      href: '/contact',
      label: t('nav.contact') || 'CONTACT',
      icon: Send,
      isActive: pathname === '/contact',
    },
  ];

  return (
    <>
      {/* Smart Hide/Show Fixed Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 gap-3 sm:gap-6">
            {/* Left: Brand Logo & Title */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0 select-none">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#3b7987] hover:bg-[#326975] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-black tracking-wider text-[#3b7987] dark:text-[#52a7b7] uppercase font-sans leading-none">
                  {locale === 'bn' ? 'দোকান পিওএস' : 'DIAMON POS'}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest leading-tight mt-0.5">
                  RETAIL ERP
                </span>
              </div>
            </Link>

            {/* Center: Desktop Navigation Links with Icons */}
            <nav className="hidden lg:flex items-center gap-1.5 sm:gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={(e) => {
                      if (item.href === '/#features' && pathname === '/') {
                        e.preventDefault();
                        const el = document.getElementById('features');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase px-3.5 py-1.5 rounded-md transition-all ${
                      item.isActive
                        ? 'bg-[#c2d4d4] dark:bg-[#2c4246] text-slate-900 dark:text-slate-50 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Search Box & Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Search Input Form matching screenshot */}
              <form
                onSubmit={handleSearch}
                className="hidden md:flex items-center border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 bg-slate-50/60 dark:bg-slate-800/60 focus-within:border-[#3b7987] dark:focus-within:border-[#52a7b7] focus-within:bg-white dark:focus-within:bg-slate-900 transition-all shadow-xs shrink-0"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={locale === 'bn' ? 'সার্চ করুন...' : 'Search Here'}
                  className="w-20 sm:w-28 md:w-32 lg:w-40 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none pr-1"
                />
                <button
                  type="submit"
                  className="text-[#3b7987] dark:text-[#52a7b7] hover:opacity-80 transition-opacity p-0.5 cursor-pointer"
                  title="Search"
                  aria-label="Search"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Language & Theme Controls */}
              <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-2 shrink-0">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              {/* Auth Buttons */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Link
                  href="/login"
                  className="h-9 px-3.5 rounded-full text-xs font-bold tracking-wider text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all flex items-center whitespace-nowrap shrink-0 select-none cursor-pointer"
                >
                  <span className="whitespace-nowrap">{t('nav.login')}</span>
                </Link>
                <Link
                  href="/register"
                  className="h-9 px-4 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-purple-500/25 bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] hover:opacity-95 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 select-none cursor-pointer"
                >
                  <span className="whitespace-nowrap">{t('nav.register')}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </div>

              {/* Mobile Actions & Menu Toggle */}
              <div className="flex sm:hidden items-center gap-1.5">
                <LanguageSwitcher />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none cursor-pointer"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-4 py-4 space-y-4 shadow-lg animate-fadeIn">
            {/* Mobile Search */}
            <form
              onSubmit={(e) => {
                handleSearch(e);
                setMobileMenuOpen(false);
              }}
              className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 bg-slate-50 dark:bg-slate-800"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'bn' ? 'সার্চ করুন...' : 'Search Here'}
                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
              />
              <button type="submit" className="text-[#3b7987] dark:text-[#52a7b7] pl-2">
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Mobile Nav Links */}
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      if (item.href === '/#features' && pathname === '/') {
                        e.preventDefault();
                        const el = document.getElementById('features');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                      item.isActive
                        ? 'bg-[#c2d4d4] dark:bg-[#2c4246] text-slate-900 dark:text-slate-50 shadow-xs'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.isActive ? 'text-slate-900 dark:text-slate-50' : 'text-[#3b7987]'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Auth Actions */}
            <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-10 rounded-full text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-10 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-purple-500/25 bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] hover:opacity-95 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{t('nav.register')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Spacer so page content below is never clipped */}
      <div className="h-16 sm:h-18 w-full shrink-0" aria-hidden="true" />
    </>
  );
}
