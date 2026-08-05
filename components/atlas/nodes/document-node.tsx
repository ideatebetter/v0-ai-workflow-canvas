"use client"

import { NodeResizer, useReactFlow, useViewport, type NodeProps } from "@xyflow/react"
import { FileText, Maximize2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { SmartHandles } from "../smart-handles"
import { DocumentEditor } from "../documents/document-editor"
import { useDocumentsStore } from "@/lib/documents/store"
import { useDocumentOverlayStore } from "@/lib/documents/overlay-store"
import type {
  DocumentCanvasNodeData,
  DocumentNode as DocumentNodeType,
} from "@/lib/documents/types"
import type { DocumentCanvasNodeData as AtlasDocumentNodeData } from "@/lib/atlas-types"

const CHIP_ZOOM_THRESHOLD = 0.4
const MIN_W = 260
const MIN_H = 160

export function DocumentNode({ id, data, selected }: NodeProps) {
  const { docId, displayMode = "card" } = data as unknown as AtlasDocumentNodeData
  const { setNodes } = useReactFlow()
  const { zoom } = useViewport()
  const openOverlay = useDocumentOverlayStore((s) => s.open)
  const editorContainerRef = useRef<HTMLDivElement | null>(null)

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const doc = useDocumentsStore(
    (s) => s.tree[docId] as DocumentNodeType | undefined,
  )

  const enterPanel = useCallback(() => {
    if (displayMode === "panel") return
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, displayMode: "panel" } }
          : n,
      ),
    )
  }, [displayMode, id, setNodes])

  const exitPanel = useCallback(() => {
    if (displayMode !== "panel") return
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, displayMode: "card" } }
          : n,
      ),
    )
  }, [displayMode, id, setNodes])

  const openFull = useCallback(() => openOverlay(docId), [openOverlay, docId])

  const isPanel = displayMode === "panel"
  const isCard = !isPanel
  const collapsedToChip = isCard && zoom < CHIP_ZOOM_THRESHOLD

  const borderColor = selected
    ? "var(--app-text-primary)"
    : isPanel
      ? "var(--app-text-primary)"
      : "var(--app-border-strong)"

  if (!hydrated || !doc) {
    return (
      <div
        style={{
          width: MIN_W,
          minHeight: 60,
          padding: 10,
          background: "var(--app-card-elevated)",
          border: `1px dashed ${borderColor}`,
          borderRadius: 10,
          color: "var(--app-text-muted)",
          fontFamily: "system-ui, Inter, sans-serif",
          fontSize: 13,
        }}
      >
        <SmartHandles nodeId={id} />
        {!hydrated ? "Loading document…" : "Document unavailable"}
      </div>
    )
  }

  if (collapsedToChip) {
    return (
      <div
        onClick={openFull}
        style={{
          padding: "6px 10px",
          background: "var(--app-card-elevated)",
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "system-ui, Inter, sans-serif",
          fontSize: 12,
          color: "var(--app-text-primary)",
          cursor: "pointer",
          maxWidth: 220,
        }}
      >
        <SmartHandles nodeId={id} />
        {doc.icon ? (
          <span style={{ fontSize: 13, lineHeight: 1 }}>{doc.icon}</span>
        ) : (
          <FileText style={{ width: 12, height: 12 }} strokeWidth={1.5} />
        )}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.title || "Untitled"}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minWidth: MIN_W,
        minHeight: MIN_H,
        background: "var(--app-bg-elevated)",
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, Inter, sans-serif",
      }}
      onDoubleClick={enterPanel}
    >
      <NodeResizer
        color="var(--app-text-primary)"
        isVisible={selected}
        minWidth={MIN_W}
        minHeight={MIN_H}
      />
      <SmartHandles nodeId={id} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderBottom: "1px solid var(--app-border)",
          fontSize: 12,
          color: "var(--app-text-muted)",
        }}
      >
        {doc.icon ? (
          <span style={{ fontSize: 14, lineHeight: 1 }}>{doc.icon}</span>
        ) : (
          <FileText style={{ width: 12, height: 12 }} strokeWidth={1.5} />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--app-text-primary)",
            fontWeight: 500,
          }}
        >
          {doc.title || "Untitled"}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openFull()
          }}
          title="Open full"
          style={{
            padding: 2,
            borderRadius: 4,
            background: "transparent",
            border: "none",
            color: "var(--app-text-muted)",
            cursor: "pointer",
          }}
        >
          <Maximize2 style={{ width: 12, height: 12 }} strokeWidth={1.5} />
        </button>
      </div>

      <div
        ref={editorContainerRef}
        className={isPanel ? "nodrag nowheel" : ""}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: isPanel ? "auto" : "hidden",
          position: "relative",
        }}
        onKeyDown={(e) => {
          if (!isPanel) return
          if (e.key === "Escape") {
            e.preventDefault()
            e.stopPropagation()
            exitPanel()
            return
          }
          // Prevent React Flow keyboard shortcuts (delete, backspace,
          // and single-letter tool switches) from firing while editing.
          e.stopPropagation()
        }}
        onKeyDownCapture={(e) => {
          if (isPanel) e.stopPropagation()
        }}
        onPointerDown={(e) => {
          if (isPanel) e.stopPropagation()
        }}
      >
        <DocumentEditor
          docId={docId}
          mode={isPanel ? "panel" : "card"}
          onRequestFocus={enterPanel}
        />
      </div>
    </div>
  )
}

// Type re-export so consumers using the atlas-types union get the same shape.
export type { DocumentCanvasNodeData }
