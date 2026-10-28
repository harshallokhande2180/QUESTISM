import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_WEEKDAY_BLOCKS = [
  { id: 'wd-1', startTime: '07:00', endTime: '08:00', label: 'Morning Workout & Stretch', type: 'workout' },
  { id: 'wd-2', startTime: '18:00', endTime: '20:00', label: 'Evening Study Session A', type: 'study' },
  { id: 'wd-3', startTime: '21:00', endTime: '23:00', label: 'Night Study Session B', type: 'study' },
]

const DEFAULT_WEEKEND_BLOCKS = [
  { id: 'we-1', startTime: '08:00', endTime: '09:00', label: 'Morning Run & Mobility', type: 'workout' },
  { id: 'we-2', startTime: '10:00', endTime: '12:00', label: 'Deep Focus Study Block 1', type: 'study' },
  { id: 'we-3', startTime: '15:00', endTime: '17:00', label: 'Deep Focus Study Block 2', type: 'study' },
]

export function getBlockHours(block) {
  if (!block?.startTime || !block?.endTime) return 0
  const [sh, sm] = block.startTime.split(':').map(Number)
  const [eh, em] = block.endTime.split(':').map(Number)
  const diffMinutes = (eh * 60 + em) - (sh * 60 + sm)
  return Math.max(0, Number((diffMinutes / 60).toFixed(2)))
}

export const useTimetableStore = create(
  persist(
    (set, get) => ({
      locks: {},
      weekdayBlocks: DEFAULT_WEEKDAY_BLOCKS,
      weekendBlocks: DEFAULT_WEEKEND_BLOCKS,

      toggleLock: (date) => {
        set((state) => ({
          locks: {
            ...state.locks,
            [date]: !state.locks[date],
          },
        }))
      },

      breakLock: (date) => {
        set((state) => {
          const { [date]: _, ...rest } = state.locks
          return { locks: rest }
        })
      },

      addBlock: (planType, block) => {
        const key = planType === 'weekend' ? 'weekendBlocks' : 'weekdayBlocks'
        const newBlock = {
          ...block,
          id: `${planType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }
        set(state => ({
          [key]: [...(state[key] || []), newBlock].sort((a, b) => a.startTime.localeCompare(b.startTime)),
        }))
      },

      removeBlock: (planType, blockId) => {
        const key = planType === 'weekend' ? 'weekendBlocks' : 'weekdayBlocks'
        set(state => ({
          [key]: (state[key] || []).filter(b => b.id !== blockId),
        }))
      },

      getStudyHoursCheck: (topicLengthMinutes = 60) => {
        const state = get()
        const requiredHours = Number(((4 * topicLengthMinutes) / 60).toFixed(1))

        const weekdayStudyHours = Number(
          (state.weekdayBlocks || [])
            .filter(b => b.type === 'study')
            .reduce((sum, b) => sum + getBlockHours(b), 0)
            .toFixed(1)
        )

        const weekendStudyHours = Number(
          (state.weekendBlocks || [])
            .filter(b => b.type === 'study')
            .reduce((sum, b) => sum + getBlockHours(b), 0)
            .toFixed(1)
        )

        const warnings = []
        if (weekdayStudyHours < requiredHours) {
          warnings.push(
            `Your weekday study blocks total ${weekdayStudyHours} hours. Four topics need about ${requiredHours} hours.`
          )
        }
        if (weekendStudyHours < requiredHours) {
          warnings.push(
            `Your weekend study blocks total ${weekendStudyHours} hours. Four topics need about ${requiredHours} hours.`
          )
        }

        return {
          requiredHours,
          weekdayStudyHours,
          weekendStudyHours,
          warnings,
        }
      },
    }),
    {
      name: 'questism_timetable',
    }
  )
)
