import '../localStorage';

import Vue from 'vue';
import '@/scss/custom.scss';
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

import { expect } from 'chai'
import { mount } from '@vue/test-utils'
import VueQueryBuilder from '@/components/vue-query-builder.vue'

describe('VueQueryBuilder.vue', () => {
	it('renders query when passed', () => {
		const data = {
			currentQuery: {},
			query: {
				condition: 'and',
				rules: [{
					id: 'price',
					operator: '<=',
					value: '80000'
				}],
			},
			queryOptions: [{
				id: 'price',
				name: 'Price',
				type: 'number'
			}]
		};

		let hasQueryBeenRun = false;
		const runQuery = function (){
			hasQueryBeenRun = true;
		};

		const wrapper = mount(VueQueryBuilder, {
			propsData: { 
				query: data.query,
				options: data.queryOptions,
				runQuery: runQuery
			}
		});
		const runQueryButton = wrapper.find('.vue-query-builder-run-query');

		runQueryButton.trigger('click');

		expect(hasQueryBeenRun).to.equal(true);
	});
});
