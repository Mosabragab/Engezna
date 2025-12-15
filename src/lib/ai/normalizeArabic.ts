/**
 * Arabic Text Normalization Utility
 * Handles Arabic text normalization for better search matching
 *
 * Normalizations:
 * - Remove diacritics (tashkeel)
 * - Normalize alef variations (أ, إ, آ → ا)
 * - Normalize yaa variations (ى → ي)
 * - Normalize taa marbuta (ة → ه)
 * - Normalize hamza variations (ؤ → و, ئ → ي)
 * - Trim and collapse multiple spaces
 */

/**
 * Normalize Arabic text for search matching
 * @param text - The Arabic text to normalize
 * @returns Normalized text
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return ''

  let normalized = text

  // Remove Arabic diacritics (tashkeel)
  // Fatha, Damma, Kasra, Sukun, Shadda, Tanween, etc.
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '')

  // Normalize Alef variations → ا
  // أ (U+0623), إ (U+0625), آ (U+0622), ٱ (U+0671) → ا (U+0627)
  normalized = normalized.replace(/[أإآٱ]/g, 'ا')

  // Normalize Alef Maksura → ي
  // ى (U+0649) → ي (U+064A)
  normalized = normalized.replace(/ى/g, 'ي')

  // Normalize Taa Marbuta → ه
  // ة (U+0629) → ه (U+0647)
  normalized = normalized.replace(/ة/g, 'ه')

  // Normalize Hamza on Waw → و
  // ؤ (U+0624) → و (U+0648)
  normalized = normalized.replace(/ؤ/g, 'و')

  // Normalize Hamza on Yaa → ي
  // ئ (U+0626) → ي (U+064A)
  normalized = normalized.replace(/ئ/g, 'ي')

  // Remove standalone Hamza (optional - sometimes useful)
  // ء (U+0621)
  normalized = normalized.replace(/ء/g, '')

  // Trim whitespace and collapse multiple spaces
  normalized = normalized.trim().replace(/\s+/g, ' ')

  // Convert to lowercase (for any mixed Latin characters)
  normalized = normalized.toLowerCase()

  return normalized
}

/**
 * Check if normalized query matches normalized text
 * @param query - The search query
 * @param text - The text to search in
 * @returns True if query is found in text (after normalization)
 */
export function normalizedIncludes(query: string, text: string): boolean {
  const normalizedQuery = normalizeArabic(query)
  const normalizedText = normalizeArabic(text)

  if (!normalizedQuery) return true // Empty query matches everything
  if (!normalizedText) return false

  return normalizedText.includes(normalizedQuery)
}

/**
 * Filter array of items by normalized Arabic search
 * Supports multi-word queries - matches if ANY word matches the item
 * @param items - Array of items to filter
 * @param query - Search query
 * @param getSearchableText - Function to extract searchable text from item
 * @returns Filtered array of items (sorted by match score - best matches first)
 */
export function filterByNormalizedArabic<T>(
  items: T[],
  query: string,
  getSearchableText: (item: T) => string[]
): T[] {
  const normalizedQuery = normalizeArabic(query)

  if (!normalizedQuery) return items

  // Split query into words for multi-word matching
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1)

  // Score items based on how well they match
  const scoredItems = items.map(item => {
    const searchableTexts = getSearchableText(item)
    let score = 0
    let matched = false

    for (const text of searchableTexts) {
      const normalizedText = normalizeArabic(text)

      // Full query match gets highest score
      if (normalizedText.includes(normalizedQuery)) {
        score += 100
        matched = true
      } else {
        // Check individual words
        for (const word of queryWords) {
          if (normalizedText.includes(word)) {
            score += 10
            matched = true
          }
        }
      }
    }

    return { item, score, matched }
  })

  // Filter matched items and sort by score (highest first)
  return scoredItems
    .filter(({ matched }) => matched)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}

/**
 * Logging helper for Arabic normalization
 */
export function logNormalization(context: string, original: string, normalized: string): void {
  console.log(`🔤 [ARABIC NORM] ${context}:`, {
    original,
    normalized,
    changed: original !== normalized,
  })
}

export default normalizeArabic
