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

This project is in **active development** (Week 3 - 100% Complete ✅). What you'll see:

**Works (Customer Features):**
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

**Works (Provider Features):**
- ✅ **Partner Registration** (multi-step registration for businesses)
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

**Doesn't Work Yet:**
- ❌ **Admin panel** (UI exists but NO functionality)
- ❌ **Online payment** (Fawry NOT integrated, only Cash on Delivery)
- ❌ **Real-time push notifications** (no Firebase/SMS integration)
- ❌ **Order cancellation** (customers cannot cancel orders)
- ❌ **Reviews/Ratings** (cannot rate providers)
- ❌ **Promo codes** (cannot apply discount codes)
- ❌ **Supabase Storage bucket** (SQL not executed, logo uploads may fail)

**What You Can Test (Customer):**
- Browse 4 live providers at `/providers`
- View provider menus and details
- Add items to shopping cart (persisted globally)
- Create account or login (`/auth/signup`, `/auth/login`)
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
- Switch between Arabic ↔ English
- Toggle dark ↔ light mode

**What You Can Test (Provider):**
- Register as partner (`/partner/register`)
- Complete business profile (`/provider/complete-profile`)
- View provider dashboard (`/provider`)
- Manage orders (`/provider/orders`) - Accept/Reject/Update status
- Manage menu items (`/provider/products`) - Add/Edit/Delete
- Set store hours (`/provider/store-hours`)
- Create promotions (`/provider/promotions`)
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

**Phase:** Week 3 Complete - Provider Dashboard (Nov 27, 2025)
**Status:** Week 3 - 100% Complete ✅
**Overall Progress:** ~50% of MVP Complete

**What's Working ✅**

**Customer Features (100% Complete):**
- ✅ Full project infrastructure (Next.js 16.0.3 + TypeScript + Tailwind CSS v3.4.17)
- ✅ Design system with Orange (#E85D04) and Gold (#FDB927) brand colors
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
- ✅ Dark/Light mode

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

**What's NOT Working Yet ⚠️**
- ❌ **Admin panel** - UI exists but NO functionality (cannot approve providers, manage users)
- ❌ **Online payment** - Fawry NOT integrated (only Cash on Delivery works)
- ❌ **Push notifications** - No Firebase/SMS integration
- ❌ **Order cancellation** - Customers cannot cancel orders
- ❌ **Reviews/Ratings** - Cannot rate providers or leave reviews
- ❌ **Promo codes** - Cannot apply discount codes
- ❌ **Supabase Storage bucket** - SQL provided but NOT executed (logo uploads may fail)
- ❌ **Email notifications** - No transactional emails

**Foundation Quality:** ✅ Excellent
- Solid architecture with clear separation of concerns
- Professional design system implementation
- Complete database schema deployed and working
- Zero security vulnerabilities in dependencies

**Roadmap:**
- ✅ Week 1-2: Foundation, provider browsing, cart, auth, checkout, orders (COMPLETE)
- ✅ Week 3: Partner registration + dashboard (COMPLETE)
- 📅 Week 4-5: Admin panel, payment integration
- 📅 Week 6-7: Notifications, reviews, promo codes
- 📅 Week 8-9: Testing, optimization, and polish
- 🚀 Week 10-12: Soft launch with initial providers!

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

**المرحلة:** الأسبوع 3 مكتمل - لوحة تحكم المتاجر (27 نوفمبر 2025)
**الحالة:** الأسبوع 3 - مكتمل 100% ✅
**التقدم الكلي:** ~50% من MVP مكتمل

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
- ✅ الوضع الليلي/النهاري

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

**ما لا يعمل بعد ⚠️**
- ❌ **لوحة الإدارة** - الواجهة موجودة لكن بدون وظائف (لا يمكن اعتماد المتاجر، إدارة المستخدمين)
- ❌ **الدفع الإلكتروني** - فوري غير مدمج (فقط الدفع عند الاستلام)
- ❌ **الإشعارات الفورية** - لا يوجد تكامل Firebase/SMS
- ❌ **إلغاء الطلبات** - لا يمكن للعملاء إلغاء الطلبات
- ❌ **التقييمات والمراجعات** - لا يمكن تقييم المتاجر
- ❌ **أكواد الخصم** - لا يمكن تطبيق أكواد الخصم
- ❌ **Supabase Storage bucket** - SQL موفر لكن غير منفذ (رفع الشعارات قد يفشل)
- ❌ **إشعارات البريد** - لا توجد رسائل بريد للمعاملات

**جودة الأساس:** ✅ ممتازة
- بنية معمارية قوية مع فصل واضح للمسؤوليات
- تنفيذ احترافي لنظام التصميم
- مخطط قاعدة بيانات كامل ومنشور ويعمل
- صفر ثغرات أمنية في التبعيات

**خارطة الطريق:**
- ✅ الأسبوع 1-2: الأساس، تصفح المتاجر، العربة، المصادقة، الدفع، الطلبات (مكتمل)
- ✅ الأسبوع 3: تسجيل الشركاء + لوحة التحكم (مكتمل)
- 📅 الأسبوع 4-5: لوحة الإدارة، تكامل الدفع
- 📅 الأسبوع 6-7: الإشعارات، التقييمات، أكواد الخصم
- 📅 الأسبوع 8-9: الاختبار والتحسين
- 🚀 الأسبوع 10-12: الإطلاق التجريبي!

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
