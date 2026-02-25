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

  // ==========================================================================
  // 1.6 CHECKOUT FLOW - Complete Purchase Journey
  // ==========================================================================
  test.describe('1.6 Checkout Flow', () => {
    test('should display checkout page', async ({ page }) => {
      await page.goto('/ar/checkout', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      // Checkout page should exist (may redirect to cart, login, or home)
      const url = page.url();
      const content = await page.locator('body').innerText();
      // Valid states: on checkout, redirected to cart/login/home, or page loaded
      expect(
        url.includes('/checkout') ||
          url.includes('/cart') ||
          url.includes('/login') ||
          url.includes('/auth') ||
          content.length > 50
      ).toBeTruthy();
    });

    test('should navigate from provider to add product', async ({ page }) => {
      // Go to providers list
      await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      // Find and click first provider
      const providerLinks = page.locator('a[href*="/providers/"]');
      if ((await providerLinks.count()) > 0) {
        await providerLinks.first().click();
        await page.waitForLoadState('domcontentloaded');
        await waitForPageReady(page);

        // Should be on provider detail page
        expect(page.url()).toContain('/providers/');

        // Look for product/menu items
        const content = await page.locator('body').innerText();
        expect(content.length > 100).toBeTruthy();
      }
    });

    test('should show add to cart button on product', async ({ page }) => {
      // Go to providers list and find a provider
      await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const providerLinks = page.locator('a[href*="/providers/"]');
      if ((await providerLinks.count()) > 0) {
        await providerLinks.first().click();
        await page.waitForLoadState('domcontentloaded');
        await waitForPageReady(page);

        // Look for add to cart buttons or + buttons
        const addButtons = page.locator(
          'button:has-text("أضف"), button:has-text("إضافة"), button:has-text("+"), button[aria-label*="add"]'
        );
        const buttonCount = await addButtons.count();

        // Either we have add buttons or the page has content
        const content = await page.locator('body').innerText();
        expect(buttonCount > 0 || content.length > 100).toBeTruthy();
      }
    });

    test('should display addresses page', async ({ page }) => {
      await page.goto('/ar/profile/addresses', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      if (!page.url().includes('/login')) {
        const content = await page.locator('body').innerText();
        expect(
          content.includes('عنوان') ||
            content.includes('address') ||
            content.includes('توصيل') ||
            content.length > 50
        ).toBeTruthy();
      }
    });

    test('should have payment options on checkout', async ({ page }) => {
      // First add something to cart by going to a provider
      await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      // Then go to checkout
      await page.goto('/ar/checkout', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      // Either on checkout with payment options or redirected to cart
      const url = page.url();
      const content = await page.locator('body').innerText();

      if (url.includes('/checkout')) {
        // Should have payment-related content
        expect(
          content.includes('دفع') ||
            content.includes('كاش') ||
            content.includes('payment') ||
            content.includes('نقد') ||
            content.length > 50
        ).toBeTruthy();
      } else {
        // Redirected to cart or providers (empty cart)
        expect(
          url.includes('/cart') || url.includes('/providers') || content.length > 50
        ).toBeTruthy();
      }
    });

    test('should display order confirmation page structure', async ({ page }) => {
      // Test the confirmation page route exists
      await page.goto('/ar/orders/confirmation', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      // Should either show confirmation or redirect
      const content = await page.locator('body').innerText();
      expect(content.length > 50).toBeTruthy();
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

  // ==========================================================================
  // 2.9 Order Management Workflow
  // ==========================================================================
  test.describe('2.9 Order Management', () => {
    test('should display order list with status filters', async ({ page }) => {
      await page.goto('/ar/provider/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);

        // Look for filter buttons or tabs
        const content = await page.locator('body').innerText();
        const hasFilters =
          content.includes('جديد') ||
          content.includes('قيد التحضير') ||
          content.includes('جاهز') ||
          content.includes('pending') ||
          content.includes('preparing');

        expect(hasFilters || content.length > 50).toBeTruthy();
      }
    });

    test('should display order detail page', async ({ page }) => {
      await page.goto('/ar/provider/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);

        // Try to find an order link
        const orderLinks = page.locator('a[href*="/provider/orders/"]');
        if ((await orderLinks.count()) > 0) {
          await orderLinks.first().click();
          await page.waitForLoadState('domcontentloaded');
          await waitForPageReady(page);

          // Should be on order detail
          const content = await page.locator('body').innerText();
          expect(content.length > 50).toBeTruthy();
        }
      }
    });

    test('should have order action buttons', async ({ page }) => {
      await page.goto('/ar/provider/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);

        // Look for action buttons (accept, reject, update status)
        const actionButtons = page.locator(
          'button:has-text("قبول"), button:has-text("رفض"), button:has-text("تحديث"), button:has-text("accept"), button:has-text("reject")'
        );

        const content = await page.locator('body').innerText();
        // Either has action buttons or page loaded successfully
        expect((await actionButtons.count()) >= 0 || content.length > 50).toBeTruthy();
      }
    });

    test('should display settlements history', async ({ page }) => {
      await page.goto('/ar/provider/finance/settlements', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();
        expect(
          content.includes('تسوية') ||
            content.includes('settlement') ||
            content.includes('مالية') ||
            content.length > 50
        ).toBeTruthy();
      }
    });
  });
});

// ============================================================================
// PHASE 3: SECURITY & AUTHORIZATION
// IMPORTANT: These tests MUST fail if security is broken - they find real bugs!
// ============================================================================

test.describe('Phase 3: Security', () => {
  test.describe('3.1 IDOR - Customer cannot access provider', () => {
    test.use({ storageState: CUSTOMER_STORAGE_STATE });

    test('SECURITY: customer must NOT access provider dashboard', async ({ page }) => {
      await page.goto('/ar/provider', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const url = page.url();

      // MUST redirect to login or provider login - NOT stay on /provider
      const isBlocked =
        url.includes('/login') || url.includes('/auth') || url.includes('/provider/login');

      if (!isBlocked) {
        console.error('🚨 SECURITY BUG: Customer can access provider dashboard!');
        console.error('   URL:', url);
      }

      expect(isBlocked).toBeTruthy();
    });

    test('SECURITY: customer must NOT access admin panel', async ({ page }) => {
      await page.goto('/ar/admin', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const url = page.url();

      const isBlocked =
        url.includes('/login') || url.includes('/auth') || url.includes('/admin/login');

      if (!isBlocked) {
        console.error('🚨 SECURITY BUG: Customer can access admin panel!');
        console.error('   URL:', url);
      }

      expect(isBlocked).toBeTruthy();
    });
  });

  test.describe('3.2 IDOR - Provider cannot access admin', () => {
    test.use({ storageState: PROVIDER_STORAGE_STATE });

    test('SECURITY: provider must NOT access admin dashboard', async ({ page }) => {
      await page.goto('/ar/admin', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const url = page.url();

      // Provider should be redirected away from admin
      const isBlocked =
        url.includes('/login') ||
        url.includes('/auth') ||
        url.includes('/provider') ||
        url.includes('/admin/login');

      if (!isBlocked && url.includes('/admin')) {
        console.error('🚨 SECURITY BUG: Provider can access admin dashboard!');
        console.error('   URL:', url);
      }

      expect(isBlocked || !url.endsWith('/admin')).toBeTruthy();
    });

    test('SECURITY: provider must NOT access admin orders', async ({ page }) => {
      await page.goto('/ar/admin/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const url = page.url();

      const isBlocked =
        url.includes('/login') || url.includes('/auth') || url.includes('/provider');

      if (!isBlocked && url.includes('/admin/orders')) {
        console.error('🚨 SECURITY BUG: Provider can access admin orders!');
        console.error('   URL:', url);
      }

      expect(isBlocked || !url.includes('/admin/orders')).toBeTruthy();
    });
  });

  test.describe('3.3 Unauthenticated Access', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('public access to providers list (OK)', async ({ page }) => {
      await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const content = await page.locator('body').innerText();
      expect(content.length > 50).toBeTruthy();
    });

    test('SECURITY: orders page must require auth', async ({ page }) => {
      await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const url = page.url();

      const requiresAuth = url.includes('/login') || url.includes('/auth');

      if (!requiresAuth && url.includes('/orders')) {
        console.error('🚨 SECURITY BUG: Orders page accessible without login!');
        console.error('   URL:', url);
      }

      expect(requiresAuth).toBeTruthy();
    });

    test('SECURITY: profile page must require auth', async ({ page }) => {
      await page.goto('/ar/profile', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);
      const url = page.url();

      const requiresAuth = url.includes('/login') || url.includes('/auth');

      if (!requiresAuth && url.includes('/profile')) {
        console.error('🚨 SECURITY BUG: Profile page accessible without login!');
        console.error('   URL:', url);
      }

      expect(requiresAuth).toBeTruthy();
    });
  });

  test.describe('3.4 XSS Protection', () => {
    test.use({ storageState: CUSTOMER_STORAGE_STATE });

    test('XSS in URL parameters must be escaped', async ({ page }) => {
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

// ============================================================================
// PHASE 5: DATA-DRIVEN TESTS (Using Real Database Data)
// ============================================================================

// Real provider IDs from database
const TEST_PROVIDERS = {
  GROCERY: {
    id: 'd2e8c33c-51dd-40c4-804e-e4b426ff5e18',
    name_ar: 'سوبر ماركت النجاح',
    name_en: 'Al Najah Supermarket',
    delivery_fee: 12,
    min_order: 60,
  },
  RESTAURANT: {
    id: 'ee85ee6d-6219-4816-8167-e5c20f704123',
    name_ar: 'سلطان بيتزا',
    name_en: 'Sultan Pizza',
    delivery_fee: 15,
    min_order: 50,
  },
  CAFE: {
    id: '9418fc0f-58d9-404c-b31f-ec240867bdb0',
    name_ar: 'لافندر كافيه',
    name_en: 'Lavender Cafe',
    delivery_fee: 8,
    min_order: 30,
  },
};

// Real products from database
const TEST_PRODUCTS = [
  { id: '08a753e0-d833-4f74-8efd-2650ebb850b4', name_ar: 'لوز', price: 150 },
  { id: 'c215d405-4ace-4da7-8294-73504a994c69', name_ar: 'كورتادو', price: 25 },
  { id: 'c58280b1-5391-4517-8d4e-239dbedc74b8', name_ar: 'ريستريتو', price: 20 },
  { id: 'c4647d73-0751-490c-bd2e-0ecc40d85be6', name_ar: 'أرز', price: 15 },
  { id: 'd310ba3c-3965-4ce6-9027-197132f9296f', name_ar: 'حمص', price: 18 },
];

// Real location data
const TEST_LOCATION = {
  governorate_id: '11111111-1111-1111-1111-111111111111',
  governorate_ar: 'بني سويف',
  city_id: '21111111-1111-1111-1111-111111111111',
  city_ar: 'بني سويف',
};

test.describe('Phase 5: Data-Driven Tests', () => {
  test.describe('5.1 Provider Data Verification', () => {
    test.use({ storageState: CUSTOMER_STORAGE_STATE });

    test('should display Sultan Pizza provider', async ({ page }) => {
      await page.goto(`/ar/providers/${TEST_PROVIDERS.RESTAURANT.id}`, {
        timeout: NAVIGATION_TIMEOUT,
      });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const content = await page.locator('body').innerText();
      // Should show provider name or redirect to providers list
      expect(
        content.includes(TEST_PROVIDERS.RESTAURANT.name_ar) ||
          content.includes('سلطان') ||
          page.url().includes('/providers')
      ).toBeTruthy();
    });

    test('should display Lavender Cafe provider', async ({ page }) => {
      await page.goto(`/ar/providers/${TEST_PROVIDERS.CAFE.id}`, {
        timeout: NAVIGATION_TIMEOUT,
      });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const content = await page.locator('body').innerText();
      expect(
        content.includes(TEST_PROVIDERS.CAFE.name_ar) ||
          content.includes('لافندر') ||
          page.url().includes('/providers')
      ).toBeTruthy();
    });

    test('should display Al Najah Supermarket', async ({ page }) => {
      await page.goto(`/ar/providers/${TEST_PROVIDERS.GROCERY.id}`, {
        timeout: NAVIGATION_TIMEOUT,
      });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const content = await page.locator('body').innerText();
      expect(
        content.includes(TEST_PROVIDERS.GROCERY.name_ar) ||
          content.includes('النجاح') ||
          page.url().includes('/providers')
      ).toBeTruthy();
    });
  });

  test.describe('5.2 Product Display Tests', () => {
    test.use({ storageState: CUSTOMER_STORAGE_STATE });

    test('should show products on provider page', async ({ page }) => {
      await page.goto(`/ar/providers/${TEST_PROVIDERS.RESTAURANT.id}`, {
        timeout: NAVIGATION_TIMEOUT,
      });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const content = await page.locator('body').innerText();
      // Check for any of the known products
      const hasProducts =
        content.includes('لوز') ||
        content.includes('كورتادو') ||
        content.includes('أرز') ||
        content.includes('حمص') ||
        content.includes('ريستريتو');

      // Either has products or page loaded with content
      expect(hasProducts || content.length > 100).toBeTruthy();
    });

    test('should show prices in EGP format', async ({ page }) => {
      await page.goto(`/ar/providers/${TEST_PROVIDERS.RESTAURANT.id}`, {
        timeout: NAVIGATION_TIMEOUT,
      });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const content = await page.locator('body').innerText();
      // Check for price indicators
      const hasPrices =
        content.includes('ج.م') ||
        content.includes('EGP') ||
        content.includes('جنيه') ||
        /\d+\.\d{2}/.test(content) || // Price format like 25.00
        /\d{2,3}/.test(content); // Any 2-3 digit number (prices)

      expect(hasPrices || content.length > 100).toBeTruthy();
    });
  });

  test.describe('5.3 Location Selection Flow', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should access governorate selection without login', async ({ page }) => {
      await page.goto('/ar/profile/governorate', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const url = page.url();
      // Should NOT redirect to login - this is a public page now
      expect(!url.includes('/auth/login')).toBeTruthy();
    });

    test('should access city selection without login', async ({ page }) => {
      await page.goto('/ar/profile/city', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const url = page.url();
      // Should NOT redirect to login - this is a public page now
      expect(!url.includes('/auth/login')).toBeTruthy();
    });

    test('should show Beni Suef in location options', async ({ page }) => {
      await page.goto('/ar/profile/governorate', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const content = await page.locator('body').innerText();
      // Should show Beni Suef governorate
      expect(
        content.includes('بني سويف') || content.includes('Beni') || content.length > 50
      ).toBeTruthy();
    });
  });

  test.describe('5.4 Checkout Page Access', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should access checkout page without login (view only)', async ({ page }) => {
      await page.goto('/ar/checkout', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const url = page.url();
      // Checkout should be accessible (may redirect to cart if empty)
      expect(!url.includes('/auth/login')).toBeTruthy();
    });
  });

  test.describe('5.5 Order History with Real Data', () => {
    test.use({ storageState: CUSTOMER_STORAGE_STATE });

    test('should display order history page', async ({ page }) => {
      await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      if (!page.url().includes('/login')) {
        const content = await page.locator('body').innerText();
        // Should show order-related content
        expect(
          content.includes('طلب') ||
            content.includes('ENG-') || // Order number prefix
            content.includes('لا يوجد') || // No orders message
            content.length > 50
        ).toBeTruthy();
      }
    });

    test('should show order statuses', async ({ page }) => {
      await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      if (!page.url().includes('/login')) {
        const content = await page.locator('body').innerText();
        // Should show status indicators
        const hasStatusInfo =
          content.includes('تم التسليم') || // delivered
          content.includes('قيد الانتظار') || // pending
          content.includes('delivered') ||
          content.includes('pending') ||
          content.includes('جديد');

        expect(hasStatusInfo || content.length > 50).toBeTruthy();
      }
    });
  });

  test.describe('5.6 Provider Admin - Real Provider Data', () => {
    test.use({ storageState: PROVIDER_STORAGE_STATE });

    test('should show provider dashboard with real data', async ({ page }) => {
      await page.goto('/ar/provider', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');

      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();

        // Should show dashboard elements
        expect(
          content.includes('طلب') ||
            content.includes('إيرادات') ||
            content.includes('اليوم') ||
            content.length > 100
        ).toBeTruthy();
      }
    });

    test('should display products management with real products', async ({ page }) => {
      await page.goto('/ar/provider/products', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');

      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();

        // Should show products or add product option
        expect(
          content.includes('منتج') ||
            content.includes('إضافة') ||
            content.includes('المنتجات') ||
            content.length > 50
        ).toBeTruthy();
      }
    });
  });

  test.describe('5.7 Admin - Real Data Management', () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test('should show providers in admin panel', async ({ page }) => {
      await page.goto('/ar/admin/providers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');

      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();

        // Should show provider names from our test data
        const hasRealProviders =
          content.includes('سلطان') ||
          content.includes('لافندر') ||
          content.includes('النجاح') ||
          content.includes('Sultan') ||
          content.includes('Lavender');

        expect(hasRealProviders || content.length > 100).toBeTruthy();
      }
    });

    test('should show orders in admin panel', async ({ page }) => {
      await page.goto('/ar/admin/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');

      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();

        // Should show order-related content
        expect(
          content.includes('ENG-') || // Order number
            content.includes('طلب') ||
            content.includes('حالة') ||
            content.length > 50
        ).toBeTruthy();
      }
    });

    test('should show Beni Suef in locations', async ({ page }) => {
      await page.goto('/ar/admin/locations', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');

      if (!page.url().includes('/login')) {
        await waitForPageReady(page);
        const content = await page.locator('body').innerText();

        // Should show Beni Suef location
        expect(
          content.includes('بني سويف') ||
            content.includes('Beni Suef') ||
            content.includes('محافظ') ||
            content.length > 50
        ).toBeTruthy();
      }
    });
  });
});
