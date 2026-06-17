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

// ─── type helpers ────────────────────────────────────────────────────────────

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
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Average Utilization</div>
            <div className="text-3xl font-bold" style={{ color: utilColor }}>{avgUtil}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Total Bench Time</div>
            <div className="text-2xl font-semibold text-green-400">{totalBench}h</div>
          </div>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${avgUtil}%`, backgroundColor: utilColor }} />
        </div>
      </div>

      {/* Team member rows */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider px-1">Team Members</div>
        {data.teamMembers?.map((tm, i) => {
          const col = tm.utilizationRate > 90 ? "#ef4444" : tm.utilizationRate > 75 ? "#f59e0b" : "#22c55e";
          return (
            <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ backgroundColor: tm.member?.color || "#525252", color: "#fff" }}>
                  {tm.member?.name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{tm.member?.name || "Team Member"}</div>
                  {tm.skills?.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {tm.skills.slice(0, 3).map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#2a2a2a", color: "#888" }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold" style={{ color: col }}>{tm.utilizationRate}%</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div>
                  <div className="text-gray-500">Current</div>
                  <div className="text-white font-medium">{tm.currentAllocation}%</div>
                </div>
                <div>
                  <div className="text-gray-500">Planned</div>
                  <div className="text-white font-medium">{tm.plannedAllocation}%</div>
                </div>
                <div>
                  <div className="text-gray-500">Bench</div>
                  <div className="text-green-400 font-medium">{tm.benchTime}h</div>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
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
    { label: "Project Margin", value: data.projectMargin, color: marginColor, suffix: "%" },
    { label: "Budget Consumed", value: data.budgetConsumed, color: data.budgetConsumed > 85 ? "#f59e0b" : "#3b82f6", suffix: "%" },
    { label: "Revenue Realized", value: data.revenueRealized, color: "#10b981", suffix: "%" },
    { label: "Blended Rate Efficiency", value: data.blendedRateEfficiency, color: "#8b5cf6", suffix: "%" },
    { label: "Util-Adjusted Margin", value: data.utilizationAdjustedMargin, color: "#ec4899", suffix: "%" },
  ];

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${statusColor}30` }}>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor }} />
        <div>
          <div className="text-white font-semibold capitalize">{data.status?.replace("-", " ")}</div>
          <div className="text-xs text-gray-500">Overall financial status</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-3xl font-bold" style={{ color: marginColor }}>{data.projectMargin}%</div>
          <div className="text-xs text-gray-500">margin</div>
        </div>
      </div>

      {/* Bar chart for each metric */}
      <div className="space-y-3">
        {metrics.map(m => (
          <div key={m.label} className="p-3 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{m.label}</span>
              <span className="text-sm font-semibold" style={{ color: m.color }}>{m.value}{m.suffix}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(m.value, 100)}%`, backgroundColor: m.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectHealthViz({ data }: { data: ProjectHealthNodeData }) {
  const statusColor = data.healthStatus === "on-track" ? "#22c55e" : data.healthStatus === "needs-attention" ? "#f59e0b" : "#ef4444";
  const touchpointColor = data.daysSinceClientTouchpoint <= 3 ? "#22c55e" : data.daysSinceClientTouchpoint <= 7 ? "#f59e0b" : "#ef4444";
  const phases = ["discovery", "design", "development", "review", "delivery"];
  const phaseIdx = phases.indexOf(data.projectPhase);

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${statusColor}30` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Health Status</div>
            <div className="text-xl font-bold capitalize" style={{ color: statusColor }}>
              {data.healthStatus?.replace("-", " ")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Current Phase</div>
            <div className="text-white font-semibold capitalize">{data.projectPhase}</div>
          </div>
        </div>
        {/* Phase progress */}
        <div className="flex gap-1.5">
          {phases.map((p, i) => (
            <div key={p} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-2 rounded-full transition-all"
                style={{ background: i <= phaseIdx ? "linear-gradient(90deg,#8b5cf6,#a78bfa)" : "rgba(255,255,255,0.06)" }} />
              <span className="text-[9px] text-gray-500 capitalize">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${touchpointColor}30` }}>
          <div className="text-2xl font-bold" style={{ color: touchpointColor }}>{data.daysSinceClientTouchpoint}</div>
          <div className="text-[10px] text-gray-500 mt-1">Days since<br />client touchpoint</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div className="text-2xl font-bold text-white">{data.openFeedbackCycles}</div>
          <div className="text-[10px] text-gray-500 mt-1">Open feedback<br />cycles</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div className="text-2xl font-bold text-white">{data.revisionCount}</div>
          <div className="text-[10px] text-gray-500 mt-1">Total<br />revisions</div>
        </div>
      </div>

      {/* Recommendations based on data */}
      <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="text-xs text-gray-500 uppercase tracking-wider">Signal Summary</div>
        {data.daysSinceClientTouchpoint > 7 && (
          <div className="flex items-start gap-2 text-xs">
            <span style={{ color: "#ef4444" }}>●</span>
            <span className="text-gray-300">Client touchpoint overdue — last contact {data.daysSinceClientTouchpoint} days ago</span>
          </div>
        )}
        {data.openFeedbackCycles > 3 && (
          <div className="flex items-start gap-2 text-xs">
            <span style={{ color: "#f59e0b" }}>●</span>
            <span className="text-gray-300">{data.openFeedbackCycles} open feedback cycles — review cadence may need attention</span>
          </div>
        )}
        {data.revisionCount > 5 && (
          <div className="flex items-start gap-2 text-xs">
            <span style={{ color: "#f59e0b" }}>●</span>
            <span className="text-gray-300">High revision count ({data.revisionCount}) — consider a direction alignment session</span>
          </div>
        )}
        {data.healthStatus === "on-track" && data.daysSinceClientTouchpoint <= 7 && data.openFeedbackCycles <= 2 && (
          <div className="flex items-start gap-2 text-xs">
            <span style={{ color: "#22c55e" }}>●</span>
            <span className="text-gray-300">Project is running smoothly</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineViz({ data }: { data: PipelineNodeData }) {
  const capColor = data.capacityStatus === "available" ? "#22c55e" : data.capacityStatus === "balanced" ? "#3b82f6" : "#ef4444";
  const loadPct = data.currentCapacity > 0 ? Math.round((data.projectedLoad / data.currentCapacity) * 100) : 0;

  const forecasts = [
    { label: "Next 30 Days", data: data.forecast30Days, color: "#22c55e" },
    { label: "Next 60 Days", data: data.forecast60Days, color: "#3b82f6" },
    { label: "Next 90 Days", data: data.forecast90Days, color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-4">
      {/* Capacity load */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${capColor}30` }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Capacity Load</div>
            <div className="text-3xl font-bold" style={{ color: capColor }}>{loadPct}%</div>
          </div>
          <div className="text-right">
            <div className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
              style={{ backgroundColor: `${capColor}20`, color: capColor }}>
              {data.capacityStatus}
            </div>
          </div>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(loadPct, 100)}%`, backgroundColor: capColor }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{data.projectedLoad}h projected load</span>
          <span>{data.currentCapacity}h capacity</span>
        </div>
      </div>

      {/* Forecast breakdown */}
      {forecasts.map(({ label, data: fd, color }) => fd && fd.length > 0 && (
        <div key={label} className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
          <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: "#1a1a1a", borderBottom: "1px solid #2a2a2a" }}>
            <span className="text-xs font-semibold" style={{ color }}>{label}</span>
            <span className="text-xs text-gray-500">
              {fd.length} projects · {fd.reduce((a, p) => a + p.estimatedHours, 0)}h
            </span>
          </div>
          <div className="divide-y" style={{ backgroundColor: "#111", borderColor: "#2a2a2a" }}>
            {fd.map((p, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-gray-300 truncate max-w-[200px]">{p.projectName}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-500">{p.estimatedHours}h</span>
                  <div className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: p.probability >= 70 ? "#22c55e20" : "#f59e0b20",
                      color: p.probability >= 70 ? "#22c55e" : "#f59e0b" }}>
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
  const trendIcon = data.trendDirection === "improving" ? "↑" : data.trendDirection === "stable" ? "→" : "↓";

  const metrics = [
    {
      label: "Feedback Loop Velocity",
      value: `${data.feedbackLoopVelocity}h`,
      sublabel: "Avg hours to resolve feedback",
      color: data.feedbackLoopVelocity <= 24 ? "#22c55e" : data.feedbackLoopVelocity <= 48 ? "#f59e0b" : "#ef4444",
      pct: Math.max(0, 100 - (data.feedbackLoopVelocity / 96) * 100),
    },
    {
      label: "Revision to Approval Ratio",
      value: `${data.revisionToApprovalRatio}x`,
      sublabel: "Revisions per approved deliverable",
      color: data.revisionToApprovalRatio <= 2 ? "#22c55e" : data.revisionToApprovalRatio <= 4 ? "#f59e0b" : "#ef4444",
      pct: Math.max(0, 100 - ((data.revisionToApprovalRatio - 1) / 6) * 100),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Trend + time saved */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${trendColor}30` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 mb-1">Overall Trend</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" style={{ color: trendColor }}>{trendIcon}</span>
              <span className="text-lg font-semibold capitalize" style={{ color: trendColor }}>{data.trendDirection}</span>
            </div>
          </div>
          <div className="text-right p-3 rounded-xl" style={{ backgroundColor: "#22c55e10", border: "1px solid #22c55e20" }}>
            <div className="text-3xl font-bold text-green-400">{data.timeSavedHours}h</div>
            <div className="text-xs text-gray-500 mt-1">saved by Ideate</div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {metrics.map(m => (
        <div key={m.label} className="p-4 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-300">{m.label}</span>
            <span className="text-xl font-bold" style={{ color: m.color }}>{m.value}</span>
          </div>
          <div className="text-xs text-gray-500 mb-3">{m.sublabel}</div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── chat section ─────────────────────────────────────────────────────────────

function DataChat({ nodeType, nodeData, nodeId }: { nodeType: DataNodeType; nodeData: Record<string, unknown>; nodeId: string }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/sage",
        fetch: async (url, options) => {
          const body = JSON.parse((options as RequestInit).body as string || "{}");
          body.context = {
            ...body.context,
            connectedNodes: [{ type: nodeType, data: nodeData }],
            dataPanel: true,
          };
          return fetch(url, { ...(options as RequestInit), body: JSON.stringify(body) });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeId]
  );

  const { messages, sendMessage, status } = useChat({
    id: `data-panel-${nodeId}`,
    transport,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || status === "streaming") return;
    setInput("");
    sendMessage({ text });
  };

  const isStreaming = status === "streaming";
  const font = { fontFamily: "system-ui, Inter, sans-serif" };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#F0FE00" }}>
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L8.5 4.5L12 5L9.5 7.5L10 11L7 9.5L4 11L4.5 7.5L2 5L5.5 4.5L7 1Z"
                  stroke="#121212" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white" style={font}>Ask Sage about this data</p>
              <p className="text-xs text-gray-500 mt-1" style={font}>
                e.g. "What's the biggest risk here?" or "How can we improve this?"
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
                <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "#F0FE00" }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L8.5 4.5L12 5L9.5 7.5L10 11L7 9.5L4 11L4.5 7.5L2 5L5.5 4.5L7 1Z"
                      stroke="#121212" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div
                className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  backgroundColor: isUser ? "#ffffff" : "#1a1a1a",
                  color: isUser ? "#000" : "#e5e5e5",
                  border: isUser ? "none" : "1px solid #2a2a2a",
                  ...font,
                }}
              >
                {text}
              </div>
            </div>
          );
        })}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
              style={{ backgroundColor: "#F0FE00" }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L8.5 4.5L12 5L9.5 7.5L10 11L7 9.5L4 11L4.5 7.5L2 5L5.5 4.5L7 1Z"
                  stroke="#121212" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: "#F0FE00", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask Sage about this data…"
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            style={font}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              backgroundColor: input.trim() && !isStreaming ? "#F0FE00" : "#2a2a2a",
              color: input.trim() && !isStreaming ? "#000" : "#555",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main panel ───────────────────────────────────────────────────────────────

interface DataDetailPanelProps {
  nodeId: string;
  nodeType: DataNodeType;
  nodeData: Record<string, unknown>;
  onClose: () => void;
}

export function DataDetailPanel({ nodeId, nodeType, nodeData, onClose }: DataDetailPanelProps) {
  const meta = TYPE_META[nodeType];
  const font = { fontFamily: "system-ui, Inter, sans-serif" };
  const label = (nodeData.label as string) || meta.label;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: 480,
          backgroundColor: "#0f0f0f",
          borderLeft: "1px solid #2a2a2a",
          boxShadow: "-16px 0 48px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${meta.accent}20` }}>
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate" style={font}>{label}</div>
            <div className="text-xs mt-0.5" style={{ color: meta.accent, ...font }}>{meta.label}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "#666" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Data visualization — scrollable upper section */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0" style={{ maxHeight: "55%" }}>
          {nodeType === "capacity" && <CapacityViz data={nodeData as unknown as CapacityNodeData} />}
          {nodeType === "financial" && <FinancialViz data={nodeData as unknown as FinancialNodeData} />}
          {nodeType === "projectHealth" && <ProjectHealthViz data={nodeData as unknown as ProjectHealthNodeData} />}
          {nodeType === "pipeline" && <PipelineViz data={nodeData as unknown as PipelineNodeData} />}
          {nodeType === "teamHealth" && <TeamHealthViz data={nodeData as unknown as TeamHealthNodeData} />}
        </div>

        {/* Divider with label */}
        <div className="flex items-center gap-3 px-5 py-2 flex-shrink-0"
          style={{ borderTop: "1px solid #2a2a2a", borderBottom: "1px solid #2a2a2a", backgroundColor: "#111" }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#F0FE00" }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.5 4.5L12 5L9.5 7.5L10 11L7 9.5L4 11L4.5 7.5L2 5L5.5 4.5L7 1Z"
                stroke="#121212" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-white" style={font}>Sage</span>
          <span className="text-xs text-gray-500" style={font}>Ask questions about this data</span>
        </div>

        {/* Chat — lower section */}
        <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: "0" }}>
          <DataChat nodeType={nodeType} nodeData={nodeData as Record<string, unknown>} nodeId={nodeId} />
        </div>
      </div>
    </>
  );
}
