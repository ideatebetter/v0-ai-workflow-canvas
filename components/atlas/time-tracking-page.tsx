"use client";

import React, { useState, useMemo } from "react";

// ─── types ───────────────────────────────────────────────────────────────────

interface TimeEntry {
  projectId: string;
  projectName: string;
  clientName: string;
  category: "design" | "strategy" | "development" | "client" | "internal" | "admin";
  billable: boolean;
  hours: number;
  date: string; // YYYY-MM-DD
}

interface TeamMemberSummary {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar?: string;
  entries: TimeEntry[];
}

// ─── mock data ────────────────────────────────────────────────────────────────

function getWeekDates(offsetWeeks = 0): string[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const TEAM_DATA: TeamMemberSummary[] = [
  {
    id: "m1", name: "Alex Rivera", role: "Creative Director", color: "#3b82f6",
    entries: [
      { projectId: "p1", projectName: "Nike Brand Refresh", clientName: "Nike", category: "design", billable: true, hours: 4.5, date: "" },
      { projectId: "p1", projectName: "Nike Brand Refresh", clientName: "Nike", category: "client", billable: true, hours: 1.5, date: "" },
      { projectId: "p2", projectName: "Internal Design System", clientName: "Internal", category: "internal", billable: false, hours: 3, date: "" },
      { projectId: "p3", projectName: "Spotify Campaign", clientName: "Spotify", category: "strategy", billable: true, hours: 7, date: "" },
      { projectId: "p1", projectName: "Nike Brand Refresh", clientName: "Nike", category: "design", billable: true, hours: 6, date: "" },
      { projectId: "p4", projectName: "Admin / Ops", clientName: "Internal", category: "admin", billable: false, hours: 2, date: "" },
      { projectId: "p3", projectName: "Spotify Campaign", clientName: "Spotify", category: "design", billable: true, hours: 5, date: "" },
    ],
  },
  {
    id: "m2", name: "Jordan Kim", role: "Senior Designer", color: "#8b5cf6",
    entries: [
      { projectId: "p3", projectName: "Spotify Campaign", clientName: "Spotify", category: "design", billable: true, hours: 6, date: "" },
      { projectId: "p5", projectName: "Patagonia Social", clientName: "Patagonia", category: "design", billable: true, hours: 5, date: "" },
      { projectId: "p3", projectName: "Spotify Campaign", clientName: "Spotify", category: "client", billable: true, hours: 2, date: "" },
      { projectId: "p5", projectName: "Patagonia Social", clientName: "Patagonia", category: "design", billable: true, hours: 8, date: "" },
      { projectId: "p4", projectName: "Admin / Ops", clientName: "Internal", category: "admin", billable: false, hours: 1.5, date: "" },
      { projectId: "p5", projectName: "Patagonia Social", clientName: "Patagonia", category: "strategy", billable: true, hours: 4, date: "" },
      { projectId: "p6", projectName: "New Biz Pitch", clientName: "Internal", category: "internal", billable: false, hours: 3.5, date: "" },
    ],
  },
  {
    id: "m3", name: "Sam Torres", role: "Motion Designer", color: "#10b981",
    entries: [
      { projectId: "p1", projectName: "Nike Brand Refresh", clientName: "Nike", category: "design", billable: true, hours: 8, date: "" },
      { projectId: "p1", projectName: "Nike Brand Refresh", clientName: "Nike", category: "design", billable: true, hours: 7.5, date: "" },
      { projectId: "p4", projectName: "Admin / Ops", clientName: "Internal", category: "admin", billable: false, hours: 2, date: "" },
      { projectId: "p6", projectName: "New Biz Pitch", clientName: "Internal", category: "internal", billable: false, hours: 4, date: "" },
      { projectId: "p1", projectName: "Nike Brand Refresh", clientName: "Nike", category: "design", billable: true, hours: 6.5, date: "" },
      { projectId: "p7", projectName: "Bench / Learning", clientName: "Internal", category: "internal", billable: false, hours: 5, date: "" },
      { projectId: "p4", projectName: "Admin / Ops", clientName: "Internal", category: "admin", billable: false, hours: 1, date: "" },
    ],
  },
  {
    id: "m4", name: "Casey Morgan", role: "Strategist", color: "#f59e0b",
    entries: [
      { projectId: "p3", projectName: "Spotify Campaign", clientName: "Spotify", category: "strategy", billable: true, hours: 5, date: "" },
      { projectId: "p8", projectName: "Levi's Identity", clientName: "Levi's", category: "client", billable: true, hours: 3, date: "" },
      { projectId: "p8", projectName: "Levi's Identity", clientName: "Levi's", category: "strategy", billable: true, hours: 6, date: "" },
      { projectId: "p4", projectName: "Admin / Ops", clientName: "Internal", category: "admin", billable: false, hours: 3, date: "" },
      { projectId: "p3", projectName: "Spotify Campaign", clientName: "Spotify", category: "strategy", billable: true, hours: 4.5, date: "" },
      { projectId: "p8", projectName: "Levi's Identity", clientName: "Levi's", category: "strategy", billable: true, hours: 5.5, date: "" },
      { projectId: "p9", projectName: "Research Sprint", clientName: "Internal", category: "internal", billable: false, hours: 2, date: "" },
    ],
  },
  {
    id: "m5", name: "Riley Chen", role: "Designer", color: "#ec4899",
    entries: [
      { projectId: "p5", projectName: "Patagonia Social", clientName: "Patagonia", category: "design", billable: true, hours: 4, date: "" },
      { projectId: "p9", projectName: "Research Sprint", clientName: "Internal", category: "internal", billable: false, hours: 6, date: "" },
      { projectId: "p4", projectName: "Admin / Ops", clientName: "Internal", category: "admin", billable: false, hours: 2.5, date: "" },
      { projectId: "p5", projectName: "Patagonia Social", clientName: "Patagonia", category: "design", billable: true, hours: 5, date: "" },
      { projectId: "p6", projectName: "New Biz Pitch", clientName: "Internal", category: "internal", billable: false, hours: 4, date: "" },
      { projectId: "p7", projectName: "Bench / Learning", clientName: "Internal", category: "internal", billable: false, hours: 5.5, date: "" },
    ],
  },
];

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  design: "#3b82f6",
  strategy: "#8b5cf6",
  development: "#10b981",
  client: "#f59e0b",
  internal: "#6b7280",
  admin: "#475569",
};

