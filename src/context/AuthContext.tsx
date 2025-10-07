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

function mapSupabaseUser(row: any): StoredUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    salt: row.salt,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
  }
}

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
            .select('id, username, display_name, password_hash, salt, is_admin, created_at')
            .order('created_at', { ascending: true })

          if (error) throw error
          if (cancelled) return
          setUsers((data ?? []).map(mapSupabaseUser))
        } else {
          const stored = loadStoredUsers<Array<Partial<StoredUser> & { username: string }>>([])
          if (cancelled) return
          const normalised = stored.map((entry) => ({
            id: entry.id ?? generateLocalId(),
            username: entry.username,
            displayName: entry.displayName ?? entry.username,
            passwordHash: entry.passwordHash ?? '',
            salt: entry.salt ?? '',
            createdAt: entry.createdAt ?? new Date().toISOString(),
            isAdmin: entry.isAdmin ?? false,
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
        const salt = createSalt()
        const passwordHash = await hashPassword('admin123', salt)
        const createdAt = new Date().toISOString()

        if (supabaseClient) {
          const { data, error } = await supabaseClient
            .from('app_users')
            .insert({
              username: 'admin',
              display_name: 'Head Coach',
              password_hash: passwordHash,
              salt,
              is_admin: true,
              created_at: createdAt,
            })
            .select('id, username, display_name, password_hash, salt, is_admin, created_at')
            .maybeSingle()

          if (error) {
            if (error.code !== '23505') {
              throw error
            }
            // duplicate admin inserted elsewhere; refetch soon
            const { data: existing } = await supabaseClient
              .from('app_users')
              .select('id, username, display_name, password_hash, salt, is_admin, created_at')
              .eq('username', 'admin')
              .maybeSingle()

            if (existing) {
              setUsers((previous) => [...previous, mapSupabaseUser(existing)])
            }
          } else if (data) {
            setUsers((previous) => [...previous, mapSupabaseUser(data)])
          }
        } else {
          const adminUser: StoredUser = {
            id: generateLocalId(),
            username: 'admin',
            displayName: 'Head Coach',
            salt,
            passwordHash,
            createdAt,
            isAdmin: true,
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, (payload: RealtimePostgresChangesPayload<any>) => {
        const newRow = payload.new ? mapSupabaseUser(payload.new) : null
        const oldRowId = (payload.old as { id?: string } | null)?.id ?? null

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
            })
            .select('id, username, display_name, password_hash, salt, is_admin, created_at')
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
  }), [isLoading, supabaseClient, user, users])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}
