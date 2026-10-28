import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import type { QueryGroup, QueryRule } from '../../src/model'
import { getNode, idFor, insertNode, removeNode, replaceNode, updateNode } from '../../src/model'

const rule = (field: string, value: unknown = 'x'): QueryRule => ({ field, operator: 'eq', value })

function sample(): QueryGroup {
  return {
    condition: 'and',
    rules: [rule('a'), { condition: 'or', rules: [rule('b'), rule('c')] }, rule('d')],
  }
}

describe('idFor', () => {
  it('assigns an id on first sight and keeps it', () => {
    const node = rule('a')
    expect(idFor(node)).toBe(idFor(node))
    expect(idFor(node)).not.toBe(idFor(rule('a')))
  })

  it('gives a reactive proxy the same id as its raw node', () => {
    const tree = sample()
    const proxy = reactive(tree)
    expect(idFor(proxy)).toBe(idFor(tree))
    expect(idFor(proxy.rules[1]!)).toBe(idFor(tree.rules[1]!))
    const next = updateNode(proxy, [0], (n) => ({ ...n, value: 'y' }))
    expect(idFor(reactive(next).rules[0]!)).toBe(idFor(tree.rules[0]!))
  })

  it('never writes the id into the node', () => {
    const tree = sample()
    idFor(tree)
    expect(JSON.stringify(tree)).not.toMatch(/id/)
    expect(Object.keys(tree)).toEqual(['condition', 'rules'])
  })
})

describe('updateNode', () => {
  it('replaces the node without touching the original tree', () => {
    const tree = sample()
    const before = JSON.stringify(tree)
    const next = updateNode(tree, [1, 0], (n) => ({ ...n, value: 'changed' }))
    expect(JSON.stringify(tree)).toBe(before)
    expect((getNode(next, [1, 0]) as QueryRule).value).toBe('changed')
  })

  it('keeps ids stable for the edited node and its ancestors, and reuses siblings', () => {
    const tree = sample()
    const ids = [idFor(tree), idFor(tree.rules[1]!), idFor(getNode(tree, [1, 0])!)]
    const next = updateNode(tree, [1, 0], (n) => ({ ...n, value: 'changed' }))
    expect([idFor(next), idFor(next.rules[1]!), idFor(getNode(next, [1, 0])!)]).toEqual(ids)
    expect(next.rules[0]).toBe(tree.rules[0])
    expect(getNode(next, [1, 1])).toBe(getNode(tree, [1, 1]))
  })

  it('keeps ids stable across a chain of edits', () => {
    let tree = sample()
    const id = idFor(getNode(tree, [2])!)
    for (let i = 0; i < 5; i++) tree = updateNode(tree, [2], (n) => ({ ...n, value: i }))
    expect(idFor(getNode(tree, [2])!)).toBe(id)
  })

  it('throws on a path that does not exist', () => {
    expect(() => updateNode(sample(), [7], (n) => n)).toThrow(RangeError)
    expect(() => updateNode(sample(), [0, 0], (n) => n)).toThrow(RangeError)
  })
})

describe('replaceNode', () => {
  it('gives the replacement the old node id', () => {
    const tree = sample()
    const oldId = idFor(tree.rules[0]!)
    const next = replaceNode(tree, [0], rule('z'))
    expect(idFor(next.rules[0]!)).toBe(oldId)
  })
})

describe('insertNode', () => {
  it('appends by default and inserts at an index', () => {
    const tree = sample()
    const appended = insertNode(tree, [1], rule('e'))
    expect((getNode(appended, [1, 2]) as QueryRule).field).toBe('e')
    const first = insertNode(tree, [], rule('f'), 0)
    expect((first.rules[0] as QueryRule).field).toBe('f')
    expect(first.rules).toHaveLength(4)
  })

  it('gives a new node its own id', () => {
    const tree = sample()
    const ids = new Set(tree.rules.map(idFor))
    const next = insertNode(tree, [], rule('g'))
    expect(ids.has(idFor(next.rules[3]!))).toBe(false)
  })

  it('throws when the target is not a group', () => {
    expect(() => insertNode(sample(), [0], rule('h'))).toThrow(TypeError)
  })
})

describe('removeNode', () => {
  it('removes the node and keeps the remaining ids', () => {
    const tree = sample()
    const keep = idFor(tree.rules[2]!)
    const next = removeNode(tree, [1])
    expect(next.rules).toHaveLength(2)
    expect(idFor(next.rules[1]!)).toBe(keep)
  })

  it('refuses to remove the root', () => {
    expect(() => removeNode(sample(), [])).toThrow(RangeError)
  })
})

describe('fix 1: restored queries get row keys', () => {
  it('assigns a distinct key to every node of a tree parsed from JSON', () => {
    const restored = JSON.parse(JSON.stringify(sample())) as QueryGroup
    const nodes = [restored, ...restored.rules, ...(restored.rules[1] as QueryGroup).rules]
    const ids = nodes.map(idFor)
    expect(new Set(ids).size).toBe(nodes.length)
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
  })
})
