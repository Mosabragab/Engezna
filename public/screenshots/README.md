# Screenshots للمتاجر / Store Screenshots

هذا المجلد يحتوي على screenshots المطلوبة للنشر على App Store و Play Store.

## الملفات المطلوبة

### Mobile Screenshots (390x844px - iPhone 14 Pro)

| الملف                             | الوصف                                  | الحالة   |
| --------------------------------- | -------------------------------------- | -------- |
| `screenshot-home-mobile.png`      | الصفحة الرئيسية - تصفح المتاجر والعروض | ⏳ مطلوب |
| `screenshot-providers-mobile.png` | قائمة المتاجر المحلية                  | ⏳ مطلوب |
| `screenshot-order-mobile.png`     | تتبع طلبك بسهولة                       | ⏳ مطلوب |

### Desktop Screenshots (1280x800px)

| الملف                         | الوصف                         | الحالة   |
| ----------------------------- | ----------------------------- | -------- |
| `screenshot-home-desktop.png` | الصفحة الرئيسية على الديسكتوب | ⏳ مطلوب |

## كيفية إنشاء Screenshots

### الطريقة 1: Chrome DevTools

1. افتح الموقع في Chrome
2. اضغط F12 لفتح DevTools
3. اضغط Ctrl+Shift+M للتبديل إلى Device Mode
4. اختر iPhone 14 Pro (390x844)
5. اضغط Ctrl+Shift+P واكتب "Capture full size screenshot"

### الطريقة 2: Playwright

```bash
npx playwright screenshot https://engezna.com/ar --viewport-size=390,844 -o screenshot-home-mobile.png
```

## متطلبات App Store

- iPhone 6.7" (1290x2796px) - iPhone 15 Pro Max
- iPhone 6.5" (1284x2778px) - iPhone 14 Plus
- iPhone 5.5" (1242x2208px) - iPhone 8 Plus
- iPad Pro 12.9" (2048x2732px)

## متطلبات Play Store

- Phone: 16:9 aspect ratio, min 320px, max 3840px
- Tablet 7": min 320px
- Tablet 10": min 1080px

---

_آخر تحديث: يناير 2026_
