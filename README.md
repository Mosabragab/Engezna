# Engezna - إنجزنا

<div align="center">

![Engezna Logo](public/logo.svg)

**Modern Food Delivery Platform for Beni Suef, Upper Egypt**

منصة توصيل طعام حديثة لمدينة بني سويف، صعيد مصر

[![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
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
- **Ultra-low 5-7% commission** (vs competitors' 15-20%)
- Providers manage their own delivery staff
- Arabic-first user experience with full RTL support
- Built for local market dynamics

### ✨ Features

#### **For Customers**
- 🍔 Browse local restaurants, coffee shops, and groceries
- 🔍 Search and filter by cuisine, rating, delivery time
- 🛒 Easy ordering with real-time tracking
- 💳 Multiple payment options (Cash on Delivery, online)
- 🌙 Dark mode support
- 🌍 Bilingual interface (Arabic/English)
- 📱 Mobile-first responsive design

#### **For Restaurant Partners**
- 📋 Simple menu management
- 📊 Real-time order notifications
- 💰 Transparent 5-7% commission
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
- **Framework:** Next.js 16.0.3 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.4.17 with custom design tokens
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Internationalization:** next-intl 4.5.5
- **Theme:** next-themes (dark mode support)
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
- **Maps:** Google Maps API
- **Payments:** Fawry (Egyptian payment gateway)
- **SMS:** Twilio or local Egyptian provider
- **Push Notifications:** Firebase Cloud Messaging

### 🚀 Getting Started

#### **⚠️ Important Note - Project Status**

This project is in **active development** (Week 3 - 30% In Progress). What you'll see:

**Works:**
- ✅ Design system, theming (dark/light mode)
- ✅ Language switching (Arabic/English)
- ✅ Navigation and routing
- ✅ **Database deployed with real data** (4 providers, 30 menu items)
- ✅ **Provider browsing** (browse restaurants, coffee shops, groceries)
- ✅ **Provider detail pages** (view menus, ratings, delivery info)
- ✅ **Shopping cart** (add/remove items, calculate totals, global state)
- ✅ **User authentication** (signup/login with email or OTP)
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
- ✅ **Partner Registration** (NEW! - multi-step registration for businesses)
- ✅ **Business Profile Completion** (store info, logo upload, delivery settings)
- ✅ **Status-aware Dashboard** (incomplete/pending/approved states)

**Doesn't Work Yet:**
- ❌ Provider orders management (accepting/rejecting orders)
- ❌ Real-time order notifications
- ❌ Menu management system
- ❌ Admin panel
- ❌ Payment integration (online payment with Fawry)

**What You Can Test:**
- Browse 4 live providers at `/providers`
- View provider menus and details
- Add items to shopping cart (persisted globally)
- Create account or login (`/auth/signup`, `/auth/login`)
- **Register as partner** (`/partner/register`) - NEW!
- **Complete business profile** (`/provider/complete-profile`) - NEW!
- Complete checkout flow (`/checkout`)
- Place order and view confirmation
- Track orders with status timeline (`/orders/[id]`)
- View order history with filters (`/orders`)
- Access settings menu (`/profile`)
- Edit account information (`/profile/account`)
- Manage delivery addresses (`/profile/addresses`)
- Change email and password (`/profile/email`, `/profile/password`)
- Switch language in settings (`/profile/language`)
- Select location (governorate/city) (`/profile/governorate`)
- See real-time cart calculations
- Switch between Arabic ↔ English
- Toggle dark ↔ light mode

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
│   │   │   └── (admin)/     # Admin panel
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
│   ├── lib/            # Utility functions
│   └── middleware.ts   # Next.js middleware
├── PRD.md              # Product Requirements Document
├── Claude.md           # AI assistant guide
└── package.json        # Dependencies
```

### 🎨 Design System

#### **Brand Colors (Brand Identity Guide v1.0)**
- **Primary:** Orange `#E85D04` - Energy, warmth, action, "Let's get it done!"
- **Gold:** `#FDB927` - Premium quality, excellence
- **Secondary:** Black `#000000` - Professional, elegant
- **Accent:** White `#FFFFFF` - Clean, minimal

**Note:** Previous documentation incorrectly listed Deep Green (#06c769) as primary. The official brand color is Orange (#E85D04).

#### **Typography**
- **Arabic:** Noto Sans Arabic (Variable Font)
- **English:** Noto Sans (Variable Font)
- **Weights:** 400, 500, 600, 700

#### **Components**
All components support:
- ✅ Dark mode
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

**Phase:** Partner Dashboard Development (Nov 26+, 2025)
**Status:** Week 3 - 30% In Progress 🚧

**What's Working ✅**
- ✅ Full project infrastructure (Next.js 16.0.3 + TypeScript + Tailwind CSS v3.4.17)
- ✅ Design system with Orange (#E85D04) and Gold (#FDB927) brand colors
- ✅ **Database deployed to Supabase** with live data
  - ✅ 4 live providers (restaurants, coffee shops, groceries)
  - ✅ 30 menu items across all providers
  - ✅ Safe seeding script (won't destroy existing data)
- ✅ **Provider Browsing Feature**
  - ✅ Browse providers by category (all, restaurants, coffee, grocery, vegetables/fruits)
  - ✅ Provider cards with ratings, delivery info, status badges
  - ✅ Real-time filtering by category
  - ✅ Responsive grid layout
- ✅ **Provider Detail Pages**
  - ✅ Full provider information display
  - ✅ Menu items grid with images
  - ✅ Dietary tags (vegetarian, spicy)
  - ✅ Real-time availability checking
- ✅ **Shopping Cart Feature**
  - ✅ Add/remove items with +/- buttons
  - ✅ Real-time quantity management with Zustand
  - ✅ Subtotal and total calculations
  - ✅ Floating cart summary bar
  - ✅ Delivery fee integration
  - ✅ Cart persistence across navigation
  - ✅ Multi-provider cart handling
- ✅ **Authentication System**
  - ✅ Email/password signup and login
  - ✅ Phone/Email OTP authentication
  - ✅ Protected routes with automatic redirects
  - ✅ Session management
  - ✅ User profile creation
- ✅ **Checkout Flow**
  - ✅ Customer information form (pre-filled)
  - ✅ Delivery address input
  - ✅ Payment method selection (COD active)
  - ✅ Order summary with pricing breakdown
  - ✅ Order placement in database
  - ✅ Order confirmation page
- ✅ **Order System (Complete!)**
  - ✅ Order tracking page with status timeline
  - ✅ Order history page with filters (all/active/completed)
  - ✅ My Orders navigation in header with active count badge
  - ✅ Shared Header component
- ✅ Bilingual support (Arabic/English) with full RTL layout
- ✅ Dark/Light mode with next-themes
- ✅ 13 UI components from shadcn/ui (themed and responsive)
- ✅ Locale routing working perfectly (/ar, /en)
- ✅ Git + Vercel deployment setup
- ✅ Noto Sans Arabic + English variable fonts
- ✅ Complete documentation (PRD, README, claude.md, WEEK_2_PROGRESS.md)

**Work Session Nov 26 - Partner Registration System 🔧 COMPLETE!**
- ✅ **Partner Registration**: Multi-step registration at `/partner/register`
  - Step 1: Personal info (name, email, phone, password)
  - Step 2: Business category + Partner role dropdowns
  - 6 business types: Restaurant, Cafe, Supermarket, Juice Shop, Pharmacy, Vegetables & Fruits
- ✅ **Business Profile Completion**: Complete profile at `/provider/complete-profile`
  - Store name (Arabic/English)
  - Cascading governorate/city dropdowns
  - Logo upload with preview
  - Delivery settings (fee, time, minimum order, radius)
- ✅ **Status-aware Dashboard**: Different views based on registration status
  - "incomplete" → Shows complete profile prompt
  - "pending_approval" → Shows under review message
  - "rejected" → Shows rejection reason + resubmit button
  - "approved" → Shows full dashboard

**What's NOT Working Yet ⚠️**
- ⚠️ **Provider orders management** (accepting/rejecting orders)
- ⚠️ **Real-time order notifications**
- ⚠️ **Menu management system**
- ⚠️ **Admin panel** (no platform management)
- ⚠️ **Payment integration** (Fawry online payment not integrated yet)

**Foundation Quality:** ✅ Excellent
- Solid architecture with clear separation of concerns
- Professional design system implementation
- Complete database schema ready for deployment
- Zero security vulnerabilities in dependencies

**Next Steps (Week 3 Remaining):**
- 📅 Provider orders management page
- 📅 Accept/Reject/Update order status
- 📅 Real-time order notifications
- 📅 Menu management system

**Future (Week 4-12):**
- ✅ Week 1-2: Foundation, provider browsing, cart, auth, checkout, orders (COMPLETE)
- 🚧 Week 3: Partner registration + dashboard backend (30% COMPLETE)
- 📅 Week 4-5: Provider dashboard (menu management, orders)
- 📅 Week 6-7: Provider analytics and multi-user support
- 📅 Week 8-9: Admin panel (platform management, settlements)
- 📅 Week 10-11: Testing, optimization, and polish
- 🚀 Week 12: Soft launch with initial providers!

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
- 🌙 دعم الوضع الليلي
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
- **الألوان:** البرتقالي (#E85D04) والذهبي (#FDB927)

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

**المرحلة:** تطوير المميزات الأساسية (18-26 نوفمبر 2025)
**الحالة:** الأسبوع 1-2 - مكتمل 100% 🚀

**ما يعمل ✅**
- ✅ البنية التحتية الكاملة (Next.js 16.0.3 + TypeScript + Tailwind CSS v3.4.17)
- ✅ نظام التصميم بألوان البرتقالي (#E85D04) والذهبي (#FDB927)
- ✅ **قاعدة البيانات منشورة على Supabase** مع بيانات حية
  - ✅ 4 متاجر مباشرة (مطاعم، كافيهات، بقالة)
  - ✅ 30 عنصر قائمة عبر جميع المتاجر
  - ✅ نص تعبئة آمن (لا يدمر البيانات الموجودة)
- ✅ **ميزة تصفح المتاجر**
  - ✅ تصفح المتاجر حسب الفئة (الكل، مطاعم، كافيهات، بقالة، خضار وفواكه)
  - ✅ بطاقات المتاجر مع التقييمات ومعلومات التوصيل وحالة المتجر
  - ✅ تصفية فورية حسب الفئة
  - ✅ تخطيط شبكي متجاوب
- ✅ **صفحات تفاصيل المتجر**
  - ✅ عرض معلومات المتجر الكاملة
  - ✅ شبكة عناصر القائمة مع الصور
  - ✅ علامات النظام الغذائي (نباتي، حار)
  - ✅ فحص التوفر الفوري
- ✅ **ميزة عربة التسوق**
  - ✅ إضافة/إزالة العناصر بأزرار +/-
  - ✅ إدارة الكمية الفورية مع Zustand
  - ✅ حسابات الإجمالي الفرعي والإجمالي
  - ✅ شريط ملخص العربة العائم
  - ✅ تكامل رسوم التوصيل
  - ✅ استمرارية العربة عبر التنقل
  - ✅ معالجة عربة متعددة المتاجر
- ✅ **نظام المصادقة**
  - ✅ تسجيل ودخول بالبريد/كلمة المرور
  - ✅ مصادقة OTP بالهاتف/البريد
  - ✅ مسارات محمية مع توجيه تلقائي
  - ✅ إدارة الجلسات
  - ✅ إنشاء ملف المستخدم
- ✅ **تدفق الدفع**
  - ✅ نموذج معلومات العميل (معبأ مسبقاً)
  - ✅ إدخال عنوان التوصيل
  - ✅ اختيار طريقة الدفع (الدفع عند الاستلام نشط)
  - ✅ ملخص الطلب مع تفاصيل الأسعار
  - ✅ وضع الطلب في قاعدة البيانات
  - ✅ صفحة تأكيد الطلب
- ✅ **نظام الطلبات (مكتمل!)**
  - ✅ صفحة تتبع الطلب مع خط زمني للحالة
  - ✅ صفحة سجل الطلبات مع فلاتر (الكل/نشط/مكتمل)
  - ✅ رابط طلباتي في الهيدر مع عداد الطلبات النشطة
  - ✅ مكون Header مشترك
- ✅ دعم ثنائي اللغة (عربي/إنجليزي) مع تخطيط RTL كامل
- ✅ الوضع الليلي/النهاري
- ✅ 13 مكون UI من shadcn/ui
- ✅ التوجيه بالمحلية يعمل بشكل مثالي (/ar, /en)
- ✅ إعداد Git + Vercel
- ✅ خطوط Noto Sans العربية والإنجليزية
- ✅ التوثيق الكامل

**ما لا يعمل بعد ⚠️**
- ⚠️ **لوحة تحكم المتاجر** (الواجهة جاهزة، تحتاج إدارة الطلبات)
- ⚠️ **لوحة الإدارة** (لا توجد إدارة منصة)
- ⚠️ **تكامل الدفع** (الدفع الإلكتروني Fawry غير مدمج بعد)
- ⚠️ **الإشعارات الفورية** (تحديثات الطلبات، إشعارات الدفع)
- ⚠️ **إلغاء الطلبات** (لا يمكن للعملاء إلغاء الطلبات بعد)

**جودة الأساس:** ✅ ممتازة
- بنية معمارية قوية
- تنفيذ احترافي لنظام التصميم
- مخطط قاعدة بيانات كامل جاهز للنشر
- صفر ثغرات أمنية في التبعيات

**الخطوات التالية (الأسبوع 3):**
- 📅 لوحة تحكم المتاجر (إدارة الطلبات، الإشعارات)
- 📅 تحديثات حالة الطلب الفورية (Supabase realtime)
- 📅 إلغاء الطلبات
- 📅 إشعارات المتاجر للطلبات الجديدة

**المستقبل (الأسبوع 4-12):**
- ✅ الأسبوع 1-2: الأساس، تصفح المتاجر، العربة، المصادقة، الدفع، الطلبات (مكتمل)
- 📅 الأسبوع 3: لوحة تحكم المتاجر وملف المستخدم
- 📅 الأسبوع 4-5: لوحة تحكم المتاجر (إدارة القوائم، الطلبات)
- 📅 الأسبوع 6-7: تحليلات المتاجر ودعم متعدد المستخدمين
- 📅 الأسبوع 8-9: لوحة الإدارة (إدارة المنصة، التسويات)
- 📅 الأسبوع 10-11: الاختبار والتحسين
- 🚀 الأسبوع 12: الإطلاق التجريبي!

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
