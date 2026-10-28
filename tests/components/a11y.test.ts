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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
/** Live-region messages are set 50 ms after the region is cleared. */
const announced = () => wait(80)

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
    await announced()
    expect(liveText(wrapper)).toBe('Rule added')
    await button(wrapper, 'Add group').trigger('click')
    await settle()
    await announced()
    expect(liveText(wrapper)).toBe('Group added')
    await button(wrapper, 'Remove group').trigger('click')
    await settle()
    await announced()
    expect(liveText(wrapper)).toBe('Group removed')
    await button(wrapper, 'Remove rule 2').trigger('click')
    await settle()
    await announced()
    expect(liveText(wrapper)).toBe('Rule removed')
  })

  it('announces an inline error when it appears, not on first render', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'between', [1, 5])) })
    expect(liveText(wrapper)).toBe('')
    await wrapper.find('input[aria-label="Min"]').setValue('9')
    await settle()
    // Errors wait for typing to pause before they're read out.
    await wait(300)
    expect(liveText(wrapper)).toBe('')
    await wait(400)
    expect(liveText(wrapper)).toBe('Min must not exceed max.')
  })

  it('does not announce an error that is fixed before typing pauses', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('price', 'between', [1, 5])) })
    await wrapper.find('input[aria-label="Min"]').setValue('9')
    await settle()
    await wrapper.find('input[aria-label="Min"]').setValue('2')
    await settle()
    await wait(700)
    expect(liveText(wrapper)).toBe('')
  })

  it('re-announces a repeated message', async () => {
    const wrapper = mountBuilder({ modelValue: tree(r('name', 'eq', 'a')) })
    await button(wrapper, 'Add rule').trigger('click')
    await settle()
    await announced()
    const region = wrapper.find('[aria-live="polite"]').element
    const seen: string[] = []
    const observer = new MutationObserver(() => seen.push(region.textContent!.trim()))
    observer.observe(region, { childList: true, characterData: true, subtree: true })
    await button(wrapper, 'Add rule').trigger('click')
    await settle()
    await announced()
    observer.disconnect()
    // Cleared first, so assistive tech sees a change even for the same text.
    expect(seen).toEqual(['', 'Rule added'])
  })
})

describe('focus in the chrome', () => {
  it('keeps focus on Run while the query runs', async () => {
    let finish!: () => void
    const wrapper = mountBuilder({
      modelValue: tree(r('name', 'eq', 'a')),
      runQuery: () => new Promise<void>((resolve) => (finish = resolve)),
    })
    const run = button(wrapper, 'Run query')
    ;(run.element as HTMLElement).focus()
    await run.trigger('click')
    const running = button(wrapper, 'Running…')
    expect(running.attributes('disabled')).toBeUndefined()
    expect(running.attributes('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(running.element)
    finish()
    await settle()
    expect(document.activeElement).toBe(button(wrapper, 'Run query').element)
  })

  it('moves focus through the delete confirmation and lands on the next entry', async () => {
    const storage = localStorageAdapter('focus')
    storage.save(tree(r('name', 'eq', 'a')), 'Alpha')
    storage.save(tree(r('name', 'eq', 'b')), 'Bravo')
    const wrapper = mountBuilder({ storage, modelValue: tree(r('name', 'eq', 'x')) })
    await button(wrapper, 'Saved queries').trigger('click')
    await settle()

    await button(wrapper, 'Delete Alpha').trigger('click')
    await settle()
    expect(document.activeElement).toBe(button(wrapper, 'Confirm delete Alpha').element)

    await button(wrapper, 'Keep Alpha').trigger('click')
    await settle()
    expect(document.activeElement).toBe(button(wrapper, 'Delete Alpha').element)

    await button(wrapper, 'Delete Alpha').trigger('click')
    await settle()
    await button(wrapper, 'Confirm delete Alpha').trigger('click')
    await settle()
    expect(storage.list().map((q) => q.name)).toEqual(['Bravo'])
    expect(document.activeElement).toBe(button(wrapper, 'Load Bravo').element)

    await button(wrapper, 'Delete Bravo').trigger('click')
    await settle()
    await button(wrapper, 'Confirm delete Bravo').trigger('click')
    await settle()
    expect((document.activeElement as HTMLElement).textContent).toContain('No saved queries yet')
  })

  it('focuses the Name field when the Save dialog opens and when the name is too short', async () => {
    const wrapper = mountBuilder({ storage: localStorageAdapter('focus'), modelValue: tree(r('name', 'eq', 'x')) })
    await button(wrapper, 'Save query').trigger('click')
    await settle()
    const input = wrapper.findAll('dialog')[0]!.find('input')
    expect(document.activeElement).toBe(input.element)
    ;(button(wrapper, 'Save').element as HTMLElement).focus()
    await button(wrapper, 'Save').trigger('click')
    await settle()
    expect(document.activeElement).toBe(input.element)
    expect(input.attributes('aria-invalid')).toBe('true')
  })

  it('reserves the error line, so the dialog buttons do not move when it appears', async () => {
    const wrapper = mountBuilder({ storage: localStorageAdapter('focus'), modelValue: tree(r('name', 'eq', 'x')) })
    await button(wrapper, 'Save query').trigger('click')
    const errorLine = () => wrapper.findAll('dialog')[0]!.find('p.min-h-5')
    expect(errorLine().exists()).toBe(true)
    expect(errorLine().text()).toBe('')
    await wrapper.findAll('dialog')[0]!.find('input').trigger('blur')
    expect(errorLine().text()).toContain('at least 2 characters')
  })
})
