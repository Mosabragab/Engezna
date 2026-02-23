/**
 * Excel Import Utility for Product Import System
 * Supports intelligent column detection for Arabic/English product lists
 *
 * Pricing Types:
 * - fixed: Single fixed price (sandwiches, drinks)
 * - per_unit: Price per unit with quantity (vegetables by kg)
 * - variants: Multiple options with different prices (pizza sizes, kebab weights)
 */

// XLSX is dynamically imported in readExcelFile to reduce bundle size (~45KB)
import type { ExtractedCategory, ExtractedProduct, ExtractedVariant } from '@/types/menu-import';
import {
  PRICING_TYPES,
  VARIANT_TYPES,
  detectPricingTypeFromSheetName,
  detectVariantTypeFromHeaders,
  type PricingType,
  type VariantType,
} from '@/lib/constants/pricing-types';
import { UNIT_TYPES, getSuggestedUnit, type UnitType } from '@/lib/constants/unit-types';

// ═══════════════════════════════════════════════════════════════
// COLUMN DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════

export const COLUMN_PATTERNS: Record<string, string[]> = {
  // Category - IMPORTANT: 'الصنف' was removed because it conflicts with product detection
  // In Arabic Excel files: 'التصنيف' = category, 'الصنف' = product item name
  category: ['القسم', 'الفئة', 'التصنيف', 'category', 'section', 'type', 'نوع', 'الاقسام', 'قسم'],

  // Product name - 'الصنف' here means the item/product name
  product: [
    'المنتج',
    'الاسم',
    'الصنف',
    'البند',
    'product',
    'name',
    'item',
    'اسم المنتج',
    'المنتجات',
    'الأصناف',
    'منتج',
    'صنف',
  ],

  // Single price
  price: ['السعر', 'price', 'سعر', 'الثمن', 'cost', 'التكلفة'],

  // Unit column
  unit: ['الوحدة', 'unit', 'وحدة'],

  // Size variants (S/M/L) - removed single-char patterns to avoid false matches
  size_small: ['صغير', 'small', 'سمول'],
  size_medium: ['وسط', 'medium', 'متوسط', 'ميديم'],
  size_large: ['كبير', 'large', 'لارج'],
  size_xlarge: ['كبير جداً', 'xlarge', 'اكس لارج', 'سوبر', 'عائلي', 'family'],

  // Regular/Super variants (sandwiches)
  size_regular: ['عادي', 'regular', 'عادى', 'نورمال'],
  size_super: ['سوبر', 'super', 'اكسترا', 'extra'],

  // Weight variants (restaurants - ربع/نص/كيلو)
  weight_quarter: ['ربع كيلو', 'ربع', 'quarter', '¼'],
  weight_half: ['نص كيلو', 'نصف كيلو', 'نص', 'نصف', 'half', '½'],
  weight_3quarters: ['ثلاثة أرباع', '¾', '3/4', '750جم', '750g'],
  weight_kilo: ['كيلو', 'kilo', 'kg', '1 كيلو', 'كامل'],

  // Weight variants (coffee/spices - grams)
  weight_100g: ['100 جم', '100جم', '100g', '100 جرام', '100جرام'],
  weight_250g: ['250 جم', '250جم', '250g', '250 جرام', '250جرام'],
  weight_500g: ['500 جم', '500جم', '500g', '500 جرام', '500جرام'],

  // Description
  description: ['الوصف', 'description', 'وصف', 'المكونات', 'تفاصيل', 'details'],

  // English name
  name_en: ['الاسم بالانجليزي', 'english name', 'name en', 'الاسم الانجليزي'],

  // Image URL
  image_url: [
    'الصورة',
    'صورة',
    'image',
    'image_url',
    'imageurl',
    'رابط الصورة',
    'url',
    'photo',
    'صوره',
  ],
};

