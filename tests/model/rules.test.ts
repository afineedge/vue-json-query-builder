import { describe, expect, it } from 'vitest'
import type { QueryGroup, QueryRule } from '../../src/model'
import {
  changeField,
  changeOperator,
  createGroup,
  isBetweenReversed,
  isQueryValid,
  isRuleComplete,
  isRuleValid,
  isIsoDate,
  isTime,
  pruneIncomplete,
  queryHasErrors,
  ruleFor,
  ruleProblem,
} from '../../src/model'
import { field, fields } from './fixtures'

const r = (f: string, operator: QueryRule['operator'], value: unknown): QueryRule => ({ field: f, operator, value })

describe('isRuleComplete', () => {
  it('needs one present value for single operators', () => {
    expect(isRuleComplete(r('name', 'eq', 'Bob'), field('name'))).toBe(true)
    expect(isRuleComplete(r('name', 'eq', ''), field('name'))).toBe(false)
    expect(isRuleComplete(r('name', 'eq', '   '), field('name'))).toBe(false)
    expect(isRuleComplete(r('name', 'eq', null), field('name'))).toBe(false)
  })

  it('needs both ends of a between', () => {
    expect(isRuleComplete(r('price', 'between', [1, 2]), field('price'))).toBe(true)
    expect(isRuleComplete(r('price', 'between', [1, null]), field('price'))).toBe(false)
    expect(isRuleComplete(r('price', 'between', [1]), field('price'))).toBe(false)
    expect(isRuleComplete(r('price', 'between', 1), field('price'))).toBe(false)
  })

  it('needs a non-empty array for multi-value operators', () => {
    expect(isRuleComplete(r('state', 'in', ['MD']), field('state'))).toBe(true)
    expect(isRuleComplete(r('state', 'in', []), field('state'))).toBe(false)
    expect(isRuleComplete(r('state', 'in', 'MD'), field('state'))).toBe(false)
    expect(isRuleComplete(r('tags', 'all_of', ['new', '']), field('tags'))).toBe(false)
  })

  it('needs finite numbers on number fields', () => {
    expect(isRuleComplete(r('price', 'eq', 0), field('price'))).toBe(true)
    expect(isRuleComplete(r('price', 'eq', Number.NaN), field('price'))).toBe(false)
    expect(isRuleComplete(r('price', 'eq', Infinity), field('price'))).toBe(false)
    expect(isRuleComplete(r('price', 'eq', '5'), field('price'))).toBe(false)
  })

  it('is false without a field definition or with an unknown operator', () => {
    expect(isRuleComplete(r('nope', 'eq', 'x'), undefined)).toBe(false)
    expect(isRuleComplete({ field: 'name', operator: '=' as never, value: 'x' }, field('name'))).toBe(false)
  })
})

describe('isRuleValid and isBetweenReversed', () => {
  it('flags a reversed between on numbers, dates and times', () => {
    expect(isBetweenReversed(r('price', 'between', [5, 1]), field('price'))).toBe(true)
    expect(isBetweenReversed(r('date', 'between', ['2026-02-01', '2026-01-01']), field('date'))).toBe(true)
    expect(isBetweenReversed(r('time', 'between', ['09:00', '17:00']), field('time'))).toBe(false)
    expect(isRuleValid(r('price', 'between', [5, 1]), field('price'))).toBe(false)
    expect(isRuleValid(r('price', 'between', [1, 1]), field('price'))).toBe(true)
  })

  it('does not call a half-filled between reversed', () => {
    expect(isBetweenReversed(r('price', 'between', [5, null]), field('price'))).toBe(false)
  })

  it('rejects an operator the field does not offer', () => {
    expect(isRuleValid(r('name', 'gt', 'a'), field('name'))).toBe(false)
    expect(isRuleValid(r('tags', 'in', ['new']), field('tags'))).toBe(false)
  })
})

