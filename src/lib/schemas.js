import { z } from 'zod'

/** Auth Schemas */
export const emailSchema = z.string().trim().toLowerCase().email('Invalid email address').max(254)
export const passwordSchema = z.string().min(8, 'Minimum 8 characters').max(72, 'Maximum 72 characters')

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

/** Quest Schemas */
export const questTitleSchema = z.string()
  .trim()
  .min(1, 'Quest title is required')
  .max(80, 'Maximum 80 characters')
  .refine(val => !/<[^>]*>/.test(val), 'HTML is not allowed')

export const questNoteSchema = z.string()
  .max(500, 'Maximum 500 characters')
  .refine(val => !/<[^>]*>/.test(val), 'HTML is not allowed')
  .optional()

/** Course & Study Schemas (Change Request 2) */
export const courseNameSchema = z.string()
  .trim()
  .min(2, 'Course name must be at least 2 characters')
  .max(60, 'Course name cannot exceed 60 characters')
  .refine(val => !/<[^>]*>/.test(val), 'HTML tags are not allowed')

export const unitCountSchema = z.number()
  .int('Total units must be a whole number')
  .min(1, 'Course must have at least 1 unit')
  .max(10, 'Course can have at most 10 units')

export const topicTitleSchema = z.string()
  .trim()
  .min(2, 'Topic must be at least 2 characters')
  .max(120, 'Topic cannot exceed 120 characters')
  .refine(val => !/<[^>]*>/.test(val), 'HTML tags are not allowed')

export const studyTopicNoteSchema = z.string()
  .trim()
  .min(10, 'Note must be at least 10 characters to count toward today\'s 4 topics')
  .max(1000, 'Note cannot exceed 1000 characters')
  .refine(val => !/<[^>]*>/.test(val), 'HTML tags are not allowed')

/** AI Structured Output Schema (shared by client & server) */
export const aiDraftTopicSchema = z.object({
  title: z.string().trim().min(2).max(120),
  uncertain: z.boolean().optional().default(false),
})

export const aiDraftUnitSchema = z.object({
  unitNumber: z.number().int().min(1).max(10),
  name: z.string().trim().min(1).max(80).optional(),
  topics: z.array(aiDraftTopicSchema).min(1).max(60),
})

export const aiCourseDraftSchema = z.object({
  status: z.enum(['OK', 'NO_COURSE_FOUND']),
  courseName: z.string().trim().max(60).optional().default(''),
  notes: z.array(z.string()).optional().default([]),
  units: z.array(aiDraftUnitSchema).max(10).optional().default([]),
})

/** Workout Schemas */
export const repsSchema = z.number()
  .int('Must be a whole number')
  .min(0, 'Cannot be negative')
  .max(500, 'Maximum 500 reps')

export const distanceSchema = z.number()
  .positive('Must be greater than 0')
  .max(100, 'Maximum 100 km')

/** Timetable Schemas */
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)')

export const timetableBlockSchema = z.object({
  startTime: timeSchema,
  endTime: timeSchema,
  label: z.string().min(1).max(80),
  type: z.enum(['study', 'workout', 'routine', 'free', 'custom']),
}).refine(data => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
})

/** Profile Settings */
export const dayEndTimeSchema = timeSchema.refine(val => {
  const [h] = val.split(':').map(Number)
  return h >= 0 && h <= 6
}, 'Day end time must be between 00:00 and 06:00')

export const breakLockConfirmSchema = z.string().refine(val => val === 'BREAK LOCK', {
  message: 'Type "BREAK LOCK" exactly to confirm',
})

/** Ordinal label helper: 1 -> 1st, 2 -> 2nd, 3 -> 3rd, 4 -> 4th */
export function getOrdinalLabel(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * Strip leading list numbering/bullets: "1. Intro", "1) Intro", "(1) Intro", "• Intro", "- Intro"
 */
export function stripTopicNumbering(raw) {
  return String(raw || '')
    .trim()
    .replace(/^(?:(?:\d+|[a-zA-Z])[\.\)\-:]|\(\d+\)|[•●▪▸\-\*+])\s*/, '')
    .trim()
}

/**
 * Parse a multiline or comma-separated list of unit topics (Section 4.1)
 */
