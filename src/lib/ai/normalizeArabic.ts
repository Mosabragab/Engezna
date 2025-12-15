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
 * Calculate similarity between two strings (0 to 1)
 * Uses a simple character-based similarity for Arabic text
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1

  const s1 = normalizeArabic(str1)
  const s2 = normalizeArabic(str2)

  if (s1 === s2) return 1

  // If one contains the other, high similarity
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length)
    const shorter = Math.min(s1.length, s2.length)
    return shorter / longer
  }

  // Levenshtein distance based similarity
  const distance = levenshteinDistance(s1, s2)
  const maxLength = Math.max(s1.length, s2.length)

  return maxLength > 0 ? 1 - distance / maxLength : 0
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
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
 * Now includes fuzzy matching for typo tolerance!
 * @param items - Array of items to filter
 * @param query - Search query
 * @param getSearchableText - Function to extract searchable text from item
 * @param fuzzyThreshold - Minimum similarity score for fuzzy matches (default 0.7)
 * @returns Filtered array of items (sorted by match score - best matches first)
 */
export function filterByNormalizedArabic<T>(
  items: T[],
  query: string,
  getSearchableText: (item: T) => string | string[],
  fuzzyThreshold: number = 0.7  // Increased from 0.6 to avoid false matches like "بيتزا" ~ "بيضا"
): T[] {
  const normalizedQuery = normalizeArabic(query)

  if (!normalizedQuery) return items

  // Split query into words for multi-word matching
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1)

  // Score items based on how well they match
  const scoredItems = items.map(item => {
    const searchableResult = getSearchableText(item)
    const searchableTexts = Array.isArray(searchableResult) ? searchableResult : [searchableResult]
    let score = 0
    let matched = false

    for (const text of searchableTexts) {
      const normalizedText = normalizeArabic(text)

      // Full query exact match gets highest score
      if (normalizedText.includes(normalizedQuery)) {
        score += 100
        matched = true
      } else {
        // Check individual words
        for (const word of queryWords) {
          if (normalizedText.includes(word)) {
            score += 10
            matched = true
          } else {
            // Fuzzy match: check similarity of each word in the text
            const textWords = normalizedText.split(/\s+/)
            for (const textWord of textWords) {
              const similarity = calculateSimilarity(word, textWord)
              if (similarity >= fuzzyThreshold) {
                score += Math.round(similarity * 10)
                matched = true
                console.log(`🔍 [FUZZY MATCH] "${word}" ~ "${textWord}" (${(similarity * 100).toFixed(0)}%)`)
              }
            }
          }
        }
      }

      // Also check overall similarity for single-word queries
      if (!matched && queryWords.length === 1) {
        const textWords = normalizedText.split(/\s+/)
        for (const textWord of textWords) {
          const similarity = calculateSimilarity(normalizedQuery, textWord)
          if (similarity >= fuzzyThreshold) {
            score += Math.round(similarity * 50)
            matched = true
            console.log(`🔍 [FUZZY MATCH] "${normalizedQuery}" ~ "${textWord}" (${(similarity * 100).toFixed(0)}%)`)
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