describe('isQueryValid', () => {
  const good: QueryGroup = {
    condition: 'or',
    rules: [r('name', 'contains', 'a'), { condition: 'and', rules: [r('price', 'gte', 10)] }],
  }

  it('accepts a tree of valid rules', () => {
    expect(isQueryValid(good, fields)).toBe(true)
  })

  it('rejects an unknown field', () => {
    expect(isQueryValid({ condition: 'and', rules: [r('ghost', 'eq', 'x')] }, fields)).toBe(false)
  })

  it('rejects an unknown condition', () => {
    expect(isQueryValid({ ...good, condition: 'xor' as never }, fields)).toBe(false)
  })

  it('fix 13: an empty group is invalid, at the root or nested', () => {
    expect(isQueryValid({ condition: 'and', rules: [] }, fields)).toBe(false)
    expect(isQueryValid({ condition: 'and', rules: [r('name', 'eq', 'a'), { condition: 'or', rules: [] }] }, fields)).toBe(false)
  })
})

describe('pruneIncomplete', () => {
  it('returns a tree of only the valid rules', () => {
    const tree: QueryGroup = {
      condition: 'and',
      rules: [
        r('name', 'eq', 'Bob'),
        r('name', 'eq', ''),
        { condition: 'or', rules: [r('price', 'between', [9, 1]), r('price', 'gt', 3)] },
      ],
    }
    expect(pruneIncomplete(tree, fields)).toEqual({
      condition: 'and',
      rules: [r('name', 'eq', 'Bob'), { condition: 'or', rules: [r('price', 'gt', 3)] }],
    })
  })

  it('drops groups left empty, all the way up', () => {
    const tree: QueryGroup = {
      condition: 'and',
      rules: [r('name', 'eq', 'a'), { condition: 'or', rules: [{ condition: 'and', rules: [r('price', 'eq', null)] }] }],
    }
    expect(pruneIncomplete(tree, fields)).toEqual({ condition: 'and', rules: [r('name', 'eq', 'a')] })
  })

  it('returns null when nothing is left', () => {
    expect(pruneIncomplete(createGroup(fields), fields)).toBeNull()
    expect(pruneIncomplete({ condition: 'and', rules: [] }, fields)).toBeNull()
    expect(pruneIncomplete({ condition: 'and', rules: [r('ghost', 'eq', 'x')] }, fields)).toBeNull()
  })

  it('does not modify its input', () => {
    const tree: QueryGroup = { condition: 'and', rules: [r('name', 'eq', ''), r('name', 'eq', 'a')] }
    const before = JSON.stringify(tree)
    pruneIncomplete(tree, fields)
    expect(JSON.stringify(tree)).toBe(before)
  })
})

describe('new rules and groups', () => {
  it('builds a blank rule from the field default operator', () => {
    expect(ruleFor(field('name'))).toEqual(r('name', 'eq', null))
    expect(ruleFor(field('tags'))).toEqual(r('tags', 'any_of', []))
    expect(ruleFor({ ...field('price'), operators: ['between'] })).toEqual(r('price', 'between', [null, null]))
  })

  it('builds an AND group with one blank rule for the first field', () => {
    expect(createGroup(fields)).toEqual({ condition: 'and', rules: [r('name', 'eq', null)] })
  })

  it('fix 9: builds an empty group instead of crashing when there are no fields', () => {
    expect(() => createGroup([])).not.toThrow()
    expect(createGroup([])).toEqual({ condition: 'and', rules: [] })
  })
})

describe('changeOperator', () => {
  it('keeps the value when the arity stays the same', () => {
    expect(changeOperator(r('price', 'gt', 5), 'lte')).toEqual(r('price', 'lte', 5))
    expect(changeOperator(r('state', 'in', ['MD']), 'not_in')).toEqual(r('state', 'not_in', ['MD']))
  })

  it('resets the value when the arity changes', () => {
    expect(changeOperator(r('price', 'gt', 5), 'between')).toEqual(r('price', 'between', [null, null]))
    expect(changeOperator(r('state', 'eq', 'MD'), 'in')).toEqual(r('state', 'in', []))
    expect(changeOperator(r('price', 'between', [1, 2]), 'eq')).toEqual(r('price', 'eq', null))
  })
})

