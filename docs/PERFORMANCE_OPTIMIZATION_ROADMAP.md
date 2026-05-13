# خارطة طريق تحسين أداء إنجزنا

> **هذه خطة حية تقود الـ AI agent والـ humans معاً.** كل قرار "أيهم نعمل بعدين؟" أو "أيهم الأولوية؟" إجابته في هذا الملف. لو ما لقيتش الإجابة هنا، الإجابة تُضاف هنا قبل التنفيذ.
>
> أي تنفيذ لمهمة هنا يجب أن يقترن بتحديث:
>
> 1. حالة الـ task في الجدول الموافق (✅ / 🔄 / ⬜).
> 2. القياسات الفعلية بعد التنفيذ في القسم ٧ (سجل القياسات).
> 3. أي اكتشاف جديد يُضاف كـ "متابعة" في القسم ٨.
> 4. تحديث جدول §٠.٢ (الأولويات) لو الـ ranking اتغيّر.

> فرع التنفيذ الحالي للأداء: `claude/perf-css-render-blocking` (Revert C-ter بعد Codex catch ثاني — `inlineCss` يـ inline ALL CSS مش critical، يكسر caching). B-bis merged في main.
> آخر تحديث: 2026-05-12 — Tasks A/B/C/B-bis/C-bis/D/E + Task F revert ✅ merged. **Artifact #23 (post revert)**: 4/8 routes at 🥇 (auth/login 0.95، cart 0.93، welcome 0.92، provider/login 0.94) + 2 borderline 🥇 (/ar 0.85 لكن TTI 6073، /ar/custom-order 0.83 لكن LCP 4610) + 2 🥈 (/ar/providers 0.79، /ar/providers/<id> 0.76). Task F (الـ new، مش الـ reverted) قيد التنفيذ على `claude/perf-provider-card-lcp`: إضافة `priority` لأول 2 provider card images (LCP image على /ar/providers بـ 58% load-delay). C-ter REVERTED. render-blocking warn يبقى deferred.

---

## ٠. الحالة العاملة الحالية (data-driven — يُقرأ أولاً)

> هذا هو **مصدر الحقيقة التشغيلي**. لو في تعارض بين هذا القسم وأي قسم تاني تحت، هذا يفوز.

### ٠.١ ما تم حسمه نهائياً (أزل من قائمة القلق)

