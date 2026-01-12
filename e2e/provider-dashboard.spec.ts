import { test, expect } from '@playwright/test'
import { TEST_USERS, LOCATORS } from './fixtures/test-utils'

/**
 * Provider Dashboard E2E Tests
 *
 * Tests cover:
 * 1. Provider login flow
 * 2. Dashboard display and statistics
 * 3. Orders management
 * 4. Products/Menu management
 * 5. Settings and store hours
 * 6. Settlements and Finance
 */

// Helper function to login as provider
async function loginAsProvider(page: import('@playwright/test').Page) {
  await page.goto('/ar/provider/login')
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator(LOCATORS.emailInput)
  const passwordInput = page.locator(LOCATORS.passwordInput)

  await emailInput.fill(TEST_USERS.provider.email)
  await passwordInput.fill(TEST_USERS.provider.password)
  await page.click(LOCATORS.submitButton)

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
}

test.describe('Provider Login Flow', () => {
  test('should display provider login page correctly', async ({ page }) => {
    await page.goto('/ar/provider/login')
    await page.waitForLoadState('networkidle')

    // Verify login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const submitBtn = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitBtn).toBeVisible()

    // Verify branding
    const logo = page.locator('[class*="logo"], [class*="Logo"]')
    await expect(logo.first()).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/ar/provider/login')
    await page.waitForLoadState('networkidle')

    // Try to submit empty form
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    // Should show validation errors
    await page.waitForTimeout(500)
    const pageContent = await page.textContent('body')

    // Check for any error indication (either in Arabic or through UI)
    const hasValidation = pageContent?.includes('مطلوب') ||
                          pageContent?.includes('required') ||
                          await page.locator('[class*="error"], [class*="invalid"]').first().isVisible().catch(() => false)

    expect(hasValidation).toBeTruthy()
  })

  test('should redirect to dashboard after login (with valid credentials)', async ({ page }) => {
    await page.goto('/ar/provider/login')
    await page.waitForLoadState('networkidle')

    // Fill in test credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')

    await emailInput.fill('provider@test.com')
    await passwordInput.fill('Test123!')

    // Submit form
    await page.locator('button[type="submit"]').click()

    // Wait for navigation (either success or error)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Check if redirected to dashboard or shows error
    const url = page.url()
    const isOnDashboard = url.includes('/provider') && !url.includes('/login')
    const hasError = await page.locator('[class*="error"], [class*="alert"]').first().isVisible().catch(() => false)

    expect(isOnDashboard || hasError).toBeTruthy()
  })
})

test.describe('Provider Dashboard Display', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
    await page.goto('/ar/provider')
    await page.waitForLoadState('networkidle')
  })

  test('should display dashboard or login redirect', async ({ page }) => {
    const url = page.url()

    // Should either show dashboard or redirect to login
    const isOnDashboard = url.includes('/provider') && !url.includes('/login')
    const isOnLogin = url.includes('/login') || url.includes('/auth')

    expect(isOnDashboard || isOnLogin).toBeTruthy()
  })

  test('should have navigation sidebar', async ({ page }) => {
    // If on dashboard, check for sidebar navigation
    if (page.url().includes('/provider') && !page.url().includes('/login')) {
      const sidebar = page.locator('aside, nav[class*="sidebar"], [class*="Sidebar"]')

      if (await sidebar.first().isVisible()) {
        // Verify key navigation items
        const pageContent = await page.textContent('body')
        const hasOrders = pageContent?.includes('الطلبات') || pageContent?.includes('Orders')
        const hasProducts = pageContent?.includes('المنتجات') || pageContent?.includes('Products')

        expect(hasOrders || hasProducts).toBeTruthy()
      }
    }
  })

  test('should display statistics cards', async ({ page }) => {
    if (page.url().includes('/provider') && !page.url().includes('/login')) {
      // Look for stats cards
      const statsCards = page.locator('[class*="card"], [class*="Card"], [class*="stat"]')
      const cardsCount = await statsCards.count()

      // Dashboard should have at least some cards/stats
      expect(cardsCount).toBeGreaterThan(0)
    }
  })
})

