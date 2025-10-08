import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useAuthContext } from './AuthContext'
import { usePlanContext, type SessionExerciseView, type WeekSessionView, type WeekView } from './PlanContext'
import { getSupabaseEnvironment } from '../lib/env'
import { getSupabaseClient } from '../lib/supabase'
import { loadStoredProgress, persistProgress } from '../lib/storage'
import type {
  KeyedProgressSummary,
  SessionProgress,
  StoredUser,
  UserProgressRecord,
  UserSessionProgressMap,
  WeekProgressMap,
} from '../types/plan'

interface UpdateExerciseInput {
  userId: string
  weekIndex: number
  sessionId: string
  exercise: SessionExerciseView
  setEntries: string[]
  notes?: string
}

interface ProgressContextValue {
  records: Record<string, UserProgressRecord>
  getUserProgress: (userId: string) => UserProgressRecord | undefined
  getExerciseProgress: (userId: string, weekIndex: number, sessionId: string, exerciseId: string) => SessionProgress | undefined
  updateExerciseProgress: (input: UpdateExerciseInput) => Promise<void>
  markExerciseUsingPlan: (userId: string, weekIndex: number, session: WeekSessionView) => Promise<void>
  summaries: KeyedProgressSummary[]
  isRemote: boolean
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined)

type SessionProgressRow = {
  user_id: string
  week_index: number
  session_id: string
  exercise_id: string
  completed_sets: number
  total_sets: number
  set_entries: string[] | null
  notes: string | null
  last_updated_at: string | null
}

function cloneOrCreateUserRecord(
  record: UserProgressRecord | undefined,
  userId: string,
  username: string,
): UserProgressRecord {
  if (record) {
    return {
      ...record,
      userId,
      username: record.username || username,
      weeks: { ...record.weeks },
    }
  }
  return { userId, username, weeks: {} }
}

function cloneWeekProgress(map: WeekProgressMap | undefined): WeekProgressMap {
  if (!map) return {}
  return Object.fromEntries(Object.entries(map).map(([sessionId, sessionProgress]) => [sessionId, { ...sessionProgress }]))
}

function cloneSessionProgress(map: UserSessionProgressMap | undefined): UserSessionProgressMap {
  if (!map) return {}
  return Object.fromEntries(
    Object.entries(map).map(([exerciseId, progress]) => [exerciseId, { ...progress, setEntries: [...progress.setEntries] }]),
  )
}

function toSessionProgress(input: UpdateExerciseInput, existing?: SessionProgress): SessionProgress {
  const completedSets = input.setEntries.length
  const totalSets = input.exercise.prescribedSets
  return {
    completedSets,
    totalSets,
    notes: input.notes ?? existing?.notes,
    setEntries: [...input.setEntries],
    lastUpdatedAt: new Date().toISOString(),
  }
}

function collectSummaries(records: Record<string, UserProgressRecord>, weeks: WeekView[]): KeyedProgressSummary[] {
  return Object.values(records).map((record) => {
    let completedSessions = 0
    let lastActiveAt: string | undefined

    weeks.forEach((week) => {
      const weekProgress = record.weeks[week.weekIndex]
      week.sessions.forEach((session) => {
        const sessionProgress = weekProgress?.[session.sessionId]
        if (!sessionProgress) return
        const isComplete = session.exercises.every((exercise) => {
          const progress = sessionProgress[exercise.exerciseId]
          return progress && progress.completedSets >= exercise.prescribedSets
        })
        if (isComplete) {
          completedSessions += 1
        }
        session.exercises.forEach((exercise) => {
          const progress = sessionProgress?.[exercise.exerciseId]
          if (progress) {
            if (!lastActiveAt || progress.lastUpdatedAt > lastActiveAt) {
              lastActiveAt = progress.lastUpdatedAt
            }
          }
        })
      })
    })

    const totalSessions = weeks.reduce((sum, week) => sum + week.sessions.length, 0)
    const completionPercent = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0

    return {
      userId: record.userId,
      username: record.username,
      completedSessions,
      totalSessions,
      completionPercent,
      lastActiveAt,
    }
  })
}

