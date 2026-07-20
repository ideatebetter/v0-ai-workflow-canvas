"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { PipelineNodeData } from "@/lib/atlas-types";

const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const RED   = "#ef4444";
const BLUE  = "#3b82f6";

export function PipelineNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as PipelineNodeData;
  const loadPct  = d.currentCapacity > 0 ? Math.round((d.projectedLoad / d.currentCapacity) * 100) : 0;
  const capColor = d.capacityStatus === "available" ? GREEN : d.capacityStatus === "balanced" ? BLUE : RED;

  const forecasts = [
    { label: "30d", items: d.forecast30Days ?? [],  color: GREEN },
    { label: "60d", items: d.forecast60Days ?? [],  color: BLUE  },
    { label: "90d", items: d.forecast90Days ?? [],  color: AMBER },
  ];

  const FONT = { fontFamily: "system-ui, Inter, sans-serif" };

  return (
    <div
      style={{
        width: 220,
        backgroundColor: "var(--app-bg-elevated)",
        borderRadius: 14,
        border: selected ? `2px solid ${AMBER}` : `1px solid ${AMBER}22`,
        overflow: "hidden",
        ...FONT,
      }}
    >
      <SmartHandles nodeId={id} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${AMBER}18` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: `${AMBER}18` }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2.2">
              <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 6-6" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-gray-400 truncate">{d.label || "Pipeline Forecast"}</span>
        </div>
        <span className="text-[9px] font-semibold capitalize" style={{ color: capColor }}>{d.capacityStatus}</span>
      </div>

      {/* Hero load % */}
      <div className="px-4 pt-4 pb-2">
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, letterSpacing: -4, color: capColor }}>
          {loadPct}<span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>%</span>
        </div>
        <div className="text-[9px] uppercase tracking-widest mt-1" style={{ color: "var(--app-text-faint)" }}>capacity load</div>
      </div>

      {/* Load bar */}
      <div className="px-3 pb-2" style={{ borderTop: "1px solid var(--app-card-elevated)", paddingTop: 8 }}>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--app-text-primary)0a" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(loadPct, 100)}%`, backgroundColor: capColor }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-gray-600">{d.projectedLoad}h needed</span>
          <span className="text-[8px] text-gray-600">{d.currentCapacity}h avail</span>
        </div>
      </div>

      {/* Forecast rows */}
      <div className="px-3 pb-3 space-y-1" style={{ borderTop: "1px solid var(--app-card-elevated)", paddingTop: 8 }}>
        {forecasts.map(({ label, items, color }) => {
          const hrs = items.reduce((s, p) => s + p.estimatedHours, 0);
          return (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[9px] font-semibold w-7" style={{ color }}>{label}</span>
              <span className="text-[9px] text-gray-600">{items.length} projects</span>
              <span className="text-sm font-bold" style={{ color }}>{hrs}h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
