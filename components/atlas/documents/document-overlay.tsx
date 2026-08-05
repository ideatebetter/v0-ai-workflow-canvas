"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, X } from "lucide-react"
import Link from "next/link"
import { useDocumentOverlayStore } from "@/lib/documents/overlay-store"
import { useDocumentsStore } from "@/lib/documents/store"
import type { DocumentNode as DocumentNodeType } from "@/lib/documents/types"
import { DocumentEditor } from "./document-editor"

export function DocumentOverlay() {
  const openDocId = useDocumentOverlayStore((s) => s.openDocId)
  const close = useDocumentOverlayStore((s) => s.close)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!openDocId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openDocId, close])

  const doc = useDocumentsStore((s) =>
    openDocId ? (s.tree[openDocId] as DocumentNodeType | undefined) : undefined,
  )

  if (!mounted || !openDocId) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex flex-col"
      style={{ backgroundColor: "var(--app-bg)" }}
      role="dialog"
      aria-modal="true"
    >
      <header
        className="flex items-center gap-3 px-6 py-3 border-b sticky top-0 z-10 backdrop-blur"
        style={{
          borderColor: "var(--app-border)",
          backgroundColor: "var(--app-bg-elevated)",
        }}
      >
        <button
          type="button"
          onClick={close}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-foreground transition-colors"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to canvas
        </button>
        <span className="text-gray-600">/</span>
        <span
          className="text-sm text-gray-300 truncate flex-1 min-w-0"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          {doc?.title || "Untitled"}
        </span>
        <Link
          href={`/doc/${openDocId}`}
          onClick={close}
          className="text-xs text-gray-500 hover:text-foreground transition-colors"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          title="Open in dedicated page"
        >
          Open page
        </Link>
        <button
          type="button"
          onClick={close}
          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        {doc ? (
          <DocumentEditor docId={openDocId} mode="full" />
        ) : (
          <div className="mx-auto max-w-[720px] px-6 py-16 text-sm text-gray-500">
            Document unavailable.
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
