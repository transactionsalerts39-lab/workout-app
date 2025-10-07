import { programDayFixture } from '../constants/fixtures'
import {
  BASE_POINTS_PER_SET,
  exerciseStreakBonus,
  pointsForSet,
} from '../utils/points'
import { generateId } from '../utils/id'
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

interface InMemoryWorkoutRepoOptions {
  latencyMs?: number
}

class InMemoryWorkoutRepo {
  private readonly latencyMs: number

  private readonly programDays = new Map<string, ProgramDay>()

  private readonly programExerciseById = new Map<string, ProgramExercise & { programDayId: string }>()

  private readonly exerciseLogs = new Map<string, ExerciseLog>()

  private readonly setLogs = new Map<string, Map<number, SetLog>>()

  private readonly streakEligibility = new Map<string, boolean>()

  constructor(options: InMemoryWorkoutRepoOptions = {}) {
    this.latencyMs = options.latencyMs ?? 160

    this.programDays.set(programDayFixture.dateISO, {
      ...programDayFixture,
      exercises: [...programDayFixture.exercises].sort((a, b) => a.order - b.order),
    })

    programDayFixture.exercises.forEach((exercise) => {
      this.programExerciseById.set(exercise.id, {
        ...exercise,
        programDayId: programDayFixture.id,
      })
      this.streakEligibility.set(exercise.id, true)
    })
  }

