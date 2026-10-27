import { useState, useEffect, useRef, useCallback } from 'react'
import { getLogicalDate, formatLogicalDateISO, getActiveDayNumber, get10DayBlock } from '../../lib/dayEngine'
import './Body.css'

const EXERCISES = [
  { id: 'pushups', name: 'Push-ups', icon: '💪', muscle: 'Chest / Triceps / Core' },
  { id: 'squats', name: 'Squats', icon: '🦵', muscle: 'Quads / Glutes / Core' },
  { id: 'pullups', name: 'Pull-ups', icon: '🏋️', muscle: 'Back / Biceps' },
]

const STORAGE_KEY = 'questism_body_data'
const ROUTINE_KEY = 'questism_routine_data'

function loadBodyData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveBodyData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function syncRoutineQuest(questId, isDone, dateStr) {
  try {
    const raw = localStorage.getItem(ROUTINE_KEY)
    const routineData = raw ? JSON.parse(raw) : { completed: {}, custom: {}, tomorrow: {} }
    if (!routineData.completed) routineData.completed = {}
    if (!routineData.completed[dateStr]) routineData.completed[dateStr] = {}
    routineData.completed[dateStr][questId] = isDone
    localStorage.setItem(ROUTINE_KEY, JSON.stringify(routineData))
  } catch (err) {
    console.warn('Failed to sync with routine store:', err)
  }
}

