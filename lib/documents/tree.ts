import type { NodeId, TreeNode, TreeNodeWithChildren, TreeState } from "./types"
import { compareOrder } from "./fractional"

export const rootNodes = (state: TreeState): TreeNode[] =>
  Object.values(state)
    .filter((n) => n.parentId === null)
    .sort((a, b) => compareOrder(a.order, b.order))

export const childrenOf = (state: TreeState, parentId: NodeId): TreeNode[] =>
  Object.values(state)
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => compareOrder(a.order, b.order))

let buildTreeCache: { state: TreeState; result: TreeNodeWithChildren[] } | null =
  null

export const buildTree = (state: TreeState): TreeNodeWithChildren[] => {
  if (buildTreeCache && buildTreeCache.state === state) {
    return buildTreeCache.result
  }

  const childrenByParent = new Map<NodeId | null, TreeNode[]>()
  for (const node of Object.values(state)) {
    const list = childrenByParent.get(node.parentId) ?? []
    list.push(node)
    childrenByParent.set(node.parentId, list)
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => compareOrder(a.order, b.order))
  }

  const visit = (
    node: TreeNode,
    depth: number,
  ): TreeNodeWithChildren => {
    const kids = childrenByParent.get(node.id) ?? []
    return {
      node,
      depth,
      children:
        node.type === "folder"
          ? kids.map((k) => visit(k, depth + 1))
          : [],
    }
  }

  const roots = childrenByParent.get(null) ?? []
  const result = roots.map((r) => visit(r, 0))

  buildTreeCache = { state, result }
  return result
}

export const collectDescendantIds = (
  state: TreeState,
  rootId: NodeId,
): NodeId[] => {
  const out: NodeId[] = []
  const walk = (id: NodeId) => {
    for (const child of childrenOf(state, id)) {
      out.push(child.id)
      if (child.type === "folder") walk(child.id)
    }
  }
  walk(rootId)
  return out
}

export const isDescendantOf = (
  state: TreeState,
  candidateAncestorId: NodeId,
  nodeId: NodeId,
): boolean => {
  let cursor: NodeId | null = nodeId
  const seen = new Set<NodeId>()
  while (cursor !== null) {
    if (seen.has(cursor)) return false
    seen.add(cursor)
    const node: TreeNode | undefined = state[cursor]
    if (!node) return false
    if (node.parentId === candidateAncestorId) return true
    cursor = node.parentId
  }
  return false
}

export const ancestorChain = (
  state: TreeState,
  nodeId: NodeId,
): TreeNode[] => {
  const chain: TreeNode[] = []
  let cursor: NodeId | null | undefined = state[nodeId]?.parentId
  const seen = new Set<NodeId>()
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    const node: TreeNode | undefined = state[cursor]
    if (!node) break
    chain.unshift(node)
    cursor = node.parentId
  }
  return chain
}
