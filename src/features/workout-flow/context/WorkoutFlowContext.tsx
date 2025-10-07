import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProgramDay } from '../hooks/useProgramDay'
import { useMarkExerciseLeftView } from '../hooks/useMarkExerciseLeftView'
import { getExerciseLog } from '../api'
import type { ExerciseLogResult, ProgramDay } from '../types'

interface WorkoutFlowProviderProps {
  dateISO: string
}

interface WorkoutFlowContextValue {
  dateISO: string
  programDay?: ProgramDay
  isLoading: boolean
  error?: Error | null
  activeExerciseIndex: number
  setActiveExerciseIndex: (index: number) => void
  goNextExercise: () => void
  goPreviousExercise: () => void
  isFirstExercise: boolean
  isLastExercise: boolean
  refetchDay: () => Promise<ProgramDay>
}

const WorkoutFlowContext = createContext<WorkoutFlowContextValue | undefined>(undefined)

export function WorkoutFlowProvider({ dateISO, children }: PropsWithChildren<WorkoutFlowProviderProps>) {
  const { data, isLoading, error, refetch } = useProgramDay(dateISO)
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0)
  const queryClient = useQueryClient()
  const { mutate: markLeftView, isPending: isMarkLeftPending } = useMarkExerciseLeftView()
  const previousExerciseIdRef = useRef<string | null>(null)
  const isFirstRenderRef = useRef(true)

  useEffect(() => {
    if (!data) return
    setActiveExerciseIndex(0)
  }, [data])

  useEffect(() => {
    if (!data) return
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      previousExerciseIdRef.current = data.exercises[0]?.id ?? null
      return
    }

    const previousExerciseId = previousExerciseIdRef.current
    const nextExerciseId = data.exercises[activeExerciseIndex]?.id

    if (previousExerciseId && previousExerciseId !== nextExerciseId) {
      const cacheKey = ['exercise-log', previousExerciseId]
      const exerciseLogResult = queryClient.getQueryData<ExerciseLogResult>(cacheKey)
      const shouldMarkLeft = exerciseLogResult && !exerciseLogResult.exerciseLog.allSetsComplete

      if (shouldMarkLeft && !isMarkLeftPending) {
        markLeftView({
          programExerciseId: previousExerciseId,
          leftAtISO: new Date().toISOString(),
        })
      }
    }

    previousExerciseIdRef.current = nextExerciseId ?? null
  }, [activeExerciseIndex, data, isMarkLeftPending, markLeftView, queryClient])

  useEffect(() => {
    if (!data) return
    const currentExerciseId = data.exercises[activeExerciseIndex]?.id
    const nextExerciseId = data.exercises[activeExerciseIndex + 1]?.id

    if (currentExerciseId) {
      queryClient.ensureQueryData({
        queryKey: ['exercise-log', currentExerciseId],
        queryFn: () => getExerciseLog(currentExerciseId),
      }).catch(() => {
        // handled by individual component queries
      })
    }

    if (nextExerciseId) {
      queryClient.prefetchQuery({
        queryKey: ['exercise-log', nextExerciseId],
        queryFn: () => getExerciseLog(nextExerciseId),
      }).catch(() => {
        // ignore prefetch errors
      })
    }
  }, [activeExerciseIndex, data, queryClient])

  const setActiveExerciseIndexSafe = useCallback(
    (nextIndex: number) => {
      if (!data) return
      const boundedIndex = Math.max(0, Math.min(nextIndex, data.exercises.length - 1))
      setActiveExerciseIndex(boundedIndex)
    },
    [data],
  )

  const goNextExercise = useCallback(() => {
    if (!data) return
    setActiveExerciseIndexSafe(activeExerciseIndex + 1)
  }, [activeExerciseIndex, data, setActiveExerciseIndexSafe])

  const goPreviousExercise = useCallback(() => {
    if (!data) return
    setActiveExerciseIndexSafe(activeExerciseIndex - 1)
  }, [activeExerciseIndex, data, setActiveExerciseIndexSafe])

  const value = useMemo<WorkoutFlowContextValue>(() => {
    const exerciseCount = data?.exercises.length ?? 0

    return {
      dateISO,
      programDay: data,
      isLoading,
      error: error ?? null,
      activeExerciseIndex,
      setActiveExerciseIndex: setActiveExerciseIndexSafe,
      goNextExercise,
      goPreviousExercise,
      isFirstExercise: activeExerciseIndex === 0,
      isLastExercise: activeExerciseIndex === Math.max(0, exerciseCount - 1),
      refetchDay: async () => {
        const result = await refetch()
        if (!result.data) {
          throw result.error ?? new Error('Failed to refetch program day')
        }
        return result.data
      },
    }
  }, [
    activeExerciseIndex,
    data,
    dateISO,
    error,
    goNextExercise,
    goPreviousExercise,
    isLoading,
    refetch,
    setActiveExerciseIndexSafe,
  ])

  return <WorkoutFlowContext.Provider value={value}>{children}</WorkoutFlowContext.Provider>
}

export function useWorkoutFlowContext(): WorkoutFlowContextValue {
  const ctx = useContext(WorkoutFlowContext)
  if (!ctx) {
    throw new Error('useWorkoutFlowContext must be used within WorkoutFlowProvider')
  }
  return ctx
}
