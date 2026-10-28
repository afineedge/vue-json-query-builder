<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { QueryGroup, SavedQuery, StorageAdapter } from '../model'
import { useBuilderContext } from './context'
import { controlClass } from './controls/styles'
import { focusRef } from './focus'

const props = defineProps<{ storage: StorageAdapter; query: QueryGroup | undefined }>()
const emit = defineEmits<{ load: [query: QueryGroup, name: string] }>()

const ctx = useBuilderContext()

const saveOpen = ref(false)
const listOpen = ref(false)
const name = ref('')
const nameTouched = ref(false)
const saveError = ref<string | null>(null)
const saved = ref<SavedQuery[]>([])
const listError = ref<string | null>(null)
const confirmingId = ref<string | null>(null)
const nameId = `vjqb-save-name-${Math.random().toString(36).slice(2, 10)}`

// Focus targets, all template refs.
const nameInput = ref<HTMLInputElement>()
const emptyMessage = ref<HTMLElement>()
const confirmButtons = new Map<string, unknown>()
const loadButtons = new Map<string, unknown>()
const deleteButtons = new Map<string, unknown>()
const setRef = (refs: Map<string, unknown>, id: string) => (el: unknown) => {
  if (el) refs.set(id, el)
  else refs.delete(id)
}

const trimmedName = computed(() => name.value.trim())
const nameError = computed(() => (trimmedName.value.length < 2 ? 'Enter a name of at least 2 characters.' : null))
const shownNameError = computed(() => saveError.value ?? (nameTouched.value ? nameError.value : null))

const failure = (what: string, error: unknown) =>
  `Couldn't ${what}${error instanceof Error && error.message ? `: ${error.message}` : '.'}`

async function openSave() {
  name.value = ''
  nameTouched.value = false
  saveError.value = null
  saveOpen.value = true
  // The native dialog honours `autofocus`; this covers injected modals that don't.
  await nextTick()
  nameInput.value?.focus()
}

async function save() {
  nameTouched.value = true
  saveError.value = null
  if (nameError.value || !props.query) {
    nameInput.value?.focus()
    return
  }
  try {
    await props.storage.save(props.query, trimmedName.value)
  } catch (error) {
    saveError.value = failure('save the query', error)
    ctx.announce(saveError.value)
    return
  }
  saveOpen.value = false
  ctx.announce(`Saved ${trimmedName.value}`)
}

async function refresh() {
  listError.value = null
  try {
    saved.value = await props.storage.list()
  } catch (error) {
    saved.value = []
    listError.value = failure('load the saved queries', error)
  }
}

async function openList() {
  confirmingId.value = null
  await refresh()
  listOpen.value = true
}

function load(entry: SavedQuery) {
  emit('load', entry.query, entry.name)
  listOpen.value = false
}

async function askToDelete(entry: SavedQuery) {
  confirmingId.value = entry.id
  await nextTick()
  focusRef(confirmButtons.get(entry.id))
}

async function keep(entry: SavedQuery) {
  confirmingId.value = null
  await nextTick()
  focusRef(deleteButtons.get(entry.id))
}

/** Deletes by the saved query's id, never by position (fix 6), then focuses the next entry. */
async function remove(entry: SavedQuery) {
  const index = saved.value.findIndex((q) => q.id === entry.id)
  try {
    await props.storage.remove(entry.id)
  } catch (error) {
    listError.value = failure(`delete ${entry.name}`, error)
    ctx.announce(listError.value)
    return
  }
  ctx.announce(`Deleted ${entry.name}`)
  confirmingId.value = null
  await refresh()
  await nextTick()
  const next = saved.value[index] ?? saved.value[index - 1]
  if (!next || !focusRef(loadButtons.get(next.id))) emptyMessage.value?.focus()
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}
</script>

<template>
  <component
    :is="ctx.components.button"
    :disabled="ctx.disabled || !query"
    @click="openSave"
  >
    Save query
  </component>
  <component
    :is="ctx.components.button"
    :disabled="ctx.disabled"
    @click="openList"
  >
    Saved queries
  </component>

  <component
    :is="ctx.components.modal"
    v-model:open="saveOpen"
    title="Save query"
  >
    <form
      class="flex flex-col gap-1"
      novalidate
      @submit.prevent="save"
    >
      <label
        :for="nameId"
        class="font-medium"
      >Name</label>
      <input
        :id="nameId"
        ref="nameInput"
        v-model="name"
        type="text"
        :class="controlClass"
        autocomplete="off"
        autofocus
        :aria-invalid="!!shownNameError || undefined"
        :aria-describedby="shownNameError ? `${nameId}-error` : undefined"
        @blur="nameTouched = true"
      >
      <!-- Always rendered, so an error appearing on blur doesn't shift the buttons under the pointer. -->
      <p
        :id="`${nameId}-error`"
        class="min-h-5 text-danger"
      >
        {{ shownNameError }}
      </p>
    </form>
    <template #footer>
      <component
        :is="ctx.components.button"
        @click="saveOpen = false"
      >
        Cancel
      </component>
      <component
        :is="ctx.components.button"
        variant="primary"
        @click="save"
      >
        Save
      </component>
    </template>
  </component>

  <component
    :is="ctx.components.modal"
    v-model:open="listOpen"
    title="Saved queries"
  >
    <p
      v-if="listError"
      class="mb-2 text-danger"
    >
      {{ listError }}
    </p>
    <p
      v-if="!saved.length"
      ref="emptyMessage"
      tabindex="-1"
      class="focus:outline-hidden"
    >
      No saved queries yet. Use Save query to keep the current one.
    </p>
    <ul
      v-else
      class="flex flex-col divide-y divide-neutral-border"
    >
      <li
        v-for="entry in saved"
        :key="entry.id"
        class="flex flex-wrap items-center gap-2 py-2"
      >
        <div class="min-w-0 flex-1">
          <div class="truncate font-medium">
            {{ entry.name }}
          </div>
          <div class="text-xs text-neutral-dark">
            {{ formatDate(entry.savedAt) }}
          </div>
        </div>
        <template v-if="confirmingId === entry.id">
          <span>Delete “{{ entry.name }}”?</span>
          <component
            :is="ctx.components.button"
            :aria-label="`Keep ${entry.name}`"
            @click="keep(entry)"
          >
            Keep
          </component>
          <component
            :is="ctx.components.button"
            :ref="setRef(confirmButtons, entry.id)"
            variant="danger"
            :aria-label="`Confirm delete ${entry.name}`"
            @click="remove(entry)"
          >
            Delete
          </component>
        </template>
        <template v-else>
          <component
            :is="ctx.components.button"
            :ref="setRef(loadButtons, entry.id)"
            variant="primary"
            :aria-label="`Load ${entry.name}`"
            @click="load(entry)"
          >
            Load
          </component>
          <component
            :is="ctx.components.button"
            :ref="setRef(deleteButtons, entry.id)"
            variant="danger"
            :aria-label="`Delete ${entry.name}`"
            @click="askToDelete(entry)"
          >
            Delete
          </component>
        </template>
      </li>
    </ul>
  </component>
</template>
