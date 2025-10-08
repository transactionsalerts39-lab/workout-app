import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../lib/supabase'
import { BASE_POINTS_PER_SET, exerciseStreakBonus, pointsForSet } from '../utils/points'
import type {
  CompleteExercisePayload,
  CompleteExerciseResponse,
  ExerciseLog,
  ExerciseLogResult,
  MarkExerciseLeftViewPayload,
  ProgramDay,
  ProgramExercise,
  SaveSetPayload,
  SaveSetResponse,
  SetLog,
} from '../types'

const SELECT_EXERCISE_LOG =
  'id, program_day_id, program_exercise_id, completed_sets, all_sets_complete, points_earned, created_at, updated_at, left_exercise_view_at'

const SELECT_SET_LOG =
  'id, program_exercise_id, exercise_log_id, set_index, reps, weight, comment, exceeded_range, created_at'

type SupabaseRepoOptions = {
  supabaseUrl: string
  supabaseAnonKey: string
}

export function createSupabaseRepo(options: SupabaseRepoOptions) {
  const client = getSupabaseClient(options)

  async function fetchProgramExercise(programExerciseId: string) {
    const { data, error } = await client
      .from('program_exercises')
      .select('id, program_day_id, name, order, target_rep_min, target_rep_max, prescribed_sets')
      .eq('id', programExerciseId)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new Error('Program exercise not found')
    }

    return data
  }

  async function fetchProgramDay(dateISO: string): Promise<ProgramDay> {
    const { data, error } = await client
      .from('program_days')
      .select(
        'id, week, date_iso, program_exercises(id, name, order, target_rep_min, target_rep_max, prescribed_sets)',
      )
      .eq('date_iso', dateISO)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new Error('Program day not found')
    }

    return mapProgramDay(data)
  }

  async function resolveExerciseLog(programExerciseId: string): Promise<ExerciseLogResult> {
    const exercise = await fetchProgramExercise(programExerciseId)

    const { data: existingLog, error: existingLogError } = await client
      .from('exercise_logs')
      .select(`${SELECT_EXERCISE_LOG}, set_logs (${SELECT_SET_LOG})`)
      .eq('program_exercise_id', programExerciseId)
      .maybeSingle()

    if (existingLogError) throw existingLogError

    if (existingLog) {
      return mapExerciseLogResult(existingLog)
    }

    const now = new Date().toISOString()
    const { data: inserted, error: insertError } = await client
      .from('exercise_logs')
      .insert({
        program_day_id: exercise.program_day_id,
        program_exercise_id: programExerciseId,
        completed_sets: 0,
        all_sets_complete: false,
        points_earned: 0,
        created_at: now,
        updated_at: now,
      })
      .select(`${SELECT_EXERCISE_LOG}, set_logs (${SELECT_SET_LOG})`)
      .single()

    if (insertError) throw insertError

    return mapExerciseLogResult(inserted)
  }

  async function fetchSetLogs(clientRef: SupabaseClient, programExerciseId: string) {
    const { data, error } = await clientRef
      .from('set_logs')
      .select(SELECT_SET_LOG)
      .eq('program_exercise_id', programExerciseId)
      .order('set_index', { ascending: true })

    if (error) throw error
    return data ?? []
  }

  async function markExerciseLeftView(payload: MarkExerciseLeftViewPayload): Promise<ExerciseLog> {
    const { data, error } = await client
      .from('exercise_logs')
      .update({
        left_exercise_view_at: payload.leftAtISO,
        updated_at: new Date().toISOString(),
      })
      .eq('program_exercise_id', payload.programExerciseId)
      .select(SELECT_EXERCISE_LOG)
      .single()

    if (error) throw error
    return mapExerciseLog(data)
  }

  async function saveSet(payload: SaveSetPayload): Promise<SaveSetResponse> {
    const exercise = await fetchProgramExercise(payload.programExerciseId)
    const { exerciseLog } = await resolveExerciseLog(payload.programExerciseId)
    const exceededRange = payload.reps > exercise.target_rep_max

    const { data: upsertedSet, error: upsertError } = await client
      .from('set_logs')
      .upsert(
        {
          program_exercise_id: payload.programExerciseId,
          exercise_log_id: exerciseLog.id,
          set_index: payload.setIndex,
          reps: payload.reps,
          weight: payload.weight,
          comment: payload.comment ?? null,
          exceeded_range: exceededRange,
        },
        { onConflict: 'program_exercise_id,set_index' },
      )
      .select(SELECT_SET_LOG)
      .single()

    if (upsertError) throw upsertError

    const setLogs = await fetchSetLogs(client, payload.programExerciseId)
    const pointsFromSets = setLogs.reduce((sum, log) => {
      return sum + pointsForSet(BASE_POINTS_PER_SET, log.exceeded_range ?? false)
    }, 0)

    const { data: updatedLog, error: updateError } = await client
      .from('exercise_logs')
      .update({
        completed_sets: setLogs.length,
        points_earned: pointsFromSets,
        updated_at: new Date().toISOString(),
      })
      .eq('id', exerciseLog.id)
      .select(SELECT_EXERCISE_LOG)
      .single()

    if (updateError) throw updateError

    const pointsDelta = pointsFromSets - exerciseLog.pointsEarned

    return {
      setLog: mapSetLog(upsertedSet),
      updatedExerciseLog: mapExerciseLog(updatedLog),
      pointsDelta,
    }
  }

  async function completeExercise(payload: CompleteExercisePayload): Promise<CompleteExerciseResponse> {
    const exercise = await fetchProgramExercise(payload.programExerciseId)
    const { exerciseLog } = await resolveExerciseLog(payload.programExerciseId)
    const setLogs = await fetchSetLogs(client, payload.programExerciseId)

    if (setLogs.length < exercise.prescribed_sets) {
      throw new Error('Cannot complete exercise. Some sets are missing.')
    }

    const pointsFromSets = setLogs.reduce((sum, log) => {
      return sum + pointsForSet(BASE_POINTS_PER_SET, log.exceeded_range ?? false)
    }, 0)

    const eligibleForStreak = !exerciseLog.leftExerciseViewAt
    const totalPoints = pointsFromSets + exerciseStreakBonus(eligibleForStreak)

    const { data: updated, error: updateError } = await client
      .from('exercise_logs')
      .update({
        completed_sets: setLogs.length,
        all_sets_complete: true,
        points_earned: totalPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('id', exerciseLog.id)
      .select(SELECT_EXERCISE_LOG)
      .single()

    if (updateError) throw updateError

    return {
      updatedExerciseLog: mapExerciseLog(updated),
      pointsDelta: totalPoints - exerciseLog.pointsEarned,
    }
  }

  async function skipExercise(payload: CompleteExercisePayload): Promise<CompleteExerciseResponse> {
    const { exerciseLog } = await resolveExerciseLog(payload.programExerciseId)

    const { data, error } = await client
      .from('exercise_logs')
      .update({
        all_sets_complete: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', exerciseLog.id)
      .select(SELECT_EXERCISE_LOG)
      .single()

    if (error) throw error

    return {
      updatedExerciseLog: mapExerciseLog(data),
      pointsDelta: 0,
    }
  }

  return {
    fetchProgramDay,
    fetchExerciseLog: resolveExerciseLog,
    markExerciseLeftView,
    saveSet,
    completeExercise,
    skipExercise,
  }
}

type ProgramExerciseRow = {
  id: string
  name: string
  order: number
  target_rep_min: number
  target_rep_max: number
  prescribed_sets: number
}

type ProgramDayRow = {
  id: string
  week: number
  date_iso: string
  program_exercises?: ProgramExerciseRow[] | null
}

type SetLogRow = {
  id: string
  program_exercise_id: string
  exercise_log_id: string
  set_index: number
  reps: number
  weight: number | null
  comment: string | null
  exceeded_range?: boolean | null
  created_at: string
}

type ExerciseLogRow = {
  id: string
  program_day_id: string
  program_exercise_id: string
  completed_sets: number
  all_sets_complete: boolean
  points_earned: number
  created_at: string
  updated_at: string
  left_exercise_view_at: string | null
}

type ExerciseLogResultRow = ExerciseLogRow & {
  set_logs?: SetLogRow[] | null
}

function mapProgramDay(row: ProgramDayRow): ProgramDay {
  return {
    id: row.id,
    week: row.week,
    dateISO: row.date_iso,
    exercises: (row.program_exercises ?? [])
      .map((exercise) => mapProgramExercise(exercise))
      .sort((a: ProgramExercise, b: ProgramExercise) => a.order - b.order),
  }
}

function mapProgramExercise(row: ProgramExerciseRow): ProgramExercise {
  return {
    id: row.id,
    name: row.name,
    order: row.order,
    targetRepMin: row.target_rep_min,
    targetRepMax: row.target_rep_max,
    prescribedSets: row.prescribed_sets,
  }
}

function mapSetLog(row: SetLogRow): SetLog {
  return {
    id: row.id,
    programExerciseId: row.program_exercise_id,
    exerciseLogId: row.exercise_log_id,
    setIndex: row.set_index,
    reps: row.reps,
    weight: row.weight != null ? Number(row.weight) : 0,
    comment: row.comment,
    exceededRange: row.exceeded_range ?? false,
    createdAt: row.created_at,
  }
}

function mapExerciseLog(row: ExerciseLogRow): ExerciseLog {
  return {
    id: row.id,
    programDayId: row.program_day_id,
    programExerciseId: row.program_exercise_id,
    completedSets: row.completed_sets,
    allSetsComplete: row.all_sets_complete,
    pointsEarned: row.points_earned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    leftExerciseViewAt: row.left_exercise_view_at,
  }
}

function mapExerciseLogResult(row: ExerciseLogResultRow): ExerciseLogResult {
  return {
    exerciseLog: mapExerciseLog(row),
    setLogs: (row.set_logs ?? []).map((setLog) => mapSetLog(setLog)).sort((a: SetLog, b: SetLog) => a.setIndex - b.setIndex),
  }
}
