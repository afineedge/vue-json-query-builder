import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import VueJsonQueryBuilder from '../../src'
import { localStorageAdapter, type QueryGroup, type QueryRule } from '../../src/model'
import { fields } from '../model/fixtures'
import { button, flush, lastQuery, lastValid, mountBuilder } from './helpers'

const r = (field: string, operator: QueryRule['operator'], value: unknown): QueryRule => ({ field, operator, value })
const tree = (...rules: QueryGroup['rules']): QueryGroup => ({ condition: 'and', rules })

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('initial tree', () => {
  it('emits an AND group with one blank rule when no v-model is given', () => {
    const wrapper = mountBuilder()
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', null)))
  })

  it('emits a copy of defaultQuery when given', () => {
    const defaultQuery = tree(r('price', 'gt', 5))
    const wrapper = mountBuilder({ defaultQuery })
    expect(lastQuery(wrapper)).toEqual(defaultQuery)
    expect(lastQuery(wrapper)).not.toBe(defaultQuery)
  })

  it('emits nothing when a v-model is given', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('controlled v-model', () => {
  it('re-renders when the parent replaces the tree', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    expect(wrapper.findAll('[aria-label^="Rule "]')).toHaveLength(1)
    await wrapper.setProps({ modelValue: tree(r('name', 'eq', 'a'), r('price', 'gt', 1), r('date', 'eq', null)) })
    expect(wrapper.findAll('[aria-label^="Rule "]')).toHaveLength(3)
    expect((wrapper.find('select[aria-label="Field"]').element as HTMLSelectElement).selectedOptions[0]!.text).toBe('Name')
  })

  it('keeps a row mounted while it is edited', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    const row = wrapper.find('[aria-label="Rule 1"]').element
    await wrapper.find('input[aria-label="Value"]').setValue('ab')
    expect(wrapper.find('[aria-label="Rule 1"]').element).toBe(row)
  })
})

describe('valid model', () => {
  it('reports validity and updates it as the tree changes', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', null)), valid: true })
    expect(lastValid(wrapper)).toBe(false)
    await wrapper.find('input[aria-label="Value"]').setValue('Bob')
    expect(lastValid(wrapper)).toBe(true)
  })
})

describe('groups and rules', () => {
  it('adds a rule with the first field and adds a nested group', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'gt', 1)) })
    await button(wrapper, 'Add rule').trigger('click')
    expect(lastQuery(wrapper).rules[1]).toEqual(r('name', 'eq', null))
    await button(wrapper, 'Add group').trigger('click')
    expect(lastQuery(wrapper).rules[2]).toEqual(tree(r('name', 'eq', null)))
    expect(wrapper.findAll('[aria-label^="Group: "]')).toHaveLength(2)
  })

  it('removes a rule', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a'), r('price', 'gt', 1)) })
    await button(wrapper, 'Remove rule 1').trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'gt', 1)))
  })

  it('removes a nested group', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a'), tree(r('price', 'gt', 1))) })
    await button(wrapper, 'Remove group').trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', 'a')))
  })

  it('toggles AND/OR through the radiogroup', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    const group = wrapper.find('[role="radiogroup"]')
    expect(group.attributes('aria-label')).toBe('Match')
    const [all, any] = group.findAll('input[type="radio"]')
    expect((all!.element as HTMLInputElement).checked).toBe(true)
    await any!.setValue(true)
    expect(lastQuery(wrapper).condition).toBe('or')
    expect(wrapper.find('[aria-label^="Group: "]').attributes('aria-label')).toBe('Group: match any of the following')
  })

  it('hides Add group at maxDepth', () => {
    const deep = tree(tree(tree(r('name', 'eq', 'a'))))
    const wrapper = mountBuilder({ modelValue: deep, maxDepth: 3 })
    const groups = wrapper.findAll('[aria-label^="Group: "]')
    expect(groups).toHaveLength(3)
    expect(groups[2]!.findAll('button').some((b) => b.text() === 'Add group')).toBe(false)
    // The middle group's own Add group shows; the innermost one's (inside it) does not.
    expect(groups[1]!.findAll('button').filter((b) => b.text() === 'Add group')).toHaveLength(1)
  })

  it('disables Add rule and Add group at maxRules', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a'), r('name', 'eq', 'b')), maxRules: 2 })
    expect(button(wrapper, 'Add rule').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Add group').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('maximum of 2 rules')
  })
})

