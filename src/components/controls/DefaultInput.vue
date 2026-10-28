<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ValueControlProps } from '../../model'
import { controlClass } from './styles'

const props = defineProps<Partial<ValueControlProps>>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

const el = ref<HTMLInputElement>()
defineExpose({ focus: () => el.value?.focus() })

const type = computed(() => {
  switch (props.field?.type) {
    case 'number':
    case 'date':
    case 'time':
      // A comma-separated list can't live in a number input.
      return props.multiple && props.field.type === 'number' ? 'text' : props.field.type
    default:
      return props.field?.inputType ?? 'text'
  }
})

const isNumber = computed(() => props.field?.type === 'number')

function format(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return value === null || value === undefined ? '' : String(value)
}

/** Number fields emit numbers, or `null` when blank (fix 10). */
function parse(raw: string): unknown {
  if (!isNumber.value) return raw
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function parseList(raw: string): unknown[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parse)
    .filter((v) => v !== null)
}

/**
 * What the user typed. It's only replaced when the value changes to something the text
 * doesn't already mean, so "1.0" or "1." mid-way through "1.05" isn't rewritten to "1".
 */
const draft = ref(format(props.modelValue))
watch(
  () => props.modelValue,
  (value) => {
    const meant = props.multiple ? parseList(draft.value) : parse(draft.value)
    if (JSON.stringify(meant) !== JSON.stringify(value ?? null)) draft.value = format(value)
  },
)

function onInput(event: Event) {
  draft.value = (event.target as HTMLInputElement).value
  if (!props.multiple) emit('update:modelValue', parse(draft.value))
}

// A list commits on change, so typing a trailing comma doesn't get reformatted away.
function onChange() {
  if (props.multiple) emit('update:modelValue', parseList(draft.value))
}
</script>

<template>
  <input
    :id="id"
    ref="el"
    :type="type"
    :class="controlClass"
    :value="draft"
    :placeholder="field?.placeholder ?? (multiple ? 'Comma-separated values' : undefined)"
    :inputmode="isNumber ? 'decimal' : undefined"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-describedby="ariaDescribedby"
    :aria-invalid="ariaInvalid || undefined"
    @input="onInput"
    @change="onChange"
  >
</template>
