<script setup lang="ts">
import { ref } from 'vue'
import { buttonClass, buttonVariants, type ButtonVariant } from './styles'

/**
 * Button contract: props `variant`, `disabled`, `ariaLabel`, `type`; default slot is the
 * label; emits `click`. An injected `button` component receives the same.
 */
withDefaults(
  defineProps<{
    variant?: ButtonVariant
    disabled?: boolean
    ariaLabel?: string
    type?: 'button' | 'submit'
  }>(),
  { variant: 'secondary', disabled: false, ariaLabel: undefined, type: 'button' },
)
defineEmits<{ click: [event: MouseEvent] }>()

const el = ref<HTMLButtonElement>()
defineExpose({ focus: () => el.value?.focus() })
</script>

<template>
  <button
    ref="el"
    :type="type"
    :class="[buttonClass, buttonVariants[variant]]"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
