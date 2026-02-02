# Telegram Knowledge Bot Setup Guide

# دليل إعداد بوت المعرفة على Telegram

**الهدف:** بوت يجيب على أسئلة الفريق من الملفات التوثيقية
**التقنيات:** Oracle Cloud + Ollama + n8n + Telegram

---

## 1. إعداد Oracle Cloud (Always Free)

### 1.1 إنشاء حساب

1. اذهب إلى [cloud.oracle.com](https://cloud.oracle.com)
2. اضغط "Start for free"
3. أدخل بياناتك (يحتاج بطاقة ائتمان للتحقق فقط - لن يتم خصم شيء)
4. اختر Region: `Saudi Arabia (Jeddah)` أو `UAE (Dubai)` للسرعة

### 1.2 إنشاء VM (مجاني)

```
الخطوات في Oracle Cloud Console:
─────────────────────────────────

1. Compute → Instances → Create Instance

2. اختر الإعدادات:
   • Name: engezna-bot
   • Image: Ubuntu 22.04
   • Shape: VM.Standard.A1.Flex (Ampere ARM)
     - OCPUs: 4 (مجاني حتى 4)
     - Memory: 24 GB (مجاني حتى 24)

3. Networking:
   • Create new VCN
   • Assign public IP: Yes

4. Add SSH Key:
   • Generate key pair
   • Download private key (احفظه!)

5. Create
```

### 1.3 فتح المنافذ (Firewall)

```bash
# في Oracle Cloud Console:
# Networking → Virtual Cloud Networks → [VCN] → Security Lists → Default

# أضف Ingress Rules:
┌──────────────┬─────────────┬─────────────────────┐
│ Source       │ Protocol    │ Destination Port    │
├──────────────┼─────────────┼─────────────────────┤
│ 0.0.0.0/0    │ TCP         │ 5678 (n8n)          │
│ 0.0.0.0/0    │ TCP         │ 11434 (Ollama)      │
│ 0.0.0.0/0    │ TCP         │ 80 (HTTP)           │
│ 0.0.0.0/0    │ TCP         │ 443 (HTTPS)         │
└──────────────┴─────────────┴─────────────────────┘
```

### 1.4 الاتصال بالـ VM

```bash
# على جهازك (Mac/Linux)
chmod 400 ~/Downloads/ssh-key.key
ssh -i ~/Downloads/ssh-key.key ubuntu@<PUBLIC_IP>

# على Windows (PowerShell)
ssh -i C:\Users\YOU\Downloads\ssh-key.key ubuntu@<PUBLIC_IP>
```

---

## 2. تثبيت البرامج على Oracle VM

### 2.1 التحديثات الأساسية

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت الأدوات الأساسية
sudo apt install -y curl wget git htop
```

### 2.2 تثبيت Docker

```bash
# تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# إضافة المستخدم لـ Docker group
sudo usermod -aG docker $USER

# تسجيل خروج ودخول لتفعيل التغيير
exit
# ثم اتصل مرة أخرى
```

### 2.3 تثبيت Ollama

```bash
# تثبيت Ollama
curl -fsSL https://ollama.com/install.sh | sh

# تحميل النموذج (qwen2.5 - الأفضل للعربي)
ollama pull qwen2.5:7b

# أو نموذج أصغر لو الذاكرة محدودة
ollama pull qwen2.5:3b

# تشغيل Ollama كخدمة
sudo systemctl enable ollama
sudo systemctl start ollama

# اختبار
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "مرحبا، كيف حالك؟",
  "stream": false
}'
```

### 2.4 تثبيت n8n

```bash
# إنشاء مجلد للمشروع
mkdir -p ~/engezna-bot && cd ~/engezna-bot

# إنشاء docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=YOUR_SECURE_PASSWORD
      - N8N_HOST=YOUR_PUBLIC_IP
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://YOUR_PUBLIC_IP:5678/
      - GENERIC_TIMEZONE=Africa/Cairo
    volumes:
      - ./n8n_data:/home/node/.n8n
      - ./knowledge_base:/knowledge_base
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF

# إنشاء مجلد الملفات
mkdir -p knowledge_base

# تشغيل n8n
docker compose up -d

