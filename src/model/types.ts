import type { Component } from 'vue'

export type Condition = 'and' | 'or'

export type Operator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'not_starts_with'
  | 'not_ends_with'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'between'
  | 'in'
  | 'not_in'
  | 'any_of'
  | 'all_of'
  | 'none_of'

/** How many values an operator takes: one, a `[min, max]` pair, or a non-empty array. */
export type Arity = 'single' | 'pair' | 'array'

export interface QueryRule {
  field: string
  operator: Operator
  value: unknown
}

export interface QueryGroup {
  condition: Condition
  rules: QueryNode[]
}

export type QueryNode = QueryRule | QueryGroup

/** Index path from the root group: `[]` is the root, `[1, 0]` the first child of the root's second child. */
export type NodePath = readonly number[]

export type FieldType = 'text' | 'number' | 'date' | 'time' | 'select'

export interface SelectOption {
  value: string | number
  label: string
}

export interface FieldDef {
  field: string
  label: string
  type: FieldType
  /** Overrides the type's default operators. The first entry is the default for a new rule. */
  operators?: Operator[]
  /** Labels for this field's operators. They win over the builder's `operatorLabels`. */
  operatorLabels?: Partial<Record<Operator, string>>
  /** Choices for a `select` field. */
  options?: SelectOption[]
  /** On a `select`, switches the default operators to `any_of` / `all_of` / `none_of`. */
  multiValued?: boolean
  /** The native input type for a text field, for example `email` or `tel`. */
  inputType?: string
  /** Replaces the value control for this field only. Receives {@link ValueControlProps}. */
  component?: Component
  placeholder?: string
}

export type ComponentName = 'button' | 'select' | 'input' | 'multiSelect' | 'date' | 'time' | 'number' | 'modal'

export type ComponentMap = Partial<Record<ComponentName, Component>>

/** Props every value control receives (D8). Controls emit `update:modelValue`. */
export interface ValueControlProps {
  modelValue: unknown
  field: FieldDef
  operator: Operator
  options?: SelectOption[]
  multiple: boolean
  id: string
  ariaLabel: string
  ariaDescribedby?: string
  ariaInvalid?: boolean
  disabled?: boolean
}

/**
 * Props the `select` control receives: the same as {@link ValueControlProps}, except that the
 * field and operator selects get `field: undefined` for a rule whose field isn't in `fields`.
 */
export type SelectControlProps = Omit<ValueControlProps, 'field'> & { field?: FieldDef }

/** What the `rule-value` slot receives: the value-control props plus the rule and a setter. */
export type RuleValueSlotProps = ValueControlProps & {
  rule: QueryRule
  update: (value: unknown) => void
}

export interface SavedQuery {
  id: string
  name: string
  query: QueryGroup
  /** ISO 8601 timestamp. */
  savedAt: string
}

type MaybePromise<T> = T | Promise<T>

export interface StorageAdapter {
  /** The persisted current tree, or `null` when there is none. Without it, nothing loads on mount. */
  load?(): MaybePromise<QueryGroup | null>
  /** Persists the current tree; called on every change. Without it, the current tree isn't kept. */
  persist?(query: QueryGroup): MaybePromise<void>
  /** Adds a named query to the saved list and returns the new entry. */
  save(query: QueryGroup, name: string): MaybePromise<SavedQuery>
  list(): MaybePromise<SavedQuery[]>
  remove(id: string): MaybePromise<void>
}