describe('field and operator changes', () => {
  it('resets the operator and value when the field changes', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'contains', 'abc')) })
    await wrapper.find('select[aria-label="Field"]').setValue('5') // Tags
    expect(lastQuery(wrapper)).toEqual(tree(r('tags', 'any_of', [])))
  })

  it('keeps the value when the arity stays the same and resets it when it changes', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'gt', 5)) })
    const operator = () => wrapper.find('select[aria-label="Operator"]')
    await operator().setValue('5') // lte
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'lte', 5)))
    await operator().setValue('6') // between
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'between', [null, null])))
  })

  it('applies operatorLabels', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')), operatorLabels: { eq: 'equals' } })
    expect(wrapper.find('select[aria-label="Operator"] option').text()).toBe('equals')
  })
})

describe('between', () => {
  it('renders Min/Max for numbers and From/To for dates', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'between', [1, 2]), r('date', 'between', [null, null])) })
    expect(wrapper.findAll('input[aria-label="Min"]')).toHaveLength(1)
    expect(wrapper.findAll('input[aria-label="Max"]')).toHaveLength(1)
    expect(wrapper.find('input[aria-label="From"]').attributes('type')).toBe('date')
    expect(wrapper.find('input[aria-label="To"]').exists()).toBe(true)
  })

  it('updates one end at a time', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'between', [null, null])) })
    await wrapper.find('input[aria-label="Max"]').setValue('9')
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'between', [null, 9])))
  })

  it('shows an inline error for a reversed range, wired with aria', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'between', [9, 1]), r('date', 'between', ['2026-02-01', '2026-01-01'])) })
    expect(wrapper.text()).toContain('Min must not exceed max.')
    expect(wrapper.text()).toContain('From must not be after To.')
    const min = wrapper.find('input[aria-label="Min"]')
    expect(min.attributes('aria-invalid')).toBe('true')
    const errorId = min.attributes('aria-describedby')!
    expect(wrapper.find(`#${errorId}`).text()).toBe('Min must not exceed max.')
  })

  it('does not show an error for a half-filled rule', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'between', [9, null]), r('name', 'eq', null)) })
    expect(wrapper.find('p.text-danger').exists()).toBe(false)
    expect(wrapper.find('[aria-invalid="true"]').exists()).toBe(false)
  })
})

describe('multi-select', () => {
  it('uses the listbox for array operators and emits selected values in option order', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('tags', 'any_of', [])) })
    const trigger = wrapper.find('button[aria-haspopup="listbox"]')
    expect(trigger.text()).toContain('Select…')
    await trigger.trigger('click')
    await flush()
    const options = wrapper.findAll('[role="option"]')
    await options[1]!.trigger('click')
    await options[0]!.trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('tags', 'any_of', ['new', 'sale'])))
    expect(wrapper.find('button[aria-haspopup="listbox"]').text()).toContain('2 selected')
  })

  it('uses a single select for eq on a select field', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('state', 'eq', 'MD')) })
    expect(wrapper.find('button[aria-haspopup="listbox"]').exists()).toBe(false)
    expect((wrapper.find('select[aria-label="Value"]').element as HTMLSelectElement).selectedOptions[0]!.text).toBe('Maryland')
  })

  it('is keyboard operable with typeahead, and Escape returns focus', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('tags', 'any_of', [])) })
    const trigger = wrapper.find('button[aria-haspopup="listbox"]')
    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await flush()
    const listbox = wrapper.find('[role="listbox"]')
    expect(document.activeElement).toBe(listbox.element)
    await listbox.trigger('keydown', { key: 's' })
    expect(listbox.attributes('aria-activedescendant')).toMatch(/option-1$/)
    await listbox.trigger('keydown', { key: ' ' })
    expect(lastQuery(wrapper)).toEqual(tree(r('tags', 'any_of', ['sale'])))
    await listbox.trigger('keydown', { key: 'Home' })
    await listbox.trigger('keydown', { key: 'Enter' })
    expect(lastQuery(wrapper)).toEqual(tree(r('tags', 'any_of', ['new', 'sale'])))
    await listbox.trigger('keydown', { key: 'Escape' })
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
  })
})

