"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import { ComingSoonBadge } from "./coming-soon-badge";
import type { ProjectHealthNodeData } from "@/lib/atlas-types";

export function ProjectHealthNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ProjectHealthNodeData;
  
  const statusColor = nodeData.healthStatus === "on-track" ? "#22c55e" : nodeData.healthStatus === "needs-attention" ? "#f59e0b" : "#ef4444";
  const touchpointColor = nodeData.daysSinceClientTouchpoint <= 3 ? "#22c55e" : nodeData.daysSinceClientTouchpoint <= 7 ? "#f59e0b" : "#ef4444";

  const phases = ["discovery", "design", "development", "review", "delivery"];
  const currentPhaseIndex = phases.indexOf(nodeData.projectPhase);

  return (
    <div
      className="group rounded-2xl transition-all duration-300 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1c1c1c 0%, #141414 100%)",
        border: selected ? "1.5px solid #8b5cf6" : "1px solid rgba(139, 92, 246, 0.15)",
        width: 280,
        boxShadow: selected
          ? "0 0 30px rgba(139, 92, 246, 0.2), 0 8px 32px rgba(0,0,0,0.4)"
          : "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <ComingSoonBadge />
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ 
          background: "linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.08) 100%)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.label || "Project Health"}
          </span>
        </div>
        <div 
          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
        >
          {nodeData.healthStatus?.replace("-", " ") || "unknown"}
        </div>
      </div>

      {/* Phase Progress */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-1.5 mb-2">
          {phases.map((phase, idx) => (
            <div 
              key={phase}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{ 
                background: idx <= currentPhaseIndex 
                  ? "linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)" 
                  : "rgba(255,255,255,0.06)"
              }}
            />
          ))}
        </div>
        <div className="text-xs text-gray-400 capitalize" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {nodeData.projectPhase} Phase
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 space-y-3">
        <div 
          className="flex items-center justify-between p-3 rounded-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Last Client Touchpoint</span>
          <span className="text-xs font-semibold" style={{ color: touchpointColor, fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.daysSinceClientTouchpoint} days ago
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="text-[10px] text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Open Feedback
            </div>
            <div className="text-lg font-bold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              {nodeData.openFeedbackCycles}
            </div>
          </div>
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="text-[10px] text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Revisions
            </div>
            <div className="text-lg font-bold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              {nodeData.revisionCount}
            </div>
          </div>
        </div>
      </div>

      <SmartHandles nodeId={id} />
    </div>
  );
}
