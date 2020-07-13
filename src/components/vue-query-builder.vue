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
      v-on:click="isCollapsed = !isCollapsed"
    >
      <small class="mr-auto">Query Builder</small>
      <b-icon-caret-up-fill v-if="isCollapsed" />
      <b-icon-caret-down-fill v-else />
    </b-card-header>
    <b-card-body
      class="p-2"
      v-if="!isCollapsed"
    >
      <VueQueryGroup v-bind:current-query="currentQuery" v-bind:options="options">
        <template v-slot:ruleID="{rule, options}">
          <slot name="ruleID" :rule="rule" :options="options">
          </slot>
        </template>
        <template v-slot:ruleOperator="{rule, options}">
          <slot name="ruleOperator" :rule="rule" :options="options">
          </slot>
        </template>
        <template v-slot:select="{rule, options, multiple}">
          <slot name="select" :rule="rule" :options="options" :multiple="multiple">
          </slot>
        </template>
      </VueQueryGroup>
    </b-card-body>
    <b-card-footer
      footer-border-variant="primary"
      footer-class="json-query-builder-footer d-flex p-2"
      v-if="!isCollapsed"
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
        v-on:click="runQuery(currentQuery)"
        v-if="runQuery"
      >

        <!-- TODO: Allow for loading icon as well as disable button when runQuery is in progress -->

        Run Query <b-icon-arrow-right-circle-fill class="ml-1" />
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
    query: {
      type: Object,
      required: true
    },
    options: {
      type: Array
    },
    value: {
      type: Object,
      required: false,
      default: function(){
        return {}
      }
    },
    storage: {
      type: String,
      required: false,
      default: ''
    },
    runQuery: {
      type: [Function, Object],
      required: false,
      default: null
    }
  },
  data: function() {
    return {
      currentQuery: {},
      isCollapsed: false,
      storedQueries: '',
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
        self.storeQueries();
      }
    }
  }
}
</script>

<style lang="scss">

  .json-query-builder {
    font-size: 12px;

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
