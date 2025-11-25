# Claude Project Guide - Engezna (إنجزنا)

**Last Updated:** November 24, 2025
**Status:** Week 1-2 - 85% Complete ✅
**Branch:** `claude/two-commits-pr-01VGGENbh1uqCduyA8kDC2ba`

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
- **Status:** Week 1-2 Complete - 85% (Auth + Checkout Flow) ✅
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
9. ✅ **View order confirmation** (order details, tracking ready)

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
Week 2 ██████████░░  85% ✅ Auth + Checkout + Orders
Week 3 ░░░░░░░░░░░░   0% → Order tracking
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

### Week 2: Auth + Checkout (85% ✅)
- [x] User authentication (email/password + OTP)
- [x] Protected routes and session management
- [x] Checkout flow with address input
- [x] Order placement in database
- [x] Order confirmation page
- [x] Global cart state with Zustand
- [ ] Order tracking page ← Next
- [ ] Order history ← Next

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

## 🎯 Next Steps (Week 3)

1. [ ] Order tracking page (`/orders/[id]`)
2. [ ] Order history page (`/orders`)
3. [ ] Real-time order status updates
4. [ ] User profile page with address management
5. [ ] Provider dashboard (order management)

---

## 🐛 Recent Fixes

### Work Session Nov 24, 2025 - Munich ✅
- ✅ **Fix 2**: Logout translation working ("Sign Out" / "خروج")
- ✅ **Fix 4**: Remove "Clear Session" button completely resolved
- ✅ **Fix 3**: Provider 404 Error - PARTIALLY FIXED (created `/[locale]/_provider/page.tsx`)
  - ⚠️ Provider dashboard created but needs differentiation from customer home
- ❌ **Fix 1**: "Browse" → "Stores" button text - STILL PENDING

### Previously Resolved ✅
- ✅ Dark mode toggle (fixed with `resolvedTheme`)
- ✅ Tailwind v4 → v3 downgrade (stability)
- ✅ Brand colors updated (Orange, not Green!)
- ✅ Build errors resolved
- ✅ TypeScript error in verifyOTP function (proper type handling)
- ✅ Signup page fixed to use `users` table
- ✅ Cart persistence across navigation

### Active Issues
- ❌ Fix 1: Navigation button still shows "Browse" instead of "Stores"
- ⚠️ Fix 3: Provider dashboard needs UI differentiation from customer view

---

## 💡 Key Decisions

1. **Tailwind v3** (not v4) - v4 has breaking changes
2. **Provider-based structure** - supports 4 categories
3. **Providers manage delivery** - enables 5-7% commission
4. **Cash-first** - cards in Phase 2
5. **Orange #E85D04** - official brand color

---

## 📁 Important Files

- `claude.md` - This file (project guide)
- `PROGRESS_UPDATE.md` - Latest achievements
- `DATABASE_SETUP.md` - Safe deployment guide
- `PRD.md` - Full requirements
- `src/app/globals.css` - Brand colors
- `package.json` - Dependencies (Tailwind v3)

---

**Version:** 4.0 (Week 1-2 Complete)
**Last Updated:** November 24, 2025
**Next Review:** November 26, 2025

**🎉 Authentication and checkout complete! Ready for order tracking!**
