import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import VueJsonQueryBuilder, { VueJsonQueryBuilder as Named } from '../src'
import { fields } from './model/fixtures'

describe('package entry', () => {
  it('exports the component as default and named', () => {
    expect(Named).toBe(VueJsonQueryBuilder)
  })

  it('mounts with no accessibility violations', async () => {
    const wrapper = mount(VueJsonQueryBuilder, { props: { fields }, attachTo: document.body })
    expect(wrapper.find('[role="group"]').exists()).toBe(true)
    expect(await axe(wrapper.element)).toHaveNoViolations()
    wrapper.unmount()
  })
})
