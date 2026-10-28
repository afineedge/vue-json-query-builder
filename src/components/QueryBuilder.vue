<script setup lang="ts">
// Placeholder so the toolchain has a component to compile; Milestone 3 replaces it.
defineOptions({ name: 'VueJsonQueryBuilder' })
</script>

<template>
  <div
    class="rounded border border-neutral-border bg-neutral-white p-2 text-neutral-dark"
    role="group"
    aria-label="Query builder"
  >
    <slot />
  </div>
</template>
