"use client";

import React, { useState, useMemo } from "react";

// ─── types ───────────────────────────────────────────────────────────────────

interface TimeBlock {
  start: string;   // "9:04"
  end: string;     // "11:32"
  startMin: number; // minutes from midnight, for layout
  durationMin: number;
  project: string;
  projectId: string;
  phase: string;
  source: string;
  offline: boolean;
  billable: boolean;
}

interface DayLog {
  date: string; // YYYY-MM-DD
  submitted: boolean;
  submittedAt?: string;
  activeMinutes: number;
  blocks: TimeBlock[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
  logs: DayLog[];
}

// ─── project registry ─────────────────────────────────────────────────────────

const PROJECTS: Record<string, { name: string; client: string; color: string; billable: boolean }> = {
  nike:      { name: "Nike Running Project",  client: "Nike",     color: "#3a6bb5", billable: true },
  google:    { name: "Google Brand Sprint",   client: "Google",   color: "#2e8b57", billable: true },
  deloitte:  { name: "Deloitte Digital",      client: "Deloitte", color: "#c27030", billable: true },
  levis:     { name: "Levi's Identity",       client: "Levi's",   color: "#8b3a8b", billable: true },
  patagonia: { name: "Patagonia Social",      client: "Patagonia",color: "#2e6b4f", billable: true },
  internal:  { name: "Internal",              client: "—",        color: "#6b50a8", billable: false },
  admin:     { name: "Admin / Ops",           client: "—",        color: "#475569", billable: false },
  bench:     { name: "Bench / Learning",      client: "—",        color: "#64748b", billable: false },
};

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  "Visual Design":    { bg: "#fafee0", text: "#5a5a00" },
  "Visual Research":  { bg: "#e6f4ed", text: "#1a7a4a" },
  "Design Iteration": { bg: "#fafee0", text: "#5a5a00" },
  "Communications":   { bg: "#f0ecf8", text: "#4a2880" },
  "Concept Dev":      { bg: "#fff4e6", text: "#994400" },
  "Strategy":         { bg: "#f0ecf8", text: "#4a2880" },
  "Client Review":    { bg: "#fff4e6", text: "#994400" },
  "Team Sync":        { bg: "#e6f4ed", text: "#1a7a4a" },
  "Sketchbook":       { bg: "#f0ece4", text: "#6b5740" },
  "Research":         { bg: "#e6f4ed", text: "#1a7a4a" },
  "Admin":            { bg: "#f1f5f9", text: "#475569" },
};

// ─── mock data ────────────────────────────────────────────────────────────────

function makeBlocks(spec: [string, string, string, string, string, boolean][]) : TimeBlock[] {
  return spec.map(([start, end, pid, phase, source, billable]) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return {
      start, end, startMin,
      durationMin: endMin - startMin,
      project: PROJECTS[pid]?.name ?? pid,
      projectId: pid,
      phase, source,
      offline: source === "Offline",
      billable: billable && (PROJECTS[pid]?.billable ?? false),
    };
  });
}

