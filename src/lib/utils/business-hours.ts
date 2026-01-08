/**
 * Business Hours Utilities
 *
 * Helper functions for validating scheduled times against provider business hours.
 * Used by checkout page to ensure customers can only schedule orders during open hours.
 */

// Type definitions
export type DayHours = {
  open: string   // Format: "HH:mm" (e.g., "09:00")
  close: string  // Format: "HH:mm" (e.g., "23:00")
  is_open: boolean
}

export type BusinessHours = {
  saturday: DayHours
  sunday: DayHours
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
}

// Day keys in order (Egypt week starts on Saturday)
export const DAY_KEYS = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const

export type DayKey = typeof DAY_KEYS[number]

// Day labels for UI
export const DAY_LABELS = {
  saturday: { ar: 'السبت', en: 'Saturday' },
  sunday: { ar: 'الأحد', en: 'Sunday' },
  monday: { ar: 'الاثنين', en: 'Monday' },
  tuesday: { ar: 'الثلاثاء', en: 'Tuesday' },
  wednesday: { ar: 'الأربعاء', en: 'Wednesday' },
  thursday: { ar: 'الخميس', en: 'Thursday' },
  friday: { ar: 'الجمعة', en: 'Friday' },
}

// Default business hours (fallback when provider hasn't set hours)
// Assumption: Store is always open as a fallback
export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  saturday: { open: '00:00', close: '23:59', is_open: true },
  sunday: { open: '00:00', close: '23:59', is_open: true },
  monday: { open: '00:00', close: '23:59', is_open: true },
  tuesday: { open: '00:00', close: '23:59', is_open: true },
  wednesday: { open: '00:00', close: '23:59', is_open: true },
  thursday: { open: '00:00', close: '23:59', is_open: true },
  friday: { open: '00:00', close: '23:59', is_open: true },
}

/**
 * Get the day key (saturday, sunday, etc.) from a Date object
 * Uses Egypt timezone (Africa/Cairo)
 */
export function getDayKey(date: Date): DayKey {
  // Get day in Egypt timezone
  const egyptTime = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }))
  const dayIndex = egyptTime.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Map JS day index to our day keys (0=Sunday, 6=Saturday)
  const dayMap: Record<number, DayKey> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }

  return dayMap[dayIndex]
}

/**
 * Parse time string "HH:mm" to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Format minutes since midnight to "HH:mm" string
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Get time as minutes since midnight from a Date object (in Egypt timezone)
 */
export function getTimeInMinutes(date: Date): number {
  const egyptTime = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }))
  return egyptTime.getHours() * 60 + egyptTime.getMinutes()
}

/**
 * Check if a given datetime is within business hours
 * Returns true if the provider is open at that time
 *
 * @param dateTime - The datetime to check
 * @param businessHours - Provider's business hours (null = always open)
 */
export function isWithinBusinessHours(
  dateTime: Date,
  businessHours: BusinessHours | null
): boolean {
  // If no business hours set, assume always open (fallback)
  if (!businessHours) return true

  const dayKey = getDayKey(dateTime)
  const dayHours = businessHours[dayKey]

  // If day is closed, return false
  if (!dayHours || !dayHours.is_open) return false

  const timeInMinutes = getTimeInMinutes(dateTime)
  const openMinutes = parseTimeToMinutes(dayHours.open)
  const closeMinutes = parseTimeToMinutes(dayHours.close)

  // Handle overnight hours (e.g., open: 22:00, close: 02:00)
  if (closeMinutes < openMinutes) {
    // Open if time is after open OR before close
    return timeInMinutes >= openMinutes || timeInMinutes <= closeMinutes
  }

  // Normal hours
  return timeInMinutes >= openMinutes && timeInMinutes <= closeMinutes
}

/**
 * Check if a specific day is open
 */
export function isDayOpen(dayKey: DayKey, businessHours: BusinessHours | null): boolean {
  if (!businessHours) return true // Fallback: always open
  const dayHours = businessHours[dayKey]
  return dayHours?.is_open ?? true
}

/**
 * Validation result type
 */
export type ScheduledTimeValidation = {
  valid: boolean
  error?: {
    ar: string
    en: string
  }
}

/**
 * Validate a scheduled time for an order
 *
 * Rules:
 * 1. Must be in the future
 * 2. Must be within 48 hours
 * 3. Must be within business hours (if set)
 *
 * @param scheduledTime - The proposed scheduled time
 * @param businessHours - Provider's business hours (null = always open)
 */
