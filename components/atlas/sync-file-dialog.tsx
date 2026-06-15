"use client";

import React, { useState, useMemo } from "react";
import type { Canvas, AtlasNode, FileNodeData, TextNodeData } from "@/lib/atlas-types";

interface SyncFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvases: Canvas[];
  currentCanvasId: string;
  selectedNode: AtlasNode;
  onSyncFiles: (targetNodeId: string, targetCanvasId: string) => void;
  onUnsync?: () => void;
}

// Flatten all nodes from a canvas across all pages
function getAllNodesFromCanvas(canvas: Canvas): Array<{ node: AtlasNode; pageName: string | null; pageId: string | null }> {
  if (canvas.pages && canvas.pages.length > 0) {
    return canvas.pages.flatMap(p =>
      p.nodes.map(node => ({ node, pageName: canvas.pages!.length > 1 ? p.name : null, pageId: p.id }))
    );
  }
  return canvas.nodes.map(node => ({ node, pageName: null, pageId: null }));
}

function getEligibleNodes(
  canvases: Canvas[],
  currentCanvasId: string,
  selectedNode: AtlasNode
): Array<{ node: AtlasNode; canvas: Canvas; reason: string; pageName: string | null; pageId: string | null }> {
  const isFileNode = selectedNode.type === "file";
  const isTextNode = selectedNode.type === "text";

  const selectedData = selectedNode.data as any;
  const eligible: Array<{ node: AtlasNode; canvas: Canvas; reason: string; pageName: string | null; pageId: string | null }> = [];

  const selectedSyncGroupId = selectedData.syncGroupId;
  const selectedOriginalId = selectedData.originalNodeId;
  const selectedFileName = (selectedData.fileName || "").toLowerCase();
  const selectedLabel = (selectedData.label || selectedData.title || selectedData.name || "").toLowerCase();
  const selectedContent = (selectedData.content || "").toLowerCase();

  for (const canvas of canvases) {
    for (const { node, pageName, pageId } of getAllNodesFromCanvas(canvas)) {
      if (node.id === selectedNode.id) continue;
      if (node.type !== selectedNode.type) continue;

      const nodeData = node.data as any;
      const nodeSyncGroupId = nodeData.syncGroupId;
      const nodeOriginalId = nodeData.originalNodeId;

      if (selectedSyncGroupId && nodeSyncGroupId === selectedSyncGroupId) continue;

      let reason = "";

      if (isFileNode) {
        const nodeFileName = (nodeData.fileName || "").toLowerCase();
        if (nodeFileName === selectedFileName && selectedFileName !== "") {
          reason = "Same file name";
        } else if (selectedOriginalId && nodeOriginalId === selectedOriginalId) {
          reason = "Copy of same file";
        } else if (selectedOriginalId === node.id || nodeOriginalId === selectedNode.id) {
          reason = "Original or copy";
        } else if (node.id.includes(selectedNode.id) || selectedNode.id.includes(node.id)) {
          reason = "Related copy";
        }
      } else if (isTextNode) {
        const nodeLabel = (nodeData.label || "").toLowerCase();
        const nodeContent = (nodeData.content || "").toLowerCase();
        if (nodeLabel === selectedLabel && selectedLabel !== "") {
          reason = "Same title";
        } else if (selectedOriginalId && nodeOriginalId === selectedOriginalId) {
          reason = "Copy of same text";
        } else if (selectedOriginalId === node.id || nodeOriginalId === selectedNode.id) {
          reason = "Original or copy";
        } else if (nodeContent && selectedContent && nodeContent.slice(0, 50) === selectedContent.slice(0, 50)) {
          reason = "Similar content";
        }
      } else {
        const nodeLabel = (nodeData.label || nodeData.title || nodeData.name || "").toLowerCase();
        const nodeContent2 = (nodeData.content || "").toLowerCase();
        if (nodeLabel && selectedLabel && nodeLabel === selectedLabel) {
          reason = "Same name";
        } else if (selectedOriginalId && nodeOriginalId === selectedOriginalId) {
          reason = "Copy of same node";
        } else if (selectedOriginalId === node.id || nodeOriginalId === selectedNode.id) {
          reason = "Original or copy";
        } else if (nodeContent2 && selectedContent && nodeContent2.slice(0, 50) === selectedContent.slice(0, 50)) {
          reason = "Similar content";
        }
      }

      if (reason) {
        eligible.push({ node, canvas, reason, pageName, pageId });
      }
    }
  }

  return eligible;
}