const CATEGORY_LABELS: Record<string, string> = {
  design: "Design",
  strategy: "Strategy",
  development: "Dev",
  client: "Client",
  internal: "Internal",
  admin: "Admin",
};

const TARGET_HOURS_WEEK = 40;
const TARGET_BILLABLE_PCT = 75;

const font = { fontFamily: "system-ui, Inter, sans-serif" };

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcSummary(entries: TimeEntry[]) {
  const total = entries.reduce((a, e) => a + e.hours, 0);
  const billable = entries.filter(e => e.billable).reduce((a, e) => a + e.hours, 0);
  const billablePct = total > 0 ? Math.round((billable / total) * 100) : 0;
  const utilization = Math.round((total / TARGET_HOURS_WEEK) * 100);
  const byProject: Record<string, { name: string; client: string; hours: number; billable: boolean }> = {};
  for (const e of entries) {
    if (!byProject[e.projectId]) byProject[e.projectId] = { name: e.projectName, client: e.clientName, hours: 0, billable: e.billable };
    byProject[e.projectId].hours += e.hours;
  }
  const byCategory: Record<string, number> = {};
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.hours;
  }
  return { total, billable, billablePct, utilization, byProject, byCategory };
}

function StatusBadge({ utilization }: { utilization: number }) {
  const over = utilization > 100;
  const ok = utilization >= 70 && utilization <= 100;
  const low = utilization < 70;
  const [bg, text, label] = over
    ? ["#ef444420", "#ef4444", "Overloaded"]
    : ok
    ? ["#22c55e20", "#22c55e", "On Track"]
    : ["#f59e0b20", "#f59e0b", "Under Target"];
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: bg, color: text, ...font }}>
      {label}
    </span>
  );
}

// ─── member row ───────────────────────────────────────────────────────────────

