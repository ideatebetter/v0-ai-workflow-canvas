"use client";

import React, { useMemo } from "react";
import type { AtlasNode } from "@/lib/atlas-types";
import type { Edge } from "@xyflow/react";

interface CanvasPreviewProps {
  nodes: AtlasNode[];
  edges?: Edge[];
  className?: string;
}

// Node type to color mapping
const NODE_TYPE_COLORS: Record<string, string> = {
  "file-node": "#3B82F6",
  "atlas-file-node": "#3B82F6",
  "file": "#3B82F6",
  "text-note": "#F0FE00",
  "text": "#F0FE00",
  "sage-chatbot": "#10B981",
  "sageChatbot": "#10B981",
  "presentation-group": "#8B5CF6",
  "presentationGroup": "#8B5CF6",
  "canvas-group": "#F59E0B",
  "briefInput": "#3B82F6",
  "mockupImage": "#EC4899",
  "aiPrompt": "#EC4899",
  "moodboard": "#F59E0B",
  default: "#6B7280",
};

const BRIEF_CARD_KEYS = new Set([
  "project-overview",
  "design-direction",
  "logo-requirements",
  "deliverables",
  "timeline-budget",
]);

function getNodeColor(node: AtlasNode): string {
  const nodeType = (node.type as string) || "default";

  if (nodeType === "file-node" || nodeType === "atlas-file-node" || nodeType === "file") {
    const status = (node.data as Record<string, unknown>)?.status as string;
    if (status === "approved") return "#10B981";
    if (status === "in-review") return "#F59E0B";
    if (status === "in-progress") return "#3B82F6";
    if (status === "rejected") return "#EF4444";
  }

  if (nodeType === "briefInput") {
    const cardKey = (node.data as Record<string, unknown>)?.cardKey as string;
    return BRIEF_CARD_KEYS.has(cardKey) ? "#F59E0B" : "#3B82F6";
  }

  return NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.default;
}

// Extract an image URL from a node's data, or null if none applies.
function getNodeImageUrl(node: AtlasNode): string | null {
  const type = (node.type as string) || "";
  const data = node.data as Record<string, unknown> | undefined;
  if (!data) return null;

  // Mockup image nodes
  if (type === "mockupImage") {
    const url = data.imageUrl as string | undefined;
    if (url) return url;
  }

  // Moodboard nodes: use first image
  if (type === "moodboard") {
    const images = data.images as Array<{ url?: string; thumbnail?: string; fileType?: string }> | undefined;
    const first = images?.find(i => i.fileType !== "video") ?? images?.[0];
    if (first?.thumbnail) return first.thumbnail;
    if (first?.url) return first.url;
  }

  // File nodes: previewImages first, then uploadedFile.url if it looks like an image
  if (type === "file" || type === "file-node" || type === "atlas-file-node") {
    const preview = (data.previewImages as string[] | undefined)?.[0];
    if (preview) return preview;
    const uploaded = data.uploadedFile as { url?: string } | undefined;
    const url = uploaded?.url;
    const ext = (data.fileExtension as string | undefined)?.toLowerCase();
    const isImageExt = ext && ["jpg", "jpeg", "png", "gif", "webp", "svg", "heic", "avif"].includes(ext);
    if (url && isImageExt) return url;
  }

  return null;
}

// Extract preview text from a text-like node.
function getNodeText(node: AtlasNode): string | null {
  const type = (node.type as string) || "";
  const data = node.data as Record<string, unknown> | undefined;
  if (!data) return null;

  if (type === "text" || type === "text-note") {
    const content = data.content as string | undefined;
    if (content) return content.trim();
  }

  // briefInput cards have a label + fields; show the label as a proxy
  if (type === "briefInput") {
    const label = data.label as string | undefined;
    if (label) return label;
  }

  return null;
}

