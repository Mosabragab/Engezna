# Engezna – Brand Implementation Guide (For Developers & Product Teams)

Version: 2.0
Last Updated: 2025-11-27

---

## Change Log

| Version | Date       | Changes                                                                          |
| ------- | ---------- | -------------------------------------------------------------------------------- |
| 2.0     | 2025-11-27 | Added Navigation Implementation, Light-Only Theme, Hover States, Lessons Learned |
| 1.0     | 2025-11-27 | Initial implementation guide                                                     |

---

## 1. Naming & Structure

- **Product Name:** Engezna
- **Arabic Name:** إنجزنا
- **Tagline EN:** Want to order? Engezna!
- **Tagline AR:** عايز تطلب؟ إنجزنا

**Recommended identifiers:**

- Package IDs:
  - `com.engezna.app.customer`
  - `com.engezna.app.merchant`
- Web:
  - `engezna.com`
  - `merchant.engezna.com`

---

## 2. Language & Localization

- **Primary UI language:** Arabic (Egyptian dialect for copy, MSA for legal)
- **Secondary:** English (for some CTAs, app store descriptions)

**Rules:**

- Arabic UI: RTL layout; English text inside may be LTR but aligned correctly.
- Avoid long, dense paragraphs inside the app.
- For microcopy, prefer Egyptian expressions, but keep them clean and neutral.

**Example Microcopy:**

- Order status:
  - "جارِ تجهيز طلبك"
  - "الطلب خرج للتوصيل"
  - "الطلب وِصل"

- Error messages:
  - "في مشكلة بسيطة… جرّب تاني بعد شوية."
  - "التاجر حالياً مشغول، حاول كمان دقيقة."

---

## 3. Color Tokens (High-Level)

Use CSS variables / design tokens to ensure consistency. See `engezna-theme.css` for full spec.

Core HSL tokens:

- `--color-primary: 198 100% 44%;` #009DE0
- `--color-secondary: 0 0% 0%;` #000000
- `--color-white: 0 0% 100%;` #FFFFFF

Accents:

- Deals: `--color-deal: 158 100% 38%;` #00C27A
- Premium: `--color-premium: 42 100% 70%;` #FFD166
- Info: `--color-info: 194 86% 58%;` #36C5F0
- Error: `--color-error: 358 100% 68%;` #FF5A5F

Neutrals are defined under `:root` in CSS (light theme only, dark mode removed).

---

## 4. UI Usage Guidelines

### 4.1 Buttons

- **Primary Button:**
  - Background: `var(--color-primary)`
  - Text: white
  - Hover: lighten primary by ~10%

- **Secondary Button:**
  - Background: transparent or muted grey
  - Border: `var(--color-primary)`
  - Text: `var(--color-primary)`

- **Danger Button (cancel / delete):**
  - Background: `var(--color-error)`
  - Text: white

### 4.2 Status & Badges

- **Discount badge (e.g. -20%):**
  - Background: `var(--color-deal)`
  - Text: white

- **Premium / Highlight badge:**
  - Background: `var(--color-premium)`
  - Text: black

- **Status chips:**
  - Success: border & text `--color-deal` with 0.1 alpha background
  - Error: border & text `--color-error`
  - Info: border & text `--color-info`

---

## 5. Brand Logic in Product

### 5.1 Business Rules to Respect (in Code)

- **No registration fees for merchants**
  - Merchants must never see or be charged "sign-up" fees anywhere in the app or back office.

- **Commission model:**
  - Commission = 0% for first 3 months from:
    - Platform launch in that city, OR
    - merchant registration date (implementation decision to be documented)
  - After 3 months:
    - Commission = 7% maximum of order value.

- **Customer service fee:**
  - **0% – No customer service fees** forever.
  - We do not charge customers any additional fees.

All logic must be configurable in the backend (feature flags + per-city config).

---

## 6. Risks & Implementation Guardrails

Link to brand-level risks and translate into product/tech constraints.

**1. Speed of Acquisition Risk**

- Product must optimize onboarding flows for merchants:
  - 3–5 steps max
  - Simple KYC and store setup
  - Instant test order feature

**2. Reliability Risk**

- Minimum requirements:
  - API error rates and uptime SLAs documented.
  - Clear error handling for low-connectivity environments.
  - Graceful fallbacks for timeouts.

**3. Merchant Delivery Dependency**

- Product must:
  - Expose merchant preparation time and delivery time expectations clearly.
  - Allow customers to rate both merchant and delivery.
  - Provide merchants with tools to pause ordering when overloaded.

**4. Competitive Reaction**

- Keep room for:
  - Promo codes & dynamic commission adjustments.
  - Per-city launch flags and growth experiments.

---

## 7. Theme Implementation (Light-Only)

### 7.1 Decision

Engezna uses a **Light-Only Theme**. Dark mode has been removed to simplify development and ensure consistent brand experience.

### 7.2 Implementation Details

**Removed:**

- `next-themes` provider
- All `dark:` Tailwind prefixes
- Theme toggle component

**CSS Variables (Light Mode Only):**

```css
:root {
  --background: 0 0% 100%; /* White */
  --foreground: 0 0% 10%; /* Charcoal */
  --primary: 198 100% 44%; /* Engezna Blue */
  --primary-foreground: 0 0% 100%; /* White */
  --muted: 0 0% 96%; /* Off White */
  --muted-foreground: 0 0% 45%; /* Gray */
}
```

**Background Strategy:**

