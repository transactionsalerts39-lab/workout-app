import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { SaveSetPayload, SetLog, WorkoutFlowCopy } from '../types'
import { pointsForSet } from '../utils/points'

interface SetCardProps {
  setIndex: number
  exerciseId: string
  targetRepMax: number
  targetRepMin: number
  existingLog?: SetLog
  isActive: boolean
  isSaving: boolean
  onActivate: (index: number) => void
  onSave: (payload: SaveSetPayload) => Promise<void>
  copy: WorkoutFlowCopy
}

export function SetCard({
  setIndex,
  exerciseId,
  existingLog,
  isActive,
  isSaving,
  targetRepMax,
  targetRepMin,
  onActivate,
  onSave,
  copy,
}: SetCardProps) {
  const [reps, setReps] = useState<string>(existingLog ? String(existingLog.reps) : '')
  const [weight, setWeight] = useState<string>(existingLog ? String(existingLog.weight) : '')
  const [comment, setComment] = useState<string>(existingLog?.comment ?? '')
  const [showComment, setShowComment] = useState<boolean>(Boolean(existingLog?.comment))
  const [error, setError] = useState<string | null>(null)
  const [lastSavedExceeded, setLastSavedExceeded] = useState<boolean>(existingLog?.exceededRange ?? false)
  const [showPulse, setShowPulse] = useState(false)
  const lastLogIdRef = useRef<string | null>(existingLog?.id ?? null)

  useEffect(() => {
    if (!existingLog) return
    setReps(String(existingLog.reps))
    setWeight(String(existingLog.weight))
    setComment(existingLog.comment ?? '')
    setShowComment(Boolean(existingLog.comment))
    setLastSavedExceeded(existingLog.exceededRange)
  }, [existingLog])

  useEffect(() => {
    if (!existingLog?.id) return
    if (lastLogIdRef.current === existingLog.id) return
    lastLogIdRef.current = existingLog.id
    setShowPulse(true)
    const timeout = setTimeout(() => setShowPulse(false), 340)
    return () => clearTimeout(timeout)
  }, [existingLog?.id])

  useEffect(() => {
    if (!isActive) {
      return
    }
    setError(null)
  }, [isActive])

  useEffect(() => {
    if (!isActive) return
    setError(null)
  }, [isActive, reps, weight])

  const exceededPreview = useMemo(() => {
    const repsValue = Number.parseInt(reps, 10)
    if (Number.isNaN(repsValue)) return false
    return repsValue > targetRepMax
  }, [reps, targetRepMax])

  const isCompleted = Boolean(existingLog)
  const pointsEarned = useMemo(() => {
    if (!existingLog) return null
    return pointsForSet(undefined, existingLog.exceededRange)
  }, [existingLog])

  const handleToggleComment = () => {
    if (!showComment) {
      setShowComment(true)
    } else if (!comment) {
      setShowComment(false)
    }
  }

  const handleSave = async () => {
    if (!isActive) {
      onActivate(setIndex)
    }

    const repsValue = Number.parseInt(reps, 10)
    const weightValue = Number.parseFloat(weight)

    if (Number.isNaN(repsValue) || repsValue <= 0) {
      setError(copy.errors.repsRequired)
      return
    }

    if (Number.isNaN(weightValue) || weightValue < 0) {
      setError(copy.errors.weightRequired)
      return
    }

    setError(null)

    const payload: SaveSetPayload = {
      programExerciseId: exerciseId,
      setIndex,
      reps: repsValue,
      weight: weightValue,
      comment: comment ? comment.trim() : undefined,
    }

    await onSave(payload)
    setLastSavedExceeded(repsValue > targetRepMax)
  }

  const handleEdit = () => {
    onActivate(setIndex)
  }

  const showBeyondRangeBadge = lastSavedExceeded || exceededPreview

  const badgeText = showBeyondRangeBadge ? copy.labels.beyondRange : undefined

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSave().catch(() => {
        // validation errors handled locally
      })
    }
  }

  return (
    <div
      data-testid={`set-card-${setIndex}`}
      className={clsx(
        'relative flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition-all',
        isActive ? 'ring-2 ring-indigo-200' : 'opacity-70',
        isSaving ? 'opacity-75' : null,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={isCompleted ? copy.labels.completed : `Set ${setIndex}`}
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all',
              isCompleted
                ? 'border-green-500 bg-green-500/15 text-green-700'
                : 'border-indigo-200 bg-indigo-50 text-indigo-600',
              showPulse ? 'animate-pulseCheck' : null,
            )}
            onClick={handleEdit}
          >
            {isCompleted ? '✓' : setIndex}
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-700">Set {setIndex}</p>
            <p className="text-xs text-slate-500">
              Target {targetRepMin}-{targetRepMax} reps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pointsEarned !== null ? (
            <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
              +{pointsEarned} pts
            </span>
          ) : null}
          {badgeText ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
              {badgeText}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {copy.labels.reps}
          </span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            onFocus={() => onActivate(setIndex)}
            onKeyDown={handleKeyDown}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {copy.labels.weight}
          </span>
          <input
            type="number"
            min={0}
            step={0.5}
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            onFocus={() => onActivate(setIndex)}
            onKeyDown={handleKeyDown}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
            onClick={handleToggleComment}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">+</span>
            {showComment ? copy.labels.hideComment : copy.labels.addComment}
            {!existingLog ? (
              <span className="text-xs font-normal text-slate-400">{copy.labels.optional}</span>
            ) : null}
          </button>
        </div>
      </div>

      {showComment ? (
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Comment
          </span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={2}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder={copy.labels.commentPlaceholder}
          />
        </label>
      ) : null}

      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isActive}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {existingLog ? copy.actions.updateSet : copy.actions.saveSet}
        </button>
        {existingLog ? (
          <button
            type="button"
            onClick={handleEdit}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            {copy.actions.editSet}
          </button>
        ) : null}
      </div>
    </div>
  )
}
