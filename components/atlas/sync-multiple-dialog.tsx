"use client";

import React, { useState, useMemo } from "react";
import type { Canvas, AtlasNode, FileNodeData, TextNodeData } from "@/lib/atlas-types";

interface SyncMultipleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvases: Canvas[];
  currentCanvasId: string;
  selectedNodes: AtlasNode[];
  onSyncMultiple: (syncPairs: Array<{ sourceId: string; targetId: string; targetCanvasId: string }>) => void;
}

interface SyncMatch {
  sourceNode: AtlasNode;
  targetNode: AtlasNode;
  targetCanvas: Canvas;
  reason: string;
}

interface NoMatchNode {
  node: AtlasNode;
  reason: string;
}

interface Candidate {
  node: AtlasNode;
  canvas: Canvas;
}

// Get all nodes from a canvas across pages
function getAllNodes(c: Canvas): AtlasNode[] {
  return c.pages && c.pages.length > 0 ? c.pages.flatMap(p => p.nodes) : c.nodes;
}

// Extract a comparable label from any node type
function getNodeMatchLabel(node: AtlasNode): string {
  const d = node.data as any;
  return (d.label || d.fileName || d.title || d.name || "").toLowerCase();
}

// Find best auto-match for a node across all canvases
function findBestMatch(
  node: AtlasNode,
  canvases: Canvas[],
  currentCanvasId: string
): { match: { node: AtlasNode; canvas: Canvas; reason: string } | null } {
  const nodeData = node.data as any;
  const nodeSyncGroupId = nodeData.syncGroupId;
  const nodeOriginalId = nodeData.originalNodeId;
  const nodeLabel = getNodeMatchLabel(node);
  const nodeFileName = (nodeData.fileName || "").toLowerCase();
  const nodeContent = (nodeData.content || "").toLowerCase();

  let bestMatch: { node: AtlasNode; canvas: Canvas; reason: string } | null = null;
  let bestPriority = 0;

  const checkCanvas = (canvas: Canvas, isCurrent: boolean) => {
    for (const targetNode of getAllNodes(canvas)) {
      if (targetNode.id === node.id) continue;
      if (targetNode.type !== node.type) continue;

      const targetData = targetNode.data as any;
      const targetSyncGroupId = targetData.syncGroupId;
      const targetOriginalId = targetData.originalNodeId;

      if (nodeSyncGroupId && targetSyncGroupId === nodeSyncGroupId) continue;

      const targetLabel = getNodeMatchLabel(targetNode);
      const targetFileName = (targetData.fileName || "").toLowerCase();
      const targetContent = (targetData.content || "").toLowerCase();

      let reason = "";
      let priority = 0;

      // Same-canvas matches always outrank other-canvas matches (6/5/4 vs 3/2/1)
      if (nodeFileName && targetFileName && nodeFileName === targetFileName) {
        reason = isCurrent ? "Same file name (this canvas)" : "Same file name";
        priority = isCurrent ? 6 : 3;
      } else if (nodeLabel && targetLabel && nodeLabel === targetLabel) {
        reason = isCurrent ? "Same name (this canvas)" : "Same name";
        priority = isCurrent ? 6 : 3;
      } else if (nodeOriginalId && targetOriginalId === nodeOriginalId) {
        reason = "Copy of same node";
        priority = isCurrent ? 5 : 2;
      } else if (nodeOriginalId === targetNode.id || targetOriginalId === node.id) {
        reason = "Original or copy";
        priority = isCurrent ? 5 : 2;
      } else if (nodeContent && targetContent && nodeContent.slice(0, 50) === targetContent.slice(0, 50)) {
        reason = "Similar content";
        priority = isCurrent ? 4 : 1;
      }

      if (reason && priority > bestPriority) {
        bestMatch = { node: targetNode, canvas, reason };
        bestPriority = priority;
      }
    }
  };

  // Check current canvas first so ties always favour same-canvas matches
  const currentCanvas = canvases.find(c => c.id === currentCanvasId);
  if (currentCanvas) checkCanvas(currentCanvas, true);

  // Then check other canvases (lower priority, so they only win when no same-canvas match exists)
  for (const canvas of canvases) {
    if (canvas.id === currentCanvasId) continue;
    checkCanvas(canvas, false);
  }

  return { match: bestMatch };
}

