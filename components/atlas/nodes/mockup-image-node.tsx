"use client";

import React, { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface MockupImageNodeData {
  label: string;
  imageUrl: string;
  sourceFileName?: string;
  prompt?: string;
  generatedAt: string;
  [key: string]: unknown;
}

function MockupImageNodeComponent({
  data,
  selected,
}: NodeProps<MockupImageNodeData>) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const fontStyle = { fontFamily: "system-ui, Inter, sans-serif" };

  return (
    <div
      style={{
        width: 240,
        backgroundColor: "#141414",
        borderRadius: 12,
        border: selected ? "2px solid #F0FE00" : "1px solid #2a2a2a",
        overflow: "hidden",
        boxShadow: selected
          ? "0 0 0 2px rgba(240, 254, 0, 0.2)"
          : "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 16,
          height: 16,
          background: "#F0FE00",
          border: "2px solid #121212",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 16,
          height: 16,
          background: "#F0FE00",
          border: "2px solid #121212",
        }}
      />

      {/* Image */}
      <div
        style={{
          width: "100%",
          minHeight: imageLoaded ? undefined : 160,
          backgroundColor: "#0d0d0d",
          position: "relative",
        }}
      >
        {!imageLoaded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                border: "2px solid #333",
                borderTopColor: "#F0FE00",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        )}
        <img
          src={data.imageUrl}
          alt={data.label}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            opacity: imageLoaded ? 1 : 0,
            transition: "opacity 0.2s",
          }}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 12px" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            ...fontStyle,
          }}
        >
          {data.label}
        </p>
        <p
          style={{
            fontSize: 11,
            color: "#666",
            margin: "4px 0 0 0",
            ...fontStyle,
          }}
        >
          {data.generatedAt}
        </p>
      </div>

      {/* Hover Actions */}
      {isHovered && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            display: "flex",
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Download image
              const link = document.createElement("a");
              link.href = data.imageUrl;
              link.download = `${data.label}.png`;
              link.click();
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Download"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#fff"
              strokeWidth="1.5"
            >
              <path d="M7 2v8M4 7l3 3 3-3M2 12h10" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export const MockupImageNode = memo(MockupImageNodeComponent);
