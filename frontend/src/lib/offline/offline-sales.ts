import { getPosDatabase, LocalOfflineSale } from './db';
import { localPricingEngine } from './local-pricing';
import { syncEngine } from './sync-engine';
import { useOfflineStore } from '../store/offline-store';

export interface CreateOfflineSaleParams {
  businessId: string;
  branchId: string;
  userId: string;
  registerSessionId?: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
    currentDue?: number;
    creditLimit?: number;
  } | null;
  saleType: 'RETAIL' | 'WHOLESALE';
  items: Array<{
    variantId: string;
    sku?: string;
    name?: string;
    barcode?: string;
    quantity: number;
    unitPrice?: number;
    basePrice: number;
    discountAmount?: number;
    sourceBranchId?: string;
    productUnitBarcode?: string;
  }>;
  payments: Array<{
    method: 'CASH' | 'BKASH' | 'NAGAD' | 'CARDS' | 'BANK' | 'CHEQUE';
    amount: number;
    transactionNo?: string;
  }>;
  couponCode?: string;
  notes?: string;
}

export interface OfflineSaleResult {
  id: string;
  invoiceNo: string;
  clientSyncId: string;
  provisionalTotals: {
    subtotal: number;
    discountTotal: number;
    taxAmount: number;
    roundOff: number;
    totalAmount: number;
  };
  totalPaid: number;
  dueAmount: number;
  isProvisional: true;
  customer?: any;
  items: any[];
  payments: any[];
  date: string;
  receiptData: any;
}

/**
 * Creates an offline sale, consumes next reserved invoice number,
 * computes provisional totals via LocalPricingEngine, stores in outboxQueue,
 * and updates local stock snapshot in a single atomic Dexie transaction.
 */
