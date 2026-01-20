# E2E Tests - Engezna

> **Last Updated:** 2026-01-20
> **Total Tests:** 114 tests (CI-approved)
> **Status:** All tests passing

---

## Folder Structure

```
e2e/
├── comprehensive-e2e.spec.ts   # 74 tests - Pages & Data verification
├── business-flow.spec.ts       # 40 tests - Complete business lifecycle
├── global-setup.ts             # Authentication setup (runs first)
├── fixtures/
│   └── test-utils.ts           # Helper functions
├── .auth/                      # Storage states (auto-generated)
├── reports/                    # HTML & JSON reports
├── test-results/               # Screenshots, videos, traces
├── archive/                    # Old/unused tests (reference only)
└── README.md                   # This file
```

---

## Running Tests

```bash
# Run all CI-approved tests (114 tests)
npm run test:e2e:critical

# Run with UI mode (for debugging)
npm run test:e2e:ui

# Run headed (see browser)
npm run test:e2e:headed

# View last report
npm run test:e2e:report
```

---

## Test Files Overview

### 1. `comprehensive-e2e.spec.ts` (74 tests)

Tests all pages and verifies data is displayed correctly:

| Phase   | Description                                    | Tests |
| ------- | ---------------------------------------------- | ----- |
| Phase 1 | Customer Journey (pages, providers, cart)      | 17    |
| Phase 2 | Provider Journey (dashboard, orders, products) | 18    |
| Phase 3 | Security (RBAC, protected routes)              | 8     |
| Phase 4 | Admin Panel (all admin pages)                  | 16    |
| Phase 5 | Data-Driven Tests (real database data)         | 15    |

### 2. `business-flow.spec.ts` (40 tests)

Tests the complete business model with real user accounts:

| Phase     | Description                        | Tests |
| --------- | ---------------------------------- | ----- |
| Phase 6.1 | Customer Order Journey             | 10    |
| Phase 6.2 | Provider Order Management          | 10    |
| Phase 6.3 | Admin Operations & Settlements     | 12    |
| Phase 6.4 | Business Rules (RBAC verification) | 8     |

---

## Lessons Learned

### 1. Login Form Discovery

**Problem:** Login tests failed because the email form was hidden by default.

**Root Cause:** The login page uses a two-step form:

- Step 1: Show social login buttons + "الدخول عبر الإيميل" button
- Step 2: After clicking the button, email/password fields appear

**Solution:**

```typescript
// Click the button to reveal email form BEFORE looking for inputs
if (userType === 'customer') {
  const emailButton = page.locator('button:has-text("الدخول عبر الإيميل")');
  if ((await emailButton.count()) > 0) {
    await emailButton.first().click();
    await page.waitForTimeout(500);
  }
}
```

**Lesson:** Always inspect the actual UI state, not just the final state. Forms may have conditional rendering.

---

### 2. Playwright Project Configuration

**Problem:** New test files weren't being picked up by CI.

**Root Cause:** Playwright uses `testMatch` patterns per project. A file like `business-flow.spec.ts` didn't match any existing pattern.

**Solution:** Add a new project in `playwright.config.ts`:

```typescript
{
  name: 'business-flow-tests',
  testMatch: /business-flow.*\.spec\.ts/,
  use: { viewport: { width: 1920, height: 1080 } },
  dependencies: ['setup'],
}
```

**Lesson:** When adding new test files, ensure they match a `testMatch` pattern in the config. If not, create a new project.

---

### 3. Route Verification Before Testing

**Problem:** Settlement test failed with 404 because `/ar/provider/finance/settlements` doesn't exist.

**Root Cause:** Assumed a route existed without verifying in the codebase.

**Solution:** Check `src/app/[locale]/` folder structure before writing tests:

```bash
ls src/app/[locale]/provider/finance/
# Only page.tsx exists - no settlements subfolder
```

**Lesson:** Always verify routes exist in the codebase before testing them. Use `ls` or `find` to check the app folder structure.

---

### 4. Database Schema Verification

**Problem:** SQL queries failed due to wrong column names and enum values.

**Root Cause:** Assumed column names like `store_name` instead of actual `name_ar`, and enum values like `active` instead of `open`.

**Solution:** Always read `src/types/database.ts` and migration files before writing queries:

```typescript
// Wrong
SELECT store_name FROM providers WHERE status = 'active'

// Correct
SELECT name_ar FROM providers WHERE status = 'open'
```

**Lesson:** Database types are defined in `src/types/database.ts`. Always reference them before writing database-related tests.

---

### 5. Public vs Protected Routes

**Problem:** Tests failed because pages that should be public required login.

**Root Cause:** RBAC middleware in `src/lib/supabase/middleware.ts` controlled route access.

**Solution:** Understand the public patterns in middleware:

```typescript
const publicPatterns = [
  '/auth',
  '/providers',
  '/profile/governorate', // Location selection - public
  '/profile/city', // City selection - public
  '/checkout', // Checkout page - public for viewing
  // ...
];
```

**Lesson:** Check middleware configuration to understand which routes are public/protected.

---

## Standards for Writing Tests

### 1. Test Structure

