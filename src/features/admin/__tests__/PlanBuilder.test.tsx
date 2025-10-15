import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AdminDashboard } from '../AdminDashboard'

const coachUser = {
  id: 'coach-1',
  username: 'coach',
  displayName: 'Coach Carter',
  passwordHash: '',
  salt: '',
  createdAt: '2024-01-01',
  isAdmin: true,
  avatarUrl: null,
  planName: 'Pro Coach',
  billingInterval: 'monthly',
  renewalDate: '2024-12-01',
}

const athleteUser = {
  id: 'athlete-1',
  username: 'athlete',
  displayName: 'Jordan Sparks',
  passwordHash: '',
  salt: '',
  createdAt: '2024-01-01',
  isAdmin: false,
  avatarUrl: null,
  planName: 'Starter',
  billingInterval: 'monthly',
  renewalDate: '2024-12-01',
}

const subscriptionProduct = {
  id: 'sub_monthly',
  name: 'Monthly Coaching',
  description: 'Monthly subscription',
  price: 120,
  currency: 'USD' as const,
  billingPeriod: 'monthly' as const,
  includesChallengeAccess: false,
}

const programClient = {
  id: 'client-1',
  userId: athleteUser.id,
  name: athleteUser.displayName,
  email: 'jordan@example.com',
  goal: 'Gain strength',
  timezone: 'UTC',
  planStartDate: '2024-01-01',
  planEndDate: '2024-02-01',
  assignedTemplateId: 'template-1',
  templateAdjustments: [],
  activeChallengeId: undefined,
  adherenceRate: 0,
  completedSessions: 0,
  totalSessions: 0,
  subscription: {
    productId: subscriptionProduct.id,
    status: 'active' as const,
    renewsOn: '2024-02-01',
    autoRenew: true,
  },
  checkIns: [],
  progressPhotos: [],
  payments: [],
}

const workoutTemplate = {
  id: 'template-1',
  name: 'Upper Body Primer',
  description: 'A simple push focus block',
  durationWeeks: 4,
  splitName: 'Upper/Lower',
  adjustmentsAllowedPercent: 25,
  categoryBreakdown: ['push'],
  days: [
    {
      dayId: 'day-1',
      title: 'Session A',
      category: 'push',
      emphasis: 'Upper body',
      slots: [
        {
          slotId: 'slot-1',
          label: 'Main lift',
          baseExercise: 'Bench Press',
          pattern: 'compound' as const,
          category: 'push',
          equipment: 'Barbell',
          focusTag: 'Chest',
          suggestedAlternatives: ['Incline Press', 'Push-Up'],
          prescribedSets: 4,
          prescribedReps: 8,
        },
      ],
    },
  ],
  recommendedFor: [],
  notes: ['Focus on tempo control'],
}

const developmentCosts = {
  setupCostINR: 10000,
  monthlyMaintenanceMinINR: 2000,
  monthlyMaintenanceMaxINR: 3500,
  notes: ['Estimates based on vendor quotes'],
}

const assignTemplate = vi.fn()
const swapTemplateSlot = vi.fn().mockReturnValue(true)
const unlockChallenge = vi.fn().mockReturnValue(true)

vi.mock('../../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: coachUser,
    users: [coachUser, athleteUser],
    isLoading: false,
    signup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateUsername: vi.fn(),
    updatePassword: vi.fn(),
    updateAvatar: vi.fn(),
  }),
}))

vi.mock('../../../context/ProgressContext', () => ({
  useProgressContext: () => ({
    records: {},
    getUserProgress: vi.fn(),
    getExerciseProgress: vi.fn(),
    updateExerciseProgress: vi.fn(),
    markExerciseUsingPlan: vi.fn(),
    summaries: [],
    isRemote: false,
  }),
}))

vi.mock('../../../context/ProgramContext', () => ({
  useProgramContext: () => ({
    strengthCategories: [
      {
        id: 'cat-1',
        slug: 'push',
        label: 'Push',
        description: 'Upper body push focus',
        highlights: ['Bench', 'Overhead work'],
        recommendedUse: 'Upper focus',
        sampleSplits: ['Upper / Lower'],
      },
    ],
    workoutTemplates: [workoutTemplate],
    challenges: [],
    subscriptionProducts: [subscriptionProduct],
    clients: [programClient],
    revenueSnapshot: {
      monthlyRecurringRevenue: 0,
      totalCollectedThisMonth: 0,
      computedCollectedThisMonth: 0,
      manualCollectedThisMonth: null,
      upcomingRenewals: 0,
      activeSubscriptions: 0,
      pendingInvoices: 0,
    },
    renewalReminders: [],
    developmentCostSummary: developmentCosts,
    currentMonthRevenueOverride: null,
    setManualRevenueForCurrentMonth: vi.fn(),
    assignTemplate,
    swapTemplateSlot,
    logCheckIn: vi.fn(),
    addProgressPhoto: vi.fn(),
    toggleAutoRenew: vi.fn(),
    extendSubscription: vi.fn(),
    unlockChallenge,
    recordPayment: vi.fn(),
    findClientByUserId: (userId: string) => (userId === programClient.userId ? programClient : undefined),
    updateClientSettings: vi.fn(),
  }),
}))

