export type WeekIndex = number
export type SetIndex = number

export interface ProgramExercise {
  id: string
  name: string
  order: number
  targetRepMin: number
  targetRepMax: number
  prescribedSets: number
}

export interface ProgramDay {
  id: string
  week: WeekIndex
  dateISO: string
  exercises: ProgramExercise[]
}

export interface SetLog {
  id: string
  programExerciseId: string
  exerciseLogId: string
  setIndex: SetIndex
  reps: number
  weight: number
  comment?: string | null
  exceededRange: boolean
  createdAt: string
}

export interface ExerciseLog {
  id: string
  programDayId: string
  programExerciseId: string
  completedSets: number
  allSetsComplete: boolean
  pointsEarned: number
  createdAt: string
  updatedAt: string
  leftExerciseViewAt?: string | null
}

export interface SaveSetPayload {
  programExerciseId: string
  setIndex: SetIndex
  reps: number
  weight: number
  comment?: string
}

export interface SaveSetResponse {
  setLog: SetLog
  updatedExerciseLog: ExerciseLog
  pointsDelta: number
}

export interface CompleteExercisePayload {
  programExerciseId: string
}

export interface CompleteExerciseResponse {
  updatedExerciseLog: ExerciseLog
  pointsDelta: number
}

export interface ExerciseLogResult {
  exerciseLog: ExerciseLog
  setLogs: SetLog[]
}

export interface MarkExerciseLeftViewPayload {
  programExerciseId: string
  leftAtISO: string
}

export type ExerciseFlowState =
  | 'IDLE'
  | `EDITING_SET_${number}`
  | `SAVING_SET_${number}`
  | 'SUCCESS'
  | 'ERROR'
  | 'EXERCISE_COMPLETE'
  | 'READY_FOR_NEXT'

export interface WorkoutFlowCopy {
  header: {
    weekPrefix: string
    progressLabel: string
    exit: string
  }
  actions: {
    next: string
    back: string
    skip: string
    skipConfirmTitle: string
    skipConfirmBody: string
    skipConfirmYes: string
    skipConfirmNo: string
    saveSet: string
    updateSet: string
    editSet: string
    resume: string
  }
  labels: {
    reps: string
    weight: string
    commentPlaceholder: string
    addComment: string
    hideComment: string
    repRange: (min: number, max: number) => string
    beyondRange: string
    optional: string
    completed: string
  }
  feedback: {
    setComplete: string
    exerciseComplete: string
    streakBonus: string
    pointsAwarded: (points: number) => string
  }
  errors: {
    generic: string
    repsRequired: string
    weightRequired: string
    saveFailed: string
  }
}
