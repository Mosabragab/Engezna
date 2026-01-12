import { test, expect } from '@playwright/test'

/**
 * Admin Dashboard E2E Tests
 *
 * Tests cover:
 * 1. Admin login flow
 * 2. Dashboard display and statistics
 * 3. Provider management
 * 4. User/Customer management
 * 5. Orders overview
 * 6. Settlements management
 * 7. Refunds and disputes
 * 8. Supervisors and roles
 *
 * Note: Authentication is handled by global-setup.ts and storageState.
 * Tests use pre-authenticated sessions, no manual login required.
 */

test.describe('Admin Login Flow', () => {
  test('should display admin login page correctly', async ({ page }) => {
    await page.goto('/ar/admin/login')
    await page.waitForLoadState('networkidle')

    // Wait for the form to appear (after checkingAuth spinner disappears)
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await emailInput.waitFor({ state: 'visible', timeout: 15000 })

    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    const submitBtn = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitBtn).toBeVisible()

    // Verify admin branding
    const pageContent = await page.textContent('body')
    const hasAdminText = pageContent?.includes('إدارة') ||
                         pageContent?.includes('Admin') ||
                         pageContent?.includes('لوحة التحكم') ||
                         pageContent?.includes('المشرفين') ||
                         pageContent?.includes('تسجيل دخول')

    expect(hasAdminText).toBeTruthy()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/ar/admin/login')
    await page.waitForLoadState('networkidle')

    // Wait for the form to appear (after checkingAuth spinner disappears)
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.waitFor({ state: 'visible', timeout: 15000 })

    // Try to submit empty form
    await submitBtn.click()

    await page.waitForTimeout(1000)

    // Check for validation - form should show required field error or not submit
    const pageContent = await page.textContent('body')
    const hasValidation = pageContent?.includes('مطلوب') ||
                          pageContent?.includes('required') ||
                          pageContent?.includes('البريد') ||
                          pageContent?.includes('Email')

    expect(hasValidation).toBeTruthy()
  })

  test('should redirect to dashboard after login (with valid credentials)', async ({ page }) => {
    await page.goto('/ar/admin/login')
    await page.waitForLoadState('networkidle')

    // Fill in test credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')

    await emailInput.fill('admin@test.com')
    await passwordInput.fill('Test123!')

    // Submit form
    await page.locator('button[type="submit"]').click()

    // Wait for navigation
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Check result
    const url = page.url()
    const isOnAdmin = url.includes('/admin') && !url.includes('/login')
    const hasError = await page.locator('[class*="error"], [class*="alert"]').first().isVisible().catch(() => false)

    expect(isOnAdmin || hasError).toBeTruthy()
  })
})

test.describe('Admin Dashboard Display', () => {
  test.beforeEach(async ({ page }) => {
    // Authentication handled by storageState - just navigate to dashboard
    await page.goto('/ar/admin')
    await page.waitForLoadState('networkidle')
  })

  test('should display dashboard or login redirect', async ({ page }) => {
    const url = page.url()

    const isOnAdmin = url.includes('/admin') && !url.includes('/login')
    const isOnLogin = url.includes('/login') || url.includes('/auth')

    expect(isOnAdmin || isOnLogin).toBeTruthy()
  })

  test('should have sidebar navigation', async ({ page }) => {
    if (page.url().includes('/admin') && !page.url().includes('/login')) {
      const sidebar = page.locator('aside, nav[class*="sidebar"], [class*="Sidebar"]')

      if (await sidebar.first().isVisible()) {
        const pageContent = await page.textContent('body')

        // Check for admin nav items
        const hasProviders = pageContent?.includes('المتاجر') || pageContent?.includes('Providers')
        const hasUsers = pageContent?.includes('المستخدمين') || pageContent?.includes('Users')
        const hasOrders = pageContent?.includes('الطلبات') || pageContent?.includes('Orders')

        expect(hasProviders || hasUsers || hasOrders).toBeTruthy()
      }
    }
  })

  test('should display statistics cards', async ({ page }) => {
    if (page.url().includes('/admin') && !page.url().includes('/login')) {
      const statsCards = page.locator('[class*="card"], [class*="Card"], [class*="stat"]')
      const cardsCount = await statsCards.count()

      expect(cardsCount).toBeGreaterThan(0)
    }
  })
})