function buildRemoteRecords(rows: SessionProgressRow[], userLookup: Map<string, StoredUser>): Record<string, UserProgressRecord> {
  const result = new Map<string, UserProgressRecord>()

  rows.forEach((row) => {
    const userId = row.user_id as string
    const username = userLookup.get(userId)?.username ?? userId
    const record = result.get(userId) ?? { userId, username, weeks: {} }

    const weekProgress = record.weeks[row.week_index] ?? {}
    const sessionProgress = weekProgress[row.session_id] ?? {}

    sessionProgress[row.exercise_id] = {
      completedSets: row.completed_sets,
      totalSets: row.total_sets,
      setEntries: Array.isArray(row.set_entries) ? [...row.set_entries] : [],
      notes: row.notes ?? undefined,
      lastUpdatedAt: row.last_updated_at ?? new Date().toISOString(),
    }

    weekProgress[row.session_id] = sessionProgress
    record.weeks[row.week_index] = weekProgress
    result.set(userId, record)
  })

  return Object.fromEntries(result.entries())
}

function rowToSessionProgress(row: SessionProgressRow): SessionProgress {
  return {
    completedSets: row.completed_sets,
    totalSets: row.total_sets,
    setEntries: Array.isArray(row.set_entries) ? [...row.set_entries] : [],
    notes: row.notes ?? undefined,
    lastUpdatedAt: row.last_updated_at ?? new Date().toISOString(),
  }
}