export function validateScheduledTime(
  scheduledTime: Date,
  businessHours: BusinessHours | null
): ScheduledTimeValidation {
  const now = new Date()

  // Rule 1: Must be in the future (at least 30 minutes from now)
  const minTime = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes buffer
  if (scheduledTime <= minTime) {
    return {
      valid: false,
      error: {
        ar: 'يجب أن يكون الموعد بعد 30 دقيقة على الأقل من الآن',
        en: 'Scheduled time must be at least 30 minutes from now',
      },
    }
  }

  // Rule 2: Must be within 48 hours
  const maxTime = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48 hours
  if (scheduledTime > maxTime) {
    return {
      valid: false,
      error: {
        ar: 'يجب أن يكون الموعد خلال 48 ساعة',
        en: 'Scheduled time must be within 48 hours',
      },
    }
  }

  // Rule 3: Check business hours (if set)
  if (businessHours && !isWithinBusinessHours(scheduledTime, businessHours)) {
    const dayKey = getDayKey(scheduledTime)
    const dayHours = businessHours[dayKey]

    if (!dayHours?.is_open) {
      const dayLabel = DAY_LABELS[dayKey]
      return {
        valid: false,
        error: {
          ar: `المتجر مغلق يوم ${dayLabel.ar}`,
          en: `Store is closed on ${dayLabel.en}`,
        },
      }
    }

    return {
      valid: false,
      error: {
        ar: `الموعد خارج ساعات العمل (${dayHours.open} - ${dayHours.close})`,
        en: `Time is outside business hours (${dayHours.open} - ${dayHours.close})`,
      },
    }
  }

  return { valid: true }
}

/**
 * Get available time slots for a specific date
 * Returns 30-minute intervals within business hours
 *
 * @param date - The date to get slots for
 * @param businessHours - Provider's business hours
 * @param estimatedPrepTime - Minutes needed for preparation (default: 15)
 */
export function getAvailableTimeSlots(
  date: Date,
  businessHours: BusinessHours | null,
  estimatedPrepTime: number = 15
): string[] {
  const dayKey = getDayKey(date)

  // Use default hours if not set
  const hours = businessHours || DEFAULT_BUSINESS_HOURS
  const dayHours = hours[dayKey]

  // If day is closed, return empty
  if (!dayHours?.is_open) return []

  const slots: string[] = []
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  // Calculate minimum start time (now + prep time + buffer)
  let startMinutes = parseTimeToMinutes(dayHours.open)
  if (isToday) {
    const currentMinutes = getTimeInMinutes(now)
    const minStartMinutes = currentMinutes + estimatedPrepTime + 30 // Add 30 min buffer
    startMinutes = Math.max(startMinutes, minStartMinutes)
    // Round up to nearest 30 minutes
    startMinutes = Math.ceil(startMinutes / 30) * 30
  }

  const endMinutes = parseTimeToMinutes(dayHours.close)

  // Handle overnight hours
  if (endMinutes < startMinutes) {
    // Add slots until midnight
    for (let m = startMinutes; m < 24 * 60; m += 30) {
      slots.push(formatMinutesToTime(m))
    }
    // Add slots from midnight until close
    for (let m = 0; m <= endMinutes; m += 30) {
      slots.push(formatMinutesToTime(m))
    }
  } else {
    // Normal hours - add 30 minute slots
    for (let m = startMinutes; m <= endMinutes - 30; m += 30) {
      slots.push(formatMinutesToTime(m))
    }
  }

  return slots
}

/**
 * Get available dates for scheduling (next 48 hours)
 * Returns dates that have at least one open time slot
 *
 * @param businessHours - Provider's business hours
 */
export function getAvailableDates(businessHours: BusinessHours | null): Date[] {
  const dates: Date[] = []
  const now = new Date()

  // Check today and next 2 days (within 48 hours)
  for (let i = 0; i < 3; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0)

    // Check if the date has available slots
    const slots = getAvailableTimeSlots(date, businessHours)
    if (slots.length > 0) {
      dates.push(date)
    }
  }

  return dates
}

/**
 * Format time for display (12-hour format)
 *
 * @param time - Time in "HH:mm" format
 * @param locale - 'ar' or 'en'
 */
export function formatTimeForDisplay(time: string, locale: 'ar' | 'en'): string {
  const [hours, minutes] = time.split(':').map(Number)
  const hour12 = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  const period = hours >= 12 ? (locale === 'ar' ? 'م' : 'PM') : (locale === 'ar' ? 'ص' : 'AM')
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Format date for display
 *
 * @param date - Date object
 * @param locale - 'ar' or 'en'
 */
export function formatDateForDisplay(date: Date, locale: 'ar' | 'en'): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = date.toDateString() === today.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  if (isToday) {
    return locale === 'ar' ? 'اليوم' : 'Today'
  }
  if (isTomorrow) {
    return locale === 'ar' ? 'غداً' : 'Tomorrow'
  }

  const dayKey = getDayKey(date)
  const dayLabel = DAY_LABELS[dayKey]
  return locale === 'ar' ? dayLabel.ar : dayLabel.en
}

/**
 * Combine date and time string into a Date object
 *
 * @param date - The date
 * @param time - Time in "HH:mm" format
 */
export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const combined = new Date(date)
  combined.setHours(hours, minutes, 0, 0)
  return combined
}
