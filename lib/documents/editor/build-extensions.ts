import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import type { Extensions } from "@tiptap/core"
import { BlockId } from "./block-id"
import { Callout } from "./callout"
import { SlashCommand, type SlashCommandOptions } from "./slash-command"

export function buildEditorExtensions(opts: {
  editable: boolean
  placeholder?: string
  slash?: SlashCommandOptions
}): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: {
        HTMLAttributes: {
          class:
            "atlas-code-block rounded-md p-3 text-[13px] font-mono overflow-x-auto",
        },
      },
      dropcursor: { color: "var(--app-text-muted, #888)" },
    }),
    Highlight,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        class: "atlas-link underline underline-offset-2",
        rel: "noopener noreferrer nofollow",
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: { class: "atlas-image rounded-md max-w-full" },
    }),
    Callout,
    BlockId,
  ]

  if (opts.editable && opts.placeholder) {
    extensions.push(
      Placeholder.configure({
        placeholder: opts.placeholder,
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
    )
  }

  if (opts.editable && opts.slash) {
    extensions.push(SlashCommand.configure(opts.slash))
  }

  return extensions
}
