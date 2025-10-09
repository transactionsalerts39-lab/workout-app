import { useEffect, useMemo, useState } from 'react'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import { PlanProvider, usePlanContext } from './context/PlanContext'
import { ProgressProvider } from './context/ProgressContext'
import { ProgramProvider } from './context/ProgramContext'
import { AuthScreen } from './features/auth/AuthScreen'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { UserDashboard } from './features/dashboard/UserDashboard'
import { WorkoutSessionView } from './features/workout/WorkoutSessionView'
import { Button } from './components/ui/button'
import './App.css'

interface ViewState {
  screen: 'dashboard' | 'admin'
  weekIndex: number
}

function AppShell() {
  const { user, isLoading, logout } = useAuthContext()
  const { weeks } = usePlanContext()
  const [view, setView] = useState<ViewState>(() => ({ screen: 'dashboard', weekIndex: weeks[0]?.weekIndex ?? 1 }))
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

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
    if (!hasAdminAccess) return
    setView((previous) => {
      if (previous.screen === 'admin') return previous
      return { ...previous, screen: 'admin' }
    })
  }, [hasAdminAccess])

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <span className="text-sm text-slate-500">Loading…</span>
        </div>
      )
    }

    if (!user) {
      return <AuthScreen />
    }

    if (activeSessionId) {
      return (
        <main className="mx-auto max-w-5xl px-4 py-10">
          <WorkoutSessionView
            weekIndex={view.weekIndex}
            sessionId={activeSessionId}
            onBack={() => setActiveSessionId(null)}
          />
        </main>
      )
    }

    return (
      <div className="min-h-screen bg-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-slate-900">Coach Plan</span>
              <nav className="flex gap-2 text-sm">
                {!hasAdminAccess ? (
                  <Button
                    size="sm"
                    variant={view.screen === 'dashboard' ? 'default' : 'secondary'}
                    onClick={() => setView((prev) => ({ ...prev, screen: 'dashboard' }))}
                  >
                    My dashboard
                  </Button>
                ) : (
                  <span className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Admin
                  </span>
                )}
              </nav>
            </div>
            <Button size="sm" variant="outline" onClick={logout}>
              Log out
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">
          {!hasAdminAccess ? (
            <UserDashboard
              weekIndex={view.weekIndex}
              onSelectWeek={(weekIndex) => setView((prev) => ({ ...prev, weekIndex }))}
              onOpenSession={(weekIndex, sessionId) => {
                setView((prev) => ({ ...prev, weekIndex }))
                setActiveSessionId(sessionId)
              }}
            />
          ) : (
            <AdminDashboard />
          )}
        </main>
      </div>
    )
  }, [activeSessionId, hasAdminAccess, isLoading, logout, user, view])

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
