import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright E2E Testing Configuration
 * Simplified for CI-approved tests only
 *
 * Active Test Files:
 * - comprehensive-e2e.spec.ts (74 tests)
 * - business-flow.spec.ts (40 tests)
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// Storage state paths for authenticated sessions
const STORAGE_STATE_DIR = path.join(__dirname, 'e2e', '.auth');
const CUSTOMER_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'customer.json');

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
    // Base URL
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

  // ============================================================================
  // PROJECTS - Only CI-approved tests
  // ============================================================================
  projects: [
    // ========== Setup Project (runs first) ==========
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    // ========== Main Test Projects ==========

    // Comprehensive E2E tests - all pages and data verification (74 tests)
    {
      name: 'comprehensive-tests',
      testMatch: /comprehensive.*\.spec\.ts/,
      use: {
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },

    // Business Flow tests - complete order lifecycle (40 tests)
    {
      name: 'business-flow-tests',
      testMatch: /business-flow.*\.spec\.ts/,
      use: {
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },

    // ========== Device Testing (optional - run manually) ==========
    // Run with: npx playwright test --project="device-*"

    // iPhone 14 Pro Max
    {
      name: 'device-iphone14',
      testMatch: /comprehensive.*\.spec\.ts/,
      use: {
        ...devices['iPhone 14 Pro Max'],
        storageState: CUSTOMER_STORAGE_STATE,
      },
      dependencies: ['setup'],
    },

    // Samsung Galaxy (Android)
    {
      name: 'device-samsung',
      testMatch: /comprehensive.*\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        storageState: CUSTOMER_STORAGE_STATE,
      },
      dependencies: ['setup'],
    },

    // iPad Pro 11
    {
      name: 'device-ipad',
      testMatch: /comprehensive.*\.spec\.ts/,
      use: {
        ...devices['iPad Pro 11'],
        storageState: CUSTOMER_STORAGE_STATE,
      },
      dependencies: ['setup'],
    },

    // Desktop Chrome
    {
      name: 'device-chrome',
      testMatch: /comprehensive.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: CUSTOMER_STORAGE_STATE,
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['setup'],
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: process.env.CI ? 'npm start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
});