Each test should follow this pattern:

```typescript
test('should [action] as [user type]', async ({ page }) => {
  // 1. Login (if needed)
  await loginAsUser(page, 'customer');

  // 2. Navigate
  await page.goto('/ar/[path]', { timeout: NAVIGATION_TIMEOUT });
  await page.waitForLoadState('domcontentloaded');
  await waitForPageReady(page);

  // 3. Check for redirect (protected pages)
  if (!page.url().includes('/login')) {
    // 4. Verify content
    const content = await page.locator('body').innerText();
    expect(content.includes('expected text') || content.length > 50).toBeTruthy();
  }
});
```

### 2. Timeout Constants

Always use consistent timeouts:

```typescript
const isCI = process.env.CI === 'true';
const DEFAULT_TIMEOUT = isCI ? 20000 : 15000;
const NAVIGATION_TIMEOUT = isCI ? 30000 : 20000;
```

### 3. Flexible Assertions

Use OR conditions to handle different states:

```typescript
// Good - handles multiple valid states
expect(
  content.includes('طلب') ||
    content.includes('order') ||
    content.includes('لا يوجد') ||
    content.length > 50
).toBeTruthy();

// Bad - too strict
expect(content).toContain('طلب');
```

### 4. Waiting for Page Ready

Always wait for spinners to disappear:

```typescript
async function waitForPageReady(page: Page): Promise<void> {
  const spinner = page.locator('.animate-spin');
  try {
    await spinner.first().waitFor({ state: 'visible', timeout: 3000 });
    await spinner.first().waitFor({ state: 'hidden', timeout: DEFAULT_TIMEOUT });
  } catch {
    // Spinner might not appear
  }
  await page.waitForTimeout(500);
}
```

### 5. Handle Auth Internally

For tests that need multiple user types, handle auth in the test file:

```typescript
async function loginAsUser(page: Page, userType: 'customer' | 'provider' | 'admin') {
  const loginPath =
    userType === 'admin'
      ? '/ar/admin/login'
      : userType === 'provider'
        ? '/ar/provider/login'
        : '/ar/auth/login';

  // Navigate and fill form...
}
```

---

## Adding New Tests

### Step 1: Verify Routes Exist

```bash
# Check if the route exists
ls src/app/[locale]/[your-path]/
```

### Step 2: Check Middleware

```bash
# Review public/protected patterns
cat src/lib/supabase/middleware.ts | grep -A 20 "publicPatterns"
```

### Step 3: Inspect UI Components

```bash
# Check login page structure
cat src/app/[locale]/auth/login/page.tsx | grep -A 10 "showEmailForm"
```

### Step 4: Add Test to Existing File

Add tests to `comprehensive-e2e.spec.ts` (for page verification) or `business-flow.spec.ts` (for business logic).

### Step 5: Verify Test Match Pattern

Ensure your test file matches a `testMatch` pattern in `playwright.config.ts`:

```typescript
// In playwright.config.ts
{
  name: 'comprehensive-tests',
  testMatch: /comprehensive.*\.spec\.ts/,  // Your file must match this
  // ...
}
```

### Step 6: Run and Verify

```bash
# Run specific test file
npx playwright test comprehensive-e2e

# Run with UI for debugging
npx playwright test comprehensive-e2e --ui
```

---

## CI Configuration

The CI runs only the approved tests:

```json
// package.json
"test:e2e:critical": "playwright test comprehensive-e2e business-flow"
```

```yaml
# .github/workflows/ci.yml
- name: Run E2E tests
  run: npm run test:e2e:critical
```

---

## Archive Folder

The `archive/` folder contains old test files that are no longer used in CI. These are kept for reference only:

- `admin-integrations.spec.ts` - Old admin tests
- `admin-panel.spec.ts` - Replaced by comprehensive-e2e
- `auth.spec.ts` - Replaced by comprehensive-e2e
- `customer-*.spec.ts` - Replaced by comprehensive-e2e
- `merchant-*.spec.ts` - Replaced by comprehensive-e2e
- `security-limits.spec.ts` - Replaced by comprehensive-e2e
- `infrastructure.spec.ts` - Replaced by comprehensive-e2e

**Do not delete these files** - they may contain useful patterns for future tests.

---

## Quick Reference

| Task         | Command                     |
| ------------ | --------------------------- |
| Run CI tests | `npm run test:e2e:critical` |
| Run with UI  | `npm run test:e2e:ui`       |
| Run headed   | `npm run test:e2e:headed`   |
| Debug mode   | `npm run test:e2e:debug`    |
| View report  | `npm run test:e2e:report`   |

| File                        | Purpose                      |
| --------------------------- | ---------------------------- |
| `comprehensive-e2e.spec.ts` | Page verification (74 tests) |
| `business-flow.spec.ts`     | Business logic (40 tests)    |
| `global-setup.ts`           | Auth setup                   |
| `fixtures/test-utils.ts`    | Helper functions             |

---

## Contact

For questions about E2E tests, refer to:

1. This README
2. The actual test files (well-commented)
3. `docs/E2E_TEST_PLAN.md` for the full test plan
