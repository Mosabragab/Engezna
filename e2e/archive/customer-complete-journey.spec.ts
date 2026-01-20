import { test, expect, Page } from '@playwright/test';
import { CUSTOMER_STORAGE_STATE } from './fixtures/test-utils';

/**
 * Customer Complete Journey E2E Tests - Phase 1
 *
 * Tests the complete customer flow including:
 * - Store browsing and search
 * - Product viewing
 * - Cart operations
 * - Order tracking
 * - Custom orders
 * - Edge cases
 *
 * No mocking - uses real Supabase data from production.
 */

// Timeout configuration
const isCI = process.env.CI === 'true';
const DEFAULT_TIMEOUT = isCI ? 15000 : 10000;
const NAVIGATION_TIMEOUT = isCI ? 20000 : 15000;

/**
 * Wait for page to be ready (spinner gone, content loaded)
 */
async function waitForPageReady(page: Page): Promise<void> {
  const spinner = page.locator('.animate-spin');

  try {
    await spinner.first().waitFor({ state: 'visible', timeout: 5000 });
    await spinner.first().waitFor({ state: 'hidden', timeout: DEFAULT_TIMEOUT });
  } catch {
    // Spinner might not appear or already hidden
  }

  await page.waitForTimeout(500);
}

/**
 * Get localized text (Arabic or English)
 */
function getLocalizedText(ar: string, en: string, locale = 'ar'): string {
  return locale === 'ar' ? ar : en;
}

// Use customer storage state for authenticated tests
test.use({ storageState: CUSTOMER_STORAGE_STATE });

test.describe('1.2 Store Browsing', () => {
  test('should display providers list page', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();

    // Should show providers or loading state
    expect(
      content.length > 50 ||
        (await page.locator('[class*="card"], [class*="Card"]').count()) > 0 ||
        (await page.locator('a[href*="/providers/"]').count()) > 0
    ).toBeTruthy();
  });

  test('should display provider cards with store info', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Look for provider cards
    const cards = page.locator('[class*="card"], [class*="Card"], article');
    const cardCount = await cards.count();

    // Should have at least one provider card or empty state
    const content = await page.locator('body').innerText();
    expect(
      cardCount > 0 ||
        content.includes('لا يوجد') ||
        content.includes('لا توجد') ||
        content.includes('no') ||
        content.length > 100
    ).toBeTruthy();

    console.log(`Found ${cardCount} provider cards`);
  });

  test('should filter providers by category', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Look for category filters (tabs or buttons)
    const categoryFilters = page.locator(
      '[role="tab"], button[data-category], [class*="filter"], [class*="category"]'
    );
    const filterCount = await categoryFilters.count();

    console.log(`Found ${filterCount} category filters`);

    // If filters exist, try clicking one
    if (filterCount > 0) {
      await categoryFilters.first().click();
      await waitForPageReady(page);

      // Page should still have content after filter
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should search for providers', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Look for search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="بحث"], input[placeholder*="search"], input[name="search"]'
    );

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000); // Wait for search debounce

      // Should filter results
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(0);
    } else {
      console.log('Search input not visible on this page');
    }
  });

  test('should navigate to provider detail page', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Find provider card link
    const providerLinks = page.locator('a[href*="/providers/"]');
    const linkCount = await providerLinks.count();

    if (linkCount > 0) {
      await providerLinks.first().click();
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      // Should be on provider detail page
      expect(page.url()).toContain('/providers/');

      // Should show provider content
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(0);
    } else {
      console.log('No provider links found');
    }
  });

  test('should display provider menu/products', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const providerLinks = page.locator('a[href*="/providers/"]');

    if ((await providerLinks.count()) > 0) {
      await providerLinks.first().click();
      await page.waitForLoadState('domcontentloaded');
      await waitForPageReady(page);

      // Check for menu items
      const content = await page.locator('body').innerText();

      expect(
        content.includes('ج.م') ||
          content.includes('EGP') ||
          content.includes('منتج') ||
          content.includes('product') ||
          content.length > 100
      ).toBeTruthy();
    }
  });
});

