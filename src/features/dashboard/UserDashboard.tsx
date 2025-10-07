import { useMemo } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { usePlanContext, type WeekSessionView } from '../../context/PlanContext'
import { useProgressContext } from '../../context/ProgressContext'
import type { UserSessionProgressMap } from '../../types/plan'

interface UserDashboardProps {
  weekIndex: number
  onSelectWeek: (weekIndex: number) => void
  onOpenSession: (weekIndex: number, sessionId: string) => void
}

type SessionState = 'pending' | 'in-progress' | 'completed'

function evaluateSessionState(session: WeekSessionView, sessionProgress?: UserSessionProgressMap): SessionState {
  if (!sessionProgress) return 'pending'

  const totals = session.exercises.length
  const completedExercises = session.exercises.reduce((sum, exercise) => {
    const progress = sessionProgress[exercise.exerciseId]
    if (!progress) return sum
    if (progress.completedSets >= exercise.prescribedSets) {
      return sum + 1
    }
    return sum
  }, 0)

  if (completedExercises === 0) return 'pending'
  if (completedExercises === totals) return 'completed'
  return 'in-progress'
}

function statusBadgeClass(state: SessionState): string {
  switch (state) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700'
    case 'in-progress':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function UserDashboard({ weekIndex, onSelectWeek, onOpenSession }: UserDashboardProps) {
  const { user } = useAuthContext()
  const { weeks } = usePlanContext()
  const { getUserProgress } = useProgressContext()

  const activeWeek = useMemo(() => weeks.find((week) => week.weekIndex === weekIndex) ?? weeks[0], [weekIndex, weeks])
  const weekProgress = user ? getUserProgress(user.id)?.weeks[activeWeek.weekIndex] : undefined

  const completionSummary = useMemo(() => {
    const totalSessions = activeWeek.sessions.length
    const completedSessions = activeWeek.sessions.reduce((sum, session) => {
      const state = evaluateSessionState(session, weekProgress?.[session.sessionId])
      return state === 'completed' ? sum + 1 : sum
    }, 0)
    const completionPercent = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0

    const totalSets = activeWeek.sessions.reduce((setTotal, session) => {
      return (
        setTotal +
        session.exercises.reduce((acc, exercise) => acc + exercise.prescribedSets, 0)
      )
    }, 0)

    return { completedSessions, totalSessions, completionPercent, totalSets }
  }, [activeWeek, weekProgress])

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="flex flex-col gap-1">
          <span className="text-sm font-medium text-indigo-600">{user?.displayName ?? 'Athlete'}</span>
          <h1 className="text-2xl font-semibold text-slate-900">Week {activeWeek.weekIndex} plan</h1>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sessions</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {completionSummary.completedSessions}/{completionSummary.totalSessions}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completion</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{completionSummary.completionPercent}%</p>
          </div>
          <div className="rounded-2xl bg-slate-900/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total sets</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{completionSummary.totalSets}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {weeks.map((week) => (
            <button
              key={week.weekIndex}
              type="button"
              onClick={() => onSelectWeek(week.weekIndex)}
              className={`rounded-full border px-4 py-1 text-sm transition ${
                week.weekIndex === activeWeek.weekIndex
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {week.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sessions this week</h2>
            <p className="text-sm text-slate-500">Tap a session to log your lifts and notes.</p>
          </div>
        </header>

        <div className="flex flex-col gap-3">
          {activeWeek.sessions.map((session) => {
            const sessionProgress = weekProgress?.[session.sessionId]
            const state = evaluateSessionState(session, sessionProgress)
            return (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => onOpenSession(activeWeek.weekIndex, session.sessionId)}
                className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{session.dayTitle}</p>
                    <p className="text-xs text-slate-500">Focus: {session.focusLabel}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(state)}`}>
                    {state.replace('-', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {session.exercises.length} exercises ·{' '}
                  {session.exercises.reduce((sum, exercise) => sum + exercise.prescribedSets, 0)} sets
                </p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