# التحقق
docker logs -f engezna-bot-n8n-1
```

### 2.5 رفع ملفات المعرفة

```bash
# على جهازك المحلي - ارفع الملفات للسيرفر
scp -i ~/Downloads/ssh-key.key -r \
  /path/to/Engezna/project-management/operations \
  /path/to/Engezna/project-management/marketing \
  ubuntu@<PUBLIC_IP>:~/engezna-bot/knowledge_base/
```

---

## 3. إعداد Telegram Bot

### 3.1 إنشاء البوت

```
1. افتح Telegram وابحث عن @BotFather
2. أرسل: /newbot
3. اختر اسم: Engezna Assistant
4. اختر username: engezna_assistant_bot (أو أي اسم متاح)
5. احفظ الـ Token:
   مثال: 7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.2 إعداد الصلاحيات

```
أرسل لـ @BotFather:

/setprivacy
اختر البوت
اختر: Disable (ليقرأ كل الرسائل في الجروب)

/setjoingroups
اختر البوت
اختر: Enable
```

### 3.3 إضافة البوت للجروب

```
1. أضف البوت للجروب
2. اجعله Admin (اختياري - للرد بدون mention)
3. احصل على Chat ID:
   - أضف @getidsbot للجروب مؤقتاً
   - سيعطيك الـ Chat ID (رقم سالب مثل -1001234567890)
```

---

## 4. إعداد n8n Workflow

### 4.1 الوصول لـ n8n

```
افتح في المتصفح:
http://YOUR_PUBLIC_IP:5678

أدخل:
- Username: admin
- Password: YOUR_SECURE_PASSWORD
```

### 4.2 استيراد الـ Workflow

1. اضغط على **+** لإنشاء Workflow جديد
2. اضغط على **...** (القائمة) → **Import from URL** أو **Import from File**
3. استخدم الـ JSON في الملف التالي: `n8n_workflow.json`

### 4.3 إعداد Credentials

```
في n8n:

1. Telegram:
   Settings → Credentials → Add Credential → Telegram
   - Access Token: YOUR_BOT_TOKEN

2. (اختياري) إذا استخدمت OpenAI بدلاً من Ollama:
   Settings → Credentials → Add Credential → OpenAI
   - API Key: YOUR_OPENAI_KEY
```

---

## 5. صلاحيات المستخدمين

### 5.1 تعريف الأدوار

```javascript
// في n8n Function Node
const USERS = {
  // المؤسس
  123456789: {
    name: 'Mosab',
    role: 'founder',
    files: ['*'], // كل الملفات
  },
  // قائد الفريق
  987654321: {
    name: 'Team Leader',
    role: 'team_leader',
    files: [
      'SALES_SCRIPT.md',
      'TRAINING_GUIDE.md',
      'ONBOARDING_CHECKLIST.md',
      'PRICING_STRATEGY.md',
      'SUPPORT_PLAYBOOK.md',
      'QUALITY_STANDARDS.md',
      'METRICS_KPIs.md',
      'INCIDENT_RESPONSE.md',
    ],
  },
  // مندوب مبيعات
  456789123: {
    name: 'Sales Rep',
    role: 'sales_rep',
    files: [
      'SALES_SCRIPT.md',
      'TRAINING_GUIDE.md',
      'ONBOARDING_CHECKLIST.md',
      'PRICING_STRATEGY.md',
    ],
  },
};
```

### 5.2 الحصول على User ID

```
أرسل لـ @userinfobot على Telegram
سيعطيك الـ User ID الخاص بك
```

---

## 6. اختبار البوت

### 6.1 اختبارات أساسية

```
في الجروب، جرب:

@engezna_assistant_bot ازاي أقنع تاجر مش عايز يدفع رسوم؟

@engezna_assistant_bot إيه خطوات تسجيل تاجر جديد؟

@engezna_assistant_bot إيه KPIs المندوب؟
```

### 6.2 التحقق من الصلاحيات

```
# شخص غير مسجل يسأل:
@engezna_assistant_bot إيه المخاطر؟
→ الرد: "عذراً، ليس لديك صلاحية للوصول لهذه المعلومات"

# قائد الفريق يسأل:
@engezna_assistant_bot إيه المخاطر؟
→ الرد: (من RISK_REGISTER.md)
```

