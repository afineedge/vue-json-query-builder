<script>
  import Vue from 'vue';
  
  import '@/scss/custom.scss';
  import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
  Vue.use(BootstrapVue);
  Vue.use(IconsPlugin);

  import VueQueryBuilder from '@/components/vue-query-builder.vue';
</script>

<docs>
This button is amazing, use it responsibly.

## Examples

Orange button:

```vue

  <template>
    <VueQueryBuilder v-bind:query="query" v-bind:options="queryOptions" v-model="currentQuery" v-bind:run-query="runQuery"
    />
    <strong class="mt-3 mb-1 d-block">Generated Query:</strong>
    <b-card>
      <pre><code>{{ JSON.stringify(currentQuery, null, 4) }}</code></pre>
    </b-card>
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
              id: 'owner',
              operator: '!=',
              value: 0
            }, {
              id: 'price',
              operator: '<=',
              value: 80000
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
</docs>
