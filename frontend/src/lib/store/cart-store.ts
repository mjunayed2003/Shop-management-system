import { create } from 'zustand';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';

export interface CartItem {
  id: string; // unique line ID
  variantId: string;
  sku: string;
  name: string;
  sizeName?: string | null;
  colorName?: string | null;
  categoryName?: string | null;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  discountAmount: number;
  taxAmount?: number;
  totalAmount?: number;
  isCustomPrice?: boolean;
  overrideReason?: string;
  sourceBranchId?: string;
  sourceBranchName?: string;
  productUnitBarcode?: string;
  trackIndividually?: boolean;
  stockAvailable?: number;
  lineError?: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  currentDue: number;
  creditLimit: number;
  loyaltyPoints: number;
}

export interface ServerTotals {
  subtotal: number;
  lineDiscountTotal: number;
  couponDiscount: number;
  totalDiscount: number;
  taxAmount: number;
  rawTotal: number;
  roundOff: number;
  totalAmount: number;
  couponCode?: string;
  couponId?: string;
}

export interface LocalTotalsPreview {
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
}

interface CartState {
  branchId: string | null;
  userId: string | null;
  items: CartItem[];
  customer: CustomerSummary | null;
  saleType: 'RETAIL' | 'WHOLESALE';
  couponCode: string;
  idempotencyKey: string;
  serverTotals: ServerTotals | null;
  isCalculating: boolean;
  calculateError: string | null;
  selectedLineId: string | null;

  // Actions
  initCartForContext: (branchId: string, userId: string) => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  updateItemPrice: (id: string, unitPrice: number, reason?: string) => void;
  updateItemDiscount: (id: string, discountAmount: number) => void;
  removeItem: (id: string) => void;
  setSelectedLineId: (id: string | null) => void;
  setCustomer: (customer: CustomerSummary | null) => void;
  setSaleType: (type: 'RETAIL' | 'WHOLESALE') => void;
  setCouponCode: (code: string) => void;
  clearCart: () => void;
  resetAfterSaleSuccess: () => void;
  calculateTotals: () => Promise<void>;
  getLocalPreview: () => LocalTotalsPreview;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getStorageKey(branchId: string | null, userId: string | null): string {
  return `pos_cart_${branchId || 'default'}_${userId || 'anon'}`;
}

let calculateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let latestCalculateRequestId = 0;

export const useCartStore = create<CartState>((set, get) => ({
  branchId: null,
  userId: null,
  items: [],
  customer: null,
  saleType: 'RETAIL',
  couponCode: '',
  idempotencyKey: generateUUID(),
  serverTotals: null,
  isCalculating: false,
  calculateError: null,
  selectedLineId: null,

  initCartForContext: (branchId: string, userId: string) => {
    const current = get();
    // If context hasn't changed and items already loaded, keep
    if (current.branchId === branchId && current.userId === userId) {
      return;
    }

    const key = getStorageKey(branchId, userId);
    let loadedState: Partial<CartState> | null = null;

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          loadedState = JSON.parse(raw);
        }
      } catch {
        // ignore
      }
    }

    if (loadedState && loadedState.items && loadedState.items.length > 0) {
      set({
        branchId,
        userId,
        items: loadedState.items,
        customer: loadedState.customer || null,
        saleType: loadedState.saleType || 'RETAIL',
        couponCode: loadedState.couponCode || '',
        idempotencyKey: loadedState.idempotencyKey || generateUUID(),
        serverTotals: loadedState.serverTotals || null,
        isCalculating: false,
        calculateError: null,
        selectedLineId: loadedState.items[0]?.id || null,
      });
      // Trigger fresh recalculation with server
      get().calculateTotals();
    } else {
      set({
        branchId,
        userId,
        items: [],
        customer: null,
        saleType: 'RETAIL',
        couponCode: '',
        idempotencyKey: generateUUID(),
        serverTotals: null,
        isCalculating: false,
        calculateError: null,
        selectedLineId: null,
      });
    }
  },

