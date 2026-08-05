"use client"

import { FileText, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDocumentsStore } from "@/lib/documents/store"
import { ancestorChain, buildTree, isDescendantOf } from "@/lib/documents/tree"
import { findBacklinks, type Backlink } from "@/lib/documents/backlinks"
import type { Canvas } from "@/lib/atlas-types"
import { TreeRow, type TreeRowCallbacks } from "./tree-row"
import { buildDropId, parseDropId, type DropZone } from "./dnd/drop-zone"
import { useHoverAutoExpand } from "./dnd/hover-auto-expand"

export interface DocumentsSectionProps {
  canvases?: Canvas[]
  activeCanvasId?: string | null
  onAddDocumentToCanvas?: (args: {
    docId: string
    canvasId: string
    position?: { x: number; y: number }
  }) => void
  onNavigateToCanvas?: (canvasId: string, nodeId?: string) => void
}

export function DocumentsSection({
  canvases = [],
  activeCanvasId = null,
  onAddDocumentToCanvas,
  onNavigateToCanvas,
}: DocumentsSectionProps = {}) {
  const router = useRouter()
  const pathname = usePathname()

  const tree = useDocumentsStore((s) => s.tree)
  const createDocument = useDocumentsStore((s) => s.createDocument)
  const createFolder = useDocumentsStore((s) => s.createFolder)
  const renameNode = useDocumentsStore((s) => s.renameNode)
  const setFolderCollapsed = useDocumentsStore((s) => s.setFolderCollapsed)
  const deleteNode = useDocumentsStore((s) => s.deleteNode)
  const duplicateNode = useDocumentsStore((s) => s.duplicateNode)
  const moveNode = useDocumentsStore((s) => s.moveNode)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [overDropId, setOverDropId] = useState<string | null>(null)
  const treeRef = useRef(tree)
  treeRef.current = tree

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  const rendered = useMemo(() => buildTree(tree), [tree])

  const activeDocId = useMemo(() => {
    if (!pathname) return null
    const m = pathname.match(/^\/doc\/([^/]+)/)
    return m ? decodeURIComponent(m[1]!) : null
  }, [pathname])

  const ancestorsOfActive = useMemo(() => {
    if (!activeDocId) return new Set<string>()
    return new Set(ancestorChain(tree, activeDocId).map((n) => n.id))
  }, [tree, activeDocId])

  const openDocument = useCallback(
    (id: string) => router.push(`/doc/${id}`),
    [router],
  )

  const beginRename = useCallback((id: string) => setRenamingId(id), [])
  const cancelRename = useCallback(() => setRenamingId(null), [])
  const commitRename = useCallback(
    (id: string, name: string) => {
      renameNode(id, name)
      setRenamingId(null)
    },
    [renameNode],
  )

  const createRootDocument = useCallback(() => {
    const id = createDocument({ title: "" })
    setRenamingId(id)
  }, [createDocument])

  const createRootFolder = useCallback(() => {
    const id = createFolder({ name: "" })
    setRenamingId(id)
  }, [createFolder])

  const createDocumentInFolder = useCallback(
    (parentId: string) => {
      const id = createDocument({ parentId, title: "" })
      setFolderCollapsed(parentId, false)
      setRenamingId(id)
    },
    [createDocument, setFolderCollapsed],
  )

  const createFolderInFolder = useCallback(
    (parentId: string) => {
      const id = createFolder({ parentId, name: "" })
      setFolderCollapsed(parentId, false)
      setRenamingId(id)
    },
    [createFolder, setFolderCollapsed],
  )

  const handleDuplicate = useCallback(
    (id: string) => {
      const cloneId = duplicateNode(id)
      if (cloneId) toast.success("Duplicated")
    },
    [duplicateNode],
  )

  const handleDelete = useCallback(
    (id: string) => {
      const node = useDocumentsStore.getState().tree[id]
      if (!node) return
      const label = node.type === "folder" ? node.name || "this folder" : node.title || "Untitled"
      const isFolder = node.type === "folder"
      const message = isFolder
        ? `Delete "${label}" and everything inside it?`
        : `Delete "${label}"?`
      if (!window.confirm(message)) return
      const removed = deleteNode(id)
      toast.success(
        removed.length > 1 ? `Deleted ${removed.length} items` : "Deleted",
      )
    },
    [deleteNode],
  )

  const handleCopyLink = useCallback(async (id: string) => {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}/doc/${id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy link")
    }
  }, [])

  const backlinksByDocId = useMemo(() => {
    const map = new Map<string, Backlink[]>()
    if (!canvases.length) return map
    for (const id of Object.keys(tree)) {
      if (tree[id]?.type !== "document") continue
      const bls = findBacklinks(canvases, id)
      if (bls.length) map.set(id, bls)
    }
    return map
  }, [tree, canvases])

  const handleAddToCanvas = useCallback(
    (docId: string, canvasId?: string) => {
      if (!onAddDocumentToCanvas) {
        toast("No canvas is available to add to yet")
        return
      }
      const targetId = canvasId ?? activeCanvasId ?? canvases[0]?.id
      if (!targetId) {
        toast("Create a canvas first")
        return
      }
      onAddDocumentToCanvas({ docId, canvasId: targetId })
      const canvas = canvases.find((c) => c.id === targetId)
      toast.success(`Added to canvas${canvas ? ` "${canvas.name}"` : ""}`)
    },
    [onAddDocumentToCanvas, activeCanvasId, canvases],
  )

  const handleNavigateBacklink = useCallback(
    (canvasId: string, nodeId?: string) => {
      onNavigateToCanvas?.(canvasId, nodeId)
    },
    [onNavigateToCanvas],
  )

  const handleMoveTo = useCallback((_id: string) => {
    toast("Move to ships in a later phase")
  }, [])

  const rejectedDropTargetIds = useMemo(() => {
    if (!activeDragId) return new Set<string>()
    const rejected = new Set<string>([activeDragId])
    const active = tree[activeDragId]
    if (active?.type === "folder") {
      const walk = (id: string) => {
        for (const n of Object.values(tree)) {
          if (n.parentId === id) {
            rejected.add(n.id)
            if (n.type === "folder") walk(n.id)
          }
        }
      }
      walk(activeDragId)
    }
    return rejected
  }, [tree, activeDragId])

  const hoveredFolderId = useMemo(() => {
    const zone = parseDropId(overDropId, (id) => treeRef.current[id]?.parentId ?? null)
    if (!zone) return null
    if (zone.kind === "into") return zone.nodeId
    return null
  }, [overDropId])

  useHoverAutoExpand(
    activeDragId ? hoveredFolderId : null,
    (id) => {
      const node = treeRef.current[id]
      if (node?.type === "folder" && node.collapsed) {
        setFolderCollapsed(id, false)
      }
    },
    600,
  )

  const callbacks: TreeRowCallbacks = useMemo(
    () => ({
      onOpenDocument: openDocument,
      onToggleFolder: (id, next) => setFolderCollapsed(id, !next),
      onStartRename: beginRename,
      onCommitRename: commitRename,
      onCancelRename: cancelRename,
      onCreateDocumentInFolder: createDocumentInFolder,
      onCreateFolderInFolder: createFolderInFolder,
      onDuplicate: handleDuplicate,
      onDelete: handleDelete,
      onCopyLink: handleCopyLink,
      onAddToCanvas: (id) => handleAddToCanvas(id),
      onAddToCanvasSpecific: (id, canvasId) => handleAddToCanvas(id, canvasId),
      onNavigateToCanvas: handleNavigateBacklink,
      onMoveTo: handleMoveTo,
      canvases,
      activeCanvasId,
      backlinksByDocId,
      activeDocId,
      ancestorsOfActive,
      renamingId,
      activeDragId,
      overDropId,
      rejectedDropTargetIds,
    }),
    [
      openDocument,
      setFolderCollapsed,
      beginRename,
      commitRename,
      cancelRename,
      createDocumentInFolder,
      createFolderInFolder,
      handleDuplicate,
      handleDelete,
      handleCopyLink,
      handleAddToCanvas,
      handleNavigateBacklink,
      handleMoveTo,
      canvases,
      activeCanvasId,
      backlinksByDocId,
      activeDocId,
      ancestorsOfActive,
      renamingId,
      activeDragId,
      overDropId,
      rejectedDropTargetIds,
    ],
  )

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveDragId(String(e.active.id))
    setOverDropId(null)
  }, [])

  const onDragOver = useCallback((e: DragOverEvent) => {
    setOverDropId(e.over ? String(e.over.id) : null)
  }, [])

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const activeId = String(e.active.id)
      const overId = e.over ? String(e.over.id) : null
      setActiveDragId(null)
      setOverDropId(null)
      if (!overId) return

      const currentTree = treeRef.current
      const zone: DropZone | null =
        overId === buildDropId.rootEnd
          ? { kind: "root-end" }
          : parseDropId(overId, (id) => currentTree[id]?.parentId ?? null)
      if (!zone) return

      let targetParentId: string | null
      let beforeId: string | null = null
      let afterId: string | null = null

      if (zone.kind === "root-end") {
        targetParentId = null
      } else if (zone.kind === "into") {
        targetParentId = zone.nodeId
      } else if (zone.kind === "before") {
        targetParentId = zone.parentId
        beforeId = zone.nodeId
      } else {
        targetParentId = zone.parentId
        afterId = zone.nodeId
      }

      if (activeId === targetParentId) return
      const active = currentTree[activeId]
      if (!active) return
      if (
        active.type === "folder" &&
        targetParentId !== null &&
        (targetParentId === activeId ||
          isDescendantOf(currentTree, activeId, targetParentId))
      ) {
        toast.error("Can't move a folder into itself")
        return
      }

      const result = moveNode({
        id: activeId,
        newParentId: targetParentId,
        beforeId,
        afterId,
      })
      if (!result.ok) {
        toast.error(
          result.reason === "cycle"
            ? "Can't move a folder into itself"
            : result.reason === "invalid"
              ? "Can't drop into a document"
              : "Move failed",
        )
      }
    },
    [moveNode],
  )

  const isEmpty = rendered.length === 0

  if (!hydrated) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
          <span
            className="text-[11px] font-medium text-gray-600 tracking-wide uppercase"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            Documents
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-3 pb-1.5 pt-2 group">
        <span
          className="text-[11px] font-medium text-gray-600 tracking-wide uppercase"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          Documents
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-0.5 rounded text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-foreground transition"
              aria-label="Add"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={createRootDocument}>
              New document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={createRootFolder}>
              New folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isEmpty ? (
        <div
          className="mx-2 mt-1 rounded-lg border border-dashed p-3 text-center"
          style={{ borderColor: "var(--app-border)" }}
        >
          <FileText
            className="w-4 h-4 mx-auto mb-1.5 text-gray-500"
            strokeWidth={1.5}
          />
          <p
            className="text-xs text-gray-500 mb-2 leading-relaxed"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            Notes, briefs, and specs live here — and can be dropped onto any canvas.
          </p>
          <button
            type="button"
            onClick={createRootDocument}
            className="text-xs font-medium text-foreground bg-white/10 hover:bg-white/15 rounded-md px-2.5 py-1 transition"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            New document
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveDragId(null)
            setOverDropId(null)
          }}
        >
          <div className="pr-1">
            {rendered.map((entry) => (
              <TreeRow key={entry.node.id} entry={entry} callbacks={callbacks} />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragId ? <DragChip label={dragLabel(tree, activeDragId)} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

function dragLabel(
  tree: Record<string, { type: string; name?: string; title?: string }>,
  id: string,
): string {
  const node = tree[id]
  if (!node) return "Item"
  return (
    (node.type === "folder"
      ? (node as { name: string }).name
      : (node as { title: string }).title) || (node.type === "folder" ? "Untitled folder" : "Untitled")
  )
}

function DragChip({ label }: { label: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border shadow-lg text-sm text-foreground"
      style={{
        backgroundColor: "var(--app-card-elevated)",
        borderColor: "var(--app-border-strong)",
        fontFamily: "system-ui, Inter, sans-serif",
      }}
    >
      {label}
    </div>
  )
}
