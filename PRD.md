# Product Requirements Document (PRD)

## Engezna - إنجزنا | Local Marketplace Platform

**Version:** 6.1 (Production Ready)
**Last Updated:** January 13, 2026 (Session 27)
**Project Lead:** Mosab
**Location:** Egypt (Starting from Upper Egypt governorates)

> **Note:** For detailed session history, see [CHANGELOG.md](CHANGELOG.md)

---

## 📋 Executive Summary

**Engezna (إنجزنا)** is a B2C local marketplace platform for daily home needs, designed to serve all of Egypt, starting from Upper Egypt governorates. The platform connects local stores (restaurants, supermarkets, groceries, pharmacies, and more) with customers in underserved markets. Delivery is always the merchant's responsibility — Engezna does not provide delivery services.

**Mission:** To bring a modern local marketplace to all Egyptian governorates,
starting from secondary cities (beginning with Beni Suef) and expanding to reach
Cairo, Giza, Alexandria, and North Coast as the final phase – while supporting
local businesses and creating economic opportunities through fair, transparent pricing.

**Expansion Strategy:**

- **Phase 1-2:** Secondary governorates (المحافظات الثانوية) – current focus
- **Phase 3-4:** Cairo, Giza, Alexandria, North Coast – final expansion phase

**Key Differentiator:**

