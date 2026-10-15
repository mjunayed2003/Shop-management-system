'use client';

import React from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { BranchSwitcher } from './BranchSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';
import { OnlineIndicator } from '../feedback/OnlineIndicator';
import { Store, Menu } from 'lucide-react';

interface AppTopBarProps {
  onOpenMobileSidebar: () => void;
}

export function AppTopBar({ onOpenMobileSidebar }: AppTopBarProps) {
  const business = useAuthStore((s) => s.business);

  return (
    <header className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4">
      {/* Left: Mobile trigger & Business Name */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {business && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[140px] sm:max-w-[220px]">
                {business.name}
              </h2>
              {business.slug && (
                <span className="hidden sm:block text-[10px] text-slate-400 font-mono">
                  @{business.slug}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Branch Switcher */}
        <BranchSwitcher />

        {/* Online/Offline status indicator */}
        <OnlineIndicator />

        {/* Notification Bell placeholder */}
        <NotificationBell />

        {/* Language switch */}
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>

        {/* Theme switch */}
        <ThemeToggle />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
