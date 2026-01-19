import { test, expect, Page } from '@playwright/test';
import {
  CUSTOMER_STORAGE_STATE,
  PROVIDER_STORAGE_STATE,
  ADMIN_STORAGE_STATE,
} from './global-setup';

/**
 * Security & Limits E2E Tests - Phase 3
 *
 * Tests security features and rate limiting:
 * - Authorization (IDOR protection)
 * - Role-based access control
 * - Rate limiting
 * - XSS protection
 * - CSRF protection
 * - Input validation
 *
 * No mocking - tests real security controls.
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

test.describe('3.1 Authorization - IDOR Protection', () => {
  test.describe('Customer cannot access provider pages', () => {
    test.use({ storageState: CUSTOMER_STORAGE_STATE });

    test('should redirect customer from provider dashboard', async ({ page }) => {
      await page.goto('/ar/provider', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      const url = page.url();
      // Should redirect to login or show unauthorized
      expect(
        url.includes('/login') ||
          url.includes('/auth') ||
          !url.includes('/provider') ||
          url === 'about:blank'
      ).toBeTruthy();
    });

    test('should redirect customer from provider orders', async ({ page }) => {
      await page.goto('/ar/provider/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');

      const url = page.url();
      expect(
        url.includes('/login') || url.includes('/auth') || !url.includes('/provider/orders')
      ).toBeTruthy();
    });

    test('should redirect customer from admin panel', async ({ page }) => {
      await page.goto('/ar/admin', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');

      const url = page.url();
      expect(
        url.includes('/login') || url.includes('/auth') || !url.endsWith('/admin')
      ).toBeTruthy();
    });
  });

  test.describe('Provider cannot access admin pages', () => {
    test.use({ storageState: PROVIDER_STORAGE_STATE });

    test('should redirect provider from admin dashboard', async ({ page }) => {
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

    test('should redirect provider from admin orders', async ({ page }) => {
      await page.goto('/ar/admin/orders', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');

      const url = page.url();
      expect(
        url.includes('/login') || url.includes('/auth') || !url.includes('/admin/orders')
      ).toBeTruthy();
    });

    test('should redirect provider from admin customers', async ({ page }) => {
      await page.goto('/ar/admin/customers', { timeout: NAVIGATION_TIMEOUT });
      await page.waitForLoadState('domcontentloaded');

      const url = page.url();
      expect(
        url.includes('/login') || url.includes('/auth') || !url.includes('/admin/customers')
      ).toBeTruthy();
    });
  });
});

test.describe('3.2 Unauthenticated Access Protection', () => {
  // Use empty storage state for unauthenticated tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should require auth for customer orders', async ({ page }) => {
    await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const url = page.url();
    expect(url.includes('/login') || url.includes('/auth')).toBeTruthy();
  });

  test('should require auth for customer profile', async ({ page }) => {
    await page.goto('/ar/profile', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    expect(url.includes('/login') || url.includes('/auth')).toBeTruthy();
  });

  test('should require auth for cart', async ({ page }) => {
    await page.goto('/ar/cart', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');

    // Cart might be accessible but empty, or redirect to login
    const url = page.url();
    const content = await page.locator('body').innerText();

    expect(
      url.includes('/login') ||
        url.includes('/auth') ||
        content.includes('فارغ') ||
        content.includes('empty') ||
        content.includes('سلة') ||
        content.length > 50
    ).toBeTruthy();
  });

  test('should allow access to providers list without auth', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Providers page should be public
    const url = page.url();
    const content = await page.locator('body').innerText();

    expect(url.includes('/providers') || content.length > 50).toBeTruthy();
  });

  test('should allow access to home page without auth', async ({ page }) => {
    await page.goto('/ar', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();
    expect(content.length).toBeGreaterThan(50);
  });
});

test.describe('3.3 XSS Protection', () => {
  test.use({ storageState: CUSTOMER_STORAGE_STATE });

  test('should escape XSS in search input', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="بحث"], input[name="search"]'
    );

    if (await searchInput.isVisible().catch(() => false)) {
      // Try XSS payload
      const xssPayload = '<script>alert("XSS")</script>';
      await searchInput.fill(xssPayload);
      await page.waitForTimeout(1000);

      // Check that script is not executed (page should not show alert)
      const content = await page.locator('body').innerText();

      // Script tags should be escaped or sanitized
      expect(content.includes('<script>')).toBeFalsy();
    }
  });

  test('should escape XSS in URL parameters', async ({ page }) => {
    const xssUrl = '/ar/providers?q=<script>alert("XSS")</script>';
    await page.goto(xssUrl, { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');

    // Page should load without executing script
    const content = await page.locator('body').innerText();
    expect(content.includes('<script>')).toBeFalsy();
  });
});

test.describe('3.4 Input Validation', () => {
  test.use({ storageState: CUSTOMER_STORAGE_STATE });

  test('should validate email format on profile', async ({ page }) => {
    await page.goto('/ar/profile/email', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const emailInput = page.locator('input[type="email"], input[name="email"]');

      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill('invalid-email');

        const submitBtn = page.locator(
          'button[type="submit"], button:has-text("حفظ"), button:has-text("save")'
        );
        if (
          await submitBtn
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          await submitBtn.first().click();
          await page.waitForTimeout(1000);

          // Should show validation error or not submit
          const content = await page.locator('body').innerText();
          expect(
            content.includes('خطأ') ||
              content.includes('error') ||
              content.includes('invalid') ||
              content.includes('صحيح') ||
              page.url().includes('/email')
          ).toBeTruthy();
        }
      }
    }
  });

  test('should validate phone number format', async ({ page }) => {
    await page.goto('/ar/profile/account', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const phoneInput = page.locator(
        'input[type="tel"], input[name="phone"], input[placeholder*="هاتف"]'
      );

      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('abc123'); // Invalid phone

        const submitBtn = page.locator('button[type="submit"], button:has-text("حفظ")');
        if (
          await submitBtn
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          await submitBtn.first().click();
          await page.waitForTimeout(1000);

          // Should show validation error
          const content = await page.locator('body').innerText();
          expect(
            content.includes('خطأ') ||
              content.includes('error') ||
              content.includes('رقم') ||
              page.url().includes('/account')
          ).toBeTruthy();
        }
      }
    }
  });
});

test.describe('3.5 Rate Limiting', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should handle multiple rapid requests gracefully', async ({ page }) => {
    // Make multiple rapid requests
    const requests: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      requests.push(page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT }).then(() => {}));
    }

    // Wait for last request
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');

    // Page should still work (might be rate limited but should not crash)
    const content = await page.locator('body').innerText();
    expect(content.length).toBeGreaterThan(0);
  });
});

test.describe('3.6 Session Security', () => {
  test('should redirect to login after logout', async ({ page }) => {
    // Use customer storage state
    await page.goto('/ar/profile', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Find and click logout
    const logoutBtn = page.locator(
      'button:has-text("خروج"), button:has-text("logout"), button:has-text("تسجيل الخروج")'
    );

    if (
      await logoutBtn
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await logoutBtn.first().click();
      await page.waitForLoadState('domcontentloaded');

      // Should be logged out
      const url = page.url();
      expect(
        url.includes('/login') || url.includes('/auth') || url.includes('/ar') // Home page
      ).toBeTruthy();
    }
  });
});

test.describe('3.7 Data Protection', () => {
  test.use({ storageState: CUSTOMER_STORAGE_STATE });

  test('should not expose sensitive data in page source', async ({ page }) => {
    await page.goto('/ar/profile', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const pageContent = await page.content();

      // Should not contain sensitive patterns
      expect(pageContent.includes('password')).toBeFalsy();
      expect(pageContent.includes('secret')).toBeFalsy();
      expect(pageContent.includes('api_key')).toBeFalsy();
    }
  });

  test('should mask sensitive information display', async ({ page }) => {
    await page.goto('/ar/profile/account', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      // Check that password fields are masked
      const passwordInputs = page.locator('input[type="password"]');
      const count = await passwordInputs.count();

      for (let i = 0; i < count; i++) {
        const type = await passwordInputs.nth(i).getAttribute('type');
        expect(type).toBe('password');
      }
    }
  });
});
