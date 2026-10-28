<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { SelectOption, ValueControlProps } from '../../model'
import { controlClass } from './styles'

/**
 * A button that opens a multi-select listbox (ARIA listbox pattern). Arrow keys, Home/End
 * and typeahead move the active option; Space/Enter toggle it; Escape or Tab closes and
 * returns focus to the button.
 */
const props = defineProps<Partial<ValueControlProps>>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

const open = ref(false)
const activeIndex = ref(0)
const root = ref<HTMLElement>()
const button = ref<HTMLButtonElement>()
const listbox = ref<HTMLElement>()

const options = computed<SelectOption[]>(() => props.options ?? [])
const selected = computed<unknown[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))
const isSelected = (option: SelectOption) => selected.value.includes(option.value)

const baseId = computed(() => props.id ?? 'vjqb-multiselect')
const listboxId = computed(() => `${baseId.value}-listbox`)
const optionId = (i: number) => `${baseId.value}-option-${i}`

const summary = computed(() => {
  const chosen = options.value.filter(isSelected)
  if (chosen.length === 0) return props.field?.placeholder ?? 'Select…'
  if (chosen.length === 1) return chosen[0]!.label
  return `${chosen.length} selected`
})

function toggle(option: SelectOption) {
  const next = isSelected(option)
    ? selected.value.filter((v) => v !== option.value)
    : // Keep the options' order, not the click order.
      options.value.filter((o) => isSelected(o) || o === option).map((o) => o.value)
  emit('update:modelValue', next)
}

async function openList() {
  if (props.disabled || open.value) return
  open.value = true
  const first = options.value.findIndex(isSelected)
  activeIndex.value = first === -1 ? 0 : first
  await nextTick()
  listbox.value?.focus()
  scrollActiveIntoView()
}

function close(restoreFocus: boolean) {
  if (!open.value) return
  open.value = false
  if (restoreFocus) button.value?.focus()
}

function scrollActiveIntoView() {
  document.getElementById(optionId(activeIndex.value))?.scrollIntoView?.({ block: 'nearest' })
}

function move(to: number) {
  const count = options.value.length
  if (!count) return
  activeIndex.value = Math.max(0, Math.min(count - 1, to))
  scrollActiveIntoView()
}

let typed = ''
let typedAt = 0
function typeahead(char: string) {
  const now = Date.now()
  typed = now - typedAt > 500 ? char : typed + char
  typedAt = now
  const query = typed.toLowerCase()
  const count = options.value.length
  // Search from the option after the active one, so repeating a letter cycles through matches.
  const start = typed.length === 1 ? activeIndex.value + 1 : activeIndex.value
  for (let step = 0; step < count; step++) {
    const i = (start + step) % count
    if (options.value[i]!.label.toLowerCase().startsWith(query)) return move(i)
  }
}

function onButtonKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    openList()
  }
}

function onListKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      return move(activeIndex.value + 1)
    case 'ArrowUp':
      event.preventDefault()
      return move(activeIndex.value - 1)
    case 'Home':
      event.preventDefault()
      return move(0)
    case 'End':
      event.preventDefault()
      return move(options.value.length - 1)
    case ' ':
    case 'Enter': {
      event.preventDefault()
      const option = options.value[activeIndex.value]
      if (option) toggle(option)
      return
    }
    case 'Escape':
      event.preventDefault()
      return close(true)
    case 'Tab':
      return close(false)
    default:
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typeahead(event.key)
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) close(false)
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onDocumentPointerDown)
  else document.removeEventListener('pointerdown', onDocumentPointerDown)
})
watch(
  () => props.disabled,
  (disabled) => disabled && close(false),
)
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

defineExpose({ focus: () => button.value?.focus() })
</script>

<template>
  <div
    ref="root"
    class="relative"
  >
    <button
      :id="id"
      ref="button"
      type="button"
      :class="[controlClass, 'flex items-center justify-between gap-2 text-left']"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listboxId"
      :aria-label="ariaLabel ? `${ariaLabel}: ${summary}` : undefined"
      :aria-describedby="ariaDescribedby"
      :aria-invalid="ariaInvalid || undefined"
      @click="open ? close(true) : openList()"
      @keydown="onButtonKeydown"
    >
      <span class="truncate">{{ summary }}</span>
      <span
        aria-hidden="true"
        class="text-xs"
      >▾</span>
    </button>
    <ul
      v-show="open"
      :id="listboxId"
      ref="listbox"
      role="listbox"
      aria-multiselectable="true"
      tabindex="-1"
      :aria-label="ariaLabel"
      :aria-activedescendant="open && options.length ? optionId(activeIndex) : undefined"
      class="absolute z-10 mt-1 max-h-60 w-full min-w-40 overflow-auto rounded border border-neutral-border bg-neutral-white py-1 text-sm text-neutral-dark shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
      @keydown="onListKeydown"
    >
      <li
        v-for="(option, i) in options"
        :id="optionId(i)"
        :key="String(option.value)"
        role="option"
        :aria-selected="isSelected(option)"
        :class="[
          'flex cursor-pointer items-center gap-2 px-2 py-1',
          i === activeIndex ? 'bg-light' : 'hover:bg-neutral-very-light',
        ]"
        @click="toggle(option)"
        @pointerenter="activeIndex = i"
      >
        <span
          aria-hidden="true"
          :class="[
            'inline-flex size-4 shrink-0 items-center justify-center rounded-sm border text-xs leading-none',
            isSelected(option) ? 'border-primary bg-primary text-neutral-white' : 'border-neutral-border bg-neutral-white',
          ]"
        >{{ isSelected(option) ? '✓' : '' }}</span>
        {{ option.label }}
      </li>
      <li
        v-if="!options.length"
        class="px-2 py-1 text-neutral-dark opacity-70"
      >
        No options
      </li>
    </ul>
  </div>
</template>
