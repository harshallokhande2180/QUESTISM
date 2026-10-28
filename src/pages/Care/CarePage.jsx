import { useState, useEffect } from 'react'
import { getLogicalDate, formatLogicalDateISO } from '../../lib/dayEngine'
import { useCourseStore } from '../../stores/courseStore'
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
  { id: 'neck-forward', label: 'Chin to Chest (Neck Up-and-Down 1/2)', duration: 15 },
  { id: 'neck-extension', label: 'Extension — Look Up (Neck Up-and-Down 2/2)', duration: 10 },
  { id: 'neck-rotation-l', label: 'Left Rotation (Neck Rotation 1/2)', duration: 15 },
  { id: 'neck-rotation-r', label: 'Right Rotation (Neck Rotation 2/2)', duration: 15 },
  { id: 'neck-left', label: 'Left Lateral Tilt (Stretch 1)', duration: 15 },
  { id: 'neck-right', label: 'Right Lateral Tilt (Stretch 1)', duration: 15 },
  { id: 'shoulder-rolls', label: 'Shoulder Rolls (Stretch 2)', duration: 20 },
  { id: 'chest-stretch', label: 'Chest Door Stretch (Stretch 3)', duration: 20 },
]

const STORAGE_KEY = 'questism_care_data'
const ROUTINE_KEY = 'questism_routine_data'

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

function syncRoutineCare(dateStr, skinAmDone, skinPmDone, neckDone) {
  try {
    const raw = localStorage.getItem(ROUTINE_KEY)
    const routineData = raw ? JSON.parse(raw) : { completed: {}, custom: {}, tomorrow: {} }
    if (!routineData.completed) routineData.completed = {}
    if (!routineData.completed[dateStr]) routineData.completed[dateStr] = {}
    routineData.completed[dateStr]['care-skin-am'] = skinAmDone
    routineData.completed[dateStr]['care-skin-pm'] = skinPmDone
    routineData.completed[dateStr]['care-neck'] = neckDone
    localStorage.setItem(ROUTINE_KEY, JSON.stringify(routineData))
  } catch {}
}

export default function CarePage() {
  const { settings, triggerSyncFeedback } = useCourseStore()
  const logicalDate = getLogicalDate(settings?.dayEndTime || '04:00')
  const dateStr = formatLogicalDateISO(logicalDate)
  const dayOfWeek = logicalDate.getDay()
  const defaultHairScheduled = [0, 1, 3, 5].includes(dayOfWeek)

  const [completed, setCompleted] = useState(() => {
    const data = loadCareData()
    return data?.[dateStr] || { hairScheduled: defaultHairScheduled }
  })

  const [activeTimer, setActiveTimer] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(0)

  const skinAmDone = SKIN_STEPS_AM.every(s => completed[s.id])
  const skinPmDone = SKIN_STEPS_PM.every(s => completed[s.id])
  const neckDone = NECK_STRETCHES.every(s => completed[s.id])
  const hairScheduled =
    completed.hairScheduled !== undefined ? Boolean(completed.hairScheduled) : defaultHairScheduled
  const hairDone = Boolean(completed['hair-care-step'])

  // Persist & sync to Routine
  useEffect(() => {
    const data = loadCareData() || {}
    data[dateStr] = completed
    saveCareData(data)
    syncRoutineCare(dateStr, skinAmDone, skinPmDone, neckDone)
  }, [completed, dateStr, skinAmDone, skinPmDone, neckDone])

  // Timer
  useEffect(() => {
    if (!activeTimer) return
    const stretch = NECK_STRETCHES.find(s => s.id === activeTimer)
    if (!stretch) return

    if (timerSeconds >= stretch.duration) {
      setCompleted(prev => ({ ...prev, [activeTimer]: true }))
      setActiveTimer(null)
      setTimerSeconds(0)
      triggerSyncFeedback()
      return
    }

    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTimer, timerSeconds, triggerSyncFeedback])

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
    triggerSyncFeedback()
  }

  return (
    <div className="care-page">
      {/* Header */}
      <div className="care-header">
        <h1 className="care-header__title">
          <span className="text-cyan">⟐</span> Care Log
        </h1>
        <p className="care-header__subtitle">
          Track your morning/night skin care, scheduled hair care, and neck/mobility stretches.
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
            <span className="hud-label">Morning Skin Routine</span>
          </div>
          {skinAmDone && <span className="text-green">CLEAR</span>}
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
            <span className="hud-label">Night Skin Routine</span>
          </div>
          {skinPmDone && <span className="text-green">CLEAR</span>}
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

      {/* ── Scheduled Hair Care (Section 2.2) ── */}
      <div className={`care-section glass-panel ${hairScheduled && hairDone ? 'care-section--complete' : ''}`}>
        <div className="care-section__header">
          <div className="care-section__header-left">
            <span>💇</span>
            <span className="hud-label">Hair Care Schedule</span>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            onClick={() =>
              setCompleted(prev => ({ ...prev, hairScheduled: !hairScheduled }))
            }
          >
            {hairScheduled ? 'Scheduled Today' : 'Not Due Today'}
          </button>
        </div>
        {hairScheduled ? (
          <div className="care-section__items">
            <button
              className={`care-item ${hairDone ? 'care-item--done' : ''}`}
              onClick={() => toggle('hair-care-step')}
              id="care-hair-step"
            >
              <span className="care-item__icon">✨</span>
              <span className="care-item__label">Scalp Care / Conditioning Wash</span>
              <span className={`care-item__check ${hairDone ? 'care-item__check--done' : ''}`}>
                {hairDone ? '✓' : ''}
              </span>
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '0.8125rem', color: '#94A3B8', padding: '4px 0' }}>
            No hair steps scheduled for today — excluded from today's CARE % calculation.
          </p>
        )}
      </div>

      {/* ── Neck & Stretch (Feeds BODY % in Status) ── */}
      <div className={`care-section glass-panel ${neckDone ? 'care-section--complete' : ''}`}>
        <div className="care-section__header">
          <div className="care-section__header-left">
            <span>🧘</span>
            <span className="hud-label">Neck & Stretch Mobility</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => {
                const next = { ...completed }
                NECK_STRETCHES.forEach(s => {
                  next[s.id] = !neckDone
                })
                setCompleted(next)
                triggerSyncFeedback()
              }}
              id="btn-complete-all-stretches"
            >
              {neckDone ? 'Reset All' : '✓ Mark All Done'}
            </button>
          </div>
        </div>
        <div className="care-section__items">
          {NECK_STRETCHES.map(stretch => {
            const isActive = activeTimer === stretch.id
            const isDone = completed[stretch.id]
            const progress = isActive ? (timerSeconds / stretch.duration) * 100 : (isDone ? 100 : 0)

            return (
              <div key={stretch.id} className={`care-stretch ${isDone ? 'care-stretch--done' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className={`care-item__check ${isDone ? 'care-item__check--done' : ''}`}
                    onClick={() => toggle(stretch.id)}
                    title="Toggle completion"
                  >
                    {isDone ? '✓' : ''}
                  </button>
                  <button
                    className={`care-stretch__btn ${isActive ? 'care-stretch__btn--active' : ''}`}
                    style={{ flex: 1 }}
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
                        <span className="care-stretch__duration">{stretch.duration}s timer</span>
                      )}
                    </div>
                  </button>
                </div>
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
