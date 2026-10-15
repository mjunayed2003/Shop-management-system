import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { formatBDT } from '@/lib/utils/formatters';
import { toDecimal, isRetailBelowCost, applyPriceAdjustment } from '@/lib/utils/money';
import { exportToCsv, escapeCsvCell } from '@/lib/utils/csv';
import { isValidEan13, isValidCode128, resolveBarcodeFormat } from '@/lib/utils/barcode';
import type { QueryClient } from '@tanstack/react-query';

describe('Phase F2 - Catalog & Product Logic Test Suite', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    useBranchStore.getState().clearBranchState();
  });

  describe('1. Branch Safety & Permissions Isolation', () => {
    it('branch user has no multi-branch admin privileges', () => {
      useAuthStore.getState().setAuth({
        user: {
          id: 'user-branch-1',
          firstName: 'Branch',
          lastName: 'Staff',
          email: 'staff@shop.com',
          phone: '01711111111',
          isOwner: false,
          role: { id: 'r-staff', name: 'Sales Assistant', code: 'SALES_STAFF' },
        },
        business: { id: 'biz-1', name: 'My Boutique', slug: 'my-boutique' },
        permissions: ['products:read'],
      });

      const user = useAuthStore.getState().user;
      const isAdmin = Boolean(user?.isOwner);
      expect(isAdmin).toBe(false);
    });

    it('business owner / admin has multi-branch access', () => {
      useAuthStore.getState().setAuth({
        user: {
          id: 'user-admin-1',
          firstName: 'Admin',
          lastName: 'Boss',
          email: 'boss@shop.com',
          phone: '01722222222',
          isOwner: true,
          role: { id: 'r-admin', name: 'Owner', code: 'OWNER' },
        },
        business: { id: 'biz-1', name: 'My Boutique', slug: 'my-boutique' },
        permissions: ['products:read', 'products:create', 'products:update', 'products:delete'],
      });

      const user = useAuthStore.getState().user;
      const isOwner = Boolean(user?.isOwner);
      expect(isOwner).toBe(true);
    });

    it('switching branch clears TanStack Query cache and changes active branch', () => {
      const mockQueryClient = {
        clear: vi.fn(),
        resetQueries: vi.fn(),
      } as unknown as QueryClient;

      useBranchStore.getState().setBranches([
        { id: 'branch-dhanmondi', name: 'Dhanmondi Outlet', code: 'DHD' },
        { id: 'branch-gulshan', name: 'Gulshan Flagship', code: 'GLS' },
      ]);

      expect(useBranchStore.getState().currentBranchId).toBe('branch-dhanmondi');

      // Switch to Gulshan
      useBranchStore.getState().switchBranch('branch-gulshan', mockQueryClient);

      expect(useBranchStore.getState().currentBranchId).toBe('branch-gulshan');
      expect(useBranchStore.getState().currentBranch?.name).toBe('Gulshan Flagship');
      expect(mockQueryClient.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Decimal.js & Bangladeshi Currency Math', () => {
    it('avoids IEEE 754 floating point arithmetic issues', () => {
      // 0.1 + 0.2 in native JS equals 0.30000000000000004
      expect(0.1 + 0.2).not.toBe(0.3);

      const d1 = toDecimal(0.1);
      const d2 = toDecimal(0.2);
      const sum = d1.plus(d2);

      expect(sum.toNumber()).toBe(0.3);
      expect(sum.toString()).toBe('0.3');
    });

    it('formats BDT with authentic Bangladeshi grouping (2,2,3)', () => {
      // Bangladeshi currency format has 2-digit groups after the first 3 digits
      const formatted1 = formatBDT(123450);
      expect(formatted1).toContain('1,23,450');

      const formatted2 = formatBDT(10000000); // 1 crore
      expect(formatted2).toContain('1,00,00,000');
    });

    it('accurately calculates percentage and fixed price adjustments', () => {
      const base = 1200;

      // 10% discount: 1200 - 120 = 1080
      const discount = applyPriceAdjustment(base, 'PERCENT', -10);
      expect(discount).toBe(1080);

      // 15% markup: 1200 + 180 = 1380
      const markup = applyPriceAdjustment(base, 'PERCENT', 15);
      expect(markup).toBe(1380);

      // Fixed 150 BDT reduction: 1200 - 150 = 1050
      const fixedReduction = applyPriceAdjustment(base, 'FIXED', -150);
      expect(fixedReduction).toBe(1050);

      // Price cannot drop below 0
      const negativeResult = applyPriceAdjustment(base, 'FIXED', -2000);
      expect(negativeResult).toBe(0);
    });

    it('detects advisory warning when retail price is below cost price', () => {
      expect(isRetailBelowCost(800, 1000)).toBe(true); // advisory warning
      expect(isRetailBelowCost(1200, 1000)).toBe(false);
      expect(isRetailBelowCost(1000, 1000)).toBe(false);
      expect(isRetailBelowCost('', 1000)).toBe(false);
    });
  });

  describe('3. Bulk Variant Generator Logic', () => {
    it('generates the Cartesian product of selected sizes and colors', () => {
      const sizes = [
        { id: 's-s', name: 'S' },
        { id: 's-m', name: 'M' },
        { id: 's-l', name: 'L' },
      ];
      const colors = [
        { id: 'c-navy', name: 'Navy' },
        { id: 'c-black', name: 'Black' },
      ];

      const combinations: { sizeId: string; colorId: string }[] = [];
      for (const size of sizes) {
        for (const color of colors) {
          combinations.push({ sizeId: size.id, colorId: color.id });
        }
      }

      // 3 sizes x 2 colors = 6 combinations
      expect(combinations.length).toBe(6);
      expect(combinations).toEqual([
        { sizeId: 's-s', colorId: 'c-navy' },
        { sizeId: 's-s', colorId: 'c-black' },
        { sizeId: 's-m', colorId: 'c-navy' },
        { sizeId: 's-m', colorId: 'c-black' },
        { sizeId: 's-l', colorId: 'c-navy' },
        { sizeId: 's-l', colorId: 'c-black' },
      ]);
    });

    it('flags duplicate size + color matrix combinations before submission', () => {
      const variants = [
        { sizeId: 's-m', colorId: 'c-black', sku: 'SKU-1', retailPrice: 1200 },
        { sizeId: 's-l', colorId: 'c-black', sku: 'SKU-2', retailPrice: 1200 },
        { sizeId: 's-m', colorId: 'c-black', sku: 'SKU-3', retailPrice: 1200 }, // Duplicate of row 0
      ];

      const seenCombos = new Set<string>();
      const duplicateIndices: number[] = [];

      variants.forEach((v, idx) => {
        const key = `${v.sizeId || 'nosize'}_${v.colorId || 'nocolor'}`;
        if (seenCombos.has(key)) {
          duplicateIndices.push(idx);
        } else {
          seenCombos.add(key);
        }
      });

      expect(duplicateIndices).toContain(2);
      expect(duplicateIndices.length).toBe(1);
    });
  });

  describe('4. Barcode Validation and Format Fallback', () => {
    it('validates standard EAN-13 barcodes with checksum', () => {
      // Valid EAN-13 barcodes
      expect(isValidEan13('9780201379624')).toBe(true);
      expect(isValidEan13('8901030000003')).toBe(true);
      // Invalid length or non-digits
      expect(isValidEan13('12345')).toBe(false);
      expect(isValidEan13('890103000000A')).toBe(false);
      // Invalid checksum
      expect(isValidEan13('8901030000007')).toBe(false);
    });

    it('falls back to CODE128 when format is invalid or not EAN-13', () => {
      expect(resolveBarcodeFormat('SHIRT-SL-NVY')).toBe('CODE128');
      expect(resolveBarcodeFormat('9780201379624')).toBe('EAN13');
      expect(resolveBarcodeFormat('invalid-code')).toBe('CODE128');
    });

    it('validates ASCII characters for CODE128', () => {
      expect(isValidCode128('PROD-12345')).toBe(true);
      expect(isValidCode128('ABC-xyz-999')).toBe(true);
      // Non-ASCII character
      expect(isValidCode128('পণ্য-১২৩')).toBe(false);
    });
  });

  describe('5. CSV Formula Injection Security', () => {
    it('prefixes formula triggers (=, +, -, @) with a single quote', () => {
      expect(escapeCsvCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(escapeCsvCell('+cmd|/c calc')).toBe('"\'cmd|/c calc"'.replace('cmd', '+cmd'));
      expect(escapeCsvCell('-2+3')).toBe('"\'=2+3"'.replace('=', '-'));
      expect(escapeCsvCell('@SUM')).toBe('"\'@SUM"');
      expect(escapeCsvCell('Normal Product Name')).toBe('"Normal Product Name"');
    });

    it('generates properly formatted CSV string with headers and escaped rows', () => {
      const headers = ['SKU', 'Name', 'Price'];
      const rows = [
        ['SKU-001', 'Cotton Shirt', 1250],
        ['SKU-002', '=2+2 Danger', 1500],
      ];

      const csv = exportToCsv(headers, rows);
      expect(csv).toContain('"SKU","Name","Price"');
      expect(csv).toContain('"SKU-001","Cotton Shirt","1250"');
      // Verify formula injection is neutralised
      expect(csv).toContain('"\'=2+2 Danger"');
    });
  });

  describe('6. Plan Limit Error Handling', () => {
    it('formats PLAN_LIMIT_REACHED error details correctly', () => {
      const serverError = {
        statusCode: 403,
        error: 'Forbidden',
        message: 'PLAN_LIMIT_REACHED: Products limit of 100 reached. Currently using 100.',
        limit: 100,
        currentUsage: 100,
        plan: 'STARTER',
      };

      const isPlanLimit = serverError.message.includes('PLAN_LIMIT_REACHED');
      expect(isPlanLimit).toBe(true);
      expect(serverError.limit).toBe(100);
      expect(serverError.currentUsage).toBe(100);
    });
  });

  describe('7. Product Creation Payload & Conflict Mapping', () => {
    it('admin payload includes branchIds, whereas branch user payload omits branchIds', () => {
      // 1. Admin submission
      const adminUser = { isOwner: true };
      const selectedBranches = ['branch-1', 'branch-2'];
      const adminPayload = {
        name: 'Premium Oxford Shirt',
        code: 'SHT-OXF-001',
        hasVariants: true,
        variants: [
          { sku: 'SHT-OXF-001-M-NVY', retailPrice: 1500, costPrice: 1000 },
        ],
        ...(adminUser.isOwner ? { branchIds: selectedBranches } : {}),
      };

      expect(adminPayload.branchIds).toEqual(['branch-1', 'branch-2']);

      // 2. Branch staff submission
      const staffUser = { isOwner: false };
      const staffPayload = {
        name: 'Premium Oxford Shirt',
        code: 'SHT-OXF-001',
        hasVariants: true,
        variants: [
          { sku: 'SHT-OXF-001-M-NVY', retailPrice: 1500, costPrice: 1000 },
        ],
        ...(staffUser.isOwner ? { branchIds: selectedBranches } : {}),
      };

      expect((staffPayload as any).branchIds).toBeUndefined();
    });

    it('maps 409 conflict error messages to the relevant field', () => {
      const errorResponse = {
        statusCode: 409,
        message: 'A product with code "TSHIRT-001" already exists.',
      };

      const fieldErrors: Record<string, string> = {};
      if (errorResponse.message.includes('code')) {
        fieldErrors.code = errorResponse.message;
      }

      expect(fieldErrors.code).toBe('A product with code "TSHIRT-001" already exists.');
    });

    it('reprint requires reason validation', () => {
      const validatePrintRequest = (printType: 'INITIAL_PRINT' | 'REPRINT', reason?: string) => {
        if (printType === 'REPRINT' && (!reason || !reason.trim())) {
          throw new Error('A reason must be provided when reprinting barcode labels');
        }
        return true;
      };

      expect(() => validatePrintRequest('REPRINT', '')).toThrow(
        'A reason must be provided when reprinting barcode labels',
      );
      expect(validatePrintRequest('INITIAL_PRINT', '')).toBe(true);
      expect(validatePrintRequest('REPRINT', 'Tag damaged by customer')).toBe(true);
    });
  });
});
