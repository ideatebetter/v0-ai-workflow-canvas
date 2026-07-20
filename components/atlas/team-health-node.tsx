"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { TeamHealthNodeData } from "@/lib/atlas-types";

const PINK  = "#ec4899";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED   = "#ef4444";

export function TeamHealthNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as TeamHealthNodeData;

  const trendColor = d.trendDirection === "improving" ? GREEN : d.trendDirection === "stable" ? "#3b82f6" : RED;
  const trendIcon  = d.trendDirection === "improving" ? "↑" : d.trendDirection === "stable" ? "→" : "↓";

  const fbColor  = d.feedbackLoopVelocity <= 24 ? GREEN : d.feedbackLoopVelocity <= 48 ? AMBER : RED;
  const rvColor  = d.revisionToApprovalRatio <= 2 ? GREEN : d.revisionToApprovalRatio <= 4 ? AMBER : RED;

  const FONT = { fontFamily: "system-ui, Inter, sans-serif" };

  return (
    <div
      style={{
        width: 220,
        backgroundColor: "var(--app-bg-elevated)",
        borderRadius: 14,
        border: selected ? `2px solid ${PINK}` : `1px solid ${PINK}22`,
        overflow: "hidden",
        ...FONT,
      }}
    >
      <SmartHandles nodeId={id} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${PINK}18` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: `${PINK}18` }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-gray-400 truncate">{d.label || "Team Health"}</span>
        </div>
        <span className="text-[9px] font-semibold" style={{ color: trendColor }}>{trendIcon} {d.trendDirection}</span>
      </div>

      {/* Hero number */}
      <div className="px-4 pt-4 pb-2">
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: fbColor }}>
          {d.feedbackLoopVelocity}<span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>h</span>
        </div>
        <div className="text-[9px] uppercase tracking-widest mt-1" style={{ color: "var(--app-text-faint)" }}>feedback loop avg</div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 px-3 pb-3 pt-2 gap-1.5" style={{ borderTop: `1px solid var(--app-card-elevated)` }}>
        <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          <div className="text-[8px] uppercase tracking-wide text-gray-600 mb-0.5">Revision ratio</div>
          <div className="text-xl font-bold leading-none" style={{ color: rvColor }}>
            {d.revisionToApprovalRatio}<span className="text-sm font-semibold">×</span>
          </div>
        </div>
        <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          <div className="text-[8px] uppercase tracking-wide text-gray-600 mb-0.5">Ideate saved</div>
          <div className="text-xl font-bold leading-none" style={{ color: GREEN }}>
            {d.timeSavedHours}<span className="text-sm font-semibold">h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