// ═══════════════════════════════════════════════════════════════
// VARIANT GROUP CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export const VARIANT_GROUPS = {
  // Regular/Super (sandwiches, shawarma)
  sizes_regular_super: {
    variantType: 'size' as VariantType,
    columns: ['size_regular', 'size_super'],
    labels: {
      size_regular: { ar: 'عادي', en: 'Regular' },
      size_super: { ar: 'سوبر', en: 'Super' },
    },
  },
  // Small/Medium/Large (pizza, etc.)
  sizes: {
    variantType: 'size' as VariantType,
    columns: ['size_small', 'size_medium', 'size_large', 'size_xlarge'],
    labels: {
      size_small: { ar: 'صغير', en: 'Small' },
      size_medium: { ar: 'وسط', en: 'Medium' },
      size_large: { ar: 'كبير', en: 'Large' },
      size_xlarge: { ar: 'كبير جداً', en: 'X-Large' },
    },
  },
  // Restaurant weights (quarter/half/kilo)
  weights_restaurant: {
    variantType: 'weight' as VariantType,
    columns: ['weight_quarter', 'weight_half', 'weight_3quarters', 'weight_kilo'],
    labels: {
      weight_quarter: { ar: 'ربع كيلو', en: 'Quarter', multiplier: 0.25 },
      weight_half: { ar: 'نص كيلو', en: 'Half', multiplier: 0.5 },
      weight_3quarters: { ar: 'ثلاثة أرباع', en: '3/4', multiplier: 0.75 },
      weight_kilo: { ar: 'كيلو', en: 'Kilo', multiplier: 1 },
    },
  },
  // Coffee/spices weights (100g/250g/500g/kg)
  weights_coffee: {
    variantType: 'coffee_weight' as VariantType,
    columns: ['weight_100g', 'weight_250g', 'weight_500g', 'weight_kilo'],
    labels: {
      weight_100g: { ar: '100 جرام', en: '100g', multiplier: 0.1 },
      weight_250g: { ar: '250 جرام', en: '250g', multiplier: 0.25 },
      weight_500g: { ar: '500 جرام', en: '500g', multiplier: 0.5 },
      weight_kilo: { ar: 'كيلو', en: '1kg', multiplier: 1 },
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface ColumnMapping {
  category?: number;
  product: number;
  price?: number;
  description?: number;
  name_en?: number;
  unit?: number;
  image_url?: number;
  variants: Array<{
    column: number;
    key: string;
    name_ar: string;
    name_en: string;
    variantType: VariantType;
    multiplier?: number;
  }>;
}

export interface DetectionResult {
  mapping: ColumnMapping;
  confidence: number;
  pricingType: PricingType;
  variantType: VariantType | null;
  unitType: UnitType | null;
  variantGroup: keyof typeof VARIANT_GROUPS | null;
  suggestions: string[];
  headers: string[];
  sampleData: string[][];
}

export interface ParsedExcelData {
  categories: ExtractedCategory[];
  totalProducts: number;
  warnings: string[];
  pricingType: PricingType;
  variantType: VariantType | null;
  unitType: UnitType | null;
}

export interface MultiSheetResult {
  sheets: Array<{
    name: string;
    detection: DetectionResult;
    data: ParsedExcelData;
  }>;
  combined: ParsedExcelData;
}

export interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

// ═══════════════════════════════════════════════════════════════
// EXCEL FILE READING
// ═══════════════════════════════════════════════════════════════

/**
 * Read Excel file and return data from ALL sheets
 */
export async function readExcelFile(file: File): Promise<{
  sheets: SheetData[];
  sheetNames: string[];
}> {
  // Dynamic import XLSX to reduce initial bundle size (~45KB saved)
  const XLSX = await import('xlsx');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheets: SheetData[] = [];

        // Read ALL sheets
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
            header: 1,
            defval: null,
          });

          if (jsonData.length < 2) {
            continue; // Skip empty sheets
          }

          // First row is headers
          const headers = (jsonData[0] || []).map((h) => String(h || '').trim());
          const rows = jsonData
            .slice(1)
            .filter((row) => row.some((cell) => cell !== null && cell !== ''));

          if (rows.length > 0) {
            sheets.push({
              name: sheetName,
              headers,
              rows,
            });
          }
        }

        if (sheets.length === 0) {
          reject(new Error('الملف فارغ أو لا يحتوي على بيانات كافية'));
          return;
        }

        resolve({
          sheets,
          sheetNames: workbook.SheetNames,
        });
      } catch (error) {
        reject(new Error('فشل في قراءة الملف: ' + (error as Error).message));
      }
    };

    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a column contains mostly numeric values (prices)
 */
function isNumericColumn(rows: (string | number | null)[][], columnIndex: number): boolean {
  let numericCount = 0;
  let totalCount = 0;

  for (const row of rows.slice(0, 10)) {
    const value = row[columnIndex];
    if (value !== null && value !== undefined && value !== '') {
      totalCount++;
      if (
        typeof value === 'number' ||
        (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[^\d.-]/g, ''))))
      ) {
        numericCount++;
      }
    }
  }

  return totalCount > 0 && numericCount / totalCount >= 0.8;
}

