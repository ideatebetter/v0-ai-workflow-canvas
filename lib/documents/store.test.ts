import { beforeEach, describe, expect, it } from "vitest"
import { createDocumentsStore } from "./store"
import { buildTree, childrenOf, isDescendantOf } from "./tree"
import type { TreeState } from "./types"

const makeStore = () => createDocumentsStore()

describe("createFolder / createDocument", () => {
  it("creates a root folder", () => {
    const store = makeStore()
    const id = store.getState().createFolder({ name: "A" })
    const node = store.getState().tree[id]
    expect(node?.type).toBe("folder")
    expect(node?.parentId).toBeNull()
  })

  it("creates a nested document", () => {
    const store = makeStore()
    const parentId = store.getState().createFolder({ name: "P" })
    const docId = store.getState().createDocument({ parentId, title: "D" })
    expect(store.getState().tree[docId]?.parentId).toBe(parentId)
  })

  it("assigns ascending orders to siblings", () => {
    const store = makeStore()
    const a = store.getState().createDocument({ title: "A" })
    const b = store.getState().createDocument({ title: "B" })
    const c = store.getState().createDocument({ title: "C" })
    const tree = store.getState().tree
    expect(tree[a]!.order < tree[b]!.order).toBe(true)
    expect(tree[b]!.order < tree[c]!.order).toBe(true)
  })
})

describe("renameNode", () => {
  it("renames a folder", () => {
    const store = makeStore()
    const id = store.getState().createFolder({ name: "old" })
    store.getState().renameNode(id, "new")
    const node = store.getState().tree[id]
    expect(node?.type === "folder" && node.name).toBe("new")
  })

  it("retitles a document", () => {
    const store = makeStore()
    const id = store.getState().createDocument({ title: "old" })
    store.getState().renameNode(id, "new")
    const node = store.getState().tree[id]
    expect(node?.type === "document" && node.title).toBe("new")
  })
})

describe("moveNode — reorder within same parent", () => {
  it("moves a child before another child", () => {
    const store = makeStore()
    const parentId = store.getState().createFolder({ name: "P" })
    const a = store.getState().createDocument({ parentId, title: "A" })
    const b = store.getState().createDocument({ parentId, title: "B" })
    const c = store.getState().createDocument({ parentId, title: "C" })

    const result = store.getState().moveNode({ id: c, newParentId: parentId, beforeId: a })
    expect(result.ok).toBe(true)

    const ordered = childrenOf(store.getState().tree, parentId).map((n) => n.id)
    expect(ordered).toEqual([c, a, b])
  })

  it("moves a child after another child", () => {
    const store = makeStore()
    const parentId = store.getState().createFolder({ name: "P" })
    const a = store.getState().createDocument({ parentId, title: "A" })
    const b = store.getState().createDocument({ parentId, title: "B" })
    const c = store.getState().createDocument({ parentId, title: "C" })

    store.getState().moveNode({ id: a, newParentId: parentId, afterId: b })

    const ordered = childrenOf(store.getState().tree, parentId).map((n) => n.id)
    expect(ordered).toEqual([b, a, c])
  })
})

describe("moveNode — move between parents", () => {
  it("moves a doc into a different folder", () => {
    const store = makeStore()
    const p1 = store.getState().createFolder({ name: "P1" })
    const p2 = store.getState().createFolder({ name: "P2" })
    const doc = store.getState().createDocument({ parentId: p1, title: "D" })

    store.getState().moveNode({ id: doc, newParentId: p2 })

    expect(store.getState().tree[doc]?.parentId).toBe(p2)
    expect(childrenOf(store.getState().tree, p1)).toHaveLength(0)
    expect(childrenOf(store.getState().tree, p2)).toHaveLength(1)
  })

  it("moves a folder subtree; descendants follow implicitly via parentId", () => {
    const store = makeStore()
    const root = store.getState().createFolder({ name: "root" })
    const branch = store.getState().createFolder({ parentId: root, name: "branch" })
    const leaf = store.getState().createDocument({ parentId: branch, title: "leaf" })
    const sibling = store.getState().createFolder({ name: "sibling" })

    store.getState().moveNode({ id: branch, newParentId: sibling })

    expect(store.getState().tree[branch]?.parentId).toBe(sibling)
    expect(store.getState().tree[leaf]?.parentId).toBe(branch)
    const rendered = buildTree(store.getState().tree)
    const siblingNode = rendered.find((r) => r.node.id === sibling)!
    expect(siblingNode.children[0]?.node.id).toBe(branch)
    expect(siblingNode.children[0]?.children[0]?.node.id).toBe(leaf)
  })
})

