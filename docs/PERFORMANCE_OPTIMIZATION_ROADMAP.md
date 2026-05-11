# خارطة طريق تحسين أداء إنجزنا

> **هذه خطة حية تقود الـ AI agent والـ humans معاً.** كل قرار "أيهم نعمل بعدين؟" أو "أيهم الأولوية؟" إجابته في هذا الملف. لو ما لقيتش الإجابة هنا، الإجابة تُضاف هنا قبل التنفيذ.
>
> أي تنفيذ لمهمة هنا يجب أن يقترن بتحديث:
>
> 1. حالة الـ task في الجدول الموافق (✅ / 🔄 / ⬜).
> 2. القياسات الفعلية بعد التنفيذ في القسم ٧ (سجل القياسات).
> 3. أي اكتشاف جديد يُضاف كـ "متابعة" في القسم ٨.
> 4. تحديث جدول §٠.٢ (الأولويات) لو الـ ranking اتغيّر.

> فرع التنفيذ الحالي للأداء: `claude/perf-validate-roadmap-update` (roadmap update + task C-bis — provider-detail a11y tokens fix).
> آخر تحديث: 2026-05-11 — task A (PR #381)، B+C (PR #382) merged. Task C-bis (a11y tokens) جاهز في نفس الـ PR. التالي بعد merge: انتظار CI artifact لتأكيد categories:accessibility ≥ 0.9 على provider-detail.

---

## ٠. الحالة العاملة الحالية (data-driven — يُقرأ أولاً)

> هذا هو **مصدر الحقيقة التشغيلي**. لو في تعارض بين هذا القسم وأي قسم تاني تحت، هذا يفوز.

### ٠.١ ما تم حسمه نهائياً (أزل من قائمة القلق)

| الموضوع                                                | الحالة                                                                                                                                                | الدليل                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **CLS على كل routes**                                  | ✅ تحت 0.012 على الست routes في الـ CI artifact                                                                                                       | `manifest.json` + per-route LHR (مايو 11)              |
| **TTFB**                                               | ✅ 24ms ثابت عبر كل routes (Vercel fra1 + edge cache يعملان)                                                                                          | LHR `server-response-time.numericValue ≈ 24` في كل ملف |
| **الـ CLS على home (`/ar`)**                           | ✅ DeliveryModeSelector skeleton matched (PR #378) — DevTools live CLS = 0.01 بعد الإصلاح                                                             | screenshots مايو 10                                    |
| **الـ CLS على provider detail (`/ar/providers/{id}`)** | ✅ Banner `height: 0 → auto` removed — DevTools live CLS = 0 (مطعم الصفا، كان 0.84)                                                                   | الـ PR الحالي                                          |
| **الـ LCP المتأخّر بالـ banner opacity animation**     | ✅ Banner opacity animation removed — كان يُضيف 1.4s render delay على LCP element                                                                     | الـ PR الحالي commit `6e04b64`                         |
| **CI Lighthouse على Vercel preview**                   | ✅ Phase 2 يعمل — artifacts كاملة تتولّد على كل deployment_status                                                                                     | PR #377 + الـ artifact الحالي                          |
| **SEO false-fail من preview noindex**                  | ✅ `skipAudits: ['is-crawlable']` على preview + guardrail script في `scripts/check-noindex.sh`                                                        | PR #377                                                |
| **LCP universal bottleneck (font preload bandwidth)**  | ✅ Task C font preload removal validated by post-merge artifact — LCP −1.0s على 4 routes (cart / auth / custom-order / provider-login)، perf +3..5pts | artifact 2026-05-11 (post PR #382) في §٧               |

**الخلاصة:** الـ CLS و TTFB لم يعودا أهدافاً. كل التحسين الجاي يستهدف **LCP و TBT و JS bundle size**.

### ٠.٢ الأولوية الحالية (impact-ranked) — يُتبَع بالترتيب بدون سؤال

الـ Impact = `(100 - real_user_RES) × samples` من Vercel Speed Insights (real-user data، آخر ٧ أيام). الترتيب يُعاد حسابه لما البيانات تتغيّر.

| #      | Route                                  | Field RES   | Samples | Impact   | Lab Perf (CI)         | حالة                                          | ملاحظة                                                                                                                                 |
| ------ | -------------------------------------- | ----------- | ------- | -------- | --------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | `/ar` (الـ home الفعلي بعد location)   | **47 POOR** | 44      | **2332** | غير مقاس              | ⬜ blocked على B-bis                          | الـ home gated بـ middleware cookie + client localStorage. يحتاج puppeteer devDep لـ seeding — مؤجَّل (انظر §٠.٥ + task B-bis في §٠.٦) |
| **P1** | `/ar/providers/{id}` (provider detail) | 78          | 47      | 1034     | **0.65 lab (median)** | 🔄 a11y fixed in current PR، LCP 5.58s queued | tokens fixed → strict assertions تُطبَّق. LCP 5.58s median لسه أعلى من باقي routes — مرشح لـ task جديد بعد B-bis                       |
| **P2** | `/ar/auth/login`                       | **44 POOR** | 16      | 896      | 0.78 lab              | ⬜                                            | lab أفضل من field — مرشح لـ JS-heavy hydration                                                                                         |
| **P3** | `/ar/welcome`                          | 84          | 22      | 352      | **0.80 lab**          | ✅ مقبول                                      | لا يستحق work الآن — مراقبة فقط                                                                                                        |
| **P4** | `/ar/admin/log...`                     | 64          | 10      | 360      | غير مقاس              | ⬜                                            | Admin route — أولوية أقل                                                                                                               |
| **P5** | `/ar/admin`                            | 59          | 5       | 205      | غير مقاس              | ⬜                                            | Admin — لاحقاً                                                                                                                         |

**Cross-cutting:** الـ LCP بين 3.8s-5.2s على **كل** الـ routes في الـ CI. ده universal cause مش route-specific. **PR منفصل (P-X)** لـ root-cause investigation (font loading, render-blocking CSS, image priority، إلخ). لو نجح، يحسّن الست routes دفعة واحدة → impact تراكمي ضخم.

### ٠.٣ قواعد القرار الإجبارية (تمنع "أيهم تفضّل؟")

1. **لا تنفّذ على route مش الـ top of queue** إلا لو:
   - Cross-cutting fix يفيد كل routes (مثل LCP root cause).
   - Bug على route لا تعمل أصلاً (CLS/build/runtime).
   - User طلب صراحة route بعينه.
2. **لا تضيف route للـ CI URLs بدون قياس قبل والبعد.** الـ baseline في §٧ يلزم له entry جديد.
3. **لا تخفّض threshold في `lighthouserc.js`.** الـ regression تُحلَّل root cause. لو الـ assertion نقص، نـ fix الكود مش العتبة.
4. **PR per route per metric.** ما نخلطش CLS + LCP + TBT في PR واحد إلا لو نفس الـ component (زي banner: CLS + LCP لأنه نفس السبب الجذري).
5. **كل PR يحتوي على:**
   - Hypothesis قبل الـ fix (في commit message).
   - بعد الـ merge: validation من real-user data أو CI run جديد ضمن ٢٤ ساعة.
6. **لو الـ hypothesis اتعارض مع الـ data بعد القياس** → reverting أسرع من إصلاح second-order. لا نتمسّك بالـ fix لو ما حسّنش.
7. **التحقق mandatory قبل أي commit:** `npm run format:check && npm run lint && npm run typecheck`. لو الـ husky hook اتجاوز، الـ CI سيفشل.

### ٠.٤ الـ Process الموحّد لكل route (٧ خطوات ثابتة)

كل PR على route جديد يتبع هذه الخطوات بالحرف:

1. **اقرأ الـ data**: افتح آخر CI artifact LHR للـ route + Speed Insights field RES. حدّد الـ dominant metric (LCP أم TBT أم INP).
2. **اقرأ الكود**: ابحث عن الـ component المسؤول عن:
   - LCP element (من `audits["largest-contentful-paint-element"].details.items[0].node.snippet`)
   - أكبر long tasks (من `audits["long-tasks"].details.items`)
   - render-blocking resources (`audits["render-blocking-resources"]`)
3. **اكتب hypothesis** في الـ TodoWrite + draft commit message: "I think X causes Y because Z. Fixing X should reduce Y by ~N%."
4. **fix minimum viable** — أصغر تغيير ينجز الـ hypothesis. لا cleanup، لا abstraction.
5. **validate locally**: format/lint/typecheck. لو لمست component فيه `useEffect` معقد، شغّل تجربة local بـ `npm run dev` ثم DevTools.
6. **commit + push** على branch مفرد `claude/perf-<route>-<metric>`. مفيش mixed concerns.
7. **بعد merge + deploy**: انتظر CI run جديد. حدّث §٧ بالأرقام الفعلية. علّم الـ task ✅ في §٠.٢. لو ما تحسّنش، open follow-up أو revert.

### ٠.٥ Measurement gaps معروفة (يُسد قبل القياس)

- **`/ar` redirect — لا يزال مفتوحاً، مؤجَّل في task B-bis:** الـ home يحتاج تجاوز guard مزدوج:
  - **Server-side gate:** `src/middleware.ts:70` يفحص الكوكي `engezna_has_location` ويـ redirect لـ `/ar/welcome` لو غايبة.
  - **Client-side gate:** `src/app/[locale]/HomePageClient.tsx:163-178` يقرأ `engezna_guest_location` من localStorage في useState lazy init ويعمل `router.replace('/welcome')` post-hydration لو `governorateId` غير موجود.
  - **Cookie-only injection لا يكفي** — يمر الـ server gate لكن الـ client gate يطلق بعد hydration فالـ CI ينتهي على welcome، أسوأ من قياسها صراحة.
  - **الـ fix الكامل:** Puppeteer script يـ seed الـ localStorage مع الكوكي (`scripts/lhci-home-setup.js` معمول لكن يحتاج `puppeteer` كـ devDep ~300MB). task B-bis في §٠.٦.
  - **النتيجة الحالية:** `/ar` ليس في `lighthouserc.js` URL list — تجنباً للقياس المضلِّل.
- **Provider detail مُغطَّى ✅** بـ `/ar/providers/{stable-id}` (task B الحالية).
- **Dashboards (admin، provider)**: مؤجَّلة لـ task يتطلب Puppeteer login session — Phase 2.4 في الـ legacy plan.

### ٠.٦ المهام الفعلية المُجدولة بالترتيب

| Order     | Task                                                                                                                  | PR Branch                          | Owner Action                          | Blocker                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------- | ---------------------------------------- |
| **A**     | merge الـ PR الحالي (CLS + LCP banner)                                                                                | `claude/perf-provider-detail-page` | ✅ merged PR #381                     | جاهز                                     |
| **B**     | إضافة provider-detail URL + cookie injection + preflight + assertMatrix override                                      | `claude/perf-add-routes-ci`        | ✅ merged PR #382                     | —                                        |
| **B-bis** | Step 0b: تثبيت `puppeteer` كـ devDep + تفعيل `scripts/lhci-home-setup.js` كـ `puppeteerScript` + إعادة `/ar` للـ URLs | `claude/perf-puppeteer-home-setup` | PR منفصل (قرار user)                  | B merged + قرار يـ approve ~300MB devDep |
| **C**     | Drop font preload (8 weights → 0) لتخفيف ~310KB من critical path                                                      | `claude/perf-add-routes-ci`        | ✅ merged PR #382 — LCP −1.0s مُحقَّق | —                                        |
| **D**     | P0 home: PR صغير على home page بناءً على الـ data                                                                     | `claude/perf-home-<metric>`        | PR                                    | B-bis + C merged                         |
| **E**     | P2 auth/login: TBT 161ms جيد لكن field RES = 44 — investigation للـ INP/JS hydration                                  | `claude/perf-auth-login-<metric>`  | PR                                    | D merged                                 |

**ملاحظة:** الـ ranking يتغيّر لو Speed Insights data اتحركت بعد B/C/D. حدّث §٠.٢ قبل اختيار E.

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

| #   | المهمة                                                                                                                           | تأثير متوقع                               | حالة            |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------- |
| 2.1 | تغيير trigger في `lighthouse.yml` من `pull_request` إلى `deployment_status` بانتظار Vercel preview ينشر، ثم يقيس الـ preview URL | أرقام تعكس production environment فعلاً   | 🔄 PR (current) |
| 2.2 | `lighthouserc.js` يقرأ الـ base URL من env (مثل `LHCI_TARGET_URL`) بدل hardcoding `localhost:3000`                               | تكامل مع #2.1                             | 🔄 PR (current) |
| 2.3 | إضافة URLs لقياس صفحات التاجر العامة (login pages الفعلية تُقاس بالفعل) — تحقق التغطية بعد التغيير                               | تغطية أوسع                                | ⬜              |
| 2.4 | Authenticated Lighthouse runs — Puppeteer script يسجّل دخول قبل التشغيل لقياس dashboards                                         | يفتح الـ provider/admin dashboards للقياس | ⬜              |
| 2.5 | إضافة URLs: `/provider/orders`, `/provider/orders/[sample-id]`, `/provider/finance`, `/admin/orders`                             | كشف regressions داخلية                    | ⬜              |
| 2.6 | إضافة URLs: `/provider/orders/custom/[sample-id]` (صفحة التسعير)                                                                 | كشف ثقل PricingNotepad                    | ⬜              |
| 2.7 | Performance budgets per route — كل صفحة لها sub-config tighter                                                                   | منع zone creep                            | ⬜              |
| 2.8 | تحديث هذه الوثيقة بالـ baseline الجديد (production-like) + عتبات أحدث                                                            | (process)                                 | ⬜              |

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

| URL                  | Performance (median) | Performance (runs) | عتبة `categories:performance` (≥ 0.6) | ملاحظة                                                                                                                                                                                                                               |
| -------------------- | -------------------- | ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/ar` (welcome)      | **0.63**             | 0.63 / 0.63 / 0.55 | ✅ يمر                                | منخفض — أولوية Phase 3 لتحسينه                                                                                                                                                                                                       |
| `/ar/providers`      | **0.71**             | 0.57 / 0.71 / 0.71 | ✅ يمر                                | **Phase 1 wins ظهرت** — أعلى score بين الـ client pages                                                                                                                                                                              |
| `/ar/cart`           | **0.69**             | 0.65 / 0.69 / 0.69 | ✅ يمر                                | متماسك — يستحق baseline تفصيلي                                                                                                                                                                                                       |
| `/ar/auth/login`     | **0.70**             | 0.75 / 0.68 / 0.70 | ✅ يمر                                | أعلى من المتوقع لصفحة auth                                                                                                                                                                                                           |
| `/ar/custom-order`   | **0.69**             | 0.69 / 0.63 / 0.69 | ✅ يمر                                | مستقر                                                                                                                                                                                                                                |
| `/ar/provider/login` | **0.58**             | 0.58 / 0.61 / 0.58 | ⚠️ at-risk                            | Median = 0.58 (threshold ≥ 0.60) فعلياً FAIL، لكن CI passed لأن lhci يستخدم `aggregationMethod: 'optimistic'` افتراضياً مع `minScore` — يأخذ أفضل run (0.61) فيمر. اثنان من 3 runs تحت العتبة، فالـ URL هش وأي variance بسيطة تكسره. |

**ملاحظات تشغيلية:**

- **كيف يحسب CI الـ pass/fail:** `lighthouserc.js` لا يحدد `aggregationMethod`، فـ lhci يستخدم الافتراضي `optimistic` لكل assertion بـ `minScore` — أي يأخذ **أفضل** run من الـ 3 ويقارنه بالعتبة. النتيجة: URL يمر حتى لو 2 من 3 runs تحت العتبة. عمود "Performance (median)" في الجدول أعلاه أصدق مؤشر للحال الفعلي من قيمة الـ assertion.
- التباين بين الـ 3 runs لـ `/ar/providers` (0.57 → 0.71) كبير، يعكس CI cold-start variance. الـ representative run = 0.71.
- `/ar/provider/login` يحتاج فحص: نفس البنية الـ Auth لكن score أقل بـ 12 نقطة من `/ar/auth/login`. مرشّح لـ Phase 4.
- **مصادر الأرقام في الـ artifact:** `manifest.json` يحوي **Performance category scores فقط** (مجمَّع لكل URL × run، بدون audits التفصيلية). `assertion-results.json` يحوي **الـ assertions الفاشلة فقط** (entries بـ `passed: false`، شامل تفاصيل numericValue/values/threshold)؛ الـ assertions الناجحة لا تُكتَب في الملف. للحصول على TBT/LCP/TTI الـ numericValue حين تكون **ناجحة** (الحالة الحالية لـ `/ar/providers` بعد Phase 1) لا بد من الـ LHR الكامل: `ar_providers-2026_05_09_10_14_17-report.json` (representative run) — مرشَّح للجولة التالية.

**Assertion-level evidence من `assertion-results.json` (PR #373 artifact):**

| Audit                       | URL             | Level | Median     | Runs               | Threshold | Status                         |
| --------------------------- | --------------- | ----- | ---------- | ------------------ | --------- | ------------------------------ |
| `mainthread-work-breakdown` | `/ar/providers` | warn  | **4503ms** | 5535 / 4503 / 4609 | ≤ 4000ms  | ⚠️ FAIL (warn فقط، لا يكسر CI) |
| `render-blocking-resources` | `/ar/cart`      | warn  | **589ms**  | 620 / 590 / 589    | ≤ 500ms   | ⚠️ FAIL (warn فقط، تجاوز ~18%) |

كل الـ `error`-level assertions نجحت ضمنياً (لم تظهر في `assertion-results.json`)، أي:

- TBT ≤ 700ms على كل URLs (شمل `/ar/providers` بعد Phase 1).
- LCP ≤ 7000ms، TTI ≤ 9000ms، CLS ≤ 0.1، Performance ≥ 0.6 على كل URLs.
- التحويل إلى جهاز متوسط: 4503ms ÷ 4 throttle ≈ **~1125ms** main-thread work على `/ar/providers` — مرتفع لكن دون مستوى الكارثة. ضمن أهداف Phase 4 لمعالجته بـ code-splitting إضافي و `useSDUI` deferral.

**الخلاصة:** Phase 1 quick wins نجحت — `/ar/providers` كان عند 783ms TBT قبلها (دون 0.5 perf score متوقع)، الآن median 0.71. الانتقال إلى Phase 2 (Vercel preview measurement) صار مبرَّراً لأن الأرقام الحالية pessimistic بـ 20-40% مقابل الإنتاج الحقيقي.

### بعد Phase 2 + CLS fixes (2026-05-11) — أول قياس على Vercel preview بعد دمج كل CLS work

من artifact `lighthouseresults_4.zip` (CI run بعد دمج PR #378 home CLS fix). ٦ URLs × ٣ runs = ١٨ تقرير LHR كامل. المتوسط (median) لكل route:

| URL                              | Perf (median) |   LCP |       TBT |    CLS |   TTI |   FCP |     TTFB |
| -------------------------------- | ------------: | ----: | --------: | -----: | ----: | ----: | -------: |
| `/ar` → `/ar/welcome` (redirect) |      **0.80** | 3.77s |     220ms | 0.0004 | 4.91s | 1.47s | **24ms** |
| `/ar/providers` (list)           |      **0.68** | 4.87s | **414ms** |  0.011 | 6.41s | 1.47s |     24ms |
| `/ar/cart`                       |      **0.73** | 4.89s |     295ms | 0.0007 | 6.14s | 1.35s |     25ms |
| `/ar/auth/login`                 |      **0.78** | 4.70s |     161ms |      0 | 5.51s | 1.31s |     24ms |
| `/ar/custom-order`               |      **0.79** | 4.30s |     158ms |  0.003 | 6.09s | 1.34s |     24ms |
| `/ar/provider/login`             |      **0.68** | 5.23s | **358ms** | 0.0004 | 6.91s | 1.53s |     24ms |

**قراءات حاسمة (مُكرَّسة في §٠.١):**

- **CLS = 0** عملياً عبر كل routes. الـ work الجاي مش CLS.
- **TTFB = 24ms ثابت.** الـ Vercel fra1 + edge cache يعملان كما يُرجى. مفيش server-side bottleneck.
- **LCP بين 3.8s و 5.2s على كل routes** — universal bottleneck. سبب مشترك مرشّح للـ cross-cutting investigation (PR-C في §٠.٦).
- **TBT 414ms على `/ar/providers`** و 358ms على `/ar/provider/login` — JS-heavy، يستحقان شغل خاص بعد cross-cutting.
- **`/ar` يساوي welcome في الـ CI** — redirect يحجب قياس الـ home الفعلي. مذكور في §٠.٥.

### بعد دمج tasks A + B + C (2026-05-11 v2 — post PR #382)

artifact: `lighthouseresults_7.zip` (run post-merge على Vercel preview). كل URLs × 3 runs = 18 reports. المتوسط (median) لكل route مع الـ delta vs baseline أعلاه:

| URL                                     | Perf (median) | LCP (median) | Δ LCP        | TBT (median) | FCP (median) | الحالة                             |
| --------------------------------------- | ------------: | -----------: | ------------ | -----------: | -----------: | ---------------------------------- |
| `/ar/providers` (list)                  |          0.72 |        4.66s | −210ms       |        333ms |        1.65s | ✓ تحسّن طفيف                       |
| `/ar/providers/ad52ece8-...` **(جديد)** |          0.65 |        5.58s | baseline P1  |        305ms |        1.71s | ⚠ أعلى LCP — مرشح لـ Task D التالي |
| `/ar/cart`                              |          0.76 |        3.83s | **−1.06s ✓** |        358ms |        1.33s | ✓ task C win                       |
| `/ar/auth/login`                        |          0.83 |        3.66s | **−1.04s ✓** |        210ms |        1.41s | ✓ task C win — أعلى perf           |
| `/ar/custom-order`                      |          0.84 |        3.27s | **−1.03s ✓** |        233ms |        1.02s | ✓ task C win — أكبر تحسين          |
| `/ar/provider/login`                    |          0.66 |        4.24s | **−985ms ✓** |        558ms |        1.39s | ✓ LCP ينزل لكن TBT variance عالية  |

**التحليل:**

- **Task C font preload removal اشتغلت** ✓ — LCP −1.0s على 4/5 routes كانت في الأصل تـ download 310KB من font preloads. الـ hypothesis (bandwidth contention في الـ critical path) كانت صحيحة.
- **`/ar/providers/{id}` LCP 5.58s هو الأعلى دلوقتي** — كان يُتوقع لأن الـ page بتحمّل cover image كبيرة + provider data. مرشح أساسي لـ Task D (بعد B-bis لو user approves) أو task جديد لو D blocked.
- **`/ar/provider/login` TBT 558ms** — أعلى TBT بين كل routes. مرشح لـ task مستقل لاحقاً.
- **`/ar/custom-order` perf 0.84 + FCP 1.02s + LCP 3.27s** — أصبح أفضل route. ممكن يكون reference للـ "ما يجب أن يكون عليه" home بعد B-bis.

**CI status post-merge:** نجح بدون error-level failures. warnings فقط: `color-contrast` على provider-detail (متوقع، task C-bis يعالجه) و `mainthread-work-breakdown` على provider-detail (4.5s med، above 4s warn threshold).

### بعد المرحلة ٢

_legacy section — تم استبداله بالـ tables أعلاه_

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
- **اكتشاف 2026-05-10 (Phase 2 first run):** بعد تحويل القياس إلى Vercel preview، الـ assertion `categories:seo` فشل deterministically على `/ar` (welcome) بقيمة 0.58 / 0.58 / 0.58 (العتبة ≥ 0.6). السبب: Vercel preview deployments بترسل `x-robots-tag: noindex` افتراضياً من الـ edge عشان الـ previews ما تُفهرسش — وده platform behavior مش كودنا. Lighthouse `is-crawlable` audit بتخصم ~12 نقطة من الـ SEO category بسببه. **عُولج:** `skipAudits: ['is-crawlable']` يُطبَّق فقط لما `LHCI_TARGET_URL` set في `lighthouserc.js`، فيتنظَّف الـ noise بدون لمس عتبة 0.6 (يحافظ على مبدأ §1: "threshold يُحسَّن لا يُرفع"). الـ audit يفضل شغّال على `npm run lighthouse` المحلي.
- **متابعة Phase 2 (gap closure):** الـ skip للـ `is-crawlable` يفتح blind spot صغير: لو `<meta name="robots" content="noindex">` ضاف بالغلط في source، preview CI مش هيمسكه. مغطّى مؤقتاً بـ `scripts/check-noindex.sh` (يجري في CI lint job ضمن `.github/workflows/ci.yml`) — بـ allowlist لـ `src/app/[locale]/auth/layout.tsx` (auth pages noindex مقصود). الحل النهائي: production Lighthouse workflow يقيس `www.engezna.com` بعد deploy إلى main، يعيد فيه `is-crawlable` كـ assertion حقيقية، وعندها يُحذَف الـ guardrail script. مدرَج كـ Phase 2.x مستقبلية.
- **متابعة:** `manifest.json` يحوي Performance category scores فقط؛ `assertion-results.json` يحوي الـ assertions الفاشلة فقط (مع numericValues). لذلك TBT/LCP/TTI الناجحة لـ `/ar/providers` غير متاحة من أي منهما. **المصدر الوحيد** هو الـ representative LHR: `ar_providers-2026_05_09_10_14_17-report.json` — يحوي `audits["total-blocking-time"].numericValue` و `audits["largest-contentful-paint"].numericValue` و `audits.interactive.numericValue` بالأرقام الكاملة.
- **متابعة عملية (Prettier + Husky):** الـ pre-commit hook (`.husky/pre-commit` → `npx lint-staged`) يُشغّل `prettier --write` على ملفات `.md` تلقائياً، لكن الـ Claude Code agent sessions أحياناً تتجاوز الـ husky hooks. **القاعدة:** قبل أي commit يدوي على markdown، شغّل `npm run format:check` محلياً. CI يُشغّل `npm run format:check` في `.github/workflows/ci.yml` (Lint & Type Check job)، فشل عنده يبقى صريح.
- **اكتشاف 2026-05-10 (DevTools live على /ar):** CLS = 0.48 على home — السبب الجذري كان `DeliveryModeSelector` skeleton (~84px) ≠ loaded state (~160px) فالـ section كله ينحت بعد hydration. **عُولج في PR #378:** skeleton يـ mirror الـ default loaded structure (toggle + address row).
- **اكتشاف 2026-05-10 (DevTools live على /ar/providers/{id}):** CLS = 0.84 على providers مع `operation_mode='custom'/'hybrid'` فقط (CLS = 0 على providers بدونه). السبب الجذري: `CustomOrderWelcomeBanner` كان يـ animate `height: 0 → auto` عبر Framer Motion على mount → relayout كامل. **عُولج في الـ PR الحالي** (commits `e546cf6` + `94ce74d`).
- **اكتشاف 2026-05-10 (Lighthouse على نفس الصفحة):** بعد إصلاح CLS، LCP = 5.3s مع element render delay = 1.44s، والـ LCP element كان `<p>` نص الـ banner. السبب: الـ `motion.div` لسه عنده `opacity: 0 → 1` "for polish" — Lighthouse ما يعتبرش العنصر painted لما opacity = 0. الـ chain (HTML → JS → hydrate → Framer mount → animation) أضاف 1.4s. **عُولج في الـ PR الحالي** (commit `6e04b64`): replace outer `motion.div` بـ plain `div`. Inner expandable region لسه motion (user-triggered animations لا تحسب في CLS).
- **اكتشاف 2026-05-11 (artifact analysis):** TTFB ثابت عند 24ms عبر كل routes — Vercel fra1 + edge cache يعملان. **TTFB ليس مشكلة.** كل اشتباه سابق فيه مغلوط. وLCP بين 3.8-5.2s على كل routes = universal cause. مرشّح للـ cross-cutting PR (PR-C في §٠.٦) قبل أي route-specific work.
- **متابعة 2026-05-11 (measurement gap — لسه مفتوحة، مؤجَّلة في B-bis):** الـ home `/ar` gated بـ guard مزدوج (middleware cookie + client localStorage). جربنا cookie-only injection (task B) لكن المراجع كشف أن `HomePageClient.tsx:163-178` يـ check localStorage بغض النظر عن الكوكي → redirect-to-welcome post-hydration. الـ fix الصحيح: Puppeteer setup script يـ seed localStorage. الـ script جاهز في `scripts/lhci-home-setup.js` لكن `puppeteerScript` يحتاج `puppeteer` كـ devDep ثقيل (~300MB local install + Chromium download في CI). **اكتشف بعد محاولة CI run** أن `puppeteerScript` يفشل بـ "Chrome installation not found / path argument must be of type string" لما puppeteer مش مثبّت — الـ healthcheck يفشل قبل ما lighthouse يبدأ. لذلك revert في الـ PR الحالي: `puppeteerScript` removed، `/ar` لم يُضف للـ URL list، الـ script file يفضل في git للاستخدام لو user approve devDep في PR منفصل (task B-bis).
- **`/ar/providers/{id}` ✅ مغطّى في task B:** إضافة URL ثابتة لـ `ad52ece8-69c0-4f46-918e-1fbba73655cd` (مطعم الصفا، `operation_mode='custom'`) يقيس P1 + يحرس CLS/LCP regression من PR #381.
- **اكتشاف 2026-05-11 (task C — cross-cutting LCP):** الـ artifact كشف أن LCP بين 4-5s على كل الـ routes رغم أن TTFB 24ms / FCP 1.4s / CLS 0. السبب الجذري ليس server-side — هو bandwidth contention على الـ critical request path. next/font/local كان preload لـ 8 woff2 files (~310KB) على priority High بسبب `preload: true` على كل من Noto Sans + Noto Sans Arabic بكل الأوزان (400/500/600/700). مع `display: swap` فالـ LCP يفير على fallback paint، فالـ preload يكلّف bandwidth بدون فائدة LCP-defining. **عُولج في الـ PR الحالي:** `preload: false` على كلتا الـ font families الرئيسية في `src/lib/fonts/index.ts`. الـ web fonts تـ load on-demand لما الـ CSS تـ reference @font-face، ثم تـ swap للنص. التحقق من الـ hypothesis ينتظر CI artifact ثاني بعد merge. **لو الـ artifact يظهر LCP regression** (مثلاً LCP زاد لأن الـ web font swap حصل قبل LCP candidate paint): revert + جرّب preload على Noto Sans Arabic فقط (الأكبر بايتاً) — مدوَّن صراحة في تعليقات `src/lib/fonts/index.ts`.

- **اكتشاف 2026-05-11 (preflight defense):** الـ hardcoded provider id في `lighthouserc.js` (`ad52ece8-69c0-4f46-918e-1fbba73655cd`) لو deactivate، الـ Lighthouse يقيس صفحة 404 أو redirect target بصمت — assertion-results يبدو غريباً لكن لا يُفسَّر للمراجع. **عُولج في الـ PR الحالي:** preflight step في `.github/workflows/lighthouse.yml` يعمل GET request (الـ default، بدون `--head`) على `${LHCI_TARGET_URL}/ar/providers/${HARDCODED_PROVIDER_ID}` قبل lhci، و **يعتبر أي status غير 2xx** (يشمل 3xx redirects و 4xx/5xx errors) فشلاً واضحاً. تم حذف `curl -L` بحيث 3xx ما تـ follow وما تـ mask deactivation behind redirect لقائمة الـ providers. الـ id مستخرَج إلى `HARDCODED_PROVIDER_ID` constant + exported من الـ config عشان الـ preflight يقرأه عبر `require('./lighthouserc.js').HARDCODED_PROVIDER_ID` بدون duplication.
- **متابعة 2026-05-11 (authenticated routes deferred):** task B الأصلية شملت `/provider/orders` لكن الـ dashboard requires Supabase auth session — يحتاج Puppeteer script يسجّل دخول قبل lighthouse. مؤجَّل لـ Phase 2.4 (موجود في §٦ original). الـ public routes كافية لـ tasks C-E.

- **اكتشاف 2026-05-11 (provider-detail accessibility revealed):** بإضافة `/ar/providers/{id}` للـ CI URL list (task B)، lighthouse فعلياً قاس accessibility لأول مرة على هذه الصفحة وكشف فشل: `color-contrast = 0` بسبب `text-slate-400` على white (~3.2:1 vs WCAG AA 4.5:1) + `text-primary font-bold` على الأسعار، و `categories:accessibility = 0.83 < 0.9`. **الـ issue موجود قبل هذا الـ PR** — مجرد أنه ما كان يُقاس. هذه الـ tokens shared عبر شاشات كثيرة فالإصلاح يحتاج designer pass. **عُولج مؤقتاً في الـ PR الحالي:** assertMatrix يـ override الـ assertions للـ provider-detail URL (color-contrast: warn، categories:accessibility: 0.8) مع TODO صريح. الـ task C-bis في §٠.٦ يلتقط الإصلاح الصحيح وحذف الـ override.
- **اكتشاف 2026-05-11 (assertMatrix override didn't apply):** بعد إضافة assertMatrix override للـ provider-detail URL لتخفيف accessibility threshold، الـ CI لسه يفشل بـ `expected: 0.9` (الـ catch-all). السبب من `node_modules/@lhci/utils/src/assertions.js:473-475`: lhci يـ iterate **كل entries** في الـ matrix لكل URL، فالـ catch-all `.*` كان يتنفّذ على provider-detail URL بالإضافة إلى الـ override، و الـ strict assertion كانت تفشل. **عُولج:** الـ catch-all دلوقتي بيستخدم negative lookahead يستثني UUID pattern: `'^(?!.*/ar/providers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}).*$'`. النتيجة: provider-detail يقابل الـ override فقط، باقي URLs تقابل الـ catch-all (الـ strict) فقط.

- **اكتشاف 2026-05-11 (C-bis applied):** بعد إضافة `/ar/providers/{id}` في task B، lighthouse كشف 11 contrast failures على نفس الـ patterns: `text-sm text-slate-400` (review/category counts) و `<p class="text-sm font-bold text-primary">` (menu item prices). تم حسابهم:
  - `#94a3b8` (slate-400) على white = 3.18:1 → فاشل WCAG AA (4.5:1 needed)
  - `#009DE0` (primary، Engezna Blue) على white = 3.28:1 → فاشل WCAG AA
  - **عُولج في الـ PR الحالي:** 10 className changes في `src/app/[locale]/providers/[id]/ProviderDetailClient.tsx` فقط — `text-slate-400` → `text-slate-500` (#64748b، 4.61:1) و `text-primary` → `text-primary-dark` (#0079AD، 5.27:1) على text elements. الـ icons تركت كما هي لأن color-contrast audit يستثني SVG icons. كذلك حُذف `assertMatrix` من `lighthouserc.js` ورجع لـ flat `assertions:` object — الـ strict 0.9 a11y threshold يـ apply على كل URLs دلوقتي.
- **اكتشاف 2026-05-11 (C-bis مكتمل — Codex catch):** أول CI run بعد C-bis لسه فشل بـ 9 color-contrast failures على provider-detail. الفحص كشف إن الـ provider-detail page يـ render قائمة الـ menu items عبر **`ProductCard.tsx`** (shared component، imported من `ProviderDetailClient.tsx:1016-1025` كـ dynamic import)، و `ProductCard` نفسه كان لسه يستخدم `text-primary` للأسعار + variants و `text-slate-400` للـ strikethrough original prices. الـ component shared بين provider list و provider detail و لاحقاً المفضلة و carts. **عُولج بـ commit متابع في نفس الـ PR:** 10 className changes في `src/components/customer/shared/ProductCard.tsx` — 7 `text-primary` → `text-primary-dark` على text (prices، variant labels) + 3 `text-slate-400` → `text-slate-500` على strikethrough. الـ icons + hover states + decorative borders تركت. **درس عام:** عند fix tokens على page، تتبَّع كل shared component يـ render من الـ page tree — Lighthouse audit يفحص الـ DOM النهائي، مش source files.

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
