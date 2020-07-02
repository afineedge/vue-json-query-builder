<template>
  <div class="vue-query-rule d-flex mb-1">
    <b-container fluid class="p-0">
      <b-row no-gutters>
        <b-col cols="4" class="pr-1">
          <v-select
            size="sm"
            :options="options"
            :reduce="item => item.id"
            label="name"
            autocomplete="off"
            v-model="rule.id"
          />
        </b-col>
        <b-col cols="3" class="pr-1">
          <v-select
            size="sm"
            :options="operators"
            :reduce="item => item.id"
            label="name"
            autocomplete="off"
            v-model="rule.operator"
          />
        </b-col>
        <b-col cols="5" class="pr-1">
          <v-select
            size="sm"
            :options="valueOptions"
            :reduce="item => item.id"
            label="name"
            autocomplete="off"
            v-model="rule.value"
            :multiple="multiple"
            v-if="params.type === 'select'"
          />
          <b-form-input
            size="sm"
            autocomplete="off"
            v-model="rule.value"
            v-else
          />
        </b-col>
      </b-row>
    </b-container>
    <b-button
      size="sm"
      variant="danger"
      v-on:click="deleteRule"
    >
      <b-icon-trash-fill />
    </b-button>
  </div>
</template>

<script>

import Vue from 'vue';
import vSelect from 'vue-select';
Vue.component('v-select', vSelect);

export default {
  name: 'VueQueryRule',
  components: {
  },
  props: {
    rule: {
      type: Object,
      required: true
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
    params: function() {
      const self = this;
      return self.options.find(function(option){
        return option.id === self.rule.id
      });
    },
    valueOptions: function() {
      const self = this;
      const options = self.params.options;
      if (typeof options === 'function'){
        return options();
      }

      return options;
    },
    currentRuleID: function(){
      const self = this;
      return self.rule.id;
    },
    currentRuleOperator: function(){
      const self = this;
      return self.rule.operator;
    },
    multiple: function(){
      const self = this;
      return self.rule.operator.includes('in');
    },
    operators: function() {
      const self = this;
      switch(self.params.type){
        case 'select':
          return [
            {id: '=',  name: 'is'},
            {id: '!=',  name: 'is not'},
            {id: 'in', name: 'is (multiple)'},
            {id: '!in', name: 'is not (multiple)'}
          ];
        case 'number':
        case 'dollar':
        case 'integer':
        case 'date':
        case 'month':
        case 'year':
          return [
            {id: '=',  name: 'is'},
            {id: '!=',  name: 'is not'},
            {id: '>',  name: 'is greater than'},
            {id: '<',  name: 'is less than'},
            {id: '>=', name: '>='},
            {id: '<=', name: '<='}
          ];
        case 'phone':
          return [
            {id: '=',  name: 'is'},
            {id: '!=',  name: 'is not'},
            {id: '()',  name: 'includes'},
            {id: '!()',  name: 'does not include'}
          ];
        case 'email':
          return [
            {id: '=',  name: 'is'},
            {id: '!=',  name: 'is not'},
            {id: '()',  name: 'includes'},
            {id: '!()',  name: 'does not include'},
            {id: '(',   name: 'starts with'},
            {id: ')',   name: 'ends with'},
            {id: '!(',   name: 'does not start with'},
            {id: '!)',   name: 'does not end with'}
          ];
        default:
          return [
            {id: '=',  name: 'is'},
            {id: '!=',  name: 'is not'},
            {id: 'in', name: 'is (multiple)'},
            {id: '!in', name: 'is not (multiple)'},
            {id: '()',  name: 'includes'},
            {id: '!()',  name: 'does not include'},
            {id: '(',   name: 'starts with'},
            {id: ')',   name: 'ends with'},
            {id: '!(',   name: 'does not start with'},
            {id: '!)',   name: 'does not end with'}
          ];
      }
    }
  },
  methods: {
    resetRuleValue: function(){
      const self = this;
      if (self.multiple){
        self.rule.value = [];
      } else {
        self.rule.value = '';
      }
    },
    deleteRule: function(){
      const self = this;
      const parentRules = self.$parent.currentQuery.rules;
      parentRules.splice(parentRules.indexOf(self.rule), 1);
    }
  },
  watch: {
    currentRuleID: function() {
      const self = this;
      self.resetRuleValue();
    },
    currentRuleOperator: function(to, from) {
      const self = this;
      if (to.includes('in') && !from.includes('in')){
        self.resetRuleValue();
      } else if (!to.includes('in') && from.includes('in')){
        self.resetRuleValue();
      }
      return false;

    }
  }
}
</script>

<style>
</style>