---

## 7. الصيانة والمراقبة

### 7.1 مراقبة الخدمات

```bash
# حالة Ollama
sudo systemctl status ollama

# حالة n8n
docker logs -f engezna-bot-n8n-1

# استخدام الموارد
htop
```

### 7.2 إعادة التشغيل

```bash
# إعادة تشغيل Ollama
sudo systemctl restart ollama

# إعادة تشغيل n8n
cd ~/engezna-bot
docker compose restart
```

### 7.3 تحديث الملفات

```bash
# ارفع الملفات المحدثة
scp -i ~/Downloads/ssh-key.key -r \
  /path/to/new/files/* \
  ubuntu@<PUBLIC_IP>:~/engezna-bot/knowledge_base/

# أعد تشغيل n8n (اختياري)
docker compose restart
```

---

## 8. حل المشاكل

### مشكلة: Ollama بطيء

```bash
# تحقق من الذاكرة
free -h

# استخدم نموذج أصغر
ollama pull qwen2.5:3b
# وغير في n8n الـ model إلى qwen2.5:3b
```

### مشكلة: n8n لا يستجيب

```bash
# تحقق من اللوجات
docker logs engezna-bot-n8n-1

# أعد البناء
docker compose down
docker compose up -d --build
```

### مشكلة: البوت لا يرد في الجروب

```
1. تأكد من Privacy Mode = Disabled
2. تأكد من إضافة البوت كـ Admin
3. تأكد من الـ Webhook URL صحيح
```

---

## 9. التكاليف

| البند           | التكلفة                 |
| --------------- | ----------------------- |
| Oracle Cloud VM | **مجاني** (Always Free) |
| Ollama          | **مجاني** (Open Source) |
| n8n             | **مجاني** (Self-hosted) |
| Telegram Bot    | **مجاني**               |
| **الإجمالي**    | **$0/شهر**              |

---

## الملفات المرفقة

- `n8n_workflow.json` - الـ Workflow الكامل
- `system_prompt.txt` - البرومبت للـ AI

---

## الفئات المستهدفة

البوت يجب أن يكون قادراً على الإجابة عن أسئلة متعلقة بجميع الفئات:

| الفئة                                       | أمثلة على الأسئلة                      |
| ------------------------------------------- | -------------------------------------- |
| 🍽️ المطاعم (Restaurants)                    | "إزاي أقنع مطعم؟" "إيه عمولة المطاعم؟" |
| 💊 الصيدليات (Pharmacies)                   | "إيه شروط الصيدليات؟" "فيه قيود؟"      |
| 🛒 السوبر ماركت (Supermarkets)              | "إزاي أضيف منتجات السوبر ماركت؟"       |
| 🥬 الخضراوات والفاكهه (Vegetables & Fruits) | "إزاي يشتغل التسعير بالوزن؟"           |
| ☕ البن والحلويات (Coffee & Patisserie)     | "إيه Custom Mode؟"                     |

---

## ملخص بالعربية

هذا الملف يوضح كيفية إعداد بوت المعرفة على Telegram لمنصة إنجزنا. النقاط الرئيسية:

**الهدف:** بوت يجيب على أسئلة الفريق من الملفات التوثيقية

**التقنيات المستخدمة (مجانية بالكامل):**

- Oracle Cloud VM: خادم مجاني (4 CPUs + 24GB RAM)
- Ollama: نموذج AI مفتوح المصدر (qwen2.5)
- n8n: أتمتة العمليات (self-hosted)
- Telegram Bot: واجهة التواصل

**خطوات الإعداد:**

1. إنشاء VM على Oracle Cloud
2. تثبيت Docker, Ollama, n8n
3. إنشاء Telegram Bot عبر @BotFather
4. رفع ملفات المعرفة
5. إعداد n8n Workflow

**نظام الصلاحيات:**

- المؤسس: وصول كامل لكل الملفات
- قائد الفريق: ملفات العمليات والتسعير
- مندوب المبيعات: Sales Script والتدريب فقط

**التكلفة الشهرية:** $0 (مجاني بالكامل)

**الفئات المستهدفة:** المطاعم، الصيدليات، السوبر ماركت، الخضراوات والفاكهه، البن والحلويات
