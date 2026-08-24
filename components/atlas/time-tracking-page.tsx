"use client";

import React, { useState, useMemo, useRef } from "react";

// ─── types ───────────────────────────────────────────────────────────────────

interface TimeBlock {
  start: string;
  end: string;
  startMin: number;
  durationMin: number;
  projectId: string;
  phase: string;
  source: string;
  offline: boolean;
}

interface DayLog {
  date: string;
  submitted: boolean;
  submittedAt?: string;
  blocks: TimeBlock[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
  logs: DayLog[];
}

interface ProjectBudget {
  id: string;
  name: string;
  client: string;
  color: string;
  budgetHours: number;        // total hours allocated
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  margin: number;             // profit margin %
}

// ─── project registry ─────────────────────────────────────────────────────────

const PROJECTS: Record<string, { name: string; client: string; color: string }> = {
  nike:      { name: "Nike Running Project", client: "Nike",      color: "#3a6bb5" },
  google:    { name: "Google Brand Sprint",  client: "Google",    color: "#2e8b57" },
  deloitte:  { name: "Deloitte Digital",     client: "Deloitte",  color: "#c27030" },
  levis:     { name: "Levi's Identity",      client: "Levi's",    color: "#8b3a8b" },
  patagonia: { name: "Patagonia Social",     client: "Patagonia", color: "#2e6b4f" },
  internal:  { name: "Internal",             client: "—",         color: "#6b50a8" },
  admin:     { name: "Admin / Ops",          client: "—",         color: "#475569" },
  bench:     { name: "Bench / Learning",     client: "—",         color: "#64748b" },
};

// Active client projects with budgets and margins
const PROJECT_BUDGETS: ProjectBudget[] = [
  { id: "nike",      name: "Nike Running Project", client: "Nike",      color: "#3a6bb5", budgetHours: 120, startDate: "2026-05-01", endDate: "2026-07-15", margin: 38 },
  { id: "google",    name: "Google Brand Sprint",  client: "Google",    color: "#2e8b57", budgetHours: 80,  startDate: "2026-05-15", endDate: "2026-06-30", margin: 44 },
  { id: "deloitte",  name: "Deloitte Digital",     client: "Deloitte",  color: "#c27030", budgetHours: 60,  startDate: "2026-06-01", endDate: "2026-07-01", margin: 29 },
  { id: "levis",     name: "Levi's Identity",      client: "Levi's",    color: "#8b3a8b", budgetHours: 90,  startDate: "2026-04-15", endDate: "2026-07-31", margin: 41 },
  { id: "patagonia", name: "Patagonia Social",     client: "Patagonia", color: "#2e6b4f", budgetHours: 50,  startDate: "2026-05-20", endDate: "2026-06-25", margin: 35 },
];

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  "Visual Design":    { bg: "#fafee018", text: "#b8b400" },
  "Visual Research":  { bg: "#e6f4ed18", text: "#22c55e" },
  "Design Iteration": { bg: "#fafee018", text: "#b8b400" },
  "Communications":   { bg: "#f0ecf818", text: "#a78bfa" },
  "Concept Dev":      { bg: "#fff4e618", text: "#f59e0b" },
  "Strategy":         { bg: "#f0ecf818", text: "#a78bfa" },
  "Client Review":    { bg: "#fff4e618", text: "#f59e0b" },
  "Team Sync":        { bg: "#e6f4ed18", text: "#22c55e" },
  "Sketchbook":       { bg: "#f0ece418", text: "#a8845a" },
  "Research":         { bg: "#e6f4ed18", text: "#22c55e" },
  "Admin":            { bg: "#1e293b",   text: "#64748b" },
};

// ─── mock time data ───────────────────────────────────────────────────────────

