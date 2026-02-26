# تدقيق القرارات الهندسية — إنجزنا (Engezna)

**التاريخ:** 26 فبراير 2026
**المدقق:** Claude (Senior Software Architect)
**النسخة:** 2.0 — Deep-Dive Engineering Design Review
**النطاق:** Production Readiness لـ 10,000 مستخدم متزامن

---

## الملخص التنفيذي

| المقياس                    | القيمة                              |
| -------------------------- | ----------------------------------- |
| **التقييم العام**          | **61/100**                          |
| **مشاكل حرجة (CRITICAL)**  | 8                                   |
| **مشاكل عالية (HIGH)**     | 11                                  |
| **مشاكل متوسطة (MEDIUM)**  | 14                                  |
| **الجاهزية لـ 10K متزامن** | **غير جاهز — سيسقط خلال 2-4 ساعات** |

### التصنيف حسب المحور

| المحور                           | الدرجة | الحالة                           |
| -------------------------------- | ------ | -------------------------------- |
| Infrastructure Efficiency & Cost | 45/100 | خطر — نزيف موارد مستمر           |
| Data Integrity & Concurrency     | 50/100 | خطر — عمليات غير ذرية            |
| Resiliency & Error Handling      | 62/100 | متوسط — فجوات حرجة في Validation |
| Security & Observability         | 72/100 | جيد — مع تسرب بيانات في profiles |
| Frontend Architecture            | 40/100 | ضعيف — 95.7% client-rendered     |

---

## القسم 1: Infrastructure Efficiency & Cost (45/100)

### 1.1 كارثة Realtime: الأرقام الحقيقية من قاعدة البيانات

```
╔══════════════════════════════════════════════════════════════╗
║  WAL Query #1:  12,537,981 استدعاء  =  75,106 ثانية        ║
║                 = 20.9 ساعة وقت CPU خالص                   ║
║  WAL Query #2:   2,141,851 استدعاء  =  11,121 ثانية        ║
║                 =  3.1 ساعة وقت CPU خالص                   ║
║  ─────────────────────────────────────────────────          ║
║  المجموع: 14.68 مليون استدعاء = 24 ساعة CPU                ║
║  هذا يوم كامل من عمل المعالج لـ Realtime فقط!              ║
╚══════════════════════════════════════════════════════════════╝
```

**التشخيص:** رغم تحسين القنوات من 10 إلى 1، الاستدعاءات ارتفعت من 10.5M إلى 12.5M (زيادة 19%). هذا يعني أن المشكلة ليست في عدد القنوات بل في **طبيعة الاشتراكات** — كل WAL change يمر عبر filter evaluation حتى لو لم يطابق أي subscription.

**القرار الهندسي المفقود:** لا يوجد فصل بين الجداول التي تحتاج Realtime والتي لا تحتاج. جميع الجداول مضافة لـ `supabase_realtime` publication، مما يعني أن كل INSERT/UPDATE/DELETE على أي جدول يمر عبر WAL processing.

### 1.2 استعلام الـ governorates: 576,006 استدعاء لـ 27 صف

```sql
-- هذا الاستعلام يُستدعى 576,006 مرة:
SELECT id, name_ar, name_en, is_active FROM governorates
-- بمعدل 0.06ms لكل استدعاء = 34.2 ثانية إجمالي
-- لكن 27 صف لا تتغير أبداً!
```

**مصدر المشكلة:** `Footer.tsx` + middleware + صفحات متعددة تستعلم عن المحافظات في كل طلب. هذه بيانات شبه ثابتة يجب أن تكون مُخزنة مؤقتاً بـ TTL طويل (24 ساعة).

**الأثر المالي:** على Supabase Free/Pro tier، هذا يستهلك حصة الاستعلامات بدون أي قيمة مضافة.

### 1.3 Polling بدون ذكاء: تكلفة القرار الحالي

| المكون           | الاستعلامات/دورة | الفترة     | المستخدمين المتوقعين | الاستعلامات/ثانية |
| ---------------- | ---------------- | ---------- | -------------------- | ----------------- |
| ProviderLayout   | 6 استعلامات      | 60 ثانية   | 200 تاجر             | 20/ث              |
| BottomNavigation | 2 استعلامات      | 30 ثانية   | 5,000 عميل           | 333/ث             |
| Admin Layout     | 5 استعلامات      | 30 ثانية   | 10 مدير              | 1.7/ث             |
| getUser() مكرر   | 1 استعلام        | كل poll    | 5,200                | 173/ث             |
| Middleware       | 1-3 استعلامات    | كل request | كل الطلبات           | ~500/ث            |
| **المجموع**      |                  |            |                      | **~1,028/ث**      |

