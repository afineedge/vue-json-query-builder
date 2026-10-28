<script setup lang="ts">
import { computed, ref } from 'vue'
import { VueJsonQueryBuilder, localStorageAdapter, pruneIncomplete, type ComponentMap, type QueryGroup } from '../src'
import CurrencyInput from './components/CurrencyInput.vue'
import { defaultQuery, fields } from './fields'

const query = ref<QueryGroup>()
const valid = ref(false)
const customControls = ref(false)
const lastRun = ref<{ at: string; query: QueryGroup } | null>(null)

const storage = localStorageAdapter('demo')
const components = computed<ComponentMap>(() => (customControls.value ? { number: CurrencyInput } : {}))
const pruned = computed(() => (query.value ? pruneIncomplete(query.value, fields) : null))

async function runQuery(q: QueryGroup) {
  await new Promise((resolve) => setTimeout(resolve, 800))
  lastRun.value = { at: new Date().toLocaleTimeString(), query: q }
}

const json = (value: unknown) => JSON.stringify(value, null, 2)
</script>

<template>
  <div class="min-h-screen bg-neutral-very-light text-neutral-dark">
    <header class="border-b border-neutral-border bg-neutral-white">
      <div class="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-2 px-4 py-4">
        <h1 class="text-xl font-semibold">
          vue-json-query-builder
        </h1>
        <nav class="flex gap-4 text-sm">
          <a
            class="text-primary underline-offset-2 hover:underline"
            href="https://github.com/afineedge/vue-json-query-builder#readme"
          >Docs</a>
          <a
            class="text-primary underline-offset-2 hover:underline"
            href="https://www.npmjs.com/package/vue-json-query-builder"
          >npm</a>
        </nav>
      </div>
    </header>

    <main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
      <section class="rounded border border-neutral-border bg-neutral-white p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm">
            Build a query with the mouse or the keyboard. It's saved in this browser as you go.
          </p>
          <label class="inline-flex items-center gap-2 text-sm">
            <input
              v-model="customControls"
              type="checkbox"
              class="size-4 accent-primary"
            >
            Use a custom control for Price
          </label>
        </div>

        <VueJsonQueryBuilder
          v-model="query"
          v-model:valid="valid"
          :fields="fields"
          :default-query="defaultQuery"
          :components="components"
          title="Filters"
          collapsible
          show-reset
          :run-query="runQuery"
          :storage="storage"
        />
      </section>

      <div class="grid gap-6 md:grid-cols-2">
        <section class="min-w-0">
          <h2 class="mb-2 flex items-center gap-2 font-semibold">
            Generated query
            <span
              :class="[
                'rounded px-2 py-0.5 text-xs font-medium',
                valid ? 'bg-light text-primary' : 'bg-neutral-light text-danger',
              ]"
            >{{ valid ? 'valid' : 'incomplete or invalid' }}</span>
          </h2>
          <pre class="max-h-96 overflow-auto rounded border border-neutral-border bg-neutral-white p-3 text-xs">{{ json(query) }}</pre>
        </section>
        <section class="min-w-0">
          <h2 class="mb-2 font-semibold">
            pruneIncomplete(query)
          </h2>
          <pre class="max-h-96 overflow-auto rounded border border-neutral-border bg-neutral-white p-3 text-xs">{{ json(pruned) }}</pre>
        </section>
      </div>

      <section
        v-if="lastRun"
        class="min-w-0"
      >
        <h2 class="mb-2 font-semibold">
          Last run at {{ lastRun.at }}
        </h2>
        <pre class="max-h-64 overflow-auto rounded border border-neutral-border bg-neutral-white p-3 text-xs">{{ json(lastRun.query) }}</pre>
      </section>
    </main>
  </div>
</template>
