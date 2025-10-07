import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { WorkoutFlowProvider } from '../features/workout-flow/context/WorkoutFlowContext'
import { programDayFixture } from '../features/workout-flow/constants/fixtures'

interface RenderWorkoutFlowOptions {
  dateISO?: string
  queryClient?: QueryClient
  renderOptions?: RenderOptions
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function renderWorkoutFlow(
  ui: ReactElement,
  { dateISO = programDayFixture.dateISO, queryClient = createTestQueryClient(), renderOptions }: RenderWorkoutFlowOptions = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <WorkoutFlowProvider dateISO={dateISO}>{children}</WorkoutFlowProvider>
    </QueryClientProvider>
  )

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}
