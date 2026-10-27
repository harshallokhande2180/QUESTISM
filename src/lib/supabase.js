import { createClient } from '@supabase/supabase-js'
import { localAuth } from './localAuth'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Auth Client
 *
 * When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set → real Supabase cloud client.
 * Otherwise → localAuth (localStorage-backed, same API shape, works fully offline).
 *
 * All consumers can use `supabase.auth.*` without null-checking.
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
  console.info(
    '[SYSTEM] Supabase not configured — using local auth (localStorage). ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to switch to cloud.'
  )
  supabase = localAuth
}

export { supabase }