describe('injected components', () => {
  const Probe = defineComponent({
    name: 'Probe',
    props: ['modelValue', 'field', 'operator', 'options', 'multiple', 'id', 'ariaLabel', 'ariaDescribedby', 'ariaInvalid', 'disabled'],
    emits: ['update:modelValue'],
    setup: (props, { emit }) => () =>
      h('input', { class: 'probe', value: props.modelValue, onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value) }),
  })

  it('passes the D8 props to a components.input replacement', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')), components: { input: Probe } })
    const probe = wrapper.findComponent(Probe)
    expect(probe.props()).toMatchObject({
      modelValue: 'a',
      field: fields[0],
      operator: 'eq',
      multiple: false,
      ariaLabel: 'Value',
      ariaInvalid: false,
      disabled: false,
    })
    expect(probe.props('id')).toMatch(/^vjqb-n\d+-value$/)
    await probe.find('input').setValue('z')
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', 'z')))
  })

  it('uses a per-field component for that field only', () => {
    const custom = fields.map((f) => (f.field === 'price' ? { ...f, component: Probe } : f))
    const wrapper = mountBuilder({ fields: custom, modelValue: tree(r('price', 'gt', 1), r('name', 'eq', 'a')) })
    expect(wrapper.findAllComponents(Probe)).toHaveLength(1)
    expect(wrapper.findComponent(Probe).props('field')).toMatchObject({ field: 'price' })
  })

  it('passes both ends of a between to an injected number control', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'between', [1, 2])), components: { number: Probe } })
    const probes = wrapper.findAllComponents(Probe)
    expect(probes.map((p) => [p.props('ariaLabel'), p.props('modelValue')])).toEqual([['Min', 1], ['Max', 2]])
  })

  it('renders the rule-value slot with an update function', async () => {
    const wrapper = mountBuilder(
      { modelValue: tree(r('name', 'eq', 'a')) },
      {
        slots: {
          'rule-value': `<template #rule-value="{ modelValue, ariaLabel, update }">
            <button class="slotted" :aria-label="ariaLabel" @click="update('from-slot')">{{ modelValue }}</button>
          </template>`,
        },
      },
    )
    const slotted = wrapper.find('.slotted')
    expect(slotted.text()).toBe('a')
    await slotted.trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', 'from-slot')))
  })
})

