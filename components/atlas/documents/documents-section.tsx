"use client"

import { FileText, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDocumentsStore } from "@/lib/documents/store"
import { ancestorChain, buildTree } from "@/lib/documents/tree"
import { TreeRow, type TreeRowCallbacks } from "./tree-row"

export function DocumentsSection() {
  const router = useRouter()
  const pathname = usePathname()

  const tree = useDocumentsStore((s) => s.tree)
  const createDocument = useDocumentsStore((s) => s.createDocument)
  const createFolder = useDocumentsStore((s) => s.createFolder)
  const renameNode = useDocumentsStore((s) => s.renameNode)
  const setFolderCollapsed = useDocumentsStore((s) => s.setFolderCollapsed)
  const deleteNode = useDocumentsStore((s) => s.deleteNode)
  const duplicateNode = useDocumentsStore((s) => s.duplicateNode)

  const [renamingId, setRenamingId] = useState<string | null>(null)

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

  const handleAddToCanvas = useCallback((_id: string) => {
    toast("Add to canvas ships in a later phase")
  }, [])

  const handleMoveTo = useCallback((_id: string) => {
    toast("Move to ships in a later phase")
  }, [])

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
      onAddToCanvas: handleAddToCanvas,
      onMoveTo: handleMoveTo,
      activeDocId,
      ancestorsOfActive,
      renamingId,
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
      handleMoveTo,
      activeDocId,
      ancestorsOfActive,
      renamingId,
    ],
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
        <div className="pr-1">
          {rendered.map((entry) => (
            <TreeRow key={entry.node.id} entry={entry} callbacks={callbacks} />
          ))}
        </div>
      )}
    </div>
  )
}
