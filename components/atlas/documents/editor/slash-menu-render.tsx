"use client"

import { createRoot, type Root } from "react-dom/client"
import type { SuggestionOptions } from "@tiptap/suggestion"
import type { SlashCommandItem } from "@/lib/documents/editor/slash-command"
import { createRef } from "react"
import { SlashMenu, type SlashMenuHandle } from "./slash-menu"

type ClientRect = () => DOMRect | null

export function createSlashRender(): SuggestionOptions<SlashCommandItem>["render"] {
  return () => {
    let container: HTMLDivElement | null = null
    let root: Root | null = null
    const menuRef = createRef<SlashMenuHandle>()

    const positionAt = (clientRect: ClientRect | null | undefined) => {
      if (!container) return
      const rect = typeof clientRect === "function" ? clientRect() : null
      if (!rect) {
        container.style.display = "none"
        return
      }
      container.style.display = "block"
      const pageX = rect.left + window.scrollX
      const pageY = rect.bottom + window.scrollY + 6
      container.style.left = `${pageX}px`
      container.style.top = `${pageY}px`
    }

    const mount = () => {
      if (container) return
      container = document.createElement("div")
      container.style.position = "absolute"
      container.style.zIndex = "9999"
      container.style.pointerEvents = "auto"
      document.body.appendChild(container)
      root = createRoot(container)
    }

    const unmount = () => {
      if (root) {
        root.unmount()
        root = null
      }
      if (container) {
        container.remove()
        container = null
      }
    }

    return {
      onStart: (props) => {
        mount()
        positionAt(props.clientRect)
        root?.render(
          <SlashMenu
            ref={menuRef}
            items={props.items}
            command={(item) => props.command(item)}
          />,
        )
      },
      onUpdate: (props) => {
        positionAt(props.clientRect)
        root?.render(
          <SlashMenu
            ref={menuRef}
            items={props.items}
            command={(item) => props.command(item)}
          />,
        )
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          unmount()
          return true
        }
        return menuRef.current?.onKeyDown({ event: props.event }) ?? false
      },
      onExit: () => {
        unmount()
      },
    }
  }
}
