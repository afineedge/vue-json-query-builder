<template>
  <div>
    <VueQueryRule v-bind:rule="currentQuery.rules[0]" v-bind:options="options" />
  </div>
</template>

<script>
import VueQueryRule from '@/components/vue-query-rule.vue'

export default {
  name: 'ParentComponentForRule',
  components: {
    VueQueryRule
  },
  props: {
    currentQuery: {
      type: Object
    },
    options: {
      type: Array
    }
  },
  data: function() {
    return {
    }
  },
  computed: {
  },
  methods: {
  },
  watch: {
  }
}
</script>

<style lang="scss">
</style>
