# Engezna - Category Design Reference
# مرجع تصميم الأقسام - إنجزنا

Version: 1.1
Last Updated: 2024-12-19

---

## 1. الأقسام المفعّلة حالياً (4 أقسام)

| # | Key | Arabic | English | Emoji | Color | Gradient |
|---|-----|--------|---------|-------|-------|----------|
| 1 | restaurants | مطاعم | Restaurants | 🍔 | Warm Cream | `rgba(254,243,199,0.85)` → `rgba(254,249,195,0.7)` |
| 2 | coffee-sweets | البن والحلويات | Coffee & Sweets | ☕ | Soft Beige | `rgba(245,235,220,0.9)` → `rgba(237,224,205,0.75)` |
| 3 | supermarket | سوبر ماركت | Supermarket | 🛒 | Engezna Blue | `rgba(224,244,255,0.9)` → `rgba(186,230,253,0.75)` |
| 4 | vegetables-fruits | خضروات وفواكه | Vegetables & Fruits | 🍌 | Soft Mint | `rgba(209,250,229,0.85)` → `rgba(167,243,208,0.7)` |

---

## 2. أقسام جاهزة للتفعيل (محفوظة للمستقبل)

| # | Key | Arabic | English | Emoji | Color | Gradient |
|---|-----|--------|---------|-------|-------|----------|
| 5 | pharmacy | صيدليات | Pharmacy | 💊 | Soft Rose | `rgba(255,228,230,0.85)` → `rgba(254,205,211,0.7)` |
| 6 | drinks | مشروبات | Drinks | 🥤 | Soft Peach | `rgba(255,237,213,0.85)` → `rgba(254,215,170,0.7)` |
| 7 | homefood | أكل بيتي | Home Food | 🍲 | Warm Orange | `rgba(255,237,213,0.9)` → `rgba(254,215,170,0.75)` |
| 8 | gifts-flowers | هدايا وورود | Gifts & Flowers | 💐 | Soft Pink | `rgba(252,231,243,0.85)` → `rgba(251,207,232,0.7)` |
| 9 | other | أخرى | Other | 🛍️ | Soft Lavender | `rgba(237,233,254,0.85)` → `rgba(221,214,254,0.7)` |

### كود TypeScript للأقسام المستقبلية:
```typescript
// أضف هذه الأقسام للـ categories array عند الحاجة
{
  id: '5',
  key: 'pharmacy',
  nameAr: 'صيدليات',
  nameEn: 'Pharmacy',
  emoji: '💊',
  gradient: 'linear-gradient(145deg, rgba(255,228,230,0.85) 0%, rgba(254,205,211,0.7) 100%)'
},
{
  id: '6',
  key: 'drinks',
  nameAr: 'مشروبات',
  nameEn: 'Drinks',
  emoji: '🥤',
  gradient: 'linear-gradient(145deg, rgba(255,237,213,0.85) 0%, rgba(254,215,170,0.7) 100%)'
},
{
  id: '7',
  key: 'homefood',
  nameAr: 'أكل بيتي',
  nameEn: 'Home Food',
  emoji: '🍲',
  gradient: 'linear-gradient(145deg, rgba(255,237,213,0.9) 0%, rgba(254,215,170,0.75) 100%)'
},
{
  id: '8',
  key: 'gifts-flowers',
  nameAr: 'هدايا وورود',
  nameEn: 'Gifts & Flowers',
  emoji: '💐',
  gradient: 'linear-gradient(145deg, rgba(252,231,243,0.85) 0%, rgba(251,207,232,0.7) 100%)'
},
{
  id: '9',
  key: 'other',
  nameAr: 'أخرى',
  nameEn: 'Other',
  emoji: '🛍️',
  gradient: 'linear-gradient(145deg, rgba(237,233,254,0.85) 0%, rgba(221,214,254,0.7) 100%)'
}
```

---

## 3. ألوان متاحة لأقسام إضافية

| Color Name | From RGBA | To RGBA | Suggested For |
|------------|-----------|---------|---------------|
| Soft Teal | `rgba(204,251,241,0.85)` | `rgba(153,246,228,0.7)` | خدمات، تنظيف |
| Soft Amber | `rgba(254,243,199,0.9)` | `rgba(253,230,138,0.75)` | عروض، مميز |
| Soft Indigo | `rgba(224,231,255,0.85)` | `rgba(199,210,254,0.7)` | تقنية، إلكترونيات |
| Soft Cyan | `rgba(207,250,254,0.85)` | `rgba(165,243,252,0.7)` | مياه، تبريد |
| Soft Lime | `rgba(236,252,203,0.85)` | `rgba(217,249,157,0.7)` | صحة، طبيعي |
| Fresh Green | `rgba(220,252,231,0.85)` | `rgba(187,247,208,0.7)` | بيئة، نباتات |

---

## 4. بنك الإيموجي

### إيموجي بديل للأقسام الحالية

| Category | Current | Alternatives |
|----------|---------|--------------|
| مطاعم | 🍔 | 🍕 🍗 🍖 🌯 🥙 🍝 |
| البن والحلويات | ☕ | 🧁 🍰 🍩 🍪 🎂 |
| سوبر ماركت | 🛒 | 🏪 🛍️ |
| خضروات وفواكه | 🍌 | 🥕 🍎 🍅 🍊 🍇 🧺 🥬 |