**المشاكل الهندسية:**

1. **لا يوجد `document.visibilitychange` guard:** الـ polling يستمر حتى لو كان التطبيق في الخلفية. المستخدم الذي يفتح التاب وينساه يُكلف 4,320 استعلام/ساعة
2. **`getUser()` يُستدعى مع كل poll:** في `BottomNavigation.tsx`، كل 30 ثانية يتم استدعاء `supabase.auth.getUser()` — وهذا يُرسل طلب HTTP لـ Supabase Auth service. عند 5,000 عميل = 167 طلب auth إضافي/ثانية
3. **Pending Orders تجلب الصفوف بدلاً من COUNT:** `ProviderLayout` يجلب `select('id, status')` ثم يعد النتائج بدل استخدام `count: 'exact', head: true`
4. **لا يوجد parallelization في Admin:** 5 استعلامات تُنفذ بالتتابع بدل `Promise.all`

### 1.4 أنظمة مبنية لكن غير مُستخدمة

| النظام                      | الملف                                  | الحالة                                                                          |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| **Cache Layer (LRU + TTL)** | `src/lib/cache/index.ts`               | مكتمل البناء، **صفر استخدام في Production**                                     |
| **Realtime Manager**        | `src/lib/supabase/realtime-manager.ts` | مبني مع error handling + exponential backoff + polling fallback، **غير مستخدم** |
| **`withErrorHandler`**      | `src/lib/api/index.ts`                 | معالج أخطاء موحد، مستخدم في **0 من 45** API route                               |
| **`withValidation`**        | `src/lib/api/index.ts`                 | مُصادق Zod للـ API، مستخدم في **2 من 45** route                                 |
| **`strongPasswordSchema`**  | `src/lib/validations/common.ts`        | كلمة سر قوية مع uppercase/lowercase/number، **لا يُستخدم في auth**              |

> **هذا أخطر ما في المشروع من الناحية الهندسية:** تم استثمار وقت في بناء أنظمة حماية ممتازة ثم لم يتم تفعيلها. هذا أسوأ من عدم بنائها — لأنه يعطي إحساساً زائفاً بالأمان.

### 1.5 Indexes: 120+ فهرس ميت

من بيانات `pg_stat_user_indexes` مع `idx_scan = 0`:

- **120+ فهرس لم يُستخدم أبداً** منذ آخر إعادة تشغيل لـ PostgreSQL
- **`idx_menu_items_embedding`:** 3,296 KB — فهرس embedding ثقيل لم يُستدعى ولو مرة
- **`provider_staff` indexes:** الجدول يحتوي 0 صفوف لكن عنده فهارس مفعلة تأخذ مساحة
- كل `INSERT`/`UPDATE` على هذه الجداول يُحدّث كل الفهارس الميتة

**الأثر على Write Performance:** كل عملية كتابة في `orders` مثلاً تُحدّث الفهارس الميتة مع الفعالة. هذا overhead يتراكم خاصة في الجداول عالية الكتابة.

---

## القسم 2: Data Integrity & Concurrency (50/100)

### 2.1 CRITICAL: Checkout غير ذري — أخطر ثغرة في المشروع

```
╔══════════════════════════════════════════════════════════════╗
║  مسار إنشاء الطلب (COD):                                   ║
║                                                              ║
║  الخطوة 1: تحديث usage_count للـ promo ──────── ✅ نجح     ║
║  الخطوة 2: إنشاء سجل promo_code_usage ──────── ✅ نجح     ║
║  الخطوة 3: إنشاء الطلب في orders ────────────── ✅ نجح     ║
║  الخطوة 4: إنشاء عناصر الطلب في order_items ─── ❌ فشل    ║
║                                                              ║
║  النتيجة: طلب موجود بدون أي عناصر!                          ║
║  الـ catch block يسترجع الـ promo فقط — لا يحذف الطلب       ║
╚══════════════════════════════════════════════════════════════╝
```

**الملف:** `src/app/[locale]/checkout/page.tsx` (أسطر 1056-1276)

هذه أربع عمليات DB منفصلة **بدون أي transaction wrapper**. لا يوجد `BEGIN`/`COMMIT`/`ROLLBACK` في المشروع بالكامل.

**سيناريو الفشل الواقعي:**

- العميل يطلب 15 صنف مع promo code
- الخطوات 1-3 تنجح
- الخطوة 4 تفشل (timeout، RLS error، constraint violation)
- التاجر يرى طلب بـ 0 أصناف ومبلغ 0
- الـ promo code تم استرجاعه لكن الطلب يبقى "يتيم"

