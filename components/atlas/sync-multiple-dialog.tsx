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
  selected: boolean;
}

interface NoMatchNode {
  node: AtlasNode;
  reason: string;
}

// Find best match for a node across all canvases
function findBestMatch(
  node: AtlasNode,
  canvases: Canvas[],
  currentCanvasId: string
): { match: { node: AtlasNode; canvas: Canvas; reason: string } | null } {
  const isFileNode = node.type === "file";
  const isTextNode = node.type === "text";
  
  if (!isFileNode && !isTextNode) return { match: null };
  
  const nodeData = node.data as FileNodeData | TextNodeData;
  const nodeSyncGroupId = (nodeData as any).syncGroupId;
  const nodeOriginalId = (nodeData as any).originalNodeId;
  
  // For file nodes
  const nodeFileName = isFileNode ? (nodeData as FileNodeData).fileName?.toLowerCase() || "" : "";
  
  // For text nodes
  const nodeLabel = nodeData.label?.toLowerCase() || "";
  const nodeContent = isTextNode ? (nodeData as TextNodeData).content?.toLowerCase() || "" : "";

  // Priority: 1. Same file name, 2. Original/copy relationship, 3. Similar content
  let bestMatch: { node: AtlasNode; canvas: Canvas; reason: string } | null = null;
  let bestPriority = 0;

  // Helper to get all nodes from a canvas including pages
  const getAllNodes = (c: Canvas): AtlasNode[] =>
    c.pages && c.pages.length > 0 ? c.pages.flatMap(p => p.nodes) : c.nodes;

  for (const canvas of canvases) {
    // Skip current canvas for now (prefer cross-canvas sync)
    if (canvas.id === currentCanvasId) continue;

    for (const targetNode of getAllNodes(canvas)) {
      if (targetNode.id === node.id) continue;
      if (targetNode.type !== node.type) continue;
      
      const targetData = targetNode.data as FileNodeData | TextNodeData;
      const targetSyncGroupId = (targetData as any).syncGroupId;
      const targetOriginalId = (targetData as any).originalNodeId;
      
      // Skip if already synced together
      if (nodeSyncGroupId && targetSyncGroupId === nodeSyncGroupId) continue;
      
      let reason = "";
      let priority = 0;
      
      if (isFileNode) {
        const targetFileName = (targetData as FileNodeData).fileName?.toLowerCase() || "";
        
        if (targetFileName === nodeFileName && nodeFileName !== "") {
          reason = "Same file name";
          priority = 3;
        } else if (nodeOriginalId && targetOriginalId === nodeOriginalId) {
          reason = "Copy of same file";
          priority = 2;
        } else if (nodeOriginalId === targetNode.id || targetOriginalId === node.id) {
          reason = "Original or copy";
          priority = 2;
        }
      } else if (isTextNode) {
        const targetLabel = targetData.label?.toLowerCase() || "";
        const targetContent = (targetData as TextNodeData).content?.toLowerCase() || "";
        
        if (targetLabel === nodeLabel && nodeLabel !== "") {
          reason = "Same title";
          priority = 3;
        } else if (nodeOriginalId && targetOriginalId === nodeOriginalId) {
          reason = "Copy of same text";
          priority = 2;
        } else if (nodeOriginalId === targetNode.id || targetOriginalId === node.id) {
          reason = "Original or copy";
          priority = 2;
        } else if (targetContent && nodeContent && targetContent.slice(0, 50) === nodeContent.slice(0, 50)) {
          reason = "Similar content";
          priority = 1;
        }
      }
      
      if (reason && priority > bestPriority) {
        bestMatch = { node: targetNode, canvas, reason };
        bestPriority = priority;
      }
    }
  }
  
  // Also check current canvas (all pages) if no cross-canvas match found
  if (!bestMatch) {
    const currentCanvas = canvases.find(c => c.id === currentCanvasId);
    if (currentCanvas) {
      for (const targetNode of getAllNodes(currentCanvas)) {
        if (targetNode.id === node.id) continue;
        if (targetNode.type !== node.type) continue;
        
        const targetData = targetNode.data as FileNodeData | TextNodeData;
        const targetSyncGroupId = (targetData as any).syncGroupId;
        
        if (nodeSyncGroupId && targetSyncGroupId === nodeSyncGroupId) continue;
        
        let reason = "";
        
        if (isFileNode) {
          const targetFileName = (targetData as FileNodeData).fileName?.toLowerCase() || "";
          if (targetFileName === nodeFileName && nodeFileName !== "") {
            reason = "Same file name (same canvas)";
          }
        } else if (isTextNode) {
          const targetLabel = targetData.label?.toLowerCase() || "";
          if (targetLabel === nodeLabel && nodeLabel !== "") {
            reason = "Same title (same canvas)";
          }
        }
        
        if (reason) {
          bestMatch = { node: targetNode, canvas: currentCanvas, reason };
          break;
        }
      }
    }
  }
  
  return { match: bestMatch };
}

