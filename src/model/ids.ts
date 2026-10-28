import { toRaw } from 'vue'
import type { QueryNode } from './types'

// Row keys live outside the tree (D6) so the emitted JSON stays clean. Keyed by the raw
// object, because a parent holding the tree in ref()/reactive() hands back proxies of it.
const nodeIds = new WeakMap<QueryNode, string>()
let nextId = 0

/** A stable key for a node, assigned the first time the node is seen. */
export function idFor(node: QueryNode): string {
  const raw = toRaw(node)
  let id = nodeIds.get(raw)
  if (id === undefined) {
    id = `n${++nextId}`
    nodeIds.set(raw, id)
  }
  return id
}

/** Gives `to` the key of `from`, so a replacement node keeps its row (fix 1). */
export function carryId<T extends QueryNode>(from: QueryNode, to: T): T {
  if (toRaw(from) !== toRaw(to)) nodeIds.set(toRaw(to), idFor(from))
  return to
}
