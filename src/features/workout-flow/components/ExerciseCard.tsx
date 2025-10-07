import { useEffect, useMemo, useRef } from 'react'
import clsx from 'clsx'
import type {
  ExerciseFlowState,
  ExerciseLogResult,
  ProgramExercise,
  SaveSetPayload,
  SetLog,
  WorkoutFlowCopy,
} from '../types'
import { formatDateLabel } from '../utils/dates'
import { ConfettiBurst } from './ConfettiBurst'
import { SetCard } from './SetCard'

interface ExerciseCardProps {
  copy: WorkoutFlowCopy
  exercise: ProgramExercise
  exerciseLogResult?: ExerciseLogResult
  setLogs: SetLog[]
  activeSetIndex: number
  onSetActiveIndex: (index: number) => void
  flowState: ExerciseFlowState
  isExerciseLogLoading: boolean
  onSaveSet: (payload: SaveSetPayload) => Promise<void>
  onCompleteExercise: () => Promise<void>
  onSkipExercise: () => Promise<void>
  goNextExercise: () => void
  goPreviousExercise: () => void
  isFirstExercise: boolean
  isLastExercise: boolean
  confettiVisible: boolean
  totalExercises: number
  exerciseIndex: number
  week: number
  dateISO: string
  isCompleting: boolean
  isSkipping: boolean
}

export function ExerciseCard({
  copy,
  exercise,
  exerciseLogResult,
  setLogs,
  activeSetIndex,
  onSetActiveIndex,
  flowState,
  isExerciseLogLoading,
  onSaveSet,
  onCompleteExercise,
  onSkipExercise,
  goNextExercise,
  goPreviousExercise,
  isFirstExercise,
  isLastExercise,
  confettiVisible,
  totalExercises,
  exerciseIndex,
  week,
  dateISO,
  isCompleting,
  isSkipping,
}: ExerciseCardProps) {
  const completionTriggeredRef = useRef(false)

  const setLogMap = useMemo(() => {
    return new Map<number, SetLog>(setLogs.map((log) => [log.setIndex, log]))
  }, [setLogs])

  const completedLogs = useMemo(() => {
    return setLogs
      .filter((log) => log.setIndex < activeSetIndex)
      .sort((a, b) => a.setIndex - b.setIndex)
  }, [activeSetIndex, setLogs])

  const pointsEarned = exerciseLogResult?.exerciseLog.pointsEarned ?? 0
  const allSetsComplete = exerciseLogResult?.exerciseLog.allSetsComplete ?? false
  const completedSets = setLogs.length
  const totalSets = exercise.prescribedSets
  const activeSetInRange = activeSetIndex <= totalSets
  const activeSetLog = activeSetInRange ? setLogMap.get(activeSetIndex) : undefined
  const progressPercent = totalSets === 0 ? 0 : Math.min((completedSets / totalSets) * 100, 100)

  useEffect(() => {
    completionTriggeredRef.current = false
  }, [exercise.id])

  useEffect(() => {
    const hasAllSets = completedSets >= exercise.prescribedSets
    if (!hasAllSets) return
    if (completionTriggeredRef.current) return
    if (allSetsComplete) return

    completionTriggeredRef.current = true
    onCompleteExercise().catch((error) => {
      console.error('Failed to complete exercise', error)
      completionTriggeredRef.current = false
    })
  }, [completedSets, exercise.prescribedSets, onCompleteExercise, allSetsComplete])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (!isLastExercise && allSetsComplete) {
          goNextExercise()
        }
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (!isFirstExercise) {
          goPreviousExercise()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allSetsComplete, goNextExercise, goPreviousExercise, isFirstExercise, isLastExercise])

  const savingSetIndex = flowState.startsWith('SAVING_SET_')
    ? Number.parseInt(flowState.split('_').at(-1) ?? '0', 10)
    : null

  const activeSetIsSaving = savingSetIndex === activeSetIndex && isExerciseLogLoading

  const formattedDate = formatDateLabel(dateISO)
  const progressLabel = `${copy.header.progressLabel}: ${exerciseIndex + 1}/${totalExercises}`

  const handleSkip = async () => {
    const confirmSkip = window.confirm(`${copy.actions.skipConfirmTitle}\n${copy.actions.skipConfirmBody}`)
    if (!confirmSkip) return
    await onSkipExercise()
  }

  if (isExerciseLogLoading && !exerciseLogResult) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
        <p className="text-sm text-slate-500">Loading exercise...</p>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      <ConfettiBurst active={confettiVisible} />
      <header className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            {copy.header.weekPrefix} {week} | {formattedDate}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">{exercise.name}</h2>
          <p className="text-sm text-slate-500">{progressLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
            {copy.labels.repRange(exercise.targetRepMin, exercise.targetRepMax)}
          </span>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
            {pointsEarned} pts
          </span>
        </div>
      </header>

      <div className="px-6 py-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Sets progress</span>
              <span>
                {completedSets}/{exercise.prescribedSets}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {activeSetInRange ? (
            <SetCard
              setIndex={activeSetIndex}
              exerciseId={exercise.id}
              targetRepMax={exercise.targetRepMax}
              targetRepMin={exercise.targetRepMin}
              existingLog={activeSetLog}
              isActive={activeSetInRange}
              isSaving={activeSetIsSaving}
              onActivate={onSetActiveIndex}
              onSave={onSaveSet}
              copy={copy}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-green-200 bg-green-50 p-6 text-center">
              <p className="text-lg font-semibold text-green-700">All sets completed</p>
              <p className="text-sm text-green-600">Take a breath and advance when you are ready.</p>
            </div>
          )}

          {completedLogs.length ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed sets</h3>
              <div className="flex flex-wrap gap-2">
                {completedLogs.map((log) => (
                  <button
                    type="button"
                    key={log.id}
                    onClick={() => onSetActiveIndex(log.setIndex)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                  >
                    <span className="font-semibold text-slate-700">Set {log.setIndex}</span>
                    <span className="text-slate-500">{log.reps} reps @ {log.weight} kg</span>
                    {log.exceededRange ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        {copy.labels.beyondRange}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
                  allSetsComplete ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600',
                )}
              >
                {allSetsComplete ? copy.feedback.exerciseComplete : `${completedSets}/${exercise.prescribedSets} sets saved`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={goPreviousExercise}
                disabled={isFirstExercise}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copy.actions.back}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSkipping}
                className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copy.actions.skip}
              </button>
              <button
                type="button"
                onClick={goNextExercise}
                disabled={!allSetsComplete || isLastExercise || isCompleting}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {copy.actions.next}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
