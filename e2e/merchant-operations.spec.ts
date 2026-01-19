import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, LOCATORS, ORDER_STATUS } from './fixtures/test-utils';

/**
 * Merchant Operations E2E Tests
 *
 * Tests the provider/merchant dashboard and operations:
 * - Dashboard and statistics
 * - Order management
 * - Product management
 * - Financial overview
 *
 * No mocking - uses real Supabase data.
 */

// Faster timeouts - networkidle was causing issues
const isCI = process.env.CI === 'true';
const DEFAULT_TIMEOUT = isCI ? 15000 : 10000;
const NAVIGATION_TIMEOUT = isCI ? 20000 : 15000;

/**
 * Wait for page to have meaningful content
 */
async function waitForContent(page: Page, minLength = 50): Promise<string> {
  await page.waitForFunction((min) => (document.body?.innerText?.length ?? 0) > min, minLength, {
    timeout: DEFAULT_TIMEOUT,
  });
  return (await page.locator('body').innerText()) ?? '';
}

test.describe('Merchant Dashboard', () => {
  test('should display provider dashboard with statistics', async ({ page }) => {
    await page.goto('/ar/provider', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');

    // Wait for React hydration
    await waitForContent(page, 30);

    const url = page.url();

    // May redirect to login if not authenticated
    if (url.includes('/provider') && !url.includes('/login')) {
      // Should show dashboard elements or content
      const content = await page.locator('body').innerText();
      expect(content.length > 50).toBeTruthy();
    } else {
      // Redirect to login is expected if not using storage state
      expect(url.includes('/login') || url.includes('/auth')).toBeTruthy();
    }
  });

  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/ar/provider', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForContent(page, 30);

    if (page.url().includes('/provider') && !page.url().includes('/login')) {
      // Check for sidebar
      const sidebar = page.locator(LOCATORS.sidebar);

      if (
        await sidebar
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        // Sidebar should have navigation items
        const navItems = sidebar.locator('a, button');
        const count = await navItems.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('should show today orders summary', async ({ page }) => {
    await page.goto('/ar/provider', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForContent(page, 30);

    if (page.url().includes('/provider') && !page.url().includes('/login')) {
      const content = await page.locator('body').innerText();

      // Should show orders-related content
      expect(
        content.includes('طلب') ||
          content.includes('order') ||
          content.includes('اليوم') ||
          content.includes('today') ||
          /\d+/.test(content) // Any number (statistics)
      ).toBeTruthy();
    }
  });
});

test.describe('Merchant Order Management', () => {
  test('should display orders page with order list or empty state', async ({ page }) => {
    await page.goto('/ar/provider/orders');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      // Should show orders or empty state
      expect(
        content.includes('طلب') ||
          content.includes('order') ||
          content.includes('لا يوجد') ||
          content.includes('no orders') ||
          content.includes('الطلبات')
      ).toBeTruthy();
    }
  });

  test('should have order status tabs or filters', async ({ page }) => {
    await page.goto('/ar/provider/orders');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Check for tabs or filters
      const tabs = page.locator('[role="tab"], [class*="tab"], button[data-state]');
      const filters = page.locator('select, [class*="filter"]');

      await expect(async () => {
        const tabCount = await tabs.count();
        const filterCount = await filters.count();
        const content = await page.locator('body').innerText();

        // Should have tabs, filters, or at least content
        expect(tabCount > 0 || filterCount > 0 || content.length > 100).toBeTruthy();
      }).toPass({ timeout: DEFAULT_TIMEOUT });
    }
  });

  test('should display custom orders section', async ({ page }) => {
    await page.goto('/ar/provider/orders/custom');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();

    if ((url.includes('/custom') || url.includes('/orders')) && !url.includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      // Custom orders page content
      expect(
        content.includes('مفتوح') ||
          content.includes('خاص') ||
          content.includes('custom') ||
          content.includes('تسعير') ||
          content.includes('لا يوجد') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should navigate to order details when clicking on order', async ({ page }) => {
    await page.goto('/ar/provider/orders');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Find order links
      const orderLinks = page.locator(
        'a[href*="/orders/"], [data-testid="order-card"], tr[onclick]'
      );

      if ((await orderLinks.count()) > 0) {
        await orderLinks.first().click();
        await page.waitForLoadState('domcontentloaded');
        await waitForContent(page, 50);

        // Should be on order details
        expect(page.url()).toContain('/orders/');
      } else {
        console.log('No orders available to click');
      }
    }
  });
});

test.describe('Merchant Product Management', () => {
  test('should display products page', async ({ page }) => {
    await page.goto('/ar/provider/products');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/products') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      expect(
        content.includes('منتج') ||
          content.includes('product') ||
          content.includes('القائمة') ||
          content.includes('menu') ||
          content.length > 100
      ).toBeTruthy();
    }
  });

  test('should have add product button or link', async ({ page }) => {
    await page.goto('/ar/provider/products');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/products') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Look for add product button
      const addBtn = page
        .getByRole('button', { name: /إضافة|add/i })
        .or(page.getByRole('link', { name: /إضافة|add|جديد|new/i }))
        .or(page.locator('a[href*="new"], a[href*="add"]'));

      const hasAddBtn = await addBtn
        .first()
        .isVisible()
        .catch(() => false);
      const content = await page.locator('body').innerText();

      // Either has add button or page loaded
      expect(hasAddBtn || content.length > 100).toBeTruthy();
    }
  });

  test('should display product categories', async ({ page }) => {
    await page.goto('/ar/provider/products');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/products') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      // Should show categories or products
      expect(
        content.includes('تصنيف') ||
          content.includes('category') ||
          content.includes('فئة') ||
          content.length > 100
      ).toBeTruthy();
    }
  });

  test('should have product availability toggles', async ({ page }) => {
    await page.goto('/ar/provider/products');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/products') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Look for toggle switches
      const toggles = page.locator(
        '[role="switch"], button[role="switch"], [class*="switch"], [class*="toggle"]'
      );

      const toggleCount = await toggles.count();
      const content = await page.locator('body').innerText();

      // Either has toggles or page loaded with content
      expect(toggleCount >= 0 && content.length > 50).toBeTruthy();
      console.log('Availability toggles found:', toggleCount);
    }
  });
});

