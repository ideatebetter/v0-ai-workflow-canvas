import { Extension, type Range } from "@tiptap/core"
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion"
import type { Editor } from "@tiptap/react"

export interface SlashCommandItem {
  id: string
  title: string
  description: string
  keywords: string[]
  command: (ctx: { editor: Editor; range: Range }) => void
}

export interface SlashCommandOptions {
  items: SlashCommandItem[]
  render: SuggestionOptions<SlashCommandItem>["render"]
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      items: [],
      render: () => ({}),
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        startOfLine: true,
        pluginKey: undefined,
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
        items: ({ query }) => {
          const q = query.trim().toLowerCase()
          if (!q) return this.options.items
          return this.options.items.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.keywords.some((k) => k.toLowerCase().includes(q)),
          )
        },
        render: this.options.render,
      }),
    ]
  },
})

export function defaultSlashItems(): SlashCommandItem[] {
  return [
    {
      id: "text",
      title: "Text",
      description: "Plain paragraph",
      keywords: ["paragraph", "text", "p"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run()
      },
    },
    {
      id: "h1",
      title: "Heading 1",
      description: "Large section heading",
      keywords: ["heading", "h1", "title", "#"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run()
      },
    },
    {
      id: "h2",
      title: "Heading 2",
      description: "Medium heading",
      keywords: ["heading", "h2", "##"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run()
      },
    },
    {
      id: "h3",
      title: "Heading 3",
      description: "Small heading",
      keywords: ["heading", "h3", "###"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run()
      },
    },
    {
      id: "bullet",
      title: "Bulleted list",
      description: "Simple bullets",
      keywords: ["bullet", "list", "ul", "-"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
    },
    {
      id: "ordered",
      title: "Numbered list",
      description: "Numbered items",
      keywords: ["ordered", "list", "ol", "1."],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
      },
    },
    {
      id: "todo",
      title: "To-do list",
      description: "Checkbox items",
      keywords: ["todo", "task", "checkbox", "check", "[]"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run()
      },
    },
    {
      id: "code",
      title: "Code block",
      description: "Fenced code",
      keywords: ["code", "```", "fence"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
      },
    },
    {
      id: "quote",
      title: "Quote",
      description: "Block quote",
      keywords: ["quote", "blockquote", ">"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
      },
    },
    {
      id: "divider",
      title: "Divider",
      description: "Horizontal rule",
      keywords: ["divider", "hr", "rule", "---"],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run()
      },
    },
    {
      id: "callout",
      title: "Callout",
      description: "Highlighted note",
      keywords: ["callout", "note", "info", "tip"],
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setParagraph()
          .setCallout({ emoji: "💡" })
          .run()
      },
    },
    {
      id: "image-url",
      title: "Image (URL)",
      description: "Insert image by URL",
      keywords: ["image", "img", "photo", "picture", "url"],
      command: ({ editor, range }) => {
        const url = typeof window !== "undefined" ? window.prompt("Image URL") : null
        if (!url) return
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
      },
    },
  ]
}
