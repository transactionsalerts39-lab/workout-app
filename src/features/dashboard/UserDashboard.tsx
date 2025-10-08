import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { usePlanContext, type WeekSessionView } from '../../context/PlanContext'
import { useProgressContext } from '../../context/ProgressContext'
import { useProgramContext } from '../../context/ProgramContext'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Textarea } from '../../components/ui/textarea'
import { cn } from '../../lib/utils'
import type { UserSessionProgressMap } from '../../types/plan'

interface UserDashboardProps {
  weekIndex: number
  onSelectWeek: (weekIndex: number) => void
  onOpenSession: (weekIndex: number, sessionId: string) => void
}

type SessionState = 'pending' | 'in-progress' | 'completed'

type NotificationTone = 'success' | 'warning' | 'danger' | 'info'

interface CelebrationState {
  sessionId: string
  emoji: string
}

interface NotificationItem {
  id: string
  title: string
  message: string
  tone: NotificationTone
}

interface ChatMessage {
  id: string
  author: 'client' | 'coach'
  body: string
  timestamp: string
}

interface SettingsFormState {
  preferredName: string
  birthDate: string
  age: string
  healthNotes: string
  emergencyContact: string
}

interface ProgressTrendPoint {
  weekIndex: number
  label: string
  percent: number
}

type ConfettiStyle = CSSProperties & {
  '--tw-confetti-x'?: string
  '--tw-confetti-y'?: string
}

const MAX_WEIGHT_KG = 500
const MAX_NOTES_LENGTH = 1000
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

const celebrationEmojis = ['🔥', '💪', '🎉', '🏅', '🚀', '👏']
const confettiPalette = ['#6366F1', '#22C55E', '#F97316', '#0EA5E9', '#F43F5E']

const notificationIcons: Record<NotificationTone, string> = {
  success: '✅',
  warning: '⚠️',
  danger: '⛔',
  info: 'ℹ️',
}

const notificationToneClasses: Record<NotificationTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-indigo-200 bg-indigo-50 text-indigo-700',
}

const EMPTY_SETTINGS_FORM: SettingsFormState = {
  preferredName: '',
  birthDate: '',
  age: '',
  healthNotes: '',
  emergencyContact: '',
}

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

function statusBadgeVariant(state: SessionState): 'success' | 'warning' | 'secondary' {
  switch (state) {
    case 'completed':
      return 'success'
    case 'in-progress':
      return 'warning'
    default:
      return 'secondary'
  }
}

function paymentStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'paid':
      return 'success'
    case 'due':
      return 'warning'
    case 'failed':
    case 'past_due':
    case 'cancelled':
      return 'destructive'
    default:
      return 'secondary'
  }
}

interface ProgressTrendChartProps {
  data: ProgressTrendPoint[]
  activeWeekIndex: number
}

