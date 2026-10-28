import { isOperator, operatorArity, operatorsFor } from './operators'
import { isGroup } from './tree'
import type { Arity, FieldDef, FieldType, Operator, QueryGroup, QueryNode, QueryRule } from './types'

/** The blank value for an operator's arity: `null`, `[null, null]` or `[]`. */
export function emptyValue(arity: Arity): unknown {
  if (arity === 'pair') return [null, null]
  if (arity === 'array') return []
  return null
}

function isPresent(value: unknown, type: FieldType): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  // Number fields emit numbers (fix 10), so a numeric string there is not a value.
  if (type === 'number') return false
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Whether the rule has every value its operator needs: one value, both ends of a
 * `between`, or a non-empty array. Number values must be finite numbers. A rule with no
 * field definition is never complete.
 */
export function isRuleComplete(rule: QueryRule, field: FieldDef | undefined): boolean {
  if (!field || !isOperator(rule.operator)) return false
  const { value } = rule
  switch (operatorArity(rule.operator)) {
    case 'single':
      return isPresent(value, field.type)
    case 'pair':
      return Array.isArray(value) && value.length === 2 && value.every((v) => isPresent(v, field.type))
    case 'array':
      return Array.isArray(value) && value.length > 0 && value.every((v) => isPresent(v, field.type))
  }
}

/** A complete `between` whose min is greater than its max (or From after To). */
export function isBetweenReversed(rule: QueryRule, field: FieldDef | undefined): boolean {
  if (rule.operator !== 'between' || !isRuleComplete(rule, field)) return false
  const [min, max] = rule.value as [string | number, string | number]
  // ISO dates (YYYY-MM-DD) and 24-hour times (HH:MM) order correctly as strings.
  return min > max
}

/** Complete, using an operator the field offers, and with a `between` in order. */
export function isRuleValid(rule: QueryRule, field: FieldDef | undefined): boolean {
  return (
    isRuleComplete(rule, field) &&
    operatorsFor(field!).includes(rule.operator) &&
    !isBetweenReversed(rule, field)
  )
}

function findField(fields: readonly FieldDef[], name: string): FieldDef | undefined {
  return fields.find((f) => f.field === name)
}

/** Every rule valid, every field known, and no empty group (fix 13). */
export function isQueryValid(tree: QueryGroup, fields: readonly FieldDef[]): boolean {
  const valid = (node: QueryNode): boolean =>
    isGroup(node)
      ? (node.condition === 'and' || node.condition === 'or') && node.rules.length > 0 && node.rules.every(valid)
      : isRuleValid(node, findField(fields, node.field))
  return valid(tree)
}

/**
 * The tree with incomplete or invalid rules removed, then any groups left empty.
 * Returns `null` when nothing is left.
 */
export function pruneIncomplete(tree: QueryGroup, fields: readonly FieldDef[]): QueryGroup | null {
  const prune = (node: QueryNode): QueryNode | null => {
    if (!isGroup(node)) return isRuleValid(node, findField(fields, node.field)) ? node : null
    const rules = node.rules.map(prune).filter((n): n is QueryNode => n !== null)
    return rules.length ? { condition: node.condition, rules } : null
  }
  return prune(tree) as QueryGroup | null
}

/** A blank rule for a field: its default operator and an empty value. */
export function ruleFor(field: FieldDef): QueryRule {
  const operator = operatorsFor(field)[0]!
  return { field: field.field, operator, value: emptyValue(operatorArity(operator)) }
}

/** An AND group holding one blank rule for the first field, or no rules when there are no fields. */
export function createGroup(fields: readonly FieldDef[]): QueryGroup {
  const first = fields[0]
  return { condition: 'and', rules: first ? [ruleFor(first)] : [] }
}

/** Switches the operator, resetting the value only when the arity changes. */
export function changeOperator(rule: QueryRule, operator: Operator): QueryRule {
  const keep = isOperator(rule.operator) && operatorArity(rule.operator) === operatorArity(operator)
  return { ...rule, operator, value: keep ? rule.value : emptyValue(operatorArity(operator)) }
}

/** Switches the field, resetting the operator to the field's first and the value to empty. */
export function changeField(rule: QueryRule, field: FieldDef): QueryRule {
  return { ...rule, ...ruleFor(field) }
}
