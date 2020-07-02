<template>
    <b-card no-body
      class="json-query-builder"
      border-variant="primary"
    >
      <b-card-header
        header-bg-variant="primary"
        header-border-variant="primary"
        header-text-variant="white"
        header-class="json-query-builder-header py-2 px-3"
      >
        <small>Query Builder</small>
      </b-card-header>
      <b-card-body
        class="p-2"
      >
        <VueQueryGroup v-bind:current-query="currentQuery" v-bind:options="options" />
      </b-card-body>
      <b-card-footer
        footer-border-variant="primary"
        footer-class="json-query-builder-footer d-flex p-2"
      >
        <b-button-group
          class="mr-1"
            size="sm"
        >
          <b-button
            variant="outline-primary"
          >
            <b-icon-bookmark-plus /> Save Query
          </b-button>
          <b-button
            variant="outline-primary"
          >
            <b-icon-bookmarks /> View Saved Queries
          </b-button>
        </b-button-group>
        <b-button
          size="sm"
          variant="secondary"
          class="ml-auto mr-1"
          v-on:click="resetToDefaultQuery"
        >
          <b-icon-arrow-counterclockwise /> Reset to Default Query
        </b-button>
        <b-button
          size="sm"
          variant="success"
        >
          Run Query <b-icon-arrow-right-circle-fill />
        </b-button>
      </b-card-footer>
      <div v-html="currentQuery" />
    </b-card>
</template>

<script>

import VueQueryGroup from '@/components/vue-query-group.vue';

export default {
  name: 'VueQueryBuilder',
  components: {
    VueQueryGroup
  },
  props: {
    query: {
      type: Object,
      required: true
    },
    options: {
      type: Array
    }
  },
  data: function() {
    return {
      currentQuery: {}
    }
  },
  computed: {
  },
  created: function() {
    const self = this;
    self.resetToDefaultQuery();
  },
  methods: {
    resetToDefaultQuery: function() {
      const self = this;
      self.currentQuery = JSON.parse(JSON.stringify(self.query));
    }
  }
}
</script>

<style lang="scss">
</style>
