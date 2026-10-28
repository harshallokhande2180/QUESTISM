import { useState, useMemo } from 'react'
import { format, addDays } from 'date-fns'
import { useTimetableStore, getBlockHours } from '../../stores/timetableStore'
import { useCourseStore } from '../../stores/courseStore'
import { getLogicalDate, formatLogicalDateISO } from '../../lib/dayEngine'
import { timetableBlockSchema } from '../../lib/schemas'
import './Timetable.css'

export default function TimetablePage() {
  const { settings } = useCourseStore()
  const logicalDate = getLogicalDate(settings?.dayEndTime || '04:00')
  const todayISO = formatLogicalDateISO(logicalDate)

  const {
    locks,
    weekdayBlocks,
    weekendBlocks,
    toggleLock,
    breakLock,
    addBlock,
    removeBlock,
    getStudyHoursCheck,
  } = useTimetableStore()

  const topicLengthMinutes = settings?.topicLengthMinutes || 60
  const studyCheck = useMemo(
    () => getStudyHoursCheck(topicLengthMinutes),
    [weekdayBlocks, weekendBlocks, topicLengthMinutes, getStudyHoursCheck]
  )

  const [activeTab, setActiveTab] = useState('weekday') // 'weekday' | 'weekend' | 'locks'
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('19:30')
  const [label, setLabel] = useState('')
  const [blockType, setBlockType] = useState('study')
  const [blockError, setBlockError] = useState('')
  const [confirmBreakDate, setConfirmBreakDate] = useState(null)

  const days = useMemo(() => {
    const baseDate = new Date(todayISO + 'T00:00:00')
    return Array.from({ length: 30 }, (_, i) => {
      const date = addDays(baseDate, i)
      return {
        iso: format(date, 'yyyy-MM-dd'),
        display: format(date, 'EEE, MMM d'),
      }
    })
  }, [todayISO])

  const handleAddBlock = (e) => {
    e.preventDefault()
    setBlockError('')
    const payload = {
      startTime,
      endTime,
      label: label.trim() || (blockType === 'study' ? 'Study Block' : 'Schedule Block'),
      type: blockType,
    }
    const check = timetableBlockSchema.safeParse(payload)
    if (!check.success) {
      setBlockError(check.error.issues[0].message)
      return
    }
    // Saving is never blocked even if total study hours < 4 * topicLength (Section 5)
    addBlock(activeTab === 'weekend' ? 'weekend' : 'weekday', check.data)
    setLabel('')
  }

  const currentBlocks = activeTab === 'weekend' ? weekendBlocks : weekdayBlocks

  return (
    <div className="timetable-page">
      <div>
        <h1 className="timetable-header">
          <span className="text-cyan">⟐</span> Timetable & Study Blocks
        </h1>
        <p className="timetable-subtitle">
          Configure Weekday and Weekend study blocks and 30-day schedule locks.
        </p>
      </div>

      {/* ── Timetable Study Block Check Warnings (Section 5) ── */}
      {studyCheck.warnings.length > 0 && (
        <div className="system-banner system-banner--warning" id="timetable-hours-warning">
          <span>⚠</span>
          <div>
            {studyCheck.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── Summary Strip ── */}
      <div className="timetable-summary-grid">
        <div className="glass-panel" style={{ padding: 16 }}>
          <span className="hud-label">Weekday Study Total</span>
          <div className="timetable-stat-val">
            {studyCheck.weekdayStudyHours}h / {studyCheck.requiredHours}h needed
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 16 }}>
          <span className="hud-label">Weekend Study Total</span>
          <div className="timetable-stat-val">
            {studyCheck.weekendStudyHours}h / {studyCheck.requiredHours}h needed
          </div>
        </div>
      </div>

      {/* ── Mode Tabs ── */}
      <div className="timetable-tabs">
        <button
          type="button"
          className={`btn ${activeTab === 'weekday' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('weekday')}
          id="tab-weekday-plan"
        >
          Weekday Plan ({studyCheck.weekdayStudyHours}h Study)
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'weekend' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('weekend')}
          id="tab-weekend-plan"
        >
          Weekend Plan ({studyCheck.weekendStudyHours}h Study)
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'locks' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('locks')}
          id="tab-locks"
        >
          30-Day Locks
        </button>
      </div>

      {activeTab === 'locks' ? (
        <div className="timetable-list glass-panel-strong">
          {days.map(({ iso, display }) => (
            <div key={iso} className="timetable-item">
              <span className="timetable-date">{display}</span>
              <button
                type="button"
                className={`lock-btn ${locks[iso] ? 'locked' : 'unlocked'}`}
                onClick={() => {
                  if (locks[iso]) {
                    setConfirmBreakDate(iso)
                  } else {
                    toggleLock(iso)
                  }
                }}
              >
                {locks[iso] ? '🔒 LOCKED (Break)' : '🔓 UNLOCKED'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="timetable-plan-container">
          {/* Add Block Form */}
          <form className="glass-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={handleAddBlock}>
            <span className="hud-label">
              Add Block to {activeTab === 'weekend' ? 'Weekend' : 'Weekday'} Plan
            </span>
            <div className="timetable-form-row">
              <div>
                <label className="auth-field__label">START</label>
                <input
                  type="time"
                  className="input-field"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="auth-field__label">END</label>
                <input
                  type="time"
                  className="input-field"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div>
                <label className="auth-field__label">TYPE</label>
                <select
                  className="input-field"
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value)}
                >
                  <option value="study">Study</option>
                  <option value="workout">Workout</option>
                  <option value="routine">Routine</option>
                  <option value="free">Free</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="auth-field__label">LABEL</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Deep Focus Study"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                + Save Block
              </button>
            </div>
            {blockError && <span className="auth-field__error">{blockError}</span>}
          </form>

          {/* Block List */}
          <div className="timetable-list glass-panel-strong">
            {(currentBlocks || []).length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>No blocks in this plan yet.</p>
            ) : (
              (currentBlocks || []).map((block) => (
                <div key={block.id} className="timetable-item">
                  <div>
                    <span className="timetable-date">
                      {block.startTime} – {block.endTime} ({getBlockHours(block)}h)
                    </span>
                    <span style={{ marginLeft: 12, color: '#DDD6FE', fontSize: '0.875rem' }}>
                      {block.label}
                    </span>
                    <span
                      style={{
                        marginLeft: 10,
                        fontSize: '0.75rem',
                        color: block.type === 'study' ? '#C084FC' : '#94A3B8',
                        textTransform: 'uppercase',
                      }}
                    >
                      · {block.type}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="lock-btn locked"
                    onClick={() =>
                      removeBlock(activeTab === 'weekend' ? 'weekend' : 'weekday', block.id)
                    }
                  >
                    ✕ Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirm Break Lock Modal */}
      {confirmBreakDate && (
        <div className="composer-consent-overlay">
          <div className="composer-consent-card glass-panel-strong">
            <h3 className="hud-label">Confirm Break Lock ({confirmBreakDate})</h3>
            <p className="composer-consent-text">
              Breaking a locked schedule date incurs a BREAK LOCK penalty. Continue?
            </p>
            <div className="composer-consent-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmBreakDate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  breakLock(confirmBreakDate)
                  setConfirmBreakDate(null)
                }}
              >
                Confirm Break Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
