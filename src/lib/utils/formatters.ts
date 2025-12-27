/**
 * Utility functions for formatting numbers, dates, and currencies
 * Supports both Arabic and English locales with proper numeral systems
 */

/**
 * Format a number with the appropriate numeral system based on locale
 * Arabic locale uses Arabic-Indic numerals (٠-٩)
 * English locale uses Western Arabic numerals (0-9)
 */
export function formatNumber(num: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(num)
}

/**
 * Format currency with the appropriate numeral system based on locale
 * Shows 2 decimal places for precision (e.g., 17.50 not 18)
 */
export function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format currency with currency symbol
 */
export function formatCurrencyWithSymbol(amount: number, locale: string): string {
  const formatted = formatCurrency(amount, locale)
  const symbol = locale === 'ar' ? 'ج.م' : 'EGP'
  return `${formatted} ${symbol}`
}

/**
 * Format a percentage with the appropriate numeral system
 */
export function formatPercentage(num: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(num / 100)
}

/**
 * Format date with the appropriate locale
 */
export function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format date and time with the appropriate locale
 */
export function formatDateTime(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format time ago with the appropriate numeral system
 * e.g., "منذ ٣ دقائق" or "3 minutes ago"
 */
export function formatTimeAgo(dateString: string, locale: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  const formatNum = (n: number) => formatNumber(n, locale)

  if (diffMins < 1) {
    return locale === 'ar' ? 'الآن' : 'Just now'
  } else if (diffMins < 60) {
    return locale === 'ar'
      ? `منذ ${formatNum(diffMins)} دقيقة`
      : `${formatNum(diffMins)}m ago`
  } else if (diffHours < 24) {
    return locale === 'ar'
      ? `منذ ${formatNum(diffHours)} ساعة`
      : `${formatNum(diffHours)}h ago`
  } else {
    return locale === 'ar'
      ? `منذ ${formatNum(diffDays)} يوم`
      : `${formatNum(diffDays)}d ago`
  }
}

/**
 * Format relative time for future dates
 * e.g., "متبقي ٣ ساعات" or "3 hours remaining"
 */
export function formatTimeRemaining(dateString: string, locale: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()

  if (diffMs < 0) {
    return locale === 'ar' ? 'انتهى' : 'Expired'
  }

  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  const formatNum = (n: number) => formatNumber(n, locale)

  if (diffMins < 60) {
    return locale === 'ar'
      ? `متبقي ${formatNum(diffMins)} دقيقة`
      : `${formatNum(diffMins)}m remaining`
  } else if (diffHours < 24) {
    return locale === 'ar'
      ? `متبقي ${formatNum(diffHours)} ساعة`
      : `${formatNum(diffHours)}h remaining`
  } else {
    return locale === 'ar'
      ? `متبقي ${formatNum(diffDays)} يوم`
      : `${formatNum(diffDays)}d remaining`
  }
}
