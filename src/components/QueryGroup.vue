<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { focusRef } from './focus'
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

// Focus targets, all template refs: child rows by node id, the radios, and Add rule.
const childRefs = new Map<string, unknown>()
const radioRefs = ref<HTMLInputElement[]>([])
const addRuleButton = ref()

function setChildRef(node: QueryNode, el: unknown) {
  if (el) childRefs.set(idFor(node), el)
  else childRefs.delete(idFor(node))
}

/** Where focus goes once the parent hands back the updated group. */
type PendingFocus = { child: number } | 'addRule'
let pendingFocus: PendingFocus | null = null

watch(
  () => props.group,
  (group) => {
    const target = pendingFocus
    pendingFocus = null
    if (target === 'addRule') focusRef(addRuleButton.value)
    else if (target) {
      const node = group.rules[target.child]
      if (node) focusRef(childRefs.get(idFor(node)))
    }
  },
  { flush: 'post' },
)

/** Focuses this group's first rule, or its Add rule button when it has none. */
function focus() {
  const first = props.group.rules[0]
  if (!first || !focusRef(childRefs.get(idFor(first)))) focusRef(addRuleButton.value)
}
defineExpose({ focus })

function setCondition(condition: Condition) {
  if (condition !== props.group.condition) emit('update', { ...props.group, condition })
}

/** Arrow keys move between All and Any and select it, like a native radio group. */
function onRadioKeydown(event: KeyboardEvent, index: number) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  if (!step || ctx.disabled) return
  event.preventDefault()
  const next = (index + step + conditions.length) % conditions.length
  setCondition(conditions[next]!.value)
  radioRefs.value[next]?.focus()
}

function addRule() {
  const first = ctx.fields[0]
  if (!canAdd.value || !first) return
  pendingFocus = { child: props.group.rules.length }
  emit('update', insertNode(props.group, [], ruleFor(first)))
  ctx.announce('Rule added')
}

function addGroup() {
  if (!canAdd.value) return
  pendingFocus = { child: props.group.rules.length }
  emit('update', insertNode(props.group, [], createGroup(ctx.fields)))
  ctx.announce('Group added')
}

function updateChild(index: number, node: QueryNode) {
  emit('update', replaceNode(props.group, [index], node))
}

/**
 * Removing the last child of a nested group removes the group; at the root it leaves one
 * blank rule, so the builder never shows an empty group (fix 13). Focus moves to the
 * previous sibling, else this group's Add rule button.
 */
function removeChild(index: number) {
  const removed = props.group.rules[index]
  if (props.group.rules.length === 1 && !isRoot.value) return emit('remove')
  pendingFocus = index > 0 ? { child: index - 1 } : 'addRule'
  if (props.group.rules.length > 1) emit('update', removeNode(props.group, [index]))
  else emit('update', { ...props.group, rules: createGroup(ctx.fields).rules })
  ctx.announce(removed && isGroup(removed) ? 'Group removed' : 'Rule removed')
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
          v-for="(c, i) in conditions"
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
            ref="radioRefs"
            type="radio"
            class="sr-only"
            :name="`${baseId}-condition`"
            :value="c.value"
            :checked="group.condition === c.value"
            :disabled="ctx.disabled"
            @change="setCondition(c.value)"
            @keydown="onRadioKeydown($event, i)"
          >
          {{ c.label }}
        </label>
      </div>
      <span class="text-sm text-neutral-dark">of the following</span>

      <div class="ms-auto flex flex-wrap gap-2">
        <component
          :is="ctx.components.button"
          ref="addRuleButton"
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
          :ref="(el) => setChildRef(node, el)"
          :group="node"
          :depth="depth + 1"
          @update="updateChild(i, $event)"
          @remove="removeChild(i)"
        />
        <QueryRule
          v-else
          :ref="(el) => setChildRef(node, el)"
          :rule="node"
          :index="i + 1"
          @update="updateChild(i, $event)"
          @remove="removeChild(i)"
        />
      </li>
    </ul>
  </div>
</template>
