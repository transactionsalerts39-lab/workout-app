import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

interface FormState {
  username: string
  password: string
  confirmPassword: string
  displayName: string
}

type AuthMode = 'login' | 'signup'

const initialForm: FormState = {
  username: '',
  password: '',
  confirmPassword: '',
  displayName: '',
}

export function AuthScreen() {
  const { signup, login, isLoading, users } = useAuthContext()
  const [mode, setMode] = useState<AuthMode>('login')
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const hasCoachAccount = useMemo(() => users.some((entry) => entry.isAdmin), [users])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setPending(true)
    const actionResult =
      mode === 'login'
        ? await login({ username: form.username, password: form.password })
        : await signup({
            username: form.username,
            password: form.password,
            displayName: form.displayName || form.username,
          })

    setPending(false)

    if (!actionResult.success) {
      setError(actionResult.error)
    } else {
      setForm(initialForm)
    }
  }

  const title = mode === 'login' ? 'Welcome back' : 'Create your account'
  const submitLabel = mode === 'login' ? 'Sign in' : 'Create account'

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div className="absolute inset-0 -z-10 bg-gradient-primary opacity-20 blur-[180px]" />
      <Card className="w-full max-w-lg space-y-6 p-10">
        <CardHeader className="mb-4 space-y-4 text-center">
          <Badge variant="secondary" className="mx-auto w-fit">
            {mode === 'login' ? 'Welcome back' : 'Join the beta'}
          </Badge>
          <CardTitle className="text-3xl leading-tight">{title}</CardTitle>
          <p className="text-sm text-neutral-300/80">
            {mode === 'login'
              ? 'Continue your personalised training journey with adaptive coaching insights.'
              : 'Spin up an account to let the AI coach guide your progression from day one.'}
          </p>
        </CardHeader>

        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-username">Username</Label>
              <Input
                id="auth-username"
                type="text"
                name="username"
                autoComplete="username"
                required
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                disabled={pending || isLoading}
              />
            </div>

            {mode === 'signup' ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="auth-display">Display name</Label>
                <Input
                  id="auth-display"
                  type="text"
                  name="displayName"
                  value={form.displayName}
                  onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                  disabled={pending || isLoading}
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                type="password"
                name="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                disabled={pending || isLoading}
              />
            </div>

            {mode === 'signup' ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="auth-confirm">Confirm password</Label>
                <Input
                  id="auth-confirm"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  disabled={pending || isLoading}
                />
              </div>
            ) : null}

            {error ? (
              <p className="rounded-2xl border border-danger/40 bg-danger/15 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="mt-2" disabled={pending || isLoading}>
              {pending ? 'Working…' : submitLabel}
            </Button>
          </form>
        </CardContent>

        <footer className="mt-2 flex flex-col gap-3 text-center text-xs text-neutral-400">
          <p>
            {mode === 'login' ? (
              <>
                Need an account?{' '}
                <button
                  type="button"
                  className="font-semibold text-accent-teal underline-offset-4 hover:underline"
                  onClick={() => {
                    setMode('signup')
                    setError(null)
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="font-semibold text-accent-teal underline-offset-4 hover:underline"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
          {hasCoachAccount ? (
            <p>
              Admin account: username <span className="font-semibold text-neutral-100">admin</span> / password{' '}
              <span className="font-semibold text-neutral-100">admin123</span>
            </p>
          ) : null}
        </footer>
      </Card>
    </div>
  )
}
