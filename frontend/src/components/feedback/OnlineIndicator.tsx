'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useOfflineStore } from '@/lib/store/offline-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { SyncStatusPopover } from '../pos/SyncStatusPopover';

export function OnlineIndicator() {
  const { t } = useTranslation();
  const { user, business } = useAuthStore();
  const { currentBranchId } = useBranchStore();
  const {
    isOnline,
    isManualOffline,
    isSimulatingOffline,
    syncState,
    pendingCount,
    conflictCount,
    checkHealth,
    refreshQueueCounts,
  } = useOfflineStore();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Periodic health ping with backoff + online/offline event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    checkHealth();
    refreshQueueCounts(business?.id, currentBranchId, user?.id);

    const handleOnline = () => {
      checkHealth();
      refreshQueueCounts(business?.id, currentBranchId, user?.id);
    };

    const handleOffline = () => {
      checkHealth();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Health ping timer: every 30 seconds while active, or 10s if offline
    let backoffInterval = isOnline ? 30000 : 10000;
    const interval = setInterval(() => {
      checkHealth();
      refreshQueueCounts(business?.id, currentBranchId, user?.id);
    }, backoffInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkHealth, refreshQueueCounts, isOnline, business?.id, currentBranchId, user?.id]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const effectiveOnline = isOnline && !isManualOffline && !isSimulatingOffline;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all select-none shadow-sm cursor-pointer hover:opacity-90 active:scale-95 ${
          syncState === 'SYNCING'
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 animate-pulse'
            : effectiveOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
        }`}
        title="Connection status &amp; Offline Sync Hub"
      >
        {syncState === 'SYNCING' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">SYNCING</span>
          </>
        ) : effectiveOnline ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">ONLINE</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>OFFLINE</span>
          </>
        )}

        {/* Pending count badge */}
        {pendingCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
            {pendingCount}
          </span>
        )}

        {/* Conflicts indicator */}
        {conflictCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-bounce">
            !
          </span>
        )}
      </button>

      {/* Sync Status Popover */}
      <SyncStatusPopover isOpen={isPopoverOpen} onClose={() => setIsPopoverOpen(false)} />
    </div>
  );
}
