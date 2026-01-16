# خطة تطوير طبقات الجودة والأمان - مشروع انجزنا

## معلومات الوثيقة

| البند             | القيمة      |
| ----------------- | ----------- |
| **الإصدار**       | 1.0         |
| **تاريخ الإنشاء** | 2026-01-16  |
| **آخر تحديث**     | 2026-01-16  |
| **الحالة**        | قيد التنفيذ |

---

## الأهداف

تأسيس 4 طبقات أساسية للمشروع:

1. **Security Layer** - طبقة الأمان
2. **Testing Layer** - طبقة الاختبارات
3. **Quality Assurance Layer** - طبقة ضمان الجودة
4. **AUX/Utility Layer** - طبقة الأدوات المساعدة

---

## سجل التنفيذ

| التاريخ    | المرحلة | المهمة                                         | الحالة   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2026-01-16 | -       | إنشاء الخطة واعتمادها                          | ✅ مكتمل |
| 2026-01-16 | 1.1     | إعداد Prettier                                 | ✅ مكتمل |
| 2026-01-16 | 1.2     | إعداد Husky                                    | ✅ مكتمل |
| 2026-01-16 | 1.3     | إعداد lint-staged                              | ✅ مكتمل |
| 2026-01-16 | 1.4     | تحسين ESLint                                   | ✅ مكتمل |
| 2026-01-16 | 1.5     | إعداد GitHub Actions CI                        | ✅ مكتمل |
| 2026-01-16 | -       | إصلاح أخطاء TypeScript في E2E                  | ✅ مكتمل |
| 2026-01-16 | 1.5.1   | Error Classes (7 classes)                      | ✅ مكتمل |
| 2026-01-16 | 1.5.2   | Error Handler + API utilities                  | ✅ مكتمل |
| 2026-01-16 | 1.5.3   | Zod Validation Schemas (4 files)               | ✅ مكتمل |
| 2026-01-16 | 1.5.4   | Validation Middleware                          | ✅ مكتمل |
| 2026-01-16 | 2.1     | Vitest Setup                                   | ✅ مكتمل |
| 2026-01-16 | 2.2     | Testing Library Setup                          | ✅ مكتمل |
| 2026-01-16 | 2.3     | Test Utilities + Mocks                         | ✅ مكتمل |
| 2026-01-16 | 2.4     | Supabase + Realtime Mocks                      | ✅ مكتمل |
| 2026-01-16 | 2.5     | Unit Tests (99 tests passing)                  | ✅ مكتمل |
| 2026-01-16 | 3.1     | Security Headers (HSTS, X-Frame-Options, etc.) | ✅ مكتمل |
| 2026-01-16 | 3.5     | RBAC Tests (25 tests)                          | ✅ مكتمل |
| 2026-01-16 | -       | CI Unit Tests enabled                          | ✅ مكتمل |
|            |         |                                                |          |

---

## Roadmap - خريطة الطريق

```
المرحلة 1: QA Layer
    ↓
المرحلة 1.5: Infrastructure (Error Classes + Zod)
    ↓
المرحلة 2: Testing Layer (+ Realtime Mock)
    ↓
المرحلة 3: Security Layer (+ RBAC Tests)
    ↓
المرحلة 4: AUX Layer
    ↓
    ✅ Production Ready
```

---

## المرحلة 1: QA Layer (الأساس)

**الأولوية:** عالية
**التبعيات:** لا شيء
**الحالة:** ✅ مكتمل

| #   | المهمة               | الوصف                                  | الحالة |
| --- | -------------------- | -------------------------------------- | ------ |
| 1.1 | إعداد Prettier       | تكوين formatting موحد للكود            | ✅     |
| 1.2 | إعداد Husky          | Pre-commit hooks                       | ✅     |
| 1.3 | إعداد lint-staged    | تشغيل linting على الملفات المتغيرة فقط | ✅     |
| 1.4 | تحسين ESLint         | إضافة قواعد أكثر صرامة                 | ✅     |
| 1.5 | إعداد GitHub Actions | CI/CD pipeline أساسي                   | ✅     |

