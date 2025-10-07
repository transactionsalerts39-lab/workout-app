import { workoutFlowCopy } from '../constants/copy'
import { ExerciseCarousel } from './ExerciseCarousel'
import { useWorkoutFlowContext } from '../context/WorkoutFlowContext'
import { formatDateLabel } from '../utils/dates'

interface WorkoutFlowScreenProps {
  onExit: () => void
}

export function WorkoutFlowScreen({ onExit }: WorkoutFlowScreenProps) {
  const { programDay } = useWorkoutFlowContext()

  const handleExitLater = () => {
    const shouldExit = window.confirm('Exit workout? Your progress is saved and you can resume later.')
    if (shouldExit) {
      onExit()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Workout Session</h1>
          <p className="text-sm text-slate-500">
            {programDay
              ? `Week ${programDay.week} | ${formatDateLabel(programDay.dateISO)}`
              : 'Loading program...'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExitLater}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          {workoutFlowCopy.header.exit}
        </button>
      </header>

      <ExerciseCarousel />
    </div>
  )
}
