'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { User, KeyRound, LogOut, ChevronDown, Shield } from 'lucide-react';

export function UserMenu() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, business, clearAuth } = useAuthStore();
  const { clearBranchState } = useBranchStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearAuth();
    clearBranchState();
    router.push('/login');
  };

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
            {user.fullName}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
            {user.isOwner ? 'দোকান মালিক (Owner)' : user.role?.name}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 p-1.5 space-y-1 animate-scaleIn">
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user.fullName}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email || user.phone}</p>
            {business && (
              <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {business.name}
              </p>
            )}
          </div>

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>{t('profile.title')}</span>
          </Link>

          <Link
            href="/profile#password"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <KeyRound className="w-4 h-4 text-slate-500" />
            <span>{t('profile.changePassword')}</span>
          </Link>

          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
