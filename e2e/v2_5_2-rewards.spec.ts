import { test, expect, type Page } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './fixtures/test-utils';

/**
 * v2.5.2 — Phase 8 smoke tests
 *
 * Tier 1 (CI-cheap, no DB seeding required):
 *   • Three new admin pages render without crashing
 *   • Customer home renders for an unauthenticated visitor — no welcome
 *     dialog leaks, no carousel a11y regression
 *
 * Tier 2 (would need fixtures with welcome boxes / streaks / mega-referrer
 * slots prepared) is intentionally skipped here. Those flows belong in
 * business-flow*.spec.ts once a seed script lands.
 */

const isCI = process.env.CI === 'true';
const NAV_TIMEOUT = isCI ? 20_000 : 15_000;

async function waitForPageReady(page: Page) {
  const spinner = page.locator('.animate-spin');
  try {
    await spinner.first().waitFor({ state: 'visible', timeout: 5_000 });
    await spinner.first().waitFor({ state: 'hidden', timeout: 12_000 });
  } catch {
    // No spinner — that's fine
  }
  await page.waitForTimeout(300);
}

async function expectNoServerError(page: Page) {
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('Application error');
  expect(body).not.toContain('This page could not be found');
  expect(body).not.toMatch(/500\s+(Internal|Server)/);
}

// ════════════════════════════════════════════════════════════════════════════
// Admin pages — new in v2.5.2
// ════════════════════════════════════════════════════════════════════════════

test.describe('v2.5.2 admin surfaces', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('/admin/tier-rewards renders the 4 tier cards', async ({ page }) => {
    await page.goto('/ar/admin/tier-rewards', { timeout: NAV_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    const body = await page.locator('body').innerText();
    // The four tier labels should all appear after data loads.
    expect(body).toContain('برونزي');
    expect(body).toContain('فضي');
    expect(body).toContain('ذهبي');
    expect(body).toContain('بلاتيني');
  });

  test('/admin/streaks renders the analytics dashboard', async ({ page }) => {
    await page.goto('/ar/admin/streaks', { timeout: NAV_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    const body = await page.locator('body').innerText();
    expect(body).toContain('سلاسل العملاء');
    // At least one of the KPI labels
    expect(body).toMatch(/(النشطون|أطول سلسلة)/);
  });

  test('/admin/mega-referrers renders the 10-slot board', async ({ page }) => {
    await page.goto('/ar/admin/mega-referrers', { timeout: NAV_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    const body = await page.locator('body').innerText();
    expect(body).toContain('أوائل المُحيلين');
    // The leaderboard either shows entries OR shows "Available" placeholders —
    // both are valid for a fresh DB.
    expect(body).toMatch(/(متاح|إحالة)/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Customer home — a11y regression guards (the bug we fixed: a11y 0.86 → 0.9+)
// ════════════════════════════════════════════════════════════════════════════

test.describe('v2.5.2 customer home a11y', () => {
  // No storageState → unauthenticated visitor (the exact scenario that
  // tripped Lighthouse — WelcomeBoxModal flashed a dialog without a name).

  test('home renders without leaking a dialog for unauthenticated visitors', async ({ page }) => {
    await page.goto('/ar/welcome', { timeout: NAV_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);
    await expectNoServerError(page);

    // WelcomeBoxModal must NOT remain visible for an unauthenticated visitor.
    // The 401 → silent close path should fire before the dialog flashes.
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toHaveCount(0, { timeout: 3_000 });
  });

  test('any dialog that does render has an accessible name', async ({ page }) => {
    await page.goto('/ar/welcome', { timeout: NAV_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Defense-in-depth: even if a dialog DID render (e.g. cookie banner),
    // it must have aria-label OR aria-labelledby pointing to a present element.
    const dialogs = await page.locator('[role="dialog"]').all();
    for (const d of dialogs) {
      const ariaLabel = await d.getAttribute('aria-label');
      const labelledBy = await d.getAttribute('aria-labelledby');
      const hasNameSource = Boolean(
        ariaLabel?.trim() || (labelledBy && (await page.locator(`#${labelledBy}`).count()) > 0)
      );
      expect(hasNameSource).toBe(true);
    }
  });

  test('carousel pagination buttons have accessible names', async ({ page }) => {
    await page.goto('/ar/welcome', { timeout: NAV_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // The OffersCarousel + PartnerBannersCarousel pagination dots are
    // h-1.5 buttons. v2.5.2 added aria-label="Go to slide N" / "الانتقال إلى الشريحة N".
    const dotButtons = page.locator('button.h-1\\.5.rounded-full');
    const count = await dotButtons.count();

    // Only enforce if any dots exist (carousel may be empty on a fresh DB)
    if (count === 0) {
      test.info().annotations.push({
        type: 'skipped',
        description: 'no carousel pagination dots on this page',
      });
      return;
    }

    for (let i = 0; i < count; i++) {
      const ariaLabel = await dotButtons.nth(i).getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      // Should mention slide/شريحة, not be a bare default
      expect(ariaLabel).toMatch(/(slide|شريحة)/i);
    }
  });
});
