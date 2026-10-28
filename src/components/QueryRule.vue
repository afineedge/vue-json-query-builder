<script setup lang="ts">
import { computed } from 'vue'
import {
  changeField,
  changeOperator,
  idFor,
  isBetweenReversed,
  isOperator,
  operatorArity,
  operatorsFor,
  type Operator,
  type QueryRule,
  type SelectOption,
} from '../model'
import { useBuilderContext } from './context'
import RenderSlot from './RenderSlot'

const props = defineProps<{
  rule: QueryRule
  /** 1-based position in the parent group, for "Rule N" labels. */
  index: number
}>()
const emit = defineEmits<{ update: [rule: QueryRule]; remove: [] }>()

const ctx = useBuilderContext()

const baseId = computed(() => `vjqb-${idFor(props.rule)}`)
const errorId = computed(() => `${baseId.value}-error`)
const field = computed(() => ctx.fields.find((f) => f.field === props.rule.field))
const arity = computed(() => (isOperator(props.rule.operator) ? operatorArity(props.rule.operator) : 'single'))

const fieldOptions = computed<SelectOption[]>(() => {
  const known = ctx.fields.map((f) => ({ value: f.field, label: f.label }))
  return field.value ? known : [{ value: props.rule.field, label: `Unknown field (${props.rule.field})` }, ...known]
})
const operatorOptions = computed<SelectOption[]>(() =>
  field.value ? operatorsFor(field.value).map((op) => ({ value: op, label: ctx.labels[op] })) : [],
)

const error = computed(() => {
  if (!field.value) return `Unknown field "${props.rule.field}". Choose another field or remove this rule.`
  if (isBetweenReversed(props.rule, field.value)) {
    return field.value.type === 'number' ? 'Min must not exceed max' : 'From must not be after To'
  }
  return null
})

const valueComponent = computed(() => {
  const f = field.value
  if (!f) return null
  if (f.component) return f.component
  switch (f.type) {
    case 'select':
      return arity.value === 'array' ? ctx.components.multiSelect : ctx.components.select
    case 'number':
      return ctx.components.number
    case 'date':
      return ctx.components.date
    case 'time':
      return ctx.components.time
    default:
      return ctx.components.input
  }
})

const pairLabels = computed(() => (field.value?.type === 'number' ? ['Min', 'Max'] : ['From', 'To']))
const pairValue = computed<unknown[]>(() =>
  Array.isArray(props.rule.value) && props.rule.value.length === 2 ? props.rule.value : [null, null],
)

/** Injected number controls may emit strings; the tree always holds numbers (fix 10). */
function coerce(value: unknown): unknown {
  if (field.value?.type !== 'number') return value
  if (Array.isArray(value)) return value.map(coerce)
  if (typeof value !== 'string') return value
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function onField(name: unknown) {
  const next = ctx.fields.find((f) => f.field === name)
  if (next && next.field !== props.rule.field) emit('update', changeField(props.rule, next))
}

function onOperator(operator: unknown) {
  if (isOperator(operator) && operator !== props.rule.operator) {
    emit('update', changeOperator(props.rule, operator as Operator))
  }
}

function setValue(value: unknown) {
  emit('update', { ...props.rule, value: coerce(value) })
}

function setPairValue(i: number, value: unknown) {
  const next = pairValue.value.slice()
  next[i] = coerce(value)
  emit('update', { ...props.rule, value: next })
}

function controlProps(id: string, ariaLabel: string, modelValue: unknown) {
  return {
    modelValue,
    field: field.value!,
    operator: props.rule.operator,
    options: field.value!.options,
    multiple: arity.value === 'array',
    id,
    ariaLabel,
    ariaDescribedby: error.value ? errorId.value : undefined,
    ariaInvalid: !!error.value,
    disabled: ctx.disabled,
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)'
  return typeof value === 'string' ? value : JSON.stringify(value)
}
</script>

<template>
  <div
    role="group"
    :aria-label="`Rule ${index}`"
    class="rounded border border-neutral-border bg-neutral-white p-2"
  >
    <div class="flex flex-wrap items-start gap-2">
      <div class="w-full sm:w-44">
        <component
          :is="ctx.components.select"
          :id="`${baseId}-field`"
          :model-value="rule.field"
          :field="field"
          :operator="rule.operator"
          :options="fieldOptions"
          :multiple="false"
          aria-label="Field"
          :aria-invalid="!field"
          :aria-describedby="!field ? errorId : undefined"
          :disabled="ctx.disabled"
          @update:model-value="onField"
        />
      </div>

      <template v-if="field">
        <div class="w-full sm:w-44">
          <component
            :is="ctx.components.select"
            :id="`${baseId}-operator`"
            :model-value="rule.operator"
            :field="field"
            :operator="rule.operator"
            :options="operatorOptions"
            :multiple="false"
            aria-label="Operator"
            :disabled="ctx.disabled"
            @update:model-value="onOperator"
          />
        </div>

        <div class="min-w-40 flex-1">
          <RenderSlot
            v-if="ctx.ruleValueSlot"
            :render="ctx.ruleValueSlot"
            :scope="{ rule, ...controlProps(`${baseId}-value`, 'Value', rule.value), update: setValue }"
          />
          <div
            v-else-if="arity === 'pair'"
            class="flex flex-wrap items-center gap-2"
          >
            <div class="min-w-28 flex-1">
              <component
                :is="valueComponent"
                v-bind="controlProps(`${baseId}-value-0`, pairLabels[0]!, pairValue[0])"
                @update:model-value="setPairValue(0, $event)"
              />
            </div>
            <span
              class="text-sm text-neutral-dark"
              aria-hidden="true"
            >and</span>
            <div class="min-w-28 flex-1">
              <component
                :is="valueComponent"
                v-bind="controlProps(`${baseId}-value-1`, pairLabels[1]!, pairValue[1])"
                @update:model-value="setPairValue(1, $event)"
              />
            </div>
          </div>
          <component
            :is="valueComponent"
            v-else
            v-bind="controlProps(`${baseId}-value`, 'Value', rule.value)"
            @update:model-value="setValue"
          />
        </div>
      </template>

      <div
        v-else
        class="min-w-40 flex-1 self-center text-sm text-neutral-dark"
      >
        <span class="font-medium">{{ rule.operator }}</span>
        <span class="ml-1 break-all">{{ formatValue(rule.value) }}</span>
      </div>

      <component
        :is="ctx.components.button"
        variant="danger"
        :aria-label="`Remove rule ${index}`"
        :disabled="ctx.disabled"
        @click="emit('remove')"
      >
        <span aria-hidden="true">×</span>
      </component>
    </div>
    <p
      v-if="error"
      :id="errorId"
      class="mt-1 text-sm text-danger"
    >
      {{ error }}
    </p>
  </div>
</template>
