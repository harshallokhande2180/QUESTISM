import { useState, useEffect } from 'react'
import { getLogicalDate, formatLogicalDateISO } from '../../lib/dayEngine'
import './Care.css'

const SKIN_STEPS_AM = [
  { id: 'cleanser-am', label: 'Cleanser', icon: '🧴' },
  { id: 'toner-am', label: 'Toner', icon: '💧' },
  { id: 'moisturizer-am', label: 'Moisturizer', icon: '🧴' },
  { id: 'sunscreen-am', label: 'Sunscreen (SPF 30+)', icon: '☀️' },
]

const SKIN_STEPS_PM = [
  { id: 'cleanser-pm', label: 'Oil / Micellar Cleanser', icon: '🧴' },
  { id: 'cleanser2-pm', label: 'Water-based Cleanser', icon: '💧' },
  { id: 'treatment-pm', label: 'Treatment / Serum', icon: '💎' },
  { id: 'moisturizer-pm', label: 'Night Moisturizer', icon: '🌙' },
]

const NECK_STRETCHES = [
  { id: 'neck-forward', label: 'Chin to Chest', duration: 15 },
  { id: 'neck-left', label: 'Left Lateral Tilt', duration: 15 },
  { id: 'neck-right', label: 'Right Lateral Tilt', duration: 15 },
  { id: 'neck-rotation-l', label: 'Left Rotation', duration: 15 },
  { id: 'neck-rotation-r', label: 'Right Rotation', duration: 15 },
  { id: 'neck-extension', label: 'Extension (Look Up)', duration: 10 },
  { id: 'shoulder-rolls', label: 'Shoulder Rolls', duration: 20 },
  { id: 'chest-stretch', label: 'Chest Door Stretch', duration: 20 },
]

const STORAGE_KEY = 'questism_care_data'

function loadCareData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveCareData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function CarePage() {
  const dateStr = formatLogicalDateISO(getLogicalDate())

  const [completed, setCompleted] = useState(() => {
    const data = loadCareData()
    return data?.[dateStr] || {}
  })

  const [activeTimer, setActiveTimer] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(0)

  // Persist
  useEffect(() => {
    const data = loadCareData() || {}
    data[dateStr] = completed
    saveCareData(data)
  }, [completed, dateStr])

  // Timer
  useEffect(() => {
    if (!activeTimer) return
    const stretch = NECK_STRETCHES.find(s => s.id === activeTimer)
    if (!stretch) return

    if (timerSeconds >= stretch.duration) {
      setCompleted(prev => ({ ...prev, [activeTimer]: true }))
      setActiveTimer(null)
      setTimerSeconds(0)
      return
    }

    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTimer, timerSeconds])

  const startTimer = (stretchId) => {
    if (activeTimer === stretchId) {
      setActiveTimer(null)
      setTimerSeconds(0)
      return
    }
    setActiveTimer(stretchId)
    setTimerSeconds(0)
  }

  const toggle = (id) => {
    setCompleted(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const skinAmDone = SKIN_STEPS_AM.every(s => completed[s.id])
  const skinPmDone = SKIN_STEPS_PM.every(s => completed[s.id])
  const neckDone = NECK_STRETCHES.every(s => completed[s.id])

  return (
    <div className="care-page">
      {/* Header */}
      <div className="care-header">
        <h1 className="care-header__title">
          <span className="text-cyan">⟐</span> Care Log
        </h1>
        <p className="care-header__subtitle">
          Track your skin care routine and neck stretches. Consistency is power.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="system-banner system-banner--warning">
        <span>⚠</span>
        <span>[SYSTEM] Not medical advice. Consult a dermatologist for personalized care.</span>
      </div>

      {/* ── Skin Care Morning ── */}
      <div className={`care-section glass-panel ${skinAmDone ? 'care-section--complete' : ''}`}>
        <div className="care-section__header">
          <div className="care-section__header-left">
            <span>☀️</span>
            <span className="hud-label">Morning Routine</span>
          </div>
          {skinAmDone && <span className="badge badge--green">CLEAR</span>}
        </div>
        <div className="care-section__items">
          {SKIN_STEPS_AM.map(step => (
            <button
              key={step.id}
              className={`care-item ${completed[step.id] ? 'care-item--done' : ''}`}
              onClick={() => toggle(step.id)}
              id={`care-${step.id}`}
            >
              <span className="care-item__icon">{step.icon}</span>
              <span className="care-item__label">{step.label}</span>
              <span className={`care-item__check ${completed[step.id] ? 'care-item__check--done' : ''}`}>
                {completed[step.id] ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Skin Care Night ── */}
      <div className={`care-section glass-panel ${skinPmDone ? 'care-section--complete' : ''}`}>
        <div className="care-section__header">
          <div className="care-section__header-left">
            <span>🌙</span>
            <span className="hud-label">Night Routine</span>
          </div>
          {skinPmDone && <span className="badge badge--green">CLEAR</span>}
        </div>
        <div className="care-section__items">
          {SKIN_STEPS_PM.map(step => (
            <button
              key={step.id}
              className={`care-item ${completed[step.id] ? 'care-item--done' : ''}`}
              onClick={() => toggle(step.id)}
              id={`care-${step.id}`}
            >
              <span className="care-item__icon">{step.icon}</span>
              <span className="care-item__label">{step.label}</span>
              <span className={`care-item__check ${completed[step.id] ? 'care-item__check--done' : ''}`}>
                {completed[step.id] ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Neck & Stretch ── */}
      <div className={`care-section glass-panel ${neckDone ? 'care-section--complete' : ''}`}>
        <div className="care-section__header">
          <div className="care-section__header-left">
            <span>🧘</span>
            <span className="hud-label">Neck & Stretch</span>
          </div>
          {neckDone && <span className="badge badge--green">CLEAR</span>}
        </div>
        <div className="care-section__items">
          {NECK_STRETCHES.map(stretch => {
            const isActive = activeTimer === stretch.id
            const isDone = completed[stretch.id]
            const progress = isActive ? (timerSeconds / stretch.duration) * 100 : (isDone ? 100 : 0)

            return (
              <div key={stretch.id} className={`care-stretch ${isDone ? 'care-stretch--done' : ''}`}>
                <button
                  className={`care-stretch__btn ${isActive ? 'care-stretch__btn--active' : ''}`}
                  onClick={() => startTimer(stretch.id)}
                  id={`stretch-${stretch.id}`}
                >
                  <span className="care-stretch__label">{stretch.label}</span>
                  <div className="care-stretch__timer-info">
                    {isActive ? (
                      <span className="care-stretch__countdown text-cyan">
                        {stretch.duration - timerSeconds}s
                      </span>
                    ) : (
                      <span className="care-stretch__duration">{stretch.duration}s</span>
                    )}
                    {isDone && <span className="text-green" style={{ marginLeft: 6 }}>✓</span>}
                  </div>
                </button>
                {(isActive || isDone) && (
                  <div className="progress-bar" style={{ marginTop: 4 }}>
                    <div
                      className={`progress-bar__fill ${isDone ? 'progress-bar__fill--green' : 'progress-bar__fill--cyan'}`}
                      style={{ width: `${progress}%`, transition: isActive ? 'width 1s linear' : undefined }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
