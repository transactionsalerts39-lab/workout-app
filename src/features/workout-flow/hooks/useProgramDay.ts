import { useQuery } from '@tanstack/react-query'
import { getProgramDay } from '../api'
import type { ProgramDay } from '../types'

export function useProgramDay(dateISO: string) {
  return useQuery<ProgramDay, Error>({
    queryKey: ['program-day', dateISO],
    queryFn: () => getProgramDay(dateISO),
  })
}
