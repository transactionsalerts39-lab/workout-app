import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from './AuthContext'
import {
  challengePrograms,
  developmentCostSummary,
  fallbackClients,
  strengthCategories,
  subscriptionProducts,
  workoutTemplates,
} from '../data/programData'
import { loadStoredIntakeRecords, persistIntakeRecords } from '../lib/storage'
import type {
  ChallengeProgram,
  ClientCheckIn,
  ClientIntakeRecord,
  ClientIntakeSubmission,
  ClientProfile,
  ClientProfileSettings,
  Currency,
  PaymentRecord,
  PlanRenewalReminder,
  ProgressPhoto,
  RevenueSnapshot,
  StrengthCategoryDefinition,
  SubscriptionProduct,
  WorkoutTemplate,
} from '../types/program'

interface LogCheckInInput {
  clientId: string
  weekIndex: number
  energyLevel: 1 | 2 | 3 | 4 | 5
  stressLevel: 1 | 2 | 3 | 4 | 5
  weightKg?: number
  notes?: string
  attachments?: string[]
}

interface AddProgressPhotoInput {
  clientId: string
  label: string
  imageUrl: string
  contentType?: string
  sizeBytes?: number
}

interface RecordPaymentInput {
  clientId: string
  amount: number
  currency: Currency
  type: PaymentRecord['type']
  description: string
  status?: PaymentRecord['status']
}

interface ProgramContextValue {
  strengthCategories: StrengthCategoryDefinition[]
  workoutTemplates: WorkoutTemplate[]
  challenges: ChallengeProgram[]
  subscriptionProducts: SubscriptionProduct[]
  clients: ClientProfile[]
  clientIntakeRecords: ClientIntakeRecord[]
  getClientIntake: (clientId: string) => ClientIntakeRecord | null
  saveClientIntake: (clientId: string, submission: ClientIntakeSubmission) => Promise<ClientIntakeRecord>
  revenueSnapshot: RevenueSnapshot
  renewalReminders: PlanRenewalReminder[]
  developmentCostSummary: typeof developmentCostSummary
  currentMonthRevenueOverride: number | null
  setManualRevenueForCurrentMonth: (amount: number | null) => void
  assignTemplate: (clientId: string, templateId: string) => void
  swapTemplateSlot: (clientId: string, templateId: string, dayId: string, slotId: string, replacement: string) => boolean
  logCheckIn: (input: LogCheckInInput) => void
  addProgressPhoto: (input: AddProgressPhotoInput) => void
  toggleAutoRenew: (clientId: string) => void
  extendSubscription: (clientId: string, months: number) => void
  unlockChallenge: (clientId: string, challengeId: string) => boolean
  recordPayment: (input: RecordPaymentInput) => void
  findClientByUserId: (userId: string) => ClientProfile | undefined
  updateClientSettings: (clientId: string, settings: ClientProfileSettings) => void
}

const ProgramContext = createContext<ProgramContextValue | undefined>(undefined)

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function cloneClientProfile(profile: ClientProfile): ClientProfile {
  return {
    ...profile,
    templateAdjustments: profile.templateAdjustments.map((entry) => ({ ...entry })),
    checkIns: profile.checkIns.map((checkIn) => ({ ...checkIn, attachments: [...checkIn.attachments] })),
    progressPhotos: profile.progressPhotos.map((photo) => ({ ...photo })),
    payments: profile.payments.map((payment) => ({ ...payment })),
    profileSettings: profile.profileSettings ? { ...profile.profileSettings } : undefined,
  }
}

function getTemplateById(templateId: string): WorkoutTemplate | undefined {
  return workoutTemplates.find((template) => template.id === templateId)
}

function allowedAdjustments(template: WorkoutTemplate): number {
  const totalSlots = template.days.reduce((sum, day) => sum + day.slots.length, 0)
  const allowance = Math.floor((template.adjustmentsAllowedPercent / 100) * totalSlots)
  return Math.max(1, allowance)
}

function buildRenewalReminders(clients: ClientProfile[]): PlanRenewalReminder[] {
  return clients.map((client) => {
    const productId = client.subscription.productId
    const billingPeriodLabel = productId === 'sub_monthly' ? 'Monthly' : productId === 'sub_quarterly' ? 'Quarterly' : 'Semi-Annual'
    const notice = new Date(client.subscription.renewsOn)
    notice.setDate(notice.getDate() - 5)
    return {
      clientId: client.id,
      renewsOn: client.subscription.renewsOn,
      noticeDate: notice.toISOString(),
      billingPeriodLabel,
    }
  })
}

