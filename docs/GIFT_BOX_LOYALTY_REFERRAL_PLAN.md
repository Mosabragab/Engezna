# خطة تنفيذ نظام صندوق الهدايا + الولاء + الريفيرال — Engezna

**تاريخ الإعداد:** ٢١ أبريل ٢٠٢٦
**الإصدار:** 2.0 (تحول من كاش باك إلى Gift Box)
**الحالة:** مرجع تنفيذي — يُناقش قبل البدء
**المنطقة التجريبية:** بني سويف فقط (Pilot)

---

## ⚠️ تعليمات عامة لكلود كود

أنت مُكلّف بتنفيذ نظام صندوق الهدايا (Gift Box) ونقاط الولاء والريفيرال لتطبيق Engezna. هذا الملف هو المرجع الوحيد والنهائي لكل القرارات. لا تجتهد أو تفترض — إذا وجدت تعارضًا مع أي ملف آخر في المشروع، هذا الملف يتقدّم.

**قواعد صارمة:**
1. لا تبدأ أي كود قبل مناقشة خطة التنفيذ مع المستخدم والحصول على موافقته.
2. راجع قاعدة البيانات أولًا (المرحلة 0) وأعطِ المستخدم SQL للتشغيل على Supabase قبل التنفيذ.
3. راجع Prettier قبل أي commit لضمان مرور الفرع من الاختبار.
4. كل مرحلة تُختبر وتُراجع قبل الانتقال للتالية.
5. استخدم كلاس `Money` الموجود في `src/lib/finance/money.ts` لكل الحسابات المالية — لا تستخدم float أبدًا.
6. كل كود مالي يمر في settlement engine الحالي في `supabase/migrations/20251225100000_financial_settlement_engine.sql` — لا تعدّله بدون إشارة صريحة.
7. كل عملية منح هدية لها سطر واحد في `gift_financial_log` — مهما كانت صغيرة.
8. لا تستخدم float أو Number لأي مبلغ — Money class فقط (piasters).
9. كل استدعاء خارجي (API، Cron) يُحاط بـ `try/catch` + logging في `gift_financial_log`.

**قاعدة ذهبية:** "كل جنيه يخرج من ميزانية التسويق لازم يُسجّل في `gift_financial_log` في نفس المعاملة (transaction)."

---

## 🎁 فلسفة صندوق الهدايا

بدلًا من كاش باك بسيط يبدو رخيصًا عند أرقام صغيرة (٣ ج.م مثلًا)، نستخدم **صندوق هدايا** يفتحه العميل ليكتشف ما بداخله. القيمة المُدركة (Perceived Value) أعلى بكثير من القيمة المالية الفعلية، وتجربة "فتح الصندوق" نفسها محفزّة عاطفيًا.

**المبادئ الأساسية:**
- **مفاجأة دائمًا:** العميل لا يعرف ما بداخل الصندوق قبل فتحه.
- **تنوع في الهدايا:** مش دايمًا فلوس — أحيانًا توصيل مجاني، نقاط ولاء، كوبون شريك، هدية ذهبية.
- **ندرة مُتحكم بها:** الصناديق الذهبية نادرة — تُخلق FOMO حقيقي.
- **انضباط مالي صارم:** ميزانية شهرية ثابتة لا تتجاوز.
- **إنصاف العميل:** كل عميل يحصل على فرصة عادلة حسب سلوكه، بدون تمييز عشوائي.
- **مسار شريك واضح:** التجار يموّلون هداياهم الخاصة ويظهرون في صناديق الترويج المتقاطع.

---

## 1. النموذج المالي — القرارات النهائية

### 1.1 رسوم المعالجة (Service/Processing Fee)

| البند | القيمة |
|-------|--------|
| النسبة | **٣٪** على كل طلب |
| التطبيق | على الأونلاين + الكاش عند التوصيل (COD) |
| التسمية في الـ UI | "رسوم معالجة" (Processing Fee) |
| الحالة عند الإطلاق | **مُعطّلة** — تُفعّل لاحقًا من داشبورد الإدارة |
| التحكم | الأدمن يقدر يُفعّل/يُعطّل + يعدّل النسبة من الداشبورد |

**مهم:** راجع صفحة الترحيب `/welcome` وصفحة `/terms` وأي صفحة تسويقية — تأكد من عدم وجود أي ذكر لـ "٠٪ رسوم خدمة" أو "بدون رسوم إضافية". إذا وُجد، احذفه أو عدّله لـ "رسوم معالجة بسيطة" — أو أخفيها حتى يُفعّل الزر.

**تطبيق تقني:**
- جدول `platform_settings` يحتوي مفتاح `processing_fee_enabled` (bool, default false) ومفتاح `processing_fee_percent` (numeric, default 3.0).
- الـ checkout يقرأ القيمتين مع كل طلب.
- الـ settlement engine يحسم الرسم تلقائيًا إذا كان مُفعّلًا.

### 1.2 ميزانية التسويق الشهرية (Marketing Budget)

**الميزانية عند الإطلاق (Pilot بني سويف): ٢٠,٠٠٠ ج.م / شهر**

تُقسَّم كالآتي:

| البند | النسبة | المبلغ الشهري |
|-------|--------|----------------|
| Mystery Box (صناديق المفاجآت) | ٣٠٪ | ٦,٠٠٠ ج.م |
| Stamp Card (بطاقة الختم + الصندوق الذهبي) | ٢٥٪ | ٥,٠٠٠ ج.م |
| Referral (الريفيرال) | ٢٠٪ | ٤,٠٠٠ ج.م |
| Win-back (استعادة العملاء) | ١٥٪ | ٣,٠٠٠ ج.م |
| Welcome (ترحيب العملاء الجدد) | ١٠٪ | ٢,٠٠٠ ج.م |

**مبادئ الميزانية:**
- كل دلو (bucket) له حد شهري صارم في جدول `retention_settings`.
- إذا امتلأ الدلو قبل نهاية الشهر → المُحرّك يوقف الدلو تلقائيًا ويُبلِغ الأدمن.
- الأدمن يقدر يرفع/يخفض الحد من داشبورد الإدارة في أي لحظة.
- بداية كل شهر، الـ Cron يُعيد الحسابات لصفر.
- **التجاوز المسموح:** ٥٪ زيادة قبل الإيقاف الإجباري — حماية ضد race conditions.

### 1.3 من يتحمل تكلفة الهدايا؟

| نوع الهدية | المُموّل |
|------------|---------|
| Mystery Box, Stamp Card, Welcome, Win-back, Referral | إنجزنا (ميزانية التسويق) |
| Partner Gifts (هدايا شركاء) | التاجر (الشريك) بالكامل |
| Loyalty Boost (مضاعفة النقاط) | إنجزنا (تكلفة افتراضية) |

**السيناريو A** (إنجزنا تتحمل ١٠٠٪) مطبّق على كل الهدايا الممولة من إنجزنا. التاجر لا يتأثر في تسويته إطلاقًا — يحصل على كامل قيمة الطلب.

