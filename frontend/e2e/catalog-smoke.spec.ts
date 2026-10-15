import { test, expect } from '@playwright/test';

test.describe('Catalog Smoke E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock authenticated session and branch context
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: {
              id: 'usr-admin-1',
              firstName: 'Test',
              lastName: 'Owner',
              fullName: 'Test Owner',
              email: 'owner@test.com',
              isOwner: true,
              role: { id: 'r-1', name: 'Owner', code: 'OWNER' },
            },
            business: { id: 'biz-1', name: 'Smoke Test Boutique', slug: 'smoke-boutique' },
            permissions: [
              'products:read',
              'products:create',
              'products:update',
              'products:delete',
              'barcodes:print',
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
              code: 'MAIN',
            },
            branches: [
              { id: 'branch-main-1', name: 'Main Flagship', code: 'MAIN' },
              { id: 'branch-outlet-2', name: 'Outlet 2', code: 'OUTLET' },
            ],
          },
          version: 0,
        }),
      );
    });
  });

  test('complete smoke workflow: master data -> bulk generator product -> barcode lookup -> print preview', async ({
    page,
  }) => {
    // Intercept Master Data APIs
    await page.route('**/api/v1/catalog/categories**', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 201,
          json: { id: 'cat-formal-1', name: body.name, code: body.code || 'FORMAL', parentId: null },
        });
      }
      return route.fulfill({
        status: 200,
        json: [{ id: 'cat-formal-1', name: 'Formal Shirts', code: 'FORMAL', parentId: null, children: [] }],
      });
    });

    await page.route('**/api/v1/catalog/brands**', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 201,
          json: { id: 'brand-apex-1', name: body.name, code: body.code || 'APEX' },
        });
      }
      return route.fulfill({
        status: 200,
        json: [{ id: 'brand-apex-1', name: 'Apex Apparel', code: 'APEX' }],
      });
    });

    await page.route('**/api/v1/catalog/sizes**', async (route) => {
      return route.fulfill({
        status: 200,
        json: [
          { id: 'size-s', name: 'S', code: 'S', sortOrder: 1 },
          { id: 'size-m', name: 'M', code: 'M', sortOrder: 2 },
          { id: 'size-l', name: 'L', code: 'L', sortOrder: 3 },
        ],
      });
    });

    await page.route('**/api/v1/catalog/colors**', async (route) => {
      return route.fulfill({
        status: 200,
        json: [
          { id: 'color-white', name: 'White', hexCode: '#FFFFFF' },
          { id: 'color-blue', name: 'Navy Blue', hexCode: '#000080' },
        ],
      });
    });

    await page.route('**/api/v1/catalog/units**', async (route) => {
      return route.fulfill({
        status: 200,
        json: [{ id: 'unit-pcs', name: 'Pcs', code: 'PCS', allowDecimal: false }],
      });
    });

    await page.route('**/api/v1/branches**', async (route) => {
      return route.fulfill({
        status: 200,
        json: [
          { id: 'branch-main-1', name: 'Main Flagship', code: 'MAIN' },
          { id: 'branch-outlet-2', name: 'Outlet 2', code: 'OUTLET' },
        ],
      });
    });

    // 1. Visit Master Data Page
    await page.goto('/catalog/master-data');
    await expect(page.locator('h1')).toContainText('Catalog Master Data');

    // Verify Categories and Brands tabs exist
    await expect(page.getByRole('button', { name: /Categories/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Brands/i })).toBeVisible();

    // 2. Visit Product Create Page
    await page.goto('/products/new');
    await expect(page.locator('h1')).toContainText('New Garment Product');

    // Fill Product Name and Code
    await page.locator('input[placeholder*="Oxford Shirt"]').fill('Classic Oxford Shirt');
    await page.locator('input[placeholder*="SHT-OXF-001"]').fill('SHT-SMOKE-001');

    // Open Bulk Variant Generator
    const bulkGeneratorBtn = page.getByRole('button', { name: /Bulk Generator/i });
    await expect(bulkGeneratorBtn).toBeVisible();
    await bulkGeneratorBtn.click();

    // Select 3 Sizes and 2 Colors in generator modal
    await expect(page.getByText('Bulk Variant Generator')).toBeVisible();

    // Click sizes S, M, L
    await page.getByRole('button', { name: 'S', exact: true }).click();
    await page.getByRole('button', { name: 'M', exact: true }).click();
    await page.getByRole('button', { name: 'L', exact: true }).click();

    // Click colors White and Navy Blue
    await page.getByRole('button', { name: /White/i }).click();
    await page.getByRole('button', { name: /Navy Blue/i }).click();

    // Fill default prices
    const modal = page.locator('.fixed.inset-0');
    await modal.locator('input[placeholder="1250"]').fill('1800'); // retail
    await modal.locator('input[placeholder="1000"]').fill('1400'); // wholesale
    await modal.locator('input[placeholder="750"]').fill('1100'); // cost

    // Verify preview combinations generated (3 sizes x 2 colors = 6)
    await expect(page.getByText('Preview Combinations (6)')).toBeVisible();

    // Apply combinations to main table
    await page.getByRole('button', { name: /Apply 6 Variants/i }).click();

    // Intercept Product Creation API
    const createdProductId = 'prod-smoke-999';
    await page.route('**/api/v1/catalog/products', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        expect(body.variants.length).toBe(6);
        expect(body.name).toBe('Classic Oxford Shirt');
        return route.fulfill({
          status: 201,
          json: {
            id: createdProductId,
            name: body.name,
            code: body.code,
            variants: body.variants.map((v: any, idx: number) => ({
              id: `var-${idx}`,
              sku: v.sku || `SHT-SMOKE-001-${idx}`,
              barcode: v.barcode || `89010300000${idx}`,
              retailPrice: v.retailPrice,
              wholesalePrice: v.wholesalePrice,
              costPrice: v.costPrice,
            })),
          },
        });
      }
      return route.fulfill({ status: 200, json: { data: [], meta: { total: 0 } } });
    });

    // Intercept Product Detail API
    await page.route(`**/api/v1/catalog/products/${createdProductId}`, async (route) => {
      return route.fulfill({
        status: 200,
        json: {
          id: createdProductId,
          name: 'Classic Oxford Shirt',
          code: 'SHT-SMOKE-001',
          isActive: true,
          gender: 'MEN',
          category: { id: 'cat-1', name: 'Formal Shirts' },
          brand: { id: 'brand-1', name: 'Apex Apparel' },
          unit: { id: 'unit-1', name: 'Pcs' },
          currentBranchStock: 30,
          variants: [
            {
              id: 'var-0',
              sku: 'SHT-SMOKE-001-S-WHT',
              barcode: '8901030000003',
              retailPrice: 1800,
              wholesalePrice: 1400,
              costPrice: 1100,
              reorderLevel: 5,
              isActive: true,
              size: { name: 'S' },
              color: { name: 'White', hexCode: '#FFFFFF' },
              currentBranchStock: 5,
            },
          ],
        },
      });
    });

    // 3. Visit Barcode Lookup Page
    await page.route('**/api/v1/catalog/barcodes/lookup/8901030000003', async (route) => {
      return route.fulfill({
        status: 200,
        json: {
          found: true,
          activeInCurrentBranch: true,
          product: {
            id: createdProductId,
            name: 'Classic Oxford Shirt',
            code: 'SHT-SMOKE-001',
          },
          variant: {
            id: 'var-0',
            sku: 'SHT-SMOKE-001-S-WHT',
            barcode: '8901030000003',
            retailPrice: 1800,
            wholesalePrice: 1400,
            stock: 5,
            size: { name: 'S' },
            color: { name: 'White' },
          },
        },
      });
    });

    await page.goto('/catalog/lookup');
    await expect(page.locator('h1')).toContainText('Barcode Lookup Tool');

    // Fill barcode and lookup
    await page.locator('input[placeholder*="Scan barcode"]').fill('8901030000003');
    await page.getByRole('button', { name: /Lookup/i }).click();

    // Verify found item display
    await expect(page.getByText('Classic Oxford Shirt')).toBeVisible();
    await expect(page.getByText('Active in Main Flagship')).toBeVisible();
    await expect(page.getByText('SHT-SMOKE-001-S-WHT')).toBeVisible();

    // 4. Visit Barcode Print Screen
    await page.goto(`/catalog/barcodes?productId=${createdProductId}`);
    await expect(page.locator('h1')).toContainText('Print Barcode Labels');

    // Verify item in print queue
    await expect(page.getByText('Classic Oxford Shirt')).toBeVisible();
    await expect(page.getByText('Live Label Preview')).toBeVisible();
    await expect(page.locator('svg.barcode-svg')).toBeVisible();
  });
});
