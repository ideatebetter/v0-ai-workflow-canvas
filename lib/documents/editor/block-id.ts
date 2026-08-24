import { Extension, type GlobalAttributes } from "@tiptap/core"
import { Plugin } from "@tiptap/pm/state"

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now()}`

export const BLOCK_ID_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "image",
  "callout",
] as const

export const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes(): GlobalAttributes {
    return [
      {
        types: [...BLOCK_ID_TYPES],
        attributes: {
          id: {
            default: null,
            parseHTML: (el: HTMLElement) => el.getAttribute("data-id"),
            renderHTML: (attrs: Record<string, unknown>) => {
              const id = attrs.id
              return typeof id === "string" ? { "data-id": id } : {}
            },
            keepOnSplit: false,
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null
          const tr = newState.tr
          let modified = false
          const seen = new Set<string>()
          newState.doc.descendants((node, pos) => {
            if (!node.isBlock) return
            const current: unknown = node.attrs.id
            if (typeof current === "string" && current.length > 0 && !seen.has(current)) {
              seen.add(current)
              return
            }
            tr.setNodeAttribute(pos, "id", newId())
            modified = true
          })
          return modified ? tr : null
        },
      }),
    ]
  },
})
