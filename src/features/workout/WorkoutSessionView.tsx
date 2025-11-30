import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Textarea } from '../../components/ui/textarea'
import { usePlanContext, type SessionExerciseView } from '../../context/PlanContext'
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

type ExerciseChecklistState = Record<string, boolean[]>

function normaliseLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function createChecklist(exercise: SessionExerciseView, completedSets: number): boolean[] {
  const total = Math.max(exercise.prescribedSets, exercise.plannedSets.length, completedSets, 1)
  return Array.from({ length: total }, (_, index) => index < completedSets)
}

function buildSetEntries(exercise: SessionExerciseView, completedSets: number, previousEntries: string[] = []): string[] {
  if (completedSets <= 0) return []
  if (previousEntries.length >= completedSets) {
    return previousEntries.slice(0, completedSets)
  }
  const baseEntries = exercise.plannedSets.length
    ? exercise.plannedSets
    : Array.from({ length: exercise.prescribedSets }, (_, index) => `Set ${index + 1}`)
  const filled = [...previousEntries]
  for (let index = previousEntries.length; index < completedSets; index += 1) {
    filled.push(baseEntries[index] ?? `Set ${index + 1}`)
  }
  return filled.slice(0, completedSets)
}

export function WorkoutSessionView({ weekIndex, sessionId, onBack }: WorkoutSessionViewProps) {
  const { user } = useAuthContext()
  const { findSession } = usePlanContext()
  const { getExerciseProgress, updateExerciseProgress, markExerciseUsingPlan } = useProgressContext()
  const [savedExerciseIds, setSavedExerciseIds] = useState<Set<string>>(new Set())
  const [checklists, setChecklists] = useState<ExerciseChecklistState>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastAutoSave, setLastAutoSave] = useState<number | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const session = useMemo(() => findSession(weekIndex, sessionId), [findSession, weekIndex, sessionId])

  const [forms, setForms] = useState<Record<string, ExerciseFormState>>({})

  useEffect(() => {
    if (!session || !user) return

    const nextState: Record<string, ExerciseFormState> = {}
    const nextChecklist: ExerciseChecklistState = {}
    session.exercises.forEach((exercise) => {
      const progress = getExerciseProgress(user.id, weekIndex, session.sessionId, exercise.exerciseId)
      const completedSets = progress?.completedSets ?? 0
      const checklist = createChecklist(exercise, completedSets)
      nextChecklist[exercise.exerciseId] = checklist
      const entries = buildSetEntries(exercise, completedSets, progress?.setEntries ?? [])
      nextState[exercise.exerciseId] = {
        setEntries: entries.join('\n'),
        notes: progress?.notes ?? exercise.comment ?? '',
      }
    })
    setForms(nextState)
    setChecklists(nextChecklist)
    setSavedExerciseIds(new Set())
    setHasUnsavedChanges(false)
  }, [session, user, weekIndex, getExerciseProgress])

  // Auto-save every 30 seconds when there are unsaved changes
  const saveAllProgress = useCallback(async () => {
    if (!session || !user) return
    
    const unsavedExercises = session.exercises.filter(
      (exercise) => !savedExerciseIds.has(exercise.exerciseId)
    )
    
    for (const exercise of unsavedExercises) {
      const form = forms[exercise.exerciseId]
      if (!form) continue
      const entries = normaliseLines(form.setEntries)
      try {
        await updateExerciseProgress({
          userId: user.id,
          weekIndex,
          sessionId: session.sessionId,
          exercise,
          setEntries: entries,
          notes: form.notes.trim() || undefined,
        })
        setSavedExerciseIds((prev) => new Set(prev).add(exercise.exerciseId))
      } catch (error) {
        console.error('Auto-save failed for exercise', exercise.exerciseId, error)
      }
    }
    setHasUnsavedChanges(false)
    setLastAutoSave(Date.now())
  }, [session, user, weekIndex, forms, savedExerciseIds, updateExerciseProgress])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveAllProgress()
    }, 30000) // 30 seconds

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [hasUnsavedChanges, saveAllProgress])

  if (!session || !user) {
    return (
      <div className="surface-panel flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-neutral-300/80">We couldn&apos;t locate that workout session.</p>
        <Button size="sm" variant="secondary" onClick={onBack}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  const handleToggleSet = (exercise: SessionExerciseView, setIndex: number) => {
    setChecklists((previous) => {
      const current = previous[exercise.exerciseId] ?? createChecklist(exercise, 0)
      const next = [...current]
      const targetValue = !next[setIndex]

      if (targetValue) {
        for (let index = 0; index <= setIndex; index += 1) {
          next[index] = true
        }
      } else {
        for (let index = setIndex; index < next.length; index += 1) {
          next[index] = false
        }
      }

      const completedSets = next.filter(Boolean).length

      setForms((prevForms) => {
        const existing = normaliseLines(prevForms[exercise.exerciseId]?.setEntries ?? '')
        const entries = buildSetEntries(exercise, completedSets, existing)
        return {
          ...prevForms,
          [exercise.exerciseId]: {
            setEntries: entries.join('\n'),
            notes: prevForms[exercise.exerciseId]?.notes ?? '',
          },
        }
      })

      setSavedExerciseIds((prev) => {
        const nextSaved = new Set(prev)
        nextSaved.delete(exercise.exerciseId)
        return nextSaved
      })
      
      setHasUnsavedChanges(true)

      return {
        ...previous,
        [exercise.exerciseId]: next,
      }
    })
  }

  // Complete all sets for an exercise at once
  const handleCompleteAllSets = (exercise: SessionExerciseView) => {
    const totalSets = Math.max(exercise.prescribedSets, exercise.plannedSets.length, 1)
    const completedChecklist = Array(totalSets).fill(true)
    
    setChecklists((previous) => ({
      ...previous,
      [exercise.exerciseId]: completedChecklist,
    }))

    setForms((prevForms) => {
      const entries = buildSetEntries(exercise, totalSets, exercise.plannedSets)
      return {
        ...prevForms,
        [exercise.exerciseId]: {
          setEntries: entries.join('\n'),
          notes: prevForms[exercise.exerciseId]?.notes ?? exercise.comment ?? '',
        },
      }
    })

    setSavedExerciseIds((prev) => {
      const nextSaved = new Set(prev)
      nextSaved.delete(exercise.exerciseId)
      return nextSaved
    })
    
    setHasUnsavedChanges(true)
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
      <header className="surface-card flex flex-col gap-4 border-white/10 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="w-full sm:w-auto">
            ← Back
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                await markExerciseUsingPlan(user.id, weekIndex, session)
                const nextForms: Record<string, ExerciseFormState> = {}
                const nextChecklist: ExerciseChecklistState = {}
                session.exercises.forEach((exercise) => {
                  const completedSets = Math.max(exercise.prescribedSets, exercise.plannedSets.length)
                  nextChecklist[exercise.exerciseId] = createChecklist(exercise, completedSets)
                  nextForms[exercise.exerciseId] = {
                    setEntries: buildSetEntries(exercise, completedSets, exercise.plannedSets).join('\n'),
                    notes: exercise.comment ?? '',
                  }
                })
                setForms(nextForms)
                setChecklists(nextChecklist)
                setSavedExerciseIds(new Set(session.exercises.map((exercise) => exercise.exerciseId)))
              } catch (error) {
                console.error('Failed to apply coach plan for session', error)
              }
            }}
            className="w-full sm:w-auto"
          >
            Log from coach plan
          </Button>
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold text-neutral-50">{session.dayTitle}</h1>
          <p className="mt-2 text-sm text-neutral-300/80">
            Week {weekIndex} · Focus {session.focusLabel}
            {session.plannedDate ? ` · Suggested date ${session.plannedDate}` : ''}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        {session.exercises.map((exercise) => {
          const form = forms[exercise.exerciseId] ?? { setEntries: '', notes: '' }
          const saved = savedExerciseIds.has(exercise.exerciseId)
          const checklist = checklists[exercise.exerciseId] ?? createChecklist(exercise, 0)
          const completedSets = checklist.filter(Boolean).length
          const totalSets = checklist.length
          return (
            <article
              key={exercise.exerciseId}
              className="surface-card flex flex-col gap-4 border-white/10 p-6"
            >
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-neutral-50">
                    {exercise.order ? `${exercise.order}. ` : ''}
                    {exercise.name}
                  </p>
                  <p className="text-xs text-neutral-300/80">
                    Target {exercise.prescribedSets} sets
                    {exercise.repRange ? ` · ${exercise.repRange.min}-${exercise.repRange.max} reps` : ''}
                    {exercise.rest ? ` · Rest ${exercise.rest}` : ''}
                  </p>
                </div>
                {saved ? <Badge variant="success" className="text-[10px]">Saved</Badge> : null}
              </header>

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Coach prescription</p>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-300/80">
                  {exercise.plannedSets.length ? (
                    exercise.plannedSets.map((setValue, index) => (
                      <span key={index} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        Set {index + 1}: {setValue}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">No data recorded</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Track sets</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCompleteAllSets(exercise)}
                    disabled={completedSets === totalSets}
                    className="h-7 text-xs text-brand-400 hover:text-brand-300 disabled:text-neutral-500"
                  >
                    Complete All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-[420px]:grid-cols-1">
                  {checklist.map((checked, index) => {
                    const optionClass = checked
                      ? 'border-brand-400/60 bg-brand-500/20 text-neutral-50'
                      : 'border-white/10 bg-white/5 text-neutral-300/80'
                    return (
                      <label
                        key={`${exercise.exerciseId}_${index}`}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium transition ${optionClass} hover:border-brand-300 hover:bg-brand-500/15 hover:text-neutral-100 min-h-[44px]`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleSet(exercise, index)}
                          className="size-4 accent-brand-500"
                        />
                        <span>Set {index + 1}</span>
                      </label>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <p>Completed {completedSets} of {totalSets} sets.</p>
                  {hasUnsavedChanges ? (
                    <p className="text-amber-400">Unsaved changes (auto-save in 30s)</p>
                  ) : lastAutoSave ? (
                    <p className="text-emerald-400">Auto-saved</p>
                  ) : null}
                </div>
              </div>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-neutral-200">Notes</span>
                <Textarea
                  value={form.notes}
                  onChange={(event) => {
                    const value = event.target.value
                    setForms((previous) => ({
                      ...previous,
                      [exercise.exerciseId]: {
                        setEntries: previous[exercise.exerciseId]?.setEntries ?? '',
                        notes: value,
                      },
                    }))
                    setSavedExerciseIds((prev) => {
                      const next = new Set(prev)
                      next.delete(exercise.exerciseId)
                      return next
                    })
                  }}
                  rows={2}
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const completedSets = Math.max(exercise.prescribedSets, exercise.plannedSets.length)
                    setChecklists((previous) => ({
                      ...previous,
                      [exercise.exerciseId]: createChecklist(exercise, completedSets),
                    }))
                    setForms((previous) => ({
                      ...previous,
                      [exercise.exerciseId]: {
                        setEntries: buildSetEntries(exercise, completedSets, exercise.plannedSets).join('\n'),
                        notes: exercise.comment ?? previous[exercise.exerciseId]?.notes ?? '',
                      },
                    }))
                    setSavedExerciseIds((prev) => {
                      const next = new Set(prev)
                      next.delete(exercise.exerciseId)
                      return next
                    })
                  }}
                >
                  Use coach plan
                </Button>
                <Button type="button" onClick={() => handleSave(exercise.exerciseId)}>
                  Save progress
                </Button>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
