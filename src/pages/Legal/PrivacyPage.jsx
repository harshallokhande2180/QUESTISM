import { Link } from 'react-router-dom'
import { TextEffect } from '../../components/core/TextEffect'
import { BorderTrail } from '../../components/core/BorderTrail'

export default function PrivacyPage() {
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
              PRIVACY POLICY
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>
              System Protocol · Data Privacy & Security Checklist (S5)
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
              1. EPHEMERAL UPLOAD & SYLLABUS SECURITY
            </h3>
            <p>
              When you upload course syllabi (PDF, PNG, JPG, WEBP, HEIC), files are inspected by magic-byte signatures on the client and server. Uploads are placed into isolated, private, ephemeral storage with signed URLs that expire after 5 minutes. An automated cleanup daemon permanently purges all raw files after 1 hour.
            </p>
          </div>

          <div>
            <h3 style={{ color: '#A855F7', fontFamily: 'var(--font-hud)', fontSize: '0.875rem', marginBottom: '6px' }}>
              2. AI PROCESSING & NON-TRAINING COMMITMENT
            </h3>
            <p>
              AI course parsing uses strict Zod structured outputs. Syllabus text is processed purely as untrusted data, never as prompt instructions. Under commercial API terms, none of your uploaded materials or notes are ever retained or used to train public AI foundation models.
            </p>
          </div>

          <div>
            <h3 style={{ color: '#A855F7', fontFamily: 'var(--font-hud)', fontSize: '0.875rem', marginBottom: '6px' }}>
              3. AUDIO & VOICE DATA PROTECTION
            </h3>
            <p>
              Microphone dictation is processed strictly in-memory or via streaming edge speech services. Raw voice audio recordings are never written to permanent disk storage. Transcripts only persist to your account when you explicitly review and save the course.
            </p>
          </div>

          <div>
            <h3 style={{ color: '#A855F7', fontFamily: 'var(--font-hud)', fontSize: '0.875rem', marginBottom: '6px' }}>
              4. DATA ISOLATION & ROW LEVEL SECURITY
            </h3>
            <p>
              All personal quest data, body statistics, skincare logs, and course progressions are tagged to your unique Hunter ID and protected by Row Level Security (RLS) in the cloud or isolated in private localStorage offline.
            </p>
          </div>

          <div>
            <h3 style={{ color: '#A855F7', fontFamily: 'var(--font-hud)', fontSize: '0.875rem', marginBottom: '6px' }}>
              5. COMPLETE ACCOUNT DELETION (RIGHT TO BE FORGOTTEN)
            </h3>
            <p>
              You can permanently delete your account at any time from System Settings. This instantly purges all courses, study logs, physical workout metrics, ephemeral uploads, and AI usage records with zero delay.
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
          <span>Last updated: October 2026 · Questism Security Protocol</span>
          <Link to="/terms" style={{ color: '#A855F7', textDecoration: 'none' }}>
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  )
}

