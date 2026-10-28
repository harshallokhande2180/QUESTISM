import { Link } from 'react-router-dom'
import { TextEffect } from '../../components/core/TextEffect'
import { BorderTrail } from '../../components/core/BorderTrail'

export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
    }}>
      <div className="glass-panel-strong animate-fade-in" style={{
        maxWidth: '720px',
        width: '100%',
        padding: '32px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        <BorderTrail className="border-trail--cyan" size={120} transition={{ duration: 10 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.75rem', color: '#c084fc', marginBottom: '4px' }}>◆</div>
            <h1 style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '1.25rem',
              color: '#F8FAFC',
              letterSpacing: '0.1em',
            }}>
              TERMS OF SERVICE
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>
              Hunter Agreement · Discipline & Health Disclaimer
            </p>
          </div>
          <Link to="/auth" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            ← Back to Login
          </Link>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontSize: '0.875rem',
          color: '#CBD5E1',
          lineHeight: '1.65',
        }}>
          <div>
            <h3 style={{ color: '#A855F7', fontFamily: 'var(--font-hud)', fontSize: '0.875rem', marginBottom: '6px' }}>
              1. NATURE OF THE SYSTEM
            </h3>
            <p>
              Questism is a personal discipline, habit tracking, and syllabus study roadmap system inspired by the aesthetic of Solo Leveling. It is designed to assist users in building consistent academic and fitness habits.
            </p>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '14px',
          }}>
            <h3 style={{ color: '#FCA5A5', fontFamily: 'var(--font-hud)', fontSize: '0.875rem', marginBottom: '6px' }}>
              ⚠ 2. HEALTH & MEDICAL DISCLAIMER (MANDATORY)
            </h3>
            <p style={{ color: '#FECACA' }}>
              Questism and its quests (including push-ups, pull-ups, squats, running, stretching, and skincare routines) do NOT constitute medical, health, or clinical advice. Always consult a physician or licensed healthcare provider before beginning any strenuous physical exercise regime.
            </p>
          </div>

          <div>
            <h3 style={{ color: '#A855F7', fontFamily: 'var(--font-hud)', fontSize: '0.875rem', marginBottom: '6px' }}>
              3. USER RESPONSIBILITIES & CONDUCT
            </h3>
            <p>
              Users agree not to upload malicious binaries, harmful files, or violate intellectual property rights when uploading syllabus documents or dictating course curricula. The app enforces file-signature verification and file-type bounds.
            </p>
          </div>

          <div>
            <h3 style={{ color: '#A855F7', fontFamily: 'var(--font-hud)', fontSize: '0.875rem', marginBottom: '6px' }}>
              4. LIMITATION OF LIABILITY
            </h3>
            <p>
              The software is provided on an "as-is" and "as-available" basis. In no event shall Questism developers be liable for direct or indirect physical injury, hardware malfunction, or data loss resulting from application usage.
            </p>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(148, 163, 184, 0.15)',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#64748B',
        }}>
          <span>Version 2.0 · Winter Arc Release</span>
          <Link to="/privacy" style={{ color: '#A855F7', textDecoration: 'none' }}>
            Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  )
}

