import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { useProgressContext } from '../../context/ProgressContext'
import { useProgramContext } from '../../context/ProgramContext'
import { AdminSettingsPanel } from './AdminSettingsPanel'
import { IntakeForm } from './components/IntakeForm'
import { SchedulingConsole } from './components/SchedulingConsole'
import { RemindersSystem } from './components/RemindersSystem'
import { ClientMessaging } from './components/ClientMessaging'
import { ComplianceDashboard } from './components/ComplianceDashboard'
import type { ClientIntakeRecord, Currency, TemplateExerciseSlot, WorkoutTemplate } from '../../types/program'
import {
  FALLBACK_EXERCISES,
  fetchExerciseLibrary,
  type ExerciseLibraryEntry,
} from '../../lib/exerciseLibrary'

type ExerciseSource = ExerciseLibraryEntry['source'] | 'template'

interface ExerciseDefinition {
  id: string
  name: string
  primaryFocus: string
  equipment: string
  movementType: string
  muscleGroup: string
  source: ExerciseSource
  defaultSets?: number
  defaultReps?: number
}

interface SelectedExercise extends ExerciseDefinition {
  week: number
  day: number
  templateSlotId?: string
  defaultSets?: number
  defaultReps?: number
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

const TEMPLATE_PATTERN_LABEL: Record<TemplateExerciseSlot['pattern'], string> = {
  compound: 'Compound Strength',
  accessory: 'Accessory Focus',
  power: 'Power Output',
  isolation: 'Isolation',
  conditioning: 'Conditioning',
}

const FALLBACK_LIBRARY: ExerciseDefinition[] = FALLBACK_EXERCISES.map((exercise) => ({ ...exercise }))

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

// Restrict metadata chips to muscle group to satisfy simplified spec (75% reduction vs previous four tags).
const VISIBLE_LIBRARY_METADATA_FIELDS = ['muscleGroup'] as const
const VISIBLE_SELECTED_METADATA_FIELDS = ['muscleGroup'] as const
const SELECTED_EXERCISES_STORAGE_KEY = 'admin:selectedExercises'

type DragPayload =
  | {
      source: 'library'
      exercise: ExerciseDefinition
    }
  | {
      source: 'selected'
      exerciseId: string
      originIndex: number
    }

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

function computeAllowedTemplateAdjustments(template: WorkoutTemplate): number {
  const totalSlots = template.days.reduce((sum, day) => sum + day.slots.length, 0)
  const allowance = Math.floor((template.adjustmentsAllowedPercent / 100) * totalSlots)
  return Math.max(1, allowance)
}

function buildTemplateLookup(template?: WorkoutTemplate) {
  const slotLookup = new Map<string, TemplateExerciseSlot>()
  if (!template) return slotLookup
  template.days.forEach((day) => {
    day.slots.forEach((slot) => {
      slotLookup.set(slot.slotId, slot)
    })
  })
  return slotLookup
}

function countTemplateAdjustments(exercises: SelectedExercise[], templateLookup: Map<string, TemplateExerciseSlot>): number {
  return exercises.reduce((count, exercise) => {
    if (!exercise.templateSlotId) return count
    const slot = templateLookup.get(exercise.templateSlotId)
    if (!slot) return count
    return exercise.name !== slot.baseExercise ? count + 1 : count
  }, 0)
}

function formatCurrency(amount: number, currency: Currency) {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

type AdminTab = 'overview' | 'planning' | 'clients' | 'calendar' | 'messaging' | 'compliance' | 'business' | 'settings'
type ClientSubTab = 'roster' | 'intake'
type CalendarSubTab = 'scheduling' | 'reminders'

const ADMIN_TABS: Array<{ id: AdminTab; label: string; icon?: string }> = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'planning', label: 'Plan Builder', icon: '📝' },
  { id: 'clients', label: 'Clients', icon: '👥' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'messaging', label: 'Messages', icon: '💬' },
  { id: 'compliance', label: 'Compliance', icon: '✅' },
  { id: 'business', label: 'Business', icon: '💰' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

const PLAN_HISTORY_TIMEFRAMES: Array<{ id: 'all' | '7' | '30' | '90'; label: string; days?: number }> = [
  { id: 'all', label: 'All time' },
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
]

const CLIENT_STATUS_OPTIONS = [
  { id: 'all', label: 'All statuses' },
  { id: 'active', label: 'Active' },
  { id: 'grace', label: 'Grace period' },
  { id: 'past_due', label: 'Past due' },
  { id: 'paused', label: 'Paused' },
  { id: 'cancelled', label: 'Cancelled' },
]

export function AdminDashboard() {
  const { user, users } = useAuthContext()
  const {
    strengthCategories: strengthCategoryDefs,
    workoutTemplates,
    challenges,
    subscriptionProducts,
    clients,
    revenueSnapshot,
    renewalReminders,
    developmentCostSummary,
    currentMonthRevenueOverride,
    setManualRevenueForCurrentMonth,
    assignTemplate,
    swapTemplateSlot,
    toggleAutoRenew,
    extendSubscription,
    unlockChallenge,
  } = useProgramContext()
  const { summaries } = useProgressContext()

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

  const subscriptionProductLookup = useMemo(
    () => new Map(subscriptionProducts.map((product) => [product.id, product])),
    [subscriptionProducts],
  )

  const clientRoster = useMemo(
    () =>
      clients.map((client) => ({
        client,
        progress: summaries.find((summary) => summary.userId === client.userId) ?? null,
        product: subscriptionProductLookup.get(client.subscription.productId) ?? null,
      })),
    [clients, subscriptionProductLookup, summaries],
  )

  const productFilterOptions = useMemo(() => {
    const entries = new Map<string, string>()
    let hasCustom = false
    clientRoster.forEach(({ product }) => {
      if (product) {
        entries.set(product.id, product.name)
      } else {
        hasCustom = true
      }
    })
    const options = Array.from(entries.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
    if (hasCustom) {
      options.push({ id: 'custom', label: 'Custom plan' })
    }
    return options
  }, [clientRoster])

  const challengeDifficultyOptions = useMemo(() => {
    const levels = Array.from(new Set(challenges.map((challenge) => String(challenge.difficulty)))).filter(Boolean)
    return levels.sort((a, b) => {
      const aNumber = Number(a)
      const bNumber = Number(b)
      if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
        return aNumber - bNumber
      }
      return a.localeCompare(b)
    })
  }, [challenges])

  const templateCountByCategory = useMemo(() => {
    const map = new Map<string, number>()
    workoutTemplates.forEach((template) => {
      template.categoryBreakdown.forEach((category) => {
        map.set(category, (map.get(category) ?? 0) + 1)
      })
    })
    return map
  }, [workoutTemplates])

  const clientByUserId = useMemo(() => new Map(clients.map((client) => [client.userId, client])), [clients])
  const currencyForDisplay = useMemo(() => (subscriptionProducts[0]?.currency ?? 'INR') as Currency, [subscriptionProducts])
  const activeClientCount = useMemo(
    () => clients.filter((client) => client.subscription.status === 'active').length,
    [clients],
  )
  const pastDueClientCount = useMemo(
    () => clients.filter((client) => client.subscription.status === 'past_due').length,
    [clients],
  )
  const completionSamples = useMemo(() => {
    const completionValues = clientRoster
      .map(({ progress }) => progress?.completionPercent)
      .filter((value): value is number => typeof value === 'number')
    if (!completionValues.length) {
      return { percent: null, sampleSize: 0 }
    }
    const percent = Math.round(completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length)
    return { percent, sampleSize: completionValues.length }
  }, [clientRoster])
  const recentlyActiveCount = useMemo(() => {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 7
    return clientRoster.reduce((count, { progress }) => {
      if (!progress?.lastActiveAt) return count
      const lastUpdated = new Date(progress.lastActiveAt).getTime()
      return Number.isFinite(lastUpdated) && lastUpdated >= cutoff ? count + 1 : count
    }, 0)
  }, [clientRoster])
  const highImpactMetrics = useMemo(
    () => [
      {
        label: 'Monthly recurring revenue',
        value: formatCurrency(revenueSnapshot.monthlyRecurringRevenue, currencyForDisplay),
        helper: 'Across active subscriptions',
      },
      {
        label: 'Active clients',
        value: String(activeClientCount),
        helper: `${clients.length} total coached athletes`,
      },
      {
        label: 'Average completion',
        value: completionSamples.percent !== null ? `${completionSamples.percent}%` : '—',
        helper:
          completionSamples.sampleSize > 0
            ? `Based on ${completionSamples.sampleSize} tracked athletes`
            : 'No workout logs captured yet',
      },
      {
        label: 'Active this week',
        value: String(recentlyActiveCount),
        helper: 'Updated progress in the last 7 days',
      },
      {
        label: 'Upcoming renewals',
        value: String(revenueSnapshot.upcomingRenewals),
        helper: 'Due within the next 14 days',
      },
      {
        label: 'Open invoices',
        value: String(revenueSnapshot.pendingInvoices),
        helper: pastDueClientCount ? `${pastDueClientCount} clients past due` : 'All accounts current',
      },
    ],
    [
      activeClientCount,
      clients.length,
      completionSamples,
      currencyForDisplay,
      pastDueClientCount,
      recentlyActiveCount,
      revenueSnapshot,
    ],
  )

  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseDefinition[]>(FALLBACK_LIBRARY)
  const [exerciseLibraryStatus, setExerciseLibraryStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [exerciseFetchError, setExerciseFetchError] = useState<string | null>(null)
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('')
  const [visibleCount, setVisibleCount] = useState(5)
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([])
  const [dragContext, setDragContext] = useState<DragPayload | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const [activeTemplateId, setActiveTemplateId] = useState('')
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [weekCount, setWeekCount] = useState(4)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [planNotes, setPlanNotes] = useState('')
  const [planHistory, setPlanHistory] = useState<PlanHistoryRecord[]>(FALLBACK_PLAN_HISTORY)
  const [notifications, setNotifications] = useState<NotificationRecord[]>(FALLBACK_NOTIFICATIONS)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [latestIntakePreview, setLatestIntakePreview] = useState<ClientIntakeRecord | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [clientSubTab, setClientSubTab] = useState<ClientSubTab>('roster')
  const [calendarSubTab, setCalendarSubTab] = useState<CalendarSubTab>('scheduling')
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [challengeSearch, setChallengeSearch] = useState('')
  const [challengeDifficultyFilter, setChallengeDifficultyFilter] = useState('all')
  const [clientSearch, setClientSearch] = useState('')
  const [clientStatusFilter, setClientStatusFilter] = useState('all')
  const [clientProductFilter, setClientProductFilter] = useState('all')
  const [planSearch, setPlanSearch] = useState('')
  const [planTimeframe, setPlanTimeframe] = useState<'all' | '7' | '30' | '90'>('30')
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all')
  const [isEditingMonthlyRevenue, setIsEditingMonthlyRevenue] = useState(false)
  const [monthlyRevenueDraft, setMonthlyRevenueDraft] = useState('')
  const [monthlyRevenueError, setMonthlyRevenueError] = useState<string | null>(null)
  const [quickActionClientId, setQuickActionClientId] = useState<string | null>(null)
  const hasHydratedSelections = useRef(false)

  useEffect(() => {
    if (!selectedAthleteId && clientRoster.length) {
      setSelectedAthleteId(clientRoster[0].client.userId)
    }
  }, [clientRoster, selectedAthleteId])

  const activeTemplate = useMemo(
    () => workoutTemplates.find((template) => template.id === activeTemplateId),
    [activeTemplateId, workoutTemplates],
  )

  const templateSlotLookup = useMemo(() => buildTemplateLookup(activeTemplate), [activeTemplate])

  const templateAdjustmentStats = useMemo(() => {
    if (!activeTemplate) return null
    const allowed = computeAllowedTemplateAdjustments(activeTemplate)
    const used = countTemplateAdjustments(selectedExercises, templateSlotLookup)
    return { allowed, used }
  }, [activeTemplate, selectedExercises, templateSlotLookup])

  const templateAdjustmentLimitLabel = useMemo(() => {
    if (!activeTemplate) return null
    const allowed = computeAllowedTemplateAdjustments(activeTemplate)
    return `${allowed} slot${allowed === 1 ? '' : 's'} (${activeTemplate.adjustmentsAllowedPercent}% flex)`
  }, [activeTemplate])

  const selectedAthleteClient = useMemo(() => {
    if (!selectedAthleteId) return null
    return clientByUserId.get(selectedAthleteId) ?? null
  }, [clientByUserId, selectedAthleteId])

  const muscleGroupOptions = useMemo(() => {
    const options = new Set<string>()
    exerciseLibrary.forEach((exercise) => {
      if (exercise.muscleGroup) {
        options.add(exercise.muscleGroup)
      }
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [exerciseLibrary])

  const selectedExerciseSummary = useMemo(() => {
    if (!selectedExercises.length) return null
    const weekMap = new Map<number, number>()
    const muscleGroupMap = new Map<string, number>()
    selectedExercises.forEach((exercise) => {
      weekMap.set(exercise.week, (weekMap.get(exercise.week) ?? 0) + 1)
      muscleGroupMap.set(exercise.muscleGroup, (muscleGroupMap.get(exercise.muscleGroup) ?? 0) + 1)
    })

    const weekBadges = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, count]) => `Week ${week}: ${count}`)

    const muscleGroupBadges = Array.from(muscleGroupMap.entries())
      .sort((a, b) => {
        if (b[1] === a[1]) {
          return a[0].localeCompare(b[0])
        }
        return b[1] - a[1]
      })
      .slice(0, 3)
      .map(([group, count]) => `${group} (${count})`)

    return {
      total: selectedExercises.length,
      weekBadges,
      muscleGroupBadges,
      metadataNote: `Visible metadata (${VISIBLE_SELECTED_METADATA_FIELDS.length}): muscle group only`,
    }
  }, [selectedExercises])

  const planPreviewTitle = useMemo(() => {
    if (!selectedExercises.length) return null
    const athlete = athletes.find((entry) => entry.id === selectedAthleteId)
    const primaryLabel = selectedExercises[0]?.name ?? 'Training block'
    if (!athlete) {
      return `${weekCount}-week plan · ${primaryLabel}`
    }
    return `${athlete.name.split(' ')[0] ?? athlete.name} · ${weekCount}-week plan · ${primaryLabel}`
  }, [athletes, selectedAthleteId, selectedExercises, weekCount])

  const filteredExercises = useMemo(() => {
    const query = exerciseQuery.trim().toLowerCase()
    return exerciseLibrary.filter((exercise) => {
      const matchesMuscleGroup = muscleGroupFilter ? exercise.muscleGroup === muscleGroupFilter : true
      const matchesQuery = query
        ? [
            exercise.name,
            exercise.primaryFocus,
            exercise.movementType,
            exercise.muscleGroup,
            exercise.equipment,
          ]
            .join(' ')
            .toLowerCase()
            .includes(query)
        : true
      return matchesMuscleGroup && matchesQuery
    })
  }, [exerciseLibrary, exerciseQuery, muscleGroupFilter])

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

  const filteredStrengthCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase()
    if (!query) return strengthCategoryDefs
    return strengthCategoryDefs.filter((category) => {
      const tokens = [
        category.label,
        category.description,
        category.recommendedUse,
        ...category.highlights,
        ...category.sampleSplits,
      ].filter(Boolean)
      return tokens.some((value) => String(value).toLowerCase().includes(query))
    })
  }, [categorySearch, strengthCategoryDefs])

  const filteredChallenges = useMemo(() => {
    const query = challengeSearch.trim().toLowerCase()
    return challenges.filter((challenge) => {
      const matchesQuery = query
        ? [challenge.name, challenge.summary, challenge.outcomes.join(' ')]
            .some((value) => String(value).toLowerCase().includes(query))
        : true
      const matchesDifficulty = challengeDifficultyFilter === 'all'
        ? true
        : String(challenge.difficulty) === challengeDifficultyFilter
      return matchesQuery && matchesDifficulty
    })
  }, [challengeDifficultyFilter, challengeSearch, challenges])

  const filteredClientRoster = useMemo(() => {
    const search = clientSearch.trim().toLowerCase()
    return clientRoster.filter(({ client, product }) => {
      const matchesStatus = clientStatusFilter === 'all' ? true : client.subscription.status === clientStatusFilter
      const matchesProduct = (() => {
        if (clientProductFilter === 'all') return true
        if (clientProductFilter === 'custom') return !product
        return product?.id === clientProductFilter
      })()
      const matchesSearch = search
        ? [client.name, client.goal, product?.name ?? '']
            .some((value) => String(value).toLowerCase().includes(search))
        : true
      return matchesStatus && matchesProduct && matchesSearch
    })
  }, [clientProductFilter, clientRoster, clientSearch, clientStatusFilter])

  const sortedPlanHistory = useMemo(
    () => [...planHistory].sort((a, b) => b.createdAt - a.createdAt),
    [planHistory],
  )

  const filteredPlanHistory = useMemo(() => {
    const query = planSearch.trim().toLowerCase()
    const timeframe = PLAN_HISTORY_TIMEFRAMES.find((entry) => entry.id === planTimeframe)
    return sortedPlanHistory.filter((plan) => {
      const matchesQuery = query
        ? [plan.planName, plan.athleteName]
            .some((value) => value.toLowerCase().includes(query))
        : true
      const matchesTimeframe = timeframe?.days
        ? Date.now() - plan.createdAt <= timeframe.days * 24 * 60 * 60 * 1000
        : true
      return matchesQuery && matchesTimeframe
    })
  }, [planSearch, planTimeframe, sortedPlanHistory])

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.timestamp - a.timestamp),
    [notifications],
  )

  const filteredNotifications = useMemo(
    () =>
      sortedNotifications.filter((notification) =>
        notificationFilter === 'unread' ? !notification.read : true,
      ),
    [notificationFilter, sortedNotifications],
  )

  const hasUnreadNotifications = useMemo(() => notifications.some((entry) => !entry.read), [notifications])
  const canSubmitPlan = Boolean(selectedAthleteId && startDate && selectedExercises.length)

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    async function loadExercises() {
      setExerciseLibraryStatus('loading')
      setExerciseFetchError(null)
      try {
        const data = await fetchExerciseLibrary(controller.signal)
        if (!isActive) return
        if (data.length) {
          setExerciseLibrary(data.map((entry) => ({ ...entry })))
        }
        setExerciseLibraryStatus('success')
      } catch (error) {
        console.error('Failed to load exercise library', error)
        if (!isActive) return
        setExerciseLibraryStatus('error')
        setExerciseFetchError(error instanceof Error ? error.message : 'Unknown error')
        setExerciseLibrary(FALLBACK_LIBRARY)
      }
    }

    loadExercises()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    setVisibleCount(5)
  }, [exerciseLibrary, exerciseQuery, muscleGroupFilter])

  useEffect(() => {
    if (!toastMessage) return
    const timeout = setTimeout(() => setToastMessage(null), 4500)
    return () => clearTimeout(timeout)
  }, [toastMessage])

  // Global search keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setIsSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    setSelectedExercises((previous) =>
      previous.map((exercise) => (exercise.week <= weekCount ? exercise : { ...exercise, week: weekCount })),
    )
  }, [weekCount])

  useEffect(() => {
    if (typeof window === 'undefined' || hasHydratedSelections.current) {
      return
    }
    try {
      const raw = window.localStorage.getItem(SELECTED_EXERCISES_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SelectedExercise[]
        if (Array.isArray(parsed) && parsed.length) {
          setSelectedExercises(
            parsed.map((exercise) => ({
              ...exercise,
              defaultSets: exercise.defaultSets ?? 3,
              defaultReps: exercise.defaultReps ?? 10,
            })),
          )
        }
      }
    } catch (error) {
      console.warn('Failed to hydrate selected exercises', error)
    } finally {
      hasHydratedSelections.current = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydratedSelections.current) {
      return
    }
    try {
      if (selectedExercises.length) {
        window.localStorage.setItem(SELECTED_EXERCISES_STORAGE_KEY, JSON.stringify(selectedExercises))
      } else {
        window.localStorage.removeItem(SELECTED_EXERCISES_STORAGE_KEY)
      }
    } catch (error) {
      console.warn('Failed to persist selected exercises', error)
    }
  }, [selectedExercises])

  const handleLibraryDragStart = useCallback((event: React.DragEvent<HTMLElement>, exercise: ExerciseDefinition) => {
    const payload: DragPayload = { source: 'library', exercise }
    setDragContext(payload)
    event.dataTransfer.effectAllowed = 'copyMove'
    event.dataTransfer.setData('application/json', JSON.stringify(payload))
  }, [])

  const handleSelectedDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, exerciseId: string, originIndex: number) => {
      const payload: DragPayload = { source: 'selected', exerciseId, originIndex }
      setDragContext(payload)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('application/json', JSON.stringify(payload))
    },
    [],
  )

  const resetDragState = useCallback(() => {
    setDragContext(null)
    setDropIndicatorIndex(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    resetDragState()
  }, [resetDragState])

  const handleAddExercise = useCallback(
    (exercise: ExerciseDefinition, insertIndex?: number | null) => {
      setSelectedExercises((previous) => {
        if (previous.some((entry) => entry.id === exercise.id)) {
          return previous
        }
        const nextWeek = Math.min(previous.length + 1, weekCount)
        const nextDay = (previous.length % 7) + 1
        const withNew = [
          ...previous,
          {
            ...exercise,
            week: nextWeek,
            day: nextDay,
            defaultSets: exercise.defaultSets ?? 3,
            defaultReps: exercise.defaultReps ?? 10,
          },
        ]
        if (insertIndex == null) {
          return withNew
        }
        const boundedIndex = Math.max(0, Math.min(insertIndex, withNew.length - 1))
        const [added] = withNew.splice(withNew.length - 1, 1)
        withNew.splice(boundedIndex, 0, added)
        return withNew
      })
    },
    [weekCount],
  )

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    setSelectedExercises((previous) => previous.filter((exercise) => exercise.id !== exerciseId))
  }, [])

  const handleReorderExercise = useCallback((exerciseId: string, targetIndex: number) => {
    setSelectedExercises((previous) => {
      const currentIndex = previous.findIndex((exercise) => exercise.id === exerciseId)
      if (currentIndex === -1) return previous
      const next = [...previous]
      const [moved] = next.splice(currentIndex, 1)
      const boundedIndex = Math.max(0, Math.min(targetIndex, next.length))
      next.splice(boundedIndex, 0, moved)
      return next
    })
  }, [])

  const parseDragPayload = useCallback(
    (event: React.DragEvent): DragPayload | null => {
      const fallback = dragContext
      try {
        const raw = event.dataTransfer.getData('application/json')
        if (!raw) {
          return fallback
        }
        const parsed = JSON.parse(raw) as DragPayload
        if (parsed && (parsed.source === 'library' || parsed.source === 'selected')) {
          return parsed
        }
      } catch (error) {
        console.warn('Failed to parse drag payload', error)
      }
      return fallback
    },
    [dragContext],
  )

  const handleLibraryDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      const payload = parseDragPayload(event)
      if (!payload || payload.source !== 'selected') return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    },
    [parseDragPayload],
  )

  const handleLibraryDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      const payload = parseDragPayload(event)
      if (payload?.source === 'selected') {
        handleRemoveExercise(payload.exerciseId)
      }
      resetDragState()
    },
    [handleRemoveExercise, parseDragPayload, resetDragState],
  )

  const handleSelectedListDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const payload = parseDragPayload(event)
      if (!payload) return
      event.preventDefault()
      event.dataTransfer.dropEffect = payload.source === 'library' ? 'copy' : 'move'
      if (!selectedExercises.length) {
        setDropIndicatorIndex(0)
      } else if (dropIndicatorIndex == null) {
        setDropIndicatorIndex(selectedExercises.length)
      }
    },
    [dropIndicatorIndex, parseDragPayload, selectedExercises.length],
  )

  const handleSelectedListDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const payload = parseDragPayload(event)
      if (!payload) {
        resetDragState()
        return
      }
      const fallbackIndex = selectedExercises.length
      const targetIndex = dropIndicatorIndex ?? fallbackIndex
      if (payload.source === 'library') {
        handleAddExercise(payload.exercise, targetIndex)
      } else {
        handleReorderExercise(payload.exerciseId, targetIndex)
      }
      resetDragState()
    },
    [dropIndicatorIndex, handleAddExercise, handleReorderExercise, parseDragPayload, resetDragState, selectedExercises.length],
  )

  const handleSelectedListDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setDropIndicatorIndex(null)
    }
  }, [])

  const handleSelectedCardDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>, index: number) => {
      const payload = parseDragPayload(event)
      if (!payload) return
      event.preventDefault()
      event.dataTransfer.dropEffect = payload.source === 'library' ? 'copy' : 'move'
      const rect = event.currentTarget.getBoundingClientRect()
      const offset = event.clientY - rect.top
      const shouldPlaceBefore = offset < rect.height / 2
      const nextIndex = shouldPlaceBefore ? index : index + 1
      setDropIndicatorIndex(nextIndex)
    },
    [parseDragPayload],
  )

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

  const handleSetsChange = (exerciseId: string, sets: number) => {
    setSelectedExercises((previous) =>
      previous.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, defaultSets: Math.max(0, Math.min(sets, 20)) } : exercise,
      ),
    )
  }

  const handleRepsChange = (exerciseId: string, reps: number) => {
    setSelectedExercises((previous) =>
      previous.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, defaultReps: Math.max(0, Math.min(reps, 50)) } : exercise,
      ),
    )
  }

  const handleClearSelected = () => {
    if (!selectedExercises.length) return
    const shouldClear = typeof window === 'undefined' || window.confirm('Remove all selected exercises?')
    if (!shouldClear) {
      return
    }
    setSelectedExercises([])
  }

  const handleLoadTemplate = (templateId: string) => {
    if (selectedExercises.length > 0) {
      const shouldReplace = typeof window === 'undefined' || window.confirm('Loading a template will replace your current exercises. Continue?')
      if (!shouldReplace) {
        return
      }
    }
    const template = workoutTemplates.find((entry) => entry.id === templateId)
    if (!template) return

    const nextExercises: SelectedExercise[] = []
    template.days.forEach((day, dayIndex) => {
      day.slots.forEach((slot) => {
        nextExercises.push({
          id: `${template.id}_${slot.slotId}`,
          name: slot.baseExercise,
          primaryFocus: `${day.emphasis}`,
          equipment: slot.equipment,
          movementType: TEMPLATE_PATTERN_LABEL[slot.pattern],
          muscleGroup: slot.focusTag || day.emphasis || TEMPLATE_PATTERN_LABEL[slot.pattern],
          source: 'template',
          week: 1,
          day: Math.min(dayIndex + 1, 7),
          templateSlotId: slot.slotId,
          defaultSets: slot.prescribedSets ?? 3,
          defaultReps: slot.prescribedReps ?? 10,
        })
      })
    })

    setSelectedExercises(nextExercises)
    setActiveTemplateId(templateId)
    setWeekCount(Math.min(Math.max(template.durationWeeks, 1), 24))
    setPlanNotes(template.notes.join('\n'))
    const allowed = computeAllowedTemplateAdjustments(template)
    setToastMessage(`${template.name} loaded. Adjust up to ${allowed} slots (${template.adjustmentsAllowedPercent}% flex).`)
  }

  const handleTemplateSlotChange = (slotId: string, nextExercise: string) => {
    if (!activeTemplate) return

    setSelectedExercises((previous) => {
      const nextList = previous.map((exercise) =>
        exercise.templateSlotId === slotId
          ? {
              ...exercise,
              name: nextExercise,
            }
          : exercise,
      )

      const allowed = computeAllowedTemplateAdjustments(activeTemplate)
      const adjustments = countTemplateAdjustments(nextList, templateSlotLookup)
      if (adjustments > allowed) {
        setToastMessage(`Template adjustments capped at ${allowed} (${activeTemplate.adjustmentsAllowedPercent}% limit).`)
        return previous
      }
      return nextList
    })
  }

  const handleSubmitPlan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const athlete = athletes.find((entry) => entry.id === selectedAthleteId)
    if (!canSubmitPlan || !athlete) {
      setToastMessage('Please complete the form and add exercises.')
      return
    }

    const focusBreakdown = Array.from(new Set(selectedExercises.map((exercise) => exercise.primaryFocus)))
    const fallbackTitle = `${athlete.name.split(' ')[0] ?? athlete.name} · ${weekCount}-week plan · ${selectedExercises[0]?.name ?? 'Training block'}`
    const planTitle = planPreviewTitle ?? fallbackTitle

    const newPlan: PlanHistoryRecord = {
      id: generateId('plan'),
      athleteId: athlete.id,
      athleteName: athlete.name,
      planName: planTitle,
      weeks: weekCount,
      startDate,
      exerciseCount: selectedExercises.length,
      focusBreakdown,
      createdAt: Date.now(),
    }

    const newNotification: NotificationRecord = {
      id: generateId('notif'),
      athleteId: athlete.id,
      athleteName: athlete.name,
      message: `${planTitle} (${selectedExercises.length} exercises) assigned to you`,
      timestamp: Date.now(),
      read: false,
    }

    if (selectedAthleteClient && activeTemplateId && activeTemplate) {
      const previousTemplateId = selectedAthleteClient.assignedTemplateId
      const previousAdjustments = [...selectedAthleteClient.templateAdjustments]
      try {
        assignTemplate(selectedAthleteClient.id, activeTemplateId)
        for (const exercise of selectedExercises) {
          if (!exercise.templateSlotId) continue
          const templateDay = activeTemplate.days.find((day) => day.slots.some((slot) => slot.slotId === exercise.templateSlotId))
          const templateSlot = templateDay?.slots.find((slot) => slot.slotId === exercise.templateSlotId)
          if (!templateDay || !templateSlot) continue
          if (exercise.name === templateSlot.baseExercise) continue
          const swapApplied = swapTemplateSlot(selectedAthleteClient.id, activeTemplateId, templateDay.dayId, templateSlot.slotId, exercise.name)
          if (!swapApplied) {
            throw new Error('Template adjustment limit reached while assigning exercises.')
          }
        }
      } catch (error) {
        console.error('Failed to assign template adjustments', error)
        if (previousTemplateId) {
          assignTemplate(selectedAthleteClient.id, previousTemplateId)
          previousAdjustments.forEach((adjustment) => {
            swapTemplateSlot(selectedAthleteClient.id, previousTemplateId, adjustment.dayId, adjustment.slotId, adjustment.replacementExercise)
          })
        } else {
          assignTemplate(selectedAthleteClient.id, '')
        }
        setToastMessage('Unable to assign the template. No changes were applied.')
        return
      }
    }

    setPlanHistory((previous) => [newPlan, ...previous])
    setNotifications((previous) => [newNotification, ...previous])
    setToastMessage(`${planTitle} shared with ${athlete.name}`)

    setSelectedExercises([])
    setSelectedAthleteId('')
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

  const overviewContent = (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-900/15 bg-slate-900 p-6 text-white shadow-card">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Performance at a glance</h2>
            <p className="text-sm text-white/70">Track the KPIs that matter before diving into programme details.</p>
          </div>
        </header>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {highImpactMetrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl bg-white/10 p-4 shadow-inner backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
              {metric.helper ? <p className="mt-2 text-xs text-white/60">{metric.helper}</p> : null}
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Workout categorisation</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Strength templates grouped by push, pull, legs, upper, and custom programmes.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex w-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1 sm:w-64">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mr-2 h-4 w-4 stroke-slate-400"
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
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Search categories"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {filteredStrengthCategories.length} {filteredStrengthCategories.length === 1 ? 'category' : 'categories'}
            </span>
          </div>
        </header>
        {filteredStrengthCategories.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredStrengthCategories.map((category) => {
              const templateCount = templateCountByCategory.get(category.slug) ?? templateCountByCategory.get(category.id) ?? 0
              return (
                <article key={category.id} className="space-y-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm shadow-sm">
                  <header className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{category.label}</h3>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                      {templateCount} template{templateCount === 1 ? '' : 's'}
                    </span>
                  </header>
                  <p className="text-slate-600 leading-relaxed">{category.description}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                    {category.highlights.map((highlight) => (
                      <span key={highlight} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        {highlight}
                      </span>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sample splits</p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-600 leading-relaxed">
                      {category.sampleSplits.map((split) => (
                        <li key={split}>• {split}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-500">Best for: {category.recommendedUse}</p>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No categories match this search. Try a different keyword.
          </div>
        )}
      </section>


      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Preset challenges</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              8–12 week programmes that clients unlock via subscription upgrades. Filter by name or difficulty to find the right fit.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-3">
            <div className="relative flex w-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1 md:w-64">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mr-2 h-4 w-4 stroke-slate-400"
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
                value={challengeSearch}
                onChange={(event) => setChallengeSearch(event.target.value)}
                placeholder="Search challenges"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              Difficulty
              <select
                value={challengeDifficultyFilter}
                onChange={(event) => setChallengeDifficultyFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All levels</option>
                {challengeDifficultyOptions.map((option) => (
                  <option key={option} value={option}>
                    Level {option}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs font-semibold text-slate-500">
              {filteredChallenges.length} {filteredChallenges.length === 1 ? 'challenge' : 'challenges'}
            </span>
          </div>
        </header>
        <p className="mt-4 text-xs font-semibold text-indigo-600">Select an athlete above to assign a challenge.</p>
        {filteredChallenges.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredChallenges.map((challenge) => {
              const requiredProduct = challenge.requiredSubscriptionProductId
                ? subscriptionProductLookup.get(challenge.requiredSubscriptionProductId)
                : null
              const selectedClientEligible =
                selectedAthleteClient &&
                (!requiredProduct || selectedAthleteClient.subscription.productId === requiredProduct.id)
              const alreadyActive = selectedAthleteClient?.activeChallengeId === challenge.id
              return (
                <article key={challenge.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 px-4 py-4 text-sm shadow-sm">
                  <div className="space-y-3">
                    <header className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900">{challenge.name}</h3>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                        {challenge.durationWeeks} week{challenge.durationWeeks === 1 ? '' : 's'}
                      </span>
                    </header>
                    <p className="text-slate-600 leading-relaxed">{challenge.summary}</p>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Primary outcomes</p>
                      <ul className="mt-1 space-y-1 text-xs text-slate-600 leading-relaxed">
                        {challenge.outcomes.map((outcome) => (
                          <li key={outcome}>• {outcome}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      Unlock: {formatCurrency(challenge.unlockCost, challenge.currency)} · Level {challenge.difficulty}
                    </p>
                    {requiredProduct ? (
                      <p className="text-[11px] text-slate-500">Requires {requiredProduct.name}</p>
                    ) : (
                      <p className="text-[11px] text-slate-500">Available with any active subscription</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    disabled={!selectedClientEligible || alreadyActive}
                    onClick={() => {
                      if (!selectedAthleteClient) {
                        setToastMessage('Select an athlete to assign a challenge.')
                        return
                      }
                      const success = unlockChallenge(selectedAthleteClient.id, challenge.id)
                      setToastMessage(
                        success
                          ? `${challenge.name} unlocked for ${selectedAthleteClient.name}`
                          : 'Subscription tier upgrade required before unlocking this challenge.',
                      )
                    }}
                  >
                    {alreadyActive ? 'Already assigned' : selectedClientEligible ? 'Assign to athlete' : 'Upgrade subscription first'}
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No challenges found. Adjust the filters to explore more programmes.
          </div>
        )}
      </section>
    </div>
  )

  const planningContent = (
    <div className="space-y-6">
      {/* Two-column exercise panels */}
      <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(320px,1fr)] lg:items-start">
        <section
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
          onDragOver={handleLibraryDragOver}
          onDrop={handleLibraryDrop}
        >
        <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Exercise library</h2>
            <p className="text-xs text-slate-500">Drag exercises or tap “Add” to queue them for your session.</p>
            {exerciseLibraryStatus === 'loading' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                Syncing live exercise data…
              </span>
            ) : null}
            {exerciseLibraryStatus === 'error' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Using fallback library{exerciseFetchError ? ` · ${exerciseFetchError}` : ''}
              </span>
            ) : null}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {filteredExercises.length} matches
          </span>
        </header>

        <div className="space-y-4 border-b border-slate-200 pb-4">
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
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Muscle group
            <select
              value={muscleGroupFilter}
              onChange={(event) => setMuscleGroupFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">All muscle groups</option>
              {muscleGroupOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-3 pr-1 lg:max-h-[calc(100vh-18rem)] lg:overflow-y-auto lg:pr-2">
          {visibleExercises.length ? (
            visibleExercises.map((exercise) => {
              const isSelected = selectedExercises.some((entry) => entry.id === exercise.id)
              return (
                <article
                  key={exercise.id}
                  draggable
                  onDragStart={(event) => handleLibraryDragStart(event, exercise)}
                  onDragEnd={handleDragEnd}
                  className="flex cursor-grab items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 break-words">{exercise.name}</h3>
                    <div
                      className="flex flex-wrap gap-2 text-[11px] font-semibold"
                      data-visible-metadata={VISIBLE_LIBRARY_METADATA_FIELDS.join(',')}
                      data-metadata-count={VISIBLE_LIBRARY_METADATA_FIELDS.length}
                    >
                      <span
                        className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700"
                        data-testid="exercise-library-muscle-group"
                      >
                        {exercise.muscleGroup}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddExercise(exercise)}
                    disabled={isSelected}
                    aria-label={isSelected ? `${exercise.name} already added` : `Add ${exercise.name} to selected exercises`}
                    data-fallback-action="add"
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
            onClick={() => setVisibleCount((count) => count + 5)}
            className="mt-4 w-full rounded-xl border border-indigo-200 bg-indigo-50 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100"
          >
            Load 5 more
          </button>
        ) : null}
      </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Selected exercises</h2>
            <p className="text-xs text-slate-500">Drag to reorder or use the Remove button for quick edits.</p>
            {activeTemplate && templateAdjustmentStats ? (
              <p className="mt-1 text-xs font-semibold text-indigo-600">
                Template adjustments used {templateAdjustmentStats.used}/{templateAdjustmentStats.allowed} · Flex window {activeTemplate.adjustmentsAllowedPercent}%
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-slate-700">
              {(selectedExerciseSummary?.total ?? selectedExercises.length)} selected
            </span>
            {selectedExercises.length ? (
              <button
                type="button"
                onClick={handleClearSelected}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-500"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </header>

        {selectedExercises.length ? (
          <>
            {selectedExerciseSummary ? (
              <div
                className="mb-4 flex flex-wrap gap-2 text-[11px] font-semibold"
                title={selectedExerciseSummary.metadataNote}
              >
                {selectedExerciseSummary.weekBadges.map((label) => (
                  <span key={`week-${label}`} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {label}
                  </span>
                ))}
                {selectedExerciseSummary.muscleGroupBadges.map((label) => (
                  <span key={`group-${label}`} className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-600">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}

            <div
              className="space-y-3 pr-1 lg:max-h-[calc(100vh-22rem)] lg:overflow-y-auto lg:pr-2"
              onDragOver={handleSelectedListDragOver}
              onDrop={handleSelectedListDrop}
              onDragLeave={handleSelectedListDragLeave}
              data-drag-active={Boolean(dragContext)}
            >
              {sortedSelectedExercises.map((exercise, index) => (
                <div key={exercise.id} className="space-y-3" data-index={index}>
                  {dropIndicatorIndex === index ? (
                    <div className="h-2 rounded-full bg-indigo-400" data-testid="selected-drop-indicator" />
                  ) : null}
                  <article
                    draggable
                    onDragStart={(event) => handleSelectedDragStart(event, exercise.id, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(event) => handleSelectedCardDragOver(event, index)}
                    className={`space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 ${
                      dragContext?.source === 'selected' && dragContext.exerciseId === exercise.id ? 'opacity-60' : ''
                    }`}
                  >
                    <header className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-base font-semibold text-slate-900 break-words">{exercise.name}</h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(exercise.id)}
                          aria-label={`Remove ${exercise.name} from selected exercises`}
                          data-fallback-action="remove"
                          className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div
                        className="flex flex-wrap gap-2 text-[11px] font-semibold"
                        data-visible-metadata={VISIBLE_SELECTED_METADATA_FIELDS.join(',')}
                        data-metadata-count={VISIBLE_SELECTED_METADATA_FIELDS.length}
                      >
                        <span
                          className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700"
                          data-testid="selected-exercise-muscle-group"
                        >
                          {exercise.muscleGroup}
                        </span>
                      </div>
                    </header>

                    {exercise.templateSlotId && activeTemplate ? (
                      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                        Template slot adjustment
                        <select
                          value={exercise.name}
                          onChange={(event) => handleTemplateSlotChange(exercise.templateSlotId!, event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          {(() => {
                            const slot = templateSlotLookup.get(exercise.templateSlotId!)
                            if (!slot) return null
                            const baseAndAlternatives = [slot.baseExercise, ...slot.suggestedAlternatives]
                            return baseAndAlternatives.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))
                          })()}
                        </select>
                      </label>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-4">
                      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                        Sets
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={exercise.defaultSets ?? 3}
                          onChange={(event) => handleSetsChange(exercise.id, Number(event.target.value))}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                        Reps
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={exercise.defaultReps ?? 10}
                          onChange={(event) => handleRepsChange(exercise.id, Number(event.target.value))}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                        Week
                        <select
                          value={exercise.week}
                          onChange={(event) => handleWeekChange(exercise.id, Number(event.target.value))}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          {Array.from({ length: weekCount }).map((_, optionIndex) => (
                            <option key={optionIndex + 1} value={optionIndex + 1}>
                              Week {optionIndex + 1}
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
                          {Array.from({ length: 7 }).map((_, optionIndex) => (
                            <option key={optionIndex + 1} value={optionIndex + 1}>
                              Day {optionIndex + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </article>
                </div>
              ))}
              {dropIndicatorIndex === sortedSelectedExercises.length ? (
                <div className="h-2 rounded-full bg-indigo-400" data-testid="selected-drop-indicator" />
              ) : null}
            </div>

            {groupedSchedule.size ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Schedule preview</p>
                {[...groupedSchedule.keys()]
                  .sort((a, b) => a - b)
                  .map((week) => {
                    const dayMap = groupedSchedule.get(week) ?? new Map<number, SelectedExercise[]>()
                    return (
                      <div key={week} className="space-y-1 text-xs text-slate-600 leading-relaxed">
                        <p className="font-semibold text-slate-700">Week {week}</p>
                        {[...dayMap.keys()]
                          .sort((a, b) => a - b)
                          .map((day) => {
                            const items = dayMap.get(day) ?? []
                            return (
                              <p key={day} className="flex flex-wrap gap-1">
                                <span className="font-semibold text-slate-600">Day {day}:</span>
                                <span>
                                  {items
                                    .map((item) => {
                                      const sets = item.defaultSets ?? '—'
                                      const reps = item.defaultReps ?? '—'
                                      return `${item.name} (${sets}×${reps})`
                                    })
                                    .join(', ')}
                                </span>
                              </p>
                            )
                          })}
                      </div>
                    )
                  })}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No exercises added yet. Use the library to start building the training stack.
          </div>
          )}
        </section>
      </div>

      {/* Plan designer section - separate from the grid */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Plan designer</h2>
          <p className="text-xs text-slate-500">Assign this set of exercises and lock in schedule details.</p>
          {planPreviewTitle ? (
            <p className="text-xs font-semibold text-indigo-600">Preview: {planPreviewTitle}</p>
          ) : null}
        </header>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Template quick load</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Maintain split consistency while swapping up to {templateAdjustmentLimitLabel ?? '20% of slots'} for personalisation.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={activeTemplateId}
                onChange={(event) => setActiveTemplateId(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select template</option>
                {workoutTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.durationWeeks} week
                    {template.durationWeeks === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => activeTemplateId && handleLoadTemplate(activeTemplateId)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={!activeTemplateId}
              >
                Load template
              </button>
            </div>
          </div>
          {activeTemplate ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Split</p>
                <p className="mt-1 text-sm text-slate-700">{activeTemplate.splitName}</p>
              </div>
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Focus</p>
                <p className="mt-1 text-sm text-slate-700">{activeTemplate.categoryBreakdown.join(' · ')}</p>
              </div>
            </div>
          ) : null}
        </div>

        <form className="space-y-6" onSubmit={handleSubmitPlan}>
          <p className="rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-semibold text-indigo-600">
            Manage the exercise list beside the library, then complete the details below to assign the plan.
          </p>
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
            Coaching focus (optional)
            <textarea
              value={planNotes}
              onChange={(event) => setPlanNotes(event.target.value)}
              placeholder="Key cues, progression focus, deload reminders..."
              className="min-h-[5rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>


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
  )

  const clientsContent = (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Client roster &amp; progress</h2>
          <p className="text-xs text-slate-500 leading-relaxed">Monitor assigned plans, completion rates, renewals, and subscription health.</p>
        </div>
        <p className="text-xs text-slate-500">Renewals next 14 days: {revenueSnapshot.upcomingRenewals}</p>
      </header>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative flex flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="mr-2 h-4 w-4 stroke-slate-400"
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
            value={clientSearch}
            onChange={(event) => setClientSearch(event.target.value)}
            placeholder="Search athletes or goals"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Status
            <select
              value={clientStatusFilter}
              onChange={(event) => setClientStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {CLIENT_STATUS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Product
            <select
              value={clientProductFilter}
              onChange={(event) => setClientProductFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All products</option>
              {productFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {filteredClientRoster.length ? (
          filteredClientRoster.map(({ client, progress, product }) => {
            const completionPercent =
              progress?.completionPercent ??
              (client.totalSessions ? Math.round((client.completedSessions / client.totalSessions) * 100) : 0)
            const renewDate = new Date(client.subscription.renewsOn).toLocaleDateString()
            const startDate = client.planStartDate ? new Date(client.planStartDate).toLocaleDateString() : null
            return (
              <article key={client.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{client.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">Goal: {client.goal}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-600">{product?.name ?? 'Custom plan'}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-white ${
                        client.subscription.status === 'active'
                          ? 'bg-emerald-500'
                          : client.subscription.status === 'grace'
                            ? 'bg-amber-500'
                            : client.subscription.status === 'past_due'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                      }`}
                    >
                      {client.subscription.status.toUpperCase()}
                    </span>
                    {client.activeChallengeId ? (
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">Challenge active</span>
                    ) : null}
                    {/* Quick Actions Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setQuickActionClientId(quickActionClientId === client.id ? null : client.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        aria-label="Quick actions"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {quickActionClientId === client.id ? (
                        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('messaging')
                              setQuickActionClientId(null)
                              setToastMessage(`Opening messages for ${client.name}...`)
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Send Message
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              extendSubscription(client.id, 1)
                              setQuickActionClientId(null)
                              setToastMessage(`Extended ${client.name}'s subscription by 1 month`)
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Extend 1 Month
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickActionClientId(null)
                              setToastMessage(`Viewing progress for ${client.name}...`)
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            View Progress
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('planning')
                              setQuickActionClientId(null)
                              setToastMessage(`Opening plan editor for ${client.name}...`)
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Plan
                          </button>
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            type="button"
                            onClick={() => {
                              toggleAutoRenew(client.id)
                              setQuickActionClientId(null)
                              setToastMessage(`Auto-renew ${client.subscription.autoRenew ? 'disabled' : 'enabled'} for ${client.name}`)
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Toggle Auto-Renew
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </header>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Completion</p>
                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${completionPercent}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {completionPercent}% · {progress?.completedSessions ?? client.completedSessions}/{
                        progress?.totalSessions ?? client.totalSessions
                      }{' '}
                      sessions
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Start date</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{startDate ?? 'Not set'}</p>
                    <p className="mt-4 text-[11px] uppercase tracking-wide text-slate-500">Next renewal</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{renewDate}</p>
                    <button
                      type="button"
                      onClick={() => extendSubscription(client.id, 3)}
                      className="mt-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                    >
                      Extend 3 months
                    </button>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Auto-renew</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {client.subscription.autoRenew ? 'Enabled' : 'Disabled'}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleAutoRenew(client.id)}
                      className="mt-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                    >
                      Toggle
                    </button>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Template in use</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {client.assignedTemplateId
                        ? workoutTemplates.find((template) => template.id === client.assignedTemplateId)?.name ?? 'Custom build'
                        : 'Custom build'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">Adjustments: {client.templateAdjustments.length}</p>
                  </div>
                </div>
              </article>
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-500">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="mt-4 text-sm font-semibold text-slate-800">No clients found</h4>
            <p className="mt-2 text-xs text-slate-500">Try adjusting your filters or add a new client to get started.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setClientSearch('')
                  setClientStatusFilter('all')
                  setClientProductFilter('all')
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => setClientSubTab('intake')}
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
              >
                View intake forms
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }),
    [],
  )
  const currentMonthLabel = monthFormatter.format(new Date())
  const hasManualRevenueOverride = revenueSnapshot.manualCollectedThisMonth !== null

  const handleStartMonthlyRevenueEdit = () => {
    const baseline = currentMonthRevenueOverride ?? revenueSnapshot.computedCollectedThisMonth
    const safeBaseline = Number.isFinite(baseline) && baseline > 0 ? baseline : 0
    setMonthlyRevenueDraft(String(safeBaseline))
    setMonthlyRevenueError(null)
    setIsEditingMonthlyRevenue(true)
  }

  const handleCancelMonthlyRevenueEdit = () => {
    setIsEditingMonthlyRevenue(false)
    setMonthlyRevenueError(null)
    setMonthlyRevenueDraft('')
  }

  const handleSaveMonthlyRevenue = () => {
    const trimmed = monthlyRevenueDraft.trim()
    if (!trimmed) {
      setMonthlyRevenueError('Enter a value before saving')
      return
    }
    const numericValue = Number(trimmed.replace(/,/g, ''))
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      setMonthlyRevenueError('Enter a valid non-negative amount')
      return
    }
    setManualRevenueForCurrentMonth(numericValue)
    setIsEditingMonthlyRevenue(false)
    setMonthlyRevenueError(null)
    setMonthlyRevenueDraft('')
    setToastMessage(`Updated collected revenue to ${formatCurrency(numericValue, 'INR')}`)
  }

  const handleResetMonthlyRevenue = () => {
    setManualRevenueForCurrentMonth(null)
    setIsEditingMonthlyRevenue(false)
    setMonthlyRevenueError(null)
    setMonthlyRevenueDraft('')
    setToastMessage('Reset collected revenue to recorded payments')
  }

  const handleSubmitMonthlyRevenue = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleSaveMonthlyRevenue()
  }

  const operationsContent = (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Monetisation &amp; subscriptions</h2>
          <p className="text-xs text-slate-500 leading-relaxed">Track revenue, plan renewals, and product pricing.</p>
        </div>
      </header>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-slate-900/5 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Monthly recurring revenue</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(revenueSnapshot.monthlyRecurringRevenue, 'INR')}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-900/5 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Collected this month</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(revenueSnapshot.totalCollectedThisMonth, 'INR')}</p>
          <p className={`mt-1 text-[11px] ${hasManualRevenueOverride ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
            {hasManualRevenueOverride ? `Manual override for ${currentMonthLabel}` : 'Auto-calculated from recorded payments'}
          </p>
          {hasManualRevenueOverride ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Recorded payments total {formatCurrency(revenueSnapshot.computedCollectedThisMonth, 'INR')}
            </p>
          ) : null}
          {isEditingMonthlyRevenue ? (
            <form onSubmit={handleSubmitMonthlyRevenue} className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex flex-col text-[11px] font-semibold text-slate-600">
                  Amount (INR)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyRevenueDraft}
                    onChange={(event) => setMonthlyRevenueDraft(event.target.value)}
                    className="mt-1 w-40 rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancelMonthlyRevenueEdit}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Cancel
                </button>
              </div>
              {monthlyRevenueError ? (
                <p className="text-[11px] font-semibold text-rose-600">{monthlyRevenueError}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                {hasManualRevenueOverride ? (
                  <button
                    type="button"
                    onClick={handleResetMonthlyRevenue}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 transition hover:border-amber-300"
                  >
                    Reset to recorded amount
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
              <button
                type="button"
                onClick={handleStartMonthlyRevenueEdit}
                className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
              >
                Adjust revenue
              </button>
              {hasManualRevenueOverride ? (
                <button
                  type="button"
                  onClick={handleResetMonthlyRevenue}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 transition hover:border-amber-300"
                >
                  Reset override
                </button>
              ) : null}
            </div>
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-900/5 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Active subscriptions</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{revenueSnapshot.activeSubscriptions}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-900/5 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Pending invoices</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{revenueSnapshot.pendingInvoices}</p>
        </article>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Upcoming renewals</h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-600 leading-relaxed">
            {renewalReminders.map((reminder) => {
              const client = clients.find((entry) => entry.id === reminder.clientId)
              return (
                <li key={reminder.clientId} className="flex items-center justify-between">
                  <span>{client?.name ?? reminder.clientId} · {reminder.billingPeriodLabel}</span>
                  <time className="text-slate-500">{new Date(reminder.renewsOn).toLocaleDateString()}</time>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Products &amp; development costs</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {subscriptionProducts.map((product) => (
              <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                <p className="mt-1 text-slate-600 leading-relaxed">{product.description}</p>
                <p className="mt-2 font-semibold text-indigo-600">{formatCurrency(product.price, product.currency)} · {product.billingPeriod}</p>
                <p className="text-[11px] text-slate-500">Challenge access: {product.includesChallengeAccess ? 'Yes' : 'Add-on only'}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-800">Build + maintenance envelope</p>
            <p>
              Setup: {formatCurrency(developmentCostSummary.setupCostINR, 'INR')} · Monthly upkeep {formatCurrency(developmentCostSummary.monthlyMaintenanceMinINR, 'INR')} - {formatCurrency(developmentCostSummary.monthlyMaintenanceMaxINR, 'INR')}
            </p>
            <ul className="mt-2 space-y-1">
              {developmentCostSummary.notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )

  const activityContent = (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Assignment history</h2>
            <p className="text-xs text-slate-500 leading-relaxed">Review recently shared programmes and filter by athlete or timeframe.</p>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center lg:gap-3">
            <div className="relative flex w-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1 lg:w-64">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mr-2 h-4 w-4 stroke-slate-400"
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
                value={planSearch}
                onChange={(event) => setPlanSearch(event.target.value)}
                placeholder="Search plans or athletes"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              Timeframe
              <select
                value={planTimeframe}
                onChange={(event) => setPlanTimeframe(event.target.value as 'all' | '7' | '30' | '90')}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {PLAN_HISTORY_TIMEFRAMES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <p className="mt-4 text-xs font-semibold text-slate-500">{filteredPlanHistory.length} recorded plan{filteredPlanHistory.length === 1 ? '' : 's'}</p>
        {filteredPlanHistory.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlanHistory.map((plan) => (
              <article key={plan.id} className="space-y-2 rounded-2xl border border-slate-200 px-4 py-4 text-sm shadow-sm">
                <h3 className="text-base font-semibold text-indigo-600 break-words">{plan.planName}</h3>
                <p className="text-slate-600 leading-relaxed">
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
            No plans match the current filters.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Athlete portal preview</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              See what an athlete experiences when plans land in their queue. Toggle unread notifications to focus on pending actions.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNotificationFilter('all')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                notificationFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              All notifications
            </button>
            <button
              type="button"
              onClick={() => setNotificationFilter('unread')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                notificationFilter === 'unread'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              Unread only
            </button>
          </div>
        </header>
        {hasUnreadNotifications ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            New plans waiting! Tap a notification to mark it read.
          </div>
        ) : null}

        {filteredNotifications.length ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
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
                <p className="mt-2 text-slate-600 leading-relaxed">{notification.message}</p>
                <time className="text-xs text-slate-400" dateTime={new Date(notification.timestamp).toISOString()}>
                  {formatRelativeTime(notification.timestamp)}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No notifications match the selected filter.
          </div>
        )}
      </section>
    </div>
  )

  const settingsContent = <AdminSettingsPanel />

  const intakeContent = (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-sm font-semibold text-slate-900">Select client</h3>
          <p className="mt-1 text-xs text-slate-500">
            Choose which client&apos;s intake details you want to capture. You can change this at any time.
          </p>
          <select
            value={selectedAthleteId}
            onChange={(event) => setSelectedAthleteId(event.target.value)}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="" disabled>
              Select client
            </option>
            {clientRoster.map(({ client }) => (
              <option key={client.id} value={client.userId}>
                {client.name} · {client.goal}
              </option>
            ))}
          </select>
          {!selectedAthleteId ? (
            <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
              Intake form fields will unlock once a client is selected.
            </p>
          ) : null}
        </div>
        <IntakeForm
          clientId={selectedAthleteClient?.id}
          onSuccess={(record) => {
            setLatestIntakePreview(record)
            setToastMessage('Client intake saved successfully!')
          }}
        />
      </div>

      <aside className="space-y-6">
        {latestIntakePreview ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
            <h3 className="text-sm font-semibold text-emerald-900">Latest intake summary</h3>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-emerald-700">Client</dt>
                <dd>{latestIntakePreview.contact.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-emerald-700">Primary goal</dt>
                <dd>{latestIntakePreview.goals.primaryGoal || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-emerald-700">Experience</dt>
                <dd>{latestIntakePreview.background.experienceLevel || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-emerald-700">Preferred schedule</dt>
                <dd>
                  {latestIntakePreview.availability.preferredDays || 'Days TBD'} ·{' '}
                  {latestIntakePreview.availability.preferredTimes || 'Times TBD'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-emerald-700">Timezone</dt>
                <dd>{latestIntakePreview.availability.timezone}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h3 className="text-sm font-semibold text-slate-900">What&apos;s next</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Fill out the intake worksheet before assigning a template.</li>
              <li>• Double-check timezones to keep scheduling aligned.</li>
              <li>• Use saved details to personalise habit check-ins.</li>
            </ul>
          </div>
        )}
      </aside>
    </section>
  )

  const schedulingContent = <SchedulingConsole />

  const remindersContent = <RemindersSystem />

  const messagingContent = <ClientMessaging />

  const complianceContent = <ComplianceDashboard />

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.25),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.25),transparent_45%)]" />
        <div className="relative space-y-3">
          <h1 className="text-2xl font-semibold">Coach Planning Command Center</h1>
          <p className="max-w-3xl text-sm text-slate-200 leading-relaxed">
            Build personalised multi-week programmes at scale. Search hundreds of exercises, drop them into a weekly schedule,
            and keep athletes updated the moment a new plan lands in their portal.
          </p>
          <p className="text-xs uppercase tracking-wide text-slate-300">
            Signed in as {user?.displayName ?? user?.username ?? 'Coach'}
          </p>
        </div>
      </header>

      <nav className="rounded-3xl border border-slate-200 bg-white p-2 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition flex items-center gap-2 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                <span className="hidden sm:inline">{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="hidden md:inline">Search clients...</span>
              <kbd className="hidden rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 lg:inline">⌘K</kbd>
            </button>
          </div>
        </div>
      </nav>

      <div className="space-y-6">
        {activeTab === 'overview' ? overviewContent : null}
        {activeTab === 'planning' ? planningContent : null}
        {activeTab === 'clients' ? (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setClientSubTab('roster')}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${clientSubTab === 'roster' ? 'bg-white border border-b-0 border-slate-200 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Client Roster
              </button>
              <button
                type="button"
                onClick={() => setClientSubTab('intake')}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${clientSubTab === 'intake' ? 'bg-white border border-b-0 border-slate-200 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Client Intake
              </button>
            </div>
            {clientSubTab === 'roster' ? clientsContent : intakeContent}
          </div>
        ) : null}
        {activeTab === 'calendar' ? (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setCalendarSubTab('scheduling')}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${calendarSubTab === 'scheduling' ? 'bg-white border border-b-0 border-slate-200 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Scheduling
              </button>
              <button
                type="button"
                onClick={() => setCalendarSubTab('reminders')}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${calendarSubTab === 'reminders' ? 'bg-white border border-b-0 border-slate-200 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Reminders
              </button>
            </div>
            {calendarSubTab === 'scheduling' ? schedulingContent : remindersContent}
          </div>
        ) : null}
        {activeTab === 'messaging' ? messagingContent : null}
        {activeTab === 'compliance' ? complianceContent : null}
        {activeTab === 'business' ? (
          <div className="space-y-6">
            {operationsContent}
            {activityContent}
          </div>
        ) : null}
        {activeTab === 'settings' ? settingsContent : null}
      </div>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg z-50">
          {toastMessage}
        </div>
      ) : null}

      {/* Global Search Modal */}
      {isSearchOpen ? (
        <GlobalSearchModal
          query={globalSearchQuery}
          onQueryChange={setGlobalSearchQuery}
          onClose={() => {
            setIsSearchOpen(false)
            setGlobalSearchQuery('')
          }}
          clients={clientRoster}
          planHistory={planHistory}
          workoutTemplates={workoutTemplates}
          onSelectClient={(clientId) => {
            setSelectedAthleteId(clientId)
            setActiveTab('clients')
            setClientSubTab('roster')
            setIsSearchOpen(false)
            setGlobalSearchQuery('')
          }}
          onSelectTemplate={(templateId) => {
            setActiveTemplateId(templateId)
            setActiveTab('planning')
            setIsSearchOpen(false)
            setGlobalSearchQuery('')
          }}
        />
      ) : null}
    </div>
  )
}

// Global Search Modal Component
interface GlobalSearchModalProps {
  query: string
  onQueryChange: (query: string) => void
  onClose: () => void
  clients: Array<{ client: { id: string; userId: string; name: string; goal: string }; product: { name: string } | null }>
  planHistory: PlanHistoryRecord[]
  workoutTemplates: WorkoutTemplate[]
  onSelectClient: (clientId: string) => void
  onSelectTemplate: (templateId: string) => void
}

function GlobalSearchModal({
  query,
  onQueryChange,
  onClose,
  clients,
  planHistory,
  workoutTemplates,
  onSelectClient,
  onSelectTemplate,
}: GlobalSearchModalProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const searchQuery = query.trim().toLowerCase()

  const filteredClients = React.useMemo(() => {
    if (!searchQuery) return clients.slice(0, 5)
    return clients.filter(({ client, product }) => {
      return (
        client.name.toLowerCase().includes(searchQuery) ||
        client.goal.toLowerCase().includes(searchQuery) ||
        (product?.name ?? '').toLowerCase().includes(searchQuery)
      )
    }).slice(0, 8)
  }, [clients, searchQuery])

  const filteredTemplates = React.useMemo(() => {
    if (!searchQuery) return workoutTemplates.slice(0, 3)
    return workoutTemplates.filter((template) => {
      return (
        template.name.toLowerCase().includes(searchQuery) ||
        template.splitName.toLowerCase().includes(searchQuery) ||
        template.categoryBreakdown.some((cat) => cat.toLowerCase().includes(searchQuery))
      )
    }).slice(0, 5)
  }, [workoutTemplates, searchQuery])

  const filteredPlans = React.useMemo(() => {
    if (!searchQuery) return planHistory.slice(0, 3)
    return planHistory.filter((plan) => {
      return (
        plan.planName.toLowerCase().includes(searchQuery) ||
        plan.athleteName.toLowerCase().includes(searchQuery)
      )
    }).slice(0, 5)
  }, [planHistory, searchQuery])

  const hasResults = filteredClients.length > 0 || filteredTemplates.length > 0 || filteredPlans.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close search"
      />
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search clients, templates, plans..."
            className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!hasResults && searchQuery ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No results found for "{query}"
            </div>
          ) : (
            <>
              {filteredClients.length > 0 ? (
                <div className="mb-2">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Clients</p>
                  {filteredClients.map(({ client, product }) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => onSelectClient(client.userId)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-100"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold">
                        {client.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{client.name}</p>
                        <p className="text-xs text-slate-500 truncate">{client.goal} {product ? `· ${product.name}` : ''}</p>
                      </div>
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : null}

              {filteredTemplates.length > 0 ? (
                <div className="mb-2">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Templates</p>
                  {filteredTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onSelectTemplate(template.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-100"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        📋
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{template.name}</p>
                        <p className="text-xs text-slate-500 truncate">{template.splitName} · {template.durationWeeks} weeks</p>
                      </div>
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : null}

              {filteredPlans.length > 0 ? (
                <div>
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Plans</p>
                  {filteredPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        📅
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{plan.planName}</p>
                        <p className="text-xs text-slate-500 truncate">{plan.athleteName} · {plan.weeks} weeks</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
          <span>Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">↵</kbd> to select</span>
          <span>Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}
