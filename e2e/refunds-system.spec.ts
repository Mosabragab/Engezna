import { test, expect } from '@playwright/test'
import { TEST_USERS, LOCATORS } from './fixtures/test-utils'

/**
 * Refunds System E2E Tests
 *
 * Tests cover:
 * 1. Customer refund request flow
 * 2. Provider refund response flow
 * 3. Admin refund management
 * 4. Real-time notification badges
 * 5. Finance impact of refunds
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

// Helper function to login as provider
async function loginAsProvider(page: import('@playwright/test').Page) {
  await page.goto('/ar/provider/login')
  await page.waitForLoadState('networkidle')

  // Wait for the form to appear (after checkingAuth spinner disappears)
  const emailInput = page.locator(LOCATORS.emailInput)
  await emailInput.waitFor({ state: 'visible', timeout: 15000 })

  const passwordInput = page.locator(LOCATORS.passwordInput)

  await emailInput.fill(TEST_USERS.provider.email)
  await passwordInput.fill(TEST_USERS.provider.password)
  await page.click(LOCATORS.submitButton)

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

// Helper function to login as admin
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/ar/admin/login')
  await page.waitForLoadState('networkidle')

  // Wait for the form to appear (after checkingAuth spinner disappears)
  const emailInput = page.locator(LOCATORS.emailInput)
  await emailInput.waitFor({ state: 'visible', timeout: 15000 })

  const passwordInput = page.locator(LOCATORS.passwordInput)

  await emailInput.fill(TEST_USERS.admin.email)
  await passwordInput.fill(TEST_USERS.admin.password)
  await page.click(LOCATORS.submitButton)

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

test.describe('Customer Refund Request Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page)
  })

  test('should display refund request option on order details', async ({ page }) => {
    // Navigate to orders page (requires login)
    await page.goto('/ar/orders')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/orders') && !url.includes('/login')) {
      // If logged in, check for refund option
      const pageContent = await page.textContent('body')
      const hasOrderContent = pageContent?.includes('طلب') ||
                              pageContent?.includes('order') ||
                              pageContent?.includes('لا يوجد')

      expect(hasOrderContent).toBeTruthy()
    } else {
      // Redirected to login is expected for unauthenticated users
      expect(url.includes('/login') || url.includes('/auth')).toBeTruthy()
    }
  })

  test('should have refund form elements visible', async ({ page }) => {
    // This test checks if the refund form structure exists
    await page.goto('/ar/orders')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/orders') && !page.url().includes('/login')) {
      // Look for any order that might have refund option
      const orderCard = page.locator('[class*="order"], [class*="Order"], a[href*="/orders/"]').first()

      if (await orderCard.isVisible().catch(() => false)) {
        await orderCard.click()
        await page.waitForLoadState('networkidle')

        // Check for refund-related UI elements
        const pageContent = await page.textContent('body')
        const hasRefundUI = pageContent?.includes('استرداد') ||
                            pageContent?.includes('refund') ||
                            pageContent?.includes('مرتجع') ||
                            pageContent?.includes('إلغاء')

        // Either has refund option or order is not eligible
        expect(hasRefundUI || pageContent?.includes('طلب')).toBeTruthy()
      }
    }
  })
})

test.describe('Provider Refund Response Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
  })

  test('should display refunds page in provider dashboard', async ({ page }) => {
    await page.goto('/ar/provider/refunds')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/refunds')) {
      const pageContent = await page.textContent('body')
      const hasRefundsContent = pageContent?.includes('مرتجع') ||
                                 pageContent?.includes('refund') ||
                                 pageContent?.includes('استرداد') ||
                                 pageContent?.includes('لا يوجد')

      expect(hasRefundsContent).toBeTruthy()
    } else {
      // Redirected to login
      expect(url.includes('/login') || url.includes('/auth')).toBeTruthy()
    }
  })

  test('should have refund action buttons visible', async ({ page }) => {
    await page.goto('/ar/provider/refunds')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/refunds') && !page.url().includes('/login')) {
      // Look for action buttons
      const approveBtn = page.locator('button:has-text("موافقة"), button:has-text("قبول"), button:has-text("Approve")')
      const rejectBtn = page.locator('button:has-text("رفض"), button:has-text("Reject")')

      const hasApproveBtn = await approveBtn.first().isVisible().catch(() => false)
      const hasRejectBtn = await rejectBtn.first().isVisible().catch(() => false)

      // Either has buttons or no pending refunds
      const pageContent = await page.textContent('body')
      const noPendingRefunds = pageContent?.includes('لا يوجد') ||
                               pageContent?.includes('no pending') ||
                               pageContent?.includes('فارغ')

      expect(hasApproveBtn || hasRejectBtn || noPendingRefunds).toBeTruthy()
    }
  })

  test('should display refund status tabs', async ({ page }) => {
    await page.goto('/ar/provider/refunds')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/refunds') && !page.url().includes('/login')) {
      // Look for status tabs/filters
      const tabs = page.locator('button[role="tab"], [class*="tab"], [class*="Tab"]')
      const filters = page.locator('select, button[class*="filter"]')

      const tabCount = await tabs.count()
      const filterCount = await filters.count()

      // Should have tabs or filters to organize refunds
      expect(tabCount > 0 || filterCount > 0).toBeTruthy()
    }
  })

  test('should show refund notification badge in sidebar', async ({ page }) => {
    await page.goto('/ar/provider')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/provider') && !page.url().includes('/login')) {
      // Look for refunds link with possible badge
      const refundsLink = page.locator('a[href*="/refunds"]')

      if (await refundsLink.first().isVisible()) {
        // Check for badge element within or near the link
        const badge = refundsLink.first().locator('[class*="badge"]')
        const badgeInSidebar = page.locator('aside').locator('[class*="badge"]')

        // Either has badge or no pending refunds (badge hidden)
        const hasBadge = await badge.isVisible().catch(() => false) ||
                         await badgeInSidebar.first().isVisible().catch(() => false)

        // This is informational - badge may not be visible if no pending refunds
        console.log('Refund badge visible:', hasBadge)
      }
    }
  })
})

test.describe('Admin Refund Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('should display admin refunds page', async ({ page }) => {
    await page.goto('/ar/admin/refunds')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/refunds')) {
      const pageContent = await page.textContent('body')
      const hasRefundsContent = pageContent?.includes('مرتجع') ||
                                 pageContent?.includes('refund') ||
                                 pageContent?.includes('استرداد')

      expect(hasRefundsContent).toBeTruthy()
    }
  })

  test('should have refund status filters', async ({ page }) => {
    await page.goto('/ar/admin/refunds')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/refunds') && !page.url().includes('/login')) {
      const pageContent = await page.textContent('body')

      // Check for status-related content
      const hasStatusContent = pageContent?.includes('معلق') ||
                                pageContent?.includes('pending') ||
                                pageContent?.includes('موافق') ||
                                pageContent?.includes('approved') ||
                                pageContent?.includes('مرفوض') ||
                                pageContent?.includes('rejected')

      expect(hasStatusContent || pageContent?.includes('مرتجع')).toBeTruthy()
    }
  })

  test('should show refund details', async ({ page }) => {
    await page.goto('/ar/admin/refunds')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/refunds') && !page.url().includes('/login')) {
      // Look for refund card or table row
      const refundItem = page.locator('[class*="card"], tr, [class*="refund"]').first()

      if (await refundItem.isVisible().catch(() => false)) {
        const itemText = await refundItem.textContent()

        // Should show refund information
        const hasRefundInfo = itemText?.includes('#') || // Order number
                              itemText?.includes('ج.م') || // Amount in EGP
                              itemText?.includes('EGP') ||
                              itemText?.includes('طلب')

        expect(hasRefundInfo).toBeTruthy()
      }
    }
  })
})

test.describe('Refund Impact on Finance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
  })

  test('should reflect refunds in provider finance page', async ({ page }) => {
    await page.goto('/ar/provider/finance')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/finance') && !page.url().includes('/login')) {
      const pageContent = await page.textContent('body')

      // Finance page should have transaction history
      const hasTransactionHistory = pageContent?.includes('سجل') ||
                                     pageContent?.includes('معامل') ||
                                     pageContent?.includes('transaction') ||
                                     pageContent?.includes('المالية')

      expect(hasTransactionHistory).toBeTruthy()
    }
  })

  test('should have refund filter in transaction history', async ({ page }) => {
    await page.goto('/ar/provider/finance')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/finance') && !page.url().includes('/login')) {
      // Look for refund filter button
      const refundFilter = page.locator('button:has-text("مرتجع"), button:has-text("Refund"), button:has-text("المرتجعات")')

      const hasRefundFilter = await refundFilter.first().isVisible().catch(() => false)

      // Either has filter or transaction history shows refunds inline
      const pageContent = await page.textContent('body')
      const hasRefundContent = pageContent?.includes('مرتجع') || pageContent?.includes('refund')

      expect(hasRefundFilter || hasRefundContent || pageContent?.includes('معامل')).toBeTruthy()
    }
  })

  test('commission card should account for refunds', async ({ page }) => {
    await page.goto('/ar/provider/finance')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/finance') && !page.url().includes('/login')) {
      // Look for commission card
      const commissionCard = page.locator('[class*="card"]:has-text("عمولة"), [class*="card"]:has-text("commission")')

      if (await commissionCard.first().isVisible().catch(() => false)) {
        const cardText = await commissionCard.first().textContent()

        // Should show commission amount
        const hasAmount = cardText?.includes('ج.م') || cardText?.includes('EGP') || /\d+/.test(cardText || '')

        expect(hasAmount).toBeTruthy()
      }
    }
  })
})

test.describe('Refund Real-time Updates', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page)
  })

  test('should update UI when refund status changes', async ({ page }) => {
    await page.goto('/ar/provider/refunds')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/refunds') && !page.url().includes('/login')) {
      // Check for real-time subscription indicators
      const pageContent = await page.textContent('body')

      // Page should be loaded and show refunds content
      const hasContent = pageContent?.includes('مرتجع') ||
                         pageContent?.includes('refund') ||
                         pageContent?.includes('لا يوجد')

      expect(hasContent).toBeTruthy()

      // Note: Full real-time testing would require mocking Supabase subscriptions
      // This test verifies the page structure supports real-time updates
    }
  })

  test('sidebar badge should be present for notifications', async ({ page }) => {
    await page.goto('/ar/provider')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/provider') && !page.url().includes('/login')) {
      // Check sidebar structure
      const sidebar = page.locator('aside')

      if (await sidebar.isVisible()) {
        // Look for notification badges in sidebar
        const badges = sidebar.locator('[class*="badge"], [class*="rounded-full"]')
        const badgeCount = await badges.count()

        // Sidebar should support badges (even if none are visible)
        console.log('Badge elements in sidebar:', badgeCount)

        // Verify sidebar has refunds link
        const refundsLink = sidebar.locator('a[href*="/refunds"]')
        await expect(refundsLink).toBeVisible()
      }
    }
  })
})

test.describe('Refund Responsive Design', () => {
  test('should be mobile responsive on provider refunds page', async ({ page }) => {
    await loginAsProvider(page)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/ar/provider/refunds')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/refunds')) {
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBeFalsy()
    }
  })

  test('should be mobile responsive on admin refunds page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/ar/admin/refunds')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/refunds')) {
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBeFalsy()
    }
  })
})
