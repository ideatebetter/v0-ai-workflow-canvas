"use client";

import React, { useState, useMemo } from "react";
import type { CapacityTeamMember } from "@/lib/atlas-types";

const FONT = { fontFamily: "system-ui, Inter, sans-serif" };

// ── helpers ───────────────────────────────────────────────────────────────────

function getWeekDates(anchor: Date): Date[] {
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isWeekend(d: Date) {
  return d.getDay() === 0 || d.getDay() === 6;
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Hours displayed: 7 AM – 7 PM  (12 slots)
const HOUR_START = 7;
const HOUR_END   = 19;
const HOUR_COUNT = HOUR_END - HOUR_START;
const ROW_H      = 48; // px per hour

// Generate per-day project blocks from allocation %, starting at 9am
function buildDayBlocks(member: CapacityTeamMember): { projectName: string; color: string; startH: number; endH: number }[] {
  const allocs = (member.projectAllocations ?? []).filter(p => p.allocationPct > 0);
  const workHours = 8;
  let cursor = 9; // work starts 9am
  return allocs.map(p => {
    const hours = (p.allocationPct / 100) * workHours;
    const start = cursor;
    const end   = Math.min(cursor + hours, 18);
    cursor = end;
    return { projectName: p.projectName, color: p.color, startH: start, endH: end };
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

function HourLabel({ hour }: { hour: number }) {
  const label = hour === 12 ? "12 PM" : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  return (
    <div className="text-right pr-2 text-[9px] text-gray-600 flex-shrink-0 select-none"
      style={{ height: ROW_H, lineHeight: `${ROW_H}px`, width: 44 }}>
      {label}
    </div>
  );
}

interface DayColumnProps {
  date: Date;
  member: CapacityTeamMember;
  isOff: boolean;
  onToggleOff: () => void;
  isToday: boolean;
}

function DayColumn({ date, member, isOff, onToggleOff, isToday }: DayColumnProps) {
  const blocks = useMemo(() => buildDayBlocks(member), [member]);
  const weekend = isWeekend(date);

  return (
    <div className="flex-1 flex flex-col min-w-0 relative" style={{ borderLeft: "1px solid var(--app-border)" }}>
      {/* Day header */}
      <button
        type="button"
        onClick={!weekend ? onToggleOff : undefined}
        className="flex flex-col items-center py-2 gap-0.5 flex-shrink-0 transition-colors"
        style={{
          borderBottom: "1px solid var(--app-border)",
          cursor: weekend ? "default" : "pointer",
          backgroundColor: isOff ? "#ef444412" : isToday ? "#F0FE0008" : "transparent",
        }}
        title={weekend ? undefined : isOff ? "Click to remove day off" : "Click to mark as day off"}
      >
        <span className="text-[9px] uppercase tracking-widest" style={{ color: weekend ? "var(--app-text-faint)" : "var(--app-text-faint)" }}>
          {DAY_SHORT[date.getDay()]}
        </span>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold`}
          style={{
            backgroundColor: isToday ? "var(--app-text-primary)" : "transparent",
            color: isToday ? "var(--app-bg-elevated)" : weekend ? "var(--app-text-faint)" : "#ccc",
          }}>
          {date.getDate()}
        </div>
        {isOff && !weekend && (
          <span className="text-[8px] font-medium" style={{ color: "#ef4444" }}>Off</span>
        )}
      </button>

      {/* Time grid */}
      <div className="relative flex-1" style={{ height: HOUR_COUNT * ROW_H }}>
        {/* Hour lines */}
        {Array.from({ length: HOUR_COUNT }, (_, i) => (
          <div key={i} className="absolute left-0 right-0" style={{ top: i * ROW_H, borderTop: "1px solid var(--app-card-elevated)" }} />
        ))}

        {/* Half-hour lines */}
        {Array.from({ length: HOUR_COUNT }, (_, i) => (
          <div key={`h${i}`} className="absolute left-0 right-0" style={{ top: i * ROW_H + ROW_H / 2, borderTop: "1px dashed #181818" }} />
        ))}

        {/* Weekend / off overlay */}
        {(weekend || isOff) && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: isOff ? "#ef444408" : "var(--app-text-primary)03", zIndex: 1 }}>
            {isOff && (
              <span className="text-[9px] font-medium rotate-90 whitespace-nowrap" style={{ color: "#ef444440" }}>
                Day Off
              </span>
            )}
          </div>
        )}

        {/* Work hours highlight (9am–5pm) */}
        {!weekend && !isOff && (
          <div className="absolute left-0 right-0" style={{
            top: (9 - HOUR_START) * ROW_H,
            height: 8 * ROW_H,
            backgroundColor: "var(--app-text-primary)03",
          }} />
        )}

        {/* Project blocks */}
        {!weekend && !isOff && blocks.map((b, i) => {
          const top    = (b.startH - HOUR_START) * ROW_H;
          const height = Math.max(22, (b.endH - b.startH) * ROW_H - 2);
          return (
            <div key={i}
              className="absolute left-1 right-1 rounded-lg px-1.5 overflow-hidden flex flex-col justify-start"
              style={{ top: top + 1, height, backgroundColor: `${b.color}22`, border: `1px solid ${b.color}44`, zIndex: 2 }}>
              <span className="text-[8px] font-semibold leading-tight truncate mt-1" style={{ color: b.color }}>
                {b.projectName}
              </span>
              {height > 32 && (
                <span className="text-[7px] leading-tight" style={{ color: `${b.color}99` }}>
                  {b.startH}:00 – {Math.floor(b.endH)}:{String(Math.round((b.endH % 1) * 60)).padStart(2, "0")}
                </span>
              )}
            </div>
          );
        })}

        {/* Now indicator (today only, if in visible hours) */}
        {isToday && (() => {
          const now  = new Date();
          const nowH = now.getHours() + now.getMinutes() / 60;
          if (nowH < HOUR_START || nowH > HOUR_END) return null;
          const top = (nowH - HOUR_START) * ROW_H;
          return (
            <div className="absolute left-0 right-0 z-10" style={{ top }}>
              <div className="absolute left-0 right-0 h-px" style={{ backgroundColor: "#ef4444" }} />
              <div className="absolute w-2 h-2 rounded-full -left-1 -top-1" style={{ backgroundColor: "#ef4444" }} />
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// Team planning view: rows = members, columns = Mon-Fri days
function TeamPlanningView({ members, weekDates, daysOff, onToggleOff }:
  { members: CapacityTeamMember[]; weekDates: Date[]; daysOff: Set<string>; onToggleOff: (iso: string) => void }) {
  const workDays = weekDates.filter(d => !isWeekend(d));
  const today    = isoDate(new Date());

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header row */}
      <div className="flex flex-shrink-0" style={{ borderBottom: "1px solid var(--app-border)" }}>
        {/* Name column spacer */}
        <div className="flex-shrink-0" style={{ width: 140 }} />
        {workDays.map(d => {
          const iso = isoDate(d);
          const isOff = daysOff.has(iso);
          const isToday = iso === today;
          return (
            <div key={iso} className="flex-1 flex flex-col items-center py-2 gap-0.5"
              style={{ borderLeft: "1px solid var(--app-border)", backgroundColor: isOff ? "#ef444412" : isToday ? "#F0FE0008" : "transparent" }}>
              <span className="text-[9px] uppercase tracking-widest text-gray-600">{DAY_SHORT[d.getDay()]}</span>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold`}
                style={{ backgroundColor: isToday ? "var(--app-text-primary)" : "transparent", color: isToday ? "var(--app-bg-elevated)" : "#ccc" }}>
                {d.getDate()}
              </div>
              {isOff && <span className="text-[8px] font-medium" style={{ color: "#ef4444" }}>Team Off</span>}
            </div>
          );
        })}
      </div>

      {/* Member rows */}
      <div className="flex-1 overflow-y-auto">
        {members.map((tm, mi) => {
          const allocs = tm.projectAllocations ?? [];
          const col = tm.utilizationRate > 90 ? "#ef4444" : tm.utilizationRate > 80 ? "#f59e0b" : "#22c55e";
          return (
            <div key={mi} className="flex items-stretch" style={{ borderBottom: "1px solid var(--app-card-elevated)", minHeight: 64 }}>
              {/* Name cell */}
              <div className="flex items-center gap-2 px-3 flex-shrink-0" style={{ width: 140, borderRight: "1px solid var(--app-border)" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: tm.member?.color || "#525252", color: "var(--app-text-primary)" }}>
                  {tm.member?.name?.charAt(0) ?? "?"}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium text-foreground truncate">{tm.member?.name}</div>
                  <div className="text-[8px]" style={{ color: col }}>{tm.utilizationRate}%</div>
                </div>
              </div>

              {/* Day cells */}
              {workDays.map(d => {
                const iso = isoDate(d);
                const isOff = daysOff.has(iso);
                return (
                  <div key={iso} className="flex-1 p-1 relative" style={{ borderLeft: "1px solid var(--app-card-elevated)", backgroundColor: isOff ? "#ef444408" : "transparent" }}>
                    {!isOff && allocs.length > 0 && (
                      <div className="flex flex-col gap-0.5 h-full">
                        {allocs.map((p, pi) => (
                          <div key={pi} className="rounded px-1.5 py-1 flex items-center gap-1 overflow-hidden"
                            style={{ backgroundColor: `${p.color}20`, border: `1px solid ${p.color}35`, flex: p.allocationPct }}>
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="text-[8px] font-medium truncate" style={{ color: p.color }}>{p.projectName}</span>
                            <span className="text-[7px] flex-shrink-0" style={{ color: `${p.color}99` }}>{p.allocationPct}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {isOff && (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-[8px]" style={{ color: "#ef444440" }}>Off</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── main modal ────────────────────────────────────────────────────────────────

interface TeamCalendarModalProps {
  member: CapacityTeamMember;
  allMembers: CapacityTeamMember[];
  onClose: () => void;
}

export function TeamCalendarModal({ member, allMembers, onClose }: TeamCalendarModalProps) {
  const today        = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [daysOff, setDaysOff]       = useState<Set<string>>(new Set());
  const [view, setView]             = useState<"individual" | "team">("individual");
  const [focusMember, setFocusMember] = useState<CapacityTeamMember>(member);

  const weekDates = useMemo(() => {
    const anchor = new Date(today);
    anchor.setDate(today.getDate() + weekOffset * 7);
    return getWeekDates(anchor);
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const first = weekDates[0];
    const last  = weekDates[6];
    if (first.getMonth() === last.getMonth()) {
      return `${MONTH_SHORT[first.getMonth()]} ${first.getDate()}–${last.getDate()}, ${first.getFullYear()}`;
    }
    return `${MONTH_SHORT[first.getMonth()]} ${first.getDate()} – ${MONTH_SHORT[last.getMonth()]} ${last.getDate()}, ${first.getFullYear()}`;
  }, [weekDates]);

  const toggleOff = (iso: string) => {
    setDaysOff(prev => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso); else next.add(iso);
      return next;
    });
  };

  const todayIso = isoDate(today);

  const utilColor = focusMember.utilizationRate > 90 ? "#ef4444" : focusMember.utilizationRate > 80 ? "#f59e0b" : "#22c55e";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={FONT}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border-strong)", width: 900, maxWidth: "calc(100vw - 48px)", height: "88vh" }}>

        {/* ── Modal header ── */}
        <div className="flex items-center gap-4 px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--app-border-strong)" }}>
          {/* Member picker */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: focusMember.member?.color || "#525252", color: "var(--app-text-primary)" }}>
              {focusMember.member?.name?.charAt(0) ?? "?"}
            </div>
            <div>
              <div className="text-foreground font-semibold text-sm">{focusMember.member?.name}</div>
              <div className="text-[9px]" style={{ color: utilColor }}>{focusMember.utilizationRate}% utilized</div>
            </div>
          </div>

          {/* Member switcher pills */}
          {view === "individual" && (
            <div className="flex items-center gap-1 overflow-x-auto">
              {allMembers.map((m, i) => (
                <button key={i} type="button" onClick={() => setFocusMember(m)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-medium transition-colors flex-shrink-0"
                  style={{
                    backgroundColor: focusMember === m ? (m.member?.color || "#525252") : "var(--app-card-elevated)",
                    color: focusMember === m ? "var(--app-text-primary)" : "#777",
                    border: `1px solid ${focusMember === m ? "transparent" : "var(--app-border-strong)"}`,
                  }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: focusMember === m ? "rgba(255,255,255,0.3)" : (m.member?.color || "#525252"), color: "var(--app-text-primary)" }}>
                    {m.member?.name?.charAt(0)}
                  </div>
                  {m.member?.name?.split(" ")[0]}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: "var(--app-card-elevated)" }}>
            {([["individual", "Week View"], ["team", "Team View"]] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors"
                style={{ backgroundColor: view === v ? "var(--app-text-primary)" : "transparent", color: view === v ? "var(--app-bg-elevated)" : "#777" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Week nav */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setWeekOffset(0)}
              className="px-2 py-1 rounded text-[9px] font-medium transition-colors hover:bg-white/10"
              style={{ color: "var(--app-text-muted)", border: "1px solid var(--app-border-strong)" }}>Today</button>
            <button type="button" onClick={() => setWeekOffset(p => p - 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white/10 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-[11px] font-medium text-gray-300 min-w-[160px] text-center">{weekLabel}</span>
            <button type="button" onClick={() => setWeekOffset(p => p + 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white/10 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--app-text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Legend + hints ── */}
        <div className="flex items-center gap-4 px-5 py-2 flex-shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid var(--app-card-elevated)", backgroundColor: "var(--app-bg)" }}>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ef444418", border: "1px solid #ef444430" }} />
            <span className="text-[9px] text-gray-600">Day off</span>
          </div>
          <span className="text-[9px] text-gray-700 flex-shrink-0">·</span>
          <span className="text-[9px] text-gray-600 flex-shrink-0">
            {view === "individual" ? "Click a day header to toggle day off" : "Day-off columns affect the whole team"}
          </span>
          <div className="flex-1" />
          {(focusMember.projectAllocations ?? []).map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
              <span className="text-[9px] text-gray-500">{p.projectName}</span>
              <span className="text-[8px] text-gray-700">{p.allocationPct}%</span>
            </div>
          ))}
          {daysOff.size > 0 && (
            <button type="button" onClick={() => setDaysOff(new Set())}
              className="text-[9px] px-2 py-0.5 rounded transition-colors hover:bg-white/10 flex-shrink-0"
              style={{ color: "#ef4444", border: "1px solid #ef444430" }}>
              Clear all days off
            </button>
          )}
        </div>

        {/* ── Calendar body ── */}
        <div className="flex-1 overflow-hidden">
          {view === "team" ? (
            <TeamPlanningView
              members={allMembers}
              weekDates={weekDates}
              daysOff={daysOff}
              onToggleOff={toggleOff}
            />
          ) : (
            <div className="flex h-full overflow-auto">
              {/* Hour labels */}
              <div className="flex flex-col flex-shrink-0" style={{ paddingTop: 60 }}>
                {Array.from({ length: HOUR_COUNT }, (_, i) => (
                  <HourLabel key={i} hour={HOUR_START + i} />
                ))}
              </div>

              {/* Day columns */}
              <div className="flex flex-1 min-w-0">
                {weekDates.map(d => (
                  <DayColumn
                    key={isoDate(d)}
                    date={d}
                    member={focusMember}
                    isOff={daysOff.has(isoDate(d))}
                    onToggleOff={() => toggleOff(isoDate(d))}
                    isToday={isoDate(d) === todayIso}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
