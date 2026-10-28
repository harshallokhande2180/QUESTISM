import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getLogicalDate, formatLogicalDate, formatLogicalDateISO, getLogicalTomorrow } from '../../lib/dayEngine'
import { questTitleSchema } from '../../lib/schemas'
import { useCourseStore } from '../../stores/courseStore'
import { TextEffect } from '../../components/core/TextEffect'
import AddCourseComposer from '../../components/study/AddCourseComposer'
import './Routine.css'

const BODY_CORE_QUESTS = [
  { id: 'body-pushups', title: 'Push-ups', category: 'body', icon: '💪', type: 'core' },
  { id: 'body-squats', title: 'Squats', category: 'body', icon: '🦵', type: 'core' },
  { id: 'body-pullups', title: 'Pull-ups', category: 'body', icon: '🏋️', type: 'core' },
  { id: 'body-run', title: 'Running / Cardio', category: 'body', icon: '🏃', type: 'core' },
]

const CARE_CORE_QUESTS = [
  { id: 'care-neck', title: 'Neck & Stretch Routine', category: 'care', icon: '🧘', type: 'core' },
  { id: 'care-skin-am', title: 'Skin Care — Morning', category: 'care', icon: '☀️', type: 'core' },
  { id: 'care-skin-pm', title: 'Skin Care — Night', category: 'care', icon: '🌙', type: 'core' },
]

const STORAGE_KEY = 'questism_routine_data'

