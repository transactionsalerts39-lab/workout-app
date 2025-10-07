import { useEffect, useMemo, useRef, useState } from 'react'
import { useExerciseLog } from '../hooks/useExerciseLog'
import { useSaveSet } from '../hooks/useSaveSet'
import { useCompleteExercise } from '../hooks/useCompleteExercise'
import { useSkipExercise } from '../hooks/useSkipExercise'
import { workoutFlowCopy } from '../constants/copy'
import { useWorkoutFlowContext } from '../context/WorkoutFlowContext'
import type {
  ExerciseFlowState,
  ProgramExercise,
  SaveSetPayload,
  SetLog,
} from '../types'
import { editingStateForSet, savingStateForSet } from '../utils/stateMachine'
import { ExerciseCard } from './ExerciseCard'

const AUTO_ADVANCE_DELAY_MS = 1500

export function ExerciseCarousel() {
  const {
    programDay,
    isLoading,
    error,
    activeExerciseIndex,
    goNextExercise,
    goPreviousExercise,
    isFirstExercise,
    isLastExercise,
  } = useWorkoutFlowContext()

  const currentExercise: ProgramExercise | undefined = programDay?.exercises[activeExerciseIndex]

  const { data: exerciseLogResult, isLoading: isExerciseLogLoading } = useExerciseLog(currentExercise?.id)
  const saveSetMutation = useSaveSet()
  const completeExerciseMutation = useCompleteExercise()
  const skipExerciseMutation = useSkipExercise()

  const [flowState, setFlowState] = useState<ExerciseFlowState>('IDLE')
  const [activeSetIndex, setActiveSetIndex] = useState<number>(1)
  const [confettiVisible, setConfettiVisible] = useState(false)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!exerciseLogResult || !currentExercise) return
    const completedSetIndexes = new Set(exerciseLogResult.setLogs.map((log) => log.setIndex))
    const nextUnfilled = findNextIncompleteSet(currentExercise.prescribedSets, completedSetIndexes)
    setActiveSetIndex(nextUnfilled)
    setFlowState(editingStateForSet(nextUnfilled))
  }, [currentExercise, exerciseLogResult])

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current)
        autoAdvanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!currentExercise) return
    if (!exerciseLogResult) return
    if (!exerciseLogResult.exerciseLog.allSetsComplete) return

    setConfettiVisible(true)
    autoAdvanceRef.current = setTimeout(() => {
      setConfettiVisible(false)
      goNextExercise()
    }, AUTO_ADVANCE_DELAY_MS)
  }, [exerciseLogResult, currentExercise, goNextExercise])

  const sortedSetLogs = useMemo<SetLog[]>(() => {
    if (!exerciseLogResult) return []
    return [...exerciseLogResult.setLogs].sort((a, b) => a.setIndex - b.setIndex)
  }, [exerciseLogResult])

  const handleSaveSet = async (payload: SaveSetPayload) => {
    setFlowState(savingStateForSet(payload.setIndex))
    try {
      await saveSetMutation.mutateAsync(payload)
      setFlowState('SUCCESS')
      const nextIndex = payload.setIndex + 1
      setActiveSetIndex(nextIndex)
      if (currentExercise && nextIndex > currentExercise.prescribedSets) {
        setFlowState('EXERCISE_COMPLETE')
      } else {
        setFlowState(editingStateForSet(nextIndex))
      }
    } catch (error_) {
      console.error(error_)
      setFlowState('ERROR')
      setFlowState(editingStateForSet(payload.setIndex))
      throw error_
    }
  }

  const handleCompleteExercise = async () => {
    if (!currentExercise) return
    await completeExerciseMutation.mutateAsync({ programExerciseId: currentExercise.id })
  }

  const handleSkipExercise = async () => {
    if (!currentExercise) return
    await skipExerciseMutation.mutateAsync({ programExerciseId: currentExercise.id })
    goNextExercise()
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-card">
        <div className="text-sm font-medium text-slate-500">Loading workout...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-card">
        <p className="text-red-600">{error.message}</p>
      </div>
    )
  }

  if (!programDay || !currentExercise) {
    return null
  }

  return (
    <ExerciseCard
      copy={workoutFlowCopy}
      exercise={currentExercise}
      exerciseLogResult={exerciseLogResult}
      isExerciseLogLoading={isExerciseLogLoading || saveSetMutation.isPending}
      flowState={flowState}
      activeSetIndex={activeSetIndex}
      onSetActiveIndex={setActiveSetIndex}
      onSaveSet={handleSaveSet}
      onCompleteExercise={handleCompleteExercise}
      onSkipExercise={handleSkipExercise}
      goNextExercise={goNextExercise}
      goPreviousExercise={goPreviousExercise}
      isFirstExercise={isFirstExercise}
      isLastExercise={isLastExercise}
      confettiVisible={confettiVisible}
      totalExercises={programDay.exercises.length}
      exerciseIndex={activeExerciseIndex}
      setLogs={sortedSetLogs}
      isCompleting={completeExerciseMutation.isPending}
      isSkipping={skipExerciseMutation.isPending}
      week={programDay.week}
      dateISO={programDay.dateISO}
    />
  )
}

function findNextIncompleteSet(prescribedSets: number, completedSetIndexes: Set<number>): number {
  for (let index = 1; index <= prescribedSets; index += 1) {
    if (!completedSetIndexes.has(index)) {
      return index
    }
  }
  return prescribedSets + 1
}