**نفس المشكلة في الدفع الإلكتروني:** `src/app/api/payment/kashier/initiate/route.ts` (أسطر 99-178) — إذا فشل إنشاء العناصر، العميل يُحوَّل لـ Kashier لدفع طلب بدون عناصر.

### 2.2 CRITICAL: أسعار الطلب تُحسب Client-Side وتُوثق بها Server-Side

```typescript
// src/app/[locale]/checkout/page.tsx — سطر 1028
const finalTotal = subtotal + calculatedDeliveryFee - discountAmount;

// هذه القيم تُرسل مباشرة للـ database:
.insert({
  subtotal: subtotal,           // ← محسوب على المتصفح
  delivery_fee: deliveryFee,    // ← محسوب على المتصفح
  discount: discountAmount,     // ← محسوب على المتصفح
  total: finalTotal,            // ← محسوب على المتصفح
})
```

**لا يوجد أي تحقق Server-Side** من أن:

- `subtotal` = مجموع (سعر_الوحدة × الكمية) لكل صنف
- `delivery_fee` يطابق القيمة الحقيقية للمحافظة
- `discount` لا يتجاوز الخصم الفعلي للكود

**المخاطر:**

- عميل خبيث يمكنه تعديل `subtotal` من 500 لـ 50 جنيه
- الـ `platform_commission` trigger يحسب العمولة صحيحاً... لكن على أساس خاطئ
- لا يوجد audit trail يكشف التلاعب

### 2.3 CRITICAL: Cart في localStorage — أسعار مجمدة

```typescript
// src/lib/store/cart.ts — سطر 316-317
storage: createJSONStorage(() => localStorage),
```

سيناريو:

1. العميل يضيف وجبة بسعر 100 جنيه الساعة 2:00 PM
2. التاجر يرفع السعر لـ 150 جنيه الساعة 3:00 PM
3. العميل يطلب الساعة 6:00 PM بالسعر القديم (100 جنيه)
4. الطلب يُنشأ بـ 100 جنيه — الأسعار من localStorage لا تُحدَّث

**لا يوجد re-validation للأسعار عند الـ checkout.**

### 2.4 لا يوجد Double-Submit Prevention

```typescript
// src/app/[locale]/checkout/page.tsx — سطر 972
const handlePlaceOrder = async () => {
  // الحماية الوحيدة: setIsLoading(true) — client-side React state
  // لا يوجد idempotency key
  // لا يوجد unique constraint يمنع التكرار
  // لا يوجد server-side deduplication
```

عند double-click سريع أو ضعف الشبكة، يمكن إنشاء طلبين متطابقين.

### 2.5 لا يوجد Status Transition Guards

```typescript
// src/lib/repositories/orders-repository.ts — سطر 441-472
// updateStatus يُنفذ UPDATE ... WHERE id = ? فقط
// لا يوجد WHERE status = 'current_status'
// يمكن نقل طلب من 'delivered' إلى 'pending' بدون أي حماية
```

### 2.6 نقاط القوة في Data Integrity

| الميزة                             | التقييم                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Commission Calculation             | ممتاز — PostgreSQL trigger يمنع التلاعب                                                            |
| Payment Webhook Idempotency        | ممتاز — 5 طبقات حماية (terminal state, cancelled check, duplicate txn, status guard, empty result) |
| Promo Code Optimistic Locking      | جيد — compare-and-swap على `usage_count`                                                           |
| Financial Views as Source of Truth | ممتاز — `financial_settlement_engine` و `admin_financial_summary`                                  |

---

## القسم 3: Resiliency & Error Handling (62/100)

### 3.1 Error Boundaries: جيد

| الحد           | الملف                                 | Sentry               | Recovery                    |
| -------------- | ------------------------------------- | -------------------- | --------------------------- |
| Global (fatal) | `src/app/global-error.tsx`            | نعم، level: `fatal`  | Reset                       |
| Locale         | `src/app/[locale]/error.tsx`          | نعم، tag: `locale`   | Reset + Home                |
| Admin          | `src/app/[locale]/admin/error.tsx`    | نعم، tag: `admin`    | Reset + Dashboard           |
| Provider       | `src/app/[locale]/provider/error.tsx` | نعم، tag: `provider` | Reset + Dashboard + Support |

**مشكلة:** جميع error boundaries تحتوي على روابط hardcoded لـ `/ar` — المستخدم الإنجليزي يُرسل لصفحة عربية.

### 3.2 SDUI Graceful Degradation: ممتاز

نظام 3 طبقات في `src/hooks/sdui/useSDUI.ts`:

1. **الطبقة 1:** Hardcoded defaults — التطبيق يعمل فوراً
2. **الطبقة 2:** LocalStorage cache بـ TTL 30 دقيقة
3. **الطبقة 3:** Supabase RPC fetch — إذا فشل، يستمر مع الطبقة الأقل