describe("moveNode — cycle rejection", () => {
  it("rejects moving a folder into itself", () => {
    const store = makeStore()
    const f = store.getState().createFolder({ name: "F" })
    const result = store.getState().moveNode({ id: f, newParentId: f })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("cycle")
  })

  it("rejects moving a folder into its own descendant", () => {
    const store = makeStore()
    const root = store.getState().createFolder({ name: "root" })
    const child = store.getState().createFolder({ parentId: root, name: "child" })
    const grand = store.getState().createFolder({ parentId: child, name: "grand" })

    const result = store.getState().moveNode({ id: root, newParentId: grand })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("cycle")
  })

  it("rejects moving into a document (documents cannot have children)", () => {
    const store = makeStore()
    const doc = store.getState().createDocument({ title: "D" })
    const other = store.getState().createDocument({ title: "O" })
    const result = store.getState().moveNode({ id: other, newParentId: doc })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("invalid")
  })

  it("rejects moves referencing a missing node", () => {
    const store = makeStore()
    const result = store.getState().moveNode({ id: "does-not-exist", newParentId: null })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("missing")
  })
})

describe("deleteNode", () => {
  it("removes a leaf document", () => {
    const store = makeStore()
    const id = store.getState().createDocument({ title: "solo" })
    const removed = store.getState().deleteNode(id)
    expect(removed).toEqual([id])
    expect(store.getState().tree[id]).toBeUndefined()
  })

  it("cascades to all descendants of a folder", () => {
    const store = makeStore()
    const root = store.getState().createFolder({ name: "root" })
    const a = store.getState().createFolder({ parentId: root, name: "a" })
    const b = store.getState().createDocument({ parentId: root, title: "b" })
    const c = store.getState().createDocument({ parentId: a, title: "c" })
    const d = store.getState().createDocument({ parentId: a, title: "d" })

    const removed = store.getState().deleteNode(root)

    expect(new Set(removed)).toEqual(new Set([root, a, b, c, d]))
    expect(Object.keys(store.getState().tree)).toHaveLength(0)
  })

  it("returns [] when deleting an unknown id", () => {
    const store = makeStore()
    expect(store.getState().deleteNode("nope")).toEqual([])
  })
})

describe("duplicateNode", () => {
  it("clones a document with a new id and ' copy' suffix", () => {
    const store = makeStore()
    const id = store.getState().createDocument({ title: "Report" })
    const cloneId = store.getState().duplicateNode(id)!
    expect(cloneId).not.toBe(id)
    const clone = store.getState().tree[cloneId]
    expect(clone?.type === "document" && clone.title).toBe("Report copy")
  })

  it("deep-clones a folder subtree with fresh ids at every level", () => {
    const store = makeStore()
    const root = store.getState().createFolder({ name: "root" })
    const child = store.getState().createFolder({ parentId: root, name: "child" })
    const leaf = store.getState().createDocument({ parentId: child, title: "leaf" })

    const cloneRoot = store.getState().duplicateNode(root)!
    const state = store.getState().tree

    const clonedChildren = childrenOf(state, cloneRoot)
    expect(clonedChildren).toHaveLength(1)
    const clonedChild = clonedChildren[0]!
    expect(clonedChild.id).not.toBe(child)

    const clonedLeaves = childrenOf(state, clonedChild.id)
    expect(clonedLeaves).toHaveLength(1)
    expect(clonedLeaves[0]!.id).not.toBe(leaf)
  })
})

