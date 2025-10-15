import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { getSupabaseEnvironment } from '../lib/env'
import { getSupabaseClient } from '../lib/supabase'
import { createSalt, hashPassword, verifyPassword } from '../lib/security'
import { loadStoredUsers, persistUsers } from '../lib/storage'
import type { LoginPayload, SignupPayload, StoredUser } from '../types/plan'

interface AuthContextValue {
  user: StoredUser | null
  users: StoredUser[]
  isLoading: boolean
  signup: (payload: SignupPayload) => Promise<{ success: true } | { success: false; error: string }>
  login: (payload: LoginPayload) => Promise<{ success: true } | { success: false; error: string }>
  logout: () => void
  updateUsername: (payload: { currentPassword: string; newUsername: string }) => Promise<{ success: true } | { success: false; error: string }>
  updatePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<{ success: true } | { success: false; error: string }>
  updateAvatar: (payload: { avatarUrl: string | null }) => Promise<{ success: true } | { success: false; error: string }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function normaliseUsername(username: string): string {
  return username.trim().toLowerCase()
}

function generateLocalId(): string {
  if (typeof globalThis !== 'undefined' && typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `user-${Math.random().toString(36).slice(2, 10)}`
}

type SupabaseUserRow = {
  id: string
  username: string
  display_name: string
  password_hash: string
  salt: string
  is_admin: boolean
  created_at: string
  avatar_url: string | null
  plan_name: string
  billing_interval: string
  renewal_date: string
}

function mapSupabaseUser(row: SupabaseUserRow): StoredUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    salt: row.salt,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
    avatarUrl: row.avatar_url,
    planName: row.plan_name,
    billingInterval: row.billing_interval,
    renewalDate: row.renewal_date,
  }
}

type LocalStoredUserSeed = Partial<StoredUser> & { username: string }