describe('chrome', () => {
  it('renders no header or footer without their props', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(['Add rule', 'Add group', '×'])
  })

  it('renders a title, and collapses it when collapsible', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')), title: 'Filters', collapsible: true })
    const toggle = wrapper.find('button[aria-expanded]')
    expect(toggle.text()).toContain('Filters')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect((wrapper.find(`#${toggle.attributes('aria-controls')}`).element as HTMLElement).style.display).toBe('none')
  })

  it('Reset restores defaultQuery only when showReset is set', async () => {
    const defaultQuery = tree(r('name', 'eq', 'default'))
    const without = mountBuilder({ modelValue: tree(r('name', 'eq', 'x')), defaultQuery })
    expect(without.findAll('button').some((b) => b.text() === 'Reset')).toBe(false)
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'x')), defaultQuery, showReset: true })
    await button(wrapper, 'Reset').trigger('click')
    expect(lastQuery(wrapper)).toEqual(defaultQuery)
  })

  it('Run is disabled with a hint until a rule is complete', async () => {
    const calls: QueryGroup[] = []
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', null)), runQuery: (q: QueryGroup) => void calls.push(q) })
    const run = () => button(wrapper, 'Run query')
    expect(run().attributes('disabled')).toBeDefined()
    expect(wrapper.find(`#${run().attributes('aria-describedby')}`).text()).toBe('Complete a rule to run the query.')
    await wrapper.find('input[aria-label="Value"]').setValue('Bob')
    expect(run().attributes('aria-describedby')).toBeUndefined()
    await run().trigger('click')
    expect(calls).toEqual([tree(r('name', 'eq', 'Bob'))])
  })

  it('Run sends the pruned tree, so a half-filled rule does not block it', async () => {
    const calls: QueryGroup[] = []
    const wrapper = mountBuilder({
      modelValue: tree(r('name', 'eq', 'Bob'), r('price', 'gt', null), tree(r('date', 'eq', null))),
      runQuery: (q: QueryGroup) => void calls.push(q),
    })
    await button(wrapper, 'Run query').trigger('click')
    expect(calls).toEqual([tree(r('name', 'eq', 'Bob'))])
  })

  it('Run is disabled while an error is on screen, even if other rules are complete', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'Bob'), r('price', 'between', [9, 1])), runQuery: () => {} })
    const run = button(wrapper, 'Run query')
    expect(run.attributes('disabled')).toBeDefined()
    expect(wrapper.find(`#${run.attributes('aria-describedby')}`).text()).toBe('Fix the errors above to run the query.')
  })

  it('renders custom header and footer slots with their scope', async () => {
    const wrapper = mountBuilder(
      { modelValue: tree(r('name', 'eq', 'a')), defaultQuery: tree(r('name', 'eq', 'd')) },
      {
        slots: {
          header: '<template #header="{ collapsed }"><p class="hdr">collapsed: {{ collapsed }}</p></template>',
          footer: '<template #footer="{ reset, valid }"><button class="ftr" @click="reset">valid: {{ valid }}</button></template>',
        },
      },
    )
    expect(wrapper.find('.hdr').text()).toBe('collapsed: false')
    expect(wrapper.find('.ftr').text()).toBe('valid: true')
    await wrapper.find('.ftr').trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', 'd')))
  })

  it('disables every control when disabled', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')), disabled: true })
    const controls = wrapper.findAll('button, input, select')
    expect(controls.length).toBeGreaterThan(0)
    expect(controls.every((c) => c.attributes('disabled') !== undefined)).toBe(true)
  })
})

describe('storage', () => {
  it('loads the stored tree on mount when no v-model is given', async () => {
    const storage = localStorageAdapter('t')
    storage.persist(tree(r('name', 'eq', 'stored')))
    const wrapper = mountBuilder({ storage })
    await flush()
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', 'stored')))
  })

  it('ignores storage on mount when a v-model is given, and saves every change', async () => {
    const storage = localStorageAdapter('t')
    storage.persist(tree(r('name', 'eq', 'stored')))
    const wrapper = mountBuilder({ storage, modelValue: tree(r('name', 'eq', 'given')) })
    await flush()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.find('input[aria-label="Value"]').setValue('typed')
    expect(storage.load()).toEqual(tree(r('name', 'eq', 'typed')))
  })

  it('shows save/load buttons only with a storage adapter', () => {
    expect(mountBuilder().text()).not.toContain('Save query')
    expect(mountBuilder({ storage: localStorageAdapter('t') }).text()).toContain('Save query')
  })

  it('saves a named query and loads it back', async () => {
    const storage = localStorageAdapter('t')
    const wrapper = mountBuilder({ storage, modelValue: tree(r('name', 'eq', 'mine')) })
    await button(wrapper, 'Save query').trigger('click')
    const dialog = wrapper.findAll('dialog')[0]!
    await dialog.find('input').setValue('My query')
    await button(wrapper, 'Save').trigger('click')
    await flush()
    expect(storage.list().map((q) => q.name)).toEqual(['My query'])

    await wrapper.setProps({ modelValue: tree(r('name', 'eq', 'other')) })
    await button(wrapper, 'Saved queries').trigger('click')
    await flush()
    await button(wrapper, 'Load My query').trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', 'mine')))
  })

  it('rejects a name shorter than 2 characters', async () => {
    const storage = localStorageAdapter('t')
    const wrapper = mountBuilder({ storage, modelValue: tree(r('name', 'eq', 'mine')) })
    await button(wrapper, 'Save query').trigger('click')
    await wrapper.findAll('dialog')[0]!.find('input').setValue(' a ')
    await button(wrapper, 'Save').trigger('click')
    await flush()
    expect(storage.list()).toEqual([])
    expect(wrapper.text()).toContain('at least 2 characters')
  })
})

