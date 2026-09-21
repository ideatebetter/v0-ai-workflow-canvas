"use client"

import { NodeResizer, useViewport, type NodeProps } from "@xyflow/react"
import { FileText, ExternalLink, RotateCcw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SmartHandles } from "../smart-handles"
import { DocumentEditor } from "../documents/document-editor"
import { useDocumentsStore } from "@/lib/documents/store"
import type {
  DocumentCanvasNodeData,
  DocumentNode as DocumentNodeType,
} from "@/lib/documents/types"
import type { DocumentCanvasNodeData as AtlasDocumentNodeData } from "@/lib/atlas-types"

const CHIP_ZOOM_THRESHOLD = 0.4
const MIN_W = 260
const MIN_H = 160

export function DocumentNode({ id, data, selected }: NodeProps) {
  const { docId } = data as unknown as AtlasDocumentNodeData
  const router = useRouter()
  const { zoom } = useViewport()

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const doc = useDocumentsStore(
    (s) => s.tree[docId] as DocumentNodeType | undefined,
  )
  const tombstone = useDocumentsStore((s) => s.tombstones[docId])
  const restoreDocument = useDocumentsStore((s) => s.restoreDocument)

  const navigateToDoc = () => router.push(`/doc/${docId}`)

  const borderColor = selected ? "var(--app-text-primary)" : "var(--app-border-strong)"
  const collapsedToChip = zoom < CHIP_ZOOM_THRESHOLD

  if (!hydrated) {
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
        Loading document…
      </div>
    )
  }

  if (!doc) {
    return (
      <div
        style={{
          width: MIN_W,
          padding: 12,
          background: "var(--app-card-elevated)",
          border: `1px dashed ${tombstone ? "var(--app-border-strong)" : borderColor}`,
          borderRadius: 10,
          fontFamily: "system-ui, Inter, sans-serif",
          fontSize: 13,
          color: "var(--app-text-muted)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <SmartHandles nodeId={id} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Trash2 style={{ width: 14, height: 14 }} strokeWidth={1.5} />
          <span style={{ color: "var(--app-text-primary)" }}>
            {tombstone ? `Deleted · ${tombstone.title || "Untitled"}` : "Document unavailable"}
          </span>
        </div>
        {tombstone && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              const restored = restoreDocument(tombstone.id)
              if (restored) toast.success("Document restored")
            }}
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid var(--app-border-strong)",
              color: "var(--app-text-primary)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <RotateCcw style={{ width: 12, height: 12 }} strokeWidth={1.5} />
            Restore
          </button>
        )}
      </div>
    )
  }

  if (collapsedToChip) {
    return (
      <div
        onClick={navigateToDoc}
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
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
        cursor: "pointer",
      }}
      onClick={navigateToDoc}
    >
      <NodeResizer
        color="var(--app-text-primary)"
        isVisible={selected}
        minWidth={MIN_W}
        minHeight={MIN_H}
      />
      <SmartHandles nodeId={id} />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderBottom: "1px solid var(--app-border)",
          fontSize: 12,
          color: "var(--app-text-muted)",
          flexShrink: 0,
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
        <ExternalLink style={{ width: 12, height: 12, flexShrink: 0 }} strokeWidth={1.5} />
      </div>

      {/* Read-only content preview */}
      <div
        style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative", pointerEvents: "none" }}
      >
        <DocumentEditor docId={docId} mode="card" />
      </div>
    </div>
  )
}

// Type re-export so consumers using the atlas-types union get the same shape.
export type { DocumentCanvasNodeData }
