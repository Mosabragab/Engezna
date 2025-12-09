/**
 * Excel Import Utility for Menu Import System
 * Supports intelligent column detection for Arabic/English menus
 * Handles various pricing types: single, sizes, weights, options
 */

import * as XLSX from 'xlsx'
import type {
  ExtractedCategory,
  ExtractedProduct,
  ExtractedVariant,
  PricingType,
  VariantType,
} from '@/types/menu-import'

// Column detection patterns
export const COLUMN_PATTERNS: Record<string, string[]> = {
  // Category
  category: ['القسم', 'الفئة', 'الصنف', 'التصنيف', 'category', 'section', 'type', 'نوع'],

  // Product name
  product: ['المنتج', 'الاسم', 'الصنف', 'البند', 'product', 'name', 'item', 'اسم المنتج', 'المنتجات', 'الأصناف'],

  // Single price
  price: ['السعر', 'price', 'سعر', 'الثمن', 'cost', 'التكلفة'],

  // Size variants (S/M/L)
  size_small: ['صغير', 'small', 's', 'ص', 'سمول'],
  size_medium: ['وسط', 'medium', 'm', 'و', 'متوسط', 'ميديم'],
  size_large: ['كبير', 'large', 'l', 'ك', 'لارج'],
  size_xlarge: ['كبير جداً', 'xlarge', 'xl', 'اكس لارج', 'سوبر'],

  // Weight variants (restaurants - ربع/نص/كيلو)
  weight_quarter: ['ربع', 'ربع كيلو', '¼', 'quarter', '250جم', '250g'],
  weight_half: ['نص', 'نص كيلو', 'نصف', '½', 'half', '500جم', '500g'],
  weight_kilo: ['كيلو', 'كامل', '1 كيلو', 'kilo', 'kg', '1000جم'],

  // Weight variants (coffee - grams)
  weight_100g: ['100جم', '100g', '100 جم', '100 جرام'],
  weight_250g: ['250جم', '250g', '250 جم', '250 جرام'],
  weight_500g: ['500جم', '500g', '500 جم', '500 جرام'],

  // Options
  option_regular: ['عادي', 'regular', 'سينجل', 'single', 'عادى'],
  option_large: ['كبير', 'large', 'دابل', 'double', 'سوبر', 'مميز'],

  // Description
  description: ['الوصف', 'description', 'وصف', 'المكونات', 'تفاصيل', 'details'],

  // English name
  name_en: ['الاسم بالانجليزي', 'english name', 'name en', 'الاسم الانجليزي'],
}

// Variant group configurations
export const VARIANT_GROUPS = {
  sizes: {
    type: 'size' as VariantType,
    pricingType: 'sizes' as PricingType,
    columns: ['size_small', 'size_medium', 'size_large', 'size_xlarge'],
    labels: {
      size_small: { ar: 'صغير', en: 'Small' },
      size_medium: { ar: 'وسط', en: 'Medium' },
      size_large: { ar: 'كبير', en: 'Large' },
      size_xlarge: { ar: 'كبير جداً', en: 'X-Large' },
    },
  },
  weights_restaurant: {
    type: 'weight' as VariantType,
    pricingType: 'weights' as PricingType,
    columns: ['weight_quarter', 'weight_half', 'weight_kilo'],
    labels: {
      weight_quarter: { ar: 'ربع كيلو', en: 'Quarter' },
      weight_half: { ar: 'نص كيلو', en: 'Half' },
      weight_kilo: { ar: 'كيلو', en: 'Kilo' },
    },
  },
  weights_coffee: {
    type: 'weight' as VariantType,
    pricingType: 'weights' as PricingType,
    columns: ['weight_100g', 'weight_250g', 'weight_500g', 'weight_kilo'],
    labels: {
      weight_100g: { ar: '100 جرام', en: '100g' },
      weight_250g: { ar: '250 جرام', en: '250g' },
      weight_500g: { ar: '500 جرام', en: '500g' },
      weight_kilo: { ar: 'كيلو', en: '1kg' },
    },
  },
  options: {
    type: 'option' as VariantType,
    pricingType: 'options' as PricingType,
    columns: ['option_regular', 'option_large'],
    labels: {
      option_regular: { ar: 'عادي', en: 'Regular' },
      option_large: { ar: 'كبير', en: 'Large' },
    },
  },
}

