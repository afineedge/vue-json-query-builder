<script setup lang="ts">
// A sample custom value control: a dollar input that shows commas and emits plain numbers.
// It takes the value-control props (D8) and emits update:modelValue, so the builder can
// use it through `components.number` or a field's `component`.
import { ref, watch } from 'vue'
import type { ValueControlProps } from '../../src'

const props = defineProps<ValueControlProps>()
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const format = (value: unknown) => (typeof value === 'number' ? value.toLocaleString('en-US') : '')
const text = ref(format(props.modelValue))
const input = ref<HTMLInputElement>()

// Reformat when the value changes from outside (Reset, a loaded query), not while typing.
watch(
  () => props.modelValue,
  (value) => {
    if (document.activeElement !== input.value) text.value = format(value)
  },
)

function onInput(event: Event) {
  text.value = (event.target as HTMLInputElement).value
  const digits = text.value.replace(/[^\d.]/g, '')
  const n = digits === '' ? null : Number(digits)
  emit('update:modelValue', n !== null && Number.isFinite(n) ? n : null)
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="flex items-center rounded border border-neutral-border bg-neutral-white focus-within:ring-2 focus-within:ring-primary-focus">
    <span
      class="ps-2 text-sm text-neutral-dark"
      aria-hidden="true"
    >$</span>
    <input
      :id="id"
      ref="input"
      type="text"
      inputmode="decimal"
      class="w-full bg-transparent px-1 py-1 text-sm text-neutral-dark focus:outline-none disabled:opacity-60"
      :value="text"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-describedby="ariaDescribedby"
      :aria-invalid="ariaInvalid || undefined"
      @input="onInput"
      @blur="text = format(modelValue)"
    >
  </div>
</template>
