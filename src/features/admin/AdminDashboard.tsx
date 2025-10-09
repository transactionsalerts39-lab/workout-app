import { useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { useProgressContext } from '../../context/ProgressContext'
import { useProgramContext } from '../../context/ProgramContext'
import type { Currency, TemplateExerciseSlot, WorkoutTemplate } from '../../types/program'

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
  templateSlotId?: string
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

const TEMPLATE_PATTERN_LABEL: Record<TemplateExerciseSlot['pattern'], string> = {
  compound: 'Compound Strength',
  accessory: 'Accessory Focus',
  power: 'Power Output',
  isolation: 'Isolation',
  conditioning: 'Conditioning',
}

const TEMPLATE_INTENSITY_LABEL: Record<TemplateExerciseSlot['pattern'], string> = {
  compound: 'Heavy',
  accessory: 'Moderate',
  power: 'Power',
  isolation: 'Tempo',
  conditioning: 'Conditioning',
}

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

type AdminTab = 'overview' | 'planning' | 'clients' | 'operations' | 'activity'

const ADMIN_TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'planning', label: 'Plan Builder' },
  { id: 'clients', label: 'Clients' },
  { id: 'operations', label: 'Revenue & Ops' },
  { id: 'activity', label: 'Activity' },
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

  const [exerciseQuery, setExerciseQuery] = useState('')
  const [focusFilter, setFocusFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [visibleCount, setVisibleCount] = useState(60)
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([])
  const [activeTemplateId, setActiveTemplateId] = useState('')
  const [selectedAthleteId, setSelectedAthleteId] = useState('')
  const [weekCount, setWeekCount] = useState(4)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [planName, setPlanName] = useState('')
  const [planNotes, setPlanNotes] = useState('')
  const [planHistory, setPlanHistory] = useState<PlanHistoryRecord[]>(FALLBACK_PLAN_HISTORY)
  const [notifications, setNotifications] = useState<NotificationRecord[]>(FALLBACK_NOTIFICATIONS)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [categorySearch, setCategorySearch] = useState('')
  const [challengeSearch, setChallengeSearch] = useState('')
  const [challengeDifficultyFilter, setChallengeDifficultyFilter] = useState('all')
  const [clientSearch, setClientSearch] = useState('')
  const [clientStatusFilter, setClientStatusFilter] = useState('all')
  const [clientProductFilter, setClientProductFilter] = useState('all')
  const [planSearch, setPlanSearch] = useState('')
  const [planTimeframe, setPlanTimeframe] = useState<'all' | '7' | '30' | '90'>('30')
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all')

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
          focus: `${day.emphasis}`,
          equipment: slot.equipment,
          pattern: TEMPLATE_PATTERN_LABEL[slot.pattern],
          intensity: TEMPLATE_INTENSITY_LABEL[slot.pattern],
          week: 1,
          day: Math.min(dayIndex + 1, 7),
          templateSlotId: slot.slotId,
        })
      })
    })

    setSelectedExercises(nextExercises)
    setActiveTemplateId(templateId)
    setWeekCount(Math.min(Math.max(template.durationWeeks, 1), 24))
    setPlanName(template.name)
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

    const newNotification: NotificationRecord = {
      id: generateId('notif'),
      athleteId: athlete.id,
      athleteName: athlete.name,
      message: `${trimmedName} (${selectedExercises.length} exercises) assigned to you`,
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

  const overviewContent = (
    <div className="space-y-6">
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
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,360px)_1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-hidden">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Exercise library</h2>
            <p className="text-xs text-slate-500 leading-relaxed">Search, filter, and add exercises into the weekly schedule.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{filteredExercises.length} matches</span>
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

        <div className="mt-4 space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-18rem)]">
          {visibleExercises.length ? (
            visibleExercises.map((exercise) => {
              const isSelected = selectedExercises.some((entry) => entry.id === exercise.id)
              return (
                <article
                  key={exercise.id}
                  className="flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-slate-900 break-words">{exercise.name}</h3>
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
          <p className="text-xs text-slate-500 leading-relaxed">
            Add exercises from the library, assign each to a training day, and share the full block with an athlete.
          </p>
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
            <p className="text-xs text-slate-500 leading-relaxed">
              Add exercises from the library, then assign each to a week and training day.
            </p>
            {activeTemplate && templateAdjustmentStats ? (
              <p className="mt-1 text-xs font-semibold text-indigo-600">
                Template adjustments used {templateAdjustmentStats.used}/{templateAdjustmentStats.allowed} · Flex window {activeTemplate.adjustmentsAllowedPercent}%
              </p>
            ) : null}
            {sortedSelectedExercises.length ? (
              <div className="mt-3 space-y-3 overflow-y-auto pr-1 lg:max-h-[22rem]">
                {sortedSelectedExercises.map((exercise) => (
                  <article key={exercise.id} className="space-y-3 rounded-2xl border border-slate-200 px-4 py-3">
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900 break-words">{exercise.name}</h4>
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
                    <div className="mt-2 space-y-1 text-xs text-slate-600 leading-relaxed">
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
            return (
              <article key={client.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{client.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">Goal: {client.goal}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
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
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Next renewal</p>
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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No clients found for these filters.
          </div>
        )}
      </div>
    </section>
  )

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
        <div className="flex flex-wrap gap-2">
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="space-y-6">
        {activeTab === 'overview' ? overviewContent : null}
        {activeTab === 'planning' ? planningContent : null}
        {activeTab === 'clients' ? clientsContent : null}
        {activeTab === 'operations' ? operationsContent : null}
        {activeTab === 'activity' ? activityContent : null}
      </div>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </div>
  )
}