/**
 * Parse price from cell value
 */
function parsePrice(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value > 0 ? value : null;
  }

  const cleanedValue = String(value)
    .replace(/[^\d.,-]/g, '')
    .replace(',', '.')
    .trim();

  const parsed = parseFloat(cleanedValue);
  return !isNaN(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Detect pricing type and unit from sheet name
 */
function detectFromSheetName(sheetName: string): {
  pricingType: PricingType;
  variantType: VariantType | null;
  unitType: UnitType | null;
  variantGroup: keyof typeof VARIANT_GROUPS | null;
} {
  const name = sheetName.toLowerCase();

  // Check for per_unit patterns (vegetables, fruits, grocery)
  if (name.includes('خضار') || name.includes('فاكهة') || name.includes('فواكه')) {
    return {
      pricingType: 'per_unit',
      variantType: null,
      unitType: 'kg',
      variantGroup: null,
    };
  }

  if (name.includes('سوبر') || name.includes('بقالة') || name.includes('grocery')) {
    return {
      pricingType: 'fixed',
      variantType: null,
      unitType: 'piece',
      variantGroup: null,
    };
  }

  // Check for variants patterns
  if (name.includes('أحجام') || name.includes('احجام') || name.includes('sizes')) {
    return {
      pricingType: 'variants',
      variantType: 'size',
      unitType: null,
      variantGroup: 'sizes',
    };
  }

  if (
    name.includes('مشويات') ||
    name.includes('كباب') ||
    name.includes('لحوم') ||
    name.includes('أوزان') ||
    name.includes('اوزان')
  ) {
    return {
      pricingType: 'variants',
      variantType: 'weight',
      unitType: null,
      variantGroup: 'weights_restaurant',
    };
  }

  if (name.includes('قهوة') || name.includes('coffee') || name.includes('جرامات')) {
    return {
      pricingType: 'variants',
      variantType: 'coffee_weight',
      unitType: null,
      variantGroup: 'weights_coffee',
    };
  }

  // Check for restaurant patterns (fixed or variants)
  if (name.includes('مطعم') || name.includes('restaurant') || name.includes('وجبات')) {
    return {
      pricingType: 'fixed',
      variantType: null,
      unitType: 'piece',
      variantGroup: null,
    };
  }

  // Default
  return {
    pricingType: 'fixed',
    variantType: null,
    unitType: null,
    variantGroup: null,
  };
}

// ═══════════════════════════════════════════════════════════════
// COLUMN DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect column mapping from headers
 */
export function detectColumns(
  headers: string[],
  rows?: (string | number | null)[][],
  sheetName?: string
): DetectionResult {
  const mapping: ColumnMapping = {
    product: -1,
    variants: [],
  };

  const suggestions: string[] = [];
  let confidence = 0;
  let matchedCount = 0;

  // Get hints from sheet name
  const sheetHints = sheetName
    ? detectFromSheetName(sheetName)
    : {
        pricingType: 'fixed' as PricingType,
        variantType: null,
        unitType: null,
        variantGroup: null,
      };

  // Normalize headers
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim().replace(/\s+/g, ' '));

  // Helper to find column with strict matching
  const findColumn = (patternKey: string): number => {
    const patterns = COLUMN_PATTERNS[patternKey];
    if (!patterns) return -1;

    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      if (!header || header.length === 0) continue;

      for (const pattern of patterns) {
        const normalizedPattern = pattern.toLowerCase();

        // Exact match (highest priority)
        if (header === normalizedPattern) {
          return i;
        }

        // Header contains pattern (pattern must be 2+ chars to avoid false positives)
        if (normalizedPattern.length >= 2 && header.includes(normalizedPattern)) {
          return i;
        }

        // Pattern contains header (header must be 2+ chars to avoid false positives)
        if (header.length >= 2 && normalizedPattern.includes(header)) {
          return i;
        }
      }
    }
    return -1;
  };

  // Detect product column (required)
  mapping.product = findColumn('product');
  if (mapping.product === -1) {
    // First non-numeric column might be product
    for (let i = 0; i < headers.length; i++) {
      if (!normalizedHeaders[i].match(/\d/) && normalizedHeaders[i].length > 0) {
        if (mapping.category === undefined || mapping.category !== i) {
          mapping.product = i;
          suggestions.push(`تم تخمين عمود المنتج: "${headers[i]}"`);
          break;
        }
      }
    }
  } else {
    matchedCount++;
  }

  // Detect other basic columns
  mapping.category = findColumn('category');
  if (mapping.category !== -1) matchedCount++;

  mapping.description = findColumn('description');
  if (mapping.description !== -1) matchedCount++;

  mapping.name_en = findColumn('name_en');
  if (mapping.name_en !== -1) matchedCount++;

  mapping.unit = findColumn('unit');
  if (mapping.unit !== -1) matchedCount++;

  mapping.image_url = findColumn('image_url');
  if (mapping.image_url !== -1) matchedCount++;

  // Detect price column
  const priceCol = findColumn('price');

  // Detect variant columns
  let detectedVariantGroup: keyof typeof VARIANT_GROUPS | null = null;
  let detectedVariantType: VariantType | null = null;

  // Check each variant group and find the BEST match (most columns matched)
  let bestGroupMatch: {
    groupKey: keyof typeof VARIANT_GROUPS;
    variants: ColumnMapping['variants'];
    variantType: VariantType;
  } | null = null;

  for (const [groupKey, group] of Object.entries(VARIANT_GROUPS)) {
    const foundVariants: ColumnMapping['variants'] = [];

    for (const colKey of group.columns) {
      const colIndex = findColumn(colKey);
      if (colIndex !== -1) {
        const labelInfo = (
          group.labels as Record<string, { ar: string; en: string; multiplier?: number }>
        )[colKey];
        if (labelInfo) {
          // Use ACTUAL column header for display, but keep multiplier from config
          const actualHeader = headers[colIndex] || labelInfo.ar;
          foundVariants.push({
            column: colIndex,
            key: colKey,
            name_ar: actualHeader, // Use actual header name!
            name_en: actualHeader, // Use actual header name!
            variantType: group.variantType,
            multiplier: labelInfo.multiplier,
          });
        }
      }
    }

    // Keep track of best match (most columns matched)
    if (foundVariants.length >= 2) {
      if (!bestGroupMatch || foundVariants.length > bestGroupMatch.variants.length) {
        bestGroupMatch = {
          groupKey: groupKey as keyof typeof VARIANT_GROUPS,
          variants: foundVariants,
          variantType: group.variantType,
        };
      }
    }
  }

  // Use the best matching group
  if (bestGroupMatch) {
    mapping.variants = bestGroupMatch.variants;
    detectedVariantGroup = bestGroupMatch.groupKey;
    detectedVariantType = bestGroupMatch.variantType;
    matchedCount += bestGroupMatch.variants.length;
  }

  // If no variants found, check for numeric columns
  if (mapping.variants.length === 0 && priceCol !== -1) {
    mapping.price = priceCol;
    matchedCount++;
  }

  // Auto-detect numeric columns as price columns
  if (mapping.variants.length === 0 && mapping.price === undefined && rows) {
    const numericColumns: number[] = [];
    for (let i = 0; i < headers.length; i++) {
      if (
        i !== mapping.product &&
        i !== mapping.category &&
        i !== mapping.description &&
        i !== mapping.unit
      ) {
        if (isNumericColumn(rows, i)) {
          numericColumns.push(i);
        }
      }
    }

    if (numericColumns.length === 1) {
      mapping.price = numericColumns[0];
      matchedCount++;
    } else if (numericColumns.length >= 2) {
      // Multiple price columns = variants
      const looksLikeSizes = numericColumns.some((col) =>
        /صغير|وسط|كبير|small|medium|large/i.test(headers[col])
      );
      const looksLikeWeights = numericColumns.some((col) =>
        /ربع|نص|كيلو|quarter|half|kilo|جرام|gram/i.test(headers[col])
      );

      for (let idx = 0; idx < numericColumns.length; idx++) {
        const col = numericColumns[idx];
        const varType = looksLikeWeights ? 'weight' : looksLikeSizes ? 'size' : 'option';
        mapping.variants.push({
          column: col,
          key: `variant_${idx}`,
          name_ar: headers[col] || `خيار ${idx + 1}`,
          name_en: headers[col] || `Option ${idx + 1}`,
          variantType: varType,
        });
      }

      if (looksLikeWeights) {
        detectedVariantGroup = 'weights_restaurant';
        detectedVariantType = 'weight';
      } else if (looksLikeSizes) {
        detectedVariantGroup = 'sizes';
        detectedVariantType = 'size';
      } else {
        detectedVariantGroup = null;
        detectedVariantType = 'option';
      }
      matchedCount += numericColumns.length;
    }
  }

  // Calculate confidence
  const totalPossible = 4 + (mapping.variants.length || 1);
  confidence = Math.min(1, matchedCount / totalPossible);

  // Determine final pricing type
  let pricingType: PricingType = 'fixed';
  let variantType: VariantType | null = null;
  let unitType: UnitType | null = null;

  if (mapping.variants.length > 0) {
    pricingType = 'variants';
    variantType = detectedVariantType || sheetHints.variantType;
  } else if (sheetHints.pricingType === 'per_unit') {
    pricingType = 'per_unit';
    unitType = sheetHints.unitType || 'kg';
  } else {
    pricingType = 'fixed';
  }

  // Use sheet hints if no variants detected
  if (!detectedVariantGroup && sheetHints.variantGroup) {
    detectedVariantGroup = sheetHints.variantGroup;
    variantType = sheetHints.variantType;
    pricingType = 'variants';
  }

  // Suggestions
  if (confidence < 0.5) {
    suggestions.push('لم يتم التعرف على بعض الأعمدة، يرجى التحقق من التعيين');
  }
  if (mapping.product === -1) {
    suggestions.push('لم يتم العثور على عمود اسم المنتج');
  }

  return {
    mapping,
    confidence,
    pricingType,
    variantType,
    unitType,
    variantGroup: detectedVariantGroup,
    suggestions,
    headers,
    sampleData: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// DATA TRANSFORMATION
// ═══════════════════════════════════════════════════════════════

/**
 * Transform Excel rows to ExtractedCategory[] format
 */
export function transformExcelData(
  rows: (string | number | null)[][],
  mapping: ColumnMapping,
  pricingType: PricingType,
  variantType: VariantType | null = null,
  unitType: UnitType | null = null
): ParsedExcelData {
  const categoriesMap = new Map<string, ExtractedCategory>();
  const warnings: string[] = [];
  let totalProducts = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // Get product name
    const productName = mapping.product >= 0 ? String(row[mapping.product] || '').trim() : '';
    if (!productName) continue;

    // Get category
    let categoryName = 'عام';
    if (mapping.category !== undefined && mapping.category >= 0) {
      const catValue = row[mapping.category];
      if (catValue) categoryName = String(catValue).trim();
    }

    // Get or create category
    if (!categoriesMap.has(categoryName)) {
      categoriesMap.set(categoryName, {
        name_ar: categoryName,
        name_en: null,
        icon: null,
        display_order: categoriesMap.size + 1,
        products: [],
        default_pricing_type: pricingType,
        default_unit_type: unitType || undefined,
        default_variant_type: variantType || undefined,
      });
    }

    const category = categoriesMap.get(categoryName)!;

    // Get description and english name
    const description =
      mapping.description !== undefined && mapping.description >= 0
        ? String(row[mapping.description] || '').trim() || null
        : null;
    const nameEn =
      mapping.name_en !== undefined && mapping.name_en >= 0
        ? String(row[mapping.name_en] || '').trim() || null
        : null;

    // Get image URL
    let imageUrl: string | null = null;
    if (mapping.image_url !== undefined && mapping.image_url >= 0) {
      const rawUrl = String(row[mapping.image_url] || '').trim();
      // Validate that it's a URL
      if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
        imageUrl = rawUrl;
      }
    }

    // Build product
    const product: ExtractedProduct = {
      name_ar: productName,
      name_en: nameEn,
      description_ar: description,
      pricing_type: pricingType,
      variant_type: variantType,
      price: null,
      original_price: null,
      unit_type: unitType,
      min_quantity: unitType && UNIT_TYPES[unitType] ? UNIT_TYPES[unitType].min : 1,
      quantity_step: unitType && UNIT_TYPES[unitType] ? UNIT_TYPES[unitType].step : 1,
      variants: null,
      combo_contents_ar: null,
      serves_count: null,
      is_popular: false,
      is_spicy: false,
      is_vegetarian: false,
      image_url: imageUrl,
      confidence: 1.0,
      needs_review: false,
      source_note: 'Excel Import',
    };

    // Handle pricing based on type
    if (pricingType === 'fixed' || pricingType === 'per_unit') {
      if (mapping.price !== undefined && mapping.price >= 0) {
        const priceValue = row[mapping.price];
        product.price = parsePrice(priceValue);
        if (product.price === null) {
          product.needs_review = true;
          warnings.push(`صف ${rowIndex + 2}: لا يوجد سعر للمنتج "${productName}"`);
        }
      }
    } else if (pricingType === 'variants' && mapping.variants.length > 0) {
      // Build variants
      const variants: ExtractedVariant[] = [];
      let isFirst = true;

      for (const variantMapping of mapping.variants) {
        const priceValue = row[variantMapping.column];
        const price = parsePrice(priceValue);

        if (price !== null) {
          variants.push({
            name_ar: variantMapping.name_ar,
            name_en: variantMapping.name_en,
            price,
            is_default: isFirst,
            display_order: variants.length + 1,
            multiplier: variantMapping.multiplier,
          });
          isFirst = false;
        }
      }

      if (variants.length > 0) {
        product.variants = variants;
        product.price = variants[0].price;
        product.variant_type = variantType;
      } else {
        product.needs_review = true;
        product.pricing_type = 'fixed';
        warnings.push(`صف ${rowIndex + 2}: لا توجد أسعار للمنتج "${productName}"`);
      }
    }

    category.products.push(product);
    totalProducts++;
  }

  return {
    categories: Array.from(categoriesMap.values()),
    totalProducts,
    warnings,
    pricingType,
    variantType,
    unitType,
  };
}

