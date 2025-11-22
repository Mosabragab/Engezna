# Engezna - انجزنا

<div align="center">

![Engezna Logo](public/logo.svg)

**Modern Food Delivery Platform for Beni Suef, Upper Egypt**

منصة توصيل طعام حديثة لمدينة بني سويف، صعيد مصر

[![Next.js](https://img.shields.io/badge/Next.js-15.0.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

[English](#english) | [العربية](#arabic)

</div>

---

## English

### 🎯 About Engezna

**Engezna (انجزنا)** - meaning "We've got it done!" - is a B2C food delivery marketplace designed specifically for Beni Suef and Upper Egypt. We connect local restaurants, coffee shops, and grocery stores with customers through a modern, bilingual platform.

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
- **Framework:** Next.js 15.0.3 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 4 with custom design tokens
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Internationalization:** next-intl 4.5.5
- **Theme:** next-themes (dark mode support)
- **State Management:** Zustand (planned)
- **Forms:** React Hook Form + Zod (planned)

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
# Supabase (when ready)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Other services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. **Open your browser**

Visit [http://localhost:3000](http://localhost:3000) to see the app.

Default routes:
- Arabic: [http://localhost:3000/ar](http://localhost:3000/ar)
- English: [http://localhost:3000/en](http://localhost:3000/en)

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

#### **Brand Colors**
- **Primary:** Deep Green `#06c769` - Growth, freshness, action
- **Secondary:** Black `#000000` - Professional, elegant
- **Accent:** White `#FFFFFF` - Clean, minimal

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

**Week 0 (Nov 18-24, 2025):** ✅ 90% Complete

**Completed:**
- ✅ Project setup and configuration
- ✅ Design system foundation
- ✅ Internationalization (Arabic/English)
- ✅ Dark mode support
- ✅ Core UI components
- ✅ Logo and branding
- ✅ Documentation (PRD, Claude.md)

**In Progress:**
- 🔄 Resolving next-intl routing issue

**Next Steps:**
- 📅 Week 1-2: Supabase setup, authentication, database
- 📅 Week 3-4: Customer app (browsing, ordering, tracking)
- 📅 Week 5-6: Provider dashboard
- 📅 Week 7-8: Provider tools and optimization
- 📅 Week 9-10: Admin panel
- 📅 Week 11-12: Testing and polish
- 🚀 Week 14: Soft launch!

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

### 🎯 عن انجزنا

**انجزنا (Engezna)** - تعني "خلصناها!" - هي منصة توصيل طعام B2C مصممة خصيصًا لمدينة بني سويف وصعيد مصر. نحن نربط المطاعم المحلية والمقاهي ومحلات البقالة بالعملاء من خلال منصة حديثة ثنائية اللغة.

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

- **الواجهة الأمامية:** Next.js 15.0.3، TypeScript، Tailwind CSS 4
- **الخلفية:** Supabase (PostgreSQL، المصادقة، الوقت الفعلي)
- **الاستضافة:** Vercel
- **المدفوعات:** Fawry
- **الخرائط:** Google Maps API

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

**الأسبوع 0 (18-24 نوفمبر 2025):** ✅ مكتمل بنسبة 90%

**مكتمل:**
- ✅ إعداد المشروع والتكوين
- ✅ نظام التصميم الأساسي
- ✅ الترجمة (عربي/إنجليزي)
- ✅ دعم الوضع الليلي
- ✅ المكونات الأساسية
- ✅ الشعار والهوية البصرية
- ✅ التوثيق

**قيد التنفيذ:**
- 🔄 حل مشكلة التوجيه في next-intl

**الخطوات التالية:**
- 📅 الأسبوع 1-2: إعداد Supabase، المصادقة، قاعدة البيانات
- 📅 الأسبوع 3-4: تطبيق العميل (التصفح، الطلب، التتبع)
- 📅 الأسبوع 5-6: لوحة تحكم المطاعم
- 📅 الأسبوع 7-8: أدوات المطاعم والتحسينات
- 📅 الأسبوع 9-10: لوحة الإدارة
- 📅 الأسبوع 11-12: الاختبار والتنقيح
- 🚀 الأسبوع 14: الإطلاق التجريبي!

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
