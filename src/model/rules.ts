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

/**
 * Something on screen the user has to fix, as opposed to a rule that is just unfinished:
 * - `field`: the field isn't in `fields`
 * - `operator`: the field doesn't offer this operator
 * - `value`: a select value that isn't one of the field's `options`
 * - `range`: a `between` whose min is above its max (or From after To)
 */
export type RuleProblem = 'field' | 'operator' | 'value' | 'range'

/** Values of a select rule that aren't in the field's options. Blank values aren't counted. */
export function unknownValues(rule: QueryRule, field: FieldDef | undefined): unknown[] {
  if (field?.type !== 'select' || !field.options) return []
  const known = new Set<unknown>(field.options.map((o) => o.value))
  const values = Array.isArray(rule.value) ? rule.value : [rule.value]
  return values.filter((v) => v !== null && v !== undefined && v !== '' && !known.has(v))
}

/** The problem the user has to fix in this rule, or `null`. Half-filled rules have none. */
export function ruleProblem(rule: QueryRule, field: FieldDef | undefined): RuleProblem | null {
  if (!field) return 'field'
  if (!isOperator(rule.operator) || !operatorsFor(field).includes(rule.operator)) return 'operator'
  if (unknownValues(rule, field).length) return 'value'
  if (isBetweenReversed(rule, field)) return 'range'
  return null
}

/** Complete and with no {@link RuleProblem}. */
export function isRuleValid(rule: QueryRule, field: FieldDef | undefined): boolean {
  return isRuleComplete(rule, field) && ruleProblem(rule, field) === null
}

function findField(fields: readonly FieldDef[], name: string): FieldDef | undefined {
  return fields.find((f) => f.field === name)
}

/** Whether any rule has a {@link RuleProblem}, so the user has an error to fix (blank rules don't count). */
export function queryHasErrors(tree: QueryGroup, fields: readonly FieldDef[]): boolean {
  const check = (node: QueryNode): boolean =>
    isGroup(node) ? node.rules.some(check) : ruleProblem(node, findField(fields, node.field)) !== null
  return check(tree)
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
