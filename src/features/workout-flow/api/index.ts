import {
  completeExercisePayloadSchema,
  completeExerciseResponseSchema,
  exerciseLogResultSchema,
  exerciseLogSchema,
  markExerciseLeftViewPayloadSchema,
  programDaySchema,
  saveSetPayloadSchema,
  saveSetResponseSchema,
} from './schemas'
import { workoutRepo as mockRepo } from './mockRepo'
import { createSupabaseRepo } from './supabaseRepo'
import type {
  CompleteExercisePayload,
  CompleteExerciseResponse,
  ExerciseLogResult,
  MarkExerciseLeftViewPayload,
  ProgramDay,
  SaveSetPayload,
  SaveSetResponse,
} from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const isTestMode = import.meta.env.MODE === 'test'

const repo = !isTestMode && supabaseUrl && supabaseAnonKey
  ? createSupabaseRepo({ supabaseUrl, supabaseAnonKey })
  : mockRepo

export async function getProgramDay(dateISO: string): Promise<ProgramDay> {
  const day = await repo.fetchProgramDay(dateISO)
  return programDaySchema.parse(day)
}

export async function getExerciseLog(programExerciseId: string): Promise<ExerciseLogResult> {
  const result = await repo.fetchExerciseLog(programExerciseId)
  return exerciseLogResultSchema.parse(result)
}

export async function markExerciseLeftView(
  payload: MarkExerciseLeftViewPayload,
): Promise<ExerciseLogResult['exerciseLog']> {
  const parsedPayload = markExerciseLeftViewPayloadSchema.parse(payload)
  const updated = await repo.markExerciseLeftView(parsedPayload)
  return exerciseLogSchema.parse(updated)
}

export async function saveSet(payload: SaveSetPayload): Promise<SaveSetResponse> {
  const parsed = saveSetPayloadSchema.parse(payload)
  const response = await repo.saveSet(parsed)
  return saveSetResponseSchema.parse(response)
}

export async function completeExercise(
  payload: CompleteExercisePayload,
): Promise<CompleteExerciseResponse> {
  const parsed = completeExercisePayloadSchema.parse(payload)
  const response = await repo.completeExercise(parsed)
  return completeExerciseResponseSchema.parse(response)
}

export async function skipExercise(
  payload: CompleteExercisePayload,
): Promise<CompleteExerciseResponse> {
  const parsed = completeExercisePayloadSchema.parse(payload)
  const response = await repo.skipExercise(parsed)
  return completeExerciseResponseSchema.parse(response)
}
