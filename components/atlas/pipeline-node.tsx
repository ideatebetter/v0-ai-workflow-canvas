"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import { ComingSoonBadge } from "./coming-soon-badge";
import type { PipelineNodeData } from "@/lib/atlas-types";

export function PipelineNode({ id, data, selected }: NodeProps) {
  const nodeData = data as PipelineNodeData;
  
  const capacityColor = nodeData.capacityStatus === "available" ? "#22c55e" : nodeData.capacityStatus === "balanced" ? "#3b82f6" : "#ef4444";
  const loadPercentage = nodeData.currentCapacity > 0 ? Math.round((nodeData.projectedLoad / nodeData.currentCapacity) * 100) : 0;

  return (
    <div
      className="group rounded-xl transition-all duration-200"
      style={{
        backgroundColor: "#1a1a1a",
        border: selected ? "2px solid #f59e0b" : "1px solid #f59e0b20",
        width: 280,
      }}
    >
      <ComingSoonBadge />
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b"
        style={{ borderColor: "#f59e0b20" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: "#f59e0b20" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 6-6" />
            </svg>
          </div>
          <span className="text-sm font-medium text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.label || "Pipeline Forecast"}
          </span>
        </div>
        <div 
          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: `${capacityColor}20`, color: capacityColor }}
        >
          {nodeData.capacityStatus}
        </div>
      </div>

      {/* Capacity Overview */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Capacity Load</span>
          <span className="text-xs font-medium" style={{ color: capacityColor }}>{loadPercentage}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(loadPercentage, 100)}%`, backgroundColor: capacityColor }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
          <span>{nodeData.projectedLoad}h needed</span>
          <span>{nodeData.currentCapacity}h available</span>
        </div>
      </div>

      {/* Forecast Breakdown */}
      <div className="p-3 space-y-2">
        {[
          { label: "30 Days", data: nodeData.forecast30Days },
          { label: "60 Days", data: nodeData.forecast60Days },
          { label: "90 Days", data: nodeData.forecast90Days },
        ].map(({ label, data: forecastData }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{forecastData?.length || 0} projects</span>
              <span className="text-xs font-medium text-white">
                {forecastData?.reduce((acc, p) => acc + p.estimatedHours, 0) || 0}h
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Top Prospects */}
      {nodeData.forecast30Days && nodeData.forecast30Days.length > 0 && (
        <div className="px-3 pb-3">
          <div className="pt-2 border-t border-white/10">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Top Prospects</div>
            {nodeData.forecast30Days.slice(0, 2).map((project, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-gray-300 truncate max-w-[140px]">{project.projectName}</span>
                <span className="text-gray-500">{project.probability}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SmartHandles nodeId={id} />
    </div>
  );
}
