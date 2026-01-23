# Engezna Project Status

## Last Updated: 2026-01-18 (Engezna 2026 - Phase 4 Complete)

## Project Overview

Engezna is a multi-vendor e-commerce platform connecting customers with local providers (restaurants, supermarkets, cafes, etc.) in Egypt.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State Management**: Zustand (cart)
- **UI Components**: shadcn/ui
- **Localization**: next-intl (Arabic/English)
- **Testing**: Playwright (E2E)
- **Monitoring**: Sentry (errors), Vercel Analytics (performance)
- **Security**: Upstash Redis (rate limiting)

---

## Current Status: 100% MVP Complete ✅

### Engezna 2026 Updates (January 18, 2026)

#### Phase 4: Production Optimization - COMPLETE

##### 4.1 Query Optimization (Select \* → Specific Columns)

- [x] **Repository Pattern enhanced** - ProvidersRepository, OrdersRepository, ProfilesRepository
- [x] **Specific column selection** - 40-60% payload reduction
- [x] **Type-safe casting** - `as unknown as T` pattern for Supabase relations
- [x] **16 instances updated** in core lib files

##### 4.2 Sentry Error Monitoring

- [x] **Client config** - Browser-side error tracking with filtering
- [x] **Server config** - Node.js error tracking with CI awareness
- [x] **Edge config** - Minimal config for edge runtime
- [x] **Error boundaries integrated** - All 4 error.tsx files connected

##### 4.3 Vercel Analytics & Cron Jobs

- [x] **Vercel Analytics** - `<Analytics />` component in root layout
- [x] **Speed Insights** - `<SpeedInsights />` for Web Vitals tracking
- [x] **Settlement Cron Job** - `/api/cron/settlements` runs daily at midnight Cairo
- [x] **vercel.json configured** - Cron schedule: `0 22 * * *` (22:00 UTC = 00:00 Cairo)

##### 4.4 Bundle Size Optimization

- [x] **Tree-shaking enabled** - Sentry config optimized
- [x] **Dynamic imports** - jsPDF, Leaflet loaded lazily
- [x] **Code splitting** - Next.js App Router automatic per-route
- [x] **Total: 166 chunks** - 6.6MB total build size

#### Environment Variables Added

```env
# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=engezna
SENTRY_PROJECT=engezna

# Cron Jobs
CRON_SECRET=your-secure-random-string
```

---

### Session 27 Updates (January 13, 2026)

#### E2E Testing Suite - Store Readiness

- [x] **536 E2E tests created** covering all critical paths (532 passed, 4 failed, 5 skipped)
- [x] **Customer journey tests** - Login, order, checkout, tracking
- [x] **Merchant operations tests** - Notifications, pricing, order status
- [x] **Stability tests** - Race conditions, sessions, network errors
- [x] **Mobile responsiveness** - iPhone 15, Samsung S23, Pixel 5
- [x] **Touch targets fixed** - All elements 48x48px minimum
- [x] **Performance audit** - Lighthouse, Core Web Vitals
- [x] **Global auth setup** - For protected route testing

##### Test Results (January 12, 2026)

- ✅ 532 Passed | ❌ 4 Failed | ⏭️ 5 Skipped | ⏱️ 7.7 minutes

##### Test Files (16 files)

```
e2e/
├── critical-customer-journey.spec.ts
├── customer-journey.spec.ts
├── merchant-operations.spec.ts
├── stability-edge-cases.spec.ts
├── mobile-responsiveness.spec.ts
├── cart-checkout.spec.ts
├── admin-dashboard.spec.ts
├── provider-dashboard.spec.ts
├── finance-settlements.spec.ts
├── notifications-realtime.spec.ts
├── pwa-offline.spec.ts
├── performance-audit.spec.ts
├── complaints-system.spec.ts
├── refunds-system.spec.ts
├── global-setup.ts
└── E2E_TEST_REPORT.md
```

#### Welcome Page Loading Fix

- [x] **Fast redirect for new visitors** - Welcome page now opens immediately for first-time visitors
- [x] **localStorage early check** - Synchronous check before waiting for Supabase
- [x] **Improved UX** - No more loading spinner delay before welcome page

##### Technical Details

- Home page now checks `localStorage` for guest location immediately on mount
- If no location found, redirects to `/welcome` without waiting for LocationContext
- Eliminates the delay caused by waiting for Supabase data to load

---

### Session 26 Updates (January 11, 2026)

#### Custom Order System (Triple Broadcast) - Comprehensive Review

##### Navigation & UX Fixes

- [x] **Smart back navigation** - Orders from custom orders page now return correctly
- [x] **Context-aware back button** - Shows "الطلبات الخاصة" when from custom orders
- [x] **URL parameter tracking** - `?from=custom` preserves navigation context
- [x] **Customer bottom nav badge** - Fixed pending quotes count query

##### Database & Notifications

