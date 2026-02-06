# Engezna - n8n Merchant Data Workflows
# إنجزنا - ووركفلو تجميع وتحديث بيانات المتاجر

## نظرة عامة

3 ووركفلو عملية لتجميع وتحديث بيانات المتاجر في بني سويف باستخدام Google Maps API:

| Workflow | الملف | الوظيفة |
|----------|-------|---------|
| WF1 | `wf1_google_maps_enrichment.json` | إثراء بيانات المتاجر الموجودة (هاتف، عنوان، تقييم) |
| WF2 | `wf2_new_merchant_discovery.json` | اكتشاف متاجر جديدة في 5 مناطق × 6 فئات |
| WF3 | `wf3_data_merge_export.json` | تجميع كل النتائج + التحقق + التصدير |

```
┌──────────────────────────────────────────────┐
│          ترتيب التشغيل                        │
│                                              │
│  WF1 (إثراء) ──→ WF2 (اكتشاف) ──→ WF3 (تجميع) │
│                                              │
│  Google Sheets ←── مصدر البيانات والنتائج      │
└──────────────────────────────────────────────┘
```

---

## متطلبات الإعداد

### 1. Google Cloud Project

```
1. اذهب إلى https://console.cloud.google.com
2. افتح المشروع: "Engezna" (engezna-6edd0)
3. فعّل الـ APIs:
   ✅ Places API
   ✅ Geocoding API
   ✅ Google Sheets API
   ✅ Google Drive API
4. أنشئ API Key من Credentials (لـ Google Maps)
5. قيّد الـ API Key على Places API و Geocoding API فقط
```

> Google Maps يعطيك $200 رصيد مجاني شهرياً - كافي لـ 93 متجر + اكتشاف.

### 2. إعداد Google Sheets Credentials (Service Account - الطريقة المُوصى بها)

> ⚠️ **مهم**: استخدم Service Account بدل OAuth2 - أسهل ولا يحتاج callback URL

```
الخطوات:
1. اذهب إلى Google Cloud Console → IAM & Admin → Service Accounts
2. اضغط "Create Service Account"
3. الاسم: "n8n-sheets-access"
4. الوصف: "Service account for n8n Google Sheets access"
5. اضغط "Create and Continue"
6. في الـ Role اختر: "Editor" (أو "Google Sheets API" specific)
7. اضغط "Done"
8. اضغط على الـ Service Account اللي أنشأته
9. اذهب لتاب "Keys"
10. اضغط "Add Key" → "Create New Key" → "JSON"
11. هينزل ملف JSON - ده مفتاحك
12. ⚠️ مهم: افتح Google Sheet وشير مع إيميل الـ Service Account
    (هيكون شكله: n8n-sheets-access@engezna-6edd0.iam.gserviceaccount.com)
```

#### إعداد الـ Credential في n8n:
```
1. في n8n اذهب إلى Credentials → Add Credential
2. ابحث عن "Google Sheets API"
3. اختر "Service Account"
4. الصق محتوى ملف JSON اللي نزلته
5. اضغط "Save"
6. سمّيه: "Google Sheets Service Account"
```

### 2b. إصلاح OAuth2 (لو عايز تستخدم OAuth بدل Service Account)

> الخطأ: "Client authentication failed" - ده بيحصل لأن إعدادات OAuth Client مش صح

```
لإصلاح الخطأ:
1. اذهب إلى Google Cloud Console → APIs & Services → Credentials
2. تأكد إن الـ OAuth Client ID نوعه "Web application" (مش Desktop!)
3. في "Authorized redirect URIs" أضف:
   http://localhost:5678/rest/oauth2-credential/callback
4. لو n8n على domain خارجي أضف كمان:
   https://your-domain.com/rest/oauth2-credential/callback
5. احفظ واستنى دقيقة
6. انسخ Client ID و Client Secret الجديدين
7. في n8n: Credentials → Google Sheets OAuth2
8. الصق الـ Client ID والـ Client Secret
9. اضغط "Connect" وسجل دخول بحساب Google

⚠️ تأكد إن حسابك مضاف كـ Test User في:
   Google Cloud Console → OAuth Consent Screen → Test Users
   (mosab.7ai@gmail.com ✅ مضاف)
```

