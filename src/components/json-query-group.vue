<template>
  <div>
    <div class="mb-2 d-flex">
      <b-button-group
        class="mr-1"
        size="sm"
      >
        <b-button
          v-on:click="currentQuery.condition = 'and'"
          v-bind:variant="andConditionButtonVariant"
        >
          AND
        </b-button>
        <b-button
          v-on:click="currentQuery.condition = 'or'"
          v-bind:variant="orConditionButtonVariant"
        >
          OR
        </b-button>
      </b-button-group>
      <b-button-group
        class="ml-auto"
        size="sm"
      >
        <b-button
          v-on:click="deleteGroup"
          variant="danger"
          v-if="!topLevel"
        >
          <b-icon-trash-fill /> Delete Group
        </b-button>
        <b-button
          v-on:click="addRule"
          variant="outline-primary"
        >
          <b-icon-file-plus /> Add Rule
        </b-button>
        <b-button
          v-on:click="addGroup"
          variant="outline-primary"
          class="border-left-0"
        >
          <b-icon-folder-plus /> Add Group
        </b-button>
      </b-button-group>
    </div>
    <template v-for="(item, index) in currentQuery.rules">
      <b-card
        no-body
        class="my-2"
        v-bind:key="index"
        border-variant="primary"
        v-if="typeof item.condition === 'string'"
      >
        <b-card-body
          class="p-2"
        >
          <JSONQueryGroup v-bind:current-query="item" v-bind:options="options" v-bind:top-level="false" />
        </b-card-body>
      </b-card>
      <JSONQueryRule v-bind:rule="item" v-bind:options="options" v-bind:key="index" v-else />
    </template>
  </div>
</template>

<script>
import JSONQueryRule from '@/components/json-query-rule.vue';

export default {
  name: 'JSONQueryGroup',
  components: {
    JSONQueryRule
  },
  props: {
    currentQuery: {
      type: Object,
      required: true
    },
    options: {
      type: Array
    },
    topLevel: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  data: function() {
    return {
      condition: 'and'
    }
  },
  mounted: function() {
      const self = this;
      console.log(self.currentQuery.rules);
      if (self.currentQuery.rules.length === 0){
        self.addRule();
      }
  },
  computed: {
    andConditionButtonVariant: function() {
      const self = this;
      if (self.currentQuery.condition === 'and'){
        return 'primary'
      }
      return 'outline-primary';
    },
    orConditionButtonVariant: function() {
      const self = this;
      if (self.currentQuery.condition === 'or'){
        return 'primary'
      }
      return 'outline-primary';
    }
  },
  methods: {
    addRule: function() {
      const self = this;
      self.currentQuery.rules.push({
        id: self.options[0].id,
        operator: '=',
        value: ''
      })
    },
    addGroup: function() {
      const self = this;
      self.currentQuery.rules.push({
        condition: 'and',
        rules: []
      })
    },
    deleteGroup: function() {
      const self = this;
      const parentRules = self.$parent.currentQuery.rules;
      parentRules.splice(parentRules.indexOf(self.currentQuery), 1);
    }
  }
}
</script>

<style>
</style>
