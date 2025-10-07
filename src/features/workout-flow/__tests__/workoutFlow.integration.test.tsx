import { describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkoutFlowScreen } from '../components/WorkoutFlowScreen'
import { renderWorkoutFlow } from '../../../test/test-utils'

async function completeActiveSet(
  user: ReturnType<typeof userEvent.setup>,
  {
    setIndex,
    reps,
    weight,
  }: {
    setIndex: number
    reps: number
    weight: number
  },
) {
  const card = await screen.findByTestId(`set-card-${setIndex}`)
  const repsInput = within(card).getByLabelText(/Reps/i) as HTMLInputElement
  const weightInput = within(card).getByLabelText(/Weight/i) as HTMLInputElement
  const saveButton = within(card).getByRole('button', { name: /Save set|Update set/i })

  await user.clear(repsInput)
  await user.type(repsInput, String(reps))
  await user.clear(weightInput)
  await user.type(weightInput, String(weight))
  await user.click(saveButton)
}

describe('Workout flow happy path', () => {
  it('lets the user complete the first exercise and auto-advances', async () => {
    const user = userEvent.setup()

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)

    try {
      renderWorkoutFlow(<WorkoutFlowScreen onExit={() => {}} />)

      await screen.findByText('Barbell Squat')

      await completeActiveSet(user, { setIndex: 1, reps: 8, weight: 100 })
      await waitFor(() => expect(screen.getByText(/^10 pts$/)).toBeInTheDocument())

      await completeActiveSet(user, { setIndex: 2, reps: 9, weight: 105 })
      await waitFor(() => expect(screen.getByText(/^20 pts$/)).toBeInTheDocument())

      await completeActiveSet(user, { setIndex: 3, reps: 10, weight: 110 })
      await waitFor(() => expect(screen.getByText(/^30 pts$/)).toBeInTheDocument())

      await completeActiveSet(user, { setIndex: 4, reps: 11, weight: 115 })
      await waitFor(() => expect(screen.getByText(/^45 pts$/)).toBeInTheDocument())
      await waitFor(() => expect(screen.getAllByText(/Beyond range/i).length).toBeGreaterThan(0))

      await waitFor(() => expect(screen.getByText(/All sets completed/i)).toBeInTheDocument())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1700))
      })
      await waitFor(() => expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument())

      expect(alertSpy).not.toHaveBeenCalled()
      expect(confirmSpy).not.toHaveBeenCalled()
    } finally {
      alertSpy.mockRestore()
      confirmSpy.mockRestore()
    }
  })
})
