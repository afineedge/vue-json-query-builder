<script setup lang="ts">
import { computed, ref } from 'vue'
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

const displayed = computed(() => {
  const value = props.modelValue
  if (Array.isArray(value)) return value.join(', ')
  return value === null || value === undefined ? '' : String(value)
})

/** Number fields emit numbers, or `null` when blank (fix 10). */
function parse(raw: string): unknown {
  if (!isNumber.value) return raw
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function onInput(event: Event) {
  if (props.multiple) return
  emit('update:modelValue', parse((event.target as HTMLInputElement).value))
}

// A list commits on change, so typing a trailing comma doesn't get reformatted away.
function onChange(event: Event) {
  if (!props.multiple) return
  const parts = (event.target as HTMLInputElement).value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  emit('update:modelValue', parts.map(parse).filter((v) => v !== null))
}
</script>

<template>
  <input
    :id="id"
    ref="el"
    :type="type"
    :class="controlClass"
    :value="displayed"
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
