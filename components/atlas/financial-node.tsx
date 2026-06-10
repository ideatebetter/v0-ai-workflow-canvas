"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { FinancialNodeData } from "@/lib/atlas-types";

export function FinancialNode({ id, data, selected }: NodeProps) {
  const nodeData = data as FinancialNodeData;
  
  const statusColor = nodeData.status === "healthy" ? "#22c55e" : nodeData.status === "at-risk" ? "#f59e0b" : "#ef4444";
  const marginColor = nodeData.projectMargin >= 30 ? "#22c55e" : nodeData.projectMargin >= 15 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="group rounded-xl transition-all duration-200"
      style={{
        backgroundColor: "#1a1a1a",
        border: selected ? "2px solid #10b981" : "1px solid #10b98120",
        width: 260,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b"
        style={{ borderColor: "#10b98120" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: "#10b98120" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="text-sm font-medium text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.label || "Financial Performance"}
          </span>
        </div>
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
      </div>

      {/* Metrics */}
      <div className="p-3 space-y-3">
        {/* Project Margin */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Project Margin</span>
            <span className="text-sm font-medium" style={{ color: marginColor }}>{nodeData.projectMargin}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(nodeData.projectMargin, 100)}%`, backgroundColor: marginColor }}
            />
          </div>
        </div>

        {/* Budget vs Revenue */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-[10px] text-gray-500 uppercase">Budget Used</div>
            <div className="text-sm font-medium text-white">{nodeData.budgetConsumed}%</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-[10px] text-gray-500 uppercase">Revenue</div>
            <div className="text-sm font-medium text-white">{nodeData.revenueRealized}%</div>
          </div>
        </div>

        {/* Efficiency Metrics */}
        <div className="pt-2 border-t border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Blended Rate Efficiency</span>
            <span className="text-gray-300">{nodeData.blendedRateEfficiency}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Util-Adjusted Margin</span>
            <span className="text-gray-300">{nodeData.utilizationAdjustedMargin}%</span>
          </div>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0 group-hover:opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #10b981", width: 20, height: 20 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0 group-hover:opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #10b981", width: 20, height: 20 }}
      />
    </div>
  );
}
