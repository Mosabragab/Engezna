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

// Default location data (fallback if DB fetch fails)
interface LocationData {
  governorateId: string;
  governorateName: { ar: string; en: string };
  cityId: string;
  cityName: { ar: string; en: string };
}

const DEFAULT_LOCATION: LocationData = {
  governorateId: '11111111-1111-1111-1111-111111111111',
  governorateName: { ar: 'بني سويف', en: 'Beni Suef' },
  cityId: '21111111-1111-1111-1111-111111111111',
  cityName: { ar: 'بني سويف', en: 'Beni Suef City' },
};

// Global location variable (populated from DB)
let testLocation: LocationData = DEFAULT_LOCATION;

/**
 * Fetch Beni Suef governorate and city IDs from the database
 * This ensures tests use actual IDs matching the test providers
 */
async function fetchBeniSuefLocation(supabase: SupabaseClient): Promise<LocationData> {
  try {
    console.log('   Fetching Beni Suef location from database...');

    // Fetch Beni Suef governorate
    const { data: govData, error: govError } = await supabase
      .from('governorates')
      .select('id, name_ar, name_en')
      .or('name_en.eq.Beni Suef,name_ar.eq.بني سويف')
      .limit(1)
      .single();

    if (govError || !govData) {
      console.log('   ⚠️  Could not fetch Beni Suef governorate:', govError?.message);
      return DEFAULT_LOCATION;
    }

    console.log(`   ✓ Found governorate: ${govData.name_en} (${govData.id})`);

    // Fetch Beni Suef city within the governorate
    const { data: cityData, error: cityError } = await supabase
      .from('cities')
      .select('id, name_ar, name_en')
      .eq('governorate_id', govData.id)
      .or('name_en.eq.Beni Suef,name_ar.eq.بني سويف')
      .limit(1)
      .single();

    if (cityError || !cityData) {
      console.log('   ⚠️  Could not fetch Beni Suef city:', cityError?.message);
      // Return governorate with fallback city
      return {
        governorateId: govData.id,
        governorateName: { ar: govData.name_ar, en: govData.name_en },
        cityId: 'test-beni-suef-city',
        cityName: { ar: 'بني سويف', en: 'Beni Suef' },
      };
    }

    console.log(`   ✓ Found city: ${cityData.name_en} (${cityData.id})`);

    return {
      governorateId: govData.id,
      governorateName: { ar: govData.name_ar, en: govData.name_en },
      cityId: cityData.id,
      cityName: { ar: cityData.name_ar, en: cityData.name_en },
    };
  } catch (error) {
    console.log('   ⚠️  Error fetching location:', error instanceof Error ? error.message : error);
    return DEFAULT_LOCATION;
  }
}

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

  // Fetch the actual Beni Suef location IDs from the database
  testLocation = await fetchBeniSuefLocation(supabase);

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
  console.log(`   Authenticating ${role} via API...`);

  try {
    // Sign in via Supabase API
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (error) {
      console.log(`   ⚠️  ${role} API auth failed: ${error.message}`);
      await createEmptyStorageState(storageStatePath);
      return;
    }

    if (!data.session) {
      console.log(`   ⚠️  ${role} no session returned`);
      await createEmptyStorageState(storageStatePath);
      return;
    }

    console.log(`   ✓ ${role} authenticated via API`);

    // Now open browser and set the session cookies
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the app to establish cookies domain
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');

    // Extract project reference from Supabase URL for cookie name
    const supabaseProjectRef =
      SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase/)?.[1] || 'localhost';
    const cookieName = `sb-${supabaseProjectRef}-auth-token`;

    // Prepare the full session data for the cookie (same format as localStorage)
    const sessionData = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: 3600,
      token_type: 'bearer',
      user: data.user,
    };

    // Supabase SSR expects cookies in format: "base64-" + base64url encoded JSON
    const jsonString = JSON.stringify(sessionData);
    const base64urlEncoded = Buffer.from(jsonString).toString('base64url');
    const cookieValue = `base64-${base64urlEncoded}`;

    // Set Supabase auth tokens in localStorage
    await page.evaluate(
      ({ cookieName, sessionData, location }) => {
        // Set localStorage (for client-side Supabase)
        localStorage.setItem(cookieName, JSON.stringify(sessionData));

        // Set guest location to prevent redirect to welcome page
        // Using actual Beni Suef IDs from database (where test providers exist)
        localStorage.setItem('engezna_guest_location', JSON.stringify(location));
      },
      {
        cookieName,
        sessionData,
        location: testLocation,
      }
    );

    // Set the auth cookie in the correct format for Supabase SSR
    // Handle chunking if cookie value is too large (max ~4096 bytes per cookie)
    const domain = new URL(baseURL).hostname;
    const MAX_CHUNK_SIZE = 3180; // Safe size accounting for cookie overhead

    const cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'Lax' | 'Strict' | 'None';
    }> = [];

    if (cookieValue.length <= MAX_CHUNK_SIZE) {
      // Single cookie - no chunking needed
      cookies.push({
        name: cookieName,
        value: cookieValue,
        domain: domain,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      });
    } else {
      // Chunk the cookie value
      let remaining = cookieValue;
      let chunkIndex = 0;
      while (remaining.length > 0) {
        const chunk = remaining.slice(0, MAX_CHUNK_SIZE);
        remaining = remaining.slice(MAX_CHUNK_SIZE);
        cookies.push({
          name: `${cookieName}.${chunkIndex}`,
          value: chunk,
          domain: domain,
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        });
        chunkIndex++;
      }
      console.log(`   → Session split into ${chunkIndex} cookie chunks`);
    }

    await context.addCookies(cookies);

    // Save storage state
    await context.storageState({ path: storageStatePath });
    console.log(`   ✓ ${role} storage state saved`);

    await browser.close();

    // Sign out from the API client to avoid session conflicts
    await supabase.auth.signOut();
  } catch (error) {
    console.log(
      `   ⚠️  ${role} authentication error:`,
      error instanceof Error ? error.message : error
    );
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
    // Using actual Beni Suef IDs (where test providers exist)
    await page.evaluate((location) => {
      localStorage.setItem('engezna_guest_location', JSON.stringify(location));
    }, testLocation);

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
    // Using actual Beni Suef IDs (where test providers exist)
    await page.evaluate((location) => {
      localStorage.setItem('engezna_guest_location', JSON.stringify(location));
    }, testLocation);

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
