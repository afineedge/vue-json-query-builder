<template>
  <div id="app">
    <h1>Vue JSON Query Builder</h1>
    <VueJSONQueryBuilder v-bind:query="query" v-bind:options="queryOptions" v-model="currentQuery" v-bind:run-query="runQuery" storage="test-vue-json-query-builder">
      <template v-slot:ruleID="{rule, options}">
        <v-select
          size="sm"
          :options="options"
          :reduce="item => item.id"
          label="name"
          autocomplete="new-password"
          v-model="rule.id"
        />
      </template>
      <template v-slot:ruleOperator="{rule, options}">
        <v-select
          size="sm"
          :options="options"
          :reduce="item => item.id"
          label="name"
          autocomplete="new-password"
          v-model="rule.operator"
        />
      </template>
      <template v-slot:select="{rule, options, multiple}">
        <v-select
          size="sm"
          :options="options"
          :reduce="item => item.id"
          label="name"
          autocomplete="new-password"
          v-model="rule.value"
          :multiple="multiple"
        />
      </template>
    </VueJSONQueryBuilder>
    <strong class="mt-3 mb-1 d-block">Generated Query:</strong>
    <b-card>
      <pre><code>{{ JSON.stringify(currentQuery, null, 4) }}</code></pre>
    </b-card>
  </div>
</template>

<script>
import Vue from 'vue';

import vSelect from 'vue-select';
Vue.component('v-select', vSelect);
import "vue-select/src/scss/vue-select.scss";

import '@/scss/custom.scss';

import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

import VueJSONQueryBuilder from '@/vue-json-query-builder.vue';

export default {
  name: 'App',
  components: {
    VueJSONQueryBuilder
  },
  data: function() {
    return {
      currentQuery: {},
      query: {
        condition: 'and',
        rules: [{
          id: 'state',
          operator: 'in',
          value: ['MD', 'NJ']
        }, {
          condition: 'and',
          rules: [{
            id: 'owner',
            operator: '!=',
            value: 0
          }, {
            id: 'price',
            operator: '<=',
            value: 80000
          }]
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
        id: 'datetime',
        name: 'Datetime',
        type: 'datetime'
      }, {
        id: 'time',
        name: 'Time',
        type: 'time'
      }, {
        id: 'state',
        name: 'State',
        type: 'select',
        options: [{
          name: "Alabama",
          id: "AL"
        }, {
          name: "Alaska",
          id: "AK"
        }, {
          name: "American Samoa",
          id: "AS"
        }, {
          name: "Arizona",
          id: "AZ"
        }, {
          name: "Arkansas",
          id: "AR"
        }, {
          name: "California",
          id: "CA"
        }, {
          name: "Colorado",
          id: "CO"
        }, {
          name: "Connecticut",
          id: "CT"
        }, {
          name: "Delaware",
          id: "DE"
        }, {
          name: "District Of Columbia",
          id: "DC"
        }, {
          name: "Federated States Of Micronesia",
          id: "FM"
        }, {
          name: "Florida",
          id: "FL"
        }, {
          name: "Georgia",
          id: "GA"
        }, {
          name: "Guam",
          id: "GU"
        }, {
          name: "Hawaii",
          id: "HI"
        }, {
          name: "Idaho",
          id: "ID"
        }, {
          name: "Illinois",
          id: "IL"
        }, {
          name: "Indiana",
          id: "IN"
        }, {
          name: "Iowa",
          id: "IA"
        }, {
          name: "Kansas",
          id: "KS"
        }, {
          name: "Kentucky",
          id: "KY"
        }, {
          name: "Louisiana",
          id: "LA"
        }, {
          name: "Maine",
          id: "ME"
        }, {
          name: "Marshall Islands",
          id: "MH"
        }, {
          name: "Maryland",
          id: "MD"
        }, {
          name: "Massachusetts",
          id: "MA"
        }, {
          name: "Michigan",
          id: "MI"
        }, {
          name: "Minnesota",
          id: "MN"
        }, {
          name: "Mississippi",
          id: "MS"
        }, {
          name: "Missouri",
          id: "MO"
        }, {
          name: "Montana",
          id: "MT"
        }, {
          name: "Nebraska",
          id: "NE"
        }, {
          name: "Nevada",
          id: "NV"
        }, {
          name: "New Hampshire",
          id: "NH"
        }, {
          name: "New Jersey",
          id: "NJ"
        }, {
          name: "New Mexico",
          id: "NM"
        }, {
          name: "New York",
          id: "NY"
        }, {
          name: "North Carolina",
          id: "NC"
        }, {
          name: "North Dakota",
          id: "ND"
        }, {
          name: "Northern Mariana Islands",
          id: "MP"
        }, {
          name: "Ohio",
          id: "OH"
        }, {
          name: "Oklahoma",
          id: "OK"
        }, {
          name: "Oregon",
          id: "OR"
        }, {
          name: "Palau",
          id: "PW"
        }, {
          name: "Pennsylvania",
          id: "PA"
        }, {
          name: "Puerto Rico",
          id: "PR"
        }, {
          name: "Rhode Island",
          id: "RI"
        }, {
          name: "South Carolina",
          id: "SC"
        }, {
          name: "South Dakota",
          id: "SD"
        }, {
          name: "Tennessee",
          id: "TN"
        }, {
          name: "Texas",
          id: "TX"
        }, {
          name: "Utah",
          id: "UT"
        }, {
          name: "Vermont",
          id: "VT"
        }, {
          name: "Virgin Islands",
          id: "VI"
        }, {
          name: "Virginia",
          id: "VA"
        }, {
          name: "Washington",
          id: "WA"
        }, {
          name: "West Virginia",
          id: "WV"
        }, {
          name: "Wisconsin",
          id: "WI"
        }, {
          name: "Wyoming",
          id: "WY"
        }]
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
    runQuery: function(response){
      return new Promise(function(resolve){
        setTimeout(function(){
          alert("Your current query:\n" + JSON.stringify(response), null, 4);
          resolve();
        }, 1000);
      });
    }
  }
}
</script>

<style lang="scss" scoped>
  @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600&display=swap');

  #app {
    font-family: 'Open Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    padding: 15px;

    h1 {
      font-size: 24px;
      margin-bottom: 15px;
    }

    pre {

      code {
        font-size: 12px;
      }
    }
  }
</style>
