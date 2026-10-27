/**
 * localAuth.js
 *
 * A localStorage-backed auth implementation that mirrors the Supabase auth API.
 * Used automatically when no Supabase credentials are configured.
 *
 * Supports: signUp, signInWithPassword, signOut, getSession, onAuthStateChange
 * Data is persisted in localStorage under 'questism_users' and 'questism_session'.
 */

const USERS_KEY = 'questism_users'
const SESSION_KEY = 'questism_session'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function saveSession(session) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

function makeSession(user) {
  return {
    user,
    access_token: crypto.randomUUID(),
    expires_at: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  }
}

// ── Subscriber list for onAuthStateChange ────────────────────────────────────
const subscribers = new Set()

function notifySubscribers(event, session) {
  subscribers.forEach((cb) => cb(event, session))
}

// ── Public API (mirrors Supabase auth) ───────────────────────────────────────

export const localAuth = {
  auth: {
    /**
     * Returns the current session (if any).
     */
    getSession() {
      const session = getStoredSession()
      // Expire check
      if (session && session.expires_at && Date.now() > session.expires_at) {
        saveSession(null)
        return { data: { session: null }, error: null }
      }
      return { data: { session }, error: null }
    },

    /**
     * Register a new user with email + password.
     */
    async signUp({ email, password }) {
      const users = getUsers()
      const key = email.toLowerCase()

      if (users[key]) {
        return {
          data: null,
          error: { message: 'An account with this email already exists. Please sign in.' },
        }
      }

      const user = {
        id: crypto.randomUUID(),
        email,
        created_at: new Date().toISOString(),
        user_metadata: {},
      }

      // Store hashed-ish password (basic obfuscation — this is local-only demo auth)
      users[key] = { user, password: btoa(password) }
      saveUsers(users)

      const session = makeSession(user)
      saveSession(session)
      notifySubscribers('SIGNED_IN', session)

      return { data: { user, session }, error: null }
    },

    /**
     * Sign in an existing user with email + password.
     */
    async signInWithPassword({ email, password }) {
      const users = getUsers()
      const key = email.toLowerCase()
      const record = users[key]

      if (!record) {
        return {
          data: null,
          error: { message: 'No account found with this email. Please register first.' },
        }
      }

      if (record.password !== btoa(password)) {
        return {
          data: null,
          error: { message: 'Incorrect password. Please try again.' },
        }
      }

      const session = makeSession(record.user)
      saveSession(session)
      notifySubscribers('SIGNED_IN', session)

      return { data: { user: record.user, session }, error: null }
    },

    /**
     * Sign out the current user.
     */
    async signOut() {
      saveSession(null)
      notifySubscribers('SIGNED_OUT', null)
      return { error: null }
    },

    /**
     * Subscribe to auth state changes.
     */
    onAuthStateChange(callback) {
      subscribers.add(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => subscribers.delete(callback),
          },
        },
      }
    },

    /**
     * Not implemented in local auth — no email sending.
     */
    async resetPasswordForEmail(email) {
      return {
        error: {
          message:
            'Password reset requires Supabase. For local auth, create a new account.',
        },
      }
    },
  },
}
