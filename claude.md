# Claude Project Guide - Engezna (إنجزنا)

**Last Updated:** December 11, 2025 (Session 17)
**Status:** Week 5 - Complete Feature Set (Session 17) ✅
**Branch:** `claude/review-project-planning-014sifTa3MmUskjXMTF3M9FN`

---

## 🎨 BRAND COLORS (OFFICIAL - v2.0)

⚠️ **CRITICAL: Use ONLY these colors**

### Primary Colors
```css
--primary: 198 100% 44%;          /* #009DE0 Engezna Blue */
--secondary: 0 0% 0%;             /* #000000 Black */
--background: 0 0% 100%;          /* #FFFFFF White */
```

### Semantic Colors
```css
--deal: 158 100% 38%;             /* #00C27A Green-Cyan (Deals/Success) */
--premium: 42 100% 70%;           /* #FFD166 Soft Gold (Premium/Warning) */
--info: 194 86% 58%;              /* #36C5F0 Sky Blue (Info) */
--error: 358 100% 68%;            /* #FF5A5F Coral Red (Error) */
```

### ❌ OLD COLORS (DO NOT USE)
- ~~Deep Green #06c769~~ ← WRONG
- ~~Orange #E85D04~~ ← OLD (Changed to Blue)
- ~~Gold: 43 98% 58%~~ ← WRONG

### Theme Strategy
**Light-Only Theme** - Dark mode has been removed for:
- Simplified development and testing
- Consistent brand experience
- Better performance (fewer CSS variables)

**Official brand color is ENGEZNA BLUE #009DE0, NOT orange or green!**

---

## 🔐 Security & Performance Fixes (Session 17 - December 11, 2025)

### Phase 1: Security Fixes
| Fix | File | Description |
|-----|------|-------------|
| API Authentication | `src/app/api/voice-order/process/route.ts` | Added user authentication check |
| Route Protection | `src/lib/supabase/middleware.ts` | Enabled protection for admin/provider/checkout |
| Variant Price Fix | `src/app/[locale]/checkout/page.tsx` | Fixed variant price calculation in orders |
| Dynamic Commission | `src/app/[locale]/provider/finance/page.tsx` | Commission rate from database per provider |
| Cart Provider Switch | `src/lib/store/cart.ts` + `providers/[id]/page.tsx` | Confirmation dialog when switching |

### Phase 2: Performance Optimization
| Fix | File | Description |
|-----|------|-------------|
| Audio Memory Leaks | `src/hooks/customer/useNotifications.ts` | Shared audio instances at module level |
| Channel Leaks | `src/app/[locale]/provider/page.tsx` | useRef for channel cleanup |
| N+1 Queries | `src/app/[locale]/page.tsx` | Single query with client-side filtering |
| Rate Limiting | `src/lib/auth/actions.ts` + `src/lib/utils/rate-limit.ts` | Protection for auth endpoints |

### Rate Limiting Configuration
```typescript
// Login: 10 attempts / 15 minutes, block for 30 minutes
LOGIN_LIMIT: { maxAttempts: 10, windowMs: 15*60*1000, blockDurationMs: 30*60*1000 }

// OTP Send: 5 attempts / 10 minutes, block for 30 minutes
OTP_SEND_LIMIT: { maxAttempts: 5, windowMs: 10*60*1000, blockDurationMs: 30*60*1000 }

// OTP Verify: 5 attempts / 5 minutes, block for 15 minutes (prevent brute force)
OTP_VERIFY_LIMIT: { maxAttempts: 5, windowMs: 5*60*1000, blockDurationMs: 15*60*1000 }

// Password Reset: 3 attempts / hour, block for 1 hour
PASSWORD_RESET_LIMIT: { maxAttempts: 3, windowMs: 60*60*1000, blockDurationMs: 60*60*1000 }
```

### Phase 3: Critical Bug Fixes
| Fix | File | Description |
|-----|------|-------------|
| Phone Validation | `src/app/[locale]/checkout/page.tsx` | Egyptian format: `01XXXXXXXXX` |
| Payment Confirmation | `src/app/[locale]/provider/orders/page.tsx` | Confirmation dialog with warning |
| Error Handling | `src/app/[locale]/orders/[id]/page.tsx` | In-modal error display for cancellation |
| Realtime Retry | `src/app/[locale]/orders/[id]/page.tsx` | Exponential backoff (2s, 4s, 8s) |

### Testing Checklist
```
□ Phone Validation: /checkout - Try invalid phones (0501234567)
□ Provider Switch: /providers/[id] - Add item, switch restaurant
□ Rate Limiting: /auth/login - Try 11+ failed logins
□ Payment Confirmation: /provider/orders - Mark payment received
□ Order Cancellation: /orders/[id] - Cancel pending order
□ Route Protection: Logout and access /checkout directly
```

### Phase 4: Admin Panel Optimization
| Fix | File | Description |
|-----|------|-------------|
| N+1 Query (Approvals) | `src/app/[locale]/admin/approvals/page.tsx` | Batch fetch users (80+ → 3 queries) |
| N+1 Query (Orders) | `src/app/[locale]/admin/approvals/page.tsx` | Join for customer names |
| Error Handling | `src/app/[locale]/admin/approvals/page.tsx` | User-facing alerts for failures |
| Input Validation | `src/app/[locale]/admin/approvals/page.tsx` | Commission rate (0-100%) validation |
| Badge Counts | `src/app/[locale]/admin/layout.tsx` | Error handling for sidebar badges |
| Dashboard Errors | `src/app/[locale]/admin/page.tsx` | Error display with retry button |

### Admin Performance Improvement
```
Before: 80+ database queries for 20 approvals
After:  3 queries total

Technique:
1. Collect all unique admin IDs from approvals
2. Batch fetch admin_users with .in('id', adminIds)
3. Batch fetch profiles with .in('id', userIds)
4. Map data in memory (no additional queries)
```

### Admin Testing Checklist
```
□ Approvals: /admin/approvals - Load page (should be fast now)
□ Create Request: /admin/approvals - Create commission change request
□ Dashboard: /admin - Verify stats load correctly
□ Error Recovery: Disconnect network, verify retry button appears
```

---