function ProgressTrendChart({ data, activeWeekIndex }: ProgressTrendChartProps) {
  const gradientId = useMemo(() => `progress-trend-${Math.random().toString(36).slice(2)}`, [])
  if (!data.length) return null

  const points = data.map((entry, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 100
    const y = 100 - entry.percent
    return { ...entry, x, y }
  })

  const pathD = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`).join(' ')

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L 100,100 L 0,100 Z`} fill={`url(#${gradientId})`} stroke="none" />
        <path d={pathD} stroke="#4338CA" strokeWidth={1.5} fill="none" strokeLinejoin="round" />
        {points.map((point) => {
          const isActive = point.weekIndex === activeWeekIndex
          return (
            <g key={point.weekIndex} transform={`translate(${point.x}, ${point.y})`}>
              <circle r={2.4} fill="#4338CA" opacity={isActive ? 1 : 0.7} />
              {isActive ? <circle r={4.2} fill="#A5B4FC" opacity={0.4} /> : null}
            </g>
          )
        })}
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        {points.map((point) => (
          <span
            key={point.weekIndex}
            className={cn('flex-1 text-center', point.weekIndex === activeWeekIndex ? 'font-semibold text-slate-700' : undefined)}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function UserDashboard({ weekIndex, onSelectWeek, onOpenSession }: UserDashboardProps) {
  const { user } = useAuthContext()
  const { weeks } = usePlanContext()
  const { getUserProgress, markExerciseUsingPlan } = useProgressContext()
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
    updateClientSettings,
  } = useProgramContext()

  const clientProfile = user ? findClientByUserId(user.id) : undefined
  const userFriendlyName = clientProfile?.profileSettings?.preferredName?.trim() || user?.displayName || 'Athlete'

  const [checkInEnergy, setCheckInEnergy] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [checkInStress, setCheckInStress] = useState<1 | 2 | 3 | 4 | 5>(2)
  const [checkInWeight, setCheckInWeight] = useState('')
  const [checkInNotes, setCheckInNotes] = useState('')
  const [checkInPhotoPreviewUrl, setCheckInPhotoPreviewUrl] = useState('')
  const [checkInPhotoFile, setCheckInPhotoFile] = useState<File | null>(null)
  const [checkInSubmitting, setCheckInSubmitting] = useState(false)
  const [dashboardFeedback, setDashboardFeedback] = useState<string | null>(null)
  const [celebrationState, setCelebrationState] = useState<CelebrationState | null>(null)
  const [markingSessionId, setMarkingSessionId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const chatClientIdRef = useRef<string | null>(null)
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(EMPTY_SETTINGS_FORM)
  const [settingsSaving, setSettingsSaving] = useState(false)

  const activeWeek = useMemo(() => weeks.find((week) => week.weekIndex === weekIndex) ?? weeks[0], [weekIndex, weeks])
  const userProgress = user ? getUserProgress(user.id) : undefined
  const weekProgress = userProgress?.weeks[activeWeek.weekIndex]

  const progressTrend = useMemo<ProgressTrendPoint[]>(() => {
    if (!weeks.length) return []
    return weeks.map((week) => {
      const totalSessions = week.sessions.length
      const weekData = userProgress?.weeks[week.weekIndex]
      const completedSessions = week.sessions.reduce((sum, session) => {
        const sessionProgress = weekData?.[session.sessionId]
        if (!sessionProgress) return sum
        const isComplete = session.exercises.every((exercise) => {
          const exerciseProgress = sessionProgress[exercise.exerciseId]
          return exerciseProgress && exerciseProgress.completedSets >= exercise.prescribedSets
        })
        return isComplete ? sum + 1 : sum
      }, 0)
      const percent = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0
      return { weekIndex: week.weekIndex, label: week.label, percent }
    })
  }, [weeks, userProgress])

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
  const lastCheckIn = checkIns[0] ?? null

  const progressPhotos = useMemo(() => {
    if (!clientProfile) return []
    return [...clientProfile.progressPhotos].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )
  }, [clientProfile])

  const upcomingCheckIns = useMemo(() => {
    if (!clientProfile) return []
    const baseDate = lastCheckIn ? new Date(lastCheckIn.submittedAt) : new Date(clientProfile.planStartDate)
    if (Number.isNaN(baseDate.getTime())) return []
    const now = new Date()
    const nextDate = new Date(baseDate)
    while (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 7)
    }
    return Array.from({ length: 3 }, (_, index) => {
      const scheduled = new Date(nextDate)
      scheduled.setDate(scheduled.getDate() + index * 7)
      return scheduled.toISOString()
    })
  }, [clientProfile, lastCheckIn])

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

  const notifications = useMemo<NotificationItem[]>(() => {
    if (!clientProfile) return []
    const items: NotificationItem[] = []

    if (upcomingCheckIns.length) {
      const nextDate = new Date(upcomingCheckIns[0])
      items.push({
        id: 'next_check_in',
        title: 'Next check-in scheduled',
        message: `Share your update on ${nextDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.`,
        tone: 'info',
      })
    } else {
      items.push({
        id: 'first_check_in',
        title: 'First check-in pending',
        message: 'Submit your first check-in to unlock personalised feedback.',
        tone: 'info',
      })
    }

    if (renewalDaysRemaining !== null) {
      const renewDate = new Date(clientProfile.subscription.renewsOn)
      if (renewalDaysRemaining === 0) {
        items.push({
          id: 'renewal_due',
          title: 'Subscription renewal due',
          message: `Renewal date reached (${renewDate.toLocaleDateString()}).`,
          tone: 'danger',
        })
      } else if (renewalDaysRemaining <= 5) {
        items.push({
          id: 'renewal_soon',
          title: 'Renewal approaching',
          message: `Renews in ${renewalDaysRemaining} day${renewalDaysRemaining === 1 ? '' : 's'} (${renewDate.toLocaleDateString()}).`,
          tone: 'warning',
        })
      } else {
        items.push({
          id: 'renewal_info',
          title: 'Subscription active',
          message: `Renews on ${renewDate.toLocaleDateString()}.`,
          tone: 'info',
        })
      }
    }

    if (completionSummary.completionPercent >= 80) {
      items.push({
        id: 'streak_hot',
        title: 'Streak on fire',
        message: `You have completed ${completionSummary.completionPercent}% of this week.`,
        tone: 'success',
      })
    } else if (completionSummary.completionPercent < 40 && activeWeek.sessions.length) {
      items.push({
        id: 'streak_prompt',
        title: 'Build momentum',
        message: 'Log one more workout to boost your weekly score.',
        tone: 'warning',
      })
    }

    if (clientProfile.activeChallengeId && activeChallenge) {
      items.push({
        id: 'challenge_status',
        title: `${activeChallenge.name} in progress`,
        message: `${activeChallenge.durationWeeks}-week focus on ${activeChallenge.focus.join(', ')}.`,
        tone: 'info',
      })
    }

    return items.slice(0, 4)
  }, [activeChallenge, activeWeek.sessions.length, clientProfile, completionSummary.completionPercent, renewalDaysRemaining, upcomingCheckIns])

  useEffect(() => {
    if (!dashboardFeedback) return
    const timer = setTimeout(() => setDashboardFeedback(null), 3200)
    return () => clearTimeout(timer)
  }, [dashboardFeedback])

  useEffect(() => {
    if (!clientProfile) {
      chatClientIdRef.current = null
      setChatMessages([])
      setSettingsForm(EMPTY_SETTINGS_FORM)
      return
    }

    if (chatClientIdRef.current !== clientProfile.id) {
      chatClientIdRef.current = clientProfile.id
      setChatMessages([
        {
          id: `${clientProfile.id}_coach_welcome`,
          author: 'coach',
          body: `Welcome back ${clientProfile.profileSettings?.preferredName ?? clientProfile.name}! Share a quick win for this week.`,
          timestamp: new Date().toISOString(),
        },
      ])
    }

    setSettingsForm({
      preferredName: clientProfile.profileSettings?.preferredName ?? clientProfile.name,
      birthDate: clientProfile.profileSettings?.birthDate ?? '',
      age: clientProfile.profileSettings?.age ? String(clientProfile.profileSettings.age) : '',
      healthNotes: clientProfile.profileSettings?.healthNotes ?? '',
      emergencyContact: clientProfile.profileSettings?.emergencyContact ?? '',
    })
  }, [clientProfile])

  useEffect(() => {
    if (!chatLogRef.current) return
    chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
  }, [chatMessages])

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

  const handleCelebrateSession = async (session: WeekSessionView, state: SessionState) => {
    if (!user) return
    if (markingSessionId === session.sessionId) return

    const emoji = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)]
    setCelebrationState({ sessionId: session.sessionId, emoji })

    if (state !== 'completed') {
      setMarkingSessionId(session.sessionId)
      try {
        await markExerciseUsingPlan(user.id, activeWeek.weekIndex, session)
        setDashboardFeedback(`Workout logged! ${emoji} Keep that momentum.`)
      } catch (error) {
        console.error('Failed to apply coach plan for session', error)
        setDashboardFeedback('Unable to mark this workout right now.')
      } finally {
        setMarkingSessionId((previous) => (previous === session.sessionId ? null : previous))
      }
    } else {
      setDashboardFeedback(`Celebrating ${session.dayTitle}! ${emoji}`)
    }

    window.setTimeout(() => {
      setCelebrationState((previous) => (previous?.sessionId === session.sessionId ? null : previous))
    }, 1600)
  }

  const handleSendChat = () => {
    const message = chatInput.trim()
    if (!message || !clientProfile) return
    const newMessage: ChatMessage = {
      id: `client_${Date.now()}`,
      author: 'client',
      body: message,
      timestamp: new Date().toISOString(),
    }
    setChatMessages((previous) => [...previous, newMessage])
    setChatInput('')
    setDashboardFeedback('Message sent to coach.')
  }

  const handleChatKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendChat()
    }
  }

  const handleSaveSettings = () => {
    if (!clientProfile) return
    const trimmedName = settingsForm.preferredName.trim()
    const birthDateInput = settingsForm.birthDate.trim()
    const ageInput = settingsForm.age.trim()
    const healthNotesInput = settingsForm.healthNotes.trim()
    const emergencyContactInput = settingsForm.emergencyContact.trim()

    if (birthDateInput && Number.isNaN(new Date(birthDateInput).getTime())) {
      setDashboardFeedback('Enter a valid birth date (YYYY-MM-DD).')
      return
    }

    let parsedAge: number | undefined
    if (ageInput) {
      const numericAge = Number(ageInput)
      if (!Number.isFinite(numericAge) || numericAge <= 0) {
        setDashboardFeedback('Enter a valid age.')
        return
      }
      parsedAge = Math.round(numericAge)
    }

    setSettingsSaving(true)
    try {
      updateClientSettings(clientProfile.id, {
        preferredName: trimmedName || undefined,
        birthDate: birthDateInput || undefined,
        age: parsedAge,
        healthNotes: healthNotesInput || undefined,
        emergencyContact: emergencyContactInput || undefined,
      })
      setDashboardFeedback('Profile settings updated.')
    } finally {
      setSettingsSaving(false)
    }
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="flex flex-col gap-6">
        {dashboardFeedback ? (
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
            {dashboardFeedback}
          </div>
        ) : null}

        <Card>
          <CardHeader className="gap-2">
            <span className="text-sm font-medium text-indigo-600">{userFriendlyName}</span>
            <CardTitle>Week {activeWeek.weekIndex} plan</CardTitle>
            <p className="text-sm text-slate-500">Track your weekly momentum and celebrate each victory.</p>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {progressTrend.length ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Progress journey</h3>
                <ProgressTrendChart data={progressTrend} activeWeekIndex={activeWeek.weekIndex} />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {weeks.map((week) => (
                <Button
                  key={week.weekIndex}
                  size="sm"
                  variant={week.weekIndex === activeWeek.weekIndex ? 'subtle' : 'outline'}
                  onClick={() => onSelectWeek(week.weekIndex)}
                >
                  {week.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Sessions this week</CardTitle>
              <p className="text-sm text-slate-500">Mark your workouts and dive into the session log.</p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {activeWeek.sessions.length ? (
              activeWeek.sessions.map((session) => {
                const sessionProgress = weekProgress?.[session.sessionId]
                const state = evaluateSessionState(session, sessionProgress)
                const isCelebrating = celebrationState?.sessionId === session.sessionId
                return (
                  <div
                    key={session.sessionId}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{session.dayTitle}</p>
                        <p className="text-xs text-slate-500">Focus: {session.focusLabel}</p>
                      </div>
                      <Badge variant={statusBadgeVariant(state)} className="capitalize">
                        {state.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {session.exercises.length} exercises ·{' '}
                      {session.exercises.reduce((sum, exercise) => sum + exercise.prescribedSets, 0)} sets
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => onOpenSession(activeWeek.weekIndex, session.sessionId)}>
                        Open session
                      </Button>
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() => handleCelebrateSession(session, state)}
                        disabled={markingSessionId === session.sessionId}
                      >
                        {markingSessionId === session.sessionId ? 'Marking…' : 'Celebrate win'}
                      </Button>
                    </div>
                    {isCelebrating && celebrationState ? (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {Array.from({ length: 18 }).map((_, index) => {
                          const left = Math.random() * 100
                          const top = Math.random() * 60
                          const color = confettiPalette[index % confettiPalette.length]
                          return (
                            <span
                              key={index}
                              className="confetti-piece"
                              style={{
                                '--tw-confetti-x': `${Math.random() * 160 - 80}%`,
                                '--tw-confetti-y': `${90 + Math.random() * 30}%`,
                                left: `${left}%`,
                                top: `${top}%`,
                                backgroundColor: color,
                              } as ConfettiStyle}
                            />
                          )
                        })}
                        <div className="absolute inset-x-0 top-5 text-center text-4xl drop-shadow-sm">
                          {celebrationState.emoji}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-slate-500">No sessions scheduled for this week yet.</p>
            )}
          </CardContent>
        </Card>

        {clientProfile ? (
          <>
            <Card>
              <CardHeader className="mb-4 space-y-0">
                <div>
                  <CardTitle className="text-lg">Program overview</CardTitle>
                  <p className="text-sm text-slate-500">Stay on top of your template, challenges, and renewal plan.</p>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-fit text-xs"
                    onClick={() => {
                      toggleAutoRenew(clientProfile.id)
                      setDashboardFeedback(clientProfile.subscription.autoRenew ? 'Auto-renew disabled.' : 'Auto-renew enabled.')
                    }}
                  >
                    Toggle auto-renew
                  </Button>
                </article>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="mb-4 space-y-0">
                <div>
                  <CardTitle className="text-lg">Check-ins &amp; progress photos</CardTitle>
                  <p className="text-sm text-slate-500">Log your weekly update and keep photos to track your transformation.</p>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="check-in-energy">Energy level</Label>
                    <Select
                      id="check-in-energy"
                      value={checkInEnergy}
                      onChange={(event) => setCheckInEnergy(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
                    >
                      <option value={5}>🔥 Peaks</option>
                      <option value={4}>💪 Strong</option>
                      <option value={3}>🙂 Balanced</option>
                      <option value={2}>😌 Below average</option>
                      <option value={1}>😴 Drained</option>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="check-in-stress">Stress level</Label>
                    <Select
                      id="check-in-stress"
                      value={checkInStress}
                      onChange={(event) => setCheckInStress(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
                    >
                      <option value={1}>Very low</option>
                      <option value={2}>Manageable</option>
                      <option value={3}>Moderate</option>
                      <option value={4}>High</option>
                      <option value={5}>Very high</option>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="check-in-weight">Body weight (kg)</Label>
                    <Input
                      id="check-in-weight"
                      type="number"
                      min={0}
                      step="0.1"
                      value={checkInWeight}
                      onChange={(event) => setCheckInWeight(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="check-in-notes">Notes to coach</Label>
                    <Textarea
                      id="check-in-notes"
                      value={checkInNotes}
                      onChange={(event) => setCheckInNotes(event.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="check-in-photo">Progress photo</Label>
                    <Input id="check-in-photo" type="file" accept="image/*" onChange={handlePhotoInputChange} className="file:text-xs" />
                  </div>
                  {checkInPhotoPreviewUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <img src={checkInPhotoPreviewUrl} alt="Progress preview" className="h-40 w-full object-cover" />
                    </div>
                  ) : null}
                  <Button type="button" onClick={handleSubmitCheckIn} disabled={checkInSubmitting} className="w-full">
                    {checkInSubmitting ? 'Submitting…' : 'Submit check-in'}
                  </Button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Recent check-ins</h3>
                    {checkIns.length ? (
                      <ul className="mt-3 space-y-3 text-sm">
                        {checkIns.map((entry) => {
                          const submittedAt = new Date(entry.submittedAt)
                          return (
                            <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>
                                  Checked in on {submittedAt.toLocaleDateString()} · {submittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span>Week {entry.weekIndex}</span>
                              </div>
                              <p className="mt-2 text-xs text-slate-600">Energy {entry.energyLevel}/5 · Stress {entry.stressLevel}/5</p>
                              {entry.notes ? <p className="mt-2 text-sm text-slate-700">{entry.notes}</p> : null}
                            </li>
                          )
                        })}
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="mb-4 space-y-0">
                <div>
                  <CardTitle className="text-lg">Challenge library</CardTitle>
                  <p className="text-sm text-slate-500">Unlock preset 8–12 week blocks with in-app payments.</p>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => handleUnlockChallenge(challenge.id)}>
                        Unlock challenge
                      </Button>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Upgrade to a hybrid or semi-annual subscription to unlock premium preset challenges.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Billing &amp; invoices</CardTitle>
                  <p className="text-sm text-slate-500">Manage renewals, download invoices, and review payment history.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      extendSubscription(clientProfile.id, 3)
                      setDashboardFeedback('Plan extended by 3 months. Payment recorded.')
                    }}
                  >
                    Extend 3 months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      extendSubscription(clientProfile.id, 6)
                      setDashboardFeedback('Plan extended by 6 months. Payment recorded.')
                    }}
                  >
                    Extend 6 months
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {paymentHistory.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="text-xs">{new Date(payment.recordedAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs capitalize">{payment.type}</TableCell>
                            <TableCell className="text-xs font-semibold text-slate-900">
                              {payment.currency === 'INR' ? `₹${payment.amount}` : `$${payment.amount}`}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant={paymentStatusVariant(payment.status)} className="capitalize">
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">{payment.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No payments recorded yet. Billing begins once your first plan is activated.</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {clientProfile ? (
        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notifications</CardTitle>
              <p className="text-sm text-slate-500">Stay aligned with coach insights.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length ? (
                notifications.map((item) => (
                  <div key={item.id} className={cn('rounded-2xl border px-4 py-3 text-sm shadow-sm', notificationToneClasses[item.tone])}>
                    <div className="flex items-start gap-2">
                      <span>{notificationIcons[item.tone]}</span>
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-xs text-slate-600">{item.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No alerts right now — keep up the great work!</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming check-ins</CardTitle>
              <p className="text-sm text-slate-500">Plan ahead for your next updates.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingCheckIns.length ? (
                <ul className="space-y-2 text-sm">
                  {upcomingCheckIns.map((entry, index) => {
                    const date = new Date(entry)
                    return (
                      <li key={entry} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <span className="font-semibold text-slate-700">
                          {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-xs text-slate-500">{index === 0 ? 'Next' : `+${index} wk`}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Next check-in will be scheduled after your first update.</p>
              )}
              {lastCheckIn ? (
                <p className="text-xs text-slate-500">Last check-in on {new Date(lastCheckIn.submittedAt).toLocaleString()}.</p>
              ) : (
                <p className="text-xs text-slate-500">You have not logged a check-in yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Coach chat</CardTitle>
              <p className="text-sm text-slate-500">Share wins, questions, or quick updates.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div ref={chatLogRef} className="max-h-64 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {chatMessages.length ? (
                  chatMessages.map((message) => {
                    const isClient = message.author === 'client'
                    return (
                      <div key={message.id} className={cn('flex', isClient ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                            isClient ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700',
                          )}
                        >
                          <p>{message.body}</p>
                          <time className="mt-1 block text-[10px] uppercase tracking-wide opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-slate-500">Say hello to your coach to kick things off.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Type a message to your coach"
                />
                <Button type="button" onClick={handleSendChat} disabled={!chatInput.trim()}>
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Profile settings</CardTitle>
              <p className="text-sm text-slate-500">Keep your coach up to date with key details.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="setting-name">Preferred name</Label>
                <Input
                  id="setting-name"
                  value={settingsForm.preferredName}
                  onChange={(event) => setSettingsForm((previous) => ({ ...previous, preferredName: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="setting-birth">Birth date</Label>
                <Input
                  id="setting-birth"
                  type="date"
                  value={settingsForm.birthDate}
                  onChange={(event) => setSettingsForm((previous) => ({ ...previous, birthDate: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="setting-age">Age</Label>
                <Input
                  id="setting-age"
                  type="number"
                  min={0}
                  value={settingsForm.age}
                  onChange={(event) => setSettingsForm((previous) => ({ ...previous, age: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="setting-health">Health notes</Label>
                <Textarea
                  id="setting-health"
                  value={settingsForm.healthNotes}
                  onChange={(event) => setSettingsForm((previous) => ({ ...previous, healthNotes: event.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="setting-emergency">Emergency contact</Label>
                <Input
                  id="setting-emergency"
                  value={settingsForm.emergencyContact}
                  onChange={(event) => setSettingsForm((previous) => ({ ...previous, emergencyContact: event.target.value }))}
                />
              </div>
              <Button type="button" onClick={handleSaveSettings} disabled={settingsSaving} className="w-full">
                {settingsSaving ? 'Saving…' : 'Save profile'}
              </Button>
            </CardContent>
          </Card>
        </aside>
      ) : null}
    </div>
  )
}
