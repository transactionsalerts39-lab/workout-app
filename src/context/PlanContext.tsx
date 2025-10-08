import { createContext, useContext, useMemo } from 'react'
import { generatedPlan } from '../data/generatedPlan'
import type { PlanExercise, PlanExerciseWeek, WorkoutPlan } from '../types/plan'

export interface SessionExerciseView {
  exerciseId: string
  name: string
  bodyPart: string
  order: string
  notes?: string
  rest?: string
  prescribedSets: number
  repRange?: { min: number; max: number } | null
  plannedSets: string[]
  comment?: string
}

export interface WeekSessionView {
  sessionId: string
  dayTitle: string
  focusLabel: string
  plannedDate?: string | null
  exercises: SessionExerciseView[]
}

export interface WeekView {
  weekIndex: number
  label: string
  sessions: WeekSessionView[]
}

interface PlanContextValue {
  plan: WorkoutPlan
  weeks: WeekView[]
  totalSessions: number
  findSession: (weekIndex: number, sessionId: string) => WeekSessionView | undefined
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined)

function extractFocusLabel(title: string): string {
  const [, focus = title] = title.split(':').map((part) => part.trim())
  return focus
}

function toSessionExercise(exercise: PlanExercise, week: PlanExerciseWeek): SessionExerciseView {
  const prescribedSets = exercise.prescribedSets ?? week.sets.length
  return {
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    bodyPart: exercise.bodyPart,
    order: exercise.order,
    notes: exercise.notes,
    rest: exercise.rest,
    prescribedSets,
    repRange: exercise.repRange,
    plannedSets: [...week.sets],
    comment: week.comment,
  }
}

function buildWeeks(plan: WorkoutPlan): WeekView[] {
  const weeks: WeekView[] = []

  for (let index = 1; index <= plan.totalWeeks; index += 1) {
    const sessions: WeekSessionView[] = plan.days.map((day) => {
      const exercisesForWeek = day.exercises
        .map((exercise) => {
          const weekEntry = exercise.weeks.find((w) => w.weekIndex === index)
          if (!weekEntry) return undefined
          return toSessionExercise(exercise, weekEntry)
        })
        .filter((value): value is SessionExerciseView => Boolean(value))

      const plannedDate = day.exercises
        .map((exercise) => exercise.weeks.find((w) => w.weekIndex === index)?.plannedDate)
        .find((date) => Boolean(date))

      return {
        sessionId: day.dayId,
        dayTitle: day.title,
        focusLabel: extractFocusLabel(day.title),
        plannedDate: plannedDate ?? null,
        exercises: exercisesForWeek,
      }
    })

    weeks.push({
      weekIndex: index,
      label: `Week ${index}`,
      sessions,
    })
  }

  return weeks
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<PlanContextValue>(() => {
    const plan: WorkoutPlan = generatedPlan
    const weeks = buildWeeks(plan)
    const sessionMap = new Map<string, WeekSessionView>()

    weeks.forEach((week) => {
      week.sessions.forEach((session) => {
        sessionMap.set(`${week.weekIndex}:${session.sessionId}`, session)
      })
    })

    return {
      plan,
      weeks,
      totalSessions: weeks.reduce((sum, week) => sum + week.sessions.length, 0),
      findSession: (weekIndex, sessionId) => sessionMap.get(`${weekIndex}:${sessionId}`),
    }
  }, [])

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlanContext(): PlanContextValue {
  const ctx = useContext(PlanContext)
  if (!ctx) {
    throw new Error('usePlanContext must be used within PlanProvider')
  }
  return ctx
}
