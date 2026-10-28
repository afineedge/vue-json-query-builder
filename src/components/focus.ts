const FOCUSABLE = 'input:not([type="hidden"]), select, textarea, button, [tabindex]:not([tabindex="-1"])'

/**
 * Focuses a template ref: an element, a component that exposes `focus()`, or else the
 * component's root element (or the first focusable element inside it). Injected
 * controls work if they either expose `focus()` or render a focusable root.
 */
export function focusRef(target: unknown): boolean {
  if (!target) return false
  if (target instanceof HTMLElement) {
    target.focus()
    return true
  }
  const instance = target as { focus?: () => void; $el?: unknown }
  if (typeof instance.focus === 'function') {
    instance.focus()
    return true
  }
  const root = instance.$el
  if (!(root instanceof HTMLElement)) return false
  const el = root.matches(FOCUSABLE) ? root : root.querySelector<HTMLElement>(FOCUSABLE)
  el?.focus()
  return !!el
}
