import type { FunctionalComponent, Slot } from 'vue'

/** Renders a slot function handed down through context, with the given scope. */
const RenderSlot: FunctionalComponent<{ render: Slot; scope: Record<string, unknown> }> = (props) =>
  props.render(props.scope)
RenderSlot.props = ['render', 'scope']

export default RenderSlot
