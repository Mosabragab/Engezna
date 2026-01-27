# SDUI (Server-Driven UI) Expansion Plan

## Overview

This document outlines the comprehensive plan for expanding the Server-Driven UI system across the Engezna platform. The SDUI system allows administrators to control page layouts, section visibility, and content without requiring code deployments.

## Current Implementation (Completed)

### Homepage SDUI
- **Location**: `/[locale]/page.tsx`
- **Admin Panel**: `/[locale]/admin/homepage`
- **Features**:
  - Drag-and-drop section reordering
  - Section visibility toggling
  - Preview mode (opens in new window)
  - Version history for rollback
  - 3-layer caching (Default → LocalStorage → Server)

### Database Tables
- `homepage_sections` - Main sections configuration
- `homepage_section_drafts` - Preview drafts with tokens
- `homepage_layout_versions` - Version history for rollback

---

## Phase 1: High-Impact Customer Pages

### 1.1 Offers Page SDUI
**Priority**: High | **Complexity**: Low

**Current Sections**:
- Featured offer banner (hardcoded)
- Active promo codes list
- Free delivery providers

**SDUI Sections to Add**:
| Section Key | Type | Description |
|------------|------|-------------|
| `offers_hero` | hero_banner | Featured offer banner |
| `promo_codes` | promo_list | Active promo codes display |
| `free_delivery` | provider_grid | Free delivery providers |
| `flash_deals` | carousel | Time-limited flash deals |
| `category_offers` | offer_grid | Category-specific offers |

**Database Changes**:
```sql
-- New table for offers page sections
CREATE TABLE offers_page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type VARCHAR(50) NOT NULL,
  section_key VARCHAR(100) UNIQUE NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  config JSONB DEFAULT '{}',
  content JSONB DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  target_roles TEXT[] DEFAULT ARRAY['customer', 'guest'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Welcome/Landing Page SDUI
**Priority**: High | **Complexity**: Medium

**Current Sections**:
- Hero section with CTA
- Categories showcase
- Features/Why Engezna
- How it works steps
- Available governorates
- Final CTA section

**SDUI Sections to Add**:
| Section Key | Type | Description |
|------------|------|-------------|
| `welcome_hero` | hero_section | Main hero with logo and CTA |
| `welcome_categories` | categories_grid | Category cards showcase |
| `welcome_features` | features_grid | Why Engezna features |
| `welcome_steps` | steps_display | How it works steps |
| `welcome_governorates` | governorates_list | Available locations |
| `welcome_cta` | cta_section | Final call to action |
| `welcome_partners` | partner_cta | Partner invitation section |

### 1.3 Scheduling System
**Priority**: Medium | **Complexity**: Medium

**Purpose**: Allow sections to appear/disappear based on date/time.

**Features**:
- Start date/end date for sections
- Day of week targeting (e.g., Friday specials)
- Time-based visibility (e.g., breakfast items 6AM-11AM)

**Database Changes**:
```sql
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS schedule_rules JSONB DEFAULT '{}';
-- schedule_rules example: {"days": [5, 6], "start_time": "06:00", "end_time": "11:00"}
```

---

## Phase 2: Provider & Content Pages

### 2.1 Providers Listing Page SDUI
**Priority**: Medium | **Complexity**: Medium

**Current Sections**:
- Search/filter bar
- Category filters
- Provider cards grid

**SDUI Sections to Add**:
| Section Key | Type | Description |
|------------|------|-------------|
| `providers_hero` | search_hero | Search and filter header |
| `providers_featured` | featured_carousel | Featured providers carousel |
| `providers_filters` | filter_bar | Category/sort filters |
| `providers_grid` | provider_grid | Main providers listing |
| `providers_categories` | category_tabs | Category quick filters |

### 2.2 Content Editor Enhancement
**Priority**: Medium | **Complexity**: High

**Features**:
- Rich text editor for custom HTML sections
- Image upload and management
- Banner design tool
- Template library

### 2.3 Search Results Page SDUI
**Priority**: Low | **Complexity**: Low

**SDUI Sections**:
- Search suggestions
- Recent searches
- Trending searches
- Results display configuration

---

## Phase 3: Advanced Features

### 3.1 Analytics Dashboard
**Priority**: Medium | **Complexity**: High

**Features**:
- Section click-through rates
- Visibility duration tracking
- A/B test results
- Heatmap data collection

### 3.2 Advanced Targeting
**Priority**: Medium | **Complexity**: High

**Targeting Options**:
- User role (customer, guest, provider)
- Geographic (governorate, city)
- User behavior (new vs returning)
- Device type (mobile, desktop)
- Time-based (schedules)

### 3.3 Version History UI
**Priority**: Low | **Complexity**: Medium

**Features**:
- Visual diff between versions
- One-click rollback
- Version comparison view
- Change log with author info

---

## Phase 4: Provider Dashboard & A/B Testing

### 4.1 A/B Testing Framework
**Priority**: Low | **Complexity**: High

**Features**:
- Create test variants
- Traffic splitting
- Statistical significance calculation
- Auto-winner selection

### 4.2 Provider Dashboard SDUI
**Priority**: Low | **Complexity**: Medium

**Customizable Sections**:
- Quick stats cards
- Recent orders
- Revenue chart
- Menu item performance
- Review highlights

---

## Implementation Timeline

| Phase | Components | Estimated Duration |
|-------|------------|-------------------|
| Phase 1 | Offers page, Welcome page, Scheduling | 1-2 weeks |
| Phase 2 | Providers listing, Content editor, Search | 2-3 weeks |
| Phase 3 | Analytics, Advanced targeting, Version UI | 2-3 weeks |
| Phase 4 | A/B testing, Provider dashboard | 2-3 weeks |

---

## Technical Architecture

### Hook Pattern
```typescript
// Customer-facing hook
const { sections, isSectionVisible, getSectionConfig } = useSDUI({
  page: 'offers', // or 'welcome', 'providers', etc.
  userRole: 'customer',
  governorateId,
  cityId,
  previewToken,
});

