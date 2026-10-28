import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OPERATOR_LABELS,
  DEFAULT_OPERATORS,
  MULTI_VALUE_OPERATORS,
  isOperator,
  operatorArity,
  operatorLabel,
  operatorsFor,
} from '../../src/model'
import { field } from './fixtures'

describe('operators', () => {
  it('labels every operator', () => {
    const all = new Set(Object.values(DEFAULT_OPERATORS).flat())
    for (const op of [...all, ...MULTI_VALUE_OPERATORS]) expect(DEFAULT_OPERATOR_LABELS[op]).toBeTruthy()
  })

  it('gives each type its defaults, first entry first', () => {
    expect(operatorsFor(field('name'))[0]).toBe('eq')
    expect(operatorsFor(field('price'))).toContain('between')
    expect(operatorsFor(field('state'))).toEqual(['eq', 'neq', 'in', 'not_in'])
  })

  it('switches a multiValued select to any_of/all_of/none_of', () => {
    expect(operatorsFor(field('tags'))).toEqual(['any_of', 'all_of', 'none_of'])
  })

  it('lets a field override its operators', () => {
    expect(operatorsFor({ ...field('price'), operators: ['between', 'gte'] })).toEqual(['between', 'gte'])
  })

  it('knows each operator arity', () => {
    expect(operatorArity('eq')).toBe('single')
    expect(operatorArity('between')).toBe('pair')
    expect(operatorArity('none_of')).toBe('array')
  })

  it('recognizes operator names only', () => {
    expect(isOperator('eq')).toBe(true)
    expect(isOperator('=')).toBe(false)
    expect(isOperator(undefined)).toBe(false)
  })

  it('fix 12: detects multi-value operators from an explicit set, not includes("in")', () => {
    // 'contains' and 'not_contains' include the letters "in" but take one value.
    expect(MULTI_VALUE_OPERATORS.has('contains')).toBe(false)
    expect(MULTI_VALUE_OPERATORS.has('not_contains')).toBe(false)
    expect(operatorArity('contains')).toBe('single')
    expect([...MULTI_VALUE_OPERATORS].sort()).toEqual(['all_of', 'any_of', 'in', 'none_of', 'not_in'])
  })
})

describe('operatorLabel', () => {
  it('prefers overrides, then the field type wording, then the default', () => {
    const date = { field: 'd', label: 'D', type: 'date' as const }
    expect(operatorLabel('gt', date)).toBe('is after')
    expect(operatorLabel('gt', { ...date, type: 'number' })).toBe('is greater than')
    expect(operatorLabel('gt', date, { gt: 'later than' })).toBe('later than')
    expect(operatorLabel('eq', date)).toBe('is')
    expect(operatorLabel('lte')).toBe('is at most')
  })
})
