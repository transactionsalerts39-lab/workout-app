import { useMutation, useQueryClient } from '@tanstack/react-query'
import { completeExercise } from '../api'
import type { CompleteExercisePayload, CompleteExerciseResponse, ExerciseLogResult } from '../types'

export function useCompleteExercise() {
  const queryClient = useQueryClient()

  return useMutation<CompleteExerciseResponse, Error, CompleteExercisePayload>({
    mutationFn: (payload) => completeExercise(payload),
    onSuccess: (response, variables) => {
      const cacheKey = ['exercise-log', variables.programExerciseId]
      const previous = queryClient.getQueryData<ExerciseLogResult>(cacheKey)
      if (!previous) return

      queryClient.setQueryData<ExerciseLogResult>(cacheKey, {
        exerciseLog: response.updatedExerciseLog,
        setLogs: previous.setLogs,
      })
    },
  })
}
