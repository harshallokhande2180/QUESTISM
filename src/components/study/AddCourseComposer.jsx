import { useState, useRef, useEffect } from 'react'
import { useCourseStore } from '../../stores/courseStore'
import {
  courseNameSchema,
  unitCountSchema,
  getOrdinalLabel,
  parseUnitTopicsInput,
  parseSpokenNumber,
  verifyFileSignature,
  aiCourseDraftSchema,
} from '../../lib/schemas'
import {
  VOICE_STATES,
  createInitialVoiceState,
  transitionVoiceMachine,
  SYLLABUS_TEST_SET,
} from '../../lib/voiceMachine'
import {
  createSpeechAdapter,
  speakPromptText,
  resizeImageFileIfNeeded,
} from '../../lib/speechAdapters'

export default function AddCourseComposer({ isOpen, onClose, onSaved }) {
  const {
    courses,
    addCourse,
    settings,
    updateSettings,
    getCurrentDayKey,
  } = useCourseStore()

  const activeCourses = courses.filter(c => c.status === 'active')
  const activeCourseNames = activeCourses.map(c => c.name)

  // Input mode: 'typing' | 'guided_voice' | 'dictate_voice' | 'review'
  const [mode, setMode] = useState('typing')
  const [micMode, setMicMode] = useState('guided') // 'guided' | 'dictate'
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [showMicDropdown, setShowMicDropdown] = useState(false)
  const [showSyllabusPresets, setShowSyllabusPresets] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [pendingVoiceAction, setPendingVoiceAction] = useState(null)

  // Guided Typing state
  const [typingStep, setTypingStep] = useState('course_name') // 'course_name' | 'total_units' | 'unit_topics'
  const [draftName, setDraftName] = useState('')
  const [draftTotalUnits, setDraftTotalUnits] = useState(0)
  const [currentUnitIdx, setCurrentUnitIdx] = useState(0) // 0-indexed
  const [draftUnits, setDraftUnits] = useState([]) // [{ unitNumber, name, topics: [{ title, uncertain }] }]
  const [draftNotes, setDraftNotes] = useState([])
  const [editingBubbleStep, setEditingBubbleStep] = useState(null)

  // Conversation messages [{ id, role: 'system' | 'user' | 'notice' | 'error', text, editRef }]
  const [messages, setMessages] = useState([
    { id: 'init-1', role: 'system', text: 'Enter a course:' },
  ])
  const [inputText, setInputText] = useState('')
  const [isProcessingFile, setIsProcessingFile] = useState(false)

  // Guided Voice state machine
  const [voiceState, setVoiceState] = useState(() => createInitialVoiceState(activeCourseNames))
  const [isListening, setIsListening] = useState(false)
  const speechAdapterRef = useRef(null)

  // Review screen inline error
  const [reviewError, setReviewError] = useState('')
  const [newTopicInputs, setNewTopicInputs] = useState({})

  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, voiceState.messages, mode])

  useEffect(() => {
    return () => {
      speechAdapterRef.current?.stop()
    }
  }, [])

  if (!isOpen) return null

  const pushMessages = (...newMsgs) => {
    setMessages(prev => [
      ...prev,
      ...newMsgs.map((m, i) => ({ id: `msg-${Date.now()}-${i}-${Math.random()}`, ...m })),
    ])
  }

  // ── Guided Typing Handler (Section 4.1) ─────────────────────────────────────
  const handleTypingSubmit = () => {
    const raw = inputText.trim()
    if (!raw) return

    // If user is in Guided Voice mode and types into the box, feed the voice machine!
    if (mode === 'guided_voice') {
      setInputText('')
      handleVoiceInputEvent({
        type: 'SPEECH_INPUT',
        transcript: raw,
        confidence: 1.0,
        fromTyping: true,
      })
      return
    }

    // If user is in Dictate mode and submits text/transcript, send to dictate parser
    if (mode === 'dictate_voice') {
      setInputText('')
      handleDictateTranscriptSubmit(raw)
      return
    }

    // Editing a previously tapped bubble
    if (editingBubbleStep) {
      handleEditBubbleSubmit(raw)
      return
    }

    if (typingStep === 'course_name') {
      pushMessages({ role: 'user', text: raw, editTarget: { type: 'course_name', value: raw } })
      const check = courseNameSchema.safeParse(raw)
      if (!check.success) {
        pushMessages({ role: 'error', text: check.error.issues[0].message }, { role: 'system', text: 'Enter a course:' })
        setInputText('')
        return
      }
      const cleanName = check.data
      const isDup = activeCourseNames.some(n => n.toLowerCase() === cleanName.toLowerCase())
      if (isDup) {
        pushMessages(
          { role: 'error', text: `An active course named "${cleanName}" already exists.` },
          { role: 'system', text: 'Enter a course:' }
        )
        setInputText('')
        return
      }

      setDraftName(cleanName)
      setTypingStep('total_units')
      setInputText('')
      pushMessages({ role: 'system', text: 'Enter total units:' })
      return
    }

    if (typingStep === 'total_units') {
      pushMessages({ role: 'user', text: raw, editTarget: { type: 'total_units', value: raw } })
      const parsedNum = parseSpokenNumber(raw)
      const check = unitCountSchema.safeParse(parsedNum)
      if (!check.success || parsedNum === null) {
        pushMessages(
          { role: 'error', text: 'Enter a whole number from 1 to 10.' },
          { role: 'system', text: 'Enter total units:' }
        )
        setInputText('')
        return
      }

      setDraftTotalUnits(parsedNum)
      setCurrentUnitIdx(0)
      setDraftUnits(
        Array.from({ length: parsedNum }, (_, i) => ({
          unitNumber: i + 1,
          name: `Unit ${i + 1}`,
          topics: [],
        }))
      )
      setTypingStep('unit_topics')
      setInputText('')
      pushMessages({ role: 'system', text: `Enter ${getOrdinalLabel(1)} unit topics:` })
      return
    }

    if (typingStep === 'unit_topics') {
      const unitNo = currentUnitIdx + 1
      pushMessages({
        role: 'user',
        text: raw,
        editTarget: { type: 'unit_topics', unitIndex: currentUnitIdx, value: raw },
      })

      const { topics, duplicatesRemoved, errors } = parseUnitTopicsInput(raw)
      if (errors.length > 0 || topics.length === 0) {
        pushMessages(
          { role: 'error', text: errors[0] || 'Each unit needs at least one topic.' },
          { role: 'system', text: `Enter ${getOrdinalLabel(unitNo)} unit topics:` }
        )
        setInputText('')
        return
      }

      const existingCount = draftUnits.reduce(
        (acc, u, idx) => acc + (idx === currentUnitIdx ? 0 : u.topics.length),
        0
      )
      if (existingCount + topics.length > 300) {
        pushMessages(
          {
            role: 'error',
            text: `Maximum 300 topics per course. You have ${existingCount} topics so far.`,
          },
          { role: 'system', text: `Enter ${getOrdinalLabel(unitNo)} unit topics:` }
        )
        setInputText('')
        return
      }

      const nextUnits = draftUnits.map((u, idx) =>
        idx === currentUnitIdx
          ? { ...u, topics: topics.map(t => ({ title: t, uncertain: false })) }
          : u
      )
      setDraftUnits(nextUnits)
      setInputText('')

      const followUps = []
      if (duplicatesRemoved.length > 0) {
        followUps.push({
          role: 'notice',
          text: `Removed ${duplicatesRemoved.length} duplicate topic(s) within Unit ${unitNo}: ${duplicatesRemoved.join(', ')}`,
        })
      }

      const nextIdx = currentUnitIdx + 1
      if (nextIdx < draftTotalUnits) {
        setCurrentUnitIdx(nextIdx)
        followUps.push({
          role: 'system',
          text: `Enter ${getOrdinalLabel(nextIdx + 1)} unit topics:`,
        })
        pushMessages(...followUps)
      } else {
        pushMessages(...followUps)
        setMode('review')
      }
    }
  }

  // ── Tapping a User Bubble Edits It (Section 4) ──────────────────────────────
  const handleBubbleTap = (editTarget) => {
    if (!editTarget) return
    setEditingBubbleStep(editTarget)
    setInputText(editTarget.value || '')
    textareaRef.current?.focus()
  }

  const handleEditBubbleSubmit = (raw) => {
    if (editingBubbleStep.type === 'course_name') {
      const check = courseNameSchema.safeParse(raw)
      if (!check.success) {
        pushMessages({ role: 'error', text: check.error.issues[0].message })
        return
      }
      const isDup = activeCourseNames.some(n => n.toLowerCase() === check.data.toLowerCase())
      if (isDup) {
        pushMessages({ role: 'error', text: `An active course named "${check.data}" already exists.` })
        return
      }
      setDraftName(check.data)
      pushMessages({
        role: 'user',
        text: `${check.data} (edited)`,
        editTarget: { type: 'course_name', value: check.data },
      })
      setEditingBubbleStep(null)
      setInputText('')
      return
    }

    if (editingBubbleStep.type === 'total_units') {
      const parsedNum = parseSpokenNumber(raw)
      const check = unitCountSchema.safeParse(parsedNum)
      if (!check.success || parsedNum === null) {
        pushMessages({ role: 'error', text: 'Enter a whole number from 1 to 10.' })
        return
      }
      setDraftTotalUnits(parsedNum)
      setDraftUnits(prev => {
        const next = Array.from({ length: parsedNum }, (_, i) =>
          prev[i] || { unitNumber: i + 1, name: `Unit ${i + 1}`, topics: [] }
        )
        return next
      })
      pushMessages({
        role: 'user',
        text: `${parsedNum} (edited)`,
        editTarget: { type: 'total_units', value: String(parsedNum) },
      })
      setEditingBubbleStep(null)
      setInputText('')
      return
    }

    if (editingBubbleStep.type === 'unit_topics') {
      const uIdx = editingBubbleStep.unitIndex
      const { topics, duplicatesRemoved, errors } = parseUnitTopicsInput(raw)
      if (errors.length > 0 || topics.length === 0) {
        pushMessages({ role: 'error', text: errors[0] || 'Each unit needs at least one topic.' })
        return
      }
      setDraftUnits(prev =>
        prev.map((u, i) =>
          i === uIdx ? { ...u, topics: topics.map(t => ({ title: t, uncertain: false })) } : u
        )
      )
      if (duplicatesRemoved.length > 0) {
        pushMessages({
          role: 'notice',
          text: `Removed duplicate(s) in Unit ${uIdx + 1}: ${duplicatesRemoved.join(', ')}`,
        })
      }
      pushMessages({
        role: 'user',
        text: `${topics.join(', ')} (edited Unit ${uIdx + 1})`,
        editTarget: { type: 'unit_topics', unitIndex: uIdx, value: topics.join('\n') },
      })
      setEditingBubbleStep(null)
      setInputText('')
    }
  }

  // ── "Back" Button Handler (Section 4) ───────────────────────────────────────
  const handleBackStep = () => {
    if (mode === 'review') {
      if (draftTotalUnits > 0) {
        setMode('typing')
        setTypingStep('unit_topics')
        setCurrentUnitIdx(Math.max(0, draftUnits.length - 1))
        pushMessages({
          role: 'system',
          text: `Enter ${getOrdinalLabel(Math.max(1, draftUnits.length))} unit topics:`,
        })
      } else {
        setMode('typing')
      }
      return
    }

    if (mode === 'guided_voice') {
      handleVoiceInputEvent({ type: 'SPEECH_INPUT', transcript: 'go back', confidence: 1.0, fromTyping: true })
      return
    }

    if (typingStep === 'unit_topics') {
      if (currentUnitIdx > 0) {
        const prevIdx = currentUnitIdx - 1
        setCurrentUnitIdx(prevIdx)
        pushMessages({ role: 'system', text: `Enter ${getOrdinalLabel(prevIdx + 1)} unit topics:` })
      } else {
        setTypingStep('total_units')
        pushMessages({ role: 'system', text: 'Enter total units:' })
      }
      return
    }

    if (typingStep === 'total_units') {
      setTypingStep('course_name')
      pushMessages({ role: 'system', text: 'Enter a course:' })
    }
  }

  // ── File or Image Upload Handler (Section 4.2) ──────────────────────────────
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setShowPlusMenu(false)
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      pushMessages({ role: 'error', text: 'File exceeds the 10 MB maximum size limit.' })
      return
    }

    setIsProcessingFile(true)
    pushMessages({ role: 'user', text: `Uploaded: ${file.name}` })

    try {
      const arrayBuf = await file.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuf)

      // Client-side magic byte verification first (also verified on server!)
      const sig = verifyFileSignature(uint8)
      if (!sig.valid) {
        // Send to server anyway if testing .exe rejection so server logs & rejects too
        const base64Raw = arrayBufferToBase64(arrayBuf)
        const res = await fetch('/api/ai/parse-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayKey: getCurrentDayKey(),
            fileName: file.name,
            base64Data: base64Raw,
          }),
        })
        const errData = await res.json()
        pushMessages({
          role: 'error',
          text: errData.error || sig.reason,
        })
        setIsProcessingFile(false)
        return
      }

      // Resize image to max 2000px on longest side before sending (Section 6)
      const processedFile = await resizeImageFileIfNeeded(file, 2000)
      const finalBuf = await processedFile.arrayBuffer()
      const base64Data = arrayBufferToBase64(finalBuf)

      const res = await fetch('/api/ai/parse-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayKey: getCurrentDayKey(),
          fileName: file.name,
          base64Data,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        pushMessages({ role: 'error', text: data.error || 'Failed to read syllabus file.' })
        setIsProcessingFile(false)
        return
      }

      applyAiDraftResult(data.draft)
    } catch (err) {
      pushMessages({ role: 'error', text: err.message || 'Error processing file.' })
    } finally {
      setIsProcessingFile(false)
    }
  }

  // ── Syllabus Test Preset Loader (Phase B — 5 Syllabus Images) ───────────────
  const handleRunSyllabusPreset = async (preset) => {
    setShowSyllabusPresets(false)
    setShowPlusMenu(false)
    setIsProcessingFile(true)
    pushMessages({ role: 'user', text: `Syllabus Scan: ${preset.label}` })

    try {
      // Valid PNG magic header bytes + payload
      const pngMagic = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52])
      const base64Data = arrayBufferToBase64(pngMagic.buffer)

      const res = await fetch('/api/ai/parse-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayKey: getCurrentDayKey(),
          fileName: preset.fileName,
          base64Data,
          extractedTextHint: preset.extractedTextHint,
          qualityHint: preset.qualityHint,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        pushMessages({ role: 'error', text: data.error || 'Failed to process syllabus.' })
        setIsProcessingFile(false)
        return
      }
      applyAiDraftResult(data.draft)
    } catch (err) {
      pushMessages({ role: 'error', text: err.message || 'Syllabus test failed.' })
    } finally {
      setIsProcessingFile(false)
    }
  }

  const applyAiDraftResult = (rawDraft) => {
    const parsed = aiCourseDraftSchema.safeParse(rawDraft)
    if (!parsed.success) {
      pushMessages({ role: 'error', text: 'AI output did not pass schema validation. Switched to typing.' })
      setMode('typing')
      return
    }
    const draft = parsed.data
    if (draft.status === 'NO_COURSE_FOUND' || !draft.units || draft.units.length === 0) {
      pushMessages(
        { role: 'notice', text: 'NO_COURSE_FOUND: No course syllabus was detected in the file. Switched to guided typing.' },
        { role: 'system', text: 'Enter a course:' }
      )
      setMode('typing')
      setTypingStep('course_name')
      return
    }

    setDraftName(draft.courseName || 'Untitled Course')
    setDraftTotalUnits(draft.units.length)
    setDraftUnits(
      draft.units.map((u, idx) => ({
        unitNumber: idx + 1,
        name: u.name || `Unit ${idx + 1}`,
        topics: u.topics.map(t => ({
          title: t.title,
          uncertain: Boolean(t.uncertain),
        })),
      }))
    )
    setDraftNotes(draft.notes || [])
    setMode('review')
  }

  // ── Voice Mode & Consent (Sections 4.3, 4.4 & Security S4) ──────────────────
  const initiateVoiceMode = (targetMicMode = micMode) => {
    if (!settings.voiceEnabled) {
      pushMessages({
        role: 'error',
        text: 'Voice input is turned OFF in Settings. Enable Voice in Settings or type your course below.',
      })
      return
    }
    if (!settings.micConsentGranted) {
      setPendingVoiceAction(targetMicMode)
      setShowConsentModal(true)
      return
    }
    startVoiceFlow(targetMicMode)
  }

  const startVoiceFlow = (targetMicMode) => {
    if (targetMicMode === 'dictate') {
      setMode('dictate_voice')
      pushMessages({
        role: 'system',
        text: 'Dictate the whole course (say course name, units, and topics). Tap Listen or type/paste your transcript below:',
      })
      speakPromptText('Speak the whole course name, units, and topics.', {
        voiceEnabled: settings.voiceEnabled,
        useNeuralVoice: settings.useNeuralVoice,
      })
      startMicrophoneCapture('dictate')
      return
    }

    // Guided Voice (default)
    const initial = createInitialVoiceState(activeCourseNames)
    setVoiceState(initial)
    setMode('guided_voice')
    speakPromptText(initial.spokenPrompt, {
      voiceEnabled: settings.voiceEnabled,
      useNeuralVoice: settings.useNeuralVoice,
    })
    startMicrophoneCapture('guided')
  }

  const startMicrophoneCapture = (captureMode = 'guided') => {
    speechAdapterRef.current?.stop()
    setIsListening(true)

    const adapter = createSpeechAdapter({
      hintWords: activeCourseNames,
      userId: 'hunter-demo-001',
      dayKey: getCurrentDayKey(),
      silenceMs: 6000,
      onResult: ({ transcript, confidence }) => {
        setIsListening(false)
        if (captureMode === 'dictate') {
          handleDictateTranscriptSubmit(transcript)
        } else {
          handleVoiceInputEvent({
            type: 'SPEECH_INPUT',
            transcript,
            confidence,
            fromTyping: false,
          })
        }
      },
      onSilenceTimeout: () => {
        setIsListening(false)
        if (captureMode === 'guided') {
          handleVoiceInputEvent({ type: 'SILENCE_TIMEOUT' })
        }
      },
      onError: () => {
        setIsListening(false)
        if (captureMode === 'guided') {
          handleVoiceInputEvent({
            type: 'SPEECH_INPUT',
            transcript: '',
            confidence: 0,
            fromTyping: false,
          })
        }
      },
    })

    speechAdapterRef.current = adapter
    adapter.start()
  }

  const handleVoiceInputEvent = (event) => {
    setVoiceState(prev => {
      const next = transitionVoiceMachine(prev, event)
      if (next.spokenPrompt && next.spokenPrompt !== prev.spokenPrompt) {
        speakPromptText(next.spokenPrompt, {
          voiceEnabled: settings.voiceEnabled,
          useNeuralVoice: settings.useNeuralVoice,
        })
      }
      if (next.state === VOICE_STATES.REVIEW_READY) {
        setDraftName(next.courseName)
        setDraftTotalUnits(next.totalUnits)
        setDraftUnits(next.units)
        setDraftNotes([])
        setTimeout(() => setMode('review'), 150)
      }
      if (next.state === VOICE_STATES.STOPPED) {
        setTimeout(() => setMode('typing'), 150)
      }
      return next
    })
  }

  const handleDictateTranscriptSubmit = async (transcript) => {
    if (!transcript || !transcript.trim()) {
      pushMessages({ role: 'error', text: "I didn't catch that. Please dictate or type your course." })
      return
    }
    pushMessages({ role: 'user', text: transcript })
    setIsProcessingFile(true)
    try {
      const res = await fetch('/api/ai/parse-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayKey: getCurrentDayKey(),
          transcript,
          durationSeconds: 12,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        pushMessages({ role: 'error', text: data.error || 'Failed to parse dictated course.' })
        return
      }
      applyAiDraftResult(data.draft)
    } catch (err) {
      pushMessages({ role: 'error', text: err.message })
    } finally {
      setIsProcessingFile(false)
    }
  }

  // ── Review Screen Mutators & Final Save (Section 4.1 Step 4) ────────────────
  const handleReviewTopicChange = (uIdx, tIdx, newTitle) => {
    setDraftUnits(prev =>
      prev.map((u, i) =>
        i === uIdx
          ? {
              ...u,
              topics: u.topics.map((t, j) =>
                j === tIdx ? { ...t, title: newTitle, uncertain: false } : t
              ),
            }
          : u
      )
    )
  }

  const handleReviewRemoveTopic = (uIdx, tIdx) => {
    setDraftUnits(prev =>
      prev.map((u, i) => {
        if (i !== uIdx) return u
        if (u.topics.length <= 1) return u
        return { ...u, topics: u.topics.filter((_, j) => j !== tIdx) }
      })
    )
  }

  const handleReviewAddTopic = (uIdx) => {
    const raw = (newTopicInputs[uIdx] || '').trim()
    if (raw.length < 2) return
    setDraftUnits(prev =>
      prev.map((u, i) =>
        i === uIdx
          ? { ...u, topics: [...u.topics, { title: raw.slice(0, 120), uncertain: false }] }
          : u
      )
    )
    setNewTopicInputs(prev => ({ ...prev, [uIdx]: '' }))
  }

  const handleSaveCourseFromReview = () => {
    setReviewError('')
    const res = addCourse({
      name: draftName,
      units: draftUnits,
    })
    if (res.error) {
      setReviewError(res.error)
      return
    }
    onSaved?.(res.course)
    onClose?.()
  }

  const activeMessages = mode === 'guided_voice' ? voiceState.messages : messages

  return (
    <div className="composer-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add New Course Composer">
      <div className="composer-sheet glass-panel-strong">
        {/* Header */}
        <div className="composer-sheet__header">
          <div className="composer-sheet__header-left">
            <button
              type="button"
              className="btn btn-outline composer-back-btn"
              onClick={handleBackStep}
              id="btn-composer-back"
            >
              ← Back
            </button>
            <span className="hud-label">
              {mode === 'review'
                ? 'Review Course Draft'
                : mode === 'guided_voice'
                ? 'Guided Voice Composer'
                : mode === 'dictate_voice'
                ? 'Dictate Course'
                : 'Add New Course'}
            </span>
          </div>

          <div className="composer-sheet__header-right">
            {isListening && (
              <span className="composer-listening-pill" aria-live="polite">
                ● Listening…
              </span>
            )}
            <button
              type="button"
              className="composer-close-btn"
              onClick={onClose}
              aria-label="Close composer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Review Step (Section 4.1 Step 4 — Nothing saves until Save course is clicked) */}
        {mode === 'review' ? (
          <div className="composer-review">
            {draftNotes.length > 0 && (
              <div className="system-banner system-banner--warning" style={{ marginBottom: 12 }}>
                <span>⚠</span>
                <div>
                  {draftNotes.map((n, i) => (
                    <div key={i}>{n}</div>
                  ))}
                </div>
              </div>
            )}

            {reviewError && (
              <div className="system-banner system-banner--error" style={{ marginBottom: 12 }}>
                <span>✗</span>
                <span>{reviewError}</span>
              </div>
            )}

            <div className="composer-review__field">
              <label className="auth-field__label" htmlFor="review-course-name">
                COURSE NAME (2–60 CHARS)
              </label>
              <input
                id="review-course-name"
                type="text"
                className="input-field"
                value={draftName}
                maxLength={60}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>

            <div className="composer-review__units">
              {draftUnits.map((unit, uIdx) => (
                <div key={uIdx} className="composer-review__unit glass-panel">
                  <div className="composer-review__unit-header">
                    <span className="hud-label">Unit {uIdx + 1}</span>
                    <input
                      type="text"
                      className="input-field composer-review__unit-title"
                      value={unit.name}
                      onChange={(e) => {
                        const val = e.target.value
                        setDraftUnits(prev =>
                          prev.map((u, i) => (i === uIdx ? { ...u, name: val } : u))
                        )
                      }}
                    />
                    <span className="composer-review__topic-count">
                      {unit.topics.length} topic{unit.topics.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="composer-review__topics">
                    {unit.topics.map((topic, tIdx) => (
                      <div key={tIdx} className="composer-review__topic-row">
                        <span className="composer-review__topic-idx">{tIdx + 1}.</span>
                        <input
                          type="text"
                          className="input-field composer-review__topic-input"
                          value={topic.title}
                          maxLength={120}
                          onChange={(e) => handleReviewTopicChange(uIdx, tIdx, e.target.value)}
                        />
                        {topic.uncertain && (
                          <span className="composer-check-badge" title="AI was unsure — please verify">
                            Check
                          </span>
                        )}
                        <button
                          type="button"
                          className="composer-topic-del-btn"
                          onClick={() => handleReviewRemoveTopic(uIdx, tIdx)}
                          disabled={unit.topics.length <= 1}
                          title="Remove topic"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="composer-review__add-row">
                    <input
                      type="text"
                      className="input-field"
                      placeholder={`Add topic to Unit ${uIdx + 1}...`}
                      value={newTopicInputs[uIdx] || ''}
                      onChange={(e) =>
                        setNewTopicInputs(prev => ({ ...prev, [uIdx]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleReviewAddTopic(uIdx)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleReviewAddTopic(uIdx)}
                    >
                      + Topic
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="composer-review__footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleBackStep}
              >
                ← Edit Steps
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveCourseFromReview}
                id="btn-save-course"
              >
                ✓ Save course
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation Thread Above the Bar */}
            <div className="composer-conversation" aria-live="polite">
              {activeMessages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`composer-msg composer-msg--${msg.role}`}
                >
                  {msg.role === 'user' ? (
                    <button
                      type="button"
                      className="composer-bubble composer-bubble--user"
                      onClick={() => handleBubbleTap(msg.editTarget)}
                      title={msg.editTarget ? 'Tap bubble to edit this answer' : undefined}
                    >
                      <span>{msg.text}</span>
                      {msg.editTarget && <span className="composer-bubble__edit-hint">✎ Edit</span>}
                    </button>
                  ) : (
                    <div className={`composer-bubble composer-bubble--${msg.role}`}>
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}

              {isProcessingFile && (
                <div className="composer-msg composer-msg--system">
                  <div className="composer-bubble composer-bubble--system">
                    Scanning syllabus and validating schema…
                  </div>
                </div>
              )}

              {editingBubbleStep && (
                <div className="composer-editing-banner">
                  <span>Editing previous answer ({editingBubbleStep.type.replace('_', ' ')})</span>
                  <button type="button" onClick={() => setEditingBubbleStep(null)}>
                    Cancel
                  </button>
                </div>
              )}

              {/* Quick Voice Controls when in Guided Voice Mode */}
              {mode === 'guided_voice' && (
                <div className="composer-voice-controls">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => startMicrophoneCapture('guided')}
                  >
                    🎤 {isListening ? 'Listening…' : 'Speak Answer'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      handleVoiceInputEvent({
                        type: 'SPEECH_INPUT',
                        transcript: 'repeat',
                        confidence: 1.0,
                        fromTyping: true,
                      })
                    }
                  >
                    Repeat
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      handleVoiceInputEvent({
                        type: 'SPEECH_INPUT',
                        transcript: 'go back',
                        confidence: 1.0,
                        fromTyping: true,
                      })
                    }
                  >
                    Go Back
                  </button>
                  {voiceState.state === VOICE_STATES.ASK_TOPIC_TITLE && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        handleVoiceInputEvent({
                          type: 'SPEECH_INPUT',
                          transcript: 'skip',
                          confidence: 1.0,
                          fromTyping: true,
                        })
                      }
                    >
                      Skip Topic
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      handleVoiceInputEvent({
                        type: 'SPEECH_INPUT',
                        transcript: 'type instead',
                        confidence: 1.0,
                        fromTyping: true,
                      })
                    }
                  >
                    Type Instead
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Syllabus 5-Preset Picker Drawer */}
            {showSyllabusPresets && (
              <div className="composer-presets-drawer glass-panel">
                <div className="composer-presets-drawer__header">
                  <span className="hud-label">Phase B: 5 Syllabus Test Images</span>
                  <button type="button" onClick={() => setShowSyllabusPresets(false)}>✕</button>
                </div>
                <div className="composer-presets-drawer__list">
                  {SYLLABUS_TEST_SET.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className="composer-preset-item"
                      onClick={() => handleRunSyllabusPreset(preset)}
                    >
                      <span>{preset.label}</span>
                      <span className="text-cyan">{preset.expectedTotalTopics} topics →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dark Bottom Composer Bar (Section 4) */}
            <div className="composer-bar-wrapper">
              {/* "+" Menu Popup */}
              {showPlusMenu && (
                <div className="composer-popup composer-popup--left glass-panel-strong">
                  <button
                    type="button"
                    className="composer-popup__item"
                    onClick={() => fileInputRef.current?.click()}
                    id="menu-upload-file"
                  >
                    <span>📄</span>
                    <span>Upload image or PDF</span>
                  </button>
                  <button
                    type="button"
                    className="composer-popup__item"
                    onClick={() => cameraInputRef.current?.click()}
                    id="menu-take-photo"
                  >
                    <span>📷</span>
                    <span>Take photo</span>
                  </button>
                  <button
                    type="button"
                    className="composer-popup__item"
                    onClick={() => {
                      setShowPlusMenu(false)
                      setShowSyllabusPresets(true)
                    }}
                    id="menu-test-syllabi"
                  >
                    <span>🧪</span>
                    <span>Test Set (5 Syllabus Images)</span>
                  </button>
                </div>
              )}

              {/* Mic Mode Dropdown Popup */}
              {showMicDropdown && (
                <div className="composer-popup composer-popup--right glass-panel-strong">
                  <button
                    type="button"
                    className={`composer-popup__item ${micMode === 'guided' ? 'active' : ''}`}
                    onClick={() => {
                      setMicMode('guided')
                      setShowMicDropdown(false)
                      initiateVoiceMode('guided')
                    }}
                    id="mic-mode-guided"
                  >
                    <span>🎙️</span>
                    <span>Guided voice (Default)</span>
                  </button>
                  <button
                    type="button"
                    className={`composer-popup__item ${micMode === 'dictate' ? 'active' : ''}`}
                    onClick={() => {
                      setMicMode('dictate')
                      setShowMicDropdown(false)
                      initiateVoiceMode('dictate')
                    }}
                    id="mic-mode-dictate"
                  >
                    <span>🗣️</span>
                    <span>Dictate the whole course</span>
                  </button>
                </div>
              )}

              {/* Hidden File Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,image/jpeg,image/png,image/webp,image/heic,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />

              {/* Dark Bar: "+" on left, text box in middle, mic + dropdown arrow on right, send on far right */}
              <div className="composer-dark-bar">
                <button
                  type="button"
                  className="composer-bar-btn composer-bar-btn--plus"
                  onClick={() => {
                    setShowPlusMenu(!showPlusMenu)
                    setShowMicDropdown(false)
                  }}
                  aria-label="Upload image, PDF, or take photo"
                  id="btn-composer-plus"
                >
                  +
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="composer-bar-textarea"
                  placeholder={
                    mode === 'guided_voice'
                      ? 'Speak or type your answer…'
                      : typingStep === 'course_name'
                      ? 'Type course name (e.g., Machine Learning)…'
                      : typingStep === 'total_units'
                      ? 'Type total units (1 to 10)…'
                      : `Paste or type ${getOrdinalLabel(currentUnitIdx + 1)} unit topics…`
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleTypingSubmit()
                    }
                  }}
                  id="input-composer-text"
                />

                <div className="composer-mic-group">
                  <button
                    type="button"
                    className={`composer-bar-btn composer-bar-btn--mic ${isListening ? 'listening' : ''}`}
                    onClick={() => initiateVoiceMode(micMode)}
                    aria-label="Start voice input"
                    id="btn-composer-mic"
                  >
                    🎤
                  </button>
                  <button
                    type="button"
                    className="composer-bar-btn composer-bar-btn--mic-arrow"
                    onClick={() => {
                      setShowMicDropdown(!showMicDropdown)
                      setShowPlusMenu(false)
                    }}
                    aria-label="Choose voice mode"
                    id="btn-composer-mic-dropdown"
                  >
                    ▾
                  </button>
                </div>

                <button
                  type="button"
                  className="composer-bar-btn composer-bar-btn--send"
                  onClick={handleTypingSubmit}
                  disabled={!inputText.trim()}
                  aria-label="Send answer"
                  id="btn-composer-send"
                >
                  ↵
                </button>
              </div>
            </div>
          </>
        )}

        {/* Microphone Consent Modal (Security S4) */}
        {showConsentModal && (
          <div className="composer-consent-overlay">
            <div className="composer-consent-card glass-panel-strong">
              <h3 className="hud-label">Microphone Permission & Privacy</h3>
              <p className="composer-consent-text">
                Questism uses your microphone to transcribe your course name, units, and topics.
                Raw audio is <strong>never stored</strong>, and transcripts are only saved when you
                confirm on the Review screen. You can turn voice off anytime in Settings.
              </p>
              <div className="composer-consent-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowConsentModal(false)
                    setPendingVoiceAction(null)
                  }}
                >
                  Use Typing Instead
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    updateSettings({ micConsentGranted: true })
                    setShowConsentModal(false)
                    startVoiceFlow(pendingVoiceAction || 'guided')
                  }}
                  id="btn-grant-mic-consent"
                >
                  Allow Microphone
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