**قرار هندسي ذكي:** حتى خطأ `42883` (Type Cast) يُعامل بصمت — التطبيق لا يتوقف أبداً بسبب SDUI.

### 3.3 Firebase Graceful Degradation: جيد

- Lazy loading للـ SDK
- Null-safe returns في كل الحالات
- Feature detection قبل استخدام Notification/ServiceWorker/PushManager
- إذا Firebase معطل بالكامل: التطبيق يعمل بشكل طبيعي بدون push notifications

### 3.4 CRITICAL: Server-Side Validation شبه معدومة

```
╔══════════════════════════════════════════════════════════════╗
║  من 45 API route:                                           ║
║  ─ تستخدم schema validation: 2 (4.4%)                       ║
║  ─ تستخدم withErrorHandler:  0 (0%)                         ║
║  ─ تستخدم try-catch يدوي:   43 (95.6%)                     ║
║                                                              ║
║  الـ withValidation و withErrorHandler موجودين               ║
║  لكن لم يُفعّلا في أي API route!                            ║
╚══════════════════════════════════════════════════════════════╝
```

### 3.5 CRITICAL: Silent Failures في مسارات حرجة

| الملف                     | السطر         | السياق                                                    | الخطورة   |
| ------------------------- | ------------- | --------------------------------------------------------- | --------- |
| `ProvidersClient.tsx`     | 326           | صفحة عرض المحلات — `catch {}` بدون أي رسالة خطأ أو Sentry | **حرج**   |
| `delete-account/route.ts` | 62-80         | حذف الحساب — 6 عمليات delete بدون فحص نتيجة أي منها       | **حرج**   |
| `RefundRequestModal.tsx`  | 249, 314, 330 | 3 فشل صامت: رفع صورة، إنشاء تذكرة، إشعار                  | **عالي**  |
| `useHereMaps.ts`          | 55-167        | 4 fetch calls بدون `response.ok` check                    | **عالي**  |
| `AppUpdateDialog.tsx`     | 59            | فحص التحديثات يفشل بصمت — المستخدم لن يعرف بتحديث أمني    | **متوسط** |
| `middleware.ts`           | 50            | maintenance mode check يفشل بصمت — يتخطى وضع الصيانة      | **متوسط** |

### 3.6 Sentry Configuration: جيد

- 3 بيئات: Client + Server + Edge
- Data scrubbing للـ headers الحساسة (authorization, cookie, api-key)
- Session replay 1% في production، 10% عند الخطأ
- Smart error filtering (ResizeObserver, ChunkLoadError, etc.)

**مشكلة:** Edge config لا يحتوي على data scrubbing — headers auth قد تُسرَّب لـ Sentry من middleware.

---

## القسم 4: Security & Observability (72/100)

### 4.1 RLS: جيد مع تسرب بيانات حرج

**القوة:** تمت معالجة ثغرة `OR true` في `providers` RLS. جميع الـ views تحولت من `SECURITY DEFINER` إلى `SECURITY INVOKER`.

**CRITICAL: تسرب بيانات الملفات الشخصية**

```sql
-- supabase/migrations/20260213000004_tighten_rls_policies.sql سطر 22
-- سياسة profiles SELECT:
USING (auth.uid() IS NOT NULL)
-- أي مستخدم مسجل يستطيع قراءة جميع الملفات الشخصية!
-- بما في ذلك: email, phone, full_name
```

**المخاطر:** تاجر يمكنه استعلام جدول `profiles` ورؤية بيانات كل المستخدمين. حتى العملاء يمكنهم رؤية بيانات التجار الشخصية. الملف نفسه يعترف أنها "interim fix".

### 4.2 Endpoint Protection Matrix

| Endpoint                            | Auth        | Rate Limit        | المشكلة                                                     |
| ----------------------------------- | ----------- | ----------------- | ----------------------------------------------------------- |
| `POST /api/banners/track`           | **لا**      | **لا**            | يستخدم service role key بدون أي auth — يقبل `user_id` تعسفي |
| `POST /api/contact`                 | **لا**      | **لا**            | يستخدم admin client — spam risk                             |
| `POST /api/auth/register`           | لا (public) | **لا**            | إنشاء حسابات جماعي ممكن                                     |
| `POST /api/webhooks/menu-item`      | **اختياري** | **لا**            | إذا env var مفقود، الـ webhook مفتوح                        |
| `POST /api/promo/validate`          | نعم         | **in-memory فقط** | لا يعمل عبر serverless instances                            |
| `POST /api/admin/*`                 | نعم (admin) | **لا**            | حساب admin مخترق = data exfiltration بدون حدود              |
| `POST /api/chat`                    | نعم         | نعم (Upstash)     | **محمي بشكل صحيح**                                          |
| `POST /api/payment/kashier/webhook` | Signature   | N/A               | **ممتاز**                                                   |

