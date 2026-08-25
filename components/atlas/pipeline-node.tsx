"use client";

import React, { useState, useCallback } from "react";
import type { NodeProps } from "@xyflow/react";
import { Plus, ChevronDown, ChevronUp, Trophy, X } from "lucide-react";
import { SmartHandles } from "./smart-handles";
import type { PipelineNodeData, Deal, DealStage } from "@/lib/atlas-types";

const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const RED   = "#ef4444";
const BLUE  = "#3b82f6";
const FONT  = { fontFamily: "system-ui, Inter, sans-serif" };

const STAGE_LABELS: Record<DealStage, string> = {
  discovery:   "Discovery",
  proposal:    "Proposal",
  negotiation: "Negotiation",
  closing:     "Closing",
};
const STAGE_COLOR: Record<DealStage, string> = {
  discovery:   "#3b82f6",
  proposal:    "#8b5cf6",
  negotiation: "#f59e0b",
  closing:     "#22c55e",
};

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

const EMPTY_FORM = {
  dealName: "",
  clientName: "",
  estimatedValue: "",
  estimatedHours: "",
  probability: "50",
  stage: "discovery" as DealStage,
  notes: "",
};

export function PipelineNode({ id, data, selected }: NodeProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any as PipelineNodeData;
  const loadPct  = d.currentCapacity > 0 ? Math.round((d.projectedLoad / d.currentCapacity) * 100) : 0;
  const capColor = d.capacityStatus === "available" ? GREEN : d.capacityStatus === "balanced" ? BLUE : RED;

  const forecasts = [
    { label: "30d", items: d.forecast30Days ?? [], color: GREEN },
    { label: "60d", items: d.forecast60Days ?? [], color: BLUE  },
    { label: "90d", items: d.forecast90Days ?? [], color: AMBER },
  ];

  const deals = d.deals ?? [];
  const openDeals = deals.filter(dl => dl.status === "open");
  const closedDeals = deals.filter(dl => dl.status !== "open");

  const [showAddForm, setShowAddForm] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const dispatch = useCallback(<T,>(type: string, detail: T) => {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }, []);

  const handleAddDeal = useCallback(() => {
    const dealName = form.dealName.trim();
    const clientName = form.clientName.trim();
    if (!dealName || !clientName) return;
    const now = new Date().toISOString();
    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      dealName,
      clientName,
      estimatedValue: parseFloat(form.estimatedValue) || 0,
      estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
      probability: Math.min(100, Math.max(0, parseInt(form.probability) || 50)),
      stage: form.stage,
      status: "open",
      notes: form.notes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    dispatch("atlas:pipeline-add-deal", { nodeId: id, deal: newDeal });
    setForm({ ...EMPTY_FORM });
    setShowAddForm(false);
  }, [id, form, dispatch]);

  const handleWon = useCallback((deal: Deal) => {
    dispatch("atlas:deal-won", { nodeId: id, dealId: deal.id, deal });
  }, [id, dispatch]);

  const handleLost = useCallback((deal: Deal) => {
    dispatch("atlas:pipeline-deal-lost", { nodeId: id, dealId: deal.id });
  }, [id, dispatch]);

  return (
    <div
      style={{
        width: 280,
        backgroundColor: "var(--app-bg-elevated)",
        borderRadius: 14,
        border: selected ? `2px solid ${AMBER}` : `1px solid ${AMBER}22`,
        overflow: "hidden",
        ...FONT,
      }}
    >
      <SmartHandles nodeId={id} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${AMBER}18` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: `${AMBER}18` }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2.2">
              <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 6-6" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-gray-400 truncate">{d.label || "Pipeline Forecast"}</span>
        </div>
        <span className="text-[9px] font-semibold capitalize" style={{ color: capColor }}>{d.capacityStatus}</span>
      </div>

      {/* Capacity summary */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-end gap-1">
          <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: -2, color: capColor }}>{loadPct}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: capColor, marginBottom: 2 }}>%</span>
          <span className="text-[8px] uppercase tracking-widest ml-1 mb-1" style={{ color: "var(--app-text-faint)" }}>load</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden mt-1" style={{ backgroundColor: "var(--app-text-primary)0a" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(loadPct, 100)}%`, backgroundColor: capColor }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-gray-600">{d.projectedLoad}h needed</span>
          <span className="text-[8px] text-gray-600">{d.currentCapacity}h avail</span>
        </div>
      </div>

      {/* Forecast rows */}
      <div className="px-3 pb-2 space-y-0.5" style={{ borderTop: "1px solid var(--app-card-elevated)", paddingTop: 6 }}>
        {forecasts.map(({ label, items, color }) => {
          const hrs = items.reduce((s, p) => s + p.estimatedHours, 0);
          return (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[9px] font-semibold w-7" style={{ color }}>{label}</span>
              <span className="text-[9px] text-gray-600">{items.length} proj</span>
              <span className="text-[11px] font-bold" style={{ color }}>{hrs}h</span>
            </div>
          );
        })}
      </div>

      {/* ── DEAL TRACKER ── */}
      <div style={{ borderTop: `1px solid ${AMBER}28`, paddingTop: 6 }}>
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: AMBER }}>
            Deals · {openDeals.length} open
          </span>
          <button
            type="button"
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-0.5 text-[9px] hover:opacity-80 transition-opacity"
            style={{ color: AMBER }}
          >
            <Plus className="w-3 h-3" strokeWidth={2} />
            Add
          </button>
        </div>

        {/* Add deal form */}
        {showAddForm && (
          <div className="mx-3 mb-2 p-2 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border)" }}>
            <div className="space-y-1.5">
              <input
                className="w-full text-[11px] px-2 py-1 rounded"
                style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)", outline: "none", ...FONT }}
                placeholder="Client name *"
                value={form.clientName}
                onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                onKeyDown={e => e.stopPropagation()}
              />
              <input
                className="w-full text-[11px] px-2 py-1 rounded"
                style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)", outline: "none", ...FONT }}
                placeholder="Deal / project name *"
                value={form.dealName}
                onChange={e => setForm(f => ({ ...f, dealName: e.target.value }))}
                onKeyDown={e => e.stopPropagation()}
              />
              <div className="flex gap-1">
                <input
                  className="flex-1 text-[11px] px-2 py-1 rounded"
                  style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)", outline: "none", ...FONT }}
                  placeholder="Est. value $"
                  type="number"
                  value={form.estimatedValue}
                  onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))}
                  onKeyDown={e => e.stopPropagation()}
                />
                <input
                  className="flex-1 text-[11px] px-2 py-1 rounded"
                  style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)", outline: "none", ...FONT }}
                  placeholder="Hours"
                  type="number"
                  value={form.estimatedHours}
                  onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))}
                  onKeyDown={e => e.stopPropagation()}
                />
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-[9px] shrink-0" style={{ color: "var(--app-text-faint)" }}>Prob.</span>
                <input
                  type="range" min="0" max="100" step="5"
                  value={form.probability}
                  onChange={e => setForm(f => ({ ...f, probability: e.target.value }))}
                  className="flex-1 h-1 accent-amber-400"
                />
                <span className="text-[9px] w-7 text-right" style={{ color: AMBER }}>{form.probability}%</span>
              </div>
              <select
                className="w-full text-[11px] px-2 py-1 rounded"
                style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)", outline: "none", ...FONT }}
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value as DealStage }))}
              >
                {(["discovery", "proposal", "negotiation", "closing"] as DealStage[]).map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1 mt-2">
              <button
                type="button"
                onClick={handleAddDeal}
                disabled={!form.dealName.trim() || !form.clientName.trim()}
                className="flex-1 text-[10px] font-semibold py-1 rounded transition-opacity"
                style={{ backgroundColor: AMBER, color: "#000", opacity: (!form.dealName.trim() || !form.clientName.trim()) ? 0.4 : 1, ...FONT }}
              >
                Add Deal
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setForm({ ...EMPTY_FORM }); }}
                className="px-2 text-[10px] py-1 rounded"
                style={{ backgroundColor: "var(--app-border)", color: "var(--app-text-muted)", ...FONT }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Open deals */}
        <div className="px-3 pb-1 space-y-1.5">
          {openDeals.length === 0 && !showAddForm && (
            <p className="text-[9px] py-1 text-center" style={{ color: "var(--app-text-faint)" }}>No open deals — add one above</p>
          )}
          {openDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} onWon={handleWon} onLost={handleLost} />
          ))}
        </div>

        {/* Closed deals toggle */}
        {closedDeals.length > 0 && (
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => setShowClosed(v => !v)}
              className="flex items-center gap-1 text-[9px] w-full hover:opacity-70 transition-opacity"
              style={{ color: "var(--app-text-faint)" }}
            >
              {showClosed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {closedDeals.length} closed deal{closedDeals.length !== 1 ? "s" : ""}
            </button>
            {showClosed && (
              <div className="mt-1 space-y-1">
                {closedDeals.map(deal => (
                  <DealCard key={deal.id} deal={deal} onWon={handleWon} onLost={handleLost} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DealCard({ deal, onWon, onLost }: { deal: Deal; onWon: (d: Deal) => void; onLost: (d: Deal) => void }) {
  const stageColor = STAGE_COLOR[deal.stage] ?? AMBER;
  const isOpen = deal.status === "open";
  const isWon  = deal.status === "won";

  return (
    <div
      className="rounded-lg p-2"
      style={{
        backgroundColor: isWon ? `${GREEN}10` : deal.status === "lost" ? "var(--app-card-elevated)" : "var(--app-card-elevated)",
        border: isWon ? `1px solid ${GREEN}40` : deal.status === "lost" ? "1px solid var(--app-border)" : `1px solid ${stageColor}30`,
        opacity: deal.status === "lost" ? 0.55 : 1,
      }}
    >
      {/* Client & name */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="text-[9px] font-medium truncate" style={{ color: "var(--app-text-muted)" }}>{deal.clientName}</div>
          <div className="text-[11px] font-semibold leading-tight truncate" style={{ color: "var(--app-text-primary)", ...FONT }}>{deal.dealName}</div>
        </div>
        {isWon && <Trophy className="w-3 h-3 shrink-0 mt-0.5" style={{ color: GREEN }} strokeWidth={2} />}
        {deal.status === "lost" && <X className="w-3 h-3 shrink-0 mt-0.5" style={{ color: RED }} strokeWidth={2} />}
      </div>

      {/* Value & probability */}
      <div className="flex items-center gap-2 mt-1">
        {deal.estimatedValue > 0 && (
          <span className="text-[10px] font-bold" style={{ color: AMBER }}>{fmtValue(deal.estimatedValue)}</span>
        )}
        <div className="flex items-center gap-1 flex-1">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--app-text-primary)12" }}>
            <div className="h-full rounded-full" style={{ width: `${deal.probability}%`, backgroundColor: stageColor }} />
          </div>
          <span className="text-[9px] font-medium w-6 text-right" style={{ color: stageColor }}>{deal.probability}%</span>
        </div>
      </div>

      {/* Stage & actions */}
      <div className="flex items-center justify-between mt-1.5">
        <span
          className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${stageColor}18`, color: stageColor }}
        >
          {STAGE_LABELS[deal.stage]}
        </span>
        {isOpen && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onLost(deal)}
              className="text-[9px] px-1.5 py-0.5 rounded font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: `${RED}18`, color: RED, ...FONT }}
            >
              Lost
            </button>
            <button
              type="button"
              onClick={() => onWon(deal)}
              className="text-[9px] px-1.5 py-0.5 rounded font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: `${GREEN}18`, color: GREEN, ...FONT }}
            >
              Won →
            </button>
          </div>
        )}
        {isWon && deal.convertedProjectId && (
          <span className="text-[8px]" style={{ color: GREEN }}>Project created</span>
        )}
      </div>
    </div>
  );
}
