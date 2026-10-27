import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { getLogicalDate, formatLogicalDate } from '../../lib/dayEngine'
import { TextEffect } from '../core/TextEffect'
import { useState, useEffect } from 'react'
import './AppShell.css'

const navItems = [
  { path: '/routine', label: 'Routine', icon: '⚔️', systemLabel: 'DAILY QUEST' },
  { path: '/body', label: 'Body', icon: '💪', systemLabel: 'BODY STATUS' },
  { path: '/care', label: 'Care', icon: '✨', systemLabel: 'CARE LOG' },
  { path: '/study', label: 'Study', icon: '📚', systemLabel: 'STUDY' },
  { path: '/status', label: 'Status', icon: '📊', systemLabel: 'STATUS HUD' },
]

export default function AppShell() {
  const { user, signOut } = useAuthStore()
  const location = useLocation()
  const [logicalDate, setLogicalDate] = useState(getLogicalDate())
  const [showSettings, setShowSettings] = useState(false)

  // Update logical date every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLogicalDate(getLogicalDate())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const currentNav = navItems.find(item => location.pathname.startsWith(item.path))

  return (
    <div className="app-shell">
      {/* ── Desktop Left Rail ── */}
      <aside className="nav-rail" id="nav-rail">
        <div className="nav-rail__header">
          <div className="nav-rail__logo">
            <span className="nav-rail__logo-icon">◆</span>
            <span className="nav-rail__logo-text">
              <TextEffect per="char" preset="blur" speedReveal={2}>
                QUESTISM
              </TextEffect>
            </span>
          </div>
          <div className="nav-rail__date">
            <span className="hud-label">System Date</span>
            <span className="nav-rail__date-value">{formatLogicalDate(logicalDate)}</span>
          </div>
        </div>

        <nav className="nav-rail__nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              id={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `nav-rail__link ${isActive ? 'nav-rail__link--active' : ''}`
              }
            >
              <span className="nav-rail__link-icon">{item.icon}</span>
              <span className="nav-rail__link-label">{item.label}</span>
              <span className="nav-rail__link-badge">{item.systemLabel}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav-rail__footer">
          <button
            className="nav-rail__settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            id="btn-settings"
          >
            ⚙️ Settings
          </button>
          <button
            className="nav-rail__signout-btn"
            onClick={signOut}
            id="btn-signout"
          >
            ⏻ Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        {/* Top Bar (mobile - shows current section) */}
        <header className="top-bar">
          <div className="top-bar__left">
            <span className="top-bar__logo">◆</span>
            <span className="top-bar__title">
              <TextEffect key={currentNav?.path || 'home'} per="char" preset="fade" speedReveal={3}>
                {currentNav ? currentNav.systemLabel : 'QUESTISM'}
              </TextEffect>
            </span>
          </div>
          <div className="top-bar__right">
            <span className="top-bar__date">{formatLogicalDate(logicalDate)}</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="bottom-bar" id="bottom-bar">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            id={`mobile-nav-${item.label.toLowerCase()}`}
            className={({ isActive }) =>
              `bottom-bar__link ${isActive ? 'bottom-bar__link--active' : ''}`
            }
          >
            <span className="bottom-bar__icon">{item.icon}</span>
            <span className="bottom-bar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
