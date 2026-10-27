import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Timetable Store
 * ----------------
 * Manages 30‑day lock state for each calendar date.
 *
 * - `locks` is an object where keys are ISO date strings (YYYY‑MM‑DD)
 *   and values are boolean (`true` = locked).
 * - `toggleLock(date)` flips the lock for the given date, respecting the
 *   30‑day rule: a lock can only be toggled if the date is within the next
 *   30 days from the logical today.
 * - `breakLock(date)` removes a lock with a penalty flag, used by the UI.
 */
export const useTimetableStore = create(
  persist(
    (set, get) => ({
      locks: {},
      // Set or toggle lock for a date (if within 30‑day window)
      toggleLock: (date) => {
        const today = new Date()
        const target = new Date(date)
        const diff = (target - today) / (1000 * 60 * 60 * 24)
        if (diff < 0 || diff > 30) return // out of allowed range
        set((state) => ({
          locks: {
            ...state.locks,
            [date]: !state.locks[date],
          },
        }))
      },
      // Force‑break a lock (penalty can be handled elsewhere)
      breakLock: (date) => {
        set((state) => {
          const { [date]: _, ...rest } = state.locks
          return { locks: rest }
        })
      },
    }),
    {
      name: 'questism_timetable', // storage key
    }
  )
)
