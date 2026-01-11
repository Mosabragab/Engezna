# Changelog - Engezna Platform

All notable changes to this project are documented in this file.

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
