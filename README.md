# Engezna - إنجزنا

<div align="center">

![Engezna Logo](public/logo.svg)

**Modern Delivery Marketplace for Egypt**

منصة توصيل محلية حديثة لجمهورية مصر العربية

[![Next.js](https://img.shields.io/badge/Next.js-16.0.7-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.1-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

[English](#english) | [العربية](#arabic)

</div>

---

## English

### About Engezna

**Engezna (إنجزنا)** - meaning "We've got it done!" - is a B2C delivery marketplace designed to serve all of Egypt, starting from Upper Egypt governorates. We connect local stores (restaurants, supermarkets, groceries, pharmacies, and more) with customers through a modern, bilingual platform.

#### Key Differentiator

- **6 months 0% commission** then **max 7%** (vs competitors' 25-30%)
- **0% customer service fees** - always!
- Providers manage their own delivery staff
- Arabic-first user experience with full RTL support

### Features

| Customers                   | Merchants                     | Admins                      |
| --------------------------- | ----------------------------- | --------------------------- |
| Browse local stores         | Simple product catalog        | Complete platform oversight |
| Search & filter             | Real-time order notifications | User & provider management  |
| Easy ordering with tracking | 0% → max 7% commission        | Financial reporting         |
| Multiple payment options    | Sales analytics               | Promo & campaign management |
| Bilingual interface         | Use existing delivery staff   | Real-time analytics         |

### Tech Stack

- **Frontend:** Next.js 16.0.7, React 19.2.1, TypeScript 5.9.3, Tailwind CSS 3.4.17
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage, RLS)
- **Hosting:** Vercel
- **Payments:** Kashier (Egyptian gateway)
- **Maps:** HERE Maps API

### Quick Start

```bash
# Clone repository
git clone https://github.com/Mosabragab/Engezna.git
cd Engezna

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Open http://localhost:3000/ar (Arabic) or /en (English)
```

### Project Status

**Phase:** Week 7 - Production Ready
**Progress:** ~96% MVP Complete
**Last Updated:** January 11, 2026 (Session 26)

#### What's Working

- ✅ Customer: Browsing, Cart, Checkout, Order Tracking, Reviews, Favorites, Promo Codes
- ✅ Provider: Dashboard, Orders, Menu Management, Analytics, Settlements
- ✅ Admin: RBAC/ABAC Permissions, Supervisors, Tasks, Approvals, Messaging
- ✅ AI Chat Assistant (أحمد) - Natural language ordering
- ✅ Custom Order System (Triple Broadcast) - Voice/Image/Text orders

#### What's Pending

- ⏸️ Push notifications (Firebase/SMS)
- ⏸️ Email notifications (requires Resend/SendGrid)

### Documentation

| Document                           | Description                          |
| ---------------------------------- | ------------------------------------ |
| [CHANGELOG.md](CHANGELOG.md)       | Detailed session history and updates |
| [PRD.md](PRD.md)                   | Product Requirements Document        |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines              |
| [API.md](API.md)                   | API endpoints documentation          |
| [claude.md](claude.md)             | AI development assistant guide       |

### Project Structure

```
engezna/
├── src/
│   ├── app/[locale]/      # Next.js App Router (AR/EN)
│   │   ├── (customer)/    # Customer pages
│   │   ├── provider/      # Provider dashboard
│   │   └── admin/         # Admin panel
│   ├── components/        # React components
│   ├── lib/               # Utilities & clients
│   └── types/             # TypeScript types
├── supabase/migrations/   # Database migrations
├── public/                # Static assets
└── docs/                  # Documentation
```

### Design System

- **Primary:** Engezna Blue `#009DE0`
- **Theme:** Light-only (brand consistency)
- **Typography:** Noto Sans Arabic, Noto Sans, Aref Ruqaa (logo)
- **Features:** Full RTL support, Responsive, WCAG 2.1 AA accessible

---

## Arabic

<div dir="rtl">

### عن إنجزنا

**إنجزنا (Engezna)** - تعني "خلصناها!" - منصة توصيل B2C مصممة لخدمة جمهورية مصر العربية بالكامل، بدءاً من محافظات الصعيد.

#### ميزتنا الرئيسية

- **6 شهور بدون عمولة** ثم **حد أقصى 7%** (مقارنة بـ 25-30% للمنافسين)
- **0% رسوم خدمة للعملاء** - دائماً!
- المتاجر تدير فريق التوصيل الخاص بها
- تجربة مستخدم بالعربية أولاً مع دعم RTL كامل

### المميزات

| العملاء              | المتاجر                    | الإدارة                   |
| -------------------- | -------------------------- | ------------------------- |
| تصفح المتاجر المحلية | إدارة قائمة المنتجات       | إشراف كامل على المنصة     |
| البحث والتصفية       | إشعارات فورية بالطلبات     | إدارة المستخدمين والمتاجر |
| طلب سهل مع التتبع    | عمولة 0% → 7% حد أقصى      | تقارير مالية              |
| خيارات دفع متعددة    | تحليلات المبيعات           | إدارة الخصومات والحملات   |
| واجهة ثنائية اللغة   | استخدم فريق التوصيل الحالي | تحليلات فورية             |

### التقنيات

- **الواجهة:** Next.js 16.0.7، React 19.2.1، TypeScript، Tailwind CSS
- **الخلفية:** Supabase (PostgreSQL، المصادقة، الوقت الفعلي)
- **المدفوعات:** Kashier (بوابة دفع مصرية)

### البدء السريع

```bash
# استنساخ المشروع
git clone https://github.com/Mosabragab/Engezna.git
cd Engezna

# تثبيت الحزم
npm install

# إعداد المتغيرات البيئية
cp .env.example .env.local

# تشغيل الخادم المحلي
npm run dev

# افتح http://localhost:3000/ar
```

### حالة المشروع

**المرحلة:** الأسبوع 7 - جاهز للإنتاج
**التقدم:** ~96% من MVP مكتمل
**آخر تحديث:** 11 يناير 2026 (الجلسة 26)

#### ما يعمل

- ✅ العميل: التصفح، العربة، الدفع، تتبع الطلبات، التقييمات، المفضلة، أكواد الخصم
- ✅ المتجر: لوحة التحكم، الطلبات، إدارة القائمة، التحليلات، التسويات
- ✅ الإدارة: نظام الصلاحيات، المشرفين، المهام، الموافقات، الرسائل
- ✅ المساعد الذكي (أحمد) - الطلب بالدردشة
- ✅ نظام الطلبات الخاصة (Triple Broadcast) - صوت/صور/نص

#### ما يحتاج استكمال

- ⏸️ إشعارات الهاتف (Firebase/SMS)
- ⏸️ إشعارات البريد (يتطلب Resend/SendGrid)

</div>

---

## License

Proprietary - All rights reserved. This project is not open source.

## Team

- **Mosab** - Founder, Full-stack Developer, Product Manager

## Contact

- **GitHub:** [@Mosabragab](https://github.com/Mosabragab)
- **Email:** support@engezna.com

---

<div align="center">

**Made with 💚 in Egypt**

صنع بـ 💚 في مصر

</div>