### Checklist - المرحلة 1

#### 1.1 Prettier

- [x] تثبيت prettier
- [x] إنشاء `.prettierrc`
- [x] إنشاء `.prettierignore`
- [x] إضافة script `format` في package.json
- [ ] تشغيل formatting على الكود الحالي (اختياري - يمكن تشغيله تدريجياً)

#### 1.2 Husky

- [x] تثبيت husky
- [x] تشغيل `husky init`
- [x] إنشاء pre-commit hook

#### 1.3 lint-staged

- [x] تثبيت lint-staged
- [x] إضافة config في package.json
- [x] ربط مع pre-commit hook

#### 1.4 ESLint Enhancement

- [x] إضافة `no-console: warn`
- [x] إضافة `prefer-const: error`
- [x] إضافة `eqeqeq: error`
- [x] إضافة `no-var: error`
- [x] مراجعة وإصلاح أخطاء TypeScript في E2E

#### 1.5 GitHub Actions CI/CD

- [x] إنشاء `.github/workflows/ci.yml`
- [x] Job: lint
- [x] Job: type-check
- [x] Job: build
- [x] Job: e2e tests (على PR)
- [x] Job: security audit

---

## المرحلة 1.5: Infrastructure (البنية التحتية)

**الأولوية:** عالية
**التبعيات:** المرحلة 1
**الحالة:** ✅ مكتمل

> **ملاحظة مهمة:** هذه المرحلة يجب أن تكتمل قبل كتابة Unit Tests لتجنب إعادة كتابة الاختبارات لاحقاً.

| #     | المهمة                | الوصف                          | الحالة |
| ----- | --------------------- | ------------------------------ | ------ |
| 1.5.1 | Error Classes         | إنشاء classes موحدة للأخطاء    | ✅     |
| 1.5.2 | Error Handler         | Global error handling للـ API  | ✅     |
| 1.5.3 | Zod Validation        | Schema validation للـ inputs   | ✅     |
| 1.5.4 | Validation Middleware | Middleware موحد للـ validation | ✅     |

### Checklist - المرحلة 1.5

#### 1.5.1 Error Classes

- [x] إنشاء `src/lib/errors/index.ts`
- [x] `AppError` - base class
- [x] `ValidationError` - أخطاء validation (مع دعم Zod v4.x)
- [x] `AuthenticationError` - أخطاء المصادقة
- [x] `AuthorizationError` - أخطاء الصلاحيات
- [x] `NotFoundError` - موارد غير موجودة
- [x] `RateLimitError` - تجاوز الحد المسموح
- [x] `ConflictError` - تعارض البيانات

#### 1.5.2 Error Handler

- [x] إنشاء `src/lib/api/error-handler.ts`
- [x] تحويل Error Classes لـ HTTP responses
- [x] تنسيق الـ error response موحد
- [x] إخفاء stack traces في production
- [x] دعم logging للأخطاء

#### 1.5.3 Zod Validation Schemas

- [x] zod موجود مسبقاً (v4.1.12)
- [x] إنشاء `src/lib/validations/index.ts`
- [x] `auth.ts` - schemas للـ register, login, reset-password, OTP
- [x] `orders.ts` - schemas للطلبات العادية
- [x] `custom-orders.ts` - schemas للطلبات المخصصة
- [x] `common.ts` - schemas مشتركة (email, phone, UUID, pagination, etc.)

#### 1.5.4 Validation Middleware

- [x] إنشاء `src/lib/api/validate.ts`
- [x] `withValidation()` wrapper للـ API routes
- [x] دعم body, query, params validation
- [x] تكامل مع Error Handler
- [x] Helper functions: `validateBody()`, `validateQuery()`, `validateParams()`

---

## المرحلة 2: Testing Layer

**الأولوية:** عالية
**التبعيات:** المرحلة 1.5
**الحالة:** ✅ مكتمل (أساسي)