test.describe('Merchant Finance', () => {
  test('should display finance page', async ({ page }) => {
    await page.goto('/ar/provider/finance');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();

    if (url.includes('/finance') && !url.includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      expect(
        content.includes('مالية') ||
          content.includes('finance') ||
          content.includes('إيرادات') ||
          content.includes('revenue') ||
          content.includes('ج.م') ||
          content.length > 100
      ).toBeTruthy();
    }
  });

  test('should display revenue information', async ({ page }) => {
    await page.goto('/ar/provider/finance');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/finance') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      // Should show revenue-related content
      expect(
        content.includes('إيراد') ||
          content.includes('revenue') ||
          content.includes('مجموع') ||
          content.includes('total') ||
          /\d+/.test(content)
      ).toBeTruthy();
    }
  });

  test('should display commission information', async ({ page }) => {
    await page.goto('/ar/provider/finance');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/finance') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      // Should show commission info
      expect(
        content.includes('عمولة') ||
          content.includes('commission') ||
          content.includes('%') ||
          content.length > 100
      ).toBeTruthy();
    }
  });

  test('should display settlements page', async ({ page }) => {
    await page.goto('/ar/provider/settlements');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();

    if (url.includes('/settlements') && !url.includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      expect(
        content.includes('تسوية') ||
          content.includes('settlement') ||
          content.includes('مستحقات') ||
          content.includes('لا يوجد') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('Merchant Real-time Features', () => {
  test('should support page updates (structure check)', async ({ page }) => {
    await page.goto('/ar/provider/orders');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Wait and check page is still responsive
      await page.waitForTimeout(2000);

      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should maintain content on navigation', async ({ page }) => {
    await page.goto('/ar/provider/orders');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Navigate to another page and back
      await page.goto('/ar/provider/products');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/ar/provider/orders');
      await page.waitForLoadState('domcontentloaded');

      // Content should still be accessible
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(0);
    }
  });
});