describe("buildTree selector", () => {
  it("returns roots in order with nested children", () => {
    const store = makeStore()
    const f = store.getState().createFolder({ name: "F" })
    const d1 = store.getState().createDocument({ title: "D1" })
    const nested = store.getState().createDocument({ parentId: f, title: "N" })

    const rendered = buildTree(store.getState().tree)
    const ids = rendered.map((r) => r.node.id)
    expect(ids).toEqual([f, d1])
    const fNode = rendered.find((r) => r.node.id === f)!
    expect(fNode.children[0]?.node.id).toBe(nested)
    expect(fNode.children[0]?.depth).toBe(1)
  })

  it("memoizes on identical state reference", () => {
    const store = makeStore()
    store.getState().createDocument({ title: "A" })
    const first = buildTree(store.getState().tree)
    const second = buildTree(store.getState().tree)
    expect(second).toBe(first)
  })

  it("recomputes when the state reference changes", () => {
    const store = makeStore()
    store.getState().createDocument({ title: "A" })
    const first = buildTree(store.getState().tree)
    store.getState().createDocument({ title: "B" })
    const second = buildTree(store.getState().tree)
    expect(second).not.toBe(first)
    expect(second).toHaveLength(2)
  })
})

describe("isDescendantOf", () => {
  it("detects deep descendants", () => {
    const store = makeStore()
    const root = store.getState().createFolder({ name: "root" })
    const child = store.getState().createFolder({ parentId: root, name: "child" })
    const grand = store.getState().createDocument({ parentId: child, title: "grand" })

    expect(isDescendantOf(store.getState().tree, root, grand)).toBe(true)
    expect(isDescendantOf(store.getState().tree, child, grand)).toBe(true)
    expect(isDescendantOf(store.getState().tree, grand, root)).toBe(false)
  })

  it("does not loop on a broken cycle in the data", () => {
    const state: TreeState = {
      a: { id: "a", type: "folder", parentId: "b", name: "a", order: "a0", collapsed: false, createdAt: 0, updatedAt: 0 },
      b: { id: "b", type: "folder", parentId: "a", name: "b", order: "b0", collapsed: false, createdAt: 0, updatedAt: 0 },
    }
    expect(() => isDescendantOf(state, "a", "b")).not.toThrow()
  })
})

describe("setFolderCollapsed / setDocumentContent / setDocumentIcon", () => {
  let store: ReturnType<typeof makeStore>
  beforeEach(() => {
    store = makeStore()
  })

  it("toggles collapsed on a folder", () => {
    const id = store.getState().createFolder({ name: "F" })
    store.getState().setFolderCollapsed(id, true)
    const node = store.getState().tree[id]
    expect(node?.type === "folder" && node.collapsed).toBe(true)
  })

  it("updates document content", () => {
    const id = store.getState().createDocument({ title: "D" })
    store.getState().setDocumentContent(id, {
      type: "doc",
      content: [{ id: "b1", type: "paragraph", text: "hello" }],
    })
    const node = store.getState().tree[id]
    expect(node?.type === "document" && node.content.content[0]?.text).toBe("hello")
  })

  it("updates document icon", () => {
    const id = store.getState().createDocument({ title: "D" })
    store.getState().setDocumentIcon(id, "📘")
    const node = store.getState().tree[id]
    expect(node?.type === "document" && node.icon).toBe("📘")
  })

  it("ignores collapsed on a document", () => {
    const id = store.getState().createDocument({ title: "D" })
    store.getState().setFolderCollapsed(id, true)
    const node = store.getState().tree[id]
    expect(node?.type).toBe("document")
  })
})
