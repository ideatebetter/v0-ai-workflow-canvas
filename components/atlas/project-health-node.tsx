"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { ProjectHealthNodeData } from "@/lib/atlas-types";

const PURPLE = "#8b5cf6";
const GREEN  = "#22c55e";
const AMBER  = "#f59e0b";
const RED    = "#ef4444";

const PHASES = ["discovery", "concepting", "production", "delivery"];

export function ProjectHealthNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ProjectHealthNodeData;

  const touchColor   = d.daysSinceClientTouchpoint <= 7 ? GREEN : d.daysSinceClientTouchpoint <= 14 ? AMBER : RED;
  const stalledCount = d.feedbackCycles?.filter(c => c.status === "stalled").length ?? 0;
  const feedbackColor = d.openFeedbackCycles === 0 ? GREEN : stalledCount > 0 ? RED : AMBER;
  const revAbove     = Math.max(0, d.revisionCount - (d.expectedRevisionMax ?? 3));
  const revColor     = revAbove === 0 ? GREEN : revAbove === 1 ? AMBER : RED;
  const statusColor  = d.healthStatus === "on-track" ? GREEN : d.healthStatus === "needs-attention" ? AMBER : RED;
  const phaseIdx     = PHASES.indexOf(d.projectPhase ?? "");

  const FONT = { fontFamily: "system-ui, Inter, sans-serif" };

  return (
    <div
      style={{
        width: 220,
        backgroundColor: "var(--app-bg-elevated)",
        borderRadius: 14,
        border: selected ? `2px solid ${PURPLE}` : `1px solid ${PURPLE}22`,
        overflow: "hidden",
        ...FONT,
      }}
    >
      <SmartHandles nodeId={id} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${PURPLE}18` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: `${PURPLE}18` }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2.2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-gray-400 truncate">{d.label || "Project Health"}</span>
        </div>
        <span className="text-[9px] font-semibold capitalize" style={{ color: statusColor }}>
          {(d.healthStatus ?? "on-track").replace("-", " ")}
        </span>
      </div>

      {/* Hero: touchpoint days */}
      <div className="px-4 pt-4 pb-2">
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, letterSpacing: -4, color: touchColor }}>
          {d.daysSinceClientTouchpoint}<span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>d</span>
        </div>
        <div className="text-[9px] uppercase tracking-widest mt-1" style={{ color: "var(--app-text-faint)" }}>since last touchpoint</div>
      </div>

      {/* Phase bar */}
      <div className="px-3 pb-2" style={{ borderTop: "1px solid var(--app-card-elevated)", paddingTop: 8 }}>
        <div className="flex gap-0.5 mb-1">
          {PHASES.map((p, i) => (
            <div key={p} className="flex-1 h-1 rounded-full"
              style={{ backgroundColor: i <= phaseIdx ? PURPLE : "var(--app-text-primary)0a" }} />
          ))}
        </div>
        <span className="text-[9px] capitalize" style={{ color: "var(--app-text-faint)" }}>
          {d.projectPhase ?? "discovery"} phase
        </span>
      </div>

      {/* Feedback + Revisions */}
      <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
        <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          <div className="text-[8px] uppercase tracking-wide text-gray-600 mb-0.5">Feedback</div>
          <div className="text-xl font-bold leading-none" style={{ color: feedbackColor }}>
            {d.openFeedbackCycles}
            {stalledCount > 0 && (
              <span className="text-[8px] font-semibold ml-1" style={{ color: RED }}>{stalledCount} stalled</span>
            )}
          </div>
        </div>
        <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          <div className="text-[8px] uppercase tracking-wide text-gray-600 mb-0.5">Revisions</div>
          <div className="text-xl font-bold leading-none" style={{ color: revColor }}>
            {d.revisionCount}
            <span className="text-[8px] font-normal text-gray-600 ml-0.5">
              / {d.expectedRevisionMax ?? 3}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
