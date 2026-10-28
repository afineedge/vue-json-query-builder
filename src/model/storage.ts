import type { QueryGroup, SavedQuery, StorageAdapter } from './types'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    // Missing storage (private mode, SSR) or corrupt JSON reads as empty.
    return fallback
  }
}

/** A {@link StorageAdapter} with every method, all returning synchronously. */
export interface LocalStorageAdapter extends StorageAdapter {
  load(): QueryGroup | null
  persist(query: QueryGroup): void
  save(query: QueryGroup, name: string): SavedQuery
  list(): SavedQuery[]
  remove(id: string): void
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * A {@link StorageAdapter} backed by `localStorage`, keyed
 * `vue-json-query-builder:<namespace>:current` and `...:saved`.
 * Throws on an empty namespace (fix 5).
 */
export function localStorageAdapter(namespace: string): LocalStorageAdapter {
  if (!namespace.trim()) throw new TypeError('localStorageAdapter needs a non-empty namespace')
  const currentKey = `vue-json-query-builder:${namespace}:current`
  const savedKey = `vue-json-query-builder:${namespace}:saved`
  const list = (): SavedQuery[] => {
    const saved = read<unknown>(savedKey, [])
    return Array.isArray(saved) ? (saved as SavedQuery[]) : []
  }

  return {
    load: () => read<QueryGroup | null>(currentKey, null),
    persist(query) {
      localStorage.setItem(currentKey, JSON.stringify(query))
    },
    save(query, name) {
      const entry: SavedQuery = { id: newId(), name, query, savedAt: new Date().toISOString() }
      localStorage.setItem(savedKey, JSON.stringify([...list(), entry]))
      return entry
    },
    list,
    remove(id) {
      // Delete by id, never by position (fix 6).
      localStorage.setItem(savedKey, JSON.stringify(list().filter((q) => q.id !== id)))
    },
  }
}