export function SyncMultipleDialog({
  isOpen,
  onClose,
  canvases,
  currentCanvasId,
  selectedNodes,
  onSyncMultiple,
}: SyncMultipleDialogProps) {
  // Filter to only syncable nodes (file and text)
  const syncableNodes = useMemo(() => 
    selectedNodes.filter(n => n.type === "file" || n.type === "text"),
    [selectedNodes]
  );

  // Find matches for each node
  const { matches, noMatches } = useMemo(() => {
    const matchList: SyncMatch[] = [];
    const noMatchList: NoMatchNode[] = [];
    
    for (const node of syncableNodes) {
      const nodeData = node.data as FileNodeData | TextNodeData;
      const isAlreadySynced = !!(nodeData as any).syncGroupId;
      
      if (isAlreadySynced) {
        noMatchList.push({ 
          node, 
          reason: "Already synced" 
        });
        continue;
      }
      
      const { match } = findBestMatch(node, canvases, currentCanvasId);
      
      if (match) {
        matchList.push({
          sourceNode: node,
          targetNode: match.node,
          targetCanvas: match.canvas,
          reason: match.reason,
          selected: true,
        });
      } else {
        const isFile = node.type === "file";
        noMatchList.push({ 
          node, 
          reason: isFile ? "No matching file found" : "No matching text found"
        });
      }
    }
    
    return { matches: matchList, noMatches: noMatchList };
  }, [syncableNodes, canvases, currentCanvasId]);

  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(
    () => new Set(matches.map(m => m.sourceNode.id))
  );

  const toggleMatch = (nodeId: string) => {
    setSelectedMatches(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleSync = () => {
    const pairs = matches
      .filter(m => selectedMatches.has(m.sourceNode.id))
      .map(m => ({
        sourceId: m.sourceNode.id,
        targetId: m.targetNode.id,
        targetCanvasId: m.targetCanvas.id,
      }));
    
    if (pairs.length > 0) {
      onSyncMultiple(pairs);
    }
    onClose();
  };

  const getNodeLabel = (node: AtlasNode): string => {
    const data = node.data as FileNodeData | TextNodeData;
    if (node.type === "file") {
      return data.label || (data as FileNodeData).fileName || "Untitled";
    }
    return data.label || "Untitled";
  };

  const getNodeIcon = (node: AtlasNode) => {
    if (node.type === "text") {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
          <path d="M3 4H13M3 8H10M3 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    }
    const fileData = node.data as FileNodeData;
    return (
      <span className="text-[10px] text-gray-400 font-medium">
        {fileData.fileExtension?.replace(".", "").toUpperCase() || "FILE"}
      </span>
    );
  };

  if (!isOpen) return null;

  const selectedCount = selectedMatches.size;
  const totalSyncable = matches.length;

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
              Sync Multiple Items
            </h2>
            <p 
              className="text-sm text-gray-400 mt-0.5"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              {syncableNodes.length} items selected
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

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Matches Section */}
          {matches.length > 0 && (
            <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2"
                  style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-green-500">
                    <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Matches Found ({matches.length})
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCount === totalSyncable) {
                      setSelectedMatches(new Set());
                    } else {
                      setSelectedMatches(new Set(matches.map(m => m.sourceNode.id)));
                    }
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                >
                  {selectedCount === totalSyncable ? "Deselect All" : "Select All"}
                </button>
              </div>
              
              <div className="space-y-2">
                {matches.map((match) => {
                  const isSelected = selectedMatches.has(match.sourceNode.id);
                  
                  return (
                    <button
                      key={match.sourceNode.id}
                      type="button"
                      onClick={() => toggleMatch(match.sourceNode.id)}
                      className="w-full p-3 rounded-xl text-left transition-all"
                      style={{ 
                        backgroundColor: isSelected ? "rgba(34, 197, 94, 0.08)" : "rgba(255,255,255,0.02)",
                        border: isSelected ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
                          style={{ 
                            backgroundColor: isSelected ? "#22c55e" : "transparent",
                            border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                          }}
                        >
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        
                        {/* Source Node */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                          >
                            {getNodeIcon(match.sourceNode)}
                          </div>
                          <span className="text-sm text-white truncate" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                            {getNodeLabel(match.sourceNode)}
                          </span>
                        </div>
                        
                        {/* Arrow */}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-500 shrink-0">
                          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        
                        {/* Target Node */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                          >
                            {getNodeIcon(match.targetNode)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm text-white truncate block" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                              {getNodeLabel(match.targetNode)}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate block" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                              {match.targetCanvas.name} - {match.reason}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Matches Section */}
          {noMatches.length > 0 && (
            <div className="px-6 py-4">
              <div 
                className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-amber-500">
                  <path d="M8 5V8M8 11H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M3.5 14H12.5C13.3284 14 14 13.3284 14 12.5C14 12.2239 13.8657 11.9701 13.6464 11.8L8.64645 3.3C8.35245 2.9 7.64755 2.9 7.35355 3.3L2.35355 11.8C2.13432 11.9701 2 12.2239 2 12.5C2 13.3284 2.67157 14 3.5 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                No Matches ({noMatches.length})
              </div>
              
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.2)" }}
              >
                <p 
                  className="text-xs text-amber-200/80 mb-3"
                  style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                >
                  These items don&apos;t have matching files or text nodes in other canvases to sync with:
                </p>
                <div className="space-y-2">
                  {noMatches.map((item) => (
                    <div 
                      key={item.node.id}
                      className="flex items-center gap-3 p-2 rounded-lg"
                      style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
                    >
                      <div 
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                      >
                        {getNodeIcon(item.node)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-white/80 truncate block" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                          {getNodeLabel(item.node)}
                        </span>
                      </div>
                      <span 
                        className="text-[10px] text-amber-400/70 shrink-0"
                        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                      >
                        {item.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {syncableNodes.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm text-gray-400" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                No syncable items selected
              </p>
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                Select file or text nodes to sync
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs text-gray-500" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
            {selectedCount > 0 ? (
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="inline mr-1.5 -mt-0.5 text-green-500">
                  <path d="M4 10C4 10 5.5 6 8 6C10.5 6 12 10 12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M4 6C4 6 5.5 10 8 10C10.5 10 12 6 12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {selectedCount} item{selectedCount !== 1 ? "s" : ""} will be synced
              </>
            ) : (
              "Select items to sync"
            )}
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
              disabled={selectedCount === 0}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: selectedCount > 0 ? "#22c55e" : "rgba(34, 197, 94, 0.3)",
                color: "#000",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              }}
            >
              Sync {selectedCount > 0 ? `${selectedCount} Item${selectedCount !== 1 ? "s" : ""}` : "Items"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
