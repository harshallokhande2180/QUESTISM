import { create } from 'zustand'
import { addDays, subDays, format } from 'date-fns'
import { getLogicalDate, formatLogicalDateISO } from '../lib/dayEngine'
import { courseNameSchema, topicTitleSchema, studyTopicNoteSchema } from '../lib/schemas'

const STORAGE_KEY = 'questism_cr2_courses_v1'
const BODY_STORAGE_KEY = 'questism_body_data'
const CARE_STORAGE_KEY = 'questism_care_data'
const ROUTINE_STORAGE_KEY = 'questism_routine_data'

export const SAMPLE_SEMESTER_V_COURSES = [
  {
    name: 'Operating Systems',
    units: [
      {
        unitNumber: 1,
        name: 'Introduction & Process Management',
        topics: ['Introduction to OS', 'OS Types & Structure', 'System Calls', 'Process Concept', 'Process States', 'PCB', 'Process Scheduling', 'CPU Scheduling Criteria', 'FCFS', 'SJF', 'Priority Scheduling', 'Round Robin'],
      },
      {
        unitNumber: 2,
        name: 'Synchronization & Deadlocks',
        topics: ['Critical Section Problem', "Peterson's Solution", 'Mutex Locks', 'Semaphores', 'Classic Sync Problems', 'Monitors', 'Deadlock Characterization', 'Resource Allocation Graph', 'Deadlock Prevention', 'Deadlock Avoidance', "Banker's Algorithm", 'Deadlock Detection & Recovery'],
      },
      {
        unitNumber: 3,
        name: 'Memory Management',
        topics: ['Memory Hierarchy', 'Contiguous Allocation', 'Paging', 'Page Table Structures', 'TLB', 'Segmentation', 'Virtual Memory Concepts', 'Demand Paging', 'Page Replacement Algorithms', 'Thrashing'],
      },
      {
        unitNumber: 4,
        name: 'File Systems & I/O',
        topics: ['File Concepts & Access', 'Directory Structure', 'Disk Scheduling', 'RAID', 'File System Implementation', 'I/O Hardware', 'I/O Software Layers', 'Buffering & Caching'],
      },
    ],
  },
  {
    name: 'Machine Learning',
    units: [
      {
        unitNumber: 1,
        name: 'Foundations',
        topics: ['What is ML?', 'Types of ML', 'Supervised vs Unsupervised', 'Bias-Variance Tradeoff', 'Overfitting & Underfitting', 'Cross-Validation', 'Feature Scaling', 'Feature Selection', 'Data Preprocessing', 'Train/Test Split', 'Evaluation Metrics'],
      },
      {
        unitNumber: 2,
        name: 'Supervised Learning',
        topics: ['Linear Regression', 'Polynomial Regression', 'Logistic Regression', 'K-Nearest Neighbors', 'Decision Trees', 'Random Forests', 'Support Vector Machines', 'Naive Bayes', 'Gradient Descent', 'Regularization (L1/L2)', 'Ensemble Methods'],
      },
      {
        unitNumber: 3,
        name: 'Unsupervised Learning',
        topics: ['K-Means Clustering', 'Hierarchical Clustering', 'DBSCAN', 'PCA', 'Association Rules', 'Apriori Algorithm', 'Anomaly Detection', 'Gaussian Mixture Models', 't-SNE'],
      },
      {
        unitNumber: 4,
        name: 'Neural Networks & Deep Learning',
        topics: ['Perceptron', 'Multi-Layer Perceptron', 'Backpropagation', 'Activation Functions', 'CNN Basics', 'RNN Basics', 'Dropout & Batch Norm', 'Transfer Learning', 'Optimization (Adam, SGD)', 'Hyperparameter Tuning', 'Model Selection', 'Ethics in ML', 'ML Pipeline'],
      },
    ],
  },
  {
    name: 'Software Engineering & PM',
    units: [
      {
        unitNumber: 1,
        name: 'SE Fundamentals',
        topics: ['Software Engineering Intro', 'Software Process Models', 'Waterfall Model', 'Iterative Model', 'Agile Methodology', 'Scrum Framework', 'Kanban', 'XP Practices', 'Requirements Engineering', 'Functional vs Non-Functional Req', 'Use Case Diagrams'],
      },
      {
        unitNumber: 2,
        name: 'Design & Architecture',
        topics: ['Software Design Principles', 'Modularity', 'Coupling & Cohesion', 'Design Patterns Intro', 'Creational Patterns', 'Structural Patterns', 'Behavioral Patterns', 'UML Diagrams', 'Class Diagrams', 'Sequence Diagrams', 'Architecture Styles'],
      },
      {
        unitNumber: 3,
        name: 'Testing & Quality',
        topics: ['Testing Fundamentals', 'Unit Testing', 'Integration Testing', 'System Testing', 'Black Box Testing', 'White Box Testing', 'Code Reviews', 'CI/CD Basics', 'Software Quality Metrics', 'ISO/CMM Standards', 'Technical Debt'],
      },
      {
        unitNumber: 4,
        name: 'Project Management',
        topics: ['PM Fundamentals', 'Project Planning', 'Estimation Techniques', 'Risk Management', 'Scheduling (Gantt/PERT)', 'Team Management', 'Configuration Management', 'Software Maintenance', 'DevOps Basics', 'Documentation', 'Release Management'],
      },
    ],
  },
  {
    name: 'MDM-III Data Engineering',
    units: [
      {
        unitNumber: 1,
        name: 'Data Foundations',
        topics: ['Data Engineering Intro', 'Data Types & Formats', 'Structured vs Unstructured', 'Data Quality', 'Data Governance', 'Metadata Management', 'Data Lifecycle', 'ETL vs ELT', 'Data Lakes', 'Data Warehouses', 'Data Marts'],
      },
      {
        unitNumber: 2,
        name: 'Data Processing',
        topics: ['Batch Processing', 'Stream Processing', 'MapReduce', 'Apache Spark Basics', 'Data Pipelines', 'Workflow Orchestration', 'Airflow Basics', 'Data Transformation', 'Data Cleaning', 'Data Integration', 'Schema Design'],
      },
      {
        unitNumber: 3,
        name: 'Storage & Databases',
        topics: ['Relational Databases Review', 'NoSQL Overview', 'Document Databases', 'Key-Value Stores', 'Column-Family Stores', 'Graph Databases', 'ACID vs BASE', 'CAP Theorem', 'Indexing Strategies', 'Partitioning & Sharding', 'Replication'],
      },
      {
        unitNumber: 4,
        name: 'Analytics & Visualization',
        topics: ['Data Analysis Fundamentals', 'Statistical Analysis', 'Exploratory Data Analysis', 'Data Visualization Principles', 'Dashboard Design', 'Business Intelligence', 'Reporting Tools', 'Big Data Concepts', 'Cloud Data Services', 'Data Privacy & Ethics', 'ML in Data Engineering', 'Real-time Analytics', 'Data Mesh'],
      },
    ],
  },
]

