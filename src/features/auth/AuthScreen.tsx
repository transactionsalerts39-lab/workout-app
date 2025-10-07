import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthContext } from '../../context/AuthContext'

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-card">
        <header className="mb-6 flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">
            {mode === 'login'
              ? 'Log in to pick up where you left off.'
              : 'Track your training progress alongside the coach plan.'}
          </p>
        </header>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-slate-700">
            Username
            <input
              type="text"
              name="username"
              autoComplete="username"
              required
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              disabled={pending || isLoading}
            />
          </label>

          {mode === 'signup' && (
            <label className="text-sm font-medium text-slate-700">
              Display name
              <input
                type="text"
                name="displayName"
                value={form.displayName}
                onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                disabled={pending || isLoading}
              />
            </label>
          )}

          <label className="text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              disabled={pending || isLoading}
            />
          </label>

          {mode === 'signup' && (
            <label className="text-sm font-medium text-slate-700">
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                disabled={pending || isLoading}
              />
            </label>
          )}

          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            disabled={pending || isLoading}
          >
            {pending ? 'Working…' : submitLabel}
          </button>
        </form>

        <footer className="mt-6 flex flex-col gap-3 text-center text-xs text-slate-500">
          <p>
            {mode === 'login' ? (
              <>
                Need an account?{' '}
                <button
                  type="button"
                  className="font-semibold text-indigo-600 underline-offset-4 hover:underline"
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
                  className="font-semibold text-indigo-600 underline-offset-4 hover:underline"
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
            <p>Admin account: username <span className="font-semibold">admin</span> / password <span className="font-semibold">admin123</span></p>
          ) : null}
        </footer>
      </div>
    </div>
  )
}
