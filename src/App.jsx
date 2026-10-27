import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import AppShell from './components/layout/AppShell'
import AuthPage from './pages/Auth/AuthPage'
import RoutinePage from './pages/Routine/RoutinePage'
import BodyPage from './pages/Body/BodyPage'
import CarePage from './pages/Care/CarePage'
import StudyPage from './pages/Study/StudyPage'
import StatusPage from './pages/Status/StatusPage'
import NotFoundPage from './pages/NotFound'
import AppBackgroundLayout from './components/layout/AppBackgroundLayout'

/**
 * Main App Component
 * 
 * For Phase 1, we run in "local-first" mode:
 * - No Supabase credentials required
 * - All data persisted to localStorage
 * - Auth is bypassed (demo mode) unless Supabase is configured
 */
export default function App() {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Loading state
  if (loading) {
    return (
      <AppBackgroundLayout
        className="app-viewport--centered"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}
      >
        <div style={{
          fontSize: '2.5rem',
          color: 'var(--system-cyan)',
          filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}>
          ◆
        </div>
        <div className="spinner" />
        <p style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.6875rem',
          letterSpacing: '0.15em',
          color: '#64748B',
          textTransform: 'uppercase',
        }}>
          Initializing System...
        </p>
      </AppBackgroundLayout>
    )
  }

  // Auth-gated routes
  return (
    <AppBackgroundLayout>
      <Routes>
        {user ? (
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/routine" replace />} />
            <Route path="/routine" element={<RoutinePage />} />
            <Route path="/body" element={<BodyPage />} />
            <Route path="/care" element={<CarePage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/auth" element={<Navigate to="/routine" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </>
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppBackgroundLayout>
  )
}