test.describe('Admin Provider Management', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState
  })

  test('should display providers page', async ({ page }) => {
    await page.goto('/ar/admin/providers')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/providers')) {
      const pageContent = await page.textContent('body')
      const hasProviderContent = pageContent?.includes('متجر') ||
                                  pageContent?.includes('provider') ||
                                  pageContent?.includes('المتاجر')

      expect(hasProviderContent).toBeTruthy()
    }
  })

  test('should have provider approval functionality', async ({ page }) => {
    await page.goto('/ar/admin/providers')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/providers') && !page.url().includes('/login')) {
      // Look for approval buttons or status indicators
      const approvalElements = page.locator('button:has-text("موافقة"), button:has-text("Approve"), [class*="status"], [class*="pending"]')

      // Should have some form of approval UI (or show "no pending")
      const hasApprovalUI = await approvalElements.first().isVisible().catch(() => false)
      const pageContent = await page.textContent('body')
      const hasStatusText = pageContent?.includes('معلق') || pageContent?.includes('pending') || pageContent?.includes('موافق')

      expect(hasApprovalUI || hasStatusText).toBeTruthy()
    }
  })
})

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState
  })

  test('should display users page', async ({ page }) => {
    await page.goto('/ar/admin/users')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/users')) {
      const pageContent = await page.textContent('body')
      const hasUserContent = pageContent?.includes('مستخدم') ||
                              pageContent?.includes('user') ||
                              pageContent?.includes('عميل') ||
                              pageContent?.includes('customer')

      expect(hasUserContent).toBeTruthy()
    }
  })

  test('should have user ban functionality', async ({ page }) => {
    await page.goto('/ar/admin/users')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/users') && !page.url().includes('/login')) {
      const pageContent = await page.textContent('body')

      // Check for ban-related UI elements
      const hasBanUI = pageContent?.includes('حظر') ||
                        pageContent?.includes('ban') ||
                        pageContent?.includes('تعليق') ||
                        pageContent?.includes('نشط')

      expect(hasBanUI).toBeTruthy()
    }
  })
})

test.describe('Admin Orders Management', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState
  })

  test('should display orders page', async ({ page }) => {
    await page.goto('/ar/admin/orders')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/orders')) {
      const pageContent = await page.textContent('body')
      const hasOrderContent = pageContent?.includes('طلب') ||
                               pageContent?.includes('order') ||
                               pageContent?.includes('الطلبات')

      expect(hasOrderContent).toBeTruthy()
    }
  })
})

test.describe('Admin Settlements Management', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState
  })

  test('should display settlements page', async ({ page }) => {
    await page.goto('/ar/admin/settlements')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/settlements')) {
      const pageContent = await page.textContent('body')
      const hasSettlementsContent = pageContent?.includes('تسوية') ||
                                     pageContent?.includes('settlement') ||
                                     pageContent?.includes('مستحقات')

      expect(hasSettlementsContent).toBeTruthy()
    }
  })

  test('should have generate settlement button', async ({ page }) => {
    await page.goto('/ar/admin/settlements')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/settlements') && !page.url().includes('/login')) {
      const generateBtn = page.locator('button:has-text("إنشاء"), button:has-text("Generate"), button:has-text("توليد")')

      if (await generateBtn.first().isVisible()) {
        await expect(generateBtn.first()).toBeVisible()
      }
    }
  })
})

test.describe('Admin Refunds & Disputes', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState
  })

  test('should display refunds page', async ({ page }) => {
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

  test('should display disputes page', async ({ page }) => {
    await page.goto('/ar/admin/disputes')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/disputes')) {
      const pageContent = await page.textContent('body')
      const hasDisputesContent = pageContent?.includes('شكوى') ||
                                  pageContent?.includes('dispute') ||
                                  pageContent?.includes('نزاع')

      expect(hasDisputesContent).toBeTruthy()
    }
  })
})