function computeRevenueSnapshot(clients: ClientProfile[], products: SubscriptionProduct[]): RevenueSnapshot {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const paidThisMonth = clients.flatMap((client) => client.payments)
    .filter((payment) => payment.status === 'paid')
    .filter((payment) => {
      const date = new Date(payment.recordedAt)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    .reduce((sum, payment) => sum + payment.amount, 0)

  const activeSubscriptions = clients.filter((client) => client.subscription.status === 'active').length

  const productLookup = new Map(products.map((product) => [product.id, product]))
  const recurringRevenue = clients
    .filter((client) => client.subscription.status === 'active')
    .reduce((sum, client) => {
      const product = productLookup.get(client.subscription.productId)
      return product ? sum + product.price : sum
    }, 0)

  const upcomingRenewals = clients.filter((client) => {
    const renewDate = new Date(client.subscription.renewsOn)
    const diff = renewDate.getTime() - now.getTime()
    const daysUntilRenewal = diff / (1000 * 60 * 60 * 24)
    return daysUntilRenewal >= 0 && daysUntilRenewal <= 14
  }).length

  const pendingInvoices = clients
    .flatMap((client) => client.payments)
    .filter((payment) => payment.status === 'due').length

  return {
    monthlyRecurringRevenue: recurringRevenue,
    totalCollectedThisMonth: paidThisMonth,
    computedCollectedThisMonth: paidThisMonth,
    manualCollectedThisMonth: null,
    upcomingRenewals,
    activeSubscriptions,
    pendingInvoices,
  }
}

function defaultClientForUser(userId: string, displayName: string): ClientProfile {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 7)
  const end = new Date(now)
  end.setMonth(end.getMonth() + 1)

  return {
    id: generateId('client'),
    userId,
    name: displayName,
    email: `${displayName.replace(/\s+/g, '.').toLowerCase()}@example.com`,
    goal: 'Personalised coaching programme',
    timezone: 'Asia/Kolkata',
    planStartDate: start.toISOString(),
    planEndDate: end.toISOString(),
    assignedTemplateId: workoutTemplates[0]?.id,
    templateAdjustments: [],
    activeChallengeId: undefined,
    adherenceRate: 0,
    completedSessions: 0,
    totalSessions: 0,
    subscription: {
      productId: subscriptionProducts[0]?.id ?? 'sub_monthly',
      status: 'active',
      renewsOn: end.toISOString(),
      autoRenew: true,
    },
    checkIns: [],
    progressPhotos: [],
    payments: [],
    lastCheckInAt: undefined,
    profileSettings: {
      preferredName: displayName,
    },
  }
}

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const { users } = useAuthContext()
  const [clients, setClients] = useState<ClientProfile[]>(() => fallbackClients.map(cloneClientProfile))
  const [clientIntakeRecords, setClientIntakeRecords] = useState<ClientIntakeRecord[]>(() => loadStoredIntakeRecords<ClientIntakeRecord[]>([]))
  const [manualRevenueOverrides, setManualRevenueOverrides] = useState<Record<string, number>>({})

  useEffect(() => {
    const nonAdminUsers = users.filter((user) => !user.isAdmin)
    setClients((previous) => {
      const next = [...previous]
      nonAdminUsers.forEach((user) => {
        if (next.some((client) => client.userId === user.id)) return
        const displayName = user.displayName || user.username
        next.push(defaultClientForUser(user.id, displayName))
      })
      return next
    })
  }, [users])

  const assignTemplate = (clientId: string, templateId: string) => {
    setClients((previous) =>
      previous.map((client) => {
        if (client.id !== clientId) return client
        return {
          ...client,
          assignedTemplateId: templateId,
          templateAdjustments: [],
        }
      }),
    )
  }

  const swapTemplateSlot = (clientId: string, templateId: string, dayId: string, slotId: string, replacement: string) => {
    const template = getTemplateById(templateId)
    if (!template) return false

    const maxAdjustments = allowedAdjustments(template)

    let applied = false

    setClients((previous) =>
      previous.map((client) => {
        if (client.id !== clientId) return client

        const baseSlot = template.days.flatMap((day) => day.slots).find((slot) => slot.slotId === slotId)
        if (!baseSlot) return client

        const adjustments = [...client.templateAdjustments]
        const existingIndex = adjustments.findIndex((entry) => entry.slotId === slotId)

        if (replacement === baseSlot.baseExercise) {
          if (existingIndex >= 0) {
            adjustments.splice(existingIndex, 1)
            applied = true
          }
        } else {
          const currentAdjustmentCount = adjustments.filter((entry) => entry.templateId === templateId).length
          if (existingIndex >= 0) {
            adjustments[existingIndex] = {
              ...adjustments[existingIndex],
              replacementExercise: replacement,
            }
            applied = true
          } else if (currentAdjustmentCount < maxAdjustments) {
            adjustments.push({
              templateId,
              dayId,
              slotId,
              replacementExercise: replacement,
            })
            applied = true
          }
        }

        if (!applied) return client
        return {
          ...client,
          templateAdjustments: adjustments,
        }
      }),
    )

    return applied
  }

  const logCheckIn = (input: LogCheckInInput) => {
    setClients((previous) =>
      previous.map((client) => {
        if (client.id !== input.clientId) return client
        const checkIn: ClientCheckIn = {
          id: generateId('check'),
          clientId: client.id,
          weekIndex: input.weekIndex,
          submittedAt: new Date().toISOString(),
          energyLevel: input.energyLevel,
          stressLevel: input.stressLevel,
          weightKg: input.weightKg,
          notes: input.notes?.trim() || undefined,
          attachments: input.attachments ? [...input.attachments] : [],
        }
        return {
          ...client,
          checkIns: [checkIn, ...client.checkIns],
          lastCheckInAt: checkIn.submittedAt,
        }
      }),
    )
  }

  const addProgressPhoto = (input: AddProgressPhotoInput) => {
    setClients((previous) =>
      previous.map((client) => {
        if (client.id !== input.clientId) return client
        const photo: ProgressPhoto = {
          id: generateId('photo'),
          clientId: client.id,
          label: input.label,
          uploadedAt: new Date().toISOString(),
          imageUrl: input.imageUrl,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
        }
        return {
          ...client,
          progressPhotos: [photo, ...client.progressPhotos],
        }
      }),
    )
  }

  const toggleAutoRenew = (clientId: string) => {
    setClients((previous) =>
      previous.map((client) => {
        if (client.id !== clientId) return client
        return {
          ...client,
          subscription: {
            ...client.subscription,
            autoRenew: !client.subscription.autoRenew,
          },
        }
      }),
    )
  }

  const extendSubscription = (clientId: string, months: number) => {
    setClients((previous) =>
      previous.map((client) => {
        if (client.id !== clientId) return client
        const renewDate = new Date(client.subscription.renewsOn)
        renewDate.setMonth(renewDate.getMonth() + months)
        const planEnd = new Date(client.planEndDate)
        planEnd.setMonth(planEnd.getMonth() + months)

        const product = subscriptionProducts.find((entry) => entry.id === client.subscription.productId)
        const amount = product ? product.price : 0

        const payment: PaymentRecord = {
          id: generateId('pay'),
          clientId: client.id,
          type: 'renewal',
          amount,
          currency: product?.currency ?? 'INR',
          status: 'paid',
          recordedAt: new Date().toISOString(),
          description: `${months}-month extension processed`,
        }

        return {
          ...client,
          planEndDate: planEnd.toISOString(),
          subscription: {
            ...client.subscription,
            renewsOn: renewDate.toISOString(),
          },
          payments: [payment, ...client.payments],
        }
      }),
    )
  }

  const updateClientSettings = (clientId: string, settings: ClientProfileSettings) => {
    setClients((previous) =>
      previous.map((client) => {
        if (client.id !== clientId) return client
        return {
          ...client,
          profileSettings: {
            ...(client.profileSettings ?? {}),
            ...settings,
          },
        }
      }),
    )
  }

  const recordPayment = (input: RecordPaymentInput) => {
    setClients((previous) =>
      previous.map((client) => {
        if (client.id !== input.clientId) return client
        const payment: PaymentRecord = {
          id: generateId('pay'),
          clientId: client.id,
          type: input.type,
          amount: input.amount,
          currency: input.currency,
          status: input.status ?? 'paid',
          recordedAt: new Date().toISOString(),
          description: input.description,
        }
        return {
          ...client,
          payments: [payment, ...client.payments],
        }
      }),
    )
  }

  const unlockChallenge = (clientId: string, challengeId: string) => {
    const challenge = challengePrograms.find((entry) => entry.id === challengeId)
    if (!challenge) return false

    let success = false
    setClients((previous) =>
      previous.map((client) => {
        if (client.id !== clientId) return client

        if (challenge.requiredSubscriptionProductId && client.subscription.productId !== challenge.requiredSubscriptionProductId) {
          return client
        }

        success = true
        const payment: PaymentRecord = {
          id: generateId('pay'),
          clientId: client.id,
          type: 'challenge',
          amount: challenge.unlockCost,
          currency: challenge.currency,
          status: 'paid',
          recordedAt: new Date().toISOString(),
          description: `${challenge.name} unlock`,
        }

        return {
          ...client,
          activeChallengeId: challenge.id,
          payments: [payment, ...client.payments],
        }
      }),
    )

    return success
  }

  const revenueSnapshot = useMemo(() => {
    const snapshot = computeRevenueSnapshot(clients, subscriptionProducts)
    const key = getMonthKey(new Date())
    const override = manualRevenueOverrides[key]

    if (typeof override === 'number') {
      return {
        ...snapshot,
        manualCollectedThisMonth: override,
        totalCollectedThisMonth: override,
      }
    }

    return snapshot
  }, [clients, manualRevenueOverrides])
  const renewalReminders = useMemo(() => buildRenewalReminders(clients), [clients])

  const currentMonthKey = getMonthKey(new Date())
  const currentMonthRevenueOverride = manualRevenueOverrides[currentMonthKey] ?? null

  const setManualRevenueForCurrentMonth = useCallback((amount: number | null) => {
    setManualRevenueOverrides((previous) => {
      const next = { ...previous }
      if (amount === null) {
        delete next[currentMonthKey]
      } else {
        next[currentMonthKey] = amount
      }
      return next
    })
  }, [currentMonthKey])

  const getClientIntake = useCallback(
    (clientId: string) => clientIntakeRecords.find((record) => record.clientId === clientId) ?? null,
    [clientIntakeRecords],
  )

  const saveClientIntake = useCallback(
    async (clientId: string, submission: ClientIntakeSubmission): Promise<ClientIntakeRecord> => {
      const timestamp = new Date().toISOString()
      const existing = clientIntakeRecords.find((record) => record.clientId === clientId)
      const nextRecord: ClientIntakeRecord = existing
        ? {
            ...existing,
            collectedAt: timestamp,
            contact: submission.contact,
            goals: submission.goals,
            background: submission.background,
            availability: submission.availability,
          }
        : {
            id: generateId('intake'),
            clientId,
            prospectKey: clientId,
            collectedAt: timestamp,
            contact: submission.contact,
            goals: submission.goals,
            background: submission.background,
            availability: submission.availability,
          }

      setClientIntakeRecords((previous) => {
        const next = existing
          ? previous.map((record) => (record.clientId === clientId ? nextRecord : record))
          : [...previous, nextRecord]
        persistIntakeRecords(next)
        return next
      })

      setClients((previous) =>
        previous.map((client) => {
          if (client.id !== clientId) return client
          return {
            ...client,
            profileSettings: {
              ...(client.profileSettings ?? {}),
              intake: nextRecord,
            },
          }
        }),
      )

      return nextRecord
    },
    [clientIntakeRecords],
  )

  const value = useMemo<ProgramContextValue>(() => ({
    strengthCategories,
    workoutTemplates,
    challenges: challengePrograms,
    subscriptionProducts,
    clients,
    clientIntakeRecords,
    getClientIntake,
    saveClientIntake,
    revenueSnapshot,
    renewalReminders,
    developmentCostSummary,
    currentMonthRevenueOverride,
    setManualRevenueForCurrentMonth,
    assignTemplate,
    swapTemplateSlot,
    logCheckIn,
    addProgressPhoto,
    toggleAutoRenew,
    extendSubscription,
    updateClientSettings,
    unlockChallenge,
    recordPayment,
    findClientByUserId: (userId: string) => clients.find((client) => client.userId === userId),
  }), [
    clientIntakeRecords,
    clients,
    currentMonthRevenueOverride,
    getClientIntake,
    saveClientIntake,
    revenueSnapshot,
    renewalReminders,
    setManualRevenueForCurrentMonth,
  ])

  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgramContext(): ProgramContextValue {
  const ctx = useContext(ProgramContext)
  if (!ctx) {
    throw new Error('useProgramContext must be used within ProgramProvider')
  }
  return ctx
}