export function SyncFileDialog({
  isOpen,
  onClose,
  canvases,
  currentCanvasId,
  selectedNode,
  onSyncFiles,
  onUnsync,
}: SyncFileDialogProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedTargetCanvasId, setSelectedTargetCanvasId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isFileNode = selectedNode.type === "file";
  const isTextNode = selectedNode.type === "text";
  const nodeTypeLabel = isFileNode ? "File" : isTextNode ? "Text" : "Node";

  const eligibleNodes = useMemo(() =>
    getEligibleNodes(canvases, currentCanvasId, selectedNode),
    [canvases, currentCanvasId, selectedNode]
  );

  const selectedData = selectedNode.data as FileNodeData | TextNodeData;
  const isAlreadySynced = !!(selectedData as any).syncGroupId;

  // Current canvas: group matches by page
  const currentCanvas = useMemo(() => canvases.find(c => c.id === currentCanvasId), [canvases, currentCanvasId]);
  const currentCanvasHasPages = !!(currentCanvas?.pages && currentCanvas.pages.length > 1);

  const currentCanvasPageMatches = useMemo(() => {
    const byPage: Record<string, { pageName: string; nodes: Array<{ node: AtlasNode; reason: string }> }> = {};
    for (const item of eligibleNodes) {
      if (item.canvas.id !== currentCanvasId) continue;
      const key = item.pageId || "__root__";
      const name = item.pageName || "Default";
      if (!byPage[key]) byPage[key] = { pageName: name, nodes: [] };
      byPage[key].nodes.push({ node: item.node, reason: item.reason });
    }
    return Object.values(byPage);
  }, [eligibleNodes, currentCanvasId]);

  // Other canvases: group matches by canvas
  const otherCanvasMatchMap = useMemo(() => {
    const byCanvas: Record<string, Array<{ node: AtlasNode; reason: string; pageName: string | null }>> = {};
    for (const item of eligibleNodes) {
      if (item.canvas.id === currentCanvasId) continue;
      if (!byCanvas[item.canvas.id]) byCanvas[item.canvas.id] = [];
      byCanvas[item.canvas.id].push({ node: item.node, reason: item.reason, pageName: item.pageName });
    }
    return byCanvas;
  }, [eligibleNodes, currentCanvasId]);

  // Filtered list of other canvases (all, not just those with matches)
  const filteredOtherCanvases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return canvases.filter(c => {
      if (c.id === currentCanvasId) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [canvases, currentCanvasId, searchQuery]);

  const totalMatches = eligibleNodes.length;

  const handleSync = () => {
    if (selectedTargetId && selectedTargetCanvasId) {
      onSyncFiles(selectedTargetId, selectedTargetCanvasId);
      onClose();
    }
  };

  const renderNodeRow = (node: AtlasNode, canvasId: string, reason: string, pageName: string | null) => {
    const nodeData = node.data as FileNodeData | TextNodeData;
    const isNodeSelected = selectedTargetId === node.id;
    const isTargetFile = node.type === "file";
    const isTargetText = node.type === "text";

    return (
      <button
        key={node.id}
        type="button"
        onClick={() => {
          setSelectedTargetId(node.id);
          setSelectedTargetCanvasId(canvasId);
        }}
        className="w-full p-3 rounded-xl text-left transition-all flex items-center gap-3"
        style={{
          backgroundColor: isNodeSelected ? "rgba(34, 197, 94, 0.1)" : "rgba(255,255,255,0.03)",
          border: isNodeSelected ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          {isTargetText ? (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-gray-400">
              <path d="M3 4H13M3 8H10M3 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : isTargetFile && ((nodeData as FileNodeData).previewImages?.[0] || (nodeData as FileNodeData).uploadedFile?.url) ? (
            <img
              src={(nodeData as FileNodeData).uploadedFile?.url || (nodeData as FileNodeData).previewImages?.[0]}
              alt=""
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <span className="text-xs text-gray-400 font-medium">
              {isTargetFile ? (nodeData as FileNodeData).fileExtension?.replace(".", "").toUpperCase() || "FILE" : "TXT"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
            {nodeData.label || (isTargetFile ? (nodeData as FileNodeData).fileName : "Untitled")}
          </p>
          <p className="text-xs text-gray-500 truncate" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
            {pageName ? `${pageName} · ` : ""}{reason}
          </p>
        </div>
        {isNodeSelected && (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(28, 28, 30, 0.98)",
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
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}
            >
              Sync {nodeTypeLabel}
            </h2>
            <p
              className="text-sm text-gray-400 mt-0.5"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              Keep {nodeTypeLabel.toLowerCase()}s in sync across canvases
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Current item info */}
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="text-xs text-gray-500 uppercase tracking-wider mb-2"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            Syncing
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              {isTextNode ? (
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                  <path d="M3 4H13M3 8H10M3 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <span className="text-xs text-gray-400 font-medium">
                  {(selectedData as FileNodeData).fileExtension?.replace(".", "").toUpperCase() || "FILE"}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm text-white font-medium" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                {selectedData.label || (isFileNode ? (selectedData as FileNodeData).fileName : "Untitled")}
              </p>
              <p className="text-xs text-gray-500" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                {isFileNode ? (selectedData as FileNodeData).fileName : (isTextNode && (selectedData as TextNodeData).content ? (selectedData as TextNodeData).content.slice(0, 40) + "..." : nodeTypeLabel + " node")}
              </p>
            </div>
            {isAlreadySynced && (
              <div
                className="ml-auto px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
                style={{ backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8C4 8 5.5 4 8 4C10.5 4 12 8 12 8C12 8 10.5 12 8 12C5.5 12 4 8 4 8Z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                </svg>
                Synced
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="px-6 py-4 max-h-[360px] overflow-y-auto">
          {isAlreadySynced && onUnsync && (
            <button
              type="button"
              onClick={() => {
                onUnsync();
                onClose();
              }}
              className="w-full mb-4 p-3 rounded-xl text-left transition-colors hover:bg-white/5 flex items-center gap-3"
              style={{ border: "1px solid rgba(239, 68, 68, 0.3)" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-red-400">
                  <path d="M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M2 4L4 2M14 4L12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M2 12L4 14M14 12L12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-sm text-red-400 font-medium" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                  Remove from sync
                </p>
                <p className="text-xs text-gray-500" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                  This {nodeTypeLabel.toLowerCase()} will no longer update with synced copies
                </p>
              </div>
            </button>
          )}

          {/* Current canvas pages section */}
          {currentCanvasHasPages && currentCanvasPageMatches.length > 0 && (
            <div className="mb-5">
              <div
                className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-gray-500">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                This Canvas
              </div>
              {currentCanvasPageMatches.map(({ pageName, nodes }) => (
                <div key={pageName} className="mb-3">
                  <div
                    className="text-xs text-gray-400 mb-2 flex items-center gap-1.5 ml-1"
                    style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-gray-600">
                      <path d="M4 4H12M4 8H10M4 12H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {pageName}
                  </div>
                  <div className="space-y-2">
                    {nodes.map(({ node, reason }) => renderNodeRow(node, currentCanvasId, reason, null))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Other canvases section */}
          <div>
            <div
              className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-gray-500">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Other Canvases
              {totalMatches > 0 && (
                <span
                  className="ml-auto text-gray-600 normal-case tracking-normal"
                  style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                >
                  {Object.keys(otherCanvasMatchMap).length} with matches
                </span>
              )}
            </div>

            {/* Search bar */}
            <div className="relative mb-3">
              <svg
                width="14" height="14"
                viewBox="0 0 16 16" fill="none"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              >
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search canvases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {filteredOtherCanvases.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                  No canvases match "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOtherCanvases.map((canvas) => {
                  const matchNodes = otherCanvasMatchMap[canvas.id] || [];
                  const matchCount = matchNodes.length;

                  return (
                    <div key={canvas.id}>
                      <div
                        className="flex items-center gap-2 mb-2"
                        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-gray-500 shrink-0">
                          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                        <span className="text-xs text-gray-400 flex-1 truncate">{canvas.name}</span>
                        {matchCount > 0 ? (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: "rgba(34, 197, 94, 0.12)", color: "#22c55e" }}
                          >
                            {matchCount} match{matchCount !== 1 ? "es" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">No matches</span>
                        )}
                      </div>
                      {matchCount > 0 && (
                        <div className="space-y-2 ml-0">
                          {matchNodes.map(({ node, reason, pageName }) =>
                            renderNodeRow(node, canvas.id, reason, pageName)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {totalMatches === 0 && filteredOtherCanvases.length > 0 && !currentCanvasHasPages && (
              <div className="text-center py-4 mt-2">
                <p className="text-xs text-gray-600" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                  {isFileNode ? "Files must have the same name or be copies of each other" : isTextNode ? "Text nodes must have the same title or be copies" : "Nodes of the same type with matching names will be suggested"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs text-gray-500" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="inline mr-1.5 -mt-0.5">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5V8.5L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Updates sync automatically
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={!selectedTargetId}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: selectedTargetId ? "#22c55e" : "rgba(34, 197, 94, 0.3)",
                color: "#000",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              }}
            >
              Sync {nodeTypeLabel}s
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
