import Decimal from 'decimal.js';

export interface LocalCartItemInput {
  variantId: string;
  sku?: string;
  name?: string;
  barcode?: string;
  quantity: number;
  unitPrice?: number;
  basePrice: number;
  isCustomPrice?: boolean;
  discountAmount?: number;
  sourceBranchId?: string;
  productUnitBarcode?: string;
}

export interface LocalCalculatedItem {
  variantId: string;
  sku?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  isCustomPrice: boolean;
  sourceBranchId?: string;
  productUnitBarcode?: string;
}

export interface LocalCalculatedCart {
  items: LocalCalculatedItem[];
  subtotal: number;
  lineDiscountTotal: number;
  couponDiscount: number;
  totalDiscount: number;
  taxAmount: number;
  rawTotal: number;
  roundOff: number;
  totalAmount: number;
  couponId?: string;
  couponCode?: string;
  isProvisional: true;
}

export interface PricingEngine {
  calculateCart(params: {
    items: LocalCartItemInput[];
    saleType?: 'RETAIL' | 'WHOLESALE';
    coupon?: {
      id: string;
      code: string;
      discountType: 'FLAT' | 'PERCENTAGE';
      discountValue: number;
      minPurchaseAmount?: number;
      expiresAt?: string;
    } | null;
    taxRatePercent?: number;
  }): LocalCalculatedCart;
}

export class LocalPricingEngine implements PricingEngine {
  calculateCart(params: {
    items: LocalCartItemInput[];
    saleType?: 'RETAIL' | 'WHOLESALE';
    coupon?: {
      id: string;
      code: string;
      discountType: 'FLAT' | 'PERCENTAGE';
      discountValue: number;
      minPurchaseAmount?: number;
      expiresAt?: string;
    } | null;
    taxRatePercent?: number;
  }): LocalCalculatedCart {
    const { items, coupon, taxRatePercent = 0 } = params;

    if (!items || items.length === 0) {
      return {
        items: [],
        subtotal: 0,
        lineDiscountTotal: 0,
        couponDiscount: 0,
        totalDiscount: 0,
        taxAmount: 0,
        rawTotal: 0,
        roundOff: 0,
        totalAmount: 0,
        isProvisional: true,
      };
    }

    let subtotal = new Decimal(0);
    let lineDiscountTotal = new Decimal(0);
    let taxTotal = new Decimal(0);
    const taxRate = new Decimal(taxRatePercent);

    const calculatedItems: LocalCalculatedItem[] = [];

    for (const item of items) {
      const qty = new Decimal(item.quantity > 0 ? item.quantity : 1);
      const basePrice = new Decimal(item.basePrice || 0);
      const unitPrice = item.unitPrice !== undefined && item.unitPrice !== null ? new Decimal(item.unitPrice) : basePrice;
      const isCustomPrice = !unitPrice.equals(basePrice);

      const grossLine = unitPrice.times(qty);
      const lineDiscount = new Decimal(item.discountAmount || 0);

      // Guard: Line discount cannot exceed gross line
      const safeLineDiscount = lineDiscount.greaterThan(grossLine) ? grossLine : lineDiscount;
      const netLineBeforeTax = grossLine.minus(safeLineDiscount);

      const lineTax = taxRate.greaterThan(0)
        ? netLineBeforeTax.times(taxRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : new Decimal(0);

      const lineTotal = netLineBeforeTax.plus(lineTax).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      subtotal = subtotal.plus(grossLine);
      lineDiscountTotal = lineDiscountTotal.plus(safeLineDiscount);
      taxTotal = taxTotal.plus(lineTax);

      calculatedItems.push({
        variantId: item.variantId,
        sku: item.sku,
        name: item.name,
        quantity: qty.toNumber(),
        unitPrice: unitPrice.toNumber(),
        basePrice: basePrice.toNumber(),
        discountAmount: safeLineDiscount.toNumber(),
        taxAmount: lineTax.toNumber(),
        totalAmount: lineTotal.toNumber(),
        isCustomPrice,
        sourceBranchId: item.sourceBranchId,
        productUnitBarcode: item.productUnitBarcode,
      });
    }

    // Process coupon
    let couponDiscount = new Decimal(0);
    let appliedCouponId: string | undefined;
    let appliedCouponCode: string | undefined;

    if (coupon) {
      const eligibleSubtotal = subtotal.minus(lineDiscountTotal);
      const minPurchase = new Decimal(coupon.minPurchaseAmount || 0);

      if (eligibleSubtotal.greaterThanOrEqualTo(minPurchase)) {
        appliedCouponId = coupon.id;
        appliedCouponCode = coupon.code;

        if (coupon.discountType === 'PERCENTAGE') {
          couponDiscount = eligibleSubtotal
            .times(coupon.discountValue)
            .dividedBy(100)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        } else {
          couponDiscount = new Decimal(coupon.discountValue);
        }

        // Coupon cannot exceed eligible subtotal
        if (couponDiscount.greaterThan(eligibleSubtotal)) {
          couponDiscount = eligibleSubtotal;
        }
      }
    }

    const totalDiscount = lineDiscountTotal.plus(couponDiscount);
    const rawTotal = Decimal.max(0, subtotal.minus(totalDiscount).plus(taxTotal)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    // Bangladesh Round-Off (nearest integer Taka)
    const roundedInt = Math.round(rawTotal.toNumber());
    const finalTotal = new Decimal(roundedInt).toDecimalPlaces(2);
    const roundOff = finalTotal.minus(rawTotal).toDecimalPlaces(2);

    return {
      items: calculatedItems,
      subtotal: subtotal.toDecimalPlaces(2).toNumber(),
      lineDiscountTotal: lineDiscountTotal.toDecimalPlaces(2).toNumber(),
      couponDiscount: couponDiscount.toDecimalPlaces(2).toNumber(),
      totalDiscount: totalDiscount.toDecimalPlaces(2).toNumber(),
      taxAmount: taxTotal.toDecimalPlaces(2).toNumber(),
      rawTotal: rawTotal.toNumber(),
      roundOff: roundOff.toNumber(),
      totalAmount: finalTotal.toNumber(),
      couponId: appliedCouponId,
      couponCode: appliedCouponCode,
      isProvisional: true,
    };
  }
}

export const localPricingEngine = new LocalPricingEngine();
