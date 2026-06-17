"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type {
  CapacityNodeData,
  FinancialNodeData,
  ProjectHealthNodeData,
  PipelineNodeData,
  TeamHealthNodeData,
} from "@/lib/atlas-types";

type DataNodeType = "capacity" | "financial" | "projectHealth" | "pipeline" | "teamHealth";

const TYPE_META: Record<DataNodeType, { label: string; accent: string; icon: React.ReactNode }> = {
  capacity: {
    label: "Capacity & Resourcing",
    accent: "#3b82f6",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  financial: {
    label: "Financial Performance",
    accent: "#10b981",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  projectHealth: {
    label: "Project Health",
    accent: "#8b5cf6",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  pipeline: {
    label: "Pipeline Forecast",
    accent: "#f59e0b",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
        <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 6-6" />
      </svg>
    ),
  },
  teamHealth: {
    label: "Team Health",
    accent: "#ec4899",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
};

// ─── visualizations ──────────────────────────────────────────────────────────

function CapacityViz({ data }: { data: CapacityNodeData }) {
  const avgUtil = data.teamMembers?.length
    ? Math.round(data.teamMembers.reduce((a, m) => a + m.utilizationRate, 0) / data.teamMembers.length)
    : 0;
  const totalBench = data.teamMembers?.reduce((a, m) => a + m.benchTime, 0) ?? 0;
  const utilColor = avgUtil > 90 ? "#ef4444" : avgUtil > 75 ? "#f59e0b" : "#22c55e";

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Avg Utilization</div>
            <div className="text-3xl font-bold" style={{ color: utilColor }}>{avgUtil}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Bench Time</div>
            <div className="text-2xl font-semibold text-green-400">{totalBench}h</div>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${avgUtil}%`, backgroundColor: utilColor }} />
        </div>
      </div>
      <div className="space-y-2">
        {data.teamMembers?.map((tm, i) => {
          const col = tm.utilizationRate > 90 ? "#ef4444" : tm.utilizationRate > 75 ? "#f59e0b" : "#22c55e";
          return (
            <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: tm.member?.color || "#525252", color: "#fff" }}>
                  {tm.member?.name?.charAt(0) || "?"}
                </div>
                <span className="text-sm text-white flex-1 truncate">{tm.member?.name || "Team Member"}</span>
                <span className="text-sm font-semibold" style={{ color: col }}>{tm.utilizationRate}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] mb-2">
                <div><div className="text-gray-500">Current</div><div className="text-white">{tm.currentAllocation}%</div></div>
                <div><div className="text-gray-500">Planned</div><div className="text-white">{tm.plannedAllocation}%</div></div>
                <div><div className="text-gray-500">Bench</div><div className="text-green-400">{tm.benchTime}h</div></div>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${tm.utilizationRate}%`, backgroundColor: col }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinancialViz({ data }: { data: FinancialNodeData }) {
  const statusColor = data.status === "healthy" ? "#22c55e" : data.status === "at-risk" ? "#f59e0b" : "#ef4444";
  const marginColor = data.projectMargin >= 30 ? "#22c55e" : data.projectMargin >= 15 ? "#f59e0b" : "#ef4444";
  const metrics = [
    { label: "Project Margin", value: data.projectMargin, color: marginColor },
    { label: "Budget Consumed", value: data.budgetConsumed, color: data.budgetConsumed > 85 ? "#f59e0b" : "#3b82f6" },
    { label: "Revenue Realized", value: data.revenueRealized, color: "#10b981" },
    { label: "Blended Rate Efficiency", value: data.blendedRateEfficiency, color: "#8b5cf6" },
    { label: "Util-Adjusted Margin", value: data.utilizationAdjustedMargin, color: "#ec4899" },
  ];
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${statusColor}30` }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className="text-white font-semibold capitalize">{data.status?.replace("-", " ")}</span>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color: marginColor }}>{data.projectMargin}%</div>
          <div className="text-xs text-gray-500">margin</div>
        </div>
      </div>
      {metrics.map(m => (
        <div key={m.label} className="p-3 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">{m.label}</span>
            <span className="text-sm font-semibold" style={{ color: m.color }}>{m.value}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(m.value, 100)}%`, backgroundColor: m.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectHealthViz({ data }: { data: ProjectHealthNodeData }) {
  const statusColor = data.healthStatus === "on-track" ? "#22c55e" : data.healthStatus === "needs-attention" ? "#f59e0b" : "#ef4444";
  const touchColor = data.daysSinceClientTouchpoint <= 3 ? "#22c55e" : data.daysSinceClientTouchpoint <= 7 ? "#f59e0b" : "#ef4444";
  const phases = ["discovery", "design", "development", "review", "delivery"];
  const phaseIdx = phases.indexOf(data.projectPhase);
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${statusColor}30` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Health Status</div>
            <div className="text-xl font-bold capitalize" style={{ color: statusColor }}>{data.healthStatus?.replace("-", " ")}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Phase</div>
            <div className="text-white font-semibold capitalize">{data.projectPhase}</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {phases.map((p, i) => (
            <div key={p} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-1.5 rounded-full"
                style={{ background: i <= phaseIdx ? "linear-gradient(90deg,#8b5cf6,#a78bfa)" : "rgba(255,255,255,0.06)" }} />
              <span className="text-[9px] text-gray-500 capitalize">{p}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Days since touchpoint", value: data.daysSinceClientTouchpoint, color: touchColor, suffix: "d" },
          { label: "Open feedback cycles", value: data.openFeedbackCycles, color: "#fff", suffix: "" },
          { label: "Total revisions", value: data.revisionCount, color: "#fff", suffix: "" },
        ].map(m => (
          <div key={m.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}{m.suffix}</div>
            <div className="text-[10px] text-gray-500 mt-1">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Signals</div>
        {data.daysSinceClientTouchpoint > 7 && <Signal color="#ef4444" text={`Client touchpoint overdue — ${data.daysSinceClientTouchpoint} days ago`} />}
        {data.openFeedbackCycles > 3 && <Signal color="#f59e0b" text={`${data.openFeedbackCycles} open feedback cycles need attention`} />}
        {data.revisionCount > 5 && <Signal color="#f59e0b" text={`High revision count (${data.revisionCount}) — consider alignment session`} />}
        {data.healthStatus === "on-track" && data.daysSinceClientTouchpoint <= 7 && <Signal color="#22c55e" text="Project running smoothly" />}
      </div>
    </div>
  );
}

function Signal({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span style={{ color }}>●</span>
      <span className="text-gray-300">{text}</span>
    </div>
  );
}

function PipelineViz({ data }: { data: PipelineNodeData }) {
  const capColor = data.capacityStatus === "available" ? "#22c55e" : data.capacityStatus === "balanced" ? "#3b82f6" : "#ef4444";
  const loadPct = data.currentCapacity > 0 ? Math.round((data.projectedLoad / data.currentCapacity) * 100) : 0;
  const forecasts = [
    { label: "30 Days", items: data.forecast30Days, color: "#22c55e" },
    { label: "60 Days", items: data.forecast60Days, color: "#3b82f6" },
    { label: "90 Days", items: data.forecast90Days, color: "#8b5cf6" },
  ];
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${capColor}30` }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Capacity Load</div>
            <div className="text-3xl font-bold" style={{ color: capColor }}>{loadPct}%</div>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-semibold capitalize" style={{ backgroundColor: `${capColor}20`, color: capColor }}>
            {data.capacityStatus}
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden mb-2">
          <div className="h-full rounded-full" style={{ width: `${Math.min(loadPct, 100)}%`, backgroundColor: capColor }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{data.projectedLoad}h load</span><span>{data.currentCapacity}h capacity</span>
        </div>
      </div>
      {forecasts.map(({ label, items, color }) => items && items.length > 0 && (
        <div key={label} className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
          <div className="px-3 py-2 flex justify-between" style={{ backgroundColor: "#1a1a1a", borderBottom: "1px solid #2a2a2a" }}>
            <span className="text-xs font-semibold" style={{ color }}>{label}</span>
            <span className="text-xs text-gray-500">{items.length} projects · {items.reduce((a, p) => a + p.estimatedHours, 0)}h</span>
          </div>
          <div style={{ backgroundColor: "#111" }}>
            {items.map((p, i) => (
              <div key={i} className="px-3 py-2 flex items-center justify-between border-t" style={{ borderColor: "#1e1e1e" }}>
                <span className="text-sm text-gray-300 truncate max-w-[160px]">{p.projectName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{p.estimatedHours}h</span>
                  <div className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ backgroundColor: p.probability >= 70 ? "#22c55e20" : "#f59e0b20", color: p.probability >= 70 ? "#22c55e" : "#f59e0b" }}>
                    {p.probability}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamHealthViz({ data }: { data: TeamHealthNodeData }) {
  const trendColor = data.trendDirection === "improving" ? "#22c55e" : data.trendDirection === "stable" ? "#3b82f6" : "#ef4444";
  const metrics = [
    { label: "Feedback Loop Velocity", value: `${data.feedbackLoopVelocity}h avg`, sub: "Time to resolve feedback",
      color: data.feedbackLoopVelocity <= 24 ? "#22c55e" : data.feedbackLoopVelocity <= 48 ? "#f59e0b" : "#ef4444",
      pct: Math.max(0, 100 - (data.feedbackLoopVelocity / 96) * 100) },
    { label: "Revision to Approval", value: `${data.revisionToApprovalRatio}x`, sub: "Revisions per approved deliverable",
      color: data.revisionToApprovalRatio <= 2 ? "#22c55e" : data.revisionToApprovalRatio <= 4 ? "#f59e0b" : "#ef4444",
      pct: Math.max(0, 100 - ((data.revisionToApprovalRatio - 1) / 6) * 100) },
  ];
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${trendColor}30` }}>
        <div>
          <div className="text-xs text-gray-500 mb-1">Trend</div>
          <div className="text-xl font-bold capitalize" style={{ color: trendColor }}>
            {data.trendDirection === "improving" ? "↑" : data.trendDirection === "stable" ? "→" : "↓"} {data.trendDirection}
          </div>
        </div>
        <div className="text-right p-3 rounded-xl" style={{ backgroundColor: "#22c55e10", border: "1px solid #22c55e20" }}>
          <div className="text-3xl font-bold text-green-400">{data.timeSavedHours}h</div>
          <div className="text-xs text-gray-500">saved by Ideate</div>
        </div>
      </div>
      {metrics.map(m => (
        <div key={m.label} className="p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-300">{m.label}</span>
            <span className="text-xl font-bold" style={{ color: m.color }}>{m.value}</span>
          </div>
          <div className="text-xs text-gray-500 mb-3">{m.sub}</div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── sage icon ────────────────────────────────────────────────────────────────

function SageStar({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 1L8.5 4.5L12 5L9.5 7.5L10 11L7 9.5L4 11L4.5 7.5L2 5L5.5 4.5L7 1Z"
        stroke="#121212" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

// ─── embedded chat ────────────────────────────────────────────────────────────

function DataChat({ nodeType, nodeData, nodeId }: { nodeType: DataNodeType; nodeData: Record<string, unknown>; nodeId: string }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const font = { fontFamily: "system-ui, Inter, sans-serif" };

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/sage",
        fetch: async (url, options) => {
          const body = JSON.parse((options as RequestInit).body as string || "{}");
          body.context = { ...body.context, connectedNodes: [{ type: nodeType, data: nodeData }] };
          return fetch(url, { ...(options as RequestInit), body: JSON.stringify(body) });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeId]
  );

  const { messages, sendMessage, status } = useChat({ id: `data-panel-${nodeId}`, transport });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || status === "streaming") return;
    setInput("");
    sendMessage({ text });
  };

  const isStreaming = status === "streaming";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F0FE00" }}>
              <SageStar size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-white" style={font}>Ask Sage about this data</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]" style={font}>
                "What's the biggest risk?" · "How can we improve?"
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const text = msg.parts?.map((p: any) => ("text" in p ? p.text : "")).join("") || "";
          if (!text) return null;
          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5" style={{ backgroundColor: "#F0FE00" }}>
                  <SageStar size={10} />
                </div>
              )}
              <div className="max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{ backgroundColor: isUser ? "#ffffff" : "#1e1e1e", color: isUser ? "#000" : "#e5e5e5", border: isUser ? "none" : "1px solid #2a2a2a", ...font }}>
                {text}
              </div>
            </div>
          );
        })}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="w-5 h-5 rounded-full flex items-center justify-center mr-2 flex-shrink-0" style={{ backgroundColor: "#F0FE00" }}>
              <SageStar size={10} />
            </div>
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl" style={{ backgroundColor: "#1e1e1e", border: "1px solid #2a2a2a" }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#F0FE00", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 pb-3 pt-2" style={{ borderTop: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "#1e1e1e", border: "1px solid #2a2a2a" }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask Sage…"
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            style={font}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{ backgroundColor: input.trim() && !isStreaming ? "#F0FE00" : "#2a2a2a", color: input.trim() && !isStreaming ? "#000" : "#555" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main modal ───────────────────────────────────────────────────────────────

interface DataDetailPanelProps {
  nodeId: string;
  nodeType: DataNodeType;
  nodeData: Record<string, unknown>;
  onClose: () => void;
}

export function DataDetailPanel({ nodeId, nodeType, nodeData, onClose }: DataDetailPanelProps) {
  const meta = TYPE_META[nodeType];
  const label = (nodeData.label as string) || meta.label;
  const font = { fontFamily: "system-ui, Inter, sans-serif" };
  const [sageOpen, setSageOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Data viz modal — single column */}
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          backgroundColor: "#141414",
          border: "1px solid #2a2a2a",
          width: 540,
          maxWidth: "calc(100vw - 48px)",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.accent}20` }}>
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate" style={font}>{label}</div>
            <div className="text-xs" style={{ color: meta.accent, ...font }}>{meta.label}</div>
          </div>
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#888" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable visualization */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {nodeType === "capacity"      && <CapacityViz     data={nodeData as unknown as CapacityNodeData} />}
          {nodeType === "financial"     && <FinancialViz    data={nodeData as unknown as FinancialNodeData} />}
          {nodeType === "projectHealth" && <ProjectHealthViz data={nodeData as unknown as ProjectHealthNodeData} />}
          {nodeType === "pipeline"      && <PipelineViz     data={nodeData as unknown as PipelineNodeData} />}
          {nodeType === "teamHealth"    && <TeamHealthViz   data={nodeData as unknown as TeamHealthNodeData} />}
        </div>
      </div>

      {/* Sage side panel — slides in from the right */}
      <div
        className="absolute top-0 right-0 h-full flex flex-col"
        style={{
          width: 340,
          backgroundColor: "#141414",
          borderLeft: "1px solid #2a2a2a",
          transform: sageOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 10,
        }}
      >
        {/* Sage panel header */}
        <div className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F0FE00" }}>
            <SageStar size={13} />
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-sm" style={font}>Sage</div>
            <div className="text-xs text-gray-500" style={font}>Ask questions about this data</div>
          </div>
          {/* Collapse */}
          <button
            type="button"
            onClick={() => setSageOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#888" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <DataChat nodeType={nodeType} nodeData={nodeData as Record<string, unknown>} nodeId={nodeId} />
        </div>
      </div>

      {/* Ask Sage floating pill — visible when panel is closed */}
      <button
        type="button"
        onClick={() => setSageOpen(true)}
        className="absolute bottom-8 right-8 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl transition-all duration-200"
        style={{
          backgroundColor: "#F0FE00",
          color: "#121212",
          fontFamily: "system-ui, Inter, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          opacity: sageOpen ? 0 : 1,
          pointerEvents: sageOpen ? "none" : "auto",
          transform: sageOpen ? "scale(0.85)" : "scale(1)",
          transition: "opacity 0.2s, transform 0.2s",
        }}
      >
        <SageStar size={13} />
        Ask Sage
      </button>
    </div>
  );
}
