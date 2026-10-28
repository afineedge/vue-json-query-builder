import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type Component } from 'vue'
import VueJsonQueryBuilder from '../../src'
import type { QueryGroup } from '../../src/model'
import { fields } from '../model/fixtures'

type BuilderProps = InstanceType<typeof VueJsonQueryBuilder>['$props']
type MountOptions = { slots?: Record<string, string>; global?: { config?: { errorHandler?: (err: unknown) => void } } }

/**
 * Mounts the builder with parent-style `v-model` and `v-model:valid`: every update is fed
 * back as the new prop. Updates emitted during setup are applied once the wrapper exists.
 */
export function mountBuilder(props: Partial<BuilderProps> = {}, options: MountOptions = {}): VueWrapper {
  const holder: { wrapper?: VueWrapper } = {}
  const pending: Record<string, unknown> = {}
  const feedBack = (key: string) => (value: unknown) => {
    if (holder.wrapper) void holder.wrapper.setProps({ [key]: value })
    else pending[key] = value
  }
  const wrapper = mount(VueJsonQueryBuilder as Component, {
    attachTo: document.body,
    ...options,
    props: {
      fields,
      ...props,
      'onUpdate:modelValue': feedBack('modelValue'),
      'onUpdate:valid': feedBack('valid'),
    },
  }) as VueWrapper
  holder.wrapper = wrapper
  if (Object.keys(pending).length) void wrapper.setProps(pending)
  return wrapper
}

/** The latest `valid` the builder emitted, or `undefined` if it never changed. */
export function lastValid(wrapper: VueWrapper): boolean | undefined {
  return wrapper.emitted('update:valid')?.at(-1)?.[0] as boolean | undefined
}

/** The latest tree the builder emitted. */
export function lastQuery(wrapper: VueWrapper): QueryGroup {
  const events = wrapper.emitted('update:modelValue') ?? []
  return events[events.length - 1]![0] as QueryGroup
}

export function button(wrapper: VueWrapper, text: string, nth = 0) {
  const found = wrapper.findAll('button').filter((b) => b.text() === text || b.attributes('aria-label') === text)
  if (!found[nth]) throw new Error(`No button "${text}" (#${nth})`)
  return found[nth]
}

export const flush = async () => {
  await Promise.resolve()
  await nextTick()
}
