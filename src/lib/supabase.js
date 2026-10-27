import { createClient } from '@supabase/supabase-js'
import { localAuth } from './localAuth'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://buficdckxnvwjegcomr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1ZmljZGNreHZudndqZWdjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTUyMjIsImV4cCI6MjEwODY3MTIyMn0.w83s5oYhu88op0Jz5b0zm_CxC5SyVUK14bnQAZ-JsGA'

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