function normaliseStoredRecords(
  raw: Record<string, UserProgressRecord>,
  usernameLookup: Map<string, StoredUser>,
): Record<string, UserProgressRecord> {
  const result: Record<string, UserProgressRecord> = {}

  Object.values(raw).forEach((record) => {
    const username = record.username
    const userFromLookup = usernameLookup.get(username)
    const userId = record.userId ?? userFromLookup?.id ?? username
    result[userId] = {
      userId,
      username,
      weeks: record.weeks ?? {},
    }
  })

  return result
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const supabaseEnv = getSupabaseEnvironment()
  const supabaseClient = useMemo(() => (supabaseEnv ? getSupabaseClient(supabaseEnv) : null), [supabaseEnv])
  const isRemote = Boolean(supabaseClient)

  const { users, isLoading: authLoading } = useAuthContext()
  const userLookupById = useMemo(() => new Map(users.map((entry) => [entry.id, entry])), [users])
  const userLookupByUsername = useMemo(() => new Map(users.map((entry) => [entry.username, entry])), [users])

  const { weeks } = usePlanContext()
  const [records, setRecords] = useState<Record<string, UserProgressRecord>>({})

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    async function load() {
      try {
        if (supabaseClient) {
          const { data, error } = await supabaseClient
            .from('session_progress')
            .select('user_id, week_index, session_id, exercise_id, completed_sets, total_sets, set_entries, notes, last_updated_at')

          if (error) throw error
          if (cancelled) return
          setRecords(buildRemoteRecords(data ?? [], userLookupById))
        } else {
          const stored = loadStoredProgress<Record<string, UserProgressRecord>>({})
          if (cancelled) return
          setRecords(normaliseStoredRecords(stored, userLookupByUsername))
        }
      } catch (error) {
        console.error('Failed to load progress records', error)
        if (!cancelled) {
          setRecords({})
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [authLoading, supabaseClient, userLookupById, userLookupByUsername])

  useEffect(() => {
    if (isRemote) return
    persistProgress(records)
  }, [records, isRemote])

  useEffect(() => {
    if (!supabaseClient) return

    const channel = supabaseClient
      .channel('session_progress_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_progress' }, (payload: RealtimePostgresChangesPayload<SessionProgressRow>) => {
        const newRow = payload.new ?? null
        const oldRow = payload.old ?? null

        setRecords((previous) => {
          if (payload.eventType === 'DELETE' && oldRow) {
            const prevRecord = previous[oldRow.user_id]
            if (!prevRecord) return previous

            const nextWeeks = { ...prevRecord.weeks }
            const weekProgress = cloneWeekProgress(nextWeeks[oldRow.week_index])
            const sessionProgress = cloneSessionProgress(weekProgress[oldRow.session_id])
            delete sessionProgress[oldRow.exercise_id]

            if (Object.keys(sessionProgress).length === 0) {
              delete weekProgress[oldRow.session_id]
            } else {
              weekProgress[oldRow.session_id] = sessionProgress
            }

            if (Object.keys(weekProgress).length === 0) {
              delete nextWeeks[oldRow.week_index]
            } else {
              nextWeeks[oldRow.week_index] = weekProgress
            }

            const nextRecord: UserProgressRecord = {
              ...prevRecord,
              weeks: nextWeeks,
            }

            const nextRecords = { ...previous }
            if (Object.keys(nextRecord.weeks).length === 0) {
              delete nextRecords[oldRow.user_id]
            } else {
              nextRecords[oldRow.user_id] = nextRecord
            }
            return nextRecords
          }

          if (!newRow) return previous

          const username = userLookupById.get(newRow.user_id)?.username ?? newRow.user_id
          const prevRecord = previous[newRow.user_id]
          const nextRecord = cloneOrCreateUserRecord(prevRecord, newRow.user_id, username)
          const nextWeeks = { ...nextRecord.weeks }
          const nextWeek = cloneWeekProgress(nextWeeks[newRow.week_index])
          const nextSession = cloneSessionProgress(nextWeek[newRow.session_id])

          nextSession[newRow.exercise_id] = rowToSessionProgress(newRow)
          nextWeek[newRow.session_id] = nextSession
          nextWeeks[newRow.week_index] = nextWeek

          return {
            ...previous,
            [newRow.user_id]: {
              ...nextRecord,
              weeks: nextWeeks,
            },
          }
        })
      })

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('session_progress realtime channel error')
      }
    })

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [supabaseClient, userLookupById])

  const value = useMemo<ProgressContextValue>(() => {
    async function saveToRemote(input: UpdateExerciseInput, progress: SessionProgress) {
      if (!supabaseClient) return
      const payload = {
        user_id: input.userId,
        week_index: input.weekIndex,
        session_id: input.sessionId,
        exercise_id: input.exercise.exerciseId,
        completed_sets: progress.completedSets,
        total_sets: progress.totalSets,
        set_entries: progress.setEntries,
        notes: progress.notes ?? null,
        last_updated_at: progress.lastUpdatedAt,
      }

      const { data, error } = await supabaseClient
        .from('session_progress')
        .upsert(payload, { onConflict: 'user_id,week_index,session_id,exercise_id' })
        .select('user_id, week_index, session_id, exercise_id, completed_sets, total_sets, set_entries, notes, last_updated_at')
        .single()

      if (error) throw error
      return data
    }

    async function saveSessionTemplate(userId: string, weekIndex: number, session: WeekSessionView) {
      if (!supabaseClient) return []
      const now = new Date().toISOString()
      const rows = session.exercises.map((exercise) => ({
        user_id: userId,
        week_index: weekIndex,
        session_id: session.sessionId,
        exercise_id: exercise.exerciseId,
        completed_sets: exercise.prescribedSets,
        total_sets: exercise.prescribedSets,
        set_entries: [...exercise.plannedSets],
        notes: exercise.comment ?? null,
        last_updated_at: now,
      }))

      const { data, error } = await supabaseClient
        .from('session_progress')
        .upsert(rows, { onConflict: 'user_id,week_index,session_id,exercise_id' })
        .select('user_id, week_index, session_id, exercise_id, completed_sets, total_sets, set_entries, notes, last_updated_at')

      if (error) throw error
      return data ?? []
    }

    return {
      records,
      isRemote,
      getUserProgress: (userId: string) => records[userId],
      getExerciseProgress: (userId: string, weekIndex: number, sessionId: string, exerciseId: string) => {
        const weekProgress = records[userId]?.weeks[weekIndex]
        return weekProgress?.[sessionId]?.[exerciseId]
      },
      updateExerciseProgress: async (input: UpdateExerciseInput) => {
        const username = userLookupById.get(input.userId)?.username ?? input.userId
        const nextProgress = toSessionProgress(input)

        if (supabaseClient) {
          try {
            const updatedRow = await saveToRemote(input, nextProgress)
            if (updatedRow) {
              setRecords((previous) => {
                const prevRecord = previous[input.userId]
                const nextRecord = cloneOrCreateUserRecord(prevRecord, input.userId, username)
                const nextWeek = cloneWeekProgress(nextRecord.weeks[input.weekIndex])
                const nextSession = cloneSessionProgress(nextWeek[input.sessionId])

                nextSession[input.exercise.exerciseId] = {
                  completedSets: updatedRow.completed_sets,
                  totalSets: updatedRow.total_sets,
                  setEntries: Array.isArray(updatedRow.set_entries) ? [...updatedRow.set_entries] : [],
                  notes: updatedRow.notes ?? undefined,
                  lastUpdatedAt: updatedRow.last_updated_at ?? new Date().toISOString(),
                }

                nextWeek[input.sessionId] = nextSession
                nextRecord.weeks[input.weekIndex] = nextWeek

                return {
                  ...previous,
                  [input.userId]: nextRecord,
                }
              })
            }
          } catch (error) {
            console.error('Failed to persist progress to Supabase', error)
            throw error
          }
        } else {
          setRecords((previous) => {
            const prevRecord = previous[input.userId]
            const nextRecord = cloneOrCreateUserRecord(prevRecord, input.userId, username)
            const nextWeek = cloneWeekProgress(nextRecord.weeks[input.weekIndex])
            const nextSession = cloneSessionProgress(nextWeek[input.sessionId])

            nextSession[input.exercise.exerciseId] = nextProgress
            nextWeek[input.sessionId] = nextSession
            nextRecord.weeks[input.weekIndex] = nextWeek

            return {
              ...previous,
              [input.userId]: nextRecord,
            }
          })
        }
      },
      markExerciseUsingPlan: async (userId: string, weekIndex: number, session: WeekSessionView) => {
        const username = userLookupById.get(userId)?.username ?? userId

        if (supabaseClient) {
          try {
            const rows = await saveSessionTemplate(userId, weekIndex, session)
            setRecords((previous) => {
              const prevRecord = previous[userId]
              const nextRecord = cloneOrCreateUserRecord(prevRecord, userId, username)
              const nextWeek = cloneWeekProgress(nextRecord.weeks[weekIndex])
              const nextSession = cloneSessionProgress(nextWeek[session.sessionId])

              rows.forEach((row) => {
                nextSession[row.exercise_id] = rowToSessionProgress(row)
              })

              nextWeek[session.sessionId] = nextSession
              nextRecord.weeks[weekIndex] = nextWeek

              return {
                ...previous,
                [userId]: nextRecord,
              }
            })
          } catch (error) {
            console.error('Failed to apply coach plan to Supabase', error)
            throw error
          }
        } else {
          setRecords((previous) => {
            const prevRecord = previous[userId]
            const nextRecord = cloneOrCreateUserRecord(prevRecord, userId, username)
            const nextWeek = cloneWeekProgress(nextRecord.weeks[weekIndex])
            const nextSession = cloneSessionProgress(nextWeek[session.sessionId])

            session.exercises.forEach((exercise) => {
              const progress: SessionProgress = {
                completedSets: exercise.prescribedSets,
                totalSets: exercise.prescribedSets,
                setEntries: [...exercise.plannedSets],
                notes: exercise.comment,
                lastUpdatedAt: new Date().toISOString(),
              }
              nextSession[exercise.exerciseId] = progress
            })

            nextWeek[session.sessionId] = nextSession
            nextRecord.weeks[weekIndex] = nextWeek

            return {
              ...previous,
              [userId]: nextRecord,
            }
          })
        }
      },
      summaries: collectSummaries(records, weeks),
    }
  }, [
    isRemote,
    records,
    supabaseClient,
    userLookupById,
    weeks,
  ])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgressContext(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) {
    throw new Error('useProgressContext must be used within ProgressProvider')
  }
  return ctx
}
