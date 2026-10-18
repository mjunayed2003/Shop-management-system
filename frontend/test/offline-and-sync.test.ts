import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPosDatabase, wipePosDatabase, exportPendingQueueAsJson } from '../src/lib/offline/db';
import { syncEngine } from '../src/lib/offline/sync-engine';
import { createOfflineSale, createOfflineCustomer } from '../src/lib/offline/offline-sales';
import { localPricingEngine } from '../src/lib/offline/local-pricing';
import { calculateSmsSegments, sanitizeCsvCell } from '../src/lib/utils/sms-segments';
import { generateReceiptHtml } from '../src/lib/utils/receipt-template';
import { useOfflineStore } from '../src/lib/store/offline-store';
import { api } from '../src/lib/api/endpoints';

describe('Phase F6 - Offline POS, Sync Engine, Security & Segments', () => {
  const bizA = 'biz_test_a';
  const branchA = 'branch_test_a';
  const userA = 'user_test_a';

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(api.sync, 'reserveInvoiceNumbers').mockResolvedValue({
      prefix: 'INV-OFF-',
      from: 100,
      to: 150,
      server_time: new Date().toISOString(),
    });
    useOfflineStore.setState({
      isOnline: true,
      isManualOffline: false,
      isSimulatingOffline: false,
      syncState: 'IDLE',
      hasOfflineSyncFeature: true,
      pendingCount: 0,
      conflictCount: 0,
    });
    await wipePosDatabase(bizA, branchA, userA);
  });

  describe('1. Multi-Tenant IndexedDB Isolation & Wipe Rules', () => {
    it('isolates local data between different business/branch/user namespaces', async () => {
      const db1 = getPosDatabase('biz_1', 'branch_1', 'user_1');
      const db2 = getPosDatabase('biz_2', 'branch_2', 'user_2');

      await db1.products.put({
        id: 'prod_1',
        sku: 'SKU1',
        barcode: 'BAR1',
        name: 'Product 1 in Scope 1',
        retailPrice: 100,
        isActive: true,
        isTracked: false,
        variants: [],
        stockBalances: [],
        updatedAt: new Date().toISOString(),
      });

      const inDb1 = await db1.products.get('prod_1');
      const inDb2 = await db2.products.get('prod_1');

      expect(inDb1).toBeDefined();
      expect(inDb1?.name).toBe('Product 1 in Scope 1');
      expect(inDb2).toBeUndefined();

      await wipePosDatabase('biz_1', 'branch_1', 'user_1');
      await wipePosDatabase('biz_2', 'branch_2', 'user_2');
    });

    it('exports pending queue safely to JSON before wiping', async () => {
      const db = getPosDatabase(bizA, branchA, userA);
      await db.outboxQueue.add({
        client_sync_id: 'uuid-1234',
        entity_type: 'SALE',
        payload: { invoiceNo: 'INV-OFF-001' },
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString(),
        client_created_at: new Date().toISOString(),
      });

      const { count, json } = await exportPendingQueueAsJson(bizA, branchA, userA);
      expect(count).toBe(1);
      const parsed = JSON.parse(json);
      expect(parsed.businessId).toBe(bizA);
      expect(parsed.items[0].client_sync_id).toBe('uuid-1234');

      await wipePosDatabase(bizA, branchA, userA);
      const dbAfterWipe = getPosDatabase(bizA, branchA, userA);
      const remainingItems = await dbAfterWipe.outboxQueue.toArray();
      expect(remainingItems.length).toBe(0);
    });
  });

  describe('2. Invoice Number Reservation & Atomic Consumption', () => {
    it('consumes reserved invoice numbers atomically in order', async () => {
      const db = getPosDatabase(bizA, branchA, userA);
      await db.reservedInvoices.bulkAdd([
        { number: 'INV-OFF-000101', prefix: 'INV-OFF-', sequenceNumber: 101, isUsed: false },
        { number: 'INV-OFF-000102', prefix: 'INV-OFF-', sequenceNumber: 102, isUsed: false },
      ]);

      const firstConsumed = await syncEngine.consumeNextInvoiceNumber(bizA, branchA, userA, 'sale-1');
      expect(firstConsumed).toBe('INV-OFF-000101');

      const secondConsumed = await syncEngine.consumeNextInvoiceNumber(bizA, branchA, userA, 'sale-2');
      expect(secondConsumed).toBe('INV-OFF-000102');

      const available = await db.reservedInvoices.where('isUsed').equals(0 as any).count();
      expect(available).toBe(0);
    });

    it('blocks offline sale when reserved invoice range is exhausted', async () => {
      const db = getPosDatabase(bizA, branchA, userA);
      // Empty reserved invoices
      await expect(
        syncEngine.consumeNextInvoiceNumber(bizA, branchA, userA, 'sale-err'),
      ).rejects.toThrow(/Reserved invoice numbers are exhausted/);
    });
  });

  describe('3. Offline Selling Restrictions & Validation', () => {
    it('blocks cross-branch sales in offline mode', async () => {
      await expect(
        createOfflineSale({
          businessId: bizA,
          branchId: branchA,
          userId: userA,
          saleType: 'RETAIL',
          items: [
            {
              variantId: 'v1',
              basePrice: 500,
              quantity: 1,
              sourceBranchId: 'other-branch-999', // Cross branch
            },
          ],
          payments: [{ method: 'CASH', amount: 500 }],
        }),
      ).rejects.toThrow(/Cross-branch auto-transfer sales are not allowed offline/);
    });

    it('blocks offline credit sale if customer is not in local cache', async () => {
      const db = getPosDatabase(bizA, branchA, userA);
      await db.reservedInvoices.add({
        number: 'INV-OFF-000201',
        prefix: 'INV-OFF-',
        sequenceNumber: 201,
        isUsed: false,
      });

      await expect(
        createOfflineSale({
          businessId: bizA,
          branchId: branchA,
          userId: userA,
          saleType: 'RETAIL',
          customer: null, // No customer
          items: [{ variantId: 'v1', basePrice: 500, quantity: 1 }],
          payments: [{ method: 'CASH', amount: 200 }], // 300 due without customer
        }),
      ).rejects.toThrow(/Credit sales .* require selecting an existing customer/);
    });

    it('successfully creates offline sale with provisional receipt and outbox queue entry', async () => {
      const db = getPosDatabase(bizA, branchA, userA);
      await db.reservedInvoices.add({
        number: 'INV-OFF-000301',
        prefix: 'INV-OFF-',
        sequenceNumber: 301,
        isUsed: false,
      });

      // Seed product with stock balance
      await db.products.put({
        id: 'p1',
        sku: 'SHIRT-M',
        barcode: '890123',
        name: 'Cotton Shirt',
        retailPrice: 1000,
        isActive: true,
        isTracked: true,
        variants: [
          {
            id: 'v1',
            stock_balances: [{ branch_id: branchA, quantity: 10 }],
          },
        ],
        stockBalances: [{ branch_id: branchA, quantity: 10 }],
        updatedAt: new Date().toISOString(),
      });

      const result = await createOfflineSale({
        businessId: bizA,
        branchId: branchA,
        userId: userA,
        saleType: 'RETAIL',
        items: [{ variantId: 'v1', basePrice: 1000, quantity: 2, name: 'Cotton Shirt' }],
        payments: [{ method: 'CASH', amount: 2000 }],
      });

      expect(result.invoiceNo).toBe('INV-OFF-000301');
      expect(result.isProvisional).toBe(true);
      expect(result.provisionalTotals.totalAmount).toBe(2000);
      expect(result.receiptData.isOffline).toBe(true);

      // Verify receipt contains provisional warning
      const receiptHtml = generateReceiptHtml(result.receiptData as any, {
        paperWidth: '80mm',
        receiptFormat: 'THERMAL_80MM',
      } as any);
      expect(receiptHtml).toContain('OFFLINE / PROVISIONAL INVOICE');

      // Verify outbox queue entry
      const outboxItems = await db.outboxQueue.toArray();
      expect(outboxItems.length).toBe(1);
      expect(outboxItems[0].client_sync_id).toBe(result.clientSyncId);
      expect(outboxItems[0].status).toBe('PENDING');

      // Verify stock snapshot decrement
      const updatedProd = await db.products.get('p1');
      const branchStock = updatedProd?.variants[0].stock_balances.find((b: any) => b.branch_id === branchA);
      expect(branchStock?.quantity).toBe(8); // 10 - 2 = 8
    });
  });

  describe('4. Outbox Sync Engine & Reconciliation', () => {
    it('pushes outbox items, deletes PROCESSED ones, and flags provisional discrepancy', async () => {
      const db = getPosDatabase(bizA, branchA, userA);

      // Prepare an offline sale and outbox item
      const clientSyncId = 'uuid-sync-test-456';
      await db.offlineSales.put({
        id: 'sale-local-1',
        invoiceNo: 'INV-OFF-000401',
        clientSyncId,
        date: new Date().toISOString(),
        totalAmount: 1000,
        totalPaid: 1000,
        dueAmount: 0,
        status: 'PROVISIONAL',
        isProvisional: true,
        receiptData: {},
      });

      await db.outboxQueue.add({
        client_sync_id: clientSyncId,
        entity_type: 'SALE',
        payload: { invoiceNo: 'INV-OFF-000401', totalAmount: 1000 },
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString(),
        client_created_at: new Date().toISOString(),
      });

      // Mock backend push response with server recalculation showing price difference (1050 vs 1000)
      vi.spyOn(api.sync, 'push').mockResolvedValueOnce({
        processed: 1,
        conflicts: 0,
        failed: 0,
        results: [
          {
            client_sync_id: clientSyncId,
            status: 'PROCESSED',
            result: {
              sale: {
                id: 'server-sale-999',
                total_amount: 1050,
              },
            },
          },
        ],
      } as any);

      const outcome = await syncEngine.pushOutbox(bizA, branchA, userA);
      expect(outcome.processed).toBe(1);

      // Item should be removed from outboxQueue
      const remainingQueue = await db.outboxQueue.toArray();
      expect(remainingQueue.length).toBe(0);

      // Offline sale should now be SYNCED and record the provisional difference (+50)
      const reconciledSale = await db.offlineSales.get('sale-local-1');
      expect(reconciledSale?.status).toBe('SYNCED');
      expect(reconciledSale?.isProvisional).toBe(false);
      expect(reconciledSale?.serverSaleId).toBe('server-sale-999');
      expect(reconciledSale?.provisionalDifference).toBe(50);
    });

    it('keeps CONFLICT items in outbox and marks them for manager review', async () => {
      const db = getPosDatabase(bizA, branchA, userA);
      const conflictSyncId = 'uuid-conflict-789';

      await db.outboxQueue.add({
        client_sync_id: conflictSyncId,
        entity_type: 'SALE',
        payload: { invoiceNo: 'INV-OFF-000501' },
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString(),
        client_created_at: new Date().toISOString(),
      });

      vi.spyOn(api.sync, 'push').mockResolvedValueOnce({
        processed: 0,
        conflicts: 1,
        failed: 0,
        results: [
          {
            client_sync_id: conflictSyncId,
            status: 'CONFLICT',
            error_message: 'Cash register session was already closed by manager',
          },
        ],
      } as any);

      const outcome = await syncEngine.pushOutbox(bizA, branchA, userA);
      expect(outcome.conflicts).toBe(1);

      const queueItem = await db.outboxQueue.where('client_sync_id').equals(conflictSyncId).first();
      expect(queueItem?.status).toBe('CONFLICT');
      expect(queueItem?.error).toContain('Cash register session was already closed');
    });

    it('updates customer ID mapping when server returns mapped customer ID', async () => {
      const db = getPosDatabase(bizA, branchA, userA);
      const custClientRef = 'cust-offline-ref-111';

      await db.customers.put({
        id: custClientRef,
        name: 'Rahim Uddin',
        phone: '01711000000',
        currentDue: 0,
        creditLimit: 5000,
        isClientCreated: true,
      });

      await db.outboxQueue.add({
        client_sync_id: 'uuid-cust-sync',
        entity_type: 'CUSTOMER',
        payload: { name: 'Rahim Uddin', phone: '01711000000', client_customer_ref: custClientRef },
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString(),
        client_created_at: new Date().toISOString(),
      });

      vi.spyOn(api.sync, 'push').mockResolvedValueOnce({
        processed: 1,
        conflicts: 0,
        failed: 0,
        results: [
          {
            client_sync_id: 'uuid-cust-sync',
            status: 'PROCESSED',
            result: {
              client_customer_ref: custClientRef,
              server_customer_id: 'server-cust-id-888',
            },
          },
        ],
      } as any);

      await syncEngine.pushOutbox(bizA, branchA, userA);

      // Check ID mapping table
      const mapping = await db.idMappings.get(custClientRef);
      expect(mapping?.server_id).toBe('server-cust-id-888');
    });
  });

  describe('5. SMS Segment Calculation & CSV Injection Prevention', () => {
    it('correctly calculates GSM 7-bit English segments (160 / 153)', () => {
      const text160 = 'A'.repeat(160);
      const res1 = calculateSmsSegments(text160);
      expect(res1.isUnicode).toBe(false);
      expect(res1.segmentCount).toBe(1);
      expect(res1.remainingInSegment).toBe(0);

      const text161 = 'A'.repeat(161);
      const res2 = calculateSmsSegments(text161);
      expect(res2.isUnicode).toBe(false);
      expect(res2.segmentCount).toBe(2);
      expect(res2.remainingInSegment).toBe(153 - 8); // 161 total: 153 in first, 8 in second, remaining 145
    });

    it('correctly calculates Bangla / Unicode UTF-16 segments (70 / 67)', () => {
      const bangla70 = 'বাংলা বার্তা '.repeat(5).slice(0, 70);
      const res1 = calculateSmsSegments(bangla70);
      expect(res1.isUnicode).toBe(true);
      expect(res1.segmentCount).toBe(1);

      const bangla71 = 'বাংলা বার্তা '.repeat(6).slice(0, 71);
      const res2 = calculateSmsSegments(bangla71);
      expect(res2.isUnicode).toBe(true);
      expect(res2.segmentCount).toBe(2);
    });

    it('sanitizes formula-injection characters in CSV cells', () => {
      expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
      expect(sanitizeCsvCell('+8801711')).toBe("'+8801711");
      expect(sanitizeCsvCell('-500')).toBe("'-500");
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      expect(sanitizeCsvCell('Normal Text 123')).toBe('Normal Text 123');
    });
  });
});