### 1.4 ربط Money class ونظام التسويات

- كل منح هدية = transaction واحد يتضمن:
  1. تحديث `gift_financial_log` (مبلغ التكلفة بالـ piasters).
  2. تحديث `retention_settings.bucket_spent_current_month`.
  3. تحديث `gift_box_entries.status = 'granted'`.
- عند استخدام الهدية في طلب → transaction ثاني:
  1. تحديث `gift_financial_log` (مبلغ التحرير).
  2. تحديث `orders.discount_amount`.
  3. ربط `order_id` بـ `gift_box_entries.used_order_id`.

---

## 2. أنواع الهدايا (Gift Types)

قاعدة البيانات تدعم ٧ أنواع موحّدة:

| النوع | المفتاح (enum) | الوصف | التكلفة النموذجية |
|------|----------------|-------|-------------------|
| كوبون خصم بقيمة ثابتة | `discount_code` | خصم X جنيه من الطلب | ٥-٢٠ ج.م |
| كوبون خصم بنسبة | `discount_percent` | خصم X% (بحد أقصى) | ١٠-٢٥٪ (حد ٢٠ ج.م) |
| توصيل مجاني | `free_delivery` | إلغاء رسوم التوصيل | متوسط ١٠ ج.م |
| هدية شريك | `partner_gift` | عرض من تاجر ترويجي | ممول من التاجر |
| مضاعفة نقاط ولاء | `loyalty_boost` | ×٢ أو ×٣ نقاط لفترة | غير نقدي مباشر |
| صندوق مفاجأة | `mystery` | يحتوي على أحد الأنواع السابقة عشوائيًا | متغير |
| الصندوق الذهبي | `golden_box` | مكافأة بطاقة الختم (حد ١٠٠ ج.م) | ٥٠ ج.م افتراضي |

**ملاحظات:**
- كل هدية لها تاريخ انتهاء صلاحية افتراضي ٧ أيام (قابل للتخصيص لكل قاعدة).
- الهدايا غير قابلة للتحويل بين الحسابات (باستثناء Gift-it Forward عبر آلية مُحددة).
- الهدايا غير قابلة للتجميع على نفس الطلب (قاعدة "خصم واحد لكل طلب" — انظر §11).

---

## 3. Mystery Box (صندوق المفاجآت)

### 3.1 الفكرة

العميل يفتح صندوقًا افتراضيًا (مع أنيميشن Framer Motion) ليكتشف هديته. توزيع الاحتمالات خاضع لـ **weighted random** يتحكم فيه الأدمن.

### 3.2 التوزيع الافتراضي (Weights)

| الهدية | الوزن | الاحتمال | التكلفة المتوقعة |
|--------|-------|----------|-------------------|
| خصم ٥ ج.م | 40 | ٤٠٪ | ٢ ج.م متوسط |
| خصم ١٠ ج.م | 25 | ٢٥٪ | ٢.٥ ج.م |
| توصيل مجاني | 20 | ٢٠٪ | ٢ ج.م |
| خصم ١٥ ج.م | 10 | ١٠٪ | ١.٥ ج.م |
| خصم ٢٠ ج.م (نادر) | 4 | ٤٪ | ٠.٨ ج.م |
| صندوق ذهبي (نادر جدًا) | 1 | ١٪ | ٠.٥ ج.م |

**تكلفة متوقعة لكل صندوق: ~٩ ج.م** (قابلة للتعديل من الأدمن).

### 3.3 متى يُمنح صندوق المفاجآت؟

- **Welcome Box** لكل عميل جديد بعد أول طلب ناجح (مصدر: welcome bucket).
- **Win-back Box** بعد ١٤ يومًا بدون طلب (مصدر: win-back bucket).
- **عبر Rule Engine** أي قاعدة مخصصة يضعها الأدمن.

### 3.4 حدود الأمان

- حد شهري: ٦,٠٠٠ ج.م (٣٠٪ من الميزانية).
- حد العميل الواحد: صندوق واحد كل ٧ أيام كحد أقصى (تُخصّص في القاعدة).
- الحد الأقصى الإجمالي لأي هدية داخل الصندوق: **٢٠ ج.م** (حتى لا يهرب نادر يُفاجئ الميزانية).

### 3.5 UI/UX

- أيقونة صندوق في الصفحة الرئيسية (تهتز خفيف عند وجود صندوق غير مفتوح).
- عند الضغط: أنيميشن فتح (٢-٣ ثوانٍ) ثم كشف الهدية.
- Confetti animation عند الهدايا النادرة (≥١٥ ج.م أو golden_box).
- زر "استخدم الآن" يأخذ العميل لصفحة المتاجر أو المتجر المُحدد.

---

## 4. Partner Gifts (هدايا الشركاء)

### 4.1 الفكرة

التاجر (الشريك) يقدر يرفع عرضًا ترويجيًا يظهر في صناديق هدايا العملاء — إعلان داخل المنتج. إنجزنا لا تدفع شيئًا، التاجر يموّل الهدية بالكامل.

### 4.2 آلية العمل

1. التاجر يدخل `/provider/gifts/new` ويكتب:
   - نوع الهدية (خصم ثابت، خصم نسبة، توصيل مجاني).
   - قيمة الهدية.
   - عدد الصناديق المتاحة (inventory).
   - فترة الحملة (من-إلى).
   - الشروط (حد أدنى للطلب، أول طلب فقط، إلخ).
2. التاجر يضع ميزانية مُلتزم بها (deposit) تُحجز من حسابه.
3. الأدمن يراجع ويوافق (`gift_partner_offers.status = 'approved'`).
4. الهدية تدخل pool التوزيع للعملاء في بني سويف.
5. عند كل منح → يُخصم المبلغ من deposit التاجر.
6. إذا استخدم العميل الهدية في طلب للتاجر → سطر واحد في `gift_financial_log` مع التاجر كـ funder.

### 4.3 حدود الأمان

- التاجر ملزم بإيداع deposit مساوٍ لـ ١٠٠٪ من الميزانية قبل التفعيل.
- الأدمن يقدر يرفض/يوقف حملة في أي لحظة.
- التاجر لا يقدر يعدّل حملة نشطة — يُوقفها ويرفع جديدة.
- إذا استنفذ التاجر deposit → الحملة تُوقف تلقائيًا.

### 4.4 UI

- داشبورد التاجر → قسم "هدايا وعروض" → تاريخ الحملات + الميزانية المُستنفذة.
- العميل يرى شارة "هدية من متجر X" داخل الصندوق لتعزيز الثقة.

---

## 5. Stamp Card (بطاقة الختم)

### 5.1 الفكرة

كل طلب ناجح للعميل = ختم واحد. بعد ٤ أختام → صندوق ذهبي (Golden Box) يحتوي على هدية أكبر.

### 5.2 القواعد

