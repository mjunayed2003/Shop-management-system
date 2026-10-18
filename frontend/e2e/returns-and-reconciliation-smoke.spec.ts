import { test, expect } from '@playwright/test';

test.describe('F5 Returns, Exchange, Due, Expenses, Cash & Register Close Smoke E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock authenticated session with all necessary F5 permissions
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'usr-manager-1',
              firstName: 'Rahim',
              lastName: 'Manager',
              fullName: 'Rahim Manager',
              email: 'manager@boutique.com',
              isOwner: true,
              role: { id: 'r-manager', name: 'Store Manager', code: 'MANAGER' },
            },
            business: {
              id: 'biz-1',
              name: 'Anzara Boutique BD',
              slug: 'anzara-boutique',
            },
            permissions: [
              '*',
              'sale.create',
              'sale.read',
              'sale.discount',
              'sale.cross_branch',
              'return.create',
              'return.cross_branch',
              'exchange.create',
              'due.collect',
              'expense.view',
              'expense.create',
              'expense.update',
              'expense.delete',
              'expense.approve',
              'cash.move',
              'register.close',
              'register.close_any',
              'report.view',
              'report.view_profit',
            ],
            token: 'mock-jwt-token',
          },
          version: 0,
        }),
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

    // Mock register session APIs
    await page.route('**/api/v1/sales/register-sessions/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'sess-active-1',
          cash_register_id: 'reg-1',
          user_id: 'usr-manager-1',
          opening_balance: 5000,
          status: 'OPEN',
          opened_at: new Date().toISOString(),
          cash_register: { id: 'reg-1', name: 'Counter 1', code: 'REG-1' },
        }),
      });
    });

    await page.route('**/api/v1/sales/register-sessions/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'sess-active-1',
            cash_register: { id: 'reg-1', name: 'Counter 1', code: 'REG-1' },
            user: { id: 'usr-manager-1', first_name: 'Rahim', last_name: 'Manager' },
            opened_at: new Date().toISOString(),
          },
          opening_balance: '5000.00',
          cash_sales: '8500.00',
          cash_due_collections: '1500.00',
          pay_ins: '500.00',
          pay_outs: '200.00',
          cash_refunds: '600.00',
          cash_expenses: '350.00',
          expected_balance: '14350.00',
          non_cash_totals: { BKASH: '2500.00', NAGAD: '1200.00', BANK: '5000.00' },
          sales_count: 12,
          returns_count: 2,
          voids_count: 0,
        }),
      });
    });
  });

  test('1. Sales Return screen loads and validates max returnable quantity', async ({ page }) => {
    // Mock single sale lookup
    await page.route('**/api/v1/sales/sale-101', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'sale-101',
          invoice_no: 'INV-2026-0101',
          branch_id: 'branch-main-1',
          status: 'COMPLETED',
          created_at: new Date().toISOString(),
          customer: { id: 'cust-1', name: 'Farhan Ahmed', phone: '01711223344', current_due: '0.00' },
          items: [
            {
              id: 's-item-1',
              sku: 'TSHIRT-NVY-M',
              product_name: 'Navy Cotton Tee',
              quantity: 3,
              returned_quantity: 1,
              unit_price: '800.00',
              unit_cost: '450.00',
              total_price: '2400.00',
              discount_amount: '0.00',
            },
          ],
          payments: [{ payment_method: 'CASH', amount: '2400.00' }],
        }),
      });
    });

    await page.goto('/sales/sale-101/return');

    // Verify invoice number and max returnable calculation
    await expect(page.locator('body')).toContainText('INV-2026-0101');
    await expect(page.locator('body')).toContainText('Navy Cotton Tee');
    await expect(page.locator('body')).toContainText('Max Returnable: 2');
  });

  test('2. Product Exchange screen loads guided wizard', async ({ page }) => {
    await page.goto('/sales/exchange');
    await expect(page.locator('body')).toContainText('Product Exchange');
    await expect(page.locator('body')).toContainText('Find Sale');
    await expect(page.locator('body')).toContainText('Exchange Credit (Returned Items Value)');
  });

  test('3. Due Collection Hub allows customer lookup', async ({ page }) => {
    await page.route('**/api/v1/customers/lookup*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cust-2',
          name: 'Tanvir Hossain',
          phone: '+8801812345678',
          current_due: '3500.00',
          credit_limit: '10000.00',
          branch_dues: [
            { branchId: 'branch-main-1', branchName: 'Main Flagship', dueAmount: '2000.00' },
            { branchId: 'branch-outlet-2', branchName: 'Gulshan Outlet', dueAmount: '1500.00' },
          ],
        }),
      });
    });

    await page.route('**/api/v1/sales/due-collections*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      });
    });

    await page.goto('/customers/due');
    await expect(page.locator('body')).toContainText('Customer Due Collection');
  });

  test('4. Showroom Expenses list and reports view', async ({ page }) => {
    await page.route('**/api/v1/expenses/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cat-1', name: 'Office Refreshments', code: 'REFRESH' },
          { id: 'cat-2', name: 'Showroom Electricity', code: 'ELEC' },
        ]),
      });
    });

    await page.route('**/api/v1/expenses?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'exp-1',
              expense_no: 'EXP-0001',
              amount: '450.00',
              tax_amount: '0.00',
              total_amount: '450.00',
              expense_date: new Date().toISOString(),
              vendor_name: 'Tasty Treats',
              receipt_no: 'TT-9871',
              description: 'Guest tea and snacks',
              paid_from_register: true,
              category: { id: 'cat-1', name: 'Office Refreshments' },
              branch: { id: 'branch-main-1', name: 'Main Flagship' },
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      });
    });

    await page.goto('/expenses');
    await expect(page.locator('body')).toContainText('Showroom Expenses');
    await expect(page.locator('body')).toContainText('EXP-0001');
    await expect(page.locator('body')).toContainText('Tasty Treats');
    await expect(page.locator('body')).toContainText('Drawer Cash');
  });

  test('5. Register Close wizard displays denomination counting & discrepancy', async ({ page }) => {
    await page.goto('/pos/register/close');
    await expect(page.locator('body')).toContainText('Close Register Shift (Z Report)');
    await expect(page.locator('body')).toContainText('1. Cash Count');
    await expect(page.locator('body')).toContainText('Total Counted Cash');
  });

  test('6. Profit & Loss Report renders branch metrics', async ({ page }) => {
    await page.route('**/api/v1/sales/reports/profit*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          branches: [
            {
              branchId: 'branch-main-1',
              branchName: 'Main Flagship',
              branchCode: 'MAIN-01',
              grossSales: '120000.00',
              discounts: '5000.00',
              salesReturns: '3000.00',
              netSales: '112000.00',
              costOfGoodsSold: '65000.00',
              grossProfit: '47000.00',
              expenses: '12000.00',
              damageLoss: '1500.00',
              netProfit: '35000.00',
            },
          ],
          combinedTotal: {
            grossSales: '120000.00',
            discounts: '5000.00',
            salesReturns: '3000.00',
            netSales: '112000.00',
            costOfGoodsSold: '65000.00',
            grossProfit: '47000.00',
            expenses: '12000.00',
            damageLoss: '1500.00',
            netProfit: '35000.00',
          },
        }),
      });
    });

    await page.goto('/reports/profit');
    await expect(page.locator('body')).toContainText('Profit & Loss Analysis');
    await expect(page.locator('body')).toContainText('Main Flagship');
    await expect(page.locator('body')).toContainText('Net Profit');
  });
});
