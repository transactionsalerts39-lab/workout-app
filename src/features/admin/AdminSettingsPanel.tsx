import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { getSupabaseEnvironment } from '../../lib/env'
import { getSupabaseClient } from '../../lib/supabase'

type StatusMessage = { type: 'success' | 'error'; text: string }

export function AdminSettingsPanel() {
  const { user, updateUsername, updatePassword, updateAvatar } = useAuthContext()
  const supabaseEnv = getSupabaseEnvironment()
  const supabaseClient = useMemo(() => (supabaseEnv ? getSupabaseClient(supabaseEnv) : null), [supabaseEnv])

  const [usernameForm, setUsernameForm] = useState({ currentPassword: '', newUsername: '' })
  const [usernameMessage, setUsernameMessage] = useState<StatusMessage | null>(null)
  const [usernameSubmitting, setUsernameSubmitting] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordMessage, setPasswordMessage] = useState<StatusMessage | null>(null)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarMessage, setAvatarMessage] = useState<StatusMessage | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const renewalDate = useMemo(() => {
    if (!user?.renewalDate) return null
    const parsed = new Date(user.renewalDate)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
  }, [user?.renewalDate])

  const formattedRenewal = useMemo(() => {
    if (!renewalDate) return '—'
    return renewalDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }, [renewalDate])

  const daysUntilRenewal = useMemo(() => {
    if (!renewalDate) return null
    const now = new Date()
    const diffMs = renewalDate.getTime() - now.getTime()
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
  }, [renewalDate])

  useEffect(() => {
    if (!user) return
    setUsernameForm((previous) => ({ ...previous, newUsername: user.username }))
  }, [user])

  useEffect(() => {
    setAvatarPreview(user?.avatarUrl ?? null)
  }, [user])

  const usernameChanged = useMemo(() => {
    if (!user) return false
    return usernameForm.newUsername.trim().toLowerCase() !== user.username
  }, [usernameForm.newUsername, user])

  if (!user) {
    return null
  }

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file.'))
      reader.readAsDataURL(file)
    })

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAvatarMessage({ type: 'error', text: 'Please choose a PNG, JPEG, or WebP image.' })
      return
    }
    const maxSizeMb = 5
    if (file.size > maxSizeMb * 1024 * 1024) {
      setAvatarMessage({ type: 'error', text: `Images must be smaller than ${maxSizeMb}MB.` })
      return
    }

    const previousUrl = avatarPreview
    const tempPreviewUrl = URL.createObjectURL(file)
    setAvatarPreview(tempPreviewUrl)
    setAvatarUploading(true)
    setAvatarMessage(null)

    try {
      let appliedUrl: string

      if (supabaseClient) {
        const filePath = `${user.id}/avatar`
        const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        })
        if (uploadError) throw uploadError

        const { data: publicData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath)
        const publicUrl = publicData?.publicUrl ? `${publicData.publicUrl}?v=${Date.now()}` : null
        if (!publicUrl) throw new Error('Unable to resolve public URL for uploaded avatar.')

        const result = await updateAvatar({ avatarUrl: publicUrl })
        if (!result.success) throw new Error(result.error)

        appliedUrl = publicUrl
      } else {
        const dataUrl = await readFileAsDataUrl(file)
        const result = await updateAvatar({ avatarUrl: dataUrl })
        if (!result.success) throw new Error(result.error)
        appliedUrl = dataUrl
      }

      setAvatarPreview(appliedUrl)
      setAvatarMessage({ type: 'success', text: 'Profile photo updated successfully.' })
    } catch (error) {
      console.error('Avatar upload failed', error)
      const message =
        error instanceof Error ? error.message : 'Unable to upload photo. Please try again in a moment.'
      setAvatarMessage({ type: 'error', text: message })
      setAvatarPreview(previousUrl ?? null)
    } finally {
      URL.revokeObjectURL(tempPreviewUrl)
      setAvatarUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAvatarRemove = async () => {
    if (!avatarPreview && !user.avatarUrl) {
      return
    }
    setAvatarUploading(true)
    setAvatarMessage(null)
    const previousUrl = avatarPreview

    try {
      if (supabaseClient) {
        const { error: removeError } = await supabaseClient.storage.from('avatars').remove([`${user.id}/avatar`])
        if (removeError) {
          console.warn('Failed to remove stored avatar asset', removeError)
        }
      }
      const result = await updateAvatar({ avatarUrl: null })
      if (!result.success) throw new Error(result.error)
      setAvatarPreview(null)
      setAvatarMessage({ type: 'success', text: 'Profile photo removed.' })
    } catch (error) {
      console.error('Avatar removal failed', error)
      const message =
        error instanceof Error ? error.message : 'Unable to remove photo. Please try again in a moment.'
      setAvatarMessage({ type: 'error', text: message })
      setAvatarPreview(previousUrl ?? null)
    } finally {
      setAvatarUploading(false)
    }
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
          {avatarMessage ? (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                avatarMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {avatarMessage.text}
            </div>
          ) : null}
          <div className="flex flex-col items-center gap-4 text-sm text-slate-600">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Coach avatar" className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-slate-500">{(user.displayName ?? user.username).slice(0, 1).toUpperCase()}</span>
              )}
              {avatarUploading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80 text-xs font-semibold text-slate-600">
                  Uploading…
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 font-semibold text-white shadow transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {avatarUploading ? 'Uploading…' : 'Upload new'}
              </button>
              {avatarPreview ? (
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  disabled={avatarUploading}
                  className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600 disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className="text-xs text-center text-slate-500">Recommended 400×400 PNG, JPG, or WebP. Max file size 5MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <header className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Billing snapshot</h2>
            <p className="text-sm text-slate-600">Review your current subscription status at a glance.</p>
          </header>
          <dl className="grid gap-4 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</dt>
                <dd className="text-base font-semibold text-slate-900">{user.planName}</dd>
              </div>
              <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-semibold text-indigo-600">
                {user.billingInterval === 'monthly' ? 'Monthly' : user.billingInterval === 'annual' ? 'Annual' : user.billingInterval}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next renewal</dt>
              <dd className="text-base font-semibold text-slate-900">{formattedRenewal}</dd>
              {daysUntilRenewal !== null ? (
                <span className="text-xs text-slate-500">
                  {daysUntilRenewal === 0
                    ? 'Renews today'
                    : `Renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? '' : 's'}`}
                </span>
              ) : null}
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
              For billing changes, contact support or adjust your Stripe subscription dashboard.
            </div>
          </dl>
        </section>
      </aside>
    </div>
  )
}
