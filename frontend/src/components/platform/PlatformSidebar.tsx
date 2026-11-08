'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePlatformAuthStore, PlatformRole } from '@/lib/store/platform-auth-store';
import {
  LayoutDashboard,
  Building2,
  Receipt,
  LifeBuoy,
  Zap,
  Settings,
  Users,
  ShieldAlert,
  LogOut,
  Flame,
  X,
  Sparkles,
  Lock,
  ArrowUpRight,
} from 'lucide-react';
import { resetPlatformSessionCache } from './PlatformProtectedRoute';
import { useTranslation } from '@/lib/i18n';

export interface PlatformNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: PlatformRole[];
}

export const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
  {
    href: '/platform/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/platform/businesses',
    label: 'Businesses',
    icon: Building2,
  },
  {
    href: '/platform/invoices',
    label: 'Transactions & Revenue',
    icon: Receipt,
  },
  {
    href: '/platform/support',
    label: 'Support Desk',
    icon: LifeBuoy,
  },
  {
    href: '/platform/plans',
    label: 'Subscription Plans',
    icon: Zap,
    allowedRoles: ['SUPER_ADMIN', 'BILLING_ADMIN'],
  },
  {
    href: '/platform/settings',
    label: 'System Settings',
    icon: Settings,
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    href: '/platform/admins',
    label: 'Staff & Admins',
    icon: Users,
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    href: '/platform/audit-logs',
    label: 'Audit Trail',
    icon: ShieldAlert,
  },
];

export function PlatformSidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, clearPlatformAuth } = usePlatformAuthStore();
  const { locale, t } = useTranslation();

  const handleLogout = () => {
    resetPlatformSessionCache();
    clearPlatformAuth();
    router.replace('/platform/login');
  };

  const role = admin?.role;

  const getNavLabel = (item: PlatformNavItem) => {
    if (locale !== 'bn') return item.label;
    switch (item.href) {
      case '/platform/dashboard':
        return t('platform.nav.dashboard') || 'ড্যাশবোর্ড';
      case '/platform/businesses':
        return t('platform.nav.businesses') || 'দোকান ও ব্যবসা';
      case '/platform/invoices':
        return t('platform.nav.invoices') || 'লেনদেন ও আয়';
      case '/platform/support':
        return t('platform.nav.support') || 'সাপোর্ট ডেস্ক';
      case '/platform/plans':
        return t('platform.nav.plans') || 'সাবস্ক্রিপশন প্ল্যান';
      case '/platform/settings':
        return t('platform.nav.settings') || 'সিস্টেম সেটিংস';
      case '/platform/admins':
        return t('platform.nav.admins') || 'স্টাফ ও অ্যাডমিন';
      case '/platform/audit-logs':
        return t('platform.nav.auditLogs') || 'অডিট ট্রেইল';
      default:
        return item.label;
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex flex-col justify-between h-screen sticky top-0 select-none z-30 shadow-xs">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Brand Logo Header (Foodpoint style) */}
        <div className="flex items-center justify-between px-2">
          <Link href="/platform/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-orange-500/30 group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 fill-white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white uppercase font-sans">
                SHOP<span className="text-orange-500">POINT</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider -mt-1">
                {locale === 'bn' ? 'প্ল্যাটফর্ম কনসোল' : 'Platform Console'}
              </span>
            </div>
          </Link>

          {/* Close button for Mobile Drawer */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={locale === 'bn' ? 'মেনু বন্ধ করুন' : 'Close navigation'}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {PLATFORM_NAV_ITEMS.map((item) => {
            if (item.allowedRoles && role && !item.allowedRoles.includes(role)) {
              return null;
            }

            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-orange-500'
                  }`}
                />
                <span className="truncate">{getNavLabel(item)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Feature Card (Foodpoint "Unlock New Features" Card) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white p-4.5 shadow-lg shadow-orange-500/20 space-y-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight">
              {t('platform.nav.governance')}
            </h4>
            <p className="text-[10px] text-white/80 mt-0.5 leading-snug">
              {t('platform.nav.governanceDesc')}
            </p>
          </div>
          <div className="pt-1 flex items-center justify-between text-[11px] font-bold">
            <span className="text-white/90">
              {t('platform.nav.platformV2')}
            </span>
            <Link
              href="/platform/settings"
              className="bg-white text-orange-600 hover:bg-orange-50 px-3 py-1 rounded-lg text-[10px] font-extrabold shadow-xs transition-all flex items-center gap-1"
            >
              <span>{t('platform.nav.manage')}</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Profile & Logout Strip */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2.5 overflow-hidden pr-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-xs shrink-0">
              {admin ? admin.firstName.charAt(0) : 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {admin ? `${admin.firstName} ${admin.lastName}` : (locale === 'bn' ? 'প্ল্যাটফর্ম অ্যাডমিন' : 'Platform Admin')}
              </p>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {admin?.email || 'admin@pos.com'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title={t('platform.nav.logout')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
