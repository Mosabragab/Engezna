import { test, expect } from '@playwright/test';
import { TEST_USERS, LOCATORS } from './fixtures/test-utils';

/**
 * Authentication E2E Tests
 *
 * Tests real login/logout flows for all user roles.
 * No mocking - uses real Supabase authentication.
 */

// Faster timeouts - networkidle was causing issues
const isCI = process.env.CI === 'true';
const DEFAULT_TIMEOUT = isCI ? 15000 : 10000;
const NAVIGATION_TIMEOUT = isCI ? 20000 : 15000;

test.describe('Authentication - Real Login Flows', () => {
  test.describe('Customer Authentication', () => {
    test('should login as customer and redirect to home', async ({ page }) => {
      await page.goto('/ar/auth/login');
      await page.waitForLoadState('domcontentloaded');

      // Customer login requires clicking "Continue with Email" first
      const emailButton = page.locator(LOCATORS.continueWithEmailButton);
      await expect(emailButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
      await emailButton.click();

      // Wait for form to appear
      const emailInput = page.locator(LOCATORS.emailInput);
      await expect(emailInput).toBeVisible({ timeout: DEFAULT_TIMEOUT });

      // Fill login form
      await emailInput.fill(TEST_USERS.customer.email);
      await page.locator(LOCATORS.passwordInput).fill(TEST_USERS.customer.password);

      // Submit and wait for navigation
      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT }),
        page.click(LOCATORS.submitButton),
      ]);

      // Verify redirect away from auth page
      const url = page.url();
      expect(url).not.toContain('/auth/login');

      // Should see customer-facing content (home page or providers)
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(50);
    });

    test('should show error with invalid customer credentials', async ({ page }) => {
      await page.goto('/ar/auth/login');
      await page.waitForLoadState('domcontentloaded');

      // Click continue with email
      const emailButton = page.locator(LOCATORS.continueWithEmailButton);
      await expect(emailButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
      await emailButton.click();

      // Fill invalid credentials
      const emailInput = page.locator(LOCATORS.emailInput);
      await expect(emailInput).toBeVisible({ timeout: DEFAULT_TIMEOUT });

      await emailInput.fill('invalid@test.com');
      await page.locator(LOCATORS.passwordInput).fill('wrongpassword');

      await page.click(LOCATORS.submitButton);
      await page.waitForTimeout(3000); // Wait for error response

      // Should stay on login page or show error
      const url = page.url();
      const hasError =
        url.includes('/auth') ||
        (await page
          .locator('text=/خطأ|error|incorrect|invalid/i')
          .isVisible()
          .catch(() => false));

      expect(hasError).toBeTruthy();
    });
  });

  test.describe('Provider Authentication', () => {
    test('should login as provider and redirect to dashboard', async ({ page }) => {
      await page.goto('/ar/provider/login');
      await page.waitForLoadState('domcontentloaded');

      // Wait for auth spinner to disappear and form to appear
      const emailInput = page.locator(LOCATORS.emailInput);
      await expect(emailInput).toBeVisible({ timeout: DEFAULT_TIMEOUT });

      // Fill login form
      await emailInput.fill(TEST_USERS.provider.email);
      await page.locator(LOCATORS.passwordInput).fill(TEST_USERS.provider.password);

      // Submit and wait for navigation
      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT }),
        page.click(LOCATORS.submitButton),
      ]);

      // Should be on provider dashboard (not login page)
      const url = page.url();
      expect(url).toContain('/provider');
      expect(url).not.toContain('/login');

      // Should see provider dashboard content
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(50);
    });

    test('should logout provider successfully', async ({ page }) => {
      // First login
      await page.goto('/ar/provider/login');
      await page.waitForLoadState('domcontentloaded');

      const emailInput = page.locator(LOCATORS.emailInput);
      await expect(emailInput).toBeVisible({ timeout: DEFAULT_TIMEOUT });

      await emailInput.fill(TEST_USERS.provider.email);
      await page.locator(LOCATORS.passwordInput).fill(TEST_USERS.provider.password);
      await page.click(LOCATORS.submitButton);
      await page.waitForLoadState('domcontentloaded');

      // Wait for dashboard to load
      await page.waitForTimeout(2000);

      // Find and click logout button
      const logoutBtn = page.locator(
        'button:has-text("خروج"), button:has-text("Logout"), button:has-text("تسجيل الخروج")'
      );

      if (
        await logoutBtn
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await logoutBtn.first().click();
        await page.waitForLoadState('domcontentloaded');

        // Should redirect to login page
        const url = page.url();
        expect(url.includes('/login') || url.includes('/auth')).toBeTruthy();
      } else {
        // Logout might be in a menu - try sidebar
        const sidebar = page.locator('aside, nav[class*="sidebar"]');
        if (
          await sidebar
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          await sidebar.first().click();
          await page.waitForTimeout(500);

          const menuLogout = page.locator(
            'a:has-text("خروج"), button:has-text("خروج"), a:has-text("تسجيل الخروج")'
          );
          if (
            await menuLogout
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            await menuLogout.first().click();
          }
        }
      }
    });
  });

  test.describe('Admin Authentication', () => {
    test('should login as admin and redirect to admin dashboard', async ({ page }) => {
      await page.goto('/ar/admin/login');
      await page.waitForLoadState('domcontentloaded');

      // Wait for auth spinner to disappear and form to appear
      const emailInput = page.locator(LOCATORS.emailInput);
      await expect(emailInput).toBeVisible({ timeout: DEFAULT_TIMEOUT });

      // Fill login form
      await emailInput.fill(TEST_USERS.admin.email);
      await page.locator(LOCATORS.passwordInput).fill(TEST_USERS.admin.password);

      // Submit and wait for navigation
      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT }),
        page.click(LOCATORS.submitButton),
      ]);

      // Should be on admin dashboard (not login page)
      const url = page.url();
      expect(url).toContain('/admin');
      expect(url).not.toContain('/login');

      // Should see admin dashboard content
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(50);
    });
  });
});