## 🎯 Project Overview
- **Name:** Engezna (إنجزنا) - "Let's get it done and order!"
- **Launch:** February 21, 2026 (3 months)
- **Business Model:** 5-7% commission (vs competitors' 15-20%)
- **Status:** Week 5 Complete - Full Feature Set ✅
- **Progress:** ~88% of MVP Complete
- **Live URL:** https://engezna.vercel.app
- **GitHub:** https://github.com/Mosabragab/Engezna
- **Supabase:** https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr

---

## ✅ What's Working NOW

### Complete Customer Flow (End-to-End!)
1. ✅ Visit `/ar/providers` or `/en/providers`
2. ✅ Browse all 4 providers with category filtering
3. ✅ Click any provider to see their menu
4. ✅ Add items to cart (+ / - buttons with global state)
5. ✅ See real-time cart total with persistence
6. ✅ **Sign up / Login** (email/password or OTP)
7. ✅ **Complete checkout** (address, payment method)
8. ✅ **Place order** (creates in database)
9. ✅ **Order confirmation page** with order details
10. ✅ **Order tracking page** with status timeline
11. ✅ **Order history page** with filters (all/active/completed)
12. ✅ **My Orders navigation** in header with active count badge
13. ✅ **User Settings** - Multi-page settings system with 7 pages
14. ✅ **Profile Management** - Edit name (first/last), phone, email, password
15. ✅ **Address Management** - Full CRUD with cascading location dropdowns
16. ✅ **Language Selection** - Switch between Arabic/English
17. ✅ **Location Settings** - Select governorate and city
18. ✅ **In-App Chat** - Message providers about orders
19. ✅ **Real-time Notifications** - With polling fallback for reliability

### Partner Registration Flow (✅)
1. ✅ Visit `/ar/partner/register` or `/en/partner/register`
2. ✅ Step 1: Personal info (name, email, phone, password)
3. ✅ Step 2: Business type dropdown + Role dropdown
4. ✅ Creates provider with status "incomplete"
5. ✅ Redirect to provider dashboard
6. ✅ Complete profile at `/provider/complete-profile`
7. ✅ Step 3: Store info (name AR/EN, phone, governorate/city, address, logo)
8. ✅ Step 4: Delivery settings (fee, time, minimum order, radius)
9. ✅ Submit for review → status "pending_approval"

### Provider Orders Management (✅)
1. ✅ Visit `/ar/provider/orders` or `/en/provider/orders`
2. ✅ View all orders with stats (new/in-progress/completed/total)
3. ✅ Filter tabs: All, New, In Progress, Completed, Cancelled
4. ✅ Order cards with customer info, items, address, total
5. ✅ Accept/Reject buttons for pending orders
6. ✅ Status update flow: Accepted → Preparing → Ready → Out for Delivery → Delivered
7. ✅ Order detail page `/provider/orders/[id]`
8. ✅ Status timeline with timestamps
9. ✅ Customer info with call button
10. ✅ Net earnings display (after commission)
11. ✅ **In-App Chat** - Message customers about orders
12. ✅ **Real-time Notifications** - Order updates, new messages

### Menu Management System (✅)
1. ✅ Visit `/ar/provider/products` or `/en/provider/products`
2. ✅ View all products with stats (total/available/unavailable)
3. ✅ Filter tabs: All, Available, Unavailable
4. ✅ Search products by name/description
5. ✅ Product cards with image, price, discount badge
6. ✅ Toggle availability (show/hide product)
7. ✅ Delete product with confirmation
8. ✅ Add new product `/provider/products/new`
9. ✅ Edit product `/provider/products/[id]`
10. ✅ Product form: name (AR/EN), description, price, original price (for discount)
11. ✅ Product attributes: vegetarian, spicy, prep time, calories
12. ✅ Image upload to Supabase Storage

### Excel Menu Import (NEW! ✅)
1. ✅ Visit `/ar/provider/menu-import` or `/en/provider/menu-import`
2. ✅ Upload Excel file (.xlsx, .xls)
3. ✅ Preview parsed products before import
4. ✅ **4 Pricing Types**: fixed, per_unit, variants, weight_variants
5. ✅ **Variants Format**: `نصف كيلو:480|ربع كيلو:250`
6. ✅ Auto-create categories from Excel
7. ✅ Product variants (sizes/weights) auto-created
8. ✅ Guide: `/docs/EXCEL_IMPORT_GUIDE.md`

### Product Variants System (NEW! ✅)
1. ✅ **VariantSelectionModal** - Customer selects size/weight
2. ✅ **ProductDetailModal** - Full product view with variants
3. ✅ **Database Table**: `product_variants`
4. ✅ **Variant Types**: size, weight, option
5. ✅ Customers can select variant and quantity before adding to cart

### Store Hours Management (✅)
1. ✅ Visit `/ar/provider/store-hours` or `/en/provider/store-hours`
2. ✅ Weekly schedule with all 7 days
3. ✅ Toggle each day open/closed
4. ✅ Set opening and closing times (30-min intervals)
5. ✅ Quick actions: Open all days / Close all days
6. ✅ Copy hours from one day to all days
7. ✅ Summary showing open/closed days count
8. ✅ Saves to `business_hours` JSONB in providers table
9. ✅ Link from provider dashboard

### Provider Settings (✅)
1. ✅ Visit `/ar/provider/settings` or `/en/provider/settings`
2. ✅ Tabbed interface: Store Info, Delivery, Status
3. ✅ Store Info: Edit name (AR/EN), phone, governorate/city, address, logo
4. ✅ Delivery: Edit delivery fee, time, minimum order, radius
5. ✅ Status: Toggle Open/Temporarily Paused/Closed
6. ✅ Quick links to Store Hours, Products, Orders
7. ✅ Link from provider dashboard

### Promotions Management (✅)
1. ✅ Visit `/ar/provider/promotions` or `/en/provider/promotions`
2. ✅ Stats: active, upcoming, expired, total promotions
3. ✅ Filter tabs: All, Active, Upcoming, Expired
4. ✅ Create promotion with types: Percentage, Fixed Amount, Buy X Get Y
5. ✅ Set date range, minimum order, max discount
6. ✅ Toggle active/inactive, Edit, Delete promotions
7. ✅ Link from provider dashboard

### Reports & Analytics (✅)
1. ✅ Visit `/ar/provider/reports` or `/en/provider/reports`
2. ✅ Revenue overview: Today, This Week, This Month, Last Month
3. ✅ Growth percentage compared to last month
4. ✅ Order stats: Total, Completed, Customers, Avg Order Value
5. ✅ Revenue chart (last 30 days) with hover details
6. ✅ Top 5 selling products with rankings
7. ✅ Completion rate and cancellation rate
8. ✅ Link from provider dashboard

### Finance & Payments (✅)
1. ✅ Visit `/ar/provider/finance` or `/en/provider/finance`
2. ✅ Total earnings and pending payout cards
3. ✅ Commission breakdown (6% platform fee)
4. ✅ This month vs last month earnings comparison
5. ✅ Payout schedule information (weekly on Sundays)
6. ✅ Transaction history with date range filter
7. ✅ Net earnings after commission deduction
8. ✅ Link from provider dashboard

### Settlements System (NEW! ✅)
**Smart COD vs Online Payment Handling:**
- **COD (الدفع عند الاستلام)**: Provider collects cash → Owes commission to Engezna
- **Online Payments**: Engezna collects payment → Owes payout to provider
- **Net Balance**: Calculates who owes whom based on both payment types

#### Admin Settlements (`/admin/settlements`)
1. ✅ Stats overview: Pending dues, Overdue dues, Total paid
2. ✅ Settlement generation with period selector (daily, every 3 days, weekly)
3. ✅ Custom settlement creation for specific provider and date range
4. ✅ **COD/Online Breakdown Display**:
   - Orange: COD orders with commission owed to Engezna
   - Blue: Online orders with payout owed to provider
5. ✅ Net balance with direction indicator (who pays whom)
6. ✅ Provider name displayed instead of generic "مزود"
7. ✅ "عمولة إنجزنا" instead of "المنصة"
8. ✅ Payment recording modal (cash, bank transfer, InstaPay, Vodafone Cash)
9. ✅ Status filtering (all, pending, processing, completed, failed)
10. ✅ Geographic filtering by governorate/city
11. ✅ **CRITICAL**: Only includes orders where both `status='delivered'` AND `payment_status='completed'`
12. ✅ 6% platform commission rate applied

#### Admin Settlement Detail (`/admin/settlements/[id]`)
1. ✅ Provider info with phone and period
2. ✅ Orders summary (total, COD count, online count)
3. ✅ **COD Section** (orange): Revenue, Engezna commission due
4. ✅ **Online Section** (blue): Revenue, commission deducted, payout due
5. ✅ **Net Balance Card**: Color-coded (green = Engezna pays, red = provider pays)
6. ✅ Orders table with payment method column (نقدي/إلكتروني)
7. ✅ Confirm payment / Mark failed actions

#### Provider Settlements (`/provider/settlements`)
1. ✅ Stats overview: Total due, Total paid, Pending count, Overdue count
2. ✅ Settlement history list with expandable details
3. ✅ Settlement card showing period, orders, gross revenue, commission, net payout
4. ✅ Status badges (pending, processing, completed, failed)
5. ✅ Payment details for completed settlements (date, method)
6. ✅ Full bilingual support (AR/EN)

### Provider Profile (NEW! ✅)
1. ✅ Visit `/ar/provider/profile` or `/en/provider/profile`
2. ✅ Account info display (email, avatar)
3. ✅ Language switcher (Arabic/English) with locale redirect
4. ✅ Inline password change form (no redirect needed)
5. ✅ Theme toggle in header (dark/light mode)
6. ✅ Sign out button
7. ✅ Theme-aware styling (responds to dark/light mode)

### Product Categories (NEW! ✅)
1. ✅ Add category dropdown when creating/editing products
2. ✅ Create new categories inline with Arabic/English names
3. ✅ Categories are provider-specific
4. ✅ Database table: `product_categories`

### Enhanced Promotions (NEW! ✅)
1. ✅ "Applies To" toggle: All Products or Specific Products
2. ✅ Multi-select checkbox list for choosing specific products
3. ✅ Display selected product count in promotion cards
4. ✅ Validation requires at least one product when specific is chosen

### Auto-Refresh Orders (NEW! ✅)
1. ✅ Orders page auto-refreshes every 60 seconds
2. ✅ Last refresh timestamp display

### Admin Invitation System (NEW! ✅)
1. ✅ Visit `/ar/admin/supervisors/invite` or `/en/admin/supervisors/invite`
2. ✅ Create invitation with email, role, and permissions
3. ✅ Pre-configure assigned regions
4. ✅ Set expiry time (24h, 48h, 72h, 7 days)
5. ✅ Add optional message for invitee
6. ✅ Copy unique invitation link
7. ✅ Invitee registers at `/admin/register/[token]`
8. ✅ Validates token and expiry
9. ✅ Shows role and permissions that will be assigned
10. ✅ Creates auth user + profile + admin_users record
11. ✅ Dedicated admin login at `/admin/login`
12. ✅ Checks admin role and active status before login

### Business Categories Supported
- 🍔 Restaurant (مطعم)
- ☕ Cafe (كافيه)
- 🛒 Supermarket (سوبر ماركت)
- 🧃 Juice Shop (عصائر)
- 💊 Pharmacy (صيدلية)
- 🥬 Vegetables & Fruits (خضروات وفواكه)

### Live Data
- ✅ 4 Providers with 30 menu items total:
  - Lavender Cafe (Coffee - 8 items)
  - Al Safa Restaurant (Restaurant - 8 items)
  - Al Najah Supermarket (Grocery - 8 items)
  - Sultan Pizza (Restaurant - 6 items)

---

## 📊 Progress

```
Week 0 ████████████ 100% ✅ Foundation
Week 1 ████████████ 100% ✅ Provider browsing + cart
Week 2 ████████████ 100% ✅ Auth + Checkout + Orders + Settings
Week 3 ████████████ 100% ✅ Partner Dashboard + Menu Management
Week 4 ████████████ 100% ✅ Admin Dashboard + Supervisor System
```

### Week 0: Foundation (100% ✅)
- [x] Next.js 16 + TypeScript + Tailwind setup
- [x] Supabase connection
- [x] Light-only theme + RTL support
- [x] Bilingual (Arabic/English)
- [x] Homepage + brand identity
- [x] Deployed to production

### Week 1: Core Features (100% ✅)
- [x] Provider browsing page `/providers`
- [x] Provider detail page `/providers/[id]`
- [x] Menu display system
- [x] Shopping cart functionality
- [x] Database schema (1,431 lines)
- [x] Seed data (4 providers, 30 items)

### Week 2: Auth + Checkout + Settings (100% ✅)
- [x] User authentication (email/password + OTP)
- [x] Protected routes and session management
- [x] Checkout flow with address input
- [x] Order placement in database
- [x] Order confirmation page
- [x] Global cart state with Zustand
- [x] Order tracking page ✅
- [x] Order history page ✅
- [x] Shared Header component with My Orders navigation ✅
- [x] Multi-page settings system (7 pages) ✅
- [x] Account settings (first/last name split, phone) ✅
- [x] Email change with password verification ✅
- [x] Password change with validation ✅
- [x] Language selection page ✅
- [x] Address management (full CRUD) ✅
- [x] Governorate/city selection ✅

### Week 3: Partner Dashboard (100% ✅)
- [x] Partner registration page `/partner/register` ✅
- [x] Multi-step registration (personal info + business type) ✅
- [x] Business category dropdown (6 types) ✅
- [x] Partner role dropdown (owner/manager) ✅
- [x] Complete profile page `/provider/complete-profile` ✅
- [x] Cascading governorate/city dropdowns ✅
- [x] Logo upload with preview ✅
- [x] Delivery settings form ✅
- [x] Status-aware provider dashboard ✅
- [x] Provider orders management page `/provider/orders` ✅
- [x] Order detail page `/provider/orders/[id]` ✅
- [x] Accept/Reject/Update order status ✅
- [x] Provider orders translations (AR/EN) ✅
- [x] Products list page `/provider/products` ✅
- [x] Add product page `/provider/products/new` ✅
- [x] Edit product page `/provider/products/[id]` ✅
- [x] Product image upload ✅
- [x] Product CRUD operations ✅
- [x] Products translations (AR/EN) ✅
- [x] Store hours management `/provider/store-hours` ✅
- [x] Provider settings page `/provider/settings` ✅
- [x] Promotions management `/provider/promotions` ✅
- [x] Reports & Analytics `/provider/reports` ✅
- [x] Finance/Payments dashboard `/provider/finance` ✅
- [ ] Supabase Storage bucket setup (SQL provided)
- [ ] Real-time order notifications

### Week 4: Admin Dashboard + Supervisor System (100% ✅)
- [x] Unified AdminHeader component ✅
  - [x] Language switcher integration ✅
  - [x] Notifications dropdown ✅
  - [x] User menu with avatar ✅
- [x] Unified AdminSidebar component ✅
  - [x] Collapsible navigation ✅
  - [x] Consistent Engezna Blue (#009DE0) theming ✅
- [x] Locale-aware number formatting ✅
  - [x] Arabic-Indic numerals (٠-٩) in Arabic locale ✅
  - [x] Western Arabic numerals (0-9) in English locale ✅
- [x] Supervisor management page `/admin/supervisors` ✅
  - [x] Full CRUD operations ✅
  - [x] Roles: super_admin, general_moderator, store_supervisor, support, finance ✅
  - [x] Permission system for granular access control ✅
  - [x] Stats dashboard with role breakdown ✅
  - [x] Filter by status and role ✅
- [x] Tasks management page `/admin/tasks` ✅
  - [x] Task assignment between director and supervisors ✅
  - [x] Status: new, accepted, in_progress, pending, completed, cancelled ✅
  - [x] Priority levels: urgent, high, medium, low ✅
  - [x] Deadline tracking with overdue indicators ✅
  - [x] Progress percentage tracking ✅
- [x] Approvals system page `/admin/approvals` ✅
  - [x] Approval types: refund, customer_ban, provider_suspend, commission_change ✅
  - [x] Status workflow: pending, approved, approved_with_changes, rejected ✅
  - [x] Create/decision modals ✅
  - [x] Justification tracking ✅
- [x] Internal messages page `/admin/messages` ✅
  - [x] Inbox and sent views ✅
  - [x] Compose message modal ✅
  - [x] Broadcast to all team members ✅
  - [x] Read/unread tracking ✅
  - [x] Priority: urgent or normal ✅
- [x] Announcements page `/admin/announcements` ✅
  - [x] Types: urgent, important, info ✅
  - [x] Pinned announcements ✅
  - [x] Expiry dates ✅
  - [x] CRUD for super admins ✅
- [x] District/neighborhood filtering in location settings ✅
- [x] **Admin Invitation System** ✅ (NEW!)
  - [x] `admin_invitations` database table with full schema ✅
  - [x] Invitation page `/admin/supervisors/invite` ✅
  - [x] Supervisor registration page `/admin/register/[token]` ✅
  - [x] Admin login page `/admin/login` ✅
  - [x] Invitation tokens with expiry (24-168 hours) ✅
  - [x] Role and permissions pre-configuration ✅
  - [x] Region assignment during invitation ✅
  - [x] Copy invitation link functionality ✅

---

## ⚠️ What's NOT Working Yet

### Admin Panel (Backend Integration - Phase 0 Complete ✅)
- ✅ **Provider management backend** - Approve, reject, suspend, reactivate providers
- ✅ **User management backend** - Ban, unban, change role with audit logging
- ✅ **Provider detail page** - Full view with stats and action controls
- ⚠️ **Platform analytics backend** - Basic stats implemented, advanced queries pending
- ✅ **Settlements system** - Admin and provider settlements pages complete (Session 15)

### Storage (Complete ✅)
- ✅ Supabase Storage bucket - Configured and working (Dec 1, 2025)
- ✅ Logo and product image uploads - Functional

### Payment Integration
- ❌ Online payment (Fawry) - NOT integrated, only Cash on Delivery works
- ❌ Card payments - NOT available
- ❌ Vodafone Cash - NOT available

### Notifications
- ✅ Real-time notifications (Supabase Realtime) - Live updates for customers and providers ✅ (Session 12)
- ❌ SMS notifications - No Twilio/SMS provider integration
- ⏸️ Email notifications - **مؤجل** (يتطلب خدمة بريد خارجية مثل Resend/SendGrid + API Keys)

### Customer Features Missing
- ✅ Order cancellation - Customers can cancel pending/confirmed/accepted orders ✅ (Session 12)
- ✅ Reviews/Ratings - Customers can rate providers and leave reviews ✅ (Session 12)
- ✅ Favorite restaurants - Favorites feature working ✅ (Session 12)
- ✅ Promo codes - Full promo code system in checkout ✅ (Session 12)
- ❌ Scheduled orders - Cannot order for later

### Provider Features Missing
- ✅ Real-time order notifications - Supabase Realtime subscription ✅ (Session 12)
- ❌ Multi-user support - No staff accounts for providers
- ❌ Inventory management - No stock tracking

### Other Missing Features
- ❌ Google Maps integration - No map display or geocoding
- ❌ Search functionality - No full-text search across providers
- ✅ **In-App Chat** - Order-based messaging between customer and provider (Session 15 Evening)

---

## 📦 Tech Stack

- **Framework:** Next.js 16.0.7 (Turbopack) - Security patched
- **React:** 19.2.1 (Security patched for CVE-2025-55182)
- **Language:** TypeScript 5.9.3
- **Styling:** Tailwind CSS v3.4.17 (stable)
- **UI:** Shadcn/ui (13 components)
- **Database:** Supabase (PostgreSQL 15)
- **i18n:** next-intl 4.5.5
- **Theme:** next-themes
- **Forms:** React Hook Form + Zod
- **State:** Zustand

---

## 🎯 Next Steps (Week 6+)

### ✅ Completed (Week 5)
1. [x] **Admin Backend Integration Phase 0** - Providers, users connected ✅
2. [x] **Supabase Storage** - Bucket configured, uploads working ✅
3. [x] **UI/UX Improvements** - Auth pages, Footer, Partner page, Logo unification ✅
4. [x] **Analytics Geographic Filtering** - Fixed filtering issues ✅
5. [x] **Order Cancellation** - Customers can cancel orders ✅ (Session 12)
6. [x] **Reviews & Ratings** - Complete review system ✅ (Session 12)
7. [x] **Favorites** - Customers can favorite providers ✅ (Session 12)
8. [x] **Real-time Notifications** - Supabase Realtime subscriptions ✅ (Session 12)
9. [x] **Promo Codes** - Full promo system in checkout ✅ (Session 12)

### High Priority (Current)
10. [ ] **Payment Integration (Fawry)** - Online payment support
11. [ ] **Advanced Analytics** - Time-series charts, performance metrics

### Medium Priority (Completed ✅)
7. [x] Customer reviews and ratings system ✅ (Session 12)
8. [x] Order cancellation flow for customers ✅ (Session 12)
9. [x] Favorites/wishlist feature ✅ (Session 12)

### Current Priority
10. [ ] Real-time notifications (Supabase Realtime)
11. [ ] Email transactional notifications
12. [ ] Promo codes system

### Lower Priority
13. [ ] Support/Help page `/provider/support`
14. [ ] Google Maps integration

---

## 🐛 Recent Fixes

### Work Session Dec 10, 2025 (Session 16) - Excel Import & Product Variants ✅

#### Excel Menu Import System
- ✅ **Import Page**: `/provider/menu-import` - Bulk import products from Excel
- ✅ **4 Pricing Types**: fixed, per_unit, variants, weight_variants
- ✅ **Variants Format**: `نصف كيلو:480|ربع كيلو:250` (name:price|name:price)
- ✅ **Auto-create categories** from Excel category column
- ✅ Successfully imported: 30 categories, 156 products, 203 variants

#### Product Variants System
- ✅ **Database Table**: `product_variants` with variant_type, name, price, is_default
- ✅ **VariantSelectionModal**: For selecting sizes/weights
- ✅ **ProductDetailModal**: Full product view with variants

#### Provider Categories
- ✅ **Database Table**: `provider_categories` per provider
- ✅ Categories display on provider products page
- ✅ Category filter tabs on customer provider page

#### UI Fixes
- ✅ **Modal z-index**: Increased from z-50 to z-[60] to appear above navigation
- ✅ **Add to Cart button**: Fixed visibility on mobile (was behind bottom nav)
- ✅ **Click-outside-to-close**: Added to modals
- ✅ **Products disappearing fix**: Changed from JOIN query to separate queries

#### Key Lesson Learned
**AVOID Supabase `!foreign_key` syntax for nullable relations!**
```typescript
// BAD - Creates INNER JOIN, excludes NULL category_id
.select(`*, category:provider_categories!category_id (...)`)

// GOOD - Separate queries, manual mapping
const products = await supabase.from('menu_items').select('*')
const categories = await supabase.from('provider_categories').select('*')
```

---

### Work Session Dec 7, 2025 (Session 15 Evening) - In-App Chat & Messaging ✅

#### Provider Notifications System
- ✅ Created `provider_notifications` table with triggers for order events
- ✅ Added RLS policies for notifications persistence (DELETE, UPDATE)
- ✅ Enabled realtime publication for `customer_notifications` and `provider_notifications` tables

#### Customer Notifications Enhancement
- ✅ Store name display in customer notifications
- ✅ Polling fallback (10-second interval) for realtime reliability
- ✅ Notification badge stabilization (removed animate-pulse flashing)

#### Chat Message System
- ✅ **RTL alignment fix**: Own messages appear on RIGHT, received messages on LEFT
- ✅ **Message read status indicators**: ✓ (sent), ✓✓ (read)
- ✅ **Locale-aware alignment**: Different justify classes for AR vs EN

#### Files Modified:
- `supabase/migrations/20251207000006_fix_notification_rls_policies.sql` - Realtime publication
- `src/components/shared/OrderChat.tsx` - RTL message alignment fix
- `src/hooks/customer/useNotifications.ts` - Polling fallback

---

### Work Session Dec 7, 2025 (Session 15 Part 4) - Smart Settlements (COD vs Online) ✅

#### Smart Payment-Aware Settlements
- ✅ **COD vs Online Payment Logic**:
  - COD orders: Provider collects cash → Owes 6% commission to Engezna
  - Online orders: Engezna collects payment → Owes 94% payout to provider
  - Net balance calculation: Determines who pays whom

- ✅ **Database Schema Update** (`20251207000003_settlements_cod_online_breakdown.sql`):
  - `cod_orders_count`, `cod_gross_revenue`, `cod_commission_owed`
  - `online_orders_count`, `online_gross_revenue`, `online_platform_commission`, `online_payout_owed`
  - `net_balance`, `settlement_direction` (platform_pays_provider | provider_pays_platform | balanced)

- ✅ **Settlement Generation Logic**:
  - Separate queries for COD (payment_method='cash') and Online (payment_method!='cash')
  - Calculate commission owed by provider from COD orders
  - Calculate payout owed to provider from Online orders
  - Net balance = online_payout_owed - cod_commission_owed

- ✅ **Admin Settlements UI Updates**:
  - "عمولة إنجزنا" instead of "المنصة" (professional branding)
  - Provider name displayed dynamically instead of "مزود"
  - Orange badges for COD with commission owed
  - Blue badges for Online with payout owed
  - Color-coded net balance (green = Engezna pays, red = provider pays)

- ✅ **Settlement Detail Page** (`/admin/settlements/[id]`):
  - COD Section (orange card): Orders, revenue, Engezna commission due
  - Online Section (blue card): Orders, revenue, commission, provider payout
  - Net Balance Card: Color-coded with clear direction indicator
  - Orders table with payment method column (نقدي/إلكتروني)

#### Files Created:
- `supabase/migrations/20251207000003_settlements_cod_online_breakdown.sql`

#### Files Modified:
- `src/app/[locale]/admin/settlements/page.tsx` - COD/Online generation logic, UI updates
- `src/app/[locale]/admin/settlements/[id]/page.tsx` - Full breakdown display

---

### Work Session Dec 7, 2025 (Session 15 Part 3) - Settlements System ✅

#### Settlements Management System
- ✅ **Admin Settlements Page** (`/admin/settlements` - NEW):
  - Stats cards: Pending dues, Overdue dues, Total paid
  - Period selector: Daily, Every 3 days, Weekly
  - Generate settlements for all active providers
  - Custom settlement creation for specific provider/period
  - Payment recording with method selection (cash, bank_transfer, instapay, vodafone_cash)
  - Status filtering and geographic filtering
  - Settlement list with provider info, period, orders, revenue, net payout
  - **CRITICAL FIX**: Settlement generation now checks BOTH `status='delivered'` AND `payment_status='completed'`
    - This ensures COD orders are only included after payment is confirmed
    - Prevents settlements from including delivered but unpaid orders

- ✅ **Provider Settlements Page** (`/provider/settlements` - NEW):
  - Stats overview: Total due, Total paid, Pending settlements, Overdue settlements
  - Settlement history with expandable cards
  - Shows gross revenue, platform commission (6%), net payout
  - Payment details for completed settlements
  - Full bilingual support (AR/EN)

- ✅ **Navigation Updates**:
  - Added "التسويات" (Settlements) menu item to AdminSidebar with Receipt icon
  - Added "التسويات" (Settlements) menu item to ProviderSidebar with Receipt icon

- ✅ **Database Migration** (`20251207000002_settlements_system.sql`):
  - `settlements` table with full schema
  - Columns: provider_id, period_start, period_end, total_orders, gross_revenue
  - platform_commission, net_payout, status, paid_at, payment_method, payment_reference
  - orders_included (array), notes, processed_by, approved_at, rejected_at, rejection_reason

#### Files Created:
- `src/app/[locale]/admin/settlements/page.tsx` (~850 lines)
- `src/app/[locale]/provider/settlements/page.tsx` (~420 lines)
- `supabase/migrations/20251207000002_settlements_system.sql`

#### Files Modified:
- `src/components/admin/AdminSidebar.tsx` - Added Settlements menu item
- `src/components/provider/ProviderSidebar.tsx` - Added Settlements menu item

---

### Work Session Dec 5, 2025 (Session 12) - Complete Feature Set ✅

#### Part 1: Order Cancellation Feature
- ✅ **Order Cancellation for Customers**:
  - Added cancellation button on order tracking page for cancellable orders
  - Cancellation allowed for statuses: `pending`, `confirmed`, `accepted`
  - Cancellation modal with reason selection (bilingual)
  - Database update with `cancelled_at`, `cancellation_reason`, `cancelled_by`
  - Order status timeline shows cancellation status

#### Part 2: Reviews & Ratings System (Complete)
- ✅ **Customer Review Submission** (`/orders/[id]/page.tsx`):
  - Added Review type with full schema
  - Added review state variables (showReviewModal, reviewRating, reviewComment, existingReview)
  - Fetch existing review when loading order details
  - `handleSubmitReview` function for creating/updating reviews
  - Review Section UI for delivered orders (shows existing or prompt to add)
  - Review Modal with star rating (1-5), comment textarea, submit/cancel buttons
  - StarRating component with size variants (sm, md, lg) and readonly mode

- ✅ **Reviews Display on Provider Page** (`/providers/[id]/page.tsx`):
  - Added Review type with profiles join (customer names)
  - Added reviews state and showAllReviews toggle
  - Fetch reviews with customer profiles from Supabase
  - Reviews Section after provider info, before category navigation
  - Display: reviewer name, date, star rating, comment, provider response
  - "Show all reviews" / "Show less" toggle

- ✅ **Provider Reviews Management** (`/provider/reviews/page.tsx` - NEW FILE):
  - Stats overview: Average rating, Total reviews, Response rate
  - Rating distribution chart (1-5 stars) with clickable filters
  - Reviews list with customer info and order reference
  - Response modal for providers to reply to reviews
  - Provider response updates `provider_response` and `provider_response_at`
  - Full bilingual support (AR/EN)
  - ~400 lines of code

- ✅ **Provider Sidebar Update** (`ProviderSidebar.tsx`):
  - Added Star icon import
  - Added Reviews menu item linking to `/provider/reviews`

#### Files Created:
- `src/app/[locale]/provider/reviews/page.tsx` (NEW - Provider reviews management)

#### Files Modified:
- `src/app/[locale]/orders/[id]/page.tsx` (Customer review submission + order cancellation)
- `src/app/[locale]/providers/[id]/page.tsx` (Reviews display on provider detail page)
- `src/components/provider/ProviderSidebar.tsx` (Reviews menu item)

#### Database Tables Used:
- `reviews` table with columns:
  - `id`, `order_id`, `customer_id`, `provider_id`
  - `rating` (1-5), `comment`, `provider_response`, `provider_response_at`
  - `created_at`, `updated_at`

#### Part 3: Real-time Notifications (Supabase Realtime)
- ✅ **useNotifications Hook** (`src/hooks/customer/useNotifications.ts`):
  - Subscribes to notifications table via Supabase Realtime
  - Real-time INSERT, UPDATE, DELETE listeners
  - markAsRead, markAllAsRead, deleteNotification functions
  - Unread count tracking

- ✅ **useProviderOrderNotifications Hook**:
  - Real-time pending order count for providers
  - Subscribes to orders table changes
  - hasNewOrder flag for animation triggers

- ✅ **CustomerHeader Updates**:
  - Bell icon shows live unread count with pulse animation
  - Uses useNotifications hook for real-time updates

- ✅ **Provider Dashboard Updates**:
  - Bell icon links to orders page
  - Animated when new orders arrive
  - Real-time pending order count

- ✅ **Notifications Page Refactor**:
  - Uses useNotifications hook instead of local state
  - Real-time updates without manual refresh

#### Part 4: Promo Codes System
- ✅ **Promo Code Validation** (checkout page):
  - Code validity checks (active, date range)
  - Minimum order amount validation
  - Usage limits (total and per-user)
  - First order only restriction
  - Category/provider restrictions

- ✅ **Promo Code UI**:
  - Input field in order summary
  - Applied code display with discount info
  - Remove code button
  - Error messages for invalid codes

- ✅ **Order Creation with Promo**:
  - Discount amount calculated and applied
  - Promo code recorded in order
  - Promo code usage tracked in promo_code_usage table
  - Usage count incremented

#### Additional Files Modified (Parts 3-4):
- `src/hooks/customer/useNotifications.ts` (NEW)
- `src/hooks/customer/index.ts`
- `src/components/customer/layout/CustomerHeader.tsx`
- `src/app/[locale]/provider/page.tsx`
- `src/app/[locale]/notifications/page.tsx`
- `src/app/[locale]/checkout/page.tsx`
- `src/lib/store/cart.ts`

---

### Work Session Dec 4, 2025 (Session 11) - Auth, Footer, Partner & Logo Updates ✅

#### Part 1: Auth System Enhancements
- ✅ **Reset Password Page** (NEW):
  - Created `src/app/[locale]/auth/reset-password/page.tsx`
  - Full form with password validation and confirmation
  - Added translations (AR/EN)
- ✅ **Provider Login Page** (NEW):
  - Created `src/app/[locale]/provider/login/page.tsx`
  - Dedicated login for service providers
  - Uses `EngeznaLogo size="lg"` with brand styling
- ✅ **Auth Pages Improvements**:
  - Added EngeznaLogo + back-to-home link to login, signup, forgot-password pages
  - Removed debug console.logs from customer login page
  - Updated partner register to link to provider login

#### Part 2: Footer & Partner Landing Page
- ✅ **Footer Component** (NEW):
  - Created `src/components/shared/Footer.tsx`
  - 4-column layout: Brand | Customers | Partners | Contact
  - Mobile responsive (stacked columns)
  - Links to all major sections
  - Fixed "حسابي" link to `/profile/account`
- ✅ **Partner Landing Page** (NEW):
  - Created `src/app/[locale]/partner/page.tsx`
  - Hero section with benefits and CTA
  - Centered logo in header with navigation links
  - CSS animations (fade-in, fade-in-up)
- ✅ **CustomerLayout Update**:
  - Added Footer component
  - Footer hidden on mobile when bottom nav shown

#### Part 3: Logo Brand Consistency (EngeznaLogo Unification)
- ✅ **Customer Pages**:
  - `CustomerHeader.tsx`: Changed logo size from `sm` to `md`
- ✅ **Provider Pages**:
  - `ProviderHeader.tsx`: Replaced Store icon with `EngeznaLogo size="sm"`
  - `ProviderSidebar.tsx`: Replaced Store icon with `EngeznaLogo size="md"`
  - `provider/page.tsx`: Fixed inline sidebar/header (was using old Store icon)
  - `ProviderLayout.tsx`: Updated login prompt to use EngeznaLogo
- ✅ **Admin Pages**:
  - `AdminHeader.tsx`: Replaced Shield icon with `EngeznaLogo size="sm"`
  - `AdminSidebar.tsx`: Replaced Shield icon with `EngeznaLogo size="md"`
  - `admin/login/page.tsx`: Replaced PNG image with `EngeznaLogo size="lg"`
- ✅ **Logo Size Summary**:
  | Page | Size | Type |
  |------|------|------|
  | Customer Header | `md` | animated |
  | Partner Landing | `lg` | animated + loop |
  | Provider Login | `lg` | static |
  | Provider Dashboard Sidebar | `md` | static |
  | Provider Dashboard Header (mobile) | `sm` | static |
  | Provider Header (mobile) | `sm` | static |
  | Provider Sidebar | `md` | static |
  | Admin Login | `lg` | static |
  | Admin Header (mobile) | `sm` | static |
  | Admin Sidebar | `md` | static |

#### Files Created (NEW):
- `src/app/[locale]/auth/reset-password/page.tsx`
- `src/app/[locale]/provider/login/page.tsx`
- `src/components/shared/Footer.tsx`
- `src/app/[locale]/partner/page.tsx`

#### Files Modified:
- `src/app/[locale]/auth/login/page.tsx` (removed debug logs, added logo)
- `src/app/[locale]/auth/signup/page.tsx` (added logo + back link)
- `src/app/[locale]/auth/forgot-password/page.tsx` (added logo + back link)
- `src/app/[locale]/partner/register/page.tsx` (link to provider login)
- `src/components/customer/layout/CustomerLayout.tsx` (added Footer)
- `src/components/customer/layout/CustomerHeader.tsx` (logo sm→md)
- `src/components/provider/ProviderHeader.tsx` (EngeznaLogo)
- `src/components/provider/ProviderSidebar.tsx` (EngeznaLogo)
- `src/components/provider/ProviderLayout.tsx` (EngeznaLogo)
- `src/app/[locale]/provider/page.tsx` (EngeznaLogo in inline sidebar/header)
- `src/components/admin/AdminHeader.tsx` (EngeznaLogo)
- `src/components/admin/AdminSidebar.tsx` (EngeznaLogo)
- `src/app/[locale]/admin/login/page.tsx` (EngeznaLogo)
- `src/app/globals.css` (added animations)
- `src/i18n/messages/ar.json` (footer, partner, resetPassword translations)
- `src/i18n/messages/en.json` (footer, partner, resetPassword translations)

### Work Session Dec 3, 2025 (Session 10) - Analytics Geographic Filtering Fix ✅
- ✅ **Fixed Admin Analytics Geographic Filtering**:
  - **Root Cause**: When selecting a governorate in admin analytics, page showed zeros because:
    1. Main analytics filtered orders only by provider's geographic location (IDs)
    2. Old orders' delivery_address had only text names (governorate_ar/en) without geographic IDs
    3. Regional analytics filtered only by delivery_address IDs, not by name fallback
  - Updated `src/app/[locale]/admin/analytics/page.tsx`:
    - Added geographic name lookup for selected filters
    - Implemented hybrid filtering: matches orders by provider location OR delivery_address
    - Falls back to name matching when IDs aren't present in delivery_address
    - Now filters by `governorate_id` OR `governorate_ar` OR `governorate_en`
  - Updated `src/app/[locale]/admin/analytics/regions/page.tsx`:
    - Added helper functions: `matchesGovernorate()`, `matchesCity()`, `matchesDistrict()`
    - Each function matches by ID first, then falls back to Arabic or English name
    - Applied to all three view levels (governorates, cities, districts)
- ✅ **Files Modified**:
  - `src/app/[locale]/admin/analytics/page.tsx` - Hybrid geographic filtering
  - `src/app/[locale]/admin/analytics/regions/page.tsx` - Name-based fallback matching

### Work Session Dec 3, 2025 (Session 9) - Admin Dashboard Zeros Fix ✅
- ✅ **Fixed Provider Status Values Across Admin Module**:
  - Updated `src/lib/admin/types.ts`:
    - Changed `ProviderStatus` type from `pending_review`/`pending_documents` to correct values
    - Now includes: `pending_approval`, `incomplete`, `approved`, `rejected`, `suspended`, `open`, `closed`, `temporarily_paused`, `on_vacation`
    - Updated `PROVIDER_STATUS_LABELS` with correct Arabic/English labels
  - Updated `src/lib/admin/statistics.ts`:
    - Fixed `getDashboardStats()` to use correct status values for pending/approved counts
    - Fixed `getPendingProvidersCount()` to query `pending_approval` and `incomplete` statuses
  - Updated `src/lib/admin/providers.ts`:
    - Fixed `getPendingProviders()` to use correct status values
    - Fixed `approveProvider()` validation to accept `pending_approval`, `incomplete`, `rejected`
    - Fixed `rejectProvider()` validation to accept `pending_approval`, `incomplete`, `approved`
  - Updated `src/hooks/admin/useAdminProviders.ts`:
    - Fixed `usePendingProviders()` initial filters to use correct status values
  - Updated `src/app/[locale]/admin/page.tsx`:
    - Fixed pending providers query to use `pending_approval` and `incomplete`
  - Updated `src/app/[locale]/admin/providers/[id]/page.tsx`:
    - Fixed status colors and labels for all provider statuses
    - Added `incomplete`, `on_vacation` status handling
    - Fixed approve/reject button condition to check correct statuses
- ✅ **Root Cause**: Admin module was using non-existent status values (`pending_review`, `pending_documents`) that don't match the database enum (`pending_approval`)
- ✅ **Files Modified**:
  - `src/lib/admin/types.ts`
  - `src/lib/admin/statistics.ts`
  - `src/lib/admin/providers.ts`
  - `src/hooks/admin/useAdminProviders.ts`
  - `src/app/[locale]/admin/page.tsx`
  - `src/app/[locale]/admin/providers/[id]/page.tsx`

### Work Session Dec 3, 2025 (Session 8) - Admin Backend Integration Phase 0 ✅
- ✅ **Admin Module TypeScript Types** (`src/lib/admin/types.ts`):
  - Provider, User, Order types with full status enums
  - Dashboard stats interface with providers, users, orders, finance
  - Paginated results and operation result types
  - Filter interfaces for all entities
  - Status labels in Arabic/English
- ✅ **Audit Logging System** (`src/lib/admin/audit.ts`):
  - `logAuditAction` - Log admin actions to `permission_audit_log`
  - `logActivity` - Log activities to `activity_log`
  - Tracks old/new data for all changes
- ✅ **Provider Management Functions** (`src/lib/admin/providers.ts`):
  - `getProviders` - List with filters, pagination, search
  - `getProviderById` - Single provider with relations
  - `approveProvider` - Approve with commission rate
  - `rejectProvider` - Reject with reason
  - `suspendProvider` - Suspend with reason
  - `reactivateProvider` - Restore suspended provider
  - `updateProviderCommission` - Update commission rate
  - `toggleProviderFeatured` - Feature/unfeature provider
- ✅ **User Management Functions** (`src/lib/admin/users.ts`):
  - `getUsers` - List with filters, pagination, search
  - `getUserById` - Single user with relations
  - `banUser` - Ban with reason (cannot ban admins)
  - `unbanUser` - Restore banned user
  - `changeUserRole` - Change user role (cannot change own)
  - `getUserStats` - User statistics by role/status
- ✅ **Statistics Functions** (`src/lib/admin/statistics.ts`):
  - `getDashboardStats` - Comprehensive dashboard statistics
  - `getOrdersTimeSeries` - Orders over time
  - `getRevenueTimeSeries` - Revenue over time
  - `getOrdersByCategory` - Orders grouped by category
  - `getStatsByGovernorate` - Regional statistics
- ✅ **API Routes**:
  - `src/app/api/admin/providers/route.ts` - Providers API
  - `src/app/api/admin/stats/route.ts` - Statistics API
  - `src/app/api/admin/users/route.ts` - Users API
- ✅ **React Hooks**:
  - `src/hooks/admin/useAdminProviders.ts` - Provider management hook
  - `src/hooks/admin/useAdminStats.ts` - Statistics hooks
- ✅ **Provider Detail Page** (`src/app/[locale]/admin/providers/[id]/page.tsx`):
  - Full provider info display with stats
  - Action buttons (approve/reject/suspend/reactivate)
  - Commission editing modal
  - Featured status toggle
  - Recent orders display
  - Full RTL/Arabic support
- ✅ **Frontend Integration**:
  - Updated providers page to use API routes
  - Updated customers page for ban/unban via API
  - All actions now logged to audit trail

### Work Session Dec 3, 2025 (Session 7) - Animated Logo & Documentation ✅
- ✅ **Animated Engezna Logo**:
  - Created `EngeznaLogo.tsx` component with RTL reveal animation
  - Uses Aref Ruqaa Google Font for Arabic calligraphy style
  - Animation reveals text right-to-left (1.8s duration)
  - Size variants: xs, sm, md, lg, xl, 2xl
  - Props: showPen, loop, loopDelay, static, bgColor
  - Logo text color: #0F172A (Charcoal) - NOT brand blue
- ✅ **Splash Screen Component**:
  - Created `SplashScreen.tsx` for app loading screen
  - Uses EngeznaLogo size="2xl" with pen decoration
  - Configurable duration and onComplete callback
- ✅ **Header Updates**:
  - Updated `CustomerHeader.tsx` to use EngeznaLogo
  - Updated shared `Header.tsx` to use EngeznaLogo
  - Added Aref Ruqaa font to `layout.tsx`
- ✅ **Location Text Color**:
  - Changed location text ("بني سويف") from slate to primary blue
  - Now matches MapPin icon color for consistency
- ✅ **Documentation Updates**:
  - Updated BRAND_IDENTITY_GUIDE.md (v3.0) with animated logo specs
  - Updated VISUAL_ASSETS_GUIDE.md (v2.0) with logo guidelines
  - Added Aref Ruqaa to typography documentation
- ✅ **Files Created/Modified**:
  - `src/components/ui/EngeznaLogo.tsx` (NEW)
  - `src/components/customer/SplashScreen.tsx` (NEW)
  - `src/components/customer/layout/CustomerHeader.tsx` (Modified)
  - `src/components/shared/Header.tsx` (Modified)
  - `src/app/[locale]/layout.tsx` (Modified - added font)
  - `branding/BRAND_IDENTITY_GUIDE.md` (Updated v3.0)
  - `branding/VISUAL_ASSETS_GUIDE.md` (Updated v2.0)

### Work Session Dec 2, 2025 (Session 6) - UI Consistency & Offers Carousel ✅
- ✅ **Unified Customer Pages with CustomerLayout**:
  - Converted all settings pages to use `CustomerLayout` for consistent UI
  - Pages updated: account, addresses, email, password, language, governorate
  - Converted orders page to use `CustomerLayout` with refresh button as `rightAction`
- ✅ **Header Improvements**:
  - Always show "إنجزنا" logo in header center as link to home
  - Logo replaces page title in header (title only shows in page content)
  - Show notifications and profile icons alongside custom header actions
  - Added `headerRightAction` prop to CustomerLayout for custom buttons
- ✅ **Settings Menu Update**:
  - Added "طلباتي" (My Orders) link to settings menu with ShoppingBag icon
  - Added translations for orders menu item (AR/EN)
- ✅ **Offers Carousel Auto-Scroll**:
  - Rewrote carousel with CSS transform instead of native scroll
  - Uses `translateX` for reliable movement (works with RTL)
  - Auto-scrolls every 4 seconds with smooth 500ms transition
  - Pauses on user interaction (touch/hover)
  - Resumes after 3 seconds of no interaction
- ✅ **Files Modified**:
  - `src/components/customer/layout/CustomerHeader.tsx` - Always show logo, rightAction support
  - `src/components/customer/layout/CustomerLayout.tsx` - Added headerRightAction prop
  - `src/app/[locale]/orders/page.tsx` - Converted to CustomerLayout
  - `src/app/[locale]/profile/page.tsx` - Added orders menu item
  - `src/app/[locale]/profile/*/page.tsx` - All settings pages converted to CustomerLayout
  - `src/components/customer/home/OffersCarousel.tsx` - Rewritten with CSS transform
  - `src/i18n/messages/ar.json` - Added orders translation
  - `src/i18n/messages/en.json` - Added orders translation

### Work Session Dec 2, 2025 (Session 5) - City-Based Filtering & UI Fixes ✅
- ✅ **City-Based Provider Filtering**:
  - Providers shown to customers are now filtered by their selected city
  - Added `userCityId` state to home page and providers page
  - Updated `fetchNearbyProviders` and `fetchTopRatedProviders` to filter by city
  - Updated `useProviders` hook to support `cityId` option
  - Display user's city name with link to change location
- ✅ **Chat & Order Feature** (تحويل من الصوت للدردشة - Session 15):
  - تم تحويل VoiceOrderFAB إلى ChatFAB (زر دردشة بدل ميكروفون)
  - تم إنشاء TextChat بدلاً من VoiceOrderChat (نص فقط بدون صوت)
  - إزالة زر الميكروفون من HeroSection و SearchBar
  - الإبقاء على OpenAI للمعالجة الذكية
  - حذف Deepgram transcribe API
- ✅ **Header Component Improvements**:
  - Added `hideAuth` prop to hide auth section for internal pages
  - Added RTL-aware arrow icons (ArrowLeft/ArrowRight) to back button
  - Applied `hideAuth` to governorate and addresses pages
- ✅ **Offer Cards Blue Gradient Colors**:
  - Updated demo offers colors from orange/green/purple to blue gradient
  - New colors: #009DE0, #0088CC, #0077B6 (Brand Guidelines v2.1)
- ✅ **Category Text Fixes**:
  - Shortened Arabic text "خضار وفواكه" to "خضار" for better display
  - Increased category card width from `w-20` to `w-[88px]`
- ✅ **Governorate Page Improvements**:
  - Better error handling with specific error messages
  - Fixed logout button displaying as arrow icon
- ✅ **Files Modified**:
  - `src/app/[locale]/page.tsx` - City filtering + offer colors
  - `src/app/[locale]/providers/page.tsx` - City filtering + chat button
  - `src/components/shared/Header.tsx` - hideAuth prop + arrow icons
  - `src/components/customer/home/CategoriesSection.tsx` - Shortened text + width
  - `src/hooks/customer/useProviders.ts` - cityId support
  - `src/app/[locale]/profile/governorate/page.tsx` - hideAuth applied
  - `src/app/[locale]/profile/addresses/page.tsx` - hideAuth applied

### Work Session Dec 1, 2025 (Session 4) - TypeScript Fixes & Homepage Updates ✅
- ✅ **TypeScript Type Fixes**:
  - Fixed `demoOffers` field names to match `OffersCarousel` Offer interface
    - `title` → `title_ar`, `titleEn` → `title_en`
    - `description` → `description_ar`, `descriptionEn` → `description_en`
    - `discountPercentage` → `discount_percentage`, `imageUrl` → `image_url`
    - Added `background_color` field
  - Added `onViewAll` and `showViewAll` props to `OffersCarousel` component
  - Updated `Provider` interface in `TopRatedSection.tsx`:
    - `logo_url?: string | null`, `cover_image_url?: string | null`
    - `status: string` (was union type)
    - Added `total_reviews?: number`
  - Updated `Provider` interface in `NearbySection.tsx` for consistency
  - Added null coercion to img `src` attributes (`|| undefined`)
  - Fixed disabled prop type error in cart page (`!!` coercion)
  - Added `onCategoryClick` prop to `CategoriesSection`
- ✅ **Build Verification**: Build passes successfully without TypeScript errors
- ✅ **Files Modified**:
  - `src/app/[locale]/page.tsx` - Fixed demoOffers field names
  - `src/components/customer/home/OffersCarousel.tsx` - Added onViewAll support
  - `src/components/customer/home/TopRatedSection.tsx` - Updated Provider interface
  - `src/components/customer/home/NearbySection.tsx` - Updated Provider interface
  - `src/components/customer/home/CategoriesSection.tsx` - Added onCategoryClick prop
  - `src/app/[locale]/cart/page.tsx` - Fixed disabled prop type

### Work Session Dec 1, 2025 (Session 3) - Customer Journey + PWA Components ✅
- ✅ **PWA Foundation**:
  - Created `manifest.json` with Engezna branding (Arabic RTL, theme color #009DE0)
  - Updated `layout.tsx` with PWA metadata
  - Created `InstallPrompt` component for app installation prompt
- ✅ **Customer Layout Components**:
  - `CustomerLayout.tsx` - Main wrapper with header and bottom navigation
  - `CustomerHeader.tsx` - Location selector, notifications, profile icons
  - `BottomNavigation.tsx` - 5-item mobile navigation with cart badge
- ✅ **Shared Components** (`src/components/customer/shared/`):
  - `ProviderCard.tsx` - Store card with 3 variants (default, compact, horizontal)
  - `ProductCard.tsx` - Menu item card with quantity controls
  - `SearchBar.tsx` - Search input with clear button
  - `CategoryChip.tsx` - Category selection chip
  - `FilterChip.tsx` - Toggle filter chip with check icon
  - `RatingStars.tsx` - Star rating display (supports half stars)
  - `PriceTag.tsx` - Price with discount display
  - `StatusBadge.tsx` - Open/closed/busy status badge
  - `EmptyState.tsx` - Empty state with icon, title, description, CTA
  - `QuantitySelector.tsx` - +/- quantity controls
- ✅ **Home Section Components** (`src/components/customer/home/`):
  - `HeroSection.tsx` - Hero with search and location selector
  - `CategoriesSection.tsx` - Horizontal scrolling category grid
  - `OffersCarousel.tsx` - Auto-playing offers carousel with dots
- ✅ **Customer Hooks** (`src/hooks/customer/`):
  - `useFavorites.ts` - Manage favorites with Supabase
  - `useProviders.ts` - Fetch and filter providers
- ✅ **New Pages**:
  - `/cart` - Shopping cart with promo code support
  - `/favorites` - Favorites page with login prompt
  - `/offers` - Offers/deals page
- ✅ **Page Improvements**:
  - `/providers` - Added SearchBar, FilterChip for filtering/sorting, EmptyState
  - `/providers/[id]` - Added ProductCard, RatingStars, StatusBadge, sticky category navigation
- ✅ **Translations**: Added ~83 new translation keys (AR/EN) for bottomNav, cart, favorites, offers, providers, pwa
- ✅ **Database**: favorites table created with RLS policies and toggle_favorite_provider function
- ✅ **Bug Fixes**:
  - Fixed BottomNavigation import (useCartStore → useCart)
  - Fixed showFavoriteButton prop error (removed invalid prop)
  - Fixed inputClassName prop error in HeroSection (removed invalid prop)

### Work Session Dec 1, 2025 (Session 2) - Advanced Permissions & Storage Bucket ✅
- ✅ **Supabase Storage Bucket Setup**:
  - Created `public` storage bucket for images
  - Configured file size limit (2MB) and allowed MIME types
  - Storage policies already existed (Public Read, Auth Upload/Update/Delete)
  - Logo and product image uploads now functional
- ✅ **Advanced RBAC + ABAC Permission System** (from continued session):
  - Created migration: `20251201100000_advanced_permissions_enhancement.sql`
  - Added `resources` table with categories (main, admin, finance, support)
  - Added `actions` table with types (read, write, manage, special)
  - Added `escalation_rules` table for approval workflows
  - Added `permission_audit_log` table for tracking
  - Created `ConstraintsEditor.tsx` component for managing permission constraints
  - Created supervisor permissions page (`/admin/supervisors/[id]/permissions`)
  - Enhanced `permission-service.ts` with escalation logic
  - Supports: geographic constraints, amount limits, time restrictions, ownership
- ✅ **Documentation Updates**:
  - Updated PRD.md Development Roadmap (Week 0-4 complete, Week 5+ planned)
  - Updated migrations/README.md with complete migration list
  - Marked Storage Bucket as complete in PRD.md

### Work Session Dec 1, 2025 (Session 1) - Roles Page Fixes & Documentation Sync ✅
- ✅ **Roles Page Permissions Display Fix**:
  - Fixed permissions not showing in view modal
  - Added loading state for permission fetching
  - Reset rolePermissions state before loading new data
  - Added error handling for permission queries
- ✅ **Enable Editing for All Roles**:
  - Removed `!role.is_system` condition that prevented editing system roles
  - All roles now have Edit button (including system roles like super_admin, support, finance)
  - System roles still have protected code field (cannot change the code)
- ✅ **Documentation Sync**:
  - Updated claude.md with December 1 session
  - Reviewed and cleaned outdated information
  - Updated version to 18.2

### Work Session Nov 30, 2025 - Admin Invitation System ✅
- ✅ **Admin Invitations Database Schema**:
  - Created `admin_invitations` table with full schema
  - Invitation status enum: pending, accepted, expired, cancelled, revoked
  - Token-based authentication with expiry dates
  - Pre-configured roles, permissions, and regions
  - RLS policies for security
  - Helper functions for creating/accepting/canceling invitations
- ✅ **Invitation Page** (`/admin/supervisors/invite`):
  - Email input with validation
  - Role selection with visual cards
  - Region assignment with cascading dropdowns
  - Expiry time selection (24h, 48h, 72h, 7 days)
  - Optional message for invitee
  - Generated invitation link with copy button
- ✅ **Supervisor Registration** (`/admin/register/[token]`):
  - Token validation with expiry check
  - Shows invitation details (role, permissions, inviter)
  - Registration form (name, phone, password)
  - Creates auth user + profile + admin_users record
  - Updates invitation status to accepted
  - Redirects to admin login
- ✅ **Admin Login Page** (`/admin/login`):
  - Dedicated login page for supervisors
  - Validates admin role and active status
  - Updates last_active_at timestamp
  - Professional UI matching Engezna branding
- ✅ **Supervisors Page Update**:
  - Changed "Add Supervisor" to "Invite Supervisor"
  - Links to new invitation page

### Work Session Nov 29, 2025 - Admin Dashboard + Supervisor System (Week 4) ✅
- ✅ **Unified Admin Components**:
  - AdminHeader with language switcher, notifications, user menu
  - AdminSidebar with collapsible navigation
  - Consistent Engezna Blue (#009DE0) theming
- ✅ **Locale-aware Number Formatting**:
  - Created `/src/lib/utils/formatters.ts` utility
  - Arabic-Indic numerals (٠-٩) in Arabic locale
  - Western Arabic numerals (0-9) in English locale
  - Applied throughout admin dashboard
- ✅ **Supervisor Management** (`/admin/supervisors`):
  - Full CRUD for admin team members
  - Roles: super_admin, general_moderator, store_supervisor, support, finance
  - Permission system with granular access control
  - Stats dashboard with role breakdown
  - Filter by status and role, search functionality
- ✅ **Tasks Management** (`/admin/tasks`):
  - Task assignment between director and supervisors
  - Status tracking: new, accepted, in_progress, pending, completed, cancelled
  - Priority levels: urgent, high, medium, low
  - Task types: provider_review, dispute, support, report, financial, investigation
  - Deadline tracking with overdue indicators
  - Progress percentage tracking
- ✅ **Approvals System** (`/admin/approvals`):
  - Approval types: refund, customer_ban, provider_suspend, commission_change
  - Status workflow: pending, approved, approved_with_changes, rejected
  - Create/decision modals for workflow
  - Justification and response tracking
- ✅ **Internal Messages** (`/admin/messages`):
  - Inbox and sent views
  - Compose message modal
  - Broadcast to all team members
  - Read/unread tracking
  - Priority: urgent or normal
- ✅ **Announcements** (`/admin/announcements`):
  - Types: urgent, important, info
  - Pinned announcements
  - Expiry dates
  - CRUD for super admins
- ✅ **Location Settings Enhancement**:
  - District/neighborhood filtering with cascading dropdowns
  - Improved location selection in settings
- ✅ **Documentation Updates**:
  - Updated PRD.md to v4.0
  - Updated README.md with Week 4 features
  - Updated claude.md with Week 4 progress

### Work Session Nov 28, 2025 - Provider Dashboard Performance Optimization ✅
- ✅ **Orders Page Optimization**: Combined order items query with orders query using JOIN
  - Reduced database calls from N+1 to 1 single query
  - Faster order loading with embedded items
- ✅ **Dashboard Stats Optimization**: Parallelized all statistics queries using Promise.all
  - Reduced 5 sequential queries to 4 parallel queries
  - Combined totalOrders and customersData into single query
  - Significant improvement in dashboard loading time
- ✅ **Reports Page Optimization**: Parallelized orders and order_items queries
  - Both queries now run simultaneously
  - Removed duplicate order_items query
- ✅ **Code Quality Review**: All provider dashboard pages reviewed and approved
  - Consistent brand colors (Engezna Blue #009DE0)
  - Proper RTL support throughout
  - TypeScript types properly defined
  - Error handling in place

### Work Session Nov 27, 2025 - Brand Identity Refresh & Navigation Standards ✅
- ✅ **Brand Color Update**: Changed from Orange (#E85D04) to Engezna Blue (#009DE0)
- ✅ **Light-Only Theme**: Removed dark mode for simplified development and consistent brand
- ✅ **New Navigation Bars**: Implemented new customer and provider navigation
- ✅ **Fixed Dropdown Hover Issue**: Resolved gap between trigger and dropdown content
- ✅ **Improved Button Visibility**: Added explicit hover states for ghost buttons
- ✅ **RTL Arrow Fix**: Dynamic arrow direction based on locale
- ✅ **Documentation Updates**:
  - Updated BRAND_IDENTITY_GUIDE.md (v2.0) - Added navigation standards, lessons learned
  - Updated BRAND_IMPLEMENTATION_GUIDE.md (v2.0) - Added implementation code examples
  - Updated engezna-theme.css (v2.0) - Added navigation component styles
  - Updated README.md, PRD.md, claude.md with new brand info

### Lessons Learned (Brand Refresh)
| Problem | Root Cause | Solution |
|---------|------------|----------|
| Dropdown closes on hover | CSS gap between trigger and menu | Use `mt-0` and `top-full` |
| Ghost buttons invisible | No hover background defined | Add `hover:bg-muted` |
| RTL arrows wrong direction | Hardcoded arrow icons | Check `isRTL` and swap icons |
| Dark mode complexity | Two themes to maintain | Simplified to light-only |

### Work Session Nov 27, 2025 - Provider Enhancements ✅
- ✅ **Provider Profile Page**: Created `/provider/profile` with comprehensive settings
  - Account info display with email/avatar
  - Language switcher (Arabic/English) with locale redirect
  - Inline password change form (no redirect to customer profile)
  - Sign out functionality
- ✅ **Product Categories**: Added category dropdown to add/edit product pages
  - Inline category creation with Arabic/English names
  - Categories are provider-specific
  - Database table: `product_categories`
- ✅ **Enhanced Promotions**: Added specific product selection
  - "Applies To" toggle (All Products / Specific Products)
  - Multi-select checkbox list for product selection
  - Validation for at least one product when specific is chosen
- ✅ **Auto-Refresh Orders**: Orders page refreshes every 60 seconds
- ✅ **Fixed .single() queries**: Changed to .limit(1) across all provider pages

### Work Session Nov 26, 2025 - Finance & Payments ✅
- ✅ **Finance Page**: Created `/provider/finance` with comprehensive financial dashboard
  - Total earnings card with all-time earnings
  - Pending payout card showing next payment
  - Commission breakdown showing 6% platform fee
  - This month vs last month earnings comparison
  - Payout schedule information (weekly on Sundays)
  - Transaction history with date range filtering
  - Net earnings calculation (after commission)
- ✅ **Dashboard Link**: Added Finance card to provider dashboard
- ✅ **Translations**: Added 40+ new keys for finance namespace (AR/EN)
- ✅ **Code Metrics**: ~450 lines in new page

### Work Session Nov 26, 2025 - Reports & Analytics ✅
- ✅ **Reports Page**: Created `/provider/reports` with comprehensive analytics
  - Revenue cards: Today, This Week, This Month, Last Month with growth %
  - Order stats: Total, Completed, Customers, Avg Order Value
  - Revenue chart: Last 30 days with hover tooltips
  - Top 5 selling products with rankings
  - Completion rate and cancellation rate metrics
- ✅ **Dashboard Link**: Added Reports card to provider dashboard
- ✅ **Translations**: Added 40+ new keys for reports namespace (AR/EN)
- ✅ **Code Metrics**: ~450 lines in new page

### Work Session Nov 26, 2025 - Promotions Management ✅
- ✅ **Promotions Page**: Created `/provider/promotions` with full promotion management
  - Stats row: active, upcoming, expired, total
  - Filter tabs: All, Active, Upcoming, Expired
  - Create/Edit promotion modal with form
  - 3 promotion types: Percentage, Fixed Amount, Buy X Get Y
  - Date range (start/end), minimum order, max discount options
  - Toggle promotion active/inactive
  - Delete promotion with confirmation
- ✅ **Dashboard Link**: Added Promotions card to provider dashboard
- ✅ **Translations**: Added 60+ new keys for promotions namespace (AR/EN)
- ✅ **Code Metrics**: ~700 lines in new page

### Work Session Nov 26, 2025 - Provider Settings Page ✅
- ✅ **Provider Settings Page**: Created `/provider/settings` with tabbed interface
  - Store Info tab: Edit name (AR/EN), phone, governorate/city, address, logo
  - Delivery tab: Edit delivery fee, time, minimum order, radius
  - Status tab: Toggle store status (Open/Temporarily Paused/Closed)
  - Quick links to Store Hours, Products, Orders
- ✅ **Dashboard Link**: Added Settings card to provider dashboard
- ✅ **Translations**: Added 50+ new keys for providerSettings namespace (AR/EN)
- ✅ **Code Metrics**: ~600 lines in new page

### Work Session Nov 26, 2025 - Store Hours Management ✅
- ✅ **Store Hours Page**: Created `/provider/store-hours` with full weekly schedule management
  - Weekly schedule for all 7 days (Saturday-Friday)
  - Toggle each day open/closed
  - Time dropdowns with 30-minute intervals
  - Quick actions: Open all days / Close all days
  - Copy hours from one day to all days
  - Summary showing open/closed days count
- ✅ **Database Integration**: Saves to `business_hours` JSONB in providers table
- ✅ **Dashboard Link**: Added Store Hours card to provider dashboard
- ✅ **Translations**: Added 25+ new keys for storeHours namespace (AR/EN)
- ✅ **Code Metrics**: ~300 lines in new page

### Work Session Nov 26, 2025 - Menu Management System ✅
- ✅ **Products List Page**: Created `/provider/products` with full product management
  - Stats row: total products, available, unavailable
  - Filter tabs: All, Available, Unavailable
  - Search by product name/description
  - Product cards with image, price, discount badge, availability
  - Toggle availability (show/hide)
  - Delete with confirmation
- ✅ **Add Product Page**: Created `/provider/products/new`
  - Product info: name (AR/EN), description (AR/EN)
  - Pricing: price, original price (for discounts)
  - Attributes: vegetarian, spicy, prep time, calories
  - Availability toggle
  - Image upload to Supabase Storage
- ✅ **Edit Product Page**: Created `/provider/products/[id]`
  - Load existing product data
  - Update all fields
  - Delete product option
- ✅ **Translations**: Added 70+ new keys for products (AR/EN)
  - Complete providerProducts namespace
- ✅ **Code Metrics**: ~1200 lines across 3 new pages

### Work Session Nov 26, 2025 - Provider Orders Management ✅
- ✅ **Provider Orders Page**: Created `/provider/orders` with full order management
  - Stats row: new orders, in progress, completed, total
  - Filter tabs: All, New, In Progress, Completed, Cancelled
  - Order cards with customer info, items preview, delivery address
  - Accept/Reject buttons for pending orders
  - Progressive status updates (Accepted → Preparing → Ready → Out for Delivery → Delivered)
- ✅ **Order Detail Page**: Created `/provider/orders/[id]`
  - Full status timeline with timestamps
  - Customer information with call button
  - Complete order items list with prices
  - Payment information with status
  - Net earnings display (total minus platform commission)
  - Action buttons for status updates
- ✅ **Translations**: Added 70+ new keys for provider orders (AR/EN)
  - Complete providerOrders namespace
  - Status labels, actions, empty states, time formatting
- ✅ **Code Metrics**: ~900 lines across 2 new pages

### Work Session Nov 26, 2025 - Partner Registration System ✅
- ✅ **Partner Registration Page**: Created `/partner/register` with multi-step flow
  - Step 1: Personal info (name, email, phone, password)
  - Step 2: Business category + Partner role dropdowns
  - Creates provider record with status "incomplete"
- ✅ **Complete Profile Page**: Created `/provider/complete-profile`
  - Store info: name (AR/EN), phone, governorate/city cascade, address
  - Logo upload with preview (2MB limit, image validation)
  - Delivery settings: fee, time, minimum order, radius
  - Progress bar showing completion percentage
  - Submits for review → status "pending_approval"
- ✅ **Provider Dashboard Updates**: Status-aware content
  - "incomplete" → Shows complete profile prompt
  - "pending_approval" → Shows under review message
  - "rejected" → Shows rejection reason + resubmit button
  - "approved/open/closed" → Shows full dashboard with orders/products links
- ✅ **Database Migration**: Added new provider categories and statuses
  - New categories: juice_shop, pharmacy
  - New statuses: incomplete, approved, rejected
  - Added partner_role column to profiles
- ✅ **Translations**: Added 50+ new keys for partner registration (AR/EN)
- ✅ **Code Metrics**: ~800 lines across 2 new pages + dashboard updates

### Work Session Nov 26, 2025 - Address Form Fix ✅
- ✅ **District Dropdown Fix**: Fixed `loadDistricts` function
- ✅ **Cascade Logic**: Districts cascade from City via `city_id`
- ✅ **Address Form Complete**: Governorate → City → District working

### Work Session Nov 25, 2025 - Settings System ✅
- ✅ **Multi-Page Settings System**: 7 dedicated pages
- ✅ **Database Migration**: Added governorate_id and city_id to profiles

---

## 💡 Key Decisions

1. **Tailwind v3** (not v4) - v4 has breaking changes
2. **Provider-based structure** - supports 6 categories
3. **Providers manage delivery** - enables 5-7% commission
4. **Cash-first** - cards in Phase 2
5. **Orange #E85D04** - official brand color
6. **Multi-step partner registration** - Better UX, incomplete tracking
7. **Admin approval required** - Quality control for partners

---

## 📁 Important Files

### Core Files
- `claude.md` - This file (project guide)
- `PRD.md` - Full requirements
- `src/app/globals.css` - Brand colors
- `package.json` - Dependencies (Tailwind v3)

### Partner Registration
- `src/app/[locale]/partner/register/page.tsx` - Partner signup
- `src/app/[locale]/provider/complete-profile/page.tsx` - Complete business info
- `src/app/[locale]/provider/page.tsx` - Status-aware dashboard

### Provider Orders Management
- `src/app/[locale]/provider/orders/page.tsx` - Orders list with filters & actions
- `src/app/[locale]/provider/orders/[id]/page.tsx` - Order detail with status updates

### Menu Management System
- `src/app/[locale]/provider/products/page.tsx` - Products list with search & filters
- `src/app/[locale]/provider/products/new/page.tsx` - Add new product form
- `src/app/[locale]/provider/products/[id]/page.tsx` - Edit product form
- `src/i18n/messages/ar.json` - Arabic translations (providerProducts namespace)
- `src/i18n/messages/en.json` - English translations (providerProducts namespace)

### Store Hours Management
- `src/app/[locale]/provider/store-hours/page.tsx` - Weekly schedule management

### Provider Settings
- `src/app/[locale]/provider/settings/page.tsx` - Store info, delivery, and status settings

### Promotions Management
- `src/app/[locale]/provider/promotions/page.tsx` - Promotions CRUD with types and scheduling

### Reports & Analytics
- `src/app/[locale]/provider/reports/page.tsx` - Revenue, orders, and performance analytics

### Finance & Payments
- `src/app/[locale]/provider/finance/page.tsx` - Earnings, payouts, and transaction history

### Provider Profile (NEW)
- `src/app/[locale]/provider/profile/page.tsx` - Profile, language, theme, password

### Admin Dashboard (Week 4)
- `src/components/admin/AdminHeader.tsx` - Unified admin header with language switcher
- `src/components/admin/AdminSidebar.tsx` - Collapsible admin navigation
- `src/components/admin/index.ts` - Admin component exports
- `src/lib/utils/formatters.ts` - Locale-aware number formatting utility
- `src/app/[locale]/admin/supervisors/page.tsx` - Supervisor management
- `src/app/[locale]/admin/tasks/page.tsx` - Tasks management
- `src/app/[locale]/admin/approvals/page.tsx` - Approvals workflow
- `src/app/[locale]/admin/messages/page.tsx` - Internal messaging
- `src/app/[locale]/admin/announcements/page.tsx` - Team announcements

### Admin Backend Integration (Week 5 - Phase 0)
- `src/lib/admin/types.ts` - TypeScript types for admin module
- `src/lib/admin/audit.ts` - Audit logging functions
- `src/lib/admin/providers.ts` - Provider management functions
- `src/lib/admin/users.ts` - User management functions
- `src/lib/admin/statistics.ts` - Dashboard statistics functions
- `src/lib/admin/index.ts` - Admin module exports
- `src/hooks/admin/useAdminProviders.ts` - Provider management hook
- `src/hooks/admin/useAdminStats.ts` - Statistics hooks
- `src/app/api/admin/providers/route.ts` - Providers API route
- `src/app/api/admin/users/route.ts` - Users API route
- `src/app/api/admin/stats/route.ts` - Statistics API route
- `src/app/[locale]/admin/providers/[id]/page.tsx` - Provider detail page

---

## ✅ Storage Bucket Setup (COMPLETED Dec 1, 2025)

The Supabase Storage bucket is now configured:
- ✅ Bucket `public` created with 2MB file size limit
- ✅ Allowed MIME types: jpeg, png, webp, gif
- ✅ Storage policies active (Public Read, Auth Upload/Update/Delete)
- ✅ Logo and product image uploads functional

---

**Version:** 32.0 (Session 15 - Dynamic Footer & Analytics)
**Last Updated:** December 7, 2025 (Session 15 continued)
**Next Review:** December 8, 2025

**🎉 Session 15 (Part 2): Dynamic Footer & Governorate Analytics!**
- ✅ Footer ديناميكي للمحافظات من قاعدة البيانات
- ✅ تحديث "المدن" إلى "المحافظات" في الترجمات
- ✅ تبويب تحليلات التوسع في صفحة المواقع للأدمن
- ✅ مؤشر جاهزية التوسع لكل محافظة (0-100%)
- ✅ توصيات ذكية للتوسع

**🎉 Session 15 (Part 1): Voice to Chat Transition (دردش واطلب)!**
- ✅ إصلاح وميض شارة الإشعارات
- ✅ تحويل ميزة الطلب الصوتي إلى الدردشة النصية
- ✅ ChatFAB بدلاً من VoiceOrderFAB
- ✅ TextChat بدلاً من VoiceOrderChat
- ✅ إزالة Deepgram والإبقاء على OpenAI

**🎉 Session 14: Financial UX & Security Updates!**
- ✅ Security Update: Patched CVE-2025-55182 & CVE-2025-66478 (RCE vulnerabilities)
- ✅ Finance Page: Fixed color consistency with brand identity
- ✅ Orders Page: Added filter counts + payment confirmation button
- ✅ Payment Flow: Direct "Payment Received" button on order cards

**🎉 Week 5: Session 12-13 Complete!**
- ✅ Order Cancellation: Customers can cancel pending/confirmed/accepted orders
- ✅ Reviews & Ratings: Complete system for customers to rate and review providers
- ✅ Provider Reviews Page: Dashboard for providers to view and respond to reviews
- ✅ Favorites Feature: Customers can favorite providers
- ✅ Real-time Notifications: Supabase Realtime for live updates
- ✅ Promo Codes: Full promo system with validation and checkout integration
- ✅ Customer Notifications: Automatic notifications on order status changes
- ✅ Admin Notifications: Alerts for cancellations, new providers, support tickets

**🎉 Week 5: Analytics Geographic Filtering Fixed!**
- Fixed admin analytics showing zeros when filtering by governorate
- Added fallback name-based filtering for old orders without geographic IDs
- Both main analytics and regional analytics now properly support filtering

**🎉 Week 5: Admin Backend Integration Phase 0 Complete!**
- Full admin dashboard with unified components (AdminHeader, AdminSidebar)
- Supervisor management with roles and permissions
- Roles management page (`/admin/roles`) - View, Edit, Create, Delete roles
- Tasks management with assignment and tracking
- Approvals workflow system
- Internal messaging and team announcements

---

## 🚀 Week 5: Customer Journey + PWA (IN PROGRESS)

### الخطة الجديدة - تحسين واجهة العملاء

#### المرحلة 0: PWA Setup
- [x] Create manifest.json with Engezna branding ✅
- [x] Update layout.tsx with PWA metadata ✅
- [x] Create InstallPrompt component ✅
- [ ] Create PWA icons (72-512px)

#### المرحلة 1: المكونات المشتركة
- [x] CustomerLayout (wrapper with header + bottom nav) ✅
- [x] CustomerHeader (location, notifications, profile) ✅
- [x] BottomNavigation (home, browse, cart, favorites, profile) ✅
- [x] ProviderCard (unified store card) ✅
- [x] ProductCard (menu item card) ✅
- [x] SearchBar ✅
- [x] CategoryChip ✅
- [x] FilterChip ✅
- [x] RatingStars ✅
- [x] PriceTag ✅
- [x] StatusBadge ✅
- [x] QuantitySelector ✅
- [x] EmptyState ✅

#### المرحلة 2: الصفحات الجديدة
- [x] HeroSection (hero with search and location) ✅
- [x] CategoriesSection (horizontal scrolling categories) ✅
- [x] OffersCarousel (offers carousel) ✅
- [x] Cart page `/cart` ✅
- [x] Favorites page `/favorites` ✅
- [x] Offers page `/offers` ✅
- [x] Improved providers listing with search, filter, sort ✅
- [x] Improved provider detail with ProductCard and sticky category nav ✅

#### المرحلة 3: Hooks & Database
- [x] favorites table created ✅
- [x] useFavorites hook ✅
- [x] useProviders hook (with filters) ✅
- [x] useCart hook improvements ✅

#### المرحلة 4: الترجمات
- [x] Add all new translation keys (AR/EN) ✅
- [x] PWA translations ✅
- [x] Customer journey translations ✅

### الملفات الجديدة المنشأة
```
src/
├── components/
│   ├── customer/
│   │   ├── layout/
│   │   │   ├── CustomerLayout.tsx ✅
│   │   │   ├── CustomerHeader.tsx ✅
│   │   │   └── BottomNavigation.tsx ✅
│   │   ├── shared/
│   │   │   ├── ProviderCard.tsx ✅
│   │   │   ├── ProductCard.tsx ✅
│   │   │   ├── SearchBar.tsx ✅
│   │   │   ├── CategoryChip.tsx ✅
│   │   │   ├── FilterChip.tsx ✅
│   │   │   ├── RatingStars.tsx ✅
│   │   │   ├── PriceTag.tsx ✅
│   │   │   ├── StatusBadge.tsx ✅
│   │   │   ├── QuantitySelector.tsx ✅
│   │   │   ├── EmptyState.tsx ✅
│   │   │   └── index.ts ✅
│   │   └── home/
│   │       ├── HeroSection.tsx ✅
│   │       ├── CategoriesSection.tsx ✅
│   │       ├── OffersCarousel.tsx ✅
│   │       └── index.ts ✅
│   └── pwa/
│       ├── InstallPrompt.tsx ✅
│       └── index.ts ✅
├── hooks/
│   └── customer/
│       ├── useFavorites.ts ✅
│       └── useProviders.ts ✅
└── app/[locale]/
    ├── cart/page.tsx ✅
    ├── favorites/page.tsx ✅
    └── offers/page.tsx ✅
```

### تحسينات الصفحات الموجودة
- **`/providers`**: أضيف SearchBar، FilterChip للفلترة والترتيب، EmptyState
- **`/providers/[id]`**: أضيف ProductCard، RatingStars، StatusBadge، sticky category navigation

---

## 📋 Session 15 Part 2: Dynamic Footer & Analytics (December 7, 2025)

### ✅ المهام المكتملة

#### 1. Footer ديناميكي للمحافظات
- **الحالة:** ✅ مكتمل
- **الوصف:** ربط شريط المحافظات في الـ Footer بقاعدة البيانات
- **التغييرات:**
  - Footer يجلب المحافظات النشطة من Supabase تلقائياً
  - عند إضافة/إزالة محافظة من Admin، تظهر/تختفي في Footer
  - إضافة حالة تحميل (loading spinner)
  - إضافة fallback "قريباً" عند عدم وجود محافظات
- **الملفات:**
  - `src/components/shared/Footer.tsx` - إضافة useEffect لجلب البيانات
  - `src/i18n/messages/ar.json` - تغيير availableCities → availableGovernorates
  - `src/i18n/messages/en.json` - تغيير availableCities → availableGovernorates

#### 2. تبويب تحليلات التوسع في صفحة المواقع
- **الحالة:** ✅ مكتمل
- **الوصف:** إضافة أدوات تحليل متقدمة للسوبر أدمن لمساعدته في قرارات التوسع
- **المميزات:**
  - تبويب جديد "تحليلات التوسع" (للسوبر أدمن فقط)
  - إحصائيات إجمالية: مقدمي خدمات، عملاء، طلبات، إيرادات
  - جدول تصنيف المحافظات حسب الجاهزية
  - مؤشر جاهزية التوسع (0-100%) لكل محافظة
  - معادلة الجاهزية: مقدمي خدمات (40%) + عملاء (30%) + طلبات (20%) + تغطية جغرافية (10%)
  - مؤشر النمو (مقارنة آخر 30 يوم بالـ 30 يوم السابقين)
  - توصيات ذكية للتوسع:
    - محافظات واعدة للتفعيل
    - محافظات تحتاج تطوير
    - المحافظات الأفضل أداءً
- **الملف:** `src/app/[locale]/admin/locations/page.tsx`

### 📁 الملفات المُعدّلة

| الملف | النوع | الوصف |
|-------|-------|-------|
| `src/components/shared/Footer.tsx` | تعديل | جلب المحافظات من قاعدة البيانات + حالة التحميل |
| `src/i18n/messages/ar.json` | تعديل | تغيير "المدن المتاحة" → "المحافظات المتاحة" |
| `src/i18n/messages/en.json` | تعديل | تغيير "Available Cities" → "Available Governorates" |
| `src/app/[locale]/admin/locations/page.tsx` | تعديل | إضافة تبويب التحليلات + GovernorateAnalytics |

### 📊 معادلة الجاهزية (Readiness Score)

```
Readiness Score = Provider Score + Customer Score + Order Score + Coverage Score

- Provider Score = min(active_providers × 10, 40)  // max 40%
- Customer Score = min(customers × 3, 30)          // max 30%
- Order Score = min(completed_orders × 2, 20)      // max 20%
- Coverage Score = min((cities + districts) × 2, 10) // max 10%
```

---

## 📋 Session 15 Part 1: Voice to Chat Transition (December 7, 2025)

### ✅ المهام المكتملة

#### 1. إصلاح وميض شارة الإشعارات
- **الحالة:** ✅ مكتمل
- **المشكلة:** شارة عدد الإشعارات كانت تومض بسرعة مرهقة للعين (animate-pulse)
- **الحل:** إزالة كلاس `animate-pulse` من شارة العدد
- **الملف:** `src/components/customer/layout/CustomerHeader.tsx`

#### 2. تحويل ميزة الطلب الصوتي إلى الدردشة النصية
- **الحالة:** ✅ مكتمل
- **المفهوم الجديد:** "دردش واطلب" بدلاً من "اطلب بصوتك"
- **التغييرات:**
  - تحويل `VoiceOrderFAB` إلى `ChatFAB` (أيقونة رسالة بدل ميكروفون)
  - إنشاء `TextChat.tsx` بدلاً من `VoiceOrderChat.tsx` (إدخال نص فقط)
  - تحديث `HeroSection.tsx` (إزالة زر الميكروفون الكبير + تغيير النصوص)
  - تحديث `SearchBar.tsx` (إزالة أيقونة الميكروفون)
  - حذف `VoiceOrderButton.tsx` (لم يعد مطلوباً)
  - حذف Deepgram transcribe API route
  - الإبقاء على OpenAI للمعالجة الذكية للطلبات

#### 3. تحديث الصفحات الرئيسية
- تحديث `/[locale]/page.tsx` لاستخدام ChatFAB و onChatClick
- تحديث `/[locale]/providers/page.tsx` لاستخدام ChatFAB
- تحديث رسالة الترحيب في useVoiceOrder hook

### 📁 الملفات المُعدّلة/المنشأة

| الملف | النوع | الوصف |
|-------|-------|-------|
| `src/components/customer/layout/CustomerHeader.tsx` | تعديل | إزالة animate-pulse من شارة الإشعارات |
| `src/components/customer/voice/VoiceOrderFAB.tsx` | تعديل | تحويل إلى ChatFAB مع أيقونة MessageCircle |
| `src/components/customer/voice/TextChat.tsx` | جديد | مكون الدردشة النصية مع OpenAI |
| `src/components/customer/voice/index.ts` | تعديل | تحديث الـ exports |
| `src/components/customer/home/HeroSection.tsx` | تعديل | إزالة زر الميكروفون + تغيير النصوص |
| `src/components/customer/shared/SearchBar.tsx` | تعديل | إزالة onVoiceClick و Mic icon |
| `src/app/[locale]/page.tsx` | تعديل | استخدام ChatFAB و handleChatClick |
| `src/app/[locale]/providers/page.tsx` | تعديل | استخدام ChatFAB |
| `src/hooks/customer/useVoiceOrder.ts` | تعديل | تحديث رسالة الترحيب |

### 🗑️ الملفات المحذوفة

| الملف | السبب |
|-------|-------|
| `src/components/customer/voice/VoiceOrderButton.tsx` | لم يعد مطلوباً (لا تسجيل صوتي) |
| `src/components/customer/voice/VoiceOrderChat.tsx` | تم استبداله بـ TextChat.tsx |
| `src/app/api/voice-order/transcribe/route.ts` | لم يعد مطلوباً (لا Deepgram) |

### 📊 ملخص التغييرات

- ❌ **تم إزالة:** زر الميكروفون الكبير، أيقونات الميكروفون، تسجيل الصوت، Deepgram API
- ✅ **تم الإبقاء على:** OpenAI للمعالجة الذكية، سلة المشتريات، تأكيد الطلب
- 🔄 **تم التحويل:** VoiceOrderFAB → ChatFAB، VoiceOrderChat → TextChat
- 🌐 **المفهوم الجديد:** "دردش واطلب" / "Chat & Order"

---

## 📋 Session 14: Financial UX & Security Updates (December 6, 2025)

### ✅ المهام المكتملة

#### 1. إصلاح تناسق الألوان في صفحة المالية
- **الحالة:** ✅ مكتمل
- **المشكلة:** استخدام ألوان amber من Tailwind بدلاً من ألوان الهوية التجارية
- **الحل:**
  - استبدال `bg-amber-50`, `text-amber-600` بمتغيرات CSS للهوية
  - استخدام `--warning`, `--premium`, `--deal`, `--info` من globals.css
  - إصلاح لون نص المعاملات المعلقة ليكون أسهل في القراءة (`text-amber-600`)
- **الملفات:** `src/app/[locale]/provider/finance/page.tsx`

#### 2. تحديث أمني عاجل (CVE-2025-55182 & CVE-2025-66478)
- **الحالة:** ✅ مكتمل
- **الخطورة:** 10.0 CVSS (أقصى خطورة) - تنفيذ أكواد خبيثة عن بُعد (RCE)
- **التحديثات:**
  - Next.js: `^16.0.7` → `16.0.7` (ثابت)
  - React: `^19.2.0` → `19.2.1` (مُصحح)
  - React-DOM: `^19.2.0` → `19.2.1` (مُصحح)
- **الملفات:** `package.json`

#### 3. تحسين UX صفحة الطلبات للمزودين
- **الحالة:** ✅ مكتمل
- **التحسينات:**
  - إضافة أرقام العد لفلاتر "جاهز"، "مكتمل"، "ملغي"
  - إضافة زر "تم استلام المبلغ" مباشرة على كارت الطلب
  - إضافة شارة حالة الدفع (تم الدفع / معلق) للطلبات المكتملة
  - استعلام `payment_status` من قاعدة البيانات
  - دالة `handleConfirmPayment` لتحديث حالة الدفع
- **الملفات:** `src/app/[locale]/provider/orders/page.tsx`

### 📁 الملفات المُعدّلة في هذه الجلسة

| الملف | الوصف |
|-------|-------|
| `src/app/[locale]/provider/finance/page.tsx` | إصلاح تناسق الألوان مع الهوية التجارية |
| `src/app/[locale]/provider/orders/page.tsx` | إضافة أرقام الفلاتر + زر تأكيد الدفع |
| `package.json` | تحديث أمني لـ Next.js و React |

### 📊 الـ Commits

```
780c74e feat: Improve orders page UX with counts and payment button
9ce7b07 security: Update React and Next.js to patched versions for CVE-2025-55182
1c36ba1 fix: Use darker amber color for pending transaction text for better readability
525af44 fix: Align finance page colors with brand identity
```

### 🔧 الخطوات المقترحة للجلسة القادمة

1. **تحسينات الإشعارات:**
   - إضافة إشعار للعميل عند تأكيد استلام المبلغ
   - التحقق من عمل Hover dropdown للإشعارات في جميع الواجهات

2. **تحسينات صفحة التقارير:**
   - إضافة فلترة حسب حالة الدفع (مؤكد/معلق)
   - إضافة تصدير التقارير (Excel/PDF)

3. **تحسينات صفحة المالية:**
   - إضافة رسم بياني لتطور الإيرادات
   - إضافة مقارنة بين الفترات

4. **اختبارات:**
   - اختبار تدفق تأكيد الدفع كامل على الإنتاج
   - التحقق من التحديث الأمني على Vercel
   - اختبار إشعارات المزود (الطلبات + التقييمات)

### ✅ مهام تم إكمالها في جلسات سابقة (للمرجعية):
- ✅ إصلاح Reviews RLS infinite recursion (Session 13)
- ✅ دمج عدد الإشعارات (طلبات + تقييمات) في badge واحد (Session 13)
- ✅ Hover dropdown للإشعارات (Session 13)
- ✅ زر تأكيد استلام المبلغ على order detail (Session 13) + orders list (Session 14)

---

## 📋 Session 13: Notifications & Reviews Fix (December 5, 2025)

### ✅ المهام المكتملة

#### 1. إصلاح مشكلة البروموكود على الموبايل
- **الحالة:** ✅ مكتمل
- **السبب:** كانت مشكلة Cache
- **الحل:** تم إضافة hydration tracking لـ zustand cart store
- **الملف:** `src/store/cartStore.ts`

#### 2. نظام إشعارات العملاء (Customer Notifications)
- **الحالة:** ✅ مكتمل
- **ما تم إنجازه:**
  - إنشاء جدول `customer_notifications` جديد
  - Trigger تلقائي لإرسال إشعار عند تغيير حالة الطلب
  - تحديث `useNotifications` hook للعمل مع الجدول الجديد
  - تحديث صفحة الإشعارات لعرض الأنواع الجديدة
- **الملفات:**
  - `supabase/migrations/20251205000001_fix_notifications_and_reviews.sql`
  - `src/hooks/customer/useNotifications.ts`
  - `src/app/[locale]/notifications/page.tsx`

#### 3. نظام إشعارات الأدمن (Admin Notifications)
- **الحالة:** ✅ مكتمل
- **ما تم إنجازه:**
  - إشعار عند إلغاء طلب من أي طرف
  - إشعار عند تسجيل مزود خدمة جديد
  - إشعار عند إنشاء تذكرة دعم فني
  - إشعار عند طلب موافقة
  - Function لفحص الطلبات المتأخرة (أكثر من ساعتين)
- **الملف:** `supabase/migrations/20251205000002_fix_reviews_and_add_admin_notifications.sql`

#### 4. تفعيل pg_cron للطلبات المتأخرة
- **الحالة:** ✅ مكتمل
- **ما تم إنجازه:**
  - تفعيل pg_cron extension
  - جدولة فحص الطلبات المتأخرة كل 30 دقيقة
  - Function `check_delayed_orders_and_notify()` لإرسال تنبيهات

### ⚠️ المهام المعلقة

#### مشكلة التقييمات (Reviews) - لم تُحل بعد
- **الحالة:** ❌ لم تُحل
- **الخطأ:** `infinite recursion detected in policy for relation "providers"`
- **المحاولات:**
  1. Migration 1: تبسيط RLS policies
  2. Migration 2: إصلاح إضافي
  3. Migration 3: استخدام SECURITY DEFINER functions
- **الملف الأخير:** `supabase/migrations/20251205000003_urgent_fix_reviews_rls.sql`
- **السبب المحتمل:** المشكلة في policy على جدول `providers` نفسه وليس `reviews`
- **الحل المقترح:** فحص وإصلاح RLS policies على جدول `providers`

### 📁 الملفات المُعدّلة في هذه الجلسة

| الملف | الوصف |
|-------|-------|
| `supabase/migrations/20251205000001_fix_notifications_and_reviews.sql` | جدول إشعارات العملاء + triggers |
| `supabase/migrations/20251205000002_fix_reviews_and_add_admin_notifications.sql` | إشعارات الأدمن + pg_cron function |
| `supabase/migrations/20251205000003_urgent_fix_reviews_rls.sql` | محاولة إصلاح RLS للتقييمات |
| `src/hooks/customer/useNotifications.ts` | تحديث للعمل مع customer_notifications |
| `src/app/[locale]/notifications/page.tsx` | تحديث عرض الإشعارات |
| `src/app/[locale]/orders/[id]/page.tsx` | إضافة debugging للتقييمات |
| `src/store/cartStore.ts` | إضافة hydration tracking |

### 📊 الـ Commits

```
f2293ce fix: Add SECURITY DEFINER functions to fix reviews RLS infinite recursion
e018d3b feat: Fix reviews RLS and add comprehensive admin notifications
4317bbf fix: Fix notifications build error and update admin notification logic
3926332 feat: Add customer notifications and fix admin notifications
91f179c fix: Add hydration check and better debugging for mobile promo code issues
```

### 🔧 الخطوات المطلوبة للجلسة القادمة

1. **إصلاح مشكلة التقييمات:**
   - فحص RLS policies على جدول `providers` بالكامل
   - قد تكون المشكلة في policy على providers تتحقق من reviews
   - إنشاء SECURITY DEFINER functions لكل استعلام يتضمن providers

---
