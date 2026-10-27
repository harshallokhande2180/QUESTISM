import { z } from 'zod'

/** Auth Schemas */
export const emailSchema = z.string().email('Invalid email address').max(254)
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
  .min(1, 'Quest title is required')
  .max(80, 'Maximum 80 characters')
  .refine(val => !/<[^>]*>/.test(val), 'HTML is not allowed')

export const questNoteSchema = z.string()
  .max(500, 'Maximum 500 characters')
  .refine(val => !/<[^>]*>/.test(val), 'HTML is not allowed')
  .optional()

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