export interface ColumnMapping {
  category?: number
  product: number
  price?: number
  description?: number
  name_en?: number
  variants: Array<{
    column: number
    key: string
    name_ar: string
    name_en: string
    type: VariantType
  }>
}

export interface DetectionResult {
  mapping: ColumnMapping
  confidence: number
  pricingType: PricingType
  variantGroup: keyof typeof VARIANT_GROUPS | null
  suggestions: string[]
  headers: string[]
  sampleData: string[][]
}

export interface ParsedExcelData {
  categories: ExtractedCategory[]
  totalProducts: number
  warnings: string[]
}

export interface MultiSheetResult {
  sheets: Array<{
    name: string
    detection: DetectionResult
    data: ParsedExcelData
  }>
  combined: ParsedExcelData
}

/**
 * Sheet data structure
 */
export interface SheetData {
  name: string
  headers: string[]
  rows: (string | number | null)[][]
}

/**
 * Read Excel file and return data from ALL sheets
 */
export async function readExcelFile(file: File): Promise<{
  sheets: SheetData[]
  sheetNames: string[]
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const sheets: SheetData[] = []

        // Read ALL sheets
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName]

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
            header: 1,
            defval: null,
          })

          if (jsonData.length < 2) {
            continue // Skip empty sheets
          }

          // First row is headers
          const headers = (jsonData[0] || []).map((h) => String(h || '').trim())
          const rows = jsonData.slice(1).filter((row) =>
            row.some((cell) => cell !== null && cell !== '')
          )

          if (rows.length > 0) {
            sheets.push({
              name: sheetName,
              headers,
              rows,
            })
          }
        }

        if (sheets.length === 0) {
          reject(new Error('الملف فارغ أو لا يحتوي على بيانات كافية'))
          return
        }

        resolve({
          sheets,
          sheetNames: workbook.SheetNames,
        })
      } catch (error) {
        reject(new Error('فشل في قراءة الملف: ' + (error as Error).message))
      }
    }

    reader.onerror = () => reject(new Error('فشل في قراءة الملف'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Check if a column contains mostly numeric values (prices)
 */
function isNumericColumn(rows: (string | number | null)[][], columnIndex: number): boolean {
  let numericCount = 0
  let totalCount = 0

  for (const row of rows.slice(0, 10)) { // Check first 10 rows
    const value = row[columnIndex]
    if (value !== null && value !== undefined && value !== '') {
      totalCount++
      if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[^\d.-]/g, ''))))) {
        numericCount++
      }
    }
  }

  return totalCount > 0 && (numericCount / totalCount) >= 0.8 // 80% numeric = price column
}

/**
 * Detect pricing type from sheet name
 */
function detectPricingTypeFromSheetName(sheetName: string): { type: PricingType; variantGroup: keyof typeof VARIANT_GROUPS | null } {
  const name = sheetName.toLowerCase()

  if (name.includes('أحجام') || name.includes('احجام') || name.includes('sizes')) {
    return { type: 'sizes', variantGroup: 'sizes' }
  }
  if (name.includes('أوزان') || name.includes('اوزان') || name.includes('weights') || name.includes('كيلو')) {
    return { type: 'weights', variantGroup: 'weights_restaurant' }
  }
  if (name.includes('جرامات') || name.includes('قهوة') || name.includes('coffee') || name.includes('grams')) {
    return { type: 'weights', variantGroup: 'weights_coffee' }
  }

  return { type: 'single', variantGroup: null }
}

/**
 * Detect column mapping from headers
 */
