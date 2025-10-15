import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../../context/AuthContext'

type StatusMessage = { type: 'success' | 'error'; text: string }

export function AdminSettingsPanel() {
  const { user, updateUsername, updatePassword } = useAuthContext()

  const [usernameForm, setUsernameForm] = useState({ currentPassword: '', newUsername: '' })
  const [usernameMessage, setUsernameMessage] = useState<StatusMessage | null>(null)
  const [usernameSubmitting, setUsernameSubmitting] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordMessage, setPasswordMessage] = useState<StatusMessage | null>(null)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    setUsernameForm((previous) => ({ ...previous, newUsername: user.username }))
  }, [user?.username])

  const usernameChanged = useMemo(() => {
    if (!user) return false
    return usernameForm.newUsername.trim().toLowerCase() !== user.username
  }, [usernameForm.newUsername, user])

  if (!user) {
    return null
  }

  const handleUsernameSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!usernameChanged) {
      setUsernameMessage({ type: 'error', text: 'Update your username before saving.' })
      return
    }

    setUsernameSubmitting(true)
    setUsernameMessage(null)

    const result = await updateUsername({
      currentPassword: usernameForm.currentPassword,
      newUsername: usernameForm.newUsername,
    })

    if (result.success) {
      setUsernameMessage({ type: 'success', text: 'Username updated successfully.' })
      setUsernameForm((previous) => ({ ...previous, currentPassword: '' }))
    } else {
      setUsernameMessage({ type: 'error', text: result.error })
    }

    setUsernameSubmitting(false)
  }

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!passwordForm.newPassword.trim()) {
      setPasswordMessage({ type: 'error', text: 'Enter a new password before saving.' })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }

    setPasswordSubmitting(true)
    setPasswordMessage(null)

    const result = await updatePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })

    if (result.success) {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      setPasswordMessage({ type: 'error', text: result.error })
    }

    setPasswordSubmitting(false)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <header className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Login identity</h2>
            <p className="text-sm text-slate-600">
              Update your coach username. Athletes will use this to find your programming.
            </p>
          </header>
          {usernameMessage ? (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                usernameMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {usernameMessage.text}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={handleUsernameSubmit}>
            <div className="flex flex-col gap-2">
              <label htmlFor="admin-current-password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current password
              </label>
              <input
                id="admin-current-password"
                type="password"
                autoComplete="current-password"
                value={usernameForm.currentPassword}
                onChange={(event) =>
                  setUsernameForm((previous) => ({ ...previous, currentPassword: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Confirm with your current password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="admin-new-username" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                New username
              </label>
              <input
                id="admin-new-username"
                type="text"
                autoComplete="username"
                value={usernameForm.newUsername}
                onChange={(event) =>
                  setUsernameForm((previous) => ({ ...previous, newUsername: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="coach-handle"
                minLength={3}
              />
              <p className="text-xs text-slate-500">
                Current username: <span className="font-semibold text-slate-700">{user.username}</span>
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Usernames sync instantly across the athlete portal.
              </p>
              <button
                type="submit"
                disabled={usernameSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {usernameSubmitting ? 'Saving…' : 'Save username'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <header className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Password</h2>
            <p className="text-sm text-slate-600">
              Keep your coaching hub secure with a strong password.
            </p>
          </header>
          {passwordMessage ? (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                passwordMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {passwordMessage.text}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="flex flex-col gap-2">
              <label htmlFor="admin-password-current" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current password
              </label>
              <input
                id="admin-password-current"
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((previous) => ({ ...previous, currentPassword: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Confirm with your current password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="admin-password-new" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                New password
              </label>
              <input
                id="admin-password-new"
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((previous) => ({ ...previous, newPassword: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="At least 8 characters"
                minLength={8}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="admin-password-confirm" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Confirm new password
              </label>
              <input
                id="admin-password-confirm"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((previous) => ({ ...previous, confirmPassword: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Re-enter your new password"
                minLength={8}
              />
              <p className="text-xs text-slate-500">Use 8+ characters with a mix of letters and numbers.</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">We&apos;ll sign you out on other devices after a password change.</p>
              <button
                type="submit"
                disabled={passwordSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {passwordSubmitting ? 'Saving…' : 'Save password'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <header className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Profile photo</h2>
            <p className="text-sm text-slate-600">Upload a professional avatar to personalise coach communications.</p>
          </header>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Photo uploader coming soon.
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <header className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Billing snapshot</h2>
            <p className="text-sm text-slate-600">Review your current subscription status at a glance.</p>
          </header>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Billing details will appear here.
          </div>
        </section>
      </aside>
    </div>
  )
}
