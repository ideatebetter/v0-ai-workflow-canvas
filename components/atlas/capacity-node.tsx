"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { CapacityNodeData } from "@/lib/atlas-types";

export function CapacityNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CapacityNodeData;
  
  // Calculate average utilization
  const avgUtilization = nodeData.teamMembers?.length 
    ? Math.round(nodeData.teamMembers.reduce((acc, m) => acc + m.utilizationRate, 0) / nodeData.teamMembers.length)
    : 0;
  
  const utilizationColor = avgUtilization > 90 ? "#ef4444" : avgUtilization > 75 ? "#f59e0b" : "#22c55e";

  return (
    <div
      className="group rounded-xl transition-all duration-200"
      style={{
        backgroundColor: "#1a1a1a",
        border: selected ? "2px solid #3b82f6" : "1px solid #3b82f620",
        width: 280,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={{ borderColor: "#3b82f620" }}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ backgroundColor: "#3b82f620" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
        <span className="text-sm font-medium text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {nodeData.label || "Capacity & Resourcing"}
        </span>
      </div>

      {/* Utilization Overview */}
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Avg Utilization</span>
          <span className="text-sm font-medium" style={{ color: utilizationColor }}>{avgUtilization}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ width: `${avgUtilization}%`, backgroundColor: utilizationColor }}
          />
        </div>

        {/* Team Members */}
        <div className="space-y-2 max-h-[120px] overflow-y-auto">
          {nodeData.teamMembers?.slice(0, 4).map((tm, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                style={{ backgroundColor: tm.member?.color || "#525252", color: "#fff" }}
              >
                {tm.member?.name?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-300 truncate">{tm.member?.name || "Team Member"}</div>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${tm.utilizationRate}%`, 
                        backgroundColor: tm.utilizationRate > 90 ? "#ef4444" : tm.utilizationRate > 75 ? "#f59e0b" : "#22c55e" 
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{tm.utilizationRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bench Time */}
        {nodeData.teamMembers?.some(m => m.benchTime > 0) && (
          <div className="pt-2 border-t border-white/10">
            <div className="text-xs text-gray-400 mb-1">Available Capacity</div>
            <div className="text-sm text-green-400">
              {nodeData.teamMembers.reduce((acc, m) => acc + m.benchTime, 0)}h bench time
            </div>
          </div>
        )}
      </div>

      <SmartHandles nodeId={id} />
    </div>
  );
}
