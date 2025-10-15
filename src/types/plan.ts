export interface WorkoutPlan {
  generatedAt: string
  sourceWorkbook: string
  totalWeeks: number
  days: PlanDay[]
}

export interface PlanDay {
  dayId: string
  title: string
  exercises: PlanExercise[]
}

export interface PlanExercise {
  exerciseId: string
  bodyPart: string
  order: string
  name: string
  prescribedSets: number | null
  repRangeRaw?: string
  rest?: string
  notes?: string
  repRange: RepRange | null
  weeks: PlanExerciseWeek[]
}

export interface PlanExerciseWeek {
  weekIndex: number
  plannedDate?: string | null
  rawDate?: string | null
  sets: string[]
  comment?: string
}

export interface RepRange {
  min: number
  max: number
}

export interface SessionProgress {
  completedSets: number
  totalSets: number
  lastUpdatedAt: string
  notes?: string
  setEntries: string[]
}

export interface UserSessionProgressMap {
  [exerciseId: string]: SessionProgress
}

export interface WeekProgressMap {
  [sessionId: string]: UserSessionProgressMap
}

export interface UserProgressRecord {
  userId: string
  username: string
  weeks: {
    [weekIndex: number]: WeekProgressMap
  }
}

export interface StoredUser {
  id: string
  username: string
  passwordHash: string
  salt: string
  displayName: string
  createdAt: string
  isAdmin: boolean
  avatarUrl: string | null
  planName: string
  billingInterval: string
  renewalDate: string
}

export interface AuthState {
  user?: StoredUser | null
  isLoading: boolean
}

export interface SignupPayload {
  username: string
  password: string
  displayName: string
}

export interface LoginPayload {
  username: string
  password: string
}

export type ScreenKey = 'auth' | 'dashboard' | 'admin' | 'workout'

export interface KeyedProgressSummary {
  userId: string
  username: string
  completedSessions: number
  totalSessions: number
  completionPercent: number
  lastActiveAt?: string
}