export async function createOfflineSale(params: CreateOfflineSaleParams): Promise<OfflineSaleResult> {
  const { businessId, branchId, userId, customer, saleType, items, payments, couponCode, notes, registerSessionId } = params;

  // 1. Guard against disallowed offline operations
  const hasCrossBranch = items.some((item) => item.sourceBranchId && item.sourceBranchId !== branchId);
  if (hasCrossBranch) {
    throw new Error('Cross-branch auto-transfer sales are not allowed offline. Reconnect to process cross-branch inventory.');
  }

  // 2. Compute Provisional Pricing
  const db = getPosDatabase(businessId, branchId, userId);
  let cachedCoupon: any = null;
  if (couponCode) {
    cachedCoupon = await db.coupons.where('code').equals(couponCode).first();
  }

  const calculated = localPricingEngine.calculateCart({
    items,
    saleType,
    coupon: cachedCoupon,
  });

  // Calculate total paid & due
  let totalPaid = 0;
  for (const p of payments) {
    totalPaid += Number(p.amount || 0);
  }
  const dueAmount = Math.max(0, calculated.totalAmount - totalPaid);

  // Credit sale rule: allowed only for customers found in cache
  if (dueAmount > 0 && !customer) {
    throw new Error('Credit sales (unpaid balance) offline require selecting an existing customer from the customer directory.');
  }

  const saleId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clientSyncId = crypto.randomUUID();
  const clientCreatedAt = new Date().toISOString();

  // 3. Atomically consume invoice number and save to Dexie
  const invoiceNo = await syncEngine.consumeNextInvoiceNumber(businessId, branchId, userId, saleId);

  const payload = {
    invoiceNo,
    customerId: customer?.id,
    saleType,
    registerSessionId,
    notes,
    couponCode: calculated.couponCode,
    items: calculated.items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
      unitPrice: i.isCustomPrice ? i.unitPrice : undefined,
      discountAmount: i.discountAmount > 0 ? i.discountAmount : undefined,
      productUnitBarcode: i.productUnitBarcode,
    })),
    payments: payments.map((p, idx) => ({
      paymentMethod: p.method,
      amount: p.amount,
      transactionNo: p.transactionNo,
      idempotencyKey: `${clientSyncId}:pay:${idx}`,
    })),
  };

  const offlineSaleRecord: LocalOfflineSale = {
    id: saleId,
    invoiceNo,
    clientSyncId,
    date: clientCreatedAt,
    customerId: customer?.id || null,
    customerName: customer?.name || 'Walk-in Customer',
    customerPhone: customer?.phone || '',
    totalAmount: calculated.totalAmount,
    totalPaid,
    dueAmount,
    status: 'PROVISIONAL',
    isProvisional: true,
    receiptData: {
      id: saleId,
      invoiceNo,
      date: clientCreatedAt,
      createdAt: clientCreatedAt,
      customerName: customer?.name || 'Walk-in Customer',
      customerPhone: customer?.phone || '',
      items: calculated.items,
      subtotal: calculated.subtotal,
      discountAmount: calculated.totalDiscount,
      taxAmount: calculated.taxAmount,
      roundOff: calculated.roundOff,
      totalAmount: calculated.totalAmount,
      totalPaid,
      dueAmount,
      payments,
      isOffline: true,
    },
  };

  // Run in single Dexie transaction: sale record + outbox item + local stock decrement
  await db.transaction('rw', [db.offlineSales, db.outboxQueue, db.products], async () => {
    // 1. Save offline sale
    await db.offlineSales.add(offlineSaleRecord);

    // 2. Add to outboxQueue
    await db.outboxQueue.add({
      client_sync_id: clientSyncId,
      entity_type: 'SALE',
      payload,
      status: 'PENDING',
      retry_count: 0,
      created_at: clientCreatedAt,
      client_created_at: clientCreatedAt,
    });

    // 3. Decrement local stock snapshot for variants sold
    for (const item of calculated.items) {
      let prod = await db.products.get(item.variantId);
      if (!prod) {
        prod = await db.products.filter((p) => Array.isArray(p.variants) && p.variants.some((v: any) => v.id === item.variantId)).first();
      }
      if (prod && Array.isArray(prod.variants)) {
        const variantIndex = prod.variants.findIndex((v: any) => v.id === item.variantId);
        if (variantIndex >= 0) {
          const v = prod.variants[variantIndex];
          if (v.stock_balances && Array.isArray(v.stock_balances)) {
            const sb = v.stock_balances.find((b: any) => b.branch_id === branchId);
            if (sb) {
              sb.quantity = Math.max(-999, Number(sb.quantity || 0) - item.quantity);
              await db.products.put(prod);
            }
          }
        }
      }
    }
  });

  const receiptData = {
    id: saleId,
    invoiceNo,
    clientSyncId,
    date: clientCreatedAt,
    saleDate: clientCreatedAt,
    branch: { id: branchId, name: 'Store Outlet', code: 'POS' },
    customerName: customer?.name || 'Walk-in Customer',
    customerPhone: customer?.phone || '',
    subtotal: calculated.subtotal,
    discountTotal: calculated.totalDiscount,
    taxAmount: calculated.taxAmount,
    roundOff: calculated.roundOff,
    totalAmount: calculated.totalAmount,
    paidAmount: totalPaid,
    dueAmount,
    items: calculated.items.map((i: any) => ({
      name: i.name || 'Item',
      sku: i.sku || '',
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      discountAmount: i.discountAmount || 0,
    })),
    payments: payments.map((p) => ({
      method: p.method,
      amount: p.amount,
    })),
    isOffline: true,
    isProvisional: true,
  };

  return {
    id: saleId,
    invoiceNo,
    clientSyncId,
    provisionalTotals: {
      subtotal: calculated.subtotal,
      discountTotal: calculated.totalDiscount,
      taxAmount: calculated.taxAmount,
      roundOff: calculated.roundOff,
      totalAmount: calculated.totalAmount,
    },
    totalPaid,
    dueAmount,
    isProvisional: true,
    customer,
    items: calculated.items,
    payments,
    date: clientCreatedAt,
    receiptData,
  };
}

/**
 * Creates an offline quick customer, stores locally, and queues in outboxQueue.
 */
export async function createOfflineCustomer(params: {
  businessId: string;
  branchId: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit?: number;
}): Promise<{ id: string; clientRef: string; name: string; phone: string }> {
  const { businessId, branchId, userId, name, phone, email, address, creditLimit = 0 } = params;
  const db = getPosDatabase(businessId, branchId, userId);

  const clientRef = `cust_off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const clientSyncId = crypto.randomUUID();
  const clientCreatedAt = new Date().toISOString();

  await db.transaction('rw', [db.customers, db.outboxQueue], async () => {
    await db.customers.add({
      id: clientRef,
      name,
      phone,
      email: email || null,
      currentDue: 0,
      creditLimit: Number(creditLimit || 0),
      isClientCreated: true,
      updatedAt: clientCreatedAt,
    });

    await db.outboxQueue.add({
      client_sync_id: clientSyncId,
      entity_type: 'CUSTOMER',
      payload: {
        client_ref: clientRef,
        name,
        phone,
        email,
        address,
        creditLimit,
      },
      status: 'PENDING',
      retry_count: 0,
      created_at: clientCreatedAt,
      client_created_at: clientCreatedAt,
    });
  });

  await useOfflineStore.getState().refreshQueueCounts(businessId, branchId, userId);
  return { id: clientRef, clientRef, name, phone };
}
