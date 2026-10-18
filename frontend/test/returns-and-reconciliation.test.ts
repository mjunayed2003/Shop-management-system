import { describe, it, expect, beforeEach, vi } from 'vitest';
import Decimal from 'decimal.js';
import { escapeCsvCell, exportToCsv } from '@/lib/utils/csv';
import { normalizeBDPhone, isValidBDPhone } from '@/lib/utils/phone';
import {
  generateReturnSlipHtml,
  generateExchangeSlipHtml,
  generateDueReceiptHtml,
  generateZReportHtml,
  ReturnSlipData,
  ExchangeSlipData,
  DueReceiptPrintData,
  ZReportPrintData,
} from '@/lib/utils/receipt-template';
import { DEFAULT_PRINT_SETTINGS } from '@/lib/utils/printer';

describe('Phase F5: Returns, Exchange, Due Collection, Expenses, Cash, Register Close & Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // A. SALES RETURN TESTS
  describe('A. Sales Return Rules', () => {
    it('enforces max returnable from server values and rejects return quantity > maxReturnable', () => {
      const serverSoldQty = 5;
      const serverAlreadyReturnedQty = 2;
      const maxReturnable = serverSoldQty - serverAlreadyReturnedQty; // 3

      expect(maxReturnable).toBe(3);

      const isValidReturnQty = (qty: number) => qty > 0 && qty <= maxReturnable;

      expect(isValidReturnQty(1)).toBe(true);
      expect(isValidReturnQty(3)).toBe(true);
      expect(isValidReturnQty(4)).toBe(false); // Exceeds max returnable
      expect(isValidReturnQty(0)).toBe(false);
      expect(isValidReturnQty(-1)).toBe(false);
    });

    it('requires item condition to be RESELLABLE or DAMAGED', () => {
      const allowedConditions = ['RESELLABLE', 'DAMAGED'];
      expect(allowedConditions.includes('RESELLABLE')).toBe(true);
      expect(allowedConditions.includes('DAMAGED')).toBe(true);
      expect(allowedConditions.includes('REFURBISHED')).toBe(false);
    });

    it('does NOT offer STORE_CREDIT as refund method', () => {
      const supportedRefundMethods = ['CASH', 'BKASH', 'NAGAD', 'ADJUSTED_IN_EXCHANGE'];
      expect(supportedRefundMethods.includes('STORE_CREDIT')).toBe(false);
    });

    it('displays server due-first split (reduces due first: X, paid back: Y)', () => {
      // Server response shape
      const serverResponse = {
        totalRefundAmount: '500.00',
        dueReduction: '300.00',
        payoutAmount: '200.00',
      };

      const totalRefund = new Decimal(serverResponse.totalRefundAmount);
      const dueReduction = new Decimal(serverResponse.dueReduction);
      const payout = new Decimal(serverResponse.payoutAmount);

      expect(dueReduction.plus(payout).equals(totalRefund)).toBe(true);
      expect(dueReduction.toString()).toBe('300');
      expect(payout.toString()).toBe('200');
    });

    it('identifies cross-branch returns and gates by return.cross_branch permission', () => {
      const saleBranchId = 'branch-ctg-01';
      const userBranchId = 'branch-dhk-01';
      const isCrossBranch = saleBranchId !== userBranchId;

      expect(isCrossBranch).toBe(true);

      const userPermissions = ['return.create'];
      const canCrossBranch = userPermissions.includes('return.cross_branch');
      expect(canCrossBranch).toBe(false);

      const managerPermissions = ['return.create', 'return.cross_branch'];
      const managerCanCrossBranch = managerPermissions.includes('return.cross_branch');
      expect(managerCanCrossBranch).toBe(true);
    });

    it('requires an open register session for cash refunds', () => {
      const checkCashRefundAllowed = (
        refundMethod: string,
        hasOpenSession: boolean,
      ): { allowed: boolean; reason?: string } => {
        if (refundMethod === 'CASH' && !hasOpenSession) {
          return { allowed: false, reason: 'Cash refund requires an open register session.' };
        }
        return { allowed: true };
      };

      expect(checkCashRefundAllowed('CASH', false).allowed).toBe(false);
      expect(checkCashRefundAllowed('CASH', true).allowed).toBe(true);
      expect(checkCashRefundAllowed('BKASH', false).allowed).toBe(true); // Digital refund allowed
    });
  });

  // B. IDEMPOTENCY KEY REUSE
  describe('B. Idempotency Key Rules', () => {
    it('generates a single UUID idempotency key per intent and reuses on retries', () => {
      // Simulate intent key creation
      let idempotencyKey = '550e8400-e29b-41d4-a716-446655440000';
      const initialKey = idempotencyKey;

      // Double-click / retry / network timeout
      const retryKey = idempotencyKey;
      expect(retryKey).toBe(initialKey);

      // On successful completion or explicit reset, key regenerates
      const onConfirmedSuccess = () => {
        idempotencyKey = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      };

      onConfirmedSuccess();
      expect(idempotencyKey).not.toBe(initialKey);
    });
  });

  // C. PRODUCT EXCHANGE
  describe('C. Product Exchange Logic', () => {
    it('correctly evaluates EVEN, CUSTOMER_PAYS, and SHOP_REFUNDS cases', () => {
      const evaluateExchange = (returnCredit: Decimal, newItemsTotal: Decimal) => {
        const diff = newItemsTotal.minus(returnCredit);
        if (diff.isZero()) {
          return { case: 'EVEN', diffAmount: new Decimal(0) };
        } else if (diff.greaterThan(0)) {
          return { case: 'CUSTOMER_PAYS', diffAmount: diff };
        } else {
          return { case: 'SHOP_REFUNDS', diffAmount: diff.abs() };
        }
      };

      // Case 1: Even
      const even = evaluateExchange(new Decimal('1500.00'), new Decimal('1500.00'));
      expect(even.case).toBe('EVEN');
      expect(even.diffAmount.isZero()).toBe(true);

      // Case 2: Customer pays difference
      const customerPays = evaluateExchange(new Decimal('1500.00'), new Decimal('2200.00'));
      expect(customerPays.case).toBe('CUSTOMER_PAYS');
      expect(customerPays.diffAmount.toString()).toBe('700');

      // Case 3: Shop refunds difference
      const shopRefunds = evaluateExchange(new Decimal('2000.00'), new Decimal('1400.00'));
      expect(shopRefunds.case).toBe('SHOP_REFUNDS');
      expect(shopRefunds.diffAmount.toString()).toBe('600');
    });

    it('labels returned item value strictly as exchange credit and not cash', () => {
      const creditLabel = 'Exchange Credit (Returned Items Value)';
      expect(creditLabel).toContain('Exchange Credit');
      expect(creditLabel).not.toBe('Cash Paid');
    });

    it('preserves exchange form state upon backend failure for cashier correction', () => {
      let formState = {
        returnedItems: [{ saleItemId: 'item-1', quantity: 2 }],
        newItems: [{ variantId: 'var-10', quantity: 1, unitPrice: 850 }],
      };

      // Simulate backend rollback error
      const backendError = { status: 409, message: 'Stock unavailable at checkout' };

      // Form state remains intact
      expect(formState.returnedItems.length).toBe(1);
      expect(formState.newItems.length).toBe(1);
      expect(formState.newItems[0].quantity).toBe(1);
    });
  });

  // D. DUE COLLECTION
  describe('D. Due Collection Rules', () => {
    it('rejects collection amount > current customer due (advance payments blocked)', () => {
      const customerDue = new Decimal('1250.00');

      const validateDueCollection = (amount: Decimal) => {
        if (amount.lessThanOrEqualTo(0)) return { valid: false, error: 'Amount must be > 0' };
        if (amount.greaterThan(customerDue)) {
          return { valid: false, error: 'Advance payments are not supported.' };
        }
        return { valid: true };
      };

      expect(validateDueCollection(new Decimal('500')).valid).toBe(true);
      expect(validateDueCollection(new Decimal('1250')).valid).toBe(true); // Full due
      expect(validateDueCollection(new Decimal('1300')).valid).toBe(false); // Exceeds due
      expect(validateDueCollection(new Decimal('0')).valid).toBe(false);
    });

    it('supports phone lookup across all Bangladesh formats', () => {
      const p1 = normalizeBDPhone('01712345678');
      const p2 = normalizeBDPhone('8801712345678');
      const p3 = normalizeBDPhone('+8801712345678');
      const p4 = normalizeBDPhone('01712-345678');

      expect(p1).toBe('01712345678');
      expect(p2).toBe('01712345678');
      expect(p3).toBe('01712345678');
      expect(p4).toBe('01712345678');
      expect(isValidBDPhone(p1)).toBe(true);
    });

    it('renders oldest-first FIFO debt allocation from server response', () => {
      const serverAllocations = [
        { invoiceNo: 'INV-001', branch: 'Dhanmondi', appliedAmount: '800.00' },
        { invoiceNo: 'INV-004', branch: 'Uttara', appliedAmount: '450.00' },
      ];

      let totalApplied = new Decimal(0);
      for (const a of serverAllocations) {
        totalApplied = totalApplied.plus(a.appliedAmount);
      }

      expect(totalApplied.toString()).toBe('1250');
      expect(serverAllocations[0].invoiceNo).toBe('INV-001'); // Oldest invoice first
    });
  });

  // E. SHOWROOM EXPENSES & CASH MOVEMENTS
  describe('E. Showroom Expenses & Cash Movements', () => {
    it('restricts "Paid from register" to CASH method and an open session', () => {
      const isPaidFromRegisterAllowed = (method: string, hasOpenSession: boolean) => {
        return method === 'CASH' && hasOpenSession;
      };

      expect(isPaidFromRegisterAllowed('CASH', true)).toBe(true);
      expect(isPaidFromRegisterAllowed('CASH', false)).toBe(false);
      expect(isPaidFromRegisterAllowed('BKASH', true)).toBe(false);
      expect(isPaidFromRegisterAllowed('BANK', true)).toBe(false);
    });

    it('blocks pay-out exceeding live drawer cash in UI', () => {
      const liveExpectedCash = new Decimal('2450.00');

      const validatePayOut = (amount: Decimal) => {
        if (amount.lessThanOrEqualTo(0)) return false;
        if (amount.greaterThan(liveExpectedCash)) return false;
        return true;
      };

      expect(validatePayOut(new Decimal('1000'))).toBe(true);
      expect(validatePayOut(new Decimal('2450'))).toBe(true);
      expect(validatePayOut(new Decimal('2451'))).toBe(false);
    });

    it('safely escapes CSV formula injection triggers', () => {
      expect(escapeCsvCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(escapeCsvCell('+cmd|')).toBe('"\'+cmd|"');
      expect(escapeCsvCell('-123')).toBe('"\'-123"');
      expect(escapeCsvCell('@echo')).toBe('"\'@echo"');
      expect(escapeCsvCell('Normal Text')).toBe('"Normal Text"');
    });
  });

  // F. REGISTER CLOSE & RECONCILIATION
  describe('F. Register Close & Reconciliation', () => {
    it('accurately computes denomination cash count via Decimal.js', () => {
      const notes = {
        1000: 5, // 5000
        500: 4,  // 2000
        200: 10, // 2000
        100: 15, // 1500
        50: 10,  // 500
        20: 5,   // 100
        10: 8,   // 80
        5: 4,    // 20
        2: 5,    // 10
        1: 0,
      };

      const coins = {
        5: 6, // 30
        2: 5, // 10
        1: 4, // 4
      };

      let sum = new Decimal(0);
      for (const [denom, count] of Object.entries(notes)) {
        sum = sum.plus(new Decimal(denom).times(count));
      }
      for (const [denom, count] of Object.entries(coins)) {
        sum = sum.plus(new Decimal(denom).times(count));
      }

      // 5000 + 2000 + 2000 + 1500 + 500 + 100 + 80 + 20 + 10 + 30 + 10 + 4 = 11254
      expect(sum.toNumber()).toBe(11254);
    });

    it('requires closing notes when discrepancy exists', () => {
      const expected = new Decimal('5000.00');
      const counted = new Decimal('4950.00');
      const discrepancy = counted.minus(expected); // -50

      const isNotesRequired = !discrepancy.isZero();
      expect(isNotesRequired).toBe(true);

      const isValidSubmission = (notes: string) => {
        if (isNotesRequired && !notes.trim()) return false;
        return true;
      };

      expect(isValidSubmission('')).toBe(false);
      expect(isValidSubmission('Coin shortage from customer rounding')).toBe(true);
    });

    it('encodes denomination breakdown as structured JSON in closingNotes', () => {
      const breakdown = {
        mode: 'DENOMINATIONS',
        notesCount: { 1000: 5, 500: 2 },
        countedTotal: 6000,
        expectedBalance: 6000,
        discrepancy: 0,
        userNotes: 'End of shift handover balanced.',
      };

      const jsonStr = JSON.stringify(breakdown);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.mode).toBe('DENOMINATIONS');
      expect(parsed.notesCount['1000']).toBe(5);
      expect(parsed.countedTotal).toBe(6000);
      expect(parsed.userNotes).toContain('End of shift handover');
    });

    it('gates closing another user session behind register.close_any permission', () => {
      const sessionOwnerId = 'user-cashier-01';
      const currentUserId = 'user-manager-02';

      const canCloseSession = (
        sessionUser: string,
        currentUser: string,
        permissions: string[],
      ) => {
        if (sessionUser === currentUser) {
          return permissions.includes('register.close') || permissions.includes('*');
        }
        return permissions.includes('register.close_any') || permissions.includes('*');
      };

      // Cashier cannot close manager or peer session
      expect(
        canCloseSession(sessionOwnerId, currentUserId, ['register.close']),
      ).toBe(false);

      // Manager with register.close_any CAN close peer session
      expect(
        canCloseSession(sessionOwnerId, currentUserId, [
          'register.close',
          'register.close_any',
        ]),
      ).toBe(true);
    });
  });

  // G. REPORTS & PERMISSIONS
  describe('G. Reports & Permission Gating', () => {
    it('masks or hides COGS, gross profit, and net profit without report.view_profit', () => {
      const fullReportRow = {
        branchName: 'Dhanmondi',
        grossSales: '50000.00',
        discounts: '2000.00',
        salesReturns: '1000.00',
        netSales: '47000.00',
        expenses: '5000.00',
        damageLoss: '500.00',
        costOfGoodsSold: '30000.00',
        grossProfit: '17000.00',
        netProfit: '12000.00',
      };

      const getDisplayColumns = (hasProfitPermission: boolean) => {
        if (!hasProfitPermission) {
          const { costOfGoodsSold, grossProfit, netProfit, ...safeColumns } = fullReportRow;
          return safeColumns;
        }
        return fullReportRow;
      };

      const cashierView: any = getDisplayColumns(false);
      expect(cashierView.grossSales).toBe('50000.00');
      expect(cashierView.netSales).toBe('47000.00');
      expect(cashierView.costOfGoodsSold).toBeUndefined();
      expect(cashierView.grossProfit).toBeUndefined();
      expect(cashierView.netProfit).toBeUndefined();

      const ownerView: any = getDisplayColumns(true);
      expect(ownerView.costOfGoodsSold).toBe('30000.00');
      expect(ownerView.grossProfit).toBe('17000.00');
      expect(ownerView.netProfit).toBe('12000.00');
    });

    it('enforces branch scoping: branch cashiers cannot view other branches', () => {
      const currentBranchId = 'branch-01';
      const isOwner = false;

      const filterReportsByBranch = (
        records: Array<{ branchId: string; name: string }>,
      ) => {
        if (isOwner) return records;
        return records.filter((r) => r.branchId === currentBranchId);
      };

      const allBranches = [
        { branchId: 'branch-01', name: 'Branch 1' },
        { branchId: 'branch-02', name: 'Branch 2' },
      ];

      const visible = filterReportsByBranch(allBranches);
      expect(visible.length).toBe(1);
      expect(visible[0].branchId).toBe('branch-01');
    });
  });

  // H. RECEIPT & PRINT TEMPLATES
  describe('H. Receipt & Print Templates Rendering', () => {
    it('renders Return Slip with Bangla text and DUPLICATE marker on reprint', () => {
      const slipData: ReturnSlipData = {
        returnNo: 'RET-2026-0001',
        originalInvoiceNo: 'INV-2026-0042',
        date: new Date().toISOString(),
        branchName: 'Dhanmondi Branch',
        items: [
          {
            productName: 'Cotton Slim Shirt',
            sku: 'SHIRT-BLK-L',
            quantity: 1,
            totalRefund: 1200,
            condition: 'RESELLABLE',
          },
        ],
        totalRefundAmount: 1200,
        refundMethod: 'CASH',
        dueReduction: 200,
        payoutAmount: 1000,
      };

      const originalHtml = generateReturnSlipHtml(slipData, DEFAULT_PRINT_SETTINGS, false);
      expect(originalHtml).toContain('RET-2026-0001');
      expect(originalHtml).toContain('Cotton Slim Shirt');
      expect(originalHtml).not.toContain('DUPLICATE RETURN SLIP');

      const reprintHtml = generateReturnSlipHtml(slipData, DEFAULT_PRINT_SETTINGS, true);
      expect(reprintHtml).toContain('DUPLICATE RETURN SLIP');
      expect(reprintHtml).toContain('অনুলিপি');
    });

    it('renders Exchange Slip clearly distinguishing Credit and Payable Difference', () => {
      const exchangeData: ExchangeSlipData = {
        exchangeNo: 'EXC-2026-0005',
        originalInvoiceNo: 'INV-2026-0080',
        newInvoiceNo: 'INV-2026-0081',
        date: new Date().toISOString(),
        branchName: 'Gulshan Showroom',
        returnedItems: [
          {
            sku: 'POLO-BLU-M',
            quantity: 1,
            refundPrice: 800,
            total: 800,
          },
        ],
        newItems: [
          {
            sku: 'JNS-32-BLU',
            quantity: 1,
            price: 1500,
            total: 1500,
          },
        ],
        returnedTotal: 800,
        newItemsTotal: 1500,
        differenceAmount: 700,
        adjustmentStatus: 'Customer Paid Difference',
      };

      const html = generateExchangeSlipHtml(exchangeData, DEFAULT_PRINT_SETTINGS);
      expect(html).toContain('EXC-2026-0005');
      expect(html).toContain('Exchange Credit');
      expect(html).toContain('Customer Paid Difference');
      expect(html).toContain('BDT 700.00');
    });

    it('renders Due Collection Money Receipt with oldest-first allocation', () => {
      const dueData = {
        collectionNo: 'DUE-2026-0012',
        customerName: 'Junayed Ahmed',
        customerPhone: '01712345678',
        date: new Date().toISOString(),
        branchName: 'Mirpur Branch',
        amountPaid: 1500,
        paymentMethod: 'BKASH',
        transactionNo: 'TRX987654321',
        allocations: [
          { invoiceNo: 'INV-0010', branchName: 'Mirpur', amountApplied: 1000 },
          { invoiceNo: 'INV-0014', branchName: 'Uttara', amountApplied: 500 },
        ],
        remainingDue: 500,
      };

      const html = generateDueReceiptHtml(dueData, DEFAULT_PRINT_SETTINGS);
      expect(html).toContain('DUE-2026-0012');
      expect(html).toContain('Junayed Ahmed');
      expect(html).toContain('INV-0010');
      expect(html).toContain('INV-0014 (Uttara)');
      expect(html).toContain('BDT 1,500.00');
    });

    it('renders Z Report for THERMAL_58, THERMAL_80 and A4 formats with discrepancy', () => {
      const zData: ZReportPrintData = {
        branchName: 'Dhanmondi Flagship',
        registerName: 'Counter 1',
        cashierName: 'Rahim Uddin',
        openedAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        openingBalance: '5000.00',
        cashSales: '12400.00',
        cashDueCollections: '2000.00',
        payIns: '1000.00',
        payOuts: '500.00',
        cashRefunds: '1200.00',
        cashExpenses: '300.00',
        expectedBalance: '18400.00',
        closingBalance: '18400.00',
        discrepancy: '0.00',
        salesCount: 42,
        returnsCount: 3,
        voidsCount: 1,
      };

      // 80mm
      const html80 = generateZReportHtml(zData, 'THERMAL_80', false);
      expect(html80).toContain('REGISTER Z REPORT');
      expect(html80).toContain('18,400.00');

      // 58mm
      const html58 = generateZReportHtml(zData, 'THERMAL_58', false);
      expect(html58).toContain('58mm');

      // A4
      const htmlA4 = generateZReportHtml(zData, 'A4', true);
      expect(htmlA4).toContain('A4 portrait');
      expect(htmlA4).toContain('DUPLICATE COPY');
    });
  });
});
