# Claude Project Guide - Engezna (إنجزنا)

**Last Updated:** November 26, 2025
**Status:** Week 3 - 30% In Progress 🚧
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
- **Status:** Week 3 In Progress - Partner Registration Complete ✅
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

### Partner Registration Flow (NEW! ✅)
1. ✅ Visit `/ar/partner/register` or `/en/partner/register`
2. ✅ Step 1: Personal info (name, email, phone, password)
3. ✅ Step 2: Business type dropdown + Role dropdown
4. ✅ Creates provider with status "incomplete"
5. ✅ Redirect to provider dashboard
6. ✅ Complete profile at `/provider/complete-profile`
7. ✅ Step 3: Store info (name AR/EN, phone, governorate/city, address, logo)
8. ✅ Step 4: Delivery settings (fee, time, minimum order, radius)
9. ✅ Submit for review → status "pending_approval"

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
Week 3 ███░░░░░░░░░  30% 🚧 Partner registration + Dashboard
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

### Week 3: Partner Dashboard (30% 🚧)
- [x] Partner registration page `/partner/register` ✅
- [x] Multi-step registration (personal info + business type) ✅
- [x] Business category dropdown (6 types) ✅
- [x] Partner role dropdown (owner/manager) ✅
- [x] Complete profile page `/provider/complete-profile` ✅
- [x] Cascading governorate/city dropdowns ✅
- [x] Logo upload with preview ✅
- [x] Delivery settings form ✅
- [x] Status-aware provider dashboard ✅
- [ ] Supabase Storage bucket setup (SQL provided)
- [ ] Provider orders management page
- [ ] Real-time order notifications
- [ ] Menu management system

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

1. [ ] Execute Supabase Storage SQL (provided in session)
2. [ ] Provider orders management page `/provider/orders`
3. [ ] Order detail page `/provider/orders/[id]`
4. [ ] Accept/Reject/Update order status
5. [ ] Real-time order notifications
6. [ ] Menu management system

---

## 🐛 Recent Fixes

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

### Partner Registration (NEW)
- `src/app/[locale]/partner/register/page.tsx` - Partner signup
- `src/app/[locale]/provider/complete-profile/page.tsx` - Complete business info
- `src/app/[locale]/provider/page.tsx` - Status-aware dashboard
- `src/i18n/messages/ar.json` - Arabic translations (partner namespace)
- `src/i18n/messages/en.json` - English translations (partner namespace)

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

**Version:** 7.0 (Week 3 - Partner Registration Complete)
**Last Updated:** November 26, 2025
**Next Review:** November 28, 2025

**🎉 Partner registration system complete! Next: Provider orders management + real-time notifications!**
