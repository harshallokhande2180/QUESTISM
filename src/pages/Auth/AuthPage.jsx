import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { signInSchema, signUpSchema } from '../../lib/schemas'
import { TextEffect } from '../../components/core/TextEffect'
import { BorderTrail } from '../../components/core/BorderTrail'
import './Auth.css'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState('')
  const { signIn, signUp, signInWithGoogle, resetPassword, loading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setSuccess('')
    clearError()

    if (mode === 'forgot') {
      const result = await resetPassword(email)
      if (result.success) {
        setSuccess('[SYSTEM] Password reset link sent. Check your email.')
      }
      return
    }

    const cleanEmail = email.trim().toLowerCase()

    // Validate
    const schema = mode === 'signup' ? signUpSchema : signInSchema
    const payload = mode === 'signup'
      ? { email: cleanEmail, password, confirmPassword }
      : { email: cleanEmail, password }

    const validation = schema.safeParse(payload)
    if (!validation.success) {
      const fieldErrors = {}
      validation.error.issues.forEach(issue => {
        fieldErrors[issue.path[0]] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    if (mode === 'signup') {
      const result = await signUp(cleanEmail, password)
      if (result.needsVerification) {
        setSuccess('[SYSTEM] Verification email sent. Check your inbox to activate your account.')
        setMode('signin')
      } else if (!result.error) {
        navigate('/routine')
      }
    } else {
      const result = await signIn(cleanEmail, password)
      if (!result.error) {
        navigate('/routine')
      }
    }
  }

  const handleGoogleSignIn = async () => {
    setErrors({})
    setSuccess('')
    clearError()
    const result = await signInWithGoogle()
    if (!result?.error) {
      navigate('/routine')
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setErrors({})
    setSuccess('')
    clearError()
  }

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo__icon">◆</div>
          <h1 className="auth-logo__title">
            <TextEffect per="char" preset="blur" speedReveal={1.5}>
              QUESTISM
            </TextEffect>
          </h1>
          <p className="auth-logo__subtitle">
            <TextEffect per="char" preset="fade" delay={0.6} speedReveal={2}>
              THE BEGINNING OF WINTER ARC
            </TextEffect>
          </p>
        </div>

        {/* System Banner */}
        {mode === 'signin' && (
          <div className="system-banner system-banner--info auth-banner">
            <span>⟐</span>
            <span>[SYSTEM] Authorize to access your quest log</span>
          </div>
        )}
        {mode === 'signup' && (
          <div className="system-banner system-banner--info auth-banner">
            <span>⟐</span>
            <span>[SYSTEM] Register new hunter profile</span>
          </div>
        )}
        {mode === 'forgot' && (
          <div className="system-banner system-banner--warning auth-banner">
            <span>⚠</span>
            <span>[SYSTEM] Password recovery protocol</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="system-banner system-banner--success auth-banner">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="system-banner system-banner--error auth-banner">
            <span>✗</span>
            <span>[ERROR] {error}</span>
          </div>
        )}

        {/* Form */}
        <form className="auth-form glass-panel-strong" onSubmit={handleSubmit}>
          <BorderTrail className="border-trail--cyan" size={120} transition={{ duration: 8 }} />
          <div className="auth-form__header">
            <h2 className="auth-form__title">
              <TextEffect key={mode} per="char" preset="scale" speedReveal={2}>
                {mode === 'signin' ? '[ LOGIN ]' : mode === 'signup' ? '[ REGISTER ]' : '[ RESET PASSWORD ]'}
              </TextEffect>
            </h2>
          </div>

          <div className="auth-form__fields">
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="auth-email">EMAIL</label>
              <input
                id="auth-email"
                type="email"
                className={`input-field ${errors.email ? 'error' : ''}`}
                placeholder="hunter@questism.sys"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              {errors.email && <span className="auth-field__error">{errors.email}</span>}
            </div>

            {mode !== 'forgot' && (
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="auth-password">PASSWORD</label>
                <input
                  id="auth-password"
                  type="password"
                  className={`input-field ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                {errors.password && <span className="auth-field__error">{errors.password}</span>}
              </div>
            )}

            {mode === 'signup' && (
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="auth-confirm-password">
                  CONFIRM PASSWORD
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  className={`input-field ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {errors.confirmPassword && (
                  <span className="auth-field__error">{errors.confirmPassword}</span>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-form__submit"
            disabled={loading}
            id="btn-auth-submit"
          >
            {loading ? (
              <span className="spinner spinner-sm" />
            ) : (
              <>
                {mode === 'signin' && '⟐ AUTHORIZE'}
                {mode === 'signup' && '⟐ REGISTER'}
                {mode === 'forgot' && '⟐ SEND RESET LINK'}
              </>
            )}
          </button>

          {mode !== 'forgot' && (
            <>
              <div className="auth-divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="btn btn-google auth-google-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                id="btn-google-auth"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>CONTINUE WITH GOOGLE (GMAIL)</span>
              </button>
            </>
          )}

          {/* Mode Switchers */}
          <div className="auth-form__links">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  className="auth-form__link"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="auth-form__link"
                  onClick={() => switchMode('signup')}
                >
                  Create new account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                className="auth-form__link"
                onClick={() => switchMode('signin')}
              >
                Already have an account? Sign in
              </button>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                className="auth-form__link"
                onClick={() => switchMode('signin')}
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>

        {/* Legal links & Footer */}
        <div className="auth-legal-links">
          <Link to="/privacy" className="auth-legal-link">Privacy Policy</Link>
          <span style={{ color: 'rgba(148, 163, 184, 0.4)' }}>•</span>
          <Link to="/terms" className="auth-legal-link">Terms of Service</Link>
        </div>

        <p className="auth-footer">
          Solo Leveling-inspired discipline system.<br />
          <span className="text-muted">Not medical advice. Consult a professional.</span>
        </p>
      </div>
    </div>
  )
}
