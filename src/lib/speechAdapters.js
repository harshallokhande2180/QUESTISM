/**
 * speechAdapters.js
 *
 * Implements the two Speech Input adapters behind a single unified interface (Section 6):
 * 1. BrowserSpeechAdapter: Uses Web Speech API (SpeechRecognition / webkitSpeechRecognition) when available.
 * 2. ServerSpeechAdapter: Records audio with MediaRecorder, sends to /api/ai/transcribe with user's course names as hint words.
 *
 * Also implements Speech Output with cached prompts (browser speechSynthesis by default + optional neural TTS).
 * Raw audio is never persisted.
 */

const TTS_LOCAL_CACHE_KEY = 'questism_tts_cache_v1'

export function isBrowserSpeechSupported() {
  if (typeof window === 'undefined') return false
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/**
 * BrowserSpeechAdapter (Web Speech API)
 */
export class BrowserSpeechAdapter {
  constructor({ onResult, onError, onSilenceTimeout, silenceMs = 6000 }) {
    this.onResult = onResult
    this.onError = onError
    this.onSilenceTimeout = onSilenceTimeout
    this.silenceMs = silenceMs
    this.recognition = null
    this.silenceTimer = null
    this.isListening = false
  }

  start() {
    if (!isBrowserSpeechSupported()) {
      this.onError?.(new Error('Web Speech API not supported in this browser'))
      return
    }
    this.stop()
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.continuous = false

    this.isListening = true
    this.resetSilenceTimer()

    rec.onresult = (event) => {
      this.clearSilenceTimer()
      this.isListening = false
      const result = event.results?.[0]?.[0]
      const transcript = result?.transcript || ''
      const confidence = typeof result?.confidence === 'number' && result.confidence > 0
        ? result.confidence
        : undefined
      this.onResult?.({ transcript, confidence, adapter: 'BrowserSpeech' })
    }

    rec.onerror = (event) => {
      this.clearSilenceTimer()
      this.isListening = false
      if (event.error === 'no-speech') {
        this.onSilenceTimeout?.()
      } else {
        this.onError?.(new Error(event.error || 'Speech recognition error'))
      }
    }

    rec.onend = () => {
      this.isListening = false
    }

    this.recognition = rec
    try {
      rec.start()
    } catch (err) {
      this.clearSilenceTimer()
      this.isListening = false
      this.onError?.(err)
    }
  }

  resetSilenceTimer() {
    this.clearSilenceTimer()
    this.silenceTimer = setTimeout(() => {
      if (this.isListening) {
        try {
          this.recognition?.stop()
        } catch {}
        this.isListening = false
        this.onSilenceTimeout?.()
      }
    }, this.silenceMs)
  }

  clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
  }

  stop() {
    this.clearSilenceTimer()
    this.isListening = false
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch {}
      this.recognition = null
    }
  }
}

/**
 * ServerSpeechAdapter (MediaRecorder -> /api/ai/transcribe with course hint words)
 */
export class ServerSpeechAdapter {
  constructor({ onResult, onError, onSilenceTimeout, hintWords = [], userId, dayKey, silenceMs = 6000 }) {
    this.onResult = onResult
    this.onError = onError
    this.onSilenceTimeout = onSilenceTimeout
    this.hintWords = hintWords
    this.userId = userId
    this.dayKey = dayKey
    this.silenceMs = silenceMs
    this.mediaRecorder = null
    this.stream = null
    this.chunks = []
    this.startTime = 0
    this.isListening = false
    this.autoStopTimer = null
  }

  async start() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not available in this browser.')
      }
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.chunks = []
      this.startTime = Date.now()
      this.isListening = true

      const recorder = new MediaRecorder(this.stream)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data)
        }
      }

      recorder.onstop = async () => {
        this.isListening = false
        const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000))
        const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' })
        this.chunks = [] // immediately release raw audio chunks
        this.cleanupStream()

        if (blob.size < 200) {
          this.onSilenceTimeout?.()
          return
        }

        try {
          const base64Audio = await blobToBase64(blob)
          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: this.userId,
              dayKey: this.dayKey,
              base64Audio,
              mimeType: blob.type || 'audio/webm',
              durationSeconds,
              hintWords: this.hintWords,
            }),
          })
          const data = await res.json()
          if (!res.ok) {
            throw new Error(data.error || 'Server speech transcription failed')
          }
          this.onResult?.({
            transcript: data.transcript || '',
            confidence: data.confidence ?? 0.85,
            adapter: 'ServerSpeech',
          })
        } catch (err) {
          this.onError?.(err)
        }
      }

      this.mediaRecorder = recorder
      recorder.start()

      this.autoStopTimer = setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop()
        }
      }, this.silenceMs)
    } catch (err) {
      this.isListening = false
      this.cleanupStream()
      this.onError?.(err)
    }
  }

  stop() {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer)
      this.autoStopTimer = null
    }
    this.isListening = false
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop()
      } catch {}
    } else {
      this.cleanupStream()
    }
  }

  cleanupStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
      this.stream = null
    }
  }
}

/**
 * Factory that picks BrowserSpeechAdapter or ServerSpeechAdapter by feature detection
 */
export function createSpeechAdapter(options) {
  if (isBrowserSpeechSupported() && !options.forceServerAdapter) {
    return new BrowserSpeechAdapter(options)
  }
  return new ServerSpeechAdapter(options)
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = String(reader.result || '')
      const commaIdx = result.indexOf(',')
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Speech Output (Browser speechSynthesis default + optional cached Neural TTS)
 */
export async function speakPromptText(text, { voiceEnabled = true, useNeuralVoice = false } = {}) {
  if (!voiceEnabled || !text || typeof window === 'undefined') return

  if (useNeuralVoice) {
    try {
      const cacheRaw = localStorage.getItem(TTS_LOCAL_CACHE_KEY)
      const cache = cacheRaw ? JSON.parse(cacheRaw) : {}
      if (cache[text]) {
        const audio = new Audio(`data:audio/wav;base64,${cache[text]}`)
        await audio.play()
        return
      }
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data?.base64Wav) {
        try {
          cache[text] = data.base64Wav
          localStorage.setItem(TTS_LOCAL_CACHE_KEY, JSON.stringify(cache))
        } catch {}
        const audio = new Audio(`data:audio/wav;base64,${data.base64Wav}`)
        await audio.play()
        return
      }
    } catch {}
  }

  // Default: Browser Speech Synthesis
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.05
      utterance.pitch = 0.95
      window.speechSynthesis.speak(utterance)
    } catch {}
  }
}

/**
 * Client-side image resizer (max 2000px on longest side before sending — Section 6)
 */
export async function resizeImageFileIfNeeded(file, maxDimension = 2000) {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/heic') {
    return file
  }
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file)
        return
      }
      const scale = maxDimension / Math.max(width, height)
      const targetW = Math.round(width * scale)
      const targetH = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, targetW, targetH)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        0.88
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}