### 4.3 RBAC (Role-Based Access Control): جيد

- Middleware RBAC يفحص الدور قبل السماح بالوصول لـ `/admin/*` و `/provider/*`
- كل API route admin يفحص الدور مستقلاً (defense-in-depth)
- RLS policies تحمي على مستوى قاعدة البيانات

### 4.4 Rate Limiting Architecture

```
Upstash Redis (موزع - يعمل عبر instances):
├── OTP send:       5 / 10 min
├── OTP verify:     5 / 5 min
├── Login:          10 / 15 min
├── Password reset: 3 / hour
├── Chat API:       30 / min
├── Voice order:    10 / min
├── Order creation: 20 / 5 min
└── Search:         60 / min

In-Memory (لا يعمل عبر instances):
├── Promo validation: 10 / min  ← مشكلة
└── Legacy rate-limit.ts         ← مشكلة
```

### 4.5 Monitoring & Alerting: ناقص

| الأداة                            | الحالة                                        |
| --------------------------------- | --------------------------------------------- |
| Sentry Error Tracking             | مُفعّل                                        |
| Sentry Session Replay             | مُفعّل (1%)                                   |
| Vercel Analytics                  | مُفعّل                                        |
| Vercel Speed Insights             | مُفعّل                                        |
| **Alerting Rules**                | **غير موجود** — لا PagerDuty, لا Slack alerts |
| **Suspicious Activity Detection** | **غير موجود**                                 |
| **Rate Limit Violation Alerts**   | **غير موجود**                                 |
| **Log Aggregation**               | **غير موجود** — لا Datadog, لا CloudWatch     |

**يعني:** إذا حدث هجوم أو خلل في الساعة 3 صباحاً، لن يعرف أحد حتى يشتكي المستخدمون.

### 4.6 Security Strengths

| الميزة                | التقييم                            |
| --------------------- | ---------------------------------- |
| CSP Headers           | ممتاز — شامل ومفصل                 |
| CSRF Protection       | ممتاز — double-submit cookie       |
| Zod Client Validation | ممتاز — شامل                       |
| Secret Management     | ممتاز — لا secrets مكشوفة          |
| XSS Protection        | ممتاز — enterprise-grade headers   |
| HSTS                  | ممتاز — 2 سنة مع includeSubDomains |
| Webhook Signature     | ممتاز — Kashier webhook محمي       |

---

## القسم 5: Frontend Architecture (40/100)

### 5.1 Server vs Client Rendering: كارثي

```
╔══════════════════════════════════════════════════════════════╗
║  من 117 route:                                              ║
║  ─ Client Components ('use client'):  112 (95.7%)           ║
║  ─ Server Components:                   5 (4.3%)            ║
║                                                              ║
║  هذا يعني:                                                  ║
║  • كل صفحة ترسل JavaScript كامل للمتصفح                    ║
║  • لا SSR/SSG لأي صفحة عميل                                ║
║  • الصفحة الرئيسية نفسها 'use client'                       ║
║  • SEO = صفر (Google يفهرس HTML فارغ)                       ║
╚══════════════════════════════════════════════════════════════╝
```

### 5.2 Loading States: شبه معدوم

| المقياس             | القيمة   |
| ------------------- | -------- |
| Routes إجمالي       | 117      |
| `loading.tsx`       | 4 (3.4%) |
| Suspense boundaries | 0        |

**الأثر:** 113 route تعرض شاشة بيضاء أثناء التحميل. على شبكة 3G في صعيد مصر، هذا يعني 3-8 ثوان من الفراغ.

### 5.3 Code Splitting: شبه معدوم

| المقياس                | القيمة                   |
| ---------------------- | ------------------------ |
| `next/dynamic`         | 4 ملفات                  |
| `React.lazy()`         | 0                        |
| ملفات أكبر من 1500 سطر | 5 ملفات                  |
| أكبر ملف               | 2,909 سطر (Admin Orders) |

**الملفات الكبرى:**

1. `admin/orders/page.tsx` — 2,909 سطر
2. `provider/orders/page.tsx` — 2,301 سطر
3. `checkout/page.tsx` — 2,209 سطر
4. `admin/providers/page.tsx` — ~1,900 سطر
5. `provider/menu/page.tsx` — ~1,800 سطر

كل هذه الملفات تُحمّل كوحدة واحدة بدون أي splitting.

### 5.4 Image Optimization: جيد

- 92.9% من الصور تستخدم `next/image`
- AVIF + WebP مُفعّلان في `next.config.ts`
- `priority` prop مستخدم لـ LCP images

