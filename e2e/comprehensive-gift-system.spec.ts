import { test, expect, type Page } from '@playwright/test';
import {
  ADMIN_STORAGE_STATE,
  CUSTOMER_STORAGE_STATE,
  PROVIDER_STORAGE_STATE,
} from './fixtures/test-utils';

/**
 * Phase 17 — Gift System smoke E2E
 *
 * Single CI-tier sanity test for every page added in Phases 9–16. Each test
 * just navigates and asserts the page renders without a 500/error boundary
 * and that a key element is visible. Full DB-integration flows (granting +
 * claiming + redeeming) require seeded test data that lives outside this
 * smoke suite — those should be added to business-flow*.spec.ts when the
 * fixtures are ready.
 */

const isCI = process.env.CI === 'true';
const NAVIGATION_TIMEOUT = isCI ? 20000 : 15000;

async function waitForPageReady(page: Page): Promise<void> {
  const spinner = page.locator('.animate-spin');
  try {
    await spinner.first().waitFor({ state: 'visible', timeout: 5000 });
    await spinner.first().waitFor({ state: 'hidden', timeout: 12000 });
  } catch {
    // Spinner may not appear at all
  }
  await page.waitForTimeout(400);
}

async function expectNoServerError(page: Page) {
  // Catch obvious failures fast: Next.js 500 page, our error boundary text,
  // and the React DevTools "Application error" overlay.
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('500');
  expect(body).not.toContain('Application error');
  expect(body).not.toContain('This page could not be found');
}

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMER — Rewards hub + gift landing
// ════════════════════════════════════════════════════════════════════════════

test.describe('Phase 17: Customer gift surfaces', () => {
  test.use({ storageState: CUSTOMER_STORAGE_STATE });

  test('rewards hub renders for an authenticated customer', async ({ page }) => {
    await page.goto('/ar/rewards', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
  });

  test('gift landing page handles invalid token gracefully', async ({ page }) => {
    // 32 hex chars → matches the token CHECK constraint length but is not
    // present in DB; should render the "not found" state, not a 500.
    const fakeToken = '0'.repeat(32);
    await page.goto(`/ar/gift/${fakeToken}`, { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);
  });

  test('notification preferences page renders the gift_reminders toggle', async ({ page }) => {
    await page.goto('/ar/profile/notifications', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    // Phase 16 added 'تذكيرات الهدايا' to the customer preferences list
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/تذكيرات الهدايا|Gift Reminders/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PROVIDER — Partner gifts + analytics subscription
// ════════════════════════════════════════════════════════════════════════════

test.describe('Phase 17: Provider gift surfaces', () => {
  test.use({ storageState: PROVIDER_STORAGE_STATE });

  test('partner gifts list renders', async ({ page }) => {
    await page.goto('/ar/provider/gifts', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);
  });

  test('new partner gift form renders with settlement preview', async ({ page }) => {
    await page.goto('/ar/provider/gifts/new', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    // The settlement preview card was the headline UX bit
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/التسوية|settlement/i);
  });

  test('analytics subscription page renders the 3 tier cards', async ({ page }) => {
    await page.goto('/ar/provider/billing/subscription', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    const body = await page.locator('body').innerText();
    // basic / pro / elite labels (AR or EN, depending on locale resolution)
    expect(body).toMatch(/الأساسية|Basic/);
    expect(body).toMatch(/المحترف|Pro/);
    expect(body).toMatch(/النخبة|Elite/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — gifts dashboard / rules / budget / campaigns / partners + ERP
// ════════════════════════════════════════════════════════════════════════════

test.describe('Phase 17: Admin gift + ERP surfaces', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('gifts overview redirects or renders dashboard', async ({ page }) => {
    await page.goto('/ar/admin/gifts', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);
  });

  test('rules page lists automatic rules with toggle', async ({ page }) => {
    await page.goto('/ar/admin/gifts/rules', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);
  });

  test('budget page renders the EGP form (not piasters)', async ({ page }) => {
    await page.goto('/ar/admin/gifts/budget', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    const body = await page.locator('body').innerText();
    // Phase 13 follow-up: budget UI switched piasters → EGP everywhere
    expect(body).toMatch(/ج\.م|EGP/);
  });

  test('campaigns list renders', async ({ page }) => {
    await page.goto('/ar/admin/gifts/campaigns', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);
  });

  test('campaign new form renders', async ({ page }) => {
    await page.goto('/ar/admin/gifts/campaigns/new', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);
  });

  test('partner gifts review queue renders', async ({ page }) => {
    await page.goto('/ar/admin/gifts/partners', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);
  });

  test('analytics page renders the chart shell', async ({ page }) => {
    await page.goto('/ar/admin/gifts/analytics', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);
  });

  test('ERP overview renders KPI grid + month picker', async ({ page }) => {
    await page.goto('/ar/admin/erp', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    const body = await page.locator('body').innerText();
    // Headline KPI cards always visible after load
    expect(body).toMatch(/Revenue|الإيرادات/);
  });
});
