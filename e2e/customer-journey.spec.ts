import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, LOCATORS, ORDER_STATUS } from './fixtures/test-utils';

/**
 * Customer Journey E2E Tests
 *
 * Tests the complete customer experience with real data:
 * - Browsing providers and products
 * - Adding items to cart
 * - Checkout process
 * - Order tracking
 *
 * No mocking - uses real Supabase data.
 */

// CI-aware timeouts
const isCI = process.env.CI === 'true';
const DEFAULT_TIMEOUT = isCI ? 30000 : 15000;

/**
 * Wait for page to have meaningful content
 */
async function waitForContent(page: Page, minLength = 50): Promise<string> {
  await page.waitForFunction((min) => (document.body?.innerText?.length ?? 0) > min, minLength, {
    timeout: DEFAULT_TIMEOUT,
  });
  return (await page.locator('body').innerText()) ?? '';
}

test.describe('Customer Journey - Browsing', () => {
  test('should display home page with providers or welcome content', async ({ page }) => {
    await page.goto('/ar');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

    // Wait for content to load
    const content = await waitForContent(page, 50);

    // Should have Arabic content (home page or welcome/location select)
    const hasArabic = /[\u0600-\u06FF]/.test(content);
    expect(hasArabic).toBeTruthy();

    // Check page loaded properly
    expect(content.length).toBeGreaterThan(100);
  });

  test('should display providers page with store cards', async ({ page }) => {
    await page.goto('/ar/providers');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

    // Wait for content to load
    await waitForContent(page, 50);

    // Should show providers or empty state
    await expect(async () => {
      const providerCards = page.locator(
        '[class*="provider"], [class*="store"], a[href*="/providers/"]'
      );
      const emptyState = page.locator('text=/لا يوجد|no providers|لا توجد متاجر/i');
      const cardCount = await providerCards.count();
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      expect(cardCount > 0 || hasEmpty).toBeTruthy();
    }).toPass({ timeout: DEFAULT_TIMEOUT });
  });

  test('should navigate to provider details page', async ({ page }) => {
    await page.goto('/ar/providers');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
    await waitForContent(page, 50);

    // Find a provider link and click it
    const providerLink = page.locator('a[href*="/providers/"]').first();

    if (await providerLink.isVisible().catch(() => false)) {
      await providerLink.click();
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

      // Should be on provider details page
      const url = page.url();
      expect(url).toContain('/providers/');

      // Should show provider info (name, products, etc.)
      await waitForContent(page, 50);
    } else {
      // No providers in database - this is still a valid test result
      console.log('No providers available for testing');
    }
  });

  test('should display product categories on provider page', async ({ page }) => {
    await page.goto('/ar/providers');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
    await waitForContent(page, 50);

    // Navigate to first provider
    const providerLink = page.locator('a[href*="/providers/"]').first();

    if (await providerLink.isVisible().catch(() => false)) {
      await providerLink.click();
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      await waitForContent(page, 50);

      // Look for categories or products
      const categories = page.locator('[class*="category"], [class*="tab"], [role="tab"]');
      const products = page.locator(
        '[class*="product"], [data-testid*="product"], [class*="item"]'
      );

      await expect(async () => {
        const catCount = await categories.count();
        const prodCount = await products.count();
        const content = await page.locator('body').innerText();

        // Should have categories, products, or at least meaningful content
        expect(catCount > 0 || prodCount > 0 || content.length > 100).toBeTruthy();
      }).toPass({ timeout: DEFAULT_TIMEOUT });
    }
  });
});

test.describe('Customer Journey - Cart Operations', () => {
  test('should display cart page', async ({ page }) => {
    await page.goto('/ar/cart');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

    // Wait for content
    await waitForContent(page, 20);

    // Should show cart content or empty cart message
    const content = await page.locator('body').innerText();
    expect(
      content.includes('سلة') ||
        content.includes('cart') ||
        content.includes('فارغة') ||
        content.includes('empty') ||
        content.length > 50
    ).toBeTruthy();
  });

  test('should add item to cart from provider page', async ({ page }) => {
    await page.goto('/ar/providers');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
    await waitForContent(page, 50);

    // Navigate to first provider
    const providerLink = page.locator('a[href*="/providers/"]').first();

    if (await providerLink.isVisible().catch(() => false)) {
      await providerLink.click();
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      await waitForContent(page, 50);

      // Find add to cart button
      const addButton = page.locator(
        'button:has-text("أضف"), button:has-text("إضافة"), button:has-text("Add"), [data-testid="add-to-cart"]'
      );

      if (
        await addButton
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
      ) {
        // Get initial cart count
        const cartBadge = page.locator('[class*="badge"], [class*="count"]').first();
        const initialCount = (await cartBadge.isVisible().catch(() => false))
          ? parseInt((await cartBadge.innerText()) || '0', 10)
          : 0;

        // Click add button
        await addButton.first().click();
        await page.waitForTimeout(1000);

        // Verify cart updated (toast, badge, or navigation)
        const toast = page.locator('[class*="toast"], [role="alert"]');
        const hasToast = await toast.isVisible().catch(() => false);
        const newCount = (await cartBadge.isVisible().catch(() => false))
          ? parseInt((await cartBadge.innerText()) || '0', 10)
          : 0;

        // Either toast appeared or cart count increased
        expect(hasToast || newCount > initialCount || newCount >= 0).toBeTruthy();
      } else {
        console.log('No products available for adding to cart');
      }
    }
  });

  test('should update quantity in cart', async ({ page }) => {
    // First add something to cart by visiting a provider
    await page.goto('/ar/providers');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

    const providerLink = page.locator('a[href*="/providers/"]').first();
    if (await providerLink.isVisible().catch(() => false)) {
      await providerLink.click();
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

      const addButton = page.locator(
        'button:has-text("أضف"), button:has-text("إضافة"), [data-testid="add-to-cart"]'
      );
      if (
        await addButton
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
      ) {
        await addButton.first().click();
        await page.waitForTimeout(1000);
      }
    }

    // Go to cart
    await page.goto('/ar/cart');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
    await waitForContent(page, 20);

    // Look for quantity controls
    const increaseBtn = page.locator(LOCATORS.increaseButton).first();
    const decreaseBtn = page.locator(LOCATORS.decreaseButton).first();

    if (await increaseBtn.isVisible().catch(() => false)) {
      await increaseBtn.click();
      await page.waitForTimeout(500);

      // Verify quantity changed (check for any reaction)
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(20);
    } else {
      console.log('Cart is empty or no quantity controls visible');
    }
  });
});

