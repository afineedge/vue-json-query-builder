import type { VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { localStorageAdapter, type QueryGroup, type QueryRule } from '../../src/model'
import { button, flush, lastQuery, mountBuilder } from './helpers'

const r = (field: string, operator: QueryRule['operator'], value: unknown): QueryRule => ({ field, operator, value })
const tree = (...rules: QueryGroup['rules']): QueryGroup => ({ condition: 'and', rules })

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

const settle = async () => {
  await flush()
  await flush()
}

const fieldSelects = (wrapper: VueWrapper) => wrapper.findAll('select[aria-label="Field"]').map((w) => w.element)
const liveText = (wrapper: VueWrapper) => wrapper.find('[aria-live="polite"]').text()

describe('axe', () => {
  it('finds no violations in a default render', async () => {
    const wrapper = mountBuilder()
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })

  it('finds no violations in a nested render with every field type and the chrome', async () => {
    const wrapper = mountBuilder({
      modelValue: tree(
        r('name', 'contains', 'a'),
        tree(r('price', 'between', [1, 2]), tree(r('date', 'gte', '2026-01-01'), r('time', 'eq', '09:00'))),
        r('state', 'in', ['MD']),
        r('tags', 'all_of', ['new']),
      ),
      title: 'Filters',
      collapsible: true,
      runQuery: () => {},
      defaultQuery: tree(r('name', 'eq', 'a')),
      showReset: true,
      storage: localStorageAdapter('a11y'),
    })
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })

  it('finds no violations in an invalid render', async () => {
    const wrapper = mountBuilder({
      modelValue: tree(r('price', 'between', [9, 1]), r('ghost', 'eq', 'x'), r('date', 'between', ['2026-02-01', '2026-01-01'])),
    })
    expect(wrapper.findAll('[aria-invalid="true"]').length).toBeGreaterThan(0)
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })

  it('finds no violations with the multi-select open', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('tags', 'any_of', ['sale'])) })
    await wrapper.find('button[aria-haspopup="listbox"]').trigger('click')
    await flush()
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})

describe('labels', () => {
  it('labels each rule and group, its controls, and its remove button', () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a'), tree(r('price', 'gt', 1), r('price', 'lt', 9))) })
    expect(wrapper.findAll('[role="group"]').map((g) => g.attributes('aria-label'))).toEqual([
      'Group: match all of the following',
      'Rule 1',
      'Group: match all of the following',
      'Rule 1',
      'Rule 2',
    ])
    const rule = wrapper.find('[aria-label="Rule 1"]')
    expect(rule.find('[aria-label="Field"]').exists()).toBe(true)
    expect(rule.find('[aria-label="Operator"]').exists()).toBe(true)
    expect(rule.find('[aria-label="Value"]').exists()).toBe(true)
    expect(rule.find('button[aria-label="Remove rule 1"]').exists()).toBe(true)
  })
})

