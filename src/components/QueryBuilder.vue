<script setup lang="ts">
import { computed, provide, ref, useSlots, watch } from 'vue'
import {
  carryId,
  createGroup,
  isGroup,
  isQueryShape,
  isQueryValid,
  operatorLabel,
  pruneIncomplete,
  queryHasErrors,
  sanitizeQuery,
  type ComponentMap,
  type ComponentName,
  type FieldDef,
  type Operator,
  type QueryGroup as Group,
  type QueryNode,
  type RuleValueSlotProps,
  type StorageAdapter,
} from '../model'
import { builderContextKey, type BuilderContext } from './context'
import DefaultButton from './controls/DefaultButton.vue'
import DefaultInput from './controls/DefaultInput.vue'
import DefaultModal from './controls/DefaultModal.vue'
import DefaultMultiSelect from './controls/DefaultMultiSelect.vue'
import DefaultSelect from './controls/DefaultSelect.vue'
import QueryGroup from './QueryGroup.vue'
import SavedQueries from './SavedQueries.vue'

defineOptions({ name: 'VueJsonQueryBuilder' })

const props = withDefaults(
  defineProps<{
    fields: readonly FieldDef[]
    /** What Reset restores, and the starting tree when no `v-model` is given. */
    defaultQuery?: Group
    /** Replacement controls; see the D8 props contract. */
    components?: ComponentMap
    operatorLabels?: Partial<Record<Operator, string>>
    /** Group nesting levels, counting the root. */
    maxDepth?: number
    maxRules?: number
    title?: string
    collapsible?: boolean
    /** Called by Run with the pruned tree: incomplete rules and empty groups removed. */
    runQuery?: (query: Group) => unknown
    showReset?: boolean
    storage?: StorageAdapter
    disabled?: boolean
  }>(),
  {
    defaultQuery: undefined,
    components: undefined,
    operatorLabels: undefined,
    maxDepth: 3,
    maxRules: 25,
    title: undefined,
    collapsible: false,
    runQuery: undefined,
    showReset: false,
    storage: undefined,
    disabled: false,
  },
)

// `null` and `undefined` both mean "no tree"; the builder then emits a starting tree.
const model = defineModel<Group | null>()
const valid = defineModel<boolean>('valid', { default: false })

defineSlots<{
  header?(props: { title: string | undefined; collapsed: boolean; toggle: () => void }): unknown
  footer?(props: {
    run: () => Promise<void>
    reset: () => void
    loading: boolean
    valid: boolean
    runnable: boolean
  }): unknown
  'rule-value'?(props: RuleValueSlotProps): unknown
}>()

const slots = useSlots()
const loading = ref(false)
const collapsed = ref(false)
const liveMessage = ref('')
const bodyId = `vjqb-body-${Math.random().toString(36).slice(2, 10)}`

const DEFAULT_COMPONENTS: Record<ComponentName, BuilderContext['components'][ComponentName]> = {
  button: DefaultButton,
  select: DefaultSelect,
  input: DefaultInput,
  multiSelect: DefaultMultiSelect,
  date: DefaultInput,
  time: DefaultInput,
  number: DefaultInput,
  modal: DefaultModal,
}

const components = computed(() => ({ ...DEFAULT_COMPONENTS, ...props.components }))
const isDisabled = computed(() => props.disabled || loading.value)

function countRules(node: QueryNode): number {
  return isGroup(node) ? node.rules.reduce((sum, child) => sum + countRules(child), 0) : 1
}
/** The tree, once it's well formed. A malformed one is repaired and re-emitted below. */
const tree = computed(() => (isQueryShape(model.value) ? model.value : null))
const ruleCount = computed(() => (tree.value ? countRules(tree.value) : 0))

provide(builderContextKey, {
  get fields() {
    return props.fields
  },
  get components() {
    return components.value
  },
  labelFor(operator: Operator, field?: FieldDef) {
    return operatorLabel(operator, field, props.operatorLabels)
  },
  get maxDepth() {
    return props.maxDepth
  },
  get maxRules() {
    return props.maxRules
  },
  get ruleCount() {
    return ruleCount.value
  },
  get disabled() {
    return isDisabled.value
  },
  get ruleValueSlot() {
    return slots['rule-value']
  },
  announce,
})

/**
 * Clears, then sets, the live region so a repeated message is still read out. The set waits
 * a moment because some screen readers skip a change made in the same task as the clear.
 */
let announceTimer: ReturnType<typeof setTimeout> | undefined
function announce(message: string) {
  liveMessage.value = ''
  clearTimeout(announceTimer)
  announceTimer = setTimeout(() => (liveMessage.value = message), 50)
}

const clone = (query: Group): Group => JSON.parse(JSON.stringify(query)) as Group
const initialQuery = (): Group => (props.defaultQuery ? clone(props.defaultQuery) : createGroup(props.fields))
/** A malformed tree (from a URL or storage) with its bad nodes dropped, or the starting tree. */
const repair = (value: unknown): Group => sanitizeQuery(value) ?? initialQuery()

// With no tree on mount, start from storage, then defaultQuery, then one blank rule.
let loadingStored = false
if (model.value != null && !isQueryShape(model.value)) {
  model.value = repair(model.value)
} else if (model.value == null) {
  const storage = props.storage
  if (storage?.load) {
    loadingStored = true
    Promise.resolve()
      .then(() => storage.load!())
      .catch(() => null)
      .then((stored) => {
        loadingStored = false
        if (model.value == null) model.value = isQueryShape(stored) ? stored : repair(stored)
      })
  } else {
    model.value = initialQuery()
  }
}

