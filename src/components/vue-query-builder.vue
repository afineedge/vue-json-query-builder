<template>
  <b-card no-body
    class="json-query-builder"
    border-variant="primary"
  >
    <b-card-header
      header-bg-variant="primary"
      header-border-variant="primary"
      header-text-variant="white"
      header-class="json-query-builder-header p-2 d-flex align-items-center"
      v-on:click="isVisible = !isVisible"
    >
      <small class="mr-auto">Query Builder</small>
      <b-icon-caret-up-fill v-if="!isVisible" />
      <b-icon-caret-down-fill v-else />
    </b-card-header>
    <b-card-body
      class="p-2"
      v-if="isVisible"
    >
      <VueQueryGroup v-bind:current-query="currentQuery" v-bind:options="options">
        <template v-slot:ruleID="{rule, options}">
          <!--
            @slot The user interface element to replace ruleID selector
            @binding {object} rule The options to be applied to this rule selector
            @binding {array} options The list of options to apply to new ruleID selector. Each object in array must include `id` and `name` attributes
          -->
          <slot name="ruleID" :rule="rule" :options="options">
          </slot>
        </template>
        <template v-slot:ruleOperator="{rule, options}">
          <!--
            @slot The user interface element to replace ruleOperator selector
            @binding {object} rule The options to be applied to this operator selector
            @binding {array} options list of options to apply to new ruleOperator selector. Each object in array must include `id` and `name` attributes.
          -->
          <slot name="ruleOperator" :rule="rule" :options="options">
          </slot>
        </template>
        <template v-slot:number="{rule}">
          <!--
            @slot The user interface element to replace number input
            @binding {object} rule The rule to be affected by this input
          -->
          <slot name="number" :rule="rule">
          </slot>
        </template>
        <template v-slot:date="{rule}">
          <!--
            @slot The user interface element to replace date input
            @binding {object} rule The rule to be affected by this input
          -->
          <slot name="date" :rule="rule">
          </slot>
        </template>
        <template v-slot:time="{rule}">
          <!--
            @slot The user interface element to replace time input
            @binding {object} rule The rule to be affected by this input
          -->
          <slot name="time" :rule="rule">
          </slot>
        </template>
        <template v-slot:select="{rule, options, multiple}">
          <!--
            @slot The user interface element to replace select
            @binding {object} rule The rule to be affected by this select
            @binding {array} options list of options to apply to this select. Each object in array must include `id` and `name` attributes.
            @binding {boolean} multiple Determines whether select allows for singular or multiple selections.
          -->
          <slot name="select" :rule="rule" :options="options" :multiple="multiple">
          </slot>
        </template>
        <template v-slot:phone="{rule}">
          <!--
            @slot The user interface element to replace phone input
            @binding {object} rule The rule to be affected by this input
          -->
          <slot name="phone" :rule="rule">
          </slot>
        </template>
        <template v-slot:email="{rule}">
          <!--
            @slot The user interface element to replace email input
            @binding {object} rule The rule to be affected by this input
          -->
          <slot name="email" :rule="rule">
          </slot>
        </template>
      </VueQueryGroup>
    </b-card-body>
    <b-card-footer
      footer-border-variant="primary"
      footer-class="json-query-builder-footer d-flex p-2"
      v-if="isVisible"
    >
      <b-button-group
        class="mr-1"
        size="sm"
        v-if="storage.length > 0"
      >
        <b-button
          variant="outline-primary"
          class="d-flex align-items-center"
          v-on:click="modals.saveQuery.visible = true"
        >
          <b-icon-bookmark-plus class="mr-1" /> Save Query
        </b-button>
        <b-button
          variant="outline-primary"
          class="d-flex align-items-center"
          v-on:click="modals.viewSavedQueries.visible = true"
          v-if="modals.viewSavedQueries.savedQueries.length > 0"
        >
          <b-icon-bookmarks class="mr-1" /> View Saved Queries
        </b-button>
      </b-button-group>
      <b-button
        size="sm"
        variant="secondary"
        class="d-flex align-items-center ml-auto mr-1"
        v-on:click="resetToDefaultQuery"
      >
        <b-icon-arrow-counterclockwise class="mr-1" /> Reset to Default Query
      </b-button>
      <b-button
        size="sm"
        variant="success"
        class="d-flex align-items-center"
        v-on:click="runCurrentQuery(currentQuery)"
        v-if="runQuery"
        v-bind:disabled="runQueryDisabled"
      >
        Run Query&nbsp;
        <b-icon icon="circle-fill" animation="throb" class="ml-1" v-if="loading" />
        <b-icon-arrow-right-circle-fill class="ml-1" v-else />
      </b-button>
    </b-card-footer>
    <b-modal header-bg-variant="primary" header-text-variant="white" v-model="modals.saveQuery.visible" title="Save Query">
      <p>
        Please enter the name for your new query below.
      </p>
      <b-form-input
        size="sm"
        v-model="modals.saveQuery.queryName"
      />
      <template v-slot:modal-footer>
        <b-button
          v-on:click="modals.saveQuery.visible = false"
        >
          Cancel
        </b-button>
        <b-button
          variant="success"
          v-on:click="saveQuery"
          v-bind:disabled="saveQueryDisabled"
        >
          <b-icon-cloud-upload /> Save Query
        </b-button>
      </template>
    </b-modal>
    <b-modal header-bg-variant="primary" header-text-variant="white" v-model="modals.viewSavedQueries.visible" title="Saved Queries" hide-footer>
      <b-table
        :items="modals.viewSavedQueries.savedQueries"
        :fields="['name', 'createdDate', 'actions']"
      >
        <template v-slot:cell(createdDate)="row">
          {{ row | moment("dddd, MMMM Do, YYYY")}}
        </template>
        <template v-slot:cell(actions)="row">
          <b-button-group size="sm">
            <b-button @click="loadSavedQuery(row.item.query)">
              Load
            </b-button>
            <b-button @click="deleteSavedQuery(row.item.query)" variant="danger">
              Delete
            </b-button>
          </b-button-group>
        </template>
      </b-table>
    </b-modal>
  </b-card>
