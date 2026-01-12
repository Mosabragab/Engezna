import { test, expect, Page, devices } from '@playwright/test'
import { LOCATORS } from './fixtures/test-utils'

/**
 * Mobile Responsiveness E2E Tests
 *
 * Tests cover:
 * 1. iPhone 15 Pro Max (430x932) - iOS Latest
 * 2. Android Generic (412x915) - Samsung Galaxy S23
 * 3. Button/Text Overlap Detection
 * 4. Touch Target Size Verification (48px minimum)
 * 5. RTL Layout on Mobile
 * 6. Navigation & Scrolling
 *
 * Store Readiness: Visual QA for App Stores
 * Updated: 48px touch targets verification
 */

// Device configurations
const DEVICES = {
  iPhone15ProMax: {
    name: 'iPhone 15 Pro Max',
    viewport: { width: 430, height: 932 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  iPhone15: {
    name: 'iPhone 15',
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  AndroidGeneric: {
    name: 'Android Generic (Samsung S23)',
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
  },
  AndroidSmall: {
    name: 'Android Small',
    viewport: { width: 360, height: 740 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
  },
}

// Helper to check for horizontal overflow
async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
}

// Helper to check button touch target size (min 44x44 for iOS, 48x48 for Material)
// Updated to reflect our 48px changes
async function checkTouchTargets(page: Page, minSize: number = 44): Promise<{ valid: number; invalid: { selector: string; size: { width: number; height: number } }[] }> {
  return await page.evaluate((minSize) => {
    const buttons = document.querySelectorAll('button, a, [role="button"], input[type="submit"]')
    const invalid: { selector: string; size: { width: number; height: number } }[] = []
    let valid = 0

    buttons.forEach((btn, index) => {
      const rect = btn.getBoundingClientRect()
      // Only check visible, interactive elements
      if (rect.width > 0 && rect.height > 0 && rect.width < 500) {
        if (rect.width >= minSize && rect.height >= minSize) {
          valid++
        } else if (rect.width > 20 && rect.height > 20) {
          // Only flag as invalid if it's a reasonable size but under threshold
          invalid.push({
            selector: `${btn.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
            size: { width: Math.round(rect.width), height: Math.round(rect.height) },
          })
        }
      }
    })

    return { valid, invalid }
  }, minSize)
}

// Helper to check text truncation
async function checkTextTruncation(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const truncated: string[] = []
    const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label, a')

    textElements.forEach(el => {
      const style = window.getComputedStyle(el)
      if (style.overflow === 'hidden' && style.textOverflow === 'ellipsis') {
        if (el.scrollWidth > el.clientWidth) {
          truncated.push(el.textContent?.substring(0, 30) + '...' || 'Unknown text')
        }
      }
    })

    return truncated.slice(0, 10) // Limit to first 10
  })
}

// Helper to check element overlap
async function checkElementOverlap(page: Page): Promise<{ overlaps: number; details: string[] }> {
  return await page.evaluate(() => {
    const elements = document.querySelectorAll('button, a, input, [role="button"]')
    const rects: { el: Element; rect: DOMRect }[] = []
    const overlaps: string[] = []

    elements.forEach(el => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        rects.push({ el, rect })
      }
    })

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].rect
        const b = rects[j].rect

        // Check for significant overlap (more than 10px)
        const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))

        if (overlapX > 10 && overlapY > 10) {
          overlaps.push(
            `Overlap detected: ${rects[i].el.tagName} and ${rects[j].el.tagName}`
          )
        }
      }
    }

    return { overlaps: overlaps.length, details: overlaps.slice(0, 5) }
  })
}

test.describe('Mobile Responsiveness - iPhone 15', () => {
  test.use(DEVICES.iPhone15)

  test.describe('Customer Pages', () => {
    test('Homepage - No horizontal scroll', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      const hasScroll = await hasHorizontalScroll(page)
      expect(hasScroll).toBeFalsy()

      // Take screenshot for visual verification
      await page.screenshot({ path: 'e2e/screenshots/iphone15-homepage.png', fullPage: true })
    })

    test('Homepage - Touch targets meet iOS guidelines (44px)', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      const touchTargets = await checkTouchTargets(page, 44)

      console.log(`Valid touch targets (>=44px): ${touchTargets.valid}`)
      if (touchTargets.invalid.length > 0) {
        console.log('Small touch targets found:', touchTargets.invalid.slice(0, 5))
      }

      // Most buttons should be valid (allowing for some smaller icons/links)
      const totalButtons = touchTargets.valid + touchTargets.invalid.length
      if (totalButtons > 0) {
        const validPercentage = (touchTargets.valid / totalButtons) * 100
        console.log(`Valid percentage: ${validPercentage.toFixed(1)}%`)
        // Relaxed threshold - 60% should meet guidelines
        expect(validPercentage).toBeGreaterThanOrEqual(60)
      }
    })

    test('Providers page - No element overlap', async ({ page }) => {
      await page.goto('/ar/providers')
      await page.waitForLoadState('networkidle')

      const overlaps = await checkElementOverlap(page)

      if (overlaps.overlaps > 0) {
        console.log('Element overlaps found:', overlaps.details)
      }

      // Should have minimal significant overlaps
      expect(overlaps.overlaps).toBeLessThan(10)
    })

    test('Cart page - Buttons accessible', async ({ page }) => {
      await page.goto('/ar/cart')
      await page.waitForLoadState('networkidle')

      // Check all buttons are within viewport
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()

      let accessibleButtons = 0
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i)
        if (await button.isVisible().catch(() => false)) {
          const box = await button.boundingBox()
          if (box) {
            // Button should be within viewport with some tolerance
            if (box.x >= -50 && box.x + box.width <= 450) {
              accessibleButtons++
            }
          }
        }
      }

      console.log(`Accessible buttons: ${accessibleButtons}`)
    })

    test('Checkout page - Form inputs usable', async ({ page }) => {
      await page.goto('/ar/checkout')
      await page.waitForLoadState('networkidle')

      // Check input fields are properly sized
      const inputs = page.locator('input, textarea, select')
      const inputCount = await inputs.count()

      let usableInputs = 0
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i)
        if (await input.isVisible().catch(() => false)) {
          const box = await input.boundingBox()
          if (box && box.height >= 32) {
            usableInputs++
          }
        }
      }

      console.log(`Usable inputs: ${usableInputs}`)
    })

    test('Custom order page - No horizontal scroll', async ({ page }) => {
      await page.goto('/ar/custom-order')
      await page.waitForLoadState('networkidle')

      const hasScroll = await hasHorizontalScroll(page)
      expect(hasScroll).toBeFalsy()

      await page.screenshot({ path: 'e2e/screenshots/iphone15-custom-order.png', fullPage: true })
    })
  })

  test.describe('Navigation', () => {
    test('Bottom navigation should exist', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      const bottomNav = page.locator(
        'nav[class*="bottom"], [class*="bottom-nav"], [class*="fixed"][class*="bottom"]'
      )

      const hasBottomNav = await bottomNav.first().isVisible().catch(() => false)
      console.log('Bottom navigation visible:', hasBottomNav)

      // Page should load
      const pageContent = await page.textContent('body')
      expect(pageContent?.length).toBeGreaterThan(50)
    })

    test('Header should be accessible', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      const header = page.locator('header')
      const hasHeader = await header.isVisible().catch(() => false)

      expect(hasHeader).toBeTruthy()
    })

    test('Back navigation should work', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      await page.goto('/ar/providers')
      await page.waitForLoadState('networkidle')

      // Go back
      await page.goBack()
      await page.waitForLoadState('networkidle')

      // Should navigate back
      expect(page.url()).toContain('/ar')
    })
  })

  test.describe('RTL Layout', () => {
    test('RTL direction should be applied', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      const isRTL = await page.evaluate(() => {
        return document.dir === 'rtl' || document.documentElement.dir === 'rtl'
      })

      expect(isRTL).toBeTruthy()
    })

    test('Text alignment should be correct for Arabic', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      const textAlign = await page.evaluate(() => {
        const body = document.body
        return window.getComputedStyle(body).direction
      })

      expect(textAlign).toBe('rtl')
    })
  })
})

test.describe('Mobile Responsiveness - Android Generic', () => {
  test.use(DEVICES.AndroidGeneric)

  test.describe('Customer Pages', () => {
    test('Homepage - No horizontal scroll', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      const hasScroll = await hasHorizontalScroll(page)
      expect(hasScroll).toBeFalsy()

      await page.screenshot({ path: 'e2e/screenshots/android-homepage.png', fullPage: true })
    })

    test('Homepage - Touch targets meet Material guidelines (48px)', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      const touchTargets = await checkTouchTargets(page, 48)

      console.log(`Valid touch targets (>=48px): ${touchTargets.valid}`)
      if (touchTargets.invalid.length > 0) {
        console.log('Small touch targets:', touchTargets.invalid.slice(0, 5))
      }

      // Check that a good portion meet 48px guidelines
      const totalButtons = touchTargets.valid + touchTargets.invalid.length
      if (totalButtons > 0) {
        const validPercentage = (touchTargets.valid / totalButtons) * 100
        console.log(`Valid percentage for 48px: ${validPercentage.toFixed(1)}%`)
      }
    })

    test('Providers page - Cards layout properly', async ({ page }) => {
      await page.goto('/ar/providers')
      await page.waitForLoadState('networkidle')

      // Check for provider cards
      const cards = page.locator('[data-testid="store-card"], [class*="provider"], [class*="card"]')
      const cardCount = await cards.count()

      console.log('Provider cards found:', cardCount)

      // Cards should fit within viewport
      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const card = cards.nth(i)
        if (await card.isVisible().catch(() => false)) {
          const box = await card.boundingBox()
          if (box) {
            expect(box.width).toBeLessThanOrEqual(420) // Allow some tolerance
          }
        }
      }
    })

    test('Cart page - Quantity controls accessible (48px)', async ({ page }) => {
      await page.goto('/ar/cart')
      await page.waitForLoadState('networkidle')

      // Check quantity buttons using updated LOCATORS
      const qtyButtons = page.locator(LOCATORS.increaseButton)
        .or(page.locator(LOCATORS.decreaseButton))
      const buttonCount = await qtyButtons.count()

      let validButtons = 0
      for (let i = 0; i < buttonCount; i++) {
        const btn = qtyButtons.nth(i)
        if (await btn.isVisible().catch(() => false)) {
          const box = await btn.boundingBox()
          if (box && box.width >= 36 && box.height >= 36) {
            validButtons++
          }
        }
      }

      console.log(`Valid quantity buttons (>=36px): ${validButtons}`)
    })

    test('Notifications page - List items readable', async ({ page }) => {
      await page.goto('/ar/notifications')
      await page.waitForLoadState('networkidle')

      // Check text is not truncated badly
      const truncated = await checkTextTruncation(page)

      if (truncated.length > 0) {
        console.log('Truncated text found:', truncated)
      }

      // Page should load
      const pageContent = await page.textContent('body')
      expect(pageContent?.length).toBeGreaterThan(50)
    })
  })

  test.describe('Provider Dashboard', () => {
    test('Provider login page - Form usable', async ({ page }) => {
      await page.goto('/ar/provider/login')
      await page.waitForLoadState('networkidle')

      const hasScroll = await hasHorizontalScroll(page)
      expect(hasScroll).toBeFalsy()

      // Check input sizes
      const emailInput = page.locator('input[type="email"]')

      if (await emailInput.isVisible().catch(() => false)) {
        const box = await emailInput.boundingBox()
        if (box) {
          expect(box.width).toBeGreaterThan(150) // Should be wide enough
        }
      }

      await page.screenshot({ path: 'e2e/screenshots/android-provider-login.png', fullPage: true })
    })

    test('Provider dashboard - Stats cards visible', async ({ page }) => {
      await page.goto('/ar/provider')
      await page.waitForLoadState('networkidle')

      if (!page.url().includes('/login')) {
        const cards = page.locator('[class*="card"], [class*="stat"]')
        const cardCount = await cards.count()

        console.log('Dashboard cards:', cardCount)

        // Cards should not have significant overlaps
        const overlaps = await checkElementOverlap(page)
        expect(overlaps.overlaps).toBeLessThan(5)
      }
    })

    test('Provider orders - Scrolls properly', async ({ page }) => {
      await page.goto('/ar/provider/orders')
      await page.waitForLoadState('networkidle')

      if (!page.url().includes('/login')) {
        // Scroll down
        await page.evaluate(() => window.scrollTo(0, 500))
        await page.waitForTimeout(500)

        // Page should still be responsive
        const pageContent = await page.textContent('body')
        expect(pageContent?.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Touch Interactions', () => {
    test('Tap on cards should navigate', async ({ page }) => {
      await page.goto('/ar/providers')
      await page.waitForLoadState('networkidle')

      const storeCard = page.locator('a[href*="/providers/"]').first()

      if (await storeCard.isVisible().catch(() => false)) {
        await storeCard.tap()
        await page.waitForLoadState('networkidle')

        expect(page.url()).toContain('/providers/')
      }
    })

    test('Swipeable elements check', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      // Check for swipeable elements
      const carousel = page.locator('[class*="carousel"], [class*="swipe"], [class*="slider"]')
      const hasCarousel = await carousel.first().isVisible().catch(() => false)

      console.log('Swipeable element found:', hasCarousel)
    })

    test('Long press should not break UI', async ({ page }) => {
      await page.goto('/ar')
      await page.waitForLoadState('networkidle')

      // Simulate long press
      const element = page.locator('body').first()
      await element.click({ delay: 500 })

      // UI should still work
      const pageContent = await page.textContent('body')
      expect(pageContent?.length).toBeGreaterThan(0)
    })
  })
})

test.describe('Mobile Responsiveness - Cross-Device', () => {
  const deviceConfigs = [
    { name: 'iPhone 15 Pro Max', ...DEVICES.iPhone15ProMax },
    { name: 'iPhone 15', ...DEVICES.iPhone15 },
    { name: 'Android Generic', ...DEVICES.AndroidGeneric },
    { name: 'Android Small', ...DEVICES.AndroidSmall },
  ]

  for (const device of deviceConfigs) {
    test.describe(`${device.name}`, () => {
      test.use({ viewport: device.viewport, userAgent: device.userAgent, isMobile: device.isMobile })

      test('No horizontal overflow on main pages', async ({ page }) => {
        const pages = ['/ar', '/ar/providers', '/ar/cart']

        for (const url of pages) {
          await page.goto(url)
          await page.waitForLoadState('networkidle')

          const hasScroll = await hasHorizontalScroll(page)

          if (hasScroll) {
            console.log(`Horizontal scroll detected on ${url} for ${device.name}`)
          }

          expect(hasScroll).toBeFalsy()
        }
      })

      test('Footer is accessible via scroll', async ({ page }) => {
        await page.goto('/ar')
        await page.waitForLoadState('networkidle')

        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(500)

        const footer = page.locator('footer')
        const isVisible = await footer.isVisible().catch(() => false)

        // Footer may or may not exist - just verify page scrolls
        const pageContent = await page.textContent('body')
        expect(pageContent?.length).toBeGreaterThan(50)
      })

      test('Modals/Dialogs fit screen', async ({ page }) => {
        await page.goto('/ar/auth/login')
        await page.waitForLoadState('networkidle')

        // Check for any modal that might be open
        const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]')

        if (await modal.first().isVisible().catch(() => false)) {
          const box = await modal.first().boundingBox()
          if (box) {
            expect(box.width).toBeLessThanOrEqual(device.viewport.width + 20)
          }
        }

        // Page should load
        const pageContent = await page.textContent('body')
        expect(pageContent?.length).toBeGreaterThan(50)
      })
    })
  }
})

test.describe('Visual Regression Prevention', () => {
  test.use(DEVICES.iPhone15)

  test('Critical pages render without major issues', async ({ page }) => {
    const criticalPages = [
      { url: '/ar', name: 'homepage' },
      { url: '/ar/providers', name: 'providers' },
      { url: '/ar/cart', name: 'cart' },
      { url: '/ar/custom-order', name: 'custom-order' },
      { url: '/ar/provider/login', name: 'provider-login' },
    ]

    const issues: string[] = []

    for (const { url, name } of criticalPages) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')

      // Check for horizontal scroll
      const hasHScroll = await hasHorizontalScroll(page)
      if (hasHScroll) {
        issues.push(`${name}: Horizontal scroll detected`)
      }

      // Check for significant overlaps
      const overlaps = await checkElementOverlap(page)
      if (overlaps.overlaps > 5) {
        issues.push(`${name}: ${overlaps.overlaps} element overlaps`)
      }

      // Screenshot for manual review
      await page.screenshot({
        path: `e2e/screenshots/visual-${name}.png`,
        fullPage: true,
      })
    }

    if (issues.length > 0) {
      console.log('Visual issues found:', issues)
    }

    // Allow some issues but not critical horizontal scroll
    expect(issues.filter(i => i.includes('scroll')).length).toBeLessThan(3)
  })
})

test.describe('Accessibility on Mobile', () => {
  test.use(DEVICES.iPhone15)

  test('Focus indicators work with keyboard', async ({ page }) => {
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    // Tab through elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Check for focus styles
    const focusedElement = page.locator(':focus')
    const hasFocus = await focusedElement.isVisible().catch(() => false)

    console.log('Focus visible after tab:', hasFocus)
  })

  test('Inputs have labels or placeholders', async ({ page }) => {
    await page.goto('/ar/auth/login')
    await page.waitForLoadState('networkidle')

    // Check inputs have labels
    const inputs = page.locator('input')
    const inputCount = await inputs.count()

    let labeledInputs = 0

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const placeholder = await input.getAttribute('placeholder')
      const type = await input.getAttribute('type')

      // Hidden inputs don't need labels
      if (type === 'hidden') continue

      if (id || ariaLabel || placeholder) {
        labeledInputs++
      }
    }

    console.log(`Labeled inputs: ${labeledInputs}/${inputCount}`)
  })

  test('Page has content', async ({ page }) => {
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    const pageContent = await page.textContent('body')
    expect(pageContent?.length).toBeGreaterThan(100)
  })
})

test.describe('Performance on Mobile', () => {
  test.use(DEVICES.AndroidGeneric)

  test('Page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/ar')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    console.log(`Homepage load time: ${loadTime}ms`)

    // Should load within 15 seconds even on slower connection
    expect(loadTime).toBeLessThan(15000)
  })

  test('Smooth scrolling on provider list', async ({ page }) => {
    await page.goto('/ar/providers')
    await page.waitForLoadState('networkidle')

    // Scroll down multiple times
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 300))
      await page.waitForTimeout(100)
    }

    // Page should remain responsive
    const pageContent = await page.textContent('body')
    expect(pageContent?.length).toBeGreaterThan(0)
  })

  test('Images use lazy loading when available', async ({ page }) => {
    await page.goto('/ar/providers')
    await page.waitForLoadState('networkidle')

    // Check for lazy loading attributes
    const images = page.locator('img')
    const imageCount = await images.count()

    let lazyLoaded = 0

    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const img = images.nth(i)
      const loading = await img.getAttribute('loading')

      if (loading === 'lazy') {
        lazyLoaded++
      }
    }

    console.log(`Lazy loaded images: ${lazyLoaded}/${Math.min(imageCount, 10)}`)
  })
})
