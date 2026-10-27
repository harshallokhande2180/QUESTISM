import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { localAuth } from '../lib/localAuth'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true })
      let session = null

      try {
        const { data, error } = await supabase.auth.getSession()
        if (!error && data?.session) {
          session = data.session
        }
      } catch (err) {
        console.warn('[AUTH] Supabase network unreachable, checking local session:', err.message)
      }

      // If no cloud session, check local session
      if (!session) {
        const localRes = localAuth.auth.getSession()
        session = localRes.data?.session || null
      }

      set({
        session,
        user: session?.user ?? null,
        loading: false,
      })

      // Listen for cloud auth changes
      try {
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            set({
              session,
              user: session?.user ?? null,
            })
          }
        })
      } catch {}
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null })
    const cleanEmail = (email || '').trim().toLowerCase()

    try {
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password })
      if (error) throw error

      // If Supabase issued a session immediately, user is logged in
      if (data?.session) {
        set({
          user: data.user,
          session: data.session,
          loading: false,
        })
        return { data, needsVerification: false }
      }

      // If no session was returned, attempt immediate sign-in with password
      try {
        const signInRes = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        if (!signInRes.error && signInRes.data?.session) {
          set({
            user: signInRes.data.user,
            session: signInRes.data.session,
            loading: false,
          })
          return { data: signInRes.data, needsVerification: false }
        }
      } catch {}

      set({ loading: false })
      return { data, needsVerification: true }
    } catch (error) {
      const isNetworkIssue =
        error.message?.toLowerCase().includes('failed to fetch') ||
        error.name === 'TypeError' ||
        error.message?.toLowerCase().includes('network')

      if (isNetworkIssue) {
        console.warn('[AUTH] Cloud unreachable (likely ISP DNS filter). Falling back to local auth engine.')
        const localRes = await localAuth.auth.signUp({ email: cleanEmail, password })
        if (localRes.error) {
          set({ error: localRes.error.message, loading: false })
          return { error: localRes.error }
        }
        set({
          user: localRes.data.user,
          session: localRes.data.session,
          loading: false,
        })
        return { data: localRes.data, needsVerification: false }
      }

      set({ error: error.message, loading: false })
      return { error }
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    const cleanEmail = (email || '').trim().toLowerCase()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email not confirmed. Please toggle OFF "Confirm email" in Supabase Authentication settings.')
        }
        throw error
      }
      set({
        user: data.user,
        session: data.session,
        loading: false,
      })
      return { data }
    } catch (error) {
      const isNetworkIssue =
        error.message?.toLowerCase().includes('failed to fetch') ||
        error.name === 'TypeError' ||
        error.message?.toLowerCase().includes('network')

      if (isNetworkIssue) {
        console.warn('[AUTH] Cloud unreachable (likely ISP DNS filter). Falling back to local auth engine.')
        const localRes = await localAuth.auth.signInWithPassword({ email: cleanEmail, password })
        if (localRes.error) {
          set({ error: localRes.error.message, loading: false })
          return { error: localRes.error }
        }
        set({
          user: localRes.data.user,
          session: localRes.data.session,
          loading: false,
        })
        return { data: localRes.data }
      }

      set({ error: error.message, loading: false })
      return { error }
    }
  },

  signOut: async () => {
    set({ loading: true })
    try {
      try {
        await supabase.auth.signOut()
      } catch {}
      await localAuth.auth.signOut()
      set({ user: null, session: null, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  resetPassword: async (email) => {
    set({ loading: true, error: null })
    const cleanEmail = (email || '').trim().toLowerCase()
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
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