// ═══════════════════════════════════════════════════════════════
// MULTI-SHEET PROCESSING
// ═══════════════════════════════════════════════════════════════

/**
 * Process all sheets from Excel file
 */
export function processAllSheets(sheets: SheetData[]): MultiSheetResult {
  const results: MultiSheetResult = {
    sheets: [],
    combined: {
      categories: [],
      totalProducts: 0,
      warnings: [],
      pricingType: 'fixed',
      variantType: null,
      unitType: null,
    },
  };

  for (const sheet of sheets) {
    // Detect columns with sheet name context
    const detection = detectColumns(sheet.headers, sheet.rows, sheet.name);

    // Transform data
    const data = transformExcelData(
      sheet.rows,
      detection.mapping,
      detection.pricingType,
      detection.variantType,
      detection.unitType
    );

    // Use sheet name as category if no category column
    if (detection.mapping.category === undefined || detection.mapping.category < 0) {
      const sheetCategory = sheet.name.split('-')[0].trim();
      if (sheetCategory) {
        data.categories.forEach((cat) => {
          if (cat.name_ar === 'عام') {
            cat.name_ar = sheetCategory;
          }
        });
      }
    }

    results.sheets.push({
      name: sheet.name,
      detection,
      data,
    });
  }

  // Combine all categories
  const categoryMap = new Map<string, ExtractedCategory>();

  for (const sheet of results.sheets) {
    for (const category of sheet.data.categories) {
      const existingCategory = categoryMap.get(category.name_ar);
      if (existingCategory) {
        existingCategory.products.push(...category.products);
      } else {
        categoryMap.set(category.name_ar, { ...category });
      }
    }

    results.combined.totalProducts += sheet.data.totalProducts;
    results.combined.warnings.push(...sheet.data.warnings);
  }

  results.combined.categories = Array.from(categoryMap.values()).map((cat, index) => ({
    ...cat,
    display_order: index + 1,
  }));

  return results;
}