### 3. Google Sheets

```
1. ارفع ملف Excel المتاجر على Google Sheets
2. تأكد من وجود هذه الشيتات:
   - مطاعم
   - صيدليات
   - سوبرماركت
   - حلويات وكافيهات
   - خضار وفواكه
3. أنشئ شيتات إضافية فارغة:
   - enrichment_results
   - متاجر_مكتشفة
   - not_found_log
   - merged_final
   - تقرير_التحديث
   - سجل_التحديثات
   - all_merchants (انسخ فيه كل المتاجر من كل الشيتات)
4. سجّل الـ Sheet ID (من الـ URL)
5. ⚠️ لو Service Account: شير الـ Sheet مع إيميل الـ SA
```

### 4. n8n Environment Variables

أضف هذه المتغيرات في إعدادات n8n (Settings → Environment Variables):

```
GOOGLE_MAPS_API_KEY=AIza...your_key_here
GOOGLE_SHEET_ID=1HTjVdxyh8Uhz1lMbe6CEvdSHXfzgwmlo96Cz6ZPrHU8
```

---

## طريقة الاستيراد

```
1. افتح n8n
2. اضغط "Import from file"
3. اختر الملف JSON
4. عدّل الـ credentials:
   - لكل Google Sheets node: اختر "Google Sheets Service Account"
   - أو "Google Sheets OAuth2" لو صلحت الـ OAuth
5. تأكد إن Environment Variables مضافة
6. اضغط "Save"
```

---

## WF1: Google Maps Enrichment

### ماذا يفعل؟
- يقرأ المتاجر من Google Sheet
- يفلتر المتاجر اللي عندها بيانات ناقصة (هاتف/عنوان/جوجل ماب)
- يبحث عن كل متجر في Google Places API
- يستخرج التفاصيل الكاملة (Place Details)
- يكتب النتائج في شيت `enrichment_results`
- المتاجر اللي مش لاقيها بتتسجل في `not_found_log`

### البيانات المستخرجة
- العنوان الكامل
- رقم الهاتف
- رابط جوجل ماب
- التقييم وعدد المراجعات
- ساعات العمل
- حالة النشاط (مفتوح/مغلق)
- الإحداثيات (lat/lng)
- الموقع الإلكتروني

### التكلفة
~93 متجر × (Text Search + Place Details) = ~$4.6 (ضمن الرصيد المجاني)

### ملاحظات
- **Batch size**: 5 متاجر في الدفعة الواحدة
- **Rate limit**: 2 ثواني بين كل دفعة
- **شغّله على شيت واحد في المرة** (عدّل اسم الشيت في node "⚙️ City Config")
- ابدأ بـ 5 متاجر للاختبار قبل تشغيل الكل

---

## WF2: New Merchant Discovery

### ماذا يفعل؟
- يبحث في 5 مناطق في بني سويف × 6 فئات = 30 عملية بحث
- يستخدم Google Nearby Search API
- يقارن النتائج مع المتاجر الموجودة (بالاسم + الموقع)
- يستخرج تفاصيل المتاجر الجديدة
- يصنّف الأولوية (عالية/متوسطة/منخفضة) حسب التقييم
- يكتب في شيت `متاجر_مكتشفة`

### مناطق البحث
| المنطقة | الإحداثيات | نصف القطر |
|---------|-----------|----------|
| وسط البلد | 29.0744, 31.0983 | 3 كم |
| شرق النيل | 29.0680, 31.1120 | 3 كم |
| أرض الحرية | 29.0830, 31.0900 | 2 كم |
| بني سويف الجديدة | 29.0500, 31.0800 | 3 كم |
| الواسطى | 29.3333, 31.2000 | 5 كم |

### الفئات
مطاعم، صيدليات، سوبر ماركت، حلويات، كافيهات، خضار وفواكه

### الجدولة
- **يدوي**: في أي وقت

### معايير الأولوية
- **عالية**: تقييم ≥ 4.0 + مراجعات ≥ 20
- **متوسطة**: تقييم ≥ 3.5 أو مراجعات ≥ 10
- **منخفضة**: باقي النتائج

