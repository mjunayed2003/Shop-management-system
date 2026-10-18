'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useOfflineStore } from '@/lib/store/offline-store';
import { syncEngine } from '@/lib/offline/sync-engine';
import { getPosDatabase, exportPendingQueueAsJson, wipePosDatabase } from '@/lib/offline/db';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import Link from 'next/link';
import {
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';

export default function SyncHubPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user, business } = useAuthStore();
  const businessId = business?.id;
  const { currentBranchId, currentBranch } = useBranchStore();
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
    hasOfflineSyncFeature,
    storageWarning,
    setManualOffline,
    setSimulatingOffline,
    checkHealth,
    refreshQueueCounts,
  } = useOfflineStore();

  const [outboxItems, setOutboxItems] = useState<any[]>([]);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [bootstrapProgress, setBootstrapProgress] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // 1. Fetch server branch sync status
  const { data: serverStatus, refetch: refetchServerStatus } = useQuery({
    queryKey: ['sync', 'status', currentBranchId],
    queryFn: () => api.sync.status(),
    enabled: isOnline && !isManualOffline && !isSimulatingOffline,
  });

  // 2. Load local Dexie outbox items
  const loadLocalOutbox = async () => {
    if (!businessId || !currentBranchId || !user?.id) return;
    try {
      const db = getPosDatabase(businessId, currentBranchId, user.id);
      const items = await db.outboxQueue.toArray();
      setOutboxItems(items);
      refreshQueueCounts(businessId, currentBranchId, user.id);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadLocalOutbox();
  }, [businessId, currentBranchId, user?.id]);

  const handleSyncNow = async () => {
    if (!businessId || !currentBranchId || !user?.id) return;
    setIsSyncingNow(true);
    try {
      await checkHealth();
      const res = await syncEngine.pushOutbox(businessId, currentBranchId, user.id);
      await loadLocalOutbox();
      refetchServerStatus();

      if (res.processed > 0) {
        toast.success(`${res.processed} offline action(s) synced successfully.`);
      } else if (res.conflicts > 0) {
        toast.error(`${res.conflicts} conflict(s) detected. Please review conflicts.`);
      } else {
        toast.info('All outbox items are up to date.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Sync failed');
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleFullBootstrap = async () => {
    if (!businessId || !currentBranchId || !user?.id) return;
    try {
      setBootstrapProgress('Starting full catalog re-sync...');
      const outcome = await syncEngine.bootstrap(businessId, currentBranchId, user.id, {
        forceFull: true,
        onProgress: (msg) => setBootstrapProgress(msg),
      });

      if (outcome.success) {
        toast.success('Offline store data refreshed completely.');
        await loadLocalOutbox();
      } else {
        toast.error(outcome.error || 'Bootstrap failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Bootstrap error');
    } finally {
      setBootstrapProgress(null);
    }
  };

  const handleReserveNumbers = async () => {
    if (!businessId || !currentBranchId || !user?.id) return;
    try {
      await syncEngine.reserveInvoicesIfNeeded(businessId, currentBranchId, user.id, 999);
      await refreshQueueCounts(businessId, currentBranchId, user.id);
      toast.success('Reserved a fresh block of 50 invoice numbers.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reserve invoice numbers');
    }
  };

  const handleExportQueue = async () => {
    try {
      const { json, count } = await exportPendingQueueAsJson(businessId, currentBranchId, user?.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pending-outbox-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${count} queue items as JSON.`);
    } catch (err) {
      toast.error('Failed to export pending queue');
    }
  };

  const handleResetLocalData = async () => {
    try {
      await wipePosDatabase(businessId, currentBranchId, user?.id);
      await loadLocalOutbox();
      setIsResetConfirmOpen(false);
      toast.success('Local database wiped successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Wipe failed');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className={`w-6 h-6 text-emerald-600 ${isSyncingNow ? 'animate-spin' : ''}`} />
            <span>Offline Sync Hub &amp; Outbox</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage offline queue, local catalog cache, reserved invoices, and data reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportQueue}
            className="text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Queue (JSON)
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncingNow || (!isOnline && !isManualOffline)}
            className="text-xs h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            {isSyncingNow ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Sync Now
          </Button>
        </div>
      </div>

      {/* Plan limit explanation if disabled */}
      {!hasOfflineSyncFeature && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold">Offline Sync is unavailable on your current subscription plan.</strong>
            <p>
              Your plan does not have the <code>has_offline_sync</code> feature enabled. The POS terminal requires an active internet connection to process sales. Please upgrade your business plan to enable offline mode.
            </p>
          </div>
        </div>
      )}

      {/* Connection & Quota Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Network Mode</span>
            {isOnline && !isManualOffline && !isSimulatingOffline ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                Online
              </Badge>
            ) : (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                Offline
              </Badge>
            )}
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
            <span>{isManualOffline ? 'Manual Offline Mode' : isOnline ? 'Connected to Cloud' : 'Network Disconnected'}</span>
          </div>
          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-slate-500">Work offline toggle:</span>
            <input
              type="checkbox"
              checked={isManualOffline}
              onChange={(e) => setManualOffline(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
          </div>
        </div>

        {/* Pending Outbox */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase">Pending In Outbox</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {pendingCount}
          </div>
          <p className="text-[11px] text-slate-500">
            {failedCount > 0 ? `${failedCount} retrying with backoff` : 'Queued for automatic sync'}
          </p>
        </div>

        {/* Conflicts */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Sync Conflicts</span>
            {conflictCount > 0 && (
              <Link
                href="/sync/conflicts"
                className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-0.5"
              >
                <span>Review</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className={`text-2xl font-black ${conflictCount > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
            {conflictCount}
          </div>
          <p className="text-[11px] text-slate-500">
            {conflictCount > 0 ? 'Requires manager resolution' : 'Zero conflict items'}
          </p>
        </div>

        {/* Reserved Invoices */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Reserved Invoices</span>
            <button
              type="button"
              onClick={handleReserveNumbers}
              className="text-[10px] text-emerald-600 font-bold hover:underline"
              title="Reserve +50 more numbers"
            >
              +50 More
            </button>
          </div>
          <div className={`text-2xl font-black ${remainingInvoices < 10 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
            {remainingInvoices}
          </div>
          <p className="text-[11px] text-slate-500">
            Available locally for offline sales
          </p>
        </div>
      </div>

      {/* Action Controls & Maintenance */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFullBootstrap}
            disabled={!isOnline || Boolean(bootstrapProgress)}
            className="text-xs h-8 rounded-xl"
          >
            <Database className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Full Re-Bootstrap Catalog
          </Button>

          {bootstrapProgress && (
            <span className="text-xs text-emerald-600 animate-pulse font-medium">
              {bootstrapProgress}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Dev Simulate offline */}
          <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={isSimulatingOffline}
              onChange={(e) => setSimulatingOffline(e.target.checked)}
              className="w-3.5 h-3.5 text-amber-600 rounded"
            />
            <span>Simulate Offline (Dev)</span>
          </label>

          {/* Reset local data button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 rounded-xl"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Reset Local DB
          </Button>
        </div>
      </div>

      {/* Outbox Items Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Local Outbox Queue ({outboxItems.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Scope: {currentBranch?.name || 'Current Branch'}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {outboxItems.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Outbox queue is empty. All offline transactions have been synchronized.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">Client Sync ID</th>
                    <th className="py-3 px-4">Reference / Invoice</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4">Retries</th>
                    <th className="py-3 px-4">Error / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {outboxItems.map((item) => (
                    <tr key={item.client_sync_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {item.entity_type}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {item.client_sync_id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {item.payload?.invoiceNo || item.payload?.name || item.payload?.client_ref || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            item.status === 'PROCESSED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'CONFLICT'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : item.status === 'FAILED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-mono">{item.retry_count || 0}</td>
                      <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-mono text-[11px] max-w-xs truncate">
                        {item.error || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Resetting Local Database */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetLocalData}
        title="Reset Local IndexedDB Database?"
        description={
          pendingCount > 0
            ? `WARNING: You have ${pendingCount} pending unsynced item(s) in your outbox. Wiping local data will permanently delete them! Please export the queue as JSON before proceeding.`
            : 'This will wipe the cached products, customers, and invoice sequences for this branch. A new bootstrap will be required.'
        }
        confirmText="Yes, Wipe Database"
        variant="danger"
      />
    </div>
  );
}