vi.mock('../AdminSettingsPanel', () => ({
  AdminSettingsPanel: () => <div data-testid="admin-settings-panel" />,
}))

const exerciseLibraryFixtures = vi.hoisted(() => ([
  {
    id: 'lib-1',
    name: 'Push-Up',
    primaryFocus: 'Strength',
    equipment: 'Bodyweight',
    movementType: 'Press',
    muscleGroup: 'Chest',
    source: 'fallback' as const,
  },
  {
    id: 'lib-2',
    name: 'Bent Row',
    primaryFocus: 'Strength',
    equipment: 'Dumbbell',
    movementType: 'Pull',
    muscleGroup: 'Back',
    source: 'fallback' as const,
  },
]))

vi.mock('../../../lib/exerciseLibrary', () => ({
  FALLBACK_EXERCISES: exerciseLibraryFixtures,
  fetchExerciseLibrary: vi.fn().mockResolvedValue(exerciseLibraryFixtures),
}))

const setupPlanBuilder = async () => {
  const user = userEvent.setup()
  render(<AdminDashboard />)
  const planBuilderTab = await screen.findByRole('button', { name: /plan builder/i })
  await user.click(planBuilderTab)
  await screen.findByText('Push-Up')
  return { user }
}

describe('AdminDashboard Plan Builder', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    assignTemplate.mockClear()
    swapTemplateSlot.mockClear()
    unlockChallenge.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('filters the exercise library by muscle group', async () => {
    const { user } = await setupPlanBuilder()
    const muscleSelect = screen.getByLabelText(/muscle group/i)
    await user.selectOptions(muscleSelect, 'Back')
    expect(screen.getByText('Bent Row')).toBeInTheDocument()
    expect(screen.queryByText('Push-Up')).not.toBeInTheDocument()
  })

  it('adds exercises via fallback controls and exposes condensed metadata', async () => {
    const { user } = await setupPlanBuilder()
    const addButtons = screen.getAllByRole('button', { name: /add/i })
    await user.click(addButtons[0])

    const selectedHeading = await screen.findByRole('heading', { name: 'Selected exercises' })
    const selectedPanel = selectedHeading.closest('section') as HTMLElement
    expect(selectedPanel).toBeInTheDocument()

    const selectedCardTitle = await within(selectedPanel).findByText('Push-Up')
    const selectedCard = selectedCardTitle.closest('article') as HTMLElement
    const setsInput = within(selectedCard).getByLabelText(/sets/i) as HTMLInputElement
    const repsInput = within(selectedCard).getByLabelText(/reps/i) as HTMLInputElement

    expect(setsInput.value).toBe('3')
    expect(repsInput.value).toBe('10')

    await waitFor(() => {
      const stored = window.localStorage.getItem('admin:selectedExercises')
      expect(stored).not.toBeNull()
      expect(JSON.parse(stored ?? '[]')).toHaveLength(1)
    })
  })

  it('submits a plan using the simplified designer flow', async () => {
    const { user } = await setupPlanBuilder()
    await user.click(screen.getAllByRole('button', { name: /add/i })[0])

    const preview = await screen.findByText(/Preview:/i)
    expect(preview.textContent).toMatch(/Push-Up/)

    const athleteSelect = screen.getByLabelText(/assign to athlete/i)
    await user.selectOptions(athleteSelect, athleteUser.id)

    const startDateInput = screen.getByLabelText(/start date/i) as HTMLInputElement
    await user.clear(startDateInput)
    await user.type(startDateInput, '2025-01-01')

    const weeksInput = screen.getByLabelText(/number of weeks/i) as HTMLInputElement
    await user.clear(weeksInput)
    await user.type(weeksInput, '4')

    const focusArea = screen.getByLabelText(/coaching focus/i) as HTMLTextAreaElement
    await user.type(focusArea, 'Drive elbow path and tempo')

    await user.click(screen.getByRole('button', { name: /create training plan/i }))

    await screen.findByText(/shared with/i)

    await waitFor(() => {
      expect(window.localStorage.getItem('admin:selectedExercises')).toBeNull()
    })
  })
})
