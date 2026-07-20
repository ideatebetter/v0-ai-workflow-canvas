"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type {
  CapacityNodeData,
  CapacityTeamMember,
  FinancialNodeData,
  ProjectHealthNodeData,
  PipelineNodeData,
  TeamHealthNodeData,
} from "@/lib/atlas-types";
import { TeamCalendarModal } from "./team-calendar-modal";
import { PROJECTS, generateProjectNodeData, type ProjectId } from "@/lib/operational-data";

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

function CapacityViz({ data, nodeId }: { data: CapacityNodeData; nodeId: string }) {
  const members = data.teamMembers ?? [];
  const [calendarMember, setCalendarMember] = useState<CapacityTeamMember | null>(null);

  const avgUtil    = members.length ? Math.round(members.reduce((a, m) => a + m.utilizationRate, 0) / members.length) : 0;
  const totalBench = members.reduce((a, m) => a + m.benchTime, 0);
  const totalBill  = members.reduce((a, m) => a + (m.billableHours ?? 0), 0);
  const totalAvail = members.reduce((a, m) => a + (m.availableHours ?? 40), 0);
  const criticals  = members.filter(m => m.overloadRisk === "critical");
  const warnings   = members.filter(m => m.overloadRisk === "warning");

  const GREEN = "#22c55e", AMBER = "#f59e0b", RED = "#ef4444", BLUE = "#3b82f6";
  const utilColor = avgUtil > 90 ? RED : avgUtil > 80 ? AMBER : GREEN;
  const statusColor = criticals.length > 0 ? RED : warnings.length > 0 ? AMBER : GREEN;

  const CARD = { backgroundColor: "#1a1a1a", border: "1px solid #222" } as const;
  const SEC_HEAD = { borderBottom: "1px solid #222" } as const;

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Hero row ── */}
      <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
        <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#111", borderBottom: "1px solid #222" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            <span className="text-[10px] font-medium" style={{ color: statusColor }}>
              {criticals.length > 0 ? `${criticals.length} overloaded` : warnings.length > 0 ? `${warnings.length} at risk` : "Team balanced"}
            </span>
          </div>
          <span className="text-[9px] text-gray-600">{members.length} team members</span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-[#222]">
          {[
            { label: "Avg Util",   value: `${avgUtil}%`,       color: utilColor },
            { label: "Billable",   value: `${totalBill}h`,     color: "text-white" },
            { label: "Available",  value: `${totalAvail}h`,    color: "text-white" },
            { label: "Bench",      value: `${totalBench}h`,    color: totalBench > 0 ? GREEN : "#666" },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-3 py-3">
              <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-base font-bold" style={color.startsWith("#") ? { color } : undefined}>
                <span className={!color.startsWith("#") ? color : ""}>{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2-column body ── */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">

        {/* Left: Team member cards */}
        <div className="rounded-xl overflow-hidden flex flex-col" style={CARD}>
          <div className="px-4 py-2.5 flex-shrink-0" style={SEC_HEAD}>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Team Roster</span>
          </div>
          <div className="overflow-y-auto p-3 space-y-2">
            {members.map((tm, i) => {
              const col = tm.utilizationRate > 90 ? RED : tm.utilizationRate > 80 ? AMBER : GREEN;
              const riskBg = tm.overloadRisk === "critical" ? `${RED}12` : tm.overloadRisk === "warning" ? `${AMBER}10` : "transparent";
              const riskBorder = tm.overloadRisk === "critical" ? `${RED}25` : tm.overloadRisk === "warning" ? `${AMBER}20` : "#222";
              const over = tm.currentAllocation > tm.plannedAllocation;

              return (
                <div key={i} className="rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-1"
                  style={{ backgroundColor: "#111", border: `1px solid ${riskBorder}`, "--tw-ring-color": "#F0FE0040" } as React.CSSProperties}
                  onClick={() => setCalendarMember(tm)}
                  title="Click to open calendar view">
                  {/* Calendar hint */}
                  <div className="flex items-center justify-end px-3 pt-1.5">
                    <span className="text-[8px] text-gray-700 flex items-center gap-1">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                      View calendar
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ backgroundColor: riskBg }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: tm.member?.color || "#525252", color: "#fff" }}>
                      {tm.member?.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{tm.member?.name || "Team Member"}</div>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {(tm.skills ?? []).map(s => (
                          <span key={s} className="text-[8px] px-1 py-0.5 rounded" style={{ backgroundColor: `${BLUE}14`, color: BLUE }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold" style={{ color: col }}>{tm.utilizationRate}%</div>
                      <div className="text-[9px] text-gray-600">{tm.billableHours ?? "—"}/{tm.availableHours ?? 40}h</div>
                    </div>
                  </div>
                  <div className="px-3 pt-2">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff0a" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(tm.utilizationRate, 100)}%`, backgroundColor: col }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 px-3 pt-2 pb-2 gap-2 text-center">
                    <div>
                      <div className="text-[8px] text-gray-600 uppercase tracking-wide">Current</div>
                      <div className="text-[11px] font-semibold" style={{ color: over ? AMBER : "white" }}>{tm.currentAllocation}%</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-gray-600 uppercase tracking-wide">Planned</div>
                      <div className="text-[11px] text-white">{tm.plannedAllocation}%</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-gray-600 uppercase tracking-wide">Bench</div>
                      <div className="text-[11px]" style={{ color: tm.benchTime > 0 ? GREEN : "#555" }}>{tm.benchTime}h</div>
                    </div>
                  </div>
                  {(tm.projectAllocations?.length ?? 0) > 0 && (
                    <div className="px-3 pb-2.5" style={{ borderTop: "1px solid #1e1e1e" }}>
                      <div className="text-[8px] text-gray-600 uppercase tracking-wide mt-2 mb-1.5">Project Allocation</div>
                      <div className="flex h-1.5 rounded-full overflow-hidden gap-px mb-2" style={{ backgroundColor: "#ffffff06" }}>
                        {tm.projectAllocations.map((p, pi) => (
                          <div key={pi} className="h-full" style={{ width: `${p.allocationPct}%`, backgroundColor: p.color }} />
                        ))}
                      </div>
                      <div className="space-y-1">
                        {tm.projectAllocations.map((p, pi) => (
                          <div key={pi} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                              <span className="text-[9px] text-gray-400 truncate max-w-[120px]">{p.projectName}</span>
                            </div>
                            <span className="text-[9px] text-gray-600">{p.allocationPct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {tm.overloadRisk !== "clear" && (
                    <div className="px-3 pb-2.5">
                      <div className="flex items-center gap-1.5 rounded px-2 py-1" style={{ backgroundColor: `${tm.overloadRisk === "critical" ? RED : AMBER}0d`, border: `1px solid ${tm.overloadRisk === "critical" ? RED : AMBER}22` }}>
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: tm.overloadRisk === "critical" ? RED : AMBER }} />
                        <span className="text-[9px]" style={{ color: tm.overloadRisk === "critical" ? RED : AMBER }}>
                          {tm.overloadRisk === "critical"
                            ? `${tm.currentAllocation}% allocated — ${tm.currentAllocation - tm.plannedAllocation}% over target`
                            : `Approaching capacity limit — monitor for new assignments`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Summary + Alignment */}
        <div className="flex flex-col gap-2 min-h-0">

          {/* Risk summary */}
          <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
            <div className="px-4 py-2.5" style={SEC_HEAD}>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Risk Overview</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Overloaded",   value: criticals.length, color: criticals.length > 0 ? RED : "#555"  },
                  { label: "At Risk",       value: warnings.length,  color: warnings.length > 0 ? AMBER : "#555" },
                  { label: "Bench Hours",   value: `${totalBench}h`, color: totalBench > 0 ? GREEN : "#555"      },
                  { label: "Avg Util",      value: `${avgUtil}%`,    color: utilColor                            },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg p-2" style={{ backgroundColor: "#111" }}>
                    <div className="text-[9px] text-gray-500 mb-0.5">{label}</div>
                    <div className="text-sm font-bold" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>
              {/* Overload alert list */}
              {criticals.length > 0 && (
                <div className="space-y-1">
                  {criticals.map(m => (
                    <div key={m.member?.id} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: `${RED}0d`, border: `1px solid ${RED}22` }}>
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: RED }} />
                      <span className="text-[9px]" style={{ color: RED }}>{m.member?.name} — {m.currentAllocation}% allocated</span>
                    </div>
                  ))}
                </div>
              )}
              {criticals.length === 0 && warnings.length === 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: `${GREEN}0d`, border: `1px solid ${GREEN}22` }}>
                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: GREEN }} />
                  <span className="text-[9px]" style={{ color: GREEN }}>All team members within healthy allocation range</span>
                </div>
              )}
            </div>
          </div>

          {/* Alignment Overview */}
          <SageAlignmentCard
            nodeType="capacity"
            data={data as unknown as Record<string, unknown>}
            nodeId={nodeId}
            chatId={`capacity-alignment-${nodeId}`}
            prompt="In 2–3 short sentences, summarize this team's capacity health. Highlight utilization risks, bench availability, and give one concrete recommendation for workload balance."
          />
        </div>
      </div>

      {/* Team member calendar modal */}
      {calendarMember && (
        <TeamCalendarModal
          member={calendarMember}
          allMembers={members}
          onClose={() => setCalendarMember(null)}
        />
      )}
    </div>
  );
}

function FinancialViz({ data, nodeId }: { data: FinancialNodeData; nodeId: string }) {
  const currency = data.currency ?? "USD";
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const GREEN = "#22c55e", AMBER = "#f59e0b", RED = "#ef4444";
  const statusColor = data.status === "healthy" ? GREEN : data.status === "at-risk" ? AMBER : RED;

  const grossPct   = data.grossMarginPct ?? data.projectMargin ?? 0;
  const projPct    = data.projectedMarginPct ?? grossPct;
  const revenue    = data.revenue ?? 0;
  const cost       = data.costToDate ?? 0;
  const margin$    = revenue - cost;
  const hoursLog   = data.hoursLogged ?? 0;
  const hoursEst   = data.hoursEstimated ?? 0;
  const hoursPct   = hoursEst > 0 ? Math.round((hoursLog / hoursEst) * 100) : 0;

  const marginColor = grossPct >= 30 ? GREEN : grossPct >= 15 ? AMBER : RED;
  const hoursColor  = hoursPct > 90 ? RED : hoursPct > 75 ? AMBER : GREEN;
  const ratio       = data.rateEfficiencyRatio ?? 1;
  const ratioColor  = ratio >= 1.3 ? GREEN : ratio >= 1.0 ? AMBER : RED;
  const ratioLabel  = ratio >= 1.3 ? "Healthy" : ratio >= 1.0 ? "Borderline" : "At Risk";

  const scopeV = data.scopeVariance ?? 0;
  const staffV = data.staffingVariance ?? 0;
  const totalV = data.totalVariance ?? scopeV + staffV;
  const vc = (v: number) => v >= 0 ? GREEN : v > -5000 ? AMBER : RED;

  const diagTitle = totalV >= 0 ? "On track" : Math.abs(scopeV) >= Math.abs(staffV) ? "Scope problem" : "Staffing problem";
  const diagDesc  = totalV >= 0
    ? "Both scope and staffing are within plan."
    : Math.abs(scopeV) >= Math.abs(staffV)
    ? "More hours logged than estimated — review project scope."
    : "Team is more expensive than planned — review seniority mix.";

  const weeklyBurn = [28, 42, 38, 51, 44, 39, 34];
  const maxBurn    = Math.max(...weeklyBurn);

  const CARD = { backgroundColor: "#1a1a1a", border: "1px solid #222" } as const;
  const SEC_HEAD = { borderBottom: "1px solid #222" } as const;

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Hero row ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
        <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#111", borderBottom: "1px solid #222" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            <span className="text-[10px] font-medium capitalize" style={{ color: statusColor }}>{data.status?.replace("-", " ")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: "#10b98112", color: "#10b981" }}>
              {data.billingType === "flat_fee" ? "FLAT FEE" : "HOURLY"}
            </span>
            <span className="text-[9px] text-gray-600">{data.viewRole === "owner" ? "Owner view" : "Manager view"}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-[#222]">
          {[
            { label: "Revenue",      value: fmt(revenue), sub: data.billingType === "flat_fee" ? "contracted" : "hrs × bill rate", color: "text-white" },
            { label: "Cost to Date", value: fmt(cost),    sub: "hrs × cost rate",   color: "text-white" },
            { label: "Gross Margin", value: fmt(margin$), sub: `${grossPct}%`,       color: marginColor },
            { label: "Projected",    value: `${projPct}%`, sub: "at completion",    color: projPct >= grossPct ? GREEN : AMBER },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="px-3 py-3">
              <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-base font-bold" style={typeof color === "string" && color.startsWith("#") ? { color } : undefined}>
                <span className={typeof color === "string" && !color.startsWith("#") ? color : ""}>{value}</span>
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: typeof color === "string" && color.startsWith("#") ? color : "#555" }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2-column body ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">

        {/* Left: Project Margin */}
        <div className="rounded-xl overflow-hidden flex flex-col" style={CARD}>
          <div className="px-4 py-2.5 flex-shrink-0" style={SEC_HEAD}>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Project Margin</span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {/* Margin bars */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">Gross margin to date</span>
                <span className="font-semibold" style={{ color: marginColor }}>{grossPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff10" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(grossPct, 100)}%`, backgroundColor: marginColor }} />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Projected at completion</span>
                <span style={{ color: projPct >= grossPct ? GREEN : AMBER }}>{projPct}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff08" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(projPct, 100)}%`, backgroundColor: projPct >= grossPct ? GREEN : AMBER, opacity: 0.55 }} />
              </div>
            </div>
            {/* Hours */}
            <div className="space-y-1.5 pt-2" style={{ borderTop: "1px solid #222" }}>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">Hours consumed</span>
                <span style={{ color: hoursColor }}>{hoursLog} / {hoursEst}h &nbsp;{hoursPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff10" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(hoursPct, 100)}%`, backgroundColor: hoursColor }} />
              </div>
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>{hoursEst - hoursLog}h remaining</span>
                <span>${Math.round(cost / (hoursLog || 1))}/hr avg cost</span>
              </div>
            </div>
            {/* Weekly burn */}
            <div className="pt-2" style={{ borderTop: "1px solid #222" }}>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-2">Weekly Hours Burn</div>
              <div className="flex items-end gap-1 h-10">
                {weeklyBurn.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-sm" style={{ height: `${Math.round((h / maxBurn) * 32)}px`, backgroundColor: i === weeklyBurn.length - 1 ? "#10b981" : "#10b98128" }} />
                    <span className="text-[7px] text-gray-700">W{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Alignment Overview */}
            <SageAlignmentCard
              nodeType="financial"
              data={data as unknown as Record<string, unknown>}
              nodeId={nodeId}
              chatId={`financial-alignment-${nodeId}`}
              prompt="In 2–3 short sentences, summarize this project's financial health. Highlight the most important margin or budget risk and give one concrete recommendation."
            />
          </div>
        </div>

        {/* Right: Rate Efficiency + Variance stacked */}
        <div className="flex flex-col gap-2 min-h-0">

          {/* Blended Rate */}
          <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
            <div className="px-4 py-2.5" style={SEC_HEAD}>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Blended Rate Efficiency</span>
            </div>
            <div className="p-2.5 space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Bill Rate", value: `$${data.effectiveBillRate ?? 0}/hr`, color: "text-white" },
                  { label: "Cost Rate", value: `$${data.effectiveCostRate ?? 0}/hr`, color: "text-white" },
                  { label: "Ratio",     value: `${ratio.toFixed(2)}×`,              color: ratioColor },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg p-1.5 text-center" style={{ backgroundColor: "#111" }}>
                    <div className="text-[9px] text-gray-500 mb-0.5">{label}</div>
                    <div className="text-sm font-bold" style={color.startsWith("#") ? { color } : undefined}>
                      <span className={!color.startsWith("#") ? color : ""}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded px-2 py-1" style={{ backgroundColor: `${ratioColor}10`, border: `1px solid ${ratioColor}20` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ratioColor }} />
                <span className="text-[9px]" style={{ color: ratioColor }}>{ratioLabel} — {ratio >= 1.3 ? "billing well above cost" : ratio >= 1.0 ? "billing barely covers cost" : "billing below cost"}</span>
              </div>
              {/* Team table */}
              {(data.teamBreakdown?.length ?? 0) > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #222" }}>
                  <div className="grid grid-cols-5 px-2.5 py-1" style={{ backgroundColor: "#0d0d0d" }}>
                    {["", "Role", "Hrs", "Bill", "Cost"].map(h => (
                      <span key={h} className="text-[8px] font-semibold text-gray-600 uppercase tracking-wide">{h}</span>
                    ))}
                  </div>
                  {data.teamBreakdown!.map((m, i) => (
                    <div key={i} className="grid grid-cols-5 px-2.5 py-0.5 items-center" style={{ borderTop: "1px solid #1a1a1a", backgroundColor: "#141414" }}>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-semibold flex-shrink-0" style={{ backgroundColor: "#10b98118", color: "#10b981" }}>{m.initials}</div>
                      </div>
                      <span className="text-[9px] text-gray-500 truncate">{m.role}</span>
                      <span className="text-[9px] text-gray-400">{m.hoursLogged}h</span>
                      <span className="text-[9px] text-white">${m.billRate}</span>
                      <span className="text-[9px]" style={{ color: m.billRate / m.costRate >= 1.3 ? GREEN : m.billRate / m.costRate >= 1.0 ? AMBER : RED }}>${m.costRate}</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-5 px-2.5 py-0.5 items-center" style={{ borderTop: "1px solid #222", backgroundColor: "#0d0d0d" }}>
                    <span className="text-[8px] font-semibold text-gray-400 col-span-2">Blended</span>
                    <span className="text-[9px] text-gray-500">{hoursLog}h</span>
                    <span className="text-[9px] font-semibold text-white">${data.effectiveBillRate}</span>
                    <span className="text-[9px] font-semibold" style={{ color: ratioColor }}>${data.effectiveCostRate}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Utilization-Adjusted Margin */}
          <div className="rounded-xl overflow-hidden flex-1" style={CARD}>
            <div className="px-4 py-2.5" style={SEC_HEAD}>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Utilization-Adjusted Margin</span>
            </div>
            <div className="p-2.5 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Scope Variance",    value: scopeV, sub: "hours vs. estimate" },
                  { label: "Staffing Variance",  value: staffV, sub: "seniority vs. plan"  },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-lg p-2" style={{ backgroundColor: "#111" }}>
                    <div className="text-[9px] text-gray-500 mb-0.5">{label}</div>
                    <div className="text-sm font-bold" style={{ color: vc(value) }}>{value >= 0 ? "+" : ""}{fmt(value)}</div>
                    <div className="text-[8px] text-gray-600 mt-0.5">{sub}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ backgroundColor: "#111", border: `1px solid ${vc(totalV)}20` }}>
                <span className="text-[10px] text-gray-400">Total variance</span>
                <span className="text-base font-bold" style={{ color: vc(totalV) }}>{totalV >= 0 ? "+" : ""}{fmt(totalV)}</span>
              </div>
              {/* Mini bars */}
              {[{ label: "Scope", v: scopeV }, { label: "Staffing", v: staffV }].map(({ label, v }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-600 w-10 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ backgroundColor: "#ffffff06" }}>
                    <div className="h-full rounded" style={{ width: `${Math.round((Math.abs(v) / ((Math.abs(scopeV) + Math.abs(staffV)) || 1)) * 100)}%`, backgroundColor: vc(v), opacity: 0.65 }} />
                  </div>
                  <span className="text-[9px] w-12 text-right flex-shrink-0" style={{ color: vc(v) }}>{v >= 0 ? "+" : ""}{fmt(v)}</span>
                </div>
              ))}
              <div className="rounded px-2 py-1.5" style={{ backgroundColor: `${vc(totalV)}0d`, border: `1px solid ${vc(totalV)}20` }}>
                <div className="text-[9px] font-semibold mb-0.5" style={{ color: vc(totalV) }}>{diagTitle}</div>
                <div className="text-[9px] text-gray-500 leading-relaxed">{diagDesc}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Shared Sage alignment card ───────────────────────────────────────────────

function SageAlignmentCard({
  nodeType, data, nodeId, chatId, prompt,
}: {
  nodeType: DataNodeType;
  data: Record<string, unknown>;
  nodeId: string;
  chatId: string;
  prompt: string;
}) {
  const triggered = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/sage",
        fetch: async (url, options) => {
          const body = JSON.parse((options as RequestInit).body as string || "{}");
          body.context = { ...body.context, connectedNodes: [{ type: nodeType, data }] };
          return fetch(url, { ...(options as RequestInit), body: JSON.stringify(body) });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeId]
  );

  const { messages, sendMessage, status } = useChat({ id: chatId, transport });

  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true;
      sendMessage({ text: prompt });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isStreaming = status === "streaming";
  const responseText = messages
    .filter(m => m.role === "assistant")
    .map(m => (m.parts ?? []).map((p: any) => ("text" in p ? p.text : "")).join(""))
    .join("");

  return (
    <div className="rounded-xl overflow-hidden flex flex-col flex-1" style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}>
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid #222" }}>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Alignment Overview</span>
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#F0FE00" }}>
            <SageStar size={7} />
          </div>
          <span className="text-[8px] text-gray-600">Sage</span>
        </div>
      </div>
      <div className="px-4 py-3 flex-1 flex items-start" style={{ backgroundColor: "#F0FE0006" }}>
        {isStreaming && !responseText ? (
          <div className="flex items-center gap-1 pt-0.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#F0FE00", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gray-300 leading-relaxed">
            {responseText}
            {isStreaming && <span className="inline-block w-0.5 h-3 ml-0.5 align-middle animate-pulse" style={{ backgroundColor: "#F0FE00" }} />}
          </p>
        )}
      </div>
    </div>
  );
}

function ProjectHealthViz({ data, nodeId }: { data: ProjectHealthNodeData; nodeId: string }) {
  const GREEN = "#22c55e", AMBER = "#f59e0b", RED = "#ef4444", PURPLE = "#8b5cf6";
  const CARD = { backgroundColor: "#1a1a1a", border: "1px solid #222" } as const;
  const SEC_HEAD = { borderBottom: "1px solid #222" } as const;

  const PHASE_ORDER = ["discovery", "concepting", "production", "delivery"];
  const phaseIdx = PHASE_ORDER.indexOf(data.projectPhase ?? "");

  const statusColor = data.healthStatus === "on-track" ? GREEN : data.healthStatus === "needs-attention" ? AMBER : RED;
  const touchColor  = (data.daysSinceClientTouchpoint ?? 0) <= 7 ? GREEN : (data.daysSinceClientTouchpoint ?? 0) <= 14 ? AMBER : RED;

  const revMin = data.expectedRevisionMin ?? 2;
  const revMax = data.expectedRevisionMax ?? 3;
  const revAbove = Math.max(0, (data.revisionCount ?? 0) - revMax);
  const revColor = revAbove === 0 ? GREEN : revAbove === 1 ? AMBER : RED;

  const stalledCycles = (data.feedbackCycles ?? []).filter(c => c.status === "stalled");
  const activeCycles  = (data.feedbackCycles ?? []).filter(c => c.status !== "stalled");
  const feedbackColor = (data.openFeedbackCycles ?? 0) === 0 ? GREEN : stalledCycles.length > 0 ? RED : AMBER;

  const SOURCE_ICON: Record<string, string> = { calendar: "Cal", client_experience: "CX", manual_log: "Sage" };
  const SOURCE_COLOR: Record<string, string> = { calendar: PURPLE, client_experience: "#3b82f6", manual_log: "#F0FE00" };

  const STATUS_LABEL: Record<string, string> = { active: "Active", awaiting_revision: "Awaiting revision", stalled: "Stalled" };
  const STATUS_COLOR: Record<string, string> = { active: AMBER, awaiting_revision: "#3b82f6", stalled: RED };

  // ── Portfolio view ───────────────────────────────────────────────────────
  if ((data.portfolioProjects?.length ?? 0) > 0) {
    const pp = data.portfolioProjects!;
    const onTrack   = pp.filter(p => p.health === "on-track").length;
    const needsAttn = pp.filter(p => p.health === "needs-attention").length;
    const atRisk    = pp.filter(p => p.health === "at-risk").length;
    const totalFB   = pp.reduce((a, p) => a + p.feedbackCycles, 0);
    const totalRev  = pp.reduce((a, p) => a + p.revisions, 0);
    const stalest   = Math.max(...pp.map(p => p.daysSince));
    const ovColor   = atRisk > 0 ? RED : needsAttn > 0 ? AMBER : GREEN;

    return (
      <div className="space-y-3">
        {/* Summary hero */}
        <div className="rounded-xl overflow-hidden" style={CARD}>
          <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#111", borderBottom: "1px solid #222" }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ovColor }} />
              <span className="text-[10px] font-medium" style={{ color: ovColor }}>
                {atRisk > 0 ? `${atRisk} at risk` : needsAttn > 0 ? `${needsAttn} need attention` : "All projects healthy"}
              </span>
            </div>
            <span className="text-[9px] text-gray-600">{data.viewRole === "owner" ? "Owner view" : "Manager view"}</span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-[#222]">
            {[
              { label: "Projects",         value: `${onTrack}/${pp.length}`, sub: "on track",    color: ovColor },
              { label: "Open Feedback",    value: `${totalFB}`,              sub: "cycles",       color: totalFB > 8 ? AMBER : "text-white" },
              { label: "Total Revisions",  value: `${totalRev}`,             sub: "this cycle",   color: "text-white" },
              { label: "Stalest Touch",    value: `${stalest}d`,             sub: "ago",          color: stalest > 7 ? AMBER : GREEN },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="px-3 py-3">
                <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
                <div className="text-base font-bold" style={color.startsWith("#") ? { color } : undefined}>
                  <span className={!color.startsWith("#") ? color : ""}>{value}</span>
                </div>
                <div className="text-[9px] text-gray-600 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-project rows */}
        <div className="space-y-1.5">
          {pp.map(p => {
            const hc = p.health === "on-track" ? GREEN : p.health === "needs-attention" ? AMBER : RED;
            return (
              <div key={p.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: `1px solid ${hc}20` }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{p.name}</div>
                  <div className="text-[9px] text-gray-500 capitalize">{p.phase}</div>
                </div>
                <div className="text-[9px] text-gray-500">{p.daysSince}d ago</div>
                <div className="text-[9px] text-gray-600">{p.feedbackCycles} fb</div>
                <div className="text-[9px] font-medium capitalize px-1.5 py-0.5 rounded" style={{ color: hc, backgroundColor: `${hc}14` }}>{p.health.replace("-", " ")}</div>
              </div>
            );
          })}
        </div>

        <SageAlignmentCard
          nodeType="projectHealth"
          data={data as unknown as Record<string, unknown>}
          nodeId={nodeId}
          chatId={`proj-portfolio-alignment-${nodeId}`}
          prompt="In 2–3 short sentences, summarize this project portfolio's overall health. Flag the most at-risk projects and give one concrete recommendation for the team."
        />
      </div>
    );
  }

  // ── Single-project view ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Hero row ── */}
      <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
        <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#111", borderBottom: "1px solid #222" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            <span className="text-[10px] font-medium capitalize" style={{ color: statusColor }}>{(data.healthStatus ?? "on-track").replace(/-/g, " ")}</span>
          </div>
          <span className="text-[9px] text-gray-600 capitalize">{data.viewRole === "owner" ? "Owner view" : "Manager view"}</span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-[#222]">
          {[
            { label: "Status",       value: (data.healthStatus ?? "on-track").replace(/-/g, " "), sub: "overall health",         color: statusColor   },
            { label: "Touchpoint",   value: `${data.daysSinceClientTouchpoint}d`,                 sub: "since last contact",     color: touchColor    },
            { label: "Feedback",     value: `${data.openFeedbackCycles}`,                          sub: stalledCycles.length > 0 ? `${stalledCycles.length} stalled` : "open cycles", color: feedbackColor },
            { label: "Revisions",    value: `${data.revisionCount}`,                               sub: `${revMin}–${revMax} expected`,  color: revColor      },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="px-3 py-3">
              <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-base font-bold capitalize" style={{ color }}>{value}</div>
              <div className="text-[9px] mt-0.5" style={{ color: "#555" }}>{sub}</div>
            </div>
          ))}
        </div>
        {/* Phase progress */}
        <div className="px-4 pb-3 pt-2" style={{ borderTop: "1px solid #1e1e1e" }}>
          <div className="flex gap-1.5">
            {PHASE_ORDER.map((p, i) => (
              <div key={p} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-1 rounded-full" style={{ backgroundColor: i <= phaseIdx ? PURPLE : "#ffffff0a" }} />
                <span className="text-[8px] capitalize" style={{ color: i === phaseIdx ? PURPLE : "#555" }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2-column body ── */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">

        {/* Left: Client Touchpoint + Feedback Cycles */}
        <div className="rounded-xl overflow-hidden flex flex-col" style={CARD}>
          <div className="px-4 py-2.5 flex-shrink-0" style={SEC_HEAD}>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Client Signals</span>
          </div>
          <div className="p-3 flex flex-col gap-3 overflow-y-auto">

            {/* Touchpoint */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Client touchpoint</span>
                <span className="font-semibold" style={{ color: touchColor }}>{data.daysSinceClientTouchpoint}d ago</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff08" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((data.daysSinceClientTouchpoint / 21) * 100, 100)}%`, backgroundColor: touchColor }} />
              </div>
              <div className="flex justify-between text-[8px]">
                {[{ t: "0–7d", c: GREEN }, { t: "8–14d", c: AMBER }, { t: "15d+", c: RED }].map(({ t, c }) => (
                  <span key={t} style={{ color: c }}>{t}</span>
                ))}
              </div>
              {(data.touchpointLog?.length ?? 0) > 0 && (
                <div className="space-y-1.5 pt-1" style={{ borderTop: "1px solid #1e1e1e" }}>
                  {data.touchpointLog!.map((tp, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[7px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${SOURCE_COLOR[tp.source] ?? PURPLE}15`, color: SOURCE_COLOR[tp.source] ?? PURPLE }}>
                        {SOURCE_ICON[tp.source] ?? "?"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-500">{tp.date}</span>
                          <span className="text-[8px] text-gray-700 capitalize">{tp.type.replace(/_/g, " ")}</span>
                        </div>
                        {tp.notes && <div className="text-[9px] text-gray-400 leading-relaxed">{tp.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback cycles */}
            <div className="space-y-1.5 pt-1" style={{ borderTop: "1px solid #222" }}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Open feedback cycles</span>
                <div className="flex items-center gap-1.5">
                  {stalledCycles.length > 0 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: `${RED}14`, color: RED }}>
                      {stalledCycles.length} stalled
                    </span>
                  )}
                  <span className="font-semibold" style={{ color: feedbackColor }}>{data.openFeedbackCycles}</span>
                </div>
              </div>
              {(data.feedbackCycles?.length ?? 0) > 0 ? (
                <div className="space-y-1">
                  {data.feedbackCycles!.map((fc) => (
                    <div key={fc.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg" style={{ backgroundColor: "#111" }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-white truncate">{fc.nodeLabel}</div>
                        <div className="text-[8px] text-gray-600">Open {fc.daysOpen}d · {fc.lastClientAction}</div>
                      </div>
                      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded capitalize flex-shrink-0 ml-2"
                        style={{ backgroundColor: `${STATUS_COLOR[fc.status]}14`, color: STATUS_COLOR[fc.status] }}>
                        {STATUS_LABEL[fc.status]}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-gray-600 py-1">No open feedback cycles</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Revisions + Alignment Overview */}
        <div className="flex flex-col gap-2 min-h-0">

          {/* Revision tracker */}
          <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
            <div className="px-4 py-2.5" style={SEC_HEAD}>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Revisions · {data.projectPhase ?? "current"} phase</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Revision count</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{revMin}–{revMax} expected</span>
                  <span className="text-base font-bold" style={{ color: revColor }}>{data.revisionCount}</span>
                </div>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff08" }}>
                <div className="absolute inset-y-0 left-0 rounded-full" style={{
                  width: `${Math.min((data.revisionCount / Math.max(revMax + 2, data.revisionCount + 1)) * 100, 100)}%`,
                  backgroundColor: revColor,
                }} />
                <div className="absolute inset-y-0 rounded" style={{
                  left: `${(revMin / (revMax + 2)) * 100}%`,
                  width: `${((revMax - revMin) / (revMax + 2)) * 100}%`,
                  backgroundColor: `${GREEN}25`,
                  border: `1px solid ${GREEN}40`,
                }} />
              </div>
              <div className="flex justify-between text-[8px] text-gray-600">
                <span>0</span>
                <span style={{ color: GREEN }}>{revMin}–{revMax} healthy</span>
                <span>{revMax + 2}</span>
              </div>
              {data.sageRevisionInsight && revAbove > 0 && (
                <div className="flex items-start gap-2 rounded px-2.5 py-2" style={{ backgroundColor: "#F0FE0010", border: "1px solid #F0FE0020" }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "#F0FE00" }}>
                    <SageStar size={8} />
                  </div>
                  <div>
                    <div className="text-[8px] font-semibold text-yellow-300 mb-0.5">Sage Insight</div>
                    <div className="text-[9px] text-gray-400 leading-relaxed">{data.sageRevisionInsight}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alignment Overview — Sage generated */}
          <SageAlignmentCard
            nodeType="projectHealth"
            data={data as unknown as Record<string, unknown>}
            nodeId={nodeId}
            chatId={`proj-alignment-${nodeId}`}
            prompt="In 2–3 short sentences, summarize this project's overall health and client alignment. Highlight what's working, flag what needs attention, and give one concrete recommendation."
          />

        </div>
      </div>
    </div>
  );
}

function PipelineViz({ data, nodeId }: { data: PipelineNodeData; nodeId: string }) {
  const GREEN = "#22c55e", BLUE = "#3b82f6", AMBER = "#f59e0b", PURPLE = "#8b5cf6", RED = "#ef4444";
  const capColor = data.capacityStatus === "available" ? GREEN : data.capacityStatus === "balanced" ? BLUE : RED;
  const loadPct  = data.currentCapacity > 0 ? Math.round((data.projectedLoad / data.currentCapacity) * 100) : 0;

  const forecasts = [
    { label: "30 Days", items: data.forecast30Days ?? [], color: GREEN  },
    { label: "60 Days", items: data.forecast60Days ?? [], color: BLUE   },
    { label: "90 Days", items: data.forecast90Days ?? [], color: PURPLE },
  ];

  const totalProjects = forecasts.reduce((a, f) => a + f.items.length, 0);
  const totalHours    = forecasts.reduce((a, f) => a + f.items.reduce((s, p) => s + p.estimatedHours, 0), 0);
  const highProb      = forecasts.flatMap(f => f.items).filter(p => p.probability >= 70).length;

  const CARD     = { backgroundColor: "#1a1a1a", border: "1px solid #222" } as const;
  const SEC_HEAD = { borderBottom: "1px solid #222" } as const;

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Hero row ── */}
      <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
        <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#111", borderBottom: "1px solid #222" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: capColor }} />
            <span className="text-[10px] font-medium capitalize" style={{ color: capColor }}>{data.capacityStatus}</span>
          </div>
          <span className="text-[9px] text-gray-600">{totalProjects} projects in pipeline</span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-[#222]">
          {[
            { label: "Capacity Load",  value: `${loadPct}%`,           sub: "of available",    color: capColor },
            { label: "Load Hours",     value: `${data.projectedLoad}h`, sub: "projected",       color: "text-white" },
            { label: "Capacity",       value: `${data.currentCapacity}h`, sub: "available",     color: "text-white" },
            { label: "High Prob",      value: `${highProb}`,            sub: "≥70% projects",   color: GREEN },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="px-3 py-3">
              <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-base font-bold" style={color.startsWith("#") ? { color } : undefined}>
                <span className={!color.startsWith("#") ? color : ""}>{value}</span>
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: "#555" }}>{sub}</div>
            </div>
          ))}
        </div>
        {/* Load bar */}
        <div className="px-4 pb-3 pt-2" style={{ borderTop: "1px solid #1e1e1e" }}>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff08" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(loadPct, 100)}%`, backgroundColor: capColor }} />
          </div>
          <div className="flex justify-between text-[9px] text-gray-600 mt-1">
            <span>{data.projectedLoad}h needed</span>
            <span>{data.currentCapacity}h available</span>
          </div>
        </div>
      </div>

      {/* ── 2-column body ── */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">

        {/* Left: Forecast lists */}
        <div className="rounded-xl overflow-hidden flex flex-col" style={CARD}>
          <div className="px-4 py-2.5 flex-shrink-0" style={SEC_HEAD}>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Forecast Pipeline</span>
          </div>
          <div className="overflow-y-auto flex flex-col gap-2 p-3">
            {forecasts.map(({ label, items, color }) => items.length > 0 && (
              <div key={label} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}20` }}>
                <div className="px-3 py-2 flex justify-between" style={{ backgroundColor: "#111", borderBottom: `1px solid ${color}18` }}>
                  <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
                  <span className="text-[9px] text-gray-500">{items.length} projects · {items.reduce((a, p) => a + p.estimatedHours, 0)}h</span>
                </div>
                <div style={{ backgroundColor: "#0d0d0d" }}>
                  {items.map((p, i) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between" style={{ borderTop: i > 0 ? "1px solid #1a1a1a" : "none" }}>
                      <span className="text-[10px] text-gray-300 truncate max-w-[120px]">{p.projectName}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[9px] text-gray-600">{p.estimatedHours}h</span>
                        <div className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                          style={{ backgroundColor: p.probability >= 70 ? `${GREEN}20` : `${AMBER}20`, color: p.probability >= 70 ? GREEN : AMBER }}>
                          {p.probability}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Summary + Competing Projects (project scope) or Alignment (org scope) */}
        <div className="flex flex-col gap-2 min-h-0">

          {/* Pipeline summary */}
          <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
            <div className="px-4 py-2.5" style={SEC_HEAD}>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Pipeline Summary</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Total Projects", value: totalProjects,    color: "text-white"  },
                  { label: "Total Hours",    value: `${totalHours}h`, color: "text-white"  },
                  { label: "High Prob",      value: highProb,         color: GREEN         },
                  { label: "Load %",         value: `${loadPct}%`,    color: capColor      },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg p-2" style={{ backgroundColor: "#111" }}>
                    <div className="text-[9px] text-gray-500 mb-0.5">{label}</div>
                    <div className="text-sm font-bold" style={color.startsWith("#") ? { color } : undefined}>
                      <span className={!color.startsWith("#") ? color : ""}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded px-2 py-1.5" style={{ backgroundColor: `${capColor}10`, border: `1px solid ${capColor}20` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: capColor }} />
                <span className="text-[9px] capitalize" style={{ color: capColor }}>
                  {data.capacityStatus === "available" ? "Capacity available for new projects" : data.capacityStatus === "balanced" ? "Pipeline balanced with current capacity" : "Pipeline exceeds available capacity"}
                </span>
              </div>
            </div>
          </div>

          {/* Competing projects — project scope only */}
          {data.competingProjects && data.competingProjects.length > 0 ? (
            <div className="rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col" style={CARD}>
              <div className="px-4 py-2.5 flex-shrink-0" style={SEC_HEAD}>
                <div className="flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Competing for Same Team</span>
                </div>
              </div>
              <div className="overflow-y-auto p-3 space-y-1.5 flex-1">
                {data.competingProjects.map((cp, i) => {
                  const impactColor = cp.impactLevel === "high" ? RED : cp.impactLevel === "medium" ? AMBER : BLUE;
                  return (
                    <div key={i} className="rounded-lg p-2.5" style={{ backgroundColor: "#111", border: `1px solid ${impactColor}18` }}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] text-white font-medium leading-tight">{cp.projectName}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide" style={{ backgroundColor: `${impactColor}20`, color: impactColor }}>
                            {cp.impactLevel}
                          </span>
                          <span className="text-[9px] text-gray-500">{cp.hours}h</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cp.teamOverlap.map(name => (
                          <span key={name} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#1e1e1e", color: "#888", border: "1px solid #2a2a2a" }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <SageAlignmentCard
              nodeType="pipeline"
              data={data as unknown as Record<string, unknown>}
              nodeId={nodeId}
              chatId={`pipeline-alignment-${nodeId}`}
              prompt="In 2–3 short sentences, summarize this team's pipeline health. Highlight capacity risks, high-probability opportunities, and give one concrete recommendation for workload planning."
            />
          )}
        </div>
      </div>
    </div>
  );
}


function TeamHealthViz({ data, nodeId }: { data: TeamHealthNodeData; nodeId: string }) {
  const GREEN = "#22c55e", AMBER = "#f59e0b", RED = "#ef4444", PINK = "#ec4899";
  const trendColor = data.trendDirection === "improving" ? GREEN : data.trendDirection === "stable" ? "#3b82f6" : RED;
  const trendIcon  = data.trendDirection === "improving" ? "↑" : data.trendDirection === "stable" ? "→" : "↓";
  const trendLabel = data.trendDirection.charAt(0).toUpperCase() + data.trendDirection.slice(1);

  const fbPct  = Math.max(5, Math.min(100, 100 - (data.feedbackLoopVelocity / 96) * 100));
  const rvPct  = Math.max(5, Math.min(100, 100 - ((data.revisionToApprovalRatio - 1) / 6) * 100));
  const fbColor = data.feedbackLoopVelocity <= 24 ? GREEN : data.feedbackLoopVelocity <= 48 ? AMBER : RED;
  const rvColor = data.revisionToApprovalRatio <= 2 ? GREEN : data.revisionToApprovalRatio <= 4 ? AMBER : RED;

  const healthScore  = data.overallHealthScore  ?? Math.round((fbPct + rvPct) / 2);
  const onTime       = data.onTimeDeliveryRate  ?? 87;
  const blockers     = data.openBlockers        ?? 0;
  const weeklyVel    = data.weeklyVelocity      ?? [3, 5, 4, 7, 6, 5, 8];
  const costRate     = data.avgCostRate         ?? 0;
  const savedDollars = costRate > 0 ? data.timeSavedHours * costRate : 0;
  const fmtMoney     = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  const maxVel       = Math.max(...weeklyVel, 1);

  const healthColor  = healthScore >= 70 ? GREEN : healthScore >= 45 ? AMBER : RED;
  const onTimeColor  = onTime >= 80 ? GREEN : onTime >= 60 ? AMBER : RED;
  const blockColor   = blockers === 0 ? GREEN : blockers <= 2 ? AMBER : RED;


  const CARD     = { backgroundColor: "#1a1a1a", border: "1px solid #222" } as const;
  const SEC_HEAD = { borderBottom: "1px solid #222" } as const;

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Hero row ── */}
      <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
        <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: "#111", borderBottom: "1px solid #222" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: trendColor }} />
            <span className="text-[10px] font-medium" style={{ color: trendColor }}>{trendLabel}</span>
          </div>
          <span className="text-[9px] text-gray-600">Updated {data.lastUpdated}</span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-[#222]">
          {[
            { label: "Trend",          value: `${trendIcon} ${trendLabel}`, sub: "overall direction",   color: trendColor },
            { label: "Feedback Loop",  value: `${data.feedbackLoopVelocity}h`,    sub: "avg resolution",    color: fbColor    },
            { label: "Revision Ratio", value: `${data.revisionToApprovalRatio}×`, sub: "per approval",      color: rvColor    },
            { label: "Ideate Savings", value: `${data.timeSavedHours}h`, sub: savedDollars > 0 ? `≈ ${fmtMoney(savedDollars)} saved` : "saved this cycle", color: GREEN },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="px-3 py-3">
              <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-base font-bold" style={{ color }}>{value}</div>
              <div className="text-[9px] mt-0.5" style={{ color: "#555" }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2-column body ── */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">

        {/* Left: Workflow Efficiency */}
        <div className="rounded-xl overflow-hidden flex flex-col" style={CARD}>
          <div className="px-4 py-2.5 flex-shrink-0" style={SEC_HEAD}>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Workflow Efficiency</span>
          </div>
          <div className="p-4 flex flex-col gap-3 overflow-y-auto">

            {/* Feedback loop bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">Feedback loop velocity</span>
                <span className="font-semibold" style={{ color: fbColor }}>{data.feedbackLoopVelocity}h avg</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff10" }}>
                <div className="h-full rounded-full" style={{ width: `${fbPct}%`, backgroundColor: fbColor }} />
              </div>
              <div className="flex justify-between text-[8px] text-gray-600">
                <span style={{ color: GREEN }}>≤24h healthy</span>
                <span style={{ color: AMBER }}>≤48h warning</span>
                <span style={{ color: RED }}>48h+ at risk</span>
              </div>
            </div>

            {/* Revision ratio bar */}
            <div className="space-y-1.5 pt-1" style={{ borderTop: "1px solid #222" }}>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">Revision to approval</span>
                <span className="font-semibold" style={{ color: rvColor }}>{data.revisionToApprovalRatio}× ratio</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff10" }}>
                <div className="h-full rounded-full" style={{ width: `${rvPct}%`, backgroundColor: rvColor }} />
              </div>
              <div className="flex justify-between text-[8px] text-gray-600">
                <span style={{ color: GREEN }}>≤2× healthy</span>
                <span style={{ color: RED }}>4×+ at risk</span>
              </div>
            </div>

            {/* Weekly velocity chart */}
            <div className="pt-1" style={{ borderTop: "1px solid #222" }}>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide mb-2">Weekly Cycles Resolved</div>
              <div className="flex items-end gap-1 h-10">
                {weeklyVel.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-sm" style={{
                      height: `${Math.max(3, Math.round((v / maxVel) * 32))}px`,
                      backgroundColor: i === weeklyVel.length - 1 ? PINK : `${PINK}28`,
                    }} />
                    <span className="text-[7px] text-gray-700">W{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <SageAlignmentCard
              nodeType="teamHealth"
              data={data as unknown as Record<string, unknown>}
              nodeId={nodeId}
              chatId={`alignment-${nodeId}`}
              prompt="In 2–3 short sentences, summarize this team's overall health and workflow alignment. Highlight what's working, flag what needs attention, and give one concrete recommendation. Be direct and specific to the numbers."
            />
          </div>
        </div>

        {/* Right: Team Pulse + Per-member (project scope) or Ideate Impact (org scope) */}
        <div className="flex flex-col gap-2 min-h-0">

          {/* Team Pulse */}
          <div className="rounded-xl overflow-hidden flex-shrink-0" style={CARD}>
            <div className="px-4 py-2.5" style={SEC_HEAD}>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Team Pulse</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Health Score", value: `${healthScore}`, unit: "/100", color: healthColor  },
                  { label: "On-Time %",    value: `${onTime}%`,     unit: "",      color: onTimeColor  },
                  { label: "Blockers",     value: `${blockers}`,    unit: " open", color: blockColor   },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} className="rounded-lg p-2 text-center" style={{ backgroundColor: "#111" }}>
                    <div className="text-[9px] text-gray-500 mb-0.5">{label}</div>
                    <div className="text-sm font-bold" style={{ color }}>
                      {value}<span className="text-[8px] font-normal text-gray-600">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff10" }}>
                <div className="h-full rounded-full" style={{ width: `${healthScore}%`, backgroundColor: healthColor }} />
              </div>
              <div className="flex items-center gap-2 rounded px-2 py-1.5" style={{ backgroundColor: `${healthColor}10`, border: `1px solid ${healthColor}20` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: healthColor }} />
                <span className="text-[9px]" style={{ color: healthColor }}>
                  {healthScore >= 70 ? "Team operating in healthy zone" : healthScore >= 45 ? "Some metrics need attention" : "Team health requires immediate review"}
                </span>
              </div>
            </div>
          </div>

          {/* Per-member breakdown — project scope */}
          {data.teamMembers && data.teamMembers.length > 0 ? (
            <div className="rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col" style={CARD}>
              <div className="px-4 py-2.5 flex-shrink-0" style={SEC_HEAD}>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Member Health on This Project</span>
              </div>
              <div className="overflow-y-auto p-3 space-y-1.5 flex-1">
                {data.teamMembers.map((m) => {
                  const mHealthColor = m.healthScore >= 80 ? GREEN : m.healthScore >= 60 ? AMBER : RED;
                  const mOnTimeColor = m.onTimeRate >= 85 ? GREEN : m.onTimeRate >= 70 ? AMBER : RED;
                  return (
                    <div key={m.initials} className="rounded-lg p-2.5" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: "#2a2a2a", color: "#aaa" }}>
                          {m.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-white font-medium truncate">{m.name}</div>
                          <div className="text-[8px] text-gray-500">{m.role}</div>
                        </div>
                        {m.blockers > 0 && (
                          <span className="text-[8px] px-1 py-0.5 rounded" style={{ backgroundColor: "#ef444420", color: RED }}>
                            {m.blockers} blocker{m.blockers > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <div className="text-[8px] text-gray-600 mb-0.5">Health</div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff10" }}>
                            <div className="h-full rounded-full" style={{ width: `${m.healthScore}%`, backgroundColor: mHealthColor }} />
                          </div>
                          <div className="text-[8px] mt-0.5 font-semibold" style={{ color: mHealthColor }}>{m.healthScore}/100</div>
                        </div>
                        <div>
                          <div className="text-[8px] text-gray-600 mb-0.5">On-Time</div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff10" }}>
                            <div className="h-full rounded-full" style={{ width: `${m.onTimeRate}%`, backgroundColor: mOnTimeColor }} />
                          </div>
                          <div className="text-[8px] mt-0.5 font-semibold" style={{ color: mOnTimeColor }}>{m.onTimeRate}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Ideate Impact — org scope */
            <div className="rounded-xl overflow-hidden flex-1" style={CARD}>
              <div className="px-4 py-2.5" style={SEC_HEAD}>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Ideate Impact</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="rounded-lg p-3" style={{ backgroundColor: `${GREEN}0a`, border: `1px solid ${GREEN}20` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-gray-500">Saved this cycle by Ideate</span>
                    <div className="rounded-lg p-1.5" style={{ backgroundColor: `${GREEN}15` }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.5">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-[#22c55e20]">
                    <div className="pr-3">
                      <div className="text-[8px] text-gray-600 uppercase tracking-wide mb-0.5">Hours</div>
                      <div className="text-2xl font-bold" style={{ color: GREEN }}>{data.timeSavedHours}h</div>
                      {costRate > 0 && <div className="text-[8px] text-gray-600 mt-0.5">@ ${costRate}/hr avg</div>}
                    </div>
                    <div className="pl-3">
                      <div className="text-[8px] text-gray-600 uppercase tracking-wide mb-0.5">Value</div>
                      {savedDollars > 0
                        ? <div className="text-2xl font-bold" style={{ color: GREEN }}>{fmtMoney(savedDollars)}</div>
                        : <div className="text-sm text-gray-600 mt-1">Set cost rate</div>
                      }
                      {savedDollars > 0 && <div className="text-[8px] text-gray-600 mt-0.5">est. labor cost</div>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Trend Direction",  value: `${trendIcon} ${trendLabel}`, color: trendColor },
                    { label: "Cycle Efficiency", value: `${Math.round(rvPct)}%`,      color: rvColor    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg p-2" style={{ backgroundColor: "#111" }}>
                      <div className="text-[9px] text-gray-500 mb-0.5">{label}</div>
                      <div className="text-sm font-bold" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded px-2.5 py-2" style={{ backgroundColor: `${trendColor}0d`, border: `1px solid ${trendColor}20` }}>
                  <div className="text-[9px] font-semibold mb-0.5" style={{ color: trendColor }}>
                    {data.trendDirection === "improving" ? "Momentum building" : data.trendDirection === "stable" ? "Holding steady" : "Needs intervention"}
                  </div>
                  <div className="text-[9px] text-gray-500 leading-relaxed">
                    {data.trendDirection === "improving"
                      ? "Feedback velocity and revision ratios have both improved since last sprint."
                      : data.trendDirection === "stable"
                      ? "Team metrics are consistent — no significant changes this cycle."
                      : "Key metrics are declining — review workflow and client communication."}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── sage icon ────────────────────────────────────────────────────────────────

function SageStar({ size = 12, color = "#121212" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 647.22 647.22" fill="none">
      <rect fill={color} x="0"      y="265.27" width="113.94" height="113.94" rx="31.65"/>
      <rect fill={color} x="265.27" y="533.28" width="113.94" height="113.94" rx="31.65"/>
      <rect fill={color} x="265.27" y="355.52" width="113.94" height="113.94" rx="31.65"/>
      <rect fill={color} x="265.27" y="177.76" width="113.94" height="113.94" rx="31.65"/>
      <rect fill={color} x="533.28" y="268.01" width="113.94" height="113.94" rx="31.65"/>
      <rect fill={color} x="456.15" y="79.07"  width="113.94" height="113.94" rx="31.65"/>
      <rect fill={color} x="268.01" y="0"      width="113.94" height="113.94" rx="31.65"/>
      <rect fill={color} x="79.07"  y="77.13"  width="113.94" height="113.94" rx="31.65"/>
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
  onNodeDataChange?: (newData: Record<string, unknown>) => void;
}

const PROJECT_SWITCHABLE: DataNodeType[] = ["capacity", "financial", "projectHealth", "pipeline", "teamHealth"];

export function DataDetailPanel({ nodeId, nodeType, nodeData, onClose, onNodeDataChange }: DataDetailPanelProps) {
  const meta = TYPE_META[nodeType];
  const font = { fontFamily: "system-ui, Inter, sans-serif" };
  const [sageOpen, setSageOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  const [activeData, setActiveData] = useState<Record<string, unknown>>(nodeData);
  const [activeProjectId, setActiveProjectId] = useState<ProjectId | null>(() => {
    const stored = nodeData.projectId as ProjectId | undefined;
    if (stored && PROJECTS.find(p => p.id === stored)) return stored;
    return null;
  });

  const label = (activeData.label as string) || meta.label;
  const activeProject = PROJECTS.find(p => p.id === activeProjectId);
  const canSwitchProject = PROJECT_SWITCHABLE.includes(nodeType);

  function switchProject(projectId: ProjectId) {
    const newData = generateProjectNodeData(nodeType as "capacity" | "financial" | "projectHealth" | "pipeline" | "teamHealth", projectId);
    setActiveData(newData);
    setActiveProjectId(projectId);
    setProjectPickerOpen(false);
    onNodeDataChange?.(newData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Data viz modal */}
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          backgroundColor: "#141414",
          border: "1px solid #2a2a2a",
          width: nodeType === "pipeline" || nodeType === "capacity" || nodeType === "financial" || nodeType === "teamHealth" || nodeType === "projectHealth" ? 820 : 580,
          maxWidth: "calc(100vw - 48px)",
          maxHeight: "94vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.accent}20` }}>
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate" style={font}>{label}</div>
            <div className="text-xs" style={{ color: meta.accent, ...font }}>{meta.label}</div>
          </div>

          {/* Project switcher */}
          {canSwitchProject && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setProjectPickerOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                style={{
                  backgroundColor: projectPickerOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
                  border: "1px solid #333",
                  color: activeProject ? "#e5e5e5" : "#888",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                {activeProject ? (
                  <>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PROJECTS.find(p => p.id === activeProjectId)?.color ?? "#666" }} />
                    {activeProject.name}
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
                    Switch project
                  </>
                )}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: "transform 0.15s", transform: projectPickerOpen ? "rotate(180deg)" : "none" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {projectPickerOpen && (
                <div
                  className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden shadow-2xl"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", minWidth: 200, zIndex: 20 }}
                >
                  <div className="px-3 py-2" style={{ borderBottom: "1px solid #2a2a2a" }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#555", fontFamily: "system-ui, Inter, sans-serif" }}>
                      Switch project view
                    </span>
                  </div>
                  {PROJECTS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => switchProject(p.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-white/5"
                      style={{
                        color: activeProjectId === p.id ? "#fff" : "#aaa",
                        backgroundColor: activeProjectId === p.id ? "rgba(255,255,255,0.06)" : "transparent",
                        fontFamily: "system-ui, Inter, sans-serif",
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      {p.name}
                      {activeProjectId === p.id && (
                        <svg className="ml-auto flex-shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F0FE00" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 flex-shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#888" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Visualization — no scroll */}
        <div className="flex-1 overflow-hidden px-5 py-4">
          {nodeType === "capacity"      && <CapacityViz     data={activeData as unknown as CapacityNodeData}      nodeId={nodeId} />}
          {nodeType === "financial"     && <FinancialViz    data={activeData as unknown as FinancialNodeData}     nodeId={nodeId} />}
          {nodeType === "projectHealth" && <ProjectHealthViz data={activeData as unknown as ProjectHealthNodeData} nodeId={nodeId} />}
          {nodeType === "pipeline"      && <PipelineViz     data={activeData as unknown as PipelineNodeData}      nodeId={nodeId} />}
          {nodeType === "teamHealth"    && <TeamHealthViz   data={activeData as unknown as TeamHealthNodeData}    nodeId={nodeId} />}
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