### 5.5 framer-motion Impact: متوسط

- مستخدم في 28/267 ملف (10.5%)
- **ليس over-engineering** — يُستخدم لـ page transitions و carousel animations
- لكن `OffersCarousel.tsx` (933 سطر) و `HeroSection` يُحمّلان eagerly مع framer-motion في الـ initial bundle

### 5.6 lucide-react: ممتاز

- مستخدم في 202/267 ملف — لكن مع **named imports فقط**
- Tree-shaking يعمل بشكل صحيح — فقط الأيقونات المستخدمة تُحمّل
- **لا مشكلة هنا**

### 5.7 Home Page: Client-Side Data Waterfall

```
المتصفح يحمل JavaScript → يُنفذ React → يبدأ fetch من Supabase
                                              ↓
                              HeroSection يجلب banners (fetch #1)
                              OffersCarousel يجلب offers (fetch #2)
                              Categories يجلب categories (fetch #3)
                              Providers يجلب providers (fetch #4)
```

كل هذه الـ fetches تحدث **بعد** تحميل وتنفيذ JavaScript. على SSR كان ممكن تُحمّل البيانات مع HTML مباشرة.

---

## القسم 6: تحليل المخاطر — 10,000 مستخدم متزامن

### 6.1 السيناريو

```
10,000 مستخدم متزامن:
├── 8,000 عميل (customers)
├── 1,500 تاجر (providers)
├── 50 مدير (admins)
└── 450 زائر (unauthenticated)
```

### 6.2 حمل قاعدة البيانات المتوقع

| المصدر                  | الحساب                   | الاستعلامات/ثانية |
| ----------------------- | ------------------------ | ----------------- |
| Customer Polling        | 8,000 × 2 queries / 30s  | 533               |
| Customer getUser()      | 8,000 × 1 / 30s          | 267               |
| Provider Polling        | 1,500 × 6 queries / 60s  | 150               |
| Admin Polling           | 50 × 5 queries / 30s     | 8                 |
| Middleware queries      | 10,000 × 2 avg / 5s avg  | 4,000             |
| Page data fetches       | 10,000 × 3 avg / 30s avg | 1,000             |
| Realtime WAL processing | Fixed overhead           | ~500              |
| governorates/static     | 10,000 × 1 / 30s avg     | 333               |
| **المجموع**             |                          | **~6,791/ثانية**  |

### 6.3 Supabase Connection Limits

| الخطة | Max Connections | المتاح بعد system overhead |
| ----- | --------------- | -------------------------- |
| Free  | 60              | ~40                        |
| Pro   | 60              | ~40                        |
| Team  | 120             | ~90                        |

**الحالة الحالية:** 9 اتصالات (من بيانات DB). لكن مع 10K مستخدم:

- PostgREST pooler يدير الاتصالات، لكن ~6,800 query/s عبر 40 connection = 170 query/connection/second
- PostgreSQL على Supabase Pro يعالج ~10,000-15,000 query/s كحد أقصى

### 6.4 نقاط الانهيار المتوقعة

```
╔══════════════════════════════════════════════════════════════════╗
║  الترتيب الزمني المتوقع للانهيار عند 10K متزامن:              ║
║                                                                  ║
║  ⏱️ الدقيقة 0-30:                                               ║
║     - النظام يعمل ببطء ملحوظ                                    ║
║     - Response times ترتفع من 200ms إلى 2-5 ثوان               ║
║     - Supabase connection pool يبدأ بالامتلاء                    ║
║                                                                  ║
║  ⏱️ الدقيقة 30-60:                                              ║
║     - Connection pool مشبع — طلبات جديدة تنتظر في Queue         ║
║     - Timeouts تبدأ — polling intervals تفشل                     ║
║     - المستخدمون يحدثون الصفحة (refresh) → حمل مضاعف           ║
║                                                                  ║
║  ⏱️ الساعة 1-2:                                                 ║
║     - WAL processing يستهلك CPU بالكامل                          ║
║     - Realtime subscriptions تفشل بصمت (لا error handling)       ║
║     - الـ polling يستمر بدون visibility guard                     ║
║     - المستخدمون في الخلفية يزيدون الحمل بدون فائدة              ║
║                                                                  ║
║  ⏱️ الساعة 2-4:                                                 ║
║     - PostgreSQL max CPU → queries تفشل                          ║
║     - Supabase rate limits تُفعّل (إذا كنت على Free/Pro)        ║
║     - السيستم يسقط تماماً أو يصبح غير مستجيب                    ║
║     - لا أحد يعرف — لا يوجد alerting!                            ║
╚══════════════════════════════════════════════════════════════════╝
```

