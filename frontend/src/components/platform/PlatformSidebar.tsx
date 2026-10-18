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
  Shield,
  KeyRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    label: 'Invoices & Revenue',
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
    label: 'Platform Admins',
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

  const handleLogout = () => {
    clearPlatformAuth();
    router.replace('/platform/login');
  };

  const role = admin?.role;

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 text-slate-200 flex flex-col justify-between h-screen sticky top-0 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">Shop POS BD</span>
              </div>
              <Badge className="bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-extrabold text-[9px] px-1.5 py-0 uppercase tracking-widest">
                Platform Admin
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
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
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Admin Profile & Logout Strip */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/60">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-bold text-white truncate">
              {admin ? `${admin.firstName} ${admin.lastName}` : 'Platform Admin'}
            </p>
            <p className="text-[10px] text-indigo-400 font-mono font-bold tracking-tight">
              {admin?.role || 'SUPER_ADMIN'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Log out of Platform"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
