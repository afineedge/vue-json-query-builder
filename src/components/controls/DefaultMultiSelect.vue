<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { SelectOption, ValueControlProps } from '../../model'
import { builderContextKey } from '../context'
import { focusRef } from '../focus'
import DefaultMultiSelectTrigger from './DefaultMultiSelectTrigger.vue'

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
// The trigger button can be the host's (`components.multiSelectTrigger`); the listbox stays ours.
const trigger = inject(builderContextKey, null)?.components.multiSelectTrigger ?? DefaultMultiSelectTrigger
const button = ref()
const listbox = ref<HTMLElement>()

const options = computed<SelectOption[]>(() => props.options ?? [])
const selected = computed<unknown[]>(() => (Array.isArray(props.modelValue) ? props.modelValue : []))
const isSelected = (option: SelectOption) => selected.value.includes(option.value)
// The active option gets an outline, not just a tint: under aria-activedescendant it's the
// only sign of where keyboard focus is.

const baseId = computed(() => props.id ?? 'vjqb-multiselect')
const listboxId = computed(() => `${baseId.value}-listbox`)
const optionId = (i: number) => `${baseId.value}-option-${i}`

const summary = computed(() => {
  const chosen = options.value.filter(isSelected)
  if (chosen.length === 0) return props.field?.placeholder ?? 'Select…'
  if (chosen.length === 1) return chosen[0]!.label
  return `${chosen.length} selected`
})

/** Toggles one option. The result keeps the options' order and drops values that aren't options. */
function toggle(option: SelectOption) {
  const turningOn = !isSelected(option)
  const next = options.value.filter((o) => (o === option ? turningOn : isSelected(o))).map((o) => o.value)
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
  if (restoreFocus) focusRef(button.value)
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

/**
 * Follows the pointer only when the mouse really moves. A keyboard jump scrolls the list,
 * sliding a different option under a resting mouse; browsers report that as the pointer
 * entering it, which used to steal the active option, so Enter picked the wrong one.
 */
let lastPointer: { x: number; y: number } | undefined
function onOptionPointerMove(event: PointerEvent, index: number) {
  if (lastPointer?.x === event.clientX && lastPointer.y === event.clientY) return
  lastPointer = { x: event.clientX, y: event.clientY }
  activeIndex.value = index
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

defineExpose({ focus: () => focusRef(button.value) })
</script>

<template>
  <div
    ref="root"
    class="relative"
  >
    <component
      :is="trigger"
      :id="id"
      ref="button"
      :open="open"
      :label="summary"
      :empty="!options.some(isSelected)"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listboxId"
      :aria-label="ariaLabel ? `${ariaLabel}: ${summary}` : undefined"
      :aria-describedby="ariaDescribedby"
      :aria-invalid="ariaInvalid || undefined"
      @click="open ? close(true) : openList()"
      @keydown="onButtonKeydown"
    />
    <ul
      v-show="open"
      :id="listboxId"
      ref="listbox"
      role="listbox"
      aria-multiselectable="true"
      tabindex="-1"
      :aria-label="ariaLabel"
      :aria-activedescendant="open && options.length ? optionId(activeIndex) : undefined"
      class="absolute z-10 mt-1 max-h-60 w-full min-w-40 overflow-auto rounded border border-neutral-border bg-neutral-white py-1 text-sm text-neutral-dark shadow-lg focus:outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary-focus"
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
          i === activeIndex ? 'bg-light outline-2 -outline-offset-2 outline-primary' : 'hover:bg-neutral-very-light',
        ]"
        @click="toggle(option)"
        @pointermove="onOptionPointerMove($event, i)"
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
        class="px-2 py-1 text-neutral-dark italic"
      >
        No options
      </li>
    </ul>
  </div>
</template>