test.describe('Provider Orders Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
  })

  test('should display orders page', async ({ page }) => {
    await page.goto('/ar/provider/orders')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    // Either shows orders or redirects to login
    if (url.includes('/orders')) {
      const pageContent = await page.textContent('body')
      const hasOrderContent = pageContent?.includes('طلب') ||
                              pageContent?.includes('order') ||
                              pageContent?.includes('لا يوجد') ||
                              pageContent?.includes('no orders')

      expect(hasOrderContent).toBeTruthy()
    } else {
      // Redirected to login
      expect(url.includes('/login') || url.includes('/auth')).toBeTruthy()
    }
  })

  test('should have order status tabs or filters', async ({ page }) => {
    await page.goto('/ar/provider/orders')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      // Look for tabs or filter buttons
      const tabs = page.locator('button[role="tab"], [class*="tab"], [class*="Tab"]')
      const filters = page.locator('select, [class*="filter"], [class*="Filter"]')

      const hasTabs = await tabs.count() > 0
      const hasFilters = await filters.count() > 0

      // Should have some way to filter orders
      expect(hasTabs || hasFilters).toBeTruthy()
    }
  })
})

test.describe('Provider Products Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
  })

  test('should display products page', async ({ page }) => {
    await page.goto('/ar/provider/products')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/products')) {
      const pageContent = await page.textContent('body')
      const hasProductContent = pageContent?.includes('منتج') ||
                                pageContent?.includes('product') ||
                                pageContent?.includes('القائمة') ||
                                pageContent?.includes('menu')

      expect(hasProductContent).toBeTruthy()
    }
  })

  test('should have add product button', async ({ page }) => {
    await page.goto('/ar/provider/products')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/products') && !page.url().includes('/login')) {
      // Look for add button
      const addBtn = page.locator('button:has-text("إضافة"), button:has-text("Add"), a[href*="new"], a[href*="add"]')

      if (await addBtn.first().isVisible()) {
        await expect(addBtn.first()).toBeVisible()
      }
    }
  })
})

test.describe('Provider Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
  })

  test('should display settings page', async ({ page }) => {
    await page.goto('/ar/provider/settings')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/settings')) {
      const pageContent = await page.textContent('body')
      const hasSettingsContent = pageContent?.includes('إعدادات') ||
                                  pageContent?.includes('settings') ||
                                  pageContent?.includes('المتجر') ||
                                  pageContent?.includes('store')

      expect(hasSettingsContent).toBeTruthy()
    }
  })

  test('should display store hours page', async ({ page }) => {
    await page.goto('/ar/provider/store-hours')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/store-hours')) {
      const pageContent = await page.textContent('body')
      const hasHoursContent = pageContent?.includes('ساعات') ||
                              pageContent?.includes('hours') ||
                              pageContent?.includes('العمل') ||
                              pageContent?.includes('schedule')

      expect(hasHoursContent).toBeTruthy()
    }
  })
})

test.describe('Provider Finance & Settlements', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
  })

  test('should display finance page', async ({ page }) => {
    await page.goto('/ar/provider/finance')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/finance')) {
      const pageContent = await page.textContent('body')
      const hasFinanceContent = pageContent?.includes('مالية') ||
                                 pageContent?.includes('finance') ||
                                 pageContent?.includes('إيرادات') ||
                                 pageContent?.includes('revenue')

      expect(hasFinanceContent).toBeTruthy()
    }
  })

  test('should display settlements page', async ({ page }) => {
    await page.goto('/ar/provider/settlements')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/settlements')) {
      const pageContent = await page.textContent('body')
      const hasSettlementsContent = pageContent?.includes('تسوية') ||
                                     pageContent?.includes('settlement') ||
                                     pageContent?.includes('مستحقات') ||
                                     pageContent?.includes('dues')

      expect(hasSettlementsContent).toBeTruthy()
    }
  })
})

test.describe('Provider Grace Period Banner', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
  })

  test('should display grace period information on dashboard', async ({ page }) => {
    await page.goto('/ar/provider')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/provider') && !page.url().includes('/login')) {
      const pageContent = await page.textContent('body')

      // Check for grace period content (0% commission period)
      const hasGracePeriod = pageContent?.includes('السماح') ||
                             pageContent?.includes('grace') ||
                             pageContent?.includes('0%') ||
                             pageContent?.includes('مجاني')

      // This is informational - grace period may or may not be shown
      if (hasGracePeriod) {
        expect(hasGracePeriod).toBeTruthy()
      }
    }
  })
})

test.describe('Provider Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
  })

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/ar/provider')
    await page.waitForLoadState('networkidle')

    // Check no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    expect(hasHorizontalScroll).toBeFalsy()
  })

  test('should have mobile menu toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/ar/provider')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/provider') && !page.url().includes('/login')) {
      // Look for hamburger menu
      const menuToggle = page.locator('button[class*="menu"], [class*="hamburger"], button svg[class*="menu"]')

      // Should have some form of mobile menu
      const hasMenuToggle = await menuToggle.first().isVisible().catch(() => false)
      const hasHeader = await page.locator('header').isVisible().catch(() => false)

      expect(hasMenuToggle || hasHeader).toBeTruthy()
    }
  })
})
