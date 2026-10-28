/**
 * localAuth.js
 *
 * A localStorage-backed auth implementation that mirrors the Supabase auth API.
 * Used automatically when no Supabase credentials are configured.
 *
 * Supports: signUp, signInWithPassword, signOut, getSession, onAuthStateChange, deleteAccount
 * Data is persisted in localStorage under 'questism_users' and 'questism_session'.
 */

const USERS_KEY = 'questism_users'
const SESSION_KEY = 'questism_session'

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
    access_token: crypto.randomUUID ? crypto.randomUUID() : `tok-${Date.now()}`,
    expires_at: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  }
}

function ensureDefaultDemoUser() {
  const users = getUsers()
  const demoEmail = 'hunter@questism.sys'
  if (!users[demoEmail]) {
    users[demoEmail] = {
      user: {
        id: 'hunter-demo-001',
        email: demoEmail,
        created_at: new Date().toISOString(),
        user_metadata: { name: 'Shadow Hunter' },
      },
      password: btoa('hunter1234'),
    }
    saveUsers(users)
  }
  return users[demoEmail].user
}

const subscribers = new Set()

function notifySubscribers(event, session) {
  subscribers.forEach((cb) => cb(event, session))
}

export const localAuth = {
  auth: {
    getSession() {
      let session = getStoredSession()
      if (session && session.expires_at && Date.now() > session.expires_at) {
        saveSession(null)
        session = null
      }
      // Auto-provision a default local hunter session on first load unless explicitly signed out
      if (!session && localStorage.getItem('questism_signed_out') !== 'true') {
        const demoUser = ensureDefaultDemoUser()
        session = makeSession(demoUser)
        saveSession(session)
      }
      return { data: { session }, error: null }
    },

    async signUp({ email, password }) {
      const users = getUsers()
      const key = (email || '').trim().toLowerCase()

      if (users[key]) {
        return {
          data: null,
          error: { message: 'An account with this email already exists. Please sign in.' },
        }
      }

      const user = {
        id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
        email: key,
        created_at: new Date().toISOString(),
        user_metadata: {},
      }

      users[key] = { user, password: btoa(password) }
      saveUsers(users)

      localStorage.removeItem('questism_signed_out')
      const session = makeSession(user)
      saveSession(session)
      notifySubscribers('SIGNED_IN', session)

      return { data: { user, session }, error: null }
    },

    async signInWithPassword({ email, password }) {
      ensureDefaultDemoUser()
      const users = getUsers()
      const key = (email || '').trim().toLowerCase()
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

      localStorage.removeItem('questism_signed_out')
      const session = makeSession(record.user)
      saveSession(session)
      notifySubscribers('SIGNED_IN', session)

      return { data: { user: record.user, session }, error: null }
    },

    async signInWithOAuth({ provider = 'google' } = {}) {
      const users = getUsers()
      const googleEmail = 'hunter.gmail@gmail.com'
      if (!users[googleEmail]) {
        users[googleEmail] = {
          user: {
            id: 'google-hunter-001',
            email: googleEmail,
            created_at: new Date().toISOString(),
            user_metadata: {
              name: 'Shadow Monarch (Gmail)',
              full_name: 'Shadow Monarch',
              avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowMonarch',
              provider: provider,
            },
          },
          password: btoa('google-oauth-token'),
        }
        saveUsers(users)
      }

      localStorage.removeItem('questism_signed_out')
      const session = makeSession(users[googleEmail].user)
      saveSession(session)
      notifySubscribers('SIGNED_IN', session)

      return { data: { user: users[googleEmail].user, session }, error: null }
    },

    async signOut() {
      localStorage.setItem('questism_signed_out', 'true')
      saveSession(null)
      notifySubscribers('SIGNED_OUT', null)
      return { error: null }
    },

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

    async resetPasswordForEmail(email) {
      const key = (email || '').trim().toLowerCase()
      if (!key) {
        return { error: { message: 'Please enter a valid email address.' } }
      }
      return { data: { resetSent: true }, error: null }
    },
  },
}
