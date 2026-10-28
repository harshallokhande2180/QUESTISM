import { useState, useMemo } from 'react'
import { useCourseStore } from '../../stores/courseStore'
import { useTimetableStore } from '../../stores/timetableStore'
import { createSpeechAdapter } from '../../lib/speechAdapters'
import AddCourseComposer from '../../components/study/AddCourseComposer'
import './Study.css'

export default function StudyPage() {
  const {
    courses,
    courseUnits,
    courseTopics,
    studyEvents,
    deletionRecords,
    syncStatus,
    offlineQueueCount,
    settings,
    getCurrentDayKey,
    getStudyDashboardData,
    completeTopicWithNote,
    toggleTopicWithoutNote,
    renameCourse,
    addTopicToUnit,
    updateTopicTitle,
    reorderTopic,
    removeTopic,
    deleteCourse,
    restoreCourse,
    importSampleSemesterVCourses,
  } = useCourseStore()

  const { getStudyHoursCheck } = useTimetableStore()

  const dayKey = getCurrentDayKey()
  const dash = useMemo(
    () => getStudyDashboardData(dayKey),
    [courses, courseUnits, courseTopics, studyEvents, deletionRecords, dayKey, getStudyDashboardData]
  )

  const timetableCheck = useMemo(
    () => getStudyHoursCheck(settings?.topicLengthMinutes || 60),
    [getStudyHoursCheck, settings?.topicLengthMinutes]
  )

  // UI states
  const [composerOpen, setComposerOpen] = useState(false)
  const [activeNoteTopic, setActiveNoteTopic] = useState(null) // topic object for Today's 4 note box
  const [noteInput, setNoteInput] = useState('')
  const [noteError, setNoteError] = useState('')
  const [isDictatingNote, setIsDictatingNote] = useState(false)

  // Course detail / edit / delete states
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [expandedUnits, setExpandedUnits] = useState({})
  const [renamingCourseId, setRenamingCourseId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')

  const [editingTopicId, setEditingTopicId] = useState(null)
  const [editingTopicValue, setEditingTopicValue] = useState('')
  const [addingToUnitId, setAddingToUnitId] = useState(null)
  const [newUnitTopicValue, setNewUnitTopicValue] = useState('')
  const [topicActionError, setTopicActionError] = useState('')

  // Confirmation modal for removing a topic that has progress
  const [confirmRemoveTopic, setConfirmRemoveTopic] = useState(null)

  // Delete course confirmation sheet
  const [deleteTargetCard, setDeleteTargetCard] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // Virtual scroll state for large topic lists (> 100 items)
  const [virtualScrollOffsets, setVirtualScrollOffsets] = useState({})

  const openNoteDrawerForTopic = (topic) => {
    setActiveNoteTopic(topic)
    setNoteInput(topic.note || '')
    setNoteError('')
  }

  const handleSaveTopicNote = () => {
    if (!activeNoteTopic) return
    setNoteError('')
    const res = completeTopicWithNote(activeNoteTopic.id, noteInput, dayKey)
    if (res.error) {
      setNoteError(res.error)
      return
    }
    setActiveNoteTopic(null)
    setNoteInput('')
  }

  const handleDictateNote = () => {
    if (isDictatingNote) return
    setIsDictatingNote(true)
    const adapter = createSpeechAdapter({
      userId: 'hunter-demo-001',
      dayKey,
      silenceMs: 5000,
      onResult: ({ transcript }) => {
        setIsDictatingNote(false)
        if (transcript) {
          setNoteInput(prev => (prev ? `${prev} ${transcript}` : transcript))
        }
      },
      onSilenceTimeout: () => setIsDictatingNote(false),
      onError: () => setIsDictatingNote(false),
    })
    adapter.start()
  }

  const toggleUnitExpand = (unitId) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: prev[unitId] === undefined ? false : !prev[unitId],
    }))
  }

  const handleRequestRemoveTopic = (topic) => {
    setTopicActionError('')
    if (topic.completed_at) {
      setConfirmRemoveTopic(topic)
    } else {
      const res = removeTopic(topic.id)
      if (res.error) setTopicActionError(res.error)
    }
  }

  const handleConfirmDeleteCourse = () => {
    if (!deleteTargetCard) return
    setDeleteError('')
    const res = deleteCourse(deleteTargetCard.course.id, deleteConfirmText)
    if (res.error) {
      setDeleteError(res.error)
      return
    }
    if (selectedCourseId === deleteTargetCard.course.id) {
      setSelectedCourseId(null)
    }
    setDeleteTargetCard(null)
    setDeleteConfirmText('')
  }

  // Progress Ring SVG geometry
  const ringRadius = 32
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset =
    ringCircumference - (Math.min(100, dash.studyPercentToday) / 100) * ringCircumference

  return (
    <div className="study-page">
      {/* ── Page Header & Sync Status ── */}
      <div className="study-header">
        <div className="study-header__top">
          <h1 className="study-header__title">
            <span className="text-cyan">⟐</span> Study Module
          </h1>
          <div className="study-header__right">
            <span className="study-sync-status">
              {syncStatus === 'saving'
                ? 'Saving…'
                : syncStatus === 'offline_queued'
                ? `Offline (${offlineQueueCount} queued)`
                : 'Saved'}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setComposerOpen(true)}
              id="btn-add-new-course"
            >
              + Add new course
            </button>
          </div>
        </div>
        <p className="study-header__subtitle">
          Complete 4 topics daily with study notes (10+ characters) to maintain your streak.
        </p>
      </div>

      {/* ── Timetable Study Hours Warning Banner (Section 5) ── */}
      {timetableCheck.warnings.length > 0 && (
        <div className="system-banner system-banner--warning" id="study-timetable-warning">
          <span>⚠</span>
          <div>
            {timetableCheck.warnings.map((w, idx) => (
              <div key={idx}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Summary: Progress Ring ("Today: X of 4 topics") + Overall Course Progress ── */}
      <div className="study-top-grid">
        <div className="study-today-ring-card glass-panel-strong">
          <div className="study-ring-wrap">
            <svg width="80" height="80" viewBox="0 0 80 80" className="study-ring-svg">
              <circle
                cx="40"
                cy="40"
                r={ringRadius}
                fill="none"
                stroke="rgba(168, 85, 247, 0.16)"
                strokeWidth="7"
              />
              <circle
                cx="40"
                cy="40"
                r={ringRadius}
                fill="none"
                stroke={dash.studyPercentToday === 100 ? '#22C55E' : '#A855F7'}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
              />
              <text
                x="40"
                y="44"
                textAnchor="middle"
                fill="#F3E8FF"
                fontSize="13"
                fontWeight="700"
                fontFamily="var(--font-hud)"
              >
                {dash.studyPercentToday}%
              </text>
            </svg>
          </div>
          <div className="study-today-ring-info">
            <span className="hud-label">Daily Core Quest</span>
            <h2 className="study-today-ring-title" id="study-today-counter">
              Today: {dash.countedTodayCount} of {dash.requiredToday || 4} topics
            </h2>
            <p className="study-today-ring-meta">
              {dash.activeCourses.length === 0
                ? 'No active courses — Study is not done.'
                : dash.totalUnfinished === 0 && dash.totalActiveTopics > 0
                ? 'All active courses complete — Study is 100%.'
                : `Requires a note of at least 10 characters per topic. Extra topics today (${dash.rawCountedTodayCount}) do not carry over.`}
            </p>
          </div>
        </div>

        <div className="study-overall-card glass-panel">
          <div className="study-progress__header">
            <span className="hud-label">Overall Active Courses</span>
            <span className="study-progress__percent">{dash.overallCoursePercent}%</span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-bar__fill ${
                dash.overallCoursePercent === 100 ? 'progress-bar__fill--gold' : 'progress-bar__fill--cyan'
              }`}
              style={{ width: `${dash.overallCoursePercent}%` }}
            />
          </div>
          <div className="study-overall-footer">
            <span>
              {dash.totalActiveCompleted} / {dash.totalActiveTopics} topics finished
            </span>
            <span>Projected finish: {dash.projectedFinishDate}</span>
          </div>
        </div>
      </div>

      {/* ── Today's 4 Topics (Balanced Rotation Plan — Sections 2.1, 3, 5) ── */}
      {dash.activeCourses.length > 0 && (
        <div className="study-daily-plan glass-panel">
          <div className="study-daily-plan__header">
            <div>
              <span className="hud-label">Today's 4 Topics (Balanced Rotation)</span>
              <p className="study-daily-plan__hint">
                Tick a topic and save a note (min 10 characters) to count it toward today's 4.
              </p>
            </div>
            <span className="study-daily-plan__fraction">
              {dash.countedTodayCount}/{dash.requiredToday || 4} Done
            </span>
          </div>

          {dash.plannedToday.length === 0 ? (
            <div className="study-empty-plan">
              All topics across your active courses are complete (100%).
            </div>
          ) : (
            <div className="study-daily-plan__list">
              {dash.plannedToday.map((topic) => {
                const isCounted = Boolean(
                  topic.completed_at &&
                    topic.completed_day_key === dayKey &&
                    (topic.note || '').trim().length >= 10
                )
                const isNoteOpen = activeNoteTopic?.id === topic.id

                return (
                  <div
                    key={topic.id}
                    className={`study-plan-item ${isCounted ? 'study-plan-item--done' : ''}`}
                  >
                    <div className="study-plan-item__row">
                      <button
                        type="button"
                        className={`care-item__check ${isCounted ? 'care-item__check--done' : ''}`}
                        onClick={() => openNoteDrawerForTopic(topic)}
                        aria-label={`Complete topic ${topic.title} with note`}
                        id={`plan-check-${topic.id}`}
                      >
                        {isCounted ? '✓' : ''}
                      </button>

                      <div
                        className="study-plan-item__info"
                        onClick={() => openNoteDrawerForTopic(topic)}
                      >
                        <span className="study-plan-item__title">{topic.title}</span>
                        <span className="study-plan-item__meta">
                          {topic.courseName} · Unit {topic.unitNumber}
                          {isCounted && topic.note ? ` · Note: "${topic.note.slice(0, 45)}"` : ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline study-plan-item__note-btn"
                        onClick={() => openNoteDrawerForTopic(topic)}
                      >
                        {isCounted ? '✎ Edit Note' : '+ Add Note'}
                      </button>
                    </div>

                    {isNoteOpen && (
                      <div className="study-note-drawer animate-fade-in">
                        <label className="auth-field__label">
                          STUDY NOTE (MINIMUM 10 CHARACTERS — TYPED OR DICTATED)
                        </label>
                        <div className="study-note-drawer__input-wrap">
                          <textarea
                            rows={2}
                            className="input-field"
                            placeholder="Summarize key takeaway or formula (at least 10 characters)..."
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            id={`note-input-${topic.id}`}
                          />
                        </div>
                        {noteError && <span className="auth-field__error">{noteError}</span>}
                        <div className="study-note-drawer__footer">
                          <span className="study-note-drawer__char-count">
                            {noteInput.trim().length} / 10 min chars
                          </span>
                          <div className="study-note-drawer__actions">
                            {settings.voiceEnabled && (
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleDictateNote}
                              >
                                🎤 {isDictatingNote ? 'Listening…' : 'Dictate Note'}
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => setActiveNoteTopic(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleSaveTopicNote}
                              id={`btn-save-note-${topic.id}`}
                            >
                              ✓ Save Note & Complete
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
      )}

      {/* ── Empty State when User has No Active Courses (Section 3) ── */}
      {dash.activeCourses.length === 0 && (
        <div className="study-zero-courses glass-panel-strong">
          <h2 className="study-zero-courses__title">No Active Courses Yet</h2>
          <p className="study-zero-courses__desc">
            Add your own course using guided typing, syllabus photo/PDF upload, or voice—or import
            the optional sample Semester V courses.
          </p>
          <div className="study-zero-courses__actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setComposerOpen(true)}
              id="btn-zero-add-course"
            >
              + Add new course
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => importSampleSemesterVCourses()}
              id="btn-import-sample-semester-v"
            >
              Import sample Semester V courses
            </button>
          </div>
        </div>
      )}

      {/* ── Active Course List & Course Detail (Section 3) ── */}
      {dash.courseCards.length > 0 && (
        <div className="study-courses-section">
          <div className="study-courses-section__header">
            <span className="hud-label">Active Courses ({dash.courseCards.length})</span>
          </div>

          <div className="study-subjects">
            {dash.courseCards.map((cCard) => {
              const {
                course,
                units,
                topics,
                totalTopics,
                completedTopics,
                completionPercent,
                nextUnfinished,
              } = cCard
              const isSelected = selectedCourseId === course.id
              const isRenaming = renamingCourseId === course.id

              return (
                <div key={course.id} className="study-subject glass-panel study-subject--cyan">
                  <div className="study-course-card-top">
                    <button
                      type="button"
                      className="study-subject__header"
                      onClick={() => setSelectedCourseId(isSelected ? null : course.id)}
                      id={`course-card-${course.id}`}
                    >
                      <div className="study-subject__header-left">
                        <div>
                          <h3 className="study-subject__name">{course.name}</h3>
                          <span className="study-subject__count">
                            {units.length} unit{units.length === 1 ? '' : 's'} · {completedTopics}/{totalTopics} topics ·{' '}
                            {nextUnfinished
                              ? `Next: ${nextUnfinished.title}`
                              : 'All topics completed'}
                          </span>
                        </div>
                      </div>
                      <div className="study-subject__header-right">
                        <span
                          className={`study-subject__percent ${
                            completionPercent === 100 ? 'text-gold' : ''
                          }`}
                        >
                          {completionPercent}%
                        </span>
                        <span
                          className={`study-subject__arrow ${
                            isSelected ? 'study-subject__arrow--open' : ''
                          }`}
                        >
                          ▸
                        </span>
                      </div>
                    </button>

                    <div className="study-course-card-actions">
                      <button
                        type="button"
                        className="study-icon-btn"
                        onClick={() => {
                          setRenamingCourseId(course.id)
                          setRenameValue(course.name)
                          setRenameError('')
                        }}
                        title="Rename course"
                      >
                        ✎ Rename
                      </button>
                      <button
                        type="button"
                        className="study-icon-btn study-icon-btn--danger"
                        onClick={() => {
                          setDeleteTargetCard(cCard)
                          setDeleteConfirmText('')
                          setDeleteError('')
                        }}
                        title="Delete course"
                        id={`btn-delete-course-${course.id}`}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>

                  {/* Inline Rename Bar */}
                  {isRenaming && (
                    <div className="study-rename-bar">
                      <input
                        type="text"
                        className="input-field"
                        value={renameValue}
                        maxLength={60}
                        onChange={(e) => setRenameValue(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          const res = renameCourse(course.id, renameValue)
                          if (res.error) {
                            setRenameError(res.error)
                          } else {
                            setRenamingCourseId(null)
                          }
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setRenamingCourseId(null)}
                      >
                        Cancel
                      </button>
                      {renameError && <span className="auth-field__error">{renameError}</span>}
                    </div>
                  )}

                  <div className="progress-bar" style={{ margin: '0 20px 16px' }}>
                    <div
                      className="progress-bar__fill progress-bar__fill--cyan"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>

                  {/* Expanded Course Detail: Units & Topics */}
                  {isSelected && (
                    <div className="study-subject__units animate-fade-in">
                      {topicActionError && (
                        <div className="system-banner system-banner--error" style={{ marginBottom: 12 }}>
                          <span>✗</span>
                          <span>{topicActionError}</span>
                        </div>
                      )}

                      {units.map((unit) => {
                        const unitTopics = topics
                          .filter(t => t.unit_id === unit.id)
                          .sort((a, b) => a.position - b.position)
                        const unitDoneCount = unitTopics.filter(t => Boolean(t.completed_at)).length
                        const isUnitExpanded =
                          expandedUnits[unit.id] === undefined ? true : expandedUnits[unit.id]

                        // Virtual scrolling support when topics > 100
                        const useVirtual = unitTopics.length > 100
                        const scrollTop = virtualScrollOffsets[unit.id] || 0
                        const rowHeight = 46
                        const visibleCount = 15
                        const startIdx = useVirtual ? Math.max(0, Math.floor(scrollTop / rowHeight) - 2) : 0
                        const endIdx = useVirtual
                          ? Math.min(unitTopics.length, startIdx + visibleCount + 4)
                          : unitTopics.length
                        const visibleTopics = unitTopics.slice(startIdx, endIdx)

                        return (
                          <div key={unit.id} className="study-unit">
                            <div className="study-unit__header-row">
                              <button
                                type="button"
                                className="study-unit__toggle"
                                onClick={() => toggleUnitExpand(unit.id)}
                              >
                                <span className="study-unit__name">
                                  Unit {unit.unit_number}: {unit.name}
                                </span>
                                <span className="study-unit__progress-text">
                                  {unitDoneCount} of {unitTopics.length} done{' '}
                                  {isUnitExpanded ? '▾' : '▸'}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="study-icon-btn"
                                onClick={() => {
                                  setAddingToUnitId(addingToUnitId === unit.id ? null : unit.id)
                                  setNewUnitTopicValue('')
                                }}
                              >
                                + Add Topic
                              </button>
                            </div>

                            {addingToUnitId === unit.id && (
                              <div className="study-unit__add-topic-row">
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="New topic title (2–120 chars)..."
                                  value={newUnitTopicValue}
                                  maxLength={120}
                                  onChange={(e) => setNewUnitTopicValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const res = addTopicToUnit(course.id, unit.id, newUnitTopicValue)
                                      if (res.error) setTopicActionError(res.error)
                                      else {
                                        setNewUnitTopicValue('')
                                        setAddingToUnitId(null)
                                      }
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => {
                                    const res = addTopicToUnit(course.id, unit.id, newUnitTopicValue)
                                    if (res.error) setTopicActionError(res.error)
                                    else {
                                      setNewUnitTopicValue('')
                                      setAddingToUnitId(null)
                                    }
                                  }}
                                >
                                  Add
                                </button>
                              </div>
                            )}

                            {isUnitExpanded && (
                              <div
                                className="study-unit__topics-list"
                                style={
                                  useVirtual
                                    ? { maxHeight: 420, overflowY: 'auto', position: 'relative' }
                                    : undefined
                                }
                                onScroll={
                                  useVirtual
                                    ? (e) => {
                                        const st = e.currentTarget.scrollTop
                                        setVirtualScrollOffsets(prev => ({
                                          ...prev,
                                          [unit.id]: st,
                                        }))
                                      }
                                    : undefined
                                }
                              >
                                <div
                                  style={
                                    useVirtual
                                      ? {
                                          height: unitTopics.length * rowHeight,
                                          paddingTop: startIdx * rowHeight,
                                        }
                                      : undefined
                                  }
                                >
                                  {visibleTopics.map((topic, idxInSlice) => {
                                    const actualIdx = startIdx + idxInSlice
                                    const isDone = Boolean(topic.completed_at)
                                    const hasDailyNote = (topic.note || '').trim().length >= 10
                                    const isEditingThis = editingTopicId === topic.id

                                    return (
                                      <div
                                        key={topic.id}
                                        className={`study-topic-detail-row ${
                                          isDone ? 'study-topic-detail-row--done' : ''
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          className={`care-item__check ${
                                            isDone ? 'care-item__check--done' : ''
                                          }`}
                                          onClick={() => toggleTopicWithoutNote(topic.id)}
                                          title="Mark done for course completion (without note)"
                                        >
                                          {isDone ? '✓' : ''}
                                        </button>

                                        {isEditingThis ? (
                                          <div className="study-topic-edit-inline">
                                            <input
                                              type="text"
                                              className="input-field"
                                              value={editingTopicValue}
                                              maxLength={120}
                                              onChange={(e) => setEditingTopicValue(e.target.value)}
                                            />
                                            <button
                                              type="button"
                                              className="btn btn-primary"
                                              onClick={() => {
                                                const res = updateTopicTitle(topic.id, editingTopicValue)
                                                if (res.error) setTopicActionError(res.error)
                                                else setEditingTopicId(null)
                                              }}
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-outline"
                                              onClick={() => setEditingTopicId(null)}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="study-topic-detail-main">
                                            <span className="study-topic__name">{topic.title}</span>
                                            {hasDailyNote && (
                                              <span className="study-topic-note-tag">
                                                Note saved
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        <div className="study-topic-detail-controls">
                                          <button
                                            type="button"
                                            className="study-mini-btn"
                                            onClick={() => openNoteDrawerForTopic(topic)}
                                            title="Complete with daily study note (10+ chars)"
                                          >
                                            📝
                                          </button>
                                          <button
                                            type="button"
                                            className="study-mini-btn"
                                            onClick={() => {
                                              setEditingTopicId(topic.id)
                                              setEditingTopicValue(topic.title)
                                            }}
                                            title="Edit topic title"
                                          >
                                            ✎
                                          </button>
                                          <button
                                            type="button"
                                            className="study-mini-btn"
                                            onClick={() => reorderTopic(topic.id, 'up')}
                                            disabled={actualIdx === 0}
                                            title="Move up"
                                          >
                                            ↑
                                          </button>
                                          <button
                                            type="button"
                                            className="study-mini-btn"
                                            onClick={() => reorderTopic(topic.id, 'down')}
                                            disabled={actualIdx === unitTopics.length - 1}
                                            title="Move down"
                                          >
                                            ↓
                                          </button>
                                          <button
                                            type="button"
                                            className="study-mini-btn study-mini-btn--danger"
                                            onClick={() => handleRequestRemoveTopic(topic)}
                                            title="Remove topic"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recently Deleted Courses (Restorable within 30 days — Section 3) ── */}
      {dash.recentlyDeletedCourses.length > 0 && (
        <div className="study-deleted-section glass-panel">
          <span className="hud-label">Recently Deleted (Hidden for 30 Days)</span>
          <div className="study-deleted-list">
            {dash.recentlyDeletedCourses.map((delCourse) => (
              <div key={delCourse.id} className="study-deleted-item">
                <div>
                  <span className="study-deleted-item__name">{delCourse.name}</span>
                  <span className="study-deleted-item__meta">
                    Deleted {delCourse.deleted_at ? new Date(delCourse.deleted_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => restoreCourse(delCourse.id)}
                  id={`btn-restore-${delCourse.id}`}
                >
                  ↺ Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirmation Modal for Removing a Topic with Progress ── */}
      {confirmRemoveTopic && (
        <div className="composer-consent-overlay">
          <div className="composer-consent-card glass-panel-strong">
            <h3 className="hud-label">Confirm Remove Completed Topic</h3>
            <p className="composer-consent-text">
              <strong>"{confirmRemoveTopic.title}"</strong> has recorded progress. Removing it from
              this unit will keep your historical completion in Status lifetime totals. Continue?
            </p>
            <div className="composer-consent-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmRemoveTopic(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const res = removeTopic(confirmRemoveTopic.id)
                  if (res.error) setTopicActionError(res.error)
                  setConfirmRemoveTopic(null)
                }}
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Course Confirmation Sheet (Section 3) ── */}
      {deleteTargetCard && (
        <div className="composer-consent-overlay">
          <div className="composer-consent-card glass-panel-strong">
            <h3 className="hud-label">Delete Course: {deleteTargetCard.course.name}</h3>
            <p className="composer-consent-text">
              This course will be hidden for 30 days and its topics will leave the study plan
              immediately. Your completed topic history stays in Status totals.
            </p>
            {deleteTargetCard.completedTopics > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label className="auth-field__label">
                  TYPE "{deleteTargetCard.course.name}" TO CONFIRM DELETION
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={deleteTargetCard.course.name}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  id="input-confirm-delete-course"
                />
              </div>
            )}
            {deleteError && (
              <div className="system-banner system-banner--error" style={{ marginBottom: 12 }}>
                <span>✗</span>
                <span>{deleteError}</span>
              </div>
            )}
            <div className="composer-consent-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteTargetCard(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmDeleteCourse}
                id="btn-confirm-delete-course"
              >
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add-Course Composer Modal (Section 4) ── */}
      <AddCourseComposer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSaved={() => setComposerOpen(false)}
      />
    </div>
  )
}