// Admin hook
const {
  sections,
  toggleVisibility,
  reorderSections,
  updateSectionConfig,
  createPreviewDraft,
  saveLayoutVersion,
} = useSDUIAdmin({ page: 'offers' });
```

### Database Function Pattern
```sql
CREATE OR REPLACE FUNCTION get_page_sections(
  p_page TEXT,
  p_user_role TEXT DEFAULT 'guest',
  p_governorate_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL
) RETURNS SETOF RECORD AS $$
BEGIN
  -- Return visible sections for the page
  -- Apply role and geographic targeting
  -- Apply schedule rules
END;
$$ LANGUAGE plpgsql;
```

### Admin Panel Pattern
Each page with SDUI support gets:
1. Admin route at `/admin/{page-name}`
2. Section list with drag-and-drop
3. Visibility toggles
4. Config editors per section type
5. Preview functionality
6. Version history

---

## File Structure

```
src/
├── hooks/
│   └── sdui/
│       ├── index.ts
│       ├── useSDUI.ts           # Generic SDUI hook
│       ├── useSDUIAdmin.ts      # Admin management hook
│       └── types.ts             # Shared types
├── app/[locale]/
│   ├── admin/
│   │   ├── homepage/            # Homepage SDUI admin
│   │   ├── offers/              # Offers page SDUI admin
│   │   └── welcome/             # Welcome page SDUI admin
│   ├── page.tsx                 # Homepage (SDUI integrated)
│   ├── offers/page.tsx          # Offers page (SDUI)
│   └── welcome/page.tsx         # Welcome page (SDUI)
└── components/
    └── admin/
        └── sdui/
            ├── SectionList.tsx
            ├── SectionEditor.tsx
            └── PreviewMode.tsx

supabase/
└── migrations/
    ├── 20260126000001_homepage_sections_sdui.sql
    ├── 20260127000001_offers_page_sdui.sql
    └── 20260127000002_welcome_page_sdui.sql
```

---

## Success Metrics

1. **Admin Efficiency**: Reduce time to update content by 80%
2. **Deployment Reduction**: Decrease code deployments for content changes by 90%
3. **Error Rate**: Maintain <0.1% error rate with fallback system
4. **Performance**: Keep page load time impact under 50ms

---

## Rollback Strategy

Each SDUI-enabled page has a 3-layer fallback:
1. **Layer 1 - Defaults**: Hardcoded default sections always available
2. **Layer 2 - Cache**: LocalStorage cache (30-minute TTL)
3. **Layer 3 - Server**: Fresh data from database

If server fails, cache is used. If cache expires/missing, defaults are used.

---

## Security Considerations

1. **RLS Policies**: All SDUI tables have row-level security
2. **Admin-Only Access**: Only admin role can modify sections
3. **Preview Tokens**: Expire after 1 hour
4. **Content Sanitization**: HTML content is sanitized before rendering

---

## Next Steps

1. Execute Phase 1 migrations
2. Create offers page SDUI integration
3. Create welcome page SDUI integration
4. Add scheduling system
5. Create admin panels for new pages