export function parseUnitTopicsInput(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { topics: [], duplicatesRemoved: [], errors: ['Please enter at least one topic.'] }
  }

  // Split by newlines first; if a line contains commas, split by commas as well
  const rawSegments = rawText
    .split(/\r?\n/)
    .flatMap(line => line.split(','))
    .map(stripTopicNumbering)
    .filter(Boolean)

  if (rawSegments.length === 0) {
    return { topics: [], duplicatesRemoved: [], errors: ['Each unit needs at least one topic.'] }
  }

  const seen = new Set()
  const topics = []
  const duplicatesRemoved = []
  const errors = []

  for (const item of rawSegments) {
    const validation = topicTitleSchema.safeParse(item)
    if (!validation.success) {
      errors.push(`"${item.slice(0, 28)}": ${validation.error.issues[0].message}`)
      continue
    }
    const clean = validation.data
    const lowerKey = clean.toLowerCase()
    if (seen.has(lowerKey)) {
      duplicatesRemoved.push(clean)
      continue
    }
    seen.add(lowerKey)
    topics.push(clean)
  }

  if (topics.length === 0 && errors.length === 0) {
    errors.push('Each unit needs at least one valid topic (2 to 120 characters).')
  }
  if (topics.length > 60) {
    errors.push(`A unit can have at most 60 topics (found ${topics.length}).`)
  }

  return { topics, duplicatesRemoved, errors }
}

/**
 * Deterministic spoken/typed number parser (Section 4.3)
 * Accepts digits ("21", "5") and English words ("twenty-one", "twenty one", "five").
 * Never uses AI. Returns integer or null if invalid.
 */
const ONES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}

const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}

export function parseSpokenNumber(input) {
  if (input === null || input === undefined) return null
  const cleaned = String(input)
    .trim()
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .replace(/\b(?:units?|topics?|items?|number)\b/g, '')
    .trim()

  if (!cleaned) return null

  // Direct integer digits
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10)
  }

  // Normalize hyphens to spaces ("twenty-one" -> "twenty one")
  const tokens = cleaned.replace(/-/g, ' ').split(/\s+/).filter(t => t && t !== 'and')
  if (tokens.length === 0) return null

  let total = 0
  let current = 0

  for (const word of tokens) {
    if (word in ONES) {
      current += ONES[word]
    } else if (word in TENS) {
      current += TENS[word]
    } else if (word === 'hundred') {
      current = (current === 0 ? 1 : current) * 100
      total += current
      current = 0
    } else {
      return null
    }
  }

  return total + current
}

/**
 * File signature (magic bytes) verification (Sections 6 & 7 — S2)
 * Checks the first bytes of a file (Uint8Array), never trusting the file extension.
 * Accepts: JPG, PNG, WEBP, HEIC/HEIF, PDF.
 * Explicitly rejects executables (MZ / 4D 5A, ELF, scripts) even if renamed to .pdf or .jpg.
 */
export function verifyFileSignature(bytes) {
  if (!bytes || bytes.length < 12) {
    return { valid: false, reason: 'File is empty or too small to verify signature.' }
  }

  // Reject Windows PE / EXE ('MZ' = 0x4D 0x5A)
  if (bytes[0] === 0x4D && bytes[1] === 0x5A) {
    return {
      valid: false,
      reason: 'Security Rejection: Executable file (.exe / PE binary) detected inside upload.',
    }
  }

  // Reject ELF binary (0x7F 'E' 'L' 'F')
  if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) {
    return {
      valid: false,
      reason: 'Security Rejection: Executable binary (ELF) detected inside upload.',
    }
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, mimeType: 'image/jpeg', format: 'JPG' }
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return { valid: true, mimeType: 'image/png', format: 'PNG' }
  }

  // WEBP: 'RIFF' .... 'WEBP'
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, mimeType: 'image/webp', format: 'WEBP' }
  }

  // PDF: '%PDF-' (25 50 44 46 2D)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2D
  ) {
    return { valid: true, mimeType: 'application/pdf', format: 'PDF' }
  }

  // HEIC / HEIF: bytes 4..7 == 'ftyp' (66 74 79 70) and brand in heic/heix/hevc/mif1/msf1
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase()
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
      return { valid: true, mimeType: 'image/heic', format: 'HEIC' }
    }
  }

  return {
    valid: false,
    reason: 'Unsupported file signature. Only authentic JPG, PNG, WEBP, HEIC, and PDF files are accepted.',
  }
}
