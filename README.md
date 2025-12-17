# Engezna - إنجزنا

<div align="center">

![Engezna Logo](public/logo.svg)

**Modern Food Delivery Platform for Beni Suef, Upper Egypt**

منصة توصيل طعام حديثة لمدينة بني سويف، صعيد مصر

[![Next.js](https://img.shields.io/badge/Next.js-16.0.7-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.1-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

[English](#english) | [العربية](#arabic)

</div>

---

## English

### 🎯 About Engezna

**Engezna (إنجزنا)** - meaning "We've got it done!" - is a B2C food delivery marketplace designed specifically for Beni Suef and Upper Egypt. We connect local restaurants, coffee shops, and grocery stores with customers through a modern, bilingual platform.

#### **Our Mission**
To bring modern food delivery services to Upper Egypt while supporting local businesses and creating economic opportunities through fair, transparent pricing.

#### **Key Differentiator**
- **6 months 0% commission** then **max 7%** (vs competitors' 25-30%)
- **0% customer service fees** - always!
- Providers manage their own delivery staff
- Arabic-first user experience with full RTL support
- Built for local market dynamics

### ✨ Features

#### **For Customers**
- 🍔 Browse local restaurants, coffee shops, and groceries
- 🔍 Search and filter by cuisine, rating, delivery time
- 🛒 Easy ordering with real-time tracking
- 💳 Multiple payment options (Cash on Delivery, online)
- 🎨 Clean light theme (consistent brand experience)
- 🌍 Bilingual interface (Arabic/English)
- 📱 Mobile-first responsive design

#### **For Restaurant Partners**
- 📋 Simple menu management
- 📊 Real-time order notifications
- 💰 **0% for 6 months**, then **max 7%** commission
- 📈 Sales analytics and insights
- 🚚 Use your existing delivery staff
- 💻 Easy-to-use dashboard

#### **For Admins**
- 📊 Complete platform oversight
- 👥 User and provider management
- 💵 Financial reporting and payouts
- 🎯 Promo code and campaign management
- 📈 Real-time analytics

### 🛠️ Tech Stack

#### **Frontend**
- **Framework:** Next.js 16.0.7 (App Router) - Security patched
- **React:** 19.2.1 (Security patched for CVE-2025-55182)
- **Language:** TypeScript 5.9.3
- **Styling:** Tailwind CSS 3.4.17 with custom design tokens
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Internationalization:** next-intl 4.5.5
- **Theme:** Light-only (brand consistency)
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod

#### **Backend**
- **Platform:** Supabase
  - PostgreSQL database
  - Authentication (email, phone, social)
  - Real-time subscriptions
  - Storage (images, documents)
  - Row Level Security (RLS)

#### **Infrastructure**
- **Hosting:** Vercel (planned)
- **CDN:** Vercel Edge Network
- **Analytics:** Vercel Analytics + Supabase Analytics
- **Monitoring:** Sentry (planned)

#### **Third-Party Services**
- **Maps:** HERE Maps API
- **Payments:** Fawry (Egyptian payment gateway)
- **SMS:** Twilio or local Egyptian provider
- **Push Notifications:** Firebase Cloud Messaging

### 🚀 Getting Started

#### **⚠️ Important Note - Project Status**

This project is in **active development** (Week 5 - Complete Feature Set ✅). What you'll see:

**Works (Customer Features):**
- ✅ Design system, theming (light-only mode)
- ✅ Language switching (Arabic/English)
- ✅ Navigation and routing
- ✅ **Animated Engezna Logo** (RTL reveal animation with Aref Ruqaa font, unified across all pages)
- ✅ **Footer** (4-column layout: Brand, Customers, Partners, Contact)
- ✅ **Database deployed with real data** (4 providers, 30 menu items)
- ✅ **Provider browsing** (browse restaurants, coffee shops, groceries)
- ✅ **Provider detail pages** (view menus, ratings, delivery info)
- ✅ **Shopping cart** (add/remove items, calculate totals, global state)
- ✅ **User authentication** (signup/login with email or OTP)
- ✅ **Reset Password page** (full password reset flow)
- ✅ **Checkout flow** (address input, payment method selection)
- ✅ **Order placement** (creates orders in database)
- ✅ **Order confirmation** (order details, tracking button ready)
- ✅ **Order tracking page** (status timeline, provider info, live refresh)
- ✅ **Order history page** (filter by all/active/completed)
- ✅ **My Orders navigation** (in header with active order count badge)
- ✅ **Multi-page settings system** (7 dedicated pages)
- ✅ **Account settings** (edit first/last name, phone)
- ✅ **Email change** (with password verification)
- ✅ **Password change** (with validation)
- ✅ **Address management** (full CRUD with cascading dropdowns)
- ✅ **Language selection** (switch between AR/EN)
- ✅ **Location settings** (select governorate and city)
- ✅ **Order cancellation** (cancel pending/confirmed/accepted orders)
- ✅ **Reviews & Ratings** (rate providers after delivery)
- ✅ **Favorites** (save favorite providers)
- ✅ **Real-time notifications** (Supabase Realtime subscription with polling fallback)
- ✅ **In-app chat** with providers (order-based messaging)
- ✅ **Message read status** indicators (✓ sent, ✓✓ read)
- ✅ **Promo codes** (apply discount codes at checkout)

**Works (Provider Features):**
- ✅ **Partner Landing Page** (`/partner` - benefits, CTA, animations)
- ✅ **Partner Registration** (multi-step registration for businesses)
- ✅ **Dedicated Provider Login** (`/provider/login`)
- ✅ **Business Profile Completion** (store info, logo upload, delivery settings)
- ✅ **Status-aware Dashboard** (incomplete/pending/approved states)
- ✅ **Orders Management** (accept/reject orders, status updates)
- ✅ **Menu Management** (add/edit/delete products, image upload)
- ✅ **Store Hours** (weekly schedule management)
- ✅ **Promotions** (create/edit promotional campaigns)
- ✅ **Reports & Analytics** (revenue, order stats, top products)
- ✅ **Finance Dashboard** (earnings, payouts, commission breakdown)
- ✅ **Provider Settings** (store info, delivery settings, status toggle)
- ✅ **Provider Profile** (password change, language, sign out)
- ✅ **Auto-refresh Orders** (every 60 seconds)
- ✅ **Real-time Order Notifications** (Supabase Realtime)
- ✅ **In-app chat** with customers (order-based messaging)
- ✅ **Notification management** (mark read, delete)
- ✅ **Reviews Management** (`/provider/reviews` - view and respond)
- ✅ **Settlements Page** (`/provider/settlements` - view dues and payment history)
- ✅ **Excel Menu Import** (`/provider/menu-import` - bulk import products)
- ✅ **4 Pricing Types** (fixed, per_unit, variants, weight_variants)
- ✅ **Product Variants** (sizes, weights, options per product)

**Works (Admin Features - Week 4):**
- ✅ **Unified Admin Components** (AdminHeader, AdminSidebar with Engezna Blue theming)
- ✅ **RBAC + ABAC Permission System** (roles, permissions, geographic/amount constraints)
- ✅ **Roles Management Page** (`/admin/roles` - full CRUD for roles and permissions)
- ✅ **PermissionsProvider** (React context for permission management)
- ✅ **Supervisor Management** (full CRUD, roles: super_admin, general_moderator, support, finance)
- ✅ **Admin Invitation System** (invite supervisors with pre-configured roles and permissions)
- ✅ **Dedicated Admin Login** (`/admin/login` with role validation)
- ✅ **Tasks Management** (assignment, priorities, deadlines, progress tracking)
- ✅ **Approvals System** (workflow for refunds, bans, commission changes)
- ✅ **Internal Messages** (inbox/sent, compose, broadcast, read tracking)
- ✅ **Announcements** (team notifications with types: urgent, important, info)
- ✅ **Locale-aware number formatting** (Arabic-Indic numerals ٠-٩ in Arabic)
- ✅ **Settlements Management** (`/admin/settlements` - generate, record payments, track dues)

**Doesn't Work Yet:**
- ⚠️ **Admin backend integration** (Phase 0 complete - providers/users connected, advanced analytics pending)
- ❌ **Online payment** (Fawry NOT integrated, only Cash on Delivery)
- ❌ **Real-time push notifications** (no Firebase/SMS integration)
- ✅ **Order cancellation** (Session 12 - customers can cancel pending/confirmed/accepted orders)
- ✅ **Reviews/Ratings** (Session 12 - customers can rate providers and leave reviews)
- ✅ **Favorites** (Session 12 - customers can favorite providers)
- ✅ **Promo codes** (apply discount codes at checkout) - Session 12
- ✅ **Supabase Storage bucket** (Configured and working)

**What You Can Test (Customer):**
- Browse 4 live providers at `/providers`
- View provider menus and details
- Add items to shopping cart (persisted globally)
- Create account or login (`/auth/signup`, `/auth/login`)
- Complete checkout flow (`/checkout`)
- Place order and view confirmation
- Track orders with status timeline (`/orders/[id]`)
- Cancel pending/confirmed/accepted orders
- Rate and review providers after delivery
- View order history with filters (`/orders`)
- Favorite/unfavorite providers
- View favorites (`/favorites`)
- Access settings menu (`/profile`)
- Edit account information (`/profile/account`)
- Manage delivery addresses (`/profile/addresses`)
- Change email and password (`/profile/email`, `/profile/password`)
- Switch language in settings (`/profile/language`)
- Select location (governorate/city) (`/profile/governorate`)
- Switch between Arabic ↔ English

**What You Can Test (Provider):**
- Register as partner (`/partner/register`)
- Complete business profile (`/provider/complete-profile`)
- View provider dashboard (`/provider`)
- Manage orders (`/provider/orders`) - Accept/Reject/Update status
- Manage menu items (`/provider/products`) - Add/Edit/Delete
- Set store hours (`/provider/store-hours`)
- Create promotions (`/provider/promotions`)
- View and respond to reviews (`/provider/reviews`)
- View analytics (`/provider/reports`)
- View earnings (`/provider/finance`)
- Update store settings (`/provider/settings`)

---

#### **Prerequisites**
- Node.js 18.x or later
- npm, yarn, pnpm, or bun
- Git

#### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/Mosabragab/Engezna.git
cd Engezna
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Supabase (required for future features, not needed for current build)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Other services (not needed yet)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

**Note:** The app will run without these environment variables. You'll just see the design/UI without backend functionality.

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. **Open your browser**

Visit [http://localhost:3000](http://localhost:3000) - it will redirect to locale-specific route.

**Recommended routes:**
- Arabic (default): [http://localhost:3000/ar](http://localhost:3000/ar)
- English: [http://localhost:3000/en](http://localhost:3000/en)
- **Providers (working):**
  - Browse all: [http://localhost:3000/ar/providers](http://localhost:3000/ar/providers)
  - Provider details: [http://localhost:3000/ar/providers/[id]](http://localhost:3000/ar/providers/[id])
- Auth pages (UI only):
  - [http://localhost:3000/ar/auth/login](http://localhost:3000/ar/auth/login)
  - [http://localhost:3000/ar/auth/signup](http://localhost:3000/ar/auth/signup)

#### **Build for Production**
```bash
npm run build
npm run start
```

### 📁 Project Structure

```
engezna/
├── public/              # Static assets
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── [locale]/   # Locale-specific routes
│   │   │   ├── (customer)/  # Customer pages
│   │   │   ├── (provider)/  # Provider dashboard
│   │   │   ├── admin/       # Admin panel
│   │   │   │   ├── layout.tsx    # Admin layout (PermissionsProvider)
│   │   │   │   ├── roles/        # Roles management
│   │   │   │   ├── supervisors/  # Supervisors management
│   │   │   │   ├── tasks/        # Tasks management
│   │   │   │   ├── approvals/    # Approvals workflow
│   │   │   │   └── ...
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   ├── shared/     # Shared components
│   │   └── ui/         # shadcn/ui components
│   ├── i18n/
│   │   ├── config.ts   # i18n configuration
│   │   ├── request.ts  # Request handler
│   │   └── messages/   # Translation files
│   │       ├── ar.json # Arabic translations
│   │       └── en.json # English translations
│   ├── lib/
│   │   ├── supabase/   # Supabase clients
│   │   └── permissions/
│   │       └── use-permissions.tsx  # Permissions hook & context
│   ├── types/
│   │   └── permissions.ts  # Permission types (RBAC+ABAC)
│   └── middleware.ts   # Next.js middleware
├── supabase/
│   └── migrations/     # Database migrations
├── PRD.md              # Product Requirements Document
├── Claude.md           # AI assistant guide
└── package.json        # Dependencies
```

### 🎨 Design System

#### **Brand Colors (Brand Identity Guide v2.0)**
- **Primary:** Engezna Blue `#009DE0` - Trust, professionalism, clarity
- **Secondary:** Black `#000000` - Professional, elegant
- **Accent:** White `#FFFFFF` - Clean, minimal
- **Deals/Discounts:** Green-Cyan `#00C27A`
- **Premium/Highlight:** Soft Gold `#FFD166`
- **Info:** Sky Blue `#36C5F0`
- **Error:** Coral Red `#FF5A5F`

**Theme:** Light-Only (Dark mode has been removed for simplicity and consistent brand experience)

**Note:** Brand colors updated from Orange (#E85D04) to Engezna Blue (#009DE0) as of November 27, 2025.

#### **Typography**
- **Arabic UI:** Noto Sans Arabic (Variable Font)
- **English UI:** Noto Sans (Variable Font)
- **Logo:** Aref Ruqaa (Arabic Calligraphy for animated logo)
- **Weights:** 400, 500, 600, 700

#### **Components**
All components support:
- ✅ Light-only theme (consistent brand experience)
- ✅ RTL (Right-to-Left) layout
- ✅ Responsive design
- ✅ Accessibility (WCAG 2.1 AA)

### 🧪 Development

#### **Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

#### **Code Quality**
- TypeScript strict mode enabled
- ESLint with Next.js recommended config
- Prettier for code formatting (planned)
- Husky for pre-commit hooks (planned)

### 📊 Current Status

**Phase:** Week 5 - Admin Backend Integration + UI Polish
**Status:** Week 5 - Complete Feature Set ✅
**Overall Progress:** ~88% of MVP Complete
**Last Updated:** December 11, 2025 (Session 17)

---

### 🔐 Security & Performance Fixes (Session 17 - December 11, 2025)

**Phase 1: Security Fixes**
- ✅ **API Authentication**: Added authentication to AI Chat Order API
- ✅ **Route Protection**: Enabled middleware protection for admin/provider/checkout routes
- ✅ **Variant Price Fix**: Fixed variant price calculation in order creation
- ✅ **Dynamic Commission**: Commission rate now fetched from database per provider
- ✅ **Cart Provider Switch**: Added confirmation dialog when switching restaurants

**Phase 2: Performance Optimization**
- ✅ **Memory Leak Fixes**: Fixed audio memory leaks in notifications (shared instances)
- ✅ **Channel Subscription Leaks**: Fixed realtime channel cleanup using useRef
- ✅ **N+1 Query Optimization**: Combined queries on home page with client-side filtering
- ✅ **Rate Limiting**: Added rate limiting for login, OTP, and password reset endpoints
  - Login: 10 attempts / 15 minutes
  - OTP Send: 5 attempts / 10 minutes
  - OTP Verify: 5 attempts / 5 minutes
  - Password Reset: 3 attempts / hour

**Phase 3: Critical Bug Fixes**
- ✅ **Phone Validation**: Egyptian phone number format validation (01XXXXXXXXX)
- ✅ **Payment Confirmation**: Added confirmation dialog for marking payments as received
- ✅ **Error Handling**: Improved order cancellation with in-modal error display
- ✅ **Realtime Retry Logic**: Added exponential backoff for subscription failures
- ✅ **Chat API Login Message**: Shows "Please login first" instead of generic error
- ✅ **Cart Discount Fix**: Fixed discount calculation for variant original_price
- ✅ **Min Order Feedback**: Shows "Add X EGP to get discount" when min not met

**Phase 4: Admin Panel Optimization**
- ✅ **N+1 Query Fix (Approvals)**: Reduced 80+ queries to 3 using batch fetch
- ✅ **N+1 Query Fix (Orders Modal)**: Used Supabase join for customer names
- ✅ **Error Handling (Approvals)**: User-facing alerts for success/failure
- ✅ **Input Validation**: Commission rate (0-100%) and promo discount validation
- ✅ **Badge Counts Error Handling**: Graceful failure in sidebar badge loading
- ✅ **Dashboard Error Display**: Error alert with retry button

### 🧪 Testing Checklist (Session 17)

**Customer Workflow Tests:**
```
□ Chat API: Open chat without login → Should show "يرجى تسجيل الدخول أولاً"
□ Phone Validation: Try checkout with invalid phone (0501234567) → Should reject
□ Phone Validation: Try checkout with valid phone (01012345678) → Should accept
□ Provider Switch: Add item, then browse another restaurant → Should warn
□ Cart Discount (Single Item): Add discounted item → Discount should show
□ Cart Discount (Min Order): Add item below min order → Show "Add X EGP" message
□ Order Cancellation: Cancel pending order → Should work with in-modal error handling
```

**Provider Workflow Tests:**
```
□ Payment Confirmation: Click "تأكيد الاستلام" → Should update payment_status
□ Payment Error: If update fails → Should show Arabic/English error message
□ Order Notifications: New order arrives → Should get realtime notification
```

**Admin Workflow Tests:**
```
□ Dashboard Load: /admin → Stats should load (with retry on error)
□ Approvals Load: /admin/approvals → Should load fast (3 queries, not 80+)
□ Create Approval: Try commission change > 100% → Should show validation error
□ Create Promo: Try discount > 100% → Should show validation error
□ Approve/Reject: Take action → Should show success message
□ Sidebar Badges: Should show pending providers and tickets count
```

**Performance Tests:**
```
□ Approvals with 20+ items: Load time should be < 2 seconds
□ Dashboard with network issues: Should show error with retry button
□ Rate Limiting: 11+ failed logins → Should block for 30 minutes
```

---

**Session 16 Features (NEW!) - December 10, 2025:**
- ✅ **Excel Menu Import System**:
  - Bulk import products from Excel files
  - 4 pricing types: fixed, per_unit, variants, weight_variants
  - Auto-create categories from Excel
  - Product variants (sizes/weights) support
  - Successfully tested with 156 products, 203 variants, 30 categories
- ✅ **Product Detail Modal** - Full product view for customers
- ✅ **Variant Selection Modal** - Size/weight selection UI
- ✅ **Provider Categories System** - Categories per provider
- ✅ **UI Fixes**:
  - Modal z-index fix (z-[60])
  - Add to Cart button visibility on mobile

**Session 15 Features (NEW!) - December 7, 2025:**
- ✅ **In-App Chat & Messaging System (Evening Session)**:
  - Provider notifications system with new table + triggers
  - Customer notifications with store name display
  - Real-time notifications with polling fallback (10-second interval)
  - Chat message alignment fix for RTL (own messages on RIGHT)
  - Message read status indicators (✓ sent, ✓✓ read)
  - Notification badge stabilization (removed flashing)
  - Notification management (mark read, delete)
- ✅ **Smart Settlements System (Complete - Part 4)**
  - **COD vs Online Payment Logic**:
    - COD orders: Provider collects → Owes up to 7% commission to Engezna
    - Online orders: Engezna collects → Owes 93%+ payout to provider
    - Net balance determines who pays whom
  - Admin settlements page with COD/Online breakdown (orange/blue color coding)
  - Provider settlements page with history and dues overview
  - Settlement detail page with full financial breakdown
  - Professional naming: "عمولة إنجزنا" instead of "المنصة"
  - Dynamic provider name display instead of generic "مزود"
  - Settlement generation with period selector (daily, every 3 days, weekly)
  - **CRITICAL**: Only includes orders with BOTH `status='delivered'` AND `payment_status='completed'`
  - Up to 7% platform commission rate (0% for first 6 months grace period)
  - Payment methods: cash, bank_transfer, instapay, vodafone_cash
- ✅ **🤖 AI Chat to Order (مساعد إنجزنا الذكي - أحمد)**
  - Smart AI assistant for natural language ordering ("دردش واطلب" / "Chat & Order")
  - ChatFAB floating button with message icon
  - GPT-4o-mini AI Agent with 22 tools for menu search, cart management, order tracking
  - Arabic normalization + synonym expansion (كفتة↔كباب, حلويات↔شوكولاتة)
  - Context-aware: remembers selected provider and pending items
- ✅ **Dynamic Footer & Expansion Analytics**
  - Footer dynamically fetches active governorates from database
  - Added Expansion Analytics tab to Admin Locations page (Super Admin only)
  - Governorate ranking with expansion readiness score (0-100%)
- ✅ **Governorate Selection at Registration**
  - New users must select governorate during signup
  - Migration to update existing users with default governorate

**Session 12 Features:**
- ✅ **Order Cancellation**
  - Customers can cancel pending/confirmed/accepted orders
  - Cancellation modal with reason selection (bilingual)
- ✅ **Reviews & Ratings System**
  - Customer review submission on order tracking page (delivered orders)
  - Star rating (1-5) with optional comment
  - Reviews display on provider detail page
  - Provider reviews management page (`/provider/reviews`)
  - Providers can respond to reviews
- ✅ **Real-time Notifications (Supabase Realtime)**
  - useNotifications hook with live subscriptions
  - useProviderOrderNotifications for provider alerts
  - Live unread count in customer header
  - Real-time order notifications for providers
- ✅ **Promo Codes System**
  - Promo code validation (validity, limits, restrictions)
  - Promo code input UI in checkout
  - Discount calculation and display
  - Order creation with discount applied
- ⏸️ **Email Notifications** - مؤجل (يتطلب Resend/SendGrid + API Keys)
- ✅ **Favorites Feature**
  - Customers can favorite/unfavorite providers
  - Favorites page (`/favorites`)

**Session 11 Features:**
- ✅ **Auth System Enhancements**
  - Created Reset Password page (`/auth/reset-password`)
  - Created dedicated Provider Login page (`/provider/login`)
  - Added logo + back-to-home link to all auth pages
- ✅ **Footer & Partner Landing Page**
  - Created Footer component (4-column: Brand | Customers | Partners | Contact)
  - Created Partner Landing page (`/partner`) with hero, benefits, CTA
- ✅ **Logo Brand Consistency (EngeznaLogo Unification)**
  - All pages now use `EngeznaLogo` component with Aref Ruqaa font
  - Customer Header, Provider Header/Sidebar, Admin Header/Sidebar updated
  - Consistent logo sizes: `lg` for login pages, `md` for sidebars, `sm` for mobile

**Session 10 Features:**
- ✅ **Fixed Admin Analytics Geographic Filtering**
  - Fixed analytics showing zeros when selecting a governorate
  - Added fallback name-based filtering for old orders without IDs
  - Main analytics now filters by both provider location AND delivery_address
  - Regional analytics matches by name when IDs are not present

**Session 9 Features:**
- ✅ **Fixed Admin Dashboard Zeros Issue**
  - Updated provider status values across admin module
  - Fixed pending providers count and approval logic

**Session 7 Features:**
- ✅ **Animated Engezna Logo** (`EngeznaLogo.tsx` component)
  - RTL reveal animation (right-to-left, mimicking Arabic writing)
  - Aref Ruqaa Google Font for Arabic calligraphy style
  - Size variants: xs, sm, md, lg, xl, 2xl
  - Props: showPen, loop, loopDelay, static, bgColor
  - Logo text color: #0F172A (Charcoal)
- ✅ **Splash Screen Component** (`SplashScreen.tsx`)
- ✅ **Header Updates** - Using animated logo in CustomerHeader and shared Header
- ✅ **Location Text Color** - Changed to match MapPin icon (blue)
- ✅ **Documentation Updates** - Brand guides updated with logo specs

**Week 5 Features:**
- ✅ PWA Foundation (manifest.json, InstallPrompt component)
- ✅ CustomerLayout with header and bottom navigation
- ✅ 11 shared UI components (ProviderCard, ProductCard, SearchBar, etc.)
- ✅ Home section components (HeroSection, CategoriesSection, OffersCarousel)
- ✅ AI Chat ordering system with ChatFAB and TextChat (دردش واطلب)
- ✅ Customer hooks (useFavorites, useProviders)
- ✅ New pages: /cart, /favorites, /offers
- ✅ Location selector connected to database (governorate/city)
- ✅ Categories synced with database provider types
- ✅ 83+ new translation keys (AR/EN)
- ✅ **City-based provider filtering** (customers see only providers in their city)
- ✅ **🤖 AI Chat Assistant (أحمد)** - Smart ordering assistant with natural language processing
- ✅ **Header component improvements** (hideAuth prop, RTL-aware back arrow)
- ✅ **Offer cards blue gradient** (#009DE0, #0088CC, #0077B6)

**Week 4 Features:**
- ✅ Unified AdminHeader and AdminSidebar components
- ✅ Locale-aware number formatting (Arabic-Indic numerals ٠-٩)
- ✅ Supervisor management with roles and permissions
- ✅ Roles management page (`/admin/roles`) - Full CRUD for roles
- ✅ Tasks management with assignment and tracking
- ✅ Approvals workflow system
- ✅ Internal messaging between team members
- ✅ Team announcements system

**What's Working ✅**

**Customer Features (100% Complete):**
- ✅ Full project infrastructure (Next.js 16.0.3 + TypeScript + Tailwind CSS v3.4.17)
- ✅ Design system with Engezna Blue (#009DE0) brand colors
- ✅ **Database deployed to Supabase** with live data (4 providers, 30 menu items)
- ✅ Provider browsing with category filtering
- ✅ Provider detail pages with menu display
- ✅ Shopping cart with Zustand state management
- ✅ Authentication (email/password + OTP)
- ✅ Complete checkout flow (COD payment)
- ✅ Order tracking with status timeline
- ✅ Order history with filters
- ✅ Multi-page settings system (7 pages)
- ✅ Address management with cascading dropdowns
- ✅ Bilingual support (Arabic/English) with full RTL
- ✅ Light-only theme (consistent brand experience)

**Provider Features (100% Complete):**
- ✅ Partner registration (multi-step flow)
- ✅ Business profile completion (logo upload, delivery settings)
- ✅ Status-aware dashboard (incomplete/pending/approved states)
- ✅ Orders management (accept/reject, status updates)
- ✅ Menu management (add/edit/delete products, image upload)
- ✅ Store hours management (weekly schedule)
- ✅ Promotions system (create/edit campaigns)
- ✅ Reports & Analytics (revenue, orders, top products)
- ✅ Finance dashboard (earnings, payouts, commission breakdown)
- ✅ Provider settings (store info, delivery, status toggle)
- ✅ Provider profile (password, language, sign out)
- ✅ Auto-refresh orders (every 60 seconds)
- ✅ Product categories (provider-specific)

**Admin Features (NEW - Week 4 100% Complete):**
- ✅ Unified AdminHeader with language switcher, notifications, user menu
- ✅ Unified AdminSidebar with collapsible navigation
- ✅ **RBAC + ABAC Permission System** with:
  - Roles management page (`/admin/roles`) for full CRUD operations
  - Permission-based access control per resource and action
  - Geographic constraints (governorate, city, district)
  - Amount limits with approval thresholds
  - Time-based restrictions and field-level access
  - PermissionsProvider React context for all admin pages
  - `usePermissions` hook with `can()`, `canSync()`, `hasResource()` methods
- ✅ Supervisor management with roles (super_admin, general_moderator, support, finance)
- ✅ Tasks management with assignment, priorities, and deadlines
- ✅ Approvals workflow for refunds, bans, commission changes
- ✅ Internal messaging with inbox/sent views and broadcast
- ✅ Team announcements with types (urgent, important, info)
- ✅ Locale-aware number formatting (Arabic-Indic numerals ٠-٩)

**What's NOT Working Yet ⚠️**
- ⚠️ **Admin backend integration** - Phase 0 complete (providers, users), advanced analytics pending
- ❌ **Online payment** - Fawry NOT integrated (only Cash on Delivery works)
- ❌ **Push notifications** - No Firebase/SMS integration
- ✅ **Order cancellation** - Customers can cancel pending/confirmed/accepted orders (Session 12)
- ✅ **Reviews/Ratings** - Customers can rate providers and leave reviews (Session 12)
- ✅ **Favorites** - Customers can favorite providers (Session 12)
- ✅ **Promo codes** - Apply discount codes at checkout (Session 12)
- ✅ **Supabase Storage bucket** - Configured and working (logo/image uploads functional)
- ⏸️ **Email notifications** - **مؤجل** (يتطلب خدمة بريد خارجية مثل Resend/SendGrid + API Keys)

**Foundation Quality:** ✅ Excellent
- Solid architecture with clear separation of concerns
- Professional design system implementation
- Complete database schema deployed and working
- Zero security vulnerabilities in dependencies

**Roadmap:**
- ✅ Week 1-2: Foundation, provider browsing, cart, auth, checkout, orders (COMPLETE)
- ✅ Week 3: Partner registration + dashboard (COMPLETE)
- ✅ Week 4: Admin Dashboard + Supervisor System (COMPLETE)
- ✅ Week 5: Customer Journey + PWA Implementation (IN PROGRESS)
- 📅 Week 6: Admin backend integration, payment integration
- 📅 Week 7-8: Notifications, reviews, promo codes
- 📅 Week 9-10: Testing, optimization, and polish
- 🚀 Week 11-12: Soft launch with initial providers!

### 🤝 Contributing

This is a private project currently under active development. Contributions are not open at this time.

### 📄 License

Proprietary - All rights reserved. This project is not open source.

### 👨‍💼 Team

- **Mosab** - Founder, Full-stack Developer, Product Manager

### 📞 Contact

- **GitHub:** [@Mosabragab](https://github.com/Mosabragab)
- **Project:** [Engezna](https://github.com/Mosabragab/Engezna)

---

## Arabic

<div dir="rtl">

### 🎯 عن إنجزنا

**إنجزنا (Engezna)** - تعني "خلصناها!" - هي منصة توصيل طعام B2C مصممة خصيصًا لمدينة بني سويف وصعيد مصر. نحن نربط المطاعم المحلية والمقاهي ومحلات البقالة بالعملاء من خلال منصة حديثة ثنائية اللغة.

#### **مهمتنا**
جلب خدمات توصيل الطعام الحديثة إلى صعيد مصر مع دعم الأعمال المحلية وخلق فرص اقتصادية من خلال أسعار عادلة وشفافة.

#### **ميزتنا الرئيسية**
- **عمولة منخفضة جدًا 5-7%** (مقارنة بـ 15-20% للمنافسين)
- مقدمو الخدمة يديرون فريق التوصيل الخاص بهم
- تجربة مستخدم بالعربية أولاً مع دعم كامل للكتابة من اليمين لليسار
- مصمم خصيصًا لديناميكيات السوق المحلي

### ✨ المميزات

#### **للعملاء**
- 🍔 تصفح المطاعم والمقاهي ومحلات البقالة المحلية
- 🔍 البحث والتصفية حسب نوع الطعام والتقييم ووقت التوصيل
- 🛒 طلب سهل مع تتبع فوري
- 💳 خيارات دفع متعددة (الدفع عند الاستلام، الدفع الإلكتروني)
- 🎨 ثيم فاتح أنيق (تجربة علامة تجارية متناسقة)
- 🌍 واجهة ثنائية اللغة (عربي/إنجليزي)
- 📱 تصميم متجاوب يبدأ بالموبايل

#### **لشركاء المطاعم**
- 📋 إدارة قائمة طعام بسيطة
- 📊 إشعارات فورية بالطلبات
- 💰 عمولة شفافة 5-7%
- 📈 تحليلات ورؤى للمبيعات
- 🚚 استخدم فريق التوصيل الحالي الخاص بك
- 💻 لوحة تحكم سهلة الاستخدام

#### **للمسؤولين**
- 📊 إشراف كامل على المنصة
- 👥 إدارة المستخدمين ومقدمي الخدمة
- 💵 تقارير مالية ومدفوعات
- 🎯 إدارة رموز الخصم والحملات
- 📈 تحليلات فورية

### 🛠️ التقنيات المستخدمة

- **الواجهة الأمامية:** Next.js 16.0.3، TypeScript، Tailwind CSS 3.4.17
- **الخلفية:** Supabase (PostgreSQL، المصادقة، الوقت الفعلي)
- **الاستضافة:** Vercel
- **المدفوعات:** Fawry
- **الخرائط:** Google Maps API
- **الألوان:** الأزرق (#009DE0) - هوية العلامة التجارية الجديدة

### 🚀 البدء

#### **المتطلبات**
- Node.js 18.x أو أحدث
- npm أو yarn أو pnpm
- Git

#### **التثبيت**

1. **استنساخ المشروع**
```bash
git clone https://github.com/Mosabragab/Engezna.git
cd Engezna
```

2. **تثبيت الحزم**
```bash
npm install
```

3. **إعداد المتغيرات البيئية**
```bash
cp .env.example .env.local
```

4. **تشغيل الخادم المحلي**
```bash
npm run dev
```

5. **افتح المتصفح**

زر [http://localhost:3000/ar](http://localhost:3000/ar) لرؤية التطبيق بالعربية.

### 📊 الحالة الحالية

**المرحلة:** الأسبوع 5 - مجموعة الميزات الكاملة
**الحالة:** الأسبوع 5 - مجموعة الميزات الكاملة ✅
**التقدم الكلي:** ~88% من MVP مكتمل
**آخر تحديث:** 7 ديسمبر 2025 (الجلسة 15)

**مميزات الجلسة 15 (جديد!):**
- ✅ **نظام التسويات** - إدارة تسويات المتاجر والمدفوعات
  - صفحة تسويات الإدارة (`/admin/settlements`)
  - صفحة تسويات المتجر (`/provider/settlements`)
  - يشمل فقط الطلبات المسلمة والمدفوعة
  - نسبة عمولة حتى 7% للمنصة (0% أول 6 شهور)
- ✅ **🤖 المساعد الذكي أحمد** - مساعد ذكي للطلب بالدردشة ("دردش واطلب")
- ✅ **تحليلات التوسع** - مؤشر جاهزية التوسع للمحافظات
- ✅ **اختيار المحافظة عند التسجيل** - إلزامي للمستخدمين الجدد

**مميزات الجلسة 12:**
- ✅ **إلغاء الطلبات** - يمكن للعملاء إلغاء الطلبات المعلقة/المؤكدة/المقبولة
- ✅ **التقييمات والمراجعات** - تقييم المتاجر وكتابة المراجعات
- ✅ **الإشعارات الفورية** - Supabase Realtime للتحديثات المباشرة
- ✅ **أكواد الخصم** - تطبيق أكواد الخصم عند الدفع
- ✅ **المفضلة** - حفظ المتاجر المفضلة
- ⏸️ **إشعارات البريد** - مؤجل (يتطلب Resend/SendGrid + API Keys)

**مميزات الجلسة 10:**
- ✅ **إصلاح فلترة التحليلات الجغرافية**
  - إصلاح ظهور أصفار عند اختيار المحافظة
  - إضافة فلترة احتياطية بالاسم للطلبات القديمة بدون IDs
  - التحليلات الرئيسية تفلتر حسب موقع المتجر وعنوان التوصيل
  - التحليلات الإقليمية تطابق بالاسم عند عدم وجود IDs

**مميزات الجلسة 9:**
- ✅ **إصلاح مشكلة الأصفار في لوحة الإدارة**
  - تحديث قيم حالة المتاجر في وحدة الإدارة
  - إصلاح عد المتاجر المعلقة ومنطق الموافقة

**مميزات الجلسة 7:**
- ✅ **لوجو إنجزنا المتحرك** (مكون `EngeznaLogo.tsx`)
  - أنيميشن RTL reveal (من اليمين لليسار مثل الكتابة العربية)
  - خط Aref Ruqaa للكاليغرافي العربي
  - أحجام: xs, sm, md, lg, xl, 2xl
  - لون النص: #0F172A (رمادي داكن)
- ✅ **مكون شاشة البداية** (`SplashScreen.tsx`)
- ✅ **تحديثات الهيدر** - استخدام اللوجو المتحرك
- ✅ **لون نص الموقع** - تغيير للأزرق ليتناسب مع الأيقونة

**مميزات الأسبوع 5:**
- ✅ أساسيات PWA (manifest.json، مكون InstallPrompt)
- ✅ تخطيط العميل مع الهيدر والتنقل السفلي
- ✅ 11 مكون واجهة مستخدم مشترك
- ✅ مكونات الصفحة الرئيسية (HeroSection، CategoriesSection، OffersCarousel)
- ✅ نظام الدردشة الذكية للطلب (دردش واطلب)
- ✅ اختيار الموقع مرتبط بقاعدة البيانات
- ✅ الأقسام متوافقة مع أنواع المتاجر في قاعدة البيانات
- ✅ **تصفية المتاجر حسب المدينة** (يرى العميل فقط المتاجر في مدينته)
- ✅ **🤖 المساعد الذكي أحمد** للطلب بالدردشة الذكية
- ✅ **تحسينات مكون الهيدر** (إخفاء القسم للصفحات الداخلية)

**ما يعمل ✅**

**مميزات العملاء (مكتملة 100%):**
- ✅ البنية التحتية الكاملة (Next.js 16.0.3 + TypeScript + Tailwind CSS v3.4.17)
- ✅ نظام التصميم بألوان البرتقالي (#E85D04) والذهبي (#FDB927)
- ✅ قاعدة البيانات منشورة على Supabase (4 متاجر، 30 عنصر)
- ✅ تصفح المتاجر مع التصفية حسب الفئة
- ✅ صفحات تفاصيل المتجر مع عرض القائمة
- ✅ عربة التسوق مع إدارة الحالة عبر Zustand
- ✅ المصادقة (بريد/كلمة مرور + OTP)
- ✅ تدفق الدفع الكامل (الدفع عند الاستلام)
- ✅ تتبع الطلبات مع خط زمني للحالة
- ✅ سجل الطلبات مع الفلاتر
- ✅ نظام الإعدادات متعدد الصفحات (7 صفحات)
- ✅ إدارة العناوين مع القوائم المتسلسلة
- ✅ دعم ثنائي اللغة (عربي/إنجليزي) مع RTL كامل
- ✅ ثيم فاتح موحد (لتناسق العلامة التجارية)

**مميزات المتاجر (مكتملة 100%):**
- ✅ تسجيل الشركاء (تدفق متعدد الخطوات)
- ✅ استكمال ملف الأعمال (رفع الشعار، إعدادات التوصيل)
- ✅ لوحة تحكم واعية بالحالة (غير مكتمل/قيد المراجعة/معتمد)
- ✅ إدارة الطلبات (قبول/رفض، تحديثات الحالة)
- ✅ إدارة القائمة (إضافة/تعديل/حذف المنتجات، رفع الصور)
- ✅ إدارة ساعات العمل (الجدول الأسبوعي)
- ✅ نظام العروض (إنشاء/تعديل الحملات)
- ✅ التقارير والتحليلات (الإيرادات، الطلبات، أفضل المنتجات)
- ✅ لوحة المالية (الأرباح، المدفوعات، تفصيل العمولة)
- ✅ إعدادات المتجر (المعلومات، التوصيل، الحالة)
- ✅ ملف المتجر (كلمة المرور، اللغة، تسجيل الخروج)
- ✅ تحديث تلقائي للطلبات (كل 60 ثانية)
- ✅ فئات المنتجات (خاصة بكل متجر)

**مميزات الإدارة (جديد - الأسبوع 4 مكتمل 100%):**
- ✅ مكونات إدارية موحدة (AdminHeader، AdminSidebar)
- ✅ **نظام صلاحيات RBAC + ABAC** مع:
  - صفحة إدارة الأدوار (`/admin/roles`) لعمليات CRUD كاملة
  - التحكم بالوصول حسب المورد والإجراء
  - قيود جغرافية (محافظة، مدينة، حي)
  - حدود مالية مع عتبات الموافقة
  - قيود زمنية والوصول على مستوى الحقول
  - PermissionsProvider كـ React Context لجميع صفحات الإدارة
  - `usePermissions` hook مع `can()`, `canSync()`, `hasResource()`
- ✅ إدارة المشرفين مع الأدوار (مدير عام، مشرف عام، دعم، مالية)
- ✅ إدارة المهام مع التكليف والأولويات والمواعيد النهائية
- ✅ نظام الموافقات للمبالغ المستردة والحظر وتغييرات العمولة
- ✅ الرسائل الداخلية مع صندوق الوارد والمرسل والبث
- ✅ إعلانات الفريق مع الأنواع (عاجل، مهم، معلومات)
- ✅ تنسيق الأرقام حسب اللغة (أرقام عربية-هندية ٠-٩)

**ما لا يعمل بعد ⚠️**
- ❌ **تكامل الخلفية للإدارة** - الواجهة مكتملة لكن غير متصلة بقاعدة البيانات
- ❌ **الدفع الإلكتروني** - فوري غير مدمج (فقط الدفع عند الاستلام)
- ❌ **الإشعارات الفورية** - لا يوجد تكامل Firebase/SMS
- ✅ **إلغاء الطلبات** - يمكن للعملاء إلغاء الطلبات المعلقة/المؤكدة/المقبولة (الجلسة 12)
- ✅ **التقييمات والمراجعات** - يمكن تقييم المتاجر وكتابة المراجعات (الجلسة 12)
- ✅ **أكواد الخصم** - يمكن تطبيق أكواد الخصم عند الدفع (الجلسة 12)
- ✅ **Supabase Storage bucket** - تم التكوين ويعمل (رفع الشعارات والصور)
- ⏸️ **إشعارات البريد** - **مؤجل** (يتطلب خدمة بريد خارجية مثل Resend/SendGrid + API Keys)

**جودة الأساس:** ✅ ممتازة
- بنية معمارية قوية مع فصل واضح للمسؤوليات
- تنفيذ احترافي لنظام التصميم
- مخطط قاعدة بيانات كامل ومنشور ويعمل
- صفر ثغرات أمنية في التبعيات

**خارطة الطريق:**
- ✅ الأسبوع 1-2: الأساس، تصفح المتاجر، العربة، المصادقة، الدفع، الطلبات (مكتمل)
- ✅ الأسبوع 3: تسجيل الشركاء + لوحة التحكم (مكتمل)
- ✅ الأسبوع 4: لوحة تحكم الإدارة + نظام المشرفين (مكتمل)
- ✅ الأسبوع 5: تحسين رحلة العميل + PWA (جاري)
- 📅 الأسبوع 6: تكامل الخلفية للإدارة، تكامل الدفع
- 📅 الأسبوع 7-8: الإشعارات، التقييمات، أكواد الخصم
- 📅 الأسبوع 9-10: الاختبار والتحسين
- 🚀 الأسبوع 11-12: الإطلاق التجريبي!

### 📄 الترخيص

خاص - جميع الحقوق محفوظة. هذا المشروع ليس مفتوح المصدر.

### 👨‍💼 الفريق

- **مصعب** - المؤسس، مطور Full-stack، مدير المنتج

</div>

---

<div align="center">

**Made with 💚 in Beni Suef, Egypt**

صنع بـ 💚 في بني سويف، مصر

</div>
