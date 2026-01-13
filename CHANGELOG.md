# Changelog - Engezna Platform

All notable changes to this project are documented in this file.

---

## [Session 27] - 2026-01-13

### E2E Testing Suite - Store Readiness (From Session 26.5)

#### Comprehensive E2E Test Suite Created
A complete E2E testing suite was created with **129+ tests** covering all critical paths for App Store and Google Play readiness.

| Category | Tests | File |
|----------|-------|------|
| Customer Journey (Happy Path) | 24 tests | `critical-customer-journey.spec.ts` |
| Merchant Operations | 32 tests | `merchant-operations.spec.ts` |
| Stability & Edge Cases | 38 tests | `stability-edge-cases.spec.ts` |
| Mobile Responsiveness | 35 tests | `mobile-responsiveness.spec.ts` |
| Cart & Checkout | - | `cart-checkout.spec.ts` |
| Admin Dashboard | - | `admin-dashboard.spec.ts` |
| Provider Dashboard | - | `provider-dashboard.spec.ts` |
| Finance & Settlements | - | `finance-settlements.spec.ts` |
| Notifications & Realtime | - | `notifications-realtime.spec.ts` |
| PWA & Offline | - | `pwa-offline.spec.ts` |
| Complaints System | - | `complaints-system.spec.ts` |
| Refunds System | - | `refunds-system.spec.ts` |
| Performance Audit | - | `performance-audit.spec.ts` |
| **Total** | **129+ tests** | |

#### Test Coverage

**Customer Journey Tests:**
- ✅ Login → Restaurant Selection → Add Items → Checkout
- ✅ Custom Order (Text/Image/Voice) → Broadcast → Pricing
- ✅ Payment Options (COD/Online)
- ✅ Order Tracking

**Merchant Operations Tests:**
- ✅ New order notifications with distinct sounds
- ✅ Pricing system (PricingNotepad)
- ✅ Order status management (Pending → Delivered)
- ✅ Financial dashboard & settlements

**Stability Tests:**
- ✅ Race condition prevention
- ✅ Session management
- ✅ Pricing expiration handling
- ✅ Realtime notifications
- ✅ Network error handling
- ✅ Data consistency

**Mobile Responsiveness Tests:**
- ✅ iPhone 15 Pro Max, iPhone 15, iPhone 13
- ✅ Samsung S23, Pixel 5, Android Small
- ✅ Touch Targets (48x48px minimum)
- ✅ RTL & Arabic language support

#### iOS & Accessibility Fixes
- **Touch targets** - All interactive elements now 48x48px minimum
- **iOS UX** - Fixed touch responsiveness on iPhone devices
- **Sidebar fix** - Fixed sidebar not showing after login

#### Performance Audit
- Lighthouse performance tests added
- Core Web Vitals monitoring (FCP, LCP, TTI, CLS, TBT)
- Store-ready performance validation

#### Files Created/Modified
```
e2e/
├── critical-customer-journey.spec.ts   # Customer happy path
├── merchant-operations.spec.ts         # Merchant operations
├── stability-edge-cases.spec.ts        # Edge cases
├── mobile-responsiveness.spec.ts       # Mobile tests
├── cart-checkout.spec.ts               # Cart & Checkout
├── admin-dashboard.spec.ts             # Admin tests
├── provider-dashboard.spec.ts          # Provider tests
├── finance-settlements.spec.ts         # Finance tests
├── notifications-realtime.spec.ts      # Notifications
├── pwa-offline.spec.ts                 # PWA tests
├── performance-audit.spec.ts           # Performance
├── complaints-system.spec.ts           # Complaints
├── refunds-system.spec.ts              # Refunds
├── global-setup.ts                     # Auth setup
├── fixtures/test-utils.ts              # Test utilities
├── E2E_TEST_REPORT.md                  # Full report
└── PERFORMANCE_AUDIT_GUIDE.md          # Performance guide
```

#### NPM Scripts Added
```bash
npm run test:e2e              # Run all tests
npm run test:e2e:critical     # Critical paths only
npm run test:e2e:stability    # Stability tests
npm run test:e2e:mobile       # Mobile tests
npm run test:e2e:iphone       # iPhone only
npm run test:e2e:android      # Android only
npm run test:e2e:store-ready  # All store-ready tests
npm run test:e2e:ui           # With UI
npm run test:e2e:headed       # With visible browser
npm run test:e2e:debug        # Debug mode
npm run test:e2e:report       # Show report
```