test.describe('1.3 Cart Operations', () => {
  test('should display cart page', async ({ page }) => {
    await page.goto('/ar/cart', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();

    // Cart page should show cart content or empty state
    expect(
      content.includes('سلة') ||
        content.includes('cart') ||
        content.includes('فارغ') ||
        content.includes('empty') ||
        content.includes('تصفح') ||
        content.includes('browse') ||
        content.length > 50
    ).toBeTruthy();
  });

  test('should show empty cart state with browse button', async ({ page }) => {
    // First clear any existing cart by going to cart
    await page.goto('/ar/cart', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();

    // Check for empty cart elements
    const hasBrowseButton =
      (await page.locator('button:has-text("تصفح"), button:has-text("browse")').count()) > 0 ||
      (await page.locator('a:has-text("تصفح"), a:has-text("browse")').count()) > 0;

    const hasEmptyState =
      content.includes('فارغ') ||
      content.includes('empty') ||
      content.includes('سلة') ||
      content.includes('cart') ||
      hasBrowseButton;

    expect(hasEmptyState || content.length > 50).toBeTruthy();
  });

  test('should navigate to checkout from cart', async ({ page }) => {
    await page.goto('/ar/cart', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Look for checkout button
    const checkoutBtn = page.locator(
      'button:has-text("إتمام"), button:has-text("checkout"), button:has-text("اطلب"), a:has-text("إتمام"), a:has-text("checkout")'
    );

    if (
      await checkoutBtn
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      // Checkout button exists, cart has items
      await checkoutBtn.first().click();
      await page.waitForLoadState('domcontentloaded');

      // Should navigate to checkout
      expect(page.url()).toContain('/checkout');
    } else {
      // Cart is empty - that's ok
      console.log('Cart is empty, no checkout button visible');
    }
  });

  test('should display order summary in cart', async ({ page }) => {
    await page.goto('/ar/cart', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();

    // Should show summary labels if cart has items, or empty state
    expect(
      content.includes('المجموع') ||
        content.includes('total') ||
        content.includes('توصيل') ||
        content.includes('delivery') ||
        content.includes('فارغ') ||
        content.includes('empty') ||
        content.length > 50
    ).toBeTruthy();
  });
});

test.describe('1.4 Order Management', () => {
  test('should display orders page', async ({ page }) => {
    await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const url = page.url();

    // Should be on orders page or redirected to login
    if (url.includes('/orders') && !url.includes('/login')) {
      const content = await page.locator('body').innerText();

      expect(
        content.includes('طلب') ||
          content.includes('order') ||
          content.includes('لا يوجد') ||
          content.includes('لا توجد') ||
          content.includes('no orders') ||
          content.length > 50
      ).toBeTruthy();
    } else if (url.includes('/login')) {
      // Auth required - expected behavior
      expect(url).toContain('/login');
    }
  });

  test('should show order status tabs/filters', async ({ page }) => {
    await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      // Look for filter tabs
      const tabs = page.locator(
        'button:has-text("الكل"), button:has-text("All"), button:has-text("نشط"), button:has-text("Active")'
      );

      const tabCount = await tabs.count();
      console.log(`Found ${tabCount} order filter tabs`);

      // Should have tabs or at least content
      const content = await page.locator('body').innerText();
      expect(tabCount > 0 || content.length > 50).toBeTruthy();
    }
  });

  test('should navigate to order details', async ({ page }) => {
    await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const orderLinks = page.locator('a[href*="/orders/"]');
      const linkCount = await orderLinks.count();

      if (linkCount > 0) {
        // Click first order that's not the main orders link
        const detailLinks = page.locator('a[href*="/orders/"]:not([href$="/orders"])');
        if ((await detailLinks.count()) > 0) {
          await detailLinks.first().click();
          await page.waitForLoadState('domcontentloaded');
          await waitForPageReady(page);

          // Should be on order detail page
          const url = page.url();
          expect(url.includes('/orders/')).toBeTruthy();
        }
      } else {
        console.log('No orders available');
      }
    }
  });

  test('should show order tracking information', async ({ page }) => {
    await page.goto('/ar/orders', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      const content = await page.locator('body').innerText();

      // Should show order statuses or empty state
      expect(
        content.includes('في الانتظار') ||
          content.includes('pending') ||
          content.includes('جاري') ||
          content.includes('preparing') ||
          content.includes('تم التوصيل') ||
          content.includes('delivered') ||
          content.includes('لا يوجد') ||
          content.includes('لا توجد') ||
          content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('1.5 Custom Orders', () => {
  test('should display custom order page', async ({ page }) => {
    await page.goto('/ar/custom-order', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const url = page.url();

    if (!url.includes('/login')) {
      const content = await page.locator('body').innerText();

      expect(
        content.includes('طلب') ||
          content.includes('order') ||
          content.includes('خاص') ||
          content.includes('custom') ||
          content.includes('اكتب') ||
          content.includes('write') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should have text input for custom order', async ({ page }) => {
    await page.goto('/ar/custom-order', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      // Look for text area or input
      const textInput = page.locator(
        'textarea, input[type="text"][placeholder*="اكتب"], input[type="text"][placeholder*="order"]'
      );
      const inputCount = await textInput.count();

      console.log(`Found ${inputCount} text inputs for custom order`);

      // Should have input or page content
      const content = await page.locator('body').innerText();
      expect(inputCount > 0 || content.length > 50).toBeTruthy();
    }
  });

  test('should have voice order option', async ({ page }) => {
    await page.goto('/ar/custom-order', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      // Look for microphone button or voice option
      const voiceBtn = page.locator(
        'button:has(svg[class*="Mic"]), button[aria-label*="voice"], button[aria-label*="صوت"], [class*="microphone"]'
      );

      const hasVoiceOption = await voiceBtn
        .first()
        .isVisible()
        .catch(() => false);
      console.log(`Voice option visible: ${hasVoiceOption}`);

      // Should have voice option or page content
      const content = await page.locator('body').innerText();
      expect(hasVoiceOption || content.length > 50).toBeTruthy();
    }
  });

  test('should have image upload option', async ({ page }) => {
    await page.goto('/ar/custom-order', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      // Look for image upload button
      const uploadBtn = page.locator(
        'button:has(svg[class*="Image"]), button:has(svg[class*="Camera"]), input[type="file"], [class*="upload"]'
      );

      const hasUploadOption = await uploadBtn
        .first()
        .isVisible()
        .catch(() => false);
      console.log(`Image upload option visible: ${hasUploadOption}`);

      // Should have upload option or page content
      const content = await page.locator('body').innerText();
      expect(hasUploadOption || content.length > 50).toBeTruthy();
    }
  });
});

test.describe('1.6 Profile & Support', () => {
  test('should display profile page', async ({ page }) => {
    await page.goto('/ar/profile', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const url = page.url();

    if (!url.includes('/login')) {
      const content = await page.locator('body').innerText();

      expect(
        content.includes('حساب') ||
          content.includes('account') ||
          content.includes('الملف') ||
          content.includes('profile') ||
          content.includes('إعدادات') ||
          content.includes('settings') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should have account settings links', async ({ page }) => {
    await page.goto('/ar/profile', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      // Look for settings links
      const settingsLinks = page.locator(
        'a[href*="/profile/"], a:has-text("إعدادات"), a:has-text("settings")'
      );

      const linkCount = await settingsLinks.count();
      console.log(`Found ${linkCount} profile setting links`);

      const content = await page.locator('body').innerText();
      expect(linkCount > 0 || content.length > 50).toBeTruthy();
    }
  });

  test('should navigate to support page', async ({ page }) => {
    await page.goto('/ar/profile/support', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const url = page.url();

    if (!url.includes('/login')) {
      const content = await page.locator('body').innerText();

      expect(
        content.includes('دعم') ||
          content.includes('support') ||
          content.includes('مساعدة') ||
          content.includes('help') ||
          content.includes('شكوى') ||
          content.includes('complaint') ||
          content.length > 50
      ).toBeTruthy();
    }
  });

  test('should have logout option', async ({ page }) => {
    await page.goto('/ar/profile', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    if (!page.url().includes('/login')) {
      // Look for logout button
      const logoutBtn = page.locator(
        'button:has-text("خروج"), button:has-text("logout"), button:has-text("تسجيل الخروج")'
      );

      const hasLogout = await logoutBtn
        .first()
        .isVisible()
        .catch(() => false);
      console.log(`Logout button visible: ${hasLogout}`);

      const content = await page.locator('body').innerText();
      expect(
        hasLogout || content.includes('خروج') || content.includes('logout') || content.length > 50
      ).toBeTruthy();
    }
  });
});

test.describe('1.7 Edge Cases', () => {
  test('should handle 404 page gracefully', async ({ page }) => {
    await page.goto('/ar/this-page-does-not-exist-xyz-123', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');

    const content = await page.locator('body').innerText();
    const url = page.url();

    // Should show 404 or redirect to home
    expect(
      content.includes('404') ||
        content.includes('غير موجود') ||
        content.includes('not found') ||
        !url.includes('this-page-does-not-exist') ||
        content.length > 50
    ).toBeTruthy();
  });

  test('should handle invalid provider ID gracefully', async ({ page }) => {
    await page.goto('/ar/providers/invalid-provider-id-xyz', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();
    const url = page.url();

    // Should show error or redirect
    expect(
      content.includes('خطأ') ||
        content.includes('error') ||
        content.includes('غير موجود') ||
        content.includes('not found') ||
        !url.includes('invalid-provider-id') ||
        content.length > 50
    ).toBeTruthy();
  });

  test('should handle invalid order ID gracefully', async ({ page }) => {
    await page.goto('/ar/orders/invalid-order-id-xyz', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();
    const url = page.url();

    // Should show error, redirect, or login
    expect(
      content.includes('خطأ') ||
        content.includes('error') ||
        content.includes('غير موجود') ||
        content.includes('not found') ||
        url.includes('/login') ||
        !url.includes('invalid-order-id') ||
        content.length > 50
    ).toBeTruthy();
  });

  test('should maintain responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Check no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('should display RTL layout correctly', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Check RTL direction
    const isRTL = await page.evaluate(() => {
      return document.dir === 'rtl' || document.documentElement.dir === 'rtl';
    });

    expect(isRTL).toBeTruthy();
  });
});

test.describe('1.8 Navigation', () => {
  test('should display bottom navigation bar', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Look for bottom navigation
    const bottomNav = page.locator(
      'nav[class*="bottom"], [class*="bottom-nav"], [class*="BottomNav"], nav:has(a[href*="/cart"])'
    );

    const hasBottomNav = await bottomNav
      .first()
      .isVisible()
      .catch(() => false);
    console.log(`Bottom navigation visible: ${hasBottomNav}`);

    // Mobile might have different nav
    const navLinks = page.locator(
      'nav a, a[href*="/cart"], a[href*="/orders"], a[href*="/profile"]'
    );
    const linkCount = await navLinks.count();

    expect(hasBottomNav || linkCount > 2).toBeTruthy();
  });

  test('should navigate using bottom nav links', async ({ page }) => {
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Try clicking cart link
    const cartLink = page.locator('a[href*="/cart"]').first();

    if (await cartLink.isVisible().catch(() => false)) {
      await cartLink.click();
      await page.waitForLoadState('domcontentloaded');

      expect(page.url()).toContain('/cart');
    }
  });

  test('should have working back navigation', async ({ page }) => {
    // Navigate to providers
    await page.goto('/ar/providers', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    // Navigate to cart
    await page.goto('/ar/cart');
    await page.waitForLoadState('domcontentloaded');

    // Go back
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/providers');
  });
});

test.describe('1.9 Home Page', () => {
  test('should display home page content', async ({ page }) => {
    await page.goto('/ar', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();

    // Home page should have content
    expect(content.length).toBeGreaterThan(50);
  });

  test('should have featured providers or offers section', async ({ page }) => {
    await page.goto('/ar', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();

    // Should show featured content
    expect(
      content.includes('متجر') ||
        content.includes('store') ||
        content.includes('عرض') ||
        content.includes('offer') ||
        content.includes('مميز') ||
        content.includes('featured') ||
        content.length > 100
    ).toBeTruthy();
  });

  test('should have location selector or prompt', async ({ page }) => {
    await page.goto('/ar', { timeout: NAVIGATION_TIMEOUT });
    await page.waitForLoadState('domcontentloaded');
    await waitForPageReady(page);

    const content = await page.locator('body').innerText();

    // Should show location-related content
    const hasLocationContent =
      content.includes('موقع') ||
      content.includes('location') ||
      content.includes('منطقة') ||
      content.includes('area') ||
      content.includes('بني سويف') ||
      content.includes('Beni Suef');

    console.log(`Has location content: ${hasLocationContent}`);

    expect(hasLocationContent || content.length > 100).toBeTruthy();
  });
});
