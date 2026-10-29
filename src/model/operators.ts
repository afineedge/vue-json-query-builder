import type { Arity, FieldDef, FieldType, Operator } from './types'

const COMPARISON: Operator[] = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'between']

export const DEFAULT_OPERATORS: Readonly<Record<FieldType, readonly Operator[]>> = {
  text: ['eq', 'neq', 'contains', 'not_contains', 'starts_with', 'ends_with', 'not_starts_with', 'not_ends_with'],
  number: COMPARISON,
  date: COMPARISON,
  time: COMPARISON,
  select: ['eq', 'neq', 'in', 'not_in'],
}

export const MULTI_VALUED_SELECT_OPERATORS: readonly Operator[] = ['any_of', 'all_of', 'none_of']

export const DEFAULT_OPERATOR_LABELS: Readonly<Record<Operator, string>> = {
  eq: 'is',
  neq: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  not_starts_with: 'does not start with',
  not_ends_with: 'does not end with',
  gt: 'is greater than',
  lt: 'is less than',
  gte: 'is at least',
  lte: 'is at most',
  between: 'is between',
  in: 'is any of',
  not_in: 'is none of',
  any_of: 'has any of',
  all_of: 'has all of',
  none_of: 'has none of',
}

/**
 * Wording that reads better than the defaults for some field types: dates and times are
 * "after" and "before", not "greater than" and "less than".
 */
export const TYPE_OPERATOR_LABELS: Readonly<Partial<Record<FieldType, Partial<Record<Operator, string>>>>> = {
  date: { gt: 'is after', lt: 'is before', gte: 'is on or after', lte: 'is on or before' },
  time: { gt: 'is after', lt: 'is before', gte: 'is at or after', lte: 'is at or before' },
}

/**
 * The label for an operator: the field's own `operatorLabels` first, then `overrides` (the
 * builder's `operatorLabels` prop), then the field type's wording, then the default.
 */
export function operatorLabel(
  operator: Operator,
  field?: FieldDef,
  overrides?: Partial<Record<Operator, string>>,
): string {
  return (
    field?.operatorLabels?.[operator] ??
    overrides?.[operator] ??
    (field && TYPE_OPERATOR_LABELS[field.type]?.[operator]) ??
    DEFAULT_OPERATOR_LABELS[operator] ??
    operator
  )
}

/** Operators whose value is an array (fix 12: an explicit set, not `operator.includes('in')`). */
export const MULTI_VALUE_OPERATORS: ReadonlySet<Operator> = new Set<Operator>(['in', 'not_in', 'any_of', 'all_of', 'none_of'])

const ALL_OPERATORS = new Set(Object.keys(DEFAULT_OPERATOR_LABELS))

export function isOperator(value: unknown): value is Operator {
  return typeof value === 'string' && ALL_OPERATORS.has(value)
}

export function operatorArity(operator: Operator): Arity {
  if (operator === 'between') return 'pair'
  return MULTI_VALUE_OPERATORS.has(operator) ? 'array' : 'single'
}

/** The operators a field offers, in order. The first is the default for a new rule. */
export function operatorsFor(field: FieldDef): readonly Operator[] {
  if (field.operators?.length) return field.operators
  if (field.type === 'select' && field.multiValued) return MULTI_VALUED_SELECT_OPERATORS
  return DEFAULT_OPERATORS[field.type]
}
