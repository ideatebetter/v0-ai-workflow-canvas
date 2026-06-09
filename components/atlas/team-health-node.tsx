"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { TeamHealthNodeData } from "@/lib/atlas-types";

export function TeamHealthNode({ id, data, selected }: NodeProps) {
  const nodeData = data as TeamHealthNodeData;
  
  const trendColor = nodeData.trendDirection === "improving" ? "#22c55e" : nodeData.trendDirection === "stable" ? "#3b82f6" : "#ef4444";
  const trendIcon = nodeData.trendDirection === "improving" ? "↑" : nodeData.trendDirection === "stable" ? "→" : "↓";

  return (
    <div
      className="group rounded-xl transition-all duration-200"
      style={{
        backgroundColor: "#1a1a1a",
        border: selected ? "2px solid #ec4899" : "1px solid #ec489920",
        width: 260,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b"
        style={{ borderColor: "#ec489920" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: "#ec489920" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span className="text-sm font-medium text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.label || "Team Health"}
          </span>
        </div>
        <div 
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: `${trendColor}20`, color: trendColor }}
        >
          <span>{trendIcon}</span>
          <span>{nodeData.trendDirection}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-3 space-y-3">
        {/* Feedback Loop Velocity */}
        <div className="bg-white/5 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Feedback Loop Velocity</span>
            <span className="text-sm font-medium text-white">{nodeData.feedbackLoopVelocity}h avg</span>
          </div>
          <div className="text-[10px] text-gray-500">Time to resolve feedback</div>
        </div>

        {/* Revision Ratio */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">Revision to Approval</div>
            <div className="text-[10px] text-gray-500">Ratio per deliverable</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-white">{nodeData.revisionToApprovalRatio}x</div>
          </div>
        </div>

        {/* Time Saved */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Time Saved by Ideate</div>
              <div className="text-[10px] text-gray-500">This period</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-green-400">{nodeData.timeSavedHours}h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0 group-hover:opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #ec4899", width: 20, height: 20 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0 group-hover:opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #ec4899", width: 20, height: 20 }}
      />
    </div>
  );
}
