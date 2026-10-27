/**
 * Logical Day Engine
 * 
 * Questism uses a custom day boundary (default: 04:00 AM).
 * Activity between midnight and 04:00 belongs to the PREVIOUS logical day.
 * This ensures late-night workouts count for the day they were started.
 */

import { format, subDays, parse, isAfter, isBefore, startOfDay, addDays } from 'date-fns'

/**
 * Get the current logical date based on the user's day-end cutoff time.
 * @param {string} dayEndTime - The day boundary time in "HH:mm" format (e.g., "04:00")
 * @returns {Date} The logical date (midnight of the logical day)
 */
export function getLogicalDate(dayEndTime = '04:00') {
  const now = new Date()
  const [cutoffHour, cutoffMinute] = dayEndTime.split(':').map(Number)

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // If current time is before the cutoff, we're still in "yesterday's" logical day
  if (currentHour < cutoffHour || (currentHour === cutoffHour && currentMinute < cutoffMinute)) {
    return startOfDay(subDays(now, 1))
  }

  return startOfDay(now)
}

/**
 * Format a logical date to a display string.
 * @param {Date} logicalDate
 * @returns {string} e.g., "Mon, Oct 27"
 */
export function formatLogicalDate(logicalDate) {
  return format(logicalDate, 'EEE, MMM d')
}

/**
 * Format a logical date for database storage.
 * @param {Date} logicalDate
 * @returns {string} e.g., "2026-10-27"
 */
export function formatLogicalDateISO(logicalDate) {
  return format(logicalDate, 'yyyy-MM-dd')
}

/**
 * Check if a given date is today's logical date.
 * @param {Date} date
 * @param {string} dayEndTime
 * @returns {boolean}
 */
export function isLogicalToday(date, dayEndTime = '04:00') {
  const today = getLogicalDate(dayEndTime)
  return format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
}

/**
 * Get the logical date for "tomorrow" (the next quest acceptance target).
 * @param {string} dayEndTime
 * @returns {Date}
 */
export function getLogicalTomorrow(dayEndTime = '04:00') {
  return addDays(getLogicalDate(dayEndTime), 1)
}

/**
 * Calculate the active day number since the user's start date.
 * @param {string} startDateStr - ISO date string of day 1
 * @param {string} dayEndTime
 * @returns {number} 1-indexed day count
 */
export function getActiveDayNumber(startDateStr, dayEndTime = '04:00') {
  if (!startDateStr) return 1
  const startDate = startOfDay(new Date(startDateStr))
  const logicalToday = getLogicalDate(dayEndTime)
  const diffMs = logicalToday.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays + 1)
}

/**
 * Get the current 10-day block number (for workout scaling).
 * @param {number} activeDayNumber
 * @returns {number} Block number (1-indexed)
 */
export function get10DayBlock(activeDayNumber) {
  return Math.ceil(activeDayNumber / 10)
}

/**
 * Calculate the day of the week (0-6, 0=Sunday) for a logical date.
 * @param {string} dayEndTime
 * @returns {number}
 */
export function getLogicalDayOfWeek(dayEndTime = '04:00') {
  return getLogicalDate(dayEndTime).getDay()
}