// Return an SVG path string for a small icon in a node corner. Uses stroke, not fill.
function getNodeIconPath(nodeType: string): string | null {
  switch (nodeType) {
    case "sage-chatbot":
    case "sageChatbot":
      // chat bubble
      return "M4 4h16v10h-8l-4 4v-4H4z";
    case "presentation-group":
    case "presentationGroup":
      // grid / slides
      return "M3 4h8v6H3zM13 4h8v6h-8zM3 12h8v8H3zM13 12h8v8h-8z";
    case "capacity":
    case "financial":
    case "projectHealth":
    case "pipeline":
    case "teamHealth":
      // bar chart
      return "M4 20V10M10 20V4M16 20v-8M22 20H2";
    case "briefInput":
      // doc
      return "M6 3h9l5 5v13H6zM15 3v5h5";
    case "aiPrompt":
      // sparkle
      return "M12 2v6M12 16v6M2 12h6M16 12h6M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4";
    case "docFrame":
      // frame
      return "M4 4h16v16H4zM4 9h16";
    case "file":
    case "file-node":
    case "atlas-file-node":
      // file page
      return "M6 3h9l5 5v13H6zM15 3v5h5";
    default:
      return null;
  }
}

// Renders a mini mock of the node's real look inside a card at (x, y, w, h)
function renderNodeMock(type: string, x: number, y: number, w: number, h: number): React.ReactNode {
  const pad = 10;
  const cx = x + pad;
  const cy = y + pad;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  // Header bar (title placeholder) — same across most node types
  const header = (
    <g>
      <rect x={cx} y={cy} width={Math.min(innerW * 0.55, 100)} height={6} rx={2} fill="#f0fe00" fillOpacity={0.85} />
      <rect x={cx} y={cy + 12} width={Math.min(innerW * 0.3, 60)} height={4} rx={1.5} fill="#666" />
    </g>
  );

  switch (type) {
    case "capacity":
    case "teamHealth": {
      // Rows of avatar dot + horizontal progress bar
      const rows = 4;
      const rowGap = 10;
      const startY = cy + 26;
      const availH = innerH - 26;
      const rowH = Math.min(10, Math.max(6, (availH - (rows - 1) * rowGap) / rows));
      const dot = Math.min(rowH, 8);
      return (
        <g>
          {header}
          {Array.from({ length: rows }).map((_, i) => {
            const ry = startY + i * (rowH + rowGap);
            if (ry + rowH > y + h - pad) return null;
            const pct = [0.75, 0.5, 0.85, 0.4][i] ?? 0.6;
            return (
              <g key={i}>
                <circle cx={cx + dot / 2} cy={ry + rowH / 2} r={dot / 2} fill={["#3B82F6", "#F59E0B", "#10B981", "#EC4899"][i % 4]} />
                <rect x={cx + dot + 6} y={ry + rowH / 2 - 2} width={innerW - dot - 6} height={4} rx={2} fill="#222" />
                <rect x={cx + dot + 6} y={ry + rowH / 2 - 2} width={(innerW - dot - 6) * pct} height={4} rx={2} fill="#4ADE80" fillOpacity={0.7} />
              </g>
            );
          })}
        </g>
      );
    }

    case "financial": {
      // Big number + trending line chart
      const chartTop = cy + 32;
      const chartH = Math.max(20, innerH - 42);
      const chartW = innerW;
      const pts = [0.7, 0.5, 0.6, 0.35, 0.55, 0.25, 0.3];
      const points = pts.map((p, i) => `${cx + (i / (pts.length - 1)) * chartW},${chartTop + p * chartH}`).join(" ");
      return (
        <g>
          {header}
          <rect x={cx} y={cy + 22} width={Math.min(innerW * 0.4, 70)} height={10} rx={2} fill="#4ADE80" fillOpacity={0.25} />
          <polyline points={points} fill="none" stroke="#F87171" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }

    case "projectHealth": {
      // Status pills row + a mini stacked bar
      const pillY = cy + 26;
      const pillH = 8;
      const barY = pillY + pillH + 8;
      const barH = Math.min(14, Math.max(8, innerH - (barY - cy) - 6));
      const pillColors = ["#4ADE80", "#FCD34D", "#F87171"];
      const pillWidths = [innerW * 0.28, innerW * 0.22, innerW * 0.18];
      let px = cx;
      const segments = [0.55, 0.25, 0.2];
      let bx = cx;
      return (
        <g>
          {header}
          {pillColors.map((c, i) => {
            const el = <rect key={i} x={px} y={pillY} width={pillWidths[i]} height={pillH} rx={pillH / 2} fill={c} fillOpacity={0.6} />;
            px += pillWidths[i] + 6;
            return el;
          })}
          {segments.map((s, i) => {
            const wSeg = innerW * s;
            const el = <rect key={i} x={bx} y={barY} width={wSeg} height={barH} fill={pillColors[i]} fillOpacity={0.7} />;
            bx += wSeg;
            return el;
          })}
        </g>
      );
    }

    case "pipeline": {
      // Row of connected stage dots
      const midY = cy + Math.max(24, innerH * 0.55);
      const stages = 5;
      const gap = innerW / (stages - 1);
      return (
        <g>
          {header}
          <line x1={cx} y1={midY} x2={cx + innerW} y2={midY} stroke="#333" strokeWidth={1.5} />
          {Array.from({ length: stages }).map((_, i) => {
            const cX = cx + i * gap;
            const done = i < 2;
            const active = i === 2;
            return (
              <circle
                key={i}
                cx={cX}
                cy={midY}
                r={5}
                fill={done ? "#4ADE80" : active ? "#FCD34D" : "#2a2a2a"}
                stroke={done || active ? "none" : "#444"}
                strokeWidth={1}
              />
            );
          })}
        </g>
      );
    }

    case "sageChatbot":
    case "sage-chatbot": {
      // Chat bubbles
      const b1Y = cy + 24;
      return (
        <g>
          {header}
          <rect x={cx} y={b1Y} width={innerW * 0.55} height={10} rx={5} fill="#2a2a2a" />
          <rect x={cx + innerW * 0.35} y={b1Y + 16} width={innerW * 0.55} height={10} rx={5} fill="#3B82F6" fillOpacity={0.5} />
          <rect x={cx} y={b1Y + 32} width={innerW * 0.4} height={10} rx={5} fill="#2a2a2a" />
        </g>
      );
    }

    case "stakeholder": {
      // Grid of avatars
      const size = 12;
      const rows = 2;
      const cols = 3;
      const gap = 8;
      const gridY = cy + 24;
      return (
        <g>
          {header}
          {Array.from({ length: rows * cols }).map((_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            return (
              <circle
                key={i}
                cx={cx + c * (size + gap) + size / 2}
                cy={gridY + r * (size + gap) + size / 2}
                r={size / 2}
                fill={["#3B82F6", "#F59E0B", "#10B981", "#EC4899", "#8B5CF6", "#F87171"][i % 6]}
                fillOpacity={0.7}
              />
            );
          })}
        </g>
      );
    }

    case "presentationGroup":
    case "presentation-group": {
      // 2x2 slide grid
      const gap = 4;
      const cellW = (innerW - gap) / 2;
      const gridY = cy + 20;
      const cellH = Math.max(12, (innerH - 24 - gap) / 2);
      return (
        <g>
          {header}
          {[0, 1, 2, 3].map(i => (
            <rect
              key={i}
              x={cx + (i % 2) * (cellW + gap)}
              y={gridY + Math.floor(i / 2) * (cellH + gap)}
              width={cellW}
              height={cellH}
              rx={2}
              fill="#2a2a2a"
            />
          ))}
        </g>
      );
    }

    case "aiPrompt": {
      // Text lines + sparkle
      return (
        <g>
          {header}
          <rect x={cx} y={cy + 24} width={innerW * 0.9} height={4} rx={1} fill="#EC4899" fillOpacity={0.5} />
          <rect x={cx} y={cy + 32} width={innerW * 0.7} height={4} rx={1} fill="#444" />
          <rect x={cx} y={cy + 40} width={innerW * 0.5} height={4} rx={1} fill="#444" />
          <path
            d="M12 2v6M12 16v6M2 12h6M16 12h6"
            transform={`translate(${cx + innerW - 28}, ${cy + 22})`}
            stroke="#EC4899"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </g>
      );
    }

    case "docFrame": {
      // Doc lines
      return (
        <g>
          {header}
          {[0, 1, 2, 3, 4].map(i => (
            <rect
              key={i}
              x={cx}
              y={cy + 24 + i * 8}
              width={innerW * (i === 0 ? 0.8 : i % 2 === 0 ? 0.9 : 0.6)}
              height={3}
              rx={1}
              fill="#333"
            />
          ))}
        </g>
      );
    }

    case "statusPill": {
      // Just a pill
      const pillH = Math.min(innerH, 18);
      return (
        <rect
          x={cx}
          y={y + h / 2 - pillH / 2}
          width={innerW}
          height={pillH}
          rx={pillH / 2}
          fill="#4ADE80"
          fillOpacity={0.5}
        />
      );
    }

    case "briefInput":
    case "file":
    case "file-node":
    case "atlas-file-node":
    default: {
      // Generic file/doc placeholder with icon
      const iconPath = getNodeIconPath(type);
      const iconSize = Math.min(28, w * 0.28, h * 0.55);
      return (
        <g>
          {header}
          <rect x={cx} y={cy + 26} width={innerW * 0.7} height={3} rx={1} fill="#333" />
          <rect x={cx} y={cy + 34} width={innerW * 0.5} height={3} rx={1} fill="#333" />
          {iconPath && (
            <g
              transform={`translate(${x + w - iconSize - pad}, ${y + h - iconSize - pad})`}
              opacity={0.7}
            >
              <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
                <path
                  d={iconPath}
                  stroke="#888"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </g>
          )}
        </g>
      );
    }
  }
}

export function CanvasPreview({ nodes, edges, className = "" }: CanvasPreviewProps) {
  const { scaledNodes, scaledEdges, viewBox } = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return { scaledNodes: [], scaledEdges: [], viewBox: "0 0 100 100" };
    }

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

    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const nodeMap = new Map<string, { cx: number; cy: number; color: string }>();
    const scaled = nodes.map((node) => {
      const width = (node.width as number) || 200;
      const height = (node.height as number) || 100;
      const x = node.position.x - minX;
      const y = node.position.y - minY;
      const color = getNodeColor(node);
      nodeMap.set(node.id, { cx: x + width / 2, cy: y + height / 2, color });
      return {
        id: node.id,
        x,
        y,
        width,
        height,
        color,
        type: node.type || "default",
        imageUrl: getNodeImageUrl(node),
        text: getNodeText(node),
      };
    });

    const scaledE = (edges ?? []).flatMap((edge) => {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) return [];
      return [{ id: edge.id, x1: src.cx, y1: src.cy, x2: tgt.cx, y2: tgt.cy }];
    });

    return {
      scaledNodes: scaled,
      scaledEdges: scaledE,
      viewBox: `0 0 ${contentWidth} ${contentHeight}`,
    };
  }, [nodes, edges]);

  if (!nodes || nodes.length === 0) {
    return (
      <div
        className={`w-full h-full relative overflow-hidden ${className}`}
        style={{ backgroundColor: "#0a0a0a" }}
      >
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

      <svg
        viewBox={viewBox}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {scaledEdges.map((edge) => (
          <line
            key={edge.id}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="#333333"
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
        ))}

        {scaledNodes.map((node, nodeIndex) => {
          const clipId = `clip-${node.id}-${nodeIndex}`;
          const rx = 8;

          // Image nodes — render the actual image via foreignObject
          if (node.imageUrl) {
            return (
              <g key={`${node.id}-${nodeIndex}`}>
                <defs>
                  <clipPath id={clipId}>
                    <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={rx} />
                  </clipPath>
                </defs>
                <foreignObject
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  clipPath={`url(#${clipId})`}
                >
                  <div
                    style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: rx }}
                  >
                    <img
                      src={node.imageUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                </foreignObject>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={rx}
                  fill="none"
                  stroke="#2a2a2a"
                  strokeWidth={1.5}
                />
              </g>
            );
          }

          // Text nodes — render the content preview via foreignObject
          if (node.text) {
            return (
              <g key={`${node.id}-${nodeIndex}`}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={rx}
                  fill="#111111"
                  stroke="#2a2a2a"
                  strokeWidth={1.5}
                />
                <foreignObject
                  x={node.x + 8}
                  y={node.y + 8}
                  width={node.width - 16}
                  height={node.height - 16}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      overflow: "hidden",
                      color: "#e5e5e5",
                      fontFamily: "system-ui, Inter, sans-serif",
                      fontSize: Math.max(10, Math.min(18, node.height * 0.14)),
                      lineHeight: 1.25,
                      display: "-webkit-box",
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {node.text}
                  </div>
                </foreignObject>
              </g>
            );
          }

          // Everything else — dark card resembling the actual node, with per-type mock content
          return (
            <g key={`${node.id}-${nodeIndex}`}>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={rx}
                fill="#111111"
                stroke="#2a2a2a"
                strokeWidth={1.5}
              />
              {renderNodeMock(node.type, node.x, node.y, node.width, node.height)}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default CanvasPreview;