function getWeekDates(offsetWeeks = 0): string[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function totalMinutes(blocks: TimeBlock[]) {
  return blocks.reduce((a, b) => a + b.durationMin, 0);
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Simulated submitted day logs for each team member
const TODAY = new Date().toISOString().slice(0, 10);
const WEEK = getWeekDates(0);

const TEAM_DATA: TeamMember[] = [
  {
    id: "m1", name: "Alex Rivera", role: "Creative Director", color: "#3b82f6",
    logs: [
      {
        date: WEEK[0], submitted: true, submittedAt: "6:34 PM", activeMinutes: 452,
        blocks: makeBlocks([
          ["9:04","9:44","nike","Communications","Slack",true],
          ["9:44","11:32","nike","Visual Design","Figma",true],
          ["11:32","12:04","google","Visual Research","Chrome",true],
          ["13:02","14:34","google","Visual Research","Chrome",true],
          ["14:34","16:02","google","Design Iteration","Figma",true],
          ["16:02","16:34","internal","Team Sync","Zoom",false],
          ["16:34","17:04","deloitte","Sketchbook","Offline",true],
          ["17:04","18:18","deloitte","Concept Dev","Figma",true],
        ]),
      },
      {
        date: WEEK[1], submitted: true, submittedAt: "5:58 PM", activeMinutes: 430,
        blocks: makeBlocks([
          ["9:00","10:30","nike","Visual Design","Figma",true],
          ["10:30","12:00","google","Design Iteration","Figma",true],
          ["13:00","15:00","google","Client Review","Zoom",true],
          ["15:00","16:30","deloitte","Concept Dev","Figma",true],
          ["16:30","17:10","internal","Admin","Notion",false],
        ]),
      },
      {
        date: WEEK[2], submitted: true, submittedAt: "6:10 PM", activeMinutes: 390,
        blocks: makeBlocks([
          ["9:30","11:00","nike","Visual Design","Figma",true],
          ["11:00","12:30","google","Strategy","Miro",true],
          ["13:30","15:30","deloitte","Visual Research","Chrome",true],
          ["15:30","17:00","admin","Admin","Notion",false],
        ]),
      },
      {
        date: WEEK[3], submitted: false, activeMinutes: 0, blocks: [] },
      {
        date: WEEK[4], submitted: false, activeMinutes: 0, blocks: [] },
    ],
  },
  {
    id: "m2", name: "Jordan Kim", role: "Senior Designer", color: "#8b5cf6",
    logs: [
      {
        date: WEEK[0], submitted: true, submittedAt: "5:47 PM", activeMinutes: 480,
        blocks: makeBlocks([
          ["9:00","11:00","patagonia","Visual Design","Figma",true],
          ["11:00","12:00","patagonia","Client Review","Zoom",true],
          ["13:00","15:30","google","Design Iteration","Figma",true],
          ["15:30","17:00","patagonia","Visual Design","Figma",true],
          ["17:00","17:30","internal","Team Sync","Slack",false],
        ]),
      },
      {
        date: WEEK[1], submitted: true, submittedAt: "6:02 PM", activeMinutes: 455,
        blocks: makeBlocks([
          ["9:00","11:30","patagonia","Visual Design","Figma",true],
          ["11:30","12:30","google","Visual Research","Chrome",true],
          ["13:30","16:00","google","Design Iteration","Figma",true],
          ["16:00","17:35","patagonia","Concept Dev","Figma",true],
        ]),
      },
      {
        date: WEEK[2], submitted: true, submittedAt: "5:30 PM", activeMinutes: 390,
        blocks: makeBlocks([
          ["9:00","12:00","bench","Research","Chrome",false],
          ["13:00","15:00","patagonia","Visual Design","Figma",true],
          ["15:00","16:30","internal","Admin","Notion",false],
        ]),
      },
      { date: WEEK[3], submitted: false, activeMinutes: 0, blocks: [] },
      { date: WEEK[4], submitted: false, activeMinutes: 0, blocks: [] },
    ],
  },
  {
    id: "m3", name: "Sam Torres", role: "Motion Designer", color: "#10b981",
    logs: [
      {
        date: WEEK[0], submitted: true, submittedAt: "7:12 PM", activeMinutes: 510,
        blocks: makeBlocks([
          ["9:00","12:00","nike","Visual Design","After Effects",true],
          ["13:00","15:30","nike","Concept Dev","Figma",true],
          ["15:30","17:00","bench","Research","Chrome",false],
          ["17:00","18:00","admin","Admin","Notion",false],
        ]),
      },
      {
        date: WEEK[1], submitted: true, submittedAt: "6:45 PM", activeMinutes: 465,
        blocks: makeBlocks([
          ["9:00","12:00","nike","Visual Design","After Effects",true],
          ["13:00","16:00","nike","Design Iteration","After Effects",true],
          ["16:00","17:45","bench","Research","Chrome",false],
        ]),
      },
      {
        date: WEEK[2], submitted: true, submittedAt: "5:55 PM", activeMinutes: 390,
        blocks: makeBlocks([
          ["9:30","12:00","nike","Concept Dev","Figma",true],
          ["13:00","15:00","nike","Visual Design","After Effects",true],
          ["15:00","16:30","admin","Admin","Notion",false],
        ]),
      },
      { date: WEEK[3], submitted: false, activeMinutes: 0, blocks: [] },
      { date: WEEK[4], submitted: false, activeMinutes: 0, blocks: [] },
    ],
  },
  {
    id: "m4", name: "Casey Morgan", role: "Strategist", color: "#f59e0b",
    logs: [
      {
        date: WEEK[0], submitted: true, submittedAt: "5:30 PM", activeMinutes: 440,
        blocks: makeBlocks([
          ["9:00","11:00","google","Strategy","Notion",true],
          ["11:00","12:00","levis","Communications","Zoom",true],
          ["13:00","15:00","levis","Strategy","Notion",true],
          ["15:00","16:30","google","Research","Chrome",true],
          ["16:30","17:10","admin","Admin","Slack",false],
        ]),
      },
      {
        date: WEEK[1], submitted: true, submittedAt: "6:00 PM", activeMinutes: 450,
        blocks: makeBlocks([
          ["9:00","11:30","levis","Strategy","Notion",true],
          ["11:30","12:30","levis","Client Review","Zoom",true],
          ["13:30","16:00","google","Strategy","Notion",true],
          ["16:00","17:30","internal","Team Sync","Slack",false],
        ]),
      },
      {
        date: WEEK[2], submitted: false, submittedAt: undefined, activeMinutes: 0,
        blocks: [],
      },
      { date: WEEK[3], submitted: false, activeMinutes: 0, blocks: [] },
      { date: WEEK[4], submitted: false, activeMinutes: 0, blocks: [] },
    ],
  },
  {
    id: "m5", name: "Riley Chen", role: "Designer", color: "#ec4899",
    logs: [
      {
        date: WEEK[0], submitted: true, submittedAt: "5:15 PM", activeMinutes: 390,
        blocks: makeBlocks([
          ["9:00","11:00","patagonia","Visual Design","Figma",true],
          ["11:00","12:00","bench","Research","Chrome",false],
          ["13:00","15:00","patagonia","Design Iteration","Figma",true],
          ["15:00","16:30","internal","Team Sync","Zoom",false],
        ]),
      },
      {
        date: WEEK[1], submitted: true, submittedAt: "6:20 PM", activeMinutes: 420,
        blocks: makeBlocks([
          ["9:00","12:00","patagonia","Visual Design","Figma",true],
          ["13:00","15:00","bench","Research","Chrome",false],
          ["15:00","17:00","patagonia","Concept Dev","Figma",true],
        ]),
      },
      {
        date: WEEK[2], submitted: false, activeMinutes: 0, blocks: [],
      },
      { date: WEEK[3], submitted: false, activeMinutes: 0, blocks: [] },
      { date: WEEK[4], submitted: false, activeMinutes: 0, blocks: [] },
    ],
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

const DAY_START = 8 * 60;  // 8:00 AM
const DAY_END   = 19 * 60; // 7:00 PM
const DAY_SPAN  = DAY_END - DAY_START;

const font = { fontFamily: "system-ui, Inter, sans-serif" };

function MiniTimeline({ blocks }: { blocks: TimeBlock[] }) {
  return (
    <div className="flex h-5 rounded overflow-hidden w-full" style={{ backgroundColor: "#1e1e1e" }}>
      {blocks.map((b, i) => {
        const left  = Math.max(0, (b.startMin - DAY_START) / DAY_SPAN) * 100;
        const width = Math.min(100 - left, (b.durationMin / DAY_SPAN) * 100);
        const proj  = PROJECTS[b.projectId];
        return (
          <div key={i} title={`${b.project} · ${b.phase} · ${fmtDuration(b.durationMin)}`}
            style={{
              position: "absolute",
              left: `${left}%`,
              width: `${width}%`,
              height: "100%",
              backgroundColor: proj?.color ?? "#555",
              opacity: b.billable ? 1 : 0.45,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── project breakdown pills ──────────────────────────────────────────────────

function ProjectBreakdown({ blocks }: { blocks: TimeBlock[] }) {
  const byProject: Record<string, { color: string; min: number; billable: boolean }> = {};
  for (const b of blocks) {
    if (!byProject[b.projectId]) byProject[b.projectId] = { color: PROJECTS[b.projectId]?.color ?? "#555", min: 0, billable: PROJECTS[b.projectId]?.billable ?? false };
    byProject[b.projectId].min += b.durationMin;
  }
  const total = totalMinutes(blocks);
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Object.entries(byProject).sort(([,a],[,b]) => b.min - a.min).map(([pid, p]) => (
        <div key={pid} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
          style={{ backgroundColor: `${p.color}22`, border: `1px solid ${p.color}44`, color: p.color, ...font }}>
          <span>{fmtDuration(p.min)}</span>
          <span style={{ opacity: 0.7 }}>· {PROJECTS[pid]?.name?.split(" ")[0] ?? pid}</span>
          {!p.billable && <span className="opacity-50">NB</span>}
        </div>
      ))}
    </div>
  );
}

// ─── expanded day detail ──────────────────────────────────────────────────────

function DayDetail({ log }: { log: DayLog }) {
  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
      {/* Mini visual timeline */}
      <div className="px-4 py-3" style={{ backgroundColor: "#111" }}>
        <div className="flex justify-between text-[10px] text-gray-600 mb-1.5" style={font}>
          {["8am","10am","12pm","2pm","4pm","6pm"].map(l => <span key={l}>{l}</span>)}
        </div>
        <div className="relative h-6 rounded overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
          {log.blocks.map((b, i) => {
            const left  = Math.max(0, (b.startMin - DAY_START) / DAY_SPAN) * 100;
            const width = Math.min(100 - left, (b.durationMin / DAY_SPAN) * 100);
            return (
              <div key={i} title={`${b.project} · ${b.phase}`}
                style={{
                  position: "absolute", left: `${left}%`, width: `${Math.max(width, 0.5)}%`,
                  height: "100%",
                  backgroundColor: PROJECTS[b.projectId]?.color ?? "#555",
                  opacity: b.billable ? 1 : 0.4,
                  borderRight: "1px solid rgba(0,0,0,0.3)",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Block list */}
      <div style={{ backgroundColor: "#0d0d0d" }}>
        {log.blocks.map((b, i) => {
          const proj = PROJECTS[b.projectId];
          const phase = PHASE_COLORS[b.phase];
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderTop: i === 0 ? "none" : "1px solid #1a1a1a" }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: proj?.color ?? "#555" }} />
              <span className="text-xs text-gray-400 w-28 flex-shrink-0 tabular-nums" style={font}>
                {b.start} – {b.end}
              </span>
              <span className="text-xs text-white flex-1 truncate" style={font}>{b.project}</span>
              <span className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{
                backgroundColor: phase?.bg ? `${phase.bg}18` : "#2a2a2a",
                color: phase?.text ?? "#888",
                border: `1px solid ${phase?.bg ? `${phase.bg}30` : "#333"}`,
                ...font
              }}>
                {b.phase}
              </span>
              <span className="text-xs text-gray-500 w-12 text-right flex-shrink-0" style={font}>
                {fmtDuration(b.durationMin)}
              </span>
              {b.offline && (
                <span className="text-[10px] text-amber-600 bg-amber-900/20 border border-amber-800/30 px-1.5 py-0.5 rounded flex-shrink-0" style={font}>
                  offline
                </span>
              )}
              {!b.billable && !b.offline && (
                <span className="text-[10px] text-gray-600 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded flex-shrink-0" style={font}>NB</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── member card ──────────────────────────────────────────────────────────────

function MemberCard({ member, weekDates }: { member: TeamMember; weekDates: string[] }) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const weekLogs = useMemo(() =>
    weekDates.map(d => member.logs.find(l => l.date === d) ?? { date: d, submitted: false, activeMinutes: 0, blocks: [] }),
    [member, weekDates]
  );

  const weeklyTotal = useMemo(() =>
    weekLogs.reduce((a, l) => a + totalMinutes(l.blocks), 0), [weekLogs]);

  const weeklyBillable = useMemo(() =>
    weekLogs.reduce((a, l) => a + l.blocks.filter(b => b.billable).reduce((s, b) => s + b.durationMin, 0), 0),
    [weekLogs]);

  const submittedCount = weekLogs.filter(l => l.submitted).length;
  const billablePct = weeklyTotal > 0 ? Math.round((weeklyBillable / weeklyTotal) * 100) : 0;
  const utilization = Math.round((weeklyTotal / 60 / 40) * 100);
  const utilizationColor = utilization > 100 ? "#ef4444" : utilization >= 70 ? "#22c55e" : "#f59e0b";

  const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri"];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
      {/* Member header */}
      <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: member.color, color: "#fff", ...font }}>
          {member.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm" style={font}>{member.name}</div>
          <div className="text-xs text-gray-500 mt-0.5" style={font}>{member.role}</div>
        </div>
        {/* Weekly stats */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5" style={font}>Week total</div>
            <div className="text-sm font-semibold text-white" style={font}>{fmtDuration(weeklyTotal)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5" style={font}>Billable</div>
            <div className="text-sm font-semibold" style={{ color: billablePct >= 75 ? "#22c55e" : "#f59e0b", ...font }}>{billablePct}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5" style={font}>Utilization</div>
            <div className="text-sm font-semibold" style={{ color: utilizationColor, ...font }}>{utilization}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5" style={font}>Submitted</div>
            <div className="text-sm font-semibold text-white" style={font}>{submittedCount}/5 days</div>
          </div>
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-5" style={{ borderBottom: "1px solid #1e1e1e" }}>
        {weekLogs.map((log, i) => {
          const mins = totalMinutes(log.blocks);
          const billableMins = log.blocks.filter(b => b.billable).reduce((a, b) => a + b.durationMin, 0);
          const isExpanded = expandedDay === log.date;
          const isToday = log.date === TODAY;

          return (
            <button
              key={log.date}
              type="button"
              onClick={() => setExpandedDay(isExpanded ? null : log.date)}
              className="flex flex-col gap-2 p-3 text-left transition-colors hover:bg-white/[0.02]"
              style={{
                borderRight: i < 4 ? "1px solid #1e1e1e" : "none",
                backgroundColor: isExpanded ? "#1a1a1a" : isToday ? "#141f14" : "transparent",
              }}
            >
              {/* Day label + status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: isToday ? "#22c55e" : "#888", ...font }}>
                  {DAY_LABELS[i]}
                  {isToday && <span className="ml-1 text-[10px]">· today</span>}
                </span>
                {log.submitted ? (
                  <span className="text-[10px] text-green-500" style={font}>✓</span>
                ) : mins > 0 ? (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                ) : null}
              </div>

              {/* Hours */}
              {mins > 0 ? (
                <>
                  <div className="text-sm font-semibold text-white" style={font}>{fmtDuration(mins)}</div>

                  {/* Mini stacked bar: billable vs non-billable */}
                  <div className="flex h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#2a2a2a" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, (billableMins / (40 / 5 * 60)) * 100)}%`,
                      backgroundColor: member.color,
                    }} />
                  </div>

                  {/* Project color strip */}
                  <div className="relative h-3 rounded overflow-hidden w-full" style={{ backgroundColor: "#1e1e1e" }}>
                    {log.blocks.map((b, bi) => {
                      const l = Math.max(0, (b.startMin - DAY_START) / DAY_SPAN) * 100;
                      const w = Math.min(100 - l, (b.durationMin / DAY_SPAN) * 100);
                      return (
                        <div key={bi} style={{
                          position: "absolute", left: `${l}%`, width: `${Math.max(w, 0.5)}%`,
                          height: "100%",
                          backgroundColor: PROJECTS[b.projectId]?.color ?? "#555",
                          opacity: b.billable ? 1 : 0.35,
                        }} />
                      );
                    })}
                  </div>

                  {/* Submitted time */}
                  {log.submitted && log.submittedAt && (
                    <span className="text-[10px] text-gray-600" style={font}>Submitted {log.submittedAt}</span>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-700 mt-1" style={font}>
                  {i < new Date().getDay() - 1 ? "No data" : "—"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded day detail */}
      {expandedDay && (() => {
        const log = weekLogs.find(l => l.date === expandedDay);
        if (!log || log.blocks.length === 0) return null;
        const dayIdx = weekDates.indexOf(expandedDay);
        return (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between pt-3 pb-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider" style={font}>
                {DAY_LABELS[dayIdx]} · {new Date(expandedDay).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <div className="flex items-center gap-3 text-xs text-gray-500" style={font}>
                <span>{fmtDuration(totalMinutes(log.blocks))} total</span>
                <span style={{ color: "#22c55e" }}>{fmtDuration(log.blocks.filter(b => b.billable).reduce((a, b) => a + b.durationMin, 0))} billable</span>
              </div>
            </div>
            <DayDetail log={log} />
          </div>
        );
      })()}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

interface TimeTrackingPageProps {
  members?: { id: string; name: string; role?: string; color?: string }[];
}

export function TimeTrackingPage({ members: _members }: TimeTrackingPageProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return "This Week";
    if (weekOffset === -1) return "Last Week";
    const start = new Date(weekDates[0]);
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      + " – " + new Date(weekDates[4]).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [weekOffset, weekDates]);

  // Aggregate team totals
  const totals = useMemo(() => {
    let totalMin = 0, billableMin = 0, submittedDays = 0, totalDays = 0;
    for (const m of TEAM_DATA) {
      for (const d of weekDates) {
        const log = m.logs.find(l => l.date === d);
        totalDays++;
        if (log?.submitted) submittedDays++;
        const mins = log ? totalMinutes(log.blocks) : 0;
        totalMin += mins;
        billableMin += log ? log.blocks.filter(b => b.billable).reduce((a, b) => a + b.durationMin, 0) : 0;
      }
    }
    const billablePct = totalMin > 0 ? Math.round((billableMin / totalMin) * 100) : 0;
    const avgUtil = Math.round((totalMin / 60 / (TEAM_DATA.length * 40)) * 100);
    return { totalMin, billableMin, billablePct, avgUtil, submittedDays, totalDays };
  }, [weekDates]);

  const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri"];

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#111111" }}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-semibold text-xl" style={font}>Time Tracking</h1>
            <p className="text-gray-500 text-sm mt-0.5" style={font}>Manager view — submitted hours by team member</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
              <button type="button" onClick={() => setWeekOffset(o => o - 1)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: "#888" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="text-sm text-gray-300 px-3 border-x" style={{ borderColor: "#2a2a2a", ...font }}>{weekLabel}</span>
              <button type="button" onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
                disabled={weekOffset === 0}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 transition-colors"
                style={{ color: weekOffset === 0 ? "#333" : "#888" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Hours", value: fmtDuration(totals.totalMin), sub: `${TEAM_DATA.length} team members`, color: "#fff" },
            { label: "Billable Hours", value: fmtDuration(totals.billableMin), sub: `${totals.billablePct}% of total`, color: totals.billablePct >= 75 ? "#22c55e" : "#f59e0b" },
            { label: "Avg Utilization", value: `${totals.avgUtil}%`, sub: "vs 100% target", color: totals.avgUtil >= 75 ? "#22c55e" : "#f59e0b" },
            { label: "Days Submitted", value: `${totals.submittedDays}/${totals.totalDays}`, sub: "this week", color: totals.submittedDays === totals.totalDays ? "#22c55e" : "#fff" },
          ].map(c => (
            <div key={c.label} className="p-4 rounded-xl" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
              <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider" style={font}>{c.label}</div>
              <div className="text-2xl font-bold" style={{ color: c.color, ...font }}>{c.value}</div>
              <div className="text-xs text-gray-600 mt-1" style={font}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Project legend */}
        <div className="flex flex-wrap items-center gap-3 px-1">
          {Object.entries(PROJECTS).filter(([,p]) => p.billable).map(([id, p]) => (
            <div key={id} className="flex items-center gap-1.5 text-xs text-gray-500" style={font}>
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
              {p.name.split(" ")[0]}
            </div>
          ))}
          <div className="w-px h-3 bg-gray-700 mx-1" />
          {Object.entries(PROJECTS).filter(([,p]) => !p.billable).map(([id, p]) => (
            <div key={id} className="flex items-center gap-1.5 text-xs text-gray-600" style={font}>
              <div className="w-2.5 h-2.5 rounded-sm opacity-40" style={{ backgroundColor: p.color }} />
              {p.name.split(" ")[0]}
            </div>
          ))}
          <span className="text-xs text-gray-700 ml-1" style={font}>· faded = non-billable</span>
        </div>

        {/* Day column headers */}
        <div className="grid grid-cols-5 gap-0 ml-[240px]">
          {DAY_LABELS.map((d, i) => {
            const isToday = weekDates[i] === TODAY;
            return (
              <div key={d} className="text-center text-xs font-medium pb-1"
                style={{ color: isToday ? "#22c55e" : "#555", ...font }}>
                {d}
              </div>
            );
          })}
        </div>

        {/* Member cards */}
        <div className="space-y-3">
          {TEAM_DATA.map(m => (
            <MemberCard key={m.id} member={m} weekDates={weekDates} />
          ))}
        </div>

        <p className="text-xs text-gray-700 text-center pb-4" style={font}>
          Click any day cell to see the full submitted breakdown · Faded bars = non-billable time
        </p>
      </div>
    </div>
  );
}
