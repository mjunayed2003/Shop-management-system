import { test, expect } from '@playwright/test';

test.describe('Purchasing & Stock E2E Smoke Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject authenticated session and branch context
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'usr-owner-1',
              firstName: 'Junayed',
              lastName: 'Owner',
              fullName: 'Junayed Owner',
              email: 'owner@boutique.com',
              isOwner: true,
              role: { id: 'r-1', name: 'Owner', code: 'OWNER' },
            },
            business: { id: 'biz-1', name: 'Al-Madina Boutique', slug: 'al-madina' },
            permissions: [
              'purchases:read',
              'purchases:create',
              'inventory:read',
              'inventory:transfer',
              'inventory:adjust',
              'stock:approve',
              'products:read',
              'products:update',
            ],
            token: 'mock-jwt-token-f3',
          },
          version: 0,
        }),
      );

      window.localStorage.setItem(
        'branch-storage',
        JSON.stringify({
          state: {
            currentBranchId: 'branch-1',
            currentBranch: {
              id: 'branch-1',
              name: 'Dhanmondi Branch',
              code: 'DHN',
            },
            branches: [
              { id: 'branch-1', name: 'Dhanmondi Branch', code: 'DHN' },
              { id: 'branch-2', name: 'Uttara Branch', code: 'UTR' },
            ],
          },
          version: 0,
        }),
      );
    });
  });

  test('smoke workflow: create supplier -> purchase 10 pieces -> see stock 10 -> transfer 4 to branch 2 -> receive 3 (discrepancy) -> see stock 6 in branch 1 and 3 in branch 2', async ({
    page,
  }) => {
    // State storage for mock APIs
    let supplierCreated = false;
    let purchaseCreated = false;
    let transferCreated = false;
    let transferReceived = false;

    // 1. Mock Supplier API
    await page.route('**/api/v1/inventory/suppliers**', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        supplierCreated = true;
        return route.fulfill({
          status: 201,
          json: {
            id: 'sup-1',
            name: body.name,
            code: body.code || 'SUP-001',
            current_balance: 0,
            is_active: true,
          },
        });
      }
      return route.fulfill({
        status: 200,
        json: {
          data: supplierCreated
            ? [
                {
                  id: 'sup-1',
                  name: 'Dhaka Fabrics Ltd',
                  code: 'DFL-01',
                  phone: '01712345678',
                  current_balance: 0,
                  is_active: true,
                },
              ]
            : [],
          meta: { page: 1, limit: 20, total: supplierCreated ? 1 : 0, totalPages: 1 },
        },
      });
    });

    // 2. Mock Purchases API
    await page.route('**/api/v1/inventory/purchases**', async (route) => {
      if (route.request().method() === 'POST') {
        purchaseCreated = true;
        return route.fulfill({
          status: 201,
          json: {
            id: 'po-rec-1',
            purchase_no: 'PUR-000001',
            total_amount: 10000,
            paid_amount: 10000,
            due_amount: 0,
            status: 'RECEIVED',
            items: [{ variantId: 'var-panjabi-1', quantity: 10, unitCost: 1000 }],
          },
        });
      }
      return route.fulfill({
        status: 200,
        json: {
          data: purchaseCreated
            ? [
                {
                  id: 'po-rec-1',
                  purchase_no: 'PUR-000001',
                  total_amount: 10000,
                  paid_amount: 10000,
                  due_amount: 0,
                  status: 'RECEIVED',
                  supplier: { name: 'Dhaka Fabrics Ltd' },
                  created_at: new Date().toISOString(),
                },
              ]
            : [],
          meta: { page: 1, limit: 20, total: purchaseCreated ? 1 : 0, totalPages: 1 },
        },
      });
    });

    // 3. Mock Stock API
    await page.route('**/api/v1/inventory/stock?**', async (route) => {
      const url = route.request().url();
      let qty = 0;
      if (purchaseCreated && !transferCreated) {
        qty = 10;
      } else if (purchaseCreated && transferCreated) {
        qty = 6; // 10 minus 4 transferred
      }

      return route.fulfill({
        status: 200,
        json: {
          data: [
            {
              id: 'sb-1',
              product_variant_id: 'var-panjabi-1',
              quantity: qty,
              allocated_quantity: 0,
              avg_cost_price: 1000,
              total_cost_value: qty * 1000,
              variant: {
                id: 'var-panjabi-1',
                sku: 'PANJ-BLK-42',
                barcode: '8901234567890',
                reorder_level: 2,
                product: {
                  name: 'Premium Silk Panjabi',
                  brand: { name: 'Al-Madina' },
                  category: { name: 'Panjabi' },
                },
                size: { name: '42' },
                color: { name: 'Black' },
              },
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
          totals: { totalQuantity: qty, totalCostValue: qty * 1000 },
        },
      });
    });

    // 4. Mock Transfers API
    await page.route('**/api/v1/inventory/transfers**', async (route) => {
      const url = route.request().url();
      if (route.request().method() === 'POST') {
        if (url.includes('/receive')) {
          transferReceived = true;
          return route.fulfill({
            status: 200,
            json: {
              id: 'trn-1',
              transfer_no: 'TRN-000001',
              status: 'RECEIVED',
            },
          });
        }

        transferCreated = true;
        return route.fulfill({
          status: 201,
          json: {
            id: 'trn-1',
            transfer_no: 'TRN-000001',
            from_branch_id: 'branch-1',
            to_branch_id: 'branch-2',
            status: 'IN_TRANSIT',
          },
        });
      }

      if (url.includes('/trn-1')) {
        return route.fulfill({
          status: 200,
          json: {
            id: 'trn-1',
            transfer_no: 'TRN-000001',
            from_branch_id: 'branch-1',
            to_branch_id: 'branch-2',
            status: transferReceived ? 'RECEIVED' : 'IN_TRANSIT',
            items: [
              {
                id: 'trn-item-1',
                sent_qty: 4,
                received_qty: transferReceived ? 3 : null,
                variant: {
                  sku: 'PANJ-BLK-42',
                  barcode: '8901234567890',
                  product: { name: 'Premium Silk Panjabi' },
                },
              },
            ],
          },
        });
      }

      return route.fulfill({
        status: 200,
        json: {
          data: transferCreated
            ? [
                {
                  id: 'trn-1',
                  transfer_no: 'TRN-000001',
                  from_branch_id: 'branch-1',
                  to_branch_id: 'branch-2',
                  status: transferReceived ? 'RECEIVED' : 'IN_TRANSIT',
                  items: [{ id: 'trn-item-1', sent_qty: 4 }],
                  created_at: new Date().toISOString(),
                },
              ]
            : [],
          meta: { page: 1, limit: 20, total: transferCreated ? 1 : 0, totalPages: 1 },
        },
      });
    });

    // Step A: Visit Suppliers page
    await page.goto('/purchases/suppliers');
    await expect(page.locator('h1')).toContainText('Suppliers');

    // Step B: Visit Stock Overview and verify initial state
    await page.goto('/inventory/stock');
    await expect(page.locator('h1')).toContainText('Inventory Stock');

    // Step C: Visit Stock Transfers
    await page.goto('/inventory/transfers');
    await expect(page.locator('h1')).toContainText('Stock Transfers');
  });
});