| البند | القيمة |
|-------|--------|
| عدد الأختام للصندوق الذهبي | ٤ |
| الحد الأدنى للطلب المؤهل للختم | ٥٠ ج.م |
| قيمة الصندوق الذهبي الافتراضية | ٥٠ ج.م |
| الحد الأقصى للصندوق الذهبي (حماية) | **١٠٠ ج.م** (لا يتجاوز أبدًا) |
| مدة صلاحية البطاقة | ٦٠ يومًا من أول ختم |
| عدد البطاقات النشطة في نفس الوقت | ١ فقط |

**ملاحظات:**
- الطلب المُلغى لا يُحتسب ختم.
- الطلب المُسترد (refund) → يُحذف الختم (انظر §13 Clawback).
- عند اكتمال ٤ أختام → يُنشأ صندوق ذهبي تلقائيًا ويُرسل إشعار FCM.

### 5.3 UI

- صفحة `/rewards/stamp-card` تعرض:
  - شكل بطاقة بـ ٤ خانات — الأختام تظهر بألوان الهوية (Engezna Blue).
  - الوقت المتبقي قبل انتهاء البطاقة.
  - عدد الطلبات المطلوبة للختم التالي.
- الصفحة الرئيسية → شريط تقدم مصغر مع عدد الأختام الحالي.

### 5.4 حدود الأمان

- حد شهري للصندوق الذهبي: ٥,٠٠٠ ج.م (٢٥٪ من الميزانية).
- لا يمكن للعميل الحصول على أكثر من ٣ صناديق ذهبية في الشهر الواحد (في حالة طلبات كثيفة).

---

## 6. Micro-Moments (اللحظات الذهبية)

### 6.1 الفكرة

حملات يدوية (Manual Triggers) يُطلقها الأدمن في لحظات معيّنة — بدون APIs خارجية.

### 6.2 أمثلة الحملات

| الحملة | المُحفّز | الهدية النموذجية |
|--------|----------|-------------------|
| "يوم ممطر" | الأدمن يفعّل يدويًا | توصيل مجاني لمدة ٣ ساعات |
| "ماتش مصر" | الأدمن يفعّل يدويًا | خصم ٢٠ ج.م لمدة ٥ ساعات |
| "عيد ميلادك" | تاريخ الميلاد في profile | خصم ٢٠ ج.م صالح ٧ أيام |
| "عيد الفطر / الأضحى" | الأدمن يفعّل يدويًا | صندوق مفاجأة مُحسّن |
| "مناسبة مخصصة" | الأدمن يكتب اسم وهدية | حسب الأدمن |

**لا يوجد APIs طقس/رياضة/أخبار** — كل شيء manual من داشبورد الأدمن.

### 6.3 آلية العمل

1. الأدمن يفتح `/admin/gifts/campaigns/new`.
2. يكتب:
   - اسم الحملة (AR/EN).
   - الشريحة المستهدفة (كل العملاء، شريحة سلوكية، منطقة).
   - نوع الهدية والقيمة.
   - فترة التفعيل (من-إلى، بالساعة).
   - الحد الأقصى للصناديق.
   - الميزانية الإجمالية.
3. الأدمن يضغط "تفعيل" → الحملة تبدأ فورًا.
4. Cron يُطفئها تلقائيًا في الوقت المحدد.
5. لوحة متابعة real-time: عدد الصناديق المُستخدمة / المتبقي / التكلفة الفعلية.

### 6.4 عيد الميلاد (آلي)

- الوحيدة الآلية — لأنها تعتمد على بيانات العميل نفسه.
- الـ Cron يفحص كل صباح العملاء المُصادف عيد ميلادهم، ويُرسل صندوق مُحسّن.
- مصدر الميزانية: win-back bucket (مخصص لزيادة الولاء).

### 6.5 حدود الأمان

- كل حملة لها ميزانية خاصة لا تتجاوزها.
- الأدمن يقدر يوقف الحملة في أي ثانية.
- إشعار تلقائي للأدمن عند ٨٠٪ استهلاك الميزانية.

---

## 7. Gift-it Forward (أهدها لصديق)

### 7.1 الفكرة

آلية فيروسية: العميل يقدر يُهدي أحد كوبوناته لصديق (عبر WhatsApp link). الصديق يفتح اللينك → يسجّل في إنجزنا إذا لم يكن مسجلًا → يستلم الهدية.

### 7.2 الشروط

- العميل يقدر يُهدي فقط كوبونات `discount_code` أو `discount_percent` (ليس mystery، ليس partner_gift).
- كل عميل يقدر يُرسل حتى ٣ هدايا في الأسبوع.
- الهدية لا تُعاد إذا رفض الصديق قبولها بعد ٤٨ ساعة (تُعاد للمرسل).
- المُرسل يحصل على **١٠ نقاط ولاء** كمكافأة عند تفعيل الهدية من المستلم.
- المستلم الجديد (ليس مسجلًا) يحصل على الهدية + صندوق ترحيب (welcome box).

### 7.3 آلية مكافحة الاحتيال

- الهدية مرتبطة بجهاز/حساب المستلم بعد الفتح الأول.
- الصديق لا يقدر يُعيد إهداء الهدية.
- النظام يتتبع IP + Device ID لمنع إنشاء حسابات متعددة.
- إذا استخدم المستلم الهدية ثم طلب refund كامل → يُحذف الختم من المرسل.

### 7.4 UI

- من صفحة الصندوق → زر "أهدها لصديق" (WhatsApp icon).
- لينك فريد `engezna.app/gift/{uuid}` يفتح صفحة استلام.
- صفحة الاستلام: شكل صندوق جذاب + زر "سجّل واستلم" أو "افتح الهدية".

---

## 8. Behavioral Targeting + Rule Engine

### 8.1 الشرائح السلوكية (Customer Segments)

يوميًا عبر Cron، نُصنّف كل عميل إلى شريحة واحدة:

| الشريحة | المفتاح | التعريف |
|---------|---------|---------|
| عميل جديد | `new_user` | ٠ طلبات أو مسجل أقل من ٧ أيام |
| شمبانزي (فعّال جدًا) | `champion` | ≥١٠ طلبات في آخر ٣٠ يوم + تقييم متوسط ≥٤ |
| متوسط النشاط | `regular` | ٣-٩ طلبات في آخر ٣٠ يوم |
| نائم (معرّض للفقد) | `at_risk` | لم يطلب من ١٤-٢٩ يوم |
| فاقد (مفقود) | `churned` | لم يطلب منذ ٣٠+ يوم |
| باحث عن العروض | `bargain_hunter` | ≥٦٠٪ من طلباته استخدمت خصم |
| متوسط القيمة مرتفع | `high_value` | متوسط قيمة طلب ≥٢٥٠ ج.م |
| جغرافي نائي | `remote_area` | يطلب في منطقة حول بني سويف الخارجية |
| مُكتشف (لا تصنيف) | `undefined` | لم تُحسم بياناته بعد |

**الجدول المستهدف:** `customer_segments_daily` (snapshot يومي، لا يتغير بأثر رجعي).

