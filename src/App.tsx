import { useEffect, useMemo, useState } from 'react'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import { PlanProvider, usePlanContext } from './context/PlanContext'
import { ProgressProvider } from './context/ProgressContext'
import { ProgramProvider } from './context/ProgramContext'
import { AuthScreen } from './features/auth/AuthScreen'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { UserDashboard } from './features/dashboard/UserDashboard'
import { UserSettingsScreen } from './features/user/UserSettingsScreen'
import { WorkoutSessionView } from './features/workout/WorkoutSessionView'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import './App.css'

interface ViewState {
  weekIndex: number
}

function AppShell() {
  const { user, isLoading, logout } = useAuthContext()
  const { weeks } = usePlanContext()
  const [view, setView] = useState<ViewState>(() => ({ weekIndex: weeks[0]?.weekIndex ?? 1 }))
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [userScreen, setUserScreen] = useState<'dashboard' | 'settings'>('dashboard')

  const hasAdminAccess = user?.isAdmin ?? false

  useEffect(() => {
    if (!weeks.length) return
    setView((previous) => {
      if (weeks.some((week) => week.weekIndex === previous.weekIndex)) {
        return previous
      }
      return { ...previous, weekIndex: weeks[0].weekIndex }
    })
  }, [weeks])

  useEffect(() => {
    if (!user) {
      setActiveSessionId(null)
    }
  }, [user])

  useEffect(() => {
    if (!user || hasAdminAccess) {
      setUserScreen('dashboard')
    }
  }, [user, hasAdminAccess])

  

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="surface-panel px-6 py-4 text-sm text-neutral-300">
            Warming up your dashboard…
          </div>
        </div>
      )
    }

    if (!user) {
      return <AuthScreen />
    }

    const heroTitle = hasAdminAccess ? 'Coach Command Center' : 'Daily Performance Hub'
    const heroSubtitle = hasAdminAccess
      ? 'Monitor athlete readiness, unlock challenges, and keep revenue pulses in one view.'
      : 'Track your sessions, spot trends, and let the AI engine fine-tune every progression.'

    if (activeSessionId) {
      return (
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/60 backdrop-blur-18">
            <div className="container flex flex-wrap items-center justify-between gap-4 py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 font-display text-lg text-white">
                  WP
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">Workout App</p>
                  <p className="font-display text-base text-white">Live Session</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={logout} className="w-full max-w-xs sm:w-auto">
                Log out
              </Button>
            </div>
          </header>

          <main className="container flex-1 py-12">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge variant="secondary" className="mb-3">
                  Guided session
                </Badge>
                <h1 className="font-display text-3xl font-semibold text-neutral-50">Go smash today&apos;s plan</h1>
                <p className="mt-2 max-w-2xl text-sm text-neutral-300">
                  Focus mode keeps coaching cues, progression insights, and completion stats in one place.
                </p>
              </div>
            </div>
            <div className="surface-panel px-6 py-4">
              <WorkoutSessionView
                weekIndex={view.weekIndex}
                sessionId={activeSessionId}
                onBack={() => setActiveSessionId(null)}
              />
            </div>
          </main>
        </div>
      )
    }

    return (
      <div className="relative flex min-h-screen flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px] bg-gradient-primary opacity-30 blur-[120px]" />
        <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/60 backdrop-blur-18">
          <div className="container flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 font-display text-lg text-white">
                WP
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-neutral-400">Workout App</p>
                <p className="truncate font-display text-xl text-white">AI Fitness Companion</p>
              </div>
              {hasAdminAccess && <Badge>Admin access</Badge>}
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              {!hasAdminAccess ? (
                <Button
                  size="sm"
                  variant={userScreen === 'settings' ? 'default' : 'secondary'}
                  onClick={() =>
                    setUserScreen((previous) => (previous === 'settings' ? 'dashboard' : 'settings'))
                  }
                  className="w-full min-w-[140px] sm:w-auto"
                >
                  {userScreen === 'settings' ? 'Back to dashboard' : 'Settings'}
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={logout} className="w-full min-w-[120px] sm:w-auto">
                Log out
              </Button>
            </div>
          </div>
        </header>

        <main className="container relative z-10 flex-1 py-12">
          <section className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="surface-panel p-8">
              <Badge variant="secondary" className="mb-4">
                {hasAdminAccess ? 'Coach mode' : 'Athlete insights'}
              </Badge>
              <h1 className="font-display text-3xl font-semibold text-neutral-50">{heroTitle}</h1>
              <p className="mt-4 max-w-2xl text-base text-neutral-300">{heroSubtitle}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-neutral-300/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-accent-teal" /> Adaptive programming engine
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-brand-400" /> Real-time readiness scoring
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-accent-coral" /> Gamified streaks &amp; rewards
                </span>
              </div>
            </div>
            <div className="surface-panel flex h-full flex-col justify-between p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-400">Snapshot</p>
                <p className="mt-2 font-display text-2xl text-white">
                  {hasAdminAccess ? '8 active programs' : 'Week ' + view.weekIndex}
                </p>
                <p className="mt-2 text-sm text-neutral-300/90">
                  {hasAdminAccess
                    ? 'Keep athletes aligned with unlocks, renewals, and check-ins without tab fatigue.'
                    : 'Stay consistent—every session logged sharpens the personalization engine.'}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-10">
            {hasAdminAccess ? (
              <AdminDashboard />
            ) : userScreen === 'settings' ? (
              <UserSettingsScreen onBack={() => setUserScreen('dashboard')} />
            ) : (
              <UserDashboard
                weekIndex={view.weekIndex}
                onSelectWeek={(weekIndex) => setView((prev) => ({ ...prev, weekIndex }))}
                onOpenSession={(weekIndex, sessionId) => {
                  setUserScreen('dashboard')
                  setView((prev) => ({ ...prev, weekIndex }))
                  setActiveSessionId(sessionId)
                }}
              />
            )}
          </section>
        </main>
      </div>
    )
  }, [activeSessionId, hasAdminAccess, isLoading, logout, user, userScreen, view])

  return content
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlanProvider>
        <ProgramProvider>
          <ProgressProvider>{children}</ProgressProvider>
        </ProgramProvider>
      </PlanProvider>
    </AuthProvider>
  )
}

function App() {
  return (
    <Providers>
      <AppShell />
    </Providers>
  )
}

export default App
