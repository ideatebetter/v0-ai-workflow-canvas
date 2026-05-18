"use client";

import React, { useState } from "react";
import type { Canvas, AtlasNode } from "@/lib/atlas-types";

interface CopyToCanvasDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvases: Canvas[];
  currentCanvasId: string;
  selectedNodes: AtlasNode[];
  onCopyToCanvas: (targetCanvasId: string, nodes: AtlasNode[]) => void;
}

export function CopyToCanvasDialog({
  isOpen,
  onClose,
  canvases,
  currentCanvasId,
  selectedNodes,
  onCopyToCanvas,
}: CopyToCanvasDialogProps) {
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);

  if (!isOpen) return null;

  const availableCanvases = canvases.filter((c) => c.id !== currentCanvasId);

  const handleCopy = () => {
    if (selectedCanvasId && selectedNodes.length > 0) {
      onCopyToCanvas(selectedCanvasId, selectedNodes);
      onClose();
      setSelectedCanvasId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "rgba(28, 28, 30, 0.95)",
          backdropFilter: "blur(40px)",
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
              Copy to Canvas
            </h2>
            <p
              className="text-sm text-gray-400 mt-0.5"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              {selectedNodes.length} {selectedNodes.length === 1 ? "node" : "nodes"} selected
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Canvas List */}
        <div className="px-4 py-4 max-h-[300px] overflow-y-auto">
          {availableCanvases.length === 0 ? (
            <div
              className="text-center py-8 text-gray-500"
              style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto mb-3 opacity-50"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
              </svg>
              <p>No other canvases available</p>
              <p className="text-sm mt-1">Create a new canvas first</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableCanvases.map((canvas) => (
                <button
                  key={canvas.id}
                  type="button"
                  onClick={() => setSelectedCanvasId(canvas.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedCanvasId === canvas.id
                      ? "ring-2 ring-[#F0FE00]"
                      : "hover:bg-white/5"
                  }`}
                  style={{
                    backgroundColor: selectedCanvasId === canvas.id ? "rgba(240, 254, 0, 0.08)" : "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Canvas Preview Thumbnail */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: "#1a1a1a" }}
                    >
                      {canvas.previewImage ? (
                        <img
                          src={canvas.previewImage}
                          alt={canvas.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#666" strokeWidth="1.5">
                          <rect x="2" y="2" width="16" height="16" rx="2" />
                          <path d="M2 7h16" />
                          <circle cx="5" cy="4.5" r="1" fill="#666" stroke="none" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-white truncate"
                        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                      >
                        {canvas.name}
                      </p>
                      <p
                        className="text-xs text-gray-500 mt-0.5"
                        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                      >
                        {canvas.nodes.length} {canvas.nodes.length === 1 ? "node" : "nodes"}
                      </p>
                    </div>
                    {selectedCanvasId === canvas.id && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "#F0FE00" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!selectedCanvasId || selectedNodes.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#F0FE00",
              color: "#000",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            }}
          >
            Copy {selectedNodes.length} {selectedNodes.length === 1 ? "Node" : "Nodes"}
          </button>
        </div>
      </div>
    </div>
  );
}
