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
  const { locale } = useTranslation();

  return (
    <aside className="w-64 h-full flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 border-r border-slate-200/80 dark:border-slate-800 select-none">
      {/* Brand Header matching PublicNavbar */}
      <div className="h-16 shrink-0 flex items-center gap-3 px-5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-[#3b7987] hover:bg-[#326975] text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-black tracking-wider text-[#3b7987] dark:text-[#52a7b7] uppercase font-sans leading-none">
            {locale === 'bn' ? 'দোকান পিওএস' : 'DIAMON POS'}
          </h1>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest leading-tight mt-0.5">
            RETAIL ERP
          </p>
        </div>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar-thumb]:bg-slate-200/80 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/60 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {locale === 'bn' ? 'মূল মেনু' : 'MAIN MENU'}
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
      <div className="p-3 shrink-0 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
        <span>{locale === 'bn' ? 'সংস্করণ ১.০.০' : 'Version 1.0.0'}</span>
        <span className="w-2 h-2 rounded-full bg-[#3b7987] shadow-xs shadow-[#3b7987]/50" />
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
        flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-semibold tracking-wide transition-all group
        ${
          isActive
            ? 'bg-[#c2d4d4] dark:bg-[#2c4246] text-slate-900 dark:text-slate-50 font-bold shadow-xs'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }
      `}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            isActive
              ? 'text-slate-900 dark:text-slate-50'
              : 'text-slate-500 dark:text-slate-400 group-hover:text-[#3b7987] dark:group-hover:text-[#52a7b7]'
          }`}
        />
        <span>{t(item.labelKey)}</span>
      </div>
      {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />}
    </Link>
  );
}
