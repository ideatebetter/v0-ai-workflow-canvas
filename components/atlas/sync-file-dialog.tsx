"use client";

import React, { useState, useMemo } from "react";
import type { Canvas, AtlasNode, FileNodeData } from "@/lib/atlas-types";

interface SyncFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvases: Canvas[];
  currentCanvasId: string;
  selectedNode: AtlasNode;
  onSyncFiles: (targetNodeId: string, targetCanvasId: string) => void;
  onUnsync?: () => void;
}

// Get file nodes from a canvas that are eligible for syncing
function getEligibleFiles(
  canvases: Canvas[],
  currentCanvasId: string,
  selectedNode: AtlasNode
): Array<{ node: AtlasNode; canvas: Canvas; reason: string }> {
  const selectedData = selectedNode.data as FileNodeData;
  const selectedFileName = selectedData.fileName?.toLowerCase() || "";
  const selectedOriginalId = selectedData.originalNodeId;
  const eligible: Array<{ node: AtlasNode; canvas: Canvas; reason: string }> = [];

  for (const canvas of canvases) {
    for (const node of canvas.nodes) {
      // Skip the selected node itself
      if (node.id === selectedNode.id) continue;
      
      // Only consider file nodes
      if (node.type !== "file") continue;
      
      const nodeData = node.data as FileNodeData;
      const nodeFileName = nodeData.fileName?.toLowerCase() || "";
      
      // Skip if already in the same sync group
      if (selectedData.syncGroupId && nodeData.syncGroupId === selectedData.syncGroupId) continue;
      
      // Check eligibility criteria:
      // 1. Same file name
      // 2. Is a copy (shares originalNodeId)
      // 3. One was copied from the other
      
      let reason = "";
      
      if (nodeFileName === selectedFileName && selectedFileName !== "") {
        reason = "Same file name";
      } else if (selectedOriginalId && nodeData.originalNodeId === selectedOriginalId) {
        reason = "Copy of same file";
      } else if (selectedOriginalId === node.id || nodeData.originalNodeId === selectedNode.id) {
        reason = "Original or copy";
      } else if (node.id.includes(selectedNode.id) || selectedNode.id.includes(node.id)) {
        // Check if IDs suggest copy relationship (e.g., "node-1-copy-xxx")
        reason = "Related copy";
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

  const eligibleFiles = useMemo(() => 
    getEligibleFiles(canvases, currentCanvasId, selectedNode),
    [canvases, currentCanvasId, selectedNode]
  );

  const selectedData = selectedNode.data as FileNodeData;
  const isAlreadySynced = !!selectedData.syncGroupId;

  // Group eligible files by canvas
  const filesByCanvas = useMemo(() => {
    const grouped: Record<string, Array<{ node: AtlasNode; reason: string }>> = {};
    for (const item of eligibleFiles) {
      const canvasId = item.canvas.id;
      if (!grouped[canvasId]) grouped[canvasId] = [];
      grouped[canvasId].push({ node: item.node, reason: item.reason });
    }
    return grouped;
  }, [eligibleFiles]);

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
              Sync File
            </h2>
            <p 
              className="text-sm text-gray-400 mt-0.5"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              Keep files in sync across canvases
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

        {/* Current file info */}
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
              <span className="text-xs text-gray-400 font-medium">
                {selectedData.fileExtension?.replace(".", "").toUpperCase() || "FILE"}
              </span>
            </div>
            <div>
              <p className="text-sm text-white font-medium" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                {selectedData.label || selectedData.fileName}
              </p>
              <p className="text-xs text-gray-500" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                {selectedData.fileName}
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
                  This file will no longer update with synced copies
                </p>
              </div>
            </button>
          )}

          {eligibleFiles.length === 0 ? (
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
                No eligible files found
              </p>
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                Files must have the same name or be copies of each other
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
              {Object.entries(filesByCanvas).map(([canvasId, files]) => {
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
                      {files.map(({ node, reason }) => {
                        const nodeData = node.data as FileNodeData;
                        const isSelected = selectedTargetId === node.id;
                        
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
                              backgroundColor: isSelected ? "rgba(34, 197, 94, 0.1)" : "rgba(255,255,255,0.03)",
                              border: isSelected ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                            >
                              {nodeData.previewImages?.[0] || nodeData.uploadedFile?.url ? (
                                <img 
                                  src={nodeData.uploadedFile?.url || nodeData.previewImages?.[0]} 
                                  alt="" 
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <span className="text-xs text-gray-400 font-medium">
                                  {nodeData.fileExtension?.replace(".", "").toUpperCase() || "FILE"}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium truncate" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                                {nodeData.label || nodeData.fileName}
                              </p>
                              <p className="text-xs text-gray-500 truncate" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                                {reason}
                              </p>
                            </div>
                            {isSelected && (
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
              Sync Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