function makeBlocks(spec: [string, string, string, string, string][]) : TimeBlock[] {
  return spec.map(([start, end, pid, phase, source]) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    return {
      start, end, startMin,
      durationMin: (eh * 60 + em) - startMin,
      projectId: pid, phase, source,
      offline: source === "Offline",
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

const TODAY     = new Date().toISOString().slice(0, 10);
const WEEK      = getWeekDates(0);
const LAST_WEEK = getWeekDates(-1);

const TEAM_DATA: TeamMember[] = [
  {
    id: "m1", name: "Alex Rivera", role: "Creative Director", color: "#3b82f6",
    logs: [
      // ── last week (51h — burnout risk demo) ──
      { date: LAST_WEEK[0], submitted: true, submittedAt: "7:30 PM", blocks: makeBlocks([
        ["8:00","10:30","nike","Visual Design","Figma"],
        ["10:30","12:30","google","Strategy","Miro"],
        ["13:00","15:00","levis","Communications","Zoom"],
        ["15:00","17:30","google","Design Iteration","Figma"],
        ["17:30","19:00","nike","Concept Dev","Figma"],
      ])},
      { date: LAST_WEEK[1], submitted: true, submittedAt: "7:00 PM", blocks: makeBlocks([
        ["8:30","11:00","nike","Visual Design","Figma"],
        ["11:00","12:30","deloitte","Visual Research","Chrome"],
        ["13:00","15:30","google","Design Iteration","Figma"],
        ["15:30","18:00","internal","Team Sync","Zoom"],
      ])},
      { date: LAST_WEEK[2], submitted: true, submittedAt: "6:30 PM", blocks: makeBlocks([
        ["9:00","11:30","levis","Strategy","Notion"],
        ["11:30","12:30","nike","Client Review","Zoom"],
        ["13:30","16:00","nike","Visual Design","Figma"],
        ["16:00","17:30","deloitte","Concept Dev","Figma"],
      ])},
      { date: LAST_WEEK[3], submitted: true, submittedAt: "7:15 PM", blocks: makeBlocks([
        ["8:30","11:00","google","Visual Research","Chrome"],
        ["11:00","12:00","internal","Admin","Notion"],
        ["13:00","15:30","nike","Visual Design","Figma"],
        ["15:30","18:00","levis","Design Iteration","Figma"],
      ])},
      { date: LAST_WEEK[4], submitted: true, submittedAt: "6:30 PM", blocks: makeBlocks([
        ["9:00","11:30","deloitte","Concept Dev","Figma"],
        ["11:30","12:30","nike","Communications","Slack"],
        ["13:30","16:00","google","Strategy","Miro"],
        ["16:00","18:00","admin","Admin","Notion"],
      ])},
      // ── this week ──
      { date: WEEK[0], submitted: true, submittedAt: "6:34 PM", blocks: makeBlocks([
        ["9:04","9:44","nike","Communications","Slack"],
        ["9:44","11:32","nike","Visual Design","Figma"],
        ["11:32","12:04","google","Visual Research","Chrome"],
        ["13:02","14:34","google","Visual Research","Chrome"],
        ["14:34","16:02","google","Design Iteration","Figma"],
        ["16:02","16:34","internal","Team Sync","Zoom"],
        ["16:34","17:04","deloitte","Sketchbook","Offline"],
        ["17:04","18:18","deloitte","Concept Dev","Figma"],
      ])},
      { date: WEEK[1], submitted: true, submittedAt: "5:58 PM", blocks: makeBlocks([
        ["9:00","10:30","nike","Visual Design","Figma"],
        ["10:30","12:00","google","Design Iteration","Figma"],
        ["13:00","15:00","google","Client Review","Zoom"],
        ["15:00","16:30","deloitte","Concept Dev","Figma"],
        ["16:30","17:10","internal","Admin","Notion"],
      ])},
      { date: WEEK[2], submitted: true, submittedAt: "6:10 PM", blocks: makeBlocks([
        ["9:30","11:00","nike","Visual Design","Figma"],
        ["11:00","12:30","google","Strategy","Miro"],
        ["13:30","15:30","deloitte","Visual Research","Chrome"],
        ["15:30","17:00","admin","Admin","Notion"],
      ])},
      { date: WEEK[3], submitted: false, blocks: [] },
      { date: WEEK[4], submitted: false, blocks: [] },
    ],
  },
  {
    id: "m2", name: "Jordan Kim", role: "Senior Designer", color: "#8b5cf6",
    logs: [
      // ── last week ──
      { date: LAST_WEEK[0], submitted: true, submittedAt: "5:30 PM", blocks: makeBlocks([
        ["9:00","11:30","patagonia","Visual Design","Figma"],
        ["11:30","12:30","google","Visual Research","Chrome"],
        ["13:30","16:00","patagonia","Design Iteration","Figma"],
        ["16:00","17:00","internal","Team Sync","Slack"],
      ])},
      { date: LAST_WEEK[1], submitted: true, submittedAt: "6:15 PM", blocks: makeBlocks([
        ["9:00","12:00","patagonia","Visual Design","Figma"],
        ["13:00","15:00","google","Design Iteration","Figma"],
        ["15:00","17:30","patagonia","Concept Dev","Figma"],
      ])},
      { date: LAST_WEEK[2], submitted: true, submittedAt: "5:55 PM", blocks: makeBlocks([
        ["9:00","11:00","levis","Visual Research","Chrome"],
        ["11:00","12:30","patagonia","Client Review","Zoom"],
        ["13:30","16:00","patagonia","Visual Design","Figma"],
        ["16:00","17:00","admin","Admin","Notion"],
      ])},
      { date: LAST_WEEK[3], submitted: true, submittedAt: "6:00 PM", blocks: makeBlocks([
        ["9:00","11:30","google","Design Iteration","Figma"],
        ["11:30","12:30","patagonia","Communications","Slack"],
        ["13:30","15:30","patagonia","Visual Design","Figma"],
        ["15:30","17:00","bench","Research","Chrome"],
      ])},
      { date: LAST_WEEK[4], submitted: true, submittedAt: "5:10 PM", blocks: makeBlocks([
        ["9:00","12:00","patagonia","Concept Dev","Figma"],
        ["13:00","14:30","internal","Team Sync","Zoom"],
        ["14:30","16:30","google","Visual Research","Chrome"],
      ])},
      // ── this week ──
      { date: WEEK[0], submitted: true, submittedAt: "5:47 PM", blocks: makeBlocks([
        ["9:00","11:00","patagonia","Visual Design","Figma"],
        ["11:00","12:00","patagonia","Client Review","Zoom"],
        ["13:00","15:30","google","Design Iteration","Figma"],
        ["15:30","17:00","patagonia","Visual Design","Figma"],
        ["17:00","17:30","internal","Team Sync","Slack"],
      ])},
      { date: WEEK[1], submitted: true, submittedAt: "6:02 PM", blocks: makeBlocks([
        ["9:00","11:30","patagonia","Visual Design","Figma"],
        ["11:30","12:30","google","Visual Research","Chrome"],
        ["13:30","16:00","google","Design Iteration","Figma"],
        ["16:00","17:35","patagonia","Concept Dev","Figma"],
      ])},
      { date: WEEK[2], submitted: true, submittedAt: "5:30 PM", blocks: makeBlocks([
        ["9:00","12:00","bench","Research","Chrome"],
        ["13:00","15:00","patagonia","Visual Design","Figma"],
        ["15:00","16:30","internal","Admin","Notion"],
      ])},
      { date: WEEK[3], submitted: false, blocks: [] },
      { date: WEEK[4], submitted: false, blocks: [] },
    ],
  },
  {
    id: "m3", name: "Sam Torres", role: "Motion Designer", color: "#10b981",
    logs: [
      // ── last week ──
      { date: LAST_WEEK[0], submitted: true, submittedAt: "7:00 PM", blocks: makeBlocks([
        ["9:00","12:30","nike","Visual Design","After Effects"],
        ["13:30","16:00","nike","Concept Dev","Figma"],
        ["16:00","18:00","deloitte","Visual Design","After Effects"],
      ])},
      { date: LAST_WEEK[1], submitted: true, submittedAt: "6:50 PM", blocks: makeBlocks([
        ["9:00","12:00","nike","Design Iteration","After Effects"],
        ["13:00","15:00","deloitte","Motion Research","After Effects"],
        ["15:00","17:30","nike","Visual Design","After Effects"],
      ])},
      { date: LAST_WEEK[2], submitted: true, submittedAt: "6:05 PM", blocks: makeBlocks([
        ["9:00","11:30","deloitte","Concept Dev","Figma"],
        ["11:30","12:30","nike","Communications","Slack"],
        ["13:30","16:00","nike","Visual Design","After Effects"],
        ["16:00","17:00","admin","Admin","Notion"],
      ])},
      { date: LAST_WEEK[3], submitted: true, submittedAt: "5:45 PM", blocks: makeBlocks([
        ["9:00","12:00","nike","Visual Design","After Effects"],
        ["13:00","15:00","deloitte","Design Iteration","Figma"],
        ["15:00","16:30","bench","Research","Chrome"],
      ])},
      { date: LAST_WEEK[4], submitted: true, submittedAt: "4:30 PM", blocks: makeBlocks([
        ["9:00","11:30","nike","Concept Dev","Figma"],
        ["11:30","12:00","internal","Team Sync","Zoom"],
        ["13:00","15:00","nike","Visual Design","After Effects"],
      ])},
      // ── this week ──
      { date: WEEK[0], submitted: true, submittedAt: "7:12 PM", blocks: makeBlocks([
        ["9:00","12:00","nike","Visual Design","After Effects"],
        ["13:00","15:30","nike","Concept Dev","Figma"],
        ["15:30","17:00","deloitte","Motion Design","After Effects"],
        ["17:00","18:00","admin","Admin","Notion"],
      ])},
      { date: WEEK[1], submitted: true, submittedAt: "6:45 PM", blocks: makeBlocks([
        ["9:00","12:00","nike","Visual Design","After Effects"],
        ["13:00","16:00","nike","Design Iteration","After Effects"],
        ["16:00","17:45","deloitte","Motion Design","After Effects"],
      ])},
      { date: WEEK[2], submitted: true, submittedAt: "5:55 PM", blocks: makeBlocks([
        ["9:30","12:00","nike","Concept Dev","Figma"],
        ["13:00","15:00","nike","Visual Design","After Effects"],
        ["15:00","16:30","deloitte","Motion Design","After Effects"],
      ])},
      { date: WEEK[3], submitted: false, blocks: [] },
      { date: WEEK[4], submitted: false, blocks: [] },
    ],
  },
  {
    id: "m4", name: "Casey Morgan", role: "Strategist", color: "#f59e0b",
    logs: [
      // ── last week ──
      { date: LAST_WEEK[0], submitted: true, submittedAt: "5:20 PM", blocks: makeBlocks([
        ["9:00","11:00","levis","Strategy","Notion"],
        ["11:00","12:00","google","Research","Chrome"],
        ["13:00","15:00","levis","Client Review","Zoom"],
        ["15:00","17:00","deloitte","Strategy","Notion"],
      ])},
      { date: LAST_WEEK[1], submitted: true, submittedAt: "6:10 PM", blocks: makeBlocks([
        ["9:00","11:30","levis","Strategy","Notion"],
        ["11:30","12:30","internal","Team Sync","Zoom"],
        ["13:30","15:00","google","Strategy","Notion"],
        ["15:00","17:00","levis","Design Iteration","Miro"],
      ])},
      { date: LAST_WEEK[2], submitted: true, submittedAt: "5:40 PM", blocks: makeBlocks([
        ["9:00","12:00","google","Research","Chrome"],
        ["13:00","15:30","levis","Communications","Zoom"],
        ["15:30","17:00","admin","Admin","Notion"],
      ])},
      { date: LAST_WEEK[3], submitted: true, submittedAt: "6:00 PM", blocks: makeBlocks([
        ["9:00","11:00","levis","Strategy","Notion"],
        ["11:00","12:30","google","Client Review","Zoom"],
        ["13:30","16:00","levis","Design Iteration","Miro"],
        ["16:00","17:30","deloitte","Strategy","Notion"],
      ])},
      { date: LAST_WEEK[4], submitted: true, submittedAt: "4:45 PM", blocks: makeBlocks([
        ["9:00","11:30","google","Strategy","Notion"],
        ["11:30","12:30","levis","Communications","Slack"],
        ["13:30","15:30","levis","Strategy","Notion"],
      ])},
      // ── this week ──
      { date: WEEK[0], submitted: true, submittedAt: "5:30 PM", blocks: makeBlocks([
        ["9:00","11:00","google","Strategy","Notion"],
        ["11:00","12:00","levis","Communications","Zoom"],
        ["13:00","15:00","levis","Strategy","Notion"],
        ["15:00","16:30","deloitte","Strategy","Notion"],
        ["16:30","17:10","admin","Admin","Slack"],
      ])},
      { date: WEEK[1], submitted: true, submittedAt: "6:00 PM", blocks: makeBlocks([
        ["9:00","11:30","levis","Strategy","Notion"],
        ["11:30","12:30","levis","Client Review","Zoom"],
        ["13:30","16:00","deloitte","Strategy","Notion"],
        ["16:00","17:30","internal","Team Sync","Slack"],
      ])},
      { date: WEEK[2], submitted: false, blocks: [] },
      { date: WEEK[3], submitted: false, blocks: [] },
      { date: WEEK[4], submitted: false, blocks: [] },
    ],
  },
  {
    id: "m5", name: "Riley Chen", role: "Designer", color: "#ec4899",
    logs: [
      // ── last week ──
      { date: LAST_WEEK[0], submitted: true, submittedAt: "5:05 PM", blocks: makeBlocks([
        ["9:00","11:30","patagonia","Visual Design","Figma"],
        ["11:30","12:30","bench","Research","Chrome"],
        ["13:30","15:30","patagonia","Design Iteration","Figma"],
        ["15:30","16:30","internal","Team Sync","Zoom"],
      ])},
      { date: LAST_WEEK[1], submitted: true, submittedAt: "6:00 PM", blocks: makeBlocks([
        ["9:00","12:00","patagonia","Visual Design","Figma"],
        ["13:00","14:30","deloitte","Visual Research","Chrome"],
        ["14:30","16:30","patagonia","Concept Dev","Figma"],
      ])},
      { date: LAST_WEEK[2], submitted: true, submittedAt: "5:45 PM", blocks: makeBlocks([
        ["9:00","11:00","patagonia","Design Iteration","Figma"],
        ["11:00","12:30","bench","Research","Chrome"],
        ["13:30","16:00","patagonia","Visual Design","Figma"],
        ["16:00","17:00","admin","Admin","Notion"],
      ])},
      { date: LAST_WEEK[3], submitted: true, submittedAt: "5:30 PM", blocks: makeBlocks([
        ["9:00","12:00","patagonia","Concept Dev","Figma"],
        ["13:00","15:00","levis","Visual Research","Chrome"],
        ["15:00","16:30","internal","Team Sync","Slack"],
      ])},
      { date: LAST_WEEK[4], submitted: true, submittedAt: "4:15 PM", blocks: makeBlocks([
        ["9:00","11:30","patagonia","Visual Design","Figma"],
        ["11:30","12:30","bench","Research","Chrome"],
        ["13:30","15:30","patagonia","Design Iteration","Figma"],
      ])},
      // ── this week ──
      { date: WEEK[0], submitted: true, submittedAt: "5:15 PM", blocks: makeBlocks([
        ["9:00","11:00","patagonia","Visual Design","Figma"],
        ["11:00","12:00","bench","Research","Chrome"],
        ["13:00","15:00","patagonia","Design Iteration","Figma"],
        ["15:00","16:30","internal","Team Sync","Zoom"],
      ])},
      { date: WEEK[1], submitted: true, submittedAt: "6:20 PM", blocks: makeBlocks([
        ["9:00","12:00","patagonia","Visual Design","Figma"],
        ["13:00","15:00","deloitte","Visual Design","Figma"],
        ["15:00","17:00","patagonia","Concept Dev","Figma"],
      ])},
      { date: WEEK[2], submitted: false, blocks: [] },
      { date: WEEK[3], submitted: false, blocks: [] },
      { date: WEEK[4], submitted: false, blocks: [] },
    ],
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

const DAY_START = 8 * 60;
const DAY_END   = 19 * 60;
const DAY_SPAN  = DAY_END - DAY_START;

const font = { fontFamily: "system-ui, Inter, sans-serif" };

function totalMin(blocks: TimeBlock[]) {
  return blocks.reduce((a, b) => a + b.durationMin, 0);
}

function fmtH(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Hours logged against a specific project across all members and all dates */
function projectLoggedHours(projectId: string): number {
  let mins = 0;
  for (const m of TEAM_DATA) {
    for (const log of m.logs) {
      for (const b of log.blocks) {
        if (b.projectId === projectId) mins += b.durationMin;
      }
    }
  }
  return mins / 60;
}

/** Expected hours burned by today based on linear project timeline */
function expectedHoursToDate(p: ProjectBudget): number {
  const start = new Date(p.startDate).getTime();
  const end   = new Date(p.endDate).getTime();
  const now   = new Date(TODAY).getTime();
  const pct   = Math.max(0, Math.min(1, (now - start) / (end - start)));
  return p.budgetHours * pct;
}

// ─── project budget card ──────────────────────────────────────────────────────

function ProjectCard({ p }: { p: ProjectBudget }) {
  const logged   = projectLoggedHours(p.id);
  const expected = expectedHoursToDate(p);
  const overBy   = logged - expected;
  const isOver   = overBy > 0.5;
  const isClose  = overBy > -2 && !isOver;

  const barColor    = isOver ? "#ef4444" : isClose ? "#f59e0b" : "#22c55e";
  const loggedPct   = Math.min(100, (logged   / p.budgetHours) * 100);
  const expectedPct = Math.min(100, (expected / p.budgetHours) * 100);

  const start = new Date(p.startDate);
  const end   = new Date(p.endDate);
  const now   = new Date(TODAY);
  const timelinePct = Math.round(Math.max(0, Math.min(100, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)));
  const marginColor = p.margin >= 40 ? "#22c55e" : p.margin >= 30 ? "#f59e0b" : "#ef4444";
  const remaining   = p.budgetHours - logged;

  return (
    <div className="flex flex-col gap-5 p-6 rounded-2xl flex-shrink-0"
      style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border-strong)", width: 300 }}>

      {/* Client dot + name */}
      <div className="flex items-center gap-2.5">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
        <div>
          <div className="text-[11px] text-gray-500 uppercase tracking-wider" style={font}>{p.client}</div>
          <div className="text-base font-semibold text-foreground mt-0.5 leading-tight" style={font}>{p.name}</div>
        </div>
      </div>

      {/* Margin + timeline pct */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] text-gray-500 mb-1" style={font}>Profit margin</div>
          <div className="text-4xl font-bold leading-none" style={{ color: marginColor, ...font }}>{p.margin}%</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-500 mb-1" style={font}>Timeline</div>
          <div className="text-2xl font-semibold text-foreground leading-none" style={font}>{timelinePct}%</div>
          <div className="text-[11px] text-gray-600 mt-0.5" style={font}>through project</div>
        </div>
      </div>

      {/* Budget bar */}
      <div>
        <div className="flex justify-between text-[11px] text-gray-500 mb-2" style={font}>
          <span>Hours logged</span>
          <span>{p.budgetHours}h budget</span>
        </div>
        <div className="relative h-4 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          <div className="absolute left-0 top-0 h-full rounded-lg transition-all"
            style={{ width: `${loggedPct}%`, backgroundColor: barColor }} />
          {expectedPct > 0 && (
            <div className="absolute top-0 bottom-0 w-0.5"
              style={{ left: `${expectedPct}%`, backgroundColor: "rgba(255,255,255,0.5)", zIndex: 2 }} />
          )}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm font-bold" style={{ color: barColor, ...font }}>{logged.toFixed(1)}h</span>
          <span className="text-xs text-gray-500" style={font}>{remaining > 0 ? `${remaining.toFixed(1)}h remaining` : `${Math.abs(remaining).toFixed(1)}h over budget`}</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--app-border-strong)" }} />

      {/* Pace status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: barColor }} />
          <span className="text-sm font-semibold" style={{ color: barColor, ...font }}>
            {isOver
              ? `${overBy.toFixed(1)}h over pace`
              : isClose
              ? "On the edge"
              : `${Math.abs(overBy).toFixed(1)}h under pace`}
          </span>
        </div>
        <span className="text-xs text-gray-600" style={font}>
          {expected.toFixed(0)}h expected now
        </span>
      </div>
    </div>
  );
}

function ProjectCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const CARD_W  = 316; // 300px card + 16px gap
  const VISIBLE = 3;
  const MAX_IDX = Math.max(0, PROJECT_BUDGETS.length - VISIBLE);

  const scrollTo = (i: number) => {
    scrollRef.current?.scrollTo({ left: i * CARD_W, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setActiveIdx(Math.min(MAX_IDX, Math.round(scrollRef.current.scrollLeft / CARD_W)));
  };

  const canPrev = activeIdx > 0;
  const canNext = activeIdx < MAX_IDX;

  return (
    <div>
      {/* Hide webkit scrollbar via injected style */}
      <style>{`.proj-carousel::-webkit-scrollbar { display: none; }`}</style>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-foreground font-semibold text-sm" style={font}>Project Budget Overview</h2>
          <div className="flex items-center gap-4 ml-4 text-[11px] text-gray-600" style={font}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded inline-block" style={{ backgroundColor: "#22c55e" }} />under pace</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded inline-block" style={{ backgroundColor: "#f59e0b" }} />close</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded inline-block" style={{ backgroundColor: "#ef4444" }} />over pace</span>
            <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 rounded inline-block" style={{ backgroundColor: "rgba(255,255,255,0.4)" }} />expected to date</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => scrollTo(Math.max(0, activeIdx - 1))} disabled={!canPrev}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: canPrev ? "var(--app-border-strong)" : "var(--app-card-elevated)", color: canPrev ? "var(--app-text-primary)" : "var(--app-text-faint)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" onClick={() => scrollTo(Math.min(MAX_IDX, activeIdx + 1))} disabled={!canNext}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: canNext ? "var(--app-border-strong)" : "var(--app-card-elevated)", color: canNext ? "var(--app-text-primary)" : "var(--app-text-faint)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* Native-scroll track — trackpad swipes work out of the box */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="proj-carousel flex gap-4"
        style={{
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: "grab",
        }}
      >
        {PROJECT_BUDGETS.map(p => (
          <div key={p.id} style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
            <ProjectCard p={p} />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4">
        {Array.from({ length: MAX_IDX + 1 }).map((_, i) => (
          <button key={i} type="button" onClick={() => scrollTo(i)}
            className="rounded-full transition-all duration-200"
            style={{ width: i === activeIdx ? 16 : 6, height: 6, backgroundColor: i === activeIdx ? "var(--app-text-primary)" : "var(--app-canvas-dot)" }} />
        ))}
      </div>
    </div>
  );
}

// ─── day detail ───────────────────────────────────────────────────────────────

function DayDetail({ log }: { log: DayLog }) {
  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--app-border-strong)" }}>
      <div className="px-4 py-3" style={{ backgroundColor: "var(--app-bg-elevated)" }}>
        <div className="flex justify-between text-[10px] text-gray-600 mb-1.5" style={font}>
          {["8am","10am","12pm","2pm","4pm","6pm"].map(l => <span key={l}>{l}</span>)}
        </div>
        <div className="relative h-6 rounded overflow-hidden" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          {log.blocks.map((b, i) => {
            const left  = Math.max(0, (b.startMin - DAY_START) / DAY_SPAN) * 100;
            const width = Math.min(100 - left, (b.durationMin / DAY_SPAN) * 100);
            return (
              <div key={i} title={`${b.projectId} · ${b.phase}`}
                style={{
                  position: "absolute", left: `${left}%`, width: `${Math.max(width, 0.5)}%`,
                  height: "100%",
                  backgroundColor: PROJECTS[b.projectId]?.color ?? "var(--app-text-faint)",
                  borderRight: "1px solid rgba(0,0,0,0.3)",
                }} />
            );
          })}
        </div>
      </div>
      <div style={{ backgroundColor: "var(--app-bg)" }}>
        {log.blocks.map((b, i) => {
          const proj  = PROJECTS[b.projectId];
          const phase = PHASE_COLORS[b.phase];
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--app-card-elevated)" }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: proj?.color ?? "var(--app-text-faint)" }} />
              <span className="text-xs text-gray-500 w-24 flex-shrink-0 tabular-nums" style={font}>
                {b.start} – {b.end}
              </span>
              <span className="text-xs text-foreground flex-1 truncate" style={font}>{proj?.name ?? b.projectId}</span>
              <span className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                style={{ backgroundColor: phase?.bg ?? "var(--app-border-strong)", color: phase?.text ?? "var(--app-text-muted)", border: "1px solid var(--app-canvas-dot)", ...font }}>
                {b.phase}
              </span>
              <span className="text-xs text-gray-500 w-12 text-right flex-shrink-0 tabular-nums" style={font}>
                {fmtH(b.durationMin)}
              </span>
              {b.offline && (
                <span className="text-[10px] text-amber-600 bg-amber-900/20 border border-amber-800/30 px-1.5 py-0.5 rounded flex-shrink-0" style={font}>
                  offline
                </span>
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
  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const weekLogs = useMemo(() =>
    weekDates.map(d => member.logs.find(l => l.date === d) ?? { date: d, submitted: false, blocks: [] }),
    [member, weekDates]
  );

  const weeklyTotal    = useMemo(() => weekLogs.reduce((a, l) => a + totalMin(l.blocks), 0), [weekLogs]);
  const submittedCount = weekLogs.filter(l => l.submitted).length;
  const weeklyHours    = weeklyTotal / 60;
  const burnoutRisk    = weeklyHours > 50;
  const utilization    = Math.round((weeklyHours / 40) * 100);
  const utilizationColor = burnoutRisk ? "#ef4444" : utilization >= 70 ? "#22c55e" : "#f59e0b";

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--app-card)",
        border: burnoutRisk ? "1px solid #ef444440" : "1px solid var(--app-border-strong)",
      }}>
      {/* Burnout risk banner */}
      {burnoutRisk && (
        <div className="flex items-center gap-2 px-5 py-2.5"
          style={{ backgroundColor: "#ef444412", borderBottom: "1px solid #ef444430" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-xs font-semibold" style={{ color: "#ef4444", ...font }}>
            Burnout risk — {weeklyHours.toFixed(1)}h logged this week (50h threshold exceeded)
          </span>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--app-card-elevated)" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: member.color, color: "var(--app-text-primary)", ...font }}>
          {member.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-foreground font-semibold text-sm" style={font}>{member.name}</div>
          <div className="text-xs text-gray-500 mt-0.5" style={font}>{member.role}</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5" style={font}>Week total</div>
            <div className="text-sm font-semibold" style={{ color: burnoutRisk ? "#ef4444" : "var(--app-text-primary)", ...font }}>
              {fmtH(weeklyTotal)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5" style={font}>Utilization</div>
            <div className="text-sm font-semibold" style={{ color: utilizationColor, ...font }}>{utilization}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5" style={font}>Submitted</div>
            <div className="text-sm font-semibold text-foreground" style={font}>{submittedCount}/5 days</div>
          </div>
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-5">
        {weekLogs.map((log, i) => {
          const mins      = totalMin(log.blocks);
          const isExpanded = expandedDay === log.date;
          const isToday   = log.date === TODAY;

          return (
            <button key={log.date} type="button"
              onClick={() => setExpandedDay(isExpanded ? null : log.date)}
              className="flex flex-col gap-2 p-3 text-left transition-colors hover:bg-white/[0.02]"
              style={{
                borderRight: i < 4 ? "1px solid var(--app-card-elevated)" : "none",
                backgroundColor: isExpanded ? "var(--app-card-elevated)" : isToday ? "rgba(34,197,94,0.04)" : "transparent",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: isToday ? "#22c55e" : "var(--app-text-muted)", ...font }}>
                  {DAY_LABELS[i]}{isToday && <span className="ml-1 opacity-70">· today</span>}
                </span>
                {log.submitted
                  ? <span className="text-[11px] text-green-500" style={font}>✓</span>
                  : mins > 0 ? <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  : null}
              </div>

              {mins > 0 ? (
                <>
                  <div className="text-sm font-semibold text-foreground" style={font}>{fmtH(mins)}</div>
                  {/* Project color timeline strip */}
                  <div className="relative h-3 rounded overflow-hidden w-full" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                    {log.blocks.map((b, bi) => {
                      const l = Math.max(0, (b.startMin - DAY_START) / DAY_SPAN) * 100;
                      const w = Math.min(100 - l, (b.durationMin / DAY_SPAN) * 100);
                      return (
                        <div key={bi} style={{
                          position: "absolute", left: `${l}%`, width: `${Math.max(w, 0.5)}%`,
                          height: "100%",
                          backgroundColor: PROJECTS[b.projectId]?.color ?? "var(--app-text-faint)",
                          borderRight: "1px solid rgba(0,0,0,0.25)",
                        }} />
                      );
                    })}
                  </div>
                  {log.submittedAt && (
                    <span className="text-[10px] text-gray-600" style={font}>Submitted {log.submittedAt}</span>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-700 mt-1" style={font}>—</div>
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
                {DAY_LABELS[dayIdx]} · {new Date(expandedDay + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span className="text-xs text-gray-500" style={font}>
                {fmtH(totalMin(log.blocks))} total
              </span>
            </div>
            <DayDetail log={log} />
          </div>
        );
      })()}
    </div>
  );
}

// ─── project view ─────────────────────────────────────────────────────────────

function ProjectSection({ projectId, weekDates }: { projectId: string; weekDates: string[] }) {
  const proj = PROJECTS[projectId];
  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const members = useMemo(() =>
    TEAM_DATA
      .map(m => {
        const dayBlocks = weekDates.map(d => {
          const log = m.logs.find(l => l.date === d);
          return (log?.blocks ?? []).filter(b => b.projectId === projectId);
        });
        const totalMins = dayBlocks.reduce((a, bs) => a + bs.reduce((s, b) => s + b.durationMin, 0), 0);
        return { member: m, dayBlocks, totalMins };
      })
      .filter(r => r.totalMins > 0),
    [projectId, weekDates]
  );

  const projectWeekMins = useMemo(() => members.reduce((a, r) => a + r.totalMins, 0), [members]);

  if (members.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border-strong)" }}>
      {/* Project header */}
      <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid var(--app-card-elevated)" }}>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: proj?.color ?? "var(--app-text-faint)" }} />
        <div className="flex-1 min-w-0">
          <div className="text-foreground font-semibold text-sm" style={font}>{proj?.name ?? projectId}</div>
          <div className="text-xs text-gray-500 mt-0.5" style={font}>{proj?.client} · {members.length} contributor{members.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-0.5" style={font}>Week total</div>
          <div className="text-sm font-semibold text-foreground" style={font}>{fmtH(projectWeekMins)}</div>
        </div>
      </div>

      {/* Member rows */}
      {members.map(({ member, dayBlocks, totalMins }) => {
        const rowKey = `${projectId}-${member.id}`;
        const isExpanded = expandedKey === rowKey;

        return (
          <div key={member.id} style={{ borderTop: "1px solid var(--app-card-elevated)" }}>
            <div className="flex items-stretch">
              {/* Member identity */}
              <div className="flex items-center gap-2.5 px-4 py-3 w-44 flex-shrink-0" style={{ borderRight: "1px solid var(--app-card-elevated)" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: member.color, color: "#fff" }}>
                  {member.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate" style={font}>{member.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5" style={font}>{fmtH(totalMins)}</div>
                </div>
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-5 flex-1">
                {dayBlocks.map((blocks, i) => {
                  const mins = blocks.reduce((a, b) => a + b.durationMin, 0);
                  const isToday = weekDates[i] === TODAY;
                  const cellKey = `${rowKey}-${i}`;
                  const cellExpanded = expandedKey === cellKey;

                  return (
                    <button key={i} type="button"
                      onClick={() => setExpandedKey(cellExpanded ? null : cellKey)}
                      disabled={mins === 0}
                      className="flex flex-col gap-1.5 p-2.5 text-left transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderRight: i < 4 ? "1px solid var(--app-card-elevated)" : "none",
                        backgroundColor: cellExpanded ? "var(--app-card-elevated)" : isToday ? "rgba(34,197,94,0.03)" : "transparent",
                      }}>
                      <span className="text-[10px] font-medium" style={{ color: isToday ? "#22c55e" : "var(--app-text-muted)", ...font }}>
                        {DAY_LABELS[i]}
                      </span>
                      {mins > 0 ? (
                        <>
                          <div className="text-xs font-semibold text-foreground" style={font}>{fmtH(mins)}</div>
                          <div className="relative h-2 rounded overflow-hidden w-full" style={{ backgroundColor: "var(--app-border-strong)" }}>
                            <div className="absolute left-0 top-0 h-full rounded"
                              style={{ width: `${Math.min(100, (mins / (8 * 60)) * 100)}%`, backgroundColor: proj?.color ?? "var(--app-text-faint)" }} />
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-gray-700" style={font}>—</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expanded day detail for a specific member+project cell */}
            {expandedKey?.startsWith(`${rowKey}-`) && (() => {
              const dayIdx = parseInt(expandedKey.split("-").pop()!);
              const blocks = dayBlocks[dayIdx];
              if (!blocks || blocks.length === 0) return null;
              const fakeLog: DayLog = { date: weekDates[dayIdx], submitted: true, blocks };
              return (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--app-card-elevated)" }}>
                  <div className="flex items-center justify-between pt-3 pb-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wider" style={font}>
                      {DAY_LABELS[dayIdx]} · {member.name}
                    </span>
                    <span className="text-xs text-gray-500" style={font}>{fmtH(blocks.reduce((a, b) => a + b.durationMin, 0))} on {proj?.name}</span>
                  </div>
                  <DayDetail log={fakeLog} />
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

interface TimeTrackingPageProps {
  members?: { id: string; name: string; role?: string; color?: string }[];
}

export function TimeTrackingPage({ members: _members }: TimeTrackingPageProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"team" | "projects">("team");
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return "This Week";
    if (weekOffset === -1) return "Last Week";
    const start = new Date(weekDates[0]);
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      + " – " + new Date(weekDates[4]).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [weekOffset, weekDates]);

  const teamTotals = useMemo(() => {
    let totalMins = 0, submittedDays = 0;
    for (const m of TEAM_DATA) {
      for (const d of weekDates) {
        const log = m.logs.find(l => l.date === d);
        if (log?.submitted) submittedDays++;
        totalMins += log ? totalMin(log.blocks) : 0;
      }
    }
    return { totalMins, submittedDays, totalDays: TEAM_DATA.length * 5 };
  }, [weekDates]);

  const projectsOverPace = PROJECT_BUDGETS.filter(p => {
    const logged   = projectLoggedHours(p.id);
    const expected = expectedHoursToDate(p);
    return logged - expected > 0.5;
  }).length;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "var(--app-bg-elevated)" }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground font-semibold text-xl flex items-center gap-2.5" style={font}>
              Time Tracking
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", padding: "2px 8px", borderRadius: 999, background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b55" }}>
                COMING SOON
              </span>
            </h1>
            <p className="text-gray-500 text-sm mt-0.5" style={font}>Project budget burn · Manager view</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-lg overflow-hidden p-0.5" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border-strong)" }}>
              {(["team", "projects"] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)}
                  className="px-3 h-7 text-xs font-medium rounded-md transition-colors capitalize"
                  style={{
                    backgroundColor: viewMode === mode ? "var(--app-border-strong)" : "transparent",
                    color: viewMode === mode ? "var(--app-text-primary)" : "var(--app-text-muted)",
                    ...font,
                  }}>
                  By {mode === "team" ? "Team" : "Project"}
                </button>
              ))}
            </div>
            {/* Week navigator */}
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--app-border-strong)" }}>
              <button type="button" onClick={() => setWeekOffset(o => o - 1)}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: "var(--app-text-muted)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="text-sm text-gray-300 px-3 border-x" style={{ borderColor: "var(--app-border-strong)", ...font }}>{weekLabel}</span>
              <button type="button" onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
                disabled={weekOffset === 0}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 transition-colors"
                style={{ color: weekOffset === 0 ? "var(--app-canvas-dot)" : "var(--app-text-muted)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Quick-stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Hours This Week", value: fmtH(teamTotals.totalMins), sub: `${TEAM_DATA.length} team members`, color: "var(--app-text-primary)" },
            { label: "Projects Over Pace", value: `${projectsOverPace} / ${PROJECT_BUDGETS.length}`, sub: "burning budget faster than expected", color: projectsOverPace > 0 ? "#ef4444" : "#22c55e" },
            { label: "Days Submitted", value: `${teamTotals.submittedDays} / ${teamTotals.totalDays}`, sub: "this week", color: "var(--app-text-primary)" },
          ].map(c => (
            <div key={c.label} className="p-4 rounded-xl" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border-strong)" }}>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2" style={font}>{c.label}</div>
              <div className="text-2xl font-bold" style={{ color: c.color, ...font }}>{c.value}</div>
              <div className="text-xs text-gray-600 mt-1" style={font}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Project Budget Overview carousel ── */}
        <ProjectCarousel />

        {/* ── Team / Project view ── */}
        {viewMode === "team" ? (
          <div>
            <h2 className="text-foreground font-semibold text-sm mb-3" style={font}>Team Hours</h2>
            <div className="space-y-3">
              {TEAM_DATA.map(m => <MemberCard key={m.id} member={m} weekDates={weekDates} />)}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-foreground font-semibold text-sm mb-3" style={font}>Hours by Project</h2>
            <div className="space-y-3">
              {Object.keys(PROJECTS).map(pid => (
                <ProjectSection key={pid} projectId={pid} weekDates={weekDates} />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-700 text-center pb-4" style={font}>
          Click any day cell to see the full submitted breakdown · White tick = expected-to-date marker
        </p>
      </div>
    </div>
  );
}
