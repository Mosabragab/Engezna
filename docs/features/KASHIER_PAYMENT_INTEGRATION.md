# Kashier Payment Gateway Integration

## Overview
تكامل بوابة الدفع Kashier لتفعيل الدفع الإلكتروني في منصة إنجزنا.

**تاريخ البدء:** 4 يناير 2026
**الحالة:** ⏳ في انتظار تفعيل حساب Kashier

---

## ما تم إنجازه ✅

### 1. إعداد البنية التحتية

#### ملفات جديدة تم إنشاؤها:

| الملف | الوصف |
|-------|-------|
| `src/lib/payment/kashier.ts` | دوال مساعدة لـ Kashier (توليد Hash، بناء URL) |
| `src/app/api/payment/kashier/initiate/route.ts` | API لبدء عملية الدفع |
| `src/app/api/payment/kashier/webhook/route.ts` | استقبال إشعارات الدفع من Kashier |
| `src/app/[locale]/orders/[id]/payment-result/page.tsx` | صفحة نتيجة الدفع |

#### Migrations تم تشغيلها:

```sql
-- 20260104000001_kashier_payment_fields.sql
ALTER TABLE orders ADD COLUMN payment_transaction_id TEXT;
ALTER TABLE orders ADD COLUMN payment_initiated_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN payment_completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN payment_response JSONB;

-- 20260104000002_add_online_payment_method.sql
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'online';
```

### 2. صفحة Checkout

- ✅ تفعيل زر "الدفع الإلكتروني" (كان معطل سابقاً)
- ✅ إضافة flow للدفع عبر Kashier
- ✅ إصلاح مشكلة RTL في dropdown المحافظة/المدينة (`right-3` → `end-3`)
- ✅ إضافة رسائل خطأ تفصيلية للمساعدة في التشخيص

### 3. Environment Variables

```env
# .env.example - تمت إضافته
KASHIER_MERCHANT_ID=MID-XXXXX-XXX
KASHIER_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
KASHIER_SECRET_KEY=xxxxx...
KASHIER_MODE=test  # or 'live'
```

### 4. تكوين Vercel

- ✅ إضافة Environment Variables في Vercel Dashboard
- ✅ Redeploy بعد إضافة المتغيرات

---

## الحالة الحالية 🔄

### المشكلة:
عند محاولة الدفع، تظهر رسالة **"Forbidden request"** على صفحة Kashier checkout.

### السبب:
حساب Kashier في وضع **"pending approval"**:
> "Our team is in the process of evaluating your profile for approval"

### الحل:
انتظار موافقة فريق Kashier على الحساب (عادةً 1-2 يوم عمل)

---

## ما يتبقى تنفيذه 📋

### بعد تفعيل حساب Kashier:

| المهمة | الأولوية | الحالة |
|--------|----------|--------|
| اختبار الدفع بكارت تجريبي | عالية | ⏳ |
| التحقق من Webhook يستقبل الإشعارات | عالية | ⏳ |
| اختبار صفحة payment-result | عالية | ⏳ |
| اختبار حالات الفشل والإلغاء | متوسطة | ⏳ |
| التبديل من test إلى live mode | عالية | ⏳ |

### اختبارات مطلوبة:

1. **Happy Path:**
   - إنشاء طلب → الدفع بكارت → نجاح → تحديث حالة الطلب

2. **Error Cases:**
   - كارت مرفوض
   - إلغاء الدفع من المستخدم
   - انتهاء صلاحية الجلسة

3. **Webhook Testing:**
   - التحقق من وصول الإشعارات
   - التحقق من تحديث `payment_status` في الطلب
   - التحقق من تخزين `payment_response`

---

## بيانات Kashier 🔐

| البيان | القيمة |
|--------|--------|
| Merchant ID | `MID-42065-308` |
| API Key | `613018c0-b835-41d4-93b2-da071f601799` |
| Mode | `test` |
| Dashboard | https://portal.kashier.io |

---

## Technical Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Checkout  │────▶│ /api/kashier/    │────▶│   Kashier   │
│    Page     │     │    initiate      │     │  Checkout   │
└─────────────┘     └──────────────────┘     └──────┬──────┘
                                                     │
                    ┌──────────────────┐             │
                    │  payment-result  │◀────────────┤ (redirect)
                    │      page        │             │
                    └──────────────────┘             │
                                                     │
                    ┌──────────────────┐             │
                    │ /api/kashier/    │◀────────────┘ (webhook)
                    │    webhook       │
                    └──────────────────┘
```

---

## Kashier Test Cards

| Card Number | Result |
|-------------|--------|
| `4000000000000002` | Success |
| `4000000000000010` | Insufficient funds |
| `4000000000000028` | Card declined |

**Expiry:** أي تاريخ مستقبلي (مثال: 12/26)
**CVV:** أي 3 أرقام (مثال: 123)

---

## الملفات المعدلة

```
src/
├── lib/
│   └── payment/
│       └── kashier.ts                    # NEW
├── app/
│   ├── api/
│   │   └── payment/
│   │       └── kashier/
│   │           ├── initiate/route.ts     # NEW
│   │           └── webhook/route.ts      # NEW
│   └── [locale]/
│       ├── checkout/
│       │   └── page.tsx                  # MODIFIED
│       └── orders/
│           └── [id]/
│               └── payment-result/
│                   └── page.tsx          # NEW
supabase/
└── migrations/
    ├── 20260104000001_kashier_payment_fields.sql  # NEW
    └── 20260104000002_add_online_payment_method.sql # NEW
.env.example                              # MODIFIED
```

---

## المراجع

- [Kashier Documentation](https://developers.kashier.io/)
- [Kashier Portal](https://portal.kashier.io)
- [Kashier Support](mailto:support@kashier.io)
