// Component-level regression tests for the 0.1.41 bugs (D10). Fixes 1, 5, 6 (adapter), 12 and the
// model side of 9 and 13 are covered in tests/model.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_OPERATORS, localStorageAdapter, type QueryGroup, type QueryRule } from '../../src/model'
import { fields } from '../model/fixtures'
import { button, flush, lastQuery, lastValid, mountBuilder } from './helpers'

const r = (field: string, operator: QueryRule['operator'], value: unknown): QueryRule => ({ field, operator, value })
const tree = (...rules: QueryGroup['rules']): QueryGroup => ({ condition: 'and', rules })

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('D10 regressions', () => {
  it('fix 1: rows keep their keys when a restored query is edited', async () => {
    const restored = JSON.parse(JSON.stringify(tree(r('name', 'eq', 'a'), r('price', 'gt', 1)))) as QueryGroup
    const wrapper = mountBuilder({ modelValue: restored })
    const second = wrapper.find('[aria-label="Rule 2"]').element
    await wrapper.find('input[aria-label="Value"]').setValue('changed')
    expect(wrapper.find('[aria-label="Rule 2"]').element).toBe(second)
  })

  it('fix 2: never mutates the tree it was given', async () => {
    const given = deepFreeze(tree(r('name', 'eq', 'a'), tree(r('price', 'gt', 1), r('price', 'lt', 9))))
    const snapshot = JSON.stringify(given)
    const wrapper = mountBuilder({ modelValue: given })
    await wrapper.find('input[aria-label="Value"]').setValue('b')
    await button(wrapper, 'Add rule').trigger('click')
    await button(wrapper, 'Remove rule 1', 1).trigger('click')
    await button(wrapper, 'Remove rule 1').trigger('click')
    expect(JSON.stringify(given)).toBe(snapshot)
    expect(lastQuery(wrapper)).not.toBe(given)
  })

  it('fix 3: v-model is two-way; the given tree renders and a new one replaces it', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'first')) })
    expect((wrapper.find('input[aria-label="Value"]').element as HTMLInputElement).value).toBe('first')
    await wrapper.setProps({ modelValue: tree(r('name', 'eq', 'second')) })
    expect((wrapper.find('input[aria-label="Value"]').element as HTMLInputElement).value).toBe('second')
  })

  it('fix 4: every supported field type has a value control, and there is no month type', () => {
    expect(Object.keys(DEFAULT_OPERATORS).sort()).toEqual(['date', 'number', 'select', 'text', 'time'])
    const wrapper = mountBuilder({
      modelValue: tree(r('name', 'eq', null), r('price', 'eq', null), r('date', 'eq', null), r('time', 'eq', null), r('state', 'eq', null), r('tags', 'any_of', [])),
    })
    const rules = wrapper.findAll('[aria-label^="Rule "]')
    expect(rules).toHaveLength(6)
    for (const rule of rules) expect(rule.find('[aria-label="Value"], [aria-label^="Value:"]').exists()).toBe(true)
  })

  it('fix 6: deleting a saved query in the dialog deletes that one, after confirming', async () => {
    const storage = localStorageAdapter('t')
    storage.save(tree(r('name', 'eq', 'a')), 'Alpha')
    storage.save(tree(r('name', 'eq', 'b')), 'Bravo')
    storage.save(tree(r('name', 'eq', 'c')), 'Charlie')
    const wrapper = mountBuilder({ storage, modelValue: tree(r('name', 'eq', 'x')) })
    await button(wrapper, 'Saved queries').trigger('click')
    await flush()
    await button(wrapper, 'Delete Alpha').trigger('click')
    expect(wrapper.text()).toContain('Delete “Alpha”?')
    expect(storage.list()).toHaveLength(3)
    await button(wrapper, 'Delete').trigger('click')
    await flush()
    expect(storage.list().map((q) => q.name)).toEqual(['Bravo', 'Charlie'])
  })

  it('fix 7: a rule with an unknown field renders an invalid, removable state instead of throwing', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('ghost', 'eq', 'boo'), r('name', 'eq', 'a')), valid: true })
    expect(wrapper.text()).toContain('Unknown field "ghost"')
    expect(wrapper.text()).toContain('boo')
    expect(wrapper.find('select[aria-label="Field"]').attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('[aria-label="Rule 1"] input').exists()).toBe(false)
    expect(lastValid(wrapper)).toBe(false)
    await button(wrapper, 'Remove rule 1').trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', 'a')))
    expect(lastValid(wrapper)).toBe(true)
  })

  it('fix 8: a rejected runQuery still resets loading, and the tree is inert while it runs', async () => {
    let reject!: (e: Error) => void
    const runQuery = () => new Promise((_, rej) => (reject = rej))
    const errors: unknown[] = []
    const wrapper = mountBuilder(
      { modelValue: tree(r('name', 'eq', 'a')), runQuery },
      { global: { config: { errorHandler: (e) => void errors.push(e) } } },
    )
    await button(wrapper, 'Run query').trigger('click')
    expect(wrapper.find('[inert]').exists()).toBe(true)
    expect(button(wrapper, 'Running…').attributes('disabled')).toBeDefined()
    expect(wrapper.find('input[aria-label="Value"]').attributes('disabled')).toBeDefined()
    reject(new Error('server down'))
    await flush()
    await flush()
    expect(wrapper.find('[inert]').exists()).toBe(false)
    expect(button(wrapper, 'Run query').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('input[aria-label="Value"]').attributes('disabled')).toBeUndefined()
    expect(errors).toHaveLength(1)
  })

  it('fix 9: with no fields, Add rule is disabled with a hint instead of crashing', () => {
    const wrapper = mountBuilder({ fields: [] })
    expect(button(wrapper, 'Add rule').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('No fields are available')
  })

  it('fix 10: number controls emit numbers, and null when cleared', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'eq', null)) })
    const input = wrapper.find('input[aria-label="Value"]')
    expect(input.attributes('type')).toBe('number')
    await input.setValue('42.5')
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'eq', 42.5)))
    await input.setValue('')
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'eq', null)))
  })

  it('fix 10: strings from an injected number control are coerced to numbers', async () => {
    const { defineComponent, h } = await import('vue')
    const StringNumber = defineComponent({
      props: ['modelValue'],
      emits: ['update:modelValue'],
      setup: (_, { emit }) => () => h('button', { class: 'sn', onClick: () => emit('update:modelValue', '1,000'.replace(',', '')) }),
    })
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'eq', null)), components: { number: StringNumber } })
    await wrapper.find('.sn').trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'eq', 1000)))
  })

  it('fix 11: components ship no global or unscoped styles', () => {
    const dir = join(__dirname, '../../src/components')
    const vueFiles = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? vueFiles(join(d, e.name)) : e.name.endsWith('.vue') ? [join(d, e.name)] : []))
    const files = vueFiles(dir)
    expect(files.length).toBeGreaterThan(5)
    for (const file of files) expect(readFileSync(file, 'utf8')).not.toMatch(/<style/)
    expect(readFileSync(join(dir, '../theme.css'), 'utf8')).not.toMatch(/!important|\.modal/)
  })

  it('fix 12: contains on a text field takes a single value, not a list', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'contains', 'in')) })
    const input = wrapper.find('input[aria-label="Value"]')
    expect((input.element as HTMLInputElement).value).toBe('in')
    expect(input.attributes('placeholder')).toBeUndefined()
  })

  it('fix 13: deleting the last rule removes a nested group, and leaves one blank rule at the root', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'gt', 1), tree(r('name', 'eq', 'a'))), valid: true })
    await button(wrapper, 'Remove rule 1', 1).trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('price', 'gt', 1)))
    await button(wrapper, 'Remove rule 1').trigger('click')
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', null)))
    expect(lastValid(wrapper)).toBe(false)
  })
})

// Keep the fixture import used even if the field list changes.
void fields
