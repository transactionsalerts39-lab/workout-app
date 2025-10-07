import { useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'

interface ExerciseDefinition {
  id: string
  name: string
  focus: string
  equipment: string
  pattern: string
  intensity: string
}

interface SelectedExercise extends ExerciseDefinition {
  week: number
  day: number
}

interface AthleteProfile {
  id: string
  name: string
  goal: string
  timezone: string
}

interface PlanHistoryRecord {
  id: string
  athleteId: string
  athleteName: string
  planName: string
  weeks: number
  startDate: string
  exerciseCount: number
  focusBreakdown: string[]
  createdAt: number
}

interface NotificationRecord {
  id: string
  athleteId: string
  athleteName: string
  message: string
  timestamp: number
  read: boolean
}

const EXERCISE_MODIFIERS = [
  '(Tempo)',
  '(Iso Hold)',
  '(Speed)',
  '(Contrast)',
  '(Regression)',
  '(Paused)',
  '(Assisted)',
  '(Single-Arm)',
  '(Cluster)',
  '(Drop Set)',
  '(Eccentric)',
  '(Power)',
  '(Complex)',
  '(Primer)',
  '(Stability)',
]

const BASE_EXERCISES: Array<Omit<ExerciseDefinition, 'id'>> = [
  { name: 'Back Squat', focus: 'Lower Body Strength', equipment: 'Barbell', pattern: 'Squat', intensity: 'Heavy' },
  { name: 'Bench Press', focus: 'Upper Body Strength', equipment: 'Barbell', pattern: 'Press', intensity: 'Moderate' },
  { name: 'Deadlift', focus: 'Posterior Chain', equipment: 'Barbell', pattern: 'Hinge', intensity: 'Heavy' },
  { name: 'Romanian Deadlift', focus: 'Hamstrings', equipment: 'Barbell', pattern: 'Hinge', intensity: 'Moderate' },
  { name: 'Pull-Up', focus: 'Upper Body Pull', equipment: 'Bodyweight', pattern: 'Pull', intensity: 'Bodyweight' },
  { name: 'Seated Row', focus: 'Upper Body Pull', equipment: 'Cable', pattern: 'Pull', intensity: 'Moderate' },
  { name: 'Split Squat', focus: 'Single-Leg Strength', equipment: 'Dumbbell', pattern: 'Lunge', intensity: 'Moderate' },
  { name: 'Hip Thrust', focus: 'Glute Power', equipment: 'Barbell', pattern: 'Bridge', intensity: 'Heavy' },
  { name: 'Box Jump', focus: 'Explosive Power', equipment: 'Plyo Box', pattern: 'Jump', intensity: 'Power' },
  { name: 'Medicine Ball Slam', focus: 'Core Power', equipment: 'Medicine Ball', pattern: 'Slam', intensity: 'Power' },
  { name: 'Plank', focus: 'Core Stability', equipment: 'Bodyweight', pattern: 'Hold', intensity: 'Stability' },
  { name: 'Hollow Rock', focus: 'Core Stability', equipment: 'Bodyweight', pattern: 'Hold', intensity: 'Stability' },
  { name: 'Farmer Carry', focus: 'Grip & Core', equipment: 'Kettlebell', pattern: 'Carry', intensity: 'Conditioning' },
  { name: 'Assault Bike', focus: 'Conditioning', equipment: 'Machine', pattern: 'Ride', intensity: 'Aerobic' },
  { name: 'Tempo Push-Up', focus: 'Upper Body Strength', equipment: 'Bodyweight', pattern: 'Press', intensity: 'Tempo' },
  { name: 'Trap Bar Deadlift', focus: 'Total Strength', equipment: 'Trap Bar', pattern: 'Hinge', intensity: 'Heavy' },
  { name: 'Overhead Press', focus: 'Shoulders', equipment: 'Barbell', pattern: 'Press', intensity: 'Moderate' },
  { name: 'Lat Pulldown', focus: 'Upper Body Pull', equipment: 'Cable', pattern: 'Pull', intensity: 'Moderate' },
  { name: 'Sled Push', focus: 'Power & Drive', equipment: 'Sled', pattern: 'Push', intensity: 'Conditioning' },
  { name: 'Nordic Curl', focus: 'Hamstrings', equipment: 'Assisted', pattern: 'Hinge', intensity: 'Eccentric' },
]

const EXERCISE_LIBRARY: ExerciseDefinition[] = Array.from({ length: 300 }).map((_, index) => {
  const template = BASE_EXERCISES[index % BASE_EXERCISES.length]
  const modifier = EXERCISE_MODIFIERS[Math.floor(index / BASE_EXERCISES.length) % EXERCISE_MODIFIERS.length] ?? ''
  return {
    id: `EX-${String(index + 1).padStart(3, '0')}`,
    name: `${template.name} ${modifier}`.trim(),
    focus: template.focus,
    equipment: template.equipment,
    pattern: template.pattern,
    intensity: template.intensity,
  }
})

const FOCUS_OPTIONS = Array.from(new Set(EXERCISE_LIBRARY.map((exercise) => exercise.focus))).sort()
const EQUIPMENT_OPTIONS = Array.from(new Set(EXERCISE_LIBRARY.map((exercise) => exercise.equipment))).sort()

const FALLBACK_ATHLETES: AthleteProfile[] = [
  { id: 'ath_001', name: 'Maya Chen', goal: 'Marathon debut', timezone: 'EST' },
  { id: 'ath_002', name: 'Jordan Lee', goal: 'Hypertrophy phase', timezone: 'CST' },
  { id: 'ath_003', name: 'Logan Reyes', goal: 'Club soccer in-season', timezone: 'PST' },
  { id: 'ath_004', name: 'Priya Patel', goal: 'Triathlon base', timezone: 'MST' },
  { id: 'ath_005', name: 'Alex Murphy', goal: 'Return-to-play', timezone: 'EST' },
]

const FALLBACK_PLAN_HISTORY: PlanHistoryRecord[] = [
  {
    id: 'plan_001',
    athleteId: 'ath_003',
    athleteName: 'Logan Reyes',
    planName: 'In-season Soccer Maintenance',
    weeks: 4,
    startDate: '2024-05-06',
    exerciseCount: 18,
    focusBreakdown: ['Hamstrings', 'Core Stability', 'Explosive Power'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
]

const FALLBACK_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 'notif_001',
    athleteId: 'ath_001',
    athleteName: 'Maya Chen',
    message: 'Coach shared a 6-week marathon base plan',
    timestamp: Date.now() - 1000 * 60 * 90,
    read: false,
  },
  {
    id: 'notif_002',
    athleteId: 'ath_002',
    athleteName: 'Jordan Lee',
    message: 'Upper-body strength micro-cycle ready',
    timestamp: Date.now() - 1000 * 60 * 60 * 12,
    read: true,
  },
]

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  const minutes = Math.round(diff / 60000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(timestamp).toLocaleDateString()
}

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function AdminDashboard() {
  const { user, users } = useAuthContext()

  const athletes = useMemo<AthleteProfile[]>(() => {
    const nonAdminUsers = users.filter((entry) => !entry.isAdmin)
    if (!nonAdminUsers.length) {
      return FALLBACK_ATHLETES
    }
    return nonAdminUsers.map((entry, index) => {
      const fallback = FALLBACK_ATHLETES[index % FALLBACK_ATHLETES.length]
      return {
        id: entry.id,
        name: entry.displayName ?? entry.username,
        goal: fallback.goal,
        timezone: fallback.timezone,
      }
    })
  }, [users])

  const [exerciseQuery, setExerciseQuery] = useState('')
  const [focusFilter, setFocusFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [visibleCount, setVisibleCount] = useState(60)
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [weekCount, setWeekCount] = useState(4)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [planName, setPlanName] = useState('')
  const [planNotes, setPlanNotes] = useState('')
  const [planHistory, setPlanHistory] = useState<PlanHistoryRecord[]>(FALLBACK_PLAN_HISTORY)
  const [notifications, setNotifications] = useState<NotificationRecord[]>(FALLBACK_NOTIFICATIONS)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const filteredExercises = useMemo(() => {
    const query = exerciseQuery.trim().toLowerCase()
    return EXERCISE_LIBRARY.filter((exercise) => {
      const matchesFocus = focusFilter ? exercise.focus === focusFilter : true
      const matchesEquipment = equipmentFilter ? exercise.equipment === equipmentFilter : true
      const matchesQuery = query
        ? `${exercise.name} ${exercise.focus} ${exercise.pattern} ${exercise.equipment}`.toLowerCase().includes(query)
        : true
      return matchesFocus && matchesEquipment && matchesQuery
    })
  }, [equipmentFilter, exerciseQuery, focusFilter])

  const visibleExercises = useMemo(
    () => filteredExercises.slice(0, visibleCount),
    [filteredExercises, visibleCount],
  )

  const sortedSelectedExercises = useMemo(() => {
    return [...selectedExercises].sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week
      if (a.day !== b.day) return a.day - b.day
      return a.name.localeCompare(b.name)
    })
  }, [selectedExercises])

  const groupedSchedule = useMemo(() => {
    const schedule = new Map<number, Map<number, SelectedExercise[]>>()
    selectedExercises.forEach((exercise) => {
      const weekGroup = schedule.get(exercise.week) ?? new Map<number, SelectedExercise[]>()
      const dayGroup = weekGroup.get(exercise.day) ?? []
      dayGroup.push(exercise)
      weekGroup.set(exercise.day, dayGroup)
      schedule.set(exercise.week, weekGroup)
    })
    return schedule
  }, [selectedExercises])

  const sortedPlanHistory = useMemo(
    () => [...planHistory].sort((a, b) => b.createdAt - a.createdAt),
    [planHistory],
  )

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.timestamp - a.timestamp),
    [notifications],
  )

  const hasUnreadNotifications = useMemo(() => notifications.some((entry) => !entry.read), [notifications])
  const canSubmitPlan = Boolean(selectedAthleteId && planName.trim() && startDate && selectedExercises.length)

  useEffect(() => {
    setVisibleCount(60)
  }, [equipmentFilter, exerciseQuery, focusFilter])

  useEffect(() => {
    if (!toastMessage) return
    const timeout = setTimeout(() => setToastMessage(null), 3200)
    return () => clearTimeout(timeout)
  }, [toastMessage])

  useEffect(() => {
    setSelectedExercises((previous) =>
      previous.map((exercise) => (exercise.week <= weekCount ? exercise : { ...exercise, week: weekCount })),
    )
  }, [weekCount])

  const handleAddExercise = (exercise: ExerciseDefinition) => {
    setSelectedExercises((previous) => {
      if (previous.some((entry) => entry.id === exercise.id)) {
        return previous
      }
      const nextWeek = Math.min(previous.length + 1, weekCount)
      const nextDay = ((previous.length % 7) + 1)
      return [...previous, { ...exercise, week: nextWeek, day: nextDay }]
    })
  }

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises((previous) => previous.filter((exercise) => exercise.id !== exerciseId))
  }

  const handleWeekChange = (exerciseId: string, week: number) => {
    setSelectedExercises((previous) =>
      previous.map((exercise) => (exercise.id === exerciseId ? { ...exercise, week } : exercise)),
    )
  }

  const handleDayChange = (exerciseId: string, day: number) => {
    setSelectedExercises((previous) =>
      previous.map((exercise) => (exercise.id === exerciseId ? { ...exercise, day } : exercise)),
    )
  }

  const handleSubmitPlan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = planName.trim()
    const athlete = athletes.find((entry) => entry.id === selectedAthleteId)
    if (!canSubmitPlan || !athlete || !trimmedName) {
      setToastMessage('Please complete the form and add exercises.')
      return
    }

    const focusBreakdown = Array.from(new Set(selectedExercises.map((exercise) => exercise.focus)))

    const newPlan: PlanHistoryRecord = {
      id: generateId('plan'),
      athleteId: athlete.id,
      athleteName: athlete.name,
      planName: trimmedName,
      weeks: weekCount,
      startDate,
      exerciseCount: selectedExercises.length,
      focusBreakdown,
      createdAt: Date.now(),
    }

    setPlanHistory((previous) => [newPlan, ...previous])

    const newNotification: NotificationRecord = {
      id: generateId('notif'),
      athleteId: athlete.id,
      athleteName: athlete.name,
      message: `${trimmedName} (${selectedExercises.length} exercises) assigned to you`,
      timestamp: Date.now(),
      read: false,
    }

    setNotifications((previous) => [newNotification, ...previous])

    setToastMessage(`${trimmedName} shared with ${athlete.name}`)
    setSelectedExercises([])
    setSelectedAthleteId('')
    setPlanName('')
    setPlanNotes('')
    setWeekCount(4)
    setStartDate(new Date().toISOString().split('T')[0])
  }

  const handleMarkNotificationRead = (notificationId: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.25),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.25),transparent_45%)]" />
        <div className="relative">
          <h1 className="text-2xl font-semibold">Coach Planning Command Center</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-200">
            Build personalised multi-week programmes at scale. Search hundreds of exercises, drop them into a weekly schedule,
            and keep athletes updated the moment a new plan lands in their portal.
          </p>
          <p className="mt-4 text-xs uppercase tracking-wide text-slate-300">
            Signed in as {user?.displayName ?? user?.username ?? 'Coach'}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Exercise library</h2>
              <p className="text-xs text-slate-500">{filteredExercises.length} results</p>
            </div>
          </header>

          <div className="sticky top-0 space-y-4 border-b border-slate-200 pb-4">
            <div className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-slate-400"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={exerciseQuery}
                onChange={(event) => setExerciseQuery(event.target.value)}
                placeholder="Search exercises, muscle groups, movements..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                Primary focus
                <select
                  value={focusFilter}
                  onChange={(event) => setFocusFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All focuses</option>
                  {FOCUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                Equipment
                <select
                  value={equipmentFilter}
                  onChange={(event) => setEquipmentFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All equipment</option>
                  {EQUIPMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '26rem' }}>
            {visibleExercises.length ? (
              visibleExercises.map((exercise) => {
                const isSelected = selectedExercises.some((entry) => entry.id === exercise.id)
                return (
                  <article
                    key={exercise.id}
                    className="flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-slate-900">{exercise.name}</h3>
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-600">{exercise.focus}</span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">{exercise.pattern}</span>
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">{exercise.equipment}</span>
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">{exercise.intensity}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddExercise(exercise)}
                      disabled={isSelected}
                      className={`rounded-xl border px-3 py-1 text-xs font-semibold transition ${
                        isSelected
                          ? 'cursor-not-allowed border-slate-200 bg-white text-slate-400'
                          : 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      {isSelected ? 'Added' : 'Add'}
                    </button>
                  </article>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No exercises match the filters. Adjust search or clear filters.
              </div>
            )}
          </div>

          {visibleCount < filteredExercises.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 40)}
              className="mt-4 w-full rounded-xl border border-indigo-200 bg-indigo-50 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100"
            >
              Load 40 more
            </button>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <header className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Plan designer</h2>
            <p className="text-xs text-slate-500">
              Add exercises from the library, assign each to a training day, and share the full block with an athlete.
            </p>
          </header>

          <form className="space-y-6" onSubmit={handleSubmitPlan}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Assign to athlete
              <select
                value={selectedAthleteId}
                onChange={(event) => setSelectedAthleteId(event.target.value)}
                required
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="" disabled>
                  Select athlete
                </option>
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name} · {athlete.goal}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Number of weeks
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={weekCount}
                  onChange={(event) => setWeekCount(Math.max(1, Math.min(24, Number(event.target.value))))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Start date
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  required
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Plan name
              <input
                type="text"
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                placeholder="e.g., In-Season Power Block"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Coaching notes
              <textarea
                value={planNotes}
                onChange={(event) => setPlanNotes(event.target.value)}
                placeholder="Guidelines, progression cues, recovery focus..."
                className="min-h-[8rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">Selected exercises</h3>
              <p className="text-xs text-slate-500">
                Add exercises from the library, then assign each to a week and training day.
              </p>
              {sortedSelectedExercises.length ? (
                <div className="mt-3 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '18rem' }}>
                  {sortedSelectedExercises.map((exercise) => (
                    <article key={exercise.id} className="space-y-3 rounded-2xl border border-slate-200 px-4 py-3">
                      <header className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-semibold text-slate-900">{exercise.name}</h4>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-600">{exercise.focus}</span>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">{exercise.pattern}</span>
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">{exercise.equipment}</span>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">{exercise.intensity}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(exercise.id)}
                          className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </header>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                          Week
                          <select
                            value={exercise.week}
                            onChange={(event) => handleWeekChange(exercise.id, Number(event.target.value))}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          >
                            {Array.from({ length: weekCount }).map((_, index) => (
                              <option key={index + 1} value={index + 1}>
                                Week {index + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                          Day
                          <select
                            value={exercise.day}
                            onChange={(event) => handleDayChange(exercise.id, Number(event.target.value))}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          >
                            {Array.from({ length: 7 }).map((_, index) => (
                              <option key={index + 1} value={index + 1}>
                                Day {index + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No exercises added yet. Use the library to build the training stack.
                </div>
              )}
            </div>

            {groupedSchedule.size ? (
              <div className="space-y-3">
                {[...groupedSchedule.keys()].sort((a, b) => a - b).map((week) => {
                  const dayMap = groupedSchedule.get(week) ?? new Map<number, SelectedExercise[]>()
                  return (
                    <article key={week} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <h4 className="text-sm font-semibold text-slate-800">Week {week}</h4>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        {[...dayMap.keys()]
                          .sort((a, b) => a - b)
                          .map((day) => {
                            const items = dayMap.get(day) ?? []
                            return (
                              <p key={day}>
                                <span className="font-semibold text-slate-700">Day {day}:</span> {items.map((item) => item.name).join(', ')}
                              </p>
                            )
                          })}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canSubmitPlan}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                  canSubmitPlan
                    ? 'bg-indigo-600 shadow-[0_10px_25px_rgba(37,99,235,0.35)] hover:bg-indigo-500'
                    : 'cursor-not-allowed bg-indigo-300'
                }`}
              >
                Create training plan
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Assignment history</h2>
            <p className="text-xs text-slate-500">{planHistory.length} plan{planHistory.length === 1 ? '' : 's'}</p>
          </div>
        </header>
        {sortedPlanHistory.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedPlanHistory.map((plan) => (
              <article key={plan.id} className="space-y-2 rounded-2xl border border-slate-200 px-4 py-4 text-sm shadow-sm">
                <h3 className="text-base font-semibold text-indigo-600">{plan.planName}</h3>
                <p className="text-slate-600">
                  {plan.athleteName} · {plan.weeks} week{plan.weeks === 1 ? '' : 's'} · {plan.exerciseCount} exercise
                  {plan.exerciseCount === 1 ? '' : 's'}
                </p>
                <p className="text-slate-500">Kick-off: {new Date(plan.startDate).toLocaleDateString()}</p>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                  {plan.focusBreakdown.slice(0, 3).map((focus) => (
                    <span key={focus} className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                      {focus}
                    </span>
                  ))}
                </div>
                <footer className="pt-2 text-xs text-slate-500">{formatRelativeTime(plan.createdAt)} · Assigned</footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No plans assigned yet. Share your first training block to populate the history.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Athlete portal preview</h2>
          <p className="text-xs text-slate-500">
            See what an athlete experiences when plans land in their queue. New assignments surface as unread notifications until
            acknowledged.
          </p>
        </header>
        {hasUnreadNotifications ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            New plans waiting! Tap a notification to mark it read.
          </div>
        ) : null}

        {sortedNotifications.length ? (
          <div className="space-y-3">
            {sortedNotifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border px-4 py-3 text-sm transition ${
                  notification.read
                    ? 'border-slate-200 bg-slate-50 text-slate-500'
                    : 'border-emerald-200 bg-emerald-50 text-slate-700'
                }`}
              >
                <header className="flex items-center justify-between">
                  <strong className="text-slate-900">{notification.athleteName}</strong>
                  {!notification.read ? (
                    <button
                      type="button"
                      onClick={() => handleMarkNotificationRead(notification.id)}
                      className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </header>
                <p className="mt-2 text-slate-600">{notification.message}</p>
                <time className="text-xs text-slate-400" dateTime={new Date(notification.timestamp).toISOString()}>
                  {formatRelativeTime(notification.timestamp)}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No notifications yet. Athletes will see plan drops here.
          </div>
        )}
      </section>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </div>
  )
}