export function detectColumns(headers: string[], rows?: (string | number | null)[][]): DetectionResult {
  const mapping: ColumnMapping = {
    product: -1,
    variants: [],
  }

  const suggestions: string[] = []
  let confidence = 0
  let matchedCount = 0

  // Normalize headers for matching
  const normalizedHeaders = headers.map((h) =>
    h.toLowerCase().trim().replace(/\s+/g, ' ')
  )

  // Helper function to find column
  const findColumn = (patternKey: string): number => {
    const patterns = COLUMN_PATTERNS[patternKey]
    if (!patterns) return -1

    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i]
      for (const pattern of patterns) {
        if (header.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(header)) {
          return i
        }
      }
    }
    return -1
  }

  // Detect product column (required)
  mapping.product = findColumn('product')
  if (mapping.product === -1) {
    // Try to find any column that might be product name
    for (let i = 0; i < headers.length; i++) {
      if (!normalizedHeaders[i].match(/\d/) && normalizedHeaders[i].length > 0) {
        // First non-numeric column might be product
        if (mapping.category === undefined || mapping.category !== i) {
          mapping.product = i
          suggestions.push(`تم تخمين عمود المنتج: "${headers[i]}"`)
          break
        }
      }
    }
  } else {
    matchedCount++
  }

  // Detect category column
  mapping.category = findColumn('category')
  if (mapping.category !== -1) matchedCount++

  // Detect description column
  mapping.description = findColumn('description')
  if (mapping.description !== -1) matchedCount++

  // Detect english name column
  mapping.name_en = findColumn('name_en')
  if (mapping.name_en !== -1) matchedCount++

  // Detect single price column
  const priceCol = findColumn('price')

  // Detect variant columns
  let detectedVariantGroup: keyof typeof VARIANT_GROUPS | null = null

  // Check each variant group
  for (const [groupKey, group] of Object.entries(VARIANT_GROUPS)) {
    const foundVariants: ColumnMapping['variants'] = []

    for (const colKey of group.columns) {
      const colIndex = findColumn(colKey)
      if (colIndex !== -1) {
        const labels = (group.labels as Record<string, { ar: string; en: string }>)[colKey]
        if (labels) {
          foundVariants.push({
            column: colIndex,
            key: colKey,
            name_ar: labels.ar,
            name_en: labels.en,
            type: group.type,
          })
        }
      }
    }

    // If we found at least 2 variants in this group, use it
    if (foundVariants.length >= 2) {
      mapping.variants = foundVariants
      detectedVariantGroup = groupKey as keyof typeof VARIANT_GROUPS
      matchedCount += foundVariants.length
      break
    }
  }

  // If no variants found, use single price
  if (mapping.variants.length === 0 && priceCol !== -1) {
    mapping.price = priceCol
    matchedCount++
  }

  // If still no price columns found, detect numeric columns as prices
  if (mapping.variants.length === 0 && mapping.price === undefined && rows) {
    const numericColumns: number[] = []
    for (let i = 0; i < headers.length; i++) {
      if (i !== mapping.product && i !== mapping.category && i !== mapping.description) {
        if (isNumericColumn(rows, i)) {
          numericColumns.push(i)
        }
      }
    }

    if (numericColumns.length === 1) {
      // Single price column
      mapping.price = numericColumns[0]
      matchedCount++
    } else if (numericColumns.length >= 2) {
      // Multiple price columns = variants
      // Try to determine variant type from headers
      const variantLabels = numericColumns.map(col => ({
        column: col,
        header: headers[col],
      }))

      // Check if these look like sizes
      const looksLikeSizes = variantLabels.some(v =>
        /صغير|وسط|كبير|small|medium|large/i.test(v.header)
      )
      const looksLikeWeights = variantLabels.some(v =>
        /ربع|نص|كيلو|quarter|half|kilo|جرام|gram/i.test(v.header)
      )

      for (let idx = 0; idx < numericColumns.length; idx++) {
        const col = numericColumns[idx]
        mapping.variants.push({
          column: col,
          key: `variant_${idx}`,
          name_ar: headers[col] || `خيار ${idx + 1}`,
          name_en: headers[col] || `Option ${idx + 1}`,
          type: looksLikeWeights ? 'weight' : looksLikeSizes ? 'size' : 'option',
        })
      }

      if (looksLikeWeights) {
        detectedVariantGroup = 'weights_restaurant'
      } else if (looksLikeSizes) {
        detectedVariantGroup = 'sizes'
      } else {
        detectedVariantGroup = 'options'
      }
      matchedCount += numericColumns.length
    }
  }

  // Calculate confidence
  const totalPossible = 4 + (mapping.variants.length || 1) // category, product, description, name_en + price/variants
  confidence = Math.min(1, matchedCount / totalPossible)

  // Determine pricing type
  let pricingType: PricingType = 'single'
  if (detectedVariantGroup) {
    pricingType = VARIANT_GROUPS[detectedVariantGroup].pricingType
  }

  // Add suggestions if confidence is low
  if (confidence < 0.5) {
    suggestions.push('لم يتم التعرف على بعض الأعمدة، يرجى التحقق من التعيين')
  }

  if (mapping.product === -1) {
    suggestions.push('لم يتم العثور على عمود اسم المنتج')
  }

  // Get sample data (first 5 rows)
  const sampleData: string[][] = []

  return {
    mapping,
    confidence,
    pricingType,
    variantGroup: detectedVariantGroup,
    suggestions,
    headers,
    sampleData,
  }
}

