const USERS_KEY = 'workout-app/users'
const PROGRESS_KEY = 'workout-app/progress'
const INTAKE_KEY = 'workout-app/intake-records'

const memoryStore = new Map<string, string>()

type StorageKey = typeof USERS_KEY | typeof PROGRESS_KEY | typeof INTAKE_KEY

type StorageAdapter = {
  getItem: (key: StorageKey) => string | null
  setItem: (key: StorageKey, value: string) => void
  removeItem: (key: StorageKey) => void
}

function resolveAdapter(): StorageAdapter {
  if (typeof window !== 'undefined' && window.localStorage) {
    return {
      getItem: (key) => window.localStorage.getItem(key) ?? null,
      setItem: (key, value) => {
        window.localStorage.setItem(key, value)
      },
      removeItem: (key) => {
        window.localStorage.removeItem(key)
      },
    }
  }

  return {
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, value) => {
      memoryStore.set(key, value)
    },
    removeItem: (key) => {
      memoryStore.delete(key)
    },
  }
}

function readJson<T>(key: StorageKey, fallback: T): T {
  const adapter = resolveAdapter()
  try {
    const raw = adapter.getItem(key)
    if (!raw) {
      return fallback
    }
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn(`Failed to parse storage key ${key}:`, error)
    return fallback
  }
}

function writeJson<T>(key: StorageKey, value: T): void {
  const adapter = resolveAdapter()
  try {
    adapter.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Failed to persist storage key ${key}:`, error)
  }
}

export function loadStoredUsers<T>(fallback: T): T {
  return readJson(USERS_KEY, fallback)
}

export function persistUsers<T>(value: T): void {
  writeJson(USERS_KEY, value)
}

export function loadStoredProgress<T>(fallback: T): T {
  return readJson(PROGRESS_KEY, fallback)
}

export function persistProgress<T>(value: T): void {
  writeJson(PROGRESS_KEY, value)
}

export function loadStoredIntakeRecords<T>(fallback: T): T {
  return readJson(INTAKE_KEY, fallback)
}

export function persistIntakeRecords<T>(value: T): void {
  writeJson(INTAKE_KEY, value)
}

export function clearAllStorage(): void {
  const adapter = resolveAdapter()
  adapter.removeItem(USERS_KEY)
  adapter.removeItem(PROGRESS_KEY)
  adapter.removeItem(INTAKE_KEY)
}
