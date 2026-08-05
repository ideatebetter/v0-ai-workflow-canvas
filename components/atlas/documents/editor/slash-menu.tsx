"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import type { SlashCommandItem } from "@/lib/documents/editor/slash-command"

interface SlashMenuProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

export interface SlashMenuHandle {
  onKeyDown: (event: { event: KeyboardEvent }) => boolean
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command },
  ref,
) {
  const [selected, setSelected] = useState(0)

  useEffect(() => setSelected(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowDown") {
        setSelected((i) => (i + 1) % Math.max(items.length, 1))
        return true
      }
      if (event.key === "ArrowUp") {
        setSelected((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1))
        return true
      }
      if (event.key === "Enter") {
        const item = items[selected]
        if (item) command(item)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div
        className="rounded-lg border shadow-xl px-3 py-2 text-xs text-gray-500 min-w-[220px]"
        style={{
          backgroundColor: "var(--app-card-elevated)",
          borderColor: "var(--app-border-strong)",
          fontFamily: "system-ui, Inter, sans-serif",
        }}
      >
        No matches
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border shadow-xl py-1 min-w-[240px] max-h-72 overflow-y-auto"
      style={{
        backgroundColor: "var(--app-card-elevated)",
        borderColor: "var(--app-border-strong)",
        fontFamily: "system-ui, Inter, sans-serif",
      }}
    >
      {items.map((item, idx) => (
        <button
          key={item.id}
          type="button"
          onMouseEnter={() => setSelected(idx)}
          onClick={(e) => {
            e.preventDefault()
            command(item)
          }}
          className={`w-full flex flex-col items-start gap-0 px-3 py-1.5 text-left transition-colors ${
            idx === selected ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          <span className="text-sm text-foreground">{item.title}</span>
          <span className="text-[11px] text-gray-500">{item.description}</span>
        </button>
      ))}
    </div>
  )
})