- [x] **Notification data column** - Added JSONB data column to notification tables
- [x] **RPC functions** - `customer_approve_custom_order` and `customer_reject_custom_order`
- [x] **Check constraint fix** - Added `pricing_in_progress` to status constraint

##### System Architecture Analysis

- [x] **Settlement system verified** - No impact from custom orders (uses `orders` table)
- [x] **Analytics verified** - Custom orders counted after approval
- [x] **Dashboard stats verified** - All systems read from `orders` table

##### Custom Order Flow (Verified Working)

```
1. Customer creates broadcast → custom_order_broadcasts
2. Providers receive requests → custom_order_requests
3. Provider prices → status = 'priced'
4. Customer approves → creates entry in 'orders' table
5. Order managed normally → financial systems work automatically
```

---

### Session 24 Updates (January 4, 2026)

#### Documentation Cleanup & Organization

- [x] **Archived completed plans** - Moved 10 outdated plan files to `/archive`
- [x] **Reorganized docs folder** - Created `/docs/guides` and `/docs/features` subfolders
- [x] **Created CHANGELOG.md** - Consolidated session history
- [x] **Created ROADMAP.md** - Future tasks and priorities

#### Provider Dashboard Fixes

- [x] **Fixed button visibility** - Added `!important` prefix to button colors
- [x] **Fixed dropdown menu sensitivity** - Padding bridge for smooth hover

#### Provider Settings Updates

- [x] **Delete account functionality** - Full account deletion with provider data cleanup
- [x] **Dropdown menu improvements** - Removed preview button, changed labels
- [x] **Header cleanup** - Removed redundant "حسابي" text

---

### Session 23 Updates (December 31, 2025)

#### Native Google Sign-In Implementation

- [x] **Native Google OAuth** - Shows "engezna.com" instead of Supabase URL
- [x] **Custom Arabic Button** - "إستمرار عبر جوجل" (Talabat-style)
- [x] **Authorization Code Flow** - Secure token exchange via API
- [x] **Profile Completion Flow** - Redirects new users to complete profile

---

### Session 22 Updates (December 26, 2025)

#### Settlement System Refinements

- [x] **Database as Single Source of Truth** - All financial values from database, no frontend calculations
- [x] **Commission Display Fix** - Fixed 22 vs 17.5 issue after refunds
- [x] **Trigger Conflict Resolution** - Fixed `calculate_order_commission` and `generate_provider_settlement`
- [x] **Admin Settlement Details UI** - Redesigned COD/Online cards to match provider design
- [x] **Provider Finance Settlements Tab** - Updated card design for consistency
- [x] **Grace Period Display** - Shows waiver indicator when commission = 0 but revenue > 0

#### Key Principles Established

1. **مصدر الحقيقة الواحد**: Database is the only source for financial calculations
2. **Backend Calculations Only**: Frontend displays values, never calculates them
3. **Commission Formula**: `commission = (subtotal - discount - refund) * rate`

---

### Session 20 Updates (December 23, 2025)

#### Legal Compliance & Company Registration

- [x] **Privacy Policy Page** (`/privacy`) - Bilingual with Charcoal theme header
- [x] **Terms & Conditions Page** (`/terms`) - Tabbed interface (Customer/Provider)
- [x] **Company Information** - سويفكم للتجارة والتصدير (ذ.م.م)
  - Commercial Registry: 2767
  - Address: ش صالح حمام بجوار مسجد الاباصيري - بني سويف
  - Email: support@engezna.com
- [x] **Signup Terms Checkbox** - Required agreement with Zod validation
- [x] **Order Confirmation Legal Links** - Terms & Privacy links added
- [x] **Manifest.json Privacy URL** - `privacy_policy_url` for PWA compliance

#### E2E Testing Setup (Playwright)

- [x] **Playwright Configuration** - Multi-browser (Chrome, Safari, Mobile)
- [x] **Customer Journey Smoke Test** - Homepage → Store → Cart → Checkout
- [x] **PWA Offline Tests** - Service Worker, Offline page, Manifest validation
- [x] **NPM Scripts** - `test:e2e`, `test:e2e:ui`, `test:e2e:headed`

---

### Completed Features

#### Customer Side

- [x] Customer registration & authentication
- [x] **Google Sign-In** - Native OAuth showing engezna.com with Arabic button
- [x] Provider browsing and search
- [x] Provider details page with products
- [x] Shopping cart functionality
- [x] Checkout flow with address management
- [x] Order placement and confirmation page
- [x] Order tracking and history
- [x] Order cancellation (pending orders only)
- [x] Favorites system
- [x] Customer header with cart icon
- [x] Real-time notifications (with polling fallback)
- [x] In-app chat with provider
- [x] Message read status indicators (✓/✓✓)
- [x] Reorder functionality ("اطلب تاني")
- [x] **Product detail modal** - Full product view with description
- [x] **Variant selection** - Size/weight/option variants
- [x] **Category filtering** - Filter products by category on provider page
- [x] **Guest browsing** - Browse stores without login (localStorage location)
- [x] **Welcome/Landing page** - First-time visitor experience with features showcase
- [x] **PWA support** - Install prompt for mobile users
- [x] **Privacy Policy page** - `/privacy` with company info
- [x] **Terms & Conditions page** - `/terms` with tabbed interface
- [x] **E2E Tests (Playwright)** - Customer journey and PWA tests

