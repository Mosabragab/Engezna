# Product Requirements Document (PRD)
## Engezna - انجزنا | Food Delivery Platform

**Version:** 1.2 (Business Model Update)  
**Date:** November 22, 2025  
**Last Updated:** November 22, 2025 2:45 PM  
**Project Lead:** Mosab  
**Location:** Beni Suef, Upper Egypt  

---

## 📋 Executive Summary

**Engezna (انجزنا)** is a B2C food delivery marketplace platform designed specifically for Beni Suef, Upper Egypt. The platform connects local restaurants, coffee shops, and grocery stores with customers, enabling fast and reliable food delivery in an underserved market.

**Mission:** To bring modern food delivery services to Upper Egypt, starting with Beni Suef, while supporting local businesses and creating economic opportunities.

**Key Differentiator:** Ultra-low 5-7% commission model where providers manage their own delivery staff, allowing us to offer the most competitive rates in the Egyptian market.

---

## ⚠️ Known Issues & Blockers

### **Critical Blocker: next-intl Routing (Week 0)**

**Issue:** Application routes build successfully but return 404 errors at runtime.

**Details:**
- Build output shows routes generated correctly: `/ar`, `/en`
- Static pages pre-rendered successfully
- Runtime requests to `/ar` and `/en` return 404
- Middleware executes correctly
- Files are in correct locations

**Investigation:**
- Initially used Next.js 16.0.3 (latest)
- Downgraded to Next.js 15.0.3 for compatibility
- Downgraded React 19 to React 18.2.0
- Tested multiple next-intl configurations
- Removed/re-added root layout
- Created catch-all routes and not-found pages
- Issue persists in both dev and production builds

**Hypothesis:**
Likely Next.js 15/16 + next-intl 4.5.5 compatibility issue or undocumented routing constraint with App Router.

**Impact:**
- Blocks all language switching functionality
- Prevents homepage from loading
- Delays Week 1 development

**Resolution Options:**
1. **Deep Debug** (1-2 days): Continue investigating with Next.js/next-intl docs
2. **Workaround** (30 mins): Implement client-side i18n with React Context + localStorage
3. **Wait** (unknown): Monitor next-intl GitHub for Next.js 15/16 compatibility updates

**Decision:** To be made at start of Week 1 based on time constraints.

---

## 🎯 Project Overview

### **Problem Statement**
Beni Suef and Upper Egypt lack modern food delivery infrastructure. Existing national platforms (Talabat, Noon) don't serve the region adequately with their high 15-20% commission rates, leaving a gap for:
- Customers who want convenient food delivery
- Local restaurants seeking online presence and affordable platform fees
- Local economy needing digital transformation

