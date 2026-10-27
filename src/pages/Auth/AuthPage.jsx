import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const { signIn, signUp, resetPassword, loading, error, clearError } = useAuthStore()
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

        {/* Footer */}
        <p className="auth-footer">
          Solo Leveling-inspired discipline system.<br />
          <span className="text-muted">Not medical advice. Consult a professional.</span>
        </p>
      </div>
    </div>
  )
}
