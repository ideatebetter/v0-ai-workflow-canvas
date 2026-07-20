"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { CapacityNodeData } from "@/lib/atlas-types";

const BLUE  = "#3b82f6";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED   = "#ef4444";

export function CapacityNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as CapacityNodeData;
  const members       = d.teamMembers ?? [];
  const avgUtil       = members.length
    ? Math.round(members.reduce((a, m) => a + m.utilizationRate, 0) / members.length)
    : 0;
  const totalBench    = members.reduce((a, m) => a + m.benchTime, 0);
  const criticalCount = members.filter(m => m.overloadRisk === "critical").length;
  const warningCount  = members.filter(m => m.overloadRisk === "warning").length;

  const utilColor   = avgUtil > 90 ? RED : avgUtil > 80 ? AMBER : GREEN;
  const statusColor = criticalCount > 0 ? RED : warningCount > 0 ? AMBER : GREEN;
  const statusLabel = criticalCount > 0 ? `${criticalCount} overloaded` : warningCount > 0 ? `${warningCount} at risk` : "balanced";

  const FONT = { fontFamily: "system-ui, Inter, sans-serif" };

  return (
    <div
      style={{
        width: 220,
        backgroundColor: "#111",
        borderRadius: 14,
        border: selected ? `2px solid ${BLUE}` : `1px solid ${BLUE}22`,
        overflow: "hidden",
        ...FONT,
      }}
    >
      <SmartHandles nodeId={id} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${BLUE}18` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: `${BLUE}18` }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-gray-400 truncate">{d.label || "Capacity"}</span>
        </div>
        <span className="text-[9px] font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
      </div>

      {/* Hero utilization */}
      <div className="px-4 pt-4 pb-2">
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, letterSpacing: -4, color: utilColor }}>
          {avgUtil}<span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>%</span>
        </div>
        <div className="text-[9px] uppercase tracking-widest mt-1" style={{ color: "#555" }}>avg utilization</div>
      </div>

      {/* Member bars */}
      <div className="px-3 pb-2 space-y-1.5" style={{ borderTop: "1px solid #1e1e1e", paddingTop: 8 }}>
        {members.slice(0, 3).map((tm, i) => {
          const col = tm.utilizationRate > 90 ? RED : tm.utilizationRate > 80 ? AMBER : GREEN;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0"
                style={{ backgroundColor: tm.member?.color || "#333", color: "#fff" }}>
                {tm.member?.name?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff0a" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(tm.utilizationRate, 100)}%`, backgroundColor: col }} />
              </div>
              <span className="text-[9px] w-7 text-right flex-shrink-0 font-medium" style={{ color: col }}>
                {tm.utilizationRate}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Bench + team count */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: "1px solid #1e1e1e" }}>
        <span className="text-[9px] text-gray-600">{members.length} people</span>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: totalBench > 0 ? GREEN : "#333" }} />
          <span className="text-[9px]" style={{ color: totalBench > 0 ? GREEN : "#555" }}>{totalBench}h bench</span>
        </div>
      </div>
    </div>
  );
}
