'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useOfflineStore } from '@/lib/store/offline-store';
import { exportPendingQueueAsJson, wipePosDatabase } from '@/lib/offline/db';
import { useTranslation } from '@/lib/i18n';
import { User, KeyRound, LogOut, ChevronDown, Shield, AlertTriangle, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, business, clearAuth } = useAuthStore();
  const { currentBranchId, clearBranchState } = useBranchStore();
  const { pendingCount, conflictCount } = useOfflineStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutGuardOpen, setIsLogoutGuardOpen] = useState(false);
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

  const triggerLogoutCheck = () => {
    setIsOpen(false);
    if (pendingCount > 0 || conflictCount > 0) {
      setIsLogoutGuardOpen(true);
    } else {
      executeSafeLogout();
    }
  };

  const executeSafeLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }

    // Wipe local cache only after queue is empty or confirmed
    try {
      await wipePosDatabase(business?.id, currentBranchId, user.id);
    } catch {
      // ignore
    }

    clearAuth();
    clearBranchState();
    setIsLogoutGuardOpen(false);
    router.push('/login');
  };

  const handleExportAndLogout = async () => {
    try {
      const { json } = await exportPendingQueueAsJson(business?.id, currentBranchId, user.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pending-queue-before-logout-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    await executeSafeLogout();
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
              onClick={triggerLogoutCheck}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Logout Warning Dialog if Outbox Has Pending Items */}
      <Dialog open={isLogoutGuardOpen} onOpenChange={setIsLogoutGuardOpen}>
        <DialogContent className="max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Unsynced Offline Transactions Pending</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p>
              You have <strong>{pendingCount} unsynced item(s)</strong> and <strong>{conflictCount} conflict(s)</strong> waiting in your local device queue.
            </p>
            <p className="text-rose-600 dark:text-rose-400 font-semibold">
              Logging out will wipe the local offline cache on this device. If you log out now without syncing, these offline transactions will be lost permanently.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLogoutGuardOpen(false)}
              className="text-xs h-8 rounded-xl"
            >
              Cancel &amp; Keep Session
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportAndLogout}
              className="text-xs h-8 rounded-xl border-amber-300 text-amber-800 dark:text-amber-200"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export JSON &amp; Logout
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={executeSafeLogout}
              className="text-xs h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Discard &amp; Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
