import { useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { usePlanContext } from '../../context/PlanContext'
import { useProgressContext } from '../../context/ProgressContext'

interface WorkoutSessionViewProps {
  weekIndex: number
  sessionId: string
  onBack: () => void
}

type ExerciseFormState = {
  setEntries: string
  notes: string
}

function normaliseLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function WorkoutSessionView({ weekIndex, sessionId, onBack }: WorkoutSessionViewProps) {
  const { user } = useAuthContext()
  const { findSession } = usePlanContext()
  const { getExerciseProgress, updateExerciseProgress, markExerciseUsingPlan } = useProgressContext()
  const [savedExerciseIds, setSavedExerciseIds] = useState<Set<string>>(new Set())

  const session = useMemo(() => findSession(weekIndex, sessionId), [findSession, weekIndex, sessionId])

  const [forms, setForms] = useState<Record<string, ExerciseFormState>>({})

  useEffect(() => {
    if (!session || !user) return

    const nextState: Record<string, ExerciseFormState> = {}
    session.exercises.forEach((exercise) => {
      const progress = getExerciseProgress(user.id, weekIndex, session.sessionId, exercise.exerciseId)
      nextState[exercise.exerciseId] = {
        setEntries: (progress?.setEntries ?? exercise.plannedSets).join('\n'),
        notes: progress?.notes ?? exercise.comment ?? '',
      }
    })
    setForms(nextState)
    setSavedExerciseIds(new Set())
  }, [session, user, weekIndex, getExerciseProgress])

  if (!session || !user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">We couldn&apos;t locate that workout session.</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  const handleSave = async (exerciseId: string) => {
    const form = forms[exerciseId]
    if (!form) return
    const entries = normaliseLines(form.setEntries)
    const exercise = session.exercises.find((item) => item.exerciseId === exerciseId)
    if (!exercise) return

    try {
      await updateExerciseProgress({
        userId: user.id,
        weekIndex,
        sessionId: session.sessionId,
        exercise,
        setEntries: entries,
        notes: form.notes.trim() || undefined,
      })
      setSavedExerciseIds((previous) => new Set(previous).add(exerciseId))
    } catch (error) {
      console.error('Failed to save exercise progress', error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <button type="button" className="text-sm font-medium text-indigo-600" onClick={onBack}>
            ← Back
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await markExerciseUsingPlan(user.id, weekIndex, session)
                const nextForms: Record<string, ExerciseFormState> = {}
                session.exercises.forEach((exercise) => {
                  nextForms[exercise.exerciseId] = {
                    setEntries: exercise.plannedSets.join('\n'),
                    notes: exercise.comment ?? '',
                  }
                })
                setForms(nextForms)
                setSavedExerciseIds(new Set(session.exercises.map((exercise) => exercise.exerciseId)))
              } catch (error) {
                console.error('Failed to apply coach plan for session', error)
              }
            }}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            Log from coach plan
          </button>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{session.dayTitle}</h1>
        <p className="text-sm text-slate-500">
          Week {weekIndex} · Focus {session.focusLabel}
          {session.plannedDate ? ` · Suggested date ${session.plannedDate}` : ''}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        {session.exercises.map((exercise) => {
          const form = forms[exercise.exerciseId] ?? { setEntries: '', notes: '' }
          const saved = savedExerciseIds.has(exercise.exerciseId)
          return (
            <article
              key={exercise.exerciseId}
              className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-card"
            >
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {exercise.order ? `${exercise.order}. ` : ''}
                    {exercise.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Target {exercise.prescribedSets} sets
                    {exercise.repRange ? ` · ${exercise.repRange.min}-${exercise.repRange.max} reps` : ''}
                    {exercise.rest ? ` · Rest ${exercise.rest}` : ''}
                  </p>
                </div>
                {saved ? <span className="text-xs font-semibold text-emerald-600">Saved</span> : null}
              </header>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Coach prescription</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  {exercise.plannedSets.length ? (
                    exercise.plannedSets.map((setValue, index) => (
                      <span key={index} className="rounded-full bg-slate-900/5 px-3 py-1">
                        Set {index + 1}: {setValue}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-900/5 px-3 py-1">No data recorded</span>
                  )}
                </div>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-700">Your set log</span>
                <textarea
                  value={form.setEntries}
                  onChange={(event) =>
                    setForms((previous) => ({
                      ...previous,
                      [exercise.exerciseId]: {
                        setEntries: event.target.value,
                        notes: previous[exercise.exerciseId]?.notes ?? '',
                      },
                    }))
                  }
                  placeholder="Example: 20*12\n20*12"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-700">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForms((previous) => ({
                      ...previous,
                      [exercise.exerciseId]: {
                        setEntries: previous[exercise.exerciseId]?.setEntries ?? '',
                        notes: event.target.value,
                      },
                    }))
                  }
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForms((previous) => ({
                      ...previous,
                      [exercise.exerciseId]: {
                        setEntries: exercise.plannedSets.join('\n'),
                        notes: exercise.comment ?? '',
                      },
                    }))
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Use coach plan
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(exercise.exerciseId)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Save progress
                </button>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
