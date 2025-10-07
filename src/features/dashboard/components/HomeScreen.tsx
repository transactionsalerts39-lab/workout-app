import type { ProgramDay } from '../../workout-flow/types'
import { formatDateLabel } from '../../workout-flow/utils/dates'
import { workoutFlowCopy } from '../../workout-flow/constants/copy'

interface ClientProfile {
  name: string
  bodyWeightKg: number
  bodyFatPercent?: number
}

interface WeekStatPoint {
  label: string
  totalSets: number
  completedSets: number
}

interface HomeScreenProps {
  profile: ClientProfile
  activeProgramDay?: ProgramDay
  weekStats: WeekStatPoint[]
  onStartWorkout: () => void
}

const widgetStyles = 'rounded-3xl border border-slate-200 bg-white p-6 shadow-card'

export function HomeScreen({ profile, activeProgramDay, weekStats, onStartWorkout }: HomeScreenProps) {
  const progressPercentages = weekStats.map((point) => {
    if (point.totalSets === 0) return 0
    return Math.round((point.completedSets / point.totalSets) * 100)
  })

  const maxPercent = Math.max(100, ...progressPercentages)
  const sparklinePoints = weekStats
    .map((_, index) => {
      const x = (index / Math.max(weekStats.length - 1, 1)) * 100
      const y = 100 - (progressPercentages[index] / maxPercent) * 100
      return `${x},${y}`
    })
    .join(' ')
  const sparklinePath = sparklinePoints || '0,100 100,100'

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-indigo-600">Hey {profile.name}!</p>
        <h1 className="text-3xl font-semibold text-slate-900">Your training dashboard</h1>
        <p className="text-sm text-slate-500">
          {activeProgramDay
            ? `${workoutFlowCopy.header.weekPrefix} ${activeProgramDay.week} | ${formatDateLabel(activeProgramDay.dateISO)}`
            : 'Fetching your next session...'}
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1.4fr)] xl:grid-cols-[340px_1fr_1fr]">
        <article className={`${widgetStyles} flex flex-col gap-4`}>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Athlete profile</h2>
            <p className="text-2xl font-semibold text-slate-900">{profile.name}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="text-slate-500">Bodyweight</dt>
              <dd className="text-lg font-semibold text-slate-900">{profile.bodyWeightKg} kg</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-slate-500">Body fat</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {profile.bodyFatPercent != null ? `${profile.bodyFatPercent}%` : '—'}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onStartWorkout}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Start today&apos;s workout
          </button>
        </article>

        <article className={`${widgetStyles} flex flex-col gap-4`}> 
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">This week</h2>
              <p className="text-lg font-semibold text-slate-900">Sets completed</p>
            </div>
            <span className="text-xs font-medium text-slate-500">tap to preview</span>
          </header>
          <button
            type="button"
            onClick={onStartWorkout}
            className="group relative flex flex-1 flex-col rounded-2xl bg-slate-900/5 p-4 text-left transition hover:bg-indigo-50"
          >
            <svg viewBox="0 0 100 100" className="h-32 w-full">
              <polyline
                fill="none"
                stroke="#4f46e5"
                strokeWidth={4}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={sparklinePath}
                className="transition group-hover:stroke-indigo-500"
              />
            </svg>
            <div className="flex justify-between text-xs text-slate-500">
              {weekStats.map((point) => (
                <span key={point.label}>{point.label}</span>
              ))}
            </div>
            <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
              View session {'>'}
            </span>
          </button>
        </article>

        <article className={`${widgetStyles} flex flex-col gap-4`}> 
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Upcoming focus</h2>
          <ul className="flex flex-col gap-3 text-sm text-slate-600">
            {activeProgramDay?.exercises.map((exercise) => (
              <li key={exercise.id} className="flex items-center justify-between rounded-2xl bg-slate-900/5 px-4 py-3">
                <span className="font-semibold text-slate-800">{exercise.name}</span>
                <span className="text-xs font-medium text-slate-500">
                  {exercise.prescribedSets} sets | {exercise.targetRepMin}-{exercise.targetRepMax} reps
                </span>
              </li>
            ))}
            {activeProgramDay?.exercises.length ? null : (
              <li className="rounded-2xl bg-slate-900/5 px-4 py-3 text-slate-500">No session planned yet.</li>
            )}
          </ul>
        </article>
      </section>
    </div>
  )
}
