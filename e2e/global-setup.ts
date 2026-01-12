import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * Global Setup for Playwright E2E Tests
 *
 * This script runs once before all tests and:
 * 1. Logs in as Admin, Provider, and Customer
 * 2. Saves authentication state (cookies, localStorage) to JSON files
 * 3. These files are used by tests to skip the login process
 */

// Storage state file paths
export const STORAGE_STATE_DIR = path.join(__dirname, '.auth')
export const ADMIN_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'admin.json')
export const PROVIDER_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'provider.json')
export const CUSTOMER_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'customer.json')

// Test users credentials
const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'Test123!',
    loginUrl: '/ar/admin/login',
    dashboardUrl: '/ar/admin',
  },
  provider: {
    email: process.env.TEST_PROVIDER_EMAIL || 'provider@test.com',
    password: process.env.TEST_PROVIDER_PASSWORD || 'Test123!',
    loginUrl: '/ar/provider/login',
    dashboardUrl: '/ar/provider',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.com',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'Test123!',
    loginUrl: '/ar/auth/login',
    dashboardUrl: '/ar',
  },
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'

  // Create auth directory if it doesn't exist
  if (!fs.existsSync(STORAGE_STATE_DIR)) {
    fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true })
  }

  console.log('🔐 Starting global authentication setup...')
  console.log(`   Base URL: ${baseURL}`)

  const browser = await chromium.launch()

  try {
    // Authenticate Admin
    await authenticateUser(browser, baseURL, 'admin', TEST_USERS.admin, ADMIN_STORAGE_STATE)

    // Authenticate Provider
    await authenticateUser(browser, baseURL, 'provider', TEST_USERS.provider, PROVIDER_STORAGE_STATE)

    // Authenticate Customer (requires clicking "Continue with Email" button first)
    await authenticateCustomer(browser, baseURL, TEST_USERS.customer, CUSTOMER_STORAGE_STATE)

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    // Don't throw - allow tests to run even if auth fails
    // Tests will handle unauthenticated state
  } finally {
    await browser.close()
  }

  console.log('✅ Global authentication setup complete!')
}

async function authenticateUser(
  browser: import('@playwright/test').Browser,
  baseURL: string,
  role: string,
  user: typeof TEST_USERS.admin,
  storageStatePath: string
) {
  console.log(`   Authenticating ${role}...`)

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to login page
    await page.goto(`${baseURL}${user.loginUrl}`)
    await page.waitForLoadState('networkidle')

    // Wait for form to appear (after auth check spinner)
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await emailInput.waitFor({ state: 'visible', timeout: 15000 })

    // Fill login form
    await emailInput.fill(user.email)
    await page.locator('input[type="password"], input[name="password"]').fill(user.password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for navigation to dashboard or check if login succeeded
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Check if we're still on login page (login might have failed)
    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      console.log(`   ⚠️  ${role} login might have failed - still on login page`)
    } else {
      console.log(`   ✓ ${role} authenticated successfully`)
    }

    // Save storage state regardless of login outcome
    await context.storageState({ path: storageStatePath })

  } catch (error) {
    console.log(`   ⚠️  ${role} authentication error:`, error instanceof Error ? error.message : error)
    // Save empty storage state to prevent file not found errors
    await context.storageState({ path: storageStatePath })
  } finally {
    await context.close()
  }
}

async function authenticateCustomer(
  browser: import('@playwright/test').Browser,
  baseURL: string,
  user: typeof TEST_USERS.customer,
  storageStatePath: string
) {
  console.log('   Authenticating customer...')

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to login page
    await page.goto(`${baseURL}${user.loginUrl}`)
    await page.waitForLoadState('networkidle')

    // Customer login requires clicking "Continue with Email" button first
    const emailButton = page.locator('button:has(svg.lucide-mail), button:has-text("الدخول عبر الإيميل"), button:has-text("Continue with Email")')
    await emailButton.waitFor({ state: 'visible', timeout: 15000 })
    await emailButton.click()

    // Wait for email form to appear
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await emailInput.waitFor({ state: 'visible', timeout: 10000 })

    // Fill login form
    await emailInput.fill(user.email)
    await page.locator('input[type="password"], input[name="password"]').fill(user.password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for navigation
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Check if we're still on login page
    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('   ⚠️  Customer login might have failed - still on login page')
    } else {
      console.log('   ✓ Customer authenticated successfully')
    }

    // Save storage state
    await context.storageState({ path: storageStatePath })

  } catch (error) {
    console.log('   ⚠️  Customer authentication error:', error instanceof Error ? error.message : error)
    // Save empty storage state to prevent file not found errors
    await context.storageState({ path: storageStatePath })
  } finally {
    await context.close()
  }
}

export default globalSetup