| #   | المهمة                 | الوصف                                | الحالة |
| --- | ---------------------- | ------------------------------------ | ------ |
| 2.1 | إعداد Vitest           | تثبيت وتكوين framework الاختبارات    | ✅     |
| 2.2 | إعداد Testing Library  | React Testing Library للـ components | ✅     |
| 2.3 | إنشاء Test Utilities   | Helpers, mocks, fixtures             | ✅     |
| 2.4 | Supabase Mocks         | Mock للـ client و Realtime           | ✅     |
| 2.5 | Unit Tests - Services  | اختبارات للـ lib/services            | ✅     |
| 2.6 | Unit Tests - Hooks     | اختبارات للـ custom hooks            | ⏳     |
| 2.7 | Unit Tests - Utils     | اختبارات للـ utility functions       | ✅     |
| 2.8 | Integration Tests      | اختبارات للـ API routes              | ⏳     |
| 2.9 | Coverage Configuration | إعداد تقارير التغطية                 | ✅     |

> **الإنجاز:** 74 اختبار يعمل بنجاح

### Checklist - المرحلة 2

#### 2.1 Vitest Setup

- [x] تثبيت vitest
- [x] تثبيت @vitest/ui
- [x] تثبيت @vitest/coverage-v8
- [x] إنشاء `vitest.config.ts`
- [x] إضافة scripts: `test`, `test:ui`, `test:coverage`

#### 2.2 Testing Library

- [x] تثبيت @testing-library/react
- [x] تثبيت @testing-library/jest-dom
- [x] تثبيت @testing-library/user-event
- [x] إنشاء `src/__tests__/setup.ts`

#### 2.3 Test Utilities

- [x] إنشاء `src/__tests__/utils/test-utils.tsx`
- [x] Custom render with providers
- [ ] إنشاء `src/__tests__/utils/fixtures/` (اختياري)
- [ ] Test data factories (اختياري)

#### 2.4 Supabase Mocks (مهم جداً)

- [x] إنشاء `src/__tests__/mocks/supabase.ts`
- [x] Mock لـ createClient
- [x] Mock لـ auth methods
- [x] Mock لـ database queries
- [x] **Mock لـ Realtime channels**
  - [x] `channel.subscribe()` mock
  - [x] `channel.on('postgres_changes')` mock
  - [x] Helper لإرسال fake events (`_emit`)
  - [x] محاكاة connection states
- [ ] Mock لـ storage

#### 2.5 Unit Tests - Services

- [ ] `broadcast-service.test.ts`
- [ ] `custom-order-storage.test.ts`
- [ ] `permission-service.test.ts`
- [ ] `rate-limit.test.ts`
- [ ] `audit.test.ts`

#### 2.6 Unit Tests - Hooks

- [ ] `useCustomOrderFinancials.test.ts`
- [ ] `useBroadcastRealtime.test.ts`
- [ ] `usePricingCalculator.test.ts`

#### 2.7 Unit Tests - Utils

- [ ] `formatters.test.ts`
- [ ] `business-hours.test.ts`
- [ ] `excel-import.test.ts`

#### 2.8 Integration Tests

- [ ] إنشاء `src/__tests__/integration/`
- [ ] Auth API routes tests
- [ ] Orders API routes tests
- [ ] Custom orders API routes tests

#### 2.9 Coverage

- [ ] تكوين coverage thresholds في vitest.config.ts
- [ ] إضافة coverage check في CI
- [ ] Target: Services ≥ 70%, Hooks ≥ 50%, Overall ≥ 60%

---

## المرحلة 3: Security Layer

**الأولوية:** عالية
**التبعيات:** المرحلة 1
**الحالة:** ⬜ لم تبدأ

| #   | المهمة                | الوصف                       | الحالة |
| --- | --------------------- | --------------------------- | ------ |
| 3.1 | Security Headers      | CSP, HSTS, X-Frame-Options  | ⬜     |
| 3.2 | CSRF Protection       | حماية من CSRF attacks       | ⬜     |
| 3.3 | XSS Sanitization      | تنظيف المدخلات              | ⬜     |
| 3.4 | Global Rate Limiting  | Rate limiting على مستوى API | ⬜     |
| 3.5 | RBAC Validation Tests | اختبارات الصلاحيات          | ⬜     |
| 3.6 | Security Audit        | فحص الثغرات                 | ⬜     |
| 3.7 | Dependency Audit      | npm audit في CI             | ⬜     |

