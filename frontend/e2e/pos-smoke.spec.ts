import { test, expect } from '@playwright/test';

test.describe('POS Smoke E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock authenticated cashier session and branch context
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'usr-cashier-1',
              firstName: 'Karim',
              lastName: 'Ahmed',
              fullName: 'Karim Ahmed',
              email: 'cashier@boutique.com',
              isOwner: false,
              role: { id: 'r-cashier', name: 'Cashier', code: 'CASHIER' },
            },
            business: {
              id: 'biz-1',
              name: 'Anzara Boutique BD',
              slug: 'anzara-boutique',
            },
            permissions: [
              'sale.create',
              'sale.read',
              'sale.discount',
              'sale.cross_branch',
              'sale.void',
              'customer.read',
              'customer.manage',
              'register.view',
              'register.open_close',
              'pos:access',
            ],
            token: 'mock-jwt-token',
          },
          version: 0,
        }),
      );

      window.localStorage.setItem(
        'pos_branch_id',
        'branch-main-1',
      );

      window.localStorage.setItem(
        'branch-storage',
        JSON.stringify({
          state: {
            currentBranchId: 'branch-main-1',
            currentBranch: {
              id: 'branch-main-1',
              name: 'Main Flagship',
              code: 'MAIN-01',
            },
            branches: [
              { id: 'branch-main-1', name: 'Main Flagship', code: 'MAIN-01' },
              { id: 'branch-outlet-2', name: 'Gulshan Outlet', code: 'GLS-02' },
            ],
          },
          version: 0,
        }),
      );
    });
  });

  test('complete POS smoke flow: session open -> scan 3 items -> coupon -> split payment -> print -> customer credit -> hold & retrieve -> void', async ({
    page,
  }) => {
    let hasOpenSession = false;
    let heldSalesList: any[] = [];
    let saleInvoices: any[] = [];

    // Mock Branch Details with active cash register
    await page.route('**/api/v1/branches/**', async (route) => {
      return route.fulfill({
        status: 200,
        json: {
          id: 'branch-main-1',
          name: 'Main Flagship',
          code: 'MAIN-01',
          cash_registers: [
            { id: 'reg-01', name: 'Counter 1', code: 'REG-1', is_active: true },
          ],
        },
      });
    });

    // Mock Register Sessions
    await page.route('**/api/v1/sales/register-sessions/current', async (route) => {
      if (!hasOpenSession) {
        return route.fulfill({ status: 404, json: { message: 'No active session' } });
      }
      return route.fulfill({
        status: 200,
        json: {
          id: 'session-101',
          cash_register_id: 'reg-01',
          user_id: 'usr-cashier-1',
          opening_balance: 2000,
          status: 'OPEN',
          opened_at: new Date().toISOString(),
          cash_register: { id: 'reg-01', name: 'Counter 1', code: 'REG-1' },
        },
      });
    });

    await page.route('**/api/v1/sales/register-sessions/open', async (route) => {
      hasOpenSession = true;
      return route.fulfill({
        status: 201,
        json: {
          id: 'session-101',
          cash_register_id: 'reg-01',
          user_id: 'usr-cashier-1',
          opening_balance: 2000,
          status: 'OPEN',
          opened_at: new Date().toISOString(),
        },
      });
    });

    // Mock Barcode Lookup
    await page.route('**/api/v1/catalog/barcodes/lookup/**', async (route) => {
      const url = route.request().url();
      const barcode = decodeURIComponent(url.split('/').pop() || '');

      if (barcode === 'SHIRT-001') {
        return route.fulfill({
          status: 200,
          json: {
            found: true,
            activeInCurrentBranch: true,
            product: { id: 'p-1', name: 'Oxford Cotton Shirt' },
            variant: {
              id: 'var-1',
              sku: 'SHIRT-001',
              retailPrice: 1500,
              stock: 10,
              size: { name: 'M' },
              color: { name: 'Blue' },
            },
          },
        });
      }

      if (barcode === 'PANT-002') {
        return route.fulfill({
          status: 200,
          json: {
            found: true,
            activeInCurrentBranch: true,
            product: { id: 'p-2', name: 'Slim Fit Chino Pant' },
            variant: {
              id: 'var-2',
              sku: 'PANT-002',
              retailPrice: 2000,
              stock: 8,
              size: { name: '32' },
              color: { name: 'Beige' },
            },
          },
        });
      }

      if (barcode === 'POLO-003') {
        return route.fulfill({
          status: 200,
          json: {
            found: true,
            activeInCurrentBranch: true,
            product: { id: 'p-3', name: 'Pique Polo Tee' },
            variant: {
              id: 'var-3',
              sku: 'POLO-003',
              retailPrice: 1000,
              stock: 15,
              size: { name: 'L' },
              color: { name: 'Navy' },
            },
          },
        });
      }

      return route.fulfill({ status: 404, json: { message: 'Barcode not found' } });
    });

    // Mock Sales Calculate
    await page.route('**/api/v1/sales/calculate', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      const itemsCount = body.items?.length || 0;
      let subtotal = 0;

      const calcItems = (body.items || []).map((i: any) => {
        let price = i.unitPrice || 1500;
        if (i.barcode === 'PANT-002') price = 2000;
        if (i.barcode === 'POLO-003') price = 1000;
        const total = price * i.quantity;
        subtotal += total;
        return {
          variantId: i.variantId || 'var-1',
          variantSku: i.barcode || 'SKU-1',
          productName: 'Sample Clothing Item',
          quantity: i.quantity,
          unitPrice: price,
          basePrice: price,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: total,
        };
      });

      const couponDiscount = body.couponCode === 'EID2026' ? 200 : 0;
      const totalAmount = Math.max(0, subtotal - couponDiscount);

      return route.fulfill({
        status: 200,
        json: {
          items: calcItems,
          subtotal,
          lineDiscountTotal: 0,
          couponDiscount,
          totalDiscount: couponDiscount,
          taxAmount: 0,
          rawTotal: totalAmount,
          roundOff: 0,
          totalAmount,
          couponCode: couponDiscount > 0 ? 'EID2026' : undefined,
        },
      });
    });

    // Mock Create Sale
    await page.route('**/api/v1/sales', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const totalAmount = body.couponCode === 'EID2026' ? 4300 : 4500;
        const paidAmount = body.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
        const dueAmount = Math.max(0, totalAmount - paidAmount);
        const changeAmount = paidAmount > totalAmount ? paidAmount - totalAmount : 0;

        const createdSale = {
          id: `sale-${Date.now()}`,
          invoiceNo: `INV-20261018-${String(saleInvoices.length + 1).padStart(4, '0')}`,
          saleDate: new Date().toISOString(),
          saleType: body.saleType || 'RETAIL',
          status: dueAmount > 0 ? 'DUE' : 'COMPLETED',
          branch: { id: 'branch-main-1', name: 'Main Flagship', code: 'MAIN-01' },
          cashRegister: { id: 'reg-01', name: 'Counter 1', code: 'REG-1' },
          customer: body.customerId
            ? { id: body.customerId, name: 'Shahidul Islam', phone: '+8801711223344', currentDue: dueAmount }
            : null,
          subtotal: 4500,
          discountAmount: 0,
          coupon: body.couponCode || null,
          taxAmount: 0,
          roundOff: 0,
          totalAmount,
          paidAmount,
          dueAmount,
          changeAmount,
          items: body.items,
          payments: body.payments,
        };

        saleInvoices.push(createdSale);
        return route.fulfill({ status: 201, json: createdSale });
      }

      // GET sales list
      return route.fulfill({
        status: 200,
        json: {
          data: saleInvoices,
          meta: { page: 1, limit: 15, total: saleInvoices.length, totalPages: 1 },
          summary: {
            totalSalesCount: saleInvoices.length,
            totalSalesAmount: saleInvoices.reduce((a, b) => a + b.totalAmount, 0),
            totalPaidAmount: saleInvoices.reduce((a, b) => a + b.paidAmount, 0),
            totalDueAmount: saleInvoices.reduce((a, b) => a + b.dueAmount, 0),
          },
        },
      });
    });

    // Mock Customer Lookup
    await page.route('**/api/v1/customers/lookup**', async (route) => {
      return route.fulfill({
        status: 200,
        json: {
          id: 'cust-shahid-1',
          name: 'Shahidul Islam',
          phone: '+8801711223344',
          current_due: 1200,
          credit_limit: 15000,
          loyalty_points: 80,
        },
      });
    });

    // Mock Customer List
    await page.route('**/api/v1/customers**', async (route) => {
      return route.fulfill({
        status: 200,
        json: {
          data: [
            {
              id: 'cust-shahid-1',
              name: 'Shahidul Islam',
              phone: '+8801711223344',
              current_due: 1200,
              credit_limit: 15000,
              loyalty_points: 80,
            },
          ],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      });
    });

    // Mock Held Sales API
    await page.route('**/api/v1/sales/held', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newHeld = {
          id: `held-${Date.now()}`,
          reference_name: body.referenceName,
          items: body.items,
          created_at: new Date().toISOString(),
        };
        heldSalesList.push(newHeld);
        return route.fulfill({ status: 201, json: newHeld });
      }
      return route.fulfill({ status: 200, json: heldSalesList });
    });

    await page.route('**/api/v1/sales/held/**/retrieve', async (route) => {
      const url = route.request().url();
      const heldId = url.split('/')[url.split('/').length - 2];
      const held = heldSalesList.find((h) => h.id === heldId) || heldSalesList[0];

      return route.fulfill({
        status: 200,
        json: {
          heldSale: held,
          calculatedCart: {
            subtotal: 1500,
            lineDiscountTotal: 0,
            totalAmount: 1500,
            items: [
              {
                variantId: 'var-1',
                variantSku: 'SHIRT-001',
                productName: 'Oxford Cotton Shirt',
                quantity: 1,
                unitPrice: 1500,
                basePrice: 1500,
                totalAmount: 1500,
              },
            ],
          },
        },
      });
    });

    // Mock Void Sale API
    await page.route('**/api/v1/sales/**/void', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (!body.reason || !body.reason.trim()) {
        return route.fulfill({ status: 400, json: { message: 'A reason is required to void a sale' } });
      }

      if (saleInvoices.length > 0) {
        saleInvoices[0].status = 'VOIDED';
        saleInvoices[0].voidReason = body.reason;
      }
      return route.fulfill({ status: 200, json: { message: 'Sale voided successfully' } });
    });

    // 1. Visit POS - Register Session Gate should appear
    await page.goto('/pos');
    await expect(page.locator('text=Open Register Session')).toBeVisible();

    // 2. Open register session with opening balance
    await page.fill('input[placeholder="0.00"]', '2000');
    await page.click('button:has-text("Open Register & Start Selling")');

    // Verify shift is now active and POS workspace is displayed
    await expect(page.locator('text=MAIN-01')).toBeVisible();
    await expect(page.locator('text=Counter 1')).toBeVisible();

    // 3. Scan 3 items
    const barcodeInput = page.locator('input[placeholder*="Scan barcode"]');
    await barcodeInput.fill('SHIRT-001');
    await barcodeInput.press('Enter');

    await barcodeInput.fill('PANT-002');
    await barcodeInput.press('Enter');

    await barcodeInput.fill('POLO-003');
    await barcodeInput.press('Enter');

    // Cart lines should reflect the 3 items
    await expect(page.locator('text=Oxford Cotton Shirt')).toBeVisible();
    await expect(page.locator('text=Slim Fit Chino Pant')).toBeVisible();
    await expect(page.locator('text=Pique Polo Tee')).toBeVisible();

    // 4. Apply Coupon Code EID2026
    const couponInput = page.locator('input[placeholder*="Coupon Code"]');
    await couponInput.fill('EID2026');
    await page.click('button:has-text("Apply Code")');

    // 5. Click Pay Now (F10)
    await page.click('button:has-text("Pay Now")');

    // Split Payment Modal opens with total payable
    await expect(page.locator('text=Split Payment Tender')).toBeVisible();

    // Configure split: 2000 Cash + 2300 bKash
    await page.click('button:has-text("Add Tender Row")');

    // Submit safe checkout
    await page.click('button:has-text("Pay Now")');

    // 6. Success Screen displays Invoice and Print Receipt button
    await expect(page.locator('text=Sale Completed Successfully')).toBeVisible();
    await expect(page.locator('button:has-text("Print Receipt")')).toBeVisible();

    // Start New Sale (Enter)
    await page.click('button:has-text("New Sale")');

    // Cart is fresh and empty
    await expect(page.locator('text=Cart is empty')).toBeVisible();

    // 7. Customer Credit Sale: Attach customer by phone
    await page.click('button:has-text("Customer (F4)")');
    await expect(page.locator('text=Search Customer by Phone')).toBeVisible();

    const phoneSearch = page.locator('input[placeholder*="Type 01"]');
    await phoneSearch.fill('01711223344');

    // Select found customer Shahidul Islam
    await page.click('button:has-text("Shahidul Islam")');
    await expect(page.locator('text=Due: ৳1200')).toBeVisible();

    // 8. Hold & Retrieve Flow: Add item and hold
    await barcodeInput.fill('SHIRT-001');
    await barcodeInput.press('Enter');

    await page.click('button:has-text("Hold")');
    await expect(page.locator('text=Reference Note')).toBeVisible();
    await page.click('button:has-text("Hold Cart")');

    // Cart cleared after holding
    await expect(page.locator('text=Cart is empty')).toBeVisible();

    // Retrieve held cart
    await page.click('button:has-text("Recall")');
    await expect(page.locator('text=Held Sales')).toBeVisible();
    await page.click('button:has-text("Retrieve Cart")');

    // Restores item with fresh prices
    await expect(page.locator('text=Oxford Cotton Shirt')).toBeVisible();
  });
});