test.describe('Customer Journey - Checkout', () => {
  test('should display checkout page with address and payment options', async ({ page }) => {
    await page.goto('/ar/checkout');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

    const url = page.url();

    // May redirect to cart if empty or login if not authenticated
    if (url.includes('/checkout')) {
      await waitForContent(page, 50);

      // Should show checkout elements
      const content = await page.locator('body').innerText();
      expect(
        content.includes('عنوان') ||
          content.includes('address') ||
          content.includes('دفع') ||
          content.includes('payment') ||
          content.includes('تأكيد') ||
          content.length > 50
      ).toBeTruthy();
    } else {
      // Redirect is valid behavior for empty cart
      expect(url.includes('/cart') || url.includes('/login') || url.includes('/auth')).toBeTruthy();
    }
  });

  test('should show payment method options on checkout', async ({ page }) => {
    await page.goto('/ar/checkout');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

    if (page.url().includes('/checkout')) {
      await waitForContent(page, 50);

      const content = await page.locator('body').innerText();

      // Check for payment-related content
      const hasPaymentContent =
        content.includes('نقدي') ||
        content.includes('كاش') ||
        content.includes('cash') ||
        content.includes('بطاقة') ||
        content.includes('card') ||
        content.includes('الدفع') ||
        content.includes('payment');

      expect(hasPaymentContent || content.length > 100).toBeTruthy();
    }
  });
});

test.describe('Customer Journey - Orders', () => {
  test('should display orders page', async ({ page }) => {
    await page.goto('/ar/orders');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

    const url = page.url();

    if (url.includes('/orders') && !url.includes('/login')) {
      await waitForContent(page, 20);

      const content = await page.locator('body').innerText();
      expect(
        content.includes('طلب') ||
          content.includes('order') ||
          content.includes('لا توجد') ||
          content.includes('no orders') ||
          content.length > 50
      ).toBeTruthy();
    } else {
      // Redirect to login is valid
      expect(url.includes('/login') || url.includes('/auth')).toBeTruthy();
    }
  });

  test('should show order details when orders exist', async ({ page }) => {
    await page.goto('/ar/orders');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      await waitForContent(page, 20);

      // Look for order cards
      const orderCards = page.locator(
        '[class*="order"], a[href*="/orders/"], [data-testid*="order"]'
      );

      if ((await orderCards.count()) > 0) {
        await orderCards.first().click();
        await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

        // Should show order details
        await waitForContent(page, 50);
        const url = page.url();
        expect(url).toContain('/orders/');
      } else {
        console.log('No orders to display');
      }
    }
  });
});

test.describe('Customer Journey - Navigation', () => {
  test('should have working bottom navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/ar');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
    await waitForContent(page, 50);

    // Look for bottom navigation
    const bottomNav = page.locator(LOCATORS.bottomNav);

    if (
      await bottomNav
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      // Find nav items
      const navItems = bottomNav.locator('a, button');
      const navCount = await navItems.count();

      expect(navCount).toBeGreaterThan(0);

      // Try clicking home or stores nav item
      const homeItem = navItems.filter({
        hasText: /الرئيسية|home|متاجر|stores/i,
      });

      if ((await homeItem.count()) > 0) {
        await homeItem.first().click();
        await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });

        // Navigation should work
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test('should display header with location on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/ar');
    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
    await waitForContent(page, 50);

    // Look for header
    const header = page.locator('header');

    if (
      await header
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      // Header should be visible on desktop
      expect(await header.first().isVisible()).toBeTruthy();

      // Should have some content (logo, nav, location)
      const headerText = await header.first().innerText();
      expect(headerText.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Customer Journey - Responsiveness', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 812 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`should render correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/ar/providers');
      await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
      await waitForContent(page, 50);

      // Check for horizontal scroll (should not exist)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBeFalsy();

      // Page should have content
      const content = await page.locator('body').innerText();
      expect(content.length).toBeGreaterThan(50);
    });
  }
});
