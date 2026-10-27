import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div className="animate-fade-in" style={{ maxWidth: '420px' }}>
        <div style={{
          fontSize: '4rem',
          color: 'var(--system-red)',
          filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.4))',
          marginBottom: '16px',
          fontFamily: 'var(--font-hud)',
          fontWeight: 900,
        }}>
          404
        </div>
        <div className="system-banner system-banner--error" style={{ marginBottom: '20px' }}>
          <span>✗</span>
          <span>[SYSTEM ERROR] The requested dungeon does not exist.</span>
        </div>
        <h2 style={{
          fontFamily: 'var(--font-hud)',
          fontSize: '0.875rem',
          color: '#94A3B8',
          marginBottom: '24px',
          letterSpacing: '0.08em',
        }}>
          GATE NOT FOUND — RETURNING TO BASE
        </h2>
        <Link to="/routine" className="btn btn-primary" style={{ display: 'inline-flex' }}>
          ⟐ Return to Quest Log
        </Link>
      </div>
    </div>
  )
}
