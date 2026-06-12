"use client";

import { useState, useEffect, useCallback } from "react";
import { Handle, Position, useViewport } from "@xyflow/react";
import { usePresentationNodes } from "./atlas-canvas";
import { useConnectionContext } from "./connection-context";

type EdgeSide = "left" | "right" | "top" | "bottom";

const PROXIMITY_PX = 64;   // screen px — cursor within this range activates handles
const GHOST_LENGTH = 36;   // px length of ghost preview line

interface SmartHandlesProps {
  nodeId: string;
}

export function SmartHandles({ nodeId }: SmartHandlesProps) {
  const { zoom } = useViewport();
  const presentationNodes = usePresentationNodes();
  const isInPresentation = presentationNodes.has(nodeId);
  const { altConnectMode, altConnectSource } = useConnectionContext();

  const [isNear, setIsNear] = useState(false);
  const [nearestEdge, setNearestEdge] = useState<EdgeSide | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<EdgeSide | null>(null);

  // Zoom-adaptive sizing: dots grow as you zoom out (Fitts's Law)
  const handleSize = Math.max(8, Math.min(22, 14 / zoom));
  // At extreme zoom-out collapse to a ring instead of 4 dots
  const showRing = zoom < 0.25;

  // ── Feature 1: Proximity Activation + Feature 4: Edge-of-Node Detection ──
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const nodeEl = document.querySelector(
        `.react-flow__node[data-id="${nodeId}"]`
      ) as HTMLElement | null;
      if (!nodeEl) return;

      const rect = nodeEl.getBoundingClientRect();
      const cx = e.clientX;
      const cy = e.clientY;

      // Distance from cursor to rect boundary (0 when cursor is inside node)
      const dx = Math.max(0, rect.left - cx, cx - rect.right);
      const dy = Math.max(0, rect.top - cy, cy - rect.bottom);
      const dist = Math.sqrt(dx * dx + dy * dy);

      const near = dist < PROXIMITY_PX;
      setIsNear(near);

      if (!near) {
        setNearestEdge(null);
        return;
      }

      // Edge detection: which boundary is the cursor closest to / exiting from?
      if (cx < rect.left) { setNearestEdge("left"); return; }
      if (cx > rect.right) { setNearestEdge("right"); return; }
      if (cy < rect.top) { setNearestEdge("top"); return; }
      if (cy > rect.bottom) { setNearestEdge("bottom"); return; }

      // Cursor is inside node — show handle on nearest wall
      const dLeft = cx - rect.left;
      const dRight = rect.right - cx;
      const dTop = cy - rect.top;
      const dBottom = rect.bottom - cy;
      const min = Math.min(dLeft, dRight, dTop, dBottom);
      if (min === dLeft) setNearestEdge("left");
      else if (min === dRight) setNearestEdge("right");
      else if (min === dTop) setNearestEdge("top");
      else setNearestEdge("bottom");
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, [nodeId]);

  // ── Dispatch handle-click event (used by handle-click-menu for "connect from here") ──
  const handleClick = useCallback(
    (side: EdgeSide, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const handleType = side === "left" || side === "top" ? "target" : "source";
      const position =
        side === "left" ? { x: rect.left, y: rect.top + rect.height / 2 }
        : side === "right" ? { x: rect.right, y: rect.top + rect.height / 2 }
        : side === "top" ? { x: rect.left + rect.width / 2, y: rect.top }
        : { x: rect.left + rect.width / 2, y: rect.bottom };
      window.dispatchEvent(
        new CustomEvent("atlas:handle-click", {
          detail: { nodeId, handleType, position },
        })
      );
    },
    [nodeId]
  );

  const isAltSource = altConnectMode && altConnectSource === nodeId;
  const isAltTarget = altConnectMode && altConnectSource !== null && altConnectSource !== nodeId;

  const dotColor = isInPresentation ? "#F0FE00" : "#525252";
  const dotBg = isInPresentation ? "#F0FE00" : "#1a1a1a";

  const dotStyle = (side: EdgeSide): React.CSSProperties => ({
    width: handleSize,
    height: handleSize,
    background: dotBg,
    border: `2px solid ${dotColor}`,
    borderRadius: "50%",
    // Show when: cursor is near AND this is the nearest edge
    opacity: isNear && nearestEdge === side ? 1 : 0,
    transition: "opacity 0.12s ease",
    zIndex: 10,
    cursor: "crosshair",
  });

  // ── Feature 2: Extreme zoom-out → ring instead of dots ──
  if (showRing) {
    return (
      <>
        <Handle
          type="target"
          position={Position.Left}
          style={{ opacity: 0, width: 1, height: 1, pointerEvents: isNear ? "all" : "none" }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ opacity: 0, width: 1, height: 1, pointerEvents: isNear ? "all" : "none" }}
        />
        {/* Ring indicator */}
        {(isNear || isAltSource || isAltTarget) && (
          <div
            className="absolute pointer-events-none"
            style={{
              inset: -4,
              border: `2px solid ${isAltSource ? "#F0FE00" : isAltTarget ? "#60a5fa" : dotColor}`,
              borderRadius: "inherit",
              opacity: isAltSource ? 1 : 0.65,
              boxShadow: isAltSource ? "0 0 0 4px rgba(240,254,0,0.15)" : "none",
              zIndex: 10,
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* ── Feature 7: Alt+click visual ring on source / highlight on targets ── */}
      {isAltSource && (
        <div
          className="absolute pointer-events-none"
          style={{
            inset: -5,
            border: "2px solid #F0FE00",
            borderRadius: "inherit",
            boxShadow: "0 0 0 4px rgba(240,254,0,0.15)",
            zIndex: 10,
          }}
        />
      )}
      {isAltTarget && (
        <div
          className="absolute pointer-events-none"
          style={{
            inset: -3,
            border: "2px solid #60a5fa",
            borderRadius: "inherit",
            opacity: 0.6,
            zIndex: 10,
          }}
        />
      )}

      {/* ── Feature 6: Ghost line previews when hovering a handle ── */}
      {hoveredHandle === "right" && isNear && (
        <div
          className="absolute pointer-events-none"
          style={{
            right: -(GHOST_LENGTH + Math.round(handleSize / 2) + 2),
            top: "50%",
            transform: "translateY(-50%)",
            width: GHOST_LENGTH,
            height: 2,
            background: `repeating-linear-gradient(to right, ${dotColor} 0, ${dotColor} 4px, transparent 4px, transparent 8px)`,
            opacity: 0.55,
            zIndex: 5,
          }}
        />
      )}
      {hoveredHandle === "left" && isNear && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: -(GHOST_LENGTH + Math.round(handleSize / 2) + 2),
            top: "50%",
            transform: "translateY(-50%)",
            width: GHOST_LENGTH,
            height: 2,
            background: `repeating-linear-gradient(to left, ${dotColor} 0, ${dotColor} 4px, transparent 4px, transparent 8px)`,
            opacity: 0.55,
            zIndex: 5,
          }}
        />
      )}
      {hoveredHandle === "top" && isNear && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: -(GHOST_LENGTH + Math.round(handleSize / 2) + 2),
            left: "50%",
            transform: "translateX(-50%)",
            width: 2,
            height: GHOST_LENGTH,
            background: `repeating-linear-gradient(to top, ${dotColor} 0, ${dotColor} 4px, transparent 4px, transparent 8px)`,
            opacity: 0.55,
            zIndex: 5,
          }}
        />
      )}
      {hoveredHandle === "bottom" && isNear && (
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: -(GHOST_LENGTH + Math.round(handleSize / 2) + 2),
            left: "50%",
            transform: "translateX(-50%)",
            width: 2,
            height: GHOST_LENGTH,
            background: `repeating-linear-gradient(to bottom, ${dotColor} 0, ${dotColor} 4px, transparent 4px, transparent 8px)`,
            opacity: 0.55,
            zIndex: 5,
          }}
        />
      )}

      {/* ── The 4 directional handles (left/right/top/bottom) ── */}
      <Handle
        type="target"
        position={Position.Left}
        style={dotStyle("left")}
        onMouseEnter={() => setHoveredHandle("left")}
        onMouseLeave={() => setHoveredHandle(null)}
        onClick={(e) => handleClick("left", e)}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={dotStyle("right")}
        onMouseEnter={() => setHoveredHandle("right")}
        onMouseLeave={() => setHoveredHandle(null)}
        onClick={(e) => handleClick("right", e)}
      />
      <Handle
        type="target"
        id="top-target"
        position={Position.Top}
        style={dotStyle("top")}
        onMouseEnter={() => setHoveredHandle("top")}
        onMouseLeave={() => setHoveredHandle(null)}
        onClick={(e) => handleClick("top", e)}
      />
      <Handle
        type="source"
        id="bottom-source"
        position={Position.Bottom}
        style={dotStyle("bottom")}
        onMouseEnter={() => setHoveredHandle("bottom")}
        onMouseLeave={() => setHoveredHandle(null)}
        onClick={(e) => handleClick("bottom", e)}
      />
    </>
  );
}
