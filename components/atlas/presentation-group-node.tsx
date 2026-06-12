"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { PresentationGroupNodeData } from "@/lib/atlas-types";
import { useCanvasNodeActions } from "./canvas-node-actions-context";

export function PresentationGroupNode({
  data,
  selected,
  id,
}: NodeProps<PresentationGroupNodeData>) {
  const { thumbnails = [], nodeIds = [], label } = data;
  const count = nodeIds.length;
  const { setNodes } = useReactFlow();
  const { onCopyNodeLink } = useCanvasNodeActions();

  const [isEditing, setIsEditing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [editValue, setEditValue] = useState(label || `Slide Group (${count})`);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  // Handle saving the label
  const handleSave = useCallback(() => {
    const newLabel = editValue.trim() || `Slide Group (${count})`;
    setNodes(nds => nds.map(n => 
      n.id === id 
        ? { ...n, data: { ...n.data, label: newLabel } }
        : n
    ));
    setIsEditing(false);
  }, [editValue, count, id, setNodes]);
  
  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(label || `Slide Group (${count})`);
      setIsEditing(false);
    }
    e.stopPropagation();
  }, [handleSave, label, count]);
  
  const displayLabel = label || `Slide Group (${count})`;

  // Get grid layout based on count
  const getGridClass = () => {
    if (count <= 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2 grid-rows-2";
    return "grid-cols-3 grid-rows-2";
  };

  return (
    <div
      className="group relative"
      style={{
        width: 220,
        minHeight: 160,
        backgroundColor: "#1a1a1a",
        borderRadius: 12,
        outline: selected ? "2px solid #F0FE00" : "none",
        outlineOffset: 2,
        border: "2px dashed #F0FE00",
      }}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{
          background: "#F0FE00",
          width: 10,
          height: 10,
          border: "2px solid #000",
          left: -5,
        }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid #333" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0FE00" strokeWidth="2" className="flex-shrink-0">
          <rect x="2" y="2" width="9" height="9" rx="1" />
          <rect x="13" y="2" width="9" height="5" rx="1" />
          <rect x="13" y="9" width="9" height="6" rx="1" />
          <rect x="2" y="13" width="9" height="9" rx="1" />
          <rect x="13" y="17" width="9" height="5" rx="1" />
        </svg>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 text-xs font-medium bg-transparent border-none outline-none min-w-0"
            style={{
              color: "#F0FE00",
              fontFamily: "system-ui, Inter, sans-serif",
              caretColor: "#F0FE00",
            }}
          />
        ) : (
          <span
            className="text-xs font-medium truncate cursor-text hover:opacity-80 flex-1"
            style={{ color: "#F0FE00", fontFamily: "system-ui, Inter, sans-serif" }}
            onDoubleClick={() => setIsEditing(true)}
            title="Double-click to rename"
          >
            {displayLabel}
          </span>
        )}
        {/* Share / copy link */}
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 flex-shrink-0"
          title="Copy link"
          onClick={e => {
            e.stopPropagation();
            onCopyNodeLink(id);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
          }}
        >
          {linkCopied ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5L4 8L9.5 2.5" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M4.5 6.5L6.5 4.5" stroke="#F0FE00" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.6"/>
              <path d="M6 2.5L6.8 1.7C7.47 1.03 8.53 1.03 9.2 1.7C9.87 2.37 9.87 3.43 9.2 4.1L8.4 4.9" stroke="#F0FE00" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.6"/>
              <path d="M5 8.5L4.2 9.3C3.53 9.97 2.47 9.97 1.8 9.3C1.13 8.63 1.13 7.57 1.8 6.9L2.6 6.1" stroke="#F0FE00" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.6"/>
            </svg>
          )}
        </button>
      </div>

      {/* Thumbnail Grid Preview */}
      <div className={`grid ${getGridClass()} gap-1 p-2`}>
        {thumbnails.slice(0, 6).map((url, index) => (
          <div
            key={index}
            className="relative aspect-square rounded overflow-hidden"
            style={{ backgroundColor: "#0a0a0a" }}
          >
            {url ? (
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[10px] text-gray-600">{index + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show +N if more than 6 */}
      {count > 6 && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-gray-400">
          +{count - 6}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{
          background: "#F0FE00",
          width: 10,
          height: 10,
          border: "2px solid #000",
          right: -5,
        }}
      />
    </div>
  );
}
