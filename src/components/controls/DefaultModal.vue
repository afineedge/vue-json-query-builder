<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

/**
 * Modal contract: props `open`, `title`; slots default (body) and `footer`; emits
 * `update:open` with `false` when the user dismisses it. Built on native `<dialog>`,
 * which traps focus and closes on Escape.
 */
const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()

const dialog = ref<HTMLDialogElement>()
const titleId = `vjqb-modal-title-${Math.random().toString(36).slice(2, 10)}`

function sync(open: boolean) {
  const el = dialog.value
  if (!el) return
  if (open && !el.open) {
    if (typeof el.showModal === 'function') el.showModal()
    else el.setAttribute('open', '')
  } else if (!open && el.open) {
    if (typeof el.close === 'function') el.close()
    else el.removeAttribute('open')
  }
}

onMounted(() => sync(props.open))
watch(() => props.open, sync)
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="m-auto w-full max-w-md rounded border border-neutral-border bg-neutral-white p-0 text-neutral-dark shadow-xl backdrop:bg-neutral-dark/50"
    @close="emit('update:open', false)"
  >
    <div class="flex items-center justify-between border-b border-neutral-border px-4 py-2">
      <h2
        :id="titleId"
        class="text-base font-semibold"
      >
        {{ title }}
      </h2>
      <button
        type="button"
        class="inline-flex size-8 items-center justify-center rounded text-lg leading-none hover:bg-neutral-light focus:outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary-focus"
        aria-label="Close"
        @click="emit('update:open', false)"
      >
        ×
      </button>
    </div>
    <div class="px-4 py-3 text-sm">
      <slot />
    </div>
    <div
      v-if="$slots.footer"
      class="flex justify-end gap-2 border-t border-neutral-border px-4 py-2"
    >
      <slot name="footer" />
    </div>
  </dialog>
</template>
