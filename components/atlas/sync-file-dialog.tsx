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

// Get file or text nodes from a canvas that are eligible for syncing
function getEligibleNodes(
  canvases: Canvas[],
  currentCanvasId: string,
  selectedNode: AtlasNode
): Array<{ node: AtlasNode; canvas: Canvas; reason: string }> {
  const isFileNode = selectedNode.type === "file";
  const isTextNode = selectedNode.type === "text";
  
  if (!isFileNode && !isTextNode) return [];
  
  const selectedData = selectedNode.data as FileNodeData | TextNodeData;
  const eligible: Array<{ node: AtlasNode; canvas: Canvas; reason: string }> = [];

  // Get sync-related properties
  const selectedSyncGroupId = (selectedData as any).syncGroupId;
  const selectedOriginalId = (selectedData as any).originalNodeId;
  
  // For file nodes, get file name for matching
  const selectedFileName = isFileNode ? (selectedData as FileNodeData).fileName?.toLowerCase() || "" : "";
  
  // For text nodes, get label/content for matching
  const selectedLabel = selectedData.label?.toLowerCase() || "";
  const selectedContent = isTextNode ? (selectedData as TextNodeData).content?.toLowerCase() || "" : "";

  for (const canvas of canvases) {
    for (const node of canvas.nodes) {
      // Skip the selected node itself
      if (node.id === selectedNode.id) continue;
      
      // Only consider same type nodes
      if (node.type !== selectedNode.type) continue;
      
      const nodeData = node.data as FileNodeData | TextNodeData;
      const nodeSyncGroupId = (nodeData as any).syncGroupId;
      const nodeOriginalId = (nodeData as any).originalNodeId;
      
      // Skip if already in the same sync group
      if (selectedSyncGroupId && nodeSyncGroupId === selectedSyncGroupId) continue;
      
      let reason = "";
      
      if (isFileNode) {
        const nodeFileName = (nodeData as FileNodeData).fileName?.toLowerCase() || "";
        
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
        const nodeLabel = nodeData.label?.toLowerCase() || "";
        const nodeContent = (nodeData as TextNodeData).content?.toLowerCase() || "";
        
        // Match by label
        if (nodeLabel === selectedLabel && selectedLabel !== "") {
          reason = "Same title";
        } else if (selectedOriginalId && nodeOriginalId === selectedOriginalId) {
          reason = "Copy of same text";
        } else if (selectedOriginalId === node.id || nodeOriginalId === selectedNode.id) {
          reason = "Original or copy";
        } else if (nodeContent && selectedContent && nodeContent.slice(0, 50) === selectedContent.slice(0, 50)) {
          reason = "Similar content";
        }
      }
      
      if (reason) {
        eligible.push({ node, canvas, reason });
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

  const isFileNode = selectedNode.type === "file";
  const isTextNode = selectedNode.type === "text";
  const nodeTypeLabel = isFileNode ? "File" : "Text";

  const eligibleNodes = useMemo(() => 
    getEligibleNodes(canvases, currentCanvasId, selectedNode),
    [canvases, currentCanvasId, selectedNode]
  );

  const selectedData = selectedNode.data as FileNodeData | TextNodeData;
  const isAlreadySynced = !!(selectedData as any).syncGroupId;

  // Group eligible nodes by canvas
  const nodesByCanvas = useMemo(() => {
    const grouped: Record<string, Array<{ node: AtlasNode; reason: string }>> = {};
    for (const item of eligibleNodes) {
      const canvasId = item.canvas.id;
      if (!grouped[canvasId]) grouped[canvasId] = [];
      grouped[canvasId].push({ node: item.node, reason: item.reason });
    }
    return grouped;
  }, [eligibleNodes]);

  const handleSync = () => {
    if (selectedTargetId && selectedTargetCanvasId) {
      onSyncFiles(selectedTargetId, selectedTargetCanvasId);
      onClose();
    }
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

        {/* Eligible files list */}
        <div className="px-6 py-4 max-h-[300px] overflow-y-auto">
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

          {eligibleNodes.length === 0 ? (
            <div className="text-center py-8">
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
                No eligible {nodeTypeLabel.toLowerCase()}s found
              </p>
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                {isFileNode ? "Files must have the same name or be copies of each other" : "Text nodes must have the same title or be copies"}
              </p>
            </div>
          ) : (
            <>
              <div 
                className="text-xs text-gray-500 uppercase tracking-wider mb-3"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
              >
                Sync with
              </div>
              {Object.entries(nodesByCanvas).map(([canvasId, nodes]) => {
                const canvas = canvases.find(c => c.id === canvasId);
                if (!canvas) return null;
                
                return (
                  <div key={canvasId} className="mb-4">
                    <div 
                      className="text-xs text-gray-400 mb-2 flex items-center gap-2"
                      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-gray-500">
                        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      {canvas.name}
                      {canvasId === currentCanvasId && (
                        <span className="text-gray-600">(Current)</span>
                      )}
                    </div>
                    <div className="space-y-2">
                          {nodes.map(({ node, reason }, nodeIdx) => {
                          const nodeData = node.data as FileNodeData | TextNodeData;
                        const isNodeSelected = selectedTargetId === node.id;
                        const isTargetFile = node.type === "file";
                        const isTargetText = node.type === "text";
                        
                        return (
                          <button
                            key={`${node.id}-${nodeIdx}`}
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
                                {reason}
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
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
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
