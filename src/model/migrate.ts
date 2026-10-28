import type { Condition, Operator, QueryGroup, QueryNode } from './types'

const V0_OPERATORS: Readonly<Record<string, Operator>> = {
  '=': 'eq',
  '!=': 'neq',
  '()': 'contains',
  '!()': 'not_contains',
  '(': 'starts_with',
  ')': 'ends_with',
  '!(': 'not_starts_with',
  '!)': 'not_ends_with',
  '>': 'gt',
  '<': 'lt',
  '>=': 'gte',
  '<=': 'lte',
  in: 'in',
  'not in': 'not_in',
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Converts a 0.1.x tree to the v1 format: `id` becomes `field` and symbol operators
 * become names. Throws on an unknown operator or a malformed node.
 */
export function migrateV0Query(v0: unknown): QueryGroup {
  const node = migrateNode(v0, 'root')
  if (!('rules' in node)) throw new TypeError('A 0.1.x query must have a group at the root')
  return node
}

function migrateNode(node: unknown, where: string): QueryNode {
  if (!isObject(node)) throw new TypeError(`Expected a rule or group at ${where}`)
  if (Array.isArray(node.rules)) {
    const condition = String(node.condition ?? 'and').toLowerCase()
    if (condition !== 'and' && condition !== 'or') {
      throw new TypeError(`Unknown condition "${condition}" at ${where}`)
    }
    return {
      condition: condition as Condition,
      rules: node.rules.map((child, i) => migrateNode(child, `${where}.rules[${i}]`)),
    }
  }
  if (typeof node.id !== 'string') throw new TypeError(`Rule at ${where} has no "id"`)
  const operator = V0_OPERATORS[String(node.operator)]
  if (!operator) throw new TypeError(`Unknown 0.1.x operator "${String(node.operator)}" at ${where}`)
  return { field: node.id, operator, value: node.value }
}