### Commits (E2E Session)
```
11ca234 feat: Add App Store metadata and sound debug component
eced25a fix(e2e): Fix remaining failing tests for better resilience
a17879f fix: iOS touch target and mobile UX improvements
af6953e fix(e2e): Make failing tests more resilient
5b07600 fix: sidebar not showing after login
d48e456 fix: iOS touch target compliance and test improvements
b541e2d fix(e2e): Make checkout page test more resilient
d79d1c5 fix(e2e): Make tests more resilient with better error handling
fb1c433 fix(e2e): Add missing test projects to playwright config
6a1db58 feat(e2e): Add smarter login tests and multi-device support
3b37ebe feat: Add global authentication setup for E2E tests
9150ee6 fix: Make all touchable elements at least 48x48px
4d9d94e feat: Add Lighthouse performance audit
d216371 feat: Add comprehensive E2E tests for store readiness
```

---

### Welcome Page Loading Fix

#### Problem
New visitors entering the website were not being redirected to the welcome page (`/ar/welcome`). Instead, they saw a loading spinner on the home page while the system waited for LocationContext to fully load from Supabase.

#### Root Cause
The home page (`/[locale]/page.tsx`) was waiting for:
1. Auth initialization (`isInitializing`)
2. Location data loading from Supabase (`isDataLoaded`)
3. User location loading (`isUserLocationLoading`)

Only after ALL of these completed would it check if the user has a location and redirect to welcome page. This caused delays and sometimes failures.

#### Solution
Added an **early redirect check** that synchronously reads `localStorage` immediately on mount:
- If no guest location is found in `localStorage`, redirect to welcome page immediately
- Don't wait for Supabase data or auth checks
- The welcome page handles logged-in users appropriately

#### Technical Changes
- Added `guestLocationStorage` import to home page
- Added `earlyRedirectDone` state to track if redirect happened
- New `useEffect` that runs first and checks localStorage synchronously
- Modified existing redirect logic to skip if early redirect already happened

#### Files Modified
- `src/app/[locale]/page.tsx` - Fast localStorage check and early redirect

### Commits
```
fe13850 fix: Fast redirect to welcome page for new visitors
```

---

## [Session 26] - 2026-01-11

### Custom Order System (Triple Broadcast) - Comprehensive Review

#### Navigation & UX Fixes
- **Smart back navigation** - Orders from custom orders page now return correctly using `?from=custom` parameter
- **Context-aware back button** - Shows "الطلبات الخاصة" when navigating from custom orders
- **Customer bottom nav badge** - Fixed pending quotes count query (inverted join direction)

#### Database & Notifications
- **Notification data column** - Added JSONB `data` column to notification tables
- **RPC functions** - Created `customer_approve_custom_order` and `customer_reject_custom_order`
- **Check constraint fix** - Added `pricing_in_progress` to status constraint

#### System Architecture Verification
- **Settlement system** - ✅ Safe (only reads `orders` table)
- **Analytics** - ✅ Safe (custom orders counted after approval)
- **Dashboard stats** - ✅ Safe (all queries from `orders` table)
- **Finance** - ✅ Safe (uses `financial_settlement_engine` view)

#### Files Modified
- `src/app/[locale]/provider/orders/[id]/page.tsx` - Smart back navigation
- `src/app/[locale]/provider/orders/custom/page.tsx` - Added `?from=custom` parameter
- `src/app/[locale]/provider/orders/custom/[id]/page.tsx` - Fixed redirect URLs
- `src/components/customer/layout/BottomNavigation.tsx` - Fixed badge query

### Commits
```
cf7324c fix: Smart back navigation for orders from custom orders page
11e1948 fix: Fix custom order back navigation for hybrid providers
4a3c1a6 fix: Fix customer bottom nav badge for pending quotes
```

---

## [Session 25] - 2026-01-10

### Custom Order Pricing System - Major UI Fixes

#### Status Buttons System Rebuild
- **Complete rebuild using inline styles** - Fixed status buttons (متوفر/غير متوفر/بديل) that were turning white when clicked
- **Guaranteed color rendering** - Using direct hex colors (`#10b981` emerald, `#ef4444` red, `#f59e0b` amber) instead of Tailwind classes
- **Hover effects with JavaScript** - `onMouseEnter/onMouseLeave` handlers for reliable hover states

#### Deadline Validation System
- **Prevent late submissions** - Added `isDeadlineExpired` check against `pricing_expires_at`
- **Visual deadline indicator** - Shows red "انتهت المهلة!" warning when deadline passes
- **Double-check in submit** - Prevents submission even if button state is bypassed

#### Dark Mode Removal (Complete)
- **Forced light mode** - Added `color-scheme: light` to globals.css
- **Loading page fix** - Removed dark mode classes from custom order page
- **Substitute dropdown fix** - Removed `dark:bg-slate-800` from SelectTrigger
- **PricingItemRow cleanup** - Removed all dark mode classes

