import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSet } from '../api'
import type { ExerciseLogResult, SaveSetPayload, SaveSetResponse } from '../types'

export function useSaveSet() {
  const queryClient = useQueryClient()

  return useMutation<SaveSetResponse, Error, SaveSetPayload>({
    mutationFn: (payload) => saveSet(payload),
    onSuccess: (response, variables) => {
      const cacheKey = ['exercise-log', variables.programExerciseId]
      const previous = queryClient.getQueryData<ExerciseLogResult>(cacheKey)
      if (!previous) return

      const updatedSetLogs = previous.setLogs.filter((log) => log.setIndex !== response.setLog.setIndex)

      queryClient.setQueryData<ExerciseLogResult>(cacheKey, {
        exerciseLog: response.updatedExerciseLog,
        setLogs: [...updatedSetLogs, response.setLog].sort((a, b) => a.setIndex - b.setIndex),
      })
    },
  })
}
