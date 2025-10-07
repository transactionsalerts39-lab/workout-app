import { useMutation, useQueryClient } from '@tanstack/react-query'
import { markExerciseLeftView } from '../api'
import type { ExerciseLogResult, MarkExerciseLeftViewPayload } from '../types'

export function useMarkExerciseLeftView() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MarkExerciseLeftViewPayload) => markExerciseLeftView(payload),
    onSuccess: (updatedExerciseLog, variables) => {
      const cacheKey = ['exercise-log', variables.programExerciseId]
      const previous = queryClient.getQueryData<ExerciseLogResult>(cacheKey)
      if (!previous) return

      queryClient.setQueryData<ExerciseLogResult>(cacheKey, {
        exerciseLog: updatedExerciseLog,
        setLogs: previous.setLogs,
      })
    },
  })
}