describe('mounting', () => {
  it('works with a plain mount and no listeners', async () => {
    const wrapper = mount(VueJsonQueryBuilder, { props: { fields } })
    await nextTick()
    expect(wrapper.find('[aria-label="Rule 1"]').exists()).toBe(true)
  })
})

describe('a null or missing v-model', () => {
  it('emits a starting tree when mounted with null', async () => {
    const wrapper = mountBuilder({ modelValue: null })
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', null)))
    await flush()
    expect(wrapper.find('[aria-label="Rule 1"]').exists()).toBe(true)
  })

  it('starts over when the parent clears the tree after mount', async () => {
    const defaultQuery = tree(r('price', 'gt', 1))
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')), defaultQuery })
    await wrapper.setProps({ modelValue: undefined })
    await flush()
    expect(lastQuery(wrapper)).toEqual(defaultQuery)
    await wrapper.setProps({ modelValue: null })
    await flush()
    expect(lastQuery(wrapper)).toEqual(defaultQuery)
    expect(wrapper.find('[aria-label="Rule 1"]').exists()).toBe(true)
  })

  it('falls back to the starting tree when storage holds something that is not a query', async () => {
    localStorage.setItem('vue-json-query-builder:t:current', '{"not":"a query"}')
    const wrapper = mountBuilder({ storage: localStorageAdapter('t') })
    await flush()
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', null)))
  })

  it('works with an adapter that has no load or persist', async () => {
    const saved: string[] = []
    const storage = {
      save: (query: QueryGroup, name: string) => (saved.push(name), { id: name, name, query, savedAt: '' }),
      list: () => [],
      remove: () => {},
    }
    const wrapper = mountBuilder({ storage })
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', null)))
    await button(wrapper, 'Save query').trigger('click')
    await wrapper.findAll('dialog')[0]!.find('input').setValue('Mine')
    await button(wrapper, 'Save').trigger('click')
    await flush()
    expect(saved).toEqual(['Mine'])
  })
})

describe('default number input', () => {
  it('keeps what the user typed when it already means the value, so decimals can be entered', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'eq', null)) })
    const input = () => wrapper.find('input[aria-label="Value"]')
    await input().setValue('1.0')
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'eq', 1)))
    expect((input().element as HTMLInputElement).value).toBe('1.0')
    await input().setValue('1.05')
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'eq', 1.05)))
  })

  it('shows a new value set from outside', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'eq', 1)) })
    await wrapper.find('input[aria-label="Value"]').setValue('1.0')
    await wrapper.setProps({ modelValue: tree(r('price', 'eq', 42)) })
    expect((wrapper.find('input[aria-label="Value"]').element as HTMLInputElement).value).toBe('42')
  })
})