/**
 * Transform Excel rows to ExtractedCategory[] format
 */
export function transformExcelData(
  rows: (string | number | null)[][],
  mapping: ColumnMapping,
  pricingType: PricingType
): ParsedExcelData {
  const categoriesMap = new Map<string, ExtractedCategory>()
  const warnings: string[] = []
  let totalProducts = 0

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]

    // Get product name
    const productName = mapping.product >= 0 ? String(row[mapping.product] || '').trim() : ''
    if (!productName) {
      continue // Skip empty rows
    }

    // Get category
    let categoryName = 'عام'
    if (mapping.category !== undefined && mapping.category >= 0) {
      const catValue = row[mapping.category]
      if (catValue) {
        categoryName = String(catValue).trim()
      }
    }

    // Get or create category
    if (!categoriesMap.has(categoryName)) {
      categoriesMap.set(categoryName, {
        name_ar: categoryName,
        name_en: null,
        icon: null,
        display_order: categoriesMap.size + 1,
        products: [],
      })
    }

    const category = categoriesMap.get(categoryName)!

    // Get description
    const description =
      mapping.description !== undefined && mapping.description >= 0
        ? String(row[mapping.description] || '').trim() || null
        : null

    // Get english name
    const nameEn =
      mapping.name_en !== undefined && mapping.name_en >= 0
        ? String(row[mapping.name_en] || '').trim() || null
        : null

    // Build product
    const product: ExtractedProduct = {
      name_ar: productName,
      name_en: nameEn,
      description_ar: description,
      pricing_type: pricingType,
      price: null,
      original_price: null,
      variants: null,
      combo_contents_ar: null,
      serves_count: null,
      is_popular: false,
      is_spicy: false,
      is_vegetarian: false,
      confidence: 1.0, // Excel import has high confidence
      needs_review: false,
      source_note: 'Excel Import',
    }

    // Handle pricing
    if (pricingType === 'single' && mapping.price !== undefined && mapping.price >= 0) {
      const priceValue = row[mapping.price]
      product.price = parsePrice(priceValue)
      if (product.price === null) {
        product.needs_review = true
        warnings.push(`صف ${rowIndex + 2}: لا يوجد سعر للمنتج "${productName}"`)
      }
    } else if (mapping.variants.length > 0) {
      // Build variants
      const variants: ExtractedVariant[] = []
      let isFirst = true

      for (const variantMapping of mapping.variants) {
        const priceValue = row[variantMapping.column]
        const price = parsePrice(priceValue)

        if (price !== null) {
          variants.push({
            name_ar: variantMapping.name_ar,
            name_en: variantMapping.name_en,
            price,
            is_default: isFirst,
            display_order: variants.length + 1,
          })
          isFirst = false
        }
      }

      if (variants.length > 0) {
        product.variants = variants
        product.price = variants[0].price // Set base price
      } else {
        product.needs_review = true
        product.pricing_type = 'single'
        warnings.push(`صف ${rowIndex + 2}: لا توجد أسعار للمنتج "${productName}"`)
      }
    }

    category.products.push(product)
    totalProducts++
  }

  // Convert map to array
  const categories = Array.from(categoriesMap.values())

  return {
    categories,
    totalProducts,
    warnings,
  }
}

/**
 * Parse price from cell value
 */
