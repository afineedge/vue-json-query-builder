<script setup lang="ts">
import { ref } from 'vue'
import type { MultiSelectTriggerProps } from '../../model'
import { controlClass } from './styles'

/**
 * The button that opens the multi-select's listbox. A `multiSelectTrigger` component gets
 * the same props, and the listbox's `id`, `aria-*`, `click` and `keydown` handlers as
 * attributes, which must reach the focusable element (a single-root component does that).
 */
defineProps<MultiSelectTriggerProps>()

const el = ref<HTMLButtonElement>()
defineExpose({ focus: () => el.value?.focus() })
</script>

<template>
  <button
    ref="el"
    type="button"
    :class="[controlClass, 'flex items-center justify-between gap-2 text-left']"
    :disabled="disabled"
  >
    <span class="truncate">{{ label }}</span>
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      :class="['size-4 shrink-0 transition-transform', open && 'rotate-180']"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  </button>
</template>