---

## WF3: Data Merge & Export

### ماذا يفعل؟
- يقرأ كل الشيتات الأصلية (5 فئات)
- يقرأ نتائج الإثراء (WF1) والاكتشاف (WF2)
- يدمج البيانات بذكاء:
  - لو الحقل الأصلي فارغ والمُثرى موجود → يستخدم المُثرى
  - لو فيه تعارض → يحتفظ بالأصلي ويسجل التعارض للمراجعة
  - البيانات الإضافية (تقييم، ساعات عمل) بتتضاف دايماً
- يتحقق من صحة البيانات (أرقام هواتف، روابط)
- يكتب النتائج النهائية في `merged_final`
- يولّد تقرير بالإحصائيات

### الجدولة
- **يدوي**: بعد تشغيل WF1 + WF2

### قواعد التحقق
- **الهاتف**: صيغة مصرية (01xxxxxxxxx أو 08xxxxxxx)
- **الروابط**: تبدأ بـ https://
- **الاسم**: لازم يكون موجود (الصفوف الفارغة بتتحذف)

---

## خطة التشغيل

### المرة الأولى
```
1. إعداد Google Cloud + Service Account + API Key
2. شير الـ Google Sheet مع إيميل الـ Service Account
3. استيراد الـ 3 workflows في n8n
4. إعداد الـ credentials والـ environment variables
5. WF1: شغّل على شيت "مطاعم" (اختبار على 5 أولاً)
6. WF1: شغّل على باقي الشيتات واحد واحد
7. WF2: شغّل يدوي (اكتشاف متاجر جديدة)
8. WF3: شغّل للتجميع النهائي
9. راجع شيت "merged_final" وصدّره كـ Excel
```

### التحديث الدوري
```
- أسبوعياً: WF2 شغّل يدوي (اكتشاف جديد)
- شهرياً: WF3 يدوي (تجميع)
- عند الحاجة: WF1 يدوي لإعادة إثراء بيانات محددة
```

---

## التكلفة الإجمالية

| البند | التكلفة |
|-------|---------|
| Google Maps API | $0 (ضمن $200 المجاني) |
| Google Sheets | $0 |
| n8n (self-hosted) | $0 |
| **الإجمالي** | **$0** |

---

## استكشاف الأخطاء

### "Client authentication failed" (OAuth2)
- **السبب**: إعدادات OAuth Client غير صحيحة
- **الحل**:
  1. تأكد إن نوع الـ Client هو "Web application" (مش Desktop)
  2. أضف `http://localhost:5678/rest/oauth2-credential/callback` في Authorized Redirect URIs
  3. أو **استخدم Service Account** بدل OAuth2 (أسهل وأثبت)

### "OVER_QUERY_LIMIT"
- وصلت لحد الاستخدام → انتظر ساعة أو زوّد الـ Wait بين الـ batches

### "REQUEST_DENIED"
- الـ API Key غلط أو الـ API مش مفعلة → راجع Google Cloud Console

### "ZERO_RESULTS"
- المتجر مش على جوجل ماب → هيتسجل في `not_found_log` ويحتاج بحث يدوي

### Google Sheets "Permission denied"
- **Service Account**: تأكد إنك شيرت الـ Sheet مع إيميل الـ SA
- **OAuth**: الـ credential محتاج تجديد → اعمل re-authenticate في n8n

### "Google hasn't verified this app"
- عادي لو الـ app في Testing mode - اضغط "Continue"
- تأكد إن حسابك مضاف كـ Test User في OAuth consent screen

---

## ملفات الـ Workflows

```
project-management/automation/
├── wf1_google_maps_enrichment.json    # إثراء البيانات
├── wf2_new_merchant_discovery.json    # اكتشاف متاجر جديدة
├── wf3_data_merge_export.json         # تجميع وتصدير
├── n8n_workflow.json                  # Knowledge Bot (موجود سابقاً)
├── MERCHANT_DATA_WORKFLOWS.md         # هذا الملف
└── TELEGRAM_BOT_SETUP.md             # إعداد بوت تيليجرام
```