### 8.2 محرك القواعد (Rule Engine)

جدول `gift_rules` يحتوي قواعد JSONB:

```json
{
  "trigger": "order_completed",
  "conditions": {
    "all": [
      {"fact": "segment", "op": "eq", "value": "at_risk"},
      {"fact": "days_since_last_order", "op": ">=", "value": 14},
      {"fact": "total_orders", "op": ">=", "value": 3}
    ]
  },
  "action": {
    "gift_type": "mystery",
    "bucket": "win_back",
    "budget_cap_per_day": 200,
    "expiry_days": 7
  }
}
```

**Triggers المدعومة:**
- `order_completed` — عند اكتمال طلب (delivered + payment_completed).
- `order_cancelled` — عند إلغاء.
- `user_registered` — تسجيل جديد.
- `user_verified_email` — تأكيد البريد.
- `daily_segment_update` — صباحًا بعد حساب الشرائح.
- `manual_campaign` — ضغط زر من الأدمن.
- `referral_completed` — إتمام ريفيرال ناجح.

**Facts المتاحة:**
- `segment`, `total_orders`, `days_since_last_order`, `total_spent`, `avg_order_value`, `city`, `governorate`, `has_used_gift_before`, `referrals_count`, `loyalty_tier`, `stamp_count`, `age_days`.

