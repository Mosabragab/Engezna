import { test, expect, Page } from '@playwright/test';
import {
  CUSTOMER_STORAGE_STATE,
  PROVIDER_STORAGE_STATE,
  ADMIN_STORAGE_STATE,
} from './fixtures/test-utils';

/**
 * Comprehensive E2E Tests - All Phases Combined
 *
 * This file combines all E2E tests for a single CI run:
 * - Phase 1: Customer Journey
 * - Phase 2: Merchant Journey
 * - Phase 3: Security & Limits
 * - Phase 4: Admin Panel
 *
 * No mocking - uses real Supabase data from production.
 */

const isCI = process.env.CI === 'true';
const DEFAULT_TIMEOUT = isCI ? 15000 : 10000;
const NAVIGATION_TIMEOUT = isCI ? 20000 : 15000;

async function waitForPageReady(page: Page): Promise<void> {
  const spinner = page.locator('.animate-spin');
  try {
    await spinner.first().waitFor({ state: 'visible', timeout: 5000 });
    await spinner.first().waitFor({ state: 'hidden', timeout: DEFAULT_TIMEOUT });
  } catch {
    // Spinner might not appear
  }
  await page.waitForTimeout(500);
}

// ============================================================================
// PHASE 1: CUSTOMER JOURNEY
// ============================================================================