const DEFAULT_LOCAL_USERS: LocalStoredUserSeed[] = [
  {
    username: 'admin',
    displayName: 'Head Coach',
    salt: 'a1b2c3d4e5f67890',
    passwordHash: '99f45aff744c9251a6e0d3332a007cea0175a1f2688cb906de18fb2800483e18',
    isAdmin: true,
    planName: 'Pro Coach',
    billingInterval: 'monthly',
    renewalDate: '2025-11-01',
    avatarUrl: null,
    createdAt: '2025-10-01T00:00:00.000Z',
  },
  {
    username: 'athlete',
    displayName: 'Jordan Sparks',
    salt: '11aa22bb33cc44dd',
    passwordHash: 'be23b9e62079c68337b953bc7f814bd8cfea976450a8676d9939d5f9c280893c',
    isAdmin: false,
    planName: 'Starter',
    billingInterval: 'monthly',
    renewalDate: '2025-11-08',
    avatarUrl: null,
    createdAt: '2025-10-02T00:00:00.000Z',
  },
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseEnv = getSupabaseEnvironment()
  const supabaseClient = useMemo(() => (supabaseEnv ? getSupabaseClient(supabaseEnv) : null), [supabaseEnv])

  const [users, setUsers] = useState<StoredUser[]>([])
  const [user, setUser] = useState<StoredUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const ensuringAdminRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadUsers() {
      setIsLoading(true)
      try {
        if (supabaseClient) {
          const { data, error } = await supabaseClient
            .from('app_users')
            .select('id, username, display_name, password_hash, salt, is_admin, created_at, avatar_url, plan_name, billing_interval, renewal_date')
            .order('created_at', { ascending: true })

          if (error) throw error
          if (cancelled) return
          setUsers((data ?? []).map(mapSupabaseUser))
        } else {
          const stored = loadStoredUsers<LocalStoredUserSeed[]>(DEFAULT_LOCAL_USERS)
          if (cancelled) return
          const normalised = stored.map((entry) => ({
            id: entry.id ?? generateLocalId(),
            username: entry.username,
            displayName: entry.displayName ?? entry.username,
            passwordHash: entry.passwordHash ?? '',
            salt: entry.salt ?? '',
            createdAt: entry.createdAt ?? new Date().toISOString(),
            isAdmin: entry.isAdmin ?? false,
            avatarUrl: entry.avatarUrl ?? null,
            planName: entry.planName && typeof entry.planName === 'string' ? entry.planName : 'Starter',
            billingInterval:
              entry.billingInterval && typeof entry.billingInterval === 'string' ? entry.billingInterval : 'monthly',
            renewalDate:
              entry.renewalDate && typeof entry.renewalDate === 'string'
                ? entry.renewalDate
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          }))
          setUsers(normalised)
        }
      } catch (error) {
        console.error('Failed to load users', error)
        if (!cancelled) {
          setUsers([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      cancelled = true
    }
  }, [supabaseClient])

  useEffect(() => {
    if (isLoading) return
    if (supabaseClient) return
    persistUsers(users)
  }, [users, isLoading, supabaseClient])

  useEffect(() => {
    if (isLoading) return
    if (users.some((entry) => entry.isAdmin)) return
    if (ensuringAdminRef.current) return

    ensuringAdminRef.current = true

    ;(async () => {
      try {
        console.log('Creating admin account...')
        const salt = 'a1b2c3d4e5f67890' // Fixed salt for consistency
        const passwordHash = await hashPassword('admin123', salt)
        const createdAt = new Date().toISOString()
        const planName = 'Pro Coach'
        const billingInterval = 'monthly'
        const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

        console.log('Admin credentials:', { salt, passwordHash })

        if (supabaseClient) {
          console.log('Using Supabase to create admin...')
          const { data, error } = await supabaseClient
            .from('app_users')
            .upsert({
              username: 'admin',
              display_name: 'Head Coach',
              password_hash: passwordHash,
              salt,
              is_admin: true,
              created_at: createdAt,
              plan_name: planName,
              billing_interval: billingInterval,
              renewal_date: renewalDate,
            }, {
              onConflict: 'username'
            })
            .select('id, username, display_name, password_hash, salt, is_admin, created_at, avatar_url, plan_name, billing_interval, renewal_date')
            .maybeSingle()

          console.log('Supabase admin creation result:', { data, error })
          
          if (error) {
            console.error('Admin creation error:', error)
            // Try fetching existing admin
            const { data: existing } = await supabaseClient
              .from('app_users')
              .select('id, username, display_name, password_hash, salt, is_admin, created_at, avatar_url, plan_name, billing_interval, renewal_date')
              .eq('username', 'admin')
              .maybeSingle()

            if (existing) {
              console.log('Found existing admin:', existing)
              setUsers((previous) => [...previous, mapSupabaseUser(existing)])
            }
          } else if (data) {
            console.log('Created new admin:', data)
            setUsers((previous) => [...previous, mapSupabaseUser(data)])
          }
        } else {
          console.log('Using local storage for admin...')
          const adminUser: StoredUser = {
            id: generateLocalId(),
            username: 'admin',
            displayName: 'Head Coach',
            salt,
            passwordHash,
            createdAt,
            isAdmin: true,
            avatarUrl: null,
            planName,
            billingInterval,
            renewalDate,
          }
          setUsers((previous) => [...previous, adminUser])
        }
      } catch (error) {
        console.error('Failed to provision admin user', error)
      } finally {
        ensuringAdminRef.current = false
      }
    })()
  }, [isLoading, supabaseClient, users])

  useEffect(() => {
    if (!supabaseClient) return

    const currentUserId = user?.id ?? null

    const channel = supabaseClient
      .channel('app_users_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, (payload: RealtimePostgresChangesPayload<SupabaseUserRow>) => {
        const newRow = payload.new && 'id' in payload.new ? mapSupabaseUser(payload.new as SupabaseUserRow) : null
        const oldRowId = payload.old && 'id' in payload.old ? (payload.old.id as string) : null

        setUsers((previous) => {
          switch (payload.eventType) {
            case 'INSERT':
              if (!newRow) return previous
              if (previous.some((entry) => entry.id === newRow.id)) {
                return previous
              }
              return [...previous, newRow]
            case 'UPDATE':
              if (!newRow) return previous
              return previous.map((entry) => (entry.id === newRow.id ? newRow : entry))
            case 'DELETE':
              if (!oldRowId) return previous
              return previous.filter((entry) => entry.id !== oldRowId)
            default:
              return previous
          }
        })

        if (newRow && currentUserId && currentUserId === newRow.id) {
          setUser(newRow)
        }

        if (payload.eventType === 'DELETE' && oldRowId && currentUserId && currentUserId === oldRowId) {
          setUser(null)
        }
      })

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('app_users realtime channel error')
      }
    })

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [supabaseClient, user?.id])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    users,
    isLoading,
    signup: async (payload) => {
      const username = normaliseUsername(payload.username)
      if (!username) {
        return { success: false, error: 'Username is required.' }
      }
      if (!payload.password.trim()) {
        return { success: false, error: 'Password is required.' }
      }
      if (users.some((entry) => entry.username === username)) {
        return { success: false, error: 'That username is already taken.' }
      }

      const salt = createSalt()
      const passwordHash = await hashPassword(payload.password, salt)
      const createdAt = new Date().toISOString()
      const displayName = payload.displayName.trim() || username
      const planName = 'Starter'
      const billingInterval = 'monthly'
      const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const avatarUrl: string | null = null

      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('app_users')
            .insert({
              username,
              display_name: displayName,
              password_hash: passwordHash,
              salt,
              is_admin: false,
              created_at: createdAt,
              plan_name: planName,
              billing_interval: billingInterval,
              renewal_date: renewalDate,
              avatar_url: avatarUrl,
            })
            .select('id, username, display_name, password_hash, salt, is_admin, created_at, avatar_url, plan_name, billing_interval, renewal_date')
            .single()

          if (error) throw error
          const stored = mapSupabaseUser(data)
          setUsers((previous) => [...previous, stored])
          setUser(stored)
          return { success: true }
        } catch (error) {
          console.error('Failed to sign up user', error)
          return { success: false, error: 'Unable to create account right now.' }
        }
      }

      const nextUser: StoredUser = {
        id: generateLocalId(),
        username,
        displayName,
        salt,
        passwordHash,
        createdAt,
        isAdmin: false,
        avatarUrl,
        planName,
        billingInterval,
        renewalDate,
      }
      setUsers((previous) => [...previous, nextUser])
      setUser(nextUser)
      return { success: true }
    },
    login: async (payload) => {
      const username = normaliseUsername(payload.username)
      const existing = users.find((entry) => entry.username === username)
      if (!existing) {
        return { success: false, error: 'No account with that username.' }
      }
      const valid = await verifyPassword(payload.password, existing.salt, existing.passwordHash)
      if (!valid) {
        return { success: false, error: 'Incorrect password.' }
      }
      setUser(existing)
      return { success: true }
    },
    logout: () => {
      setUser(null)
    },
    updateUsername: async ({ currentPassword, newUsername }) => {
      if (!user) {
        return { success: false, error: 'You need to be signed in to update your username.' }
      }

      const nextUsername = normaliseUsername(newUsername)
      if (!nextUsername) {
        return { success: false, error: 'Choose a new username before saving.' }
      }
      if (!currentPassword.trim()) {
        return { success: false, error: 'Current password is required to confirm this change.' }
      }
      if (nextUsername === user.username) {
        return { success: false, error: 'That is already your username.' }
      }
      if (users.some((entry) => entry.username === nextUsername && entry.id !== user.id)) {
        return { success: false, error: 'That username is already taken.' }
      }

      const valid = await verifyPassword(currentPassword, user.salt, user.passwordHash)
      if (!valid) {
        return { success: false, error: 'Incorrect current password.' }
      }

      try {
        if (supabaseClient) {
          const { data, error } = await supabaseClient
            .from('app_users')
            .update({
              username: nextUsername,
            })
            .eq('id', user.id)
            .select(
              'id, username, display_name, password_hash, salt, is_admin, created_at, avatar_url, plan_name, billing_interval, renewal_date',
            )
            .maybeSingle()

          if (error) throw error
          if (!data) throw new Error('No data returned while updating username')

          const updatedUser = mapSupabaseUser(data)
          setUsers((previous) => previous.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)))
          setUser(updatedUser)
        } else {
          const updatedUser: StoredUser = {
            ...user,
            username: nextUsername,
          }
          setUsers((previous) => previous.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)))
          setUser(updatedUser)
        }

        return { success: true }
      } catch (error) {
        console.error('Failed to update username', error)
        return { success: false, error: 'Unable to update username right now.' }
      }
    },
    updatePassword: async ({ currentPassword, newPassword }) => {
      if (!user) {
        return { success: false, error: 'You need to be signed in to update your password.' }
      }
      if (!currentPassword.trim()) {
        return { success: false, error: 'Enter your current password to confirm the change.' }
      }
      if (!newPassword.trim()) {
        return { success: false, error: 'Choose a new password before saving.' }
      }
      if (newPassword.length < 8) {
        return { success: false, error: 'Passwords must be at least 8 characters long.' }
      }

      const isSameAsCurrent = await verifyPassword(newPassword, user.salt, user.passwordHash)
      if (isSameAsCurrent) {
        return { success: false, error: 'Pick a password that is different from your current one.' }
      }

      const validCurrent = await verifyPassword(currentPassword, user.salt, user.passwordHash)
      if (!validCurrent) {
        return { success: false, error: 'Incorrect current password.' }
      }

      try {
        const nextSalt = createSalt()
        const nextHash = await hashPassword(newPassword, nextSalt)

        if (supabaseClient) {
          const { data, error } = await supabaseClient
            .from('app_users')
            .update({
              salt: nextSalt,
              password_hash: nextHash,
            })
            .eq('id', user.id)
            .select(
              'id, username, display_name, password_hash, salt, is_admin, created_at, avatar_url, plan_name, billing_interval, renewal_date',
            )
            .maybeSingle()

          if (error) throw error
          if (!data) throw new Error('No data returned while updating password')

          const updatedUser = mapSupabaseUser(data)
          setUsers((previous) => previous.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)))
          setUser(updatedUser)
        } else {
          const updatedUser: StoredUser = {
            ...user,
            salt: nextSalt,
            passwordHash: nextHash,
          }
          setUsers((previous) => previous.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)))
          setUser(updatedUser)
        }

        return { success: true }
      } catch (error) {
        console.error('Failed to update password', error)
        return { success: false, error: 'Unable to update password right now.' }
      }
    },
    updateAvatar: async ({ avatarUrl }) => {
      if (!user) {
        return { success: false, error: 'You need to be signed in to update your profile photo.' }
      }

      try {
        if (supabaseClient) {
          const { data, error } = await supabaseClient
            .from('app_users')
            .update({
              avatar_url: avatarUrl,
            })
            .eq('id', user.id)
            .select(
              'id, username, display_name, password_hash, salt, is_admin, created_at, avatar_url, plan_name, billing_interval, renewal_date',
            )
            .maybeSingle()

          if (error) throw error
          if (!data) throw new Error('No data returned while updating avatar')

          const updatedUser = mapSupabaseUser(data)
          setUsers((previous) => previous.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)))
          setUser(updatedUser)
        } else {
          const updatedUser: StoredUser = {
            ...user,
            avatarUrl,
          }
          setUsers((previous) => previous.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)))
          setUser(updatedUser)
        }

        return { success: true }
      } catch (error) {
        console.error('Failed to update avatar', error)
        return { success: false, error: 'Unable to update profile photo right now.' }
      }
    },
  }), [isLoading, supabaseClient, user, users])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}