// If the parent clears the tree later (say, Back to a URL with no query), start over; if it
// hands over a malformed one, repair it.
watch(model, (query) => {
  if (loadingStored) return
  if (query == null) model.value = initialQuery()
  else if (!isQueryShape(query)) model.value = repair(query)
})

const isValid = computed(() => !!tree.value && isQueryValid(tree.value, props.fields))
watch(isValid, (v) => (valid.value = v), { immediate: true })

// Persisting is best effort: a failing adapter mustn't break editing. Writes run one at a
// time and skip to the latest tree, so a slow adapter can't save an older tree last.
let persisting = false
let toPersist: Group | null = null
async function persistLatest() {
  if (persisting) return
  persisting = true
  while (toPersist && props.storage?.persist) {
    const next = toPersist
    toPersist = null
    try {
      await props.storage.persist(next)
    } catch {
      // Ignored: see above.
    }
  }
  persisting = false
}
watch(tree, (query) => {
  if (!query || !props.storage?.persist) return
  toPersist = query
  void persistLatest()
})

const pruned = computed(() => (tree.value ? pruneIncomplete(tree.value, props.fields) : null))
const hasErrors = computed(() => !!tree.value && queryHasErrors(tree.value, props.fields))
/** Run works whenever something is complete and nothing on screen is an error. */
const runnable = computed(() => !!pruned.value && !hasErrors.value)
const runHint = computed(() => {
  if (hasErrors.value) return 'Fix the errors above to run the query.'
  if (!pruned.value) return 'Complete a rule to run the query.'
  return null
})
const runHintId = `${bodyId}-run-hint`

function onUpdate(next: Group) {
  // Keep the root's row key when its replacement comes back up the tree.
  model.value = model.value ? carryId(model.value, next) : next
}

const showHeader = computed(() => !!slots.header || !!props.title)
const showReset = computed(() => !!props.defaultQuery && props.showReset)
const showFooter = computed(() => !!slots.footer || !!props.runQuery || showReset.value || !!props.storage)

function toggle() {
  if (props.collapsible) collapsed.value = !collapsed.value
}

/** Runs the query; `loading` resets even when `runQuery` rejects (fix 8). */
async function run() {
  const query = pruned.value
  if (!props.runQuery || !query || !runnable.value || loading.value) return
  loading.value = true
  announce('Running query')
  try {
    await props.runQuery(query)
    announce('Query finished')
  } catch (error) {
    announce('Query failed')
    throw error
  } finally {
    loading.value = false
  }
}

function reset() {
  if (!props.defaultQuery) return
  model.value = clone(props.defaultQuery)
  announce('Query reset')
}

function load(query: Group, name: string) {
  if (!isQueryShape(query)) return announce(`Couldn't load ${name}`)
  model.value = clone(query)
  announce(`Loaded ${name}`)
}
</script>

<template>
  <div class="text-sm text-neutral-dark">
    <template v-if="showHeader">
      <slot
        name="header"
        :title="title"
        :collapsed="collapsed"
        :toggle="toggle"
      >
        <div class="mb-2 flex items-center gap-2">
          <h2
            v-if="!collapsible"
            class="text-base font-semibold"
          >
            {{ title }}
          </h2>
          <h2
            v-else
            class="text-base font-semibold"
          >
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded focus:outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary-focus"
              :aria-expanded="!collapsed"
              :aria-controls="bodyId"
              @click="toggle"
            >
              <span
                aria-hidden="true"
                :class="['inline-block transition-transform', collapsed ? '-rotate-90' : '']"
              >▾</span>
              {{ title }}
            </button>
          </h2>
        </div>
      </slot>
    </template>

    <div
      v-show="!collapsed"
      :id="bodyId"
    >
      <div
        :inert="loading || undefined"
        :aria-busy="loading || undefined"
      >
        <QueryGroup
          v-if="tree"
          :group="tree"
          :depth="1"
          @update="onUpdate"
        />
      </div>

      <template v-if="showFooter">
        <slot
          name="footer"
          :run="run"
          :reset="reset"
          :loading="loading"
          :valid="isValid"
          :runnable="runnable"
        >
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <SavedQueries
              v-if="storage"
              :storage="storage"
              :query="tree ?? undefined"
              @load="load"
            />
            <div class="ms-auto flex flex-wrap items-center gap-2">
              <span
                v-if="runQuery && runHint && !loading"
                :id="runHintId"
                class="text-sm text-neutral-dark"
              >{{ runHint }}</span>
              <component
                :is="components.button"
                v-if="showReset"
                :disabled="isDisabled"
                @click="reset"
              >
                Reset
              </component>
              <component
                :is="components.button"
                v-if="runQuery"
                variant="primary"
                :disabled="loading ? false : isDisabled || !runnable"
                :aria-disabled="loading || undefined"
                :aria-describedby="runHint ? runHintId : undefined"
                @click="run"
              >
                {{ loading ? 'Running…' : 'Run query' }}
              </component>
            </div>
          </div>
        </slot>
      </template>
    </div>

    <div
      class="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ liveMessage }}
    </div>
  </div>
</template>