**Operators:**
- `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `between`.

**Aggregators:**
- `all` (AND), `any` (OR), `none` (NOT).

### 8.3 داشبورد القواعد

- `/admin/gifts/rules` → قائمة القواعد.
- صفحة إنشاء قاعدة: محرر visual بسيط + محرر JSON متقدم.
- كل قاعدة يمكن تفعيلها/إيقافها.
- إحصائيات: عدد المرات التي طُبّقت + تكلفة إجمالية.

---

## 9. الريفيرال (Referral) — 20 ج.م كهدية

### 9.1 القواعد الأساسية

| البند | القيمة |
|-------|--------|
| المكافأة للمُحيل (referrer) | **٢٠ ج.م داخل صندوق هدايا** (ليس رصيد نقدي مباشر) |
| المكافأة للمُحال إليه (referee) | صندوق ترحيب (welcome box) |
| شرط أول طلب للمُحال إليه | **≥٣٠٠ ج.م** ومكتمل ومُدفوع |
| تأكيد البريد الإلكتروني | **مطلوب** قبل التفعيل |
| عدد الريفيرالات/شهر | ١٠ كحد أقصى للمُحيل الواحد |
| صلاحية الكود | دائم للمُحيل |
| صلاحية الصندوق بعد المنح | ٧ أيام |

### 9.2 ملاحظات ثقافية مهمة

- **لا نستخدم كشف العنوان المتكرر** كوسيلة احتيال — المنزل المصري عائلي وممكن تلاقي ١٠ أفراد في منزل واحد.
- **لا نستخدم OTP هاتفي** — تأكيد البريد + حد ٣٠٠ ج.م للطلب الأول يوفّر حماية اقتصادية كافية.
- نستخدم: IP rate limiting، Device fingerprinting (للمتصفح)، وحجم الطلب الأول.

### 9.3 رسائل التأكيد

**إيميل تأكيد التسجيل للمُحال إليه:**
```
أهلًا بك في إنجزنا!
صديقك {referrer_name} قدّم لك دعوة خاصة.
اضغط على الرابط لتأكيد بريدك وفتح حسابك:
{verification_link}
بعد تأكيد بريدك وإتمام أول طلب ≥٣٠٠ ج.م، سنرسل لكما هدية ترحيب!
```

**إيميل تأكيد الريفيرال للمُحيل:**
```
مبروك! صديقك {referee_name} أتمّ أول طلب بنجاح.
فتحنا لك صندوق هدية بقيمة ٢٠ ج.م في تطبيق إنجزنا.
افتح التطبيق لفتح الصندوق قبل انتهاء صلاحيته بعد ٧ أيام.
```

### 9.4 حدود الأمان

- حد شهري: ٤,٠٠٠ ج.م (٢٠٪ من الميزانية) → يعني أقصى ٢٠٠ ريفيرال ناجح شهريًا.
- عند امتلاء الدلو → الريفيرال يعلّق مؤقتًا، المُحيل يتلقى رسالة "مكافأتك ستصل الشهر القادم".

---

## 10. نظام نقاط الولاء (Loyalty Points)

### 10.1 كيفية الكسب

- ١ نقطة لكل ١٠ ج.م من قيمة الطلب (بعد الخصومات).
- مكافآت إضافية: تقييم ٥ نجوم (+٥ نقاط)، تسجيل عيد ميلاد (+٢٠ نقطة مرة واحدة)، Gift-it Forward ناجح (+١٠ نقاط).
- مضاعفات من قواعد Rule Engine (×٢، ×٣) لفترات محدودة.

### 10.2 المستويات (Tiers)

| المستوى | النقاط | المزايا |
|---------|--------|---------|
| Bronze (برونزي) | ٠-٤٩٩ | الأساسيات |
| Silver (فضّي) | ٥٠٠-١٤٩٩ | احتمال صندوق مفاجأة أعلى ١٠٪ |
| Gold (ذهبي) | ١٥٠٠-٤٩٩٩ | توصيل مجاني مرّتين/شهر |
| Platinum (بلاتيني) | ٥٠٠٠+ | صندوق شهري مضمون + أولوية دعم |

### 10.3 استخدام النقاط

- ١٠٠ نقطة = كوبون خصم ٥ ج.م (قابل للاستبدال من `/rewards/points`).
- لا تنتهي النقاط إلا بعد ٩٠ يومًا من آخر نشاط (طلب أو تسجيل دخول).
- النقاط لا تُحوّل لفلوس نقدية.
- Clawback: عند refund كامل → تُسحب النقاط المكتسبة من نفس الطلب.

### 10.4 جداول

- `loyalty_points` (الرصيد الحالي لكل عميل).
- `loyalty_transactions` (تاريخ كل عملية إضافة/خصم).
- `loyalty_tiers_cache` (عمود في profiles للأداء).

---

## 11. سياسة الخصم الواحد (One Discount Per Order)

### 11.1 القاعدة الذهبية

**لا يمكن تجميع أكثر من خصم واحد على نفس الطلب.** العميل يختار **إما** كوبون خصم، **أو** نقاط ولاء، **أو** هدية شريك.

### 11.2 الاستثناءات

- توصيل مجاني **يمكن** جمعه مع كوبون خصم (لأن رسوم التوصيل بند منفصل).
- نقاط ولاء للطلب (earn) لا تتأثر — تُكسب حتى لو استخدم خصم.

### 11.3 الحد الأقصى للخصم

**٢٠٪ من قيمة الطلب** كحد أقصى لأي خصم — لضمان هامش ربح صحي للتاجر وإنجزنا.

### 11.4 UI/UX

- صفحة الـ checkout تعرض قسم "الخصم":
  - حقل كود خصم.
  - أو قائمة الهدايا المتاحة.
  - أو زر "استخدم نقاطي".
- عند اختيار أحدها → باقي الخيارات تُعطّل مع رسالة "خصم واحد لكل طلب".

---

## 12. سياسة الاسترداد والاستعادة (Refund & Clawback)

### 12.1 الاسترداد الجزئي

- الهدية المُستخدمة في الطلب لا تُعاد.
- النقاط المكتسبة من الطلب تُخصم نسبيًا:
  ```
  points_to_clawback = original_points × (refund_amount / order_total)
  ```
- الختم على بطاقة الختم يبقى (ما زال الطلب ناجحًا).

### 12.2 الاسترداد الكامل

- الهدية المُستخدمة → يُحسم `gift_financial_log` (سطر نوع `clawback`).
- النقاط المكتسبة → تُسحب بالكامل.
- الختم على بطاقة الختم → يُحذف.
- إذا كان الطلب هو المُحفّز لإتمام بطاقة ختم → الصندوق الذهبي الناتج يُلغى إذا لم يُستخدم بعد.
- إذا استُخدم الصندوق الذهبي → يُسجّل خسارة ويُخصم من ميزانية الشهر الحالي.

### 12.3 Cron للـ Clawback

- Cron كل ١٥ دقيقة يفحص refunds جديدة ويُطبّق clawback تلقائيًا.
- كل clawback يُسجّل في `gift_financial_log` مع `transaction_type = 'clawback'`.
- الأدمن يقدر يعكس clawback يدويًا (override) في حالات استثنائية.

---

## 13. الإشعارات والتذكيرات (Notifications)

### 13.1 الأنواع

| الحدث | القناة | التوقيت |
|------|-------|---------|
| منح صندوق هدية | Push + In-app | فورًا |
| تذكير قبل انتهاء الصلاحية | Push | ٤٨ ساعة قبل |
| تذكير أخير | Push | ٢ ساعة قبل |
| اكتمال بطاقة ختم | Push + In-app | فورًا |
| ريفيرال ناجح (للمُحيل) | Push + Email | فورًا |
| ترقية مستوى ولاء | Push + In-app | فورًا |
| حملة Micro-Moment نشطة | Push | بداية الحملة |

### 13.2 جدول الإشعارات

- `customer_notifications` (موجود) — نُضيف أنواعًا جديدة للـ enum.
- كل إشعار يحتوي deep link للصفحة ذات الصلة.
- دعم AR/EN كامل (أعمدة `body_ar`, `body_en`).

### 13.3 Opt-out

- العميل يقدر يوقف إشعارات تسويقية من `/profile/notifications`.
- إشعارات الطلبات والريفيرال لا تُوقف (معاملات).

---

## 14. فترة السماح للتجار (Grace Period)

### 14.1 الفكرة

كل تاجر جديد له فترة سماح ٦ أشهر بعمولة ٠٪. الأدمن يقدر يعدّل الفترة لكل تاجر على حدة.

### 14.2 التطبيق

- عمود `grace_period_months` في جدول `providers` (default 6).
- عمود `grace_period_start_date` (يُضبط عند approved).
- الـ settlement engine يفحص هذا لكل تاجر عند الحساب.
- بعد انتهاء الفترة → العمولة تُطبّق تلقائيًا (٥-٧٪ حسب الإعداد).

### 14.3 داشبورد الأدمن

- `/admin/providers/[id]` → قسم "فترة السماح":
  - تاريخ البدء.
  - عدد الشهور المتبقية.
  - زر "تمديد" / "إنهاء الآن".
- كل تعديل يُسجّل في `permission_audit_log`.

---

## 15. اشتراكات التحليلات للتجار (Provider Analytics Subscriptions)

### 15.1 الخطط

| الخطة | السعر الشهري | المزايا |
|-------|---------------|---------|
| Basic (مجانية) | ٠ ج.م | تقارير مبسطة (إيرادات شهر، عدد طلبات، متوسط تقييم) |
| Pro | ٢٩٩ ج.م | تحليلات متقدمة (Cohort analysis، ساعات الذروة، أفضل المنتجات، مقارنة مع منافسين) |
| Elite | ٥٩٩ ج.م | كل Pro + تقارير ديموغرافية + توقعات AI + دعم أولوية |

### 15.2 التطبيق

- جدول `provider_subscriptions` (tier، تاريخ بداية ونهاية، auto-renew).
- صفحة `/provider/analytics` تتحقق من الـ tier قبل عرض كل widget.
- الاشتراك يُدفع شهريًا عبر الخصم من التسويات.
- الأدمن يقدر يمنح Pro/Elite مجانًا لتاجر معيّن (عرض ترويجي).

### 15.3 UI

- `/provider/billing/subscription` → قائمة الخطط.
- Widgets مدفوعة تعرض preview + زر "ترقية لـ Pro".
- Upgrade path واضح: Basic → Pro (فيه زر "جرب ٣٠ يوم مجانًا").

---

## 16. صفحة ERP (إدارة الموارد)

### 16.1 الهدف

صفحة داخلية للأدمن (`/admin/erp`) تعرض صورة شاملة عن الوضع المالي والتشغيلي.

### 16.2 الأقسام

#### 16.2.1 ميزانية التسويق
- استهلاك كل دلو (Mystery, Stamp, Referral, Win-back, Welcome).
- التوقع حتى نهاية الشهر.
- مقارنة مع الشهر السابق.

#### 16.2.2 مصاريف تشغيلية
- SaaS fees (Vercel, Supabase, Deepgram, OpenAI, FCM).
- رواتب الفريق (input يدوي).
- مكاتب + أدوات.
- مصاريف قانونية.
- جدول `operational_expenses` (category، amount، date، notes).

#### 16.2.3 الإيرادات
- عمولات التجار (بعد grace period).
- رسوم المعالجة (إذا مُفعّلة).
- اشتراكات التحليلات.
- Partner Gifts deposits (تدفق نقدي).

#### 16.2.4 التدفق النقدي (Cash Flow)
- رسم بياني شهري (آخر ١٢ شهر).
- مؤشر Burn Rate.
- Runway تقديري.

#### 16.2.5 KPIs
- MAU / WAU / DAU.
- Retention rate (7d, 30d).
- CAC (Customer Acquisition Cost).
- LTV (Lifetime Value) تقريبي.
- متوسط قيمة الطلب.
- Conversion rate (new → first order).

### 16.3 التصدير

- تصدير Excel شهري لكل قسم.
- تصدير PDF للتقرير التنفيذي الشهري.

---

## 17. لوحة إدارة الأدمن (Admin Dashboard Integration)

### 17.1 الصفحات الجديدة

- `/admin/gifts` — نظرة عامة على النظام.
- `/admin/gifts/rules` — محرك القواعد.
- `/admin/gifts/campaigns` — حملات Micro-Moments.
- `/admin/gifts/partners` — مراجعة وموافقة هدايا الشركاء.
- `/admin/gifts/budget` — ميزانية التسويق والدلاء.
- `/admin/gifts/analytics` — تحليلات النظام.
- `/admin/erp` — صفحة ERP الشاملة.

### 17.2 الصلاحيات

- `super_admin` — وصول كامل.
- `finance` — قراءة فقط على الميزانية + ERP.
- `general_moderator` — تفعيل/إيقاف حملات (بدون تعديل الميزانية).
- `support_agent` — قراءة فقط (لدعم العملاء).

كل صلاحية تُضاف لجدول `permissions` عبر migration.

### 17.3 Audit Log

- كل تعديل على قاعدة، ميزانية، حملة، أو هدية شريك يُسجّل في `permission_audit_log`.
- عرض `last_modified_by`, `timestamp`, `old_value`, `new_value`.

---

## 18. قاعدة البيانات (Database Schema)

### 18.1 الجداول الجديدة (11 جدول)

#### `gifts`
```sql
CREATE TYPE gift_type AS ENUM (
  'discount_code', 'discount_percent', 'free_delivery',
  'partner_gift', 'loyalty_boost', 'mystery', 'golden_box'
);

