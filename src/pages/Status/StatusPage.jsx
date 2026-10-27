import { useState, useEffect, useMemo } from 'react'
import { getLogicalDate, formatLogicalDate, formatLogicalDateISO, getActiveDayNumber, get10DayBlock } from '../../lib/dayEngine'
import { BorderTrail } from '../../components/core/BorderTrail'
import { CursorImageSpring } from '../../components/ui/CursorImageSpring'
import './Status.css'

const STORAGE_KEYS = {
  routine: 'questism_routine_data',
  body: 'questism_body_data',
  care: 'questism_care_data',
  study: 'questism_study_data',
}

function loadAll() {
  const data = {}
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    try {
      const saved = localStorage.getItem(storageKey)
      data[key] = saved ? JSON.parse(saved) : null
    } catch {
      data[key] = null
    }
  }
  return data
}

export default function StatusPage() {
  const logicalDate = getLogicalDate()
  const dateStr = formatLogicalDateISO(logicalDate)
  const allData = useMemo(() => loadAll(), [])
  const bodyData = allData.body
  const startDate = bodyData?.startDate || dateStr
  const dayNumber = getActiveDayNumber(startDate)
  const block = get10DayBlock(dayNumber)
  const arcLevel = Math.floor(dayNumber / 10)

  // Calculate stats
  const stats = useMemo(() => {
    const routineData = allData.routine
    const careData = allData.care
    const studyData = allData.study

    // STR — Strength (body workout completion)
    let strScore = 0
    if (bodyData?.logs) {
      const todayLog = bodyData.logs[dateStr] || {}
      const exercises = ['pushups', 'squats', 'pullups']
      let exercisesDone = 0
      exercises.forEach(ex => {
        if ((todayLog[ex] || 0) > 0) exercisesDone++
      })
      strScore = Math.min(100, Math.round((exercisesDone / 3) * 100))
    }

    // END — Endurance (running/cardio)
    let endScore = 0
    if (bodyData?.runs?.[dateStr]?.distance > 0) {
      endScore = Math.min(100, Math.round(bodyData.runs[dateStr].distance * 20))
    }

    // FLEX — Flexibility (neck stretches)
    let flexScore = 0
    if (careData?.[dateStr]) {
      const neckIds = ['neck-forward', 'neck-left', 'neck-right', 'neck-rotation-l', 'neck-rotation-r', 'neck-extension', 'shoulder-rolls', 'chest-stretch']
      const neckDone = neckIds.filter(id => careData[dateStr][id]).length
      flexScore = Math.min(100, Math.round((neckDone / neckIds.length) * 100))
    }

    // CARE — Self-care routine
    let careScore = 0
    if (careData?.[dateStr]) {
      const amIds = ['cleanser-am', 'toner-am', 'moisturizer-am', 'sunscreen-am']
      const pmIds = ['cleanser-pm', 'cleanser2-pm', 'treatment-pm', 'moisturizer-pm']
      const allCareIds = [...amIds, ...pmIds]
      const careDone = allCareIds.filter(id => careData[dateStr][id]).length
      careScore = Math.min(100, Math.round((careDone / allCareIds.length) * 100))
    }

    // DISC — Discipline (quest completion)
    let discScore = 0
    if (routineData?.completed?.[dateStr]) {
      const completed = Object.values(routineData.completed[dateStr]).filter(Boolean).length
      const total = 8 + (routineData.custom?.[dateStr]?.length || 0) + (routineData.tomorrow?.[dateStr]?.length || 0)
      discScore = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0
    }

    // INT — Intelligence (study progress)
    let intScore = 0
    if (studyData?.completed) {
      const topicsDone = Object.keys(studyData.completed).length
      intScore = Math.min(100, Math.round((topicsDone / 175) * 100))
    }

    return { strScore, endScore, flexScore, careScore, discScore, intScore }
  }, [allData, dateStr, bodyData])

  // Overall power level
  const powerLevel = Math.round(
    (stats.strScore + stats.endScore + stats.flexScore + stats.careScore + stats.discScore + stats.intScore) / 6
  )

  const statBars = [
    { label: 'STR', value: stats.strScore, color: '#EF4444', desc: 'Strength' },
    { label: 'END', value: stats.endScore, color: '#F59E0B', desc: 'Endurance' },
    { label: 'FLEX', value: stats.flexScore, color: '#22C55E', desc: 'Flexibility' },
    { label: 'CARE', value: stats.careScore, color: '#A855F7', desc: 'Self-Care' },
    { label: 'DISC', value: stats.discScore, color: '#00E5FF', desc: 'Discipline' },
    { label: 'INT', value: stats.intScore, color: '#3B82F6', desc: 'Intelligence' },
  ]

  return (
    <div className="status-page">
      {/* Header */}
      <div className="status-header">
        <h1 className="status-header__title">
          <span className="text-cyan">⟐</span> Status HUD
        </h1>
        <p className="status-header__subtitle">
          Your hunter profile at a glance.
        </p>
      </div>

      {/* ── Profile Card ── */}
      <div className="status-profile glass-panel-strong">
        <BorderTrail className="border-trail--cyan" size={120} transition={{ duration: 10 }} />
        <div className="status-profile__avatar">
          <div className="status-profile__avatar-ring">
            <span className="status-profile__avatar-icon">◆</span>
          </div>
        </div>
        <div className="status-profile__info">
          <h2 className="status-profile__name">HUNTER</h2>
          <div className="status-profile__badges">
            <span className="badge badge--cyan">Arc Level {arcLevel}</span>
            <span className="badge badge--purple">Day {dayNumber}</span>
            <span className="badge badge--gold">Block {block}</span>
          </div>
        </div>
        <div className="status-profile__power">
          <span className="status-profile__power-label">POWER</span>
          <span className="status-profile__power-value">{powerLevel}</span>
        </div>
      </div>

      {/* ── Hunter Avatar — Cursor with Image & Spring ── */}
      <div className="status-avatar-showcase glass-panel">
        <span className="hud-label">Hunter Avatar</span>
        <CursorImageSpring
          imageSrc="https://i.pinimg.com/564x/4d/87/2e/4d872e59ef2f6c1c8b80e853c3054646.jpg"
          imageAlt="Solo Leveling Hunter"
          label="Inspect"
        />
      </div>

      {/* ── Stat Bars ── */}
      <div className="status-stats glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
        <BorderTrail className="border-trail--purple" size={100} transition={{ duration: 12 }} />
        <span className="hud-label">Hunter Stats</span>
        <div className="status-stats__bars">
          {statBars.map(stat => (
            <div key={stat.label} className="stat-bar">
              <span className="stat-bar__label" style={{ color: stat.color }}>{stat.label}</span>
              <div className="stat-bar__track">
                <div
                  className="stat-bar__fill"
                  style={{
                    width: `${stat.value}%`,
                    background: `linear-gradient(90deg, ${stat.color}88, ${stat.color})`,
                    boxShadow: `0 0 8px ${stat.color}44`,
                  }}
                />
              </div>
              <span className="stat-bar__value">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hex Stats Visual ── */}
      <div className="status-hex glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
        <BorderTrail className="border-trail--gold" size={90} transition={{ duration: 14 }} />
        <span className="hud-label">Stat Radar</span>
        <div className="status-hex__chart">
          <svg viewBox="0 0 300 300" className="status-hex__svg">
            {/* Background hexagon rings */}
            {[100, 75, 50, 25].map(pct => (
              <polygon
                key={pct}
                points={hexPoints(150, 150, (pct / 100) * 120)}
                fill="none"
                stroke="rgba(0, 229, 255, 0.08)"
                strokeWidth="1"
              />
            ))}
            {/* Stat axes */}
            {statBars.map((_, i) => {
              const angle = (i * 60 - 90) * (Math.PI / 180)
              const x2 = 150 + 120 * Math.cos(angle)
              const y2 = 150 + 120 * Math.sin(angle)
              return (
                <line
                  key={i}
                  x1="150" y1="150"
                  x2={x2} y2={y2}
                  stroke="rgba(0, 229, 255, 0.06)"
                  strokeWidth="1"
                />
              )
            })}
            {/* Stat polygon */}
            <polygon
              points={statBars.map((stat, i) => {
                const angle = (i * 60 - 90) * (Math.PI / 180)
                const r = (stat.value / 100) * 120
                return `${150 + r * Math.cos(angle)},${150 + r * Math.sin(angle)}`
              }).join(' ')}
              fill="rgba(0, 229, 255, 0.12)"
              stroke="rgba(0, 229, 255, 0.6)"
              strokeWidth="2"
            />
            {/* Stat dots + labels */}
            {statBars.map((stat, i) => {
              const angle = (i * 60 - 90) * (Math.PI / 180)
              const r = (stat.value / 100) * 120
              const labelR = 140
              const cx = 150 + r * Math.cos(angle)
              const cy = 150 + r * Math.sin(angle)
              const lx = 150 + labelR * Math.cos(angle)
              const ly = 150 + labelR * Math.sin(angle)
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="4" fill={stat.color} />
                  <text
                    x={lx} y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={stat.color}
                    fontSize="10"
                    fontFamily="'Orbitron', monospace"
                    fontWeight="600"
                  >
                    {stat.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* ── Today's Summary ── */}
      <div className="status-summary glass-panel">
        <span className="hud-label">System Date</span>
        <div className="status-summary__date">{formatLogicalDate(logicalDate)}</div>
        <div className="status-summary__grid">
          <div className="status-summary__item">
            <span className="status-summary__item-label">Arc Level</span>
            <span className="status-summary__item-value text-cyan">{arcLevel}</span>
          </div>
          <div className="status-summary__item">
            <span className="status-summary__item-label">Day</span>
            <span className="status-summary__item-value text-gold">{dayNumber}</span>
          </div>
          <div className="status-summary__item">
            <span className="status-summary__item-label">Block</span>
            <span className="status-summary__item-value text-purple">{block}</span>
          </div>
          <div className="status-summary__item">
            <span className="status-summary__item-label">Power</span>
            <span className="status-summary__item-value text-green">{powerLevel}</span>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="system-banner system-banner--info">
        <span>ℹ</span>
        <span>[SYSTEM] Stats update in real-time as you complete quests, workouts, and study topics.</span>
      </div>
    </div>
  )
}

/** Generate hexagon points for SVG */
function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 90) * (Math.PI / 180)
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
}
