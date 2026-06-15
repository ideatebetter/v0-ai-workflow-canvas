"use client";

import React, { useState } from "react";
import type { Canvas, AtlasNode, CanvasPage } from "@/lib/atlas-types";

type TransferMode = "move" | "copy";

interface MoveToCanvasDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvases: Canvas[];
  currentCanvasId: string;
  selectedNodes: AtlasNode[];
  onTransferToCanvas: (targetCanvasId: string, nodes: AtlasNode[], mode: TransferMode, targetPageId?: string) => void;
  onCreateCanvasAndTransfer: (canvasName: string, nodes: AtlasNode[], mode: TransferMode) => void;
  defaultMode?: TransferMode;
}

function getPages(canvas: Canvas): CanvasPage[] {
  if (canvas.pages && canvas.pages.length > 0) return canvas.pages;
  return [{ id: "__root__", name: "Page 1", nodes: canvas.nodes, edges: canvas.edges }];
}

export function MoveToCanvasDialog({
  isOpen,
  onClose,
  canvases,
  currentCanvasId,
  selectedNodes,
  onTransferToCanvas,
  onCreateCanvasAndTransfer,
  defaultMode = "move",
}: MoveToCanvasDialogProps) {
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [mode, setMode] = useState<TransferMode>(defaultMode);
  const [showNewCanvasInput, setShowNewCanvasInput] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState("");

  if (!isOpen) return null;

  const availableCanvases = canvases.filter((c) => c.id !== currentCanvasId);
  const selectedCanvas = availableCanvases.find(c => c.id === selectedCanvasId) ?? null;
  const pages = selectedCanvas ? getPages(selectedCanvas) : [];
  const hasMultiplePages = pages.length > 1;

  const handleSelectCanvas = (canvasId: string) => {
    setSelectedCanvasId(canvasId);
    setShowNewCanvasInput(false);
    // Auto-select first page
    const canvas = availableCanvases.find(c => c.id === canvasId);
    if (canvas) {
      const ps = getPages(canvas);
      setSelectedPageId(ps[0]?.id ?? null);
    }
  };

  const handleTransfer = () => {
    if (showNewCanvasInput && newCanvasName.trim()) {
      onCreateCanvasAndTransfer(newCanvasName.trim(), selectedNodes, mode);
      handleClose();
    } else if (selectedCanvasId && selectedNodes.length > 0) {
      const pageId = selectedPageId === "__root__" ? undefined : (selectedPageId ?? undefined);
      onTransferToCanvas(selectedCanvasId, selectedNodes, mode, pageId);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedCanvasId(null);
    setSelectedPageId(null);
    setShowNewCanvasInput(false);
    setNewCanvasName("");
    setMode(defaultMode);
    onClose();
  };

  const nodeLabel = selectedNodes.length === 1 ? "node" : "nodes";
  const actionLabel = mode === "move" ? "Move" : "Copy";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "rgba(28, 28, 30, 0.95)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <h2
              className="text-lg font-semibold text-white"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              {actionLabel} to Canvas
            </h2>
            <p
              className="text-sm text-gray-400 mt-0.5"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              {selectedNodes.length} {nodeLabel} selected
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="flex rounded-lg p-1"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <button
              type="button"
              onClick={() => setMode("move")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === "move" ? "text-black" : "text-gray-400 hover:text-white"
              }`}
              style={{
                backgroundColor: mode === "move" ? "#F0FE00" : "transparent",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H6" strokeLinecap="round"/>
                  <path d="M10 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H10" strokeLinecap="round"/>
                  <path d="M6 8H10M10 8L8 6M10 8L8 10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Move
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("copy")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === "copy" ? "text-black" : "text-gray-400 hover:text-white"
              }`}
              style={{
                backgroundColor: mode === "copy" ? "#F0FE00" : "transparent",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="5" y="5" width="9" height="9" rx="1.5"/>
                  <path d="M11 5V3.5C11 2.67157 10.3284 2 9.5 2H3.5C2.67157 2 2 2.67157 2 3.5V9.5C2 10.3284 2.67157 11 3.5 11H5"/>
                </svg>
                Duplicate
              </span>
            </button>
          </div>
          <p
            className="text-xs text-gray-500 mt-2 text-center"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            {mode === "move"
              ? "Remove from current canvas and add to destination"
              : "Keep in current canvas and create a copy in destination"}
          </p>
        </div>

        {/* Canvas + Page List */}
        <div className="px-4 py-4 max-h-[320px] overflow-y-auto">
          {/* Create New Canvas Option */}
          <button
            type="button"
            onClick={() => {
              setShowNewCanvasInput(true);
              setSelectedCanvasId(null);
              setSelectedPageId(null);
            }}
            className={`w-full p-3 rounded-xl text-left transition-all mb-2 ${
              showNewCanvasInput ? "ring-2 ring-[#F0FE00]" : "hover:bg-white/5"
            }`}
            style={{
              backgroundColor: showNewCanvasInput ? "rgba(240, 254, 0, 0.08)" : "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.15)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(240, 254, 0, 0.1)" }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#F0FE00" strokeWidth="1.5">
                  <rect x="2" y="2" width="16" height="16" rx="2" />
                  <path d="M10 6V14M6 10H14" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                  Create New Canvas
                </p>
                <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                  {actionLabel} to a brand new canvas
                </p>
              </div>
            </div>
          </button>

          {showNewCanvasInput && (
            <div className="mb-3 px-1">
              <input
                type="text"
                value={newCanvasName}
                onChange={(e) => setNewCanvasName(e.target.value)}
                placeholder="Enter canvas name..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(240, 254, 0, 0.3)",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCanvasName.trim()) handleTransfer();
                }}
              />
            </div>
          )}

          {/* Existing Canvases */}
          {availableCanvases.length > 0 && (
            <div className="space-y-1.5">
              <p
                className="text-xs text-gray-500 px-1 mb-2"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
              >
                Or choose existing canvas
              </p>
              {availableCanvases.map((canvas) => {
                const isSelected = selectedCanvasId === canvas.id;
                const canvasPages = getPages(canvas);
                const multiPage = canvasPages.length > 1;

                return (
                  <div key={canvas.id}>
                    {/* Canvas row */}
                    <button
                      type="button"
                      onClick={() => handleSelectCanvas(canvas.id)}
                      className={`w-full p-3 rounded-xl text-left transition-all ${
                        isSelected ? "ring-2 ring-[#F0FE00]" : "hover:bg-white/5"
                      }`}
                      style={{
                        backgroundColor: isSelected ? "rgba(240, 254, 0, 0.08)" : "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderBottomLeftRadius: isSelected && multiPage ? 0 : undefined,
                        borderBottomRightRadius: isSelected && multiPage ? 0 : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{ backgroundColor: "#1a1a1a" }}
                        >
                          {canvas.previewImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={canvas.previewImage} alt={canvas.name} className="w-full h-full object-cover" />
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#666" strokeWidth="1.5">
                              <rect x="2" y="2" width="16" height="16" rx="2" />
                              <path d="M2 7h16" />
                              <circle cx="5" cy="4.5" r="1" fill="#666" stroke="none" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                            {canvas.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                            {multiPage ? `${canvasPages.length} pages` : `${canvas.nodes.length} nodes`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {multiPage && (
                            <svg
                              width="14" height="14" viewBox="0 0 16 16" fill="none"
                              className="text-gray-500 transition-transform"
                              style={{ transform: isSelected ? "rotate(90deg)" : undefined }}
                            >
                              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          )}
                          {isSelected && !multiPage && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F0FE00" }}>
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Page list — shown when canvas is selected and has multiple pages */}
                    {isSelected && multiPage && (
                      <div
                        className="overflow-hidden"
                        style={{
                          border: "2px solid #F0FE00",
                          borderTop: "none",
                          borderBottomLeftRadius: 12,
                          borderBottomRightRadius: 12,
                          backgroundColor: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <p
                          className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wider"
                          style={{ color: "#555", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                        >
                          Choose a page
                        </p>
                        {canvasPages.map((page, idx) => {
                          const isPageSelected = selectedPageId === page.id;
                          return (
                            <button
                              key={page.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPageId(page.id);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/05"
                              style={{
                                backgroundColor: isPageSelected ? "rgba(240,254,0,0.06)" : undefined,
                                borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                              }}
                            >
                              {/* Page icon */}
                              <div
                                className="w-7 h-7 rounded flex items-center justify-center shrink-0 text-[10px] font-medium"
                                style={{ backgroundColor: isPageSelected ? "rgba(240,254,0,0.15)" : "rgba(255,255,255,0.06)", color: isPageSelected ? "#F0FE00" : "#666" }}
                              >
                                {idx + 1}
                              </div>
                              <span
                                className="flex-1 text-sm text-left truncate"
                                style={{ color: isPageSelected ? "#fff" : "rgba(255,255,255,0.6)", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                              >
                                {page.name}
                              </span>
                              <span className="text-[10px] shrink-0" style={{ color: "#444", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                                {page.nodes.length} nodes
                              </span>
                              {isPageSelected && (
                                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#F0FE00" }}>
                                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                    <path d="M2 5L4.5 7.5L8.5 2.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {availableCanvases.length === 0 && !showNewCanvasInput && (
            <p
              className="text-sm text-gray-500 text-center py-4"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              No other canvases available
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Destination summary */}
          <p className="text-xs text-gray-500 truncate" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
            {selectedCanvas && selectedPageId ? (
              hasMultiplePages
                ? `→ ${selectedCanvas.name} / ${pages.find(p => p.id === selectedPageId)?.name ?? "Page"}`
                : `→ ${selectedCanvas.name}`
            ) : showNewCanvasInput && newCanvasName.trim() ? (
              `→ New: ${newCanvasName}`
            ) : null}
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTransfer}
              disabled={(!selectedCanvasId && !newCanvasName.trim()) || selectedNodes.length === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{
                backgroundColor: "#F0FE00",
                color: "#000",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              }}
            >
              {actionLabel} {selectedNodes.length} {nodeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { MoveToCanvasDialog as CopyToCanvasDialog };