  addItem: (newItem) => {
    const { items, branchId, userId } = get();

    // Check if tracked unit already in cart
    if (newItem.productUnitBarcode) {
      const existingUnit = items.find(
        (i) => i.productUnitBarcode === newItem.productUnitBarcode,
      );
      if (existingUnit) {
        throw new Error('UNIT_ALREADY_ADDED');
      }
    }

    // Check if non-tracked variant already in cart (matching same sourceBranchId & price)
    const existingIndex = items.findIndex(
      (i) =>
        !i.productUnitBarcode &&
        !newItem.productUnitBarcode &&
        i.variantId === newItem.variantId &&
        i.sourceBranchId === newItem.sourceBranchId &&
        i.unitPrice === newItem.unitPrice &&
        i.discountAmount === newItem.discountAmount,
    );

    let updatedItems: CartItem[];
    let targetLineId: string;

    if (existingIndex >= 0) {
      // Increment quantity
      const existing = items[existingIndex];
      const newQty = new Decimal(existing.quantity).plus(newItem.quantity).toNumber();
      updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...existing,
        quantity: newQty,
      };
      targetLineId = existing.id;
    } else {
      const lineId = newItem.productUnitBarcode
        ? `unit-${newItem.productUnitBarcode}`
        : `${newItem.variantId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const cartItem: CartItem = {
        ...newItem,
        id: lineId,
      };
      updatedItems = [cartItem, ...items];
      targetLineId = lineId;
    }

    set({
      items: updatedItems,
      selectedLineId: targetLineId,
    });

    persistState(branchId, userId, get());
    get().calculateTotals();
  },

  updateItemQuantity: (id, quantity) => {
    const { items, branchId, userId } = get();
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }

    const updatedItems = items.map((item) => {
      if (item.id === id) {
        // Tracked unit products are strictly 1 unit per line
        if (item.productUnitBarcode && quantity > 1) {
          return item;
        }
        return { ...item, quantity };
      }
      return item;
    });

    set({ items: updatedItems });
    persistState(branchId, userId, get());
    get().calculateTotals();
  },

  updateItemPrice: (id, unitPrice, reason) => {
    const { items, branchId, userId } = get();
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          unitPrice,
          isCustomPrice: unitPrice !== item.basePrice,
          overrideReason: reason || item.overrideReason,
        };
      }
      return item;
    });

    set({ items: updatedItems });
    persistState(branchId, userId, get());
    get().calculateTotals();
  },

  updateItemDiscount: (id, discountAmount) => {
    const { items, branchId, userId } = get();
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, discountAmount };
      }
      return item;
    });

    set({ items: updatedItems });
    persistState(branchId, userId, get());
    get().calculateTotals();
  },

  removeItem: (id) => {
    const { items, selectedLineId, branchId, userId } = get();
    const updatedItems = items.filter((item) => item.id !== id);
    const newSelected =
      selectedLineId === id ? (updatedItems[0]?.id ?? null) : selectedLineId;

    set({
      items: updatedItems,
      selectedLineId: newSelected,
    });

    persistState(branchId, userId, get());
    if (updatedItems.length === 0) {
      set({ serverTotals: null, calculateError: null });
    } else {
      get().calculateTotals();
    }
  },

  setSelectedLineId: (id) => {
    set({ selectedLineId: id });
  },

  setCustomer: (customer) => {
    const { branchId, userId } = get();
    set({ customer });
    persistState(branchId, userId, get());
    get().calculateTotals();
  },

  setSaleType: (saleType) => {
    const { branchId, userId } = get();
    set({ saleType });
    persistState(branchId, userId, get());
    get().calculateTotals();
  },

  setCouponCode: (couponCode) => {
    const { branchId, userId } = get();
    set({ couponCode });
    persistState(branchId, userId, get());
    get().calculateTotals();
  },

  clearCart: () => {
    const { branchId, userId } = get();
    set({
      items: [],
      customer: null,
      couponCode: '',
      serverTotals: null,
      calculateError: null,
      selectedLineId: null,
      idempotencyKey: generateUUID(), // New key upon explicit clear
    });
    persistState(branchId, userId, get());
  },

  resetAfterSaleSuccess: () => {
    const { branchId, userId } = get();
    set({
      items: [],
      customer: null,
      couponCode: '',
      serverTotals: null,
      calculateError: null,
      selectedLineId: null,
      idempotencyKey: generateUUID(), // New key for next sale
    });
    persistState(branchId, userId, get());
  },

  calculateTotals: async () => {
    const { items, saleType, customer, couponCode } = get();

    if (items.length === 0) {
      set({ serverTotals: null, calculateError: null, isCalculating: false });
      return;
    }

    set({ isCalculating: true, calculateError: null });

    if (calculateDebounceTimer) {
      clearTimeout(calculateDebounceTimer);
    }

    const currentRequestId = ++latestCalculateRequestId;

    calculateDebounceTimer = setTimeout(async () => {
      try {
        const payload = {
          items: items.map((i) => ({
            variantId: i.variantId,
            barcode: i.barcode,
            quantity: i.quantity,
            unitPrice: i.isCustomPrice ? i.unitPrice : undefined,
            discountAmount: i.discountAmount > 0 ? i.discountAmount : undefined,
            sourceBranchId: i.sourceBranchId,
            productUnitBarcode: i.productUnitBarcode,
          })),
          saleType,
          customerId: customer?.id,
          couponCode: couponCode.trim() || undefined,
        };

        const response = await api.sales.calculate(payload);

        // Ensure this response matches latest calculation intent
        if (currentRequestId !== latestCalculateRequestId) {
          return;
        }

        // Map calculated items back to cart lines (e.g. server tax, line total, etc.)
        const calcItems = response.items || [];
        const updatedCartItems = get().items.map((cartItem, idx) => {
          const calcMatch =
            calcItems.find(
              (c: any) =>
                c.variantId === cartItem.variantId &&
                c.productUnitBarcode === cartItem.productUnitBarcode,
            ) || calcItems[idx];

          if (calcMatch) {
            return {
              ...cartItem,
              unitPrice: Number(calcMatch.unitPrice ?? cartItem.unitPrice),
              basePrice: Number(calcMatch.basePrice ?? cartItem.basePrice),
              discountAmount: Number(calcMatch.discountAmount ?? cartItem.discountAmount),
              taxAmount: Number(calcMatch.taxAmount ?? 0),
              totalAmount: Number(calcMatch.totalAmount ?? 0),
              lineError: undefined,
            };
          }
          return cartItem;
        });

        const serverTotals: ServerTotals = {
          subtotal: Number(response.subtotal),
          lineDiscountTotal: Number(response.lineDiscountTotal),
          couponDiscount: Number(response.couponDiscount || 0),
          totalDiscount: Number(response.totalDiscount),
          taxAmount: Number(response.taxAmount || 0),
          rawTotal: Number(response.rawTotal),
          roundOff: Number(response.roundOff || 0),
          totalAmount: Number(response.totalAmount),
          couponCode: response.couponCode,
          couponId: response.couponId,
        };

        set({
          items: updatedCartItems,
          serverTotals,
          isCalculating: false,
          calculateError: null,
        });

        persistState(get().branchId, get().userId, get());
      } catch (err: any) {
        if (currentRequestId !== latestCalculateRequestId) return;

        const errorMsg =
          err?.response?.data?.message || err?.message || 'Calculation error';

        set({
          isCalculating: false,
          calculateError: errorMsg,
        });
      }
    }, 250);
  },

  getLocalPreview: () => {
    const { items, couponCode } = get();
    let subtotal = new Decimal(0);
    let discountTotal = new Decimal(0);

    for (const item of items) {
      const lineSubtotal = new Decimal(item.unitPrice).times(item.quantity);
      subtotal = subtotal.plus(lineSubtotal);
      discountTotal = discountTotal.plus(item.discountAmount || 0);
    }

    const net = subtotal.minus(discountTotal);
    const totalAmount = net.greaterThan(0) ? net.toNumber() : 0;

    return {
      subtotal: subtotal.toNumber(),
      discountTotal: discountTotal.toNumber(),
      totalAmount,
    };
  },
}));

function persistState(
  branchId: string | null,
  userId: string | null,
  state: CartState,
) {
  if (typeof window === 'undefined') return;
  const key = getStorageKey(branchId, userId);
  try {
    const payload = {
      items: state.items,
      customer: state.customer,
      saleType: state.saleType,
      couponCode: state.couponCode,
      idempotencyKey: state.idempotencyKey,
      serverTotals: state.serverTotals,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}
