<script setup lang="ts">
import { computed } from 'vue'
import {
  createGroup,
  idFor,
  insertNode,
  isGroup,
  removeNode,
  replaceNode,
  ruleFor,
  type Condition,
  type QueryGroup as Group,
  type QueryNode,
} from '../model'
import { useBuilderContext } from './context'
import QueryRule from './QueryRule.vue'

const props = defineProps<{
  group: Group
  /** 1 for the root group. */
  depth: number
}>()
const emit = defineEmits<{ update: [group: Group]; remove: [] }>()

const ctx = useBuilderContext()

const isRoot = computed(() => props.depth === 1)
const baseId = computed(() => `vjqb-${idFor(props.group)}`)
const matchWord = computed(() => (props.group.condition === 'or' ? 'any' : 'all'))
const canAdd = computed(() => !ctx.disabled && ctx.fields.length > 0 && ctx.ruleCount < ctx.maxRules)
const addHint = computed(() => {
  if (!ctx.fields.length) return 'No fields are available to add a rule.'
  if (ctx.ruleCount >= ctx.maxRules) return `This query has the maximum of ${ctx.maxRules} rules.`
  return null
})

const conditions: { value: Condition; label: string }[] = [
  { value: 'and', label: 'All' },
  { value: 'or', label: 'Any' },
]

function setCondition(condition: Condition) {
  if (condition !== props.group.condition) emit('update', { ...props.group, condition })
}

function addRule() {
  const first = ctx.fields[0]
  if (canAdd.value && first) emit('update', insertNode(props.group, [], ruleFor(first)))
}

function addGroup() {
  if (canAdd.value) emit('update', insertNode(props.group, [], createGroup(ctx.fields)))
}

function updateChild(index: number, node: QueryNode) {
  emit('update', replaceNode(props.group, [index], node))
}

/**
 * Removing the last child of a nested group removes the group; at the root it leaves one
 * blank rule, so the builder never shows an empty group (fix 13).
 */
function removeChild(index: number) {
  if (props.group.rules.length > 1) return emit('update', removeNode(props.group, [index]))
  if (!isRoot.value) return emit('remove')
  emit('update', { ...props.group, rules: createGroup(ctx.fields).rules })
}
</script>

<template>
  <div
    role="group"
    :aria-label="`Group: match ${matchWord} of the following`"
    :class="[
      'rounded border border-neutral-border p-2',
      isRoot ? 'bg-neutral-very-light' : 'bg-neutral-light',
    ]"
  >
    <div class="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Match"
        class="inline-flex overflow-hidden rounded border border-neutral-border"
      >
        <label
          v-for="c in conditions"
          :key="c.value"
          :class="[
            'cursor-pointer px-3 py-1 text-sm font-medium select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-focus has-[:focus-visible]:ring-inset',
            group.condition === c.value
              ? 'bg-primary text-neutral-white'
              : 'bg-neutral-white text-neutral-dark hover:bg-neutral-light',
            ctx.disabled && 'cursor-not-allowed opacity-60',
          ]"
        >
          <input
            type="radio"
            class="sr-only"
            :name="`${baseId}-condition`"
            :value="c.value"
            :checked="group.condition === c.value"
            :disabled="ctx.disabled"
            @change="setCondition(c.value)"
          >
          {{ c.label }}
        </label>
      </div>
      <span class="text-sm text-neutral-dark">of the following</span>

      <div class="ms-auto flex flex-wrap gap-2">
        <component
          :is="ctx.components.button"
          :disabled="!canAdd"
          :aria-describedby="addHint ? `${baseId}-hint` : undefined"
          @click="addRule"
        >
          Add rule
        </component>
        <component
          :is="ctx.components.button"
          v-if="depth < ctx.maxDepth"
          :disabled="!canAdd"
          @click="addGroup"
        >
          Add group
        </component>
        <component
          :is="ctx.components.button"
          v-if="!isRoot"
          variant="danger"
          :disabled="ctx.disabled"
          @click="emit('remove')"
        >
          Remove group
        </component>
      </div>
    </div>

    <p
      v-if="addHint"
      :id="`${baseId}-hint`"
      class="mt-2 text-sm text-neutral-dark"
    >
      {{ addHint }}
    </p>

    <ul
      v-if="group.rules.length"
      class="mt-2 flex flex-col gap-2"
    >
      <li
        v-for="(node, i) in group.rules"
        :key="idFor(node)"
      >
        <QueryGroup
          v-if="isGroup(node)"
          :group="node"
          :depth="depth + 1"
          @update="updateChild(i, $event)"
          @remove="removeChild(i)"
        />
        <QueryRule
          v-else
          :rule="node"
          :index="i + 1"
          @update="updateChild(i, $event)"
          @remove="removeChild(i)"
        />
      </li>
    </ul>
  </div>
</template>
