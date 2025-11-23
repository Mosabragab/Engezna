# Engezna Brand System - Implementation Guide

**For Developers & Designers**  
**Version:** 1.0  
**Last Updated:** November 23, 2025

---

## 🚀 Quick Start

### Import Brand Colors

```tsx
// In your component
import '@/styles/brand-colors.css'
```

### Use Logo Component

```tsx
import Logo from '@/components/shared/Logo'

<Logo language="ar" variant="medium" color="primary" size="lg" />
```

### Apply Brand Colors

```tsx
<button className="bg-primary text-primary-foreground">
  اطلب دلوقتي
</button>
```

---

## 🎨 Color System Usage

### Primary Brand Colors

```css
--color-primary              /* #06c769 Deep Green */
--color-primary-light        /* Lighter shade */
--color-primary-dark         /* Darker shade */
--color-primary-foreground   /* White text on primary */
```

### Using in Components

**Method 1: Tailwind Classes**
```tsx
<button className="bg-primary text-white hover:bg-primary-light">
  Order Now
</button>
```

**Method 2: CSS Custom Properties**
```tsx
<div style={{ backgroundColor: 'hsl(var(--color-primary))' }}>
  Content
</div>
```

**Method 3: Utility Classes** (from brand-colors.css)
```tsx
<span className="text-primary">Deep Green Text</span>
<span className="text-orange">Orange Text</span>
<span className="text-gold">Gold Text</span>
```

### Color Semantic Mapping

| Use Case | Color | Example |
|----------|-------|---------|
| Primary CTA | `--color-primary` | "اطلب دلوقتي" button |
| Discount | `--color-orange` | "خصم 30%" badge |
| Premium | `--color-gold` | "Engezna Plus" |
| Info | `--color-blue` | "Delivery 30 min" |
| Success | `--color-success` | "Order confirmed" |
| Error | `--color-error` | "Payment failed" |

---

## 🔤 Typography Implementation

### Using in Components

**Arabic Text:**
```tsx
<h1 className="font-arabic text-4xl font-bold">
  انجزنا واطلب!
</h1>
```

**English Text:**
```tsx
<h1 className="font-sans text-3xl font-bold">
  Let's Get It Done!
</h1>
```

**Bilingual:**
```tsx
<div className={locale === 'ar' ? 'font-arabic' : 'font-sans'}>
  {t('homepage.title')}
</div>
```

### Typography Scale

| Element | Class |
|---------|-------|
| Display | `text-[56px] md:text-5xl` |
| H1 | `text-4xl md:text-[40px]` |
| H2 | `text-3xl` |
| H3 | `text-2xl` |
| Body | `text-base` |
| Small | `text-sm` |
| Caption | `text-xs` |

### Font Weights

```tsx
<p className="font-normal">Regular (400)</p>
<p className="font-medium">Medium (500)</p>
<h2 className="font-semibold">Semibold (600)</h2>
<h1 className="font-bold">Bold (700)</h1>
```

---

## 🏷️ Logo Component

### Props

```typescript
interface LogoProps {
  language?: 'ar' | 'en'                    // Default: 'ar'
  variant?: 'light' | 'medium' | 'bold'     // Default: 'medium'
  color?: 'primary' | 'white' | 'black'     // Default: 'primary'
  size?: 'sm' | 'md' | 'lg' | 'xl'          // Default: 'md'
  className?: string
}
```

### Examples

```tsx
// Header logo
<Logo language="ar" variant="medium" color="primary" size="lg" />

// Footer logo
<Logo language="en" variant="medium" color="white" size="sm" />

// Dynamic based on locale
const locale = useLocale()
<Logo language={locale as 'ar' | 'en'} size="lg" />
```

---

## 🎯 Common UI Patterns

### 1. Primary CTA Button

```tsx
<button className="
  bg-primary 
  text-primary-foreground 
  hover:bg-primary-light 
  active:bg-primary-dark
  font-semibold 
  px-6 py-3 
  rounded-lg
  transition-colors
">
  اطلب دلوقتي
</button>
```

### 2. Discount Badge

```tsx
<span className="
  bg-orange 
  text-white 
  font-semibold 
  px-3 py-1 
  rounded-full 
  text-sm
">
  خصم 30%
</span>
```

### 3. Status Indicators

```tsx
// Success
<div className="status-success px-4 py-2 rounded-lg">
  <span className="text-success">✓ تم تأكيد الطلب</span>
</div>

// Error
<div className="status-error px-4 py-2 rounded-lg">
  <span className="text-error">✗ فشل الدفع</span>
</div>
```

### 4. Restaurant Card

```tsx
<div className="
  bg-card 
  border border-border 
  rounded-lg 
  overflow-hidden 
  hover:shadow-lg 
  transition-shadow
">
  <img src="/restaurant.jpg" className="w-full h-48 object-cover" />
  <div className="p-4">
    <h3 className="font-arabic text-xl font-semibold mb-2">
      مطعم الأصالة
    </h3>
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gold">⭐ 4.5</span>
      <span className="text-muted-foreground">(120)</span>
    </div>
  </div>
</div>
```

---

## ✅ Brand Compliance Checklist

Before committing:

### Colors
- [ ] Only brand palette colors used
- [ ] Primary green for CTAs
- [ ] Orange only for discounts
- [ ] Gold only for premium
- [ ] WCAG AA contrast ratios met

### Typography
- [ ] Noto Sans Arabic for Arabic
- [ ] Noto Sans for English
- [ ] Approved weights only (400-700)
- [ ] No letter-spacing on Arabic
- [ ] No text-transform on Arabic

### Logo
- [ ] Logo component used
- [ ] Correct language variant
- [ ] Proper clear space
- [ ] Appropriate color for background
- [ ] Minimum sizes met

### Layout
- [ ] RTL for Arabic
- [ ] LTR for English
- [ ] Mobile-responsive
- [ ] Dark mode compatible

---

## 🛠️ Development Commands

```bash
# Run dev server
npm run dev

# Build
npm run build

# Lint
npm run lint
```

---

**Keep this guide updated as the brand system evolves!**
