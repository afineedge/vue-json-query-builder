<template>
  <div class="vue-query-rule d-flex">
    <b-container fluid class="p-0">
      <b-row no-gutters>
        <b-col cols="4" class="vue-query-rule-id pr-1">
          <slot name="ruleID" :rule="rule" :options="ruleIDOptions">
            <b-form-select
              size="sm"
              :options="ruleIDOptions"
              value-field="id"
              text-field="name"
              v-model="rule.id"
            />
          </slot>
        </b-col>
        <b-col cols="3" class="vue-query-rule-operator pr-1">
          <slot name="ruleOperator" :rule="rule" :options="ruleOperatorOptions">
            <b-form-select
              size="sm"
              :options="ruleOperatorOptions"
              value-field="id"
              text-field="name"
              v-model="rule.operator"
            />
          </slot>
        </b-col>
        <b-col cols="5" class="vue-query-rule-value pr-1">
          <slot name="number" :rule="rule" v-if="ruleParams.type === 'number'">
            <b-form-input
              size="sm"
              v-model="rule.value"
              type="number"
            />
          </slot>
          <slot name="date" :rule="rule" v-else-if="ruleParams.type === 'date'">
            <b-form-datepicker
              size="sm"
              v-model="rule.value"
              :date-format-options="{ year: 'numeric', month: 'numeric', day: 'numeric' }"
            />
          </slot>
          <slot name="time" :rule="rule" v-else-if="ruleParams.type === 'time'">
            <b-form-input
              size="sm"
              v-model="rule.value"
              type="time"
            />
          </slot>
          <slot name="select" :rule="rule" :options="ruleParams.options" :multiple="multiple" v-else-if="ruleParams.type === 'select'">
            <b-form-select
              size="sm"
              :options="ruleParams.options"
              value-field="id"
              text-field="name"
              v-model="rule.value"
              :multiple="multiple"
            />
          </slot>
          <slot name="phone" :rule="rule" v-else-if="ruleParams.type === 'phone'">
            <b-form-input
              size="sm"
              v-model="rule.value"
              type="tel"
            />
          </slot>
          <slot name="email" :rule="rule" v-else-if="ruleParams.type === 'email'">
            <b-form-input
              size="sm"
              v-model="rule.value"
              type="email"
            />
          </slot>
          <b-form-input
            size="sm"
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
      class="vue-json-query-builder-delete-rule"
    >
      <b-icon-trash-fill />
    </b-button>
  </div>
</template>

<script>

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
    return {}
  },
  computed: {
    ruleParams: function() {
      const self = this;
      return self.options.find(function(option){
        return option.id === self.rule.id
      });
    },
    ruleIDOptions: function() {
      const self = this;
      const options = self.options;
      return options.map(function(option){
        return {
          id: option.id,
          name: option.name
        }
      })
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
    ruleOperatorOptions: function() {
      const self = this;
      switch(self.ruleParams.type){
        case 'select':
          return [
            {id: '=',  name: 'is'},
            {id: '!=',  name: 'is not'},
            {id: 'in', name: 'is (multiple)'},
            {id: '!in', name: 'is not (multiple)'}
          ];
        case 'number':
        case 'date':
        case 'month':
        case 'time':
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
      self.rule.operator = '=';
      self.resetRuleValue();
    },
    currentRuleOperator: function(to, from) {
      const self = this;
      if (to.includes('in') !== from.includes('in')){
        self.resetRuleValue();
      }
      return false;
    }
  }
}
</script>

<style lang="scss">
  .vue-query-rule {

    .vs__clear {
      display: none;
    }
  }
</style>