function makeId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getDefaultState() {
  return {
    courses: [], // { id, user_id, name, total_units, status: 'active' | 'deleted', created_at, deleted_at }
    courseUnits: [], // { id, course_id, user_id, unit_number, name }
    courseTopics: [], // { id, course_id, unit_id, user_id, position, title, completed_at, completed_day_key, note, uncertain }
    studyEvents: [], // { id, user_id, topic_id, course_name, topic_title, completed_at, day_key, note }
    deletionRecords: [], // { id, course_id, course_name, deleted_at, counted_toward_limit }
    dailyMeta: {}, // { [dayKey]: { startOfDayUnfinished: number, isRestDay: boolean } }
    highestArcLevel: 0,
    settings: {
      dayEndTime: '04:00',
      topicLengthMinutes: 60,
      voiceEnabled: true,
      micConsentGranted: false,
      useNeuralVoice: false,
      onboardingStep4Completed: false,
    },
    syncStatus: 'saved', // 'saved' | 'saving' | 'offline_queued'
    offlineQueueCount: 0,
  }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultState()
    const parsed = JSON.parse(raw)
    return {
      ...getDefaultState(),
      ...parsed,
      settings: {
        ...getDefaultState().settings,
        ...(parsed.settings || {}),
      },
    }
  } catch {
    return getDefaultState()
  }
}