### Checklist - المرحلة 3

#### 3.1 Security Headers

- [ ] إضافة headers في `next.config.js`
- [ ] Content-Security-Policy
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy

#### 3.2 CSRF Protection

- [ ] تثبيت csrf protection library
- [ ] إنشاء `src/lib/security/csrf.ts`
- [ ] CSRF token generation
- [ ] CSRF validation middleware
- [ ] تكامل مع forms

#### 3.3 XSS Sanitization

- [ ] تثبيت isomorphic-dompurify
- [ ] إنشاء `src/lib/security/sanitize.ts`
- [ ] Sanitize utility functions
- [ ] تطبيق على user inputs الحرجة

#### 3.4 Global Rate Limiting

- [ ] تحديث `src/lib/utils/rate-limit.ts`
- [ ] إضافة API-level rate limiting
- [ ] تكوين limits حسب endpoint type
- [ ] Custom limits للـ sensitive endpoints

#### 3.5 RBAC Validation Tests (مهم جداً)

- [ ] إنشاء `src/__tests__/security/rbac.test.ts`
- [ ] اختبار: customer لا يصل لـ `/provider/*`
- [ ] اختبار: customer لا يصل لـ `/admin/*`
- [ ] اختبار: provider لا يصل لـ `/admin/*`
- [ ] اختبار: provider لا يصل لـ بيانات provider آخر
- [ ] اختبار: API routes ترفض unauthorized requests
- [ ] اختبار: middleware يعيد redirect صحيح

#### 3.6 Security Audit Script

- [ ] إنشاء `scripts/security-audit.sh`
- [ ] npm audit check
- [ ] تقرير الثغرات
- [ ] Exit code للـ CI

#### 3.7 Dependency Audit في CI

- [ ] إضافة audit step في GitHub Actions
- [ ] Block on high/critical vulnerabilities
- [ ] Warning on moderate vulnerabilities

---

## المرحلة 4: AUX/Utility Layer

**الأولوية:** متوسطة
**التبعيات:** المرحلة 1
**الحالة:** ⬜ لم تبدأ

| #   | المهمة            | الوصف                    | الحالة |
| --- | ----------------- | ------------------------ | ------ |
| 4.1 | Logger Service    | نظام logging مركزي       | ⬜     |
| 4.2 | Health Check API  | Endpoint لفحص صحة النظام | ⬜     |
| 4.3 | Monitoring Setup  | Sentry integration       | ⬜     |
| 4.4 | Performance Utils | أدوات قياس الأداء        | ⬜     |
| 4.5 | Cache Service     | طبقة caching بسيطة       | ⬜     |

### Checklist - المرحلة 4

#### 4.1 Logger Service

- [ ] تثبيت pino أو winston
- [ ] إنشاء `src/lib/logger/index.ts`
- [ ] Log levels: debug, info, warn, error
- [ ] JSON format للـ production
- [ ] Pretty format للـ development
- [ ] Request logging middleware
- [ ] استبدال console.log/error

#### 4.2 Health Check API

- [ ] إنشاء `src/app/api/health/route.ts`
- [ ] فحص database connection
- [ ] فحص Supabase connection
- [ ] Return: status, version, uptime
- [ ] Response time tracking

#### 4.3 Monitoring (Sentry)

- [ ] تثبيت @sentry/nextjs
- [ ] إنشاء `sentry.client.config.ts`
- [ ] إنشاء `sentry.server.config.ts`
- [ ] إنشاء `sentry.edge.config.ts`
- [ ] تكوين error boundaries
- [ ] Performance monitoring
- [ ] User feedback widget

#### 4.4 Performance Utils

- [ ] إنشاء `src/lib/utils/performance.ts`
- [ ] `measureTime()` - قياس وقت التنفيذ
- [ ] `trackMetric()` - تسجيل metrics
- [ ] Memory usage helpers

