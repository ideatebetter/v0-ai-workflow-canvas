"use client"

import type { Editor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link as LinkIcon,
  Strikethrough,
} from "lucide-react"

interface Props {
  editor: Editor
}

export function SelectionToolbar({ editor }: Props) {
  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active
        ? "bg-white/15 text-foreground"
        : "text-gray-300 hover:bg-white/10 hover:text-foreground"
    }`

  const promptLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", previous ?? "")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e, from, to }: { editor: Editor; from: number; to: number }) =>
        e.isEditable && from !== to && !e.isActive("codeBlock") && !e.isActive("image")
      }
    >
      <div
        className="flex items-center gap-0.5 rounded-lg border px-1 py-1 shadow-xl"
        style={{
          backgroundColor: "var(--app-card-elevated)",
          borderColor: "var(--app-border-strong)",
        }}
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive("bold"))}
          aria-label="Bold"
        >
          <Bold className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive("italic"))}
          aria-label="Italic"
        >
          <Italic className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btn(editor.isActive("strike"))}
          aria-label="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={btn(editor.isActive("code"))}
          aria-label="Inline code"
        >
          <Code className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={btn(editor.isActive("highlight"))}
          aria-label="Highlight"
        >
          <Highlighter className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={promptLink}
          className={btn(editor.isActive("link"))}
          aria-label="Link"
        >
          <LinkIcon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    </BubbleMenu>
  )
}