CREATE TYPE gift_source AS ENUM (
  'welcome', 'win_back', 'referral', 'stamp_card',
  'mystery_box', 'partner', 'manual_campaign', 'gift_forward', 'birthday'
);

CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type gift_type NOT NULL,
  value_piasters BIGINT NOT NULL,
  max_discount_piasters BIGINT,
  min_order_piasters BIGINT DEFAULT 0,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `gift_box_entries`
```sql
CREATE TYPE gift_entry_status AS ENUM (
  'granted', 'opened', 'used', 'expired', 'revoked', 'forwarded'
);

CREATE TABLE gift_box_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  gift_id UUID REFERENCES gifts(id),
  source gift_source NOT NULL,
  rule_id UUID REFERENCES gift_rules(id),
  status gift_entry_status DEFAULT 'granted',
  expires_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_order_id UUID REFERENCES orders(id),
  forward_id UUID REFERENCES gift_forwards(id),
  bucket_name TEXT NOT NULL, -- 'mystery', 'stamp', 'referral', 'win_back', 'welcome'
  cost_piasters BIGINT NOT NULL,
  funder_type TEXT DEFAULT 'engezna', -- 'engezna' or 'partner'
  funder_provider_id UUID REFERENCES providers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gift_box_entries_user_status ON gift_box_entries(user_id, status);
CREATE INDEX idx_gift_box_entries_expires ON gift_box_entries(expires_at) WHERE status IN ('granted', 'opened');
```

#### `gift_rules`
```sql
CREATE TABLE gift_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  trigger TEXT NOT NULL, -- 'order_completed', 'user_registered', etc.
  conditions JSONB NOT NULL,
  action JSONB NOT NULL,
  priority INT DEFAULT 100, -- lower runs first
  is_active BOOLEAN DEFAULT TRUE,
  budget_bucket TEXT NOT NULL,
  budget_cap_per_day BIGINT, -- piasters per day for this rule
  budget_cap_per_month BIGINT,
  applied_count INT DEFAULT 0,
  total_cost_piasters BIGINT DEFAULT 0,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `customer_segments_daily`
```sql
CREATE TYPE customer_segment AS ENUM (
  'new_user', 'champion', 'regular', 'at_risk',
  'churned', 'bargain_hunter', 'high_value', 'remote_area', 'undefined'
);

CREATE TABLE customer_segments_daily (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  segment customer_segment NOT NULL,
  facts JSONB NOT NULL, -- cached facts for rule engine
  PRIMARY KEY (user_id, snapshot_date)
);

CREATE INDEX idx_segments_date_segment ON customer_segments_daily(snapshot_date, segment);
```

#### `gift_stamps`
```sql
CREATE TABLE gift_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_started_at TIMESTAMPTZ DEFAULT NOW(),
  card_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '60 days',
  stamp_count INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  golden_box_id UUID REFERENCES gift_box_entries(id),
  order_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_active_card_per_user ON gift_stamps(user_id) WHERE is_completed = FALSE;
```

#### `gift_forwards`
```sql
CREATE TABLE gift_forwards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  gift_entry_id UUID REFERENCES gift_box_entries(id),
  forward_token TEXT UNIQUE NOT NULL, -- used in link
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  recipient_device_id TEXT,
  recipient_ip INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `gift_partner_offers`
```sql
CREATE TYPE partner_offer_status AS ENUM (
  'draft', 'pending_approval', 'approved', 'active', 'paused', 'ended', 'rejected'
);

CREATE TABLE gift_partner_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  gift_id UUID REFERENCES gifts(id),
  status partner_offer_status DEFAULT 'draft',
  total_inventory INT NOT NULL,
  used_inventory INT DEFAULT 0,
  deposit_piasters BIGINT NOT NULL,
  spent_piasters BIGINT DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  approved_by UUID REFERENCES admin_users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `gift_financial_log`
```sql
CREATE TYPE financial_log_type AS ENUM (
  'grant', 'use', 'expire', 'revoke', 'clawback', 'partner_deposit', 'partner_refund'
);