| الموضوع                                                | الحالة                                                                                                                                                                                                                          | الدليل                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **CLS على كل routes (ما عدا `/ar`)**                   | ✅ تحت 0.012 على الست routes الأصلية في الـ CI artifact                                                                                                                                                                         | `manifest.json` + per-route LHR (مايو 11)              |
| **TTFB**                                               | ✅ 24ms ثابت عبر كل routes (Vercel fra1 + edge cache يعملان)                                                                                                                                                                    | LHR `server-response-time.numericValue ≈ 24` في كل ملف |
| **الـ CLS على home (`/ar`)**                           | ✅ Task D معالج (PR #387، 5 commits، artifact #20): CLS 0.463 → **0.055** بعد align skeleton DOM مع real (OffersCarousel `section.children[1] = div.relative` في الحالتين) + إزالة outer skeleton + spinner branch + web splash | artifact_20.zip + §٧ "بعد Task D"                      |
| **الـ CLS على provider detail (`/ar/providers/{id}`)** | ✅ Banner `height: 0 → auto` removed — DevTools live CLS = 0 (مطعم الصفا، كان 0.84)                                                                                                                                             | PR #381                                                |
| **الـ LCP المتأخّر بالـ banner opacity animation**     | ✅ Banner opacity animation removed — كان يُضيف 1.4s render delay على LCP element                                                                                                                                               | الـ PR الحالي commit `6e04b64`                         |
| **CI Lighthouse على Vercel preview**                   | ✅ Phase 2 يعمل — artifacts كاملة تتولّد على كل deployment_status                                                                                                                                                               | PR #377 + الـ artifact الحالي                          |
| **SEO false-fail من preview noindex**                  | ✅ `skipAudits: ['is-crawlable']` على preview + guardrail script في `scripts/check-noindex.sh`                                                                                                                                  | PR #377                                                |
| **LCP universal bottleneck (font preload bandwidth)**  | ✅ Task C font preload removal validated by post-merge artifact — LCP −1.0s على 4 routes (cart / auth / custom-order / provider-login)، perf +3–5 pts                                                                           | artifact 2026-05-11 (post PR #382) في §٧               |

**الخلاصة:** بعد دمج PR #387 (Task D)، الـ CLS لم يعد هدفاً نشطاً على أي route — كل الـ routes تحت 0.1 (الست الأصلية تحت 0.012، `/ar` عند 0.055). الـ TTFB ثابت 24ms. كل التحسين الجاي يستهدف **LCP و TBT و JS bundle size** على الـ routes اللي لسه فوق الـ targets (راجع §٠.٢ للترتيب الحالي).

### ٠.٢ الأولوية الحالية (impact-ranked) — يُتبَع بالترتيب بدون سؤال

الـ Impact = `(100 - real_user_RES) × samples` من Vercel Speed Insights (real-user data، آخر ٧ أيام). الترتيب يُعاد حسابه لما البيانات تتغيّر.

| #      | Route                                  | Field RES   | Samples | Impact   | Lab Perf (CI)              | حالة                                          | ملاحظة                                                                                                                                                                                                    |
| ------ | -------------------------------------- | ----------- | ------- | -------- | -------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | `/ar` (الـ home الفعلي بعد location)   | **47 POOR** | 44      | **2332** | infra ready، يحتاج secrets | ⏳ blocked على real-IDs config                | B-bis merge يضع البنية. الـ measurement الفعلي يحتاج user يضبط `LHCI_SEED_GOVERNORATE_ID` (+ optionally `LHCI_SEED_CITY_ID`) كـ GitHub Secrets — UUIDs لـ governorate/city موجودين في الـ providers table |
| **P1** | `/ar/providers/{id}` (provider detail) | 78          | 47      | 1034     | **0.65 lab (median)**      | 🔄 a11y fixed in current PR، LCP 5.58s queued | tokens fixed → strict assertions تُطبَّق. LCP 5.58s median لسه أعلى من باقي routes — مرشح لـ task جديد بعد B-bis                                                                                          |
| **P2** | `/ar/auth/login`                       | **44 POOR** | 16      | 896      | 0.78 lab                   | ⬜                                            | lab أفضل من field — مرشح لـ JS-heavy hydration                                                                                                                                                            |
| **P3** | `/ar/welcome`                          | 84          | 22      | 352      | **0.80 lab**               | ✅ مقبول                                      | لا يستحق work الآن — مراقبة فقط                                                                                                                                                                           |
| **P4** | `/ar/admin/log...`                     | 64          | 10      | 360      | غير مقاس                   | ⬜                                            | Admin route — أولوية أقل                                                                                                                                                                                  |
| **P5** | `/ar/admin`                            | 59          | 5       | 205      | غير مقاس                   | ⬜                                            | Admin — لاحقاً                                                                                                                                                                                            |

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

- **`/ar` redirect — ✅ مغلق في task B-bis (الـ PR الحالي):** الـ home gated بـ guard مزدوج (middleware cookie + client localStorage)، عُولج كاملاً بـ:
  - `extraHeaders: { Cookie: 'engezna_has_location=1' }` يمرر الـ server gate.
  - `puppeteerScript: './scripts/lhci-home-setup.js'` يـ seed `engezna_guest_location` في localStorage قبل كل audit — يمرر الـ client gate.
  - `puppeteer` v24 مُثبَّت كـ devDep في `package.json`؛ الـ postinstall يـ download Chromium (~276MB) إلى `~/.cache/puppeteer/`.
  - `/ar` رجع للـ `lighthouserc.js` URL list.
  - **النتيجة:** أول CI run بعد merge يجب أن يقيس home الحقيقي، فينفتح task D (P0 home perf fix).
- **Provider detail مُغطَّى ✅** بـ `/ar/providers/{stable-id}` (task B الحالية).
- **Dashboards (admin، provider)**: مؤجَّلة لـ task يتطلب Puppeteer login session — Phase 2.4 في الـ legacy plan.

### ٠.٦ المهام الفعلية المُجدولة بالترتيب

| Order     | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | PR Branch                             | Owner Action                                | Blocker                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| **A**     | merge الـ PR الحالي (CLS + LCP banner)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `claude/perf-provider-detail-page`    | ✅ merged PR #381                           | جاهز                                     |
| **B**     | إضافة provider-detail URL + cookie injection + preflight + assertMatrix override (ثم أُزيل في C-bis)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `claude/perf-add-routes-ci`           | ✅ merged PR #382                           | —                                        |
| **B-bis** | Infrastructure: puppeteer devDep + lhci-home-setup.js seeds localStorage + workflow Chromium cache + env-driven seed gate + UUID validation. الـ home measurement يحتاج user يضبط real UUIDs في GitHub Secrets                                                                                                                                                                                                                                                                                                                                                                                                                                        | `claude/perf-puppeteer-home-setup`    | ✅ merged PR #384                           | B merged ✓ + user-supplied real UUIDs    |
| **C**     | Drop font preload (8 weights → 0) لتخفيف ~310KB من critical path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `claude/perf-add-routes-ci`           | ✅ merged PR #382 — LCP −1.0s مُحقَّق       | —                                        |
| **C-bis** | Fix provider-detail a11y tokens (slate-400→slate-500، primary→primary-dark) + ProductCard + heading-order + button/link names + remove assertMatrix override                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `claude/perf-validate-roadmap-update` | ✅ merged PR #383 — a11y = 1.0 على 5 routes | C merged ✓                               |
| **D**     | P0 home CLS: 5 commits على PR #387 — حذف الـ outer skeleton + حذف الـ spinner branch (Codex catch) + BannerCard motion.div→div + web splash disabled على web + **align OffersCarousel skeleton DOM مع real** (root cause الفعلي: Lighthouse layout-shifts يـ match elements بـ DOM path index لا class names). artifact #20 أكّد: CLS 0.463 → **0.055** ✓، perf 0.46 → **0.74** ✓ على `/ar`. تفاصيل في §٧ "بعد Task D"                                                                                                                                                                                                                                | `claude/perf-home-cls`                | ✅ merged PR #387                           | B-bis merged ✓ + real seed secrets set ✓ |
| **E**     | Cross-cutting LCP: `EngeznaLogo` في `CustomerHeader.tsx:299` كان يستخدم الـ default branch بدون `static` prop. الـ default يـ render `::after` overlay يـ animate `transform: translateX` reveal لمدة 1.8s — يخفي الـ logo نص للـ Lighthouse فـ LCP finalization يتأخر 2.7-3.7s (85% من LCP) على `/ar`. الـ static branch يـ render plain `<span>` بدون animation. تأثير cross-cutting لأن الـ CustomerHeader يـ render على كل routes الـ customer                                                                                                                                                                                                    | `claude/perf-logo-lcp`                | ✅ merged PR #388                           | D merged ✓                               |
| **F**     | `/ar/providers` LCP image priority: artifact #23 كشف أن الـ LCP element هو الـ provider card logo image (`img.object-contain` داخل `card-product`) مع load-delay 3197ms (58% من LCP 5488ms). الـ ProviderCard كان يستخدم `loading="lazy"` على كل الـ images بما فيها الأولى اللي above-the-fold. **Fix:** إضافة `isPriority` prop على ProviderCard، الـ ProvidersClient يمرّر `isPriority={index < 2}` لأول cardين (single-column mobile = card #0 above fold، md+ = grid 2 cols = cards 0+1 above fold). أول 2 cards تستخدم `priority` بدلاً من `loading="lazy"`، الباقي يفضل lazy. تأثير متوقع على `/ar/providers` فقط (perf 0.79 → ≥0.80 لدخول 🥇) | `claude/perf-provider-card-lcp`       | PR                                          | E merged ✓                               |

**ملاحظة على Task F (Removed لكن موثَّق):** `Task F` (preload Aref Ruqaa لمعالجة logo LCP swap delay) كان في الجدول قبل، حُذف هنا بحسب بروتوكول §9 رقم 4 ("لو الـ task أُلغي أو تأجَّل: احذفه من الجدول واكتب السبب في §٨"). الـ root cause (Codex catch موثَّق + artifact #22 regression data): الـ `arefRuqaa.variable` مطبَّق على `<body>` في root layout، فالـ `preload: true` يـ emit preload tag على كل routes — مش بس اللي عليها logo above-the-fold. الـ 45kb extra على critical path أعاد إنتاج الـ bandwidth contention اللي Task C شالها. كامل التفاصيل (الـ regression numbers على 3 routes، Next.js static preload emission behavior، الـ proper structural fix) في §٨. لو أعيد فتح: lazy `arefRuqaa.variable` على auth/welcome layouts فقط، مش root.

**ملاحظة على C-ter (removed لكن موثَّق):** `C-ter` (render-blocking CSS via experimental flags) كان في الجدول قبل، حُذف هنا بحسب بروتوكول §9 رقم 4 ("لو الـ task أُلغي أو تأجَّل: احذفه من الجدول واكتب السبب في §٨"). كامل التفاصيل (Codex catch #1 على `optimizeCss`، Codex catch #2 على `inlineCss`، قرار الـ revert) في §٨. PR #386 = الـ revert. أي إعادة فتح لاحقاً يجب أن يبدأ كـ task جديد في §٠.٦ مع hypothesis مختلف عن flag-based extraction.

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

### ٣.١ checklist تقدّم الأهداف (post Task E، artifact #21 — 2026-05-12)

تقييم كل route على CI مقابل عتبات الـ 3 طبقات. الـ data من lab median (3 runs لكل route، Vercel preview، 4x CPU throttle، formFactor mobile).

#### حالة كل route per metric

| URL                  | Perf |   CLS |    LCP |   TBT |    TTI |           Tier           |
| -------------------- | ---: | ----: | -----: | ----: | -----: | :----------------------: |
| `/ar/auth/login`     | 0.93 | 0.000 | 2363ms | 246ms | 3957ms |          **🥇**          |
| `/ar/cart`           | 0.91 | 0.000 | 2720ms | 218ms | 4634ms |          **🥇**          |
| `/ar/welcome`        | 0.87 | 0.003 | 2913ms | 180ms | 4316ms |        **🥇 ✨**         |
| `/ar/provider/login` | 0.82 | 0.000 | 3019ms | 455ms | 5255ms |        **🥇 ✨**         |
| `/ar/custom-order`   | 0.80 | 0.001 | 4145ms | 277ms | 4145ms | borderline 🥇 (LCP +145) |
| `/ar`                | 0.76 | 0.055 | 4075ms | 513ms | 5064ms |            🥈            |
| `/ar/providers`      | 0.74 | 0.000 | 4602ms | 356ms | 4625ms |            🥈            |
| `/ar/providers/<id>` | 0.74 | 0.001 | 4975ms | 319ms | 5523ms |            🥈            |

> 🥇 = كل المعايير الأربعة (Perf ≥ 0.8، LCP ≤ 4s، TBT ≤ 600ms، TTI ≤ 6s) متحقّقة | 🥈 = TBT ≤ 700ms + Perf ≥ 0.6 + باقي المتركس داخل العتبات | 🥉 = الحد الأدنى فقط

#### الحالة الكلية

| الطبقة                     | الـ routes الناجحة                                                         | عدد     |
| -------------------------- | -------------------------------------------------------------------------- | ------- |
| 🥇 جودة عالية (الهدف)      | `/ar/auth/login` + `/ar/cart` + `/ar/welcome` ✨ + `/ar/provider/login` ✨ | **4/8** |
| 🥇 borderline              | `/ar/custom-order` (perf 0.80 ✓ لكن LCP 4145 > 4000 بـ 145ms)              | 1/8     |
| 🥈 مقبول                   | `/ar`، `/ar/providers`، `/ar/providers/<id>`                               | 3/8     |
| 🥉 حد أدنى (لا regression) | كل الـ 8 routes (TBT ≤ 900 ✓، CLS ≤ 0.1 ✓ على الكل)                        | 8/8     |

#### ما تم إنجازه

- ✅ **CLS أُحلَّ بالكامل** (Task D): 8/8 routes تحت 0.1. أعلى قيمة `/ar` = 0.055.
- ✅ **TBT تحت 600ms على 8/8 routes**: كل الـ routes داخل عتبة 🥇 على TBT.
- ✅ **4 routes في 🥇 كاملة** (كان 2 قبل Task E): `/ar/auth/login`، `/ar/cart`، `/ar/welcome` ✨، `/ar/provider/login` ✨.
- ✅ **CI assertions تمرّ بدون errors** على artifact #20 (Task D) و artifact #21 (Task E).
- ✅ **مفيش route تحت الـ 🥉**: كل الـ 8 routes فوق الحد الأدنى.
- ✅ **Cross-cutting LCP win عبر Task E**: `EngeznaLogo` reveal animation removal أحرز +0.16 على `/ar/welcome` و دفعت 2 routes جديدة لـ 🥇.

#### الفجوة للوصول إلى 🥇 لكل routes

| الـ route            | المتركس الناقصة عن 🥇                 | الـ root cause المحتمل                                                                                   |
| -------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/ar/custom-order`   | LCP 4145ms (يحتاج ≤4000) — borderline | قريب جداً من 🥇 — single tweak على LCP element كافٍ                                                      |
| `/ar`                | Perf 0.76، LCP 4075ms (75ms over)     | الـ home بيـ render 7 sections؛ بعد ما الـ logo اتحلّ، الـ banner أو DeliveryModeSelector لسه bottleneck |
| `/ar/providers`      | Perf 0.74، LCP 4602ms                 | render-blocking CSS warn (728ms) + list rendering                                                        |
| `/ar/providers/<id>` | Perf 0.74، LCP 4975ms، TTI 5523ms     | banner welcome text لسه LCP element بـ render delay كبير — يحتاج SSR-first بدلاً من client-render        |

#### المتبقي في الـ Roadmap

- **render-blocking CSS** (4 routes warn-level 545-733ms): structural fix مؤجَّل — راجع §٨ "C-ter REVERTED". الـ pure-CSS subset extraction خارج capability الـ Next.js App Router حالياً.
- **`/ar/custom-order` LCP من 4145 إلى ≤4000**: قريب من 🥇، أصغر فجوة.
- **`/ar` Performance من 0.76 إلى 0.80+**: يحتاج LCP element optimization (الـ logo اتحلّ، الـ next bottleneck غالباً OffersCarousel banner أو DeliveryModeSelector).
- **`/ar/providers/<id>` Performance من 0.74 إلى 0.80+**: الـ CustomOrderWelcomeBanner text لسه LCP element مع render delay كبير. يحتاج SSR الـ banner من server component بدلاً من client-only mount.
- **`/ar/providers` Performance من 0.74 إلى 0.80+**: similar pattern للـ providers/<id> — list rendering ثقيل.

#### Cross-cutting follow-ups (مدرجة في §٨)

- web splash اتشال خلال Task D — استرجاعها للـ native بس مش web (مرّ في commit 4).
- render-blocking CSS structural fix (deferred من C-ter).
- puppeteer seed reliability (1/3 runs أحياناً redirects لـ /welcome).
- earlyRedirectDone edge case (CodeRabbit — pre-existing، not regressed by Task D).

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

### بعد تفعيل seeds + B-bis (2026-05-12) — أول قياس فعلي للـ `/ar` (P0 home)

artifact: `lighthouseresults_15.zip` (CI run #230 على Vercel preview، بعد user ضبط `LHCI_SEED_GOVERNORATE_ID` + `LHCI_SEED_CITY_ID` في GitHub Secrets). 7 URLs × 3 runs = 21 reports. أول مرة `/ar` يتقاس فعلياً مع providers مَلْيَى.

| URL                  | Perf (median) | CLS (median) | TBT (median) | الحالة                                                                         |
| -------------------- | ------------: | -----------: | -----------: | ------------------------------------------------------------------------------ |
| `/ar` **(جديد، P0)** |      **0.46** |    **0.463** |      ~700ms+ | 🔴 CLS كارثي + perf تحت العتبة                                                 |
| `/ar/providers`      |          0.71 |           ~0 |         ~300 | ✓ يمر                                                                          |
| `/ar/providers/<id>` |          0.59 |           ~0 |         ~300 | ⚠ perf تحت 0.6 بـ 0.01 — follow-up منفصل (Task E هو `/ar/auth/login` per §0.6) |
| `/ar/cart`           |          0.75 |           ~0 |         ~250 | ✓                                                                              |
| `/ar/auth/login`     |          0.79 |           ~0 |         ~200 | ✓                                                                              |
| `/ar/custom-order`   |          0.85 |           ~0 |         ~150 | ✓                                                                              |
| `/ar/provider/login` |          0.66 |           ~0 |         ~450 | ✓                                                                              |

**ملاحظة منهجية:** أول run من 3 لـ `/ar` ظهر بـ `finalUrl = /ar/welcome` (redirect حصل قبل ما الـ localStorage seed يستقر). الـ runs الثانية والثالثة استقرت على `/ar`. الـ assertion-results يجمع الـ failed run تحت `/ar/welcome` URL منفصل. مشكلة موثوقية ثانوية في الـ puppeteerScript — مدوَّنة كـ follow-up في §٨.

**تشخيص CLS على `/ar` (من `audits['layout-shifts']`):**

| Element (selector)                                                                | CLS score | السبب                                                                                                                                                        |
| --------------------------------------------------------------------------------- | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `div.pb-4 > div.min-h-[220px] > section.bg-white > div.relative` (OffersCarousel) |     0.319 | skeleton له `px-4 py-6` (سطر 522)، real wrapper مالوش padding (سطر 576) → structures مختلفة                                                                  |
| `div.pb-4 > div.min-h-[180px]` (CategoriesSection)                                |     0.140 | reservation = 180px، actual rendered = **320px** (height overflow بـ 140px). كذلك skeleton `grid-cols-4` vs real `grid-cols-3 sm:grid-cols-6` — grids مختلفة |
| (نفس categories، tail effect)                                                     |     0.002 | shift ثانوي بعد load                                                                                                                                         |
| **Sum**                                                                           | **0.461** | matches الـ reported CLS                                                                                                                                     |

**Root cause:** عندنا **3-state transition** على `/ar`:

1. `HomePageClient` outer skeleton (سطور 510-540) لما `isLoading=true`
2. Skeleton الداخلي لكل section component (مثلاً `CategoriesSection.tsx:82-93`) لما الـ data بتجيب
3. Real content

كل transition بيـ shift layout لأن الـ DOM structures الثلاثة مختلفة. الـ outer skeleton أساساً anti-pattern — كل section عنده internal skeleton يطابق الـ real layout الخاص بيه، فالـ outer skeleton duplicate يـ ship dimensions غلط.

**Task D plan (PR #387، small surface):**

1. حذف الـ `if (isLoading) return (...)` block (الـ outer skeleton القديم) من `HomePageClient.tsx` بالكامل — كانت بنيته (`grid-cols-4` للـ categories + `px-4 py-6` للـ offers) لا تطابق لا الـ real components ولا internal skeletons المنفصلة.
2. **Codex catch (post-deploy):** حذف الـ `!userLocation.governorateId` early-return اللي كان يـ render `<div className="min-h-screen flex items-center justify-center"><Loader2/></div>`. `UserLocationContext` بيـ initialize `governorateId` بـ null ويـ populate async بعد `isDataLoaded` + Supabase auth/profile fetch، فالـ branch كان يـ fire خلال الـ hydration window على returning users، فالـ next render يقفز من `min-h-screen` spinner إلى الـ home layout الفعلي — CLS regression جديد في نفس المسار اللي بنحاول نعالجه. الـ `earlyRedirectDone` lazy initializer (line 163) already returns null synchronously للـ users بدون guest location، فالـ spinner لم يكن يخدم حالة حقيقية للـ no-location users — كان يخدم بس الـ hydration window للـ returning users، وده exactly اللي يجب أن يـ render في place بـ internal skeletons. الـ fallback redirect useEffect (lines 197-220) يحرس الـ edge case (location لسه null بعد ما الـ data loads).
3. تحديث الـ wrapper reservations في `renderSection()` لتطابق الـ heights الفعلية المقيسة:
   - offers: `min-h-[220px] md:min-h-[280px]` → `min-h-[320px] md:min-h-[280px]` (real على mobile = section py-6 + header + card aspect-16/9 + dots ≈ 320px)
   - categories: `min-h-[180px]` → `min-h-[320px] sm:min-h-[200px]` (real على mobile = 2 rows `grid-cols-3` × 100px + py-6 + header ≈ 320px؛ على `sm:` الـ grid يصبح `grid-cols-6` row واحد، فالـ override sm: يمنع over-reservation على desktop).

**Expected impact:** CLS `/ar` 0.46 → ≤0.05 (single skeleton-to-real transition بـ matching DOM في كل section). Perf من 0.46 → ≥0.60.

**Trade-off:** ممكن "وميض" بسيط لو الـ section components تأخرت في mount. منزّل لمستوى مقبول لأن كل section عنده skeleton داخلي بنفس الـ DOM structure للـ real.

**Warns ثابتة عبر كل routes (مؤجَّلة):** `render-blocking-resources` 537-879ms على `/ar` + `/welcome` + `/ar/providers` + `/ar/providers/<id>`. mainthread-work-breakdown 10.8s على `/ar`. كلها warn-level (مش errors)، structural fixes خارج scope Task D.

### بعد Task D (2026-05-12) — `/ar` CLS مُحلَّل (artifact #20)

artifact: `lighthouseresults_20.zip` (CI run بعد commit 5 على PR #387). 7 URLs × 3 runs = 21 reports. الـ assertion-results مفيش أي error-level failures.

| URL                  | Perf (median) | CLS (median) | LCP (median) | TBT (median) | الحالة                             |
| -------------------- | ------------: | -----------: | -----------: | -----------: | ---------------------------------- |
| `/ar`                |      **0.74** |    **0.055** |         3.3s |        415ms | 🟢 Task D مُحلَّل (كان 0.46/0.463) |
| `/ar/providers`      |          0.76 |           ~0 |              |              | ✓ تحسّن من 0.71                    |
| `/ar/providers/<id>` |          0.69 |           ~0 |              |              | ✓ تخطّى عتبة 0.6 (كان 0.59)        |
| `/ar/cart`           |          0.90 |           ~0 |              |              | ✓ تحسّن من 0.75                    |
| `/ar/auth/login`     |      **0.94** |           ~0 |              |              | ✓ أفضل route (كان 0.79)            |
| `/ar/custom-order`   |          0.77 |           ~0 |              |              | ⚠ regression طفيف من 0.85          |
| `/ar/provider/login` |          0.84 |           ~0 |              |              | ✓ تحسّن من 0.66                    |

**التحليل:**

- **Task D نجح**: CLS على `/ar` 0.463 → **0.055** (≤0.1 ✓). Perf 0.46 → 0.74 (≥0.6 ✓). جذر السبب الحقيقي كان DOM path mismatch في OffersCarousel skeleton vs real (مش الـ outer skeleton وحده، مش الـ spinner، مش الـ BannerCard motion.div، مش الـ web splash — كلهم contributed لكن الـ structural alignment في commit 5 هو اللي قطع الـ 0.239 score).
- **side effects إيجابية**: غالباً بسبب إزالة web splash، الـ TTI نزل على كل routes فالـ perf scores ارتفعت بالعرض (cart +0.15، auth +0.15، provider/login +0.18).
- **`/ar/custom-order` regression طفيف** (0.85 → 0.77): يحتاج فحص لو persistent عبر runs. ممكن يكون noise (3 runs) أو لو الـ splash كان يـ defer أحد الـ scripts. مدرَج كـ متابعة في §٨.
- **render-blocking-resources** لسه warn-level على عدة routes (574-733ms) — structural CSS refactor مؤجَّل خارج Task D.

### بعد Task E (2026-05-12) — cross-cutting LCP fix (artifact #21)

artifact: `lighthouseresults_21.zip` (CI run بعد single-line fix في `CustomerHeader.tsx:299`: إضافة `static` prop لـ `EngeznaLogo`). 7 URLs × 3 runs = 21 reports. assertion-results بدون errors.

| URL                  | Perf (median) |   CLS |    LCP |   TBT |    TTI | Δ Perf vs #20 |               Tier               |
| -------------------- | ------------: | ----: | -----: | ----: | -----: | :-----------: | :------------------------------: |
| `/ar/auth/login`     |          0.93 | 0.000 | 2363ms | 246ms | 3957ms |     -0.01     |                🥇                |
| `/ar/cart`           |          0.91 | 0.000 | 2720ms | 218ms | 4634ms |     +0.01     |                🥇                |
| `/ar/welcome`        |      **0.87** | 0.003 | 2913ms | 180ms | 4316ms | **+0.16** ✨  |              🥇 ✨               |
| `/ar/provider/login` |          0.82 | 0.000 | 3019ms | 455ms | 5255ms |     -0.02     |              🥇 ✨               |
| `/ar/custom-order`   |          0.80 | 0.001 | 4145ms | 277ms | 4145ms |     +0.03     | borderline 🥇 (LCP just over 4s) |
| `/ar`                |          0.76 | 0.055 | 4075ms | 513ms | 5064ms |     -0.02     |                🥈                |
| `/ar/providers`      |          0.74 | 0.000 | 4602ms | 356ms | 4625ms |     -0.02     |                🥈                |
| `/ar/providers/<id>` |          0.74 | 0.001 | 4975ms | 319ms | 5523ms |   **+0.05**   |                🥈                |

**التحليل:**

- **Task E نجح**: `/ar/welcome` perf 0.71 → **0.87** (+0.16) — أكبر مكسب لأن الـ welcome مفيش data fetch ثقيل فالـ logo render delay كان dominant. `/ar/custom-order` و `/ar/providers/<id>` و `/ar/welcome` كلهم تحسّنوا significantly.
- **2 routes جديدة دخلت 🥇**: `/ar/welcome` و `/ar/provider/login` — رفع العدد من 2/8 → 4/8.
- **`/ar/custom-order` على الحدود**: perf 0.80 ✓ لكن LCP 4145ms أعلى من 4000 بـ 145ms. يحتاج tweaks إضافية للوصول الكامل لـ 🥇.
- **`/ar` regressed slightly** (0.78 → 0.76): الـ logo فيه fix لكن LCP element تغيّر — لازم يكون عنصر تاني (banner أو غيره) لسه delayed. متوقع لـ /ar specifically لأن الـ home بيـ render 7 sections.
- **`/ar/providers` regressed slightly** (0.76 → 0.74): probably noise (single-digit perf change عبر 3 runs).
- **`/ar/providers/<id>` تحسّن** (0.69 → 0.74): الـ logo fix ساعد لكن LCP عنصر تاني (banner welcome text) لسه delayed بعد ما الـ logo اتحلّ.

**Current state vs targets:** 🥇 4/8، 🥈 4/8، 🥉 8/8. الـ "current target" 🥈 محقّق على الجميع (per §1). الـ "ambitious target" 🥇 محقّق على نصف الـ routes.

**المتبقي للوصول لـ 🥇 على الـ 4 routes الباقية:**

- `/ar`: LCP 4075 (75ms over)، TBT 513 (within 600). يحتاج cross-cutting JS reduction أو شعور بأن الـ home بسبب 7 sections.
- `/ar/providers`: LCP 4602، TBT 356. الـ list rendering كثيف.
- `/ar/providers/<id>`: LCP 4975 (banner text)، TBT 319. الـ banner element مع reveal animation removed لسه delayed — يحتاج فحص.
- `/ar/custom-order`: LCP 4145 (145ms over). قريب جداً من 🥇.

### بعد Task F revert (2026-05-12) — artifact #23

artifact: `lighthouseresults_23.zip` (CI run بعد دمج Task F revert على main). 7 URLs × 3 runs = 21 reports. zero error-level failures.

| URL                  | Perf (median) |   CLS |    LCP |   TBT |    TTI | Δ Perf vs #21 |            Tier            |
| -------------------- | ------------: | ----: | -----: | ----: | -----: | :-----------: | :------------------------: |
| `/ar/auth/login`     |          0.95 | 0.000 | 2859ms |  33ms | 3198ms |     +0.02     |             🥇             |
| `/ar/provider/login` |          0.94 | 0.000 | 2709ms | 164ms | 5329ms |   +0.12 ✨    |        🥇 (stable)         |
| `/ar/cart`           |          0.93 | 0.000 | 3160ms | 107ms | 4508ms |     +0.02     |             🥇             |
| `/ar/welcome`        |          0.92 | 0.003 | 2513ms |  80ms | 5130ms |     +0.05     |             🥇             |
| `/ar`                |          0.85 | 0.001 | 3760ms | 170ms | 6073ms |   +0.09 ✨    | borderline 🥇 (TTI +73ms)  |
| `/ar/custom-order`   |          0.83 | 0.008 | 4610ms |  99ms | 4610ms |     +0.03     | borderline 🥇 (LCP +610ms) |
| `/ar/providers`      |          0.79 | 0.000 | 4962ms | 131ms | 4977ms |     +0.05     |             🥈             |
| `/ar/providers/<id>` |          0.76 | 0.000 | 5861ms | 116ms | 5861ms |     +0.02     |             🥈             |

**التحليل:**

- **كل الـ routes تحسّنت** vs artifact #21. الـ regression من Task F اتشال + الـ baseline اللي main زاد عليها (CDN/caching/Vercel preview optimizations).
- **4/8 routes في 🥇 الكاملة + 2 borderline قريبين جداً**: `/ar` perf 0.85 لكن TTI 6073 (73ms over)؛ `/ar/custom-order` perf 0.83 لكن LCP 4610.
- **`/ar/providers` perf 0.79** على بُعد 0.01 من 🥇 — single tweak عليه LCP يفتح الباب.
- **`/ar/providers/<id>` perf 0.76** أكبر فجوة، LCP 5861ms (banner welcome text render delay 90%).
- **`/ar` perf 0.85** تحسّن +0.09 — غالباً مزيج من Task E (logo) + Task D (CLS) cumulative effect.

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
- **اكتشاف 2026-05-11 (B-bis applied):** بعد user approve devDep، تم install `puppeteer@^24.43.1`. الـ postinstall تلقائياً يـ download Chromium إلى `~/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome` (276MB)، رغم محاولة `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` — الـ env var ده deprecated في v22+ (الجديد `PUPPETEER_SKIP_DOWNLOAD`). تركنا الـ download يحدث لأنه يضمن `puppeteer.executablePath()` يرجع مسار صالح، اللي lhci's healthcheck يعتمد عليه. تم enable `puppeteerScript: './scripts/lhci-home-setup.js'` في `lighthouserc.js`، و `/ar` رجع للـ URL list. الـ script (موجود من PR #382 وتُرك للـ B-bis) يـ seed `engezna_guest_location` localStorage بـ stable test GuestLocation قبل كل audit، فيمر الـ client-side gate. الـ next CI artifact = أول قياس فعلي للـ home الحقيقي (P0).

- **اكتشاف 2026-05-11 (Codex catch — empty-home pitfall):** أول CI run بعد تفعيل B-bis (PR #384) أظهر `/ar` perf = 0.43-0.50 مع CLS errors. السبب من Codex review: `scripts/lhci-home-setup.js` كان يـ seed `cityId: 'lhci-test-city'` و `governorateId: 'lhci-test-governorate'` (placeholder strings). لكن `HomePageClient.tsx:326-330` يستخدمهم كـ STRICT Supabase filters (`query.eq('city_id', cityId)`)، فالـ home رندّر بـ empty provider lists — المتركس كانت بتقيس الـ empty-state collapse، مش الـ real user journey. **عُولج في الـ PR الحالي:** الـ seed values دلوقتي تأتي من env vars (`LHCI_SEED_GOVERNORATE_ID` و `LHCI_SEED_CITY_ID`). لو غير مُعدَّة → الـ script becomes no-op و الـ `/ar` URL يـ drop من lighthouserc.js list. الـ workflow يـ pass الـ secrets من GitHub. **النتيجة:** infrastructure ready، home measurement مفعَّل لما user يضع real UUIDs من الـ providers table (هما public — اختبار `SELECT id FROM governorates WHERE name_en='Beni Suef'` + `SELECT id FROM cities WHERE governorate_id = ... LIMIT 1`).
- **اكتشاف 2026-05-11 (CodeRabbit — CI cache Chromium):** الـ workflow كان يـ download Chromium (~276MB) في كل run داخل `npm ci`. **عُولج:** `actions/cache@v4` يخزّن `~/.cache/puppeteer` بـ key مشتق من `package-lock.json` hash. لو package-lock يتغيّر (مثل puppeteer version bump)، الـ cache يُلغى تلقائياً.

- **اكتشاف 2026-05-11 (C-ter applied + Codex correction):** بعد C-bis الـ CI artifact أظهر أن الـ warns الباقية هي `render-blocking-resources` على عدة routes (300-340ms median). السبب: CSS chunk واحد (`cc2c948acf257440.css`, ~23KB، 91% unused per page). **محاولة أولى (خطأ):** أضفنا `experimental.optimizeCss: true` + `critters^0.0.23` devDep. **Codex كشف الخطأ:** `optimizeCss` يُستهلَك بالـ Pages Router فقط (`node_modules/next/dist/server/render.js:1089` + `_document.js`). Engezna يستخدم App Router (`src/app/`، لا `pages/`)، فالـ flag لم يكن يُفعَّل أبداً — كان يضيف dep بلا تأثير. **عُولج في الـ PR الحالي:** الـ flag الصحيح للـ App Router هو `experimental.inlineCss` (انظر `node_modules/next/dist/server/base-server.js:390` + `app-render/types.d.ts:80`). built into Next.js، لا dependency. حذفنا `critters` devDep بالكامل. لو الـ post-merge artifact أظهر FOUC-CLS أو LCP regression، revert الـ flag فقط (مفيش dep ينحذف).
- **اكتشاف 2026-05-12 (Task F الجديد — provider card image priority):** بعد Task F revert merged، artifact #23 أكّد الـ regression اتشال (`/ar/welcome` 0.92، `/ar/cart` 0.93). فحص الـ LCP elements على الـ 2 routes الـ 🥈 المتبقية كشف الـ next quick win: `/ar/providers` LCP element هو `<img class="object-contain">` داخل `card-product` (الـ provider logo image) مع breakdown: TTFB 11%، **load delay 58% (3197ms)**، load time 1%، render delay 29%. الـ load delay الضخم سببه `loading="lazy"` على كل الـ ProviderCard images بما فيها الـ first card اللي above-the-fold. الـ browser يـ schedule الـ lazy images بعد الـ initial layout، فالـ LCP image (المرئية فوراً) تنتظر زي أي صورة تانية. **Fix:** إضافة `isPriority` prop على ProviderCard، الـ ProvidersClient يمرّر `isPriority={index < 2}` لأول card-ين (mobile single-column = card 0 above fold، md+ 2-col grid = cards 0+1 above fold). الـ Image component يستخدم `priority` بدلاً من `loading="lazy"` على الـ cards دي. التأثير المتوقع: `/ar/providers` LCP −2-3s (load delay يـ collapse من 3197ms إلى الـ network RTT)، perf 0.79 → ≥0.80 لدخول 🥇. الـ change scoped على ProvidersClient فقط — pages تانية تستخدم ProviderCard (مثل home الـ Top Rated / Nearby sections) ما تتأثرش لأنهم مش بيمرّروا isPriority. لو home في المستقبل عاوز يستخدم نفس الـ optimization، يقدر يمرّر isPriority على أول card في كل section.

- **Task F REVERTED 2026-05-12 (Codex catch confirmed بـ artifact #22 data):** الـ hypothesis كان `preload: true` على arefRuqaa بيـ accelerate الـ font swap فالـ logo LCP swap delay يختفي. **Codex راجع PR #389 قبل الـ merge** وحذّر: `arefRuqaa.variable` مطبَّق على `<body>` في `src/app/[locale]/layout.tsx` فالـ Next.js بيـ emit الـ preload tag على كل routes تحت `[locale]`، لا فقط على pages الـ logo فيها above-the-fold. **CodeRabbit أكّد**: Next.js يحدد الـ preload statically عبر import scope (root layout / nested layout / page)، لا runtime viewport detection — الـ claim بتاعي في الـ original comment ("preload-as-font + crossorigin only when the variable is actually referenced above the fold") كان خطأ تقني. **artifact #22 (post PR #389 deploy preview) أكّد الـ regression**:

  | Route                | #21 Perf | #22 Perf | Δ Perf       | الحالة                    |
  | -------------------- | -------: | -------: | ------------ | ------------------------- |
  | `/ar/welcome`        |     0.87 | **0.74** | **-0.13 ❌** | **خسرت 🥇**               |
  | `/ar/cart`           |     0.91 |     0.87 | -0.04        | 🥇 لكن worse              |
  | `/ar/custom-order`   |     0.80 |     0.78 | -0.02        | **خسرت borderline 🥇**    |
  | `/ar/provider/login` |     0.82 |     0.87 | +0.05        | الوحيد اللي اتحسّن فعلياً |

  الـ 45kb extra على الـ critical path أعاد إنتاج الـ bandwidth contention اللي Task C شالها. الـ swap window improvement على بعض routes كان أصغر من الـ contention loss على الـ routes التانية. **Net: −2 routes من 🥇**. الـ commit اللي flipped `preload: true` reverted وعاد لـ `false`. **الـ proper structural fix (مؤجَّل):** نقل `arefRuqaa.variable` من root layout className إلى auth و welcome layouts فقط، فالـ preload يـ emit بس على الـ routes اللي محتاجاه. ده يحتاج Next.js layouts restructure فمدرَج كـ task مستقل لو حد route معين خسر 🥇 بسبب الـ font swap. **الدرس العام:** Next.js font preload يـ emit ستاتيكياً based on الـ import location في الـ React tree (root layout = كل routes، nested layout = subset routes، page = page بس). أي font preload في root layout = blanket preload — same anti-pattern Task C عالجته. أي preload يجب أن يكون scoped للـ subtree الأقل اللي محتاجه.

- **اكتشاف 2026-05-12 (Task E — logo reveal animation يخفي LCP):** بعد Task D merged، فحص LCP elements عبر routes كشف نمط ثابت: render delay 81-90% من LCP على `/ar` و `/ar/providers/<id>`. الـ LCP element على `/ar` كان `span.logo-text-engezna-logo-0` ("إنجزنا" نص اللوجو) بـ render delay 2700-3690ms. الـ root cause: `EngeznaLogo` (src/components/ui/EngeznaLogo.tsx) في الـ default branch (غير `static`) بيـ render `::after` pseudo-element بـ `background: ${bgColor}` يغطي الـ logo نص، ثم animate `transform: translateX(-105%)` reveal لمدة 1.8s. لما الـ overlay يـ cover الـ logo، Lighthouse يعتبر الـ element غير visible فلا finalize LCP حتى تنتهي الـ animation. الـ `CustomerHeader.tsx:299` كان الـ مكان الوحيد في الـ codebase اللي يستخدم الـ default branch (كل usages تانية في login pages بتستخدم `static` prop). فالـ animation كانت تـ fire على كل page عميل (home، providers، cart، إلخ). **عُولج في PR cross-cutting:** إضافة `static` prop على الـ CustomerHeader logo. الـ static branch (EngeznaLogo.tsx:48-60) يـ render `<span>` بسيط بدون animation/overlay. التأثير المتوقع: LCP −1500 إلى −3000ms على كل routes الـ customer، فـ `/ar` (perf 0.78 → ≥0.80)، `/ar/welcome` (0.71)، `/ar/providers` (0.76)، `/ar/providers/<id>` (0.69)، `/ar/custom-order` (0.77) كلها مرشحة لـ tier 🥇. الـ reveal animation تظل متاحة للـ login/register pages اللي بتستخدم EngeznaLogo بدون static.
- **اكتشاف 2026-05-12 (DOM path mismatch — Task D part 5):** artifact #19 (post commit 4) أكّد إن الـ web splash لم يكن السبب الحقيقي — CLS لسه 0.242 بنفس القيمة. الـ filmstrip بعد disable splash بقى نظيف (thumb 1 و 2 و 3 كلهم = real home) لكن الـ assertion-results لم تتغير. التشخيص الحقيقي: Lighthouse `layout-shifts` يستخدم **DOM path index** (`1,HTML,1,BODY,...,SECTION,1,DIV`) لمطابقة elements بين frames، لا class names. الـ OffersCarousel skeleton كان يـ render `section > [div.flex.mb-5, div.flex.gap-4, div.flex.mt-4]`، والـ real يـ render `section > [div.flex.mb-5, div.relative, div.flex.mt-4]`. الـ `section.children[1]` بين الـ states كان `div.flex.gap-4` (skeleton) vs `div.relative` (real). Lighthouse عاملهم نفس الـ element لأن الـ path index متطابق، فالـ height/styling differences (الـ real فيه pb-2 على inner flex + computed styles مختلفة) سُجِّلت كـ "shift" بـ score 0.239. **عُولج (commit 5):** الـ skeleton الآن يـ wrap الـ banner container في `<div className="relative">` بحيث `section.children[1]` يكون `div.relative` في الـ skeleton AND الـ real states. Lighthouse يـ match الـ element عبر الـ states بنفس الـ class/structure، فالـ shift attribution يـ collapse.
- **اكتشاف 2026-05-12 (web splash overlay — false lead على Task D):** بعد commit 3 الـ CLS لسه ثابت عند 0.242، وفحص الـ filmstrip في artifact #18 أظهر splash logo في thumb 2 (3599ms) قبل الـ home في thumb 3 (4799ms). الـ hypothesis كان إن `NativeSplashHider`'s fade-out window يـ correlate مع الـ section transitions ويـ inflate CLS. **commit 4 حذف الـ web splash** (`!isNativePlatform() return false`) لكن artifact #19 أظهر إن CLS لم يتغيّر (0.242 → 0.242). الـ splash كان flag حقيقي لكن لم يكن السبب. **القرار: الـ commit يبقى** لأن: (1) الـ splash كان يضيف 2.5s قبل الـ user يشوف الـ home بدون فائدة على web (الـ SSR HTML جاهز فوراً)، (2) إزالته تـ improve TTI/SI بدون تكلفة، (3) الـ native path سليم. درس عام: filmstrip thumbnails مفيدة لكنها لا تستبدل الـ DOM path analysis للـ CLS culprits.
- **متابعة 2026-05-12 (CodeRabbit — doc consistency):** PR #387 review طلب تحديثين توثيقيين: (1) timestamp الـ header (line 13) من 2026-05-11 → 2026-05-12 لأن الـ PR ده يـ ship تعديلات في 2026-05-12 — تم تحديثه + إضافة عبارة Task D status للـ context؛ (2) صف `/ar/providers/<id>` في جدول §٧ كان يقول "Task E" بينما Task E في §٠.٦ مخصصة لـ `/ar/auth/login` — تم استبدالها بـ "follow-up منفصل" مع pointer لـ §٠.٦. لا يوجد task جديد في §٠.٦ للـ `/ar/providers/<id>` perf 0.59 لأنه warn-level (تحت العتبة بـ 0.01 بس) ولا يكسر CI؛ يُدرَج كـ task مستقل لو الـ regression اتسع.
- **متابعة 2026-05-12 (banner CLS عبر Framer Motion mount — Task D part 3):** بعد إصلاح الـ outer skeleton (commit 1) + الـ spinner branch (commit 2)، الـ artifact #17 كشف أن الـ CLS نزل من 0.46 → 0.24 لكن لسه فوق العتبة 0.1. الـ culprit الأساسي المتبقي: `<div class="relative">` الـ BannerCard root في OffersCarousel — score 0.239 ثابت على كل run. الـ DOM ده كان `motion.div` من Framer Motion (سطر 308 قبل الإصلاح). نفس نمط PR #381 على CustomOrderWelcomeBanner: Framer Motion في outer wrapper يـ delay أول paint past الـ skeleton-to-real swap، فالـ new DOM يـ land في position مختلف عن الـ skeleton placeholder ويُسجَّل كـ large shift. **عُولج (commit ثالث في PR #387):** outer `motion.div` → plain `<div>`، حُذف `whileHover scale: 1.01` (desktop-only polish، lab يقيس mobile fold). الـ inner motion components (CTA button، badge، indicator dots) تركت لأنها user-interaction only ولا تـ mount-shift. النتيجة تُتحقق من الـ artifact الجاي.
- **متابعة 2026-05-12 (CodeRabbit — earlyRedirectDone edge case):** CodeRabbit أشار إن `earlyRedirectDone` (HomePageClient.tsx:163-178) يستخدم `guestLocationStorage.get()` فقط بدون فحص auth state، فالـ authenticated user مع location في الـ profile فقط (مش في guestStorage) ممكن يـ redirect لـ `/welcome` بالخطأ على أول visit. **القرار: تخطّي في PR #387.** الأسباب: (1) سلوك مسبق قبل هذا الـ PR — لم يُدخل ولم يُعمَّق من هذا الـ work، (2) `UserLocationContext.setUserLocation` يـ mirror الـ location إلى guestStorage لكل users (UserLocationContext.tsx:123-128)، فالـ authenticated returning users فعلياً عندهم guestStorage مَلْيَى، (3) الـ edge case الحقيقية (first-ever visit لـ authed user بـ profile-only location) نادرة، (4) الإصلاح يحتاج rework الـ synchronous redirect mechanism (delay تعيين earlyRedirectDone حتى تكتمل profile hydration أو إضافة isAuthenticated state) — out of scope لـ CLS-focused PR. يُدرَج كـ task مستقل لو field data كشف users فعلاً بيهبطوا فيه.
- **متابعة 2026-05-12 (puppeteer seed reliability):** CI run #230 أظهر أن واحد من 3 runs لـ `/ar` انتهى بـ `finalUrl = /ar/welcome` — الـ localStorage seed لم يثبت في الـ run ده. الـ assertion-results.json يجمع الفشل تحت `/ar/welcome` URL منفصل (يظهر كـ "8 URLs" في الـ log رغم أن lighthouserc.js يحدد 7). 2/3 ثبت بنجاح فالـ measurement مفيد، لكن الـ flakiness يحتاج fix. الـ hypothesis: lhci يـ spawn Chrome fresh لكل run، لكن الـ puppeteerScript ينفذ pre-audit عبر `browser.newPage()` على الـ instance الموجود — لو الـ instance يُعاد توليده بين runs، الـ localStorage يضيع. الإصلاح المحتمل: نقل الـ seed إلى `setupScript` بدل `puppeteerScript`، أو استخدام `extraHeaders` للـ session cookie + server-side route لـ set localStorage عبر `<script>` inline. مؤجَّل — Task D priority أعلى.
- **اكتشاف 2026-05-11 (C-ter REVERTED — Codex catch #2):** بعد تصحيح الـ flag إلى `inlineCss`، Codex لاحظ من Next.js docs (https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss) أن `inlineCss` فعلياً يـ replace الـ stylesheet `<link>` tags بـ `<style>` tags inline في الـ HTML — **يـ ship الـ full 22KB في كل HTML response**، يلغي browser stylesheet caching لـ returning users، ولا يستخرج critical subset. لما الـ CSS file 91% unused per page، الـ inlineCss يجعل الوضع أسوأ مش أحسن (extra bytes per request × millions of requests). **عُولج في الـ PR الحالي:** revert كامل لـ C-ter. الـ flag حُذف من `next.config.ts`، critters كان حُذف بالفعل. الـ render-blocking warn يبقى (warn-level فقط، لا يكسر CI). الإصلاح الـ structural (route-level CSS splitting أو CSS modules per component) خارج scope flag-based PR — مؤجَّل كـ task مستقل بعد ما الـ priorities الأعلى تنجز.

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
