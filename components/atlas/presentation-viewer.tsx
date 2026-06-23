"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { FileNodeData, TextNodeData, MoodboardNodeData, MoodboardImagePosition } from "@/lib/atlas-types";
import Image from "next/image";
import { detectFocalPoint, type FocalPoint } from "@/lib/focal-point";

// Shared hook for focal point detection
function useFocalPoint(url: string | undefined | null): FocalPoint {
  const [focal, setFocal] = useState<FocalPoint>({ x: 0.5, y: 0.38 });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    detectFocalPoint(url, fp => { if (alive) setFocal(fp); });
    return () => { alive = false; };
  }, [url]);
  return focal;
}

// ─── Moodboard Slide ────────────────────────────────────────────────────────

type MoodboardView = "masonry" | "grid" | "freeform";

function seededRandom(s: number) {
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
}

function buildInitialPositions(
  images: MoodboardNodeData["images"],
  saved: Record<string, MoodboardImagePosition> | undefined,
): Record<string, MoodboardImagePosition> {
  if (saved && Object.keys(saved).length > 0) return { ...saved };
  const result: Record<string, MoodboardImagePosition> = {};
  images.forEach((img, index) => {
    const s = img.id.charCodeAt(0) + index * 137;
    const angle = (index / images.length) * Math.PI * 2 + seededRandom(s) * 0.8;
    const radius = 120 + seededRandom(s + 1) * 220 + (index % 3) * 80;
    result[img.id] = {
      x: Math.max(20, Math.min(820, 450 + Math.cos(angle) * radius * 0.9 + seededRandom(s + 2) * 80 - 40)),
      y: Math.max(20, Math.min(480, 260 + Math.sin(angle) * radius * 0.6 + seededRandom(s + 3) * 60 - 30)),
      zIndex: index + 1,
      rotation: (seededRandom(s + 4) - 0.5) * 20,
      scale: 0.75 + seededRandom(s + 5) * 0.35,
    };
  });
  return result;
}

