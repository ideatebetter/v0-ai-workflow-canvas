"use client"

import { useEffect, useRef } from "react"

interface InlineRenameProps {
  value: string
  placeholder?: string
  onCommit: (next: string) => void
  onCancel: () => void
  autoFocus?: boolean
  selectAllOnMount?: boolean
  className?: string
}

export function InlineRename({
  value,
  placeholder = "Untitled",
  onCommit,
  onCancel,
  autoFocus = true,
  selectAllOnMount = true,
  className,
}: InlineRenameProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
      if (selectAllOnMount) ref.current.select()
    }
  }, [autoFocus, selectAllOnMount])

  return (
    <input
      ref={ref}
      defaultValue={value}
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onCommit(e.currentTarget.value.trim())
        } else if (e.key === "Escape") {
          e.preventDefault()
          onCancel()
        }
        e.stopPropagation()
      }}
      onBlur={(e) => onCommit(e.currentTarget.value.trim())}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={
        className ??
        "flex-1 min-w-0 bg-transparent border border-white/20 rounded px-1 py-0 text-sm text-foreground outline-none focus:border-white/40"
      }
      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
    />
  )
}