#### UI Improvements
- **Number input spinners removed** - CSS to hide `-webkit-outer-spin-button` and `-moz-appearance: textfield`
- **Carton unit type added** - Added "كرتونة" (Carton) to UNIT_TYPES
- **Duplicate copy prevention** - Copy/transfer button only works once per item using `Set<string>`
- **Fill first empty item** - Copy button fills first empty pricing row instead of adding new
- **Confirmation dialog button** - Fixed send button using inline styles (`#10b981`)
- **Net profit display** - Shows commission rate and net profit for transparency
- **Audio speed controls** - 1x, 1.5x, 2x playback for voice recordings
- **Image zoom controls** - Zoom in/out for customer images

### Files Modified
- `src/components/merchant/pricing/PricingItemRow.tsx` - Status buttons rebuild (lines 333-440)
- `src/components/merchant/pricing/PricingNotepad.tsx` - Deadline validation, dialog button fix
- `src/app/globals.css` - Light mode forcing, spinner removal
- `src/types/custom-order.ts` - Added carton unit type
- `src/app/[locale]/provider/orders/custom/[id]/page.tsx` - Dark mode removal

### Commits
```
befaa88 fix: Rebuild status buttons with inline styles and add deadline validation
c21d4d1 fix: Force status button colors with !important
51b8255 fix: Remove dark mode class from substitute unit dropdown
9f5e5c9 fix: Fix visual bugs in pricing UI - buttons, inputs, and spinners
64acec1 fix: Fix pricing UI issues - light mode, copy order, button colors
d128280 fix: Improve pricing UI with light mode, carton unit, and duplicate prevention
```

---

## [Session 24] - 2026-01-04

### Documentation Cleanup & Organization
- **Archived completed plans** - Moved 10 outdated plan files to `/archive`
- **Reorganized docs folder** - Created `/docs/guides` and `/docs/features` subfolders
- **Created CHANGELOG.md** - Consolidated session history
- **Created ROADMAP.md** - Future tasks and priorities

### Provider Dashboard Fixes
- **Fixed button visibility** - Added `!important` prefix to button colors (`!bg-amber-500`, `!text-white`)
- **Fixed dropdown menu sensitivity** - Changed `mt-2` to `pt-1` for padding bridge

### Provider Settings Updates
- **Removed "Preview Store" button** - Cleaned up dropdown menu
- **Added delete account functionality** - Full account deletion with data cleanup
- **Changed dropdown label** - "حسابي" → "إعدادات المتجر"
- **Removed "حسابي" text** - Next to icon in header

### Files Modified
- `src/app/[locale]/provider/page.tsx` - Button visibility fix
- `src/components/provider/ProviderHeader.tsx` - Dropdown menu improvements
- `src/app/[locale]/provider/settings/page.tsx` - Delete account section
- `src/app/api/auth/delete-account/route.ts` - Provider data cleanup

---

## [Session 23] - 2025-12-31

### Native Google Sign-In Implementation
- **Native Google OAuth** - Shows "engezna.com" instead of Supabase URL in consent screen
- **Custom Arabic Button** - "إستمرار عبر جوجل" matching app design (Talabat-style)
- **Authorization Code Flow** - Secure token exchange via API endpoint
- **GoogleOAuthProvider** - React context wrapper for Google OAuth
- **Token Exchange API** - `/api/auth/google` endpoint for code-to-token exchange
- **Profile Completion Flow** - Redirects new Google users to complete profile
- **Automatic Profile Creation** - Creates profile for new Google users

### Commits
```
62c1f10 style: Match Google button styling with login button
59b1a80 feat: Add custom Google Sign-In button with Arabic text
7acdff2 fix: Remove unsupported locale and width props from GoogleLogin
e69ea47 fix: Use GoogleLogin component with ID token for proper Engezna branding
2896e64 feat: Implement native Google Sign-In to show Engezna instead of Supabase URL
```

---

## [Session 22] - 2025-12-26

### Settlement System Refinements
- **Database as Single Source of Truth** - All financial values from database, no frontend calculations
- **Commission Display Fix** - Fixed 22 vs 17.5 issue after refunds
- **Trigger Conflict Resolution** - Fixed `calculate_order_commission` and `generate_provider_settlement`
- **Admin Settlement Details UI** - Redesigned COD/Online cards to match provider design
- **Provider Finance Settlements Tab** - Updated card design for consistency
- **Grace Period Display** - Shows waiver indicator when commission = 0 but revenue > 0

