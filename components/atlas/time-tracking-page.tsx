"use client";

import React, { useState, useMemo } from "react";

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
      // ── last week ──
      { date: LAST_WEEK[0], submitted: true, submittedAt: "6:12 PM", blocks: makeBlocks([
        ["9:00","10:30","nike","Visual Design","Figma"],
        ["10:30","12:00","google","Strategy","Miro"],
        ["13:00","14:30","levis","Communications","Zoom"],
        ["14:30","16:00","google","Design Iteration","Figma"],
        ["16:00","17:30","nike","Concept Dev","Figma"],
      ])},
      { date: LAST_WEEK[1], submitted: true, submittedAt: "5:45 PM", blocks: makeBlocks([
        ["9:00","11:00","nike","Visual Design","Figma"],
        ["11:00","12:30","deloitte","Visual Research","Chrome"],
        ["13:30","15:30","google","Design Iteration","Figma"],
        ["15:30","17:00","internal","Team Sync","Zoom"],
      ])},
      { date: LAST_WEEK[2], submitted: true, submittedAt: "6:30 PM", blocks: makeBlocks([
        ["9:00","11:30","levis","Strategy","Notion"],
        ["11:30","12:30","nike","Client Review","Zoom"],
        ["13:30","16:00","nike","Visual Design","Figma"],
        ["16:00","17:30","deloitte","Concept Dev","Figma"],
      ])},
      { date: LAST_WEEK[3], submitted: true, submittedAt: "5:50 PM", blocks: makeBlocks([
        ["9:00","11:00","google","Visual Research","Chrome"],
        ["11:00","12:00","internal","Admin","Notion"],
        ["13:00","15:00","nike","Visual Design","Figma"],
        ["15:00","17:00","levis","Design Iteration","Figma"],
      ])},
      { date: LAST_WEEK[4], submitted: true, submittedAt: "4:58 PM", blocks: makeBlocks([
        ["9:00","11:30","deloitte","Concept Dev","Figma"],
        ["11:30","12:30","nike","Communications","Slack"],
        ["13:30","15:00","google","Strategy","Miro"],
        ["15:00","16:30","admin","Admin","Notion"],
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
        ["13:00","15:00","bench","Research","Chrome"],
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
        ["15:30","17:00","bench","Research","Chrome"],
        ["17:00","18:00","admin","Admin","Notion"],
      ])},
      { date: WEEK[1], submitted: true, submittedAt: "6:45 PM", blocks: makeBlocks([
        ["9:00","12:00","nike","Visual Design","After Effects"],
        ["13:00","16:00","nike","Design Iteration","After Effects"],
        ["16:00","17:45","bench","Research","Chrome"],
      ])},
      { date: WEEK[2], submitted: true, submittedAt: "5:55 PM", blocks: makeBlocks([
        ["9:30","12:00","nike","Concept Dev","Figma"],
        ["13:00","15:00","nike","Visual Design","After Effects"],
        ["15:00","16:30","admin","Admin","Notion"],
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
        ["15:00","17:00","google","Strategy","Notion"],
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
        ["16:00","17:30","bench","Research","Chrome"],
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
        ["15:00","16:30","google","Research","Chrome"],
        ["16:30","17:10","admin","Admin","Slack"],
      ])},
      { date: WEEK[1], submitted: true, submittedAt: "6:00 PM", blocks: makeBlocks([
        ["9:00","11:30","levis","Strategy","Notion"],
        ["11:30","12:30","levis","Client Review","Zoom"],
        ["13:30","16:00","google","Strategy","Notion"],
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
        ["13:00","14:30","levis","Visual Research","Chrome"],
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
        ["13:00","15:00","bench","Research","Chrome"],
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

  const barColor = isOver ? "#ef4444" : isClose ? "#f59e0b" : "#22c55e";
  const loggedPct   = Math.min(100, (logged   / p.budgetHours) * 100);
  const expectedPct = Math.min(100, (expected / p.budgetHours) * 100);

  const start = new Date(p.startDate);
  const end   = new Date(p.endDate);
  const now   = new Date(TODAY);
  const timelinePct = Math.round(Math.max(0, Math.min(100, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)));

  const marginColor = p.margin >= 40 ? "#22c55e" : p.margin >= 30 ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-4 rounded-xl flex flex-col gap-3" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: p.color }} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate" style={font}>{p.name}</div>
            <div className="text-xs text-gray-500 mt-0.5" style={font}>{p.client}</div>
          </div>
        </div>
        {/* Margin */}
        <div className="text-right flex-shrink-0">
          <div className="text-xl font-bold" style={{ color: marginColor, ...font }}>{p.margin}%</div>
          <div className="text-[10px] text-gray-600 mt-0.5" style={font}>margin</div>
        </div>
      </div>

      {/* Budget bar */}
      <div>
        <div className="relative h-3 rounded-full overflow-visible" style={{ backgroundColor: "#1e1e1e" }}>
          {/* Logged hours fill */}
          <div className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${loggedPct}%`, backgroundColor: barColor }} />
          {/* Expected-to-date tick */}
          {expectedPct > 0 && (
            <div className="absolute top-[-3px] bottom-[-3px] w-0.5 rounded-full"
              style={{ left: `${expectedPct}%`, backgroundColor: "#ffffff40", zIndex: 2 }} />
          )}
        </div>
        {/* Labels */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold" style={{ color: barColor, ...font }}>
              {logged.toFixed(1)}h logged
            </span>
            <span className="text-xs text-gray-600" style={font}>
              · {expected.toFixed(1)}h expected
            </span>
          </div>
          <span className="text-xs text-gray-600" style={font}>{p.budgetHours}h budget</span>
        </div>
      </div>

      {/* Pace indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isOver ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#ef4444" }} />
              <span className="text-xs font-medium" style={{ color: "#ef4444", ...font }}>
                {overBy.toFixed(1)}h over pace
              </span>
            </>
          ) : isClose ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
              <span className="text-xs font-medium" style={{ color: "#f59e0b", ...font }}>On the edge</span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
              <span className="text-xs font-medium" style={{ color: "#22c55e", ...font }}>
                {Math.abs(overBy).toFixed(1)}h under pace
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] text-gray-600" style={font}>{timelinePct}% through timeline</span>
      </div>
    </div>
  );
}

// ─── day detail ───────────────────────────────────────────────────────────────

function DayDetail({ log }: { log: DayLog }) {
  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
      <div className="px-4 py-3" style={{ backgroundColor: "#111" }}>
        <div className="flex justify-between text-[10px] text-gray-600 mb-1.5" style={font}>
          {["8am","10am","12pm","2pm","4pm","6pm"].map(l => <span key={l}>{l}</span>)}
        </div>
        <div className="relative h-6 rounded overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
          {log.blocks.map((b, i) => {
            const left  = Math.max(0, (b.startMin - DAY_START) / DAY_SPAN) * 100;
            const width = Math.min(100 - left, (b.durationMin / DAY_SPAN) * 100);
            return (
              <div key={i} title={`${b.projectId} · ${b.phase}`}
                style={{
                  position: "absolute", left: `${left}%`, width: `${Math.max(width, 0.5)}%`,
                  height: "100%",
                  backgroundColor: PROJECTS[b.projectId]?.color ?? "#555",
                  borderRight: "1px solid rgba(0,0,0,0.3)",
                }} />
            );
          })}
        </div>
      </div>
      <div style={{ backgroundColor: "#0d0d0d" }}>
        {log.blocks.map((b, i) => {
          const proj  = PROJECTS[b.projectId];
          const phase = PHASE_COLORS[b.phase];
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderTop: i === 0 ? "none" : "1px solid #1a1a1a" }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: proj?.color ?? "#555" }} />
              <span className="text-xs text-gray-500 w-24 flex-shrink-0 tabular-nums" style={font}>
                {b.start} – {b.end}
              </span>
              <span className="text-xs text-white flex-1 truncate" style={font}>{proj?.name ?? b.projectId}</span>
              <span className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                style={{ backgroundColor: phase?.bg ?? "#2a2a2a", color: phase?.text ?? "#888", border: "1px solid #333", ...font }}>
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

  const weeklyTotal = useMemo(() => weekLogs.reduce((a, l) => a + totalMin(l.blocks), 0), [weekLogs]);
  const submittedCount = weekLogs.filter(l => l.submitted).length;
  const utilization = Math.round((weeklyTotal / 60 / 40) * 100);
  const utilizationColor = utilization > 110 ? "#ef4444" : utilization >= 70 ? "#22c55e" : "#f59e0b";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: member.color, color: "#fff", ...font }}>
          {member.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm" style={font}>{member.name}</div>
          <div className="text-xs text-gray-500 mt-0.5" style={font}>{member.role}</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5" style={font}>Week total</div>
            <div className="text-sm font-semibold text-white" style={font}>{fmtH(weeklyTotal)}</div>
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
                borderRight: i < 4 ? "1px solid #1e1e1e" : "none",
                backgroundColor: isExpanded ? "#1a1a1a" : isToday ? "rgba(34,197,94,0.04)" : "transparent",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: isToday ? "#22c55e" : "#888", ...font }}>
                  {DAY_LABELS[i]}{isToday && <span className="ml-1 opacity-70">· today</span>}
                </span>
                {log.submitted
                  ? <span className="text-[11px] text-green-500" style={font}>✓</span>
                  : mins > 0 ? <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  : null}
              </div>

              {mins > 0 ? (
                <>
                  <div className="text-sm font-semibold text-white" style={font}>{fmtH(mins)}</div>
                  {/* Project color timeline strip */}
                  <div className="relative h-3 rounded overflow-hidden w-full" style={{ backgroundColor: "#1e1e1e" }}>
                    {log.blocks.map((b, bi) => {
                      const l = Math.max(0, (b.startMin - DAY_START) / DAY_SPAN) * 100;
                      const w = Math.min(100 - l, (b.durationMin / DAY_SPAN) * 100);
                      return (
                        <div key={bi} style={{
                          position: "absolute", left: `${l}%`, width: `${Math.max(w, 0.5)}%`,
                          height: "100%",
                          backgroundColor: PROJECTS[b.projectId]?.color ?? "#555",
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
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#111111" }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-semibold text-xl" style={font}>Time Tracking</h1>
            <p className="text-gray-500 text-sm mt-0.5" style={font}>Project budget burn · Manager view</p>
          </div>
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

        {/* Quick-stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Hours This Week", value: fmtH(teamTotals.totalMins), sub: `${TEAM_DATA.length} team members`, color: "#fff" },
            { label: "Projects Over Pace", value: `${projectsOverPace} / ${PROJECT_BUDGETS.length}`, sub: "burning budget faster than expected", color: projectsOverPace > 0 ? "#ef4444" : "#22c55e" },
            { label: "Days Submitted", value: `${teamTotals.submittedDays} / ${teamTotals.totalDays}`, sub: "this week", color: "#fff" },
          ].map(c => (
            <div key={c.label} className="p-4 rounded-xl" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2" style={font}>{c.label}</div>
              <div className="text-2xl font-bold" style={{ color: c.color, ...font }}>{c.value}</div>
              <div className="text-xs text-gray-600 mt-1" style={font}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Project Budget Overview ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-white font-semibold text-sm" style={font}>Project Budget Overview</h2>
            <div className="flex items-center gap-3 ml-4 text-[11px] text-gray-600" style={font}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "#22c55e" }} />under pace
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "#f59e0b" }} />close
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "#ef4444" }} />over pace
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-0.5 h-3 rounded" style={{ backgroundColor: "#ffffff40" }} />expected-to-date
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
            {PROJECT_BUDGETS.map(p => <ProjectCard key={p.id} p={p} />)}
          </div>
        </div>

        {/* ── Team Hours ── */}
        <div>
          <h2 className="text-white font-semibold text-sm mb-3" style={font}>Team Hours</h2>
          <div className="space-y-3">
            {TEAM_DATA.map(m => <MemberCard key={m.id} member={m} weekDates={weekDates} />)}
          </div>
        </div>

        <p className="text-xs text-gray-700 text-center pb-4" style={font}>
          Click any day cell to see the full submitted breakdown · White tick = expected-to-date marker
        </p>
      </div>
    </div>
  );
}
