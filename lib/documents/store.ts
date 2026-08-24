import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  DocContent,
  DocumentNode,
  FolderNode,
  NodeId,
  TreeNode,
  TreeState,
} from "./types"
import { emptyDocContent } from "./types"
import { childrenOf, collectDescendantIds, isDescendantOf } from "./tree"
import { orderAfter, orderBetween } from "./fractional"

export interface Tombstone {
  id: NodeId
  title: string
  icon: string | null
  content: DocContent
  deletedAt: number
}

export type TombstoneMap = Record<NodeId, Tombstone>

const STORAGE_KEY = "atlas:v1:docs"
const STORAGE_VERSION = 1

const newId = (): NodeId =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now()}`

const lastOrderAmong = (state: TreeState, parentId: NodeId | null): string | null => {
  const siblings =
    parentId === null
      ? Object.values(state).filter((n) => n.parentId === null)
      : childrenOf(state, parentId)
  if (siblings.length === 0) return null
  return siblings.map((s) => s.order).sort().at(-1) ?? null
}

export interface DocumentsState {
  tree: TreeState
  tombstones: TombstoneMap

  createFolder: (input: { parentId?: NodeId | null; name?: string }) => NodeId
  createDocument: (input: {
    parentId?: NodeId | null
    title?: string
    content?: DocContent
  }) => NodeId

  renameNode: (id: NodeId, name: string) => void
  setDocumentIcon: (id: NodeId, icon: string | null) => void
  setDocumentContent: (id: NodeId, content: DocContent) => void
  setFolderCollapsed: (id: NodeId, collapsed: boolean) => void

  moveNode: (input: {
    id: NodeId
    newParentId: NodeId | null
    beforeId?: NodeId | null
    afterId?: NodeId | null
  }) => { ok: true } | { ok: false; reason: "cycle" | "missing" | "invalid" }

  deleteNode: (id: NodeId) => NodeId[]

  restoreDocument: (id: NodeId) => NodeId | null

  duplicateNode: (id: NodeId) => NodeId | null
}

const applyPatch = (tree: TreeState, patch: Partial<Record<NodeId, TreeNode | null>>): TreeState => {
  const next: TreeState = { ...tree }
  for (const [id, node] of Object.entries(patch)) {
    if (node === null) {
      delete next[id]
    } else if (node !== undefined) {
      next[id] = node
    }
  }
  return next
}

const orderForNewChild = (state: TreeState, parentId: NodeId | null): string =>
  orderAfter(lastOrderAmong(state, parentId))

const resolveOrder = (
  state: TreeState,
  parentId: NodeId | null,
  beforeId: NodeId | null | undefined,
  afterId: NodeId | null | undefined,
): string => {
  const siblings =
    parentId === null
      ? Object.values(state)
          .filter((n) => n.parentId === null)
          .sort((a, b) => (a.order < b.order ? -1 : 1))
      : childrenOf(state, parentId)

  if (beforeId !== undefined && beforeId !== null) {
    const idx = siblings.findIndex((s) => s.id === beforeId)
    if (idx === -1) return orderAfter(siblings.at(-1)?.order ?? null)
    const prev = idx === 0 ? null : siblings[idx - 1].order
    return orderBetween(prev, siblings[idx].order)
  }
  if (afterId !== undefined && afterId !== null) {
    const idx = siblings.findIndex((s) => s.id === afterId)
    if (idx === -1) return orderAfter(siblings.at(-1)?.order ?? null)
    const next = idx === siblings.length - 1 ? null : siblings[idx + 1].order
    return orderBetween(siblings[idx].order, next)
  }
  return orderAfter(siblings.at(-1)?.order ?? null)
}

export const createDocumentsStore = () =>
  create<DocumentsState>()(
    persist(
      (set, get) => ({
        tree: {},
        tombstones: {},

        createFolder: ({ parentId = null, name = "New folder" }) => {
          const id = newId()
          const now = Date.now()
          const node: FolderNode = {
            id,
            type: "folder",
            parentId,
            name,
            order: orderForNewChild(get().tree, parentId),
            collapsed: false,
            createdAt: now,
            updatedAt: now,
          }
          set({ tree: applyPatch(get().tree, { [id]: node }) })
          return id
        },

        createDocument: ({ parentId = null, title = "", content }) => {
          const id = newId()
          const now = Date.now()
          const node: DocumentNode = {
            id,
            type: "document",
            parentId,
            title,
            icon: null,
            order: orderForNewChild(get().tree, parentId),
            content: content ?? emptyDocContent(),
            createdAt: now,
            updatedAt: now,
          }
          set({ tree: applyPatch(get().tree, { [id]: node }) })
          return id
        },

        renameNode: (id, name) => {
          const node = get().tree[id]
          if (!node) return
          const updated: TreeNode =
            node.type === "folder"
              ? { ...node, name, updatedAt: Date.now() }
              : { ...node, title: name, updatedAt: Date.now() }
          set({ tree: applyPatch(get().tree, { [id]: updated }) })
        },

        setDocumentIcon: (id, icon) => {
          const node = get().tree[id]
          if (!node || node.type !== "document") return
          set({
            tree: applyPatch(get().tree, {
              [id]: { ...node, icon, updatedAt: Date.now() },
            }),
          })
        },

        setDocumentContent: (id, content) => {
          const node = get().tree[id]
          if (!node || node.type !== "document") return
          set({
            tree: applyPatch(get().tree, {
              [id]: { ...node, content, updatedAt: Date.now() },
            }),
          })
        },

        setFolderCollapsed: (id, collapsed) => {
          const node = get().tree[id]
          if (!node || node.type !== "folder") return
          set({
            tree: applyPatch(get().tree, {
              [id]: { ...node, collapsed, updatedAt: Date.now() },
            }),
          })
        },

        moveNode: ({ id, newParentId, beforeId = null, afterId = null }) => {
          const state = get().tree
          const node = state[id]
          if (!node) return { ok: false, reason: "missing" }

          if (newParentId !== null) {
            const parent = state[newParentId]
            if (!parent) return { ok: false, reason: "missing" }
            if (parent.type !== "folder") return { ok: false, reason: "invalid" }
            if (parent.id === id) return { ok: false, reason: "cycle" }
            if (node.type === "folder" && isDescendantOf(state, id, newParentId)) {
              return { ok: false, reason: "cycle" }
            }
          }

          const order = resolveOrder(
            newParentId === node.parentId ? state : state,
            newParentId,
            beforeId,
            afterId,
          )

          const updated: TreeNode = { ...node, parentId: newParentId, order, updatedAt: Date.now() }
          set({ tree: applyPatch(state, { [id]: updated }) })
          return { ok: true }
        },

        deleteNode: (id) => {
          const state = get().tree
          if (!state[id]) return []
          const descendants = collectDescendantIds(state, id)
          const removed = [id, ...descendants]
          const patch: Record<NodeId, TreeNode | null> = {}
          const tombstonePatch: TombstoneMap = {}
          const now = Date.now()
          for (const removedId of removed) {
            const node = state[removedId]
            if (node?.type === "document") {
              tombstonePatch[removedId] = {
                id: removedId,
                title: node.title,
                icon: node.icon,
                content: node.content,
                deletedAt: now,
              }
            }
            patch[removedId] = null
          }
          set({
            tree: applyPatch(state, patch),
            tombstones: { ...get().tombstones, ...tombstonePatch },
          })
          return removed
        },

        restoreDocument: (id) => {
          const t = get().tombstones[id]
          if (!t) return null
          const now = Date.now()
          const restored: DocumentNode = {
            id: t.id,
            type: "document",
            parentId: null,
            title: t.title,
            icon: t.icon,
            order: orderForNewChild(get().tree, null),
            content: t.content,
            createdAt: now,
            updatedAt: now,
          }
          const { [id]: _, ...remaining } = get().tombstones
          set({
            tree: applyPatch(get().tree, { [id]: restored }),
            tombstones: remaining,
          })
          return id
        },

        duplicateNode: (id) => {
          const state = get().tree
          const source = state[id]
          if (!source) return null

          const now = Date.now()
          const patch: Record<NodeId, TreeNode> = {}
          const idMap = new Map<NodeId, NodeId>()

          const clone = (srcId: NodeId, parentId: NodeId | null): NodeId => {
            const src = state[srcId]
            if (!src) return srcId
            const cloneId = newId()
            idMap.set(srcId, cloneId)
            const order =
              srcId === id
                ? orderForNewChild(state, parentId)
                : src.order
            if (src.type === "folder") {
              patch[cloneId] = {
                ...src,
                id: cloneId,
                parentId,
                order,
                createdAt: now,
                updatedAt: now,
              }
              for (const child of childrenOf(state, srcId)) {
                clone(child.id, cloneId)
              }
            } else {
              patch[cloneId] = {
                ...src,
                id: cloneId,
                parentId,
                order,
                title: src.title ? `${src.title} copy` : "",
                content: JSON.parse(JSON.stringify(src.content)),
                createdAt: now,
                updatedAt: now,
              }
            }
            return cloneId
          }

          const newRootId = clone(id, source.parentId)
          set({ tree: applyPatch(state, patch) })
          return newRootId
        },
      }),
      {
        name: STORAGE_KEY,
        version: STORAGE_VERSION,
        storage: createJSONStorage(() =>
          typeof window === "undefined" ? noopStorage : window.localStorage,
        ),
        migrate: (persisted, _version) => {
          return persisted as DocumentsState
        },
        partialize: (s) => ({ tree: s.tree, tombstones: s.tombstones }),
      },
    ),
  )

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

export const useDocumentsStore = createDocumentsStore()

// Cross-tab sync: if another tab writes to atlas:v1:docs, rehydrate this
// store from storage so open canvases reflect edits made in the doc editor.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      void useDocumentsStore.persist.rehydrate()
    }
  })
}
