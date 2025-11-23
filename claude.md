# Claude Project Guide - Engezna (انجزنا)

**Last Updated:** November 23, 2025
**Status:** Week 1 - 75% Complete ✅
**Branch:** `claude/verify-munich-branch-01VGGENbh1uqCduyA8kDC2ba`

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
- **Name:** Engezna (انجزنا) - "Let's get it done and order!"
- **Launch:** February 21, 2026 (3 months)
- **Business Model:** 5-7% commission (vs competitors' 15-20%)
- **Status:** Week 1 Core Features 75% Complete ✅
- **Live URL:** https://enjezna-i1qgol4w0-engeznas-projects.vercel.app
- **GitHub:** https://github.com/Mosabragab/Engezna
- **Supabase:** https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr

---

## ✅ What's Working NOW

### Customer Flow (Fully Functional!)
1. ✅ Visit `/ar/providers` or `/en/providers`
2. ✅ Browse all 4 providers with category filtering
3. ✅ Click any provider to see their menu
4. ✅ Add items to cart (+ / - buttons)
5. ✅ See real-time cart total
6. ✅ Checkout button ready

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
Week 1 ██████████░░  75% ✅ Provider browsing + cart
Week 2 ░░░░░░░░░░░░   0% → Checkout + auth
```

### Week 0: Foundation (100% ✅)
- [x] Next.js 16 + TypeScript + Tailwind setup
- [x] Supabase connection
- [x] Dark mode + RTL support
- [x] Bilingual (Arabic/English)
- [x] Homepage + brand identity
- [x] Deployed to production

### Week 1: Core Features (75% ✅)
- [x] Provider browsing page `/providers`
- [x] Provider detail page `/providers/[id]`
- [x] Menu display system
- [x] Shopping cart functionality
- [x] Database schema (1,431 lines)
- [x] Seed data (4 providers, 30 items)
- [ ] User authentication ← Next
- [ ] Checkout flow ← Next

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

## 🎯 Next Steps (Week 1 Completion)

1. [ ] Implement Supabase authentication
2. [ ] Create signup/login pages
3. [ ] Build checkout flow
4. [ ] Add address management
5. [ ] Order confirmation page

---

## 🐛 Recent Fixes

### Resolved ✅
- ✅ Dark mode toggle (fixed with `resolvedTheme`)
- ✅ Tailwind v4 → v3 downgrade (stability)
- ✅ Brand colors updated (Orange, not Green!)
- ✅ Build errors resolved

### Active Issues
- None! All systems operational ✅

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

**Version:** 3.0
**Last Updated:** November 23, 2025
**Next Review:** November 25, 2025

**🎉 Ready to continue building!**