  private async wait(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs))
  }

  async fetchProgramDay(dateISO: string): Promise<ProgramDay> {
    await this.wait()
    const day = this.programDays.get(dateISO)
    if (!day) {
      throw new Error('Program day not found')
    }
    return {
      ...day,
      exercises: [...day.exercises].sort((a, b) => a.order - b.order),
    }
  }

  async fetchExerciseLog(programExerciseId: string): Promise<ExerciseLogResult> {
    await this.wait()
    const exercise = this.programExerciseById.get(programExerciseId)
    if (!exercise) {
      throw new Error('Program exercise not found')
    }

    const existingLog = this.exerciseLogs.get(programExerciseId)
    if (existingLog) {
      return {
        exerciseLog: { ...existingLog },
        setLogs: this.getSetLogs(programExerciseId),
      }
    }

    const newLog: ExerciseLog = {
      id: generateId('exercise-log'),
      programDayId: exercise.programDayId,
      programExerciseId,
      completedSets: 0,
      allSetsComplete: false,
      pointsEarned: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      leftExerciseViewAt: null,
    }

    this.exerciseLogs.set(programExerciseId, newLog)
    this.setLogs.set(programExerciseId, new Map())

    return {
      exerciseLog: { ...newLog },
      setLogs: [],
    }
  }

  async markExerciseLeftView(payload: MarkExerciseLeftViewPayload): Promise<ExerciseLog> {
    await this.wait()
    const log = this.requireExerciseLog(payload.programExerciseId)
    const updated: ExerciseLog = {
      ...log,
      leftExerciseViewAt: payload.leftAtISO,
      updatedAt: new Date().toISOString(),
    }
    this.exerciseLogs.set(payload.programExerciseId, updated)
    this.streakEligibility.set(payload.programExerciseId, false)
    return { ...updated }
  }

  async saveSet(payload: SaveSetPayload): Promise<SaveSetResponse> {
    await this.wait()
    const exercise = this.programExerciseById.get(payload.programExerciseId)
    if (!exercise) {
      throw new Error('Program exercise not found')
    }

    if (payload.setIndex < 1 || payload.setIndex > exercise.prescribedSets) {
      throw new Error('Invalid set index')
    }

    const exerciseLog = this.requireExerciseLog(payload.programExerciseId)
    const setLogMap = this.setLogs.get(payload.programExerciseId) ?? new Map<number, SetLog>()

    const previousLog = setLogMap.get(payload.setIndex)
    const exceededRange = payload.reps > exercise.targetRepMax

    const nowIso = new Date().toISOString()
    const nextSetLog: SetLog = {
      id: previousLog?.id ?? generateId('set-log'),
      programExerciseId: payload.programExerciseId,
      exerciseLogId: exerciseLog.id,
      setIndex: payload.setIndex,
      reps: payload.reps,
      weight: payload.weight,
      comment: payload.comment ?? null,
      exceededRange,
      createdAt: previousLog?.createdAt ?? nowIso,
    }

    const previousPoints = previousLog ? pointsForSet(BASE_POINTS_PER_SET, previousLog.exceededRange) : 0
    const nextPoints = pointsForSet(BASE_POINTS_PER_SET, exceededRange)
    const pointsDelta = nextPoints - previousPoints

    setLogMap.set(payload.setIndex, nextSetLog)
    this.setLogs.set(payload.programExerciseId, setLogMap)

    const updatedLog: ExerciseLog = {
      ...exerciseLog,
      completedSets: this.countCompletedSets(setLogMap),
      pointsEarned: exerciseLog.pointsEarned + pointsDelta,
      updatedAt: nowIso,
    }

    this.exerciseLogs.set(payload.programExerciseId, updatedLog)

    return {
      setLog: { ...nextSetLog },
      updatedExerciseLog: { ...updatedLog },
      pointsDelta,
    }
  }

  async completeExercise(payload: CompleteExercisePayload): Promise<CompleteExerciseResponse> {
    await this.wait()
    const exercise = this.programExerciseById.get(payload.programExerciseId)
    if (!exercise) {
      throw new Error('Program exercise not found')
    }

    const exerciseLog = this.requireExerciseLog(payload.programExerciseId)
    const setLogMap = this.setLogs.get(payload.programExerciseId) ?? new Map<number, SetLog>()

    const completedSets = this.countCompletedSets(setLogMap)
    if (completedSets < exercise.prescribedSets) {
      throw new Error('Cannot complete exercise. Some sets are missing.')
    }

    const exceededFlags = [...setLogMap.values()] // ensure order by set index
      .sort((a, b) => a.setIndex - b.setIndex)
      .map((setLog) => setLog.exceededRange)

    const streakEligible = this.streakEligibility.get(payload.programExerciseId) ?? true
    const streakPoints = streakEligible ? exerciseStreakBonus(true) : 0

    const totalSetPoints = exceededFlags.reduce<number>((sum, exceeded) => {
      return sum + pointsForSet(BASE_POINTS_PER_SET, exceeded)
    }, 0)

    const totalPoints = totalSetPoints + streakPoints
    const pointsDelta = totalPoints - exerciseLog.pointsEarned

    const nowIso = new Date().toISOString()
    const updatedLog: ExerciseLog = {
      ...exerciseLog,
      completedSets,
      allSetsComplete: true,
      pointsEarned: exerciseLog.pointsEarned + pointsDelta,
      updatedAt: nowIso,
    }

    this.exerciseLogs.set(payload.programExerciseId, updatedLog)
    this.streakEligibility.set(payload.programExerciseId, true)

    return {
      updatedExerciseLog: { ...updatedLog },
      pointsDelta,
    }
  }

  async skipExercise(payload: CompleteExercisePayload): Promise<CompleteExerciseResponse> {
    await this.wait()
    const exerciseLog = this.requireExerciseLog(payload.programExerciseId)
    const nowIso = new Date().toISOString()
    const updated: ExerciseLog = {
      ...exerciseLog,
      allSetsComplete: false,
      completedSets: exerciseLog.completedSets,
      updatedAt: nowIso,
    }
    this.exerciseLogs.set(payload.programExerciseId, updated)
    this.streakEligibility.set(payload.programExerciseId, false)
    return {
      updatedExerciseLog: { ...updated },
      pointsDelta: 0,
    }
  }

  private countCompletedSets(map: Map<number, SetLog>): number {
    return [...map.values()].length
  }

  private requireExerciseLog(programExerciseId: string): ExerciseLog {
    const log = this.exerciseLogs.get(programExerciseId)
    if (!log) {
      throw new Error('Exercise log not found')
    }
    return log
  }

  private getSetLogs(programExerciseId: string): SetLog[] {
    const map = this.setLogs.get(programExerciseId)
    if (!map) return []
    return [...map.values()].sort((a, b) => a.setIndex - b.setIndex)
  }
}

export const workoutRepo = new InMemoryWorkoutRepo()