#### Provider Side

- [x] Provider registration & approval flow
- [x] Provider dashboard with statistics
- [x] Order management (accept/reject/status updates)
- [x] Product management (CRUD)
- [x] Business hours management
- [x] Provider settings
- [x] Finance page with COD/Online breakdown
- [x] Reports with payment method analytics
- [x] Real-time notifications system
- [x] In-app chat with customers
- [x] Notification management (mark read, delete)
- [x] **Excel menu import** - Bulk import products from Excel
- [x] **4 Pricing types** - fixed, per_unit, variants, weight_variants
- [x] **Provider categories** - Organize products by category
- [x] **Product variants** - Size/weight options per product

#### Admin Side

- [x] Admin dashboard
- [x] Provider approval system
- [x] Basic analytics (with platform colors)
- [x] Settlements management (COD/Online breakdown)
- [x] Settlement payment recording
- [x] Settlement groups for auto-settlements
- [x] Customer management (ban/unban with notifications)
- [x] Order management
- [x] Customer ban system (cancels orders, notifies providers)
- [x] Customer unban notification
- [x] Sidebar state persistence across pages

---

## Test Accounts

| Email              | Password | Role           | Provider          |
| ------------------ | -------- | -------------- | ----------------- |
| provider@test.com  | Test123! | provider_owner | سوبر ماركت النجاح |
| provider2@test.com | Test123! | provider_owner | سلطان بيتزا       |
| provider3@test.com | Test123! | provider_owner | لافندر كافيه      |
| provider4@test.com | Test123! | provider_owner | مطعم الصفا        |
| customer@test.com  | Test123! | customer       | -                 |
| admin@test.com     | Test123! | admin          | -                 |

---

## Database Schema Highlights

- `profiles` - User profiles with roles (customer, provider_owner, provider_staff, admin)
- `providers` - Store/provider information (status enum: open, closed, temporarily_paused, on_vacation, incomplete)
- `menu_items` - Product catalog with pricing_type (fixed, per_unit, variants, weight_variants)
- `product_variants` - Product variants (size/weight/option) with individual prices
- `provider_categories` - Categories per provider for organizing products
- `orders` - Order records with payment_method (cash/online)
- `order_items` - Order line items
- `addresses` - Customer delivery addresses
- `favorites` - Customer favorites
- `settlements` - Provider settlements with COD/Online breakdown
- `settlement_items` - Individual orders in settlements
- `settlement_groups` - Groups for auto-settlements (daily, 3_days, weekly)
- `admin_users` - Admin user records
- `customer_notifications` - Customer notification system
- `provider_notifications` - Provider notification system
- `order_messages` - Chat messages between customer and provider

---

## RLS Policies Summary

- Customers can view all approved providers (status in open, closed, temporarily_paused, on_vacation)
- Customers can create orders only if is_active = true (not banned)
- Customers can cancel their own pending orders (if not banned)
- Providers can manage their own orders and products
- Admins can update/delete all orders
- Banned customers cannot create new orders (RLS enforced)

---

## Important Database Notes

### Provider Status Field

The `providers` table uses a `status` enum, NOT a boolean `is_approved`:

- `open` - Store is open
- `closed` - Store is closed
- `temporarily_paused` - Temporarily unavailable
- `on_vacation` - On vacation
- `incomplete` - Registration incomplete

### Order Status Enum

Valid values: `pending`, `accepted`, `preparing`, `ready`, `out_for_delivery`, `delivered`, `cancelled`, `rejected`

- **NO** `confirmed` status exists!

### Debugging Tips

1. Check column existence: `SELECT column_name FROM information_schema.columns WHERE table_name = 'your_table'`
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table'`
3. Add error logging to catch silent query failures

---

## Known Issues

- None currently

---

## ⚠️ ملاحظة مهمة - الميزات المعطلة مؤقتاً

### المساعد الذكي (AI Assistant - أحمد)

| البند | التفاصيل |
|-------|----------|
| **الحالة** | 🔴 **معطل مؤقتاً** |
| **السبب** | النظام لا يزال في مرحلة التطوير وغير محكم بشكل كافٍ |
| **الهدف** | تقليل المشاكل في الفترات الأولى من الإطلاق |
| **تاريخ التعطيل** | يناير 2026 |
| **التفعيل** | `NEXT_PUBLIC_AI_ASSISTANT_ENABLED=true` في `.env` |
| **التوثيق** | [docs/features/AI_SMART_ASSISTANT.md](docs/features/AI_SMART_ASSISTANT.md) |

---

## Deployment

- **Platform**: Vercel
- **Preview URL**: engezna-rjt1rdc1e-engeznas-projects.vercel.app
