import { useMemo } from 'react'
import { useCourseStore } from '../../stores/courseStore'
import { getLogicalDate, formatLogicalDate } from '../../lib/dayEngine'
import { BorderTrail } from '../../components/core/BorderTrail'
import './Status.css'

export default function StatusPage() {
  const {
    courses,
    courseTopics,
    studyEvents,
    dailyMeta,
    highestArcLevel,
    settings,
    getStatusMetrics,
  } = useCourseStore()

  const logicalDate = getLogicalDate(settings?.dayEndTime || '04:00')

  const metrics = useMemo(
    () => getStatusMetrics(),
    [courses, courseTopics, studyEvents, dailyMeta, highestArcLevel, settings, getStatusMetrics]
  )

  const { today, averages7Day, arcLevel, perfectDaysCount, daysToNextArc, lifetimeTotals } = metrics

  const areaCards = [
    {
      id: 'body',
      label: 'BODY',
      todayPct: today.isRestDay ? null : today.bodyPct ?? 0,
      avg7DayPct: averages7Day.body,
      detail: today.isRestDay
        ? 'Rest Day — Body items not due today'
        : `${today.bodyDone}/${today.bodyDue} body items reached today (Push-ups, Pull-ups, Squats, Run, Neck Rotation, Neck Up-and-Down, 3 Stretches)`,
      color: '#EF4444',
    },
    {
      id: 'care',
      label: 'CARE',
      todayPct: today.carePct,
      avg7DayPct: averages7Day.care,
      detail: `${today.careDone}/${today.careDue} care steps done today (Skin Morning, Skin Night${
        today.careDue > 2 ? ', Scheduled Hair Care' : ''
      })`,
      color: '#22C55E',
    },
    {
      id: 'study',
      label: 'STUDY',
      todayPct: today.studyPct,
      avg7DayPct: averages7Day.study,
      detail: 'Topics completed today with 10+ character study notes (max 4 counted per day)',
      color: '#A855F7',
    },
  ]

  const lifetimeItems = [
    { id: 'pushups', label: 'Push-ups', value: lifetimeTotals.pushups.toLocaleString(), unit: 'reps' },
    { id: 'pullups', label: 'Pull-ups', value: lifetimeTotals.pullups.toLocaleString(), unit: 'reps' },
    { id: 'squats', label: 'Squats', value: lifetimeTotals.squats.toLocaleString(), unit: 'reps' },
    { id: 'kmRun', label: 'KM Run', value: lifetimeTotals.kmRun.toFixed(1), unit: 'km' },
    { id: 'careDays', label: 'Care Days Completed', value: lifetimeTotals.careDaysCompleted.toLocaleString(), unit: 'days' },
    { id: 'topics', label: 'Topics Completed', value: lifetimeTotals.topicsCompleted.toLocaleString(), unit: 'topics' },
  ]

  return (
    <div className="status-page">
      {/* Header */}
      <div className="status-header">
        <div className="status-header__top">
          <h1 className="status-header__title">
            <span className="text-cyan">⟐</span> Status HUD
          </h1>
          <span className="status-date-text">{formatLogicalDate(logicalDate)}</span>
        </div>
        <p className="status-header__subtitle">
          Driven exclusively by BODY, CARE, and STUDY. Routine, streak, and accepted quests never affect Status.
        </p>
      </div>

      {/* ── Arc Level Banner (Section 2.2) ── */}
      <div className="status-profile glass-panel-strong">
        <BorderTrail className="border-trail--cyan" size={120} transition={{ duration: 10 }} />
        <div className="status-profile__avatar">
          <div className="status-profile__avatar-ring">
            <span className="status-profile__avatar-icon">◆</span>
          </div>
        </div>
        <div className="status-profile__info">
          <span className="hud-label">Permanent Progression</span>
          <h2 className="status-profile__name">ARC LEVEL {arcLevel}</h2>
          <p className="status-arc-desc">
            +1 Arc Level for every 10 days where BODY, CARE, and STUDY are all 100% (or CARE & STUDY on a rest day). Arc Level never resets.
          </p>
        </div>
        <div className="status-profile__power">
          <span className="status-profile__power-label">100% DAYS</span>
          <span className="status-profile__power-value" id="status-perfect-days">
            {perfectDaysCount}
          </span>
          <span className="status-next-arc-hint">{daysToNextArc} more for +1 Arc</span>
        </div>
      </div>

      {/* ── Three Core Areas: BODY %, CARE %, STUDY % (Today & 7-Day Average) ── */}
      <div className="status-areas-grid">
        {areaCards.map((area) => {
          const displayToday = area.todayPct === null ? 'Not Due' : `${area.todayPct}%`
          const barWidth = area.todayPct === null ? 100 : area.todayPct

          return (
            <div key={area.id} className="status-area-card glass-panel" id={`status-area-${area.id}`}>
              <div className="status-area-card__header">
                <span className="hud-label" style={{ color: area.color }}>
                  {area.label}
                </span>
                <div className="status-area-card__scores">
                  <div className="status-score-col">
                    <span className="status-score-col__label">Today</span>
                    <span className="status-score-col__value" id={`status-today-${area.id}`}>
                      {displayToday}
                    </span>
                  </div>
                  <div className="status-score-divider" />
                  <div className="status-score-col">
                    <span className="status-score-col__label">7-Day Avg</span>
                    <span className="status-score-col__value" id={`status-avg-${area.id}`}>
                      {area.avg7DayPct}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-bar__fill"
                  style={{
                    width: `${barWidth}%`,
                    background:
                      area.todayPct === null
                        ? 'rgba(148, 163, 184, 0.35)'
                        : `linear-gradient(90deg, ${area.color}88, ${area.color})`,
                  }}
                />
              </div>

              <p className="status-area-card__detail">{area.detail}</p>
            </div>
          )
        })}
      </div>

      {/* ── Lifetime Totals (Section 2.2) ── */}
      <div className="status-lifetime glass-panel-strong">
        <div className="status-lifetime__header">
          <span className="hud-label">Lifetime Totals</span>
          <span className="status-lifetime__note">
            Permanent historical record — unaffected by course deletions
          </span>
        </div>

        <div className="status-lifetime__grid">
          {lifetimeItems.map((item) => (
            <div key={item.id} className="status-lifetime__item" id={`lifetime-${item.id}`}>
              <span className="status-lifetime__label">{item.label}</span>
              <div className="status-lifetime__val-row">
                <span className="status-lifetime__value">{item.value}</span>
                <span className="status-lifetime__unit">{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
