# Claude Project Guide - Engezna (إنجزنا)

**Last Updated:** November 26, 2025
**Status:** Week 3 - 95% Complete 🚧
**Branch:** `main`

---

## 🎨 BRAND COLORS (OFFICIAL - v1.0)

⚠️ **CRITICAL: Use ONLY these colors**

### Primary Colors
```css
--primary: 23 97% 46%;            /* #E85D04 Orange Primary */
--gold: 41 98% 57%;               /* #FDB927 Premium */
--orange-accent: 16 100% 60%;     /* #FF6B35 Deals */
--blue: 207 90% 54%;              /* #2196F3 Info */
--secondary: 0 0% 0%;             /* #000000 Black */
```

### ❌ OLD COLORS (DO NOT USE)
- ~~Deep Green #06c769~~ ← WRONG
- ~~Gold: 43 98% 58%~~ ← WRONG

**Official brand color is ORANGE #E85D04, NOT green!**

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

### Reports & Analytics (NEW! ✅)
1. ✅ Visit `/ar/provider/reports` or `/en/provider/reports`
2. ✅ Revenue overview: Today, This Week, This Month, Last Month
3. ✅ Growth percentage compared to last month
4. ✅ Order stats: Total, Completed, Customers, Avg Order Value
5. ✅ Revenue chart (last 30 days) with hover details
6. ✅ Top 5 selling products with rankings
7. ✅ Completion rate and cancellation rate
8. ✅ Link from provider dashboard

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
Week 3 ███████████▓  95% 🚧 Partner Dashboard + Menu Management
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

### Week 3: Partner Dashboard (95% 🚧)
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
- [ ] Finance/Payments dashboard
- [ ] Supabase Storage bucket setup (SQL provided)
- [ ] Real-time order notifications

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

## 🎯 Next Steps (Week 3 Remaining)

1. [ ] Finance/Payments dashboard `/provider/finance`
2. [ ] Real-time order notifications (Supabase Realtime)
3. [ ] Execute Supabase Storage SQL (provided in session)
4. [ ] Support/Help page `/provider/support`

---

## 🐛 Recent Fixes

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

### Reports & Analytics (NEW)
- `src/app/[locale]/provider/reports/page.tsx` - Revenue, orders, and performance analytics

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

**Version:** 13.0 (Week 3 - Reports & Analytics Complete)
**Last Updated:** November 26, 2025
**Next Review:** November 28, 2025

**🎉 Reports & Analytics complete! Week 3 at 95%! Next: Finance/Payments dashboard!**