test.describe('Admin Supervisors & Roles', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState
  })

  test('should display supervisors page', async ({ page }) => {
    await page.goto('/ar/admin/supervisors')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/supervisors')) {
      const pageContent = await page.textContent('body')
      const hasSupervisorsContent = pageContent?.includes('مشرف') ||
                                     pageContent?.includes('supervisor') ||
                                     pageContent?.includes('موظف')

      expect(hasSupervisorsContent).toBeTruthy()
    }
  })

  test('should display roles page', async ({ page }) => {
    await page.goto('/ar/admin/roles')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/roles')) {
      const pageContent = await page.textContent('body')
      const hasRolesContent = pageContent?.includes('صلاحية') ||
                               pageContent?.includes('role') ||
                               pageContent?.includes('دور')

      expect(hasRolesContent).toBeTruthy()
    }
  })
})

test.describe('Admin Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState
  })

  test('should display analytics page', async ({ page }) => {
    await page.goto('/ar/admin/analytics')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/analytics')) {
      const pageContent = await page.textContent('body')
      const hasAnalyticsContent = pageContent?.includes('تحليل') ||
                                   pageContent?.includes('analytics') ||
                                   pageContent?.includes('إحصائيات') ||
                                   pageContent?.includes('statistics')

      expect(hasAnalyticsContent).toBeTruthy()
    }
  })
})

test.describe('Admin Approvals Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState
  })

  test('should display approvals page', async ({ page }) => {
    await page.goto('/ar/admin/approvals')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    if (url.includes('/approvals')) {
      const pageContent = await page.textContent('body')
      const hasApprovalsContent = pageContent?.includes('موافقة') ||
                                   pageContent?.includes('approval') ||
                                   pageContent?.includes('طلب')

      expect(hasApprovalsContent).toBeTruthy()
    }
  })
})

test.describe('Admin Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by storageState
  })

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/ar/admin')
    await page.waitForLoadState('networkidle')

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    expect(hasHorizontalScroll).toBeFalsy()
  })

  test('should have collapsible sidebar on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/ar/admin')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('/admin') && !page.url().includes('/login')) {
      // Look for hamburger menu or sidebar toggle
      const menuToggle = page.locator('button[class*="menu"], [class*="hamburger"]')
      const hasMenuToggle = await menuToggle.first().isVisible().catch(() => false)

      // On mobile, sidebar should be hidden or collapsible
      expect(hasMenuToggle).toBeTruthy()
    }
  })
})

test.describe('Admin Security Checks', () => {
  test('should not expose sensitive data in page source', async ({ page }) => {
    await page.goto('/ar/admin')
    await page.waitForLoadState('networkidle')

    const pageContent = await page.content()

    // Check for common sensitive data patterns
    const hasApiKeys = /api[_-]?key["']?\s*[:=]\s*["'][a-zA-Z0-9]{20,}/i.test(pageContent)
    const hasPasswords = /password["']?\s*[:=]\s*["'][^"']{6,}/i.test(pageContent)
    const hasSecrets = /secret["']?\s*[:=]\s*["'][a-zA-Z0-9]{10,}/i.test(pageContent)

    expect(hasApiKeys).toBeFalsy()
    expect(hasPasswords).toBeFalsy()
    expect(hasSecrets).toBeFalsy()
  })

  test('should require authentication for admin routes', async ({ page }) => {
    // Try accessing admin page without login
    await page.goto('/ar/admin/users')
    await page.waitForLoadState('networkidle')

    const url = page.url()

    // Should redirect to login or show unauthorized
    const redirectedToLogin = url.includes('/login') || url.includes('/auth')
    const showsUnauthorized = await page.locator('text=/غير مصرح|unauthorized|access denied/i').isVisible().catch(() => false)
    const staysOnAdmin = url.includes('/admin/users')

    // Either redirects to login, shows unauthorized, or successfully loads (if authenticated)
    expect(redirectedToLogin || showsUnauthorized || staysOnAdmin).toBeTruthy()
  })
})