// ═══════════════════════════════════════════════════════════════
// MANUAL MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Get column type options for manual mapping
 */
export function getColumnTypeOptions(): { value: string; label_ar: string; label_en: string }[] {
  return [
    { value: 'ignore', label_ar: 'تجاهل', label_en: 'Ignore' },
    { value: 'category', label_ar: 'القسم', label_en: 'Category' },
    { value: 'product', label_ar: 'اسم المنتج', label_en: 'Product Name' },
    { value: 'description', label_ar: 'الوصف', label_en: 'Description' },
    { value: 'name_en', label_ar: 'الاسم بالإنجليزي', label_en: 'English Name' },
    { value: 'price', label_ar: 'السعر', label_en: 'Price' },
    { value: 'unit', label_ar: 'الوحدة', label_en: 'Unit' },
    { value: 'image_url', label_ar: 'رابط الصورة', label_en: 'Image URL' },
    // Size variants
    { value: 'size_small', label_ar: 'صغير', label_en: 'Small' },
    { value: 'size_medium', label_ar: 'وسط', label_en: 'Medium' },
    { value: 'size_large', label_ar: 'كبير', label_en: 'Large' },
    { value: 'size_xlarge', label_ar: 'كبير جداً', label_en: 'X-Large' },
    { value: 'size_regular', label_ar: 'عادي', label_en: 'Regular' },
    { value: 'size_super', label_ar: 'سوبر', label_en: 'Super' },
    // Weight variants (restaurant)
    { value: 'weight_quarter', label_ar: 'ربع كيلو', label_en: 'Quarter' },
    { value: 'weight_half', label_ar: 'نص كيلو', label_en: 'Half' },
    { value: 'weight_kilo', label_ar: 'كيلو', label_en: 'Kilo' },
    // Weight variants (coffee/spices)
    { value: 'weight_100g', label_ar: '100 جرام', label_en: '100g' },
    { value: 'weight_250g', label_ar: '250 جرام', label_en: '250g' },
    { value: 'weight_500g', label_ar: '500 جرام', label_en: '500g' },
  ];
}