- **30-day 0% commission** (configurable per merchant) then **max 7%** (vs competitors' 25-30%)
- **0% customer service fees** - always!
- Providers manage their own delivery staff
- Arabic-first UX with full RTL support

---

## 📊 Current Development Status

| Metric                 | Value                     |
| ---------------------- | ------------------------- |
| **Phase**              | Week 7 - Production Ready |
| **Progress**           | ~97% MVP Complete         |
| **Target Launch**      | May 2026                  |
| **Sessions Completed** | 27                        |

### System Completion Status

| System              | Status   | Details                                                             |
| ------------------- | -------- | ------------------------------------------------------------------- |
| Customer Journey    | ✅ 100%  | Browsing, Cart, Checkout, Tracking, Reviews, Favorites              |
| Provider Dashboard  | ✅ 100%  | Orders, Menu, Analytics, Settlements, Store Hours                   |
| Admin Panel         | ✅ 100%  | RBAC/ABAC, Supervisors, Tasks, Approvals, Messaging                 |
| Custom Orders       | ✅ 100%  | Triple Broadcast, Voice/Image/Text, Pricing UI                      |
| AI Assistant (أحمد) | ⏸️ معطل  | معطل مؤقتاً - قيد التطوير (env: `NEXT_PUBLIC_AI_ASSISTANT_ENABLED`) |
| Settlement System   | ✅ 100%  | COD/Online breakdown, Commission calculation                        |
| Legal Compliance    | ✅ 100%  | Privacy Policy, Terms & Conditions                                  |
| Payment Gateway     | ✅ Ready | Kashier integrated (pending activation)                             |

### Pending Items

| Item                | Priority | Blocker                 |
| ------------------- | -------- | ----------------------- |
| Push Notifications  | Medium   | Firebase account setup  |
| Email Notifications | Low      | Resend/SendGrid account |
| SMS Verification    | Medium   | Provider account        |

---

### Session 17 Updates (December 11, 2025)

**Provider Variants Management:**

- ✅ **Full Variants CRUD UI** in product edit page (`/provider/products/[id]`)
- ✅ Toggle variants on/off for any product
- ✅ Add new variants with name (AR/EN), price, original price
- ✅ Edit existing variants inline
- ✅ Delete variants with confirmation
- ✅ Set default variant per product
- ✅ Variants saved to database on product save

**Excel Import Enhancement:**

- ✅ **Image URL Import** - Added `image_url` column support
- ✅ URL validation (must start with http:// or https://)
- ✅ Manual column mapping option for image_url
- ✅ Documentation updated in EXCEL_IMPORT_GUIDE.md

**Bug Fixes:**

- ✅ Promotion badge showing duplicate % symbol (replaced icon with "خصم" text)
- ✅ Product detail modal not opening (added stopPropagation to ProductCard buttons)
- ✅ Hover effects on variant action buttons fixed

**Files Modified:**

- `src/app/[locale]/provider/products/[id]/page.tsx` - Variants management UI
- `src/components/customer/shared/ProductCard.tsx` - stopPropagation + badge fix
- `src/lib/utils/excel-import.ts` - Image URL import
- `src/types/menu-import.ts` - Image URL type
- `src/app/api/menu-import/save/route.ts` - Save image URL

### Session 16 Updates (December 10, 2025)

**Excel Menu Import System:**

- ✅ **Import Page**: `/provider/menu-import` - Bulk import from Excel files
- ✅ **4 Pricing Types**: fixed, per_unit, variants, weight_variants
- ✅ **Variants Format**: `نصف كيلو:480|ربع كيلو:250` (name:price|name:price)
- ✅ **Auto-create categories** from Excel category column
- ✅ **Database Tables**: `product_variants`, `provider_categories`
- ✅ Successfully imported: 30 categories, 156 products, 203 variants

**Product Variants System:**

- ✅ **VariantSelectionModal** component for size/weight selection
- ✅ **ProductDetailModal** component for full product view
- ✅ Customer can select variants and quantity before adding to cart

**UI Fixes:**

- ✅ Modal z-index increased to z-[60] (above bottom navigation)
- ✅ Add to Cart button visibility fixed on mobile
- ✅ Click-outside-to-close for modals
- ✅ Products disappearing bug fixed (was using INNER JOIN instead of LEFT JOIN)

**Documentation:**

- ✅ Created `/docs/EXCEL_IMPORT_GUIDE.md` for providers
- ✅ Updated SESSION_LOG.md, NEXT_SESSION.md, project-status.md

### Session 15 Updates (December 7, 2025)

**Evening Session: In-App Chat & Messaging System:**

- ✅ **Provider Notifications System**:
  - Created `provider_notifications` table with triggers
  - RLS policies for notifications persistence (DELETE, UPDATE)
  - Enabled realtime publication for both notification tables
- ✅ **Customer Notifications Enhancement**:
  - Store name display in customer notifications
  - Polling fallback (10-second interval) for realtime reliability
  - Notification badge stabilization (removed animate-pulse)
- ✅ **Chat Message System**:
  - RTL alignment fix (own messages on RIGHT, received on LEFT)
  - Message read status indicators (✓ sent, ✓✓ read)
  - Proper message alignment based on locale (AR/EN)
- ✅ **Files Modified**:
  - `supabase/migrations/20251207000006_fix_notification_rls_policies.sql`
  - `src/components/shared/OrderChat.tsx` - RTL message alignment
  - `src/hooks/customer/useNotifications.ts` - Polling fallback

**Part 4: Smart Settlements (COD vs Online):**

- ✅ **Payment-aware settlement logic**:
  - COD orders: Provider collects cash → Owes up to 7% commission to Engezna
  - Online orders: Engezna collects payment → Owes 93%+ payout to provider
  - Net balance calculation determines who pays whom
- ✅ Database schema update (`20251207000003_settlements_cod_online_breakdown.sql`):
  - `cod_orders_count`, `cod_gross_revenue`, `cod_commission_owed`
  - `online_orders_count`, `online_gross_revenue`, `online_platform_commission`, `online_payout_owed`
  - `net_balance`, `settlement_direction`
- ✅ UI improvements:
  - "عمولة إنجزنا" instead of "المنصة" (professional branding)
  - Dynamic provider name instead of generic "مزود"
  - Orange badges for COD with commission owed
  - Blue badges for Online with payout owed
  - Color-coded net balance (green = Engezna pays, red = provider pays)
- ✅ Settlement detail page with full breakdown:
  - COD Section (orange): Revenue, Engezna commission due
  - Online Section (blue): Revenue, commission, provider payout
  - Net Balance Card with direction indicator

**Part 3: Settlements System:**

- ✅ Admin settlements page (`/admin/settlements`) with full management:
  - Stats cards: Pending dues, Overdue dues, Total paid
  - Period selector: Daily, Every 3 days, Weekly
  - Generate settlements for all active providers
  - Custom settlement creation for specific provider/period
  - Payment recording with method selection (cash, bank_transfer, instapay, vodafone_cash)
  - Status filtering and geographic filtering
  - Settlement list with provider info, period, orders, revenue, net payout
- ✅ Provider settlements page (`/provider/settlements`) with:
  - Stats overview: Total due, Total paid, Pending settlements, Overdue settlements
  - Settlement history with expandable cards
  - Shows gross revenue, platform commission (up to 7%), net payout
  - Payment details for completed settlements
- ✅ **CRITICAL FIX**: Settlement generation now checks BOTH `status='delivered'` AND `payment_status='completed'`
  - This ensures COD orders are only included after payment is confirmed
  - Prevents settlements from including delivered but unpaid orders
- ✅ Navigation updates:
  - Added "التسويات" (Settlements) menu item to AdminSidebar
  - Added "التسويات" (Settlements) menu item to ProviderSidebar
- ✅ Database migration: `20251207000002_settlements_system.sql`

**Part 2: Dynamic Footer & Governorate Analytics:**

- ✅ Footer now dynamically fetches active governorates from database
- ✅ When admin adds/removes a governorate, it automatically appears/disappears in Footer
- ✅ Updated translations: "المدن المتاحة" → "المحافظات المتاحة"
- ✅ Added "Expansion Analytics" tab to Admin Locations page (Super Admin only)
- ✅ Summary stats: Total providers, customers, orders, revenue across all governorates
- ✅ Governorate ranking table with expansion readiness score (0-100%)
- ✅ Readiness formula: Providers (40%) + Customers (30%) + Orders (20%) + Coverage (10%)
- ✅ Growth rate indicator (last 30 days vs previous 30 days)
- ✅ Smart expansion recommendations:
  - Promising governorates for activation
  - Governorates needing development
  - Top performing governorates

**Part 1: Voice to Chat Transition:**

- ✅ Fixed notification badge rapid flashing (removed animate-pulse)
- ✅ Converted voice ordering to text chat ("دردش واطلب" / "Chat & Order")
- ✅ ChatFAB replaces VoiceOrderFAB (message icon instead of microphone)
- ✅ TextChat component replaces VoiceOrderChat (text input only)
- ✅ Removed Deepgram (transcription API), kept OpenAI for smart order processing
- ✅ Removed microphone button from HeroSection and SearchBar

### Session 14 Updates (December 6, 2025)

**Security Update (CRITICAL):**

- ✅ Patched CVE-2025-55182 & CVE-2025-66478 (CVSS 10.0 - RCE vulnerabilities)
- ✅ Updated Next.js to 16.0.7 (security patched)
- ✅ Updated React/React-DOM to 19.2.1 (security patched)

**Finance Page Improvements:**

- ✅ Fixed color consistency with brand identity (replaced Tailwind amber with CSS variables)
- ✅ Using brand colors: `--warning`, `--premium`, `--deal`, `--info`

**Orders Page UX Improvements:**

- ✅ Added order counts to filter tabs (Ready, Completed, Cancelled)
- ✅ Added "Payment Received" button directly on order cards
- ✅ Added payment status badge (Paid/Pending) for delivered orders
- ✅ Query now includes `payment_status` field

### Session 13 Updates (December 5, 2025)

**Reviews RLS Infinite Recursion Fix:**

- ✅ Fixed circular dependency between providers and provider_staff tables
- ✅ Created SECURITY DEFINER helper functions to bypass RLS

**Provider Notifications:**

- ✅ Combined notifications badge (orders + reviews)
- ✅ Hover dropdown for notifications

**Customer Notifications:**

- ✅ Created `customer_notifications` table
- ✅ Automatic notifications on order status changes

**Admin Notifications:**

- ✅ Notifications for order cancellations, new providers, support tickets

### Session 12 Updates (December 5, 2025)

**Order Cancellation Feature:**

- ✅ Added cancellation button on order tracking page
- ✅ Cancellation allowed for pending/confirmed/accepted orders
- ✅ Cancellation modal with reason selection (bilingual)
- ✅ Database update with cancellation details

**Reviews & Ratings System (Complete):**

- ✅ Customer review submission on order tracking page (for delivered orders)
- ✅ Star rating (1-5) with optional comment
- ✅ Reviews display on provider detail page with customer names
- ✅ Provider can respond to reviews
- ✅ Provider reviews management page (`/provider/reviews`)
- ✅ Reviews menu item in provider sidebar

**Favorites Feature:**

- ✅ Customers can favorite/unfavorite providers
- ✅ Favorites page (`/favorites`) showing saved providers

**Real-time Notifications (Supabase Realtime):**

- ✅ useNotifications hook with real-time subscriptions
- ✅ useProviderOrderNotifications hook for provider order alerts
- ✅ Live unread count in customer header
- ✅ Real-time order notifications for providers
- ✅ Notifications page refactored to use hooks
- ✅ Polling fallback for reliability (10-second interval)
- ✅ Store name display in customer notifications

**In-App Chat System (NEW! - Session 15 Evening):**

- ✅ Order-based messaging between customer and provider
- ✅ Message read status indicators (✓ sent, ✓✓ read)
- ✅ RTL-aware message alignment (own messages on RIGHT)
- ✅ Real-time message delivery

**Promo Codes System:**

- ✅ Promo code validation (validity, limits, restrictions)
- ✅ Promo code input UI in checkout
- ✅ Discount calculation and display
- ✅ Promo code usage tracking
- ✅ Order creation with discount applied

### Session 11 Updates (December 4, 2025)

**Auth System Enhancements:**

- ✅ Created Reset Password page (`/auth/reset-password`)
- ✅ Created dedicated Provider Login page (`/provider/login`)
- ✅ Added logo + back-to-home link to all auth pages
- ✅ Removed debug console.logs from customer login

**Footer & Partner Landing Page:**

- ✅ Created Footer component (4-column: Brand | Customers | Partners | Contact)
- ✅ Created Partner Landing page (`/partner`) with hero, benefits, CTA
- ✅ Added Footer to CustomerLayout
- ✅ Added CSS animations (fade-in, fade-in-up)

**Logo Brand Consistency (EngeznaLogo Unification):**

- ✅ All pages now use `EngeznaLogo` component with Aref Ruqaa font
- ✅ Customer Header: size `md` (was `sm`)
- ✅ Provider Header/Sidebar/Dashboard: EngeznaLogo (was Store icon)
- ✅ Admin Header/Sidebar/Login: EngeznaLogo (was Shield icon/PNG)
- ✅ Logo sizes: `lg` for login pages, `md` for sidebars, `sm` for mobile headers

### Session 10 Updates (December 3, 2025)

- ✅ **Fixed Admin Analytics Geographic Filtering**
  - Fixed analytics showing zeros when selecting a governorate
  - Added fallback name-based filtering for old orders without IDs
  - Main analytics now filters by both provider location AND delivery_address
  - Regional analytics matches by name when IDs are not present
  - Files: `admin/analytics/page.tsx`, `admin/analytics/regions/page.tsx`

### What's Built ✅

**Infrastructure & Design:**

- ✅ Complete technical infrastructure (Next.js 16.0.7, React 19.2.1, TypeScript, Tailwind CSS v3.4.17)
- ✅ Full database schema design and **DEPLOYED to Supabase** (1,431 lines SQL with all tables, RLS policies, triggers)
- ✅ Brand identity and design system (Engezna Blue #009DE0, logos, typography)
- ✅ Bilingual interface (Arabic/English with full RTL support)
- ✅ Light-only theme (dark mode removed for consistent brand experience)
- ✅ 13 Shadcn/ui components installed and themed
- ✅ Noto Sans Arabic + English variable fonts
- ✅ Locale-aware number formatting (Arabic-Indic numerals ٠-٩ in Arabic, Western Arabic 0-9 in English)

**Database & Data:**

- ✅ **Database deployed to Supabase** with live connection
- ✅ **4 providers seeded** (restaurants, coffee shops, groceries, vegetables/fruits)
- ✅ **30 menu items** across all providers
- ✅ Safe seeding script (won't destroy existing data)
- ✅ RLS policies active and working

**Pages & Features:**

- ✅ Homepage/Landing page (bilingual, responsive)
- ✅ **Authentication System** (FULLY FUNCTIONAL)
  - ✅ Signup page with email/password registration
  - ✅ Login page with email/password authentication
  - ✅ OTP authentication (phone/email)
  - ✅ Password reset flow
  - ✅ Protected routes with automatic redirects
  - ✅ Session management
  - ✅ User profile creation in database
- ✅ **Provider browsing page** (/providers)
  - ✅ Category filtering (all, restaurants, coffee, grocery, vegetables/fruits)
  - ✅ Provider cards with ratings, delivery info, status badges
  - ✅ Real-time data from Supabase
  - ✅ Loading states and error handling
- ✅ **Provider detail pages** (/providers/[id])
  - ✅ Full provider information
  - ✅ Menu items grid with images
  - ✅ Dietary tags (vegetarian, spicy)
  - ✅ Real-time availability
- ✅ **Shopping cart functionality** (GLOBAL STATE)
  - ✅ Add/remove items with +/- buttons
  - ✅ Real-time quantity management with Zustand
  - ✅ Subtotal and total calculations
  - ✅ Delivery fee integration
  - ✅ Floating cart summary bar
  - ✅ Cart persistence across navigation
  - ✅ Multi-provider cart handling
- ✅ **Checkout Flow** (COMPLETE)
  - ✅ Customer information form (pre-filled from profile)
  - ✅ Delivery address input
  - ✅ Payment method selection (COD active)
  - ✅ Order summary with pricing breakdown
  - ✅ Order placement in database
  - ✅ Order items creation
- ✅ **Order Confirmation Page**
  - ✅ Success message with order number
  - ✅ Delivery information display
  - ✅ Complete order summary
  - ✅ Track order button (ready for implementation)
- ✅ **Order System (Complete!)**
  - ✅ Order tracking page (`/orders/[id]`) with status timeline
  - ✅ Order history page (`/orders`) with filters (all/active/completed)
  - ✅ My Orders navigation in header with active count badge
  - ✅ Shared Header component with user context
- ✅ **Multi-Page Settings System (Complete!)**
  - ✅ Settings menu hub (`/profile`) with navigation cards
  - ✅ Account settings (`/profile/account`) - Edit first/last name, phone
  - ✅ Address management (`/profile/addresses`) - Full CRUD with cascading dropdowns
  - ✅ Email change (`/profile/email`) - With password verification
  - ✅ Password change (`/profile/password`) - With validation (min 8 chars)
  - ✅ Language selection (`/profile/language`) - Switch AR/EN with auto-redirect
  - ✅ Location settings (`/profile/governorate`) - Select governorate and city
  - ✅ Database migration for governorate_id and city_id columns
  - ✅ 80+ new translation keys (AR/EN) for all settings pages
  - ✅ Name split logic (first/last in UI, full_name in DB)
  - ✅ Form validation on all inputs with error messages
- ✅ Routing system working (/ar, /en with locale switching)
- ✅ Language and theme toggle components
- ✅ 404 error pages for both locales

**Admin Dashboard (NEW - Week 4):**

- ✅ **Unified Admin Components**
  - ✅ AdminHeader with language switcher, notifications, user menu
  - ✅ AdminSidebar with collapsible navigation
  - ✅ Consistent Engezna Blue (#009DE0) theming
- ✅ **Supervisor Management** (`/admin/supervisors`)
  - ✅ Full CRUD for admin team members
  - ✅ Roles: super_admin, general_moderator, store_supervisor, support, finance
  - ✅ Permission system for granular access control
  - ✅ Stats dashboard with role breakdown
  - ✅ Filter by status and role
- ✅ **Tasks Management** (`/admin/tasks`)
  - ✅ Task assignment between director and supervisors
  - ✅ Status tracking: new, accepted, in_progress, pending, completed, cancelled
  - ✅ Priority levels: urgent, high, medium, low
  - ✅ Deadline tracking with overdue indicators
  - ✅ Progress percentage tracking
- ✅ **Approvals System** (`/admin/approvals`)
  - ✅ Approval requests for refunds, bans, commission changes
  - ✅ Status workflow: pending, approved, approved_with_changes, rejected
  - ✅ Justification and response tracking
  - ✅ Create/decision modals for workflow
- ✅ **Internal Messages** (`/admin/messages`)
  - ✅ Inbox and sent views
  - ✅ Compose message modal
  - ✅ Broadcast to all team members
  - ✅ Read/unread tracking
  - ✅ Priority: urgent or normal
- ✅ **Announcements** (`/admin/announcements`)
  - ✅ Team announcements and notifications
  - ✅ Types: urgent, important, info
  - ✅ Pinned announcements
  - ✅ Expiry dates
  - ✅ CRUD for super admins

**Location Settings (NEW - Week 4):**

- ✅ **District/Neighborhood Filtering**
  - ✅ Cascading dropdowns: Governorate → City → District → Neighborhood
  - ✅ Improved location selection in settings

**DevOps:**

- ✅ Git repository + GitHub integration
- ✅ Vercel deployment setup (auto-deploy on push)
- ✅ Environment configuration ready
- ✅ Complete documentation (PRD, README, claude.md, PROGRESS_UPDATE.md)

### What's NOT Built Yet 🚧

**Admin Panel (Backend Integration - Phase 0 Complete ✅):**

- ✅ **Provider approval workflow** - Approve, reject, suspend, reactivate with audit logging
- ✅ **User management backend** - Ban, unban, change role with audit logging
- ✅ **Provider detail page** - Full view with stats and action controls
- ⚠️ **Platform analytics backend** - Basic stats implemented, advanced queries pending
- ✅ **Financial settlements** - Admin and provider settlements pages complete (Session 15)

**Storage (Complete ✅):**

- ✅ **Supabase Storage bucket** - Configured and working (Dec 1, 2025)
- ✅ **Logo and product image uploads** - Functional

**Payment Integration:**

- ✅ **Online payment (Kashier)** - Integrated, pending account activation
- ⚠️ Card payments - NOT available
- ⚠️ Vodafone Cash - NOT available

**Notifications:**

- ✅ **Real-time notifications** - Supabase Realtime for live updates ✅ (Session 12)
- ⚠️ **SMS notifications** - No Twilio/SMS provider integration
- ⏸️ **Email notifications** - **مؤجل** (يتطلب خدمة بريد خارجية مثل Resend/SendGrid + API Keys + قوالب بريد إلكتروني)

**Customer Features Missing:**

- ✅ **Order cancellation** - Customers can cancel pending/confirmed/accepted orders ✅ (Session 12)
- ✅ **Reviews/Ratings** - Customers can rate providers and leave reviews ✅ (Session 12)
- ✅ **Favorites** - Customers can favorite providers ✅ (Session 12)
- ✅ **Promo codes** - Full promo code system in checkout ✅ (Session 12)
- ⚠️ **Scheduled orders** - Cannot order for later

**Provider Features Missing:**

- ✅ **Real-time order notifications** - Supabase Realtime subscription ✅ (Session 12)
- ⚠️ **Multi-user support** - No staff accounts for providers
- ⚠️ **Inventory management** - No stock tracking

**Other Missing:**

- ⚠️ **Google Maps integration** - No map display or geocoding
- ⚠️ **Full-text search** - No search across providers
- ✅ **In-app chat** - Order-based messaging between customer and provider (Session 15 Evening)

### Next Priority Steps (Week 5+)

**Week 1-2 Tasks (COMPLETE ✅):**

1. ✅ Deploy database schema to Supabase (COMPLETE)
2. ✅ Implement provider listing pages (COMPLETE)
3. ✅ Add provider detail pages (COMPLETE)
4. ✅ Shopping cart functionality (COMPLETE)
5. ✅ Complete Supabase Auth integration (COMPLETE)
6. ✅ Build user session management (COMPLETE)
7. ✅ Implement checkout flow (COMPLETE)
8. ✅ Build order placement (COMPLETE)

**Week 3 Tasks (COMPLETE ✅):**

1. ✅ Partner registration (multi-step flow)
2. ✅ Business profile completion
3. ✅ Provider dashboard (status-aware)
4. ✅ Orders management (accept/reject, status updates)
5. ✅ Menu management (add/edit/delete products)
6. ✅ Store hours management
7. ✅ Promotions system
8. ✅ Reports & Analytics
9. ✅ Finance dashboard
10. ✅ Provider settings & profile

**Week 4 Tasks (COMPLETE ✅):**

1. ✅ Admin Dashboard unified components (AdminHeader, AdminSidebar)
2. ✅ Locale-aware number formatting (Arabic-Indic numerals)
3. ✅ District/neighborhood filtering in location settings
4. ✅ Supervisor management page with roles and permissions
5. ✅ Tasks management with assignment and tracking
6. ✅ Approvals workflow system
7. ✅ Internal messaging between team members
8. ✅ Announcements for team notifications

**Week 5+ Priorities:**

**✅ Completed:**

1. ✅ **Admin Backend Integration Phase 0** - Providers, users connected with audit logging
2. ✅ **Supabase Storage** - Bucket configured, logo/image uploads working
3. ✅ **UI/UX Improvements** - Auth pages, Footer, Partner page, Logo unification

**High Priority (Current):** 4. ✅ **Payment Integration (Kashier)** - Online payment support (pending account activation) 5. **Advanced Analytics** - Time-series charts, performance metrics

**Medium Priority (Completed ✅):** 6. ✅ Customer reviews and ratings system (Session 12) 7. ✅ Order cancellation flow for customers (Session 12) 8. ✅ Favorites/wishlist feature (Session 12)

**Current Priority:** 9. ✅ Real-time notifications (Supabase Realtime) - COMPLETE (Session 12) 10. ⏸️ Email transactional notifications - **مؤجل** (يتطلب خدمة خارجية) 11. ✅ Promo codes system - COMPLETE (Session 12)

**Lower Priority:** 12. Google Maps integration

---

## 🎯 Project Overview

### **Problem Statement**

Egyptian governorates outside major cities lack modern digital marketplace infrastructure. Existing national platforms (Talabat, Noon) don't serve these regions adequately with their high 15-20% commission rates, leaving a gap for:

- Customers who want easy access to local stores and their products
- Local stores seeking online presence and affordable platform fees
- Local economy needing digital transformation

### **Solution**

A localized, bilingual (Arabic/English) local marketplace platform that:

- Connects customers with local stores (restaurants, supermarkets, groceries, pharmacies, and more)
- **Providers use their existing delivery staff** (no driver app needed)
- **Ultra-low commission** (5-7% vs competitors' 15-20%)
- Supports Arabic-first user experience with RTL design
- Offers simple, transparent pricing
- Keeps providers' existing operations intact

**Key Differentiator:** Merchants handle their own delivery (which most already have). Engezna is a marketplace, not a delivery service — this allows us to offer the lowest commission in the market while maintaining simplicity.

### **Success Metrics**

- **MVP Launch:** 3 months from project start
- **Year 1 Targets:**
  - 50+ partner restaurants/shops
  - 1,000+ active users
  - 5,000+ orders completed
  - Average delivery time: <45 minutes
  - Customer satisfaction: >4.2/5 stars
  - Provider satisfaction: >4.5/5 stars

---

## 👥 Target Users

### **Primary Users**

#### **1. Customers (End Users)**

- **Demographics:** 18-45 years old, smartphone users in Beni Suef
- **Behaviors:**
  - Prefer Arabic interface
  - Cash payment dominant (90%+)
  - Value local businesses
  - Price-sensitive
- **Needs:**
  - Easy restaurant discovery
  - Real-time order tracking
  - Multiple payment options
  - Clear delivery estimates

#### **2. Restaurant Partners (Providers)**

- **Types:**
  - Quick service restaurants
  - Traditional Egyptian restaurants
  - Coffee shops
  - Grocery stores
- **Needs:**
  - Simple order management
  - Menu digitization
  - Sales analytics
  - Payment collection
  - **Delivery management** (providers use their own delivery staff)

### **Secondary Users**

#### **3. Admin Team**

- **Roles:**
  - Operations manager
  - Customer support
  - Content moderator
  - Financial controller
- **Needs:**
  - Complete platform oversight
  - Analytics dashboard
  - User management tools
  - Financial reporting

---

## 🏗️ Technical Architecture

### **Tech Stack**

#### **Frontend** ✅ FULLY IMPLEMENTED

- **Framework:** Next.js 16.0.3 (App Router) ✅
  - React 19.2.0
  - App Router with route groups (customer/provider/admin)
- **Language:** TypeScript 5.x ✅
- **Styling:** Tailwind CSS 3.4.17 ✅
  - Custom configuration with brand design tokens
  - Light-only theme (brand consistency) ✅
  - Full RTL (Right-to-Left) support for Arabic ✅
  - Custom scrollbar styling
  - Gradient backgrounds
- **UI Components:** shadcn/ui (Radix UI) ✅
  - 13 components: Button, Card, Avatar, Badge, Dialog, Dropdown Menu, Input, Label, Select, Separator, Switch, Tabs, Textarea
  - All components themed with brand colors (Orange #E85D04, Gold #FDB927)
  - Light-only theme support
- **Internationalization:** next-intl 4.5.5 ✅
  - Configured for Arabic (default) and English
  - Locale routing working (/ar, /en)
  - Translation files with initial content
  - RTL direction switching
  - ✅ Routing issues resolved
- **Typography:** ✅
  - Noto Sans Arabic (Variable Font)
  - Noto Sans English (Variable Font)
  - Weights: 400, 500, 600, 700
- **State Management:** Zustand ✅ (used for shopping cart)
- **Forms:** React Hook Form + Zod validation (installed, ready for use)

#### **Backend** ✅ DEPLOYED - WORKING

- **Platform:** Supabase (deployed and active)
  - ✅ PostgreSQL database (schema deployed with 4 providers, 30 menu items)
  - ✅ **Authentication** (FULLY INTEGRATED - email/password + OTP)
  - 🔄 Real-time subscriptions (planned for order tracking)
  - 🔄 Storage (planned for images, documents)
  - 🔄 Edge Functions (planned)
  - ✅ Row Level Security (RLS policies deployed and active)
- **Status:**
  - ✅ Complete schema design (1,431 lines SQL)
  - ✅ Supabase client configured
  - ✅ **Database DEPLOYED to Supabase** with live data
  - ✅ **4 providers seeded** (restaurants, coffee shops, groceries, vegetables/fruits)
  - ✅ **30 menu items** with pricing, descriptions, dietary tags
  - ✅ **Safe seeding script** (won't destroy existing data)
  - ✅ **Auth fully integrated** (signup, login, OTP, sessions, protected routes)
  - ✅ **Order placement working** (orders and order_items tables in use)
  - ⚠️ Real-time features pending (Week 3)

#### **Infrastructure**

- **Development:** ✅ COMPLETE
  - ✅ Local development environment
  - ✅ Git version control
  - ✅ GitHub repository: https://github.com/Mosabragab/Engezna
  - ✅ Environment variables configured
- **Hosting:** ✅ DEPLOYED
  - ✅ Vercel deployment active
  - ✅ Edge Network CDN
  - ✅ Automatic deployments from git pushes
  - ✅ Production URL active
- **Database:** ✅ DEPLOYED
  - ✅ Supabase project created and active
  - ✅ Schema deployed to cloud
  - ✅ 4 providers with 30 menu items seeded
  - ✅ Safe seeding script available
- **Analytics:** 🔄 PLANNED
  - Vercel Analytics (to be enabled)
  - Supabase Analytics (to be configured)
- **Monitoring:** 🔄 PLANNED
  - Sentry (to be integrated for error tracking)

#### **Third-Party Integrations** 🔄 ALL PLANNED (Week 2+)

- **Maps:** Google Maps API (navigation, geocoding) - Week 2-3
- **Payments:** ✅ INTEGRATED
  - Kashier (Egyptian payment gateway) - pending account activation
  - Cash on Delivery (COD) - primary method ✅
  - Vodafone Cash (future consideration)
- **SMS:** Twilio or local Egyptian SMS provider - Week 1-2 (for OTP)
- **Push Notifications:** Firebase Cloud Messaging - Week 4

### **Database Schema (Core Tables)** ✅ DESIGNED & DEPLOYED

**Status:** Schema designed, deployed to Supabase, and working with live data.

**Supabase Setup Completed:**

- [x] Create Supabase project
- [ ] Configure authentication (pending Week 2)
- [x] Set up database tables
- [x] Implement Row Level Security (RLS)
- [ ] Configure storage buckets (pending Week 2)
- [ ] Set up Edge Functions (pending Week 3-4)

**Planned Schema:**

```sql
-- Users
users (
  id, email, phone, name, role,
  created_at, updated_at
)

-- Restaurants/Shops
providers (
  id, owner_id, name_ar, name_en,
  category, address, location (point),
  rating, delivery_time, delivery_fee,
  is_open, created_at
)

-- Menu Items
menu_items (
  id, provider_id, name_ar, name_en,
  description_ar, description_en,
  price, image_url, category,
  is_available, created_at
)

-- Orders
orders (
  id, customer_id, provider_id,
  items (jsonb), subtotal, delivery_fee, total,
  delivery_address, customer_location (point),
  status, payment_method, payment_status,
  created_at, updated_at
)

-- Reviews
reviews (
  id, order_id, customer_id, provider_id,
  rating, comment, created_at
)
```

**Note:** No driver table needed - providers manage their own delivery. Full database schema with constraints, indexes, and RLS policies will be created in Week 1-2.

---

## ✨ Core Features

### **Phase 1: MVP (Months 1-3)**

#### **Customer App**

1. **User Authentication**
   - Phone number + OTP
   - Email/password
   - Guest checkout (limited)

2. **Restaurant Discovery**
   - Browse by category (restaurants, coffee, groceries)
   - Search by name/cuisine
   - Filter by delivery time, rating, price
   - View restaurant details and menu

3. **Ordering**
   - Add items to cart
   - Customize items (notes, extras)
   - Apply promo codes
   - Choose delivery address
   - Select payment method (cash/online)

4. **Order Tracking**
   - Real-time status updates
   - Estimated delivery time
   - Push notifications

5. **User Profile**
   - Saved addresses
   - Order history
   - Favorite restaurants
   - Payment methods

6. **🤖 AI Smart Assistant (مساعد إنجزنا الذكي - أحمد)** ✅ IMPLEMENTED
   - **Chat-based Ordering:** Natural language ordering in Egyptian Arabic
   - **AI Agent Architecture:** GPT-4o-mini with Function Calling (22 tools)
   - **Smart Search:** Arabic normalization + synonym expansion (كفتة↔كباب, حلويات↔شوكولاتة)
   - **Provider Discovery:** Find restaurants by item, cuisine, or location
   - **Menu Browsing:** View items, variants, prices, and promotions
   - **Cart Management:** Add/remove items, select variants, apply promo codes
   - **Order Tracking:** Check status, view timeline, cancel pending orders
   - **Context-Aware:** Remembers selected provider and cart contents
   - **Session Memory:** Maintains pending item info for seamless add-to-cart flow
   - **Streaming Responses:** Real-time character-by-character response display
   - **Quick Replies:** Contextual action buttons for common operations
   - **Bilingual Support:** Arabic UI with English fallback
   - **Files:** `src/lib/ai/agentTools.ts`, `src/lib/ai/agentPrompt.ts`, `src/lib/ai/agentHandler.ts`
   - **API:** `POST /api/chat` (Streaming SSE)
   - **Documentation:** `docs/AI_SMART_ASSISTANT.md`

#### **Provider Dashboard**

1. **Menu Management**
   - Add/edit/delete items
   - Upload images
   - Set availability
   - Manage categories

2. **Order Management**
   - Incoming order notifications
   - Accept/reject orders
   - Mark order ready
   - Mark order out for delivery
   - Mark order delivered
   - View order history

3. **Restaurant Profile**
   - Business hours
   - Delivery settings (fee, time, radius)
   - Contact information
   - Bank account details

4. **Analytics**
   - Daily/weekly/monthly sales
   - Popular items
   - Customer reviews
   - Performance metrics
   - Order completion stats
   - **Delivery performance** (managed by provider)

#### **Admin Panel**

1. **Dashboard**
   - Key metrics (GMV, orders, users)
   - Real-time order monitoring
   - Platform health

2. **User Management**
   - View/edit/suspend users
   - Customer support tickets
   - Provider verification

3. **Order Management**
   - View all orders
   - Resolve disputes
   - Refund processing

4. **Financial**
   - Revenue reports
   - Provider payouts
   - Commission tracking

5. **Content Management**
   - Promo codes
   - Notifications
   - App banners

### **Phase 2: Growth (Months 4-6)**

1. **Scheduled Orders**
   - Order for later
   - Recurring orders

2. **Loyalty Program**
   - Points system
   - Rewards
   - Referral bonuses

3. **Advanced Search**
   - Dietary filters (vegetarian, halal)
   - Price range
   - Delivery time

4. **Social Features**
   - Share orders
   - Split bills
   - Group orders

5. **Provider Tools**
   - Inventory management
   - Automated pricing
   - Marketing tools

### **Phase 3: Scale (Months 7-12)**

1. **Marketplace Expansion**
   - Pharmacy delivery
   - Supermarket delivery
   - Flower delivery

2. **Subscription Plans**
   - Engezna Plus (customer benefits)
   - Provider premium features

3. **Advanced Analytics**
   - Predictive analytics
   - Demand forecasting
   - Dynamic pricing

4. **White-Label Solution**
   - License to other cities
   - Franchise model

---

## 🎨 Design System

### **Brand Identity**

#### **Logo** ✅ IMPLEMENTED

- **Primary:** "إنجزنا" (Arabic) + "Engezna" (English)
- **Variations:** 6 logo variants implemented as React component
  1. **Arabic Large** - إنجزنا (display text)
  2. **English Large** - Engezna (display text)
  3. **Arabic Medium** - إنجزنا (heading size)
  4. **English Medium** - Engezna (heading size)
  5. **Arabic Small** - إنجزنا (body text)
  6. **English Small** - Engezna (body text)
- **Component Props:**
  - `language`: 'ar' | 'en'
  - `variant`: 'small' | 'medium' | 'large'
  - `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  - Fully responsive and theme-aware

#### **Color Scheme** ✅ IMPLEMENTED (Brand Identity Guide v2.0)

- **Primary:** Engezna Blue (#009DE0) 💙
  - Represents: Trust, professionalism, clarity, reliability
  - Used for: CTAs, highlights, active states, brand elements
  - HSL: `198 100% 44%`
- **Secondary:** Black (#000000)
  - Represents: Professional, elegant, modern
  - Used for: Text, borders
- **Accent:** White (#FFFFFF)
  - Represents: Clean, minimal, spacious
  - Used for: Backgrounds, text on primary
- **Semantic Colors:**
  - Deals/Success: Green-Cyan (#00C27A)
  - Premium/Warning: Soft Gold (#FFD166)
  - Info: Sky Blue (#36C5F0)
  - Error: Coral Red (#FF5A5F)
- **Theme Strategy:** Light-Only (No Dark Mode)
  - Simplified CSS with single-mode color tokens
  - Consistent brand experience across all screens
  - Removed `next-themes` dark mode provider
- **Design Tokens:** Configured in `tailwind.config.ts` and `globals.css`
  - Engezna Blue (#009DE0) as primary color throughout
  - RTL-aware spacing and layout
- **Implementation:**
  - Logo uses primary blue
  - Gradient backgrounds: white → light blue → primary blue
  - CTA buttons: Blue with white text
  - All shadcn/ui components themed with blue accent

**⚠️ Brand Color History:**

- v1.0: Deep Green (#06c769) - Changed
- v1.5: Orange (#E85D04) - Changed
- v2.0 (Current): Engezna Blue (#009DE0)

#### **Typography** ✅ IMPLEMENTED

- **Arabic:** Noto Sans Arabic (Variable Font) ✅
  - Loaded via `next/font/google`
  - Variable axes: weight (100-900)
  - Optimized for web performance
  - CSS variable: `--font-noto-sans-arabic`
- **English:** Noto Sans (Variable Font) ✅
  - Loaded via `next/font/google`
  - Variable axes: weight (100-900)
  - CSS variable: `--font-noto-sans`
- **Weights Used:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Implementation:**
  - Both fonts loaded in root layout
  - Applied globally via Tailwind's `font-sans` class
  - Automatic font switching based on language context

#### **Design Principles**

1. **Arabic-First:** RTL layout, Arabic typography prioritized
2. **Simplicity:** Clean, uncluttered interface
3. **Speed:** Fast loading, minimal interactions
4. **Accessibility:** WCAG 2.1 AA compliance
5. **Mobile-First:** Optimized for small screens

### **UI Components**

#### **Implemented Components** ✅

1. **Logo Component** (`/components/shared/Logo.tsx`)
   - 6 variations (language × variant × size)
   - Light-only theme
   - Fully typed with TypeScript

2. **Header** (`/components/shared/Header.tsx`) ✅ NEW
   - Sticky navigation bar
   - Role-aware (customer/provider detection)
   - Active orders badge with real-time count
   - Ghost button navigation items
   - Logout with red variant styling

3. **Navigation Components** ✅ UPDATED
   - Light-only theme (dark mode removed)
   - Hover dropdown menus with no-gap fix
   - RTL-aware arrow icons

4. **LanguageSwitcher** (`/components/shared/LanguageSwitcher.tsx`)
   - Dropdown for Arabic/English
   - Flag icons
   - Smooth language transitions
   - **Status:** ⚠️ Not functional due to routing issue

5. **shadcn/ui Base Components**
   - Button (all variants)
   - Avatar, Dialog, Dropdown Menu
   - Label, Select, Separator
   - Slot, Switch, Tabs
   - All support light theme and RTL

#### **Customer App** 🔄 PLANNED (Week 1-2)

- Restaurant cards with images
- Menu item cards
- Cart summary
- Order tracking timeline
- Rating stars
- Search bar
- Filter chips
- Bottom navigation

#### **Provider Dashboard** 🔄 PLANNED (Week 5-6)

- Order cards with actions
- Menu item editor
- Image uploader
- Toggle switches (open/closed)
- Charts and graphs
- Date range picker
- **Delivery status tracker** (for their own delivery staff)

---

## 🔐 Security & Privacy

### **Data Protection**

- **Encryption:** TLS 1.3 for data in transit
- **Storage:** AES-256 for sensitive data at rest
- **Authentication:** JWT tokens, httpOnly cookies
- **Authorization:** Row Level Security (RLS) in Supabase
- **PII Protection:**
  - Phone numbers hashed
  - Addresses anonymized in analytics
  - Payment data never stored (tokenized)

### **Compliance**

- **GDPR:** User data export/deletion on request
- **Egyptian Data Protection Law:** Compliance with local regulations
- **PCI DSS:** Level 1 compliance for payment processing

### **Security Measures**

- Rate limiting on all APIs
- CAPTCHA on registration/login
- SMS verification for phone numbers
- Admin 2FA required
- Regular security audits
- Bug bounty program

---

## 💰 Business Model

### **Revenue Streams**

1. **Commission on Orders (PRIMARY - ONLY SOURCE)**
   - **5-7% commission** from restaurants on total order value
   - Simple, transparent pricing
   - Lower than competitors (Talabat: 15-20%)
   - Competitive advantage for providers
   - Commission structure:
     - Maximum commission: 7%
     - 0% commission for first 30 days (grace period, configurable per merchant)
     - Governorate-specific rates may apply

**Note:** Providers handle their own delivery using existing staff. They set their own delivery fees directly with customers. Engezna does NOT charge delivery fees or manage drivers.

2. **Advertising (Future - Phase 2)**
   - Featured restaurant placement: 50-100 EGP/week
   - Banner ads in app: 200-500 EGP/week
   - Sponsored search results: 30-50 EGP/day

3. **Subscription (Future - Phase 3)**
   - Engezna Plus for customers: 49 EGP/month
   - Benefits: Exclusive deals, priority support
   - Provider premium features: 199 EGP/month
   - Benefits: Advanced analytics, marketing tools

### **Cost Structure**

#### **Fixed Costs**

- Solo developer salary/living costs
- Infrastructure (Vercel, Supabase): ~$200/month
- Office/workspace: ~1,000 EGP/month
- Marketing budget: 5,000-10,000 EGP/month
- Legal and accounting: 2,000 EGP/month
- **Total Fixed:** ~15,000-20,000 EGP/month

#### **Variable Costs**

- Payment processing fees (2-3% on online payments)
- SMS notifications (~0.05 EGP/SMS)
- Customer support (as needed)
- Refunds and adjustments (rare)
- Server costs (scales with usage)

**Note:** No driver costs - providers manage their own delivery staff and delivery fees.

### **Financial Projections (Year 1)**

**Model:** 7% maximum commission

**Conservative Scenario:**

- Average order value: 80 EGP
- Orders per month: 1,000 (Month 3) → 5,000 (Month 12)
- Commission: 7% max = 5.60 EGP per order
- Monthly revenue (Month 12): 5,000 × 5.60 = ~28,000 EGP
- Annual revenue: ~180,000 EGP
- Profit margin: ~60% after costs = ~108,000 EGP/year

**Optimistic Scenario:**

- Orders per month: 2,000 (Month 3) → 10,000 (Month 12)
- Monthly revenue (Month 12): 10,000 × 4.80 = ~48,000 EGP
- Annual revenue: ~360,000 EGP
- Profit margin: ~65% after costs = ~234,000 EGP/year

**Break-even Point:**

- Fixed costs: ~18,000 EGP/month
- Orders needed: 3,750 orders/month (at 4.80 EGP commission)
- Expected: Month 6-7

**Key Advantages:**

- Lower commission = more providers
- No delivery infrastructure costs
- Simple, predictable revenue
- High profit margins
- Scales efficiently

---

## 🎯 Competitive Advantages

### **1. Ultra-Low Commission (5-7%)**

- **Talabat/Noon:** 15-20% commission
- **Engezna:** 5-7% commission
- **Savings for providers:** 10-13% more profit per order
- **Example:** 100 EGP order = Provider keeps 93-95 EGP vs 80-85 EGP

### **2. No Delivery Management Complexity**

- Providers use existing delivery staff
- No driver onboarding, training, or disputes
- Providers control delivery quality directly
- Simpler operations for everyone

### **3. Local Focus**

- Dedicated to Beni Suef and Upper Egypt
- Understands local market dynamics
- Personalized provider relationships
- Arabic-first experience

### **4. Simple, Transparent Pricing**

- Maximum 7% commission (0% for first 30 days, configurable)
- No hidden fees
- No delivery fee split confusion
- Providers set their own delivery charges

### **5. Technical Advantages**

- Modern tech stack (Next.js, Supabase)
- Fast, responsive interface
- Real-time order updates
- Bilingual (Arabic/English)
- Light-only theme

---

## 📊 Go-to-Market Strategy

### **Phase 1: Soft Launch (Month 1-2)**

#### **Objectives**

- Onboard 10 partner restaurants (with existing delivery capability)
- Acquire 100 early adopter customers
- Process 50+ successful orders

#### **Tactics**

1. **Direct Sales:**
   - Visit top 30 restaurants in Beni Suef
   - Target providers with existing delivery staff
   - Offer **zero commission** for first month (free trial)
   - Provide free menu digitization
   - Focus on: "Keep your delivery team, just get more orders!"

2. **Customer Acquisition:**
   - University campus marketing (Beni Suef University)
   - Facebook/Instagram ads (hyper-local)
   - First order discount (50% off, max 30 EGP)

### **Phase 2: Public Launch (Month 3)**

#### **Launch Event**

- Press release to local media
- Social media campaign (#إنجزنا*بني*سويف)
- Influencer partnerships (local micro-influencers)
- Launch week: 30% discount on all orders

#### **Channels**

1. **Digital Marketing:**
   - Facebook Ads (lookalike audiences)
   - Instagram (visual content, stories)
   - TikTok (local creators)
   - Google Ads (local search)

2. **Offline Marketing:**
   - Flyers in high-traffic areas
   - University campus activations
   - Partner restaurant signage
   - Billboard in city center

3. **PR & Partnerships:**
   - Local newspaper interviews
   - Radio advertisements
   - Partnership with Beni Suef University
   - Corporate delivery accounts

### **Phase 3: Growth (Month 4-12)**

#### **Customer Retention**

- Loyalty program launch
- Push notification campaigns
- Email marketing (weekly deals)
- Referral program (30 EGP credit)

#### **Market Expansion**

- Expand to nearby areas (El Fashn, Beba)
- Add new restaurant categories
- Launch grocery delivery
- Corporate catering

---

## 🚧 Risks & Mitigation

### **Technical Risks**

| Risk             | Impact   | Probability | Mitigation                                           |
| ---------------- | -------- | ----------- | ---------------------------------------------------- |
| App crashes/bugs | High     | Medium      | Extensive testing, error monitoring, staged rollouts |
| Server downtime  | High     | Low         | Supabase SLA 99.9%, multi-region backup              |
| Data breach      | Critical | Low         | Regular security audits, encryption, compliance      |
| Slow performance | Medium   | Medium      | Code optimization, CDN, caching strategies           |

### **Business Risks**

| Risk                               | Impact   | Probability | Mitigation                                                                |
| ---------------------------------- | -------- | ----------- | ------------------------------------------------------------------------- |
| Low restaurant adoption            | Critical | Medium      | Value proposition (low 5-7% commission), direct sales, first month free   |
| Competition (Talabat/Noon enters)  | High     | Medium      | Local focus, lower commission (5-7% vs 15-20%), better relationships      |
| Low order volume                   | Critical | Medium      | Aggressive marketing, university partnerships, influencers                |
| Payment fraud                      | Medium   | Low         | COD dominance, verification, anti-fraud tools                             |
| Providers lack delivery capability | High     | Low         | Target only providers with existing delivery, assist with setup if needed |

### **Operational Risks**

| Risk                         | Impact | Probability | Mitigation                                          |
| ---------------------------- | ------ | ----------- | --------------------------------------------------- |
| Poor delivery quality        | High   | Medium      | Provider training, rating system, quality standards |
| Customer service issues      | Medium | Medium      | Dedicated support team, response SLA                |
| Restaurant disputes          | Medium | Medium      | Clear contracts, mediation process                  |
| Seasonal demand fluctuations | Low    | High        | Marketing during slow periods, diversify            |

---

## 📅 Development Roadmap

### **Week 0-1 (Nov 18-23, 2025): Foundation & Core Features** ✅ 100% COMPLETE

**Completed Tasks:**

- [x] Project initialization (Next.js 16.0.3 + TypeScript)
- [x] Git repository setup and GitHub integration
- [x] Design system foundation
  - [x] Tailwind CSS 3.4.17 configuration (downgraded from v4 for stability)
  - [x] shadcn/ui components installation (13 components)
  - [x] Light-only theme (brand consistency)
  - [x] RTL layout support
  - [x] Brand colors: Engezna Blue (#009DE0)
- [x] Typography implementation
  - [x] Noto Sans Arabic (variable font)
  - [x] Noto Sans English (variable font)
  - [x] Font loading optimization
  - [x] CSS variables configuration
- [x] Logo component (6 variations)
- [x] Core UI components (ThemeProvider, ThemeToggle, LanguageSwitcher)
- [x] Internationalization setup (next-intl working perfectly)
- [x] Homepage structure
- [x] **Database deployment**
  - [x] Supabase project setup
  - [x] Schema deployed (1,431 lines SQL)
  - [x] 4 providers seeded
  - [x] 30 menu items seeded
  - [x] RLS policies active
- [x] **Provider browsing feature**
  - [x] Provider listing page (/providers)
  - [x] Category filtering
  - [x] Real-time data from Supabase
  - [x] Loading states
- [x] **Provider detail pages**
  - [x] Provider info display
  - [x] Menu items grid
  - [x] Dietary tags
- [x] **Shopping cart (global state)**
  - [x] Add/remove items
  - [x] Quantity management with Zustand
  - [x] Total calculations
  - [x] Floating cart bar
  - [x] Cart persistence
  - [x] Multi-provider handling
- [x] Documentation (PRD, README, claude.md)

**Time Invested:** ~20 hours
**Sprint Velocity:** High (100% complete)

### **Week 2 (Nov 23-25, 2025): Authentication & Checkout** ✅ 100% COMPLETE

**Completed Tasks:**

- [x] Supabase Auth integration (email/password + OTP)
- [x] Authentication hooks (useAuth, useUser, useSession)
- [x] Authentication actions (signup, login, OTP, password reset)
- [x] User session management
- [x] Protected routes with ProtectedRoute component
- [x] Checkout flow UI
  - [x] Customer information form (pre-filled)
  - [x] Delivery address input
  - [x] Payment method selection (COD)
  - [x] Order summary with pricing
- [x] Order placement backend
  - [x] Create orders in database
  - [x] Create order items
  - [x] Clear cart after order
- [x] Order confirmation page
  - [x] Success message
  - [x] Order details display
  - [x] Track order button
- [x] **Order tracking page** (`/orders/[id]`)
  - [x] Status timeline display
  - [x] Real-time order status updates
  - [x] Provider contact information
  - [x] Order details and items
  - [x] Live refresh functionality
- [x] **Order history page** (`/orders`)
  - [x] List of user's past orders
  - [x] Order status badges
  - [x] Filter tabs (all/active/completed)
- [x] **My Orders navigation** in header with active count badge
- [x] **Multi-page settings system** (7 pages)
  - [x] Settings menu hub (`/profile`)
  - [x] Account settings (`/profile/account`) - Edit first/last name, phone
  - [x] Email change (`/profile/email`) - With password verification
  - [x] Password change (`/profile/password`) - With validation
  - [x] Language selection (`/profile/language`)
  - [x] Address management (`/profile/addresses`) - Full CRUD with cascading dropdowns
  - [x] Location settings (`/profile/governorate`) - Governorate and city selection
- [x] Database migration for governorate_id and city_id columns
- [x] 80+ new translation keys (AR/EN) for settings pages

**Time Invested:** ~25 hours
**Sprint Velocity:** Excellent (100% complete)

### **Week 3 (Nov 25-27, 2025): Partner Registration & Dashboard** ✅ 100% COMPLETE

**Completed Tasks:**

- [x] **Partner Registration** (`/partner/register`)
  - [x] Multi-step registration (personal info + business type)
  - [x] Business category dropdown (6 types: restaurant, cafe, supermarket, juice_shop, pharmacy, vegetables_fruits)
  - [x] Partner role dropdown (owner/manager)
  - [x] Creates provider with status "incomplete"
- [x] **Complete Profile Page** (`/provider/complete-profile`)
  - [x] Store info (name AR/EN, phone, governorate/city cascade, address)
  - [x] Logo upload with preview (2MB limit)
  - [x] Delivery settings (fee, time, minimum order, radius)
  - [x] Submit for review → status "pending_approval"
- [x] **Status-aware Provider Dashboard**
  - [x] "incomplete" → Shows complete profile prompt
  - [x] "pending_approval" → Shows under review message
  - [x] "rejected" → Shows rejection reason + resubmit button
  - [x] "approved/open/closed" → Shows full dashboard
- [x] **Provider Orders Management** (`/provider/orders`)
  - [x] Stats row (new/in-progress/completed/total)
  - [x] Filter tabs (All, New, In Progress, Completed, Cancelled)
  - [x] Order cards with customer info, items, delivery address
  - [x] Accept/Reject buttons for pending orders
  - [x] Status update flow (Accepted → Preparing → Ready → Out for Delivery → Delivered)
  - [x] Order detail page (`/provider/orders/[id]`)
  - [x] Auto-refresh orders every 60 seconds
- [x] **Menu Management System** (`/provider/products`)
  - [x] Products list with stats (total/available/unavailable)
  - [x] Filter tabs and search functionality
  - [x] Add product page (`/provider/products/new`)
  - [x] Edit product page (`/provider/products/[id]`)
  - [x] Product form with attributes (vegetarian, spicy, prep time, calories)
  - [x] Image upload to Supabase Storage
  - [x] Product categories (provider-specific)
- [x] **Store Hours Management** (`/provider/store-hours`)
  - [x] Weekly schedule (7 days)
  - [x] Toggle days open/closed
  - [x] Quick actions (Open all, Close all, Copy hours)
- [x] **Promotions System** (`/provider/promotions`)
  - [x] 3 promotion types (Percentage, Fixed Amount, Buy X Get Y)
  - [x] Date range, minimum order, max discount options
  - [x] Applies to all or specific products
- [x] **Reports & Analytics** (`/provider/reports`)
  - [x] Revenue cards (Today, This Week, This Month, Last Month)
  - [x] Order stats and completion rate
  - [x] Revenue chart (last 30 days)
  - [x] Top 5 selling products
- [x] **Finance Dashboard** (`/provider/finance`)
  - [x] Total earnings and pending payout
  - [x] Commission breakdown (up to 7% platform fee)
  - [x] Transaction history with date range filter
- [x] **Provider Settings** (`/provider/settings`)
  - [x] Store Info, Delivery, Status tabs
  - [x] Toggle store status (Open/Temporarily Paused/Closed)
- [x] **Provider Profile** (`/provider/profile`)
  - [x] Account info, language switcher, password change, sign out

**Time Invested:** ~40 hours
**Sprint Velocity:** Excellent (100% complete)

### **Week 4 (Nov 28 - Dec 1, 2025): Admin Dashboard & Supervisor System** ✅ 100% COMPLETE

**Completed Tasks:**

- [x] **Unified Admin Components**
  - [x] AdminHeader with language switcher, notifications, user menu
  - [x] AdminSidebar with collapsible navigation
  - [x] Consistent Engezna Blue (#009DE0) theming
- [x] **Locale-aware Number Formatting**
  - [x] Arabic-Indic numerals (٠-٩) in Arabic locale
  - [x] Western Arabic numerals (0-9) in English locale
  - [x] Utility at `/src/lib/utils/formatters.ts`
- [x] **Supervisor Management** (`/admin/supervisors`)
  - [x] Full CRUD for admin team members
  - [x] Roles: super_admin, general_moderator, store_supervisor, support, finance
  - [x] Permission system for granular access control
  - [x] Stats dashboard with role breakdown
  - [x] Filter by status and role
- [x] **Roles Management** (`/admin/roles`)
  - [x] Full CRUD for roles
  - [x] View role permissions
  - [x] Edit permissions for all roles (including system roles)
- [x] **RBAC + ABAC Permission System**
  - [x] Permission-based access control per resource and action
  - [x] Geographic constraints (governorate, city, district)
  - [x] Amount limits with approval thresholds
  - [x] Time-based restrictions and field-level access
  - [x] PermissionsProvider React context
  - [x] `usePermissions` hook with `can()`, `canSync()`, `hasResource()` methods
- [x] **Admin Invitation System**
  - [x] `admin_invitations` database table
  - [x] Invitation page (`/admin/supervisors/invite`)
  - [x] Supervisor registration page (`/admin/register/[token]`)
  - [x] Dedicated admin login (`/admin/login`)
  - [x] Token validation with expiry
- [x] **Tasks Management** (`/admin/tasks`)
  - [x] Task assignment between director and supervisors
  - [x] Status: new, accepted, in_progress, pending, completed, cancelled
  - [x] Priority levels: urgent, high, medium, low
  - [x] Deadline tracking with overdue indicators
  - [x] Progress percentage tracking
- [x] **Approvals System** (`/admin/approvals`)
  - [x] Types: refund, customer_ban, provider_suspend, commission_change
  - [x] Status workflow: pending, approved, approved_with_changes, rejected
  - [x] Create/decision modals
  - [x] Justification and response tracking
- [x] **Internal Messages** (`/admin/messages`)
  - [x] Inbox and sent views
  - [x] Compose message modal
  - [x] Broadcast to all team members
  - [x] Read/unread tracking
  - [x] Priority: urgent or normal
- [x] **Announcements** (`/admin/announcements`)
  - [x] Types: urgent, important, info
  - [x] Pinned announcements
  - [x] Expiry dates
  - [x] CRUD for super admins
- [x] **Brand Identity Refresh**
  - [x] Updated from Orange (#E85D04) to Engezna Blue (#009DE0)
  - [x] Light-only theme (dark mode removed)
  - [x] New navigation bars for customer and provider
  - [x] Updated all brand documentation

**Time Invested:** ~35 hours
**Sprint Velocity:** Excellent (100% complete)

### **Week 5-6 (Dec 2-15, 2025): Admin Backend Integration & UI Polish** 🔄 IN PROGRESS

**✅ Completed (Session 8-11):**

- [x] **Admin Backend Integration Phase 0** ✅ (Dec 3, 2025)
  - [x] TypeScript types for admin module (`src/lib/admin/types.ts`)
  - [x] Audit logging system (`src/lib/admin/audit.ts`)
  - [x] Provider management functions (approve/reject/suspend/reactivate)
  - [x] User management functions (ban/unban/role change)
  - [x] Basic dashboard statistics
  - [x] API routes + React hooks
  - [x] Provider detail page with actions
- [x] **Execute Supabase Storage SQL** ✅ (Dec 1, 2025)
  - [x] Create storage bucket for images
  - [x] Enable logo and product image uploads
- [x] **UI/UX Improvements** ✅ (Dec 4, 2025 - Session 11)
  - [x] Reset Password page (`/auth/reset-password`)
  - [x] Provider Login page (`/provider/login`)
  - [x] Footer component (4-column layout)
  - [x] Partner Landing page (`/partner`)
  - [x] EngeznaLogo unification across all pages
- [x] **Analytics Geographic Filtering Fix** ✅ (Dec 3, 2025 - Session 10)
  - [x] Fixed analytics showing zeros when filtering by governorate
  - [x] Added fallback name-based filtering

**🔄 In Progress:**

- [ ] **Advanced Analytics**
  - [ ] Time-series revenue/orders charts
  - [ ] Performance metrics and trends

**✅ Completed:**

- [x] **Payment Integration (Kashier)**
  - [x] Kashier account setup and API credentials
  - [x] Integrate Kashier Egyptian payment gateway
  - [x] Online payment support for customers
  - [x] Payment status webhooks
  - [ ] Account activation (pending Kashier approval)

### **Week 7-8 (Dec 16-29, 2025): Notifications & Customer Features** 🔄 PLANNED

**Medium Priority Tasks (MOSTLY COMPLETE ✅):**

- [x] **Notifications System**
  - [x] Real-time notifications (Supabase Realtime) ✅
  - [ ] SMS notifications (Twilio or local provider)
  - [⏸️] Email transactional notifications - **مؤجل** (يتطلب Resend/SendGrid + API Keys)
- [x] **Customer Reviews & Ratings** ✅
  - [x] Rate providers after order
  - [x] Leave reviews
  - [x] Display ratings on provider cards
- [x] **Order Cancellation** ✅
  - [x] Allow customers to cancel orders
  - [x] Cancellation reason selection
  - [ ] Refund handling
- [x] **Promo Codes System** ✅
  - [ ] Create promo codes in admin (Admin UI needed)
  - [x] Apply discount codes at checkout ✅
  - [x] Track promo code usage ✅

### **Week 9-10 (Dec 30 - Jan 12, 2026): Testing & Optimization** 🔄 PLANNED

**Tasks:**

- [ ] End-to-end testing (customer flow, provider flow, admin flow)
- [ ] Performance optimization
- [ ] Bug fixes from testing
- [ ] UI/UX refinements
- [ ] Security audit
- [ ] Beta testing with real users

### **Week 11-12 (Jan 13-26, 2026): Launch Preparation** 🔄 PLANNED

**Tasks:**

- [ ] Restaurant onboarding (10 partners with delivery teams)
- [ ] Verify provider delivery capability
- [ ] Marketing materials
- [ ] Launch campaign setup
- [ ] Customer support training
- [ ] Provider training sessions
- [ ] Documentation finalization

### **Week 13 (Jan 27 - Feb 2, 2026): SOFT LAUNCH** 🚀 PLANNED

**Tasks:**

- [ ] Limited public release in Beni Suef
- [ ] Monitor performance and stability
- [ ] Gather feedback from early users
- [ ] Fix critical issues
- [ ] Prepare for scale

---

## 👨‍💼 Team & Resources

### **Current Team**

- **Mosab** - Founder, Full-stack Developer, Product Manager

### **Required Team (Month 3+)**

- **Operations Manager** - Restaurant relations, onboarding, support
- **Customer Support** - 2 agents (Arabic-speaking)
- **Marketing Lead** - Digital campaigns, partnerships, content

**Note:** No delivery coordinator needed - providers manage their own delivery staff.

### **Advisors/Consultants**

- **Legal** - Contracts, compliance
- **Accounting** - Financial management, taxes
- **UX Designer** - UI/UX improvements (freelance)

---

## 📞 Support & Operations

### **Customer Support**

#### **Channels**

- In-app chat (primary)
- WhatsApp Business
- Phone hotline (local Beni Suef number)
- Email (support@engezna.com)
- Facebook Messenger

#### **Response SLA**

- Critical (payment issues, missing orders): <15 minutes
- High (delivery delays, wrong items): <30 minutes
- Medium (general inquiries): <2 hours
- Low (feature requests): <24 hours

#### **Support Hours**

- 10 AM - 11 PM daily (Beni Suef time)
- Extended hours during Ramadan

### **Operational Metrics**

#### **KPIs to Track**

- **Order Metrics:**
  - Orders per day/week/month
  - Average order value (AOV)
  - Order cancellation rate
  - Order fulfillment time

- **User Metrics:**
  - New user registrations
  - Monthly active users (MAU)
  - Customer retention rate
  - Customer lifetime value (CLV)

- **Provider Metrics:**
  - Active providers
  - Average preparation time
  - Provider rating
  - Order acceptance rate
  - **Delivery time** (tracked but managed by provider)

- **Financial Metrics:**
  - Gross Merchandise Value (GMV)
  - Revenue (commission only)
  - Customer acquisition cost (CAC)
  - Unit economics

---

## 🌍 Future Vision (Year 2-3)

### **Geographic Expansion**

1. **Upper Egypt Cities:**
   - El-Minia
   - Assiut
   - Sohag
   - Qena

2. **Regional Hub:**
   - Establish Engezna as the leading local marketplace in Upper Egypt
   - 10+ cities covered
   - 500+ partner restaurants

### **Product Expansion**

1. **Engezna Groceries** - Full supermarket marketplace
2. **Engezna Pharmacy** - Medicine and health products
3. **Engezna Express** - Express ordering service
4. **Engezna Business** - B2B catering and supplies

### **Technology Innovation**

1. **AI-Powered:**
   - Demand forecasting
   - Dynamic pricing
   - Personalized recommendations
   - Chatbot customer support

2. **Automation:**
   - Autonomous routing optimization
   - Smart dispatch system
   - Fraud detection

3. **Platform:**
   - Open API for third-party integrations
   - White-label solution for other cities
   - Developer ecosystem

---

## 📝 Success Criteria

### **MVP Success (Month 3)**

- ✅ App deployed and publicly accessible
- ✅ 10+ partner restaurants (with delivery capability)
- ✅ 100+ registered customers
- ✅ 50+ completed orders
- ✅ <5% order failure rate
- ✅ >4.0 average customer rating
- ✅ >4.0 average provider rating

### **Year 1 Success**

- 🎯 50+ partner restaurants/shops
- 🎯 1,000+ monthly active users
- 🎯 5,000+ orders per month
- 🎯 60,000 EGP monthly GMV
- 🎯 >4.2/5 customer satisfaction
- 🎯 <45 minutes average delivery time
- 🎯 Positive unit economics
- 🎯 Break-even or profitable

### **Long-term Success (Year 3)**

- 🎯 Market leader in Upper Egypt local marketplace
- 🎯 10,000+ monthly active users
- 🎯 50,000+ orders per month
- 🎯 2.5M+ EGP monthly revenue
- 🎯 Expanded to 5+ cities
- 🎯 Series A funding secured ($1M+)

---

## 📁 Current Project Structure

### **As of Week 0 (Nov 22, 2025)**

```
engezna/
├── public/
│   └── (static assets - to be added)
├── src/
│   ├── app/
│   │   ├── [locale]/              # Locale-specific routes
│   │   │   ├── layout.tsx         # ✅ Locale layout (html, body, providers)
│   │   │   ├── page.tsx           # ✅ Homepage
│   │   │   ├── not-found.tsx      # ✅ Localized 404
│   │   │   ├── (admin)/           # Admin route group (empty)
│   │   │   ├── (customer)/        # Customer route group (empty)
│   │   │   └── (provider)/        # Provider route group (empty)
│   │   ├── not-found.tsx          # ✅ Root 404
│   │   ├── layout.tsx             # ✅ Root layout (pass-through)
│   │   ├── globals.css            # ✅ Global styles + Tailwind
│   │   └── favicon.ico            # ✅ App icon
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Logo.tsx           # ✅ Logo component (6 variations)
│   │   │   ├── ThemeProvider.tsx  # ✅ Theme provider (light-only)
│   │   │   ├── ThemeToggle.tsx    # ✅ Sun/moon toggle
│   │   │   └── LanguageSwitcher.tsx # ⚠️ Language dropdown (blocked)
│   │   └── ui/                    # ✅ shadcn/ui components
│   │       ├── button.tsx
│   │       ├── avatar.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── slot.tsx
│   │       ├── switch.tsx
│   │       └── tabs.tsx
│   ├── i18n/
│   │   ├── config.ts              # ✅ Locales, default locale config
│   │   ├── request.ts             # ✅ next-intl request handler
│   │   └── messages/
│   │       ├── ar.json            # ✅ Arabic translations
│   │       └── en.json            # ✅ English translations
│   ├── lib/
│   │   ├── fonts.ts               # ✅ Noto Sans font configurations
│   │   └── utils.ts               # ✅ Utility functions (cn, etc.)
│   └── middleware.ts              # ✅ next-intl middleware
├── .env.local                     # ✅ Environment variables
├── components.json                # ✅ shadcn/ui config
├── eslint.config.mjs              # ✅ ESLint configuration
├── next-env.d.ts                  # ✅ Next.js TypeScript declarations
├── next.config.ts                 # ✅ Next.js + next-intl config
├── package.json                   # ✅ Dependencies
├── postcss.config.mjs             # ✅ PostCSS configuration
├── PRD.md                         # ✅ This document
├── README.md                      # ✅ Project readme
├── tailwind.config.ts             # ✅ Tailwind + theme config
├── tsconfig.json                  # ✅ TypeScript configuration
└── .gitignore                     # ✅ Git ignore rules
```

### **Key Files Status**

| File                                         | Status        | Notes                                 |
| -------------------------------------------- | ------------- | ------------------------------------- |
| `src/lib/fonts.ts`                           | ✅ Complete   | Noto Sans Arabic & English configured |
| `src/components/shared/Logo.tsx`             | ✅ Complete   | 6 variations, fully typed             |
| `src/components/shared/ThemeToggle.tsx`      | ⚠️ Deprecated | Light-only theme (no toggle needed)   |
| `src/components/shared/LanguageSwitcher.tsx` | ⚠️ Blocked    | Created but non-functional (routing)  |
| `src/app/[locale]/page.tsx`                  | ⚠️ Blocked    | Returns 404 despite correct structure |
| `src/middleware.ts`                          | ⚠️ Blocked    | Executes but routes fail              |
| `tailwind.config.ts`                         | ✅ Complete   | Custom theme, light-only, RTL support |
| `PRD.md`                                     | ✅ Complete   | Comprehensive documentation           |

---

## 📄 Appendix

### **Competitive Analysis**

| Platform           | Coverage     | Strengths                          | Weaknesses                       | Opportunity                          |
| ------------------ | ------------ | ---------------------------------- | -------------------------------- | ------------------------------------ |
| **Talabat**        | Cairo, Alex  | Brand recognition, large selection | High 15-20% fees, no Upper Egypt | Lower 5-7% commission, local focus   |
| **Noon Food**      | Major cities | Fast delivery                      | High fees, limited reach         | Region expertise, better economics   |
| **Elmenus**        | Nationwide   | Restaurant discovery               | No delivery, no transactions     | Full-stack solution with delivery    |
| **Local Delivery** | Beni Suef    | Established, knows market          | Manual process, no app           | Modern tech, scalability, lower cost |

### **Market Sizing**

**Beni Suef Market:**

- Population: ~750,000
- Smartphone penetration: ~60% = 450,000
- Target demographic (18-45): ~40% = 180,000
- Addressable market: ~25% = 45,000 potential users

**TAM (Total Addressable Market):**

- Upper Egypt population: ~20 million
- Potential users (with expansion): ~2 million

**Initial Market (Year 1):**

- Target: 1,000 active users
- Market penetration: 2% of addressable market

### **Key Assumptions**

1. **Market:**
   - Food delivery adoption growing 30% YoY in Egypt
   - Beni Suef consumers willing to pay for convenience
   - Local restaurants eager for affordable online presence

2. **Operations:**
   - Average delivery time achievable: 35-45 minutes
   - Most restaurants already have delivery staff
   - Restaurant partners: willing to pay 5-7% commission

3. **Financial:**
   - Average order value: 70-100 EGP
   - Customer ordering frequency: 2-4 times/month
   - CAC: 30-50 EGP
   - Payback period: 3-6 months

4. **Technical:**
   - Next.js + Supabase can scale to 10,000+ DAU
   - Infrastructure costs remain <$500/month
   - 99.9% uptime achievable

---

## 📞 Contact & Resources

### **Project Links**

- **GitHub Repository:** https://github.com/Mosabragab/Engezna
- **Figma Designs:** [To be created]
- **Admin Dashboard:** [To be deployed]
- **Staging Environment:** [To be deployed]

### **Key Documents**

- Technical Architecture Document (TAD)
- API Documentation
- Brand Guidelines
- User Research Findings
- Market Research Report

### **Team Communication**

- **Slack:** [To be created]
- **Project Management:** GitHub Projects
- **Documentation:** Notion
- **Design:** Figma

---

**Document Version History:**

- **v1.0** - November 22, 2025 12:00 PM - Initial PRD created with full project scope
- **v1.1** - November 22, 2025 1:00 PM - Updated to reflect actual Week 0 implementation
  - Added actual tech stack versions and status
  - Documented implemented components (Logo, ThemeToggle, fonts)
  - Added Known Issues section with routing blocker
  - Updated design system with actual implementation details
  - Added current project structure
  - Marked database as designed but not implemented
- **v1.2** - November 22, 2025 2:45 PM - Business model revision
  - **Updated brand colors:** Deep Green (#06c769), Black (#000000), White (#FFFFFF)
  - **Removed driver app completely:** Providers manage their own delivery
  - **Updated revenue model:** 5-7% commission only (was 15-20%)
  - **Removed delivery fees:** Providers set their own
  - **Updated financial projections:** Lower revenue but higher margins (60-65%)
  - **Added Competitive Advantages section:** 5 key differentiators
  - **Simplified team structure:** No delivery coordinator needed
  - **Adjusted roadmap:** Removed driver app week (Week 7-8 now provider tools)
  - **Updated KPIs:** Removed driver metrics, kept provider-managed delivery tracking
  - **Key advantage:** Lower commission attracts more providers, simpler operations
- **v2.0** - November 23, 2025 - Week 1 Progress Update
  - **Status:** Week 1 - 75% Complete 🚀
  - **Tech Stack Updates:**
    - Next.js 15.0.3 → 16.0.3
    - React 18.2.0 → 19.2.0
    - Tailwind CSS 4.x → 3.4.17 (downgraded for stability)
  - **Brand Colors Correction:**
    - ❌ Deep Green (#06c769) → ✅ Orange (#E85D04) and Gold (#FDB927)
    - Updated per Brand Identity Guide v1.0
    - Fixed all documentation to reflect correct colors
  - **Database Deployment:**
    - ✅ Database deployed to Supabase
    - ✅ 4 providers seeded (restaurants, coffee shops, groceries, vegetables/fruits)
    - ✅ 30 menu items with full data
    - ✅ RLS policies active
    - Backend status: DESIGNED - NOT DEPLOYED → DEPLOYED - WORKING
  - **Features Completed:**
    - ✅ Provider browsing page with category filtering
    - ✅ Provider detail pages with menu display
    - ✅ Shopping cart (add/remove, quantities, totals, delivery fees)
    - ✅ Real-time data integration with Supabase
    - ✅ Loading states and error handling
  - **Roadmap Updated:**
    - Week 0 and Week 1 tasks consolidated and marked complete
    - Next priority: Authentication backend integration
    - Updated Week 2 focus to Authentication & Checkout
  - **Documentation:**
    - Created PROGRESS_UPDATE.md
    - Updated README.md with current status
    - Updated claude.md with correct brand colors
    - Deleted duplicate Claude.md file
- **v2.1** - November 24, 2025 - Week 1-2 Complete
  - **Status:** Week 1-2 - 85% Complete 🚀 (Overall 45% Complete)
  - **Authentication System (COMPLETE ✅):**
    - ✅ Email/password signup and login
    - ✅ Phone/Email OTP authentication
    - ✅ Protected routes with automatic redirects
    - ✅ Session management
    - ✅ User profile creation
    - ✅ Authentication hooks and actions
  - **Checkout Flow (COMPLETE ✅):**
    - ✅ Customer information form (pre-filled)
    - ✅ Delivery address input
    - ✅ Payment method selection (COD active)
    - ✅ Order summary with pricing breakdown
    - ✅ Order placement in database
    - ✅ Order confirmation page
  - **Shopping Cart (ENHANCED ✅):**
    - ✅ Global state management with Zustand
    - ✅ Cart persistence across navigation
    - ✅ Multi-provider cart handling
  - **Bug Fixes:**
    - ✅ Fixed TypeScript error in verifyOTP function
    - ✅ Fixed signup page to use `users` table
  - **Documentation:**
    - Created WEEK_2_PROGRESS.md
    - Updated all docs to reflect Week 1-2 completion
    - Updated branch reference to current working branch
  - **Next Priority:** Order tracking and user profile (Week 3)
- **v2.2** - November 25, 2025 - Week 1-2 UI Fixes Complete (Munich25/Nov)
  - **Status:** Week 1-2 - 90% Complete 🚀
  - **UI Fixes (ALL COMPLETE ✅):**
    - ✅ Fix 1: "Browse" → "Stores" button - Role-aware navigation with icons
    - ✅ Fix 3: Provider Dashboard - Full dark-themed UI with sidebar, stats, quick actions
  - **Provider Dashboard Features:**
    - ✅ Dark slate theme matching admin aesthetic
    - ✅ Collapsible sidebar with navigation
    - ✅ Stats cards (Today's Orders, Revenue, Pending, Active Products)
    - ✅ Quick action cards (Setup Store, Add Products)
    - ✅ Recent orders section (empty state ready)
    - ✅ Coming soon banner
    - ✅ Mobile responsive with hamburger menu
  - **Homepage Enhancements:**
    - ✅ Role-aware content display (Guest/Customer/Provider/Admin)
    - ✅ Dynamic CTA buttons based on user role
    - ✅ Admin quick stats section
    - ✅ Provider quick actions section
  - **Documentation:**
    - Updated claude.md (v5.0)
    - Updated README.md with Nov 25 session
    - Updated PRD.md with v2.2
  - **Next Priority:** Provider dashboard backend
- **v2.3** - November 25, 2025 - Order System Complete (Munich25/Nov Session 2)
  - **Status:** Week 1-2 - 95% Complete 🚀
  - **Order System (COMPLETE ✅):**
    - ✅ Order tracking page (`/orders/[id]`) - Status timeline, provider info, live refresh
    - ✅ Order history page (`/orders`) - Filter by all/active/completed
    - ✅ My Orders navigation in header with active count badge
    - ✅ Shared Header component
  - **Bug Fixes:**
    - ✅ Fixed order placement error (customer_id, JSONB delivery_address, platform_commission, etc.)
    - ✅ Added commission_rate to cart Provider type
  - **Documentation:**
    - Updated claude.md (v5.0)
    - Updated README.md consistency
    - Updated PRD.md (v2.3)
  - **Next Priority:** Provider dashboard backend (order management)
- **v2.4** - November 25, 2025 - Multi-Page Settings System Complete
  - **Status:** Week 1-2 - 98% Complete 🚀
  - **Settings System (COMPLETE ✅):**
    - ✅ Restructured single `/profile` page into 7 dedicated pages
    - ✅ Settings menu hub (`/profile`) - Navigation with cards and icons
    - ✅ Account settings (`/profile/account`) - First/last name split (UI), phone editing
    - ✅ Address management (`/profile/addresses`) - Full CRUD with cascading dropdowns (governorate → city → district)
    - ✅ Email change (`/profile/email`) - With password verification using Supabase updateUser()
    - ✅ Password change (`/profile/password`) - With validation and current password check
    - ✅ Language selection (`/profile/language`) - Switch AR/EN with auto-redirect
    - ✅ Location settings (`/profile/governorate`) - Select governorate and city
  - **Database Changes:**
    - ✅ New migration: `20250125000003_add_governorate_city_to_profiles.sql`
    - ✅ Added `governorate_id` and `city_id` columns to profiles table
    - ✅ Created indexes for performance
  - **Translation Updates:**
    - ✅ Added 80+ new translation keys for all settings pages
    - ✅ Complete AR/EN coverage for forms, labels, errors, success messages
  - **Code Metrics:**
    - ~1,933 lines of new code across 7 pages
    - 10 files changed, 2,102 insertions
  - **Documentation:**
    - Updated claude.md (v6.0)
    - Updated README.md with settings features
    - Updated PRD.md (v2.4)
  - **Next Priority:** Run governorate migration, then provider dashboard backend
- **v2.5** - November 26, 2025 - Address Form Fix
  - **Status:** Week 1-2 - 100% Complete 🚀
  - **District Dropdown Fix:**
    - ✅ Fixed `loadDistricts` function that was incorrectly filtering by `governorate_id`
    - ✅ Districts table only has `city_id`, not `governorate_id`
    - ✅ Updated cascade: Governorate → City → District (via city_id)
    - ✅ Updated `District` type to reflect actual DB schema
  - **Address Form Status:**
    - ✅ Full CRUD operations working
    - ✅ Cascading dropdowns: Governorate → City → District
    - ✅ All fields functional with proper translations
  - **Documentation:**
    - Updated claude.md (v6.1)
    - Updated README.md with current status
    - Updated PRD.md (v2.5)
  - **Next Priority:** Provider dashboard backend
- **v3.0** - November 27, 2025 - Week 3 Complete (Provider Dashboard)
  - **Status:** Week 3 - 100% Complete ✅
  - **Provider Dashboard Features (ALL COMPLETE):**
    - ✅ Partner registration (multi-step flow)
    - ✅ Business profile completion (logo upload, delivery settings)
    - ✅ Status-aware dashboard (incomplete/pending/approved)
    - ✅ Orders management (accept/reject, status updates)
    - ✅ Menu management (add/edit/delete products, image upload)
    - ✅ Store hours management (weekly schedule)
    - ✅ Promotions system (create/edit campaigns)
    - ✅ Reports & Analytics (revenue, orders, top products)
    - ✅ Finance dashboard (earnings, payouts, commission)
    - ✅ Provider settings (store info, delivery, status toggle)
    - ✅ Provider profile (password, language, sign out)
    - ✅ Auto-refresh orders (every 60 seconds)
    - ✅ Product categories (provider-specific)
  - **What's NOT Working (Documented):**
    - ✅ Admin panel (UI only, no functionality)
    - ✅ Online payment (Kashier integrated, pending activation)
    - ❌ Push/SMS notifications
    - ✅ Order cancellation
    - ✅ Reviews/Ratings
    - ✅ Promo codes
    - ✅ Supabase Storage bucket (SQL not executed)
  - **Documentation:**
    - Updated claude.md (v16.0) with "What's NOT Working" section
    - Updated README.md with Week 3 complete status
    - Updated PRD.md (v3.0) with full progress
  - **Next Priority:** Admin panel, payment integration
- **v3.1** - November 27, 2025 - Brand Identity Refresh & Navigation Standards
  - **Status:** Brand Documentation Update
  - **Brand Identity Changes:**
    - ✅ Updated brand color from Orange (#E85D04) to Engezna Blue (#009DE0)
    - ✅ Removed dark mode - Light-only theme for consistent brand experience
    - ✅ New navigation bars for customer and provider interfaces
    - ✅ Fixed hover dropdown menu gap issues
    - ✅ Improved button visibility and hover states
  - **Documentation Updates:**
    - ✅ Updated BRAND_IDENTITY_GUIDE.md (v2.0) with:
      - Navigation bar standards
      - UI/UX design standards
      - Lessons learned & anti-patterns
      - Light-only theme decision
    - ✅ Updated BRAND_IMPLEMENTATION_GUIDE.md (v2.0) with:
      - Navigation bar implementation code
      - Hover states & dropdown menu fixes
      - Testing checklist
    - ✅ Updated engezna-theme.css (v2.0) with navigation styles
    - ✅ Updated README.md with new brand colors
    - ✅ Updated PRD.md with brand refresh info
    - ✅ Updated claude.md with current brand standards
  - **Lessons Learned (Documented):**
    - Dropdown menu gap issue causes hover to fail
    - Ghost buttons need explicit hover backgrounds
    - RTL arrows need dynamic swapping
    - Light-only theme simplifies development
  - **Next Priority:** Admin panel, payment integration
- **v4.0** - November 29, 2025 - Week 4 Complete (Admin Dashboard + Supervisor System)
  - **Status:** Week 4 - 100% Complete ✅
  - **Admin Dashboard Features (ALL COMPLETE):**
    - ✅ Unified AdminHeader with language switcher, notifications, user menu
    - ✅ Unified AdminSidebar with collapsible navigation
    - ✅ Locale-aware number formatting (Arabic-Indic numerals ٠-٩)
    - ✅ Supervisor management with roles (super_admin, general_moderator, store_supervisor, support, finance)
    - ✅ Permission system for granular access control
    - ✅ Tasks management with assignment, priorities, and deadlines
    - ✅ Approvals workflow system for refunds, bans, commission changes
    - ✅ Internal messaging with inbox/sent views and broadcast
    - ✅ Team announcements with types (urgent, important, info)
  - **Location Settings Enhancement:**
    - ✅ District/neighborhood filtering with cascading dropdowns
    - ✅ Improved location selection in settings
  - **Code Metrics:**
    - ~4,500 lines of new code across admin pages
    - 6 new admin pages created
    - 2 shared admin components (AdminHeader, AdminSidebar)
  - **Documentation Updates:**
    - ✅ Updated PRD.md with Week 4 features
    - ✅ Updated README.md with admin dashboard status
    - ✅ Updated claude.md with new features
  - **Next Priority:** Admin backend integration, payment integration
- **v4.1** - December 1, 2025 - Roles Page Fixes & Documentation Sync
  - **Status:** Week 4+ - Ongoing Improvements ✅
  - **Roles Page Fixes:**
    - ✅ Fixed permissions not showing in role view modal
    - ✅ Added loading state for permission fetching
    - ✅ Reset rolePermissions state before loading new data
    - ✅ Added error handling for permission queries
  - **Enable Editing for All Roles:**
    - ✅ Removed `!role.is_system` condition that prevented editing system roles
    - ✅ All roles now have Edit button (including super_admin, support, finance)
    - ✅ System roles still have protected code field
  - **Documentation Updates:**
    - ✅ Updated claude.md with December 1 session
    - ✅ Updated README.md with roles page fixes
    - ✅ Updated PRD.md with v4.1
  - **Next Priority:** Admin backend integration, payment integration
- **v4.2** - December 1, 2025 - Week 5 Customer Journey + TypeScript Fixes
  - **Status:** Week 5 - Customer Journey Implementation ✅
  - **Customer Journey Components (Session 3-4):**
    - ✅ PWA Foundation (manifest.json, InstallPrompt)
    - ✅ CustomerLayout, CustomerHeader, BottomNavigation
    - ✅ 11 shared components (ProviderCard, ProductCard, SearchBar, etc.)
    - ✅ Home section components (HeroSection, CategoriesSection, OffersCarousel)
    - ✅ Customer hooks (useFavorites, useProviders)
    - ✅ New pages: /cart, /favorites, /offers
    - ✅ Improved /providers and /providers/[id] pages
    - ✅ 83+ new translation keys (AR/EN)
  - **TypeScript Fixes (Session 4):**
    - ✅ Fixed demoOffers field names (title_ar, title_en, etc.)
    - ✅ Added onViewAll prop to OffersCarousel
    - ✅ Updated Provider interfaces for null compatibility
    - ✅ Fixed disabled prop type in cart page
    - ✅ Added onCategoryClick to CategoriesSection
    - ✅ Build passes successfully
  - **Documentation Updates:**
    - ✅ Updated claude.md (v19.1)
    - ✅ Updated PRD.md (v4.2)
  - **Next Priority:** UI improvements based on user feedback
- **v4.3** - December 2, 2025 - City-Based Filtering & UI Fixes
  - **Status:** Week 5 - Customer Journey Improvements ✅
  - **City-Based Provider Filtering:**
    - ✅ Providers shown to customers filtered by their selected city
    - ✅ Added city filtering to home page and providers page
    - ✅ Updated useProviders hook to support cityId option
    - ✅ Display user's city name with link to change location
  - **AI Chat Ordering Feature (دردش واطلب):**
    - ✅ ChatFAB with message icon (replaced microphone)
    - ✅ TextChat component for text-based ordering with OpenAI
    - ✅ Removed voice features, kept AI assistant functionality
  - **Header Component Improvements:**
    - ✅ Added hideAuth prop to hide auth section for internal pages
    - ✅ Added RTL-aware arrow icons to back button
    - ✅ Applied hideAuth to governorate and addresses pages
  - **UI Fixes:**
    - ✅ Offer cards updated to blue gradient colors (#009DE0, #0088CC, #0077B6)
    - ✅ Category text shortened ("خضار وفواكه" → "خضار")
    - ✅ Category card width increased for better display
    - ✅ Governorate page error handling improved
  - **Documentation Updates:**
    - ✅ Updated README.md, claude.md, PRD.md with session 5 changes
  - **Next Priority:** Continue customer journey improvements
- **v4.4** - December 3, 2025 - Animated Logo & Documentation
  - **Status:** Week 5 - Animated Logo System ✅
  - **Animated Engezna Logo:**
    - ✅ Created `EngeznaLogo.tsx` component with RTL reveal animation
    - ✅ Uses Aref Ruqaa Google Font for Arabic calligraphy style
    - ✅ Animation reveals text right-to-left (1.8s duration)
    - ✅ Size variants: xs, sm, md, lg, xl, 2xl
    - ✅ Props: showPen, loop, loopDelay, static, bgColor
    - ✅ Logo text color: #0F172A (Charcoal)
  - **Splash Screen Component:**
    - ✅ Created `SplashScreen.tsx` for app loading screen
    - ✅ Uses EngeznaLogo size="2xl" with pen decoration
    - ✅ Configurable duration and onComplete callback
  - **Header Updates:**
    - ✅ Updated `CustomerHeader.tsx` to use EngeznaLogo
    - ✅ Updated shared `Header.tsx` to use EngeznaLogo
    - ✅ Added Aref Ruqaa font to `layout.tsx`
    - ✅ Changed location text color to match MapPin icon (blue)
  - **Documentation Updates:**
    - ✅ Updated BRAND_IDENTITY_GUIDE.md (v3.0) with animated logo specs
    - ✅ Updated VISUAL_ASSETS_GUIDE.md (v2.0) with logo guidelines
    - ✅ Added Aref Ruqaa typography documentation
  - **Next Priority:** Admin backend integration, payment integration

---

**Approved By:**

- **Mosab** - Founder & Product Lead - December 3, 2025

**Next Review Date:** December 4, 2025

---

_This is a living document that will be updated as the project evolves and new insights are gained._
