import { carryId } from './ids'
import type { NodePath, QueryGroup, QueryNode } from './types'

export function isGroup(node: QueryNode): node is QueryGroup {
  return 'rules' in node && Array.isArray(node.rules)
}

export function getNode(tree: QueryGroup, path: NodePath): QueryNode | undefined {
  let node: QueryNode | undefined = tree
  for (const index of path) {
    if (!node || !isGroup(node)) return undefined
    node = node.rules[index]
  }
  return node
}

/**
 * Returns a new tree with the node at `path` replaced by `fn(node)`. The replacement and
 * every copied ancestor keep their predecessor's id. Untouched siblings are reused as-is.
 */
export function updateNode(tree: QueryGroup, path: NodePath, fn: (node: QueryNode) => QueryNode): QueryGroup {
  const result = updateAt(tree, path, 0, fn)
  if (!isGroup(result)) throw new TypeError('The root of a query must be a group')
  return result
}

function updateAt(node: QueryNode, path: NodePath, depth: number, fn: (node: QueryNode) => QueryNode): QueryNode {
  if (depth === path.length) return carryId(node, fn(node))
  const index = path[depth]!
  if (!isGroup(node) || index < 0 || index >= node.rules.length) {
    throw new RangeError(`No node at path [${path.join(', ')}]`)
  }
  const rules = node.rules.slice()
  rules[index] = updateAt(node.rules[index]!, path, depth + 1, fn)
  return carryId(node, { ...node, rules })
}

export function replaceNode(tree: QueryGroup, path: NodePath, replacement: QueryNode): QueryGroup {
  return updateNode(tree, path, () => replacement)
}

/** Inserts `node` into the group at `groupPath`, at `index` (default: the end). */
export function insertNode(tree: QueryGroup, groupPath: NodePath, node: QueryNode, index?: number): QueryGroup {
  return updateNode(tree, groupPath, (group) => {
    if (!isGroup(group)) throw new TypeError(`Node at [${groupPath.join(', ')}] is not a group`)
    const rules = group.rules.slice()
    rules.splice(index ?? rules.length, 0, node)
    return { ...group, rules }
  })
}

export function removeNode(tree: QueryGroup, path: NodePath): QueryGroup {
  if (path.length === 0) throw new RangeError('Cannot remove the root group')
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]!
  return updateNode(tree, parentPath, (group) => {
    if (!isGroup(group) || index < 0 || index >= group.rules.length) {
      throw new RangeError(`No node at path [${path.join(', ')}]`)
    }
    return { ...group, rules: group.rules.filter((_, i) => i !== index) }
  })
}
