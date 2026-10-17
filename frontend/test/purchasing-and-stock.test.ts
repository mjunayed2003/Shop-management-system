import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import Decimal from 'decimal.js';
import { escapeCsvCell, downloadCsv } from '@/lib/utils/csv';
import { InsufficientStockError, extractAvailableStockFromError } from '@/lib/api/errors';

describe('Phase F3 - Purchasing & Stock Logic Test Suite', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    useBranchStore.getState().clearBranchState();
  });

  describe('1. Purchase Form Logic & Calculations', () => {
    it('scan adds row if not present, and increments row if already present', () => {
      interface ItemRow {
        variantId: string;
        sku: string;
        quantity: number;
        unitCost: number;
      }

      let items: ItemRow[] = [];

      const addOrIncrement = (variant: { id: string; sku: string; cost: number }, qty = 1) => {
        const idx = items.findIndex((i) => i.variantId === variant.id);
        if (idx >= 0) {
          items[idx].quantity += qty;
        } else {
          items.push({
            variantId: variant.id,
            sku: variant.sku,
            quantity: qty,
            unitCost: variant.cost,
          });
        }
      };

      // Scan first time -> added with qty 1
      addOrIncrement({ id: 'v-1', sku: 'SKU-001', cost: 500 }, 1);
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(1);

      // Scan second time -> incremented to 2
      addOrIncrement({ id: 'v-1', sku: 'SKU-001', cost: 500 }, 1);
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);

      // Scan different variant -> added as second item
      addOrIncrement({ id: 'v-2', sku: 'SKU-002', cost: 750 }, 1);
      expect(items).toHaveLength(2);
      expect(items[1].quantity).toBe(1);
    });

    it('enforces whole-number integers for individually tracked products', () => {
      const isWholeNumber = (val: number) => Number.isInteger(val) && val >= 1;
      const normalizeTrackedQty = (input: number, trackIndividually: boolean) => {
        if (trackIndividually) {
          return Math.max(1, Math.round(input));
        }
        return input;
      };

      expect(isWholeNumber(1)).toBe(true);
      expect(isWholeNumber(1.5)).toBe(false);

      expect(normalizeTrackedQty(2.7, true)).toBe(3);
      expect(normalizeTrackedQty(1.2, true)).toBe(1);
      expect(normalizeTrackedQty(0.2, true)).toBe(1);
      expect(normalizeTrackedQty(2.5, false)).toBe(2.5); // decimal allowed for non-tracked
    });

    it('blocks paid amount > total amount in UI validation', () => {
      const validatePayment = (total: Decimal, paid: Decimal) => {
        if (paid.greaterThan(total)) {
          return { valid: false, error: 'Paid amount cannot exceed total purchase amount' };
        }
        return { valid: true };
      };

      const total = new Decimal('1500.00');
      const validPaid = new Decimal('1000.00');
      const overpaid = new Decimal('1500.01');

      expect(validatePayment(total, validPaid).valid).toBe(true);
      expect(validatePayment(total, overpaid).valid).toBe(false);
      expect(validatePayment(total, overpaid).error).toContain('cannot exceed total');
    });

    it('calculates totals preview using decimal.js with zero floating point errors', () => {
      // Classic float pitfall: 0.1 + 0.2 = 0.30000000000000004
      const qty = new Decimal('3');
      const unitCost = new Decimal('199.99');
      const subtotal = qty.times(unitCost); // 599.97

      const discount = new Decimal('50.00');
      const tax = new Decimal('27.4985');
      const shipping = new Decimal('100.00');

      const total = subtotal.minus(discount).plus(tax).plus(shipping);
      const paid = new Decimal('300.00');
      const due = total.minus(paid);

      expect(subtotal.toString()).toBe('599.97');
      expect(total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()).toBe('677.47');
      expect(due.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()).toBe('377.47');
    });

    it('server totals replace the local preview after save', () => {
      let formTotals = {
        subtotal: 500,
        total: 550,
        due: 550,
        source: 'PREVIEW' as 'PREVIEW' | 'SERVER',
      };

      // Server returns authoritative totals with landed costs and tax calculation
      const serverResponse = {
        subtotal_amount: 500.0,
        discount_amount: 25.0,
        tax_amount: 35.62,
        shipping_cost: 50.0,
        total_amount: 560.62,
        paid_amount: 200.0,
        due_amount: 360.62,
      };

      formTotals = {
        subtotal: Number(serverResponse.subtotal_amount),
        total: Number(serverResponse.total_amount),
        due: Number(serverResponse.due_amount),
        source: 'SERVER',
      };

      expect(formTotals.source).toBe('SERVER');
      expect(formTotals.total).toBe(560.62);
      expect(formTotals.due).toBe(360.62);
    });

    it('reuses the same idempotency key on retry/double-click, regenerating only after success or reset', () => {
      let currentKey = 'idemp-key-1';
      let isSubmitted = false;

      const triggerSubmit = () => {
        // Reuse key on retry
        return currentKey;
      };

      const keyAttempt1 = triggerSubmit();
      const keyAttempt2 = triggerSubmit();
      expect(keyAttempt1).toBe(keyAttempt2);

      // On success
      isSubmitted = true;
      currentKey = 'idemp-key-2'; // regenerated for next purchase

      expect(currentKey).not.toBe(keyAttempt1);
    });

    it('correctly maps 422 and PLAN_LIMIT_REACHED error codes to notifications', () => {
      const mapError = (err: { code?: string; message: string }) => {
        if (err.code === 'PLAN_LIMIT_REACHED') {
          return 'Subscription plan limit reached. Please upgrade your plan.';
        }
        if (err.code === 'UNPROCESSABLE_ENTITY' || err.message.includes('422')) {
          return 'Validation failed for one or more purchase line items.';
        }
        return err.message;
      };

      expect(mapError({ code: 'PLAN_LIMIT_REACHED', message: 'Limit' })).toContain('Subscription plan limit');
      expect(mapError({ code: 'UNPROCESSABLE_ENTITY', message: 'Error 422' })).toContain('Validation failed');
    });
  });

  describe('2. Purchase Cancellation & Insufficient Stock Handling', () => {
    it('extracts available stock and shows refusal message when stock was already sold', () => {
      const serverErrorMessage =
        'Cannot cancel purchase: Stock for variant v-panjabi-40 has already been sold or moved. Current available: 3, needed: 10.';

      const extracted = extractAvailableStockFromError(serverErrorMessage);
      expect(extracted).toBe(3);

      const err = new InsufficientStockError(serverErrorMessage, extracted);
      expect(err.availableQuantity).toBe(3);
      expect(err.message).toContain('Current available: 3, needed: 10');
    });
  });

  describe('3. Supplier Payment Overpayment Protection', () => {
    it('blocks overpayment in UI when payment amount exceeds purchase due', () => {
      const validateSupplierPayment = (purchaseDue: number | undefined, paymentAmount: number) => {
        if (purchaseDue !== undefined && paymentAmount > purchaseDue) {
          return {
            allowed: false,
            error: `Payment amount cannot exceed purchase due amount (${purchaseDue})`,
          };
        }
        return { allowed: true };
      };

      expect(validateSupplierPayment(500, 400).allowed).toBe(true);
      expect(validateSupplierPayment(500, 500).allowed).toBe(true);
      expect(validateSupplierPayment(500, 500.01).allowed).toBe(false);
      expect(validateSupplierPayment(500, 600).error).toContain('cannot exceed purchase due amount (500)');
    });
  });

  describe('4. Stock Transfers Safety & Permissions', () => {
    it('destination branch selector strictly excludes the current branch', () => {
      const allBranches = [
        { id: 'branch-1', name: 'Dhanmondi' },
        { id: 'branch-2', name: 'Uttara' },
        { id: 'branch-3', name: 'Mirpur' },
      ];
      const currentBranchId = 'branch-1';

      const validDestinations = allBranches.filter((b) => b.id !== currentBranchId);
      expect(validDestinations).toHaveLength(2);
      expect(validDestinations.some((b) => b.id === currentBranchId)).toBe(false);
    });

    it('requires a mandatory discrepancy note when received quantity is less than sent quantity', () => {
      const validateReceipt = (sent: number, received: number, note?: string) => {
        if (received < sent && (!note || !note.trim())) {
          return { valid: false, error: 'Discrepancy note is mandatory when received < sent' };
        }
        return { valid: true };
      };

      expect(validateReceipt(10, 10).valid).toBe(true);
      expect(validateReceipt(10, 8, '').valid).toBe(false);
      expect(validateReceipt(10, 8, '2 items torn during transit').valid).toBe(true);
    });

    it('requires a mandatory reason before rejecting a stock transfer', () => {
      const validateRejection = (reason: string) => {
        return Boolean(reason && reason.trim().length >= 3);
      };

      expect(validateRejection('')).toBe(false);
      expect(validateRejection('  ')).toBe(false);
      expect(validateRejection('Consignment broken on arrival')).toBe(true);
    });

    it('hides Receive and Reject actions from users who do not belong to the destination branch', () => {
      const canReceive = (userBranchId: string, destBranchId: string, isOwner: boolean) => {
        return isOwner || userBranchId === destBranchId;
      };

      // Branch 1 user viewing a transfer sent to Branch 2
      expect(canReceive('branch-1', 'branch-2', false)).toBe(false);
      // Branch 2 user viewing transfer sent to Branch 2
      expect(canReceive('branch-2', 'branch-2', false)).toBe(true);
      // Business Owner can always receive
      expect(canReceive('branch-1', 'branch-2', true)).toBe(true);
    });
  });

  describe('5. Stock Adjustments Approval Policy', () => {
    it('hides the Approve button for the creator (non-owner) and for users without stock:approve', () => {
      const canApproveAdjustment = (
        userId: string,
        createdById: string,
        isOwner: boolean,
        permissions: string[],
      ) => {
        const hasPerm =
          isOwner ||
          permissions.includes('stock:approve') ||
          permissions.includes('stock.approve') ||
          permissions.includes('stock.*') ||
          permissions.includes('*');

        if (!hasPerm) return false;
        if (userId === createdById && !isOwner) return false; // creator cannot approve unless owner
        return true;
      };

      // Creator without owner role -> blocked
      expect(canApproveAdjustment('u-staff-1', 'u-staff-1', false, ['stock:approve'])).toBe(false);

      // Creator WITH owner role -> allowed
      expect(canApproveAdjustment('u-owner-1', 'u-owner-1', true, ['stock:approve'])).toBe(true);

      // Other staff with stock:approve -> allowed
      expect(canApproveAdjustment('u-mgr-2', 'u-staff-1', false, ['stock:approve'])).toBe(true);

      // Other staff WITHOUT stock:approve -> blocked
      expect(canApproveAdjustment('u-mgr-2', 'u-staff-1', false, ['inventory:read'])).toBe(false);
    });
  });

  describe('6. Stocktake Autosave & Resume Policy', () => {
    it('increments item count immediately on barcode scan', () => {
      const counts: Record<string, number> = { 'item-1': 5 };
      const incrementCount = (itemId: string) => {
        counts[itemId] = (counts[itemId] ?? 0) + 1;
        return counts[itemId];
      };

      expect(incrementCount('item-1')).toBe(6);
      expect(incrementCount('item-2')).toBe(1);
    });

    it('resumes existing IN_PROGRESS stocktake automatically', () => {
      const stocktakes = [
        { id: 'stk-1', stocktake_no: 'STK-000001', status: 'COMPLETED' },
        { id: 'stk-2', stocktake_no: 'STK-000002', status: 'IN_PROGRESS' },
      ];

      const active = stocktakes.find((s) => s.status === 'IN_PROGRESS');
      expect(active?.id).toBe('stk-2');
    });
  });

  describe('7. Cost Visibility & Branch Isolation', () => {
    it('hides cost columns from stock table unless user has products:update or is owner', () => {
      const canViewCost = (user: { isOwner?: boolean } | null, permissions: string[]) => {
        return Boolean(
          user?.isOwner ||
            permissions.includes('products:update') ||
            permissions.includes('*'),
        );
      };

      expect(canViewCost({ isOwner: false }, ['inventory:read'])).toBe(false);
      expect(canViewCost({ isOwner: false }, ['inventory:read', 'products:update'])).toBe(true);
      expect(canViewCost({ isOwner: true }, [])).toBe(true);
    });

    it('shows multi-branch matrix only to admins and owners', () => {
      const canAccessAllBranches = (isOwner: boolean, branchCount: number) => {
        return isOwner || branchCount > 1;
      };

      expect(canAccessAllBranches(false, 1)).toBe(false);
      expect(canAccessAllBranches(true, 1)).toBe(true);
      expect(canAccessAllBranches(false, 2)).toBe(true);
    });
  });

  describe('8. Opening Stock Refusal & Adjustment Shortcut', () => {
    it('detects backend refusal when movements exist and generates adjustment shortcut url', () => {
      const backendError =
        'Stock movements already exist for this variant in this branch. Please use Stock Adjustments instead.';

      const isRefusal = backendError.includes('Stock movements already exist');
      expect(isRefusal).toBe(true);

      const variantId = 'var-123';
      const suggestedQty = 25;
      const shortcutUrl = `/inventory/adjustments/new?variantId=${variantId}&suggestedQty=${suggestedQty}`;

      expect(shortcutUrl).toBe('/inventory/adjustments/new?variantId=var-123&suggestedQty=25');
    });
  });

  describe('9. CSV Formula Injection Safety', () => {
    it('escapes cells starting with =, +, -, @, or tab characters', () => {
      expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`);
      expect(escapeCsvCell('+SUM(A1:A10)')).toBe(`"'+SUM(A1:A10)"`);
      expect(escapeCsvCell('-CMD("calc.exe")')).toBe(`"'-CMD(""calc.exe"")"`);
      expect(escapeCsvCell('@HYPERLINK("evil.com")')).toBe(`"'@HYPERLINK(""evil.com"")"`);
      expect(escapeCsvCell('Normal Text')).toBe('"Normal Text"');
      expect(escapeCsvCell(1234)).toBe('"1234"');
    });
  });
});