### **Solution**
A localized, bilingual (Arabic/English) food delivery platform that:
- Connects customers with local restaurants and shops
- **Providers use their existing delivery staff** (no driver app needed)
- **Ultra-low commission** (5-7% vs competitors' 15-20%)
- Supports Arabic-first user experience with RTL design
- Offers simple, transparent pricing
- Keeps providers' existing operations intact

**Key Differentiator:** By letting providers manage their own delivery (which most already have), we offer the lowest commission in the market while maintaining simplicity.

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

#### **Frontend** ✅ IMPLEMENTED
- **Framework:** Next.js 15.0.3 (App Router) ✅
  - Downgraded from 16.0.3 due to routing compatibility issues with next-intl
  - Using React 18.2.0 for stability
- **Language:** TypeScript 5.x ✅
- **Styling:** Tailwind CSS 4.x ✅
  - Custom configuration with design tokens
  - Dark mode support via next-themes ✅
  - RTL (Right-to-Left) support for Arabic ✅
- **UI Components:** shadcn/ui (Radix UI) ✅
  - Button, Avatar, Dialog, Dropdown, Label, Select, Separator, Slot, Switch, Tabs
  - All components support dark mode
- **Internationalization:** next-intl 4.5.5 ⚠️
  - Configured for Arabic (default) and English
  - Known issue: Routing not working properly (under investigation)
  - Fallback: May switch to client-side i18n if unresolved
- **State Management:** Zustand (planned)
- **Forms:** React Hook Form + Zod validation (planned)

#### **Backend** 🔄 PLANNED
- **Platform:** Supabase (not yet set up)
  - PostgreSQL database
  - Authentication (email, phone, social)
  - Real-time subscriptions
  - Storage (images, documents)
  - Edge Functions (serverless)
  - Row Level Security (RLS)
- **Status:** Database schema designed, implementation pending Week 1-2

#### **Infrastructure**
- **Development:** 
  - ✅ Local development environment (macOS)
  - ✅ Git version control
  - ✅ GitHub repository: https://github.com/Mosabragab/Engezna
- **Hosting:** Vercel (planned - not yet deployed)
  - Frontend deployment
  - Edge Network CDN
  - Automatic deployments from main branch
- **Database:** Supabase (planned - not yet set up)
  - Managed PostgreSQL
  - Real-time capabilities
  - Built-in authentication
- **Analytics:** 
  - Vercel Analytics (to be enabled on deployment)
  - Supabase Analytics (to be configured)
- **Monitoring:** Sentry (to be integrated for error tracking)

#### **Third-Party Integrations** 🔄 ALL PLANNED
- **Maps:** Google Maps API (navigation, geocoding) - Week 2-3
- **Payments:** - Week 3-4
  - Fawry (Egyptian payment gateway)
  - Cash on Delivery (COD) - primary method
  - Vodafone Cash (future consideration)
- **SMS:** Twilio or local Egyptian SMS provider - Week 2
- **Push Notifications:** Firebase Cloud Messaging - Week 4

**Note:** All integrations to be implemented post-MVP routing fix.

### **Database Schema (Core Tables)** 📋 DESIGNED - NOT YET IMPLEMENTED

**Status:** Schema designed and documented. Implementation scheduled for Week 1-2.

**Supabase Setup Required:**
- [ ] Create Supabase project
- [ ] Configure authentication
- [ ] Set up database tables
- [ ] Implement Row Level Security (RLS)
- [ ] Configure storage buckets
- [ ] Set up Edge Functions

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
- **Primary:** "انجزنا" (Arabic) + "Engezna" (English)
- **Variations:** 6 logo variants implemented as React component
  1. **Arabic Large** - انجزنا (display text)
  2. **English Large** - Engezna (display text)
  3. **Arabic Medium** - انجزنا (heading size)
  4. **English Medium** - Engezna (heading size)
  5. **Arabic Small** - انجزنا (body text)
  6. **English Small** - Engezna (body text)
- **Component Props:**
  - `language`: 'ar' | 'en'
  - `variant`: 'small' | 'medium' | 'large'
  - `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  - Fully responsive and theme-aware

#### **Color Scheme** ✅ IMPLEMENTED
- **Primary:** Deep Green (#06c769) 💚
  - Represents: Growth, freshness, speed, "Let's get it done!"
  - Used for: CTAs, highlights, active states, brand elements
- **Secondary:** Black (#000000)
  - Represents: Professional, elegant, modern
  - Used for: Text, borders, backgrounds (dark mode)
- **Accent:** White (#FFFFFF)
  - Represents: Clean, minimal, spacious
  - Used for: Backgrounds (light mode), text on dark
- **Design Tokens:** Configured in `tailwind.config.ts`
  - Deep green as primary color throughout
  - Black/white contrast system
  - Dark mode using inverted black/white scheme
  - RTL-aware spacing and layout
- **Implementation:**
  - Logo uses primary green
  - Gradient backgrounds: white → green → white
  - CTA buttons: Green with white text
  - All shadcn/ui components themed with green accent

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
   - Theme-aware (light/dark mode)
   - Fully typed with TypeScript

2. **ThemeToggle** (`/components/shared/ThemeToggle.tsx`)
   - Sun/Moon icon toggle
   - Smooth transitions
   - Persists preference via localStorage

3. **ThemeProvider** (`/components/shared/ThemeProvider.tsx`)
   - Wraps app with next-themes
   - Provides dark mode context
   - System preference detection

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
   - All support dark mode and RTL

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
   - Tiered structure:
     - Small providers (<50 orders/month): 7%
     - Medium providers (50-200 orders/month): 6%
     - Large providers (200+ orders/month): 5%

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

**Model:** 6% average commission (middle tier)

**Conservative Scenario:**
- Average order value: 80 EGP
- Orders per month: 1,000 (Month 3) → 5,000 (Month 12)
- Commission: 6% average = 4.80 EGP per order
- Monthly revenue (Month 12): 5,000 × 4.80 = ~24,000 EGP
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
- Tiered commission (5% / 6% / 7%)
- No hidden fees
- No delivery fee split confusion
- Providers set their own delivery charges

### **5. Technical Advantages**
- Modern tech stack (Next.js, Supabase)
- Fast, responsive interface
- Real-time order updates
- Bilingual (Arabic/English)
- Dark mode support

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
- Social media campaign (#انجزنا_بني_سويف)
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

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| App crashes/bugs | High | Medium | Extensive testing, error monitoring, staged rollouts |
| Server downtime | High | Low | Supabase SLA 99.9%, multi-region backup |
| Data breach | Critical | Low | Regular security audits, encryption, compliance |
| Slow performance | Medium | Medium | Code optimization, CDN, caching strategies |

### **Business Risks**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low restaurant adoption | Critical | Medium | Value proposition (low 5-7% commission), direct sales, first month free |
| Competition (Talabat/Noon enters) | High | Medium | Local focus, lower commission (5-7% vs 15-20%), better relationships |
| Low order volume | Critical | Medium | Aggressive marketing, university partnerships, influencers |
| Payment fraud | Medium | Low | COD dominance, verification, anti-fraud tools |
| Providers lack delivery capability | High | Low | Target only providers with existing delivery, assist with setup if needed |

### **Operational Risks**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Poor delivery quality | High | Medium | Provider training, rating system, quality standards |
| Customer service issues | Medium | Medium | Dedicated support team, response SLA |
| Restaurant disputes | Medium | Medium | Clear contracts, mediation process |
| Seasonal demand fluctuations | Low | High | Marketing during slow periods, diversify |

---

## 📅 Development Roadmap

### **Week 0 (Nov 18-24, 2025): Foundation** ✅ 95% COMPLETE

**Completed Tasks:**
- [x] Project initialization (Next.js 15.0.3 + TypeScript)
- [x] Git repository setup and GitHub integration
- [x] Design system foundation
  - [x] Tailwind CSS 4 configuration
  - [x] shadcn/ui components installation
  - [x] Dark mode support (next-themes)
  - [x] RTL layout support
- [x] Typography implementation
  - [x] Noto Sans Arabic (variable font)
  - [x] Noto Sans English (variable font)
  - [x] Font loading optimization
  - [x] CSS variables configuration
- [x] Logo component
  - [x] 6 variations (Arabic/English × Small/Medium/Large)
  - [x] React component with TypeScript
  - [x] Theme-aware implementation
- [x] Core UI components
  - [x] ThemeProvider wrapper
  - [x] ThemeToggle component (sun/moon)
  - [x] LanguageSwitcher component (flags dropdown)
- [x] Internationalization setup
  - [x] next-intl configuration
  - [x] Arabic (ar.json) translations
  - [x] English (en.json) translations
  - [x] i18n config and request handler
  - [x] Middleware for locale routing
- [x] Homepage structure
  - [x] Bilingual homepage design
  - [x] Header with logo and navigation
  - [x] Hero section with CTAs
  - [x] Responsive layout
- [x] Documentation
  - [x] Comprehensive PRD (50+ pages)
  - [x] Technical architecture documented
  - [x] 14-week roadmap defined
  - [x] Claude.md (AI assistant working guide and progress tracking)
  - [x] Professional README.md (bilingual project overview)

**Blocked/In Progress:**
- [ ] ⚠️ **CRITICAL BLOCKER:** next-intl routing issue
  - Routes build successfully (/ar, /en)
  - Runtime returns 404 errors
  - Investigation shows potential Next.js 15/16 compatibility issue
  - **Options under consideration:**
    1. Continue debugging with Next.js core team guidance
    2. Switch to client-side i18n solution (20-30 min implementation)
    3. Wait for next-intl update for Next.js 15/16

**Time Invested:** ~13 hours
**Sprint Velocity:** High (95% complete)
**Blockers:** 1 critical (routing)
**Next Priority:** Resolve routing issue OR implement workaround

### **Week 1-2 (Nov 25 - Dec 8): Core Setup**
- [ ] Fix routing issue (Next.js + next-intl)
- [ ] Supabase project setup
- [ ] Database schema design
- [ ] Authentication flow
- [ ] Customer homepage UI
- [ ] Restaurant listing page

### **Week 3-4 (Dec 9-22): Customer App**
- [ ] Restaurant detail page
- [ ] Menu browsing
- [ ] Cart functionality
- [ ] Checkout flow
- [ ] Order placement
- [ ] Order tracking UI

### **Week 5-6 (Dec 23 - Jan 5): Provider Dashboard**
- [ ] Provider registration
- [ ] Menu management
- [ ] Order management
- [ ] Restaurant profile
- [ ] Basic analytics

### **Week 7-8 (Jan 6-19): Provider Tools & Optimization**
- [ ] Advanced menu management
- [ ] Bulk operations
- [ ] Provider mobile optimization
- [ ] Performance analytics
- [ ] Customer feedback system
- [ ] Order history export

### **Week 9-10 (Jan 20 - Feb 2): Admin Panel**
- [ ] Dashboard
- [ ] User management
- [ ] Order monitoring
- [ ] Financial reports
- [ ] Content management

### **Week 11-12 (Feb 3-16): Testing & Polish**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] UI/UX refinements
- [ ] Beta testing with real users

### **Week 13 (Feb 17-23): Launch Preparation**
- [ ] Restaurant onboarding (10 partners with delivery teams)
- [ ] Verify provider delivery capability
- [ ] Marketing materials
- [ ] Launch campaign setup
- [ ] Customer support training
- [ ] Provider training sessions

### **Week 14 (Feb 24 - Mar 2): SOFT LAUNCH** 🚀
- [ ] Limited public release
- [ ] Monitor performance
- [ ] Gather feedback
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
   - Establish Engezna as the food delivery leader in Upper Egypt
   - 10+ cities covered
   - 500+ partner restaurants

### **Product Expansion**
1. **Engezna Groceries** - Full supermarket delivery
2. **Engezna Pharmacy** - Medicine and health products
3. **Engezna Express** - Package delivery service
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
- 🎯 Market leader in Upper Egypt food delivery
- 🎯 10,000+ monthly active users
- 🎯 50,000+ orders per month
- 🎯 2.5M+ EGP monthly revenue
- 🎯 Expanded to 5+ cities
- 🎯 Series A funding secured ($1M+)

---

## 📁 Current Project Structure

### **As of Week 0 (Nov 22, 2025)**
```
enjezna/
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
│   │   │   ├── ThemeProvider.tsx  # ✅ Dark mode provider
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

| File | Status | Notes |
|------|--------|-------|
| `src/lib/fonts.ts` | ✅ Complete | Noto Sans Arabic & English configured |
| `src/components/shared/Logo.tsx` | ✅ Complete | 6 variations, fully typed |
| `src/components/shared/ThemeToggle.tsx` | ✅ Complete | Dark mode working perfectly |
| `src/components/shared/LanguageSwitcher.tsx` | ⚠️ Blocked | Created but non-functional (routing) |
| `src/app/[locale]/page.tsx` | ⚠️ Blocked | Returns 404 despite correct structure |
| `src/middleware.ts` | ⚠️ Blocked | Executes but routes fail |
| `tailwind.config.ts` | ✅ Complete | Custom theme, dark mode, RTL support |
| `PRD.md` | ✅ Complete | Comprehensive documentation |

---

## 📄 Appendix

### **Competitive Analysis**

| Platform | Coverage | Strengths | Weaknesses | Opportunity |
|----------|----------|-----------|------------|-------------|
| **Talabat** | Cairo, Alex | Brand recognition, large selection | High 15-20% fees, no Upper Egypt | Lower 5-7% commission, local focus |
| **Noon Food** | Major cities | Fast delivery | High fees, limited reach | Region expertise, better economics |
| **Elmenus** | Nationwide | Restaurant discovery | No delivery, no transactions | Full-stack solution with delivery |
| **Local Delivery** | Beni Suef | Established, knows market | Manual process, no app | Modern tech, scalability, lower cost |

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

---

**Approved By:**
- **Mosab** - Founder & Product Lead - November 22, 2025

**Next Review Date:** December 22, 2025

---

*This is a living document that will be updated as the project evolves and new insights are gained.*