describe('changeField', () => {
  it('resets the operator to the new field first and the value to empty', () => {
    expect(changeField(r('name', 'contains', 'abc'), field('tags'))).toEqual(r('tags', 'any_of', []))
    expect(changeField(r('state', 'in', ['MD']), field('price'))).toEqual(r('price', 'eq', null))
  })
})

describe('ruleProblem', () => {
  const tree = (...rules: QueryGroup['rules']): QueryGroup => ({ condition: 'and', rules })

  it('names what the user has to fix, and nothing for a half-filled rule', () => {
    expect(ruleProblem(r('ghost', 'eq', 'x'), undefined)).toBe('field')
    expect(ruleProblem(r('price', 'contains', 5), field('price'))).toBe('operator')
    expect(ruleProblem(r('state', 'eq', 'TX'), field('state'))).toBe('value')
    expect(ruleProblem(r('tags', 'any_of', ['new', 'gone']), field('tags'))).toBe('value')
    expect(ruleProblem(r('price', 'between', [9, 1]), field('price'))).toBe('range')
    expect(ruleProblem(r('price', 'between', [9, null]), field('price'))).toBeNull()
    expect(ruleProblem(r('state', 'eq', null), field('state'))).toBeNull()
  })

  it('skips the options check for a select field without options', () => {
    expect(isRuleValid(r('remote', 'eq', 'anything'), { field: 'remote', label: 'Remote', type: 'select' })).toBe(true)
  })

  it('makes a rule with an unknown select value invalid and pruned', () => {
    expect(isRuleValid(r('state', 'eq', 'TX'), field('state'))).toBe(false)
    expect(pruneIncomplete(tree(r('state', 'eq', 'TX'), r('state', 'eq', 'MD')), fields)).toEqual(tree(r('state', 'eq', 'MD')))
  })

  it('queryHasErrors ignores blanks and finds nested problems', () => {
    expect(queryHasErrors(tree(r('name', 'eq', null), tree(r('price', 'gt', null))), fields)).toBe(false)
    expect(queryHasErrors(tree(r('name', 'eq', 'a'), tree(r('price', 'between', [5, 1]))), fields)).toBe(true)
  })
})

describe('date and time values', () => {
  it('counts only real YYYY-MM-DD dates as present', () => {
    const date = field('date')
    expect(isRuleComplete(r('date', 'eq', '2026-02-28'), date)).toBe(true)
    expect(isRuleComplete(r('date', 'eq', '2024-02-29'), date)).toBe(true)
    for (const bad of ['x', 5, '2026-02-30', '2023-02-29', '2026-13-01', '2026-00-10', '2026-1-5', '20260105', ' 2026-01-05']) {
      expect(isRuleComplete(r('date', 'eq', bad), date), String(bad)).toBe(false)
    }
    expect(isRuleComplete(r('date', 'between', ['2026-01-01', '2026-02-30']), date)).toBe(false)
  })

  it('counts only HH:MM or HH:MM:SS times as present', () => {
    const time = field('time')
    expect(isRuleComplete(r('time', 'eq', '09:00'), time)).toBe(true)
    expect(isRuleComplete(r('time', 'eq', '23:59:59'), time)).toBe(true)
    for (const bad of ['x', 900, '9:00', '24:00', '12:60', '09:00:60']) {
      expect(isRuleComplete(r('time', 'eq', bad), time), String(bad)).toBe(false)
    }
  })

  it('prunes a malformed date instead of treating it as an error', () => {
    const tree: QueryGroup = { condition: 'and', rules: [r('date', 'gte', 'x'), r('name', 'eq', 'a')] }
    expect(ruleProblem(r('date', 'gte', 'x'), field('date'))).toBeNull()
    expect(pruneIncomplete(tree, fields)).toEqual({ condition: 'and', rules: [r('name', 'eq', 'a')] })
  })

  it('exports the checks', () => {
    expect(isIsoDate('2026-10-29')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isTime('07:30')).toBe(true)
    expect(isTime('7:30')).toBe(false)
  })
})
