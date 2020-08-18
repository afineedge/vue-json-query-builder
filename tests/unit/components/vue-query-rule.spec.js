import '../localStorage';

import Vue from 'vue';
import '@/scss/custom.scss';
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

import { expect } from 'chai'
import { mount } from '@vue/test-utils'
import ParentComponentForRule from './ParentComponentForRule.vue'
import VueQueryRule from '@/components/vue-query-rule.vue'

describe('ParentComponentForRule.vue', () => {
	it('renders with mounted component', () => {
		const data = {
			currentQuery: {
				rules: [{
					id: 'owner',
					operator: '=',
					value: 0
				}]
			},
			queryOptions: [{
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
			}]
		};

		const wrapper = mount(ParentComponentForRule, {
			propsData: { 
				currentQuery: data.currentQuery,
				options: data.queryOptions,
			}
		});

		expect(wrapper.findComponent(VueQueryRule).exists()).to.equal(true);
	});

	it('deletes rule when "Delete Rule" button pressed', () => {
		const data = {
			currentQuery: {
				rules: [{
					id: 'owner',
					operator: '=',
					value: 0
				}]
			},
			queryOptions: [{
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
			}]
		};

		const wrapper = mount(ParentComponentForRule, {
			propsData: {
				currentQuery: data.currentQuery,
				options: data.queryOptions
			}
		});

		const deleteRuleButton = wrapper.find('.vue-query-builder-delete-rule');

		deleteRuleButton.trigger('click');

		expect(wrapper.vm.currentQuery.rules.length).to.equal(0);
	});

	it('resets rule operator when invalid with current operator parameters', () => {
		const data = {
			currentQuery: {
				rules: [{
					id: 'owner',
					operator: '=',
					value: 0
				}]
			},
			queryOptions: [{
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
			}]
		};

		const wrapper = mount(ParentComponentForRule, {
			propsData: {
				currentQuery: data.currentQuery,
				options: data.queryOptions
			}
		});

		const ruleComponent = wrapper.findComponent(VueQueryRule).vm;

		wrapper.vm.currentQuery.rules[0].operator = 'in';

		Vue.nextTick(function(){
			Vue.nextTick(function(){
				console.log(ruleComponent.rule);
				expect(Array.isArray(ruleComponent.rule.value)).to.equal(true);
			})
		})
	});
});
