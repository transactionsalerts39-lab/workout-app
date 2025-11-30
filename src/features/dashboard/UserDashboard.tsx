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
import { ScheduleUpdates } from './components/ScheduleUpdates'
import { AthleteMessaging } from './components/AthleteMessaging'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { UserSessionProgressMap } from '../../types/plan'

interface UserDashboardProps {
  weekIndex: number
  onSelectWeek: (weekIndex: number) => void
  onOpenSession: (weekIndex: number, sessionId: string) => void
}

type DashboardSection =
  | 'overview'
  | 'sessions'
  | 'progress'
  | 'chat'
  | 'challenges'
  | 'billing'
  | 'notifications'
  | 'profile'

type SessionState = 'pending' | 'in-progress' | 'completed'

type NotificationTone = 'success' | 'warning' | 'danger' | 'info'

type CheckInStep = 'energy' | 'weight' | 'notes' | 'photo'

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
  success: 'border-success/30 bg-success/15 text-success',
  warning: 'border-warning/30 bg-warning/15 text-warning',
  danger: 'border-danger/30 bg-danger/15 text-danger',
  info: 'border-brand-300/25 bg-brand-500/15 text-brand-100',
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
    <div className="surface-card relative w-full overflow-hidden p-5">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5f4bff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L 100,100 L 0,100 Z`} fill={`url(#${gradientId})`} stroke="none" />
        <path d={pathD} stroke="#5f4bff" strokeWidth={1.5} fill="none" strokeLinejoin="round" />
        {points.map((point) => {
          const isActive = point.weekIndex === activeWeekIndex
          return (
            <g key={point.weekIndex} transform={`translate(${point.x}, ${point.y})`}>
              <circle r={2.4} fill="#5f4bff" opacity={isActive ? 1 : 0.7} />
              {isActive ? <circle r={4.2} fill="#22d3ee" opacity={0.45} /> : null}
            </g>
          )
        })}
      </svg>
      <div className="mt-4 flex items-center justify-between text-xs text-neutral-300/80">
        {points.map((point) => (
          <span
            key={point.weekIndex}
            className={cn(
              'flex-1 text-center transition-colors',
              point.weekIndex === activeWeekIndex ? 'font-semibold text-neutral-100' : undefined,
            )}
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
  const [checkInStep, setCheckInStep] = useState<CheckInStep>('energy')
  const [dashboardFeedback, setDashboardFeedback] = useState<string | null>(null)
  const [celebrationState, setCelebrationState] = useState<CelebrationState | null>(null)
  const [markingSessionId, setMarkingSessionId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const chatClientIdRef = useRef<string | null>(null)
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(EMPTY_SETTINGS_FORM)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview')
  const [menuOpen, setMenuOpen] = useState(false)

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

  useEffect(() => {
    if (isDesktop) {
      setMenuOpen(false)
    }
  }, [isDesktop])

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
      setCheckInStep('energy')
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

  const feedbackBanner = dashboardFeedback ? (
    <div className="rounded-3xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
      {dashboardFeedback}
    </div>
  ) : null

  const statsCard = (
    <Card>
      <CardHeader className="gap-2">
        <span className="text-sm font-medium text-indigo-600">{userFriendlyName}</span>
        <CardTitle>Week {activeWeek.weekIndex} plan</CardTitle>
        <p className="text-sm text-neutral-300/80">Track your weekly momentum and celebrate each victory.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Sessions</p>
            <p className="mt-3 font-display text-3xl text-neutral-50">
              {completionSummary.completedSessions}/{completionSummary.totalSessions}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Completion</p>
            <p className="mt-3 font-display text-3xl text-neutral-50">{completionSummary.completionPercent}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Total sets</p>
            <p className="mt-3 font-display text-3xl text-neutral-50">{completionSummary.totalSets}</p>
          </div>
        </div>

        {progressTrend.length ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-200">Progress journey</h3>
            <ProgressTrendChart data={progressTrend} activeWeekIndex={activeWeek.weekIndex} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {weeks.map((week) => (
            <Button
              key={week.weekIndex}
              size="sm"
              variant={week.weekIndex === activeWeek.weekIndex ? 'secondary' : 'outline'}
              onClick={() => onSelectWeek(week.weekIndex)}
            >
              {week.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const sessionsCard = (
    <Card>
      <CardHeader className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Sessions this week</CardTitle>
          <p className="text-sm text-neutral-300/85">Mark your workouts and dive into the session log.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeWeek.sessions.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeWeek.sessions.map((session) => {
              const sessionProgress = weekProgress?.[session.sessionId]
              const state = evaluateSessionState(session, sessionProgress)
              const isCelebrating = celebrationState?.sessionId === session.sessionId
              const totalSets = session.exercises.reduce((sum, exercise) => sum + exercise.prescribedSets, 0)
              return (
                <article
                  key={session.sessionId}
                  className="surface-card relative flex min-h-[160px] flex-col gap-4 cursor-pointer border-white/15 p-4 transition-transform duration-200 hover:-translate-y-1 hover:shadow-soft"
                  onClick={() => onOpenSession(activeWeek.weekIndex, session.sessionId)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-50">{session.dayTitle}</p>
                      <p className="truncate text-xs text-neutral-300/80">{session.focusLabel}</p>
                    </div>
                    <Badge variant={statusBadgeVariant(state)} className="shrink-0 text-[10px] capitalize">
                      {state.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center text-[11px] text-neutral-300/75">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="font-display text-xl text-neutral-50">{session.exercises.length}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-neutral-400">Exercises</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="font-display text-xl text-neutral-50">{totalSets}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-neutral-400">Sets</div>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenSession(activeWeek.weekIndex, session.sessionId)
                      }}
                    >
                      Open session
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCelebrateSession(session, state)
                      }}
                      disabled={markingSessionId === session.sessionId}
                    >
                      {markingSessionId === session.sessionId ? 'Saving…' : 'Mark complete'}
                    </Button>
                  </div>
                  {isCelebrating && celebrationState ? (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {Array.from({ length: 12 }).map((_, index) => {
                        const left = Math.random() * 100
                        const top = Math.random() * 60
                        const confettiColor = confettiPalette[(index + session.sessionId.length) % confettiPalette.length]
                        return (
                          <span
                            key={`${session.sessionId}_confetti_${index}`}
                            className="confetti-piece"
                            style={{
                              '--tw-confetti-x': `${left - 50}%`,
                              '--tw-confetti-y': `${top + 120}%`,
                              backgroundColor: confettiColor,
                            } as ConfettiStyle}
                          />
                        )
                      })}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-neutral-100">No sessions this week</h4>
            <p className="mt-2 text-xs text-neutral-400">Your coach hasn't scheduled workouts for this week yet.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onSelectWeek(weekIndex > 0 ? weekIndex - 1 : weekIndex)}>
                View previous week
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setActiveSection('chat')}>
                Message coach
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const programOverviewCard = !clientProfile ? null : (
    <Card>
      <CardHeader className="mb-4 space-y-0">
        <div>
          <CardTitle className="text-lg">Program overview</CardTitle>
          <p className="text-sm text-neutral-300/80">Stay on top of your template, challenges, and renewal plan.</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Assigned template</p>
          <p className="mt-3 text-base font-semibold text-neutral-100">{assignedTemplate?.name ?? 'Custom coach build'}</p>
          <p className="mt-2 text-xs text-neutral-300/80">Adjustments applied: {clientProfile.templateAdjustments.length}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Active challenge</p>
          <p className="mt-3 text-base font-semibold text-neutral-100">{activeChallenge ? activeChallenge.name : 'None yet'}</p>
          <p className="mt-2 text-xs text-neutral-300/80">
            {activeChallenge
              ? `${activeChallenge.durationWeeks} week focus on ${activeChallenge.focus.join(', ')}`
              : 'Unlock a preset to fast-track progress.'}
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Subscription</p>
          <p className="mt-3 text-base font-semibold text-neutral-100">{subscriptionProduct?.name ?? 'Coach access'}</p>
          <p className="mt-2 text-xs text-neutral-300/80">{subscriptionProduct?.description ?? 'Work directly with your coach across shared plans.'}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">Renewal</p>
          <p className="mt-3 text-base font-semibold text-neutral-100">{clientProfile.subscription.autoRenew ? 'Auto-renew enabled' : 'Manual renewal'}</p>
          <p className="mt-2 text-xs text-neutral-300/80">
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
  )

  const checkInSteps: CheckInStep[] = ['energy', 'weight', 'notes', 'photo']
  const checkInStepIndex = checkInSteps.indexOf(checkInStep)
  const checkInProgress = Math.round(((checkInStepIndex + 1) / checkInSteps.length) * 100)

  const handleNextStep = () => {
    const currentIndex = checkInSteps.indexOf(checkInStep)
    if (currentIndex < checkInSteps.length - 1) {
      setCheckInStep(checkInSteps[currentIndex + 1])
    }
  }

  const handlePrevStep = () => {
    const currentIndex = checkInSteps.indexOf(checkInStep)
    if (currentIndex > 0) {
      setCheckInStep(checkInSteps[currentIndex - 1])
    }
  }

  const checkInsCard = !clientProfile ? null : (
    <Card>
      <CardHeader className="mb-4 space-y-0">
        <div>
          <CardTitle className="text-lg">Check-ins &amp; progress photos</CardTitle>
          <p className="text-sm text-neutral-300/80">Log your weekly update and keep photos to track your transformation.</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="space-y-4 rounded-2xl border border-white/12 bg-white/5 p-5">
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-neutral-400">
              <span>Step {checkInStepIndex + 1} of {checkInSteps.length}</span>
              <span>{checkInProgress}% complete</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300"
                style={{ width: `${checkInProgress}%` }}
              />
            </div>
            <div className="flex justify-between">
              {checkInSteps.map((step, index) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setCheckInStep(step)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors min-h-[44px] min-w-[44px]',
                    index <= checkInStepIndex
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-400/40'
                      : 'bg-white/5 text-neutral-400 border border-white/10',
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Step content */}
          {checkInStep === 'energy' && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="check-in-energy" className="text-sm font-semibold text-neutral-100">How's your energy?</Label>
                <p className="text-xs text-neutral-400 mb-2">Rate how energised you've felt this week.</p>
                <Select
                  id="check-in-energy"
                  value={checkInEnergy}
                  onChange={(event) => setCheckInEnergy(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="min-h-[44px]"
                >
                  <option value={5}>🔥 Peaks</option>
                  <option value={4}>💪 Strong</option>
                  <option value={3}>🙂 Balanced</option>
                  <option value={2}>😌 Below average</option>
                  <option value={1}>😴 Drained</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="check-in-stress" className="text-sm font-semibold text-neutral-100">Stress level</Label>
                <p className="text-xs text-neutral-400 mb-2">How stressed have you been?</p>
                <Select
                  id="check-in-stress"
                  value={checkInStress}
                  onChange={(event) => setCheckInStress(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="min-h-[44px]"
                >
                  <option value={1}>Very low</option>
                  <option value={2}>Manageable</option>
                  <option value={3}>Moderate</option>
                  <option value={4}>High</option>
                  <option value={5}>Very high</option>
                </Select>
              </div>
            </div>
          )}

          {checkInStep === 'weight' && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="check-in-weight" className="text-sm font-semibold text-neutral-100">Body weight</Label>
                <p className="text-xs text-neutral-400 mb-2">Optional — enter your current weight in kilograms.</p>
                <Input
                  id="check-in-weight"
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="e.g. 72.5"
                  value={checkInWeight}
                  onChange={(event) => setCheckInWeight(event.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            </div>
          )}

          {checkInStep === 'notes' && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="check-in-notes" className="text-sm font-semibold text-neutral-100">Notes to coach</Label>
                <p className="text-xs text-neutral-400 mb-2">Share anything relevant — sleep, diet, injuries, wins.</p>
                <Textarea
                  id="check-in-notes"
                  value={checkInNotes}
                  onChange={(event) => setCheckInNotes(event.target.value)}
                  rows={4}
                  placeholder="How did the week go? Any highlights or challenges?"
                />
              </div>
            </div>
          )}

          {checkInStep === 'photo' && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="check-in-photo" className="text-sm font-semibold text-neutral-100">Progress photo</Label>
                <p className="text-xs text-neutral-400 mb-2">Optional — capture visual progress. Max 2MB.</p>
                <Input
                  id="check-in-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoInputChange}
                  className="file:text-xs min-h-[44px]"
                />
              </div>
              {checkInPhotoPreviewUrl ? (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <img src={checkInPhotoPreviewUrl} alt="Progress preview" className="h-40 w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-xs text-neutral-400">
                  No photo selected
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2 pt-2">
            {checkInStepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="flex-1 min-h-[44px]"
              >
                Back
              </Button>
            )}
            {checkInStep === 'photo' ? (
              <Button
                type="button"
                onClick={handleSubmitCheckIn}
                disabled={checkInSubmitting}
                className="flex-1 min-h-[44px]"
              >
                {checkInSubmitting ? 'Submitting…' : 'Submit check-in'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNextStep}
                className="flex-1 min-h-[44px]"
              >
                Continue
              </Button>
            )}
          </div>

          {/* Skip link */}
          {checkInStep !== 'photo' && checkInStep !== 'energy' && (
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full text-center text-xs text-neutral-400 hover:text-neutral-300 transition-colors min-h-[44px]"
            >
              Skip this step
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">Recent check-ins</h3>
            {checkIns.length ? (
              <ul className="mt-3 space-y-3 text-sm">
                {checkIns.map((entry) => {
                  const submittedAt = new Date(entry.submittedAt)
                  return (
                    <li key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center justify-between text-xs text-neutral-300/80">
                        <span>
                          Checked in on {submittedAt.toLocaleDateString()} · {submittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>Week {entry.weekIndex}</span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-300/80">Energy {entry.energyLevel}/5 · Stress {entry.stressLevel}/5</p>
                      {entry.notes ? <p className="mt-2 text-sm text-neutral-100">{entry.notes}</p> : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="mt-2 text-xs font-medium text-neutral-200">No check-ins yet</p>
                <p className="mt-1 text-[10px] text-neutral-400">Share your first update to keep coaching feedback flowing.</p>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">Progress gallery</h3>
            {progressPhotos.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {progressPhotos.map((photo) => (
                  <figure key={photo.id} className="overflow-hidden rounded-2xl border border-white/10">
                    {photo.imageUrl ? (
                      <img src={photo.imageUrl} alt={photo.label} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="flex h-28 items-center justify-center bg-white/5 text-xs text-neutral-400">Photo pending</div>
                    )}
                    <figcaption className="px-2 py-1 text-[11px] text-neutral-300/80">{photo.label}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mt-2 text-xs font-medium text-neutral-200">No photos yet</p>
                <p className="mt-1 text-[10px] text-neutral-400">Upload progress photos to visualise your transformation.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const challengesCard = !clientProfile ? null : (
    <Card>
      <CardHeader className="mb-4 space-y-0">
        <div>
          <CardTitle className="text-lg">Challenge library</CardTitle>
          <p className="text-sm text-neutral-300/80">Unlock preset 8–12 week blocks with in-app payments.</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeChallenge ? (
          <article className="rounded-2xl border border-success/30 bg-success/15 px-5 py-4 text-sm text-success">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-success/80">Active</p>
            <h3 className="mt-2 text-base font-semibold text-neutral-100">{activeChallenge.name}</h3>
            <p className="mt-1 text-sm text-neutral-100/90">Focus: {activeChallenge.focus.join(', ')}</p>
            <p className="mt-2 text-xs text-neutral-100/80">
              Duration {activeChallenge.durationWeeks} weeks · Unlock {activeChallenge.requiredSubscriptionProductId ? 'via hybrid subscription' : 'with any plan'}
            </p>
          </article>
        ) : null}
        {eligibleChallenges.length ? (
          eligibleChallenges.map((challenge) => (
            <article key={challenge.id} className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-neutral-100">{challenge.name}</h3>
                <p className="text-neutral-300/80">{challenge.summary}</p>
                <p className="text-xs text-neutral-400">{challenge.durationWeeks} weeks · Unlock cost ₹{challenge.unlockCost}</p>
              </div>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => handleUnlockChallenge(challenge.id)}>
                Unlock challenge
              </Button>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-neutral-300/75">
            Upgrade to a hybrid or semi-annual subscription to unlock premium preset challenges.
          </div>
        )}
      </CardContent>
    </Card>
  )

  const billingCard = !clientProfile ? null : (
    <Card>
      <CardHeader className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-lg">Billing &amp; invoices</CardTitle>
          <p className="text-sm text-neutral-300/80">Manage renewals, download invoices, and review payment history.</p>
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
                    <TableCell className="text-xs font-semibold text-neutral-100">
                      {payment.currency === 'INR' ? `₹${payment.amount}` : `$${payment.amount}`}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={paymentStatusVariant(payment.status)} className="capitalize">
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-300/80">{payment.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
        <p className="text-sm text-neutral-300/80">No payments recorded yet. Billing begins once your first plan is activated.</p>
        )}
      </CardContent>
    </Card>
  )

  const notificationsCard = !clientProfile ? null : (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Notifications</CardTitle>
        <p className="text-sm text-neutral-300/80">Stay aligned with coach insights.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length ? (
          notifications.map((item) => (
            <div key={item.id} className={cn('rounded-2xl border px-4 py-3 text-sm shadow-sm', notificationToneClasses[item.tone])}>
              <div className="flex items-start gap-2">
                <span>{notificationIcons[item.tone]}</span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-neutral-300/80">{item.message}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-300/80">No alerts right now — keep up the great work!</p>
        )}
      </CardContent>
    </Card>
  )

  const upcomingCard = !clientProfile ? null : (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Upcoming check-ins</CardTitle>
        <p className="text-sm text-neutral-300/80">Plan ahead for your next updates.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingCheckIns.length ? (
          <ul className="space-y-2 text-sm">
            {upcomingCheckIns.map((entry, index) => {
              const date = new Date(entry)
              return (
                <li key={entry} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="font-semibold text-neutral-100">
                    {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-xs text-neutral-400">{index === 0 ? 'Next' : `+${index} wk`}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-300/80">Next check-in will be scheduled after your first update.</p>
        )}
        {lastCheckIn ? (
          <p className="text-xs text-neutral-400">Last check-in on {new Date(lastCheckIn.submittedAt).toLocaleString()}.</p>
        ) : (
          <p className="text-xs text-neutral-400">You have not logged a check-in yet.</p>
        )}
      </CardContent>
    </Card>
  )

  const coachChatCard = !clientProfile ? null : (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Coach chat</CardTitle>
          <p className="text-sm text-neutral-300/80">Share wins, questions, or quick updates.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div ref={chatLogRef} className="max-h-64 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          {chatMessages.length ? (
            chatMessages.map((message) => {
              const isClient = message.author === 'client'
              return (
                <div key={message.id} className={cn('flex', isClient ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                      isClient
                        ? 'bg-gradient-primary text-white shadow-soft'
                        : 'border border-white/10 bg-white/5 text-neutral-100',
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
            <p className="text-xs text-neutral-400">Say hello to your coach to kick things off.</p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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
  )

  const profileCard = !clientProfile ? null : (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Profile settings</CardTitle>
        <p className="text-sm text-neutral-300/80">Keep your coach up to date with key details.</p>
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
  )

  const scheduleUpdatesCard = clientProfile ? <ScheduleUpdates /> : null
  const athleteMessagingCard = clientProfile ? <AthleteMessaging /> : null

  const renderMobileSection = () => {
    switch (activeSection) {
      case 'overview': {
        // Get next incomplete session for quick access widget
        const nextIncompleteSession = activeWeek.sessions.find((session) => {
          const sessionProgress = weekProgress?.[session.sessionId]
          const state = evaluateSessionState(session, sessionProgress)
          return state !== 'completed'
        })
        return (
          <div className="space-y-6">
            {feedbackBanner}
            {/* Next Session Quick Access Widget */}
            {nextIncompleteSession ? (
              <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Up Next</p>
                      <p className="mt-1 truncate text-lg font-semibold text-white">{nextIncompleteSession.dayTitle}</p>
                      <p className="text-sm text-neutral-300/80">{nextIncompleteSession.focusLabel} · {nextIncompleteSession.exercises.length} exercises</p>
                    </div>
                    <Button
                      onClick={() => onOpenSession(activeWeek.weekIndex, nextIncompleteSession.sessionId)}
                      className="shrink-0 bg-white text-indigo-700 hover:bg-indigo-50"
                    >
                      Start Workout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            {statsCard}
            {programOverviewCard}
            {scheduleUpdatesCard}
            {upcomingCard}
          </div>
        )
      }
      case 'sessions':
        return (
          <div className="space-y-6">
            {feedbackBanner}
            {sessionsCard}
          </div>
        )
      case 'progress':
        return (
          <div className="space-y-6">
            {feedbackBanner}
            {checkInsCard}
          </div>
        )
      case 'chat':
        return (
          <div className="space-y-6">
            {feedbackBanner}
            {athleteMessagingCard}
            {coachChatCard}
          </div>
        )
      case 'challenges':
        return (
          <div className="space-y-6">
            {challengesCard}
          </div>
        )
      case 'billing':
        return (
          <div className="space-y-6">
            {billingCard}
          </div>
        )
      case 'notifications':
        return (
          <div className="space-y-6">
            {notificationsCard}
            {upcomingCard}
          </div>
        )
      case 'profile':
        return (
          <div className="space-y-6">
            {profileCard}
          </div>
        )
      default:
        return null
    }
  }

  if (isDesktop) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="flex flex-col gap-6">
          {feedbackBanner}
          {statsCard}
          {sessionsCard}
          {programOverviewCard}
          {checkInsCard}
          {challengesCard}
          {billingCard}
        </div>

        {clientProfile ? (
          <aside className="flex flex-col gap-6">
            {notificationsCard}
            {scheduleUpdatesCard}
            {athleteMessagingCard}
            {upcomingCard}
            {coachChatCard}
            {profileCard}
          </aside>
        ) : null}
      </div>
    )
  }

  // Find the next incomplete session
  const nextSession = useMemo(() => {
    if (!activeWeek?.sessions?.length) return null
    for (const session of activeWeek.sessions) {
      const sessionProgress = weekProgress?.[session.sessionId]
      const state = evaluateSessionState(session, sessionProgress)
      if (state !== 'completed') {
        return session
      }
    }
    return activeWeek.sessions[0] // fallback to first if all complete
  }, [activeWeek, weekProgress])

  return (
    <div className="relative pb-28">
      <div className="space-y-6">{renderMobileSection()}</div>
      <MobileNavTabs
        activeSection={activeSection}
        onSelectSection={(section) => setActiveSection(section)}
        notificationCount={notifications.length}
        unreadChatCount={0}
        pendingSessionCount={completionSummary.totalSessions - completionSummary.completedSessions}
      />
      <FloatingMenu
        open={menuOpen}
        onOpen={() => setMenuOpen(true)}
        onClose={() => setMenuOpen(false)}
        onSelectSection={(section) => {
          setActiveSection(section)
          setMenuOpen(false)
        }}
      />
      {/* FAB for quick workout logging */}
      {nextSession ? (
        <button
          type="button"
          onClick={() => onOpenSession(activeWeek.weekIndex, nextSession.sessionId)}
          className="fixed bottom-20 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105 active:scale-95 md:hidden"
          aria-label="Start next workout"
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

interface MobileNavTabsProps {
  activeSection: DashboardSection
  onSelectSection: (section: DashboardSection) => void
  notificationCount?: number
  unreadChatCount?: number
  pendingSessionCount?: number
}

function MobileNavTabs({ activeSection, onSelectSection, notificationCount = 0, unreadChatCount = 0, pendingSessionCount = 0 }: MobileNavTabsProps) {
  const tabs: Array<{ id: DashboardSection; label: string; icon: string; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: '🏠', badge: notificationCount > 0 ? notificationCount : undefined },
    { id: 'sessions', label: 'Sessions', icon: '📅', badge: pendingSessionCount > 0 ? pendingSessionCount : undefined },
    { id: 'progress', label: 'Progress', icon: '📈' },
    { id: 'chat', label: 'Chat', icon: '💬', badge: unreadChatCount > 0 ? unreadChatCount : undefined },
  ]

  return (
    <nav className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-full border border-white/10 bg-neutral-900/80 px-2 py-2 shadow-soft backdrop-blur-18 md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeSection
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectSection(tab.id)}
              className={cn(
                'relative flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold transition',
                isActive ? 'bg-white/10 text-neutral-50 shadow-inner' : 'text-neutral-300 hover:text-white',
              )}
            >
              <span aria-hidden="true" className="text-base">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

interface FloatingMenuProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
  onSelectSection: (section: DashboardSection) => void
}

function FloatingMenu({ open, onOpen, onClose, onSelectSection }: FloatingMenuProps) {
  const items: Array<{ id: DashboardSection; label: string; helper?: string }> = [
    { id: 'challenges', label: 'Challenges', helper: 'Unlock presets' },
    { id: 'billing', label: 'Billing', helper: 'Renewals & invoices' },
    { id: 'notifications', label: 'Notifications', helper: 'Alerts & check-ins' },
    { id: 'profile', label: 'Profile', helper: 'Account & details' },
  ]

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="fixed bottom-20 right-4 z-30 inline-flex h-12 min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-gradient-primary px-5 text-sm font-semibold text-white shadow-soft md:hidden"
      >
        Menu
      </button>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="Close menu" />
          <div className="absolute inset-x-4 bottom-24 space-y-3 rounded-3xl border border-white/15 bg-neutral-900/95 p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-100">More</p>
              <button type="button" onClick={onClose} className="text-xs text-neutral-300 hover:text-white">
                Close
              </button>
            </div>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className="w-full min-h-[48px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-neutral-100 transition hover:border-white/20 hover:bg-white/10"
              >
                <span className="font-semibold">{item.label}</span>
                {item.helper ? <p className="text-xs text-neutral-300">{item.helper}</p> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
