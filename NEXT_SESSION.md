# Next Session Plan

## Date: 2025-12-11 (Upcoming)

## Priority Tasks for Next Session

### 1. Product Images Import from Excel
**Goal**: Allow providers to include product image URLs/paths in Excel for bulk import

#### Implementation Steps:
1. **Add Image Column to Excel Template**
   - New column: `image_url` or `image`
   - Accepts: URL (https://...) or Supabase storage path

2. **Update Menu Import API**
   - File: `src/app/api/menu-import/save/route.ts`
   - Parse image_url column from Excel
   - Validate URL format
   - Save to `menu_items.image_url`

3. **Update Menu Import UI**
   - File: `src/app/[locale]/provider/menu-import/page.tsx`
   - Show image preview in parsed products table
   - Handle missing/invalid images gracefully

4. **Image Upload Option** (Optional Enhancement)
   - Allow providers to upload images to Supabase storage
   - Generate public URLs automatically
   - Reference images by filename in Excel

#### Alternative: Image Matching by Name
- Provider uploads images to a folder
- Image filename matches product name_ar or name_en
- System auto-matches during import

### 2. Remaining Testing
- [ ] Verify categories display correctly on customer page
- [ ] Test product detail modal opening
- [ ] Test variant selection and add to cart
- [ ] Test all 156 products display correctly

### 3. Documentation
- [ ] Complete Excel import guide for customers
- [ ] Update PRD.md with pricing types section

---

## Completed in Previous Session (2025-12-10)

### Excel Import System
- [x] 4 pricing types: fixed, per_unit, variants, weight_variants
- [x] Product variants table and system
- [x] Provider categories table
- [x] Excel import page with preview
- [x] Import API endpoint
- [x] Successfully imported 30 categories, 156 products, 203 variants

### UI Fixes
- [x] Modal z-index fix (z-[60] vs z-50)
- [x] Add to Cart button visibility
- [x] Product detail modal component
- [x] Variant selection modal component
- [x] Provider products page - category display with LEFT JOIN fix

---

## Key Technical Notes

### Supabase JOIN Gotcha
**NEVER use `!foreign_key` syntax for nullable relations!**
```typescript
// This creates INNER JOIN - products without category disappear!
.select(`*, category:provider_categories!category_id (...)`)

// Use separate queries instead
const products = await supabase.from('menu_items').select('*')
const categories = await supabase.from('provider_categories').select('*')
```

### Pricing Types Reference
| Type | Description | Example |
|------|-------------|---------|
| `fixed` | Single fixed price | Coffee - 25 EGP |
| `per_unit` | Price per unit/kg | Meat - 250 EGP/kg |
| `variants` | Size/option variants | Pizza: Small/Medium/Large |
| `weight_variants` | Weight variants | Lamb: 250g/500g/1kg |

### Variants Format in Excel
```
نصف كيلو:480|ربع كيلو:250|كيلو:900
```
Format: `name:price|name:price|...`

---

## Database Tables Reference

### product_variants
```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items(id),
  variant_type VARCHAR(50), -- size, weight, option
  name_ar VARCHAR(255),
  name_en VARCHAR(255),
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  is_default BOOLEAN,
  display_order INTEGER,
  is_available BOOLEAN
);
```

### provider_categories
```sql
CREATE TABLE provider_categories (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES providers(id),
  name_ar VARCHAR(255),
  name_en VARCHAR(255),
  description_ar TEXT,
  description_en TEXT,
  display_order INTEGER,
  is_active BOOLEAN
);
```

---

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| provider@test.com | Test123! | سوبر ماركت النجاح |
| provider2@test.com | Test123! | سلطان بيتزا |
| customer@test.com | Test123! | Customer |
| admin@test.com | Test123! | Admin |
