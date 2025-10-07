import { z } from 'zod'

export const programExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int().nonnegative(),
  targetRepMin: z.number().int().positive(),
  targetRepMax: z.number().int().positive(),
  prescribedSets: z.number().int().positive(),
})

export const programDaySchema = z.object({
  id: z.string(),
  week: z.number().int().positive(),
  dateISO: z.string(),
  exercises: z.array(programExerciseSchema),
})

export const exerciseLogSchema = z.object({
  id: z.string(),
  programDayId: z.string(),
  programExerciseId: z.string(),
  completedSets: z.number().int().min(0),
  allSetsComplete: z.boolean(),
  pointsEarned: z.number().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  leftExerciseViewAt: z.string().nullable().optional(),
})

export const setLogSchema = z.object({
  id: z.string(),
  programExerciseId: z.string(),
  exerciseLogId: z.string(),
  setIndex: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().nonnegative(),
  comment: z.string().nullable().optional(),
  exceededRange: z.boolean(),
  createdAt: z.string(),
})

export const saveSetPayloadSchema = z.object({
  programExerciseId: z.string(),
  setIndex: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().nonnegative(),
  comment: z.string().optional(),
})

export const completeExercisePayloadSchema = z.object({
  programExerciseId: z.string(),
})

export const markExerciseLeftViewPayloadSchema = z.object({
  programExerciseId: z.string(),
  leftAtISO: z.string(),
})

export const saveSetResponseSchema = z.object({
  setLog: setLogSchema,
  updatedExerciseLog: exerciseLogSchema,
  pointsDelta: z.number(),
})

export const completeExerciseResponseSchema = z.object({
  updatedExerciseLog: exerciseLogSchema,
  pointsDelta: z.number(),
})

export const exerciseLogResultSchema = z.object({
  exerciseLog: exerciseLogSchema,
  setLogs: z.array(setLogSchema),
})