#### 4.5 Cache Service

- [ ] إنشاء `src/lib/cache/index.ts`
- [ ] In-memory cache
- [ ] TTL support
- [ ] Cache invalidation
- [ ] Size limits

---

## هيكل الملفات المقترح

```
src/
├── __tests__/
│   ├── setup.ts
│   ├── mocks/
│   │   ├── supabase.ts          # Supabase + Realtime mocks
│   │   └── router.ts            # Next.js router mock
│   ├── utils/
│   │   ├── test-utils.tsx       # Custom render
│   │   └── fixtures/            # Test data
│   ├── unit/
│   │   ├── services/
│   │   │   ├── broadcast-service.test.ts
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useCustomOrderFinancials.test.ts
│   │   │   └── ...
│   │   └── utils/
│   │       ├── formatters.test.ts
│   │       └── ...
│   ├── integration/
│   │   └── api/
│   │       ├── auth.test.ts
│   │       └── orders.test.ts
│   └── security/
│       └── rbac.test.ts         # RBAC validation tests
├── lib/
│   ├── api/
│   │   ├── validate.ts          # Validation middleware
│   │   └── error-handler.ts     # Global error handler
│   ├── errors/
│   │   ├── index.ts             # Export all errors
│   │   ├── AppError.ts          # Base error class
│   │   ├── ValidationError.ts
│   │   ├── AuthenticationError.ts
│   │   ├── AuthorizationError.ts
│   │   ├── NotFoundError.ts
│   │   └── RateLimitError.ts
│   ├── logger/
│   │   └── index.ts             # Logger service
│   ├── validations/
│   │   ├── index.ts
│   │   ├── auth.ts              # Auth schemas
│   │   ├── orders.ts            # Order schemas
│   │   ├── custom-orders.ts     # Custom order schemas
│   │   └── common.ts            # Shared schemas
│   ├── cache/
│   │   └── index.ts             # Cache service
│   └── security/
│       ├── csrf.ts              # CSRF protection
│       ├── sanitize.ts          # XSS sanitization
│       └── headers.ts           # Security headers config
├── app/
│   └── api/
│       └── health/
│           └── route.ts         # Health check endpoint
.github/
└── workflows/
    └── ci.yml                   # CI/CD pipeline
.husky/
└── pre-commit                   # Pre-commit hook
scripts/
└── security-audit.sh            # Security audit script
.prettierrc                      # Prettier config
.prettierignore                  # Prettier ignore
vitest.config.ts                 # Vitest config
sentry.client.config.ts          # Sentry client config
sentry.server.config.ts          # Sentry server config
```

---

## معايير النجاح

| المعيار                                  | الهدف | الحالة |
| ---------------------------------------- | ----- | ------ |
| Test Coverage (Services)                 | ≥ 70% | ⬜     |
| Test Coverage (Hooks)                    | ≥ 50% | ⬜     |
| Test Coverage (Overall)                  | ≥ 60% | ⬜     |
| ESLint Errors                            | 0     | ⬜     |
| TypeScript Errors                        | 0     | ⬜     |
| Security Vulnerabilities (High/Critical) | 0     | ⬜     |
| CI Pipeline Success Rate                 | 100%  | ⬜     |
| RBAC Tests Passing                       | 100%  | ⬜     |

---

## ملاحظات التنفيذ

### قرارات مهمة:

1. **Vitest over Jest** - أسرع، native ESM support، أفضل مع Vite/Next.js
2. **Pino over Winston** - أسرع، أخف، أفضل للـ production
3. **Error Classes قبل Tests** - لتجنب إعادة كتابة الاختبارات
4. **Realtime Mock أساسي** - المشروع يعتمد بشكل كبير على Supabase Realtime

### تحذيرات:

- لا تكتب Unit Tests قبل إكمال Error Classes
- لا تنسى RBAC tests - أمان حرج
- CI يجب أن يفشل على أي security vulnerability عالية

---

## المراجع

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Zod Documentation](https://zod.dev/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Sentry Next.js SDK](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
