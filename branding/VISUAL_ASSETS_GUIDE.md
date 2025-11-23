# Engezna Visual Assets Creation Guide

**For Designers & Illustrators**  
**Version:** 2.0  
**Last Updated:** November 23, 2025

---

## 🎨 Logo Asset Specifications

### 1. Horizontal Lockup (Primary)

**Filename:** `engezna-logo-horizontal-[color]-[locale].svg`

**Specifications:**
- Artboard Size: 800px × 200px
- Logo Width: 600px (with 100px padding each side)
- Text: "انجزنا" (Noto Sans Arabic Semibold 600, 72pt) + "•" + "Engezna" (Noto Sans Semibold 600, 64pt)
- Separator: "•" bullet (36pt, centered)

**Variants to Create:**

| Filename | Color | Background |
|----------|-------|------------|
| `engezna-logo-horizontal-primary-ar.svg` | #E85D04 | Transparent |
| `engezna-logo-horizontal-black-ar.svg` | #000000 | Transparent |
| `engezna-logo-horizontal-white-ar.svg` | #FFFFFF | Transparent |

**Layout:**
```
┌────────────────────────────────────┐
│                                    │
│    انجزنا   •   Engezna            │
│                                    │
└────────────────────────────────────┘
```

---

### 2. Stacked Lockup

**Filename:** `engezna-logo-stacked-[color].svg`

**Specifications:**
- Artboard Size: 400px × 400px
- Logo Area: 300px × 300px (centered)
- Arabic: 80pt, English: 72pt
- Separator: 2px line, 60px width, 20% opacity

**Layout:**
```
┌──────────────┐
│   انجزنا     │
│   ─────      │
│  Engezna     │
└──────────────┘
```

---

### 3. App Icon / Favicon

**Concept:** Fusion of Arabic "ن" (Noon) + English "E"

**Artboard Sizes:**
- 16×16px (favicon.ico)
- 32×32px (favicon)
- 192×192px (Android)
- 512×512px (iOS, PWA master)

**Design:**
- Background: Orange Primary #E85D04 OR White #FFFFFF
- Lettermark: White on orange OR Orange on white
- Rounded corners: 20% of size
- Stroke weight: 48px (for 512px version)

**Color Variants:**
- icon-512-orange-white.png (Orange bg, white mark)
- icon-512-white-orange.png (White bg, orange mark)

---

## 🎯 Icon Set Specifications

### UI Icons (Line Style)

**Specs:**
- Size: 24×24px (also 16, 32, 48)
- Stroke Width: 2px
- Stroke Cap: Round
- Stroke Join: Round
- Color: currentColor (inherits)

**Icons to Create:**

| Name | Description |
|------|-------------|
| icon-home.svg | House outline |
| icon-search.svg | Magnifying glass |
| icon-cart.svg | Shopping cart |
| icon-user.svg | User profile |
| icon-heart.svg | Favorite |
| icon-star.svg | Rating |
| icon-clock.svg | Time |
| icon-location.svg | Pin/marker |
| icon-menu.svg | Hamburger menu |
| icon-check.svg | Checkmark |

---

## 📱 Social Media Assets

### Profile Picture (Square)

**Dimensions:** 1024×1024px
**Design:**
- Background: Orange Primary #E85D04
- Logo: White stacked lockup, centered
- Padding: 150px all sides

**Filename:** `social-profile-1024.png`

---

### Cover Photo (Facebook)

**Dimensions:** 1640×624px

**Layout:**
```
┌──────────────────────────────────┐
│ [Food Photo] │ [Orange + Logo]   │
│              │   انجزنا           │
│              │  Engezna           │
└──────────────────────────────────┘
```

**Filename:** `social-cover-facebook-1640x624.png`

---

### Instagram Story Template

**Dimensions:** 1080×1920px

**Layout:**
```
┌─────────────┐
│   [Logo]    │  ← Top 200px
│   [Photo]   │  ← Center 1400px
│   [Text]    │  ← Bottom 320px
└─────────────┘
```

---

## 🖨️ Print Materials

### Business Card

**Dimensions:** 90×50mm (standard)
**Bleed:** 3mm all sides
**Safe Area:** 5mm from edge

**Front:**
```
┌───────────────────┐
│  انجزنا • Engezna │  ← Logo top
│                   │
│  [Name/Title]     │  ← Bottom right
│  📱 [Phone]       │
└───────────────────┘
```

**Colors:**
- Front: White bg, orange logo
- Back: Orange bg, white text

---

### CMYK Color Conversions

| Color | RGB | CMYK |
|-------|-----|------|
| Orange Primary | #E85D04 | C:0 M:74 Y:98 K:9 |
| Black | #000000 | C:0 M:0 Y:0 K:100 |
| Orange Accent | #FF6B35 | C:0 M:73 Y:85 K:0 |

---

## 📐 Design Tool Setup

### Figma

**Color Styles:**
```
Primary/Orange Primary: #E85D04
Secondary/Black: #000000
Accent/Orange Accent: #FF6B35
Accent/Gold: #FDB927
Accent/Blue: #2196F3
```

**Text Styles:**
```
AR/Display/Bold - Noto Sans Arabic 700, 56px
AR/H1/Semibold - Noto Sans Arabic 600, 40px
AR/Body/Regular - Noto Sans Arabic 400, 16px

EN/Display/Bold - Noto Sans 700, 48px
EN/H1/Semibold - Noto Sans 600, 36px
EN/Body/Regular - Noto Sans 400, 16px
```

---

## ✅ Export Checklist

### SVG Export
- [ ] Remove unused elements
- [ ] Outline text
- [ ] Optimize paths
- [ ] Set viewBox correctly
- [ ] Compress (SVGO)

### PNG Export
- [ ] Export at 1x, 2x, 3x
- [ ] Transparent background
- [ ] Optimize (TinyPNG)
- [ ] Name with size

### Print Export
- [ ] CMYK color mode
- [ ] 300 DPI
- [ ] Include bleed
- [ ] Outline text
- [ ] PDF/X-1a format

---

## 📦 File Structure

```
engezna-brand-assets/
├── logos/
│   ├── svg/
│   ├── png/
│   │   ├── 1x/
│   │   ├── 2x/
│   │   └── 3x/
│   └── ai/
├── icons/
│   ├── ui-icons/
│   └── app-icons/
├── social/
│   ├── profile-pictures/
│   └── covers/
└── print/
    ├── business-cards/
    └── flyers/
```

---

## 🎓 Best Practices

### DO ✅
- Maintain consistent stroke weights
- Use brand colors only
- Test logos at multiple sizes
- Export in multiple formats
- Optimize file sizes
- Version control designs

### DON'T ❌
- Distort logo proportions
- Use off-brand colors
- Add effects unless specified
- Use raster in logos (SVG only)
- Ignore accessibility
- Mix font families

---

**Contact:** info@engezna.com  
**Project:** https://github.com/Mosabragab/Engezna

---

**Happy designing! 🎨**