function loadLocalData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function RoutinePage() {
  const {
    courses,
    courseUnits,
    courseTopics,
    studyEvents,
    dailyMeta,
    settings,
    setRestDay,
    getStudyDashboardData,
    completeTopicWithNote,
    importSampleSemesterVCourses,
  } = useCourseStore()

  const dayEndTime = settings?.dayEndTime || '04:00'
  const logicalDate = getLogicalDate(dayEndTime)
  const logicalDateStr = formatLogicalDateISO(logicalDate)
  const logicalTomorrow = getLogicalTomorrow(dayEndTime)
  const tomorrowStr = formatLogicalDateISO(logicalTomorrow)

  const isRestDay = Boolean(dailyMeta?.[logicalDateStr]?.isRestDay)

  const studyDash = useMemo(
    () => getStudyDashboardData(logicalDateStr),
    [courses, courseUnits, courseTopics, studyEvents, logicalDateStr, getStudyDashboardData]
  )

  const [completedQuests, setCompletedQuests] = useState(() => {
    const data = loadLocalData()
    return data?.completed?.[logicalDateStr] || {}
  })
  const [customQuests, setCustomQuests] = useState(() => {
    const data = loadLocalData()
    return data?.custom?.[logicalDateStr] || []
  })
  const [tomorrowQuests, setTomorrowQuests] = useState(() => {
    const data = loadLocalData()
    return data?.tomorrow?.[tomorrowStr] || []
  })
  const [newQuestTitle, setNewQuestTitle] = useState('')
  const [newTomorrowTitle, setNewTomorrowTitle] = useState('')
  const [questError, setQuestError] = useState('')
  const [showTomorrow, setShowTomorrow] = useState(false)
  const [completionAnimation, setCompletionAnimation] = useState(null)

  // Inline note drawer for completing one of Today's 4 Study topics directly from Routine
  const [activeRoutineTopic, setActiveRoutineTopic] = useState(null)
  const [routineNoteText, setRoutineNoteText] = useState('')
  const [routineNoteError, setRoutineNoteError] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)

  // Keep study-daily-4 synced with studyDash.isStudyCompleteToday
  useEffect(() => {
    setCompletedQuests(prev => {
      if (Boolean(prev['study-daily-4']) === studyDash.isStudyCompleteToday) return prev
      return { ...prev, 'study-daily-4': studyDash.isStudyCompleteToday }
    })
  }, [studyDash.isStudyCompleteToday])

  // Persist to localStorage
  useEffect(() => {
    const data = loadLocalData() || { completed: {}, custom: {}, tomorrow: {} }
    data.completed[logicalDateStr] = completedQuests
    data.custom[logicalDateStr] = customQuests
    data.tomorrow[tomorrowStr] = tomorrowQuests
    saveLocalData(data)
  }, [completedQuests, customQuests, tomorrowQuests, logicalDateStr, tomorrowStr])

  const acceptedQuests = (() => {
    const data = loadLocalData()
    return data?.tomorrow?.[logicalDateStr] || []
  })()

  // Study Core Quest (always required, even on Rest Day! Section 1 & 2.1)
  const studyCoreQuest = {
    id: 'study-daily-4',
    title:
      studyDash.activeCourses.length === 0
        ? 'Study (4 Topics) — Add a course to begin'
        : `Study (${studyDash.countedTodayCount}/${studyDash.requiredToday || 4} Topics — ${studyDash.studyPercentToday}%)`,
    category: 'study',
    icon: '📚',
    type: 'core',
  }

  // On a Rest Day (Section 1): waives body items and accepted quests ONLY. Study and Care still apply!
  const requiredQuestsToday = [
    ...(isRestDay ? [] : BODY_CORE_QUESTS),
    ...CARE_CORE_QUESTS,
    studyCoreQuest,
    ...(isRestDay
      ? []
      : acceptedQuests.map((q, i) => ({
          id: `accepted-${i}`,
          title: q.title,
          category: 'accepted',
          icon: '🔒',
          type: 'accepted',
        }))),
    ...customQuests.map((q, i) => ({
      id: `custom-${i}`,
      title: q.title,
      category: 'bonus',
      icon: '⭐',
      type: 'bonus',
    })),
  ]

  const totalQuests = requiredQuestsToday.length
  const completedCount = requiredQuestsToday.filter(q =>
    q.id === 'study-daily-4' ? studyDash.isStudyCompleteToday : Boolean(completedQuests[q.id])
  ).length
  const progressPercent = totalQuests > 0 ? Math.round((completedCount / totalQuests) * 100) : 0
  const allComplete = completedCount === totalQuests && totalQuests > 0

  const toggleQuest = useCallback((questId) => {
    if (questId === 'study-daily-4') return // Study is completed by finishing 4 topics with 10+ char notes
    setCompletedQuests(prev => {
      const newState = { ...prev }
      newState[questId] = !newState[questId]
      if (newState[questId]) {
        setCompletionAnimation(questId)
        setTimeout(() => setCompletionAnimation(null), 600)
      }
      return newState
    })
  }, [])

  const addBonusQuest = () => {
    setQuestError('')
    const result = questTitleSchema.safeParse(newQuestTitle)
    if (!result.success) {
      setQuestError(result.error.issues[0].message)
      return
    }
    setCustomQuests(prev => [...prev, { title: newQuestTitle.trim() }])
    setNewQuestTitle('')
  }

  const addTomorrowQuest = () => {
    setQuestError('')
    const result = questTitleSchema.safeParse(newTomorrowTitle)
    if (!result.success) {
      setQuestError(result.error.issues[0].message)
      return
    }
    setTomorrowQuests(prev => [...prev, { title: newTomorrowTitle.trim() }])
    setNewTomorrowTitle('')
  }

  const removeTomorrowQuest = (index) => {
    setTomorrowQuests(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveRoutineTopicNote = () => {
    if (!activeRoutineTopic) return
    setRoutineNoteError('')
    const res = completeTopicWithNote(activeRoutineTopic.id, routineNoteText, logicalDateStr)
    if (res.error) {
      setRoutineNoteError(res.error)
      return
    }
    setActiveRoutineTopic(null)
    setRoutineNoteText('')
  }

  const acceptedQuestItems = requiredQuestsToday.filter(q => q.type === 'accepted')
  const bonusQuests = requiredQuestsToday.filter(q => q.type === 'bonus')

  return (
    <div className="routine-page">
      {/* ── Page Header ── */}
      <div className="routine-header">
        <div className="routine-header__top">
          <h1 className="routine-header__title">
            <span className="text-cyan">⟐</span>{' '}
            <TextEffect per="char" preset="blur" speedReveal={2}>
              Daily Quest
            </TextEffect>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className={`btn ${isRestDay ? 'btn-gold' : 'btn-outline'}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              onClick={() => setRestDay(logicalDateStr, !isRestDay)}
              id="btn-toggle-rest-day"
            >
              {isRestDay ? '🌙 Rest Day Active' : '🌙 Rest Day'}
            </button>
            <span className="text-cyan" style={{ fontFamily: 'var(--font-hud)', fontSize: '0.75rem' }}>
              {formatLogicalDate(logicalDate)}
            </span>
          </div>
        </div>
        <p className="routine-header__subtitle">
          <TextEffect per="word" preset="slide" delay={0.2} speedReveal={1.5}>
            Complete all required quests (including 4 study topics with notes) to maintain your streak.
          </TextEffect>
        </p>
      </div>

      {/* ── Onboarding Step 4 Banner: Add at least 1 course before Day 1 (Section 1) ── */}
      {studyDash.activeCourses.length === 0 && (
        <div className="glass-panel-strong" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="hud-label">Onboarding Step 4 — Course Setup Required</div>
          <p style={{ fontSize: '0.875rem', color: '#DDD6FE' }}>
            Before starting your daily quests, add at least one course (via guided typing, syllabus file/photo, or voice) or import the sample Semester V courses.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setComposerOpen(true)}
              id="btn-onboarding-add-course"
            >
              + Add new course
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => importSampleSemesterVCourses()}
              id="btn-onboarding-import-sample"
            >
              Import sample Semester V courses
            </button>
          </div>
        </div>
      )}

      {/* ── Rest Day Notice (Section 1: Waives Body & Accepted Quests only) ── */}
      {isRestDay && (
        <div className="system-banner system-banner--info" id="rest-day-banner">
          <span>🌙</span>
          <span>
            [REST DAY] Body workouts and Accepted Quests are waived today. Study (4 topics) and Self Care still apply.
          </span>
        </div>
      )}

      {/* ── Progress Overview ── */}
      <div className={`routine-progress glass-panel ${allComplete ? 'routine-progress--complete' : ''}`}>
        <div className="routine-progress__header">
          <span className="hud-label">Quest Progress</span>
          <span className="routine-progress__count">
            <span className={allComplete ? 'text-gold' : 'text-cyan'}>{completedCount}</span>
            <span className="text-muted"> / {totalQuests}</span>
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-bar__fill ${allComplete ? 'progress-bar__fill--gold' : 'progress-bar__fill--cyan'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="routine-progress__footer">
          <span className="routine-progress__percent">{progressPercent}%</span>
          {allComplete && (
            <span className="routine-progress__complete-badge">
              ✦ ALL QUESTS COMPLETE ✦
            </span>
          )}
        </div>
      </div>

      {allComplete && (
        <div className="system-banner system-banner--success animate-slide-in-up">
          <span>✦</span>
          <span>[SYSTEM] You have completed today's daily quest. Streak maintained.</span>
        </div>
      )}

      {/* ── Quest Categories ── */}
      <div className="routine-sections">
        {/* Body Quests (Waived on Rest Day) */}
        {!isRestDay && (
          <QuestSection
            label="Body Workout"
            icon="💪"
            quests={BODY_CORE_QUESTS}
            completedQuests={completedQuests}
            onToggle={toggleQuest}
            completionAnimation={completionAnimation}
            accentClass="cyan"
          />
        )}

        {/* Care Quests (Always Required) */}
        <QuestSection
          label="Self Care"
          icon="✨"
          quests={CARE_CORE_QUESTS}
          completedQuests={completedQuests}
          onToggle={toggleQuest}
          completionAnimation={completionAnimation}
          accentClass="green"
        />

        {/* Daily Study (4 Topics from Study Plan — Always Required, Section 2.1 & 5) */}
        <div className="quest-section glass-panel quest-section--purple">
          <div className="quest-section__header">
            <div className="quest-section__header-left">
              <span className="quest-section__icon">📚</span>
              <span className="hud-label">
                Daily Study ({studyDash.countedTodayCount}/{studyDash.requiredToday || 4} Topics — {studyDash.studyPercentToday}%)
              </span>
            </div>
            <Link to="/study" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              Open Study →
            </Link>
          </div>

          {studyDash.activeCourses.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: '0.8125rem', color: '#FCA5A5' }}>
              No active courses — Study is not done. Add a course above or in the Study tab.
            </div>
          ) : studyDash.plannedToday.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: '0.8125rem', color: '#86EFAC' }}>
              ✓ All active courses complete — Study is 100%.
            </div>
          ) : (
            <div className="quest-section__list">
              {studyDash.plannedToday.map((topic) => {
                const isCounted = Boolean(
                  topic.completed_at &&
                    topic.completed_day_key === logicalDateStr &&
                    (topic.note || '').trim().length >= 10
                )
                const isNoteOpen = activeRoutineTopic?.id === topic.id

                return (
                  <div key={topic.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      type="button"
                      className={`quest-item ${isCounted ? 'quest-item--completed' : ''}`}
                      onClick={() => {
                        setActiveRoutineTopic(isNoteOpen ? null : topic)
                        setRoutineNoteText(topic.note || '')
                        setRoutineNoteError('')
                      }}
                      id={`routine-study-topic-${topic.id}`}
                    >
                      <div className={`quest-item__check ${isCounted ? 'quest-item__check--done' : ''}`}>
                        {isCounted ? '✓' : ''}
                      </div>
                      <div className="quest-item__content">
                        <span className="quest-item__title">{topic.title}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginLeft: 8 }}>
                          ({topic.courseName} · Unit {topic.unitNumber})
                        </span>
                      </div>
                      <div className="quest-item__status">
                        <span className={isCounted ? 'text-green' : 'text-cyan'} style={{ fontSize: '0.75rem' }}>
                          {isCounted ? 'CLEAR' : '+ NOTE'}
                        </span>
                      </div>
                    </button>

                    {isNoteOpen && (
                      <div style={{ padding: '10px 14px', background: 'rgba(14, 5, 32, 0.85)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Enter study note (at least 10 characters)..."
                          value={routineNoteText}
                          onChange={(e) => setRoutineNoteText(e.target.value)}
                        />
                        {routineNoteError && <span className="auth-field__error">{routineNoteError}</span>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                            {routineNoteText.trim().length}/10 min chars
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => setActiveRoutineTopic(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={handleSaveRoutineTopicNote}
                            >
                              ✓ Save Note
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Accepted Quests (Waived on Rest Day) */}
        {!isRestDay && acceptedQuestItems.length > 0 && (
          <QuestSection
            label="Accepted Quests"
            icon="🔒"
            quests={acceptedQuestItems}
            completedQuests={completedQuests}
            onToggle={toggleQuest}
            completionAnimation={completionAnimation}
            accentClass="gold"
            locked
          />
        )}

        {/* Bonus Quests */}
        {bonusQuests.length > 0 && (
          <QuestSection
            label="Bonus Quests"
            icon="⭐"
            quests={bonusQuests}
            completedQuests={completedQuests}
            onToggle={toggleQuest}
            completionAnimation={completionAnimation}
            accentClass="purple"
          />
        )}
      </div>

      {/* ── Add Bonus Quest ── */}
      <div className="routine-add glass-panel">
        <span className="hud-label">Add Bonus Quest</span>
        <div className="routine-add__form">
          <input
            id="input-bonus-quest"
            type="text"
            className="input-field"
            placeholder="Enter quest title..."
            value={newQuestTitle}
            onChange={(e) => setNewQuestTitle(e.target.value)}
            maxLength={80}
            onKeyDown={(e) => e.key === 'Enter' && addBonusQuest()}
          />
          <button
            className="btn btn-primary"
            onClick={addBonusQuest}
            disabled={!newQuestTitle.trim()}
            id="btn-add-bonus"
          >
            + Add
          </button>
        </div>
        {questError && <span className="auth-field__error">{questError}</span>}
      </div>

      {/* ── Tomorrow's Quests ── */}
      <div className="routine-tomorrow glass-panel">
        <button
          className="routine-tomorrow__toggle"
          onClick={() => setShowTomorrow(!showTomorrow)}
          id="btn-toggle-tomorrow"
        >
          <span className="hud-label">Tomorrow's Quests</span>
          <span className={`routine-tomorrow__arrow ${showTomorrow ? 'routine-tomorrow__arrow--open' : ''}`}>
            ▸
          </span>
        </button>

        {showTomorrow && (
          <div className="routine-tomorrow__content animate-fade-in">
            <p className="routine-tomorrow__note">
              Quests added here will be <strong>locked</strong> when tomorrow begins.
              You won't be able to remove them.
            </p>

            {tomorrowQuests.length > 0 ? (
              <ul className="routine-tomorrow__list">
                {tomorrowQuests.map((quest, i) => (
                  <li key={i} className="routine-tomorrow__item">
                    <span className="routine-tomorrow__item-icon">📌</span>
                    <span className="routine-tomorrow__item-title">{quest.title}</span>
                    <button
                      className="routine-tomorrow__remove"
                      onClick={() => removeTomorrowQuest(i)}
                      title="Remove quest"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="routine-tomorrow__empty">
                <span className="text-muted">No quests prepared for tomorrow</span>
              </div>
            )}

            <div className="routine-add__form">
              <input
                id="input-tomorrow-quest"
                type="text"
                className="input-field"
                placeholder="Quest for tomorrow..."
                value={newTomorrowTitle}
                onChange={(e) => setNewTomorrowTitle(e.target.value)}
                maxLength={80}
                onKeyDown={(e) => e.key === 'Enter' && addTomorrowQuest()}
              />
              <button
                className="btn btn-gold"
                onClick={addTomorrowQuest}
                disabled={!newTomorrowTitle.trim()}
                id="btn-add-tomorrow"
              >
                + Lock In
              </button>
            </div>
          </div>
        )}
      </div>

      <AddCourseComposer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSaved={() => setComposerOpen(false)}
      />
    </div>
  )
}

function QuestSection({ label, icon, quests, completedQuests, onToggle, completionAnimation, accentClass, locked }) {
  const completed = quests.filter(q => completedQuests[q.id]).length
  const total = quests.length
  const allDone = completed === total

  return (
    <div className={`quest-section glass-panel quest-section--${accentClass}`}>
      <div className="quest-section__header">
        <div className="quest-section__header-left">
          <span className="quest-section__icon">{icon}</span>
          <span className="hud-label">{label}</span>
        </div>
        <span className={`quest-section__counter ${allDone ? 'quest-section__counter--done' : ''}`}>
          {completed}/{total}
        </span>
      </div>

      <div className="quest-section__list">
        {quests.map(quest => {
          const isCompleted = completedQuests[quest.id]
          const isAnimating = completionAnimation === quest.id

          return (
            <button
              key={quest.id}
              className={`quest-item ${isCompleted ? 'quest-item--completed' : ''} ${isAnimating ? 'quest-item--animating' : ''}`}
              onClick={() => onToggle(quest.id)}
              id={`quest-${quest.id}`}
            >
              <div className={`quest-item__check ${isCompleted ? 'quest-item__check--done' : ''}`}>
                {isCompleted ? '✓' : ''}
              </div>
              <div className="quest-item__content">
                <span className="quest-item__title">{quest.title}</span>
                {locked && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--dungeon-gold)' }}>LOCKED</span>}
              </div>
              <div className="quest-item__status">
                <span className={isCompleted ? 'text-green' : 'text-cyan'} style={{ fontSize: '0.75rem' }}>
                  {isCompleted ? 'CLEAR' : 'ACTIVE'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
