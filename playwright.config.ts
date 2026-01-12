import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Playwright E2E Testing Configuration
 * Store-Ready Configuration for App Store & Google Play
 * @see https://playwright.dev/docs/test-configuration
 */

// Storage state paths for authenticated sessions
const STORAGE_STATE_DIR = path.join(__dirname, 'e2e', '.auth')
const ADMIN_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'admin.json')
const PROVIDER_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'provider.json')
const CUSTOMER_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'customer.json')

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Global setup - authenticate users once before all tests
  globalSetup: './e2e/global-setup.ts',

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
    // ========== Setup Project (runs first) ==========
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    // ========== Authenticated Projects ==========
    // Admin tests - use admin storage state
    {
      name: 'admin-tests',
      testMatch: /admin.*\.spec\.ts/,
      use: {
        storageState: ADMIN_STORAGE_STATE,
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },

    // Provider tests - use provider storage state
    {
      name: 'provider-tests',
      testMatch: /provider.*\.spec\.ts/,
      use: {
        storageState: PROVIDER_STORAGE_STATE,
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },

    // Finance/Settlement tests - use admin storage state
    {
      name: 'finance-tests',
      testMatch: /finance.*\.spec\.ts/,
      use: {
        storageState: ADMIN_STORAGE_STATE,
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },

    // Customer tests - use customer storage state
    {
      name: 'customer-tests',
      testMatch: /(cart|checkout|customer|refunds|complaints|notifications).*\.spec\.ts/,
      use: {
        storageState: CUSTOMER_STORAGE_STATE,
        viewport: { width: 412, height: 915 },
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['setup'],
    },

    // PWA and Performance tests - no auth needed
    {
      name: 'pwa-performance-tests',
      testMatch: /(pwa|performance).*\.spec\.ts/,
      use: {
        viewport: { width: 412, height: 915 },
        isMobile: true,
        hasTouch: true,
      },
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
