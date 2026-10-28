import type { QueryNode } from './types'

// Row keys live outside the tree (D6) so the emitted JSON stays clean.
const nodeIds = new WeakMap<QueryNode, string>()
let nextId = 0

/** A stable key for a node, assigned the first time the node is seen. */
export function idFor(node: QueryNode): string {
  let id = nodeIds.get(node)
  if (id === undefined) {
    id = `n${++nextId}`
    nodeIds.set(node, id)
  }
  return id
}

/** Gives `to` the key of `from`, so a replacement node keeps its row (fix 1). */
export function carryId<T extends QueryNode>(from: QueryNode, to: T): T {
  if (from !== to) nodeIds.set(to, idFor(from))
  return to
}
