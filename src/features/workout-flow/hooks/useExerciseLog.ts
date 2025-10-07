import { useQuery } from '@tanstack/react-query'
import { getExerciseLog } from '../api'
import type { ExerciseLogResult } from '../types'

export function useExerciseLog(programExerciseId?: string) {
  return useQuery<ExerciseLogResult, Error>({
    queryKey: ['exercise-log', programExerciseId],
    queryFn: () => {
      if (!programExerciseId) {
        throw new Error('programExerciseId is required')
      }
      return getExerciseLog(programExerciseId)
    },
    enabled: Boolean(programExerciseId),
  })
}
