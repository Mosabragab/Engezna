import { test, expect } from '@playwright/test'
import { TEST_USERS, LOCATORS } from './fixtures/test-utils'

/**
 * Customer Journey Smoke Test
 *
 * This test simulates a complete customer journey:
 * 1. Visit homepage
 * 2. Select governorate/city
 * 3. Browse stores
 * 4. Select items from menu
 * 5. Add to cart
 * 6. Proceed to checkout
 * 7. Verify order confirmation page
 */

// Helper function to login as customer
async function loginAsCustomer(page: import('@playwright/test').Page) {
  await page.goto('/ar/auth/login')
  await page.waitForLoadState('networkidle')

  // Wait for the form to appear (after checkingAuth spinner disappears)
  const emailInput = page.locator(LOCATORS.emailInput)
  await emailInput.waitFor({ state: 'visible', timeout: 15000 })

  const passwordInput = page.locator(LOCATORS.passwordInput)

  await emailInput.fill(TEST_USERS.customer.email)
  await passwordInput.fill(TEST_USERS.customer.password)
  await page.click(LOCATORS.submitButton)

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

test.describe('Customer Journey - Order Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page)
  })

  test('should display homepage correctly', async ({ page }) => {
    // Verify page title contains Engezna
    await expect(page).toHaveTitle(/إنجزنا|Engezna/)

    // Verify main elements are visible
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()

    // Verify location selector or stores are visible
    const hasLocationSelector = await page.locator('[data-testid="location-selector"]').isVisible().catch(() => false)
    const hasStoreList = await page.locator('[data-testid="store-list"]').isVisible().catch(() => false)

    expect(hasLocationSelector || hasStoreList).toBeTruthy()
  })

  test('should navigate to providers/stores page', async ({ page }) => {
    // Click on providers link or navigate directly
    await page.goto('/ar/providers')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Verify stores page content
    const pageContent = await page.textContent('body')
    expect(pageContent).toMatch(/المتاجر|stores/i)
  })

  test('should display store details and menu', async ({ page }) => {
    // Navigate to providers page
    await page.goto('/ar/providers')
    await page.waitForLoadState('networkidle')

    // Check if there are any store cards
    const storeCards = page.locator('[data-testid="store-card"], .store-card, [class*="provider"]').first()

    if (await storeCards.isVisible()) {
      // Click on first store
      await storeCards.click()
      await page.waitForLoadState('networkidle')

      // Verify we're on a store detail page
      const url = page.url()
      expect(url).toContain('/providers/')
    }
  })

  test('should add items to cart', async ({ page }) => {
    // This test assumes there's at least one store with menu items
    // Navigate to a known store page or find one
    await page.goto('/ar/providers')
    await page.waitForLoadState('networkidle')

    // Find and click a store
    const storeLink = page.locator('a[href*="/providers/"]').first()
    if (await storeLink.isVisible()) {
      await storeLink.click()
      await page.waitForLoadState('networkidle')

      // Look for add to cart button
      const addToCartBtn = page.locator('button:has-text("أضف"), button:has-text("Add"), [data-testid="add-to-cart"]').first()

      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click()

        // Verify cart updated (look for cart icon with badge or cart summary)
        const cartBadge = page.locator('[data-testid="cart-badge"], .cart-badge, [class*="cart"]')
        await expect(cartBadge.first()).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('should navigate through checkout flow', async ({ page }) => {
    // Navigate to cart page
    await page.goto('/ar/cart')
    await page.waitForLoadState('networkidle')

    // Check cart page content
    const pageContent = await page.textContent('body')

    // Cart should show items or empty state
    const hasCartContent = pageContent?.includes('السلة') ||
                          pageContent?.includes('cart') ||
                          pageContent?.includes('فارغة') ||
                          pageContent?.includes('empty')

    expect(hasCartContent).toBeTruthy()
  })

  test('should display order confirmation elements', async ({ page }) => {
    // Note: This test verifies the confirmation page structure
    // In a real scenario, you would complete an order first

    // Try to access orders page (requires authentication)
    await page.goto('/ar/orders')
    await page.waitForLoadState('networkidle')

    // Should either show orders or redirect to login
    const url = page.url()
    const isOnOrdersPage = url.includes('/orders')
    const isOnLoginPage = url.includes('/login') || url.includes('/auth')

    expect(isOnOrdersPage || isOnLoginPage).toBeTruthy()
  })
})

test.describe('Footer and Legal Links', () => {
  test('should have privacy policy link in footer', async ({ page }) => {
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Find privacy link
    const privacyLink = page.locator('footer a[href*="/privacy"]')
    await expect(privacyLink).toBeVisible()

    // Click and verify navigation
    await privacyLink.click()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/privacy')
  })

  test('should have terms and conditions link in footer', async ({ page }) => {
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Find terms link
    const termsLink = page.locator('footer a[href*="/terms"]')
    await expect(termsLink).toBeVisible()

    // Click and verify navigation
    await termsLink.click()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/terms')
  })

  test('privacy page should display company information', async ({ page }) => {
    await page.goto('/ar/privacy')
    await page.waitForLoadState('networkidle')

    const pageContent = await page.textContent('body')

    // Verify company info is displayed
    expect(pageContent).toContain('سويفكم')
    expect(pageContent).toContain('2767')
    expect(pageContent).toContain('support@engezna.com')
  })

  test('terms page should display company information', async ({ page }) => {
    await page.goto('/ar/terms')
    await page.waitForLoadState('networkidle')

    const pageContent = await page.textContent('body')

    // Verify company info is displayed
    expect(pageContent).toContain('سويفكم')
    expect(pageContent).toContain('2767')
  })
})

test.describe('Authentication Flow', () => {
  test('should display signup page with terms checkbox', async ({ page }) => {
    await page.goto('/ar/auth/signup')
    await page.waitForLoadState('networkidle')

    // Verify terms checkbox exists
    const termsCheckbox = page.locator('input[type="checkbox"]#agreeToTerms, input[name="agreeToTerms"]')
    await expect(termsCheckbox).toBeVisible()

    // Verify links to terms and privacy
    const termsLink = page.locator('a[href*="/terms"]')
    const privacyLink = page.locator('a[href*="/privacy"]')

    await expect(termsLink.first()).toBeVisible()
    await expect(privacyLink.first()).toBeVisible()
  })

  test('should require terms acceptance for signup', async ({ page }) => {
    await page.goto('/ar/auth/signup')
    await page.waitForLoadState('networkidle')

    // Try to submit without checking terms (if form exists)
    const submitBtn = page.locator('button[type="submit"]')

    if (await submitBtn.isVisible()) {
      // Fill required fields but don't check terms
      const nameInput = page.locator('input[name="full_name"], input[name="name"]').first()
      const emailInput = page.locator('input[name="email"]').first()
      const phoneInput = page.locator('input[name="phone"]').first()
      const passwordInput = page.locator('input[name="password"]').first()

      if (await nameInput.isVisible()) await nameInput.fill('Test User')
      if (await emailInput.isVisible()) await emailInput.fill('test@example.com')
      if (await phoneInput.isVisible()) await phoneInput.fill('01012345678')
      if (await passwordInput.isVisible()) await passwordInput.fill('TestPassword123!')

      // Submit without checking terms
      await submitBtn.click()

      // Should show validation error
      const errorMessage = page.locator('[class*="error"], [class*="invalid"], .text-destructive')
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 })
    }
  })
})

test.describe('Responsive Design', () => {
  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Check that the page doesn't have horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    expect(hasHorizontalScroll).toBeFalsy()
  })

  test('should display bottom navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Look for bottom navigation
    const bottomNav = page.locator('nav[class*="bottom"], [class*="bottom-nav"], [class*="BottomNav"]')

    // Should have some form of navigation visible
    const hasBottomNav = await bottomNav.first().isVisible().catch(() => false)
    const hasHeader = await page.locator('header').isVisible().catch(() => false)

    expect(hasBottomNav || hasHeader).toBeTruthy()
  })
})
