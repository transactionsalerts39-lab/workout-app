import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { usePlanContext, type WeekSessionView } from '../../context/PlanContext'
import { useProgressContext } from '../../context/ProgressContext'
import { useProgramContext } from '../../context/ProgramContext'
import type { UserSessionProgressMap } from '../../types/plan'

interface UserDashboardProps {
  weekIndex: number
  onSelectWeek: (weekIndex: number) => void
  onOpenSession: (weekIndex: number, sessionId: string) => void
}

type SessionState = 'pending' | 'in-progress' | 'completed'

const MAX_WEIGHT_KG = 500
const MAX_NOTES_LENGTH = 1000
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

function evaluateSessionState(session: WeekSessionView, sessionProgress?: UserSessionProgressMap): SessionState {
  if (!sessionProgress) return 'pending'

  const totals = session.exercises.length
  const completedExercises = session.exercises.reduce((sum, exercise) => {
    const progress = sessionProgress[exercise.exerciseId]
    if (!progress) return sum
    if (progress.completedSets >= exercise.prescribedSets) {
      return sum + 1
    }
    return sum
  }, 0)

  if (completedExercises === 0) return 'pending'
  if (completedExercises === totals) return 'completed'
  return 'in-progress'
}

function statusBadgeClass(state: SessionState): string {
  switch (state) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700'
    case 'in-progress':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function UserDashboard({ weekIndex, onSelectWeek, onOpenSession }: UserDashboardProps) {
  const { user } = useAuthContext()
  const { weeks } = usePlanContext()
  const { getUserProgress } = useProgressContext()
  const {
    findClientByUserId,
    challenges,
    unlockChallenge,
    addProgressPhoto,
    logCheckIn,
    extendSubscription,
    toggleAutoRenew,
    subscriptionProducts,
    workoutTemplates,
  } = useProgramContext()

  const clientProfile = user ? findClientByUserId(user.id) : undefined

  const [checkInEnergy, setCheckInEnergy] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [checkInStress, setCheckInStress] = useState<1 | 2 | 3 | 4 | 5>(2)
  const [checkInWeight, setCheckInWeight] = useState('')
  const [checkInNotes, setCheckInNotes] = useState('')
  const [checkInPhotoPreviewUrl, setCheckInPhotoPreviewUrl] = useState('')
  const [checkInPhotoFile, setCheckInPhotoFile] = useState<File | null>(null)
  const [checkInSubmitting, setCheckInSubmitting] = useState(false)
  const [dashboardFeedback, setDashboardFeedback] = useState<string | null>(null)

  const activeWeek = useMemo(() => weeks.find((week) => week.weekIndex === weekIndex) ?? weeks[0], [weekIndex, weeks])
  const weekProgress = user ? getUserProgress(user.id)?.weeks[activeWeek.weekIndex] : undefined

  const subscriptionProduct = useMemo(() => {
    if (!clientProfile) return null
    return subscriptionProducts.find((product) => product.id === clientProfile.subscription.productId) ?? null
  }, [clientProfile, subscriptionProducts])

  const assignedTemplate = useMemo(() => {
    if (!clientProfile?.assignedTemplateId) return null
    return workoutTemplates.find((template) => template.id === clientProfile.assignedTemplateId) ?? null
  }, [clientProfile?.assignedTemplateId, workoutTemplates])

  const activeChallenge = useMemo(() => {
    if (!clientProfile?.activeChallengeId) return null
    return challenges.find((challenge) => challenge.id === clientProfile.activeChallengeId) ?? null
  }, [challenges, clientProfile?.activeChallengeId])

  const eligibleChallenges = useMemo(() => {
    if (!clientProfile) return []
    return challenges.filter((challenge) => {
      if (clientProfile.activeChallengeId === challenge.id) return false
      if (challenge.requiredSubscriptionProductId && clientProfile.subscription.productId !== challenge.requiredSubscriptionProductId) {
        return false
      }
      return true
    })
  }, [challenges, clientProfile])

  const checkIns = useMemo(() => {
    if (!clientProfile) return []
    return [...clientProfile.checkIns].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    )
  }, [clientProfile])

  const progressPhotos = useMemo(() => {
    if (!clientProfile) return []
    return [...clientProfile.progressPhotos].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )
  }, [clientProfile])

  const paymentHistory = useMemo(() => {
    if (!clientProfile) return []
    return [...clientProfile.payments].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    )
  }, [clientProfile])

  const renewalDaysRemaining = useMemo(() => {
    if (!clientProfile) return null
    const renewDate = new Date(clientProfile.subscription.renewsOn)
    const diff = Math.ceil((renewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff < 0 ? 0 : diff
  }, [clientProfile])

  useEffect(() => {
    if (!dashboardFeedback) return
    const timer = setTimeout(() => setDashboardFeedback(null), 3200)
    return () => clearTimeout(timer)
  }, [dashboardFeedback])

  const handlePhotoInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setCheckInPhotoFile(null)
    setCheckInPhotoPreviewUrl('')
    if (!file) {
      return
    }
    if (!file.type.startsWith('image/')) {
      setDashboardFeedback('Upload a valid image file for progress photos.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setDashboardFeedback('Progress photo must be 2MB or smaller.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCheckInPhotoPreviewUrl(typeof reader.result === 'string' ? reader.result : '')
      setCheckInPhotoFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitCheckIn = () => {
    if (!clientProfile) {
      setDashboardFeedback('Join a coaching plan to submit check-ins.')
      return
    }
    const notesTrimmed = checkInNotes.trim()
    if (notesTrimmed.length > MAX_NOTES_LENGTH) {
      setDashboardFeedback(`Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`)
      return
    }
    const weightInput = checkInWeight.trim()
    let parsedWeight: number | undefined
    if (weightInput) {
      const numericWeight = Number(weightInput)
      if (!Number.isFinite(numericWeight) || numericWeight <= 0 || numericWeight > MAX_WEIGHT_KG) {
        setDashboardFeedback(`Enter a weight between 1 and ${MAX_WEIGHT_KG} kg.`)
        return
      }
      parsedWeight = numericWeight
    }
    const photoExceedsLimit = Boolean(checkInPhotoFile && checkInPhotoFile.size > MAX_PHOTO_BYTES)
    setCheckInSubmitting(true)
    try {
      const storedPhotoUrl = checkInPhotoFile && !photoExceedsLimit ? URL.createObjectURL(checkInPhotoFile) : null
      logCheckIn({
        clientId: clientProfile.id,
        weekIndex,
        energyLevel: checkInEnergy,
        stressLevel: checkInStress,
        weightKg: parsedWeight,
        notes: notesTrimmed || undefined,
        attachments: storedPhotoUrl ? [storedPhotoUrl] : [],
      })
      if (storedPhotoUrl) {
        addProgressPhoto({
          clientId: clientProfile.id,
          label: `Week ${weekIndex} check-in`,
          imageUrl: storedPhotoUrl,
          contentType: checkInPhotoFile?.type,
          sizeBytes: checkInPhotoFile?.size,
        })
      }
      const feedback = photoExceedsLimit
        ? 'Check-in submitted. Progress photo exceeded 2MB and was skipped.'
        : 'Check-in submitted.'
      setDashboardFeedback(feedback)
      setCheckInNotes('')
      setCheckInWeight('')
      setCheckInPhotoPreviewUrl('')
      setCheckInPhotoFile(null)
    } catch (error) {
      console.error('Failed to submit check-in', error)
      setDashboardFeedback('Unable to submit check-in right now.')
    } finally {
      setCheckInSubmitting(false)
    }
  }

  const handleUnlockChallenge = (challengeId: string) => {
    if (!clientProfile) return
    const challenge = challenges.find((entry) => entry.id === challengeId)
    if (!challenge) return
    const success = unlockChallenge(clientProfile.id, challengeId)
    setDashboardFeedback(
      success
        ? `${challenge.name} unlocked. Payment receipt emailed.`
        : 'Upgrade your subscription to unlock this challenge.',
    )
  }

  const completionSummary = useMemo(() => {
    const totalSessions = activeWeek.sessions.length
    const completedSessions = activeWeek.sessions.reduce((sum, session) => {
      const state = evaluateSessionState(session, weekProgress?.[session.sessionId])
      return state === 'completed' ? sum + 1 : sum
    }, 0)
    const completionPercent = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0

    const totalSets = activeWeek.sessions.reduce((setTotal, session) => {
      return (
        setTotal +
        session.exercises.reduce((acc, exercise) => acc + exercise.prescribedSets, 0)
      )
    }, 0)

    return { completedSessions, totalSessions, completionPercent, totalSets }
  }, [activeWeek, weekProgress])

  return (
    <div className="flex flex-col gap-6">
      {dashboardFeedback ? (
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
          {dashboardFeedback}
        </div>
      ) : null}
      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="flex flex-col gap-1">
          <span className="text-sm font-medium text-indigo-600">{user?.displayName ?? 'Athlete'}</span>
          <h1 className="text-2xl font-semibold text-slate-900">Week {activeWeek.weekIndex} plan</h1>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-900/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sessions</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {completionSummary.completedSessions}/{completionSummary.totalSessions}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completion</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{completionSummary.completionPercent}%</p>
          </div>
          <div className="rounded-2xl bg-slate-900/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total sets</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{completionSummary.totalSets}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {weeks.map((week) => (
            <button
              key={week.weekIndex}
              type="button"
              onClick={() => onSelectWeek(week.weekIndex)}
              className={`rounded-full border px-4 py-1 text-sm transition ${
                week.weekIndex === activeWeek.weekIndex
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {week.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sessions this week</h2>
            <p className="text-sm text-slate-500">Tap a session to log your lifts and notes.</p>
          </div>
        </header>

        <div className="flex flex-col gap-3">
          {activeWeek.sessions.map((session) => {
            const sessionProgress = weekProgress?.[session.sessionId]
            const state = evaluateSessionState(session, sessionProgress)
            return (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => onOpenSession(activeWeek.weekIndex, session.sessionId)}
                className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{session.dayTitle}</p>
                    <p className="text-xs text-slate-500">Focus: {session.focusLabel}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(state)}`}>
                    {state.replace('-', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {session.exercises.length} exercises ·{' '}
                  {session.exercises.reduce((sum, exercise) => sum + exercise.prescribedSets, 0)} sets
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {clientProfile ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Program overview</h2>
                <p className="text-sm text-slate-500">Stay on top of your template, challenges, and renewal plan.</p>
              </div>
            </header>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl bg-slate-900/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assigned template</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{assignedTemplate?.name ?? 'Custom coach build'}</p>
                <p className="mt-1 text-xs text-slate-600">Adjustments applied: {clientProfile.templateAdjustments.length}</p>
              </article>
              <article className="rounded-2xl bg-slate-900/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active challenge</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{activeChallenge ? activeChallenge.name : 'None yet'}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {activeChallenge ? `${activeChallenge.durationWeeks} week focus on ${activeChallenge.focus.join(', ')}` : 'Unlock a preset to fast-track progress.'}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-900/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Subscription</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{subscriptionProduct?.name ?? 'Coach access'}</p>
                <p className="mt-1 text-xs text-slate-600">{subscriptionProduct?.description ?? 'Work directly with your coach across shared plans.'}</p>
              </article>
              <article className="rounded-2xl bg-slate-900/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Renewal</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{clientProfile.subscription.autoRenew ? 'Auto-renew enabled' : 'Manual renewal'}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {renewalDaysRemaining !== null
                    ? renewalDaysRemaining === 0
                      ? `Expired on ${new Date(clientProfile.subscription.renewsOn).toLocaleDateString()}`
                      : `Renews ${new Date(clientProfile.subscription.renewsOn).toLocaleDateString()} (${renewalDaysRemaining} day${renewalDaysRemaining === 1 ? '' : 's'} left)`
                    : 'Renewal date pending'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    toggleAutoRenew(clientProfile.id)
                    setDashboardFeedback(clientProfile.subscription.autoRenew ? 'Auto-renew disabled.' : 'Auto-renew enabled.')
                  }}
                  className="mt-3 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Toggle auto-renew
                </button>
              </article>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <header className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Check-ins & progress photos</h2>
                <p className="text-sm text-slate-500">Log your weekly update and keep photos to track your transformation.</p>
              </div>
            </header>
            <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Energy level
                  <select
                    value={checkInEnergy}
                    onChange={(event) => setCheckInEnergy(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value={5}>🔥 Peaks</option>
                    <option value={4}>💪 Strong</option>
                    <option value={3}>🙂 Balanced</option>
                    <option value={2}>😌 Below average</option>
                    <option value={1}>😴 Drained</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Stress level
                  <select
                    value={checkInStress}
                    onChange={(event) => setCheckInStress(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value={1}>Very low</option>
                    <option value={2}>Manageable</option>
                    <option value={3}>Moderate</option>
                    <option value={4}>High</option>
                    <option value={5}>Very high</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Body weight (kg)
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={checkInWeight}
                    onChange={(event) => setCheckInWeight(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Notes to coach
                  <textarea
                    value={checkInNotes}
                    onChange={(event) => setCheckInNotes(event.target.value)}
                    rows={3}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Progress photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoInputChange}
                    className="text-xs text-slate-600"
                  />
                </label>
                {checkInPhotoPreviewUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <img src={checkInPhotoPreviewUrl} alt="Progress preview" className="h-40 w-full object-cover" />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleSubmitCheckIn}
                  disabled={checkInSubmitting}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {checkInSubmitting ? 'Submitting…' : 'Submit check-in'}
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Recent check-ins</h3>
                  {checkIns.length ? (
                    <ul className="mt-3 space-y-3 text-sm">
                      {checkIns.map((entry) => (
                        <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <time dateTime={entry.submittedAt}>{new Date(entry.submittedAt).toLocaleString()}</time>
                            <span>Week {entry.weekIndex}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-600">Energy {entry.energyLevel}/5 · Stress {entry.stressLevel}/5</p>
                          {entry.notes ? <p className="mt-2 text-sm text-slate-700">{entry.notes}</p> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">No check-ins logged yet — share your first update to keep coaching feedback flowing.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Progress gallery</h3>
                  {progressPhotos.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {progressPhotos.map((photo) => (
                        <figure key={photo.id} className="overflow-hidden rounded-2xl border border-slate-200">
                          {photo.imageUrl ? (
                            <img src={photo.imageUrl} alt={photo.label} className="h-28 w-full object-cover" />
                          ) : (
                            <div className="flex h-28 items-center justify-center bg-slate-100 text-xs text-slate-500">Photo pending</div>
                          )}
                          <figcaption className="px-2 py-1 text-[11px] text-slate-500">{photo.label}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">Upload your first progress photo to visualise change over time.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <header className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Challenge library</h2>
                <p className="text-sm text-slate-500">Unlock preset 8–12 week blocks with in-app payments.</p>
              </div>
            </header>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeChallenge ? (
                <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  <p className="text-xs font-semibold uppercase tracking-wide">Active</p>
                  <h3 className="mt-1 text-base font-semibold text-emerald-900">{activeChallenge.name}</h3>
                  <p className="mt-1 text-emerald-800">Focus: {activeChallenge.focus.join(', ')}</p>
                  <p className="mt-1 text-xs">Duration {activeChallenge.durationWeeks} weeks · Unlock {activeChallenge.requiredSubscriptionProductId ? 'via hybrid subscription' : 'with any plan'}</p>
                </article>
              ) : null}
              {eligibleChallenges.length ? (
                eligibleChallenges.map((challenge) => (
                  <article key={challenge.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 px-4 py-4 text-sm">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-slate-900">{challenge.name}</h3>
                      <p className="text-slate-600">{challenge.summary}</p>
                      <p className="text-xs text-slate-500">{challenge.durationWeeks} weeks · Unlock cost ₹{challenge.unlockCost}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlockChallenge(challenge.id)}
                      className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      Unlock challenge
                    </button>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Upgrade to a hybrid or semi-annual subscription to unlock premium preset challenges.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <header className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Billing & invoices</h2>
                <p className="text-sm text-slate-500">Manage renewals, download invoices, and review payment history.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    extendSubscription(clientProfile.id, 3)
                    setDashboardFeedback('Plan extended by 3 months. Payment recorded.')
                  }}
                  className="rounded-full border border-slate-200 px-4 py-1 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Extend 3 months
                </button>
                <button
                  type="button"
                  onClick={() => {
                    extendSubscription(clientProfile.id, 6)
                    setDashboardFeedback('Plan extended by 6 months. Payment recorded.')
                  }}
                  className="rounded-full border border-slate-200 px-4 py-1 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Extend 6 months
                </button>
              </div>
            </header>
            {paymentHistory.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-xs">{new Date(payment.recordedAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-xs capitalize">{payment.type}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-slate-900">
                          {payment.currency === 'INR' ? `₹${payment.amount}` : `$${payment.amount}`}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`rounded-full px-2 py-1 font-semibold ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : payment.status === 'due' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{payment.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No payments recorded yet. Billing begins once your first plan is activated.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
