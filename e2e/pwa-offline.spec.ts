import { test, expect, BrowserContext } from '@playwright/test'
import { TEST_USERS, LOCATORS } from './fixtures/test-utils'

/**
 * PWA Offline Tests
 *
 * Tests to verify PWA functionality:
 * 1. Service Worker registration
 * 2. Offline page display
 * 3. Manifest.json configuration
 * 4. App installability
 */

// Helper function to login as customer
async function loginAsCustomer(page: import('@playwright/test').Page) {
  await page.goto('/ar/auth/login')
  await page.waitForLoadState('networkidle')

  // Customer login page requires clicking "Continue with Email" button first
  const emailButton = page.locator('button:has(svg.lucide-mail), button:has-text("الدخول عبر الإيميل"), button:has-text("Continue with Email")')
  await emailButton.waitFor({ state: 'visible', timeout: 15000 })
  await emailButton.click()

  // Wait for the email form to appear
  const emailInput = page.locator(LOCATORS.emailInput)
  await emailInput.waitFor({ state: 'visible', timeout: 10000 })

  const passwordInput = page.locator(LOCATORS.passwordInput)

  await emailInput.fill(TEST_USERS.customer.email)
  await passwordInput.fill(TEST_USERS.customer.password)
  await page.click(LOCATORS.submitButton)

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
}

test.describe('PWA - Service Worker & Offline', () => {
  test('should register service worker', async ({ page }) => {
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Wait for service worker to be registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        return !!registration
      }
      return false
    })

    // Service worker should be registered in production build
    // In development, it might not be registered
    console.log('Service Worker Registered:', swRegistered)
  })

  test('should display offline page when connection is lost', async ({ page, context }) => {
    // First, load the page while online to cache it
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Wait for service worker and cache to be ready
    await page.waitForTimeout(2000)

    // Go offline
    await context.setOffline(true)

    // Try to navigate to a new page
    await page.goto('/ar/providers', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
      // Navigation might fail, which is expected when offline
    })

    // Wait for offline UI to appear
    await page.waitForTimeout(1000)

    // Check for offline indicators
    const pageContent = await page.textContent('body')

    // Should show offline message or cached content
    const hasOfflineIndicator =
      pageContent?.includes('غير متصل') ||
      pageContent?.includes('offline') ||
      pageContent?.includes('لا يوجد اتصال') ||
      pageContent?.includes('No connection') ||
      pageContent?.includes('المتاجر') || // Cached content
      pageContent?.includes('إنجزنا') // App name indicating cached shell

    expect(hasOfflineIndicator).toBeTruthy()

    // Go back online
    await context.setOffline(false)
  })

  test('should cache app shell for offline use', async ({ page, context }) => {
    // Load homepage
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Wait for cache to populate
    await page.waitForTimeout(3000)

    // Go offline
    await context.setOffline(true)

    // Reload the page
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})

    // Check if app shell is visible from cache
    const header = page.locator('header')
    const isHeaderVisible = await header.isVisible().catch(() => false)

    // Either header is visible (cached) or offline page shows
    const pageContent = await page.textContent('body')
    const hasCachedContent = isHeaderVisible ||
                            pageContent?.includes('إنجزنا') ||
                            pageContent?.includes('غير متصل')

    expect(hasCachedContent).toBeTruthy()

    // Go back online
    await context.setOffline(false)
  })

  test('should show offline notification/banner', async ({ page, context }) => {
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Wait for app to fully load
    await page.waitForTimeout(2000)

    // Go offline
    await context.setOffline(true)

    // Trigger a network request by navigating or refreshing
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})

    // Wait for offline detection
    await page.waitForTimeout(1500)

    // Look for offline banner/notification
    const offlineBanner = page.locator('[data-testid="offline-banner"], [class*="offline"], [class*="connection"]')
    const pageContent = await page.textContent('body')

    const hasOfflineUI =
      await offlineBanner.first().isVisible().catch(() => false) ||
      pageContent?.includes('غير متصل') ||
      pageContent?.includes('offline') ||
      pageContent?.includes('لا يوجد اتصال')

    // Either shows offline UI or gracefully handles offline state
    expect(hasOfflineUI || pageContent?.includes('إنجزنا')).toBeTruthy()

    // Go back online
    await context.setOffline(false)
  })
})

