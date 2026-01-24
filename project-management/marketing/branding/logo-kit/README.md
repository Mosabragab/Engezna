# Engezna Logo Kit | كيت شعار إنجزنا

> **Version:** 3.0.0
> **Last Updated:** January 2026
> **Brand Color:** #009DE0 (Engezna Blue)
> **Theme Color:** #0F172A (Charcoal)

---

## 📁 Folder Structure | هيكل المجلدات

```
branding/logo-kit/
├── logo-exporter.html    # أداة تصدير PNG التفاعلية (الأداة الرئيسية)
├── logo-preview.html     # معاينة جميع الأصول
└── README.md             # هذا الملف

public/icons/             # الأيقونات المستخدمة في التطبيق
├── icon-192x192.png      # PWA + Apple Touch (Charcoal bg)
├── icon-512x512.png      # PWA + Notifications (Charcoal bg)
├── favicon-32-dark.png   # Favicon
└── favicon-64-dark.png   # Favicon + Badge
```

---

## 🚀 How to Export Logos | كيفية تصدير الشعارات

1. افتح `logo-exporter.html` في المتصفح
2. انتظر 3-5 ثواني حتى يتم تحميل الخطوط
3. اضغط على زر "تحميل PNG" لأي شعار تريده
4. سيتم تحميل الملف بالمقاس الصحيح تلقائياً

---

## 🎨 Brand Colors | ألوان العلامة

| Color            | HEX       | Usage                                    |
| ---------------- | --------- | ---------------------------------------- |
| **Engezna Blue** | `#009DE0` | Primary brand color, CTAs, links         |
| **Dark Blue**    | `#0077B6` | Hover states, gradients                  |
| **Charcoal**     | `#0F172A` | App icons, theme color, dark backgrounds |
| **White**        | `#FFFFFF` | Text on dark, light backgrounds          |

### ⚠️ Important Color Note

**نستخدم Charcoal (#0F172A) بدلاً من الأسود المصمت (#000000)**

الأسباب:

- مظهر أكثر احترافية وفخامة
- تباين أفضل مع الألوان الأخرى
- يتناسق مع Tailwind Slate-900
- أسهل على العين من الأسود الحاد

---

## 🔤 Official App Icon | الأيقونة الرسمية

### النص الكامل "إنجزنا"

| Variant                | Background | Text Color | Usage                         |
| ---------------------- | ---------- | ---------- | ----------------------------- |
| **Primary (Charcoal)** | `#0F172A`  | `#FFFFFF`  | ✅ PWA, App Stores, Main icon |
| **Blue**               | `#009DE0`  | `#FFFFFF`  | Social media profiles         |
| **White**              | `#FFFFFF`  | `#009DE0`  | Light backgrounds             |

### ❌ Deprecated Variants (لم تعد مستخدمة)

- ~~حرف "إ" فقط~~ → نستخدم "إنجزنا" الكاملة
- ~~حرف "E" الإنجليزي~~ → نستخدم "إنجزنا" العربية
- ~~خلفية سوداء #000000~~ → نستخدم Charcoal #0F172A

---

## 📐 PWA Icons (Required) | أيقونات التطبيق

| File                  | Size    | Purpose                                |
| --------------------- | ------- | -------------------------------------- |
| `icon-192x192.png`    | 192×192 | PWA manifest, Apple Touch, Shortcuts   |
| `icon-512x512.png`    | 512×512 | PWA manifest (maskable), Notifications |
| `favicon-32-dark.png` | 32×32   | Browser favicon                        |
| `favicon-64-dark.png` | 64×64   | Browser favicon, Notification badge    |

### Icon Specifications

```
Background: #0F172A (Charcoal)
Text: إنجزنا
Font: Aref Ruqaa Bold
Text Color: #FFFFFF (White)
Border Radius: 22% (Android adaptive)
```

---

## 📱 Social Media Assets

Social media assets are exported from `logo-exporter.html` on demand.
They should NOT be stored in `public/icons/` to keep the production bundle small.

### Available Exports

| Platform       | Assets                                                   |
| -------------- | -------------------------------------------------------- |
| **App Stores** | iOS 1024px, Android 512px                                |
| **Facebook**   | Profile 180px, Cover 820×312, Post 1200px                |
| **Instagram**  | Profile 320px, Post 1080px, Story 1080×1920              |
| **Twitter/X**  | Profile 400px, Header 1500×500                           |
| **LinkedIn**   | Profile 400px, Company 300px, Cover 1128×191             |
| **YouTube**    | Profile 800px, Thumbnail 1280×720, Channel Art 2560×1440 |
| **TikTok**     | Profile 200px                                            |
| **WhatsApp**   | Profile 500px, Status 1080×1920                          |

---

## ✅ Logo Usage Guidelines | إرشادات الاستخدام

### Do's | الصحيح ✓

- ✅ Use Charcoal (#0F172A) background for app icons
- ✅ Use the full "إنجزنا" text, not single letters
- ✅ Use adequate clear space around the logo
- ✅ Use high-resolution PNG exports from logo-exporter.html
- ✅ Maintain the original aspect ratio

### Don'ts | الخطأ ✗

- ❌ Don't use pure black (#000000) - use Charcoal instead
- ❌ Don't use single letter "إ" or "E" for main icons
- ❌ Don't stretch or distort the logo
- ❌ Don't change the logo colors
- ❌ Don't add effects (shadows, extra gradients, outlines)
- ❌ Don't store social media assets in public/icons/

---

## 🔤 Typography | الخطوط

| Usage        | Font             | Weight             |
| ------------ | ---------------- | ------------------ |
| Logo Text    | Aref Ruqaa       | 700 (Bold)         |
| Arabic Body  | Noto Sans Arabic | 400, 500, 700      |
| English Body | Noto Sans        | 400, 500, 600, 700 |

---

## 📏 Technical Specifications

### manifest.json Icons

```json
{
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "purpose": "any" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "purpose": "any" },
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "purpose": "maskable" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "purpose": "maskable" }
  ]
}
```

### Theme Colors

```json
{
  "theme_color": "#0F172A",
  "background_color": "#0F172A"
}
```

---

## 📞 Contact | التواصل

For brand inquiries or custom assets, contact the design team.

---

© 2026 Engezna. All rights reserved.
