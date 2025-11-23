import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useAuthContext } from '../../context/AuthContext'
import { getSupabaseEnvironment } from '../../lib/env'
import { getSupabaseClient } from '../../lib/supabase'

type StatusMessage = { type: 'success' | 'error'; text: string }

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsDataURL(file)
  })
}

interface UserSettingsScreenProps {
  onBack: () => void
}

export function UserSettingsScreen({ onBack }: UserSettingsScreenProps) {
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

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-neutral-500">Account</p>
          <h1 className="font-display text-3xl font-semibold text-neutral-50">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-300">
            Update your username, password, and avatar so your coach always knows it&apos;s you.
          </p>
        </div>
        <Button variant="secondary" onClick={onBack} className="self-start md:self-auto">
          Back to dashboard
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Username</CardTitle>
              <CardDescription>Choose how your name appears across the athlete experience.</CardDescription>
            </CardHeader>
            <CardContent>
              {usernameMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                    usernameMessage.type === 'success'
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-danger/40 bg-danger/10 text-danger'
                  }`}
                >
                  {usernameMessage.text}
                </div>
              ) : null}
              <form className="space-y-4" onSubmit={handleUsernameSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="user-settings-current-password">Current password</Label>
                  <Input
                    id="user-settings-current-password"
                    type="password"
                    autoComplete="current-password"
                    value={usernameForm.currentPassword}
                    onChange={(event) =>
                      setUsernameForm((previous) => ({ ...previous, currentPassword: event.target.value }))
                    }
                    placeholder="Confirm with your current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-settings-new-username">New username</Label>
                  <Input
                    id="user-settings-new-username"
                    type="text"
                    autoComplete="username"
                    value={usernameForm.newUsername}
                    onChange={(event) =>
                      setUsernameForm((previous) => ({ ...previous, newUsername: event.target.value }))
                    }
                    placeholder="athlete-handle"
                    minLength={3}
                  />
                  <p className="text-xs text-neutral-400">
                    Current username: <span className="font-semibold text-neutral-100">{user.username}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-neutral-400">Changes sync instantly with your coach&apos;s workspace.</p>
                  <Button type="submit" disabled={usernameSubmitting}>
                    {usernameSubmitting ? 'Saving…' : 'Save username'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Keep your login secure with a strong password.</CardDescription>
            </CardHeader>
            <CardContent>
              {passwordMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                    passwordMessage.type === 'success'
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-danger/40 bg-danger/10 text-danger'
                  }`}
                >
                  {passwordMessage.text}
                </div>
              ) : null}
              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="user-settings-password-current">Current password</Label>
                  <Input
                    id="user-settings-password-current"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((previous) => ({ ...previous, currentPassword: event.target.value }))
                    }
                    placeholder="Confirm with your current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-settings-password-new">New password</Label>
                  <Input
                    id="user-settings-password-new"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((previous) => ({ ...previous, newPassword: event.target.value }))
                    }
                    placeholder="At least 8 characters"
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-settings-password-confirm">Confirm new password</Label>
                  <Input
                    id="user-settings-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((previous) => ({ ...previous, confirmPassword: event.target.value }))
                    }
                    placeholder="Re-enter your new password"
                    minLength={8}
                  />
                  <p className="text-xs text-neutral-400">Use 8+ characters with a mix of letters and numbers.</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-neutral-400">You&apos;ll stay signed in here, but other devices will refresh.</p>
                  <Button type="submit" disabled={passwordSubmitting}>
                    {passwordSubmitting ? 'Saving…' : 'Save password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile photo</CardTitle>
              <CardDescription>Give your coach a face to pair with your updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {avatarMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                    avatarMessage.type === 'success'
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-danger/40 bg-danger/10 text-danger'
                  }`}
                >
                  {avatarMessage.text}
                </div>
              ) : null}
              <div className="flex flex-col items-center gap-4">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/10">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-neutral-200">
                      {(user.displayName ?? user.username).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {avatarUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-neutral-950/80 text-xs font-semibold text-neutral-200">
                      Uploading…
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? 'Uploading…' : 'Upload new'}
                  </Button>
                  {avatarPreview ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAvatarRemove}
                      disabled={avatarUploading}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-neutral-400 text-center">Recommended 400×400 PNG, JPG, or WebP. Max file size 5MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick tips</CardTitle>
              <CardDescription>Keep your profile up to date for faster coaching adjustments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-neutral-300">
              <p>• Refresh your avatar every time you switch teams or events.</p>
              <p>• Tell your coach if you notice any incorrect plan details after a username change.</p>
              <p>• Use a password manager to generate strong, unique credentials.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
