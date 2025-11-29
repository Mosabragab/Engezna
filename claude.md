# Claude Project Guide - Engezna (إنجزنا)

**Last Updated:** November 29, 2025
**Status:** Week 4 - 100% Complete ✅ (Admin Dashboard + Supervisor System)
**Branch:** `main`

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

## 🎯 Project Overview
- **Name:** Engezna (إنجزنا) - "Let's get it done and order!"
- **Launch:** February 21, 2026 (3 months)
- **Business Model:** 5-7% commission (vs competitors' 15-20%)
- **Status:** Week 3 In Progress - Store Hours Management Complete ✅
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
- [x] Dark mode + RTL support
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
  - [x] Roles: super_admin, general_moderator, support, finance ✅
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

---

## ⚠️ What's NOT Working Yet

### Admin Panel (Backend Integration Pending)
- ❌ **Backend integration** - UI is complete but not connected to actual database operations
- ❌ **User management backend** - Cannot actually manage users from DB
- ❌ **Provider approval backend** - Cannot approve/reject providers from DB
- ❌ **Platform analytics backend** - Stats are mock data, not real queries
- ❌ **Financial reporting backend** - No actual payment/settlement processing

### Payment Integration
- ❌ Online payment (Fawry) - NOT integrated, only Cash on Delivery works
- ❌ Card payments - NOT available
- ❌ Vodafone Cash - NOT available

### Notifications
- ❌ Real-time push notifications - No Firebase integration
- ❌ SMS notifications - No Twilio/SMS provider integration
- ❌ Email notifications - No transactional emails (order updates, etc.)

### Customer Features Missing
- ❌ Order cancellation - Customers cannot cancel orders
- ❌ Reviews/Ratings - Cannot rate providers or leave reviews
- ❌ Favorite restaurants - No favorites/wishlist feature
- ❌ Promo codes - Cannot apply discount codes
- ❌ Scheduled orders - Cannot order for later

### Provider Features Missing
- ❌ Real-time order notifications - Only auto-refresh every 60s, no push
- ❌ Supabase Storage bucket - SQL provided but NOT executed (logo uploads may fail)
- ❌ Multi-user support - No staff accounts for providers
- ❌ Inventory management - No stock tracking

### Other Missing Features
- ❌ Google Maps integration - No map display or geocoding
- ❌ Search functionality - No full-text search across providers
- ❌ Customer support chat - No in-app support

---

## 📦 Tech Stack

- **Framework:** Next.js 16.0.3 (Turbopack)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS v3.4.17 (stable)
- **UI:** Shadcn/ui (13 components)
- **Database:** Supabase (PostgreSQL 15)
- **i18n:** next-intl 4.5.5
- **Theme:** next-themes
- **Forms:** React Hook Form + Zod
- **State:** Zustand

---

## 🎯 Next Steps (Week 5+)

### High Priority
1. [ ] **Admin Backend Integration** - Connect admin UI to actual database operations
2. [ ] **Execute Supabase Storage SQL** - Required for logo/image uploads
3. [ ] **Payment Integration (Fawry)** - Online payment support

### Medium Priority
4. [ ] Customer reviews and ratings system
5. [ ] Order cancellation flow for customers
6. [ ] Real-time notifications (Supabase Realtime or Firebase)
7. [ ] Email transactional notifications

### Lower Priority
8. [ ] Support/Help page `/provider/support`
9. [ ] Promo codes system
10. [ ] Favorites/wishlist feature
11. [ ] Google Maps integration

---

## 🐛 Recent Fixes

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
  - Roles: super_admin, general_moderator, support, finance
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

---

## ⚠️ Pending Setup (Required for Logo Upload)

Run this SQL in Supabase to enable logo uploads:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public', 'public', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'public');
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'public' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'public' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'public' AND auth.role() = 'authenticated');
```

---

**Version:** 18.0 (Week 4 Complete - Admin Dashboard + Supervisor System)
**Last Updated:** November 29, 2025
**Next Review:** December 6, 2025

**🎉 Week 4 Complete!**
- Full admin dashboard with unified components (AdminHeader, AdminSidebar)
- Supervisor management with roles and permissions
- Tasks management with assignment and tracking
- Approvals workflow system
- Internal messaging and team announcements
- Locale-aware number formatting (Arabic-Indic numerals)
- District/neighborhood filtering in location settings
- Ready for Week 5: Admin Backend Integration & Payment!
