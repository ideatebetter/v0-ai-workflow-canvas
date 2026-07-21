"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { PresentationGroupNodeData } from "@/lib/atlas-types";
import { useCanvasNodeActions } from "./canvas-node-actions-context";
import { detectFocalPoint, type FocalPoint } from "@/lib/focal-point";

// Thumbnail cell with subject-aware cropping
function ThumbCell({ url, index }: { url: string; index: number }) {
  const [focal, setFocal] = useState<FocalPoint>({ x: 0.5, y: 0.38 });

  useEffect(() => {
    if (!url) return;
    let alive = true;
    detectFocalPoint(url, fp => { if (alive) setFocal(fp); });
    return () => { alive = false; };
  }, [url]);

  return (
    <div className="relative aspect-square rounded overflow-hidden" style={{ backgroundColor: "var(--app-bg)" }}>
      {url ? (
        <img
          src={url}
          alt={`Preview ${index + 1}`}
          className="w-full h-full"
          style={{
            objectFit: "cover",
            objectPosition: `${focal.x * 100}% ${focal.y * 100}%`,
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-[10px] text-gray-600">{index + 1}</span>
        </div>
      )}
    </div>
  );
}

export function PresentationGroupNode({
  data,
  selected,
  id,
}: NodeProps<PresentationGroupNodeData>) {
  const { thumbnails = [], nodeIds = [], label } = data as unknown as PresentationGroupNodeData;
  const count = nodeIds.length;
  const { setNodes } = useReactFlow();
  const { onCopyNodeLink } = useCanvasNodeActions();

  const [isEditing, setIsEditing] = useState(false);
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
        backgroundColor: "var(--app-card-elevated)",
        borderRadius: 12,
        outline: selected ? "2px solid #F0FE00" : "none",
        outlineOffset: 2,
        border: "2px dashed #F0FE00",
      }}
    >
      <SmartHandles nodeId={id as string} />

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--app-canvas-dot)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-primary)" strokeWidth="2" className="flex-shrink-0">
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
              color: "var(--app-text-primary)",
              fontFamily: "system-ui, Inter, sans-serif",
              caretColor: "var(--app-text-primary)",
            }}
          />
        ) : (
          <span
            className="text-xs font-medium truncate cursor-text hover:opacity-80 flex-1"
            style={{ color: "var(--app-text-primary)", fontFamily: "system-ui, Inter, sans-serif" }}
            onDoubleClick={() => setIsEditing(true)}
            title="Double-click to rename"
          >
            {displayLabel}
          </span>
        )}
        {/* Ungroup */}
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 flex-shrink-0"
          title="Ungroup slides"
          onClick={e => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("atlas:ungroup-presentation", { detail: { groupId: id as string } }));
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="0.8" stroke="var(--app-text-primary)" strokeWidth="1.2" strokeOpacity="0.6"/>
            <rect x="6" y="1" width="4" height="4" rx="0.8" stroke="var(--app-text-primary)" strokeWidth="1.2" strokeOpacity="0.6"/>
            <rect x="1" y="6" width="4" height="4" rx="0.8" stroke="var(--app-text-primary)" strokeWidth="1.2" strokeOpacity="0.6"/>
            <rect x="6" y="6" width="4" height="4" rx="0.8" stroke="var(--app-text-primary)" strokeWidth="1.2" strokeOpacity="0.6"/>
          </svg>
        </button>
        {/* Share */}
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 flex-shrink-0"
          title="Share presentation flow"
          onClick={e => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("atlas:share-node", { detail: { nodeId: id, nodeLabel: label || `Slide Group (${count})`, nodeType: "presentation" } }));
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
            <path d="M14 2L2 7L6.5 9L9 14L14 2Z" stroke="var(--app-text-primary)" strokeWidth="1.4" strokeLinejoin="round" strokeOpacity="0.7"/>
            <path d="M6.5 9L14 2" stroke="var(--app-text-primary)" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7"/>
          </svg>
        </button>
      </div>

      {/* Thumbnail Grid Preview */}
      <div className={`grid ${getGridClass()} gap-1 p-2`}>
        {thumbnails.slice(0, 6).map((url, index) => (
          <ThumbCell key={index} url={url} index={index} />
        ))}
      </div>

      {/* Show +N if more than 6 */}
      {count > 6 && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-gray-400">
          +{count - 6}
        </div>
      )}

    </div>
  );
}