</template>

<script>

import Vue from 'vue';
Vue.use(require('vue-moment'));

import { v4 as uuidv4 } from 'uuid';

import VueQueryGroup from '@/components/vue-query-group.vue';

export default {
  name: 'VueQueryBuilder',
  components: {
    VueQueryGroup
  },
  props: {
    /**
      * The initial query to load into VueQueryBuilder on load.
    */
     query: {
      type: Object,
      required: true
    },
    /**
      * The options to define the parameters of each rule.
    */
    options: {
      type: Array
    },
    /**
      * @model
      * Returns current query to parent component.
    */
    value: {
      type: Object,
      required: false,
      default: function(){
        return {}
      }
    },
    /**
      * The location in localStorage in which to store current query.
    */
    storage: {
      type: String,
      required: false,
      default: ''
    },
    /**
      * The function to run upon click of "Run Query" button, returning current query.
    */
    runQuery: {
      type: [Function, Object],
      required: false,
      default: null
    },
    /**
      * Determines whether VueQueryBuilder instance is collapsed or expanded upon load.
    */
    visible: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  data: function() {
    return {
      currentQuery: {},
      isVisible: this.visible,
      storedQueries: '',
      loading: false,
      modals: {
        saveQuery: {
          visible: false,
          queryName: ''
        },
        viewSavedQueries: {
          visible: false,
          savedQueries: []
        }
      }
    }
  },
  computed: {
    savedQueriesLocation: function(){
      const self = this;
      return 'VueQueryBuilder_saved_' + self.storage;
    },
    storedQueriesLocation: function(){
      const self = this;
      return 'VueQueryBuilder_stored_' + self.storage;
    },
    saveQueryDisabled: function() {
      const self = this;
      return self.modals.saveQuery.queryName.length < 2;
    },
    runQueryDisabled: function() {
      const self = this;
      return self.loading || !self.areAllQueriesValid;
    },
    areAllQueriesValid: function() {
      const self = this;

      function checkIfEntityAndChildrenAreValid(entity) {
        const keys = Object.keys(entity);
        let response = true;

        if (keys.includes('value')){
          if (entity.value.toString().length === 0){
            response = false;
          }
        } else if (keys.includes('rules')){
          for (let i = 0; i < entity.rules.length; i++){
            const rule = entity.rules[i];
            if (!checkIfEntityAndChildrenAreValid(rule)){
              response = false;
            }
          }
        }

        return response;
      }

      return checkIfEntityAndChildrenAreValid(self.currentQuery);
    }
  },
  created: function() {
    const self = this;

    self.getAndStoreSavedQueries();
    
    const storedQueries = self.getStoredQueries();
    if (storedQueries){
      self.currentQuery = JSON.parse(JSON.stringify(storedQueries));
    } else {
      self.resetToDefaultQuery();
    }
  },
  methods: {
    runCurrentQuery: function(){
      const self = this;
      self.loading = true;
      if (self.runQuery){
        Promise.resolve(self.runQuery(self.currentQuery)).then(function(){
          self.loading = false;
        })
      }
    },
    addUUIDsToCurrentQuery: function() {
      const self = this;

      function addUUIDsToQueryAndChildren(query){
        const keys = Object.keys(query);
        Object.defineProperty(query, '_uuid', {
          enumerable: false,
          value: uuidv4()
        })

        if (keys.includes('rules')){
          for (let i = 0; i < query.rules.length; i++){
            const rule = query.rules[i];
            addUUIDsToQueryAndChildren(rule);
          }
        }
      }

      addUUIDsToQueryAndChildren(self.currentQuery);
    },
    resetToDefaultQuery: function() {
      const self = this;

      self.currentQuery = JSON.parse(JSON.stringify(self.query));
      self.addUUIDsToCurrentQuery();
    },
    getAndStoreSavedQueries: function() {
      const self = this;
      const savedQueries = JSON.parse(localStorage.getItem(self.savedQueriesLocation));
      if (Array.isArray(savedQueries)){
        self.modals.viewSavedQueries.savedQueries = savedQueries;
      } else {
        self.modals.viewSavedQueries.savedQueries = [];
      }
      return self.modals.viewSavedQueries.savedQueries;
    },
    getStoredQueries: function() {
      const self = this;
      const storedQueries = JSON.parse(localStorage.getItem(self.storedQueriesLocation));
      if (typeof storedQueries === 'object'){
        self.storedQueries = storedQueries;
      } else {
        self.storedQueries = [];
      }
      return self.storedQueries;
    },
    saveQuery: function() {
      const self = this;
      const savedQueries = self.modals.viewSavedQueries.savedQueries;
      savedQueries.push({
        name: self.modals.saveQuery.queryName,
        createdDate: new Date(),
        query: self.currentQuery
      });
      self.saveQueries();
      self.modals.saveQuery.visible = false;
      self.modals.saveQuery.queryName = '';
    },
    loadSavedQuery: function(query) {
      const self = this;
      self.currentQuery = JSON.parse(JSON.stringify(query));
      self.addUUIDsToCurrentQuery();
      self.modals.viewSavedQueries.visible = false;
    },
    saveQueries: function() {
      const self = this;
      localStorage.setItem(self.savedQueriesLocation, JSON.stringify(self.modals.viewSavedQueries.savedQueries));
    },
    storeQueries: function() {
      const self = this;
      localStorage.setItem(self.storedQueriesLocation, JSON.stringify(self.currentQuery));
    },
    deleteSavedQuery: function(query) {
      const self = this;
      const currentSavedQueries = self.modals.viewSavedQueries.savedQueries;
      self.$bvModal.msgBoxConfirm('Please confirm that you wish to delete this query.', {
        title: 'Confirm Query Deletion',
        size: 'sm',
        buttonSize: 'sm',
        okVariant: 'danger',
        okTitle: 'Yes',
        cancelTitle: 'No',
        footerClass: 'p-2',
        hideHeaderClose: true,
        centered: true
      }).then(function(response) {
        if (response === true){
          currentSavedQueries.splice(currentSavedQueries.indexOf(query), 1);
          self.saveQueries();
        } else {
          return false;
        }
      });
    }
  },
  watch: {
    currentQuery: {
      deep: true,
      handler: function() {
        const self = this;
        self.$emit('input', self.currentQuery);
        if (self.storage){
          self.storeQueries();
        }
      }
    }
  }
}
</script>

<style lang="scss">

  .json-query-builder {
    font-size: 12px;
    user-select: none;

    * {
      font-size: 12px !important;
    }
  }

  .modal {
    font-size: 12px;

    * {
      font-size: 12px !important;
    }
  }
</style>


<docs>
VueQueryBuilder

## Examples

Standard setup:

```vue
  <template>
    <VueQueryBuilder v-bind:query="query" v-bind:options="queryOptions" />
  </template>

  <script>
    import Vue from 'vue';
    import '@/scss/custom.scss';
    import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
    Vue.use(BootstrapVue);
    Vue.use(IconsPlugin);

    export default {
      data() {
        return {
          query: {
            condition: 'and',
            rules: [{
              id: 'owner',
              operator: '!=',
              value: 0
            }, {
              id: 'price',
              operator: '<=',
              value: '80000'
            }]
          },
          queryOptions: [{
            id: 'price',
            name: 'Price',
            type: 'number'
          }, {
            id: 'date',
            name: 'Date',
            type: 'date'
          }, {
            id: 'time',
            name: 'Time',
            type: 'time'
          }, {
            id: 'owner',
            name: 'Owner',
            type: 'select',
            options: [{
              id: 0,
              name: 'Charles Smith'
            }, {
              id: 1,
              name: 'Emmy Carlton'
            }, {
              id: 2,
              name: 'Jim Bowmann'
            }, {
              id: 4,
              name: 'Karla Entwisle'
            }, {
              id: 5,
              name: 'Omar Warren'
            }, {
              id: 6,
              name: 'Samantha Lowenstein'
            }, {
              id: 7,
              name: 'Zachary Appleton'
            }]
          }, {
            id: 'phone',
            name: 'Phone',
            type: 'phone'
          }, {
            id: 'email',
            name: 'Email',
            type: 'email'
          }]
        }
      },
      methods: {
      }
    }
  </script>
```

Emit current query to parent
```vue
  <template>
    <div>
      <VueQueryBuilder v-bind:query="query" v-bind:options="queryOptions" v-model="currentQuery" />
      <strong class="mt-3 mb-1 d-block">Emitted Query:</strong>
      <b-card>
        <pre><code>{{ JSON.stringify(currentQuery, null, 4) }}</code></pre>
      </b-card>
    </div>
  </template>

  <script>
    import Vue from 'vue';
    import '@/scss/custom.scss';
    import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
    Vue.use(BootstrapVue);
    Vue.use(IconsPlugin);

    export default {
      data() {
        return {
          currentQuery: {},
          query: {
            condition: 'and',
            rules: [{
              id: 'price',
              operator: '<=',
              value: '80000'
            }]
          },
          queryOptions: [{
            id: 'price',
            name: 'Price',
            type: 'number'
          }, {
            id: 'date',
            name: 'Date',
            type: 'date'
          }, {
            id: 'time',
            name: 'Time',
            type: 'time'
          }]
        }
      },
      methods: {
      }
    }
  </script>
```

Add button to execute query
```vue
  <template>
    <VueQueryBuilder v-bind:query="query" v-bind:options="queryOptions" v-bind:run-query="viewQuery" />
  </template>

  <script>
    import Vue from 'vue';
    import '@/scss/custom.scss';
    import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
    Vue.use(BootstrapVue);
    Vue.use(IconsPlugin);

    export default {
      data() {
        return {
          query: {
            condition: 'and',
            rules: [{
              id: 'price',
              operator: '<=',
              value: '80000'
            }]
          },
          queryOptions: [{
            id: 'price',
            name: 'Price',
            type: 'number'
          }, {
            id: 'date',
            name: 'Date',
            type: 'date'
          }, {
            id: 'time',
            name: 'Time',
            type: 'time'
          }]
        }
      },
      methods: {
        viewQuery: function(query) {
          alert(JSON.stringify(query));
        }
      }
    }
  </script>
```

Add button to execute async query
```vue
  <template>
    <VueQueryBuilder v-bind:query="query" v-bind:options="queryOptions" v-bind:run-query="viewQuery" />
  </template>

  <script>
    import Vue from 'vue';
    import '@/scss/custom.scss';
    import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
    Vue.use(BootstrapVue);
    Vue.use(IconsPlugin);

    export default {
      data() {
        return {
          query: {
            condition: 'and',
            rules: [{
              id: 'price',
              operator: '<=',
              value: '80000'
            }]
          },
          queryOptions: [{
            id: 'price',
            name: 'Price',
            type: 'number'
          }, {
            id: 'date',
            name: 'Date',
            type: 'date'
          }, {
            id: 'time',
            name: 'Time',
            type: 'time'
          }]
        }
      },
      methods: {
        viewQuery: function(query) {
          return new Promise(function(resolve){
            setTimeout(function(){
              alert(JSON.stringify(query));
              resolve();
            }, 1000);
          });
        }
      }
    }
  </script>
```

Collapse query builder on load
```vue
  <template>
    <VueQueryBuilder v-bind:query="query" v-bind:options="queryOptions" v-bind:run-query="viewQuery" v-bind:visible="false" />
  </template>

  <script>
    import Vue from 'vue';
    import '@/scss/custom.scss';
    import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
    Vue.use(BootstrapVue);
    Vue.use(IconsPlugin);

    export default {
      data() {
        return {
          query: {
            condition: 'and',
            rules: [{
              id: 'price',
              operator: '<=',
              value: '80000'
            }]
          },
          queryOptions: [{
            id: 'price',
            name: 'Price',
            type: 'number'
          }, {
            id: 'date',
            name: 'Date',
            type: 'date'
          }, {
            id: 'time',
            name: 'Time',
            type: 'time'
          }]
        }
      },
      methods: {
        viewQuery: function(query) {
          return new Promise(function(resolve){
            setTimeout(function(){
              alert(JSON.stringify(query));
              resolve();
            }, 1000);
          });
        }
      }
    }
  </script>
```
</docs>
