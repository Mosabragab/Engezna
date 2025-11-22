# Project Enjezna (انجزنا) - Development Tracker

## 🎯 Project Overview
- **Name:** Enjezna (انجزنا) - "Let's get it done and order!"
- **Start Date:** November 21, 2025
- **Target Launch:** February 21, 2026 (3 months)
- **Developer:** Solo (Mosab)
- **Commitment:** 40 hours/week
- **Status:** Week 0 - 90% Complete
- **Business Model:** 5-7% commission (vs competitors' 15-20%)
- **Key Advantage:** Providers manage their own delivery = lowest fees in market
- **Documentation:** See PRD.md for full 50+ page requirements document

## 🎨 Brand Identity
- **Primary Color:** Deep Green (#06c769) 💚
- **Secondary Color:** Black (#000000)
- **Accent Color:** White (#FFFFFF)
- **Logo:** Text-based "انجزنا / Engezna" (6 variations)
- **Arabic Name:** انجزنا
- **Tagline:** "انجزنا واطلب" (Two friends ordering: "Let's get it done and order!")
- **Domain:** engezna.com (to be purchased)

## 🌍 Service Categories
1. 🍽️ Restaurants (المطاعم)
2. ☕ Coffee Shops (الكافيهات)
3. 🛒 Groceries (البقالة)
4. 🥬 Vegetables & Fruits (الخضار والفواكه)

## 🔗 Links
- **GitHub Repo:** https://github.com/Mosabragab/Engezna
- **Live Production:** https://enjezna-i1qgol4w0-engeznas-projects.vercel.app
- **Supabase Dashboard:** https://supabase.com/dashboard/project/cmxpvzqrmptfnuymhxmr
- **Vercel Dashboard:** https://vercel.com/engeznas-projects/enjezna

## 📊 Overall Progress
```
[████░░░░░░░░░░░░░░░░░░░░░░░░░░] 12 weeks total
Week 0 ████████ (90% complete - routing blocked)
Week 1 ░░░░
Week 2-12 ░░░░░░░░░░░░
```
**Progress:** 90% of Week 0 Complete

---

## 💰 Business Model

### Revenue
- **Commission:** 5-7% tiered on order value
  - Small providers (<50 orders/month): 7%
  - Medium providers (50-200 orders/month): 6%
  - Large providers (200+ orders/month): 5%
- **Target Revenue:** 180K-360K EGP Year 1
- **Break-even:** Month 6-7 (~3,750 orders/month)
- **Profit Margin:** 60-65% (no driver infrastructure costs)

### Competitive Advantage
- **Talabat/Noon:** 15-20% commission + manage delivery
- **Engezna:** 5-7% commission + providers handle delivery
- **Savings:** Providers keep 10-13% more per order
- **Example:** 100 EGP order = Provider keeps 93-95 EGP vs 80-85 EGP

### Why It Works
- No delivery infrastructure or driver costs
- Providers already have delivery staff
- High profit margins with simple operations
- Lower commission = more provider adoption
- Scales efficiently

---

## ✅ Week 0: Pre-Development Setup (Nov 21-24, 2025)

### 🎉 Day 1: Project Infrastructure - ✅ COMPLETE
**Date:** November 21, 2025  
**Time Spent:** 7 hours (morning + night sessions)  
**Status:** ✅ Deployed to Production

#### Setup & Configuration
- [x] Created project folder structure
- [x] Initialized Next.js 15.0.3 + TypeScript + App Router
- [x] Installed Tailwind CSS v4
- [x] Set up Supabase connection
- [x] Created environment variables (.env.local)

#### Packages Installed (0 Vulnerabilities)
- [x] @supabase/supabase-js & @supabase/ssr
- [x] next-intl (internationalization)
- [x] react-hook-form, zod, @hookform/resolvers
- [x] next-themes (dark/light mode)
- [x] date-fns, zustand
- [x] All Radix UI dependencies

#### Shadcn/ui Components (13)
- [x] button, card, input, label
- [x] dropdown-menu, dialog, badge, avatar
- [x] tabs, select, textarea, switch, separator
- [⏳] toast (will add manually if needed)

#### Project Structure (Provider-Based)
```
src/
├── app/
│   ├── [locale]/
│   │   ├── (customer)/    ✅ Customer-facing pages
│   │   ├── (provider)/    ✅ All service providers (unified)
│   │   └── (admin)/       ✅ Admin panel
│   └── api/               ✅ API routes
├── components/
│   ├── ui/                ✅ Shadcn components (13)
│   ├── customer/          ✅ Customer components (empty)
│   ├── provider/          ✅ Provider components (empty)
│   ├── admin/             ✅ Admin components (empty)
│   └── shared/            ✅ Logo, ThemeToggle, ThemeProvider, LanguageSwitcher
├── lib/
│   ├── fonts/             ✅ Noto Sans Arabic & English
│   ├── supabase/          ✅ Supabase client (configured)
│   ├── hooks/             ✅ Custom React hooks (empty)
│   └── utils/             ✅ Utility functions
├── types/                 ✅ TypeScript types (database.ts)
└── i18n/                  ✅ Translations (AR/EN)
```

#### Branding & Theme
- [x] Brand colors configured (#06c769 deep green, black, white)
- [x] Dark/Light mode CSS variables set
- [x] RTL support added for Arabic
- [x] Custom scrollbar with brand colors
- [x] Gradient backgrounds (white → green → white)

#### Typography System
- [x] Noto Sans Arabic (Variable Font) - Google Fonts
- [x] Noto Sans English (Variable Font) - Google Fonts
- [x] Font loading optimization in Next.js
- [x] CSS variables configuration
- [x] Weights: 400, 500, 600, 700

#### Logo Component (6 Variations)
- [x] Built reusable Logo component
- [x] Arabic: انجزنا (small, medium, large)
- [x] English: Engezna (small, medium, large)
- [x] Props: language, variant, size
- [x] Theme-aware (works in dark mode)

#### Homepage Implementation
- [x] Bilingual landing page (Arabic primary)
- [x] RTL layout fully working
- [x] Gradient background
- [x] Header with logo and navigation
- [x] Hero section with both logos
- [x] Arabic tagline: "انجزنا واطلب"
- [x] Two CTA buttons in Arabic
- [x] Status badge: "🚀 قريباً في بني سويف"
- [x] Responsive design

#### Git & Deployment
- [x] Git repository initialized
- [x] Multiple commits to GitHub
- [x] Connected GitHub to Vercel
- [x] Deployed to production ✅
- [x] Auto-deployment enabled (every push → deploy)

#### Files Created
- [x] src/lib/fonts/index.ts
- [x] src/lib/supabase/client.ts
- [x] src/types/database.ts
- [x] src/i18n/messages/ar.json
- [x] src/i18n/messages/en.json
- [x] src/components/shared/Logo.tsx
- [x] src/components/shared/ThemeProvider.tsx
- [x] src/components/shared/ThemeToggle.tsx
- [x] src/components/shared/LanguageSwitcher.tsx
- [x] .env.local (Supabase credentials)
- [x] claude.md (this file!)
- [x] PRD.md (50+ page requirements document)
- [x] components.json (Shadcn config)
- [x] tailwind.config.ts (custom theme)

**🎉 Milestones:**
- Live on the internet!
- Dark mode working perfectly
- RTL support complete
- Bilingual system ready
- Logo system flexible and reusable

---

### 📅 Day 2-3: Routing Issue Investigation (Nov 22-23)
**Status:** ⚠️ BLOCKED

#### Issue: next-intl Routing Returns 404
- [x] Routes build successfully (/ar, /en)
- [x] Static pages pre-rendered
- [x] Runtime returns 404 errors
- [x] Downgraded Next.js 16.0.3 → 15.0.3
- [x] Downgraded React 19 → 18.2.0
- [x] Tested multiple configurations
- [x] Created catch-all routes
- [x] Added not-found pages
- [x] Spent 12+ hours debugging

**Hypothesis:** Next.js 15/16 + next-intl 4.5.5 compatibility issue

**Resolution Options:**
1. Continue debugging (1-2 days)
2. **Implement client-side i18n workaround (30 mins)** ← Recommended
3. Wait for next-intl update

**Decision:** To be made at start of Week 1

---

### 📅 Day 4: Documentation & Planning (Nov 24)
**Status:** ✅ COMPLETE

#### PRD Creation
- [x] 50+ page Product Requirements Document
- [x] Complete technical architecture
- [x] 14-week development roadmap
- [x] Business model (5-7% commission)
- [x] Competitive advantages section
- [x] Financial projections
- [x] Go-to-market strategy
- [x] Version: 1.2 (Business Model Update)

**Week 0 Final Status:** 90% Complete (routing blocked)

---

## 📅 Month 1: Customer Experience & Core Features

### Week 1: Authentication & Home (Nov 25 - Dec 1)
- [ ] **PRIORITY:** Fix routing issue OR implement client-side i18n
- [ ] Supabase project setup
- [ ] OTP authentication system
- [ ] User registration flow
- [ ] Service category UI (4 categories)
- [ ] Homepage with banner system
- [ ] Search functionality
- [ ] Deploy Week 1 MVP

### Week 2: Provider Listings (Dec 2-8)
- [ ] Provider list page
- [ ] Provider detail page
- [ ] Menu display system
- [ ] Filters & sorting
- [ ] Provider profile pages
- [ ] Deploy Week 2 updates

### Week 3: Shopping Cart (Dec 9-15)
- [ ] Cart functionality
- [ ] Add/remove items
- [ ] Quantity controls
- [ ] Price calculations
- [ ] Cart persistence
- [ ] Deploy Week 3 features

### Week 4: Checkout & Orders (Dec 16-22)
- [ ] Checkout flow
- [ ] Address management
- [ ] Order confirmation
- [ ] Order modification (before preparing)
- [ ] My Orders page
- [ ] Deploy Month 1 complete

---

## 📅 Month 2: Provider Dashboard & Admin

### Week 5: Provider Multi-User System (Dec 23-29)
- [ ] Provider authentication
- [ ] Owner dashboard
- [ ] Staff management (max 2 users)
- [ ] Role-based permissions
- [ ] Deploy Week 5

### Week 6: Order Management (Dec 30 - Jan 5)
- [ ] Incoming orders UI
- [ ] Accept/reject orders
- [ ] Order status updates
- [ ] Order modification handling
- [ ] Deploy Week 6

### Week 7: Menu Management (Jan 6-12)
- [ ] Menu CRUD (Arabic + English)
- [ ] Category management
- [ ] Availability toggle
- [ ] Image upload
- [ ] Bulk operations
- [ ] Deploy Week 7

### Week 8: Provider Analytics (Jan 13-19)
- [ ] Sales dashboard
- [ ] Order statistics
- [ ] Popular items
- [ ] Revenue reports
- [ ] Weekly settlement preview
- [ ] Deploy Month 2 complete

---

## 📅 Month 3: Admin Panel & Launch

### Week 9: Admin Core (Jan 20-26)
- [ ] Super admin authentication
- [ ] Dashboard overview
- [ ] Platform settings (commission: 5-7%)
- [ ] Restaurant verification
- [ ] User management
- [ ] Deploy Week 9

### Week 10: Admin Financial (Jan 27 - Feb 2)
- [ ] All orders monitoring
- [ ] Weekly settlements system
- [ ] Platform revenue analytics
- [ ] Commission tracking (5-7% tiered)
- [ ] Export reports
- [ ] Deploy Week 10

### Week 11: Content & Marketing (Feb 3-9)
- [ ] Home banner management
- [ ] Service category management
- [ ] Provider analytics
- [ ] Customer analytics
- [ ] Performance metrics
- [ ] Deploy Week 11

### Week 12: Testing & Launch (Feb 10-16)
- [ ] Full Arabic/English testing
- [ ] Mobile responsiveness testing
- [ ] Dark/light mode testing
- [ ] Order flow testing
- [ ] Multi-user testing
- [ ] Settlement system testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] **Soft launch (3 providers)**
- [ ] **🚀 Production Launch - Feb 16, 2026**

---

## 📦 Tech Stack

### Frontend
- **Framework:** Next.js 15.0.3 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn/ui (13 components)
- **Icons:** Lucide React
- **i18n:** next-intl 4.5.5 (⚠️ routing issue)
- **Theme:** next-themes (✅ working)
- **Forms:** React Hook Form + Zod (planned)
- **State:** Zustand (planned)
- **Date:** date-fns (installed)

### Backend
- **Database:** PostgreSQL (via Supabase)
- **Auth:** Supabase Auth (OTP, email, phone)
- **Storage:** Supabase Storage (images, documents)
- **Realtime:** Supabase Realtime (order updates)
- **API:** Next.js API Routes + Supabase Edge Functions

### Deployment
- **Hosting:** Vercel
- **Domain:** engezna.com (to be purchased)
- **SSL:** Auto (Vercel)
- **CDN:** Global (Vercel Edge)

### Development
- **Version Control:** Git + GitHub
- **Code Editor:** Cursor (Claude-powered)
- **Package Manager:** npm
- **Linting:** ESLint
- **Formatting:** Prettier (implicit)

---

## 📊 Code Statistics
- **Total Files:** 60+
- **Languages:** TypeScript (94%), CSS (4%), JavaScript (2%)
- **Packages:** 404 installed
- **Vulnerabilities:** 0 ✅
- **Bundle Size:** TBD (will optimize later)

---

## 🎯 Success Metrics (Post-Launch)

### Month 1 (Feb 16 - Mar 16, 2026)
- **Goal:** 10 providers onboarded (with delivery capability)
- **Target:** 50+ orders/week
- **Users:** 100+ registered customers
- **Commission:** 5-7% (tiered)
- **Rating:** 4.0+ average

### Month 2 (Mar 16 - Apr 16, 2026)
- **Goal:** 20 providers
- **Target:** 200+ orders/week
- **Users:** 250+ active customers
- **Retention:** 30%+ monthly

### Month 3 (Apr 16 - May 16, 2026)
- **Goal:** 30 providers
- **Target:** 400+ orders/week
- **Users:** 500+ active customers
- **Revenue:** ~18,000 EGP/month
- **Break-even:** Close to target

---

## 🐛 Known Issues & Blockers

### Active Issues
⚠️ **CRITICAL:** next-intl routing returns 404
- Routes build but fail at runtime
- Spent 12+ hours debugging
- Downgraded Next.js and React
- Need to decide: Fix vs workaround

### Future Considerations
- Toast component not in Shadcn registry (add manually)
- Domain purchase (engezna.com)
- Payment gateway integration (Fawry - Phase 2)
- Google Maps API (Phase 2)

---

## 💡 Key Decisions Made

### Architecture
✅ **Provider-based structure** instead of restaurant-specific  
**Reason:** Supports 4 categories with single codebase

✅ **Web-first approach** (responsive, no native apps initially)  
**Reason:** Faster MVP, works on all devices

✅ **Cash-first payments** (cards Phase 2)  
**Reason:** Common in Egyptian market, simpler to start

✅ **No driver app** (providers manage their own delivery)  
**Reason:** Enables ultra-low 5-7% commission (vs 15-20% competitors). Providers already have delivery staff - we just connect them to more customers. Simpler operations, lower costs, better economics for everyone. This is our key competitive advantage.

### Technology
✅ **Next.js 15.0.3** over alternatives  
**Reason:** Best-in-class, great for solo dev, App Router for future-proofing

✅ **Supabase** over custom backend  
**Reason:** Speed, reliability, scales well, built-in auth & realtime

✅ **Shadcn/ui** over component libraries  
**Reason:** Customizable, modern, no runtime overhead, full control

✅ **5-7% commission model** over traditional 15-20%  
**Reason:** Providers keep delivery = lower costs = lower commission = competitive advantage

---

## 📝 Notes & Learnings

### Technical Learnings
- Next.js 15/16 + next-intl has compatibility issues
- Tailwind CSS v4 requires different configuration approach
- Noto Sans Arabic renders beautifully for RTL
- Google Fonts + Next.js font optimization works seamlessly
- Component-based logo system is highly flexible
- Dark mode with next-themes is trivial to implement
- Vercel deployment is instant and reliable

### Process Learnings
- Document everything in real-time (this file!)
- Test commands one-by-one in terminal
- Commit frequently with descriptive messages
- Terminal heredocs are powerful but need proper escaping
- PRD documentation upfront saves time later
- Business model should drive technical decisions

### Design Learnings
- Text-only logos work perfectly for delivery apps
- Deep green (#06c769) conveys freshness and speed
- Gradient backgrounds add depth without complexity
- Arabic typography needs proper font selection
- RTL layout affects entire component structure
- Dark mode should be tested from day one

### Business Learnings
- Lower commission (5-7%) is THE competitive advantage
- Providers already have delivery staff - leverage that
- No driver management = massive cost savings
- Simple model = faster MVP = quicker validation
- Local focus + low fees = powerful combination

---

## 🎯 Current Sprint (Week 1)

**Focus:** Fix Routing OR Implement Workaround  
**Duration:** 1 day maximum  
**Priority:** CRITICAL BLOCKER

### Priority Tasks
1. ⚠️ **DECIDE:** Debug routing vs client-side i18n workaround
2. Implement chosen solution
3. Test thoroughly (both languages, both modes)
4. Move to Week 1 features (auth, homepage)

---

## 📞 Support & Resources

### Documentation
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Shadcn/ui: https://ui.shadcn.com
- Tailwind: https://tailwindcss.com/docs
- next-intl: https://next-intl-docs.vercel.app

### Community
- GitHub Issues: Report bugs/features
- Vercel Discussions: Deployment help
- Supabase Discord: Database questions
- next-intl GitHub: Routing issue investigation

---

## 📊 Time Tracking

### Week 0 Summary
- **Day 1 Morning:** 4 hours (setup, structure, deployment)
- **Day 1 Night:** 3 hours (fonts, logo, homepage)
- **Day 2-3:** 12 hours (routing debugging)
- **Day 4:** 2 hours (PRD documentation)
- **Total Week 0:** ~21 hours
- **Status:** 90% complete (routing blocked)

### Estimated Remaining
- **Week 1:** 40 hours (fix routing + auth + homepage)
- **Weeks 2-12:** 440 hours (features + testing)
- **Total Project:** ~500 hours over 3 months

---

**Last Updated:** November 22, 2025 - 3:00 PM  
**Next Review:** November 25, 2025 (Week 1 start)  
**Version:** 2.0 - Week 0 Complete (90%) with Business Model Documentation

---

**🎉 Week 0 Achievements:**
✅ Live deployment  
✅ Dark mode working  
✅ RTL support complete  
✅ Bilingual system ready  
✅ Logo system built  
✅ Brand identity established  
✅ PRD documented (50+ pages)  
✅ Business model validated  
⚠️ Routing issue identified

**Next Milestone:** Week 1 - Fix routing & build auth system 🚀