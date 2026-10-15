import Decimal from 'decimal.js';

/**
 * Authoritative financial calculation helper using decimal.js
 * Rule 2: The frontend never calculates authoritative money.
 * Decimal.js is used for advisory checks and UI totals to prevent floating-point errors (e.g. 0.1 + 0.2).
 */

export function toDecimal(val: number | string | null | undefined): Decimal {
  if (val === null || val === undefined || val === '') return new Decimal(0);
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Checks if retail price is below cost price (advisory warning only)
 */
export function isRetailBelowCost(
  retailPrice: number | string | null | undefined,
  costPrice: number | string | null | undefined,
): boolean {
  const retail = toDecimal(retailPrice);
  const cost = toDecimal(costPrice);
  if (cost.isZero() || retail.isZero()) return false;
  return retail.lessThan(cost);
}

/**
 * Applies percentage or fixed amount adjustment over a base price using decimal.js
 */
export function applyPriceAdjustment(
  basePrice: number | string,
  typeOrAdjustment: 'PERCENT' | 'PERCENTAGE' | 'FIXED' | number | string,
  adjustmentOrType?: number | string | 'PERCENT' | 'PERCENTAGE' | 'FIXED',
): number {
  let type: 'PERCENT' | 'FIXED' = 'PERCENT';
  let adjVal: number | string = 0;

  if (
    typeof typeOrAdjustment === 'string' &&
    (typeOrAdjustment === 'PERCENT' || typeOrAdjustment === 'PERCENTAGE' || typeOrAdjustment === 'FIXED')
  ) {
    type = typeOrAdjustment === 'FIXED' ? 'FIXED' : 'PERCENT';
    adjVal = (adjustmentOrType as number | string) || 0;
  } else {
    adjVal = typeOrAdjustment;
    type = adjustmentOrType === 'FIXED' ? 'FIXED' : 'PERCENT';
  }

  const base = toDecimal(basePrice);
  const adj = toDecimal(adjVal);

  let result: Decimal;
  if (type === 'PERCENT') {
    // base + (base * adj / 100)
    const factor = adj.dividedBy(100);
    const added = base.times(factor);
    result = base.plus(added);
  } else {
    // FIXED
    result = base.plus(adj);
  }

  // Prices cannot be negative
  if (result.isNegative()) {
    result = new Decimal(0);
  }

  return Number(result.toFixed(2));
}

/**
 * Calculates stock value (quantity * average cost price)
 */
export function calculateStockValue(
  quantity: number | string,
  costPrice: number | string,
): number {
  return Number(toDecimal(quantity).times(toDecimal(costPrice)).toFixed(2));
}
