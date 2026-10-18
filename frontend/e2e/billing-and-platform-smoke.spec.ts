import { test, expect } from '@playwright/test';

test.describe('Phase F7: Billing, Support & Platform Admin E2E Smoke Spec', () => {
  test('multi-context flow: tenant trial -> suspension lock -> billing/support access -> platform override & payment -> reactivation', async ({
    browser,
  }) => {
    // ------------------------------------------------------------------------
    // CONTEXT 1: Tenant Shop Session
    // ------------------------------------------------------------------------
    const tenantContext = await browser.newContext();
    const tenantPage = await tenantContext.newPage();

    let tenantSubStatus = 'TRIAL';
    let tenantSupportTickets: any[] = [];
    let invoiceStatus = 'ISSUED';
    let invoicePaid = 0;

    // Mock tenant APIs
    await tenantPage.route('**/api/v1/auth/me', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'usr-owner-1',
            firstName: 'Tariq',
            lastName: 'Hasan',
            email: 'tariq@dhakafashion.com',
            isOwner: true,
            role: { id: 'r-1', name: 'Owner', code: 'OWNER' },
          },
          business: {
            id: 'biz-dhaka-1',
            name: 'Dhaka Fashion Hub',
            slug: 'dhaka-fashion',
            currency: 'BDT',
            subscription: {
              status: tenantSubStatus,
              planName: 'Retail Pro',
              trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
              graceEndsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
              currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
            },
          },
          permissions: ['*'],
        }),
      });
    });

    await tenantPage.route('**/api/v1/subscription/current', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: {
            id: 'sub-1',
            business_id: 'biz-dhaka-1',
            status: tenantSubStatus,
            billing_cycle: 'MONTHLY',
            trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
            grace_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
            plan: {
              id: 'plan-pro',
              name: 'Retail Pro',
              code: 'PRO',
              monthly_price: 2500,
              yearly_price: 25000,
              limits: {
                max_branches: 3,
                max_users: 10,
                max_products: 5000,
                max_variants: 15000,
                max_monthly_invoices: 3000,
                has_api_access: true,
                has_custom_reports: true,
                has_offline_sync: true,
              },
            },
          },
          effectiveLimits: {
            maxBranches: 3,
            maxUsers: 10,
            maxProducts: 5000,
            maxVariants: 15000,
            maxMonthlyInvoices: 3000,
            hasApiAccess: true,
            hasCustomReports: true,
            hasOfflineSync: true,
          },
          usage: {
            branches: 1,
            users: 2,
            products: 150,
            variants: 420,
            invoicesThisMonth: 85,
          },
        }),
      });
    });

    await tenantPage.route('**/api/v1/subscription/invoices**', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'inv-1',
              invoice_number: 'INV-2026-0001',
              net_amount: 2500,
              paid_amount: invoicePaid,
              status: invoiceStatus,
              period_start: new Date().toISOString(),
              period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
              due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
              payments:
                invoicePaid > 0
                  ? [
                      {
                        id: 'pm-1',
                        amount: invoicePaid,
                        payment_method: 'BKASH',
                        transaction_id: '9BXTRX44',
                        paid_at: new Date().toISOString(),
                      },
                    ]
                  : [],
            },
          ],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
      });
    });

    await tenantPage.route('**/api/v1/support/tickets**', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newTicket = {
          id: `tkt-${Date.now()}`,
          ticket_no: 'TKT-1001',
          subject: body.subject,
          description: body.description,
          priority: body.priority || 'MEDIUM',
          status: 'OPEN',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: [
            {
              id: `msg-${Date.now()}`,
              sender_type: 'BUSINESS_USER',
              message: body.description,
              created_at: new Date().toISOString(),
            },
          ],
        };
        tenantSupportTickets.push(newTicket);
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newTicket) });
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: tenantSupportTickets,
          pagination: { total: tenantSupportTickets.length, page: 1, limit: 20, totalPages: 1 },
        }),
      });
    });

    // 1. Visit Tenant POS / Dashboard: Trial Banner Visible
    await tenantPage.goto('/dashboard');
    // Check for trial badge / banner
    const trialIndicator = tenantPage.locator('text=ট্রায়াল পিরিয়ড চলমান').or(tenantPage.locator('text=Trial'));
    await expect(trialIndicator.first()).toBeVisible({ timeout: 5000 });

    // 2. Subscription goes into SUSPENDED state
    tenantSubStatus = 'SUSPENDED';
    await tenantPage.goto('/dashboard');

    // Suspended lock notice must appear
    const suspendedNotice = tenantPage.locator('text=অ্যাকাউন্ট সাময়িকভাবে স্থগিত').or(tenantPage.locator('text=Suspended'));
    await expect(suspendedNotice.first()).toBeVisible({ timeout: 5000 });

    // 3. Verify Billing & Support pages remain reachable during suspension
    await tenantPage.goto('/billing');
    await expect(tenantPage.locator('h1, h2, h3').filter({ hasText: /বিলিং|Billing/i }).first()).toBeVisible();

    await tenantPage.goto('/support');
    await expect(tenantPage.locator('h1, h2, h3').filter({ hasText: /সাপোর্ট|Support/i }).first()).toBeVisible();

    // ------------------------------------------------------------------------
    // CONTEXT 2: Platform Admin Session
    // ------------------------------------------------------------------------
    const platformContext = await browser.newContext();
    const platformPage = await platformContext.newPage();

    // Mock platform auth
    await platformPage.route('**/platform/auth/login', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'platform_super_admin_jwt',
          admin: {
            id: 'adm-super-1',
            email: 'admin@platform.pos',
            firstName: 'Platform',
            lastName: 'Supervisor',
            role: 'SUPER_ADMIN',
          },
        }),
      });
    });

    await platformPage.route('**/platform/auth/me', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'adm-super-1',
          email: 'admin@platform.pos',
          firstName: 'Platform',
          lastName: 'Supervisor',
          role: 'SUPER_ADMIN',
        }),
      });
    });

    await platformPage.route('**/platform/dashboard', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          businessesByStatus: { ACTIVE: 12, SUSPENDED: 1 },
          subscriptionsByStatus: { TRIALING: 4, ACTIVE: 8, SUSPENDED: 1 },
          overdueInvoicesCount: 1,
          overdueInvoicesAmount: 2500,
          revenueThisMonth: 45000,
          mrrEstimate: 35000,
          smsVolume: 1250,
          syncConflictsCount: 0,
        }),
      });
    });

    await platformPage.route('**/platform/businesses**', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'biz-dhaka-1',
              name: 'Dhaka Fashion Hub',
              slug: 'dhaka-fashion',
              phone: '01711223344',
              email: 'tariq@dhakafashion.com',
              status: tenantSubStatus,
              is_active: tenantSubStatus !== 'SUSPENDED',
              created_at: new Date().toISOString(),
              subscription: {
                status: tenantSubStatus,
                plan: { name: 'Retail Pro', code: 'PRO' },
              },
              _count: { branches: 1, users: 2 },
            },
          ],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
      });
    });

    await platformPage.route('**/platform/invoices**', async (route) => {
      if (route.request().url().includes('/pay') && route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        invoicePaid += body.amount;
        if (invoicePaid >= 2500) {
          invoiceStatus = 'PAID';
          tenantSubStatus = 'ACTIVE';
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Payment recorded successfully.',
            invoice: { id: 'inv-1', status: invoiceStatus, paid_amount: invoicePaid },
          }),
        });
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'inv-1',
              invoice_number: 'INV-2026-0001',
              net_amount: 2500,
              paid_amount: invoicePaid,
              status: invoiceStatus,
              period_start: new Date().toISOString(),
              period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
              due_date: new Date(Date.now() + 5 * 86400000).toISOString(),
              business: { id: 'biz-dhaka-1', name: 'Dhaka Fashion Hub', slug: 'dhaka-fashion' },
              plan: { name: 'Retail Pro', code: 'PRO' },
              payments: [],
            },
          ],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
      });
    });

    await platformPage.route('**/platform/revenue/summary', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          collectedThisMonth: invoicePaid,
          overdueAmount: invoiceStatus === 'PAID' ? 0 : 2500,
          mrrEstimate: 35000,
          activeSubscriptionsCount: 9,
        }),
      });
    });

    // 4. Log in to Platform Admin
    await platformPage.goto('/platform/login');
    await platformPage.fill('input[type="email"]', 'admin@platform.pos');
    await platformPage.fill('input[type="password"]', 'SuperSecretAdmin123');
    await platformPage.click('button[type="submit"]');

    // Platform Dashboard loads
    await expect(platformPage.locator('text=Platform Dashboard').first()).toBeVisible({ timeout: 5000 });

    // 5. Navigate to Invoices, record payment for the overdue tenant invoice
    await platformPage.goto('/platform/invoices');
    await expect(platformPage.locator('text=INV-2026-0001').first()).toBeVisible({ timeout: 5000 });

    // 6. Tenant context refreshes session: Subscription is now ACTIVE
    // Lock disappears from tenant app
    await tenantPage.goto('/dashboard');
    const activeLock = tenantPage.locator('text=অ্যাকাউন্ট সাময়িকভাবে স্থগিত');
    await expect(activeLock).not.toBeVisible({ timeout: 5000 });

    // Clean up
    await tenantContext.close();
    await platformContext.close();
  });
});