### 6.5 المخاطر الخمسة القاتلة

| #   | المخاطرة                       | الاحتمال   | الأثر | وصف                                                           |
| --- | ------------------------------ | ---------- | ----- | ------------------------------------------------------------- |
| 1   | **DB CPU Exhaustion**          | مرتفع جداً | كارثي | 6,800 query/s + WAL processing تتجاوز قدرة Supabase Pro       |
| 2   | **Connection Pool Saturation** | مرتفع      | كارثي | 40 connection لـ 6,800 query/s = queue overflow               |
| 3   | **Memory Leak من Polling**     | مرتفع      | عالي  | Tabs في الخلفية بدون visibility guard تستهلك موارد بلا فائدة  |
| 4   | **Double Orders under Load**   | متوسط      | عالي  | بدون idempotency key، latency عالي + retry = duplicate orders |
| 5   | **No Alerting**                | مؤكد       | عالي  | لن يعرف أحد أن النظام يعاني حتى يشتكي المستخدمون              |

---

## نقاط القوة الهندسية

رغم المشاكل، المشروع يحتوي على قرارات هندسية ممتازة:

### 1. Commission Trigger (10/10)

العمولة تُحسب حصرياً عبر PostgreSQL trigger — لا يمكن للـ client التلاعب بها. هذا القرار وحده يمنع فئة كاملة من الثغرات المالية.

### 2. Payment Webhook Idempotency (10/10)

5 طبقات حماية ضد replay attacks و race conditions. هذا كود enterprise-grade.

### 3. SDUI 3-Layer Fallback (9/10)

Defaults → Cache → Server. التطبيق لا يتوقف أبداً بسبب فشل SDUI. معالجة خطأ `42883` بذكاء.

### 4. Security Headers (9/10)

CSP شاملة، HSTS مع preload، CSRF double-submit، XSS protection. على مستوى enterprise.

### 5. Financial Views as Source of Truth (9/10)

SQL views (`financial_settlement_engine`, `admin_financial_summary`) تضمن أن الأرقام المالية تأتي دائماً من مصدر واحد.

### 6. Error Class Hierarchy (8/10)

`AppError → ValidationError, AuthenticationError, RateLimitError` — مع `toJSON()` و `isOperational` flags. مبني بشكل ممتاز.

### 7. Sentry Integration (8/10)

3 بيئات (Client/Server/Edge)، data scrubbing، smart filtering، session replay.

### 8. Zod Client Validation (8/10)

Egyptian phone schemas، address validation، comprehensive order schemas.

### 9. Firebase Graceful Degradation (8/10)

Null-safe returns، feature detection، lazy loading. لا crashes إذا Firebase معطل.

### 10. RLS Security Hardening (7/10)

إصلاح `OR true`، تحويل views لـ `SECURITY INVOKER`، RBAC في middleware + API + DB layers.

---

## خريطة الطريق لـ 99.9% Availability

### المرحلة 0: إنقاذ فوري (أسبوع 1 — قبل أي growth)

| #   | الإجراء                                                                         | الأثر                                                          | الوقت   |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------- |
| 1   | **تفعيل Cache Layer الموجود** لـ governorates, categories, maintenance settings | يقلل ~600K query بدون أي كتابة جديدة — النظام مبني أصلاً       | 4 ساعات |
| 2   | **إضافة `document.visibilitychange`** لكل polling                               | يقلل 30-50% من polling queries للمستخدمين في الخلفية           | 3 ساعات |
| 3   | **إزالة `getUser()` من BottomNavigation polling**                               | يقلل 267 query/s عند 8K عميل                                   | 1 ساعة  |
| 4   | **تحويل pending orders لـ COUNT** بدل SELECT rows                               | يقلل نقل البيانات بنسبة 90%                                    | 1 ساعة  |
| 5   | **تفعيل Realtime Manager** بدل raw `.subscribe()` في ProviderLayout             | يضيف error recovery + exponential backoff مجاناً — الكود موجود | 4 ساعات |

**الأثر المتوقع:** تخفيض queries/second بنسبة 40-50% بدون أي تغيير في الوظائف.

### المرحلة 1: سلامة البيانات (أسبوع 2)

| #   | الإجراء                                                                             | الأثر                          | الوقت   |
| --- | ----------------------------------------------------------------------------------- | ------------------------------ | ------- |
| 6   | **إنشاء RPC `create_order_atomic`** يجمع order + items + promo في transaction واحدة | يمنع الطلبات اليتيمة نهائياً   | 8 ساعات |
| 7   | **إضافة server-side price validation** في RPC أو API route                          | يمنع تلاعب الأسعار             | 6 ساعات |
| 8   | **إضافة idempotency key** (UUID) مع unique constraint على orders                    | يمنع double-submit             | 3 ساعات |
| 9   | **إضافة status transition guards** (`WHERE status = ?`)                             | يمنع invalid state transitions | 4 ساعات |
| 10  | **إصلاح profiles RLS** — column-level access أو USING مع owner check                | يمنع تسرب PII                  | 4 ساعات |

