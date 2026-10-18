import { describe, it, expect } from 'vitest';
import { localPricingEngine } from '../src/lib/offline/local-pricing';
import fixtures from './fixtures/pricing-fixtures.json';

describe('Local Pricing Engine (Phase F6)', () => {
  it('correctly calculates totals for all shared test fixtures', () => {
    for (const fixture of fixtures) {
      const result = localPricingEngine.calculateCart({
        items: fixture.input.items as any,
        saleType: (fixture.input.saleType as any) || 'RETAIL',
        coupon: (fixture.input as any).coupon || null,
        taxRatePercent: (fixture.input as any).taxRatePercent || 0,
      });

      expect(result.subtotal, `Subtotal mismatch in "${fixture.name}"`).toBe(fixture.expected.subtotal);
      expect(result.lineDiscountTotal, `Line discount mismatch in "${fixture.name}"`).toBe(fixture.expected.lineDiscountTotal);
      expect(result.couponDiscount, `Coupon discount mismatch in "${fixture.name}"`).toBe(fixture.expected.couponDiscount);
      expect(result.totalDiscount, `Total discount mismatch in "${fixture.name}"`).toBe(fixture.expected.totalDiscount);
      expect(result.taxAmount, `Tax amount mismatch in "${fixture.name}"`).toBe(fixture.expected.taxAmount);
      expect(result.rawTotal, `Raw total mismatch in "${fixture.name}"`).toBe(fixture.expected.rawTotal);
      expect(result.roundOff, `Round-off mismatch in "${fixture.name}"`).toBe(fixture.expected.roundOff);
      expect(result.totalAmount, `Total amount mismatch in "${fixture.name}"`).toBe(fixture.expected.totalAmount);
      expect(result.isProvisional).toBe(true);
    }
  });

  it('handles empty carts safely', () => {
    const result = localPricingEngine.calculateCart({ items: [] });
    expect(result.subtotal).toBe(0);
    expect(result.totalAmount).toBe(0);
    expect(result.isProvisional).toBe(true);
  });

  it('prevents line discounts from exceeding line gross', () => {
    const result = localPricingEngine.calculateCart({
      items: [
        {
          variantId: 'v1',
          quantity: 1,
          basePrice: 500,
          discountAmount: 800, // exceeds 500
        },
      ],
    });
    expect(result.subtotal).toBe(500);
    expect(result.lineDiscountTotal).toBe(500); // capped at 500
    expect(result.totalAmount).toBe(0);
  });
});
