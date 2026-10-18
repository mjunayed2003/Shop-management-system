import { api } from '../api/endpoints';
import { getPosDatabase, LocalOutboxItem } from './db';
import { useOfflineStore } from '../store/offline-store';

/**
 * Core Sync Engine
 * Handles bootstrapping, incremental sync, invoice reservation, outbox queue processing,
 * multi-tab leader election via Web Locks API, and conflict tracking.
 */
export class SyncEngine {
  private isPushing = false;

  /**
   * Bootstraps local IndexedDB with catalog products, variants, prices, customers,
   * price lists, coupons, permissions, and initial invoice numbers.
   */
  async bootstrap(
    businessId: string,
    branchId: string,
    userId: string,
    options: { forceFull?: boolean; onProgress?: (msg: string) => void } = {},
  ): Promise<{ success: boolean; error?: string }> {
    const db = getPosDatabase(businessId, branchId, userId);
    const { onProgress } = options;

    try {
      onProgress?.('Connecting to server...');
      let updatedSince: string | undefined = undefined;

      if (!options.forceFull) {
        const cursor = await db.settings.get('updated_since');
        if (cursor?.value) {
          updatedSince = cursor.value;
        }
      }

      onProgress?.('Downloading store catalog and customers...');
      const data = await api.sync.bootstrap(updatedSince);

      // 1. Update Server Time Offset
      if (data.server_time) {
        useOfflineStore.getState().setServerTimeOffset(data.server_time);
        await db.settings.put({ key: 'server_time', value: data.server_time });
      }

      // 2. Store Products and variants
      onProgress?.(`Storing ${data.products?.length || 0} products...`);
      if (data.products && Array.isArray(data.products)) {
        await db.transaction('rw', db.products, async () => {
          for (const prod of data.products) {
            const defaultVariant = prod.variants?.[0];
            const retailPrice = defaultVariant ? Number(defaultVariant.retail_price || 0) : 0;
            const wholesalePrice = defaultVariant ? Number(defaultVariant.wholesale_price || 0) : null;
            const barcode = defaultVariant?.barcode_value || prod.code || '';

            await db.products.put({
              id: prod.id,
              sku: prod.code,
              barcode,
              name: prod.name,
              categoryId: prod.category_id,
              brandId: prod.brand_id,
              retailPrice,
              wholesalePrice,
              isActive: prod.is_active ?? true,
              isTracked: prod.track_individually ?? false,
              variants: prod.variants || [],
              stockBalances: defaultVariant?.stock_balances || [],
              updatedAt: prod.updated_at || new Date().toISOString(),
            });
          }
        });
      }

      // 3. Store Customers (capped at 1000 from server)
      onProgress?.(`Storing ${data.customers?.length || 0} customers...`);
      if (data.customers && Array.isArray(data.customers)) {
        await db.transaction('rw', db.customers, async () => {
          for (const cust of data.customers) {
            await db.customers.put({
              id: cust.id,
              name: cust.name,
              phone: cust.phone,
              email: cust.email,
              currentDue: Number(cust.current_due || 0),
              creditLimit: Number(cust.credit_limit || 0),
              loyaltyPoints: Number(cust.loyalty_points || 0),
              updatedAt: cust.updated_at,
            });
          }
        });
      }

      // 4. Store Price Lists & Coupons
      if (data.priceLists && Array.isArray(data.priceLists)) {
        await db.transaction('rw', db.priceLists, async () => {
          for (const pl of data.priceLists) {
            await db.priceLists.put({ id: pl.id, name: pl.name, items: pl.items || [] });
          }
        });
      }

      if (data.coupons && Array.isArray(data.coupons)) {
        await db.transaction('rw', db.coupons, async () => {
          for (const c of data.coupons) {
            await db.coupons.put({
              id: c.id,
              code: c.code,
              discountType: c.discount_type,
              discountValue: Number(c.discount_value || 0),
              minPurchaseAmount: Number(c.min_purchase_amount || 0),
              expiresAt: c.expires_at,
            });
          }
        });
      }

      // 5. Store Permissions
      if (data.permissions && Array.isArray(data.permissions)) {
        await db.settings.put({ key: 'user_permissions', value: data.permissions });
      }

      // 6. Update Cursors
      const nowIso = new Date().toISOString();
      await db.settings.put({ key: 'last_sync_at', value: nowIso });
      await db.settings.put({ key: 'updated_since', value: data.server_time || nowIso });

      // 7. Ensure reserved invoice numbers
      onProgress?.('Checking reserved invoice numbers...');
      await this.reserveInvoicesIfNeeded(businessId, branchId, userId);

      // Refresh store counts
      await useOfflineStore.getState().refreshQueueCounts(businessId, branchId, userId);
      useOfflineStore.getState().setHasOfflineSyncFeature(true);

      onProgress?.('Offline data ready');
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'FEATURE_NOT_IN_PLAN' || err?.message?.includes('has_offline_sync')) {
        useOfflineStore.getState().setHasOfflineSyncFeature(false);
        return {
          success: false,
          error: 'Your subscription plan does not include offline sync (has_offline_sync: false).',
        };
      }
      return {
        success: false,
        error: err?.message || 'Bootstrap failed',
      };
    }
  }

  /**
   * Reserves a block of invoice numbers from the server if the local unused count is low.
   */
  async reserveInvoicesIfNeeded(
    businessId: string,
    branchId: string,
    userId: string,
    threshold = 15,
  ): Promise<void> {
    const db = getPosDatabase(businessId, branchId, userId);

    try {
      const unusedCount = await db.reservedInvoices.filter((r) => !r.isUsed).count();

      if (unusedCount < threshold) {
        const res = await api.sync.reserveInvoiceNumbers(50);
        const { prefix, from, to } = res;

        await db.transaction('rw', db.reservedInvoices, async () => {
          for (let seq = from; seq <= to; seq++) {
            const padded = String(seq).padStart(6, '0');
            const invNo = `${prefix}${padded}`;

            // Check if already in DB
            const existing = await db.reservedInvoices.where('number').equals(invNo).first();
            if (!existing) {
              await db.reservedInvoices.add({
                number: invNo,
                prefix,
                sequenceNumber: seq,
                isUsed: false,
              });
            }
          }
        });

        if (res.server_time) {
          useOfflineStore.getState().setServerTimeOffset(res.server_time);
        }
      }
    } catch (err) {
      console.warn('Could not reserve invoice numbers (offline or network error):', err);
    }
  }

  /**
   * Atomically consumes the next available reserved invoice number.
   * If none are available, throws an error blocking offline sales.
   */
  async consumeNextInvoiceNumber(
    businessId: string,
    branchId: string,
    userId: string,
    saleId: string,
  ): Promise<string> {
    const db = getPosDatabase(businessId, branchId, userId);

    return db.transaction('rw', db.reservedInvoices, async () => {
      const available = await db.reservedInvoices
        .filter((r) => !r.isUsed)
        .sortBy('sequenceNumber');

      if (!available || available.length === 0) {
        throw new Error(
          'Reserved invoice numbers are exhausted. Connect to the internet to reserve more numbers before creating new sales.',
        );
      }

      const nextInv = available[0];
      await db.reservedInvoices.update(nextInv.id!, {
        isUsed: true,
        usedAt: new Date().toISOString(),
        usedForSaleId: saleId,
      });

      return nextInv.number;
    });
  }

  /**
   * Pushes pending outbox items to the server using Web Locks API for multi-tab safety.
   */
  async pushOutbox(
    businessId: string,
    branchId: string,
    userId: string,
  ): Promise<{ processed: number; conflicts: number; failed: number }> {
    if (this.isPushing) return { processed: 0, conflicts: 0, failed: 0 };

    const offlineStore = useOfflineStore.getState();
    if (!offlineStore.isOnline || offlineStore.isManualOffline || offlineStore.isSimulatingOffline) {
      return { processed: 0, conflicts: 0, failed: 0 };
    }

    // Multi-tab leader election via Web Locks API if available
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      return navigator.locks.request('pos_outbox_push', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          // Another tab is already pushing
          return { processed: 0, conflicts: 0, failed: 0 };
        }
        return this.executePush(businessId, branchId, userId);
      });
    }

    return this.executePush(businessId, branchId, userId);
  }

  private async executePush(
    businessId: string,
    branchId: string,
    userId: string,
  ): Promise<{ processed: number; conflicts: number; failed: number }> {
    this.isPushing = true;
    useOfflineStore.getState().setSyncState('SYNCING');
    const db = getPosDatabase(businessId, branchId, userId);

    try {
      // Fetch up to 25 pending or eligible failed items (with backoff)
      const now = Date.now();
      const allItems = await db.outboxQueue.toArray();

      const candidateItems = allItems.filter((item) => {
        if (item.status === 'PENDING') return true;
        if (item.status === 'FAILED') {
          // Exponential backoff: 2^retry_count * 5 seconds (max 5 mins)
          const backoffMs = Math.min(Math.pow(2, item.retry_count || 1) * 5000, 300000);
          const itemTime = new Date(item.created_at).getTime();
          return now - itemTime > backoffMs;
        }
        return false;
      }).slice(0, 25);

      if (candidateItems.length === 0) {
        useOfflineStore.getState().setSyncState('IDLE');
        await useOfflineStore.getState().refreshQueueCounts(businessId, branchId, userId);
        return { processed: 0, conflicts: 0, failed: 0 };
      }

      // Mark items as SYNCING in DB
      for (const item of candidateItems) {
        if (item.id) {
          await db.outboxQueue.update(item.id, { status: 'SYNCING' });
        }
      }

      // Prepare payload
      const pushItems = candidateItems.map((item) => ({
        client_sync_id: item.client_sync_id,
        entity_type: item.entity_type,
        client_created_at: item.client_created_at,
        payload: item.payload,
      }));

      const res = await api.sync.push(pushItems);

      // Process outcomes
      for (const outcome of res.results) {
        const item = candidateItems.find((ci) => ci.client_sync_id === outcome.client_sync_id);
        if (!item || !item.id) continue;

        if (outcome.status === 'PROCESSED') {
          // Handle specific entity reconciliation
          if (item.entity_type === 'CUSTOMER') {
            const customerMapping = outcome.result;
            if (customerMapping?.client_customer_ref && customerMapping?.server_customer_id) {
              await db.idMappings.put({
                client_ref: customerMapping.client_customer_ref,
                server_id: customerMapping.server_customer_id,
                entity_type: 'CUSTOMER',
                created_at: new Date().toISOString(),
              });
              // Update local customer ID
              await db.customers.update(customerMapping.client_customer_ref, {
                id: customerMapping.server_customer_id,
                isClientCreated: false,
              });
            }
          } else if (item.entity_type === 'SALE') {
            const serverSale = outcome.result?.sale;
            const existingSale = await db.offlineSales.where('clientSyncId').equals(item.client_sync_id).first();

            if (existingSale && serverSale) {
              const provisionalTotal = existingSale.totalAmount;
              const serverTotal = Number(serverSale.total_amount || 0);
              const diff = serverTotal - provisionalTotal;

              await db.offlineSales.update(existingSale.id, {
                status: 'SYNCED',
                isProvisional: false,
                serverSaleId: serverSale.id,
                provisionalDifference: Math.abs(diff) > 0.01 ? diff : undefined,
              });
            }
          }

          // Remove processed item from outboxQueue
          await db.outboxQueue.delete(item.id);

          // Record diagnostic log
          await db.diagnostics.add({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            event: `Processed ${item.entity_type}: ${item.client_sync_id}`,
          });
        } else if (outcome.status === 'CONFLICT') {
          // Mark CONFLICT: keep in queue for manager review
          await db.outboxQueue.update(item.id, {
            status: 'CONFLICT',
            error: outcome.error_message || 'Conflict detected during sync',
          });

          await db.diagnostics.add({
            timestamp: new Date().toISOString(),
            level: 'WARN',
            event: `Conflict on ${item.entity_type}: ${outcome.error_message}`,
          });
        } else {
          // FAILED: increment retry count
          await db.outboxQueue.update(item.id, {
            status: 'FAILED',
            retry_count: (item.retry_count || 0) + 1,
            error: outcome.error_message || 'Processing failed on server',
          });

          await db.diagnostics.add({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            event: `Failed ${item.entity_type}: ${outcome.error_message}`,
          });
        }
      }

      // Check if more reserved invoices are needed
      await this.reserveInvoicesIfNeeded(businessId, branchId, userId);

      return {
        processed: res.processed,
        conflicts: res.conflicts,
        failed: res.failed,
      };
    } catch (err: any) {
      console.error('Outbox push batch failed:', err);
      // Reset items in SYNCING back to PENDING
      const syncingItems = await db.outboxQueue.where('status').equals('SYNCING').toArray();
      for (const item of syncingItems) {
        if (item.id) {
          await db.outboxQueue.update(item.id, { status: 'PENDING' });
        }
      }
      return { processed: 0, conflicts: 0, failed: 0 };
    } finally {
      this.isPushing = false;
      useOfflineStore.getState().setSyncState('IDLE');
      await useOfflineStore.getState().refreshQueueCounts(businessId, branchId, userId);
    }
  }
}

export const syncEngine = new SyncEngine();
