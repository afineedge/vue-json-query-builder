<script setup lang="ts">
import { computed, provide, ref, useSlots, watch } from 'vue'
import {
  DEFAULT_OPERATOR_LABELS,
  carryId,
  createGroup,
  isGroup,
  isQueryValid,
  type ComponentMap,
  type ComponentName,
  type FieldDef,
  type Operator,
  type QueryGroup as Group,
  type QueryNode,
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
    fields: FieldDef[]
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

const model = defineModel<Group>()
const valid = defineModel<boolean>('valid', { default: false })

defineSlots<{
  header?(props: { title: string | undefined; collapsed: boolean; toggle: () => void }): unknown
  footer?(props: { run: () => Promise<void>; reset: () => void; loading: boolean; valid: boolean }): unknown
  'rule-value'?(props: Record<string, unknown>): unknown
}>()

const slots = useSlots()
const loading = ref(false)
const collapsed = ref(false)
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
const labels = computed(() => ({ ...DEFAULT_OPERATOR_LABELS, ...props.operatorLabels }))
const isDisabled = computed(() => props.disabled || loading.value)

function countRules(node: QueryNode): number {
  return isGroup(node) ? node.rules.reduce((sum, child) => sum + countRules(child), 0) : 1
}
const ruleCount = computed(() => (model.value ? countRules(model.value) : 0))

provide(builderContextKey, {
  get fields() {
    return props.fields
  },
  get components() {
    return components.value
  },
  get labels() {
    return labels.value
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
})

const clone = (query: Group): Group => JSON.parse(JSON.stringify(query)) as Group
const initialQuery = (): Group => (props.defaultQuery ? clone(props.defaultQuery) : createGroup(props.fields))

// With no v-model, start from storage, then defaultQuery, then one blank rule.
if (model.value === undefined) {
  if (props.storage) {
    Promise.resolve(props.storage.load())
      .catch(() => null)
      .then((stored) => {
        if (model.value === undefined) model.value = stored ?? initialQuery()
      })
  } else {
    model.value = initialQuery()
  }
}

const isValid = computed(() => !!model.value && isQueryValid(model.value, props.fields))
watch(isValid, (v) => (valid.value = v), { immediate: true })

watch(model, (query) => {
  if (query && props.storage) void props.storage.save(query)
})

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
  if (!props.runQuery || !model.value || loading.value) return
  loading.value = true
  try {
    await props.runQuery(model.value)
  } finally {
    loading.value = false
  }
}

function reset() {
  if (props.defaultQuery) model.value = clone(props.defaultQuery)
}

function load(query: Group) {
  model.value = clone(query)
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
              class="inline-flex items-center gap-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
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
          v-if="model"
          :group="model"
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
        >
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <SavedQueries
              v-if="storage"
              :storage="storage"
              :query="model"
              @load="load"
            />
            <div class="ms-auto flex flex-wrap gap-2">
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
                :disabled="isDisabled || !isValid"
                @click="run"
              >
                {{ loading ? 'Running…' : 'Run query' }}
              </component>
            </div>
          </div>
        </slot>
      </template>
    </div>
  </div>
</template>
