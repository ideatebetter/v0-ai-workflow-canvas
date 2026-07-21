"use client";

import React from "react";
import { Star, Trash2, FolderOpen } from "lucide-react";
import { CanvasPreview } from "./canvas-preview";
import type { Canvas } from "./types";

interface CanvasCardProps {
  canvas: Canvas;
  onOpen: (canvasId: string) => void;
  onToggleFavorite?: (canvasId: string) => void;
  onDelete?: (canvasId: string) => void;
  /** Optional label/color for the "collection" chip in the footer. */
  collectionName?: string;
  collectionColor?: string;
  onOpenCollectionMenu?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CanvasCard({
  canvas,
  onOpen,
  onToggleFavorite,
  onDelete,
  collectionName,
  collectionColor,
  onOpenCollectionMenu,
}: CanvasCardProps) {
  return (
    <div
      className="group rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-white/20"
      style={{ backgroundColor: "var(--app-card-elevated)" }}
      onClick={() => onOpen(canvas.id)}
    >
      {/* Preview */}
      <div className="aspect-[16/10] overflow-hidden relative">
        <CanvasPreview nodes={canvas.nodes} />

        {(onToggleFavorite || onDelete) && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(canvas.id);
                }}
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                title={canvas.isFavorite ? "Unpin" : "Pin to top"}
              >
                <Star
                  className="w-4 h-4"
                  strokeWidth={1.5}
                  fill={canvas.isFavorite ? "var(--app-text-primary)" : "none"}
                  style={{ color: "var(--app-text-primary)" }}
                />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(canvas.id);
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/20"
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} style={{ color: "#ef4444" }} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div
            className="font-medium text-sm truncate"
            style={{
              color: "var(--app-text-primary)",
              fontFamily: "system-ui, Inter, sans-serif",
            }}
          >
            {canvas.name}
          </div>

          {canvas.collaborators && canvas.collaborators.length > 0 && (
            <div className="flex -space-x-1.5 ml-2 flex-shrink-0">
              {canvas.collaborators.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1"
                  style={{
                    backgroundColor: c.avatar ? "transparent" : "var(--app-canvas-dot)",
                    color: "var(--app-text-primary)",
                    fontFamily: "system-ui, Inter, sans-serif",
                    // @ts-expect-error CSS var into ring color
                    "--tw-ring-color": "var(--app-card-elevated)",
                  }}
                  title={c.name}
                >
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    c.initials
                  )}
                </div>
              ))}
              {canvas.collaborators.length > 3 && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium"
                  style={{
                    backgroundColor: "var(--app-border-strong)",
                    color: "var(--app-text-muted)",
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
                >
                  +{canvas.collaborators.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          <div
            className="text-xs"
            style={{
              color: "var(--app-text-muted)",
              fontFamily: "system-ui, Inter, sans-serif",
            }}
          >
            {formatDate(canvas.updatedAt)}
          </div>

          {onOpenCollectionMenu && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCollectionMenu();
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-white/10"
              style={{
                color: collectionColor ?? "var(--app-text-faint)",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
              title="Set collection"
            >
              <FolderOpen className="w-3 h-3" strokeWidth={1.2} />
              <span className="max-w-[70px] truncate">
                {collectionName ?? "Add to collection"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CanvasCard;