function persistState(state) {
  try {
    const payload = {
      courses: state.courses,
      courseUnits: state.courseUnits,
      courseTopics: state.courseTopics,
      studyEvents: state.studyEvents,
      deletionRecords: state.deletionRecords,
      dailyMeta: state.dailyMeta,
      highestArcLevel: state.highestArcLevel,
      settings: state.settings,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn('Failed to persist courseStore:', err)
  }
}

export const useCourseStore = create((set, get) => ({
  ...loadPersistedState(),

  getCurrentDayKey: () => {
    const dayEndTime = get().settings?.dayEndTime || '04:00'
    return formatLogicalDateISO(getLogicalDate(dayEndTime))
  },

  triggerSyncFeedback: () => {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (isOffline) {
      set(s => ({ syncStatus: 'offline_queued', offlineQueueCount: s.offlineQueueCount + 1 }))
      return
    }
    set({ syncStatus: 'saving' })
    setTimeout(() => {
      set({ syncStatus: 'saved', offlineQueueCount: 0 })
    }, 220)
  },

  flushOfflineQueue: () => {
    set({ syncStatus: 'saving' })
    setTimeout(() => {
      set({ syncStatus: 'saved', offlineQueueCount: 0 })
    }, 250)
  },

  updateSettings: (partial) => {
    set(state => {
      const next = {
        ...state,
        settings: { ...state.settings, ...partial },
      }
      persistState(next)
      return next
    })
  },

  setRestDay: (dayKey, isRestDay) => {
    set(state => {
      const currentMeta = state.dailyMeta[dayKey] || {}
      const next = {
        ...state,
        dailyMeta: {
          ...state.dailyMeta,
          [dayKey]: { ...currentMeta, isRestDay: Boolean(isRestDay) },
        },
      }
      persistState(next)
      return next
    })
  },

  /**
   * Ensure start-of-day unfinished topic snapshot exists for dayKey (Section 2.1)
   */
  ensureDaySnapshot: (dayKey) => {
    const state = get()
    const activeIds = new Set(
      state.courses.filter(c => c.status === 'active').map(c => c.id)
    )
    const unfinishedNow = state.courseTopics.filter(
      t => activeIds.has(t.course_id) && !t.completed_at
    ).length
    const completedTodayCount = state.courseTopics.filter(
      t => activeIds.has(t.course_id) && t.completed_day_key === dayKey
    ).length
    const startOfDayUnfinished = unfinishedNow + completedTodayCount

    const existing = state.dailyMeta[dayKey]
    if (!existing || existing.startOfDayUnfinished !== startOfDayUnfinished) {
      const nextMeta = {
        ...state.dailyMeta,
        [dayKey]: {
          ...(existing || { isRestDay: false }),
          startOfDayUnfinished,
        },
      }
      set({ dailyMeta: nextMeta })
      persistState({ ...state, dailyMeta: nextMeta })
    }
  },

  /**
   * Add a new course (from Typing, File/Image Review, or Voice Review)
   */
  addCourse: ({ name, units, userId = 'hunter-demo-001', createdAtOverride }) => {
    const state = get()
    const nameCheck = courseNameSchema.safeParse(name)
    if (!nameCheck.success) {
      return { error: nameCheck.error.issues[0].message }
    }
    const cleanName = nameCheck.data

    // Check case-insensitive duplicate among active courses
    const duplicate = state.courses.some(
      c => c.status === 'active' && c.name.toLowerCase() === cleanName.toLowerCase()
    )
    if (duplicate) {
      return { error: `An active course named "${cleanName}" already exists.` }
    }

    if (!Array.isArray(units) || units.length < 1 || units.length > 10) {
      return { error: 'Course must have between 1 and 10 units.' }
    }

    let totalTopicsCount = 0
    for (const u of units) {
      if (!Array.isArray(u.topics) || u.topics.length < 1 || u.topics.length > 60) {
        return { error: `Unit ${u.unitNumber || ''} must have between 1 and 60 topics.` }
      }
      totalTopicsCount += u.topics.length
    }
    if (totalTopicsCount > 300) {
      return { error: `Maximum 300 topics per course (found ${totalTopicsCount}).` }
    }

    const courseId = makeId('course')
    const nowIso = createdAtOverride || new Date().toISOString()

    const newCourse = {
      id: courseId,
      user_id: userId,
      name: cleanName,
      total_units: units.length,
      status: 'active',
      created_at: nowIso,
      deleted_at: null,
    }

    const newUnits = []
    const newTopics = []

    units.forEach((u, uIdx) => {
      const unitId = makeId('unit')
      const unitNumber = uIdx + 1
      newUnits.push({
        id: unitId,
        course_id: courseId,
        user_id: userId,
        unit_number: unitNumber,
        name: (u.name || `Unit ${unitNumber}`).trim(),
      })

      const seenInUnit = new Set()
      u.topics.forEach((rawTopic, tIdx) => {
        const titleStr = typeof rawTopic === 'string' ? rawTopic : rawTopic.title
        const uncertain = typeof rawTopic === 'object' ? Boolean(rawTopic.uncertain) : false
        const cleanTitle = String(titleStr || '').trim()
        if (cleanTitle.length >= 2 && !seenInUnit.has(cleanTitle.toLowerCase())) {
          seenInUnit.add(cleanTitle.toLowerCase())
          newTopics.push({
            id: makeId('topic'),
            course_id: courseId,
            unit_id: unitId,
            user_id: userId,
            position: tIdx + 1,
            title: cleanTitle.slice(0, 120),
            completed_at: null,
            completed_day_key: null,
            note: '',
            uncertain,
          })
        }
      })
    })

    const dayKey = get().getCurrentDayKey()
    set(prev => {
      const next = {
        ...prev,
        courses: [...prev.courses, newCourse],
        courseUnits: [...prev.courseUnits, ...newUnits],
        courseTopics: [...prev.courseTopics, ...newTopics],
        settings: {
          ...prev.settings,
          onboardingStep4Completed: true,
        },
      }
      persistState(next)
      return next
    })
    get().ensureDaySnapshot(dayKey)
    get().triggerSyncFeedback()

    return { course: newCourse }
  },

  /**
   * Import Sample Semester V Courses (only when user has no active courses — Section 3)
   */
  importSampleSemesterVCourses: () => {
    const active = get().courses.filter(c => c.status === 'active')
    if (active.length > 0) {
      return { error: 'Sample import is only available when you have no active courses.' }
    }
    const baseTime = Date.now()
    SAMPLE_SEMESTER_V_COURSES.forEach((sample, idx) => {
      get().addCourse({
        name: sample.name,
        units: sample.units,
        createdAtOverride: new Date(baseTime + idx * 1000).toISOString(),
      })
    })
    return { success: true }
  },

  /**
   * Complete a topic for today WITH a note (>= 10 characters — Section 2.1)
   */
  completeTopicWithNote: (topicId, noteText, customDayKey) => {
    const noteCheck = studyTopicNoteSchema.safeParse(noteText)
    if (!noteCheck.success) {
      return { error: noteCheck.error.issues[0].message }
    }
    const cleanNote = noteCheck.data
    const state = get()
    const topic = state.courseTopics.find(t => t.id === topicId)
    if (!topic) return { error: 'Topic not found.' }
    const course = state.courses.find(c => c.id === topic.course_id)
    const dayKey = customDayKey || state.getCurrentDayKey()
    const nowIso = new Date().toISOString()

    set(prev => {
      const updatedTopics = prev.courseTopics.map(t =>
        t.id === topicId
          ? {
              ...t,
              completed_at: nowIso,
              completed_day_key: dayKey,
              note: cleanNote,
              uncertain: false,
            }
          : t
      )

      // Update or add study_event (text copies of course_name and topic_title so deleting course never alters history)
      const existingEventIdx = prev.studyEvents.findIndex(
        ev => ev.topic_id === topicId && ev.day_key === dayKey
      )
      let nextEvents = [...prev.studyEvents]
      if (existingEventIdx >= 0) {
        nextEvents[existingEventIdx] = {
          ...nextEvents[existingEventIdx],
          note: cleanNote,
          completed_at: nowIso,
        }
      } else {
        nextEvents.push({
          id: makeId('ev'),
          user_id: topic.user_id || 'hunter-demo-001',
          topic_id: topicId,
          course_name: course?.name || 'Course',
          topic_title: topic.title,
          completed_at: nowIso,
          day_key: dayKey,
          note: cleanNote,
        })
      }

      const next = {
        ...prev,
        courseTopics: updatedTopics,
        studyEvents: nextEvents,
      }
      persistState(next)
      return next
    })

    // Sync with routine store if daily study requirement is now met
    get().syncDailyStudyToRoutine(dayKey)
    get().triggerSyncFeedback()
    return { success: true }
  },

  /**
   * Toggle a topic done WITHOUT a note (Course Detail — counts toward course %, NOT today's 4)
   */
  toggleTopicWithoutNote: (topicId) => {
    const state = get()
    const topic = state.courseTopics.find(t => t.id === topicId)
    if (!topic) return
    const course = state.courses.find(c => c.id === topic.course_id)
    const dayKey = state.getCurrentDayKey()
    const nowIso = new Date().toISOString()

    const willComplete = !topic.completed_at

    set(prev => {
      const updatedTopics = prev.courseTopics.map(t =>
        t.id === topicId
          ? {
              ...t,
              completed_at: willComplete ? nowIso : null,
              completed_day_key: willComplete ? dayKey : null,
              note: willComplete ? '' : '',
            }
          : t
      )

      let nextEvents = [...prev.studyEvents]
      if (willComplete) {
        nextEvents.push({
          id: makeId('ev'),
          user_id: topic.user_id || 'hunter-demo-001',
          topic_id: topicId,
          course_name: course?.name || 'Course',
          topic_title: topic.title,
          completed_at: nowIso,
          day_key: dayKey,
          note: '',
        })
      } else {
        nextEvents = nextEvents.filter(ev => ev.topic_id !== topicId)
      }

      const next = {
        ...prev,
        courseTopics: updatedTopics,
        studyEvents: nextEvents,
      }
      persistState(next)
      return next
    })

    get().syncDailyStudyToRoutine(dayKey)
    get().triggerSyncFeedback()
  },

  /**
   * Edit Course: Rename (Section 3)
   */
  renameCourse: (courseId, newName) => {
    const check = courseNameSchema.safeParse(newName)
    if (!check.success) return { error: check.error.issues[0].message }
    const clean = check.data
    const state = get()
    const dup = state.courses.some(
      c => c.id !== courseId && c.status === 'active' && c.name.toLowerCase() === clean.toLowerCase()
    )
    if (dup) {
      return { error: `An active course named "${clean}" already exists.` }
    }
    set(prev => {
      const next = {
        ...prev,
        courses: prev.courses.map(c => (c.id === courseId ? { ...c, name: clean } : c)),
      }
      persistState(next)
      return next
    })
    get().triggerSyncFeedback()
    return { success: true }
  },

  /**
   * Edit Course: Add topic to unit
   */
  addTopicToUnit: (courseId, unitId, title) => {
    const check = topicTitleSchema.safeParse(title)
    if (!check.success) return { error: check.error.issues[0].message }
    const clean = check.data
    const state = get()

    const courseTopicsAll = state.courseTopics.filter(t => t.course_id === courseId)
    if (courseTopicsAll.length >= 300) {
      return { error: 'Maximum 300 topics per course reached.' }
    }

    const unitTopics = courseTopicsAll.filter(t => t.unit_id === unitId)
    if (unitTopics.length >= 60) {
      return { error: 'Maximum 60 topics per unit reached.' }
    }
    if (unitTopics.some(t => t.title.toLowerCase() === clean.toLowerCase())) {
      return { error: 'This topic already exists in this unit.' }
    }

    const maxPos = unitTopics.reduce((m, t) => Math.max(m, t.position), 0)
    const newTopic = {
      id: makeId('topic'),
      course_id: courseId,
      unit_id: unitId,
      user_id: 'hunter-demo-001',
      position: maxPos + 1,
      title: clean,
      completed_at: null,
      completed_day_key: null,
      note: '',
      uncertain: false,
    }

    set(prev => {
      const next = {
        ...prev,
        courseTopics: [...prev.courseTopics, newTopic],
      }
      persistState(next)
      return next
    })
    get().triggerSyncFeedback()
    return { topic: newTopic }
  },

  /**
   * Edit Course: Update topic title
   */
  updateTopicTitle: (topicId, newTitle) => {
    const check = topicTitleSchema.safeParse(newTitle)
    if (!check.success) return { error: check.error.issues[0].message }
    const clean = check.data
    const state = get()
    const target = state.courseTopics.find(t => t.id === topicId)
    if (!target) return { error: 'Topic not found.' }

    const dup = state.courseTopics.some(
      t => t.unit_id === target.unit_id && t.id !== topicId && t.title.toLowerCase() === clean.toLowerCase()
    )
    if (dup) return { error: 'Another topic in this unit already has this name.' }

    set(prev => {
      const next = {
        ...prev,
        courseTopics: prev.courseTopics.map(t =>
          t.id === topicId ? { ...t, title: clean, uncertain: false } : t
        ),
      }
      persistState(next)
      return next
    })
    get().triggerSyncFeedback()
    return { success: true }
  },

  /**
   * Edit Course: Reorder topic (up / down buttons)
   */
  reorderTopic: (topicId, direction) => {
    const state = get()
    const target = state.courseTopics.find(t => t.id === topicId)
    if (!target) return

    const unitTopics = state.courseTopics
      .filter(t => t.unit_id === target.unit_id)
      .sort((a, b) => a.position - b.position)

    const idx = unitTopics.findIndex(t => t.id === topicId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= unitTopics.length) return

    const neighbor = unitTopics[swapIdx]
    set(prev => {
      const next = {
        ...prev,
        courseTopics: prev.courseTopics.map(t => {
          if (t.id === target.id) return { ...t, position: neighbor.position }
          if (t.id === neighbor.id) return { ...t, position: target.position }
          return t
        }),
      }
      persistState(next)
      return next
    })
    get().triggerSyncFeedback()
  },

  /**
   * Edit Course: Remove topic (History in studyEvents is kept! Each unit must keep >= 1 topic)
   */
  removeTopic: (topicId) => {
    const state = get()
    const target = state.courseTopics.find(t => t.id === topicId)
    if (!target) return { error: 'Topic not found.' }

    const unitTopics = state.courseTopics.filter(t => t.unit_id === target.unit_id)
    if (unitTopics.length <= 1) {
      return { error: 'Each unit must keep at least 1 topic.' }
    }

    set(prev => {
      const remaining = prev.courseTopics.filter(t => t.id !== topicId)
      // Re-normalize positions in unit
      const reindexed = remaining.map(t => {
        if (t.unit_id !== target.unit_id) return t
        const sortedIds = remaining
          .filter(x => x.unit_id === target.unit_id)
          .sort((a, b) => a.position - b.position)
          .map(x => x.id)
        return { ...t, position: sortedIds.indexOf(t.id) + 1 }
      })
      const next = {
        ...prev,
        courseTopics: reindexed,
        // studyEvents is NEVER deleted when a topic is removed
      }
      persistState(next)
      return next
    })
    get().triggerSyncFeedback()
    return { success: true }
  },

  /**
   * Delete Course with 30-day limit and <10-minute grace rule (Section 3)
   */
  deleteCourse: (courseId, typedConfirmation = '') => {
    const state = get()
    const course = state.courses.find(c => c.id === courseId && c.status === 'active')
    if (!course) return { error: 'Course not found.' }

    const topics = state.courseTopics.filter(t => t.course_id === courseId)
    const completedCount = topics.filter(t => Boolean(t.completed_at)).length
    const unfinishedCount = topics.length - completedCount
    const hasProgress = completedCount > 0
    const hasUnfinished = unfinishedCount > 0

    // If course has any progress, user must type the course name to confirm
    if (hasProgress && typedConfirmation.trim() !== course.name) {
      return {
        error: `Please type "${course.name}" exactly to confirm deleting a course with progress.`,
      }
    }

    const createdMs = new Date(course.created_at).getTime()
    const ageMs = Date.now() - createdMs
    const createdLessThan10MinAgo = ageMs < 10 * 60 * 1000

    // Deletion limit: one deletion of a course with unfinished topics per 30 days (unless < 10 mins old)
    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recentCountedDeletions = state.deletionRecords.filter(
      r => r.counted_toward_limit && new Date(r.deleted_at).getTime() > thirtyDaysAgoMs
    )

    const countsTowardLimit = hasUnfinished && !createdLessThan10MinAgo
    if (countsTowardLimit && recentCountedDeletions.length >= 1) {
      return {
        error:
          'Deletion limit reached: You can only delete one course with unfinished topics every 30 days.',
      }
    }

    const nowIso = new Date().toISOString()
    set(prev => {
      const next = {
        ...prev,
        courses: prev.courses.map(c =>
          c.id === courseId ? { ...c, status: 'deleted', deleted_at: nowIso } : c
        ),
        deletionRecords: [
          ...prev.deletionRecords,
          {
            id: makeId('del'),
            course_id: courseId,
            course_name: course.name,
            deleted_at: nowIso,
            counted_toward_limit: countsTowardLimit,
          },
        ],
        // studyEvents stays intact so Status lifetime totals never change
      }
      persistState(next)
      return next
    })

    get().triggerSyncFeedback()
    return { success: true, countedTowardLimit: countsTowardLimit }
  },

  /**
   * Restore a recently deleted course (within 30 days — Section 3)
   */
  restoreCourse: (courseId) => {
    const state = get()
    const course = state.courses.find(c => c.id === courseId && c.status === 'deleted')
    if (!course) return { error: 'Deleted course not found.' }

    const deletedMs = course.deleted_at ? new Date(course.deleted_at).getTime() : 0
    if (Date.now() - deletedMs > 30 * 24 * 60 * 60 * 1000) {
      return { error: 'This course was deleted more than 30 days ago and can no longer be restored.' }
    }

    const nameCollision = state.courses.some(
      c => c.status === 'active' && c.name.toLowerCase() === course.name.toLowerCase()
    )
    if (nameCollision) {
      return { error: `An active course named "${course.name}" already exists.` }
    }

    set(prev => {
      const next = {
        ...prev,
        courses: prev.courses.map(c =>
          c.id === courseId ? { ...c, status: 'active', deleted_at: null } : c
        ),
      }
      persistState(next)
      return next
    })
    get().triggerSyncFeedback()
    return { success: true }
  },

  /**
   * Get Course Stats & Balanced Study Plan (Sections 2.1, 3, 5)
   */
  getStudyDashboardData: (customDayKey) => {
    const state = get()
    const dayKey = customDayKey || state.getCurrentDayKey()

    const activeCourses = state.courses
      .filter(c => c.status === 'active')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recentlyDeletedCourses = state.courses.filter(
      c =>
        c.status === 'deleted' &&
        c.deleted_at &&
        new Date(c.deleted_at).getTime() >= thirtyDaysAgoMs
    )

    // Course summaries
    const courseCards = activeCourses.map(course => {
      const units = state.courseUnits
        .filter(u => u.course_id === course.id)
        .sort((a, b) => a.unit_number - b.unit_number)
      const topics = state.courseTopics
        .filter(t => t.course_id === course.id)
        .sort((a, b) => {
          const uA = units.find(u => u.id === a.unit_id)?.unit_number || 0
          const uB = units.find(u => u.id === b.unit_id)?.unit_number || 0
          if (uA !== uB) return uA - uB
          return a.position - b.position
        })
      const totalTopics = topics.length
      const completedTopics = topics.filter(t => Boolean(t.completed_at)).length
      const completionPercent =
        totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
      const nextUnfinished = topics.find(t => !t.completed_at) || null

      return {
        course,
        units,
        topics,
        totalTopics,
        completedTopics,
        unfinishedTopics: totalTopics - completedTopics,
        completionPercent,
        nextUnfinished,
      }
    })

    const totalActiveTopics = courseCards.reduce((acc, c) => acc + c.totalTopics, 0)
    const totalActiveCompleted = courseCards.reduce((acc, c) => acc + c.completedTopics, 0)
    const totalUnfinished = totalActiveTopics - totalActiveCompleted
    const overallCoursePercent =
      totalActiveTopics > 0 ? Math.round((totalActiveCompleted / totalActiveTopics) * 100) : 0

    // Topics counted toward today's 4 (completed on dayKey AND note >= 10 chars)
    const activeCourseIds = new Set(activeCourses.map(c => c.id))
    const topicsCountedToday = state.courseTopics.filter(
      t =>
        activeCourseIds.has(t.course_id) &&
        t.completed_day_key === dayKey &&
        t.completed_at &&
        (t.note || '').trim().length >= 10
    )

    // Measure unfinished topics at the start of the day (Section 2.1)
    const unfinishedAtStartOfDay = totalUnfinished + topicsCountedToday.length
    const requiredToday =
      activeCourses.length === 0
        ? 4
        : unfinishedAtStartOfDay === 0
        ? 0
        : Math.min(4, unfinishedAtStartOfDay)

    // Study % today calculation (Section 2.1)
    let studyPercentToday = 0
    let isStudyCompleteToday = false
    if (activeCourses.length === 0) {
      studyPercentToday = 0
      isStudyCompleteToday = false
    } else if (totalUnfinished === 0 && totalActiveTopics > 0) {
      // All active courses complete -> Study is 100%
      studyPercentToday = 100
      isStudyCompleteToday = true
    } else if (requiredToday > 0) {
      const countedCapped = Math.min(topicsCountedToday.length, requiredToday)
      studyPercentToday = Math.round((countedCapped / requiredToday) * 100)
      isStudyCompleteToday = countedCapped >= requiredToday
    }

    // Balanced rotation for Today's 4 topics (Section 5)
    // Start with topics already counted today (up to 4) so completed checkboxes stay visible in Today's 4
    const plannedToday = topicsCountedToday.slice(0, 4).map(t => {
      const cCard = courseCards.find(c => c.course.id === t.course_id)
      const unit = cCard?.units.find(u => u.id === t.unit_id)
      return {
        ...t,
        courseName: cCard?.course.name || 'Course',
        unitNumber: unit?.unit_number || 1,
        unitName: unit?.name || 'Unit 1',
        countedToday: true,
      }
    })

    const pickedIds = new Set(plannedToday.map(t => t.id))
    const virtualCompletedCounts = new Map(
      courseCards.map(c => [c.course.id, c.completedTopics])
    )

    const slotsRemaining = Math.max(0, 4 - plannedToday.length)
    for (let slot = 0; slot < slotsRemaining; slot++) {
      // Pick active course with lowest completion %; ties go to course added first
      let bestCard = null
      let bestPct = Infinity

      for (const cCard of courseCards) {
        const nextTopic = cCard.topics.find(t => !t.completed_at && !pickedIds.has(t.id))
        if (!nextTopic) continue
        const vDone = virtualCompletedCounts.get(cCard.course.id) || 0
        const pct = cCard.totalTopics > 0 ? (vDone / cCard.totalTopics) * 100 : 100
        if (pct < bestPct) {
          bestPct = pct
          bestCard = { cCard, nextTopic }
        }
      }

      if (!bestCard) break
      const { cCard, nextTopic } = bestCard
      pickedIds.add(nextTopic.id)
      virtualCompletedCounts.set(
        cCard.course.id,
        (virtualCompletedCounts.get(cCard.course.id) || 0) + 1
      )
      const unit = cCard.units.find(u => u.id === nextTopic.unit_id)
      plannedToday.push({
        ...nextTopic,
        courseName: cCard.course.name,
        unitNumber: unit?.unit_number || 1,
        unitName: unit?.name || 'Unit 1',
        countedToday: false,
      })
    }

    // Projected finish date = today + ceil(unfinishedTopics / 4) days
    const daysNeeded = Math.ceil(totalUnfinished / 4)
    const logicalTodayDate = getLogicalDate(state.settings?.dayEndTime || '04:00')
    const projectedFinishDate =
      totalUnfinished > 0 ? format(addDays(logicalTodayDate, daysNeeded), 'EEE, MMM d, yyyy') : 'All complete'

    return {
      activeCourses,
      recentlyDeletedCourses,
      courseCards,
      totalActiveTopics,
      totalActiveCompleted,
      totalUnfinished,
      overallCoursePercent,
      topicsCountedToday,
      countedTodayCount: Math.min(topicsCountedToday.length, 4),
      rawCountedTodayCount: topicsCountedToday.length,
      requiredToday,
      studyPercentToday,
      isStudyCompleteToday,
      plannedToday,
      projectedFinishDate,
      daysNeeded,
    }
  },

  /**
   * Sync Daily Study core quest status to questism_routine_data
   */
  syncDailyStudyToRoutine: (dayKey) => {
    try {
      const dash = get().getStudyDashboardData(dayKey)
      const raw = localStorage.getItem(ROUTINE_STORAGE_KEY)
      const routineData = raw ? JSON.parse(raw) : { completed: {}, custom: {}, tomorrow: {} }
      if (!routineData.completed) routineData.completed = {}
      if (!routineData.completed[dayKey]) routineData.completed[dayKey] = {}
      routineData.completed[dayKey]['study-daily-4'] = dash.isStudyCompleteToday
      localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(routineData))
    } catch {}
  },

  /**
   * Calculate Status Metrics for Today, 7-Day Average, Arc Level, and Lifetime Totals (Section 2.2)
   * Status uses ONLY BODY, CARE, and STUDY. Routine, streak, accepted quests, and rest days never feed Status.
   */
  getStatusMetrics: () => {
    const state = get()
    const dayEndTime = state.settings?.dayEndTime || '04:00'
    const logicalToday = getLogicalDate(dayEndTime)
    const todayKey = formatLogicalDateISO(logicalToday)

    let bodyData = null
    let careData = null
    try {
      bodyData = JSON.parse(localStorage.getItem(BODY_STORAGE_KEY) || 'null')
    } catch {}
    try {
      careData = JSON.parse(localStorage.getItem(CARE_STORAGE_KEY) || 'null')
    } catch {}

    // Helper: compute BODY %, CARE %, STUDY % for any dayKey
    const computeDayPercentages = (dayKey, isToday = false) => {
      const isRestDay = Boolean(state.dailyMeta?.[dayKey]?.isRestDay)

      // 1. BODY % (9 items: pushups, pullups, squats, run, neck rotation, neck up-and-down, and 3 stretches)
      let bodyDue = 0
      let bodyDone = 0
      if (!isRestDay) {
        const pullupsInactive =
          bodyData?.baselines && Number(bodyData.baselines.pullups) === 0
        const cleared = bodyData?.cleared?.[dayKey] || {}
        const logs = bodyData?.logs?.[dayKey] || {}
        const run = bodyData?.runs?.[dayKey] || {}
        const careDay = careData?.[dayKey] || {}

        // Push-ups
        bodyDue++
        if (cleared.pushups || Number(logs.pushups) > 0) bodyDone++

        // Squats
        bodyDue++
        if (cleared.squats || Number(logs.squats) > 0) bodyDone++

        // Pull-ups (only due if baseline !== 0)
        if (!pullupsInactive) {
          bodyDue++
          if (cleared.pullups || Number(logs.pullups) > 0) bodyDone++
        }

        // Run
        bodyDue++
        if (run.completed || Number(run.distance) >= Number(run.targetDistance || 10)) bodyDone++

        // Neck rotation (left + right rotation or unified neck-rotation)
        bodyDue++
        if (careDay['neck-rotation'] || (careDay['neck-rotation-l'] && careDay['neck-rotation-r'])) {
          bodyDone++
        }

        // Neck up-and-down (chin-to-chest + extension or unified neck-up-down)
        bodyDue++
        if (careDay['neck-up-down'] || (careDay['neck-forward'] && careDay['neck-extension'])) {
          bodyDone++
        }

        // 3 Stretches: Lateral Neck Tilt, Shoulder Rolls, Chest Door Stretch
        bodyDue += 3
        if (careDay['stretch-lateral'] || (careDay['neck-left'] && careDay['neck-right'])) bodyDone++
        if (careDay['shoulder-rolls']) bodyDone++
        if (careDay['chest-stretch']) bodyDone++
      }

      const bodyPct = bodyDue > 0 ? Math.round((bodyDone / bodyDue) * 100) : null

      // 2. CARE % (skin morning, skin night, and any hair steps scheduled for that day)
      const careDay = careData?.[dayKey] || {}
      const amDone =
        Boolean(careDay['skin-am-complete']) ||
        ['cleanser-am', 'toner-am', 'moisturizer-am', 'sunscreen-am'].every(id => careDay[id])
      const pmDone =
        Boolean(careDay['skin-pm-complete']) ||
        ['cleanser-pm', 'cleanser2-pm', 'treatment-pm', 'moisturizer-pm'].every(id => careDay[id])

      // Hair care scheduled on Mon (1), Wed (3), Fri (5), Sun (0) or custom scheduled steps
      const dayOfWeek = new Date(dayKey + 'T12:00:00').getDay()
      const hairScheduled = careDay.hairScheduled !== undefined
        ? Boolean(careDay.hairScheduled)
        : [0, 1, 3, 5].includes(dayOfWeek)
      const hairDone = Boolean(careDay['hair-care-step'] || careDay['hair-oil-wash'])

      let careDue = 2 + (hairScheduled ? 1 : 0)
      let careDone = (amDone ? 1 : 0) + (pmDone ? 1 : 0) + (hairScheduled && hairDone ? 1 : 0)
      const carePct = careDue > 0 ? Math.round((careDone / careDue) * 100) : 0

      // 3. STUDY %
      let studyPct = 0
      if (isToday) {
        studyPct = state.getStudyDashboardData(dayKey).studyPercentToday
      } else {
        const eventsOnDay = state.studyEvents.filter(
          ev => ev.day_key === dayKey && (ev.note || '').trim().length >= 10
        )
        const meta = state.dailyMeta?.[dayKey]
        const req = meta?.startOfDayUnfinished !== undefined
          ? Math.min(4, Math.max(1, meta.startOfDayUnfinished))
          : 4
        studyPct = Math.min(100, Math.round((Math.min(eventsOnDay.length, req) / req) * 100))
      }

      return {
        dayKey,
        isRestDay,
        bodyPct, // null when rest day (not due)
        bodyDone,
        bodyDue,
        carePct,
        careDone,
        careDue,
        studyPct,
      }
    }

    const todayMetrics = computeDayPercentages(todayKey, true)

    // 7-day rolling window (today + previous 6 days)
    const last7Days = []
    for (let i = 0; i < 7; i++) {
      const dKey = format(subDays(logicalToday, i), 'yyyy-MM-dd')
      last7Days.push(computeDayPercentages(dKey, i === 0))
    }

    const bodyDueDays = last7Days.filter(d => d.bodyPct !== null)
    const body7DayAvg =
      bodyDueDays.length > 0
        ? Math.round(bodyDueDays.reduce((s, d) => s + d.bodyPct, 0) / bodyDueDays.length)
        : 0
    const care7DayAvg = Math.round(
      last7Days.reduce((s, d) => s + d.carePct, 0) / last7Days.length
    )
    const study7DayAvg = Math.round(
      last7Days.reduce((s, d) => s + d.studyPct, 0) / last7Days.length
    )

    // Arc Level: +1 for every 10 days where BODY, CARE and STUDY are all 100%.
    // On a rest day, BODY is not due, so the day counts when CARE and STUDY are 100%.
    // Arc level never resets.
    const allKnownDayKeys = new Set([
      todayKey,
      ...Object.keys(state.dailyMeta || {}),
      ...Object.keys(bodyData?.logs || {}),
      ...Object.keys(careData || {}),
      ...state.studyEvents.map(e => e.day_key),
    ])

    let perfectDaysCount = 0
    for (const dKey of allKnownDayKeys) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dKey)) continue
      const m = dKey === todayKey ? todayMetrics : computeDayPercentages(dKey, false)
      const bodyOk = m.isRestDay ? true : m.bodyPct === 100
      const careOk = m.carePct === 100
      const studyOk = m.studyPct === 100
      if (bodyOk && careOk && studyOk) {
        perfectDaysCount++
      }
    }

    const computedArc = Math.floor(perfectDaysCount / 10)
    const arcLevel = Math.max(state.highestArcLevel || 0, computedArc)
    if (arcLevel > (state.highestArcLevel || 0)) {
      set({ highestArcLevel: arcLevel })
      persistState({ ...state, highestArcLevel: arcLevel })
    }

    // Lifetime Totals: push-ups, pull-ups, squats, km run, care days completed, topics completed
    let totalPushups = 0
    let totalPullups = 0
    let totalSquats = 0
    let totalKmRun = 0

    if (bodyData?.logs) {
      for (const log of Object.values(bodyData.logs)) {
        totalPushups += Number(log?.pushups || 0)
        totalPullups += Number(log?.pullups || 0)
        totalSquats += Number(log?.squats || 0)
      }
    }
    if (bodyData?.runs) {
      for (const r of Object.values(bodyData.runs)) {
        totalKmRun += Number(r?.distance || 0)
      }
    }
    totalKmRun = Number(totalKmRun.toFixed(1))

    let careDaysCompleted = 0
    if (careData) {
      for (const [dKey, cDay] of Object.entries(careData)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dKey) || !cDay) continue
        const m = computeDayPercentages(dKey, dKey === todayKey)
        if (m.carePct === 100) careDaysCompleted++
      }
    }

    // Topics completed: union of studyEvents and completed courseTopics so deleting a course NEVER reduces lifetime total!
    const completedTopicKeys = new Set()
    state.studyEvents.forEach(ev => {
      completedTopicKeys.add(ev.topic_id || `${ev.course_name}:${ev.topic_title}`)
    })
    state.courseTopics.forEach(t => {
      if (t.completed_at) {
        completedTopicKeys.add(t.id)
      }
    })
    const lifetimeTopicsCompleted = completedTopicKeys.size

    return {
      today: todayMetrics,
      averages7Day: {
        body: body7DayAvg,
        care: care7DayAvg,
        study: study7DayAvg,
      },
      arcLevel,
      perfectDaysCount,
      daysToNextArc: 10 - (perfectDaysCount % 10),
      lifetimeTotals: {
        pushups: totalPushups,
        pullups: totalPullups,
        squats: totalSquats,
        kmRun: totalKmRun,
        careDaysCompleted,
        topicsCompleted: lifetimeTopicsCompleted,
      },
    }
  },

  /**
   * Delete Account & Purge All Local + Server Data (Security S6)
   */
  purgeAllAccountData: async (userId = 'hunter-demo-001') => {
    try {
      await fetch(`/api/account/purge?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      })
    } catch {}

    const keysToRemove = [
      STORAGE_KEY,
      BODY_STORAGE_KEY,
      CARE_STORAGE_KEY,
      ROUTINE_STORAGE_KEY,
      'questism_study_data',
      'questism_timetable',
      'questism_tts_cache_v1',
    ]
    keysToRemove.forEach(k => localStorage.removeItem(k))
    const fresh = getDefaultState()
    set(fresh)
  },
}))