function MoodboardSlide({ data }: { data: MoodboardNodeData }) {
  const [view, setView] = useState<MoodboardView>("masonry");
  const images = data.images ?? [];

  // Freeform — mutable positions in local state
  const [positions, setPositions] = useState<Record<string, MoodboardImagePosition>>(() =>
    buildInitialPositions(images, data.freeformPositions),
  );
  const [maxZ, setMaxZ] = useState(images.length + 1);
  const dragRef = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-seed when switching to freeform
  useEffect(() => {
    if (view === "freeform") {
      setPositions(buildInitialPositions(images, data.freeformPositions));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = positions[id] ?? { x: 0, y: 0, zIndex: 1, rotation: 0, scale: 1 };
    const newZ = maxZ + 1;
    setMaxZ(newZ);
    setPositions(prev => ({ ...prev, [id]: { ...pos, zIndex: newZ } }));
    dragRef.current = { id, startMouseX: e.clientX, startMouseY: e.clientY, startPosX: pos.x, startPosY: pos.y };
  }, [positions, maxZ]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    const { id, startMouseX, startMouseY, startPosX, startPosY } = dragRef.current;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scaleX = 960 / rect.width;
    const scaleY = 540 / rect.height;
    const dx = (e.clientX - startMouseX) * scaleX;
    const dy = (e.clientY - startMouseY) * scaleY;
    setPositions(prev => {
      const p = prev[id];
      if (!p) return prev;
      return { ...prev, [id]: { ...p, x: startPosX + dx, y: startPosY + dy } };
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    dragRef.current = null;
  }, []);

  // Stop arrow/space keys from navigating slides while hovering the moodboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.stopPropagation();
  }, []);

  const viewIcons: Record<MoodboardView, React.ReactNode> = {
    masonry: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="8" rx="1" fill="currentColor"/>
        <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor"/>
        <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor"/>
        <rect x="1" y="11" width="5" height="2" rx="1" fill="currentColor"/>
      </svg>
    ),
    grid: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor"/>
        <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor"/>
        <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor"/>
        <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor"/>
      </svg>
    ),
    freeform: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="1" width="6" height="6" rx="1" fill="currentColor" transform="rotate(8 5 4)"/>
        <rect x="6" y="6" width="6" height="6" rx="1" fill="currentColor" transform="rotate(-10 9 9)"/>
      </svg>
    ),
  };

  return (
    <div
      className="relative flex flex-col w-full h-full outline-none"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {/* Moodboard label */}
      <div className="absolute top-0 left-0 z-10 pointer-events-none">
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "system-ui, Inter, sans-serif" }}>
          {data.label || "Moodboard"}
        </span>
      </div>

      {/* View switcher */}
      <div className="absolute top-0 right-0 z-20 flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
        {(["masonry", "grid", "freeform"] as MoodboardView[]).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: view === v ? "#F0FE00" : "transparent",
              color: view === v ? "#000" : "rgba(255,255,255,0.4)",
              fontFamily: "system-ui, Inter, sans-serif",
            }}
          >
            {viewIcons[v]}
            <span className="capitalize">{v}</span>
          </button>
        ))}
      </div>

      {/* Image area — flex-1 with min-h-0 so it can shrink; IS the scroll container for masonry/grid */}
      <div
        className="flex-1 w-full pt-10 min-h-0"
        style={{
          overflowY: view === "freeform" ? "hidden" : "auto",
          overflowX: "hidden",
        }}
        onWheel={e => { if (view !== "freeform") e.stopPropagation(); }}
      >
        {/* Masonry — CSS columns, no inner wrapper needed */}
        {view === "masonry" && (
          <div style={{ columns: Math.min(images.length, 4), columnGap: "10px" }}>
            {images.map((img) => (
              <div key={img.id} className="break-inside-avoid mb-2.5 rounded-lg overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
                {img.fileType === "video" ? (
                  <video src={img.url} className="w-full object-cover" muted loop autoPlay playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.thumbnail || img.url} alt={img.fileName} className="w-full object-cover block" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Grid — uniform cells, scrolls via parent */}
        {view === "grid" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(images.length))}, 1fr)`,
              gap: "10px",
            }}
          >
            {images.map((img) => (
              <div key={img.id} className="relative rounded-lg overflow-hidden" style={{ backgroundColor: "#1a1a1a", aspectRatio: "4/3" }}>
                {img.fileType === "video" ? (
                  <video src={img.url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                ) : (
                  <Image src={img.thumbnail || img.url} alt={img.fileName} fill className="object-cover" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Freeform — draggable images; inner div handles its own scroll */}
        {view === "freeform" && (
          <div
            ref={containerRef}
            className="w-full overflow-auto"
            style={{ height: "100%" }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={e => e.stopPropagation()}
          >
            {/* Virtual 960×540 canvas */}
            <div className="relative" style={{ width: 960, height: 540 }}>
              {images.map((img) => {
                const pos = positions[img.id] ?? { x: 100, y: 100, zIndex: 1, rotation: 0, scale: 1 };
                const w = Math.round(180 * (pos.scale ?? 1));
                return (
                  <div
                    key={img.id}
                    className="absolute rounded-lg overflow-hidden shadow-xl select-none"
                    style={{
                      left: pos.x,
                      top: pos.y,
                      width: w,
                      zIndex: pos.zIndex ?? 1,
                      transform: `rotate(${pos.rotation ?? 0}deg)`,
                      backgroundColor: "#1a1a1a",
                      cursor: "grab",
                      touchAction: "none",
                    }}
                    onPointerDown={e => handlePointerDown(e, img.id)}
                  >
                    {img.fileType === "video" ? (
                      <video src={img.url} className="w-full object-cover pointer-events-none" muted loop autoPlay playsInline style={{ display: "block" }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.thumbnail || img.url} alt={img.fileName} className="w-full object-cover block pointer-events-none" draggable={false} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bento layout helpers ────────────────────────────────────────────────────

function getBentoLayout(count: number): string {
  switch (count) {
    case 2: return "grid-cols-2 grid-rows-1";
    case 3: return "grid-cols-2 grid-rows-2";
    case 4: return "grid-cols-2 grid-rows-2";
    case 5: return "grid-cols-3 grid-rows-2";
    case 6: return "grid-cols-3 grid-rows-2";
    default: return count > 6 ? "grid-cols-3 grid-rows-3" : "grid-cols-1 grid-rows-1";
  }
}

function getBentoItemClass(index: number, total: number): string {
  if (total === 3 && index === 0) return "row-span-2";
  if (total === 5 && index === 0) return "row-span-2";
  return "";
}

// Extract the media URL from any node type
function getNodeMediaUrl(node: Node): string | undefined {
  if (node.type === "mockupImage") return (node.data as { imageUrl?: string }).imageUrl;
  const d = node.data as unknown as FileNodeData & { thumbnail?: string };
  return d.uploadedFile?.url || d.previewImages?.[0] || d.thumbnail;
}

// Pure renderer — no state, just draws the image at the given focal position
function BentoCellMedia({ node, focal }: { node: Node; focal: FocalPoint }) {
  const objPos = `${(focal.x * 100).toFixed(1)}% ${(focal.y * 100).toFixed(1)}%`;
  const imgStyle: React.CSSProperties = {
    width: "100%", height: "100%",
    objectFit: "cover", objectPosition: objPos,
    userSelect: "none", pointerEvents: "none", display: "block",
  };

  if (node.type === "mockupImage") {
    const d = node.data as { imageUrl: string; label?: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={d.imageUrl} alt={d.label || "Mockup"} draggable={false} style={imgStyle} />;
  }

  const fileData = node.data as unknown as FileNodeData & { thumbnail?: string };
  const mediaUrl = fileData.uploadedFile?.url || fileData.previewImages?.[0] || fileData.thumbnail;
  const isVideo = fileData.fileExtension?.match(/^\.(mp4|mov|webm|avi|mkv|m4v)$/i);

  if (isVideo && mediaUrl) {
    return <video src={mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted loop autoPlay playsInline />;
  }
  if (mediaUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl} alt={fileData.fileName || "Image"} draggable={false} style={imgStyle} />;
  }
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 24, color: "#6b7280" }}>{fileData.fileExtension?.toUpperCase()}</span>
    </div>
  );
}

// Individual cell: owns pan state, renders media, exposes drag handles for swap
function BentoGridCell({
  node,
  itemClass,
  panOverride,
  isDragSource,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onPanUpdate,
}: {
  node: Node;
  itemClass: string;
  panOverride?: FocalPoint;
  isDragSource: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onPanUpdate: (fp: FocalPoint) => void;
}) {
  const mediaUrl = getNodeMediaUrl(node);
  const detectedFocal = useFocalPoint(mediaUrl);
  const effectiveFocal = panOverride ?? detectedFocal;

  const panRef = useRef<{
    startX: number; startY: number;
    startFocalX: number; startFocalY: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-drag-handle]")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = {
      startX: e.clientX, startY: e.clientY,
      startFocalX: effectiveFocal.x, startFocalY: effectiveFocal.y,
    };
    setIsPanning(true);
  }, [effectiveFocal]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    onPanUpdate({
      x: Math.max(0, Math.min(1, panRef.current.startFocalX - dx / rect.width)),
      y: Math.max(0, Math.min(1, panRef.current.startFocalY - dy / rect.height)),
    });
  }, [onPanUpdate]);

  const handlePointerUp = useCallback(() => {
    panRef.current = null;
    setIsPanning(false);
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-lg group/cell ${itemClass}`}
      style={{
        backgroundColor: "#1a1a1a",
        opacity: isDragSource ? 0.35 : 1,
        outline: isDragOver ? "2px solid #F0FE00" : "none",
        outlineOffset: -2,
        cursor: isPanning ? "grabbing" : "grab",
        touchAction: "none",
        transition: isDragSource ? "none" : "opacity 0.15s, outline 0.1s",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <BentoCellMedia node={node} focal={effectiveFocal} />

      {/* Drag-to-swap handle — 4-dot grid icon, top-right, appears on hover */}
      <div
        data-drag-handle
        draggable
        onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
        onDragEnd={onDragEnd}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover/cell:opacity-100 transition-opacity"
        style={{
          width: 26, height: 26,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
          borderRadius: 7,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "grab",
        }}
        title="Drag to swap"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="2.5" cy="2.5" r="1.1" fill="rgba(255,255,255,0.85)"/>
          <circle cx="7.5" cy="2.5" r="1.1" fill="rgba(255,255,255,0.85)"/>
          <circle cx="2.5" cy="7.5" r="1.1" fill="rgba(255,255,255,0.85)"/>
          <circle cx="7.5" cy="7.5" r="1.1" fill="rgba(255,255,255,0.85)"/>
        </svg>
      </div>

      {/* Pan hint — bottom-left, visible on hover when not panning */}
      {!isPanning && (
        <div className="absolute bottom-2 left-2 z-10 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2V5M9 13V16M2 9H5M13 9H16" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="9" r="2.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// Bento grid — manages node ordering (drag-to-swap) and per-node pan overrides
function BentoGrid({ nodes: initialNodes }: { nodes: Node[] }) {
  const count = initialNodes.length;
  const nodeKey = initialNodes.map(n => n.id).join(",");

  // Display order: indices into initialNodes
  const [order, setOrder] = useState<number[]>(() => initialNodes.map((_, i) => i));
  // Pan overrides keyed by original node index so they follow the image when swapped
  const [panOverrides, setPanOverrides] = useState<Record<number, FocalPoint>>({});

  // Reset when slide changes
  useEffect(() => {
    setOrder(initialNodes.map((_, i) => i));
    setPanOverrides({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey]);

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleSwap = useCallback((fromDisplay: number, toDisplay: number) => {
    if (fromDisplay === toDisplay) return;
    setOrder(prev => {
      const next = [...prev];
      [next[fromDisplay], next[toDisplay]] = [next[toDisplay], next[fromDisplay]];
      return next;
    });
    // Pan overrides follow the images, so swap them too
    setPanOverrides(prev => {
      const fromOrig = order[fromDisplay];
      const toOrig = order[toDisplay];
      const next = { ...prev };
      const tmp = next[fromOrig];
      if (next[toOrig] !== undefined) next[fromOrig] = next[toOrig]; else delete next[fromOrig];
      if (tmp !== undefined) next[toOrig] = tmp; else delete next[toOrig];
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  return (
    <div className={`grid ${getBentoLayout(count)} gap-3 w-full max-w-6xl`} style={{ height: "65vh" }}>
      {order.map((origIdx, displayIdx) => {
        const node = initialNodes[origIdx];
        return (
          <BentoGridCell
            key={`${node.id}-${displayIdx}`}
            node={node}
            itemClass={getBentoItemClass(displayIdx, count)}
            panOverride={panOverrides[origIdx]}
            isDragSource={dragFrom === displayIdx}
            isDragOver={dragOver === displayIdx && dragFrom !== null && dragFrom !== displayIdx}
            onDragStart={() => setDragFrom(displayIdx)}
            onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
            onDragOver={e => { e.preventDefault(); setDragOver(displayIdx); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => {
              e.preventDefault();
              if (dragFrom !== null) handleSwap(dragFrom, displayIdx);
              setDragFrom(null);
              setDragOver(null);
            }}
            onPanUpdate={fp => setPanOverrides(prev => ({ ...prev, [origIdx]: fp }))}
          />
        );
      })}
    </div>
  );
}

// ─── Presentation Viewer ─────────────────────────────────────────────────────

interface PresentationGroup {
  id: string;
  nodeIds: string[];
}

interface PresentationViewerProps {
  nodes: Node[];
  presentationEdges: Edge[];
  presentationGroups: PresentationGroup[];
  onClose: () => void;
  presentationName: string;
  onPresentationNameChange: (name: string) => void;
  workspaceName: string;
  workspaceWordmark?: string;
}

export function PresentationViewer({
  nodes,
  presentationEdges,
  presentationGroups,
  onClose,
  presentationName,
  onPresentationNameChange,
  workspaceName,
  workspaceWordmark,
}: PresentationViewerProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(presentationName);
  const [currentIndex, setCurrentIndex] = useState(0);

  type Slide = { type: "single"; nodeId: string } | { type: "group"; nodeIds: string[] };

  const slides = React.useMemo<Slide[]>(() => {
    const result: Slide[] = [];
    const groupedNodeIds = new Set(presentationGroups.flatMap(g => g.nodeIds));

    if (presentationEdges.length > 0) {
      const sources = new Set(presentationEdges.map(e => e.source));
      const targets = new Set(presentationEdges.map(e => e.target));
      let startNodeId = "";
      for (const source of sources) {
        if (!targets.has(source)) { startNodeId = source; break; }
      }
      if (!startNodeId && presentationEdges.length > 0) startNodeId = presentationEdges[0].source;

      const sequence: string[] = [startNodeId];
      const visited = new Set([startNodeId]);
      let currentId = startNodeId;
      while (true) {
        const nextEdge = presentationEdges.find(e => e.source === currentId && !visited.has(e.target));
        if (!nextEdge) break;
        sequence.push(nextEdge.target);
        visited.add(nextEdge.target);
        currentId = nextEdge.target;
      }

      for (const nodeId of sequence) {
        if (groupedNodeIds.has(nodeId)) continue;
        const node = nodes.find(n => n.id === nodeId);
        if (node?.type === "presentationGroup") {
          const groupData = node.data as { nodeIds?: string[] };
          if (groupData.nodeIds && groupData.nodeIds.length > 0) {
            result.push({ type: "group", nodeIds: groupData.nodeIds });
          }
        } else {
          result.push({ type: "single", nodeId });
        }
      }
    }

    if (presentationEdges.length === 0 && presentationGroups.length > 0) {
      for (const group of presentationGroups) {
        result.push({ type: "group", nodeIds: group.nodeIds });
      }
    }

    return result;
  }, [presentationEdges, presentationGroups, nodes]);

  const currentSlide = slides[currentIndex];

  const currentNodes = React.useMemo(() => {
    if (!currentSlide) return [];
    if (currentSlide.type === "single") {
      const node = nodes.find(n => n.id === currentSlide.nodeId);
      if (node?.type === "presentationGroup") {
        const groupData = node.data as { originalNodes?: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }> };
        if (groupData.originalNodes) {
          return groupData.originalNodes.map(orig => ({ id: orig.id, type: orig.type, position: orig.position, data: orig.data })) as Node[];
        }
      }
      return node ? [node] : [];
    } else {
      const foundNodes = currentSlide.nodeIds
        .map(id => nodes.find(n => n.id === id))
        .filter((n): n is Node => n !== undefined);

      if (foundNodes.length === 0) {
        for (const node of nodes) {
          if (node.type === "presentationGroup") {
            const groupData = node.data as { nodeIds?: string[]; originalNodes?: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }> };
            if (groupData.nodeIds?.some(id => currentSlide.nodeIds.includes(id)) && groupData.originalNodes) {
              return groupData.originalNodes.map(orig => ({ id: orig.id, type: orig.type, position: orig.position, data: orig.data })) as Node[];
            }
          }
        }
      }
      return foundNodes;
    }
  }, [currentSlide, nodes]);

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) setCurrentIndex(prev => prev + 1);
  }, [currentIndex, slides.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingName) {
        if (e.key === "Escape") { setIsEditingName(false); setEditedName(presentationName); }
        return;
      }
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "Escape") { onClose(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onClose, isEditingName, presentationName]);

  if (slides.length === 0 || currentNodes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.95)" }}>
        <div className="text-center">
          <p className="text-white text-lg mb-4">No presentation slides found.</p>
          <p className="text-gray-400 text-sm mb-6">Connect nodes with presentation edges or group images to create a presentation.</p>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#333333" }}>Close</button>
        </div>
      </div>
    );
  }

  const renderSlideContent = () => {
    if (!currentSlide) return null;

    if (currentSlide.type === "group" && currentNodes.length > 1) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full px-8">
          <BentoGrid nodes={currentNodes} />
        </div>
      );
    }

    const currentNode = currentNodes[0];
    if (!currentNode) return null;

    if (currentNode.type === "mockupImage") {
      const mockupData = currentNode.data as { imageUrl: string; label?: string; prompt?: string; generatedAt?: string };
      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="relative w-full max-w-5xl" style={{ maxHeight: "70vh" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mockupData.imageUrl}
              alt={mockupData.label || "Mockup"}
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", margin: "0 auto", borderRadius: 12 }}
            />
          </div>
          <span className="mt-4 text-xs font-normal tracking-wide" style={{ fontFamily: "system-ui, Inter, sans-serif", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
            {mockupData.label || "AI Mockup"}
          </span>
        </div>
      );
    }

    if (currentNode.type === "file") {
      const fileData = currentNode.data as FileNodeData;
      const isVideo = fileData.fileExtension?.match(/^\.(mp4|mov|webm|avi|mkv|m4v)$/i);
      const mediaUrl = fileData.uploadedFile?.url || fileData.thumbnail;

      if (isVideo && mediaUrl) {
        return (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <video key={currentNode.id} src={mediaUrl} controls autoPlay className="max-w-6xl max-h-[70vh] rounded-lg" style={{ backgroundColor: "#000" }} />
            <span className="mt-4 text-xs font-normal tracking-wide" style={{ fontFamily: "system-ui, Inter, sans-serif", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
              {fileData.fileName || fileData.label}
            </span>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
          {mediaUrl ? (
            <div className="relative w-full max-w-6xl h-[70vh]">
              <Image src={mediaUrl} alt={fileData.fileName || "Slide"} fill className="object-contain rounded-lg" />
            </div>
          ) : (
            <div className="w-64 h-64 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1a1a1a" }}>
              <span className="text-4xl text-gray-500">{fileData.fileExtension?.toUpperCase()}</span>
            </div>
          )}
          <span className="mt-4 text-xs font-normal tracking-wide" style={{ fontFamily: "system-ui, Inter, sans-serif", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
            {fileData.fileName || fileData.label}
          </span>
        </div>
      );
    }

    if (currentNode.type === "text") {
      const textData = currentNode.data as TextNodeData;
      const formatting = textData.formatting;
      const content = textData.content || textData.label || "";
      const plainText = content.replace(/\[\[(h1|h2|h3|body)\]\]/g, "").replace(/\[\[\/(h1|h2|h3|body)\]\]/g, "");
      const textLength = plainText.length;
      let fontSize: number, lineHeight: number, maxWidth: string;
      if (textLength < 50)       { fontSize = 72; lineHeight = 1.1; maxWidth = "90%"; }
      else if (textLength < 150) { fontSize = 48; lineHeight = 1.2; maxWidth = "85%"; }
      else if (textLength < 300) { fontSize = 32; lineHeight = 1.4; maxWidth = "75%"; }
      else if (textLength < 600) { fontSize = 24; lineHeight = 1.5; maxWidth = "70%"; }
      else                       { fontSize = 18; lineHeight = 1.6; maxWidth = "65%"; }
      const fontMap: Record<string, string> = {
        sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        mono: "'SF Mono', Menlo, Monaco, monospace",
      };
      const alignMap: Record<string, string> = { left: "text-left", center: "text-center", right: "text-right" };
      return (
        <div className={`flex flex-col justify-center h-full w-full px-16 ${alignMap[formatting?.align || "left"]}`} style={{ maxWidth }}>
          <div
            className={`leading-tight ${formatting?.bold ? "font-semibold" : "font-normal"}`}
            style={{ color: formatting?.color || "#ffffff", fontFamily: fontMap[formatting?.font || "sans"], fontSize: `${fontSize}px`, lineHeight, letterSpacing: fontSize > 40 ? "-0.02em" : "-0.01em", textWrap: "balance" }}
          >
            {plainText}
          </div>
        </div>
      );
    }

    // Moodboard slide — full layout with view switcher
    if (currentNode.type === "moodboard") {
      const moodboardData = currentNode.data as unknown as MoodboardNodeData;
      return (
        <div className="flex flex-col items-start justify-start h-full w-full max-w-6xl">
          <MoodboardSlide data={moodboardData} />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-64 h-64 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1a1a1a" }}>
          <span className="text-xl text-gray-400">{currentNode.type}</span>
        </div>
        <h2 className="text-2xl font-medium text-white mt-6" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {String(currentNode.data.label ?? "Untitled")}
        </h2>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-1">
          <button type="button" onClick={goPrev} disabled={currentIndex === 0} className="w-6 h-6 rounded flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="px-2 py-1 rounded text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{currentIndex + 1} / {slides.length}</div>
          <button type="button" onClick={goNext} disabled={currentIndex === slides.length - 1} className="w-6 h-6 rounded flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5L15 15" stroke="#888888" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-16 pb-24">
        {renderSlideContent()}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-4">
        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
          <div className="flex items-center">
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={() => {
                  setIsEditingName(false);
                  if (editedName.trim() && editedName !== presentationName) onPresentationNameChange(editedName.trim());
                  else setEditedName(presentationName);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setIsEditingName(false); if (editedName.trim() && editedName !== presentationName) onPresentationNameChange(editedName.trim()); }
                  else if (e.key === "Escape") { setIsEditingName(false); setEditedName(presentationName); }
                }}
                autoFocus
                className="bg-transparent text-xs text-gray-400 border-b border-gray-600 outline-none px-0 py-0.5"
                style={{ fontFamily: "system-ui, Inter, sans-serif", minWidth: "120px" }}
              />
            ) : (
              <button type="button" onClick={() => setIsEditingName(true)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {presentationName || "Untitled Presentation"}
              </button>
            )}
          </div>
          <div className="flex items-center">
            {workspaceWordmark ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspaceWordmark} alt={workspaceName} className="h-4 opacity-40" />
            ) : (
              <span className="text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{workspaceName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

