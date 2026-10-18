import Dexie, { type Table } from 'dexie';

export interface LocalProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  categoryId?: string | null;
  brandId?: string | null;
  retailPrice: number;
  wholesalePrice?: number | null;
  isActive: boolean;
  isTracked: boolean;
  variants: any[];
  stockBalances: any[];
  updatedAt: string;
}

export interface LocalCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  currentDue: number;
  creditLimit: number;
  loyaltyPoints?: number;
  updatedAt?: string;
  isClientCreated?: boolean;
}

export interface LocalPriceList {
  id: string;
  name: string;
  items: any[];
}

export interface LocalCoupon {
  id: string;
  code: string;
  discountType: 'FLAT' | 'PERCENTAGE';
  discountValue: number;
  minPurchaseAmount?: number;
  expiresAt?: string;
}

export interface LocalSetting {
  key: string;
  value: any;
}

export interface LocalReservedInvoice {
  id?: number;
  number: string;
  prefix: string;
  sequenceNumber: number;
  isUsed: boolean;
  usedAt?: string;
  usedForSaleId?: string;
}

export interface LocalOutboxItem {
  id?: number;
  client_sync_id: string;
  entity_type: 'SALE' | 'CUSTOMER' | 'EXPENSE' | 'HELD_SALE';
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'PROCESSED' | 'FAILED' | 'CONFLICT';
  retry_count: number;
  error?: string;
  created_at: string;
  client_created_at: string;
}

export interface LocalOfflineSale {
  id: string;
  invoiceNo: string;
  clientSyncId: string;
  date: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  totalPaid: number;
  dueAmount: number;
  status: 'PROVISIONAL' | 'SYNCED' | 'CONFLICT';
  isProvisional: boolean;
  serverSaleId?: string;
  provisionalDifference?: number;
  receiptData: any;
}

export interface LocalIdMapping {
  client_ref: string;
  server_id: string;
  entity_type: string;
  created_at: string;
}

export interface LocalDiagnosticLog {
  id?: number;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  event: string;
  details?: any;
}

/**
 * Isolated IndexedDB instance namespaced by business + branch + user.
 * Rule: Switching branch or user never exposes another scope's local data.
 */
export class PosDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  customers!: Table<LocalCustomer, string>;
  priceLists!: Table<LocalPriceList, string>;
  coupons!: Table<LocalCoupon, string>;
  settings!: Table<LocalSetting, string>;
  reservedInvoices!: Table<LocalReservedInvoice, number>;
  outboxQueue!: Table<LocalOutboxItem, number>;
  offlineSales!: Table<LocalOfflineSale, string>;
  idMappings!: Table<LocalIdMapping, string>;
  diagnostics!: Table<LocalDiagnosticLog, number>;

  constructor(dbName: string) {
    super(dbName);

    this.version(1).stores({
      products: 'id, sku, barcode, name, categoryId, brandId, isActive',
      customers: 'id, phone, name',
      priceLists: 'id, name',
      coupons: 'id, code',
      settings: 'key',
      reservedInvoices: '++id, number, isUsed, sequenceNumber',
      outboxQueue: '++id, client_sync_id, status, entity_type, created_at',
      offlineSales: 'id, invoiceNo, clientSyncId, date, status',
      idMappings: 'client_ref, server_id, entity_type',
      diagnostics: '++id, timestamp, level, event',
    });
  }
}

// Map of cached Dexie instances per namespace
const dbCache = new Map<string, PosDatabase>();

/**
 * Returns namespaced PosDatabase instance.
 */
export function getPosDatabase(
  businessId?: string | null,
  branchId?: string | null,
  userId?: string | null,
): PosDatabase {
  const bId = businessId || 'default_biz';
  const brId = branchId || 'default_branch';
  const uId = userId || 'default_user';
  const dbName = `pos_db_${bId}_${brId}_${uId}`;

  let db = dbCache.get(dbName);
  if (!db) {
    db = new PosDatabase(dbName);
    dbCache.set(dbName, db);
  }
  return db;
}

/**
 * Completely wipes local database for the given scope.
 */
export async function wipePosDatabase(
  businessId?: string | null,
  branchId?: string | null,
  userId?: string | null,
): Promise<void> {
  const bId = businessId || 'default_biz';
  const brId = branchId || 'default_branch';
  const uId = userId || 'default_user';
  const dbName = `pos_db_${bId}_${brId}_${uId}`;

  const db = dbCache.get(dbName);
  if (db) {
    await db.delete();
    dbCache.delete(dbName);
  } else {
    const tempDb = new Dexie(dbName);
    await tempDb.delete();
  }
}

/**
 * Exports pending outbox queue as downloadable JSON file (escape hatch / support).
 */
export async function exportPendingQueueAsJson(
  businessId?: string | null,
  branchId?: string | null,
  userId?: string | null,
): Promise<{ count: number; json: string }> {
  const db = getPosDatabase(businessId, branchId, userId);
  const items = await db.outboxQueue.where('status').anyOf(['PENDING', 'FAILED', 'CONFLICT']).toArray();
  const exportPayload = {
    businessId,
    branchId,
    userId,
    exportedAt: new Date().toISOString(),
    pendingCount: items.length,
    items,
  };
  return {
    count: items.length,
    json: JSON.stringify(exportPayload, null, 2),
  };
}

/**
 * Checks storage quota and returns usage stats.
 */
export async function checkStorageQuota(): Promise<{
  usageMb: number;
  quotaMb: number;
  percentUsed: number;
  isLow: boolean;
}> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 1024 * 1024 * 1024; // fallback 1GB
      const usageMb = Math.round((usage / (1024 * 1024)) * 100) / 100;
      const quotaMb = Math.round((quota / (1024 * 1024)) * 100) / 100;
      const percentUsed = Math.round((usage / quota) * 100);
      return {
        usageMb,
        quotaMb,
        percentUsed,
        isLow: percentUsed > 85,
      };
    } catch {
      // Fallback
    }
  }
  return { usageMb: 0, quotaMb: 1024, percentUsed: 0, isLow: false };
}