describe('radiogroup', () => {
  it('moves between All and Any with the arrow keys, selecting and focusing', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    const radios = () => wrapper.findAll('[role="radiogroup"] input[type="radio"]')
    expect(new Set(radios().map((r) => r.attributes('name'))).size).toBe(1)

    await radios()[0]!.trigger('keydown', { key: 'ArrowRight' })
    await settle()
    expect(lastQuery(wrapper).condition).toBe('or')
    expect(document.activeElement).toBe(radios()[1]!.element)
    expect((radios()[1]!.element as HTMLInputElement).checked).toBe(true)

    await radios()[1]!.trigger('keydown', { key: 'ArrowDown' })
    await settle()
    expect(lastQuery(wrapper).condition).toBe('and')
    expect(document.activeElement).toBe(radios()[0]!.element)

    await radios()[0]!.trigger('keydown', { key: 'ArrowUp' })
    await settle()
    expect(lastQuery(wrapper).condition).toBe('or')
  })

  it('ignores arrow keys when disabled', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')), disabled: true })
    await wrapper.find('[role="radiogroup"] input').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('focus', () => {
  it('focuses the field select of a new rule', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    await button(wrapper, 'Add rule').trigger('click')
    await settle()
    expect(document.activeElement).toBe(fieldSelects(wrapper)[1])
  })

  it('focuses the field select of a new group', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    await button(wrapper, 'Add group').trigger('click')
    await settle()
    const group = wrapper.findAll('[aria-label^="Group: "]')[1]!
    expect(document.activeElement).toBe(group.find('select[aria-label="Field"]').element)
  })

  it('focuses the previous sibling after a removal', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a'), r('name', 'eq', 'b'), r('name', 'eq', 'c')) })
    await button(wrapper, 'Remove rule 3').trigger('click')
    await settle()
    expect(document.activeElement).toBe(fieldSelects(wrapper)[1])
  })

  it('focuses the group Add rule button after removing its first rule', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a'), r('name', 'eq', 'b')) })
    await button(wrapper, 'Remove rule 1').trigger('click')
    await settle()
    expect(document.activeElement).toBe(button(wrapper, 'Add rule').element)
  })

  it('focuses the previous sibling of a nested group removed by deleting its last rule', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a'), tree(r('price', 'gt', 1))) })
    await button(wrapper, 'Remove rule 1', 1).trigger('click')
    await settle()
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', 'a')))
    expect(document.activeElement).toBe(fieldSelects(wrapper)[0])
  })

  it('focuses the parent Add rule button when a first-child group is removed', async () => {
    const wrapper = mountBuilder({ modelValue: tree(tree(r('price', 'gt', 1)), r('name', 'eq', 'a')) })
    await button(wrapper, 'Remove group').trigger('click')
    await settle()
    expect(document.activeElement).toBe(button(wrapper, 'Add rule').element)
  })

  it('focuses the root Add rule button when the last root rule is replaced by a blank one', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'gt', 1)) })
    await button(wrapper, 'Remove rule 1').trigger('click')
    await settle()
    expect(lastQuery(wrapper)).toEqual(tree(r('name', 'eq', null)))
    expect(document.activeElement).toBe(button(wrapper, 'Add rule').element)
  })
})

describe('live region', () => {
  it('has exactly one polite live region per builder', () => {
    mountBuilder()
    mountBuilder()
    const regions = document.querySelectorAll('[aria-live]')
    expect(regions).toHaveLength(2)
    regions.forEach((region) => expect(region.getAttribute('aria-live')).toBe('polite'))
  })

  it('announces added and removed rules and groups', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    await button(wrapper, 'Add rule').trigger('click')
    await settle()
    expect(liveText(wrapper)).toBe('Rule added')
    await button(wrapper, 'Add group').trigger('click')
    await settle()
    expect(liveText(wrapper)).toBe('Group added')
    await button(wrapper, 'Remove group').trigger('click')
    await settle()
    expect(liveText(wrapper)).toBe('Group removed')
    await button(wrapper, 'Remove rule 2').trigger('click')
    await settle()
    expect(liveText(wrapper)).toBe('Rule removed')
  })

  it('announces an inline error when it appears, not on first render', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'between', [1, 5])) })
    expect(liveText(wrapper)).toBe('')
    await wrapper.find('input[aria-label="Min"]').setValue('9')
    await settle()
    expect(liveText(wrapper)).toBe('Min must not exceed max')
  })

  it('re-announces a repeated message', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    await button(wrapper, 'Add rule').trigger('click')
    await settle()
    const region = wrapper.find('[aria-live="polite"]').element
    const seen: string[] = []
    const observer = new MutationObserver(() => seen.push(region.textContent!.trim()))
    observer.observe(region, { childList: true, characterData: true, subtree: true })
    await button(wrapper, 'Add rule').trigger('click')
    await settle()
    observer.disconnect()
    // Cleared first, so assistive tech sees a change even for the same text.
    expect(seen).toEqual(['', 'Rule added'])
  })
})
