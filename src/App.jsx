import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import AppShell from './components/layout/AppShell'
import AuthPage from './pages/Auth/AuthPage'
import RoutinePage from './pages/Routine/RoutinePage'
import BodyPage from './pages/Body/BodyPage'
import CarePage from './pages/Care/CarePage'
import StudyPage from './pages/Study/StudyPage'
import TimetablePage from './pages/Timetable/TimetablePage'
import StatusPage from './pages/Status/StatusPage'
import NotFoundPage from './pages/NotFound'
import PrivacyPage from './pages/Legal/PrivacyPage'
import TermsPage from './pages/Legal/TermsPage'
import AppBackgroundLayout from './components/layout/AppBackgroundLayout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

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

  return (
    <QueryClientProvider client={queryClient}>
      <AppBackgroundLayout>
        <Routes>
          {/* Public Pages */}
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          {user ? (
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/routine" replace />} />
              <Route path="/routine" element={<RoutinePage />} />
              <Route path="/body" element={<BodyPage />} />
              <Route path="/care" element={<CarePage />} />
              <Route path="/study" element={<StudyPage />} />
              <Route path="/timetable" element={<TimetablePage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/auth" element={<Navigate to="/routine" replace />} />
            </Route>
          ) : (
            <Route path="/auth" element={<AuthPage />} />
          )}

          {/* Fallback */}
          <Route path="*" element={user ? <NotFoundPage /> : <Navigate to="/auth" replace />} />
        </Routes>
      </AppBackgroundLayout>
    </QueryClientProvider>
  )
}