- Main background: White (`#FFFFFF`)
- Section backgrounds: Light Gray (`#F9FAFB` or `bg-muted`)
- Cards: White with subtle borders

---

## 8. Navigation Bar Implementation

### 8.1 Customer Header Component

**File:** `src/components/shared/Header.tsx`

**Structure:**

```tsx
<header className="bg-white border-b sticky top-0 z-50 shadow-sm">
  <div className="container mx-auto px-4 py-4">
    <div className="flex items-center justify-between">
      {/* Logo */}
      {/* Navigation Items */}
    </div>
  </div>
</header>
```

**Key Features:**

1. **Sticky positioning** with z-index 50
2. **Subtle shadow** for depth
3. **Role-aware navigation** (detects if user is provider)
4. **Active orders badge** with real-time count

### 8.2 Navigation Button Styles

**Ghost Button (Default):**

```tsx
<Button variant="ghost" size="sm" className="flex items-center gap-1.5">
  <Icon className="w-4 h-4" />
  <span className="hidden sm:inline">Label</span>
</Button>
```

**Logout Button (Danger Variant):**

```tsx
<Button
  variant="outline"
  size="sm"
  className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
>
  <LogOut className="w-4 h-4" />
  <span>Logout</span>
</Button>
```

### 8.3 Badge Implementation

**Active Orders Badge:**

```tsx
{
  activeOrdersCount > 0 && (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
      {activeOrdersCount}
    </span>
  );
}
```

---

## 9. Hover States & Dropdown Menus

### 9.1 Critical: No Gap Rule

**Problem:** Dropdown menus close when mouse moves between trigger and menu.

**Solution:** Ensure zero gap between trigger and dropdown:

```tsx
// ❌ WRONG - Creates gap
<DropdownMenu>
  <DropdownMenuTrigger>...</DropdownMenuTrigger>
  <DropdownMenuContent className="mt-2"> {/* Gap! */}
    ...
  </DropdownMenuContent>
</DropdownMenu>

// ✅ CORRECT - No gap
<DropdownMenu>
  <DropdownMenuTrigger>...</DropdownMenuTrigger>
  <DropdownMenuContent className="mt-0 top-full">
    ...
  </DropdownMenuContent>
</DropdownMenu>
```

### 9.2 Ghost Button Visibility

**Problem:** Ghost buttons have no visible hover state on light backgrounds.

**Solution:** Always add hover background:

```tsx
// ❌ WRONG
<Button variant="ghost">Click me</Button>

// ✅ CORRECT
<Button variant="ghost" className="hover:bg-muted">Click me</Button>
```

### 9.3 RTL Arrow Icons

**Implementation:**

```tsx
const isRTL = locale === 'ar';

// Dynamic arrow direction
{
  isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />;
}
```

---

## 10. Provider Dashboard Navigation

### 10.1 Sidebar Implementation

**Features:**

- Collapsible on mobile (hamburger menu)
- Fixed on desktop
- Hover menu for user actions

**Hover Menu Fix:**

```tsx
<div className="relative group">
  <button className="flex items-center gap-2">
    <UserIcon />
    <span>Profile</span>
    <ChevronDown />
  </button>

  {/* Menu appears on hover - NO GAP */}
  <div className="absolute top-full left-0 mt-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
    <div className="bg-white shadow-lg rounded-lg py-2">{/* Menu items */}</div>
  </div>
</div>
```

### 10.2 Profile Link Routing

**Smart Routing:**

```tsx
// Redirects to provider settings if user is a provider
<Link href={isProvider ? `/${locale}/provider/settings` : `/${locale}/profile`}>
```

---

## 11. Common Implementation Mistakes & Solutions

### 11.1 CSS Issues

| Mistake                   | Solution                                                        |
| ------------------------- | --------------------------------------------------------------- |
| Using hex colors directly | Use CSS variables: `hsl(var(--primary))`                        |
| Mixing color formats      | Standardize on HSL format                                       |
| Hardcoding text colors    | Use semantic tokens: `text-foreground`, `text-muted-foreground` |

### 11.2 Component Issues

| Mistake                   | Solution                                            |
| ------------------------- | --------------------------------------------------- |
| Inconsistent button sizes | Use standardized variants: `sm`, `default`, `lg`    |
| Missing hover states      | Always define hover styles for interactive elements |
| Non-responsive navigation | Use responsive classes: `hidden sm:inline`          |

### 11.3 RTL Issues

| Mistake                | Solution                                  |
| ---------------------- | ----------------------------------------- |
| Hardcoded margin-left  | Use `ms-*` (margin-start) for RTL support |
| Fixed arrow directions | Check `isRTL` and swap icons              |
| Left-aligned text      | Use `text-start` instead of `text-left`   |

---

## 12. Testing Checklist

Before deploying navigation changes:

- [ ] Test on desktop (Chrome, Firefox, Safari)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test hover states on all buttons
- [ ] Test dropdown menus (hover to open, no gap closing)
- [ ] Test RTL layout (Arabic)
- [ ] Test responsive breakpoints
- [ ] Verify active states highlight correctly
- [ ] Check badge visibility and positioning

---

## 13. Future-Proofing

- All brand-dependent values (colors, fees, slogans) should live in:
  - Remote configuration where possible.
  - Centralized token files (CSS / design system).
- Tagline should be configurable per locale:
  - `tagline.ar = "عايز تطلب؟ إنجزنا"`
  - `tagline.en = "Want to order? Engezna!"`

---
