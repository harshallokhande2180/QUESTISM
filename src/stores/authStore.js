import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,   // start true so App shows spinner while session is restored
  error: null,

  initialize: async () => {
    try {
      set({ loading: true })
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error

      set({
        session,
        user: session?.user ?? null,
        loading: false,
      })

      // Listen for auth state changes (sign in, sign out, token refresh)
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        })
      })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      set({
        user: data.user,
        session: data.session,
        loading: false,
      })
      return { data, needsVerification: !data.session }
    } catch (error) {
      set({ error: error.message, loading: false })
      return { error }
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      set({
        user: data.user,
        session: data.session,
        loading: false,
      })
      return { data }
    } catch (error) {
      set({ error: error.message, loading: false })
      return { error }
    }
  },

  signOut: async () => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ user: null, session: null, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  resetPassword: async (email) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      set({ loading: false })
      return { success: true }
    } catch (error) {
      set({ error: error.message, loading: false })
      return { error }
    }
  },

  clearError: () => set({ error: null }),
}))

