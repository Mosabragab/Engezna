import { chromium, FullConfig } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

/**
 * Global Setup for Playwright E2E Tests
 *
 * This script authenticates users via Supabase API (not UI) and saves
 * the session state for use in tests. This is more reliable than
 * UI-based authentication.
 */

// Storage state file paths
export const STORAGE_STATE_DIR = path.join(__dirname, '.auth');
export const ADMIN_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'admin.json');
export const PROVIDER_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'provider.json');
export const CUSTOMER_STORAGE_STATE = path.join(STORAGE_STATE_DIR, 'customer.json');

// Test users credentials
const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'Test123!',
  },
  provider: {
    email: process.env.TEST_PROVIDER_EMAIL || 'provider@test.com',
    password: process.env.TEST_PROVIDER_PASSWORD || 'Test123!',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.com',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'Test123!',
  },
};

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  // Create auth directory if it doesn't exist
  if (!fs.existsSync(STORAGE_STATE_DIR)) {
    fs.mkdirSync(STORAGE_STATE_DIR, { recursive: true });
  }

  console.log('🔐 Starting global authentication setup...');
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Supabase URL: ${SUPABASE_URL ? '✓ configured' : '✗ missing'}`);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      '⚠️  Supabase credentials not configured. Skipping API auth, falling back to UI auth.'
    );
    return fallbackUIAuth(config);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Authenticate all users via API
    await authenticateViaAPI(supabase, baseURL, 'admin', TEST_USERS.admin, ADMIN_STORAGE_STATE);
    await authenticateViaAPI(
      supabase,
      baseURL,
      'provider',
      TEST_USERS.provider,
      PROVIDER_STORAGE_STATE
    );
    await authenticateViaAPI(
      supabase,
      baseURL,
      'customer',
      TEST_USERS.customer,
      CUSTOMER_STORAGE_STATE
    );

    console.log('✅ Global authentication setup complete!');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    // Create empty storage states to prevent file not found errors
    await createEmptyStorageStates();
  }
}

async function authenticateViaAPI(
  supabase: SupabaseClient,
  baseURL: string,
  role: string,
  user: { email: string; password: string },
  storageStatePath: string
) {
  console.log(`[AUTH] Starting ${role} authentication...`);
  console.log(`[AUTH] ${role} email: ${user.email}`);

  try {
    // Sign in via Supabase API
    console.log(`[AUTH] ${role} calling signInWithPassword...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (error) {
      console.log(`[AUTH] ${role} FAILED: ${error.message}`);
      console.log(`[AUTH] ${role} error code: ${error.status || 'unknown'}`);
      await createEmptyStorageState(storageStatePath);
      return;
    }

    if (!data.session) {
      console.log(`[AUTH] ${role} FAILED: no session returned`);
      await createEmptyStorageState(storageStatePath);
      return;
    }

    console.log(`[AUTH] ${role} SUCCESS - got session`);
    console.log(`[AUTH] ${role} user id: ${data.user?.id?.substring(0, 8)}...`);

    // Now open browser and set the session cookies
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the app to establish cookies domain
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');

    // Set Supabase auth tokens in localStorage
    await page.evaluate(
      ({ accessToken, refreshToken, expiresAt, user }) => {
        // Supabase stores auth in localStorage with a specific key format
        const supabaseKey =
          Object.keys(localStorage).find(
            (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
          ) || `sb-${window.location.hostname.split('.')[0]}-auth-token`;

        const authData = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          expires_in: 3600,
          token_type: 'bearer',
          user: user,
        };

        localStorage.setItem(supabaseKey, JSON.stringify(authData));

        // Set guest location to prevent redirect to welcome page
        // Using Beni Suef as the default test location (company HQ)
        const guestLocation = {
          governorateId: 'test-beni-suef-gov',
          governorateName: { ar: 'بني سويف', en: 'Beni Suef' },
          cityId: 'test-beni-suef-city',
          cityName: { ar: 'بني سويف', en: 'Beni Suef' },
        };
        localStorage.setItem('engezna_guest_location', JSON.stringify(guestLocation));
      },
      {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        user: data.user,
      }
    );

    // Also set the auth cookie if needed
    const domain = new URL(baseURL).hostname;
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: data.session.access_token,
        domain: domain,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'sb-refresh-token',
        value: data.session.refresh_token,
        domain: domain,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // Save storage state
    console.log(`[AUTH] ${role} saving storage state to: ${storageStatePath}`);
    await context.storageState({ path: storageStatePath });
    console.log(`[AUTH] ${role} storage state SAVED`);

    await browser.close();

    // Sign out from the API client to avoid session conflicts
    await supabase.auth.signOut();
    console.log(`[AUTH] ${role} completed successfully`);
  } catch (error) {
    console.log(`[AUTH] ${role} EXCEPTION:`);
    console.log(`[AUTH] ${role} error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.log(`[AUTH] ${role} stack: ${error.stack.split('\n').slice(0, 3).join(' | ')}`);
    }
    await createEmptyStorageState(storageStatePath);
  }
}

async function createEmptyStorageState(filePath: string) {
  const emptyState = {
    cookies: [],
    origins: [],
  };
  fs.writeFileSync(filePath, JSON.stringify(emptyState, null, 2));
}

async function createEmptyStorageStates() {
  await createEmptyStorageState(ADMIN_STORAGE_STATE);
  await createEmptyStorageState(PROVIDER_STORAGE_STATE);
  await createEmptyStorageState(CUSTOMER_STORAGE_STATE);
}

// Fallback to UI-based authentication if Supabase API is not available
async function fallbackUIAuth(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  const browser = await chromium.launch();

  try {
    // Admin auth via UI
    await authenticateViaUI(
      browser,
      baseURL,
      'admin',
      {
        ...TEST_USERS.admin,
        loginUrl: '/ar/admin/login',
      },
      ADMIN_STORAGE_STATE
    );

    // Provider auth via UI
    await authenticateViaUI(
      browser,
      baseURL,
      'provider',
      {
        ...TEST_USERS.provider,
        loginUrl: '/ar/provider/login',
      },
      PROVIDER_STORAGE_STATE
    );

    // Customer auth via UI (requires clicking email button first)
    await authenticateCustomerViaUI(browser, baseURL, TEST_USERS.customer, CUSTOMER_STORAGE_STATE);
  } catch (error) {
    console.error('❌ UI auth fallback failed:', error);
    await createEmptyStorageStates();
  } finally {
    await browser.close();
  }
}

async function authenticateViaUI(
  browser: import('@playwright/test').Browser,
  baseURL: string,
  role: string,
  user: { email: string; password: string; loginUrl: string },
  storageStatePath: string
) {
  console.log(`   Authenticating ${role} via UI...`);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`   → Navigating to ${baseURL}${user.loginUrl}`);
    await page.goto(`${baseURL}${user.loginUrl}`);
    await page.waitForLoadState('networkidle');
    console.log(`   → Page loaded, waiting for form...`);

    // Wait for the loading spinner to disappear (if present)
    // The login pages show a spinner while checking auth
    const spinner = page.locator('.animate-spin');
    try {
      // Wait up to 10 seconds for spinner to disappear
      await spinner.waitFor({ state: 'hidden', timeout: 10000 });
      console.log(`   → Spinner disappeared`);
      // Wait for React to re-render the form after spinner disappears
      await page.waitForTimeout(2000);
    } catch {
      // Spinner might not be present, continue
      console.log(`   → No spinner found or already hidden`);
    }

    // Take screenshot for debugging
    await page.screenshot({ path: `e2e/.auth/${role}-debug.png` });

    // Debug: Log page content info
    const pageHTML = await page.content();
    const hasEmailInput = pageHTML.includes('type="email"');
    const hasPasswordInput = pageHTML.includes('type="password"');
    const hasForm = pageHTML.includes('<form');
    console.log(
      `   → Page has form: ${hasForm}, email: ${hasEmailInput}, password: ${hasPasswordInput}`
    );

    // Save HTML for debugging
    fs.writeFileSync(`e2e/.auth/${role}-debug.html`, pageHTML);

    // Wait for form with retry mechanism
    const emailInput = page.locator('input[type="email"]');
    let formFound = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await emailInput.waitFor({ state: 'visible', timeout: 8000 });
        formFound = true;
        console.log(`   → Email input found on attempt ${attempt + 1}`);
        break;
      } catch {
        console.log(`   → Email input not found on attempt ${attempt + 1}, retrying...`);
        // Take screenshot for debugging
        await page.screenshot({ path: `e2e/.auth/${role}-debug-attempt${attempt + 1}.png` });
        // Reload page and try again
        await page.reload();
        await page.waitForLoadState('networkidle');
        // Wait a bit for React to hydrate
        await page.waitForTimeout(2000);
      }
    }

    if (!formFound) {
      throw new Error(`Email input not found after 3 attempts`);
    }

    await emailInput.fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Set guest location to prevent redirect to welcome page
    await page.evaluate(() => {
      const guestLocation = {
        governorateId: 'test-governorate-id',
        governorateName: { ar: 'القاهرة', en: 'Cairo' },
        cityId: 'test-city-id',
        cityName: { ar: 'مدينة نصر', en: 'Nasr City' },
      };
      localStorage.setItem('engezna_guest_location', JSON.stringify(guestLocation));
    });

    await context.storageState({ path: storageStatePath });
    console.log(`   ✓ ${role} UI auth complete`);
  } catch (error) {
    console.log(`   ⚠️  ${role} UI auth error:`, error instanceof Error ? error.message : error);
    // Take final screenshot for debugging
    await page.screenshot({ path: `e2e/.auth/${role}-debug-error.png` });
    await createEmptyStorageState(storageStatePath);
  } finally {
    await context.close();
  }
}

async function authenticateCustomerViaUI(
  browser: import('@playwright/test').Browser,
  baseURL: string,
  user: { email: string; password: string },
  storageStatePath: string
) {
  console.log('   Authenticating customer via UI...');
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/ar/auth/login`);
    await page.waitForLoadState('networkidle');

    // Click "Continue with Email" button first
    const emailButton = page.locator(
      'button:has-text("الدخول عبر الإيميل"), button:has-text("Continue with Email")'
    );
    await emailButton.waitFor({ state: 'visible', timeout: 15000 });
    await emailButton.click();

    // Wait for form
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    await emailInput.fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Set guest location to prevent redirect to welcome page
    await page.evaluate(() => {
      const guestLocation = {
        governorateId: 'test-governorate-id',
        governorateName: { ar: 'القاهرة', en: 'Cairo' },
        cityId: 'test-city-id',
        cityName: { ar: 'مدينة نصر', en: 'Nasr City' },
      };
      localStorage.setItem('engezna_guest_location', JSON.stringify(guestLocation));
    });

    await context.storageState({ path: storageStatePath });
    console.log('   ✓ Customer UI auth complete');
  } catch (error) {
    console.log('   ⚠️  Customer UI auth error:', error instanceof Error ? error.message : error);
    await createEmptyStorageState(storageStatePath);
  } finally {
    await context.close();
  }
}

export default globalSetup;
