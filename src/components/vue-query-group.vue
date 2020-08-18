<template>
  <div>
    <div class="d-flex">
      <b-button-group
        class="mr-1"
        size="sm"
      >
        <b-button
          v-on:click="currentQuery.condition = 'and'"
          v-bind:variant="andConditionButtonVariant"
          class="vue-json-query-builder-and"
        >
          AND
        </b-button>
        <b-button
          v-on:click="currentQuery.condition = 'or'"
          v-bind:variant="orConditionButtonVariant"
          class="vue-json-query-builder-or"
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
          v-if="level > 0"
          class="vue-json-query-builder-delete-group"
        >
          <b-icon-trash-fill /> Delete Group
        </b-button>
        <b-button
          v-on:click="addRule"
          variant="outline-primary"
          class="vue-json-query-builder-add-rule"
        >
          <b-icon-file-plus /> Add Rule
        </b-button>
        <b-button
          v-on:click="addGroup"
          variant="outline-primary"
          class="vue-json-query-builder-add-group border-left-0"
        >
          <b-icon-folder-plus /> Add Group
        </b-button>
      </b-button-group>
    </div>
    <template v-for="(item) in currentQuery.rules">
      <b-card
        no-body
        class="mt-2"
        v-bind:key="item._uuid"
        border-variant="primary"
        v-if="typeof item.condition === 'string'"
      >
        <b-card-body
          class="p-2"
        >
          <VueQueryGroup v-bind:current-query="item" v-bind:options="options" v-bind:level="level + 1">
            <template v-slot:ruleID="{rule, options}">
              <slot name="ruleID" :rule="rule" :options="options">
              </slot>
            </template>
            <template v-slot:ruleOperator="{rule, options}">
              <slot name="ruleOperator" :rule="rule" :options="options">
              </slot>
            </template>
            <template v-slot:number="{rule}">
              <slot name="number" :rule="rule">
              </slot>
            </template>
            <template v-slot:date="{rule}">
              <slot name="date" :rule="rule">
              </slot>
            </template>
            <template v-slot:time="{rule}">
              <slot name="time" :rule="rule">
              </slot>
            </template>
            <template v-slot:select="{rule, options, multiple}">
              <slot name="select" :rule="rule" :options="options" :multiple="multiple">
              </slot>
            </template>
            <template v-slot:phone="{rule}">
              <slot name="phone" :rule="rule">
              </slot>
            </template>
            <template v-slot:email="{rule}">
              <slot name="email" :rule="rule">
              </slot>
            </template>
          </VueQueryGroup>
        </b-card-body>
      </b-card>
      <VueQueryRule v-bind:rule="item" v-bind:options="options" v-bind:key="item._uuid" v-else class="mt-2">
        <template v-slot:ruleID="{rule, options}">
          <slot name="ruleID" :rule="rule" :options="options">
          </slot>
        </template>
        <template v-slot:ruleOperator="{rule, options}">
          <slot name="ruleOperator" :rule="rule" :options="options">
          </slot>
        </template>
        <template v-slot:number="{rule}">
          <slot name="number" :rule="rule">
          </slot>
        </template>
        <template v-slot:date="{rule}">
          <slot name="date" :rule="rule">
          </slot>
        </template>
        <template v-slot:time="{rule}">
          <slot name="time" :rule="rule">
          </slot>
        </template>
        <template v-slot:select="{rule, options, multiple}">
          <slot name="select" :rule="rule" :options="options" :multiple="multiple">
          </slot>
        </template>
        <template v-slot:phone="{rule}">
          <slot name="phone" :rule="rule">
          </slot>
        </template>
        <template v-slot:email="{rule}">
          <slot name="email" :rule="rule">
          </slot>
        </template>
      </VueQueryRule>
    </template>
  </div>
</template>

<script>

import { v4 as uuidv4 } from 'uuid';

import VueQueryRule from '@/components/vue-query-rule.vue';

export default {
  name: 'VueQueryGroup',
  components: {
    VueQueryRule
  },
  props: {
    currentQuery: {
      type: Object,
      required: true
    },
    options: {
      type: Array
    },
    level: {
      type: Number,
      required: false,
      default: 0
    }
  },
  data: function() {
    return {
      condition: 'and'
    }
  },
  mounted: function() {
      const self = this;
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
      const newGroup = {
        id: self.options[0].id,
        operator: '=',
        value: ''
      }

      Object.defineProperty(newGroup, '_uuid', {
        enumerable: false,
        value: uuidv4()
      })

      self.currentQuery.rules.push(newGroup);
    },
    addGroup: function() {
      const self = this;
      const newRule = {
        condition: 'and',
        rules: []
      }

      Object.defineProperty(newRule, '_uuid', {
        enumerable: false,
        value: uuidv4()
      })

      self.currentQuery.rules.push(newRule);
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