describe('rule problems', () => {
  it('shows an error for a select value that is not an option, and blocks validity', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('state', 'eq', 'TX')), valid: true })
    expect(wrapper.text()).toContain('"TX" isn’t one of the options'.replace('’', "'"))
    expect(wrapper.find('select[aria-label="Value"]').attributes('aria-invalid')).toBe('true')
    expect(lastValid(wrapper)).toBe(false)
  })

  it('lists unknown values in a multi-select, and a toggle drops them', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('tags', 'any_of', ['new', 'gone', 'old'])) })
    expect(wrapper.text()).toContain('Not in the options: gone, old')
    await wrapper.find('button[aria-haspopup="listbox"]').trigger('click')
    await flush()
    await wrapper.findAll('[role="option"]')[1]!.trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('tags', 'any_of', ['new', 'sale'])))
  })

  it('shows an error for an operator the field does not offer', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'contains', 5)) })
    expect(wrapper.text()).toContain('Price doesn’t offer "contains"'.replace('’', "'"))
    expect(wrapper.find('select[aria-label="Operator"]').attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('input[aria-label="Value"]').attributes('aria-invalid')).toBeUndefined()
  })

  it('outlines the active multi-select option, not just tints it', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('tags', 'any_of', [])) })
    await wrapper.find('button[aria-haspopup="listbox"]').trigger('click')
    await flush()
    expect(wrapper.findAll('[role="option"]')[0]!.classes()).toContain('outline-primary')
  })
})

describe('malformed trees', () => {
  it('repairs a tree with bad nodes instead of crashing', async () => {
    const broken = { condition: 'xor', rules: [null, 'x', { field: 'name', operator: 'eq', value: 'a' }, { condition: 'or' }] }
    const wrapper = mountBuilder({ modelValue: broken as unknown as QueryGroup })
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', 'a')))
    await flush()
    expect(wrapper.find('[aria-label="Rule 1"]').exists()).toBe(true)
  })

  it('falls back to the starting tree when the value is not a query at all', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    await wrapper.setProps({ modelValue: { not: 'a query' } as unknown as QueryGroup })
    await flush()
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', null)))
  })
})

describe('storage writes', () => {
  it('persists one write at a time and finishes on the latest tree', async () => {
    const written: string[] = []
    let release!: () => void
    const storage = {
      persist: (q: QueryGroup) =>
        new Promise<void>((resolve) => {
          written.push((q.rules[0] as QueryRule).value as string)
          release = resolve
        }),
      save: (query: QueryGroup, name: string) => ({ id: name, name, query, savedAt: '' }),
      list: () => [],
      remove: () => {},
    }
    const wrapper = mountBuilder({ storage, modelValue: tree(r('name', 'eq', 'a')) })
    const input = wrapper.find('input[aria-label="Value"]')
    await input.setValue('b')
    await flush()
    await input.setValue('c')
    await input.setValue('d')
    await flush()
    expect(written).toEqual(['b'])
    release()
    await flush()
    await flush()
    expect(written).toEqual(['b', 'd'])
  })

  it('shows an error in the Save dialog when saving fails', async () => {
    const storage = {
      save: () => {
        throw new Error('disk full')
      },
      list: () => [],
      remove: () => {},
    }
    const wrapper = mountBuilder({ storage, modelValue: tree(r('name', 'eq', 'a')) })
    await button(wrapper, 'Save query').trigger('click')
    await wrapper.findAll('dialog')[0]!.find('input').setValue('Mine')
    await button(wrapper, 'Save').trigger('click')
    await flush()
    expect(wrapper.text()).toContain("Couldn't save the query: disk full")
  })
})

describe('operator labels', () => {
  it('uses date and time wording, and lets operatorLabels override it', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('date', 'gt', '2026-01-01'), r('time', 'lte', '09:00'), r('price', 'gt', 1)) })
    const selected = () => wrapper.findAll('select[aria-label="Operator"]').map((s) => (s.element as HTMLSelectElement).selectedOptions[0]!.text)
    expect(selected()).toEqual(['is after', 'is at or before', 'is greater than'])
    const overridden = mountBuilder({ modelValue: tree(r('date', 'gt', '2026-01-01')), operatorLabels: { gt: 'later than' } })
    expect((overridden.find('select[aria-label="Operator"]').element as HTMLSelectElement).selectedOptions[0]!.text).toBe('later than')
  })
})
