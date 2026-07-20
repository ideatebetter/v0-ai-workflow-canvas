"use client";

import React, { useState, useCallback } from "react";
import type { WorkspaceMember, CanvasFramework, Canvas } from "@/lib/atlas-types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  "Brand Identity",
  "Campaign",
  "UX/Product",
  "Motion",
  "Environmental",
  "Editorial",
  "Other",
] as const;

const MEMBER_ROLES = [
  "Creative Director",
  "Designer",
  "Project Manager",
  "Strategist",
  "Producer",
] as const;

const DEFAULT_PHASES = [
  "Onboarding",
  "Strategy",
  "Ideation",
  "Creation",
  "Presentation",
  "Revision",
  "Feedback",
];

type BillingType = "flat_fee" | "hourly";
type SetupChoice = "framework" | "canvas" | "collection" | "skip";

interface Phase {
  name: string;
  dueDate: string;
}

interface AssignedMember {
  userId: string;
  name: string;
  initials: string;
  email: string;
  role: string;
}

interface FormData {
  name: string;
  clientName: string;
  projectType: string;
  billingType: BillingType;
  startDate: string;
  endDate: string;
  phases: Phase[];
  members: AssignedMember[];
  totalFee: string;
  estimatedHours: Record<string, string>;
  setupChoice: SetupChoice;
  selectedFrameworkId: string;
  figmaUrl: string;
}

interface Props {
  onClose: () => void;
  workspaceMembers: WorkspaceMember[];
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  currentUserInitials: string;
  workspaceId?: string;
  frameworks?: CanvasFramework[];
  canvases?: Canvas[];
  onOpenCanvas?: (canvasId: string) => void;
  onCanvasesChange?: (canvases: Canvas[]) => void;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

const FONT = { fontFamily: "system-ui, Inter, sans-serif" };

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-gray-500 mb-1.5" style={FONT}>{children}</label>;
}

function TextInput({ value, onChange, placeholder, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30"
      style={{ backgroundColor: "var(--app-bg)", border: "1px solid var(--app-canvas-dot)", ...FONT }}
    />
  );
}

function SelectInput({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-white/30 appearance-none cursor-pointer"
      style={{ backgroundColor: "var(--app-bg)", border: "1px solid var(--app-canvas-dot)", ...FONT }}
    >
      {children}
    </select>
  );
}

