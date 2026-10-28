<script setup lang="ts">
import { computed, ref } from 'vue'
import type { QueryGroup, SavedQuery, StorageAdapter } from '../model'
import { useBuilderContext } from './context'
import { controlClass } from './controls/styles'

const props = defineProps<{ storage: StorageAdapter; query: QueryGroup | undefined }>()
const emit = defineEmits<{ load: [query: QueryGroup, name: string] }>()

const ctx = useBuilderContext()

const saveOpen = ref(false)
const listOpen = ref(false)
const name = ref('')
const nameTouched = ref(false)
const saved = ref<SavedQuery[]>([])
const confirmingId = ref<string | null>(null)
const nameId = `vjqb-save-name-${Math.random().toString(36).slice(2, 10)}`

const trimmedName = computed(() => name.value.trim())
const nameError = computed(() => (trimmedName.value.length < 2 ? 'Enter a name of at least 2 characters.' : null))

function openSave() {
  name.value = ''
  nameTouched.value = false
  saveOpen.value = true
}

async function save() {
  nameTouched.value = true
  if (nameError.value || !props.query) return
  await props.storage.save(props.query, trimmedName.value)
  saveOpen.value = false
  ctx.announce(`Saved ${trimmedName.value}`)
}

async function refresh() {
  saved.value = await props.storage.list()
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

/** Deletes by the saved query's id, never by position (fix 6). */
async function remove(entry: SavedQuery) {
  await props.storage.remove(entry.id)
  ctx.announce(`Deleted ${entry.name}`)
  confirmingId.value = null
  await refresh()
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
        v-model="name"
        type="text"
        :class="controlClass"
        autocomplete="off"
        :aria-invalid="(nameTouched && !!nameError) || undefined"
        :aria-describedby="nameTouched && nameError ? `${nameId}-error` : undefined"
        @blur="nameTouched = true"
      >
      <p
        v-if="nameTouched && nameError"
        :id="`${nameId}-error`"
        class="text-danger"
      >
        {{ nameError }}
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
    <p v-if="!saved.length">
      No saved queries yet.
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
            @click="confirmingId = null"
          >
            Keep
          </component>
          <component
            :is="ctx.components.button"
            variant="danger"
            @click="remove(entry)"
          >
            Delete
          </component>
        </template>
        <template v-else>
          <component
            :is="ctx.components.button"
            variant="primary"
            :aria-label="`Load ${entry.name}`"
            @click="load(entry)"
          >
            Load
          </component>
          <component
            :is="ctx.components.button"
            variant="danger"
            :aria-label="`Delete ${entry.name}`"
            @click="confirmingId = entry.id"
          >
            Delete
          </component>
        </template>
      </li>
    </ul>
  </component>
</template>
