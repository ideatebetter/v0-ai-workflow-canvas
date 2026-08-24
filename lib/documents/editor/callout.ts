import { Node, mergeAttributes } from "@tiptap/core"

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { emoji?: string }) => ReturnType
      toggleCallout: (attrs?: { emoji?: string }) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      emoji: {
        default: "💡",
        parseHTML: (el) => el.getAttribute("data-emoji") ?? "💡",
        renderHTML: (attrs) => ({ "data-emoji": attrs.emoji }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout="true"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        {
          "data-callout": "true",
          class:
            "atlas-callout flex gap-3 items-start rounded-lg px-3 py-2.5 my-2 border",
          style:
            "background-color: var(--app-card-elevated, rgba(255,255,255,0.04)); border-color: var(--app-border, rgba(255,255,255,0.08));",
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      [
        "span",
        {
          "data-callout-emoji": "true",
          contenteditable: "false",
          class: "select-none text-lg leading-none mt-0.5",
        },
        node.attrs.emoji || "💡",
      ],
      ["div", { class: "flex-1 min-w-0" }, 0],
    ]
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      toggleCallout:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    }
  },
})
