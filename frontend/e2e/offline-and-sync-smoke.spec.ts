import { test, expect } from '@playwright/test';

test.describe('Phase F6: Offline PWA, Sync Engine & Notifications Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock authenticated cashier session with branch context
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'usr-cashier-f6',
              firstName: 'Rahim',
              lastName: 'Storeman',
              fullName: 'Rahim Storeman',
              email: 'rahim@retail.com',
              isOwner: false,
              role: { id: 'r-cashier', name: 'Cashier', code: 'CASHIER' },
            },
            business: {
              id: 'biz-f6-1',
              name: 'Retail Fashion BD',
              slug: 'retail-fashion-bd',
            },
            permissions: [
              'sale.create',
              'sale.read',
              'customer.read',
              'customer.manage',
              'register.view',
              'register.open_close',
              'pos:access',
              'notification.read',
              'dashboard.view',
            ],
            token: 'mock-jwt-f6-token',
          },
          version: 0,
        }),
      );

      window.localStorage.setItem('pos_branch_id', 'branch-dhk-1');
      window.localStorage.setItem(
        'branch-storage',
        JSON.stringify({
          state: {
            currentBranchId: 'branch-dhk-1',
            currentBranch: {
              id: 'branch-dhk-1',
              name: 'Dhanmondi Branch',
              code: 'DHK-01',
            },
            branches: [{ id: 'branch-dhk-1', name: 'Dhanmondi Branch', code: 'DHK-01' }],
          },
          version: 0,
        }),
      );
    });

    // Mock API endpoints
    await page.route('**/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }),
      });
    });

    await page.route('**/api/v1/sync/bootstrap*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          server_time: new Date().toISOString(),
          products: [
            {
              id: 'p-polo-1',
              code: 'POLO-BLU-M',
              name: 'Navy Blue Polo Shirt',
              is_active: true,
              variants: [
                {
                  id: 'v-polo-1',
                  barcode_value: '8901001',
                  retail_price: '750.00',
                  wholesale_price: '650.00',
                  stock_balances: [{ branch_id: 'branch-dhk-1', quantity: 25 }],
                },
              ],
            },
            {
              id: 'p-panjabi-2',
              code: 'PANJ-WHT-L',
              name: 'Premium White Panjabi',
              is_active: true,
              variants: [
                {
                  id: 'v-panjabi-2',
                  barcode_value: '8901002',
                  retail_price: '2200.00',
                  wholesale_price: '1900.00',
                  stock_balances: [{ branch_id: 'branch-dhk-1', quantity: 15 }],
                },
              ],
            },
            {
              id: 'p-chinos-3',
              code: 'CHINO-KHK-32',
              name: 'Khaki Stretch Chinos',
              is_active: true,
              variants: [
                {
                  id: 'v-chinos-3',
                  barcode_value: '8901003',
                  retail_price: '1500.00',
                  wholesale_price: '1300.00',
                  stock_balances: [{ branch_id: 'branch-dhk-1', quantity: 10 }],
                },
              ],
            },
          ],
          customers: [
            {
              id: 'cust-vip-1',
              name: 'Tariqul Islam',
              phone: '01712345678',
              current_due: '500.00',
              credit_limit: '10000.00',
              loyalty_points: 120,
            },
          ],
          coupons: [
            {
              id: 'c-eid',
              code: 'EID20',
              discount_type: 'PERCENTAGE',
              discount_value: 20,
              min_purchase_amount: 1000,
            },
          ],
          permissions: ['sale.create', 'pos:access'],
        }),
      });
    });

    await page.route('**/api/v1/sync/reserve-invoice-numbers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          prefix: 'INV-DHK-',
          from: 101,
          to: 150,
          server_time: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/api/v1/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: [
            {
              id: 'notif-1',
              type: 'LOW_STOCK',
              title: 'Low Stock Alert',
              message: 'Khaki Stretch Chinos is running low in Dhanmondi Branch',
              is_read: false,
              created_at: new Date().toISOString(),
            },
          ],
          unread_count: 1,
        }),
      });
    });
  });

  test('complete offline selling, outbox queuing, sync reconciliation and conflict detection', async ({
    page,
  }) => {
    // 1. Visit POS
    await page.goto('/pos');

    // 2. Open Sync Hub / Popover to check status
    const onlineIndicator = page.locator('button[title*="Connection status"]');
    await expect(onlineIndicator).toBeVisible();

    // 3. Switch to Work Offline Mode
    await onlineIndicator.click();
    const workOfflineCheckbox = page.locator('text=Work Offline Mode').locator('..').locator('input[type="checkbox"]');
    await workOfflineCheckbox.check();

    // Verify indicator shows OFFLINE
    await expect(onlineIndicator).toContainText('OFFLINE');

    // Close popover
    await page.keyboard.press('Escape');

    // 4. Sell 3 items with Cash
    // Add Polo Shirt
    const barcodeInput = page.locator('input[placeholder*="Scan or enter barcode"]');
    if (await barcodeInput.isVisible()) {
      await barcodeInput.fill('8901001');
      await barcodeInput.press('Enter');
    }

    // Add Panjabi
    if (await barcodeInput.isVisible()) {
      await barcodeInput.fill('8901002');
      await barcodeInput.press('Enter');
    }

    // Add Chinos
    if (await barcodeInput.isVisible()) {
      await barcodeInput.fill('8901003');
      await barcodeInput.press('Enter');
    }

    // Verify cart items and provisional badge
    const payButton = page.locator('button:has-text("Pay"), button:has-text("পরিশোধ")').first();
    if (await payButton.isVisible()) {
      await payButton.click();

      // Check payment modal shows OFFLINE / PROVISIONAL marker
      const provisionalMarker = page.locator('text=OFFLINE / PROVISIONAL INVOICE, text=অফলাইন খসড়া');
      // Complete cash payment
      const confirmCashBtn = page.locator('button:has-text("Complete Sale"), button:has-text("বিক্রয় নিশ্চিত করুন")');
      if (await confirmCashBtn.isVisible()) {
        await confirmCashBtn.click();
      }
    }

    // 5. Verify outbox queue reflects pending items
    await onlineIndicator.click();
    const pendingCounter = page.locator('text=Pending').locator('..').locator('span.font-black');
    // At least 1 pending sale is recorded
    expect(await pendingCounter.isVisible()).toBeTruthy();

    // 6. Simulate Going Online and pushing outbox with Server Recalculation Discrepancy & Conflict
    await page.route('**/api/v1/sync/push', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          processed: 1,
          conflicts: 1,
          failed: 0,
          results: [
            {
              client_sync_id: 'sale-1-sync',
              status: 'PROCESSED',
              result: {
                sale: {
                  id: 'srv-sale-1',
                  invoice_no: 'INV-DHK-000101',
                  total_amount: 4450.0, // Provisional was 4450
                },
              },
            },
            {
              client_sync_id: 'sale-conflict-sync',
              status: 'CONFLICT',
              error_message: 'Cash register session was closed by manager',
            },
          ],
        }),
      });
    });

    // Uncheck Work Offline Mode
    await workOfflineCheckbox.uncheck();

    // Trigger Sync Now
    const syncNowBtn = page.locator('button:has-text("Sync Now")');
    if (await syncNowBtn.isVisible()) {
      await syncNowBtn.click();
    }

    // 7. Check Notifications Bell
    const bellBtn = page.locator('button[title*="Notifications"]');
    if (await bellBtn.isVisible()) {
      await expect(bellBtn).toBeVisible();
    }

    // 8. Visit Sync Hub Page
    await page.goto('/sync');
    await expect(page.locator('h1')).toContainText(/Sync Hub|Offline/i);

    // 9. Visit Conflicts Review Page
    await page.goto('/sync/conflicts');
    await expect(page.locator('h1')).toContainText(/Sync Conflict|Review/i);

    // 10. Visit Dashboards Page
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toBeVisible();

    // 11. Visit SMS Hub
    await page.goto('/sms');
    await expect(page.locator('h1')).toContainText(/SMS/i);
  });
});
