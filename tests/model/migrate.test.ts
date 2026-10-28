import { describe, expect, it } from 'vitest'
import { migrateV0Query } from '../../src/model'
import { v0DemoQuery } from './fixtures'

describe('migrateV0Query', () => {
  it('converts the 0.1.x demo query', () => {
    expect(migrateV0Query(v0DemoQuery)).toEqual({
      condition: 'and',
      rules: [
        { field: 'state', operator: 'eq', value: 'MD' },
        {
          condition: 'and',
          rules: [
            { field: 'owner', operator: 'neq', value: 0 },
            { field: 'price', operator: 'lte', value: 80000 },
          ],
        },
      ],
    })
  })

  it('maps every 0.1.x operator', () => {
    const pairs: [string, string][] = [
      ['=', 'eq'], ['!=', 'neq'], ['()', 'contains'], ['!()', 'not_contains'],
      ['(', 'starts_with'], [')', 'ends_with'], ['!(', 'not_starts_with'], ['!)', 'not_ends_with'],
      ['>', 'gt'], ['<', 'lt'], ['>=', 'gte'], ['<=', 'lte'], ['in', 'in'], ['not in', 'not_in'],
    ]
    for (const [from, to] of pairs) {
      const migrated = migrateV0Query({ condition: 'and', rules: [{ id: 'f', operator: from, value: 1 }] })
      expect(migrated.rules[0]).toEqual({ field: 'f', operator: to, value: 1 })
    }
  })

  it('lowercases the condition', () => {
    expect(migrateV0Query({ condition: 'OR', rules: [] }).condition).toBe('or')
  })

  it('throws on an unknown operator', () => {
    expect(() => migrateV0Query({ condition: 'and', rules: [{ id: 'f', operator: '~', value: 1 }] })).toThrow(/Unknown 0.1.x operator "~"/)
  })

  it('throws on malformed input', () => {
    expect(() => migrateV0Query(null)).toThrow(TypeError)
    expect(() => migrateV0Query({ id: 'f', operator: '=', value: 1 })).toThrow(/group at the root/)
    expect(() => migrateV0Query({ condition: 'and', rules: [{ operator: '=', value: 1 }] })).toThrow(/no "id"/)
    expect(() => migrateV0Query({ condition: 'nand', rules: [] })).toThrow(/Unknown condition/)
  })
})
