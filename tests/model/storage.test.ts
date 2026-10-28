import { beforeEach, describe, expect, it } from 'vitest'
import type { QueryGroup } from '../../src/model'
import { localStorageAdapter } from '../../src/model'

const query = (value: string): QueryGroup => ({ condition: 'and', rules: [{ field: 'name', operator: 'eq', value }] })

beforeEach(() => localStorage.clear())

describe('localStorageAdapter', () => {
  it('loads null before anything is saved', () => {
    const storage = localStorageAdapter('test')
    expect(storage.load()).toBeNull()
    expect(storage.list()).toEqual([])
  })

  it('round-trips the current tree under the namespaced key', () => {
    const storage = localStorageAdapter('test')
    storage.persist(query('a'))
    expect(storage.load()).toEqual(query('a'))
    expect(localStorage.getItem('vue-json-query-builder:test:current')).toBe(JSON.stringify(query('a')))
  })

  it('adds named saves to the saved list', () => {
    const storage = localStorageAdapter('test')
    const entry = storage.save(query('a'), 'First')
    expect(entry).toMatchObject({ name: 'First', query: query('a') })
    expect(typeof entry.id).toBe('string')
    expect(Number.isNaN(Date.parse(entry.savedAt))).toBe(false)
    expect(storage.list()).toEqual([entry])
    expect(storage.load()).toBeNull()
  })

  it('keeps namespaces apart', () => {
    localStorageAdapter('one').persist(query('a'))
    expect(localStorageAdapter('two').load()).toBeNull()
  })

  it('reads corrupt JSON as empty', () => {
    localStorage.setItem('vue-json-query-builder:test:current', '{not json')
    localStorage.setItem('vue-json-query-builder:test:saved', '{"not":"an array"}')
    const storage = localStorageAdapter('test')
    expect(storage.load()).toBeNull()
    expect(storage.list()).toEqual([])
  })

  it('fix 5: throws on an empty namespace instead of writing under a bare prefix', () => {
    expect(() => localStorageAdapter('')).toThrow(TypeError)
    expect(() => localStorageAdapter('   ')).toThrow(TypeError)
    expect(localStorage.length).toBe(0)
  })

  it('fix 6: removing a saved query deletes that query, not the last one', () => {
    const storage = localStorageAdapter('test')
    const a = storage.save(query('a'), 'A')
    const b = storage.save(query('b'), 'B')
    const c = storage.save(query('c'), 'C')
    storage.remove(a.id)
    expect(storage.list().map((q) => q.id)).toEqual([b.id, c.id])
    // A copy of the entry (as a component would hold after a reload) still removes the right one.
    storage.remove({ ...c }.id)
    expect(storage.list().map((q) => q.name)).toEqual(['B'])
  })
})