### Key Principles Established
1. **مصدر الحقيقة الواحد**: Database is the only source for financial calculations
2. **Backend Calculations Only**: Frontend displays values, never calculates them
3. **Commission Formula**: `commission = (subtotal - discount - refund) * rate`

### Commits
```
b9b5493 refactor: Use database values only for settlement COD/Online cards
a95cf3a style: Match admin settlement COD/Online cards with provider finance design
5456bc2 feat: Use database as single source of truth for commission display
2c2cb17 refactor: Use database commission values instead of frontend calculation
```

---

## [Session 21] - 2025-12-23

### Code Polishing - Zero ESLint Errors
- Fixed 78 hoisting errors by converting functions to `useCallback`
- Updated ESLint config to handle false-positive warnings
- Fixed prefer-const, @ts-ignore, require() import errors
- Created `RoleIconComponent` to fix dynamic component creation error
- **Final Result**: 0 errors, 454 warnings

### Build Error Fixes
- Removed duplicate function definitions in 3 admin pages
- Fixed Vercel build failures

### Commits
```
89f3e20 fix: Remove duplicate function definitions causing build errors
e86c6f4 fix(eslint): Achieve zero ESLint errors for code polishing
3e455b0 fix(eslint): Resolve hoisting errors by converting functions to useCallback
```

---

## [Session 20] - 2025-12-22

### Legal Compliance
- **Privacy Policy Page** (`/privacy`) - Bilingual with Charcoal theme header
- **Terms & Conditions Page** (`/terms`) - Tabbed interface (Customer/Provider)
- **Company Information** - سويفكم للتجارة والتصدير (ذ.م.م)
- **Signup Terms Checkbox** - Required agreement with Zod validation

### E2E Testing Setup (Playwright)
- Playwright configuration - Multi-browser (Chrome, Safari, Mobile)
- Customer journey smoke tests
- PWA offline tests
- NPM scripts: `test:e2e`, `test:e2e:ui`, `test:e2e:headed`

### App Badge Integration
- Notification count on app icon
- Customer: Shows unread notification count
- Provider: Shows unread + pending orders + pending refunds

### Commits
```
63f0279 test(e2e): Add Provider and Admin dashboard E2E tests
a47268e feat(pwa): Integrate app badge with notifications
79cccf8 test(e2e): Set up Playwright E2E testing framework
ce5fa31 docs(legal): Add company information to legal pages
3a4fc0c feat(legal): Implement Privacy Policy and Terms & Conditions pages
```

---

## [Session 19] - 2025-12-19

### Homepage Banners System
- Created `homepage_banners` database table
- `OffersCarousel.tsx` component with auto-play, swipe support, RTL-aware
- Admin banners management page at `/admin/banners`
- Location-based banner targeting (National → Governorate → City)
- Partner banner system with separate type

### Commits
```
[See migration files: 20251219000002, 20251219000003]
```

---

## [Session 18] - 2025-12-12

### Guest Location Support
- `useGuestLocation` hook for localStorage location storage
- Guest browsing without login

### Customer Welcome Page
- Created `/welcome` page for first-time visitors
- Hero section, features showcase, governorates section
- PWA install prompt integration

---

## [Session 17] - 2025-12-11

### Product Images Import
- Added `image_url` column to Excel import
- URL validation and automatic mapping

### Variants Management
- Full variants CRUD in product edit page
- Add/edit/delete variants inline

### Admin Sidebar Fix
- Moved sidebar to layout level for persistence
- Created `AdminPageWrapper` component

---

## [Session 16] - 2025-12-10

### Excel Import System
- 4 pricing types: fixed, per_unit, variants, weight_variants
- Product variants table and system
- Provider categories table
- Successfully imported 30 categories, 156 products, 203 variants

### UI Fixes
- Modal z-index fix (z-[60] vs z-50)
- Product detail modal component
- Variant selection modal component

---

## [Earlier Sessions]

See `/archive/sessions/SESSION_LOG.md` for detailed logs of Sessions 10-16.

---

## Technical Notes

### Supabase JOIN Gotcha
**NEVER use `!foreign_key` syntax for nullable relations!**
```typescript
// BAD - Creates INNER JOIN
.select(`*, category:provider_categories!category_id (...)`)

// GOOD - Separate queries
const products = await supabase.from('menu_items').select('*')
const categories = await supabase.from('provider_categories').select('*')
```

### Provider Status Values
- `open` - Store is open
- `closed` - Store is closed
- `temporarily_paused` - Temporarily unavailable
- `on_vacation` - On vacation
- `incomplete` - Registration incomplete

### Order Status Values
`pending`, `accepted`, `preparing`, `ready`, `out_for_delivery`, `delivered`, `cancelled`, `rejected`
