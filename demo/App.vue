<script setup lang="ts">
// Interim demo for checking components; Milestone 5 replaces it with the full 0.1.x demo migrated to v1.
import { ref } from 'vue'
import { VueJsonQueryBuilder, localStorageAdapter, pruneIncomplete, type FieldDef, type QueryGroup } from '../src'

const fields: FieldDef[] = [
  { field: 'name', label: 'Name', type: 'text' },
  { field: 'price', label: 'Price', type: 'number' },
  { field: 'date', label: 'Date', type: 'date' },
  { field: 'time', label: 'Time', type: 'time' },
  {
    field: 'state',
    label: 'State',
    type: 'select',
    options: [
      { value: 'MD', label: 'Maryland' },
      { value: 'VA', label: 'Virginia' },
      { value: 'DC', label: 'District of Columbia' },
      { value: 'DE', label: 'Delaware' },
    ],
  },
  {
    field: 'tags',
    label: 'Tags',
    type: 'select',
    multiValued: true,
    options: [
      { value: 'new', label: 'New' },
      { value: 'sale', label: 'On sale' },
      { value: 'featured', label: 'Featured' },
    ],
  },
]

const defaultQuery: QueryGroup = {
  condition: 'and',
  rules: [
    { field: 'state', operator: 'eq', value: 'MD' },
    { condition: 'or', rules: [{ field: 'price', operator: 'between', value: [100, 50] }] },
  ],
}

const query = ref<QueryGroup>()
const valid = ref(false)
const storage = localStorageAdapter('demo')
const runQuery = () => new Promise((resolve) => setTimeout(resolve, 800))
</script>

<template>
  <main class="mx-auto max-w-4xl p-4">
    <h1 class="mb-4 text-2xl font-semibold">
      vue-json-query-builder
    </h1>
    <VueJsonQueryBuilder
      v-model="query"
      v-model:valid="valid"
      :fields="fields"
      :default-query="defaultQuery"
      title="Filters"
      collapsible
      show-reset
      :run-query="runQuery"
      :storage="storage"
    />
    <h2 class="mt-6 mb-1 font-semibold">
      Generated query (valid: {{ valid }})
    </h2>
    <pre class="overflow-auto rounded border border-neutral-border bg-neutral-white p-2 text-xs">{{ JSON.stringify(query, null, 2) }}</pre>
    <h2 class="mt-4 mb-1 font-semibold">
      pruneIncomplete
    </h2>
    <pre class="overflow-auto rounded border border-neutral-border bg-neutral-white p-2 text-xs">{{ JSON.stringify(query && pruneIncomplete(query, fields), null, 2) }}</pre>
  </main>
</template>
