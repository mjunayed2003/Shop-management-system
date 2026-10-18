'use client';

import React, { useState, useEffect } from 'react';
import { useOfflineStore } from '@/lib/store/offline-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { syncEngine } from '@/lib/offline/sync-engine';
import { exportPendingQueueAsJson } from '@/lib/offline/db';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sliders,
} from 'lucide-react';

interface SyncStatusPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncStatusPopover({ isOpen, onClose }: SyncStatusPopoverProps) {
  const { t } = useTranslation();
  const { user, business } = useAuthStore();
  const { currentBranchId } = useBranchStore();
  const {
    isOnline,
    isManualOffline,
    isSimulatingOffline,
    syncState,
    pendingCount,
    failedCount,
    conflictCount,
    remainingInvoices,
    lastSyncAt,
    storageWarning,
    setManualOffline,
    setSimulatingOffline,
    checkHealth,
    refreshQueueCounts,
  } = useOfflineStore();

  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshQueueCounts(business?.id, currentBranchId, user?.id);
    }
  }, [isOpen, business?.id, currentBranchId, user?.id, refreshQueueCounts]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    if (!business?.id || !currentBranchId || !user?.id) return;
    setIsManualSyncing(true);
    setSyncMessage(null);
    try {
      await checkHealth();
      const outcome = await syncEngine.pushOutbox(business.id, currentBranchId, user.id);
      setSyncMessage(
        outcome.processed > 0
          ? `${outcome.processed} item(s) synced.`
          : outcome.conflicts > 0
          ? `${outcome.conflicts} conflict(s) need attention.`
          : 'Sync completed.'
      );
    } catch (err: any) {
      setSyncMessage(err?.message || 'Sync failed');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleExportQueue = async () => {
    try {
      const { json, count } = await exportPendingQueueAsJson(business?.id, currentBranchId, user?.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pending-queue-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Queue export failed:', err);
    }
  };

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 p-4 space-y-4 animate-scaleIn text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <WifiOff className="w-3.5 h-3.5" />
              OFFLINE
            </span>
          )}
          {syncState === 'SYNCING' && (
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200 animate-pulse">
              Syncing...
            </Badge>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
        >
          ✕
        </button>
      </div>

      {/* Warning Banners */}
      {storageWarning && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>Device storage is getting low (&gt;85%). Consider cleaning browser data or syncing pending sales.</span>
        </div>
      )}

      {/* Outbox Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pending</span>
          <span className="text-lg font-black text-slate-800 dark:text-white">{pendingCount}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Conflicts</span>
          <span className={`text-lg font-black ${conflictCount > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
            {conflictCount}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Invoices Left</span>
          <span className={`text-lg font-black ${remainingInvoices < 10 ? 'text-amber-600' : 'text-slate-800 dark:text-white'}`}>
            {remainingInvoices}
          </span>
        </div>
      </div>

      {/* Last Sync Info */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> Last synced:
        </span>
        <span className="font-mono text-slate-700 dark:text-slate-300">
          {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'Never'}
        </span>
      </div>

      {syncMessage && (
        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs text-center font-medium">
          {syncMessage}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-1">
        <Button
          type="button"
          onClick={handleSyncNow}
          disabled={isManualSyncing || (!isOnline && !isManualOffline)}
          className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl"
        >
          {isManualSyncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Sync Now
        </Button>

        {/* Manual Offline Toggle */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
          <span className="font-medium">Work Offline Mode</span>
          <input
            type="checkbox"
            checked={isManualOffline}
            onChange={(e) => setManualOffline(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        </div>

        {/* Dev switch */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
          <span className="text-[10px] text-slate-400">Dev: Simulate Offline</span>
          <input
            type="checkbox"
            checked={isSimulatingOffline}
            onChange={(e) => setSimulatingOffline(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-amber-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Footer Navigation Links */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
        <Link
          href="/sync"
          onClick={onClose}
          className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <span>Sync Hub &amp; Queue</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={handleExportQueue}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
            title="Download pending queue as backup JSON"
          >
            <Download className="w-3 h-3" />
            <span>Export JSON</span>
          </button>
        )}
      </div>
    </div>
  );
}
