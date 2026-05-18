"use client";

import React, { useEffect, useRef } from "react";

interface NodeContextMenuProps {
  position: { x: number; y: number };
  selectedCount: number;
  onClose: () => void;
  onMoveToCanvas: () => void;
  onDuplicateToCanvas: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  hasOtherCanvases: boolean;
  onSyncNode?: () => void;
  isSyncableNode?: boolean;
  isSynced?: boolean;
  onOrganize?: () => void;
}

export function NodeContextMenu({
  position,
  selectedCount,
  onClose,
  onMoveToCanvas,
  onDuplicateToCanvas,
  onDuplicate,
  onDelete,
  hasOtherCanvases,
  onSyncNode,
  isSyncableNode,
  isSynced,
  onOrganize,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 220),
    y: Math.min(position.y, window.innerHeight - 300),
  };

  const nodeLabel = selectedCount === 1 ? "Node" : `${selectedCount} Nodes`;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] py-2 rounded-xl overflow-hidden"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        background: "rgba(28, 28, 30, 0.98)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset",
        minWidth: 200,
      }}
    >
      {/* Header showing selection count */}
      <div 
        className="px-3 py-2 mb-1"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span 
          className="text-xs text-gray-400 font-medium"
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
        >
          {nodeLabel} Selected
        </span>
      </div>

      {/* Duplicate in place */}
      <button
        type="button"
        onClick={() => {
          onDuplicate();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-3"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
          <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        Duplicate
        <span className="ml-auto text-xs text-gray-500">⌘D</span>
      </button>

      {/* Organize - only show when multiple nodes selected */}
      {selectedCount > 1 && onOrganize && (
        <button
          type="button"
          onClick={() => {
            onOrganize();
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-3"
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
            <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          Organize
        </button>
      )}

      {/* Sync option - for single file or text nodes */}
      {isSyncableNode && selectedCount === 1 && onSyncNode && (
        <>
          <div className="h-px mx-2 my-1" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
          <button
            type="button"
            onClick={() => {
              onSyncNode();
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-3"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={isSynced ? "text-green-400" : "text-gray-400"}>
              <path d="M4 10C4 10 5.5 6 8 6C10.5 6 12 10 12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 6C4 6 5.5 10 8 10C10.5 10 12 6 12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M2 8H4M12 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {isSynced ? "Manage Sync..." : "Sync with..."}
            {isSynced && (
              <span
                className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}
              >
                Synced
              </span>
            )}
          </button>
        </>
      )}

      {/* Divider */}
      {hasOtherCanvases && (
        <>
          <div className="h-px mx-2 my-1" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
          
          {/* Move to Canvas */}
          <button
            type="button"
            onClick={() => {
              onMoveToCanvas();
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-3"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
              <path d="M6 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 8H10M10 8L8 6M10 8L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Move to Canvas...
          </button>

          {/* Copy to Canvas */}
          <button
            type="button"
            onClick={() => {
              onDuplicateToCanvas();
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-3"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
              <rect x="2" y="2" width="5" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="8" width="5" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4.5 8V11.5C4.5 12.0523 4.94772 12.5 5.5 12.5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 10.5L7 12.5L9 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Copy to Canvas...
          </button>
        </>
      )}

      {/* Divider */}
      <div className="h-px mx-2 my-1" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />

      {/* Delete */}
      <button
        type="button"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-400">
          <path d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4H12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Delete
        <span className="ml-auto text-xs text-gray-500">⌫</span>
      </button>
    </div>
  );
}