CREATE TABLE gift_financial_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type financial_log_type NOT NULL,
  amount_piasters BIGINT NOT NULL, -- positive = expense, negative = refund
  bucket TEXT, -- NULL if partner-funded
  funder_type TEXT NOT NULL, -- 'engezna' or 'partner'
  funder_provider_id UUID REFERENCES providers(id),
  user_id UUID REFERENCES profiles(id),
  gift_entry_id UUID REFERENCES gift_box_entries(id),
  order_id UUID REFERENCES orders(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fin_log_bucket_month ON gift_financial_log(bucket, created_at);
CREATE INDEX idx_fin_log_provider ON gift_financial_log(funder_provider_id) WHERE funder_provider_id IS NOT NULL;
```

#### `retention_settings`
```sql
CREATE TABLE retention_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- single row
  monthly_total_budget_piasters BIGINT DEFAULT 2000000, -- 20,000 EGP
  bucket_mystery_percent NUMERIC(5,2) DEFAULT 30.00,
  bucket_stamp_percent NUMERIC(5,2) DEFAULT 25.00,
  bucket_referral_percent NUMERIC(5,2) DEFAULT 20.00,
  bucket_winback_percent NUMERIC(5,2) DEFAULT 15.00,
  bucket_welcome_percent NUMERIC(5,2) DEFAULT 10.00,
  overflow_tolerance_percent NUMERIC(5,2) DEFAULT 5.00,
  referral_reward_piasters BIGINT DEFAULT 2000, -- 20 EGP
  referral_min_first_order_piasters BIGINT DEFAULT 30000, -- 300 EGP
  referral_monthly_limit_per_user INT DEFAULT 10,
  stamp_card_size INT DEFAULT 4,
  stamp_card_validity_days INT DEFAULT 60,
  stamp_min_order_piasters BIGINT DEFAULT 5000, -- 50 EGP
  golden_box_default_piasters BIGINT DEFAULT 5000, -- 50 EGP
  golden_box_max_piasters BIGINT DEFAULT 10000, -- 100 EGP hard cap
  gift_default_expiry_days INT DEFAULT 7,
  one_discount_per_order BOOLEAN DEFAULT TRUE,
  max_discount_percent_per_order NUMERIC(5,2) DEFAULT 20.00,
  processing_fee_enabled BOOLEAN DEFAULT FALSE,
  processing_fee_percent NUMERIC(5,2) DEFAULT 3.00,
  updated_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO retention_settings DEFAULT VALUES;
```

#### `provider_subscriptions`
```sql
CREATE TYPE subscription_tier AS ENUM ('basic', 'pro', 'elite');

CREATE TABLE provider_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  tier subscription_tier DEFAULT 'basic',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT TRUE,
  price_piasters BIGINT NOT NULL,
  granted_free BOOLEAN DEFAULT FALSE,
  granted_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `operational_expenses`
```sql
CREATE TYPE expense_category AS ENUM (
  'saas', 'salary', 'office', 'legal', 'marketing_external', 'other'
);

CREATE TABLE operational_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL,
  amount_piasters BIGINT NOT NULL,
  description TEXT NOT NULL,
  incurred_date DATE NOT NULL,
  recorded_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 18.2 الأعمدة المُضافة على جداول قائمة

```sql
ALTER TABLE providers
  ADD COLUMN grace_period_months INT DEFAULT 6,
  ADD COLUMN grace_period_start_date DATE;

ALTER TABLE profiles
  ADD COLUMN loyalty_tier TEXT DEFAULT 'bronze',
  ADD COLUMN loyalty_points_cache INT DEFAULT 0,
  ADD COLUMN birthdate DATE,
  ADD COLUMN last_segment customer_segment;

ALTER TABLE orders
  ADD COLUMN gift_entry_id UUID REFERENCES gift_box_entries(id),
  ADD COLUMN processing_fee_piasters BIGINT DEFAULT 0;
```

### 18.3 RLS Policies

- `gifts` — قراءة للجميع، كتابة للأدمن.
- `gift_box_entries` — قراءة للعميل صاحب الصندوق، كتابة للنظام فقط.
- `gift_rules` — قراءة وكتابة للأدمن.
- `customer_segments_daily` — قراءة للعميل صاحب الصف، كتابة للنظام فقط.
- `gift_stamps` — قراءة للعميل صاحب البطاقة، كتابة للنظام فقط.
- `gift_forwards` — قراءة للمرسل والمستلم.
- `gift_partner_offers` — قراءة للتاجر صاحب العرض، للأدمن، للعميل (محدود للمعروضة فقط).
- `gift_financial_log` — قراءة للأدمن (finance+) فقط.
- `retention_settings` — قراءة لأي أدمن، كتابة لـ super_admin فقط.
- `provider_subscriptions` — قراءة للتاجر صاحب الاشتراك وللأدمن.
- `operational_expenses` — قراءة وكتابة للـ finance role.

كل الـ RLS يستخدم `SECURITY DEFINER` functions عند الحاجة لتجنب infinite recursion (درس مستفاد من session 13).

---

## 19. خطة التنفيذ الموزّعة (17 مرحلة، ~37 يومًا)

### Phase 0 — مراجعة قاعدة البيانات + SQL للمستخدم (١-٢ أيام)
- راجع كل الـ migrations الحالية.
- ابنِ SQL script واحد شامل لكل الجداول الجديدة والأعمدة.
- أعطِ المستخدم الـ SQL للتشغيل على Supabase بعد مراجعته.
- **لا تُشغّل الـ migration على الإنتاج قبل موافقة المستخدم.**

### Phase 1 — كلاس Money + Helpers + Settlement Hooks (٢ أيام)
- راجع `src/lib/finance/money.ts`.
- أضف helpers لحساب تكلفة الهدية، clawback، ميزانية الدلو.
- اختبر كل حالة حافة (0 piasters, negative, overflow).

### Phase 2 — Gift Engine Core (٣ أيام)
- `src/lib/gifts/engine.ts` — grantGift، useGift، expireGift، revokeGift.
- كل عملية transactional مع gift_financial_log.
- اختبارات unit شاملة.

### Phase 3 — Rule Engine (٣ أيام)
- `src/lib/gifts/rule-engine.ts` — parser للـ JSONB conditions.
- دعم كل الـ facts والـ operators والـ aggregators.
- triggers واضحة: كيف ومتى يُستدعى الـ engine.

### Phase 4 — Customer Segmentation Cron (٢ أيام)
- Cron job يومي (Supabase pg_cron).
- يحسب الشرائح لكل العملاء ويكتبها في `customer_segments_daily`.
- يُحدّث `profiles.last_segment` و `loyalty_tier`.

### Phase 5 — Mystery Box Logic + UI (٣ أيام)
- weighted random picker.
- Framer Motion animation للفتح.
- صفحة `/rewards/mystery` + widget في الصفحة الرئيسية.

### Phase 6 — Stamp Card Logic + UI (٢ أيام)
- trigger عند `order_completed`.
- صفحة `/rewards/stamp-card`.
- widget progress bar.

### Phase 7 — Welcome + Win-back Flows (٢ أيام)
- قواعد افتراضية في `gift_rules` للترحيب والاستعادة.
- اختبار end-to-end.

### Phase 8 — Referral System (٣ أيام)
- صفحة `/referral` للعميل.
- تأكيد الإيميل.
- trigger عند إتمام أول طلب ≥٣٠٠ ج.م.
- منح الصندوق ٢٠ ج.م للمُحيل.
- حد ١٠ شهريًا لكل مستخدم.

### Phase 9 — Partner Gifts (٣ أيام)
- صفحة التاجر `/provider/gifts`.
- صفحة الأدمن `/admin/gifts/partners`.
- deposit + approval workflow.

### Phase 10 — Micro-Moments Campaigns (٢ أيام)
- صفحة الأدمن `/admin/gifts/campaigns`.
- triggers يدوية + birthday cron.
- لوحة real-time للاستهلاك.

### Phase 11 — Gift-it Forward (٢ أيام)
- توليد الرابط، WhatsApp share.
- صفحة الاستلام `/gift/[token]`.
- مكافحة الاحتيال الأساسية.

### Phase 12 — Loyalty Points + Tiers (٢ أيام)
- trigger لكل `order_completed`.
- صفحة `/rewards/points`.
- tier badges في الـ profile.

### Phase 13 — Admin Dashboard Pages (٣ أيام)
- كل صفحات `/admin/gifts/*`.
- الأمان + RLS + audit log.
- Charts (Recharts).

### Phase 14 — ERP Page (٣ أيام)
- `/admin/erp` مع كل الأقسام.
- تصدير Excel + PDF.
- KPIs calculation.

### Phase 15 — Provider Analytics Subscriptions (٢ أيام)
- billing flow + payment via settlements.
- upgrade/downgrade UI.
- feature gating per tier.

### Phase 16 — Notifications + Reminders (٢ أيام)
- Push (FCM) + Email + In-app.
- Cron reminder قبل انتهاء الهدايا.
- AR/EN كامل.

### Phase 17 — E2E Tests + Observability (٢ أيام)
- Playwright tests لكل flow حرج.
- dashboards في Supabase logs.
- alerts للأدمن عند شذوذ ميزانية.

**إجمالي: ~٣٧ يوم عمل.**

---

## 20. مراجعة Prettier + CI

- قبل أي commit: `npm run prettier --write`.
- قبل أي PR: `npm run lint` + `npm run type-check`.
- الـ CI (GitHub Actions) يُشغّل هذه الأوامر تلقائيًا.
- لا تُدمج PR بدون مرور الـ CI.

---

## 21. ملاحظات تقنية حرجة

### 21.1 تجنب float في المال
كل حساب مالي عبر `Money` class فقط. استخدم `Money.fromPounds(20)` لتحويل ٢٠ ج.م إلى ٢٠٠٠ piasters. استخدم `.percent(3)` لحساب ٣٪ — ليس `amount * 0.03`.

### 21.2 تجنب RLS infinite recursion
عند إضافة RLS policies على جداول تتضمن references متبادلة، استخدم `SECURITY DEFINER` functions. تجنّب `!foreign_key` syntax في Supabase queries لعلاقات nullable.

### 21.3 Transactional Integrity
كل عملية grantGift/useGift/clawback في RPC function واحد على Supabase، بحيث لا يُسجّل شيء جزئيًا. استخدم `BEGIN ... COMMIT` بوضوح.

### 21.4 Race Conditions على الميزانية
عند تزاحم طلبات منح هدايا في نفس اللحظة، استخدم `SELECT ... FOR UPDATE` على صف الدلو في `retention_settings` لتجنب التجاوز.

### 21.5 Idempotency
كل endpoint منح هدية يقبل `idempotency_key` لمنع التكرار العرضي (مهم لـ webhooks وإعادة المحاولة).

### 21.6 مراقبة الميزانية (Observability)
كل ١٥ دقيقة، Cron يحسب استهلاك كل دلو ويُرسل alert للأدمن إذا تجاوز ٨٠٪.

### 21.7 Beni Suef Pilot
- كل القواعد الافتراضية مُقيّدة بـ `governorate_id = <Beni Suef>`.
- قبل التوسع، يُراجع التحليل الشهري ويُقرّر المستخدم التوسع.

### 21.8 الخصوصية (Privacy)
- عيد الميلاد اختياري (opt-in).
- بيانات الشرائح لا تُعرض على العميل نفسه.
- Gift Forward لا يكشف رقم الهاتف بين الطرفين.

---

## 22. الافتراضات الحالية (Defaults — قابلة للتعديل)

هذه القيم الافتراضية التي اخترتها. **راجعها وأكّد أو عدّل:**

| البند | القيمة المقترحة |
|-------|-----------------|
| توزيع احتمالات Mystery Box | ٤٠/٢٥/٢٠/١٠/٤/١ (كما في §3.2) |
| قيمة الصندوق الذهبي الافتراضية | ٥٠ ج.م |
| الحد الأقصى للصندوق الذهبي | ١٠٠ ج.م |
| مكافأة Gift-it Forward للمرسل | ١٠ نقاط ولاء |
| مكافأة عيد الميلاد | صندوق مفاجأة محسّن بقيمة ≤٢٠ ج.م |
| هل Partner Gifts تحتاج موافقة الأدمن؟ | **نعم** (pending_approval → approved) |
| هل التاجر يضع deposit بالكامل قبل التفعيل؟ | **نعم** (١٠٠٪ من الميزانية) |
| مدة صلاحية بطاقة الختم | ٦٠ يومًا |
| الحد الأدنى للطلب المؤهل للختم | ٥٠ ج.م |
| مدة صلاحية هدية Gift-it Forward | ٤٨ ساعة لقبولها |
| الشرائح: حد "champion" | ≥١٠ طلبات في ٣٠ يوم + تقييم ≥٤ |
| الشرائح: حد "high_value" | متوسط طلب ≥٢٥٠ ج.م |
| الشرائح: حد "bargain_hunter" | ≥٦٠٪ من الطلبات بها خصم |
| Pilot city | بني سويف فقط حتى مراجعة شهرية |

---

## 23. ما الذي لم يتغيّر (Preserved from Original Plan)

- رسوم المعالجة ٣٪ (مُعطّلة عند الإطلاق، قابلة للتفعيل).
- فترة السماح للتجار ٦ أشهر بعمولة ٠٪ (قابلة للتعديل لكل تاجر).
- اشتراكات التحليلات للتجار (٢٩٩/٥٩٩ ج.م).
- صفحة ERP الشاملة للأدمن.
- لوحة إدارة الأدمن + الصلاحيات + audit log.
- نقاط الولاء ومستوياتها.
- سياسة "خصم واحد لكل طلب" + حد ٢٠٪.
- سياسة الاسترداد والـ clawback.
- نظام الإشعارات (Push + Email + In-app).
- Money class + settlement engine.
- مراجعة Prettier + CI قبل أي commit.
- SQL migration review قبل التشغيل على الإنتاج.
- التنفيذ المرحلي + اختبار كل مرحلة قبل التالية.

---

## 📋 أسئلة مفتوحة للمراجعة

قبل بدء التنفيذ، راجع الجدول في §22 وأكّد أو عدّل الافتراضات. بالتحديد:

1. **توزيع Mystery Box** — هل النسب ٤٠/٢٥/٢٠/١٠/٤/١ مقبولة؟ أم تفضّل نسب أخرى؟
2. **الصندوق الذهبي** — ٥٠ ج.م افتراضي / ١٠٠ ج.م حد أقصى — مناسب؟
3. **Gift-it Forward** — ١٠ نقاط ولاء للمرسل كافية؟
4. **عيد الميلاد** — صندوق مفاجأة محسّن أم شيء أكبر (مثلًا خصم ٣٠ ج.م صريح)؟
5. **Partner Gifts** — هل نسمح للتاجر بـ "auto-approved" بعد أول حملتين ناجحتين، أم موافقة الأدمن دائمًا؟
6. **Beni Suef Pilot** — متى يُراجع ويُقرّر التوسع؟ شهر، شهرين، ٣ أشهر؟
7. **الحد الأقصى للخصم ٢٠٪** — مناسب لكل أنواع التجار أم نسمح بتخصيص حسب التصنيف؟

بمجرد تأكيد هذه النقاط، أبدأ بـ Phase 0 (DB review + SQL للمستخدم).

---

**الإصدار:** 2.0 — Gift Box Edition
**آخر تحديث:** ٢١ أبريل ٢٠٢٦
**الحالة:** جاهز للمراجعة قبل البدء
