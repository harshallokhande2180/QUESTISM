import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getLogicalDate, formatLogicalDateISO } from '../lib/dayEngine'

export const useQuestStore = create((set, get) => ({
  // Today's quests (accepted from yesterday + any bonus)
  todayQuests: [],
  // Tomorrow's quests (being prepared for acceptance)
  tomorrowQuests: [],
  // Loading / error state
  loading: false,
  error: null,

  /**
   * Fetch quests for today's logical date.
   */
  fetchTodayQuests: async (dayEndTime = '04:00') => {
    set({ loading: true, error: null })
    try {
      const logicalDate = formatLogicalDateISO(getLogicalDate(dayEndTime))
      const { data, error } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('quest_date', logicalDate)
        .order('created_at', { ascending: true })

      if (error) throw error
      set({ todayQuests: data || [], loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  /**
   * Add a quest for tomorrow (becomes locked at day boundary).
   */
  addTomorrowQuest: async (title, type = 'custom', dayEndTime = '04:00') => {
    set({ error: null })
    try {
      const logicalTomorrow = getLogicalDate(dayEndTime)
      logicalTomorrow.setDate(logicalTomorrow.getDate() + 1)
      const questDate = formatLogicalDateISO(logicalTomorrow)

      const { data, error } = await supabase
        .from('daily_quests')
        .insert({
          quest_date: questDate,
          title: title.trim(),
          quest_type: type,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      set(state => ({
        tomorrowQuests: [...state.tomorrowQuests, data],
      }))
      return { data }
    } catch (error) {
      set({ error: error.message })
      return { error }
    }
  },

  /**
   * Toggle a quest's completion status (today only).
   */
  toggleQuest: async (questId) => {
    const quest = get().todayQuests.find(q => q.id === questId)
    if (!quest) return

    const newStatus = quest.status === 'completed' ? 'pending' : 'completed'

    try {
      const { error } = await supabase
        .from('daily_quests')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', questId)

      if (error) throw error

      set(state => ({
        todayQuests: state.todayQuests.map(q =>
          q.id === questId
            ? { ...q, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
            : q
        ),
      }))
    } catch (error) {
      set({ error: error.message })
    }
  },

  /**
   * Remove a tomorrow quest (only before lock-in).
   */
  removeTomorrowQuest: async (questId) => {
    try {
      const { error } = await supabase
        .from('daily_quests')
        .delete()
        .eq('id', questId)

      if (error) throw error

      set(state => ({
        tomorrowQuests: state.tomorrowQuests.filter(q => q.id !== questId),
      }))
    } catch (error) {
      set({ error: error.message })
    }
  },

  /**
   * Fetch tomorrow's prepared quests.
   */
  fetchTomorrowQuests: async (dayEndTime = '04:00') => {
    try {
      const logicalTomorrow = getLogicalDate(dayEndTime)
      logicalTomorrow.setDate(logicalTomorrow.getDate() + 1)
      const questDate = formatLogicalDateISO(logicalTomorrow)

      const { data, error } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('quest_date', questDate)
        .order('created_at', { ascending: true })

      if (error) throw error
      set({ tomorrowQuests: data || [] })
    } catch (error) {
      set({ error: error.message })
    }
  },

  clearError: () => set({ error: null }),
}))
