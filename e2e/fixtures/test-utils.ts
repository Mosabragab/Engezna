import { test as base, expect, Page } from '@playwright/test'

/**
 * Test Utilities and Fixtures for E2E Testing
 */

// Test user credentials (should match your test database)
export const TEST_USERS = {
  customer: {
    email: 'testcustomer@engezna.com',
    password: 'Test@123456',
    phone: '01012345678',
    name: 'Test Customer',
  },
  provider: {
    email: 'testprovider@engezna.com',
    password: 'Test@123456',
    storeName: 'Test Store',
  },
  admin: {
    email: 'testadmin@engezna.com',
    password: 'Test@123456',
  },
}

// Common locators
export const LOCATORS = {
  // Auth
  emailInput: 'input[type="email"], input[name="email"]',
  passwordInput: 'input[type="password"], input[name="password"]',
  submitButton: 'button[type="submit"]',

  // Navigation
  header: 'header',
  sidebar: 'aside, nav[class*="sidebar"], [class*="Sidebar"]',
  bottomNav: 'nav[class*="bottom"], [class*="bottom-nav"], [class*="BottomNav"]',

  // Cards
  card: '[class*="card"], [class*="Card"]',
  statsCard: '[class*="stat"], [class*="Stat"]',

  // Buttons
  addButton: 'button:has-text("إضافة"), button:has-text("Add")',
  saveButton: 'button:has-text("حفظ"), button:has-text("Save")',
  cancelButton: 'button:has-text("إلغاء"), button:has-text("Cancel")',
  deleteButton: 'button:has-text("حذف"), button:has-text("Delete")',

  // Status badges
  badge: '[class*="badge"], [class*="Badge"]',

  // Loaders
  spinner: '[class*="spinner"], [class*="loading"], [class*="animate-spin"]',
}

// Helper class for common test operations
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login as customer
   */
  async loginAsCustomer() {
    await this.page.goto('/ar/auth/login')
    await this.page.waitForLoadState('networkidle')

    await this.page.fill(LOCATORS.emailInput, TEST_USERS.customer.email)
    await this.page.fill(LOCATORS.passwordInput, TEST_USERS.customer.password)
    await this.page.click(LOCATORS.submitButton)

    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(1000)

    return this.page.url().includes('/auth') === false
  }

  /**
   * Login as provider
   */
  async loginAsProvider() {
    await this.page.goto('/ar/provider/login')
    await this.page.waitForLoadState('networkidle')

    await this.page.fill(LOCATORS.emailInput, TEST_USERS.provider.email)
    await this.page.fill(LOCATORS.passwordInput, TEST_USERS.provider.password)
    await this.page.click(LOCATORS.submitButton)

    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(1000)

    return this.page.url().includes('/provider') && !this.page.url().includes('/login')
  }

  /**
   * Login as admin
   */
  async loginAsAdmin() {
    await this.page.goto('/ar/admin/login')
    await this.page.waitForLoadState('networkidle')

    await this.page.fill(LOCATORS.emailInput, TEST_USERS.admin.email)
    await this.page.fill(LOCATORS.passwordInput, TEST_USERS.admin.password)
    await this.page.click(LOCATORS.submitButton)

    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(1000)

    return this.page.url().includes('/admin') && !this.page.url().includes('/login')
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
    // Wait for any spinners to disappear
    const spinner = this.page.locator(LOCATORS.spinner).first()
    if (await spinner.isVisible().catch(() => false)) {
      await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    }
  }

  /**
   * Check if element contains Arabic text
   */
  async hasArabicContent(selector: string): Promise<boolean> {
    const element = this.page.locator(selector).first()
    if (await element.isVisible().catch(() => false)) {
      const text = await element.textContent()
      return /[\u0600-\u06FF]/.test(text || '')
    }
    return false
  }

  /**
   * Get page content as text
   */
  async getPageText(): Promise<string> {
    return await this.page.textContent('body') || ''
  }

  /**
   * Check if current page is in RTL mode
   */
  async isRTL(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return document.dir === 'rtl' || document.documentElement.dir === 'rtl'
    })
  }

  /**
   * Check for no horizontal scroll (responsive test)
   */
  async hasNoHorizontalScroll(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth
    })
  }

  /**
   * Click and wait for navigation
   */
  async clickAndNavigate(selector: string) {
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.page.click(selector),
    ])
  }

  /**
   * Fill form field by name
   */
  async fillField(name: string, value: string) {
    await this.page.fill(`input[name="${name}"], textarea[name="${name}"]`, value)
  }

  /**
   * Select dropdown option
   */
  async selectOption(name: string, value: string) {
    await this.page.selectOption(`select[name="${name}"]`, value)
  }

  /**
   * Check if toast/notification appeared
   */
  async hasToast(text?: string): Promise<boolean> {
    const toastSelector = '[class*="toast"], [class*="Toast"], [class*="notification"], [role="alert"]'
    const toast = this.page.locator(toastSelector).first()

    if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (text) {
        const content = await toast.textContent()
        return content?.includes(text) || false
      }
      return true
    }
    return false
  }

  /**
   * Take screenshot with descriptive name
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true })
  }
}

// Extended test fixture with helpers
export const test = base.extend<{ helpers: TestHelpers }>({
  helpers: async ({ page }, use) => {
    const helpers = new TestHelpers(page)
    await use(helpers)
  },
})

export { expect }
