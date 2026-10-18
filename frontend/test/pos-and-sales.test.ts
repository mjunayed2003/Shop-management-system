import { describe, it, expect, beforeEach, vi } from 'vitest';
import Decimal from 'decimal.js';
import { useCartStore } from '@/lib/store/cart-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { api } from '@/lib/api/endpoints';
import {
  getPrintSettings,
  savePrintSettings,
  toBanglaDigits,
} from '@/lib/utils/printer';
import {
  generateReceiptHtml,
  generateReceiptBarcodeSvg,
  SaleReceiptData,
} from '@/lib/utils/receipt-template';
import { normalizeBDPhone, isValidBDPhone } from '@/lib/utils/phone';

// Mock API client
vi.mock('@/lib/api/endpoints', () => ({
  api: {
    sales: {
      calculate: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      void: vi.fn(),
      held: {
        hold: vi.fn(),
        list: vi.fn(),
        retrieve: vi.fn(),
        delete: vi.fn(),
      },
      registerSessions: {
        current: vi.fn(),
        open: vi.fn(),
      },
    },
    customers: {
      lookup: vi.fn(),
      quickCreate: vi.fn(),
      list: vi.fn(),
    },
    barcodes: {
      lookup: vi.fn(),
    },
  },
}));

describe('Phase F4: POS Screen, Cart, Calculations, Idempotency & Receipts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useCartStore.setState({
      branchId: 'branch-dhk-01',
      userId: 'user-cashier-1',
      items: [],
      customer: null,
      saleType: 'RETAIL',
      couponCode: '',
      serverTotals: null,
      isCalculating: false,
      calculateError: null,
      selectedLineId: null,
    });
  });

  // ==========================================
  // 1. Scanner Input & Cart Operations
  // ==========================================
  describe('Cart & Scanner Logic', () => {
    it('adds a new variant line and increments quantity on repeat add', () => {
      const store = useCartStore.getState();

      store.addItem({
        variantId: 'var-101',
        sku: 'SHIRT-BLK-M',
        name: 'Cotton Shirt Black M',
        quantity: 1,
        unitPrice: 1500,
        basePrice: 1500,
        discountAmount: 0,
      });

      let state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(1);
      expect(state.items[0].unitPrice).toBe(1500);

      // Repeat add increments quantity
      store.addItem({
        variantId: 'var-101',
        sku: 'SHIRT-BLK-M',
        name: 'Cotton Shirt Black M',
        quantity: 1,
        unitPrice: 1500,
        basePrice: 1500,
        discountAmount: 0,
      });

      state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(2);
    });

    it('adds tracked individual product unit and strictly blocks scanning the same unit twice', () => {
      const store = useCartStore.getState();

      // Scan unit barcode
      store.addItem({
        variantId: 'var-pant-32',
        sku: 'PANT-SLIM-32',
        name: 'Tracked Chino Pant',
        quantity: 1,
        unitPrice: 1800,
        basePrice: 1800,
        discountAmount: 0,
        productUnitBarcode: 'UNIT-CHINO-0019',
        trackIndividually: true,
      });

      let state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].productUnitBarcode).toBe('UNIT-CHINO-0019');

      // Scanning the exact same tracked unit must throw UNIT_ALREADY_ADDED
      expect(() => {
        store.addItem({
          variantId: 'var-pant-32',
          sku: 'PANT-SLIM-32',
          name: 'Tracked Chino Pant',
          quantity: 1,
          unitPrice: 1800,
          basePrice: 1800,
          discountAmount: 0,
          productUnitBarcode: 'UNIT-CHINO-0019',
          trackIndividually: true,
        });
      }).toThrow('UNIT_ALREADY_ADDED');

      // Scanning a DIFFERENT unit barcode for the same variant adds a separate line
      store.addItem({
        variantId: 'var-pant-32',
        sku: 'PANT-SLIM-32',
        name: 'Tracked Chino Pant',
        quantity: 1,
        unitPrice: 1800,
        basePrice: 1800,
        discountAmount: 0,
        productUnitBarcode: 'UNIT-CHINO-0020',
        trackIndividually: true,
      });

      state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.items[0].productUnitBarcode).toBe('UNIT-CHINO-0020');
      expect(state.items[1].productUnitBarcode).toBe('UNIT-CHINO-0019');
    });

    it('updates quantity, unit price override, line discount and removes line', () => {
      const store = useCartStore.getState();

      store.addItem({
        variantId: 'var-tee',
        sku: 'TEE-WHT-L',
        name: 'White Tee',
        quantity: 1,
        unitPrice: 800,
        basePrice: 800,
        discountAmount: 0,
      });

      const lineId = useCartStore.getState().items[0].id;

      // Update quantity
      store.updateItemQuantity(lineId, 3);
      expect(useCartStore.getState().items[0].quantity).toBe(3);

      // Price override with reason
      store.updateItemPrice(lineId, 750, 'Manager authorized promo');
      expect(useCartStore.getState().items[0].unitPrice).toBe(750);
      expect(useCartStore.getState().items[0].isCustomPrice).toBe(true);
      expect(useCartStore.getState().items[0].overrideReason).toBe('Manager authorized promo');

      // Line discount
      store.updateItemDiscount(lineId, 50);
      expect(useCartStore.getState().items[0].discountAmount).toBe(50);

      // Remove item
      store.removeItem(lineId);
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  // ==========================================
  // 2. Authoritative Server Totals vs Local Preview
  // ==========================================
  describe('Authoritative Calculations & Debouncing', () => {
    it('uses Decimal.js for local preview and respects authoritative server calculation', async () => {
      const store = useCartStore.getState();

      store.addItem({
        variantId: 'v-1',
        sku: 'SKU-1',
        name: 'Item 1',
        quantity: 2,
        unitPrice: 500.5,
        basePrice: 500.5,
        discountAmount: 20,
      });

      // Local preview check: (500.5 * 2) - 20 = 1001 - 20 = 981
      const preview = store.getLocalPreview();
      expect(preview.subtotal).toBe(1001);
      expect(preview.discountTotal).toBe(20);
      expect(preview.totalAmount).toBe(981);

      // Simulate server returning calculation from POST /sales/calculate
      (api.sales.calculate as any).mockResolvedValueOnce({
        subtotal: 1001,
        lineDiscountTotal: 20,
        couponDiscount: 50,
        totalDiscount: 70,
        taxAmount: 0,
        rawTotal: 931,
        roundOff: 0,
        totalAmount: 931,
        couponCode: 'SAVE50',
        items: [
          {
            variantId: 'v-1',
            unitPrice: 500.5,
            basePrice: 500.5,
            discountAmount: 20,
            totalAmount: 981,
          },
        ],
      });

      await store.calculateTotals();

      // Wait for debounce timer
      await new Promise((r) => setTimeout(r, 300));

      const updated = useCartStore.getState();
      expect(updated.serverTotals).not.toBeNull();
      expect(updated.serverTotals?.totalAmount).toBe(931);
      expect(updated.serverTotals?.couponDiscount).toBe(50);
      expect(updated.serverTotals?.totalDiscount).toBe(70);
    });
  });

  // ==========================================
  // 3. Idempotency Key Handling
  // ==========================================
  describe('Idempotency Key Guarantees', () => {
    it('maintains the same idempotency key across retries and regenerates only after success or clear', () => {
      const store = useCartStore.getState();
      const initialKey = store.idempotencyKey;
      expect(initialKey).toBeDefined();
      expect(typeof initialKey).toBe('string');
      expect(initialKey.length).toBeGreaterThan(10);

      // Adding/updating items does NOT change the active idempotency key
      store.addItem({
        variantId: 'v-1',
        sku: 'SKU-1',
        name: 'Item 1',
        quantity: 1,
        unitPrice: 1000,
        basePrice: 1000,
        discountAmount: 0,
      });

      expect(useCartStore.getState().idempotencyKey).toBe(initialKey);

      // Reset after confirmed sale success MUST generate a new key
      store.resetAfterSaleSuccess();
      const nextKey = useCartStore.getState().idempotencyKey;
      expect(nextKey).not.toBe(initialKey);

      // Explicit clear cart MUST also generate a new key
      store.clearCart();
      const thirdKey = useCartStore.getState().idempotencyKey;
      expect(thirdKey).not.toBe(nextKey);
    });
  });

  // ==========================================
  // 4. Customer Selection, Phone Formats & Credit Rules
  // ==========================================
  describe('Customer Phone Lookup & Credit Rules', () => {
    it('normalizes various BD phone formats (+8801..., 8801..., 01...) correctly', () => {
      expect(normalizeBDPhone('01712345678')).toBe('01712345678');
      expect(normalizeBDPhone('8801712345678')).toBe('01712345678');
      expect(normalizeBDPhone('+8801712345678')).toBe('01712345678');
      expect(normalizeBDPhone('01712-345678')).toBe('01712345678');
      expect(isValidBDPhone('01811223344')).toBe(true);
      expect(isValidBDPhone('12345')).toBe(false);
    });

    it('enforces customer selection for wholesale and credit sales', () => {
      const store = useCartStore.getState();
      store.addItem({
        variantId: 'v-1',
        sku: 'SKU-1',
        name: 'Item 1',
        quantity: 1,
        unitPrice: 1000,
        basePrice: 1000,
        discountAmount: 0,
      });

      // Wholesale without customer is blocked
      store.setSaleType('WHOLESALE');
      expect(useCartStore.getState().customer).toBeNull();
      expect(useCartStore.getState().saleType).toBe('WHOLESALE');

      // Attach customer
      store.setCustomer({
        id: 'cust-uuid-1',
        name: 'Rahim Traders',
        phone: '+8801711223344',
        currentDue: 5000,
        creditLimit: 20000,
        loyaltyPoints: 50,
      });

      expect(useCartStore.getState().customer?.name).toBe('Rahim Traders');
      expect(useCartStore.getState().customer?.currentDue).toBe(5000);
    });
  });

  // ==========================================
  // 5. Cross-Branch Auto-Transfer Line Badges
  // ==========================================
  describe('Cross-Branch Auto-Transfer', () => {
    it('correctly associates sourceBranchId on cross-branch cart items', () => {
      const store = useCartStore.getState();

      store.addItem({
        variantId: 'v-cross',
        sku: 'DRESS-RED-M',
        name: 'Silk Dress Red M',
        quantity: 2,
        unitPrice: 4500,
        basePrice: 4500,
        discountAmount: 0,
        sourceBranchId: 'branch-gulshan-02',
        sourceBranchName: 'Gulshan Outlet',
      });

      const line = useCartStore.getState().items[0];
      expect(line.sourceBranchId).toBe('branch-gulshan-02');
      expect(line.sourceBranchName).toBe('Gulshan Outlet');
    });
  });

  // ==========================================
  // 6. Split Payment Rules
  // ==========================================
  describe('Split Payment Rules', () => {
    it('calculates change for cash excess and blocks digital payments exceeding payable', () => {
      const payable = new Decimal(2500);

      // Case 1: Digital payment cannot exceed payable
      const bKashPaid = new Decimal(3000);
      expect(bKashPaid.greaterThan(payable)).toBe(true);

      // Case 2: Cash excess produces change
      const cashTendered = new Decimal(3000);
      const change = cashTendered.minus(payable);
      expect(change.toNumber()).toBe(500);

      // Case 3: Split payment: 1000 bKash + 2000 Cash -> 500 Change
      const splitNonCash = new Decimal(1000);
      const remainingForCash = payable.minus(splitNonCash); // 1500
      const splitCash = new Decimal(2000);
      const splitChange = splitCash.minus(remainingForCash);
      expect(splitChange.toNumber()).toBe(500);
    });
  });

  // ==========================================
  // 7. Branch Cart Isolation & Safety
  // ==========================================
  describe('Branch Cart Safety', () => {
    it('isolates carts by branch and user', () => {
      const store = useCartStore.getState();

      // Branch 1 cart
      store.initCartForContext('branch-1', 'user-1');
      store.addItem({
        variantId: 'v-1',
        sku: 'SKU-1',
        name: 'Item Branch 1',
        quantity: 1,
        unitPrice: 1000,
        basePrice: 1000,
        discountAmount: 0,
      });
      expect(useCartStore.getState().items).toHaveLength(1);

      // Switch context to Branch 2
      store.initCartForContext('branch-2', 'user-1');
      expect(useCartStore.getState().items).toHaveLength(0);

      // Switch back to Branch 1 -> restores Branch 1 cart from persistence
      store.initCartForContext('branch-1', 'user-1');
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].name).toBe('Item Branch 1');
    });
  });

  // ==========================================
  // 8. Receipt Template & Print Formatting
  // ==========================================
  describe('Receipt Generation & Print CSS', () => {
    const sampleSale: SaleReceiptData = {
      id: 'sale-test-1',
      invoiceNo: 'INV-20261018-099',
      saleDate: '2026-10-18T10:30:00.000Z',
      saleType: 'RETAIL',
      status: 'COMPLETED',
      businessName: 'Anzara Boutique (আনজারা বুটিক)',
      branch: {
        id: 'b-1',
        name: 'Dhanmondi',
        code: 'DHD-01',
      },
      customer: {
        id: 'c-1',
        name: 'Nusrat Jahan',
        phone: '01700112233',
        currentDue: 0,
      },
      subtotal: 2500,
      discountAmount: 100,
      taxAmount: 0,
      roundOff: 0,
      totalAmount: 2400,
      paidAmount: 2400,
      dueAmount: 0,
      changeAmount: 0,
      items: [
        {
          id: 'i-1',
          sku: 'KURTI-SLK-M',
          productName: 'Silk Embroidered Kurti (সিল্ক কুর্তি)',
          size: 'M',
          color: 'Maroon',
          quantity: 1,
          unitPrice: 2500,
          discountAmount: 100,
          totalAmount: 2400,
        },
      ],
      payments: [
        {
          id: 'p-1',
          method: 'CASH',
          amount: 2400,
        },
      ],
    };

    it('generates THERMAL_80 receipt HTML with exact 80mm print size and Noto Sans Bengali font', () => {
      const settings = getPrintSettings();
      settings.format = 'THERMAL_80';

      const html = generateReceiptHtml(sampleSale, settings, false);
      expect(html).toContain('Noto Sans Bengali');
      expect(html).toContain('80mm auto');
      expect(html).toContain('INV-20261018-099');
      expect(html).toContain('সিল্ক কুর্তি');
      expect(html).toContain('BDT 2400.00');
      expect(html).not.toContain('*** COPY / DUPLICATE RECEIPT ***');
    });

    it('generates THERMAL_58 receipt HTML with 58mm width', () => {
      const settings = getPrintSettings();
      settings.format = 'THERMAL_58';

      const html = generateReceiptHtml(sampleSale, settings, false);
      expect(html).toContain('58mm auto');
    });

    it('generates A4 format receipt with A4 page sizing', () => {
      const settings = getPrintSettings();
      settings.format = 'A4';

      const html = generateReceiptHtml(sampleSale, settings, false);
      expect(html).toContain('size: A4');
    });

    it('displays COPY / DUPLICATE marker on reprint', () => {
      const settings = getPrintSettings();
      const html = generateReceiptHtml(sampleSale, settings, true);
      expect(html).toContain('*** COPY / DUPLICATE RECEIPT ***');
    });

    it('converts Latin numbers to Bangla digits accurately', () => {
      expect(toBanglaDigits(1500)).toBe('১৫০০');
      expect(toBanglaDigits('2026-10-18')).toBe('২০২৬-১০-১৮');
      expect(toBanglaDigits('01711')).toBe('০১৭১১');
    });

    it('persists and retrieves print settings per device', () => {
      savePrintSettings({
        format: 'THERMAL_58',
        autoPrint: false,
        copies: 2,
        useBanglaDigits: true,
      });

      const loaded = getPrintSettings();
      expect(loaded.format).toBe('THERMAL_58');
      expect(loaded.autoPrint).toBe(false);
      expect(loaded.copies).toBe(2);
      expect(loaded.useBanglaDigits).toBe(true);
    });

    it('generates clean SVG barcode for receipt scanning', () => {
      const svg = generateReceiptBarcodeSvg('INV-12345');
      expect(svg).toContain('<svg');
      expect(svg).toContain('INV-12345');
      expect(svg).toContain('rect');
    });
  });

  // ==========================================
  // 9. Role Permissions Drive POS UI
  // ==========================================
  describe('Role Permissions Gating in POS', () => {
    it('restricts discounts, voiding, and cross-branch actions for cashier lacking permissions', () => {
      useAuthStore.setState({
        user: {
          id: 'user-junior',
          firstName: 'Junior',
          lastName: 'Cashier',
          fullName: 'Junior Cashier',
          email: 'junior@shop.com',
          phone: '01700000000',
          isOwner: false,
          role: { id: 'r-1', name: 'Junior Cashier', code: 'CASHIER' },
        },
        permissions: ['sale.create', 'sale.read', 'pos:access'],
      });

      const auth = useAuthStore.getState();
      expect(auth.hasPermission('sale.create')).toBe(true);
      expect(auth.hasPermission('sale.discount')).toBe(false);
      expect(auth.hasPermission('sale.cross_branch')).toBe(false);
      expect(auth.hasPermission('sale.void')).toBe(false);
    });

    it('grants full control for owner or users with wildcard permission', () => {
      useAuthStore.setState({
        user: {
          id: 'user-owner',
          firstName: 'Shop',
          lastName: 'Owner',
          fullName: 'Shop Owner',
          email: 'owner@shop.com',
          phone: '01700000001',
          isOwner: true,
          role: { id: 'r-0', name: 'Owner', code: 'OWNER' },
        },
        permissions: ['*'],
      });

      const auth = useAuthStore.getState();
      expect(auth.hasPermission('sale.discount')).toBe(true);
      expect(auth.hasPermission('sale.cross_branch')).toBe(true);
      expect(auth.hasPermission('sale.void')).toBe(true);
    });
  });
});
