import { useEffect, useState } from 'react'
import { format, addDays, isAfter, isBefore } from 'date-fns'
import { useTimetableStore } from '../../stores/timetableStore'
import { getLogicalDate, formatLogicalDateISO } from '../../lib/dayEngine'
import './Timetable.css'

/**
 * Timetable Page
 * ----------------
 * Displays a 30‑day forward view starting from the logical today.
 * Users can lock a day (preventing scheduling) or break a lock with a penalty.
 */
export default function TimetablePage() {
  const logicalDate = getLogicalDate()
  const todayISO = formatLogicalDateISO(logicalDate)
  const { locks, toggleLock, breakLock } = useTimetableStore()
  const [days, setDays] = useState([])

  useEffect(() => {
    const arr = []
    for (let i = 0; i < 30; i++) {
      const date = addDays(logicalDate, i)
      const iso = format(date, 'yyyy-MM-dd')
      arr.push({ iso, display: format(date, 'EEE, MMM d') })
    }
    setDays(arr)
  }, [logicalDate])

  const handleToggle = (iso) => {
    if (locks[iso]) {
      // Currently locked – ask to break with penalty
      const confirmed = window.confirm(
        'Breaking a lock incurs a BREAK LOCK penalty. Continue?' 
      )
      if (confirmed) {
        breakLock(iso)
      }
    } else {
      // Lock the date (if within 30‑day window – already ensured by UI)
      toggleLock(iso)
    }
  }

  return (
    <div className="timetable-page">
      <h1 className="timetable-header">
        <span className="text-cyan">⟐</span> Timetable Locks
      </h1>
      <p className="timetable-subtitle">
        Manage your 30‑day lock schedule. Locked days cannot be allocated for quests.
      </p>
      <div className="timetable-list glass-panel-strong">
        {days.map(({ iso, display }) => (
          <div key={iso} className="timetable-item">
            <span className="timetable-date">{display}</span>
            <button
              className={`lock-btn ${locks[iso] ? 'locked' : 'unlocked'}`}
              onClick={() => handleToggle(iso)}
            >
              {locks[iso] ? '🔒 LOCKED' : '🔓 UNLOCK'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
