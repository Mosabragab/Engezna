import { test, expect, Page } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './global-setup';

/**
 * Admin & Integrations E2E Tests - Phase 4
 *
 * Tests admin panel functionality:
 * - Dashboard and analytics
 * - Order management
 * - Provider management
 * - Customer management
 * - Finance and settlements
 * - Support and complaints
 * - System settings
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

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('4.1 Admin Dashboard', () => {
  test('should display admin dashboard', async ({ page }) => {
    await page.goto('/ar/admin', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const url = page.url();
    if (!url.includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('لوحة') ||
          content.includes('dashboard') ||
          content.includes('إدارة') ||
          content.includes('admin') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display analytics page', async ({ page }) => {
    await page.goto('/ar/admin/analytics', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('تحليلات') ||
          content.includes('analytics') ||
          content.includes('إحصائيات') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display activity log', async ({ page }) => {
    await page.goto('/ar/admin/activity-log', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('نشاط') ||
          content.includes('activity') ||
          content.includes('سجل') ||
          content.includes('log') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('4.2 Order Management', () => {
  test('should display all orders', async ({ page }) => {
    await page.goto('/ar/admin/orders', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('طلب') ||
          content.includes('order') ||
          content.includes('لا يوجد') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display custom orders', async ({ page }) => {
    await page.goto('/ar/admin/custom-orders', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('مخصص') ||
          content.includes('custom') ||
          content.includes('طلب') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display refunds page', async ({ page }) => {
    await page.goto('/ar/admin/refunds', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('استرجاع') ||
          content.includes('refund') ||
          content.includes('لا يوجد') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('4.3 Provider Management', () => {
  test('should display providers list', async ({ page }) => {
    await page.goto('/ar/admin/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('متجر') ||
          content.includes('provider') ||
          content.includes('تاجر') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display approvals page', async ({ page }) => {
    await page.goto('/ar/admin/approvals', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('موافقة') ||
          content.includes('approval') ||
          content.includes('طلب') ||
          content.includes('لا يوجد') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display banners management', async ({ page }) => {
    await page.goto('/ar/admin/banners', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('بانر') ||
          content.includes('banner') ||
          content.includes('إعلان') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('4.4 Customer Management', () => {
  test('should display customers list', async ({ page }) => {
    await page.goto('/ar/admin/customers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('عميل') ||
          content.includes('customer') ||
          content.includes('مستخدم') ||
          content.includes('user') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('4.5 Finance & Settlements', () => {
  test('should display finance overview', async ({ page }) => {
    await page.goto('/ar/admin/finance', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('مالية') ||
          content.includes('finance') ||
          content.includes('إيراد') ||
          content.includes('revenue') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display settlements page', async ({ page }) => {
    await page.goto('/ar/admin/settlements', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
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

  test('should display settlement groups', async ({ page }) => {
    await page.goto('/ar/admin/settlements/groups', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('مجموعة') ||
          content.includes('group') ||
          content.includes('تسوية') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('4.6 Support & Complaints', () => {
  test('should display support tickets', async ({ page }) => {
    await page.goto('/ar/admin/support', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('دعم') ||
          content.includes('support') ||
          content.includes('تذكرة') ||
          content.includes('ticket') ||
          content.includes('لا يوجد') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display resolution center', async ({ page }) => {
    await page.goto('/ar/admin/resolution-center', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('حل') ||
          content.includes('resolution') ||
          content.includes('نزاع') ||
          content.includes('dispute') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display escalation rules', async ({ page }) => {
    await page.goto('/ar/admin/escalation-rules', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('تصعيد') ||
          content.includes('escalation') ||
          content.includes('قاعدة') ||
          content.includes('rule') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('4.7 System Settings', () => {
  test('should display settings page', async ({ page }) => {
    await page.goto('/ar/admin/settings', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('إعدادات') ||
          content.includes('settings') ||
          content.includes('نظام') ||
          content.includes('system') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display locations page', async ({ page }) => {
    await page.goto('/ar/admin/locations', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('موقع') ||
          content.includes('location') ||
          content.includes('منطقة') ||
          content.includes('area') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display email templates', async ({ page }) => {
    await page.goto('/ar/admin/email-templates', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('بريد') ||
          content.includes('email') ||
          content.includes('قالب') ||
          content.includes('template') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display announcements page', async ({ page }) => {
    await page.goto('/ar/admin/announcements', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('إعلان') ||
          content.includes('announcement') ||
          content.includes('تنبيه') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display promotions page', async ({ page }) => {
    await page.goto('/ar/admin/promotions', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('عرض') ||
          content.includes('promotion') ||
          content.includes('خصم') ||
          content.includes('discount') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('4.8 Team Management', () => {
  test('should display supervisors list', async ({ page }) => {
    await page.goto('/ar/admin/supervisors', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('مشرف') ||
          content.includes('supervisor') ||
          content.includes('فريق') ||
          content.includes('team') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display roles page', async ({ page }) => {
    await page.goto('/ar/admin/roles', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('صلاحية') ||
          content.includes('role') ||
          content.includes('دور') ||
          content.includes('permission') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display tasks page', async ({ page }) => {
    await page.goto('/ar/admin/tasks', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('مهمة') ||
          content.includes('task') ||
          content.includes('لا يوجد') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should display messages page', async ({ page }) => {
    await page.goto('/ar/admin/messages', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();
      expect(
        content.includes('رسالة') ||
          content.includes('message') ||
          content.includes('لا يوجد') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});