### المرحلة 2: أداء الـ Frontend (أسبوع 3-4)

| #   | الإجراء                                                           | الأثر                            | الوقت   |
| --- | ----------------------------------------------------------------- | -------------------------------- | ------- |
| 11  | **تحويل Home Page لـ Server Component** مع `fetch` + `revalidate` | يحسن LCP بنسبة 50-70%، يحسن SEO  | 12 ساعة |
| 12  | **إضافة `loading.tsx`** لأهم 20 route                             | يمنع الشاشة البيضاء              | 8 ساعات |
| 13  | **تقسيم الملفات الكبيرة** (>1500 سطر) بـ `next/dynamic`           | يقلل initial bundle بنسبة 30-40% | 12 ساعة |
| 14  | **إضافة ISR** لـ providers listing, categories, governorates      | يقلل DB queries بشكل كبير        | 8 ساعات |

### المرحلة 3: المتانة والمراقبة (أسبوع 5-6)

| #   | الإجراء                                                 | الأثر                                | الوقت   |
| --- | ------------------------------------------------------- | ------------------------------------ | ------- |
| 15  | **تفعيل `withErrorHandler`** في جميع API routes         | error handling موحد + logging تلقائي | 8 ساعات |
| 16  | **تفعيل `withValidation`** في جميع API routes           | server-side validation لكل endpoint  | 12 ساعة |
| 17  | **إضافة Alerting** (Slack/PagerDuty) لـ critical errors | وقت استجابة أقل للمشاكل              | 4 ساعات |
| 18  | **Rate limiting لـ register, contact, banners/track**   | يمنع spam و abuse                    | 3 ساعات |
| 19  | **حذف الـ 120+ فهرس الميت**                             | يحسن Write performance               | 4 ساعات |
| 20  | **تقليل Realtime publication** للجداول المطلوبة فقط     | يقلل WAL processing بنسبة 50%+       | 4 ساعات |

### المرحلة 4: التحجيم (أسبوع 7-8)

| #   | الإجراء                                                   | الأثر                            | الوقت   |
| --- | --------------------------------------------------------- | -------------------------------- | ------- |
| 21  | **Cart price re-validation** عند checkout                 | يمنع الأسعار المجمدة             | 6 ساعات |
| 22  | **تفعيل `strongPasswordSchema`** في auth                  | يحسن أمان الحسابات               | 1 ساعة  |
| 23  | **إصلاح error boundaries locale** — استخراج locale من URL | تجربة مستخدم أفضل عند الخطأ      | 2 ساعة  |
| 24  | **إضافة Edge config data scrubbing**                      | يمنع تسرب auth headers لـ Sentry | 1 ساعة  |
| 25  | **تفعيل Upstash لـ promo validation** بدل in-memory       | rate limiting يعمل عبر instances | 1 ساعة  |

---

## الخلاصة

### ماذا يحتاج المشروع ليصمد أمام 10,000 مستخدم؟

```
الآن:                  بعد المرحلة 0+1:        بعد كل المراحل:
──────────────        ──────────────          ──────────────
Score: 61/100         Score: ~78/100          Score: ~92/100
Max Users: ~2,000     Max Users: ~8,000       Max Users: ~25,000+
Downtime: hours       Downtime: minutes       Downtime: <5min/month
Alerting: none        Alerting: basic         Alerting: comprehensive
Data Safety: risky    Data Safety: solid      Data Safety: excellent
```

**أهم 3 أشياء يجب عملها الآن:**

1. **تفعيل Cache Layer الموجود** — أعلى ROI في المشروع. الكود مكتوب، يحتاج فقط استخدام
2. **إنشاء `create_order_atomic` RPC** — يمنع أخطر ثغرة (طلبات بدون عناصر)
3. **إضافة `visibility change` guard** — يخفض حمل DB بنسبة 30-50%

**القرار الهندسي الأخطر:** بناء أنظمة حماية (Cache, Realtime Manager, withErrorHandler, withValidation, strongPasswordSchema) ثم عدم تفعيلها. هذا يعطي إحساس زائف بالأمان ويجعل الفريق يظن أن المشاكل محلولة.

---

_تقرير مُنشأ بتاريخ: 26 فبراير 2026_
_آخر تحديث: 26 فبراير 2026_
_المُعد: Claude — Senior Software Architect Audit_