/**
 * Get pricing type options for selection
 */
export function getPricingTypeOptions(): {
  value: PricingType;
  label_ar: string;
  label_en: string;
  description_ar: string;
}[] {
  return [
    {
      value: 'fixed',
      label_ar: 'سعر ثابت',
      label_en: 'Fixed Price',
      description_ar: 'سعر واحد ثابت للمنتج (ساندوتش، مشروب)',
    },
    {
      value: 'per_unit',
      label_ar: 'بالوحدة',
      label_en: 'Per Unit',
      description_ar: 'السعر × الكمية (خضار بالكيلو، فاكهة)',
    },
    {
      value: 'variants',
      label_ar: 'خيارات متعددة',
      label_en: 'Variants',
      description_ar: 'أحجام أو أوزان مختلفة (بيتزا ص/م/ك، كباب ربع/نص/كيلو)',
    },
  ];
}

/**
 * Get unit type options for selection
 */
export function getUnitTypeOptions(): {
  value: UnitType;
  label_ar: string;
  label_en: string;
  category: string;
}[] {
  return Object.entries(UNIT_TYPES).map(([key, unit]) => ({
    value: key as UnitType,
    label_ar: unit.name_ar,
    label_en: unit.name_en,
    category: unit.category,
  }));
}

/**
 * Apply manual column mapping changes
 */
