"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StakeholderNodeData } from "@/lib/atlas-types";

const COMPREHENSION_CONFIG = {
  low: { label: "Low", color: "#ef4444", bg: "#ef444420" },
  medium: { label: "Medium", color: "#eab308", bg: "#eab30820" },
  high: { label: "High", color: "#22c55e", bg: "#22c55e20" },
};

const ALIGNMENT_CONFIG = {
  aligned: { label: "Aligned", color: "#22c55e", bg: "#22c55e20" },
  "needs-attention": { label: "Needs Attention", color: "#eab308", bg: "#eab30820" },
  misaligned: { label: "Misaligned", color: "#ef4444", bg: "#ef444420" },
};

export function StakeholderNode({ id, data, selected }: NodeProps) {
  const nodeData = data as StakeholderNodeData;
  const comprehension = COMPREHENSION_CONFIG[nodeData.comprehensionLevel] || COMPREHENSION_CONFIG.medium;
  const alignment = ALIGNMENT_CONFIG[nodeData.alignmentStatus] || ALIGNMENT_CONFIG.aligned;

  return (
    <div
      className="group rounded-xl transition-all duration-200"
      style={{
        backgroundColor: "#1a1a1a",
        border: selected ? "2px solid #F0FE00" : "1px solid #F0FE0030",
        width: 240,
      }}
    >
      {/* Header with Avatar */}
      <div
        className="px-3 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: "#F0FE0020" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
          style={{ backgroundColor: "#F0FE0030", color: "#F0FE00", fontFamily: "system-ui, Inter, sans-serif" }}
        >
          {nodeData.stakeholder?.initials || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.stakeholder?.name || "Stakeholder"}
          </div>
          <div className="text-xs text-gray-500 truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.stakeholder?.role || "Team Member"}
          </div>
        </div>
      </div>

      {/* Status Pills */}
      <div className="px-3 py-2 flex gap-2">
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: comprehension.bg, color: comprehension.color, fontFamily: "system-ui, Inter, sans-serif" }}
        >
          {comprehension.label} Comprehension
        </div>
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: alignment.bg, color: alignment.color, fontFamily: "system-ui, Inter, sans-serif" }}
        >
          {alignment.label}
        </div>
      </div>

      {/* Notes */}
      {nodeData.notes && (
        <div className="px-3 pb-2">
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.notes}
          </p>
        </div>
      )}

      {/* Key Insights */}
      {nodeData.keyInsights && nodeData.keyInsights.length > 0 && (
        <div className="px-3 pb-2">
          <div className="text-[10px] text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Key Insights
          </div>
          <div className="space-y-1">
            {nodeData.keyInsights.slice(0, 2).map((insight, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full mt-1.5" style={{ backgroundColor: "#F0FE00" }} />
                <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  {insight.length > 50 ? insight.slice(0, 50) + "..." : insight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Interaction */}
      <div className="px-3 py-2 border-t" style={{ borderColor: "#F0FE0020" }}>
        <div className="text-[10px] text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          Last interaction: {nodeData.lastInteraction || "Not yet"}
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #F0FE00", width: 20, height: 20 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #F0FE00", width: 20, height: 20 }}
      />
    </div>
  );
}