function MemberRow({ member }: { member: TeamMemberSummary }) {
  const [expanded, setExpanded] = useState(false);
  const { total, billable, billablePct, utilization, byProject, byCategory } = useMemo(() => calcSummary(member.entries), [member]);
  const billableOk = billablePct >= TARGET_BILLABLE_PCT;
  const utilizationColor = utilization > 100 ? "#ef4444" : utilization >= 70 ? "#22c55e" : "#f59e0b";

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
      {/* Main row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
          style={{ backgroundColor: member.color, color: "#fff", ...font }}>
          {member.name.charAt(0)}
        </div>

        {/* Name + role */}
        <div className="flex-shrink-0 w-44">
          <div className="text-sm font-medium text-white" style={font}>{member.name}</div>
          <div className="text-xs text-gray-500 mt-0.5" style={font}>{member.role}</div>
        </div>

        {/* Utilization bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500" style={font}>{total}h / {TARGET_HOURS_WEEK}h</span>
            <span className="text-xs font-semibold" style={{ color: utilizationColor, ...font }}>{utilization}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#2a2a2a" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(utilization, 100)}%`, backgroundColor: utilizationColor }} />
          </div>
        </div>

        {/* Billable % */}
        <div className="w-24 text-right flex-shrink-0">
          <div className="text-sm font-semibold" style={{ color: billableOk ? "#22c55e" : "#f59e0b", ...font }}>{billablePct}%</div>
          <div className="text-xs text-gray-500 mt-0.5" style={font}>billable</div>
        </div>

        {/* Billable hours */}
        <div className="w-20 text-right flex-shrink-0">
          <div className="text-sm text-white" style={font}>{billable}h</div>
          <div className="text-xs text-gray-500 mt-0.5" style={font}>billed</div>
        </div>

        {/* Non-billable */}
        <div className="w-20 text-right flex-shrink-0">
          <div className="text-sm text-gray-400" style={font}>{(total - billable).toFixed(1)}h</div>
          <div className="text-xs text-gray-500 mt-0.5" style={font}>non-bill.</div>
        </div>

        {/* Status badge */}
        <div className="w-24 flex justify-end flex-shrink-0">
          <StatusBadge utilization={utilization} />
        </div>

        {/* Chevron */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
          className="flex-shrink-0 transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 pt-1" style={{ borderTop: "1px solid #2a2a2a" }}>
          <div className="grid grid-cols-2 gap-4 mt-3">
            {/* Project breakdown */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3" style={font}>By Project</div>
              <div className="space-y-2">
                {Object.values(byProject).sort((a, b) => b.hours - a.hours).map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.billable ? "#3b82f6" : "#475569" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300 truncate" style={font}>{p.name}</span>
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0" style={font}>{p.hours.toFixed(1)}h</span>
                      </div>
                      <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#2a2a2a" }}>
                        <div className="h-full rounded-full" style={{
                          width: `${(p.hours / total) * 100}%`,
                          backgroundColor: p.billable ? "#3b82f6" : "#475569"
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3" style={font}>By Category</div>
              <div className="space-y-2">
                {Object.entries(byCategory).sort(([, a], [, b]) => b - a).map(([cat, hrs]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#555" }} />
                    <span className="text-xs text-gray-300 flex-1" style={font}>{CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="text-xs text-gray-400" style={font}>{hrs.toFixed(1)}h</span>
                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#2a2a2a" }}>
                      <div className="h-full rounded-full" style={{ width: `${(hrs / total) * 100}%`, backgroundColor: CATEGORY_COLORS[cat] ?? "#555" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface TimeTrackingPageProps {
  members?: { id: string; name: string; role?: string; color?: string }[];
}

export function TimeTrackingPage({ members }: TimeTrackingPageProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const teamData = useMemo(() => {
    // When real data arrives, merge with `members` prop here
    return TEAM_DATA;
  }, [members]);

  const totals = useMemo(() => {
    const all = teamData.flatMap(m => m.entries);
    const totalHours = all.reduce((a, e) => a + e.hours, 0);
    const billableHours = all.filter(e => e.billable).reduce((a, e) => a + e.hours, 0);
    const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
    const avgUtil = Math.round(teamData.reduce((a, m) => {
      const t = m.entries.reduce((s, e) => s + e.hours, 0);
      return a + (t / TARGET_HOURS_WEEK) * 100;
    }, 0) / teamData.length);
    return { totalHours, billableHours, billablePct, avgUtil };
  }, [teamData]);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return "This Week";
    if (weekOffset === -1) return "Last Week";
    const start = new Date(weekDates[0]);
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " – " +
      new Date(weekDates[6]).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [weekOffset, weekDates]);

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#111111" }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-semibold text-xl" style={font}>Time Tracking</h1>
            <p className="text-gray-500 text-sm mt-1" style={font}>Manager view — team utilization and billable hours</p>
          </div>

          {/* Week nav + view toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg px-1 py-1" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              {(["week", "month"] as const).map(v => (
                <button key={v} type="button" onClick={() => setViewMode(v)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
                  style={{ backgroundColor: viewMode === v ? "#2a2a2a" : "transparent", color: viewMode === v ? "#fff" : "#666", ...font }}>
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <button type="button" onClick={() => setWeekOffset(o => o - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#888" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="text-sm text-gray-300 px-2 min-w-[100px] text-center" style={font}>{weekLabel}</span>
              <button type="button" onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: weekOffset === 0 ? "#333" : "#888" }} disabled={weekOffset === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Hours", value: `${totals.totalHours.toFixed(0)}h`, sub: `of ${teamData.length * TARGET_HOURS_WEEK}h target`, color: "#fff" },
            { label: "Billable Hours", value: `${totals.billableHours.toFixed(0)}h`, sub: `${totals.billablePct}% of total`, color: totals.billablePct >= TARGET_BILLABLE_PCT ? "#22c55e" : "#f59e0b" },
            { label: "Non-Billable", value: `${(totals.totalHours - totals.billableHours).toFixed(0)}h`, sub: `${100 - totals.billablePct}% of total`, color: "#6b7280" },
            { label: "Avg Utilization", value: `${totals.avgUtil}%`, sub: `target ≥${TARGET_BILLABLE_PCT}%`, color: totals.avgUtil >= TARGET_BILLABLE_PCT ? "#22c55e" : "#f59e0b" },
          ].map(card => (
            <div key={card.label} className="p-4 rounded-xl" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
              <div className="text-xs text-gray-500 mb-2" style={font}>{card.label}</div>
              <div className="text-2xl font-bold" style={{ color: card.color, ...font }}>{card.value}</div>
              <div className="text-xs text-gray-500 mt-1" style={font}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Billable vs non-billable stacked bar */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider" style={font}>Team Billable Mix</span>
            <div className="flex items-center gap-4 text-xs text-gray-400" style={font}>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#3b82f6" }} />Billable</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#2a2a2a" }} />Non-billable</span>
            </div>
          </div>
          <div className="space-y-2.5">
            {teamData.map(m => {
              const { total, billable, utilization } = calcSummary(m.entries);
              const utilizationColor = utilization > 100 ? "#ef4444" : utilization >= 70 ? "#22c55e" : "#f59e0b";
              const billablePct = total > 0 ? (billable / total) * 100 : 0;
              const maxHours = TARGET_HOURS_WEEK;
              const totalPct = Math.min((total / maxHours) * 100, 100);
              const billableBarPct = totalPct * (billablePct / 100);
              const nonBillableBarPct = totalPct - billableBarPct;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-gray-400 truncate flex-shrink-0" style={font}>{m.name.split(" ")[0]}</div>
                  <div className="flex-1 h-5 rounded-md overflow-hidden flex" style={{ backgroundColor: "#1a1a1a" }}>
                    <div className="h-full rounded-l-md transition-all" style={{ width: `${billableBarPct}%`, backgroundColor: "#3b82f6" }} />
                    <div className="h-full transition-all" style={{ width: `${nonBillableBarPct}%`, backgroundColor: "#2a2a2a" }} />
                  </div>
                  <div className="w-10 text-right text-xs flex-shrink-0" style={{ color: utilizationColor, ...font }}>{utilization}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-4 px-5 py-2 text-xs text-gray-500 uppercase tracking-wider" style={font}>
          <div className="w-9 flex-shrink-0" />
          <div className="w-44 flex-shrink-0">Member</div>
          <div className="flex-1">Utilization</div>
          <div className="w-24 text-right flex-shrink-0">Billable %</div>
          <div className="w-20 text-right flex-shrink-0">Billed</div>
          <div className="w-20 text-right flex-shrink-0">Non-bill.</div>
          <div className="w-24 text-right flex-shrink-0">Status</div>
          <div className="w-4 flex-shrink-0" />
        </div>

        {/* Member rows */}
        <div className="space-y-2">
          {teamData.map(m => <MemberRow key={m.id} member={m} />)}
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-600 text-center pb-2" style={font}>
          Data shown is for {weekLabel.toLowerCase()} · Target: {TARGET_HOURS_WEEK}h/week · {TARGET_BILLABLE_PCT}% billable
        </p>
      </div>
    </div>
  );
}