// Get all candidate nodes of the same type for manual matching
function getCandidates(
  node: AtlasNode,
  canvases: Canvas[],
  currentCanvasId: string
): Candidate[] {
  const candidates: Candidate[] = [];
  for (const canvas of canvases) {
    for (const candidate of getAllNodes(canvas)) {
      if (candidate.id === node.id) continue;
      if (candidate.type !== node.type) continue;
      const alreadySynced = !!(candidate.data as any).syncGroupId;
      if (alreadySynced) continue;
      candidates.push({ node: candidate, canvas });
    }
  }
  return candidates;
}

function getNodeLabel(node: AtlasNode): string {
  const data = node.data as FileNodeData | TextNodeData;
  if (node.type === "file") return data.label || (data as FileNodeData).fileName || "Untitled";
  return data.label || "Untitled";
}

function NodeIcon({ node }: { node: AtlasNode }) {
  if (node.type === "text") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-400 shrink-0">
        <path d="M3 4H13M3 8H10M3 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }
  if (node.type === "file") {
    const fileData = node.data as FileNodeData;
    return (
      <span className="text-[9px] text-gray-400 font-medium shrink-0">
        {fileData.fileExtension?.replace(".", "").toUpperCase() || "FILE"}
      </span>
    );
  }
  // Generic icon for all other node types (operational, sage, etc.)
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-400 shrink-0">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 8H11M8 5V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

export function SyncMultipleDialog({
  isOpen,
  onClose,
  canvases,
  currentCanvasId,
  selectedNodes,
  onSyncMultiple,
}: SyncMultipleDialogProps) {
  const syncableNodes = useMemo(() => selectedNodes, [selectedNodes]);

  const { matches, noMatches } = useMemo(() => {
    const matchList: SyncMatch[] = [];
    const noMatchList: NoMatchNode[] = [];

    for (const node of syncableNodes) {
      const nodeData = node.data as FileNodeData | TextNodeData;
      const isAlreadySynced = !!(nodeData as any).syncGroupId;

      if (isAlreadySynced) {
        noMatchList.push({ node, reason: "Already synced" });
        continue;
      }

      const { match } = findBestMatch(node, canvases, currentCanvasId);
      if (match) {
        matchList.push({
          sourceNode: node,
          targetNode: match.node,
          targetCanvas: match.canvas,
          reason: match.reason,
        });
      } else {
        noMatchList.push({ node, reason: "No match found" });
      }
    }

    return { matches: matchList, noMatches: noMatchList };
  }, [syncableNodes, canvases, currentCanvasId]);

  // Selected auto-matches
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(
    () => new Set(matches.map(m => m.sourceNode.id))
  );

  // Manual overrides for both matched rows (Change) and unmatched rows (Pick target)
  const [manualPicks, setManualPicks] = useState<Record<string, { nodeId: string; canvasId: string }>>({});

  // Which rows have the picker open
  const [openPickers, setOpenPickers] = useState<Set<string>>(new Set());

  // Per-picker search query
  const [pickerSearches, setPickerSearches] = useState<Record<string, string>>({});

  const toggleMatch = (nodeId: string) => {
    setSelectedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  };

  const togglePicker = (nodeId: string) => {
    setOpenPickers(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  };

  const setPickerSearch = (nodeId: string, query: string) => {
    setPickerSearches(prev => ({ ...prev, [nodeId]: query }));
  };

  const pickManual = (sourceNodeId: string, candidateNodeId: string, candidateCanvasId: string) => {
    setManualPicks(prev => ({ ...prev, [sourceNodeId]: { nodeId: candidateNodeId, canvasId: candidateCanvasId } }));
    setOpenPickers(prev => { const next = new Set(prev); next.delete(sourceNodeId); return next; });
    setPickerSearches(prev => { const next = { ...prev }; delete next[sourceNodeId]; return next; });
  };

  const clearManual = (sourceNodeId: string) => {
    setManualPicks(prev => { const next = { ...prev }; delete next[sourceNodeId]; return next; });
  };

  const handleSync = () => {
    const pairs: Array<{ sourceId: string; targetId: string; targetCanvasId: string }> = [];
    const matchedIds = new Set(matches.map(m => m.sourceNode.id));

    for (const m of matches) {
      if (!selectedMatchIds.has(m.sourceNode.id)) continue;
      const override = manualPicks[m.sourceNode.id];
      if (override) {
        pairs.push({ sourceId: m.sourceNode.id, targetId: override.nodeId, targetCanvasId: override.canvasId });
      } else {
        pairs.push({ sourceId: m.sourceNode.id, targetId: m.targetNode.id, targetCanvasId: m.targetCanvas.id });
      }
    }

    for (const [sourceId, pick] of Object.entries(manualPicks)) {
      if (matchedIds.has(sourceId)) continue; // already handled above
      pairs.push({ sourceId, targetId: pick.nodeId, targetCanvasId: pick.canvasId });
    }

    if (pairs.length > 0) onSyncMultiple(pairs);
    onClose();
  };

  // Render a searchable candidate picker for any row (matched or unmatched)
  const renderCandidatePicker = (sourceNode: AtlasNode, excludeNodeId?: string) => {
    const search = (pickerSearches[sourceNode.id] || "").toLowerCase();
    const allCandidates = getCandidates(sourceNode, canvases, currentCanvasId)
      .filter(c => c.node.id !== excludeNodeId);

    const filtered = search
      ? allCandidates.filter(c =>
          getNodeLabel(c.node).toLowerCase().includes(search) ||
          c.canvas.name.toLowerCase().includes(search)
        )
      : allCandidates;

    // Same canvas first, then others
    const sameCanvas = filtered.filter(c => c.canvas.id === currentCanvasId);
    const otherCanvases = filtered.filter(c => c.canvas.id !== currentCanvasId);
    const sorted = [...sameCanvas, ...otherCanvases];

    return (
      <div
        className="mx-3 mb-3 rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.3)" }}
      >
        {/* Search input */}
        <div className="px-2.5 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="relative">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search canvases or nodes..."
              value={pickerSearches[sourceNode.id] || ""}
              onChange={e => setPickerSearch(sourceNode.id, e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-md text-xs text-white placeholder-gray-600 outline-none"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>

        {sorted.length === 0 ? (
          <p className="px-3 py-2.5 text-xs" style={{ color: "#555", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
            {search ? `No results for "${search}"` : "No compatible nodes found."}
          </p>
        ) : (
          <div className="max-h-40 overflow-y-auto">
            {sorted.map((c, i) => {
              const isCurrentCanvas = c.canvas.id === currentCanvasId;
              const prevIsCurrentCanvas = i > 0 && sorted[i - 1].canvas.id === currentCanvasId;
              const showDivider = i > 0 && isCurrentCanvas !== prevIsCurrentCanvas;
              return (
                <React.Fragment key={c.node.id}>
                  {showDivider && <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", margin: "2px 0" }} />}
                  <button
                    type="button"
                    onClick={() => pickManual(sourceNode.id, c.node.id, c.canvas.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                      <NodeIcon node={c.node} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-white truncate block" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                        {getNodeLabel(c.node)}
                      </span>
                      <span className="text-[10px] truncate block flex items-center gap-1" style={{ color: isCurrentCanvas ? "#60a5fa" : "#555", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                        {isCurrentCanvas ? "This canvas" : c.canvas.name}
                      </span>
                    </div>
                    {isCurrentCanvas && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>
                        Same canvas
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const autoSelectedCount = selectedMatchIds.size;
  const manualCount = Object.keys(manualPicks).length;
  const totalCount = autoSelectedCount + manualCount;

  const unmatched = noMatches.filter(nm => nm.reason !== "Already synced");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(28, 28, 30, 0.98)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <h2
              className="text-base font-semibold text-white"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}
            >
              Sync Multiple Items
            </h2>
            <p
              className="text-xs text-gray-400 mt-0.5"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              {syncableNodes.length} item{syncableNodes.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 3L3 11M3 3L11 11" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[420px] overflow-y-auto">

          {/* Auto-matched section */}
          {matches.length > 0 && (
            <div className="px-5 py-4" style={{ borderBottom: unmatched.length > 0 || noMatches.some(n => n.reason === "Already synced") ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: "#22c55e", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Suggested Matches ({matches.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (autoSelectedCount === matches.length) {
                      setSelectedMatchIds(new Set());
                    } else {
                      setSelectedMatchIds(new Set(matches.map(m => m.sourceNode.id)));
                    }
                  }}
                  className="text-[11px] hover:opacity-80 transition-opacity"
                  style={{ color: "#60a5fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                >
                  {autoSelectedCount === matches.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="space-y-2">
                {matches.map(match => {
                  const isSelected = selectedMatchIds.has(match.sourceNode.id);
                  const override = manualPicks[match.sourceNode.id];
                  const isPickerOpen = openPickers.has(match.sourceNode.id);

                  // Resolve the effective target (manual override or auto-match)
                  let effectiveTargetNode = match.targetNode;
                  let effectiveTargetCanvas = match.targetCanvas;
                  let effectiveReason = match.reason;
                  if (override) {
                    const overrideCanvas = canvases.find(c => c.id === override.canvasId);
                    const overrideNode = overrideCanvas ? getAllNodes(overrideCanvas).find(n => n.id === override.nodeId) : undefined;
                    if (overrideCanvas && overrideNode) {
                      effectiveTargetNode = overrideNode;
                      effectiveTargetCanvas = overrideCanvas;
                      effectiveReason = overrideCanvas.id === currentCanvasId ? "This canvas" : overrideCanvas.name;
                    }
                  }

                  const isCurrentCanvasTarget = effectiveTargetCanvas.id === currentCanvasId;

                  return (
                    <div
                      key={match.sourceNode.id}
                      className="rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: isSelected ? "rgba(34, 197, 94, 0.07)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isSelected ? "rgba(34, 197, 94, 0.3)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5 p-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleMatch(match.sourceNode.id)}
                          className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isSelected ? "#22c55e" : "transparent",
                            border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                          }}
                        >
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                              <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>

                        {/* Source */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                            <NodeIcon node={match.sourceNode} />
                          </div>
                          <span className="text-sm text-white truncate" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                            {getNodeLabel(match.sourceNode)}
                          </span>
                        </div>

                        {/* Arrow */}
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-600 shrink-0">
                          <path d="M5 8H11M11 8L8 5M11 8L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>

                        {/* Effective target */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                            <NodeIcon node={effectiveTargetNode} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm text-white truncate block" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                              {getNodeLabel(effectiveTargetNode)}
                            </span>
                            <span className="text-[10px] truncate block" style={{ color: isCurrentCanvasTarget ? "#60a5fa" : "#555", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                              {isCurrentCanvasTarget ? `This canvas · ${effectiveReason}` : `${effectiveTargetCanvas.name} · ${effectiveReason}`}
                            </span>
                          </div>
                        </div>

                        {/* Change button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); togglePicker(match.sourceNode.id); }}
                          className="text-[10px] px-2 py-1 rounded-md transition-colors hover:bg-white/10 shrink-0"
                          style={{
                            color: isPickerOpen ? "#60a5fa" : "#555",
                            border: `1px solid ${isPickerOpen ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.08)"}`,
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                          }}
                        >
                          {isPickerOpen ? "Close" : "Change"}
                        </button>
                      </div>

                      {/* Searchable candidate picker */}
                      {isPickerOpen && renderCandidatePicker(match.sourceNode, effectiveTargetNode.id)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual match section for unmatched nodes */}
          {unmatched.length > 0 && (
            <div className="px-5 py-4" style={{ borderBottom: noMatches.some(n => n.reason === "Already synced") ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
              <div className="flex items-center gap-1.5 mb-3">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-amber-400">
                  <path d="M8 5V8M8 11H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#f59e0b", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                >
                  No Auto-Match ({unmatched.length})
                </span>
              </div>
              <p
                className="text-xs mb-3"
                style={{ color: "rgba(255,255,255,0.35)", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
              >
                Pick a target manually for these items, or skip them.
              </p>

              <div className="space-y-2">
                {unmatched.map(nm => {
                  const picked = manualPicks[nm.node.id];
                  const isOpen = openPickers.has(nm.node.id);

                  let pickedNode: AtlasNode | undefined;
                  let pickedCanvas: Canvas | undefined;
                  if (picked) {
                    pickedCanvas = canvases.find(c => c.id === picked.canvasId);
                    pickedNode = pickedCanvas ? getAllNodes(pickedCanvas).find(n => n.id === picked.nodeId) : undefined;
                  }

                  return (
                    <div
                      key={nm.node.id}
                      className="rounded-xl overflow-hidden"
                      style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.02)" }}
                    >
                      {/* Row */}
                      <div className="flex items-center gap-2.5 p-3">
                        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                          <NodeIcon node={nm.node} />
                        </div>
                        <span className="text-sm text-white truncate flex-1" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                          {getNodeLabel(nm.node)}
                        </span>

                        {picked && pickedNode ? (
                          <div className="flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-gray-500 shrink-0">
                              <path d="M5 8H11M11 8L8 5M11 8L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                                <NodeIcon node={pickedNode} />
                              </div>
                              <div>
                                <span className="text-sm text-white truncate block max-w-[100px]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                                  {getNodeLabel(pickedNode)}
                                </span>
                                <span className="text-[10px] block" style={{ color: "#555", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                                  {pickedCanvas?.name}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => clearManual(nm.node.id)}
                              className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                              title="Remove"
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M8 2L2 8M2 2L8 8" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => togglePicker(nm.node.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors hover:bg-white/10"
                            style={{
                              backgroundColor: isOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                              color: "#888",
                              border: "1px solid rgba(255,255,255,0.08)",
                              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                            }}
                          >
                            {isOpen ? "Close" : "Pick target"}
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : undefined }}>
                              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Searchable candidate picker */}
                      {isOpen && renderCandidatePicker(nm.node)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Already synced section */}
          {noMatches.some(n => n.reason === "Already synced") && (
            <div className="px-5 py-3">
              <p
                className="text-[11px] uppercase tracking-wider mb-2"
                style={{ color: "#444", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
              >
                Already Synced
              </p>
              {noMatches.filter(n => n.reason === "Already synced").map(nm => (
                <div key={nm.node.id} className="flex items-center gap-2.5 py-1.5">
                  <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                    <NodeIcon node={nm.node} />
                  </div>
                  <span className="text-sm truncate" style={{ color: "#444", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                    {getNodeLabel(nm.node)}
                  </span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e" }}>Synced</span>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {syncableNodes.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                No items selected
              </p>
              <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                Select nodes on the canvas to sync them
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p
            className="text-xs"
            style={{ color: "#555", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            {totalCount > 0 ? `${totalCount} item${totalCount !== 1 ? "s" : ""} will be synced` : "Select items to sync"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={totalCount === 0}
              className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: totalCount > 0 ? "#22c55e" : "rgba(34, 197, 94, 0.3)",
                color: "#000",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              }}
            >
              Sync {totalCount > 0 ? `${totalCount} Item${totalCount !== 1 ? "s" : ""}` : "Items"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
