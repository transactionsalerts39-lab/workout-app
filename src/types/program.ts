export type StrengthCategory = 'push' | 'pull' | 'legs' | 'upper' | 'full-body' | 'custom'
export type Currency = 'INR' | 'USD'

export interface StrengthCategoryDefinition {
  id: string
  slug: StrengthCategory
  label: string
  description: string
  highlights: string[]
  recommendedUse: string
  sampleSplits: string[]
}

export interface TemplateExerciseSlot {
  slotId: string
  label: string
  baseExercise: string
  pattern: 'compound' | 'accessory' | 'power' | 'isolation' | 'conditioning'
  category: StrengthCategory
  equipment: string
  focusTag: string
  suggestedAlternatives: string[]
  prescribedSets?: number
  prescribedReps?: number
}

export interface TemplateDay {
  dayId: string
  title: string
  category: StrengthCategory
  emphasis: string
  slots: TemplateExerciseSlot[]
}

export interface WorkoutTemplate {
  id: string
  name: string
  description: string
  durationWeeks: number
  splitName: string
  adjustmentsAllowedPercent: number
  categoryBreakdown: StrengthCategory[]
  days: TemplateDay[]
  recommendedFor: string[]
  notes: string[]
}

export interface ChallengeProgram {
  id: string
  name: string
  durationWeeks: number
  focus: string[]
  summary: string
  outcomes: string[]
  unlockCost: number
  currency: Currency
  difficulty: 'foundation' | 'intermediate' | 'advanced'
  requiredSubscriptionProductId: string | null
}

export interface SubscriptionProduct {
  id: string
  name: string
  description: string
  price: number
  currency: Currency
  billingPeriod: 'monthly' | 'quarterly' | 'semiannual'
  includesChallengeAccess: boolean
}

export interface ClientProfileSettings {
  preferredName?: string
  birthDate?: string
  age?: number
  healthNotes?: string
  emergencyContact?: string
}

export interface ClientCheckIn {
  id: string
  clientId: string
  weekIndex: number
  submittedAt: string
  energyLevel: 1 | 2 | 3 | 4 | 5
  stressLevel: 1 | 2 | 3 | 4 | 5
  weightKg?: number
  notes?: string
  attachments: string[]
}

export interface ProgressPhoto {
  id: string
  clientId: string
  label: string
  uploadedAt: string
  imageUrl: string
  contentType?: string
  sizeBytes?: number
}

export interface PaymentRecord {
  id: string
  clientId: string
  type: 'subscription' | 'renewal' | 'challenge'
  amount: number
  currency: Currency
  status: 'paid' | 'due' | 'failed'
  recordedAt: string
  description: string
  invoiceUrl?: string
}

export interface SubscriptionStatus {
  productId: string
  status: 'active' | 'grace' | 'past_due' | 'cancelled'
  renewsOn: string
  autoRenew: boolean
}

export interface TemplateAdjustment {
  templateId: string
  dayId: string
  slotId: string
  replacementExercise: string
}

export interface ClientProfile {
  id: string
  userId: string
  name: string
  email: string
  goal: string
  timezone: string
  planStartDate: string
  planEndDate: string
  assignedTemplateId?: string
  templateAdjustments: TemplateAdjustment[]
  activeChallengeId?: string
  adherenceRate: number
  completedSessions: number
  totalSessions: number
  subscription: SubscriptionStatus
  checkIns: ClientCheckIn[]
  progressPhotos: ProgressPhoto[]
  payments: PaymentRecord[]
  lastCheckInAt?: string
  profileSettings?: ClientProfileSettings
}

export interface RevenueSnapshot {
  monthlyRecurringRevenue: number
  totalCollectedThisMonth: number
  computedCollectedThisMonth: number
  manualCollectedThisMonth: number | null
  upcomingRenewals: number
  activeSubscriptions: number
  pendingInvoices: number
}

export interface PlanRenewalReminder {
  clientId: string
  renewsOn: string
  noticeDate: string
  billingPeriodLabel: string
}
