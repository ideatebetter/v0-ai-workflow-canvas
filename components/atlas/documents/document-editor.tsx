"use client"

import { EditorContent, useEditor } from "@tiptap/react"
import { useEffect, useMemo, useRef } from "react"
import { buildEditorExtensions } from "@/lib/documents/editor/build-extensions"
import {
  defaultSlashItems,
  type SlashCommandItem,
} from "@/lib/documents/editor/slash-command"
import type { DocContent, DocumentNode } from "@/lib/documents/types"
import { emptyDocContent } from "@/lib/documents/types"
import { useDocumentsStore } from "@/lib/documents/store"
import { useDebouncedEffect } from "@/lib/documents/autosave"
import { SelectionToolbar } from "./editor/selection-toolbar"
import { createSlashRender } from "./editor/slash-menu-render"
import { TitleInput } from "./title-input"

type Mode = "card" | "panel" | "full"

interface DocumentEditorProps {
  docId: string
  mode: Mode
  onRequestFocus?: () => void
}

export function DocumentEditor({ docId, mode, onRequestFocus }: DocumentEditorProps) {
  const doc = useDocumentsStore(
    (s) => s.tree[docId] as DocumentNode | undefined,
  )
  const renameNode = useDocumentsStore((s) => s.renameNode)
  const setDocumentContent = useDocumentsStore((s) => s.setDocumentContent)

  const editable = mode !== "card"

  const slashItems = useMemo<SlashCommandItem[]>(() => defaultSlashItems(), [])
  const slashRender = useMemo(() => createSlashRender(), [])

  const extensions = useMemo(
    () =>
      buildEditorExtensions({
        editable,
        placeholder:
          mode === "full"
            ? "Type '/' for commands, or just start writing…"
            : mode === "panel"
              ? "Type '/' for commands…"
              : undefined,
        slash: editable
          ? { items: slashItems, render: slashRender }
          : undefined,
      }),
    [editable, mode, slashItems, slashRender],
  )

  const editor = useEditor(
    {
      extensions,
      editable,
      content: doc?.content ?? emptyDocContent(),
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: editorClass(mode),
        },
      },
    },
    [docId, editable],
  )

  const contentRef = useRef<DocContent | null>(doc?.content ?? null)

  useDebouncedEffect(
    () => {
      if (!editor || !doc) return
      const json = editor.getJSON() as unknown as DocContent
      const currentSerialized = JSON.stringify(json)
      const savedSerialized = JSON.stringify(contentRef.current)
      if (currentSerialized === savedSerialized) return
      contentRef.current = json
      setDocumentContent(doc.id, json)
    },
    [editor?.state.doc, doc?.id],
    400,
  )

  useEffect(() => {
    if (!editor || !doc) return
    const currentSerialized = JSON.stringify(editor.getJSON())
    const incomingSerialized = JSON.stringify(doc.content)
    if (currentSerialized !== incomingSerialized && !editor.isFocused) {
      editor.commands.setContent(doc.content, { emitUpdate: false })
      contentRef.current = doc.content
    }
  }, [doc?.content, editor, doc])

  if (!doc) return null

  const titleReadOnly = !editable

  return (
    <div className={containerClass(mode)}>
      <div className={innerClass(mode)}>
        {mode !== "card" && (
          <TitleInput
            value={doc.title}
            readOnly={titleReadOnly}
            size={mode === "full" ? "full" : "panel"}
            onChange={(next) => renameNode(doc.id, next)}
            onEnter={() => editor?.commands.focus("start")}
          />
        )}
        {mode === "card" && doc.title && (
          <div
            className="text-sm font-medium text-foreground mb-1 truncate"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            {doc.title}
          </div>
        )}
        <div
          className={mode === "card" ? "relative overflow-hidden" : ""}
          onDoubleClick={mode === "card" ? onRequestFocus : undefined}
        >
          <EditorContent editor={editor} />
          {mode === "card" && (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, var(--app-bg-elevated))",
              }}
            />
          )}
        </div>
        {editor && editable && <SelectionToolbar editor={editor} />}
      </div>
    </div>
  )
}

function containerClass(mode: Mode): string {
  switch (mode) {
    case "full":
      return "w-full min-h-screen"
    case "panel":
      return "w-full h-full overflow-y-auto"
    case "card":
      return "w-full h-full overflow-hidden p-3"
  }
}

function innerClass(mode: Mode): string {
  switch (mode) {
    case "full":
      return "mx-auto max-w-[720px] px-6 py-16"
    case "panel":
      return "px-4 py-3"
    case "card":
      return "text-[13px] leading-snug"
  }
}

function editorClass(mode: Mode): string {
  const base =
    "atlas-doc prose prose-neutral dark:prose-invert max-w-none focus:outline-none " +
    "prose-p:my-2 prose-headings:font-semibold prose-headings:tracking-tight " +
    "prose-h1:text-3xl prose-h1:mt-6 prose-h1:mb-3 " +
    "prose-h2:text-2xl prose-h2:mt-5 prose-h2:mb-2 " +
    "prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2 " +
    "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 " +
    "prose-blockquote:border-l-2 prose-blockquote:border-black/20 dark:prose-blockquote:border-white/20 prose-blockquote:pl-3 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-300 prose-blockquote:not-italic " +
    "prose-hr:border-black/10 dark:prose-hr:border-white/10 prose-hr:my-6 " +
    "prose-code:text-[0.9em] prose-code:bg-black/8 dark:prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
  switch (mode) {
    case "full":
      return `${base} text-[16px] leading-[1.7]`
    case "panel":
      return `${base} text-[14px] leading-[1.6]`
    case "card":
      return `${base} text-[13px] leading-[1.55] line-clamp-none`
  }
}
