<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ValueControlProps } from '../../model'
import { controlClass } from './styles'

const props = defineProps<Partial<ValueControlProps>>()
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>()

const el = ref<HTMLSelectElement>()
defineExpose({ focus: () => el.value?.focus() })

const options = computed(() => props.options ?? [])
// Native <select> values are strings; map through the index so number option values survive.
const selectedIndex = computed(() => options.value.findIndex((o) => o.value === props.modelValue))

function onChange(event: Event) {
  const option = options.value[Number((event.target as HTMLSelectElement).value)]
  if (option) emit('update:modelValue', option.value)
}
</script>

<template>
  <select
    :id="id"
    ref="el"
    :class="controlClass"
    :value="selectedIndex"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-describedby="ariaDescribedby"
    :aria-invalid="ariaInvalid || undefined"
    @change="onChange"
  >
    <option
      v-if="selectedIndex === -1"
      :value="-1"
      disabled
    >
      {{ field?.placeholder ?? 'Select…' }}
    </option>
    <option
      v-for="(option, i) in options"
      :key="String(option.value)"
      :value="i"
    >
      {{ option.label }}
    </option>
  </select>
</template>