// Haversine formula to compute distance between GPS coordinates in km
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatStopwatch(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function BodyPage() {
  const logicalDate = getLogicalDate()
  const dateStr = formatLogicalDateISO(logicalDate)
  const initialData = loadBodyData()
  const startDate = initialData?.startDate || dateStr
  const dayNumber = getActiveDayNumber(startDate)
  const block = get10DayBlock(dayNumber)

  // Baseline test
  const [baselineMode, setBaselineMode] = useState(() => !initialData?.baselines)
  const [baselines, setBaselines] = useState(() => initialData?.baselines || { pushups: '', squats: '', pullups: '' })

  // Exercise reps
  const [todayReps, setTodayReps] = useState(() => initialData?.logs?.[dateStr] || { pushups: 0, squats: 0, pullups: 0 })

  // Lock status for reps
  const [isLocked, setIsLocked] = useState(() => initialData?.locked?.[dateStr] || { pushups: false, squats: false, pullups: false })

  // Cleared checkbox status
  const [isCleared, setIsCleared] = useState(() => initialData?.cleared?.[dateStr] || { pushups: false, squats: false, pullups: false })

  // Running data
  const [runData, setRunData] = useState(() => {
    return initialData?.runs?.[dateStr] || {
      targetDistance: 10,
      distance: 0,
      duration: 0,
      completed: false,
      pace: '0.0',
      speed: '0.0',
    }
  })

  // Distance Calculator Live Tracking State
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [liveDistance, setLiveDistance] = useState(0)
  const [gpsStatus, setGpsStatus] = useState('standby') // 'standby' | 'active' | 'error' | 'simulated'
  const [gpsErrorMsg, setGpsErrorMsg] = useState('')

  const watchIdRef = useRef(null)
  const timerRef = useRef(null)
  const lastPositionRef = useRef(null)

  // Target calculation
  const getTarget = useCallback((exercise) => {
    const base = Number(baselines[exercise]) || 0
    if (exercise === 'pullups' && base === 0) return null
    const startTarget = Math.min(50, Math.max(5, Math.floor(0.60 * base)))
    const increment = (block - 1) * 30
    return startTarget + increment
  }, [baselines, block])

  // Persist body data
  useEffect(() => {
    const data = loadBodyData() || { logs: {}, runs: {}, locked: {}, cleared: {}, baselines: null, startDate: dateStr }
    if (!data.logs) data.logs = {}
    if (!data.runs) data.runs = {}
    if (!data.locked) data.locked = {}
    if (!data.cleared) data.cleared = {}

    data.logs[dateStr] = todayReps
    data.locked[dateStr] = isLocked
    data.cleared[dateStr] = isCleared
    data.runs[dateStr] = runData
    if (!baselineMode) data.baselines = baselines
    if (!data.startDate) data.startDate = dateStr

    saveBodyData(data)
  }, [todayReps, isLocked, isCleared, runData, baselines, baselineMode, dateStr])

  const saveBaselines = () => {
    const data = loadBodyData() || { logs: {}, runs: {}, locked: {}, cleared: {}, baselines: null, startDate: dateStr }
    data.baselines = baselines
    data.startDate = dateStr
    saveBodyData(data)
    setBaselineMode(false)
  }

  // Update exercise reps
  const updateReps = (exercise, value) => {
    if (isLocked[exercise]) return
    const num = Math.max(0, Math.min(500, Number(value) || 0))
    setTodayReps(prev => {
      const next = { ...prev, [exercise]: num }
      const target = getTarget(exercise)
      // Auto-lock if target is met
      if (target && num >= target) {
        setIsLocked(l => ({ ...l, [exercise]: true }))
      }
      return next
    })
  }

  // Lock / Unlock toggle
  const toggleLock = (exercise) => {
    setIsLocked(prev => ({ ...prev, [exercise]: !prev[exercise] }))
  }

  // Checkbox toggle for cleared status
  const handleToggleCleared = (exercise, checked) => {
    setIsCleared(prev => ({ ...prev, [exercise]: checked }))
    // If marked cleared, automatically lock the reps
    if (checked) {
      setIsLocked(l => ({ ...l, [exercise]: true }))
    }
    // Sync with routine daily quest
    syncRoutineQuest(`body-${exercise}`, checked, dateStr)
  }

  // --- RUNNING / DISTANCE CALCULATOR LOGIC ---

  // Timer interval
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTracking, isPaused])

  // Geolocation watch
  useEffect(() => {
    if (isTracking && !isPaused && 'geolocation' in navigator) {
      setGpsStatus('active')
      setGpsErrorMsg('')

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords
          // Filter inaccurate readings (> 35m)
          if (accuracy > 35) return

          if (lastPositionRef.current) {
            const deltaKm = calculateHaversineKm(
              lastPositionRef.current.lat,
              lastPositionRef.current.lon,
              latitude,
              longitude
            )
            // Filter realistic running speeds (ignore jitter < 3m, or impossible speed > 40 km/h)
            if (deltaKm >= 0.003 && deltaKm <= 0.08) {
              setLiveDistance(prev => {
                const nextDist = parseFloat((prev + deltaKm).toFixed(3))
                return nextDist
              })
            }
          }
          lastPositionRef.current = { lat: latitude, lon: longitude }
        },
        (err) => {
          console.warn('Geolocation error:', err)
          setGpsStatus('error')
          setGpsErrorMsg('GPS signal weak or disabled. Use Treadmill / Simulation to log distance.')
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000,
        }
      )
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      lastPositionRef.current = null
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isTracking, isPaused])

  // Finish and calculate mission results
  const completeRunSession = useCallback((finalDistKm, finalSeconds) => {
    const finalDist = parseFloat(Number(finalDistKm || liveDistance).toFixed(2))
    const totalSecs = Math.max(1, finalSeconds ?? elapsedSeconds)
    const durationMin = parseFloat((totalSecs / 60).toFixed(1))

    let paceStr = '0.0'
    let speedStr = '0.0'
    if (finalDist > 0 && durationMin > 0) {
      paceStr = (durationMin / finalDist).toFixed(1)
      speedStr = ((finalDist / (totalSecs / 3600))).toFixed(1)
    }

    const updatedRun = {
      targetDistance: runData.targetDistance || 10,
      distance: finalDist,
      duration: durationMin,
      completed: finalDist >= (runData.targetDistance || 10),
      pace: paceStr,
      speed: speedStr,
    }

    setRunData(updatedRun)
    setIsTracking(false)
    setIsPaused(false)

    // Sync to Daily Quest routine
    if (updatedRun.completed) {
      syncRoutineQuest('body-run', true, dateStr)
    }
  }, [liveDistance, elapsedSeconds, runData.targetDistance, dateStr])

  // Auto-complete when target is reached
  useEffect(() => {
    const target = runData.targetDistance || 10
    if (isTracking && liveDistance >= target) {
      completeRunSession(liveDistance, elapsedSeconds)
    }
  }, [liveDistance, isTracking, runData.targetDistance, elapsedSeconds, completeRunSession])

  const startTracker = () => {
    setLiveDistance(0)
    setElapsedSeconds(0)
    setIsPaused(false)
    setIsTracking(true)
    setGpsStatus('active')
  }

  const togglePauseTracker = () => {
    setIsPaused(prev => !prev)
  }

  // Quick increment for Treadmill / Indoor running or testing
  const addSimulatedDistance = (deltaKm) => {
    setGpsStatus('simulated')
    setLiveDistance(prev => {
      const next = parseFloat((prev + deltaKm).toFixed(2))
      return next
    })
    if (!isTracking) {
      setIsTracking(true)
    }
  }

  const resetRun = () => {
    setIsTracking(false)
    setIsPaused(false)
    setLiveDistance(0)
    setElapsedSeconds(0)
    setGpsStatus('standby')
    setRunData(prev => ({
      ...prev,
      distance: 0,
      duration: 0,
      completed: false,
      pace: '0.0',
      speed: '0.0',
    }))
    syncRoutineQuest('body-run', false, dateStr)
  }

  // Live metrics calculations
  const currentDistDisplay = isTracking ? liveDistance : (runData.distance || 0)
  const targetDist = runData.targetDistance || 10
  const runPercent = Math.min(100, Math.round((currentDistDisplay / targetDist) * 100))
  const isRunComplete = runData.completed || currentDistDisplay >= targetDist

  const liveMinutes = elapsedSeconds / 60
  const livePace = currentDistDisplay > 0 && liveMinutes > 0
    ? (liveMinutes / currentDistDisplay).toFixed(1)
    : (runData.pace || '0.0')
  const liveSpeed = currentDistDisplay > 0 && elapsedSeconds > 0
    ? ((currentDistDisplay / (elapsedSeconds / 3600))).toFixed(1)
    : (runData.speed || '0.0')

  return (
    <div className="body-page">
      {/* Header */}
      <div className="body-header">
        <div className="body-header__top">
          <h1 className="body-header__title">
            <span className="text-cyan">⟐</span> Body Status
          </h1>
          <div className="body-header__meta">
            <span className="badge badge--cyan">Day {dayNumber}</span>
            <span className="badge badge--purple">Block {block}</span>
          </div>
        </div>
        <p className="body-header__subtitle">
          Track your workout progression. +30 reps every 10 active days.
        </p>
      </div>

      {/* Baseline Test Mode */}
      {baselineMode ? (
        <div className="body-baseline glass-panel-strong animate-fade-in">
          <div className="system-banner system-banner--info">
            <span>⟐</span>
            <span>[SYSTEM] Baseline test required. Enter your max reps for each exercise.</span>
          </div>

          <div className="body-baseline__exercises">
            {EXERCISES.map(ex => (
              <div key={ex.id} className="body-baseline__field">
                <label className="body-baseline__label">
                  <span className="body-baseline__icon">{ex.icon}</span>
                  <span>{ex.name} — Max Reps</span>
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  min="0"
                  max="500"
                  value={baselines[ex.id]}
                  onChange={(e) => setBaselines(prev => ({ ...prev, [ex.id]: e.target.value }))}
                  id={`baseline-${ex.id}`}
                />
                <span className="body-baseline__hint">{ex.muscle}</span>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary body-baseline__submit"
            onClick={saveBaselines}
            id="btn-save-baselines"
          >
            ⟐ Set Baselines & Begin
          </button>

          <p className="body-baseline__note">
            Starting target = min(50, max(5, floor(0.60 × baseline)))
          </p>
        </div>
      ) : (
        <>
          {/* Exercise Cards */}
          <div className="body-exercises">
            {EXERCISES.map(ex => {
              const target = getTarget(ex.id)
              const current = todayReps[ex.id] || 0
              const percent = target ? Math.min(100, Math.round((current / target) * 100)) : 0
              const exerciseCleared = !!isCleared[ex.id]
              const exerciseLocked = !!isLocked[ex.id]

              return (
                <div
                  key={ex.id}
                  className={`body-exercise glass-panel ${exerciseCleared ? 'body-exercise--complete' : ''} ${exerciseLocked ? 'body-exercise--locked' : ''}`}
                >
                  <div className="body-exercise__header">
                    <div className="body-exercise__info">
                      <span className="body-exercise__icon">{ex.icon}</span>
                      <div>
                        <h3 className="body-exercise__name">{ex.name}</h3>
                        <span className="body-exercise__muscle">{ex.muscle}</span>
                      </div>
                    </div>
                    <div className="body-exercise__badges">
                      {exerciseCleared ? (
                        <span className="badge badge--green">CLEAR</span>
                      ) : target === null ? (
                        <span className="badge badge--red">INACTIVE</span>
                      ) : (
                        <span className="badge badge--cyan">ACTIVE</span>
                      )}
                    </div>
                  </div>

                  {target !== null ? (
                    <>
                      {/* Target & Lock Control Banner */}
                      <div className="body-exercise__target-row">
                        <div className="body-exercise__target">
                          <span className="body-exercise__target-label">Target</span>
                          <span className="body-exercise__target-value">{target} reps</span>
                        </div>

                        <button
                          type="button"
                          className={`body-exercise__lock-btn ${exerciseLocked ? 'body-exercise__lock-btn--locked' : ''}`}
                          onClick={() => toggleLock(ex.id)}
                          title={exerciseLocked ? 'Click to edit reps' : 'Lock entered reps'}
                        >
                          {exerciseLocked ? '🔒 Locked (Click to Edit)' : '🔓 Lock In Details'}
                        </button>
                      </div>

                      {/* Reps Input Row */}
                      <div className={`body-exercise__input-row ${exerciseLocked ? 'body-exercise__input-row--disabled' : ''}`}>
                        <button
                          className="body-exercise__btn"
                          onClick={() => updateReps(ex.id, current - 10)}
                          disabled={current <= 0 || exerciseLocked}
                        >
                          -10
                        </button>
                        <button
                          className="body-exercise__btn"
                          onClick={() => updateReps(ex.id, current - 1)}
                          disabled={current <= 0 || exerciseLocked}
                        >
                          -1
                        </button>
                        <input
                          type="number"
                          className={`input-field body-exercise__count ${exerciseLocked ? 'body-exercise__count--locked' : ''}`}
                          value={current}
                          onChange={(e) => updateReps(ex.id, e.target.value)}
                          min="0"
                          max="500"
                          disabled={exerciseLocked}
                          id={`reps-${ex.id}`}
                        />
                        <button
                          className="body-exercise__btn"
                          onClick={() => updateReps(ex.id, current + 1)}
                          disabled={exerciseLocked}
                        >
                          +1
                        </button>
                        <button
                          className="body-exercise__btn"
                          onClick={() => updateReps(ex.id, current + 10)}
                          disabled={exerciseLocked}
                        >
                          +10
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div className="progress-bar">
                        <div
                          className={`progress-bar__fill ${exerciseCleared ? 'progress-bar__fill--green' : 'progress-bar__fill--cyan'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="body-exercise__percent">{percent}% Completed</span>

                      {/* Cleared Checkbox Section */}
                      <div className={`body-exercise__clear-section ${exerciseCleared ? 'body-exercise__clear-section--checked' : ''}`}>
                        <label className="body-exercise__checkbox-label" htmlFor={`check-${ex.id}`}>
                          <input
                            type="checkbox"
                            id={`check-${ex.id}`}
                            className="body-exercise__checkbox-native"
                            checked={exerciseCleared}
                            onChange={(e) => handleToggleCleared(ex.id, e.target.checked)}
                          />
                          <span className={`body-exercise__checkbox-box ${exerciseCleared ? 'body-exercise__checkbox-box--active' : ''}`}>
                            {exerciseCleared && '✓'}
                          </span>
                          <div className="body-exercise__checkbox-info">
                            <span className="body-exercise__checkbox-title">
                              {exerciseCleared ? 'MISSION CLEARED' : 'MARK AS CLEARED'}
                            </span>
                            <span className="body-exercise__checkbox-desc">
                              {exerciseCleared
                                ? 'Target verified. Completed in system.'
                                : 'Check when reps are accomplished.'}
                            </span>
                          </div>
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="system-banner system-banner--warning" style={{ marginTop: 8 }}>
                      <span>⚠</span>
                      <span>[SYSTEM] Baseline is 0. Do assisted rows for 2 weeks, then re-test.</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Running / Cardio Card with Distance Calculator */}
          <div className={`body-run glass-panel ${isRunComplete ? 'body-run--complete' : ''}`}>
            <div className="body-run__header">
              <div className="body-exercise__info">
                <span className="body-exercise__icon">🏃</span>
                <div>
                  <h3 className="body-exercise__name">Running / Cardio</h3>
                  <span className="body-exercise__muscle">Cardiovascular Endurance</span>
                </div>
              </div>
              <div className="body-run__badges">
                {isRunComplete ? (
                  <span className="badge badge--green">CLEAR</span>
                ) : isTracking ? (
                  <span className="badge badge--purple animate-pulse">TRACKING</span>
                ) : (
                  <span className="badge badge--cyan">PENDING</span>
                )}
              </div>
            </div>

            {/* Target Distance Configuration */}
            <div className="body-run__target-bar">
              <div className="body-run__field">
                <label className="body-run__label">Target Distance (km)</label>
                <div className="body-run__target-input-wrap">
                  <input
                    type="number"
                    className="input-field body-run__target-input"
                    value={runData.targetDistance || 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1
                      setRunData(prev => ({ ...prev, targetDistance: val }))
                    }}
                    disabled={isTracking}
                    step="0.5"
                    min="0.5"
                    max="100"
                    placeholder="10"
                    id="run-target-distance"
                  />
                  <span className="body-run__target-unit">KM</span>
                </div>
              </div>

              {/* GPS Status HUD */}
              <div className="body-run__gps-hud">
                <span className="body-run__gps-label">Sensor Status</span>
                <span className={`body-run__gps-indicator body-run__gps-indicator--${gpsStatus}`}>
                  {gpsStatus === 'active' && '🛰️ GPS Live Tracking'}
                  {gpsStatus === 'simulated' && '⚡ Treadmill / Simulated'}
                  {gpsStatus === 'error' && '⚠ GPS Standby'}
                  {gpsStatus === 'standby' && '○ Ready'}
                </span>
              </div>
            </div>

            {gpsErrorMsg && (
              <div className="system-banner system-banner--warning" style={{ fontSize: '0.75rem' }}>
                <span>⚠</span>
                <span>{gpsErrorMsg}</span>
              </div>
            )}

            {/* Distance Calculator Dashboard */}
            <div className="body-calculator glass-panel-strong">
              <div className="body-calculator__header">
                <span className="hud-label">DISTANCE CALCULATOR</span>
                <span className="body-calculator__timer-chip">
                  ⏱ {formatStopwatch(elapsedSeconds)}
                </span>
              </div>

              {/* Primary Distance Meter */}
              <div className="body-calculator__meter">
                <div className="body-calculator__odometer">
                  <span className="body-calculator__num">{currentDistDisplay.toFixed(2)}</span>
                  <span className="body-calculator__slash">/</span>
                  <span className="body-calculator__target-num">{targetDist.toFixed(1)}</span>
                  <span className="body-calculator__unit">KM</span>
                </div>
                <span className="badge badge--cyan">{runPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="progress-bar">
                <div
                  className={`progress-bar__fill ${isRunComplete ? 'progress-bar__fill--green' : 'progress-bar__fill--cyan'}`}
                  style={{ width: `${runPercent}%` }}
                />
              </div>

              {/* Calculated Metrics: Pace, Speed, Elapsed */}
              <div className="body-calculator__stats-grid">
                <div className="body-calculator__stat-item">
                  <span className="body-calculator__stat-label">Calculated Pace</span>
                  <span className="body-calculator__stat-val">{livePace} min/km</span>
                </div>
                <div className="body-calculator__stat-item">
                  <span className="body-calculator__stat-label">Calculated Speed</span>
                  <span className="body-calculator__stat-val">{liveSpeed} km/h</span>
                </div>
                <div className="body-calculator__stat-item">
                  <span className="body-calculator__stat-label">Duration</span>
                  <span className="body-calculator__stat-val">
                    {runData.completed
                      ? `${runData.duration} min`
                      : isTracking
                      ? formatStopwatch(elapsedSeconds)
                      : '--'}
                  </span>
                </div>
              </div>

              {/* Tracker Controls */}
              <div className="body-calculator__actions">
                {!isTracking && !isRunComplete && (
                  <button
                    type="button"
                    className="btn btn-primary body-calculator__btn-primary"
                    onClick={startTracker}
                    id="btn-start-run"
                  >
                    ▶ Start Distance Calculator
                  </button>
                )}

                {isTracking && (
                  <>
                    <button
                      type="button"
                      className={`btn ${isPaused ? 'btn-primary' : 'btn-outline'}`}
                      onClick={togglePauseTracker}
                    >
                      {isPaused ? '▶ Resume' : '⏸ Pause'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline body-calculator__btn-treadmill"
                      onClick={() => addSimulatedDistance(0.5)}
                      title="Add 0.5 km for indoor/treadmill run"
                    >
                      ⚡ +0.5 km (Treadmill)
                    </button>

                    <button
                      type="button"
                      className="btn btn-gold"
                      onClick={() => completeRunSession(liveDistance, elapsedSeconds)}
                    >
                      ✓ Finish & Calculate
                    </button>
                  </>
                )}

                {isRunComplete && (
                  <div className="body-calculator__completed-banner">
                    <div className="system-banner system-banner--success" style={{ margin: 0 }}>
                      <span>✦</span>
                      <span>
                        [SYSTEM] MISSION CLEARED: {runData.distance} KM COMPLETED IN {runData.duration} MIN.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline body-calculator__btn-reset"
                      onClick={resetRun}
                    >
                      🔄 Recalculate / New Run
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="system-banner system-banner--info">
            <span>ℹ</span>
            <span>[SYSTEM] Next target increase at Day {block * 10 + 1}. Current block: {block}.</span>
          </div>
        </>
      )}
    </div>
  )
}
