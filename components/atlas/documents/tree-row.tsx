"use client"

import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  GripVertical,
  Link2,
  MoreHorizontal,
  Plus,
} from "lucide-react"
import { useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TreeNodeWithChildren } from "@/lib/documents/types"
import type { Backlink } from "@/lib/documents/backlinks"
import type { Canvas } from "@/lib/atlas-types"
import { InlineRename } from "./inline-rename"
import { buildDropId } from "./dnd/drop-zone"

const INDENT_PX = 12
const MAX_INDENT_LEVEL = 6

export interface TreeRowCallbacks {
  onOpenDocument: (id: string) => void
  onToggleFolder: (id: string, next: boolean) => void
  onStartRename: (id: string) => void
  onCommitRename: (id: string, name: string) => void
  onCancelRename: () => void
  onCreateDocumentInFolder: (parentId: string) => void
  onCreateFolderInFolder: (parentId: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onCopyLink: (id: string) => void
  onAddToCanvas: (id: string) => void
  onAddToCanvasSpecific: (id: string, canvasId: string) => void
  onNavigateToCanvas: (canvasId: string, nodeId?: string) => void
  onMoveTo: (id: string) => void
  canvases: Canvas[]
  activeCanvasId: string | null
  backlinksByDocId: Map<string, Backlink[]>
  activeDocId: string | null
  ancestorsOfActive: Set<string>
  renamingId: string | null
  activeDragId: string | null
  overDropId: string | null
  rejectedDropTargetIds: Set<string>
}

export function TreeRow({
  entry,
  callbacks,
}: {
  entry: TreeNodeWithChildren
  callbacks: TreeRowCallbacks
}) {
  const { node, depth, children } = entry
  const [hover, setHover] = useState(false)

  const isFolder = node.type === "folder"
  const isActive = !isFolder && callbacks.activeDocId === node.id
  const forceExpanded = isFolder && callbacks.ancestorsOfActive.has(node.id)
  const expanded = isFolder && (forceExpanded || !node.collapsed)
  const isRenaming = callbacks.renamingId === node.id
  const isDragging = callbacks.activeDragId === node.id

  const label = isFolder ? node.name : node.title
  const displayLabel = label || (isFolder ? "New folder" : "Untitled")
  const backlinks = !isFolder ? callbacks.backlinksByDocId.get(node.id) ?? [] : []

  const visualDepth = Math.min(depth, MAX_INDENT_LEVEL)
  const indentStyle = { paddingLeft: 8 + visualDepth * INDENT_PX }

  const draggable = useDraggable({
    id: node.id,
    data: { type: node.type, parentId: node.parentId },
  })

  const dropBefore = useDroppable({
    id: buildDropId.before(node.id),
    data: { kind: "before", nodeId: node.id, parentId: node.parentId },
  })
  const dropInto = useDroppable({
    id: buildDropId.into(node.id),
    disabled: !isFolder,
    data: { kind: "into", nodeId: node.id },
  })
  const dropAfter = useDroppable({
    id: buildDropId.after(node.id),
    data: { kind: "after", nodeId: node.id, parentId: node.parentId },
  })

  const rejected = callbacks.rejectedDropTargetIds.has(node.id)
  const overBefore = callbacks.overDropId === buildDropId.before(node.id) && !rejected
  const overInto = callbacks.overDropId === buildDropId.into(node.id) && !rejected
  const overAfter = callbacks.overDropId === buildDropId.after(node.id) && !rejected

  const handleRowClick = () => {
    if (isRenaming || callbacks.activeDragId) return
    if (isFolder) callbacks.onToggleFolder(node.id, !expanded)
    else callbacks.onOpenDocument(node.id)
  }

  return (
    <>
      <div className="relative">
        {/* top drop zone strip */}
        <div
          ref={dropBefore.setNodeRef}
          className="absolute top-0 left-0 right-0 h-1.5 z-10"
          aria-hidden
        />
        {overBefore && (
          <div
            className="absolute top-0 left-0 right-0 h-0.5 z-20 pointer-events-none"
            style={{ backgroundColor: "var(--app-text-primary)", boxShadow: "0 0 0 1px var(--app-bg-elevated)" }}
            aria-hidden
          />
        )}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              ref={(el) => {
                draggable.setNodeRef(el)
                dropInto.setNodeRef(el)
              }}
              {...draggable.attributes}
              role="button"
              tabIndex={0}
              data-doc-row-id={node.id}
              onClick={handleRowClick}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleRowClick()
                } else if (e.key === "F2") {
                  e.preventDefault()
                  callbacks.onStartRename(node.id)
                } else if (e.key === "Delete" || e.key === "Backspace") {
                  if (isRenaming) return
                  e.preventDefault()
                  callbacks.onDelete(node.id)
                } else if (isFolder && e.key === "ArrowRight") {
                  if (!expanded) {
                    e.preventDefault()
                    callbacks.onToggleFolder(node.id, true)
                  }
                } else if (isFolder && e.key === "ArrowLeft") {
                  if (expanded) {
                    e.preventDefault()
                    callbacks.onToggleFolder(node.id, false)
                  }
                }
              }}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              className={`group w-full flex items-center gap-1.5 pr-1 py-1 rounded-md text-sm cursor-pointer transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${
                isDragging ? "opacity-40" : ""
              } ${
                overInto
                  ? "bg-white/15 text-foreground ring-1 ring-white/25"
                  : isActive
                    ? "bg-white/10 text-foreground"
                    : "text-gray-300 hover:bg-white/5 hover:text-foreground"
              }`}
              style={{ ...indentStyle, fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <span
                {...draggable.listeners}
                className="flex-shrink-0 w-3 flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 hover:text-gray-300 cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
                aria-label="Drag"
              >
                <GripVertical className="w-3 h-3" strokeWidth={1.5} />
              </span>

              {isFolder ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    callbacks.onToggleFolder(node.id, !expanded)
                  }}
                  className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded hover:bg-white/10"
                  aria-label={expanded ? "Collapse" : "Expand"}
                >
                  <ChevronRight
                    className="w-3 h-3 transition-transform motion-reduce:transition-none"
                    strokeWidth={1.75}
                    style={{ transform: expanded ? "rotate(90deg)" : "none" }}
                  />
                </button>
              ) : (
                <span className="flex-shrink-0 w-4 h-4" aria-hidden />
              )}

              <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 text-gray-400">
                {isFolder ? (
                  expanded ? (
                    <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
                  ) : (
                    <Folder className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )
                ) : node.type === "document" && node.icon ? (
                  <span className="text-[13px] leading-none">{node.icon}</span>
                ) : (
                  <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
              </span>

              {isRenaming ? (
                <InlineRename
                  value={label}
                  placeholder={isFolder ? "New folder" : "Untitled"}
                  onCommit={(next) => callbacks.onCommitRename(node.id, next)}
                  onCancel={callbacks.onCancelRename}
                />
              ) : (
                <>
                  <span className="flex-1 min-w-0 truncate">{displayLabel}</span>
                  {backlinks.length > 0 && !hover && (
                    <span
                      className="flex-shrink-0 flex items-center gap-0.5 text-[10px] text-gray-500"
                      title={`On ${backlinks.length} canvas${backlinks.length === 1 ? "" : "es"}`}
                      aria-label={`On ${backlinks.length} canvas${backlinks.length === 1 ? "" : "es"}`}
                    >
                      <Link2 className="w-3 h-3" strokeWidth={1.5} />
                      {backlinks.length}
                    </span>
                  )}
                </>
              )}

              {(hover || isActive) && !isRenaming && !callbacks.activeDragId && (
                <div className="flex-shrink-0 flex items-center gap-0.5">
                  {isFolder && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-foreground"
                          aria-label="Add inside folder"
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            callbacks.onCreateDocumentInFolder(node.id)
                          }}
                        >
                          New document
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            callbacks.onCreateFolderInFolder(node.id)
                          }}
                        >
                          New folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <RowMoreMenu
                    onSelect={(cmd) => runCommand(cmd, node.id, callbacks)}
                  />
                </div>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            <ContextMenuItem onClick={() => callbacks.onStartRename(node.id)}>
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => callbacks.onDuplicate(node.id)}>
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem onClick={() => callbacks.onMoveTo(node.id)}>
              Move to
            </ContextMenuItem>
            {!isFolder && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>Add to canvas</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-60 max-h-72 overflow-y-auto">
                  {callbacks.canvases.length === 0 ? (
                    <ContextMenuItem disabled>No canvases yet</ContextMenuItem>
                  ) : (
                    <>
                      {callbacks.activeCanvasId && (
                        <>
                          {(() => {
                            const active = callbacks.canvases.find(
                              (c) => c.id === callbacks.activeCanvasId,
                            )
                            if (!active) return null
                            return (
                              <>
                                <ContextMenuItem
                                  onClick={() =>
                                    callbacks.onAddToCanvasSpecific(node.id, active.id)
                                  }
                                >
                                  {active.name}{" "}
                                  <span className="ml-auto text-[10px] text-gray-500">
                                    current
                                  </span>
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                              </>
                            )
                          })()}
                        </>
                      )}
                      {callbacks.canvases
                        .filter((c) => c.id !== callbacks.activeCanvasId)
                        .map((c) => (
                          <ContextMenuItem
                            key={c.id}
                            onClick={() =>
                              callbacks.onAddToCanvasSpecific(node.id, c.id)
                            }
                          >
                            {c.name}
                          </ContextMenuItem>
                        ))}
                    </>
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
            {!isFolder && backlinks.length > 0 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  On {backlinks.length} canvas{backlinks.length === 1 ? "" : "es"}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-60 max-h-72 overflow-y-auto">
                  {backlinks.map((bl) => (
                    <ContextMenuItem
                      key={`${bl.canvasId}:${bl.nodeId}`}
                      onClick={() =>
                        callbacks.onNavigateToCanvas(bl.canvasId, bl.nodeId)
                      }
                    >
                      {bl.canvasName}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
            <ContextMenuItem onClick={() => callbacks.onCopyLink(node.id)}>
              Copy link
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => callbacks.onDelete(node.id)}
              className="text-red-400 focus:text-red-400"
            >
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* bottom drop zone strip */}
        <div
          ref={dropAfter.setNodeRef}
          className="absolute bottom-0 left-0 right-0 h-1.5 z-10"
          aria-hidden
        />
        {overAfter && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 z-20 pointer-events-none"
            style={{ backgroundColor: "var(--app-text-primary)", boxShadow: "0 0 0 1px var(--app-bg-elevated)" }}
            aria-hidden
          />
        )}
      </div>

      {isFolder && expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeRow key={child.node.id} entry={child} callbacks={callbacks} />
          ))}
        </div>
      )}
    </>
  )
}

type RowCommand =
  | "rename"
  | "duplicate"
  | "moveTo"
  | "addToCanvas"
  | "copyLink"
  | "delete"

function runCommand(
  cmd: RowCommand,
  id: string,
  callbacks: TreeRowCallbacks,
): void {
  switch (cmd) {
    case "rename":
      callbacks.onStartRename(id)
      break
    case "duplicate":
      callbacks.onDuplicate(id)
      break
    case "moveTo":
      callbacks.onMoveTo(id)
      break
    case "addToCanvas":
      callbacks.onAddToCanvas(id)
      break
    case "copyLink":
      callbacks.onCopyLink(id)
      break
    case "delete":
      callbacks.onDelete(id)
      break
  }
}

function RowMoreMenu({
  onSelect,
}: {
  onSelect: (cmd: RowCommand) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-foreground"
          aria-label="More"
        >
          <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onSelect("rename")}>
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("duplicate")}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("moveTo")}>
          Move to
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("addToCanvas")}>
          Add to canvas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("copyLink")}>
          Copy link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSelect("delete")}
          className="text-red-400 focus:text-red-400"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
