"use client";

import React, { useMemo } from "react";
import type { AtlasNode } from "@/lib/atlas-types";

interface CanvasPreviewProps {
  nodes: AtlasNode[];
  className?: string;
}

// Node type to color mapping
const NODE_TYPE_COLORS: Record<string, string> = {
  "file-node": "#3B82F6", // Blue
  "atlas-file-node": "#3B82F6",
  "text-note": "#F0FE00", // Yellow
  "sage-chatbot": "#10B981", // Green
  "presentation-group": "#8B5CF6", // Purple
  "canvas-group": "#F59E0B", // Orange
  default: "#6B7280", // Gray
};

// Get color based on node type or file status
function getNodeColor(node: AtlasNode): string {
  const nodeType = node.type || "default";
  
  // Check for file node with status
  if (nodeType === "file-node" || nodeType === "atlas-file-node") {
    const status = (node.data as Record<string, unknown>)?.status as string;
    if (status === "approved") return "#10B981"; // Green
    if (status === "in-review") return "#F59E0B"; // Orange
    if (status === "in-progress") return "#3B82F6"; // Blue
    if (status === "rejected") return "#EF4444"; // Red
  }
  
  return NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.default;
}

export function CanvasPreview({ nodes, className = "" }: CanvasPreviewProps) {
  // Calculate bounds and scale to fit nodes into the preview area
  const { scaledNodes, viewBox } = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return { scaledNodes: [], viewBox: "0 0 100 100" };
    }

    // Find bounds of all nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      const x = node.position.x;
      const y = node.position.y;
      const width = (node.width as number) || 200;
      const height = (node.height as number) || 100;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    // Add padding
    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Create scaled node representations
    const scaled = nodes.map((node) => {
      const width = (node.width as number) || 200;
      const height = (node.height as number) || 100;

      return {
        id: node.id,
        x: node.position.x - minX,
        y: node.position.y - minY,
        width,
        height,
        color: getNodeColor(node),
        type: node.type,
      };
    });

    return {
      scaledNodes: scaled,
      viewBox: `0 0 ${contentWidth} ${contentHeight}`,
    };
  }, [nodes]);

  if (!nodes || nodes.length === 0) {
    return (
      <div
        className={`w-full h-full relative overflow-hidden ${className}`}
        style={{ backgroundColor: "#0a0a0a" }}
      >
        {/* Grid pattern background - same as actual canvas */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, #222222 1px, transparent 1px),
              linear-gradient(to bottom, #222222 1px, transparent 1px)
            `,
            backgroundSize: "16px 16px",
          }}
        />
        {/* Empty canvas text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-xs text-gray-500 tracking-wide"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            Empty canvas
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full relative overflow-hidden ${className}`}
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #222222 1px, transparent 1px),
            linear-gradient(to bottom, #222222 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Nodes preview */}
      <svg
        viewBox={viewBox}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {scaledNodes.map((node, nodeIndex) => (
          <g key={`${node.id}-${nodeIndex}`}>
            {/* Node rectangle */}
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx={8}
              fill={node.color}
              fillOpacity={0.15}
              stroke={node.color}
              strokeWidth={2}
            />
            {/* Inner highlight line */}
            <rect
              x={node.x + 4}
              y={node.y + 4}
              width={Math.max(node.width * 0.6, 20)}
              height={4}
              rx={2}
              fill={node.color}
              fillOpacity={0.5}
            />
            {/* Content lines simulation */}
            <rect
              x={node.x + 4}
              y={node.y + 14}
              width={Math.max(node.width * 0.4, 15)}
              height={3}
              rx={1}
              fill="#444444"
              fillOpacity={0.5}
            />
            <rect
              x={node.x + 4}
              y={node.y + 22}
              width={Math.max(node.width * 0.5, 18)}
              height={3}
              rx={1}
              fill="#333333"
              fillOpacity={0.4}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default CanvasPreview;