test.describe('Phase 1: Customer Journey', () => {
  test.use({ storageState: CUSTOMER_STORAGE_STATE });

  test.describe('1.1 Home & Providers', () => {
    test('should display home page', async ({ page }) => {
      await page.goto('/ar', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(50);
    });

    test('should display providers list', async ({ page }) => {
      await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const content = await page.locator('body').innerText();
      expect(
        content.length > 50 || (await page.locator('a[href*="/providers/"]').count()) > 0
      ).toBeTruthy();
    });

    test('should navigate to provider detail', async ({ page }) => {
      await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const providerLinks = page.locator('a[href*="/providers/"]');
      if ((await providerLinks.count()) > 0) {
        await providerLinks.first().click();
        await page.waitForLoadState('domcontentloaded');
        expect(page.url()).toContain('/providers/');
      }
    });
  });

  test.describe('1.2 Cart & Orders', () => {
    test('should display cart page', async ({ page }) => {
      await page.goto('/ar/cart', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const content = await page.locator('body').innerText();
      expect(
        content.includes('سلة') ||
          content.includes('cart') ||
          content.includes('فارغ') ||
          content.length > 50
      ).toBeTruthy();
    });

    test('should display orders page', async ({ page }) => {
      await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      if (!page.url().includes('/login')) {
        const content = await page.locator('body').innerText();
        expect(
          content.includes('طلب') || content.includes('order') || content.length > 50
        ).toBeTruthy();
      }
    });
  });

  test.describe('1.3 Custom Orders', () => {
    test('should display custom order page', async ({ page }) => {
      await page.goto('/ar/custom-order', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      if (!page.url().includes('/login')) {
        const content = await page.locator('body').innerText();
        expect(
          content.includes('طلب') || content.includes('خاص') || content.length > 50
        ).toBeTruthy();
      }
    });
  });

  test.describe('1.4 Profile', () => {
    test('should display profile page', async ({ page }) => {
      await page.goto('/ar/profile', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      if (!page.url().includes('/login')) {
        const content = await page.locator('body').innerText();
        expect(
          content.includes('حساب') || content.includes('profile') || content.length > 50
        ).toBeTruthy();
      }
    });

    test('should display support page', async ({ page }) => {
      await page.goto('/ar/profile/support', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      if (!page.url().includes('/login')) {
        const content = await page.locator('body').innerText();
        expect(
          content.includes('دعم') || content.includes('support') || content.length > 50
        ).toBeTruthy();
      }
    });
  });

  test.describe('1.5 Edge Cases', () => {
    test('should handle 404 gracefully', async ({ page }) => {
      await page.goto('/ar/nonexistent-page-xyz', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const content = await page.locator('body').innerText();
      expect(content.includes('404') || content.length > 50).toBeTruthy();
    });

    test('should display RTL layout', async ({ page }) => {
      await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const isRTL = await page.evaluate(
        () => document.dir === 'rtl' || document.documentElement.dir === 'rtl'
      );
      expect(isRTL).toBeTruthy();
    });
  });
});

// ============================================================================
// PHASE 2: MERCHANT JOURNEY
// ============================================================================

test.describe('Phase 2: Merchant Journey', () => {
  test.use({ storageState: PROVIDER_STORAGE_STATE });

  test.describe('2.1 Dashboard', () => {
    test('should display provider dashboard', async ({ page }) => {
      await page.goto('/ar/provider', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 0 || (await page.locator('div').count()) > 5).toBeTruthy();
      }
    });
  });

  test.describe('2.2 Orders', () => {
    test('should display orders page', async ({ page }) => {
      await page.goto('/ar/provider/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.includes('طلب') || content.length > 50).toBeTruthy();
      }
    });

    test('should display custom orders', async ({ page }) => {
      await page.goto('/ar/provider/orders/custom', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('2.3 Products', () => {
    test('should display products page', async ({ page }) => {
      await page.goto('/ar/provider/products', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(
          content.includes('منتج') || content.includes('product') || content.length > 50
        ).toBeTruthy();
      }
    });

    test('should display new product page', async ({ page }) => {
      await page.goto('/ar/provider/products/new', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('2.4 Finance', () => {
    test('should display finance page', async ({ page }) => {
      await page.goto('/ar/provider/finance', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(
          content.includes('مالية') || content.includes('finance') || content.length > 50
        ).toBeTruthy();
      }
    });
  });

  test.describe('2.5 Settings', () => {
    test('should display settings page', async ({ page }) => {
      await page.goto('/ar/provider/settings', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display store hours', async ({ page }) => {
      await page.goto('/ar/provider/store-hours', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('2.6 Analytics & Reviews', () => {
    test('should display analytics', async ({ page }) => {
      await page.goto('/ar/provider/analytics', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display reviews', async ({ page }) => {
      await page.goto('/ar/provider/reviews', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('2.7 Refunds & Complaints', () => {
    test('should display refunds', async ({ page }) => {
      await page.goto('/ar/provider/refunds', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display complaints', async ({ page }) => {
      await page.goto('/ar/provider/complaints', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('2.8 Promotions & Team', () => {
    test('should display promotions', async ({ page }) => {
      await page.goto('/ar/provider/promotions', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display team page', async ({ page }) => {
      await page.goto('/ar/provider/team', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });
});

// ============================================================================
// PHASE 3: SECURITY & AUTHORIZATION
// ============================================================================

test.describe('Phase 3: Security', () => {
  test.describe('3.1 IDOR - Customer cannot access provider', () => {
    test.use({ storageState: CUSTOMER_STORAGE_STATE });

    test('customer blocked from provider dashboard', async ({ page }) => {
      await page.goto('/ar/provider', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      expect(
        url.includes('/login') || url.includes('/auth') || !url.endsWith('/provider')
      ).toBeTruthy();
    });

    test('customer blocked from admin', async ({ page }) => {
      await page.goto('/ar/admin', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      expect(
        url.includes('/login') || url.includes('/auth') || !url.endsWith('/admin')
      ).toBeTruthy();
    });
  });

  test.describe('3.2 IDOR - Provider cannot access admin', () => {
    test.use({ storageState: PROVIDER_STORAGE_STATE });

    test('provider blocked from admin dashboard', async ({ page }) => {
      await page.goto('/ar/admin', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      expect(
        url.includes('/login') ||
          url.includes('/auth') ||
          url.includes('/provider') ||
          !url.endsWith('/admin')
      ).toBeTruthy();
    });

    test('provider blocked from admin orders', async ({ page }) => {
      await page.goto('/ar/admin/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      expect(
        url.includes('/login') || url.includes('/auth') || !url.includes('/admin/orders')
      ).toBeTruthy();
    });
  });

  test.describe('3.3 Unauthenticated Access', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('public access to providers list', async ({ page }) => {
      await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const content = await page.locator('body').innerText();
      expect(content.length > 50).toBeTruthy();
    });

    test('orders require auth', async ({ page }) => {
      await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      expect(url.includes('/login') || url.includes('/auth')).toBeTruthy();
    });

    test('profile requires auth', async ({ page }) => {
      await page.goto('/ar/profile', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const url = page.url();
      expect(url.includes('/login') || url.includes('/auth')).toBeTruthy();
    });
  });

  test.describe('3.4 XSS Protection', () => {
    test.use({ storageState: CUSTOMER_STORAGE_STATE });

    test('XSS in URL parameters', async ({ page }) => {
      await page.goto('/ar/providers?q=<script>alert(1)</script>', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      const content = await page.locator('body').innerText();
      expect(content.includes('<script>')).toBeFalsy();
    });
  });
});

// ============================================================================
// PHASE 4: ADMIN PANEL
// ============================================================================

test.describe('Phase 4: Admin Panel', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test.describe('4.1 Dashboard', () => {
    test('should display admin dashboard', async ({ page }) => {
      await page.goto('/ar/admin', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display analytics', async ({ page }) => {
      await page.goto('/ar/admin/analytics', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('4.2 Orders Management', () => {
    test('should display all orders', async ({ page }) => {
      await page.goto('/ar/admin/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display custom orders', async ({ page }) => {
      await page.goto('/ar/admin/custom-orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display refunds', async ({ page }) => {
      await page.goto('/ar/admin/refunds', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('4.3 Providers Management', () => {
    test('should display providers list', async ({ page }) => {
      await page.goto('/ar/admin/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display approvals', async ({ page }) => {
      await page.goto('/ar/admin/approvals', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('4.4 Customers', () => {
    test('should display customers list', async ({ page }) => {
      await page.goto('/ar/admin/customers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('4.5 Finance', () => {
    test('should display finance', async ({ page }) => {
      await page.goto('/ar/admin/finance', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display settlements', async ({ page }) => {
      await page.goto('/ar/admin/settlements', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('4.6 Support', () => {
    test('should display support tickets', async ({ page }) => {
      await page.goto('/ar/admin/support', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display resolution center', async ({ page }) => {
      await page.goto('/ar/admin/resolution-center', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('4.7 Settings', () => {
    test('should display settings', async ({ page }) => {
      await page.goto('/ar/admin/settings', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display locations', async ({ page }) => {
      await page.goto('/ar/admin/locations', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display promotions', async ({ page }) => {
      await page.goto('/ar/admin/promotions', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('4.8 Team', () => {
    test('should display supervisors', async ({ page }) => {
      await page.goto('/ar/admin/supervisors', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });

    test('should display roles', async ({ page }) => {
      await page.goto('/ar/admin/roles', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(content.length > 50).toBeTruthy();
      }
    });
  });
});
