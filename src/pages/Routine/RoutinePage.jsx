import { useState, useEffect, useCallback } from 'react'
import { getLogicalDate, formatLogicalDate, formatLogicalDateISO, getLogicalTomorrow } from '../../lib/dayEngine'
import { questTitleSchema } from '../../lib/schemas'
import { TextEffect } from '../../components/core/TextEffect'
import './Routine.css'

// Demo data for local-first mode (no Supabase required for Phase 1 demo)
const CORE_QUESTS = [
  { id: 'body-pushups', title: 'Push-ups', category: 'body', icon: '💪', type: 'core' },
  { id: 'body-squats', title: 'Squats', category: 'body', icon: '🦵', type: 'core' },
  { id: 'body-pullups', title: 'Pull-ups', category: 'body', icon: '🏋️', type: 'core' },
  { id: 'body-run', title: 'Running / Cardio', category: 'body', icon: '🏃', type: 'core' },
  { id: 'care-neck', title: 'Neck & Stretch Routine', category: 'care', icon: '🧘', type: 'core' },
  { id: 'care-skin-am', title: 'Skin Care — Morning', category: 'care', icon: '☀️', type: 'core' },
  { id: 'care-skin-pm', title: 'Skin Care — Night', category: 'care', icon: '🌙', type: 'core' },
  { id: 'study-block', title: 'Study Block (Scheduled)', category: 'study', icon: '📚', type: 'core' },
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
  const logicalDate = getLogicalDate()
  const logicalDateStr = formatLogicalDateISO(logicalDate)
  const logicalTomorrow = getLogicalTomorrow()
  const tomorrowStr = formatLogicalDateISO(logicalTomorrow)

  // State
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

  // Persist to localStorage
  useEffect(() => {
    const data = loadLocalData() || { completed: {}, custom: {}, tomorrow: {} }
    data.completed[logicalDateStr] = completedQuests
    data.custom[logicalDateStr] = customQuests
    data.tomorrow[tomorrowStr] = tomorrowQuests
    saveLocalData(data)
  }, [completedQuests, customQuests, tomorrowQuests, logicalDateStr, tomorrowStr])

  // Check if quest accepted from yesterday
  const acceptedQuests = (() => {
    const data = loadLocalData()
    return data?.tomorrow?.[logicalDateStr] || []
  })()

  // All quests for today
  const allQuests = [
    ...CORE_QUESTS,
    ...acceptedQuests.map((q, i) => ({
      id: `accepted-${i}`,
      title: q.title,
      category: 'accepted',
      icon: '🔒',
      type: 'accepted',
    })),
    ...customQuests.map((q, i) => ({
      id: `custom-${i}`,
      title: q.title,
      category: 'bonus',
      icon: '⭐',
      type: 'bonus',
    })),
  ]

  const totalQuests = allQuests.length
  const completedCount = Object.values(completedQuests).filter(Boolean).length
  const progressPercent = totalQuests > 0 ? Math.round((completedCount / totalQuests) * 100) : 0
  const allComplete = completedCount === totalQuests && totalQuests > 0

  const toggleQuest = useCallback((questId) => {
    setCompletedQuests(prev => {
      const newState = { ...prev }
      newState[questId] = !newState[questId]

      // Trigger completion animation
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

  // Category grouping
  const bodyQuests = allQuests.filter(q => q.category === 'body')
  const careQuests = allQuests.filter(q => q.category === 'care')
  const studyQuests = allQuests.filter(q => q.category === 'study')
  const acceptedQuestItems = allQuests.filter(q => q.type === 'accepted')
  const bonusQuests = allQuests.filter(q => q.type === 'bonus')

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
          <div className="badge badge--cyan">{formatLogicalDate(logicalDate)}</div>
        </div>
        <p className="routine-header__subtitle">
          <TextEffect per="word" preset="slide" delay={0.3} speedReveal={1.5}>
            Complete all quests to maintain your streak and level up.
          </TextEffect>
        </p>
      </div>

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

      {/* ── System Banner for completion ── */}
      {allComplete && (
        <div className="system-banner system-banner--success animate-slide-in-up">
          <span>✦</span>
          <span>[SYSTEM] You have completed today's daily quest. Streak maintained.</span>
        </div>
      )}

      {/* ── Quest Categories ── */}
      <div className="routine-sections">
        {/* Body Quests */}
        <QuestSection
          label="Body Workout"
          icon="💪"
          quests={bodyQuests}
          completedQuests={completedQuests}
          onToggle={toggleQuest}
          completionAnimation={completionAnimation}
          accentClass="cyan"
        />

        {/* Care Quests */}
        <QuestSection
          label="Self Care"
          icon="✨"
          quests={careQuests}
          completedQuests={completedQuests}
          onToggle={toggleQuest}
          completionAnimation={completionAnimation}
          accentClass="green"
        />

        {/* Study Quests */}
        <QuestSection
          label="Study"
          icon="📚"
          quests={studyQuests}
          completedQuests={completedQuests}
          onToggle={toggleQuest}
          completionAnimation={completionAnimation}
          accentClass="purple"
        />

        {/* Accepted Quests (from yesterday) */}
        {acceptedQuestItems.length > 0 && (
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

            {/* Tomorrow quest list */}
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

            {/* Add tomorrow quest */}
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
    </div>
  )
}

/* ── Quest Section Component ── */
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
                {locked && <span className="badge badge--gold" style={{ marginLeft: 8 }}>LOCKED</span>}
              </div>
              <div className="quest-item__status">
                {isCompleted ? (
                  <span className="badge badge--green">CLEAR</span>
                ) : (
                  <span className="badge badge--cyan">ACTIVE</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
