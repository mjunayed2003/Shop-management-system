import { create } from 'zustand';
import { api } from '../api/endpoints';
import { getPosDatabase, checkStorageQuota } from '../offline/db';

export type SyncState = 'IDLE' | 'SYNCING' | 'ERROR';

export interface OfflineState {
  isOnline: boolean;
  isManualOffline: boolean;
  isSimulatingOffline: boolean;
  syncState: SyncState;
  lastHealthPing: string | null;
  serverTimeOffset: number; // difference in ms (server - client)
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  remainingInvoices: number;
  hasOfflineSyncFeature: boolean;
  storageWarning: boolean;

  // Actions
  setManualOffline: (val: boolean) => void;
  setSimulatingOffline: (val: boolean) => void;
  setSyncState: (state: SyncState) => void;
  setServerTimeOffset: (serverTimeIso: string) => void;
  setHasOfflineSyncFeature: (allowed: boolean) => void;
  checkHealth: () => Promise<boolean>;
  refreshQueueCounts: (businessId?: string | null, branchId?: string | null, userId?: string | null) => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isManualOffline: false,
  isSimulatingOffline: false,
  syncState: 'IDLE',
  lastHealthPing: null,
  serverTimeOffset: 0,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,
  remainingInvoices: 0,
  hasOfflineSyncFeature: true,
  storageWarning: false,

  setManualOffline: (val: boolean) => {
    set({ isManualOffline: val });
  },

  setSimulatingOffline: (val: boolean) => {
    set({ isSimulatingOffline: val });
  },

  setSyncState: (syncState: SyncState) => {
    set({ syncState });
  },

  setServerTimeOffset: (serverTimeIso: string) => {
    try {
      const serverDate = new Date(serverTimeIso).getTime();
      const clientDate = Date.now();
      const offset = serverDate - clientDate;
      set({ serverTimeOffset: offset });
    } catch {
      // ignore
    }
  },

  setHasOfflineSyncFeature: (allowed: boolean) => {
    set({ hasOfflineSyncFeature: allowed });
  },

  checkHealth: async () => {
    const { isManualOffline, isSimulatingOffline } = get();
    if (isManualOffline || isSimulatingOffline) {
      set({ isOnline: false });
      return false;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ isOnline: false });
      return false;
    }

    try {
      const res = await api.health.check();
      const online = res?.status === 'ok';
      set({
        isOnline: online,
        lastHealthPing: new Date().toISOString(),
      });
      return online;
    } catch {
      set({ isOnline: false });
      return false;
    }
  },

  refreshQueueCounts: async (businessId, branchId, userId) => {
    try {
      const db = getPosDatabase(businessId, branchId, userId);
      const [pending, failed, conflict, unusedInvoices, quota] = await Promise.all([
        db.outboxQueue.where('status').equals('PENDING').count(),
        db.outboxQueue.where('status').equals('FAILED').count(),
        db.outboxQueue.where('status').equals('CONFLICT').count(),
        db.reservedInvoices.filter((r) => !r.isUsed).count(),
        checkStorageQuota(),
      ]);

      const lastSyncedMeta = await db.settings.get('last_sync_at');

      set({
        pendingCount: pending,
        failedCount: failed,
        conflictCount: conflict,
        remainingInvoices: unusedInvoices,
        lastSyncAt: lastSyncedMeta?.value || null,
        storageWarning: quota.isLow,
      });
    } catch {
      // ignore
    }
  },
}));
