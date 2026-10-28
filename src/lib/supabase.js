import { createClient } from '@supabase/supabase-js'
import { localAuth } from './localAuth'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

/**
 * Auth Client
 *
 * When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set -> real Supabase cloud client.
 * Otherwise -> localAuth (localStorage-backed, same API shape, works fully offline).
 */
let supabase

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
} else {
  supabase = localAuth
}

export { supabase }