function parsePrice(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return value > 0 ? value : null
  }

  // Parse string
  const cleanedValue = String(value)
    .replace(/[^\d.,-]/g, '') // Remove non-numeric except . , -
    .replace(',', '.') // Replace comma with dot
    .trim()

  const parsed = parseFloat(cleanedValue)
  return !isNaN(parsed) && parsed > 0 ? parsed : null
}

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
    },
  }

  for (const sheet of sheets) {
    // Detect columns for this sheet
    const detection = detectColumns(sheet.headers, sheet.rows)

    // Get pricing type hint from sheet name
    const sheetHint = detectPricingTypeFromSheetName(sheet.name)
    if (sheetHint.variantGroup && detection.variantGroup === null) {
      detection.pricingType = sheetHint.type
      detection.variantGroup = sheetHint.variantGroup
    }

    // Transform data
    const data = transformExcelData(sheet.rows, detection.mapping, detection.pricingType)

    // Use sheet name as category prefix if no category column
    if (detection.mapping.category === undefined || detection.mapping.category < 0) {
      // Extract category hint from sheet name (before the dash)
      const sheetCategory = sheet.name.split('-')[0].trim()
      if (sheetCategory) {
        data.categories.forEach(cat => {
          if (cat.name_ar === 'عام') {
            cat.name_ar = sheetCategory
          }
        })
      }
    }

    results.sheets.push({
      name: sheet.name,
      detection,
      data,
    })
  }

  // Combine all categories
  const categoryMap = new Map<string, ExtractedCategory>()

  for (const sheet of results.sheets) {
    for (const category of sheet.data.categories) {
      const existingCategory = categoryMap.get(category.name_ar)
      if (existingCategory) {
        // Merge products into existing category
        existingCategory.products.push(...category.products)
      } else {
        categoryMap.set(category.name_ar, { ...category })
      }
    }

    results.combined.totalProducts += sheet.data.totalProducts
    results.combined.warnings.push(...sheet.data.warnings)
  }

  // Convert map to array and assign display order
  results.combined.categories = Array.from(categoryMap.values()).map((cat, index) => ({
    ...cat,
    display_order: index + 1,
  }))

  return results
}

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
    { value: 'size_small', label_ar: 'صغير', label_en: 'Small' },
    { value: 'size_medium', label_ar: 'وسط', label_en: 'Medium' },
    { value: 'size_large', label_ar: 'كبير', label_en: 'Large' },
    { value: 'weight_quarter', label_ar: 'ربع كيلو', label_en: 'Quarter' },
    { value: 'weight_half', label_ar: 'نص كيلو', label_en: 'Half' },
    { value: 'weight_kilo', label_ar: 'كيلو', label_en: 'Kilo' },
    { value: 'weight_100g', label_ar: '100 جرام', label_en: '100g' },
    { value: 'weight_250g', label_ar: '250 جرام', label_en: '250g' },
    { value: 'weight_500g', label_ar: '500 جرام', label_en: '500g' },
    { value: 'option_regular', label_ar: 'عادي', label_en: 'Regular' },
    { value: 'option_large', label_ar: 'كبير/دابل', label_en: 'Large/Double' },
  ]
}

/**
 * Apply manual column mapping changes
 */
export function applyManualMapping(
  headers: string[],
  columnAssignments: Record<number, string>
): DetectionResult {
  const mapping: ColumnMapping = {
    product: -1,
    variants: [],
  }

  // Process assignments
  for (const [colIndexStr, assignment] of Object.entries(columnAssignments)) {
    const colIndex = parseInt(colIndexStr)
    if (assignment === 'ignore') continue

    switch (assignment) {
      case 'category':
        mapping.category = colIndex
        break
      case 'product':
        mapping.product = colIndex
        break
      case 'description':
        mapping.description = colIndex
        break
      case 'name_en':
        mapping.name_en = colIndex
        break
      case 'price':
        mapping.price = colIndex
        break
      default:
        // Check if it's a variant
        for (const [, group] of Object.entries(VARIANT_GROUPS)) {
          if (group.columns.includes(assignment)) {
            const labels = (group.labels as Record<string, { ar: string; en: string }>)[assignment]
            if (labels) {
              mapping.variants.push({
                column: colIndex,
                key: assignment,
                name_ar: labels.ar,
                name_en: labels.en,
                type: group.type,
              })
            }
            break
          }
        }
    }
  }

  // Determine pricing type
  let pricingType: PricingType = 'single'
  let variantGroup: keyof typeof VARIANT_GROUPS | null = null

  if (mapping.variants.length > 0) {
    // Determine group based on first variant type
    const firstVariant = mapping.variants[0]
    for (const [groupKey, group] of Object.entries(VARIANT_GROUPS)) {
      if (group.columns.includes(firstVariant.key)) {
        pricingType = group.pricingType
        variantGroup = groupKey as keyof typeof VARIANT_GROUPS
        break
      }
    }
  }

  // Calculate confidence
  const confidence = mapping.product >= 0 ? 0.8 : 0.2

  return {
    mapping,
    confidence,
    pricingType,
    variantGroup,
    suggestions: mapping.product < 0 ? ['يجب تحديد عمود اسم المنتج'] : [],
    headers,
    sampleData: [],
  }
}
