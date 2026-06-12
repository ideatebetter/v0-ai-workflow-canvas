"use client";

import React, { useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { MoodboardNodeData } from "@/lib/atlas-types";
import { useCanvasNodeActions } from "./canvas-node-actions-context";

export function MoodboardNode({ data, selected, id }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { onCopyNodeLink } = useCanvasNodeActions();
  const nodeData = data as MoodboardNodeData;
  const imageCount = nodeData.images?.length || 0;
  
  // Show up to 4 preview images in the collapsed view
  const previewImages = nodeData.images?.slice(0, 4) || [];

  return (
    <div
      className="group rounded-xl transition-all duration-200"
      style={{
        backgroundColor: "#1a1a1a",
        border: selected ? "2px solid #ffffff" : "1px solid #ffffff30",
        width: 200,
        minHeight: 160,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SmartHandles nodeId={id} />

      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={{ borderColor: "#ffffff20" }}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ backgroundColor: "#ffffff20" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <span className="text-sm font-medium text-white flex-1 truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {nodeData.label || "Moodboard"}
        </span>
        <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {imageCount} {imageCount === 1 ? "image" : "images"}
        </span>
        {/* Share / copy link */}
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 ml-1"
          title="Copy link"
          onClick={e => {
            e.stopPropagation();
            onCopyNodeLink(id as string);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
          }}
        >
          {linkCopied ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L4.5 8.5L10 3.5" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M5 7L7 5" stroke="#888" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M6.5 3L7.5 2C8.33 1.17 9.67 1.17 10.5 2C11.33 2.83 11.33 4.17 10.5 5L9.5 6" stroke="#888" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M5.5 9L4.5 10C3.67 10.83 2.33 10.83 1.5 10C0.67 9.17 0.67 7.83 1.5 7L2.5 6" stroke="#888" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* Image Grid Preview - Adaptive layout based on image count */}
      <div className="p-2">
        <div 
          className={`grid gap-1 rounded-lg overflow-hidden ${
            previewImages.length === 1 ? "grid-cols-1" : 
            previewImages.length === 2 ? "grid-cols-2" : 
            previewImages.length === 3 ? "grid-cols-2" : 
            "grid-cols-2"
          }`}
        >
          {previewImages.map((img, idx) => {
            const isVideo = img.fileType === "video" || img.fileName?.match(/\.(mp4|mov|webm|avi|mkv|m4v)$/i);
            const count = previewImages.length;
            
            // Calculate border radius based on position and count
            let borderRadius = "0";
            if (count === 1) {
              borderRadius = "4px";
            } else if (count === 2) {
              borderRadius = idx === 0 ? "4px 0 0 4px" : "0 4px 4px 0";
            } else if (count === 3) {
              // First image spans full width on top
              if (idx === 0) borderRadius = "4px 4px 0 0";
              else if (idx === 1) borderRadius = "0 0 0 4px";
              else borderRadius = "0 0 4px 0";
            } else {
              // 4+ images in 2x2 grid
              if (idx === 0) borderRadius = "4px 0 0 0";
              else if (idx === 1) borderRadius = "0 4px 0 0";
              else if (idx === 2) borderRadius = "0 0 0 4px";
              else borderRadius = "0 0 4px 0";
            }
            
            return (
              <div
                key={img.id}
                className={`bg-black/20 overflow-hidden relative ${
                  count === 3 && idx === 0 ? "col-span-2 aspect-video" : "aspect-square"
                }`}
                style={{ borderRadius }}
              >
                {isVideo ? (
                  <>
                    <video
                      src={img.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                      >
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
                          <path d="M4 3L13 8L4 13V3Z" />
                        </svg>
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={img.thumbnail || img.url}
                    alt={img.fileName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>
        
        {/* More indicator */}
        {imageCount > 4 && (
          <div 
            className="text-xs text-gray-400 text-center mt-2"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            +{imageCount - 4} more
          </div>
        )}
      </div>

      {/* Hover hint */}
      <div
        className="px-3 py-2 border-t text-center transition-all duration-200"
        style={{
          borderColor: "#ffffff20",
          opacity: isHovered ? 1 : 0,
          maxHeight: isHovered ? 40 : 0,
          overflow: "hidden",
        }}
      >
        <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          Click to expand
        </span>
      </div>
    </div>
  );
}
