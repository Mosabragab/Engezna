import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Testing Configuration
 * Store-Ready Configuration for App Store & Google Play
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Global test timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Reporter to use
  reporter: [
    ['html', { open: 'never', outputFolder: 'e2e/reports' }],
    ['list'],
    ['json', { outputFile: 'e2e/reports/results.json' }],
  ],

  // Output directory for screenshots, videos, traces
  outputDir: 'e2e/test-results',

  // Shared settings for all projects
  use: {
    // Base URL for the app
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Default locale for testing (Arabic)
    locale: 'ar-EG',

    // Timezone
    timezoneId: 'Africa/Cairo',

    // Action timeout
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers and devices
  projects: [
    // ========== iOS Devices ==========
    // iPhone 15 Pro Max (Latest iOS)
    {
      name: 'iPhone 15 Pro Max',
      use: {
        viewport: { width: 430, height: 932 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },

    // iPhone 15
    {
      name: 'iPhone 15',
      use: {
        viewport: { width: 393, height: 852 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },

    // iPhone 13 (Fallback)
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },

    // ========== Android Devices ==========
    // Samsung Galaxy S23 (Generic Android)
    {
      name: 'Android Generic',
      use: {
        viewport: { width: 412, height: 915 },
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
      },
    },

    // Pixel 5 (Fallback)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    // Small Android (Budget devices)
    {
      name: 'Android Small',
      use: {
        viewport: { width: 360, height: 740 },
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
      },
    },

    // ========== Desktop ==========
    // Desktop Chrome
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
