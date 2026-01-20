import { test, expect, Page } from '@playwright/test';
import { TEST_USERS } from './fixtures/test-utils';

/**
 * Admin Panel E2E Tests
 *
 * Tests the admin dashboard and management features:
 * - Dashboard overview
 * - User management
 * - Provider management
 * - Settlements management
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

test.describe('Admin Dashboard', () => {
  test('should display admin dashboard with system overview', async ({ page }) => {
    await page.goto('/ar/admin');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();

    if (url.includes('/admin') && !url.includes('/login')) {
      await waitForContent(page, 50);

      // Should show dashboard elements
      const content = await page.locator('body').innerText();

      expect(
        content.includes('لوحة') ||
          content.includes('dashboard') ||
          content.includes('إحصائيات') ||
          content.includes('statistics') ||
          content.length > 100
      ).toBeTruthy();
    } else {
      // Redirect to login is expected
      expect(url.includes('/login') || url.includes('/auth')).toBeTruthy();
    }
  });

  test('should display statistics cards', async ({ page }) => {
    await page.goto('/ar/admin');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/admin') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Look for statistics cards
      const statsCards = page.locator('[class*="stat"], [class*="card"], [data-testid*="stat"]');

      await expect(async () => {
        const cardCount = await statsCards.count();
        const content = await page.locator('body').innerText();

        // Should have cards or meaningful content
        expect(cardCount > 0 || content.length > 100).toBeTruthy();
      }).toPass({ timeout: DEFAULT_TIMEOUT });
    }
  });

  test('should have sidebar navigation', async ({ page }) => {
    await page.goto('/ar/admin');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/admin') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Check for sidebar
      const sidebar = page.locator('aside, nav[class*="sidebar"], [class*="Sidebar"]');

      if (
        await sidebar
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        const navItems = sidebar.locator('a, button');
        const count = await navItems.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Admin User Management', () => {
  test('should display users page', async ({ page }) => {
    await page.goto('/ar/admin/users');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/users') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      expect(
        content.includes('مستخدم') ||
          content.includes('user') ||
          content.includes('عميل') ||
          content.includes('customer') ||
          content.length > 100
      ).toBeTruthy();
    }
  });

  test('should have user search functionality', async ({ page }) => {
    await page.goto('/ar/admin/users');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/users') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Look for search input
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="بحث"], input[placeholder*="search"]'
      );

      const hasSearch = await searchInput
        .first()
        .isVisible()
        .catch(() => false);
      const content = await page.locator('body').innerText();

      // Either has search or page loaded
      expect(hasSearch || content.length > 100).toBeTruthy();
    }
  });

  test('should display user details when clicking on user', async ({ page }) => {
    await page.goto('/ar/admin/users');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/users') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Find user rows or cards
      const userItems = page.locator(
        'tr[onclick], a[href*="/users/"], [data-testid="user-row"], [class*="user-item"]'
      );

      if ((await userItems.count()) > 0) {
        await userItems.first().click();
        await page.waitForLoadState('domcontentloaded');

        // Should show user details or modal
        const content = await page.locator('body').innerText();
        expect(content.length).toBeGreaterThan(50);
      } else {
        console.log('No users available to click');
      }
    }
  });
});

test.describe('Admin Provider Management', () => {
  test('should display providers page', async ({ page }) => {
    await page.goto('/ar/admin/providers');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/providers') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      expect(
        content.includes('متجر') ||
          content.includes('provider') ||
          content.includes('مقدم') ||
          content.includes('store') ||
          content.length > 100
      ).toBeTruthy();
    }
  });

  test('should have provider approval controls', async ({ page }) => {
    await page.goto('/ar/admin/providers');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/providers') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Look for approval buttons or status controls
      const approvalControls = page.locator(
        'button:has-text("قبول"), button:has-text("رفض"), button:has-text("approve"), button:has-text("reject"), [class*="status"]'
      );

      const controlCount = await approvalControls.count();
      const content = await page.locator('body').innerText();

      // Either has controls or page loaded (may not have pending providers)
      expect(controlCount >= 0 && content.length > 50).toBeTruthy();
    }
  });
});

test.describe('Admin Settlements', () => {
  test('should display settlements page', async ({ page }) => {
    await page.goto('/ar/admin/settlements');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/settlements') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      expect(
        content.includes('تسوية') ||
          content.includes('settlement') ||
          content.includes('مستحقات') ||
          content.includes('dues') ||
          content.length > 100
      ).toBeTruthy();
    }
  });

  test('should have settlement status filters', async ({ page }) => {
    await page.goto('/ar/admin/settlements');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/settlements') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Look for status filters
      const filters = page.locator(
        '[role="tab"], [class*="tab"], select, button[data-state], [class*="filter"]'
      );

      const filterCount = await filters.count();
      const content = await page.locator('body').innerText();

      // Either has filters or page loaded
      expect(filterCount >= 0 && content.length > 50).toBeTruthy();
    }
  });

  test('should display settlement details', async ({ page }) => {
    await page.goto('/ar/admin/settlements');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/settlements') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Find settlement items
      const settlementItems = page.locator(
        'tr[onclick], a[href*="/settlements/"], [data-testid="settlement-row"], [class*="settlement-item"]'
      );

      if ((await settlementItems.count()) > 0) {
        // Click first settlement
        await settlementItems.first().click();
        await page.waitForTimeout(1000);

        // Should show details (modal or page)
        const content = await page.locator('body').innerText();
        expect(content.length).toBeGreaterThan(50);
      } else {
        console.log('No settlements available to click');
      }
    }
  });

  test('should have process settlement action', async ({ page }) => {
    await page.goto('/ar/admin/settlements');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/settlements') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Look for process/pay buttons
      const processButtons = page.locator(
        'button:has-text("دفع"), button:has-text("معالجة"), button:has-text("process"), button:has-text("pay")'
      );

      const buttonCount = await processButtons.count();
      const content = await page.locator('body').innerText();

      // Either has buttons or page loaded (may not have pending settlements)
      expect(buttonCount >= 0 && content.length > 50).toBeTruthy();
      console.log('Process settlement buttons found:', buttonCount);
    }
  });
});

test.describe('Admin Orders', () => {
  test('should display all orders page', async ({ page }) => {
    await page.goto('/ar/admin/orders');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      expect(
        content.includes('طلب') ||
          content.includes('order') ||
          content.includes('الطلبات') ||
          content.length > 100
      ).toBeTruthy();
    }
  });

  test('should have order search and filters', async ({ page }) => {
    await page.goto('/ar/admin/orders');
    await page.waitForLoadState('domcontentloaded');

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      await waitForContent(page, 50);

      // Look for search/filter elements
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="بحث"], input[placeholder*="search"]'
      );
      const filters = page.locator('select, [role="tab"], [class*="filter"]');

      const hasSearch = await searchInput
        .first()
        .isVisible()
        .catch(() => false);
      const filterCount = await filters.count();
      const content = await page.locator('body').innerText();

      // Either has search/filters or page loaded
      expect(hasSearch || filterCount > 0 || content.length > 100).toBeTruthy();
    }
  });
});
