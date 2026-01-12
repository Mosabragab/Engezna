# دليل اختبارات الأداء - Lighthouse Audit
## Store-Ready Performance Testing

**الهدف:** ضمان سرعة التطبيق وكفاءة استهلاك البطارية قبل الرفع على المتاجر

---

## معايير المتاجر

### Apple App Store
- **Performance:** 90+ مُفضل (70+ الحد الأدنى)
- **Accessibility:** 90+ إلزامي
- **استهلاك البطارية:** لا يوجد animations مفرطة أو polling متكرر
- **الحجم:** أقل من 200MB للتحميل الأولي

### Google Play
- **Core Web Vitals:** يجب اجتيازها
- **LCP:** < 2.5 ثانية (جيد)
- **FID/TBT:** < 100ms (جيد)
- **CLS:** < 0.1 (جيد)

---

## الأوامر المتاحة

### 1. اختبارات الأداء السريعة (Playwright)
```bash
# تشغيل اختبارات الأداء
npm run test:e2e:performance

# مع واجهة رسومية
npm run test:e2e:performance -- --ui
```

### 2. Lighthouse Audit

```bash
# فحص سريع (Mobile فقط)
npm run audit:quick

# فحص شامل (Mobile + Desktop)
npm run lighthouse:all

# فحص صفحة واحدة
npm run lighthouse:mobile  # الصفحة الرئيسية Mobile
npm run lighthouse:desktop # الصفحة الرئيسية Desktop

# فحص Lighthouse CI الكامل
npm run lighthouse
```

### 3. الفحص الشامل
```bash
# تشغيل كل اختبارات الأداء + Lighthouse
npm run audit:full
```

---

## المقاييس المستهدفة

### Core Web Vitals

| المقياس | الهدف | الوصف |
|---------|-------|-------|
| **FCP** | < 2.5s | First Contentful Paint - أول محتوى مرئي |
| **LCP** | < 4s | Largest Contentful Paint - أكبر عنصر مرئي |
| **CLS** | < 0.1 | Cumulative Layout Shift - استقرار التخطيط |
| **TBT** | < 500ms | Total Blocking Time - وقت الحظر |
| **TTI** | < 5s | Time to Interactive - وقت التفاعل |

### الفئات

| الفئة | الحد الأدنى | المُفضل |
|-------|------------|---------|
| Performance | 70% | 90%+ |
| Accessibility | 90% | 95%+ |
| Best Practices | 85% | 90%+ |
| SEO | 85% | 95%+ |
| PWA | 70% | 90%+ |

---

## كفاءة البطارية

### ما نختبره:
1. **عدد الـ Animations:** يجب أن يكون أقل من 50 عنصر
2. **حجم الـ DOM:** أقل من 1500 عنصر
3. **استهلاك الذاكرة:** أقل من 50MB JS Heap
4. **الـ Network Requests:** أقل من 100 طلب
5. **حجم النقل:** أقل من 2MB

### ما يجب تجنبه:
- ❌ Infinite loops
- ❌ Heavy setInterval (أقل من 1 ثانية)
- ❌ Excessive re-renders
- ❌ Memory leaks
- ❌ Unoptimized images

---

## الصفحات المختبرة

| الصفحة | المسار | الأهمية |
|--------|--------|---------|
| الرئيسية | `/ar` | عالية جداً |
| المتاجر | `/ar/providers` | عالية |
| السلة | `/ar/cart` | عالية |
| تسجيل الدخول | `/ar/auth/login` | متوسطة |
| الطلب المفتوح | `/ar/custom-order` | متوسطة |
| تسجيل التاجر | `/ar/provider/login` | متوسطة |

---

## قراءة التقارير

### مكان التقارير
```
e2e/reports/
├── lighthouse-homepage-mobile.report.html
├── lighthouse-homepage-mobile.report.json
├── lighthouse-homepage-desktop.report.html
├── lighthouse-providers-mobile.report.html
├── lighthouse-summary.json
└── ...
```

### فتح التقرير
```bash
# فتح تقرير HTML
open e2e/reports/lighthouse-homepage-mobile.report.html

# أو
npx serve e2e/reports
```

### تقرير الملخص (JSON)
```json
{
  "timestamp": "2026-01-12T...",
  "results": [...],
  "averages": {
    "performance": 85,
    "accessibility": 92,
    "bestPractices": 88,
    "seo": 90
  },
  "storeReady": true
}
```

---

## استكشاف المشاكل الشائعة

### 1. Performance منخفض

**الأسباب المحتملة:**
- صور غير مضغوطة
- JavaScript كبير الحجم
- CSS غير مستخدم
- عدم استخدام Code Splitting

**الحلول:**
```bash
# تحليل حجم الـ Bundle
npx @next/bundle-analyzer
```

### 2. Accessibility منخفض

**الأسباب المحتملة:**
- عدم وجود alt للصور
- تباين ألوان ضعيف
- عناصر غير قابلة للوصول بالكيبورد

**الحلول:**
- إضافة `alt` لجميع الصور
- التأكد من تباين الألوان (4.5:1)
- اختبار بالكيبورد فقط

### 3. CLS عالي

**الأسباب المحتملة:**
- صور بدون أبعاد محددة
- خطوط تحمل متأخرة
- محتوى يُحمل ديناميكياً

**الحلول:**
```jsx
// تحديد أبعاد الصور
<Image width={300} height={200} ... />

// Skeleton loading
{loading ? <Skeleton /> : <Content />}
```

### 4. LCP بطيء

**الأسباب المحتملة:**
- صورة Hero كبيرة
- خادم بطيء
- Render-blocking resources

**الحلول:**
```jsx
// تحميل الصور بـ priority
<Image priority src="hero.jpg" ... />

// Preload للخطوط
<link rel="preload" href="font.woff2" as="font" />
```

---

## CI/CD Integration

### GitHub Actions
```yaml
name: Performance Audit

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm run start &
      - run: npm run audit:quick
      - uses: actions/upload-artifact@v3
        with:
          name: lighthouse-reports
          path: e2e/reports/
```

### Budget Monitoring
```js
// في lighthouserc.js
assertions: {
  'categories:performance': ['error', { minScore: 0.7 }],
  // سيفشل الـ CI إذا انخفض الأداء
}
```

---

## توصيات ما قبل الإطلاق

### 1. تحسينات أساسية
- [ ] ضغط جميع الصور (WebP/AVIF)
- [ ] تفعيل Lazy Loading للصور
- [ ] إزالة CSS غير المستخدم
- [ ] تصغير JavaScript

### 2. PWA
- [ ] Service Worker يعمل
- [ ] Manifest صحيح
- [ ] أيقونات Maskable
- [ ] Offline mode

### 3. الأداء
- [ ] FCP < 2.5s
- [ ] LCP < 4s
- [ ] CLS < 0.1
- [ ] TBT < 500ms

### 4. إمكانية الوصول
- [ ] جميع الصور لها alt
- [ ] تباين ألوان كافي
- [ ] Focus indicators واضحة
- [ ] تنقل بالكيبورد

---

## موارد إضافية

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Core Vitals](https://developer.android.com/topic/performance/vitals)

---

*آخر تحديث: 2026-01-12*
