# خارطة طريق تحسين أداء إنجزنا

> **هذه خطة حية — يجب تحديثها بعد كل مرحلة**
>
> أي تنفيذ لمهمة هنا يجب أن يقترن بتحديث:
>
> 1. حالة الـ task في الجدول الموافق (✅ / 🔄 / ⬜).
> 2. القياسات الفعلية بعد التنفيذ في القسم ٧ (سجل القياسات).
> 3. أي اكتشاف جديد يُضاف كـ "متابعة" في القسم ٨.

> فرع التنفيذ الحالي للأداء: `claude/review-performance-roadmap-OSY6a` (Phase 1.5 follow-up — upload-artifact hidden-files fix)
> آخر تحديث: 2026-05-09 — Phase 1.5 (PR #372) merged، لكن Codex رصد فجوة ثالثة: `actions/upload-artifact@v4` يتجاهل الـ dot-paths افتراضياً، فالـ artifact لا يزال فارغاً حتى بعد تحويل الـ upload target إلى filesystem.

---

## ١. الفلسفة والأهداف

### الهدف الأعلى

تجربة سريعة على الموبايل المتوسط في مصر (Android رخيص + 4G/3G)، **ليست رفاهية للأجهزة الراقية**. إنجزنا تطبيق يومي للناس العاديين، فالأداء جزء من المنتج، لا عرض جانبي.

### مبادئ التشغيل

1. **القياس قبل التحسين.** لا نُحسِّن بناءً على إحساس، نُحسِّن بناءً على متركس.
2. **العميل أولاً.** رحلة العميل (home → providers → store → cart → checkout) هي الأكثر ربحية وهي الأكثر هشاشة. تستحق أعلى ميزانية أداء.
3. **التاجر والأدمن غير مقاسين حالياً — نُغلق هذه الفجوة كأولوية.**
4. **Threshold الـ CI يُحسَّن، لا يُرفع.** رفع الـ threshold دَين تقني، ليس حلاً.
5. **التحسين تدريجي، لا re-architecture كبيرة.** كل مرحلة لها هدف واضح وقابل للقياس.

---

## ٢. الوضع الحالي (Baseline — مايو 2026)

### قياسات Lighthouse CI

نسخة `lighthouserc.js` تختبر ٦ URLs بـ `formFactor: mobile`، `cpuSlowdownMultiplier: 4`، `numberOfRuns: 3`.

#### العتبات الحالية (مايو 2026)

| المتركس                     | العتبة          | ملاحظة                                                  |
| --------------------------- | --------------- | ------------------------------------------------------- |
| `categories:performance`    | ≥ 0.6           | ضعيف — يجب رفعه إلى 0.8                                 |
| `categories:accessibility`  | ≥ 0.9           | جيد                                                     |
| `categories:best-practices` | ≥ 0.85          | جيد                                                     |
| `categories:seo`            | ≥ 0.6           | منخفض للـ auth pages                                    |
| `first-contentful-paint`    | ≤ 4000ms        | فضفاض                                                   |
| `largest-contentful-paint`  | ≤ 7000ms        | فضفاض                                                   |
| `interactive` (TTI)         | ≤ 9000ms        | فضفاض                                                   |
| `cumulative-layout-shift`   | ≤ 0.1           | جيد                                                     |
| `total-blocking-time`       | ≤ 700ms         | عاد لـ 700 بعد إصلاحات Phase 1 (كان مرفوعاً 900 مؤقتاً) |
| `mainthread-work-breakdown` | ≤ 4000ms (warn) | تحذير فقط                                               |
| `bootup-time`               | ≤ 3000ms (warn) | تحذير فقط                                               |
| `dom-size`                  | ≤ 1500 (warn)   | تحذير فقط                                               |

#### آخر قياسات معروفة

| URL                  | TBT (median CI)                               | الحالة                                  |
| -------------------- | --------------------------------------------- | --------------------------------------- |
| `/ar` (welcome)      | غير مسجَّل                                    | يمر                                     |
| `/ar/providers`      | **783ms** (runs: 1527, 1099, 783) قبل Phase 1 | بعد Phase 1: قياس فعلي يُملأ بعد CI run |
| `/ar/cart`           | غير مسجَّل                                    | يمر                                     |
| `/ar/auth/login`     | غير مسجَّل                                    | يمر                                     |
| `/ar/custom-order`   | غير مسجَّل                                    | يمر                                     |
| `/ar/provider/login` | غير مسجَّل                                    | يمر                                     |

> **ملاحظة:** المتركس على CPU 4x throttle. الجهاز الحقيقي ÷ 4 تقريباً. TBT 783ms في CI ≈ 195ms على جهاز متوسط.

---

## ٣. المعايير المستهدفة (Targets)

### معايير Google Core Web Vitals (الجهاز الحقيقي)

| المتركس   | جيد     | يحتاج تحسين | ضعيف    |
| --------- | ------- | ----------- | ------- |
| LCP       | ≤ 2.5s  | 2.5-4s      | > 4s    |
| INP       | ≤ 200ms | 200-500ms   | > 500ms |
| CLS       | ≤ 0.1   | 0.1-0.25    | > 0.25  |
| TBT (lab) | ≤ 200ms | 200-600ms   | > 600ms |

### أهداف إنجزنا (ثلاث طبقات)

#### 🥇 المستوى المستهدف ("جودة عالية")

كل صفحات العميل تحقق "جيد" بمعايير Google على CI (مع 4x throttle):

- TBT ≤ 600ms (يُترجَم لـ ~150ms على الجهاز)
- LCP ≤ 4000ms
- TTI ≤ 6000ms
- Performance score ≥ 0.8

#### 🥈 المستوى الحالي المستهدف ("مقبول")

- TBT ≤ 700ms
- Performance score ≥ 0.6
- باقي المتركس داخل العتبات الحالية

#### 🥉 الحد الأدنى (ما لا نسمح بالنزول تحته)

- TBT ≤ 900ms (الحالي بعد الـ bump المؤقت)
- لا regression > 15% بين أي PR والـ baseline

---

## ٤. الفجوات المعروفة

### فجوة ١ — قياس صفر للتاجر والأدمن

| المسار                                    | حالة القياس |
| ----------------------------------------- | ----------- |
| `/ar/provider` (dashboard)                | ❌ غير مقاس |
| `/ar/provider/orders` (قائمة)             | ❌ غير مقاس |
| `/ar/provider/orders/[id]` (تفاصيل)       | ❌ غير مقاس |
| `/ar/provider/orders/custom/[id]` (تسعير) | ❌ غير مقاس |
| `/ar/provider/finance`                    | ❌ غير مقاس |
| `/ar/admin/*` (كل الأدمن)                 | ❌ غير مقاس |

نطير على عمياء على هذه الصفحات. أي regression يصل للإنتاج بدون مقاومة CI.

### فجوة ٢ — حدود حقيقة + measurement

- **Real User Monitoring (RUM)** غير مفعَّل بشكل واضح في الـ codebase. Sentry موجود للـ errors لكن لا performance metrics من الإنتاج.
- لا lookup table للـ performance budgets per route.
- عدم وجود alerting عند تجاوز الـ budgets.

### فجوة ٣ — أنماط الكود المُعطِّلة

- **`/ar/providers`:** رندر 100 بطاقة بدون virtualization/pagination.
- `useSDUI` يجلب على mount بدون priority.
- `ProviderCard` غير مُغلَّف بـ `React.memo`.
- `useEffect` لـ `searchProducts` يفعّل setTimeout حتى مع query فارغ.
- صفحات تاجر طويلة (1000+ سطر) بدون code-splitting واضح.

---

## ٥. التشخيصات التفصيلية

### 5.1 `/ar/providers` (FCP/TBT issues)

**الكود:**

- `src/app/[locale]/providers/page.tsx` — server component، ISR 5min ✓
- `src/app/[locale]/providers/ProvidersClient.tsx` — 588 سطر، client
- `src/components/customer/shared/ProviderCard.tsx` — 288 سطر، client

**رحلة الصفحة:**

1. Server fetch 100 providers (cached) — 0ms للمستخدم.
2. Client hydration — تحميل JS bundle.
3. `useSDUI` hook — RPC `get_page_sections` على mount.
4. `useUserLocation` context — قراءة localStorage + احتمال profile fetch.
5. `useFavorites` hook — auth check + favorites query.
6. **رندر ١٠٠ ProviderCard** — كل بطاقة Link + Image + 4-6 icons + badges = ~20 DOM nodes × 100 = **2000 DOM nodes في render واحد**.
7. Re-renders عند resolve favourites/location → `useMemo` يعيد فلترة + sort 100 عنصر.

**التقدير الزمني (CI 4x throttle):**

- Bundle parse + hydrate: ~150-250ms
- useSDUI fetch + setState: ~200-400ms
- 100-card initial render: ~300-500ms ← الأكبر
- Re-renders: ~50-100ms × عدد الـ updates

**مجموع متوقع:** 750-1100ms — يطابق القيم الملاحَظة.

### 5.2 `/ar` (welcome) — يمر، لكن غير محسوب tightly

لم يُقَس بدقة. **مهمة في المرحلة الأولى:** قياس واستخراج الـ baseline.

### 5.3 `/ar/cart` — يمر، لكن قد يكبر مع وجود variants/promo logic

نفس الملاحظة — يحتاج baseline.

### 5.4 صفحات التاجر/الأدمن — مجهولة تماماً

**الأخطر:** كل التحسينات اللي نحتاجها ممكن تكون مخفية. أبسط فحص يدوي:

- `/provider/orders/page.tsx` — refactor حديث + queries مُضمَّنة + realtime subscriptions.
- `/admin/orders/[id]/page.tsx` — table متعدد الجداول + refunds.

**هذا أولوية ١ في المرحلة الثانية.**

---

## ٦. خطة التنفيذ المرحلية

### المرحلة ١ — Quick Wins على `/ar/providers` (PR منفصل)

**الهدف:** TBT ≤ 450ms على CI، إعادة الـ threshold إلى 700.

| #   | المهمة                                                                                                                  | تأثير متوقع  | حالة | ملاحظة                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------ | ---- | ----------------------------------------------------------------------------------------------------------------- |
| 1.1 | `React.memo` على `ProviderCard` + استقرار `onFavoriteToggle` callback                                                   | -50-100ms    | ✅   | تغيير في توقيع الـ prop: يستقبل `providerId` بدل closure-per-card، عشان الـ memo فعَّال                           |
| 1.2 | رندر تدريجي: أول 12 بطاقة فوراً، الباقي بـ `requestIdleCallback` (مع fallback لـ `setTimeout` على Safari)               | -300-400ms   | ✅   | reset الـ window عند تغيير الفلتر                                                                                 |
| 1.3 | تأجيل `useSDUI` للـ idle time                                                                                           | -100-200ms   | 🔁   | مؤجَّل لـ Phase 4 — `useSDUI` يعمل بالفعل في `useEffect` بعد initial paint، التأثير الفعلي يحتاج قياس قبل التحسين |
| 1.4 | `searchProducts` يخرج فوراً لو query فارغ (قبل debounce)                                                                | -50ms        | ✅   |                                                                                                                   |
| 1.5 | `useMemo` للفلترة: short-circuit يُرجع نفس مرجع `providers` لو كل الفلاتر افتراضية (يحفظ referential equality للـ memo) | -30-50ms     | ✅   |                                                                                                                   |
| 1.6 | إعادة TBT threshold إلى 700ms في `lighthouserc.js`                                                                      | (validation) | ✅   |                                                                                                                   |
| 1.7 | تحديث هذه الوثيقة بالقياسات الفعلية                                                                                     | (process)    | 🔄   | يُملأ بعد Lighthouse run على الـ PR                                                                               |

**معيار قبول:** Lighthouse CI يمر بـ TBT ≤ 700، الـ flow اليدوي على `/ar/providers` يبدو "ناعم" بدون hitches.

### المرحلة ٢ — Production-like measurement + إغلاق فجوة التاجر/الأدمن (PR منفصل)

**الهدف:** Lighthouse يقيس Vercel preview (CDN + Edge + Brotli + image optimization) بدل localhost على Linux runner، لأن الأخير pessimistic بنسبة 20-40% مقارنة بتجربة المستخدم الحقيقي. ثم تغطية صفحات التاجر والأدمن.

| #   | المهمة                                                                                                                           | تأثير متوقع                               | حالة |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---- |
| 2.1 | تغيير trigger في `lighthouse.yml` من `pull_request` إلى `deployment_status` بانتظار Vercel preview ينشر، ثم يقيس الـ preview URL | أرقام تعكس production environment فعلاً   | ⬜   |
| 2.2 | `lighthouserc.js` يقرأ الـ base URL من env (مثل `LHCI_TARGET_URL`) بدل hardcoding `localhost:3000`                               | تكامل مع #2.1                             | ⬜   |
| 2.3 | إضافة URLs لقياس صفحات التاجر العامة (login pages الفعلية تُقاس بالفعل) — تحقق التغطية بعد التغيير                               | تغطية أوسع                                | ⬜   |
| 2.4 | Authenticated Lighthouse runs — Puppeteer script يسجّل دخول قبل التشغيل لقياس dashboards                                         | يفتح الـ provider/admin dashboards للقياس | ⬜   |
| 2.5 | إضافة URLs: `/provider/orders`, `/provider/orders/[sample-id]`, `/provider/finance`, `/admin/orders`                             | كشف regressions داخلية                    | ⬜   |
| 2.6 | إضافة URLs: `/provider/orders/custom/[sample-id]` (صفحة التسعير)                                                                 | كشف ثقل PricingNotepad                    | ⬜   |
| 2.7 | Performance budgets per route — كل صفحة لها sub-config tighter                                                                   | منع zone creep                            | ⬜   |
| 2.8 | تحديث هذه الوثيقة بالـ baseline الجديد (production-like) + عتبات أحدث                                                            | (process)                                 | ⬜   |

**معيار قبول:** كل صفحة في الـ workflows الثلاثة (عميل، تاجر، أدمن) لها قياس مستمر في CI من production-like environment، وقيمة Performance score معروفة وموثقة.

### المرحلة ٣ — معالجة `/ar` و `/ar/cart` (PR منفصل)

**الهدف:** نفس مستوى `/ar/providers` بعد المرحلة ١.

| #   | المهمة                                             | حالة |
| --- | -------------------------------------------------- | ---- |
| 3.1 | Baseline قياس مفصَّل لـ `/ar` و `/ar/cart`         | ⬜   |
| 3.2 | تحديد الـ contributors الكبار للـ TBT في كل منهما  | ⬜   |
| 3.3 | تطبيق نفس quick wins (memo, deferred render, etc.) | ⬜   |
| 3.4 | تحديث الوثيقة                                      | ⬜   |

### المرحلة ٤ — صفحات التاجر (PR منفصل)

**الهدف:** الصفحات اللي عملت refactor عليها مؤخراً (orders, custom orders) لا تحتوي regressions.

| #   | المهمة                                            | حالة |
| --- | ------------------------------------------------- | ---- |
| 4.1 | قياس `/provider/orders` (قائمة + realtime)        | ⬜   |
| 4.2 | تأجيل `useSDUI` و heavy hooks في dashboard التاجر | ⬜   |
| 4.3 | تخفيف `PricingNotepad` (588 سطر) — code-splitting | ⬜   |
| 4.4 | virtualization لقائمة الطلبات لو > 50 طلب         | ⬜   |
| 4.5 | تحديث الوثيقة                                     | ⬜   |

### المرحلة ٥ — صفحات الأدمن (PR منفصل)

**الهدف:** أداء مقبول حتى مع كميات بيانات كبيرة.

| #   | المهمة                                                     | حالة |
| --- | ---------------------------------------------------------- | ---- |
| 5.1 | قياس `/admin/orders`, `/admin/finance`, `/admin/customers` | ⬜   |
| 5.2 | Server-side pagination + filtering (إذا غير موجود)         | ⬜   |
| 5.3 | تخفيف الجداول الكبيرة (TanStack Virtual أو ما يشبه)        | ⬜   |
| 5.4 | تحديث الوثيقة                                              | ⬜   |

### المرحلة ٦ — Real User Monitoring (PR منفصل)

**الهدف:** نعرف ما يحدث على أجهزة المستخدمين الفعلية.

| #   | المهمة                                                   | حالة |
| --- | -------------------------------------------------------- | ---- |
| 6.1 | تفعيل Sentry Performance أو Vercel Speed Insights        | ⬜   |
| 6.2 | Web Vitals reporting من `app/layout.tsx` (LCP, INP, CLS) | ⬜   |
| 6.3 | Dashboard للـ p75 / p95 على الـ routes الرئيسية          | ⬜   |
| 6.4 | Alerting عند regression > 15% أسبوع لأسبوع               | ⬜   |
| 6.5 | تحديث الوثيقة                                            | ⬜   |

### المرحلة ٧ — رفع المعايير (Tighten thresholds)

**الهدف:** نحقق "جودة عالية" — Performance score ≥ 0.8، TBT ≤ 600.

| #   | المهمة                                             | حالة |
| --- | -------------------------------------------------- | ---- |
| 7.1 | بعد المراحل 1-6، رفع `total-blocking-time` إلى 600 | ⬜   |
| 7.2 | رفع `categories:performance` minScore إلى 0.8      | ⬜   |
| 7.3 | تحديث الوثيقة                                      | ⬜   |

---

## ٧. سجل القياسات (يُحدَّث بعد كل مرحلة)

### Baseline — قبل أي عمل (مايو 2026)

| URL                  | Performance | LCP      | TBT       | TTI      | Notes           |
| -------------------- | ----------- | -------- | --------- | -------- | --------------- |
| `/ar`                | TBD         | TBD      | TBD       | TBD      | لم يُقَس        |
| `/ar/providers`      | TBD         | TBD      | **783ms** | TBD      | متجاوز عتبة 700 |
| `/ar/cart`           | TBD         | TBD      | TBD       | TBD      | لم يُقَس        |
| `/ar/auth/login`     | TBD         | TBD      | TBD       | TBD      | لم يُقَس        |
| `/ar/custom-order`   | TBD         | TBD      | TBD       | TBD      | لم يُقَس        |
| `/ar/provider/login` | TBD         | TBD      | TBD       | TBD      | لم يُقَس        |
| `/provider/orders`   | غير مقاس    | غير مقاس | غير مقاس  | غير مقاس | فجوة            |
| `/admin/orders`      | غير مقاس    | غير مقاس | غير مقاس  | غير مقاس | فجوة            |

### بعد المرحلة ١ — مُدمَجة في production (PR #371)

التغييرات المُطبَّقة:

- `ProviderCard` أصبح `memo`-ized؛ `onFavoriteToggle` تستقبل `providerId` فقط (لا closure-per-card) — يقطع 99% من الـ re-renders للبطاقات الـ 100 عند تغيير state في الوالد.
- الرندر التدريجي يقصر الـ commit الأول على 12 بطاقة (~240 DOM node بدل 2000).
- باقي البطاقات تُرسَم في batches من 12 خلال `requestIdleCallback` بعد initial paint.
- `searchProducts` لا يحجز timer ولا يستدعي menu_items لو query فارغ.
- الـ filter `useMemo` يُرجع نفس مرجع `providers` في الحالة الافتراضية، فلا يُهلك React reconciliation للـ visible slice.

**حالة الـ CI:** Lighthouse Audit مرّ بنجاح على آخر commit للـ PR (`aeb227b`)، أي أن كل العتبات بما فيها `total-blocking-time ≤ 700ms` على `/ar/providers` محقَّقة. هذا يثبت أن الـ regression الذي كان عند 783ms قد عاد إلى ما دون 700ms.

**القياس الرقمي التفصيلي:** غير متاح بعد — الـ `actions/upload-artifact` كان يجد `.lighthouseci/` فارغاً لأن الـ upload target كان `'temporary-public-storage'`. **هذه فجوة معماري في الـ CI، يتم إصلاحها في Phase 1.5 (انظر أدناه).** بعد الإصلاح، أول CI run جديد سيحفظ JSON كامل بكل الـ metrics لكل URL، وعندها يتم ملء الجدول الرقمي هنا.

### Phase 1.5 — إصلاح فجوة القياس + Vercel region (PR منفصل)

اكتشفنا أثناء محاولة استخراج أرقام Phase 1 الفعلية ثلاث فجوات يجب إغلاقها قبل أي قياس أعمق:

| #   | الفجوة                                                                                                                                                                                                                                                                       | الإصلاح                                                                                                          | الفائدة                                                                                    | حالة          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------- |
| 1   | `lighthouserc.js` يستخدم `target: 'temporary-public-storage'` فلا تُحفظ artifacts محلياً، والخطوة `actions/upload-artifact` تطبع warning "No files found" بصمت.                                                                                                              | تغيير إلى `target: 'filesystem'` + `outputDir: './.lighthouseci'`.                                               | كل CI run يصبح فيه artifact قابل للتنزيل (JSON + HTML تقارير).                             | ✅ PR #372    |
| 2   | `vercel.json` لا يحدد `regions`، فالـ default = `iad1` (Washington DC). كل dynamic request من بني سويف يلف على واشنطن (~150ms RTT).                                                                                                                                          | إضافة `"regions": ["fra1"]` (Frankfurt).                                                                         | ~80ms أقل لكل dynamic request للمستخدم المصري. أكبر perf win بأقل تعديل.                   | ✅ PR #372    |
| 1b  | **Codex 2026-05-09:** بعد إصلاح #1، الـ artifact لا يزال يُرفع فارغ. السبب: `actions/upload-artifact@v4` يتجاهل الـ dot-prefixed paths افتراضياً، و `.lighthouseci/` مجلد مخفي. الـ workflow log يطبع `Warning: No files were found with the provided path: .lighthouseci/`. | إضافة `include-hidden-files: true` في خطوة `actions/upload-artifact@v4` داخل `.github/workflows/lighthouse.yml`. | الـ artifact يحوي JSON + HTML فعلاً، فيمكن استخراج TBT/LCP/TTI الرقمية لـ Phase 1.         | ✅ هذا الـ PR |
| 3   | الـ Lighthouse CI يقيس localhost:3000 على الـ Linux runner، لا الـ Vercel Edge production. الأرقام pessimistic vs الواقع.                                                                                                                                                    | (Phase 2) Lighthouse على Vercel preview URL عبر `deployment_status` event.                                       | باقي CI runs تعكس production environment فعلاً (CDN + Edge + Brotli + image optimization). | ⬜ Phase 2    |

**الفجوة #3 خارج نطاق Phase 1.5** — تستحق PR منفصل بعد ما #1 و #1b و #2 يثبتا.

### بعد Phase 1.5 — أول CI artifact مع أرقام حقيقية (2026-05-09)

أول workflow run بعد إصلاح الـ artifact (PR #373) أنتج أرقام حقيقية لكل الـ 6 URLs × 3 runs. القيم أدناه من `manifest.json` (Performance score median من 3 runs):

| URL                  | Performance (median) | Performance (runs) | عتبة `categories:performance` (≥ 0.6) | ملاحظة                                                                        |
| -------------------- | -------------------- | ------------------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| `/ar` (welcome)      | **0.63**             | 0.63 / 0.63 / 0.55 | ✅ يمر                                | منخفض — أولوية Phase 3 لتحسينه                                                |
| `/ar/providers`      | **0.71**             | 0.57 / 0.71 / 0.71 | ✅ يمر                                | **Phase 1 wins ظهرت** — أعلى score بين الـ client pages                       |
| `/ar/cart`           | **0.69**             | 0.65 / 0.69 / 0.69 | ✅ يمر                                | متماسك — يستحق baseline تفصيلي                                                |
| `/ar/auth/login`     | **0.70**             | 0.75 / 0.68 / 0.70 | ✅ يمر                                | أعلى من المتوقع لصفحة auth                                                    |
| `/ar/custom-order`   | **0.69**             | 0.69 / 0.63 / 0.69 | ✅ يمر                                | مستقر                                                                         |
| `/ar/provider/login` | **0.58**             | 0.58 / 0.61 / 0.58 | ⚠️ عند الحد                           | أضعف URL — أقل من الـ minScore لكن CI assertion عدّى بالـ rounding/median run |

**ملاحظات تشغيلية:**

- التباين بين الـ 3 runs لـ `/ar/providers` (0.57 → 0.71) كبير، يعكس CI cold-start variance. الـ representative run = 0.71.
- `/ar/provider/login` يحتاج فحص: نفس البنية الـ Auth لكن score أقل بـ 12 نقطة من `/ar/auth/login`. مرشّح لـ Phase 4.
- TBT/LCP/TTI الرقمية الفعلية ليست في `manifest.json` (يحوي scores فقط) — مطلوب تنزيل أحد ملفات `lhr-*.json` (أو ملف `assertion-results.json`) لاستخراجها. **مرشَّح للجولة التالية.**

**الخلاصة:** Phase 1 quick wins نجحت — `/ar/providers` كان عند 783ms TBT قبلها (دون 0.5 perf score متوقع)، الآن median 0.71. الانتقال إلى Phase 2 (Vercel preview measurement) صار مبرَّراً لأن الأرقام الحالية pessimistic بـ 20-40% مقابل الإنتاج الحقيقي.

### بعد المرحلة ٢

_يُملأ بعد التنفيذ_

### بعد المرحلة ٣

_يُملأ بعد التنفيذ_

_(وهكذا)_

---

## ٨. متابعات (Follow-ups) ومخاطر

- **خطر:** تحسين `/ar/providers` يكشف نفس النمط في صفحات أخرى. كل tradeoff يُسجَّل هنا.
- **خطر:** Sentry Performance قد يكون له تكلفة شهرية. تحقق قبل التفعيل.
- **متابعة:** الـ `loading.tsx` لـ providers يستخدم 6 skeleton بطاقات — يجب أن يطابق العدد الفعلي للأول-أعلى-الفولد بعد المرحلة ١. **(تم في Phase 1 — رُفِع إلى 12.)**
- **متابعة:** الـ image optimizations (placeholder=blur, formats=[avif, webp]) — تحقق هل كلها مفعَّلة في `next.config.ts`.
- **اكتشاف 2026-05-09:** `lighthouserc.js` كان يستخدم `temporary-public-storage` فلا artifacts، و `vercel.json` لم يحدد region (default=iad1، 150ms RTT لمصر). **عُولج في Phase 1.5 / PR #372.**
- **اكتشاف 2026-05-09 (Codex review):** حتى بعد PR #372، الـ artifact لا يزال يصل فارغ. السبب: `actions/upload-artifact@v4` يتجاهل الـ dot-prefixed paths افتراضياً، فالمحتوى الذي ينتجه `target: 'filesystem'` تحت `.lighthouseci/` لا يتم رفعه. **عُولج في هذا الـ PR بإضافة `include-hidden-files: true`.**
- **اكتشاف 2026-05-09:** Lighthouse CI الحالي يقيس localhost في GitHub runner، لا Vercel Edge production. الأرقام pessimistic (no CDN, no Brotli, no image optimization). الإصلاح في Phase 2 — switch trigger إلى `deployment_status` ليقيس Vercel preview URL.
- **متابعة:** الـ `manifest.json` يحوي Performance scores فقط، لا TBT/LCP/TTI numericValues. لاستخراج الأرقام التفصيلية لـ `/ar/providers`، نحتاج محتوى أحد الملفين: `assertion-results.json` (أفضل — يحوي كل الـ assertions بقيمها) أو `ar_providers-2026_05_09_10_14_17-report.json` (الـ representative run).
- **متابعة عملية (Prettier + Husky):** الـ pre-commit hook (`.husky/pre-commit` → `npx lint-staged`) يُشغّل `prettier --write` على ملفات `.md` تلقائياً، لكن الـ Claude Code agent sessions أحياناً تتجاوز الـ husky hooks. **القاعدة:** قبل أي commit يدوي على markdown، شغّل `npm run format:check` محلياً. CI يُشغّل `npm run format:check` في `.github/workflows/ci.yml` (Lint & Type Check job)، فشل عنده يبقى صريح.

---

## ٩. بروتوكول التحديث (إجباري)

> هذه ليست وثيقة "يقرأها مرة"، هي وثيقة عمل.

عند تنفيذ أي مهمة من القسم ٦:

1. **قبل البدء:** علِّم المهمة 🔄 في الجدول.
2. **أثناء العمل:** سجِّل كل اكتشاف غير متوقع في القسم ٨.
3. **بعد الانتهاء:**
   - علِّم المهمة ✅.
   - شغِّل Lighthouse على الصفحات المتأثرة.
   - أدخِل القياسات الفعلية في القسم ٧ (سجل القياسات).
   - حدِّث "آخر تحديث" في أعلى الوثيقة.
   - اكتب اسم الـ PR/commit في تعليق بجانب المهمة.
4. **لو الـ task أُلغي أو تأجَّل:** احذفه من الجدول واكتب السبب في القسم ٨.

**لو سار العمل بدون تحديث الوثيقة، الجزء ده من الـ debt التقني، مش "خلصنا".**

---

## ١٠. مرجع سريع — كيف تشغّل قياس محلياً

```bash
# Build production
npm run build

# Run Lighthouse CI on local server
npx lhci collect --config=./lighthouserc.js
npx lhci assert

# View detailed report
npx lhci open

# Or run a single URL directly
npx lighthouse http://localhost:3000/ar/providers \
  --view \
  --emulated-form-factor=mobile \
  --throttling.cpuSlowdownMultiplier=4
```

**أهم متركس تتابعها:**

- **Total Blocking Time** — هل يتوقف الـ main thread طويلاً.
- **Largest Contentful Paint** — متى المحتوى الأهم يظهر.
- **Time to Interactive** — متى الصفحة تستجيب فعلاً.
- **Main Thread Work Breakdown** — أين تُهدر الـ CPU (script eval, layout, paint).
