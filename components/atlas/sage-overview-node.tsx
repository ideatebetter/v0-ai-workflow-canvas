"use client";

import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { 
  SageOverviewNodeData, 
  SageHealthStatus,
  SageProjectState,
  Decision,
  FeedbackRecord,
  ProjectIntent,
} from "@/lib/atlas-types";
import { HEALTH_STATUS_COLORS } from "@/lib/atlas-types";

// Extended node data to support Sage intelligence
interface SageHealthNodeData extends SageOverviewNodeData {
  // Sage state data
  healthStatus?: SageHealthStatus;
  driftScore?: number;
  driftDelta?: number;
  intent?: ProjectIntent | null;
  decisions?: Decision[];
  feedback?: FeedbackRecord[];
  unresolvedFeedbackCount?: number;
  conflictCount?: number;
}

// Layer view modes
type LayerView = "ambient" | "expanded" | "deep";

export function SageOverviewNode({ id, data, selected }: NodeProps) {
  const nodeData = data as SageHealthNodeData;
  const [viewLayer, setViewLayer] = useState<LayerView>("ambient");

  // Derive health status from drift score if not provided
  const driftScore = nodeData.driftScore ?? nodeData.alignmentScore ?? 85;
  const healthStatus: SageHealthStatus = nodeData.healthStatus ?? (
    driftScore >= 80 ? "healthy" :
    driftScore >= 60 ? "needs-attention" :
    driftScore >= 40 ? "at-risk" : "critical"
  );
  const healthColor = HEALTH_STATUS_COLORS[healthStatus];

  const getProgressColor = (value: number) => {
    if (value >= 75) return "#86efac";
    if (value >= 50) return "#fde047";
    return "#fca5a5";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Layer 1: Ambient - Minimal health indicator
  const renderAmbientLayer = () => (
    <div className="p-3 space-y-3">
      {/* Health Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: healthColor }}
          />
          <span className="text-xs text-gray-400 capitalize" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {healthStatus.replace("-", " ")}
          </span>
        </div>
        <span 
          className="text-sm font-semibold"
          style={{ color: healthColor, fontFamily: "system-ui, Inter, sans-serif" }}
        >
          {driftScore}%
        </span>
      </div>

      {/* Drift Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Alignment
          </span>
          {nodeData.driftDelta !== undefined && nodeData.driftDelta !== 0 && (
            <span 
              className="text-[10px] font-medium"
              style={{ 
                color: nodeData.driftDelta > 0 ? "#86efac" : "#fca5a5",
                fontFamily: "system-ui, Inter, sans-serif"
              }}
            >
              {nodeData.driftDelta > 0 ? "+" : ""}{nodeData.driftDelta}%
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${driftScore}%`, backgroundColor: healthColor }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
        {nodeData.unresolvedFeedbackCount !== undefined && nodeData.unresolvedFeedbackCount > 0 && (
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z"/>
              <path d="M8 5v3M8 10.5v.5"/>
            </svg>
            {nodeData.unresolvedFeedbackCount} open
          </span>
        )}
        {nodeData.conflictCount !== undefined && nodeData.conflictCount > 0 && (
          <span className="flex items-center gap-1 text-[#fca5a5]">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1L15 14H1L8 1z"/>
              <path d="M8 6v3M8 11.5v.5"/>
            </svg>
            {nodeData.conflictCount} conflicts
          </span>
        )}
      </div>

      {/* Expand Button */}
      <button
        onClick={() => setViewLayer("expanded")}
        className="w-full py-1.5 text-[10px] text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
      >
        View details
      </button>
    </div>
  );

  // Layer 2: Expanded - Key metrics and recent activity
  const renderExpandedLayer = () => (
    <div className="p-3 space-y-3">
      {/* Health Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: healthColor }}
          />
          <span className="text-xs font-medium text-white capitalize" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {healthStatus.replace("-", " ")}
          </span>
        </div>
        <span 
          className="text-lg font-bold"
          style={{ color: healthColor, fontFamily: "system-ui, Inter, sans-serif" }}
        >
          {driftScore}%
        </span>
      </div>

      {/* Intent Statement */}
      {nodeData.intent && (
        <div className="p-2 rounded-lg" style={{ backgroundColor: "#F0FE0010" }}>
          <div className="text-[10px] text-[#F0FE00] mb-1 font-medium" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Project Intent
          </div>
          <p className="text-xs text-gray-300 leading-relaxed line-clamp-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.intent.statement}
          </p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-[10px] text-gray-500 mb-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Unresolved
          </div>
          <div className="text-sm font-semibold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.unresolvedFeedbackCount ?? 0}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <div className="text-[10px] text-gray-500 mb-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Conflicts
          </div>
          <div 
            className="text-sm font-semibold"
            style={{ 
              color: (nodeData.conflictCount ?? 0) > 0 ? "#fca5a5" : "white",
              fontFamily: "system-ui, Inter, sans-serif"
            }}
          >
            {nodeData.conflictCount ?? 0}
          </div>
        </div>
      </div>

      {/* Last Decision */}
      {nodeData.decisions && nodeData.decisions.length > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: "#333333" }}>
          <div className="text-[10px] text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Last Decision
          </div>
          <p className="text-xs text-gray-400 line-clamp-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {nodeData.decisions[nodeData.decisions.length - 1].decision}
          </p>
          <div className="text-[10px] text-gray-600 mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {formatDate(nodeData.decisions[nodeData.decisions.length - 1].createdAt)}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setViewLayer("ambient")}
          className="flex-1 py-1.5 text-[10px] text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          Collapse
        </button>
        <button
          onClick={() => setViewLayer("deep")}
          className="flex-1 py-1.5 text-[10px] text-[#F0FE00] hover:bg-[#F0FE00]/10 rounded-lg transition-colors"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          Full details
        </button>
      </div>
    </div>
  );

  // Layer 3: Deep - Full history and details
  const renderDeepLayer = () => (
    <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setViewLayer("expanded")}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7.5 9L4.5 6L7.5 3"/>
          </svg>
          Back
        </button>
        <div 
          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: healthColor + "20", color: healthColor }}
        >
          {driftScore}% aligned
        </div>
      </div>

      {/* Intent History */}
      {nodeData.intent && (
        <div>
          <div className="text-[10px] text-[#F0FE00] font-medium mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Intent History
          </div>
          <div className="space-y-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "#F0FE0010", border: "1px solid #F0FE0030" }}>
              <p className="text-xs text-gray-300" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {nodeData.intent.statement}
              </p>
              <div className="text-[10px] text-gray-600 mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Current - {formatDate(nodeData.intent.updatedAt)}
              </div>
            </div>
            {nodeData.intent.revisionHistory?.slice(-2).reverse().map((rev, i) => (
              <div key={rev.id} className="p-2 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  {rev.statement}
                </p>
                <div className="text-[10px] text-gray-600 mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Revision {nodeData.intent!.revisionHistory.length - i} - {formatDate(rev.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Log */}
      {nodeData.decisions && nodeData.decisions.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-400 font-medium mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Decision Log ({nodeData.decisions.length})
          </div>
          <div className="space-y-2">
            {nodeData.decisions.slice(-3).reverse().map((decision) => (
              <div key={decision.id} className="p-2 rounded-lg bg-white/5">
                <p className="text-xs text-gray-300" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  {decision.decision}
                </p>
                <p className="text-[10px] text-gray-500 mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  {decision.rationale}
                </p>
                <div className="text-[10px] text-gray-600 mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  {formatDate(decision.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback with Conflicts */}
      {nodeData.feedback && nodeData.feedback.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-400 font-medium mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Recent Feedback ({nodeData.feedback.length})
          </div>
          <div className="space-y-2">
            {nodeData.feedback.slice(-3).reverse().map((fb) => (
              <div 
                key={fb.id} 
                className="p-2 rounded-lg"
                style={{ 
                  backgroundColor: fb.conflictFlag ? "#fca5a510" : "rgba(255,255,255,0.05)",
                  border: fb.conflictFlag ? "1px solid #fca5a530" : "none"
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                    style={{ 
                      backgroundColor: fb.conflictFlag ? "#fca5a520" : "#333",
                      color: fb.conflictFlag ? "#fca5a5" : "#888",
                      fontFamily: "system-ui, Inter, sans-serif"
                    }}
                  >
                    {fb.type}
                  </span>
                  {fb.conflictFlag && (
                    <span className="text-[9px] text-[#fca5a5]" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      Conflict
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 line-clamp-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  {fb.rawInput}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    {fb.reviewerRole}
                  </span>
                  <span 
                    className="text-[10px]"
                    style={{ 
                      color: fb.resolvedAt ? "#86efac" : "#fde047",
                      fontFamily: "system-ui, Inter, sans-serif"
                    }}
                  >
                    {fb.resolvedAt ? "Resolved" : "Open"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflict Map */}
      {nodeData.conflictCount !== undefined && nodeData.conflictCount > 0 && (
        <div className="p-2 rounded-lg" style={{ backgroundColor: "#fca5a510", border: "1px solid #fca5a530" }}>
          <div className="flex items-center gap-2 mb-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#fca5a5" strokeWidth="1.5">
              <path d="M8 1L15 14H1L8 1z"/>
              <path d="M8 6v3M8 11.5v.5"/>
            </svg>
            <span className="text-[10px] text-[#fca5a5] font-medium" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              {nodeData.conflictCount} Active Conflict{nodeData.conflictCount > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[10px] text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Review conflicting feedback to maintain alignment
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="group rounded-2xl transition-all duration-300 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1c1c1c 0%, #141414 100%)",
        border: selected ? "1.5px solid #F0FE00" : `1px solid ${healthColor}30`,
        width: viewLayer === "deep" ? 320 : 280,
        boxShadow: selected 
          ? `0 0 30px rgba(240, 254, 0, 0.15), 0 8px 32px rgba(0,0,0,0.4)` 
          : `0 0 20px ${healthColor}10, 0 8px 32px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ 
          background: `linear-gradient(180deg, ${healthColor}08 0%, transparent 100%)`,
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img 
              src="/sage-logo.svg" 
              alt="Sage" 
              className="w-7 h-7"
            />
            <div 
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
              style={{ 
                backgroundColor: healthColor,
                borderColor: "#141414",
              }}
            />
          </div>
          <div>
            <span className="text-sm font-semibold text-white tracking-tight" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Sage Health
            </span>
            <div className="text-[10px] capitalize" style={{ color: healthColor, fontFamily: "system-ui, Inter, sans-serif" }}>
              {healthStatus.replace("-", " ")}
            </div>
          </div>
        </div>
        <div 
          className="px-2.5 py-1 rounded-lg text-sm font-bold"
          style={{ 
            background: `linear-gradient(135deg, ${healthColor}20 0%, ${healthColor}08 100%)`,
            color: healthColor,
            fontFamily: "system-ui, Inter, sans-serif"
          }}
        >
          {driftScore}%
        </div>
      </div>

      {/* Render current layer */}
      {viewLayer === "ambient" && renderAmbientLayer()}
      {viewLayer === "expanded" && renderExpandedLayer()}
      {viewLayer === "deep" && renderDeepLayer()}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{ background: "#141414", border: `2px solid ${healthColor}`, width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{ background: "#141414", border: `2px solid ${healthColor}`, width: 10, height: 10 }}
      />
    </div>
  );
}
