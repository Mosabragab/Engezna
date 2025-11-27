# Engezna – Brand Implementation Guide (For Developers & Product Teams)
Version: 1.0

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

- `--color-primary: 198 100% 44%;`      #009DE0
- `--color-secondary: 0 0% 0%;`         #000000
- `--color-white: 0 0% 100%;`           #FFFFFF

Accents:

- Deals: `--color-deal: 158 100% 38%;`        #00C27A
- Premium: `--color-premium: 42 100% 70%;`    #FFD166
- Info: `--color-info: 194 86% 58%;`          #36C5F0
- Error: `--color-error: 358 100% 68%;`       #FF5A5F

Neutrals (light vs dark) are defined under `:root` and `.dark` in CSS.

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
  - Commission = 0% for first 9 months from:
    - Platform launch in that city, OR
    - merchant registration date (implementation decision to be documented)
  - After 9 months:
    - Commission = 6% of order value.

- **Customer service fee:**
  - 0% for first 12 months.
  - After 12 months: 2% of order value as "service fee".

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

## 7. Future-Proofing

- All brand-dependent values (colors, fees, slogans) should live in:
  - Remote configuration where possible.
  - Centralized token files (CSS / design system).
- Tagline should be configurable per locale:
  - `tagline.ar = "عايز تطلب؟ إنجزنا"`
  - `tagline.en = "Want to order? Engezna!"`

---
