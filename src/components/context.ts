import { inject, type Component, type InjectionKey, type Slot } from 'vue'
import type { ComponentName, FieldDef, Operator } from '../model'

/** Shared state the builder hands down its group/rule tree. Read through getters so it stays reactive. */
export interface BuilderContext {
  readonly fields: readonly FieldDef[]
  readonly components: Readonly<Record<ComponentName, Component>>
  /** The operator's label for this field, after the `operatorLabels` overrides. */
  labelFor(operator: Operator, field?: FieldDef): string
  readonly maxDepth: number
  readonly maxRules: number
  /** Rules in the whole tree, for the `maxRules` cap. */
  readonly ruleCount: number
  readonly disabled: boolean
  readonly ruleValueSlot: Slot | undefined
  /** Reads a message out through the builder's polite live region. */
  announce(message: string): void
}

export const builderContextKey: InjectionKey<BuilderContext> = Symbol('vue-json-query-builder')

export function useBuilderContext(): BuilderContext {
  const context = inject(builderContextKey)
  if (!context) throw new Error('QueryGroup and QueryRule must be rendered inside VueJsonQueryBuilder')
  return context
}