function DateInput({ value, onChange, min, placeholder }: {
  value: string; onChange: (v: string) => void; min?: string; placeholder?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      min={min}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-white/30"
      style={{ backgroundColor: "var(--app-bg)", border: "1px solid var(--app-canvas-dot)", colorScheme: "dark", ...FONT }}
    />
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="text-xs mt-1" style={{ color: "#EF4444", ...FONT }}>{msg}</p>;
}

// ─── Step 1: Basics ───────────────────────────────────────────────────────────

function StepBasics({ data, onChange, errors }: {
  data: FormData;
  onChange: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Project Name *</Label>
        <TextInput value={data.name} onChange={v => onChange("name", v)} placeholder="2nd Nature — Brand Identity" autoFocus />
        {errors.name && <ErrorMsg msg={errors.name} />}
      </div>
      <div>
        <Label>Client Name *</Label>
        <TextInput value={data.clientName} onChange={v => onChange("clientName", v)} placeholder="2nd Nature Fitness" />
        {errors.clientName && <ErrorMsg msg={errors.clientName} />}
      </div>
      <div>
        <Label>Project Type *</Label>
        <SelectInput value={data.projectType} onChange={v => onChange("projectType", v)}>
          <option value="">Select type…</option>
          {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </SelectInput>
        {errors.projectType && <ErrorMsg msg={errors.projectType} />}
      </div>
      <div>
        <Label>Billing Type *</Label>
        <div className="flex gap-2">
          {(["flat_fee", "hourly"] as BillingType[]).map(bt => (
            <button
              key={bt}
              type="button"
              onClick={() => onChange("billingType", bt)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: data.billingType === bt ? "#F0FE00" : "var(--app-bg)",
                color: data.billingType === bt ? "var(--app-bg-elevated)" : "var(--app-text-muted)",
                border: `1px solid ${data.billingType === bt ? "transparent" : "var(--app-canvas-dot)"}`,
                ...FONT,
              }}
            >
              {bt === "flat_fee" ? "Flat Fee" : "Hourly"}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1.5" style={FONT}>Cannot be changed after creation.</p>
      </div>
    </div>
  );
}

// ─── Step 2: Timeline ─────────────────────────────────────────────────────────

function StepTimeline({ data, onChange, errors }: {
  data: FormData;
  onChange: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  errors: Record<string, string>;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const updatePhase = (idx: number, patch: Partial<Phase>) => {
    const next = data.phases.map((p, i) => i === idx ? { ...p, ...patch } : p);
    onChange("phases", next);
  };

  const movePhase = (from: number, to: number) => {
    const next = [...data.phases];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange("phases", next);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date *</Label>
          <DateInput value={data.startDate} onChange={v => onChange("startDate", v)} />
          {errors.startDate && <ErrorMsg msg={errors.startDate} />}
        </div>
        <div>
          <Label>End Date *</Label>
          <DateInput value={data.endDate} onChange={v => onChange("endDate", v)} min={data.startDate || undefined} />
          {errors.endDate && <ErrorMsg msg={errors.endDate} />}
        </div>
      </div>

      <div>
        <Label>Project Phases</Label>
        <p className="text-xs text-gray-600 mb-2" style={FONT}>Drag to reorder · Click name to rename · Set a due date per phase</p>
        <div className="space-y-1.5">
          {data.phases.map((phase, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => setDragging(idx)}
              onDragOver={e => { e.preventDefault(); setDragOver(idx); }}
              onDrop={() => {
                if (dragging !== null && dragging !== idx) movePhase(dragging, idx);
                setDragging(null); setDragOver(null);
              }}
              onDragEnd={() => { setDragging(null); setDragOver(null); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: dragOver === idx ? "var(--app-border-strong)" : "var(--app-bg-elevated)",
                border: `1px solid ${dragOver === idx ? "var(--app-text-faint)" : "var(--app-border-strong)"}`,
                opacity: dragging === idx ? 0.4 : 1,
              }}
            >
              {/* Drag handle */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 text-gray-600 cursor-grab">
                <circle cx="4" cy="3" r="1.2" fill="currentColor"/>
                <circle cx="8" cy="3" r="1.2" fill="currentColor"/>
                <circle cx="4" cy="6" r="1.2" fill="currentColor"/>
                <circle cx="8" cy="6" r="1.2" fill="currentColor"/>
                <circle cx="4" cy="9" r="1.2" fill="currentColor"/>
                <circle cx="8" cy="9" r="1.2" fill="currentColor"/>
              </svg>

              <span className="text-xs text-gray-600 w-4 flex-shrink-0 text-center" style={FONT}>{idx + 1}</span>

              {/* Phase name */}
              {editingIdx === idx ? (
                <input
                  autoFocus
                  value={phase.name}
                  onChange={e => updatePhase(idx, { name: e.target.value })}
                  onBlur={() => setEditingIdx(null)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingIdx(null); }}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none min-w-0"
                  style={FONT}
                />
              ) : (
                <button
                  type="button"
                  className="flex-1 text-left text-sm text-foreground hover:text-gray-200 truncate"
                  style={FONT}
                  onClick={() => setEditingIdx(idx)}
                >
                  {phase.name}
                </button>
              )}

              {/* Due date — compact */}
              <input
                type="date"
                value={phase.dueDate}
                onChange={e => updatePhase(idx, { dueDate: e.target.value })}
                min={data.startDate || undefined}
                max={data.endDate || undefined}
                className="text-xs text-gray-500 bg-transparent focus:outline-none focus:text-foreground flex-shrink-0 w-32 cursor-pointer"
                style={{ colorScheme: "dark", ...FONT }}
                title="Phase due date"
              />

              {data.phases.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange("phases", data.phases.filter((_, i) => i !== idx))}
                  className="flex-shrink-0 text-gray-600 hover:text-gray-400 transition-colors ml-1"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onChange("phases", [...data.phases, { name: "New Phase", dueDate: "" }])}
          className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          style={FONT}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add phase
        </button>
        {errors.phases && <ErrorMsg msg={errors.phases} />}
      </div>
    </div>
  );
}

// ─── Step 3: Team ─────────────────────────────────────────────────────────────

function StepTeam({ data, onChange, workspaceMembers, currentUserId, errors }: {
  data: FormData;
  onChange: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  workspaceMembers: WorkspaceMember[];
  currentUserId: string;
  errors: Record<string, string>;
}) {
  const assignedIds = new Set(data.members.map(m => m.userId));

  const addMember = (member: WorkspaceMember) => {
    if (assignedIds.has(member.id)) return;
    onChange("members", [...data.members, {
      userId: member.id, name: member.name, initials: member.initials,
      email: member.email ?? "", role: "Designer",
    }]);
  };

  const removeMember = (userId: string) => {
    if (userId === currentUserId) return;
    onChange("members", data.members.filter(m => m.userId !== userId));
  };

  const updateRole = (userId: string, role: string) =>
    onChange("members", data.members.map(m => m.userId === userId ? { ...m, role } : m));

  const available = workspaceMembers.filter(m => !assignedIds.has(m.id));

  return (
    <div className="space-y-5">
      <div>
        <Label>Assigned Team</Label>
        <div className="space-y-2">
          {data.members.map(member => (
            <div key={member.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border-strong)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{ backgroundColor: "#F0FE00", color: "var(--app-bg-elevated)" }}>
                {member.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate" style={FONT}>
                  {member.name}
                  {member.userId === currentUserId && <span className="ml-1.5 text-xs text-gray-600">(you)</span>}
                </div>
                <div className="text-xs text-gray-600 truncate" style={FONT}>{member.email}</div>
              </div>
              <select
                value={member.role}
                onChange={e => updateRole(member.userId, e.target.value)}
                disabled={member.userId === currentUserId}
                className="text-xs text-gray-300 bg-transparent focus:outline-none cursor-pointer disabled:cursor-default disabled:text-gray-600"
                style={FONT}
              >
                {MEMBER_ROLES.map(r => <option key={r} value={r} style={{ backgroundColor: "var(--app-card-elevated)" }}>{r}</option>)}
              </select>
              {member.userId !== currentUserId && (
                <button type="button" onClick={() => removeMember(member.userId)}
                  className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.members && <ErrorMsg msg={errors.members} />}
      </div>

      {available.length > 0 && (
        <div>
          <Label>Add from workspace</Label>
          <div className="space-y-1.5">
            {available.map(member => (
              <button key={member.id} type="button" onClick={() => addMember(member)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
                style={{ border: "1px solid var(--app-border)" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: "var(--app-border-strong)", color: "var(--app-text-muted)" }}>
                  {member.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-300 truncate" style={FONT}>{member.name}</div>
                  {member.email && <div className="text-xs text-gray-600 truncate" style={FONT}>{member.email}</div>}
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-600 flex-shrink-0">
                  <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Estimate ─────────────────────────────────────────────────────────

function StepEstimate({ data, onChange }: {
  data: FormData;
  onChange: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  if (data.billingType === "flat_fee") {
    return (
      <div className="space-y-5">
        <div>
          <Label>Total Project Fee</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500" style={FONT}>$</span>
            <input type="number" min="0" step="100" value={data.totalFee}
              onChange={e => onChange("totalFee", e.target.value)} placeholder="0"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm text-foreground placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30"
              style={{ backgroundColor: "var(--app-bg)", border: "1px solid var(--app-canvas-dot)", ...FONT }} />
          </div>
        </div>
        <p className="text-xs text-gray-600" style={FONT}>You can update this later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Estimated Hours per Team Member</Label>
        <p className="text-xs text-gray-600 mb-3" style={FONT}>Enter estimated hours for each person.</p>
      </div>
      <div className="space-y-2">
        {data.members.map(member => (
          <div key={member.userId} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: "#F0FE00", color: "var(--app-bg-elevated)" }}>
              {member.initials}
            </div>
            <span className="flex-1 text-sm text-gray-300 min-w-0 truncate" style={FONT}>{member.name}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <input type="number" min="0" step="1"
                value={data.estimatedHours[member.userId] ?? ""}
                onChange={e => onChange("estimatedHours", { ...data.estimatedHours, [member.userId]: e.target.value })}
                placeholder="0"
                className="w-20 px-3 py-2 rounded-lg text-sm text-foreground text-right placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30"
                style={{ backgroundColor: "var(--app-bg)", border: "1px solid var(--app-canvas-dot)", ...FONT }} />
              <span className="text-xs text-gray-600" style={FONT}>hrs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5: Setup ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  branding: "#F0FE00",
  campaign: "#F59E0B",
  "ux-product": "#3B82F6",
  motion: "#8B5CF6",
  editorial: "#10B981",
  other: "#6B7280",
};

function isValidFigmaUrl(url: string): boolean {
  return url.trim() === "" || /figma\.com\/(design|file|proto)\//i.test(url);
}

function StepSetup({ data, onChange, frameworks }: {
  data: FormData;
  onChange: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  frameworks: CanvasFramework[];
}) {
  const choices: { id: SetupChoice; label: string; description: string; icon: React.ReactNode }[] = [
    {
      id: "framework",
      label: "Start from a framework",
      description: "Use a template to scaffold the project canvas",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="#F0FE00" strokeWidth="1.5"/>
          <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="#F0FE00" strokeWidth="1.5"/>
          <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="#F0FE00" strokeWidth="1.5"/>
          <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="#F0FE00" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      id: "canvas",
      label: "Blank canvas",
      description: "Open an empty canvas and build from scratch",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="16" height="16" rx="2" stroke="#3B82F6" strokeWidth="1.5"/>
          <path d="M7 10H13M10 7V13" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "collection",
      label: "Start a collection",
      description: "Group canvases together under this project",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M2 6C2 4.89543 2.89543 4 4 4H7L9 6H16C17.1046 6 18 6.89543 18 8V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V6Z" stroke="#10B981" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      id: "skip",
      label: "Skip for now",
      description: "Set up the canvas later",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="var(--app-text-faint)" strokeWidth="1.5"/>
          <path d="M10 6V10L13 12" stroke="var(--app-text-faint)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {choices.map(choice => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onChange("setupChoice", choice.id)}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all"
            style={{
              backgroundColor: data.setupChoice === choice.id ? "var(--app-card-elevated)" : "var(--app-bg)",
              border: `1px solid ${data.setupChoice === choice.id ? "var(--app-text-faint)" : "var(--app-border)"}`,
              outline: data.setupChoice === choice.id ? "1px solid rgba(240,254,0,0.2)" : "none",
            }}
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--app-card-elevated)" }}>
              {choice.icon}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground" style={FONT}>{choice.label}</div>
              <div className="text-xs text-gray-500 mt-0.5" style={FONT}>{choice.description}</div>
            </div>
            <div className="flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center"
              style={{
                borderColor: data.setupChoice === choice.id ? "#F0FE00" : "var(--app-text-faint)",
                backgroundColor: data.setupChoice === choice.id ? "#F0FE00" : "transparent",
              }}>
              {data.setupChoice === choice.id && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--app-bg-elevated)" }} />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Figma URL — shown when blank canvas is selected */}
      {data.setupChoice === "canvas" && (
        <div className="mt-1">
          <p className="text-xs text-gray-600 mb-2" style={FONT}>Link a Figma file (optional)</p>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="5" cy="3.5" r="2" stroke="var(--app-text-muted)" strokeWidth="1.2"/>
                <circle cx="5" cy="7" r="2" stroke="var(--app-text-muted)" strokeWidth="1.2"/>
                <circle cx="5" cy="10.5" r="2" stroke="var(--app-text-muted)" strokeWidth="1.2"/>
                <circle cx="9" cy="3.5" r="2" stroke="var(--app-text-muted)" strokeWidth="1.2"/>
                <circle cx="9" cy="7" r="2" stroke="#F0FE00" strokeWidth="1.2"/>
              </svg>
            </div>
            <input
              type="url"
              value={data.figmaUrl}
              onChange={e => onChange("figmaUrl", e.target.value)}
              placeholder="https://www.figma.com/design/…"
              className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm text-foreground placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              style={{ backgroundColor: "var(--app-bg)", border: `1px solid ${data.figmaUrl && !isValidFigmaUrl(data.figmaUrl) ? "#EF4444" : "var(--app-canvas-dot)"}`, ...FONT }}
            />
          </div>
          {data.figmaUrl && !isValidFigmaUrl(data.figmaUrl) && (
            <p className="text-xs mt-1" style={{ color: "#EF4444", ...FONT }}>Must be a valid figma.com URL</p>
          )}
          {data.figmaUrl && isValidFigmaUrl(data.figmaUrl) && data.figmaUrl.trim() !== "" && (
            <p className="text-xs mt-1" style={{ color: "var(--app-text-muted)", ...FONT }}>Figma link saved with this canvas.</p>
          )}
        </div>
      )}

      {/* Framework picker */}
      {data.setupChoice === "framework" && frameworks.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-600 mb-2" style={FONT}>Choose a framework</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {frameworks.map(fw => {
              const accent = CATEGORY_COLORS[fw.category] ?? "#6B7280";
              const selected = data.selectedFrameworkId === fw.id;
              return (
                <button
                  key={fw.id}
                  type="button"
                  onClick={() => onChange("selectedFrameworkId", fw.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: selected ? "var(--app-card-elevated)" : "var(--app-bg-elevated)",
                    border: `1px solid ${selected ? accent : "var(--app-border-strong)"}`,
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: "var(--app-card-elevated)", border: `1px solid ${accent}33` }}>
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate" style={FONT}>{fw.name}</div>
                    <div className="text-xs text-gray-500 truncate" style={FONT}>{fw.description}</div>
                  </div>
                  {selected && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                      <path d="M3 8L6.5 11.5L13 4.5" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          {data.setupChoice === "framework" && !data.selectedFrameworkId && (
            <p className="text-xs text-gray-600 mt-2" style={FONT}>Select a framework above to continue.</p>
          )}
        </div>
      )}

      {data.setupChoice === "framework" && frameworks.length === 0 && (
        <div className="mt-2 px-3 py-3 rounded-lg" style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border)" }}>
          <p className="text-xs text-gray-500" style={FONT}>No frameworks available in your workspace yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 6: Review ───────────────────────────────────────────────────────────

function StepReview({ data, frameworks }: { data: FormData; frameworks: CanvasFramework[] }) {
  const totalHours = Object.values(data.estimatedHours).reduce((s, h) => s + (parseFloat(h) || 0), 0);
  const selectedFramework = frameworks.find(f => f.id === data.selectedFrameworkId);

  const setupLabel = {
    framework: selectedFramework ? `Framework: ${selectedFramework.name}` : "Framework",
    canvas: "Blank canvas",
    collection: "New collection",
    skip: "Skip for now",
  }[data.setupChoice];

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border)" }}>
        {/* Project basics */}
        <div>
          <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide" style={FONT}>Project</p>
          <p className="text-base font-semibold text-foreground" style={FONT}>{data.name}</p>
          <p className="text-sm text-gray-400" style={FONT}>{data.clientName}</p>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {[data.projectType, data.billingType === "flat_fee" ? "Flat Fee" : "Hourly"].map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--app-card-elevated)", color: "var(--app-text-muted)", border: "1px solid var(--app-border-strong)", ...FONT }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: "var(--app-border)" }} />

        {/* Timeline */}
        <div>
          <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide" style={FONT}>Timeline</p>
          <p className="text-sm text-gray-300" style={FONT}>{data.startDate} → {data.endDate}</p>
          <div className="mt-2 space-y-1">
            {data.phases.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-gray-400" style={FONT}>{i + 1}. {p.name}</span>
                {p.dueDate && <span className="text-xs text-gray-600" style={FONT}>{p.dueDate}</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: "var(--app-border)" }} />

        {/* Team */}
        <div>
          <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide" style={FONT}>Team</p>
          <div className="space-y-1">
            {data.members.map(m => (
              <div key={m.userId} className="flex items-center justify-between">
                <span className="text-sm text-gray-300" style={FONT}>{m.name}</span>
                <span className="text-xs text-gray-600" style={FONT}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Estimate */}
        {(data.totalFee || totalHours > 0) && (
          <>
            <div style={{ height: 1, backgroundColor: "var(--app-border)" }} />
            <div>
              <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide" style={FONT}>Estimate</p>
              {data.billingType === "flat_fee" && data.totalFee ? (
                <p className="text-sm text-gray-300" style={FONT}>${parseFloat(data.totalFee).toLocaleString()} total</p>
              ) : (
                <p className="text-sm text-gray-300" style={FONT}>{totalHours} est. hours</p>
              )}
            </div>
          </>
        )}

        {/* Setup */}
        <div style={{ height: 1, backgroundColor: "var(--app-border)" }} />
        <div>
          <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide" style={FONT}>Starting with</p>
          <p className="text-sm text-gray-300" style={FONT}>{setupLabel}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

const STEP_LABELS = ["Basics", "Timeline", "Team", "Estimate", "Setup", "Review"];

export function ProjectCreationModal({
  onClose,
  workspaceMembers,
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserInitials,
  workspaceId,
  frameworks = [],
  canvases = [],
  onOpenCanvas,
  onCanvasesChange,
}: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormData>({
    name: "",
    clientName: "",
    projectType: "",
    billingType: "flat_fee",
    startDate: "",
    endDate: "",
    phases: DEFAULT_PHASES.map(name => ({ name, dueDate: "" })),
    members: [{
      userId: currentUserId,
      name: currentUserName,
      initials: currentUserInitials,
      email: currentUserEmail,
      role: "Creative Director",
    }],
    totalFee: "",
    estimatedHours: {},
    setupChoice: "canvas",
    selectedFrameworkId: "",
    figmaUrl: "",
  });

  const update = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: "" }));
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!form.name.trim()) errs.name = "Project name is required.";
      if (!form.clientName.trim()) errs.clientName = "Client name is required.";
      if (!form.projectType) errs.projectType = "Select a project type.";
    }
    if (step === 1) {
      if (!form.startDate) errs.startDate = "Start date is required.";
      if (!form.endDate) errs.endDate = "End date is required.";
      else if (form.startDate && form.endDate < form.startDate) errs.endDate = "End date must be after start date.";
      if (form.phases.length === 0) errs.phases = "At least one phase is required.";
      if (form.phases.some(p => !p.name.trim())) errs.phases = "Phase names cannot be empty.";
    }
    if (step === 2) {
      if (form.members.length === 0) errs.members = "At least one team member is required.";
    }
    if (step === 4 && form.setupChoice === "framework" && !form.selectedFrameworkId) {
      errs.setup = "Select a framework or choose a different option.";
    }
    if (step === 4 && form.setupChoice === "canvas" && form.figmaUrl && !isValidFigmaUrl(form.figmaUrl)) {
      errs.setup = "Enter a valid Figma URL or leave it empty.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const estimate =
        form.billingType === "flat_fee" && form.totalFee
          ? { totalFee: parseFloat(form.totalFee) }
          : form.billingType === "hourly" && Object.keys(form.estimatedHours).length > 0
          ? { estimatedHours: Object.fromEntries(Object.entries(form.estimatedHours).filter(([, v]) => v !== "").map(([k, v]) => [k, parseFloat(v)])) }
          : null;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          clientName: form.clientName.trim(),
          projectType: form.projectType,
          billingType: form.billingType,
          startDate: form.startDate,
          endDate: form.endDate,
          phases: form.phases.map(p => ({ name: p.name.trim(), dueDate: p.dueDate || null })).filter(p => p.name),
          members: form.members.map(m => ({ userId: m.userId, role: m.role })),
          estimate,
          workspaceId,
          setupChoice: form.setupChoice,
          selectedFrameworkId: form.selectedFrameworkId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create project");
      }

      const { project } = await res.json();

      // Handle setup choice
      if ((form.setupChoice === "canvas" || form.setupChoice === "framework") && onOpenCanvas && onCanvasesChange) {
        const selectedFramework = form.setupChoice === "framework"
          ? frameworks.find(f => f.id === form.selectedFrameworkId)
          : undefined;

        const newCanvas: Canvas = {
          id: `canvas-${Date.now()}`,
          name: selectedFramework ? selectedFramework.name : form.name.trim(),
          workspaceId: workspaceId,
          nodes: selectedFramework?.nodes ?? [],
          edges: selectedFramework?.edges ?? [],
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: { id: currentUserId, name: currentUserName, initials: currentUserInitials, email: currentUserEmail },
          isFavorite: false,
          visibility: "workspace",
          presentationFlows: selectedFramework?.presentationFlows ?? [],
          ...(form.figmaUrl.trim() ? { figmaUrl: form.figmaUrl.trim() } : {}),
        };

        onCanvasesChange([...canvases, newCanvas]);
        onClose();
        onOpenCanvas(newCanvas.id);
      } else {
        onClose();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === STEP_LABELS.length - 1;
  const isEstimateStep = step === 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-[560px] sm:mx-4 rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border-strong)", maxHeight: "calc(100dvh - 48px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: "1px solid var(--app-card-elevated)" }}>
          <div>
            <h2 className="text-base font-semibold text-foreground" style={FONT}>New Project</h2>
            <p className="text-xs text-gray-600 mt-0.5" style={FONT}>{STEP_LABELS[step]}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 px-6 py-3">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={i}>
              <div
                className="flex items-center gap-1.5"
                style={{ cursor: i < step ? "pointer" : "default" }}
                onClick={() => { if (i < step) setStep(i); }}
              >
                <div
                  className="rounded-full transition-all"
                  style={{
                    width: i === step ? 20 : 7,
                    height: 7,
                    backgroundColor: i === step ? "#F0FE00" : i < step ? "var(--app-text-faint)" : "var(--app-border-strong)",
                  }}
                />
                {i === step && <span className="text-xs text-gray-400" style={FONT}>{label}</span>}
              </div>
              {i < STEP_LABELS.length - 1 && <div className="w-2 h-px flex-shrink-0" style={{ backgroundColor: "var(--app-border-strong)" }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 0 && <StepBasics data={form} onChange={update} errors={errors} />}
          {step === 1 && <StepTimeline data={form} onChange={update} errors={errors} />}
          {step === 2 && <StepTeam data={form} onChange={update} workspaceMembers={workspaceMembers} currentUserId={currentUserId} errors={errors} />}
          {step === 3 && <StepEstimate data={form} onChange={update} />}
          {step === 4 && <StepSetup data={form} onChange={update} frameworks={frameworks} />}
          {step === 5 && <StepReview data={form} frameworks={frameworks} />}

          {errors.setup && <ErrorMsg msg={errors.setup} />}
          {submitError && (
            <div className="mt-4 px-3 py-2.5 rounded-lg" style={{ backgroundColor: "#1a0a0a", border: "1px solid #5a1a1a" }}>
              <p className="text-xs" style={{ color: "#EF4444", ...FONT }}>{submitError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid var(--app-card-elevated)" }}>
          {step > 0 ? (
            <button type="button" onClick={() => setStep(s => s - 1)} disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-foreground transition-colors" style={FONT}>
              Back
            </button>
          ) : (
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-foreground transition-colors" style={FONT}>
              Cancel
            </button>
          )}

          <div className="flex items-center gap-3">
            {isEstimateStep && (
              <button type="button" onClick={() => setStep(s => s + 1)} disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors" style={FONT}>
                Skip for now
              </button>
            )}
            <button
              type="button"
              onClick={isLastStep ? handleSubmit : handleContinue}
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{ backgroundColor: "#F0FE00", color: "var(--app-bg-elevated)", ...FONT }}
            >
              {submitting ? "Creating…" : isLastStep ? "Create Project" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