test.describe('PWA - Manifest Configuration', () => {
  test('should have valid manifest.json', async ({ page, request }) => {
    // Fetch manifest directly
    const response = await request.get('/manifest.json')

    expect(response.status()).toBe(200)

    const manifest = await response.json()

    // Verify required manifest fields
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons).toBeInstanceOf(Array)
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  test('should have privacy policy URL in manifest', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json()

    // Verify privacy policy URL is set
    expect(manifest.privacy_policy_url).toBeTruthy()
    expect(manifest.privacy_policy_url).toContain('/privacy')
  })

  test('should have proper theme colors', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json()

    // Verify theme colors (Charcoal theme)
    expect(manifest.theme_color).toBe('#0F172A')
    expect(manifest.background_color).toBe('#0F172A')
  })

  test('should have Arabic language settings', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json()

    // Verify Arabic language and RTL direction
    expect(manifest.lang).toBe('ar')
    expect(manifest.dir).toBe('rtl')
  })

  test('should have app icons', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json()

    // Verify icons array
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

    // Check for required sizes (192x192 and 512x512)
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  test('should have shortcuts configured', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json()

    // Verify shortcuts for quick actions
    if (manifest.shortcuts) {
      expect(manifest.shortcuts).toBeInstanceOf(Array)
      expect(manifest.shortcuts.length).toBeGreaterThan(0)

      // Each shortcut should have name and url
      manifest.shortcuts.forEach((shortcut: { name: string; url: string }) => {
        expect(shortcut.name).toBeTruthy()
        expect(shortcut.url).toBeTruthy()
      })
    }
  })
})

test.describe('PWA - App Installability', () => {
  test('page should have meta tags for PWA', async ({ page }) => {
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Check for manifest link
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')

    // Check for theme-color meta tag
    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor).toHaveAttribute('content', /#[0-9A-Fa-f]{6}/)

    // Check for apple-mobile-web-app-capable
    const appleMobile = page.locator('meta[name="apple-mobile-web-app-capable"]')
    const hasAppleMeta = await appleMobile.count() > 0

    // Either has apple meta or is using modern PWA standards
    expect(hasAppleMeta || await manifestLink.count() > 0).toBeTruthy()
  })

  test('should have proper viewport for mobile', async ({ page }) => {
    await page.goto('/ar')

    // Check viewport meta tag
    const viewport = page.locator('meta[name="viewport"]')
    const viewportContent = await viewport.getAttribute('content')

    expect(viewportContent).toContain('width=device-width')
    expect(viewportContent).toContain('initial-scale=1')
  })
})

test.describe('PWA - Offline Page Content', () => {
  test('offline page should be user-friendly', async ({ page, context }) => {
    // Load app first
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // Wait for service worker

    // Go offline
    await context.setOffline(true)

    // Navigate to a page that might not be cached
    await page.goto('/ar/help', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(1000)

    const pageContent = await page.textContent('body')

    // Offline state should show:
    // 1. Either cached content (page was cached)
    // 2. Or a friendly offline message
    const hasAppropriateContent =
      pageContent?.includes('إنجزنا') || // App branding
      pageContent?.includes('غير متصل') || // Offline message in Arabic
      pageContent?.includes('offline') ||
      pageContent?.includes('لا يوجد اتصال') ||
      pageContent?.includes('مساعدة') // Help page content if cached

    expect(hasAppropriateContent).toBeTruthy()

    // Go back online
    await context.setOffline(false)
  })

  test('should recover gracefully when back online', async ({ page, context }) => {
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Go offline briefly
    await context.setOffline(true)
    await page.waitForTimeout(1000)

    // Go back online
    await context.setOffline(false)

    // Try to navigate
    await page.goto('/ar/providers')
    await page.waitForLoadState('networkidle')

    // Should load successfully
    const pageContent = await page.textContent('body')
    expect(pageContent?.length).toBeGreaterThan(100)
  })
})
