"use client"

import { useEffect, useRef, useState } from "react"

interface Props {
  value: string
  onChange: (next: string) => void
  onEnter?: () => void
  readOnly?: boolean
  size?: "full" | "panel"
  autoFocus?: boolean
}

export function TitleInput({
  value,
  onChange,
  onEnter,
  readOnly,
  size = "full",
  autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length)
    }
  }, [autoFocus])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [local, size])

  const cls =
    size === "full"
      ? "w-full bg-transparent outline-none border-0 resize-none text-[36px] font-semibold leading-tight tracking-tight text-foreground placeholder:text-gray-600"
      : "w-full bg-transparent outline-none border-0 resize-none text-lg font-medium leading-snug text-foreground placeholder:text-gray-600"

  return (
    <textarea
      ref={ref}
      rows={1}
      value={local}
      readOnly={readOnly}
      placeholder="Untitled"
      onChange={(e) => {
        setLocal(e.target.value)
        onChange(e.target.value)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onEnter?.()
        }
      }}
      className={cls}
      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
    />
  )
}
