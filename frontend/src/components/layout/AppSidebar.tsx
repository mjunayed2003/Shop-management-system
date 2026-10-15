'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_NAV_ITEMS, NavItemConfig } from '@/lib/config/navigation';
import { usePermission } from '../shared/PermissionGate';
import { useTranslation } from '@/lib/i18n';
import { ShoppingBag, ChevronRight } from 'lucide-react';

interface AppSidebarProps {
  onCloseMobile?: () => void;
}

export function AppSidebar({ onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="w-64 h-full flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
          <ShoppingBag className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-white tracking-tight">দোকান পিওএস</h1>
          <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
            Fashion Retail
          </p>
        </div>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          মূল মেনু
        </p>

        {SIDEBAR_NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            currentPath={pathname}
            onClick={onCloseMobile}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>সংস্করণ ১.০.০</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>
    </aside>
  );
}

function SidebarNavItem({
  item,
  currentPath,
  onClick,
}: {
  item: NavItemConfig;
  currentPath: string;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const { hasPermission } = usePermission(item.requiredPermission);

  // RULE 2: Permissions drive the UI (hide/disable menu items) using permission codes from /auth/me
  if (!hasPermission) {
    return null;
  }

  const isActive =
    currentPath === item.href ||
    (item.href !== '/dashboard' && currentPath.startsWith(`${item.href}/`));

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group
        ${
          isActive
            ? 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
        <span>{t(item.labelKey)}</span>
      </div>
      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
    </Link>
  );
}
