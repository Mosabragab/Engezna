# 🔍 Engezna Monitoring Setup Guide

## دليل إعداد المراقبة

**تاريخ الإنشاء:** 2026-01-22
**آخر تحديث:** 2026-01-22

---

## 📊 نظرة عامة

يتضمن نظام المراقبة في إنجزنا:

1. **Health Check Endpoint** - لمراقبة حالة التطبيق
2. **Quota Alerts** - تنبيهات عند اقتراب استهلاك الكوتا
3. **Error Monitoring** - عبر Sentry
4. **Performance Monitoring** - عبر Vercel Analytics

---

## 1. UptimeRobot Setup

### الخطوات:

1. **إنشاء حساب UptimeRobot** (مجاني):
   - اذهب إلى [uptimerobot.com](https://uptimerobot.com)
   - سجل حساب جديد

2. **إضافة Monitor جديد**:
   - انقر "Add New Monitor"
   - اختر Type: **HTTP(s)**
   - الإعدادات:
     - **Friendly Name:** Engezna - Main
     - **URL:** `https://engezna.com/api/health`
     - **Monitoring Interval:** 5 minutes
     - **Monitor Timeout:** 30 seconds

3. **إضافة Monitor تفصيلي** (اختياري):
   - **URL:** `https://engezna.com/api/health?detailed=true`
   - هذا يفحص الاتصال بقاعدة البيانات و Redis

4. **إعداد التنبيهات**:
   - اذهب إلى "My Settings" > "Alert Contacts"
   - أضف:
     - Email للأدمن
     - Telegram Bot (اختياري)
     - Webhook (اختياري)

### Health Check Endpoints:

| Endpoint                        | الوصف                    | الاستخدام                  |
| ------------------------------- | ------------------------ | -------------------------- |
| `GET /api/health`               | فحص سريع                 | UptimeRobot, Load Balancer |
| `GET /api/health?detailed=true` | فحص شامل مع Dependencies | تشخيص المشاكل              |
| `GET /api/health?quotas=true`   | مع معلومات الكوتا        | مراقبة الموارد             |
| `HEAD /api/health`              | فحص خفيف بدون body       | Kubernetes Probes          |

### Response Examples:

**Basic Health Check:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-22T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 86400,
  "environment": "production"
}
```

**Detailed Health Check:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-22T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "supabase": {
      "status": "pass",
      "responseTime": 45
    },
    "redis": {
      "status": "pass",
      "responseTime": 12
    }
  }
}
```

---

## 2. Quota Alerts Setup

### Endpoint:

```
POST /api/monitoring/quota-check
Authorization: Bearer <CRON_SECRET>
```

### إعداد Cron Job:

#### Option 1: Vercel Cron (مُوصى به)

أضف إلى `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/monitoring/quota-check",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

هذا يشغل الفحص كل 6 ساعات.

#### Option 2: GitHub Actions

أنشئ `.github/workflows/quota-check.yml`:

```yaml
name: Quota Check

on:
  schedule:
    - cron: '0 */6 * * *' # كل 6 ساعات
  workflow_dispatch: # تشغيل يدوي

jobs:
  check-quotas:
    runs-on: ubuntu-latest
    steps:
      - name: Check Quotas
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://engezna.com/api/monitoring/quota-check
```

### Environment Variables:

أضف هذه المتغيرات في Vercel:

```env
# اختياري - للأمان
CRON_SECRET=your-secret-key-here

# حدود الكوتا (اختياري - القيم الافتراضية للـ Free tier)
SUPABASE_DB_LIMIT_MB=500
SUPABASE_STORAGE_LIMIT_GB=1
UPSTASH_COMMANDS_LIMIT=10000
```

### عتبات التنبيهات:

| المستوى  | النسبة | الإجراء        |
| -------- | ------ | -------------- |
| OK       | < 70%  | لا شيء         |
| Warning  | 70-89% | تنبيه للمراجعة |
| Critical | ≥ 90%  | تنبيه عاجل     |

---

## 3. Sentry Error Monitoring

### الإعداد الحالي:

Sentry مُعد بالفعل مع:

- **Client errors** - أخطاء المتصفح
- **Server errors** - أخطاء API
- **Session Replay** - 1% من الجلسات، 10% عند الخطأ

### لوحة التحكم:

- اذهب إلى [sentry.io](https://sentry.io)
- تحقق من الأخطاء في المشروع

### تخصيص التنبيهات:

1. اذهب إلى Project > Alerts
2. أنشئ Alert Rule جديد:
   - **When:** An event is seen
   - **If:** level is error or fatal
   - **Then:** Send email to team

---

## 4. Vercel Analytics

### المُفعل:

- ✅ **Web Analytics** - زيارات الصفحات
- ✅ **Speed Insights** - Core Web Vitals

### المشاهدة:

1. اذهب إلى Vercel Dashboard
2. اختر المشروع
3. انقر على "Analytics" أو "Speed Insights"

---

## 5. Lighthouse Performance Audit

### تشغيل Audit يدوي:

1. افتح Chrome DevTools (F12)
2. اذهب إلى Tab "Lighthouse"
3. اختر:
   - Categories: Performance, Accessibility, Best Practices, SEO
   - Device: Mobile
4. انقر "Analyze page load"

### الأهداف:

| المقياس        | الهدف | الحالة الحالية |
| -------------- | ----- | -------------- |
| Performance    | 90+   | ~85            |
| Accessibility  | 90+   | ~85            |
| Best Practices | 90+   | ~85            |
| SEO            | 90+   | 100 ✅         |

### تشغيل Audit تلقائي:

#### Using PageSpeed Insights API:

```bash
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://engezna.com&strategy=mobile"
```

#### Using Lighthouse CI:

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://engezna.com
            https://engezna.com/ar/providers
          budgetPath: ./lighthouse-budget.json
```

---

## 6. قائمة التحقق للمراقبة

### قبل الإطلاق:

- [x] Health Check endpoint يعمل
- [x] Quota Alerts API جاهز
- [x] Sentry مُعد
- [x] Vercel Analytics مُفعل
- [ ] UptimeRobot monitors مُضافة
- [ ] Cron job للـ Quota Check مُفعل
- [ ] تنبيهات Email مُعدة

### بعد الإطلاق:

- [ ] مراجعة Sentry errors يومياً
- [ ] مراجعة Uptime reports أسبوعياً
- [ ] مراجعة Lighthouse scores شهرياً
- [ ] مراجعة Quota usage شهرياً

---

## 7. استكشاف الأخطاء

### Health Check يعود unhealthy:

1. تحقق من Supabase Dashboard - هل الـ project متوقف؟
2. تحقق من Vercel Logs
3. شغل `/api/health?detailed=true` للتفاصيل

### Quota Alerts لا تعمل:

1. تحقق من `CRON_SECRET` environment variable
2. تحقق من Vercel Cron logs
3. شغل الـ endpoint يدوياً للاختبار

### Sentry لا يستقبل أخطاء:

1. تحقق من `NEXT_PUBLIC_SENTRY_DSN`
2. تحقق من Sentry project settings
3. جرب `Sentry.captureException(new Error('Test'))` يدوياً

---

## 📞 جهات الاتصال للطوارئ

| الخدمة      | رابط الدعم                                               |
| ----------- | -------------------------------------------------------- |
| Supabase    | [supabase.com/dashboard](https://supabase.com/dashboard) |
| Vercel      | [vercel.com/support](https://vercel.com/support)         |
| Sentry      | [sentry.io](https://sentry.io)                           |
| UptimeRobot | [uptimerobot.com](https://uptimerobot.com)               |

---

_آخر تحديث: 2026-01-22_