export function applyManualMapping(
  headers: string[],
  columnAssignments: Record<number, string>,
  pricingType: PricingType,
  variantType?: VariantType,
  unitType?: UnitType
): DetectionResult {
  const mapping: ColumnMapping = {
    product: -1,
    variants: [],
  };

  // Process assignments
  for (const [colIndexStr, assignment] of Object.entries(columnAssignments)) {
    const colIndex = parseInt(colIndexStr);
    if (assignment === 'ignore') continue;

    switch (assignment) {
      case 'category':
        mapping.category = colIndex;
        break;
      case 'product':
        mapping.product = colIndex;
        break;
      case 'description':
        mapping.description = colIndex;
        break;
      case 'name_en':
        mapping.name_en = colIndex;
        break;
      case 'price':
        mapping.price = colIndex;
        break;
      case 'unit':
        mapping.unit = colIndex;
        break;
      case 'image_url':
        mapping.image_url = colIndex;
        break;
      default:
        // Check if it's a variant
        for (const [, group] of Object.entries(VARIANT_GROUPS)) {
          if (group.columns.includes(assignment)) {
            const labelInfo = (
              group.labels as Record<string, { ar: string; en: string; multiplier?: number }>
            )[assignment];
            if (labelInfo) {
              mapping.variants.push({
                column: colIndex,
                key: assignment,
                name_ar: labelInfo.ar,
                name_en: labelInfo.en,
                variantType: group.variantType,
                multiplier: labelInfo.multiplier,
              });
            }
            break;
          }
        }
    }
  }

  // Calculate confidence
  const confidence = mapping.product >= 0 ? 0.8 : 0.2;

  return {
    mapping,
    confidence,
    pricingType,
    variantType: variantType || null,
    unitType: unitType || null,
    variantGroup: null,
    suggestions: mapping.product < 0 ? ['يجب تحديد عمود اسم المنتج'] : [],
    headers,
    sampleData: [],
  };
}