### إيموجي للأقسام المحفوظة

| Category | Current | Alternatives |
|----------|---------|--------------|
| صيدليات | 💊 | 🏥 💉 🩺 🩹 |
| مشروبات | 🥤 | 🧃 🥛 🍹 🧋 🍵 |
| أكل بيتي | 🍲 | 🥘 🍛 🥣 🍽️ 👩‍🍳 |
| هدايا وورود | 💐 | 🎁 🌹 🌸 💝 🎀 |
| أخرى | 🛍️ | 🏪 ✨ 📍 🔖 📦 |

### إيموجي لأقسام مستقبلية

| Category | Emoji | Alternatives |
|----------|-------|--------------|
| ملابس / أزياء | 👕 | 👗 👔 🧥 👟 👜 |
| إلكترونيات | 📱 | 💻 🖥️ 📺 🎮 🎧 |
| أدوات منزلية | 🏠 | 🛋️ 🪑 🛏️ 🧹 |
| مستحضرات تجميل | 💄 | 💅 🧴 ✨ 💋 |
| حيوانات أليفة | 🐕 | 🐈 🐾 🦴 🐟 |
| رياضة | ⚽ | 🏋️ 🎾 🏀 🚴 |
| كتب / قرطاسية | 📚 | ✏️ 📖 🎒 📝 |
| سيارات / قطع غيار | 🚗 | 🔧 ⛽ 🚙 |
| أثاث | 🛋️ | 🪑 🛏️ 🚪 |
| خدمات | 🔧 | 🛠️ 👷 🧰 |
| توصيل سريع | 🚀 | ⚡ 🏃 📦 |

---

## 5. المواصفات التقنية

### Card Specs (Responsive)
```
Mobile:    64px × 64px (w-16 h-16)
Small:     72px × 72px (sm:w-[72px] sm:h-[72px])
Medium:    80px × 80px (md:w-20 md:h-20)
Large:     88px × 88px (lg:w-[88px] lg:h-[88px])
Border Radius: 16px (rounded-2xl) / 18px on md+
Gap: 12px (gap-3) / 16px on md+ (md:gap-4)
```

### Emoji Specs (Responsive)
```
Mobile: 24px (text-2xl)
Small: 28px (sm:text-[28px])
Medium: 32px (md:text-[32px])
Large: 36px (lg:text-[36px])
Shadow: drop-shadow(0 2px 4px rgba(0,0,0,0.1))
```

### Label Specs (Responsive)
```
Mobile: 10px (text-[10px])
Small: 12px (sm:text-xs)
Medium: 14px (md:text-sm)
Font Weight: 500
Color: #475569
Line Height: tight
```

### Shadow Specs
```
Default: 0 2px 8px rgba(0,0,0,0.04)
Hover: 0 8px 25px rgba(0,0,0,0.1)
Selected: 0 0 0 2.5px #009DE0, 0 8px 25px rgba(0,157,224,0.2)
```

### Animation Specs
```
Duration: 300ms
Easing: cubic-bezier(0.4, 0, 0.2, 1) - default transition
Hover Scale: 1.05
Hover TranslateY: -2px
Selected Scale: 1.05
```

### Gradient Direction
```
Angle: 145deg
From: top-right
To: bottom-left
```

---

## 6. قواعد إضافة قسم جديد

1. **اختر key فريد** بالإنجليزية (kebab-case)
2. **أضف الاسم** بالعربية والإنجليزية
3. **اختر إيموجي** بلون مختلف عن لون الخلفية
4. **اختر لون** من الألوان المتاحة أعلاه أو من الأقسام المحفوظة
5. **أضف للـ categories array** في:
   - `src/components/customer/home/CategoriesSection.tsx`
   - `src/app/[locale]/welcome/page.tsx`
6. **حدّث هذا الملف**

### مثال لإضافة قسم:
```typescript
{
  id: '5',
  key: 'pharmacy',
  nameAr: 'صيدليات',
  nameEn: 'Pharmacy',
  emoji: '💊',
  gradient: 'linear-gradient(145deg, rgba(255,228,230,0.85) 0%, rgba(254,205,211,0.7) 100%)'
}
```

---

## 7. ملاحظات مهمة

- الإيموجي يجب أن يكون بلون **مختلف** عن لون الخلفية للتباين
- الألوان Pastel بشفافية **70-90%** للحفاظ على النعومة
- استخدم Gradient بزاوية **145deg** للاتساق
- اختبر على الموبايل (الحجم 64px مناسب للمس)
- Selection ring باللون الأساسي **#009DE0** (Engezna Blue)
- الكروت تعرض في grid 4 أعمدة على جميع الشاشات

---

## 8. Component Locations

الـ components الرئيسية موجودة في:
```
src/components/customer/home/CategoriesSection.tsx  (الصفحة الرئيسية)
src/app/[locale]/welcome/page.tsx                   (صفحة الترحيب)
```

---

## 9. Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-19 | 1.0 | Initial release with 9 categories |
| 2024-12-19 | 1.1 | Reduced to 4 active categories, saved 5 for future, responsive design |
