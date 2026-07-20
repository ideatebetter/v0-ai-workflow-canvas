"use client";

import React from "react";
import type { NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { FinancialNodeData } from "@/lib/atlas-types";

const GREEN = "#10b981";
const AMBER = "#f59e0b";
const RED   = "#ef4444";

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function FinancialNode({ id, data, selected }: NodeProps) {
  const d        = data as unknown as FinancialNodeData;
  const currency = d.currency ?? "USD";
  const grossPct = d.grossMarginPct ?? d.projectMargin ?? 0;
  const revenue  = d.revenue ?? 0;
  const cost     = d.costToDate ?? 0;
  const hoursLogged    = d.hoursLogged ?? 0;
  const hoursEstimated = d.hoursEstimated ?? 0;
  const hoursPct = hoursEstimated > 0 ? Math.round((hoursLogged / hoursEstimated) * 100) : 0;
  const totalV   = d.totalVariance ?? 0;

  const marginColor = grossPct >= 30 ? GREEN : grossPct >= 15 ? AMBER : RED;
  const hoursColor  = hoursPct > 90 ? RED : hoursPct > 75 ? AMBER : GREEN;
  const statusColor = d.status === "healthy" ? GREEN : d.status === "at-risk" ? AMBER : RED;
  const varColor    = totalV >= 0 ? GREEN : totalV > -5000 ? AMBER : RED;

  const FONT = { fontFamily: "system-ui, Inter, sans-serif" };

  return (
    <div
      style={{
        width: 220,
        backgroundColor: "var(--app-bg-elevated)",
        borderRadius: 14,
        border: selected ? `2px solid ${GREEN}` : `1px solid ${GREEN}22`,
        overflow: "hidden",
        ...FONT,
      }}
    >
      <SmartHandles nodeId={id} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${GREEN}18` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: `${GREEN}18` }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="text-[10px] font-medium text-gray-400 truncate">{d.label || "Financial Performance"}</span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
      </div>

      {/* Hero margin number */}
      <div className="px-4 pt-4 pb-2">
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, letterSpacing: -4, color: marginColor }}>
          {grossPct}<span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>%</span>
        </div>
        <div className="text-[9px] uppercase tracking-widest mt-1" style={{ color: "var(--app-text-faint)" }}>gross margin</div>
      </div>

      {/* Revenue / Cost */}
      <div className="grid grid-cols-2 gap-1.5 px-3 pb-2" style={{ borderTop: "1px solid var(--app-card-elevated)", paddingTop: 10 }}>
        <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          <div className="text-[8px] uppercase tracking-wide text-gray-600 mb-0.5">Revenue</div>
          <div className="text-sm font-bold text-foreground leading-none">{fmt(revenue, currency)}</div>
        </div>
        <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          <div className="text-[8px] uppercase tracking-wide text-gray-600 mb-0.5">Cost</div>
          <div className="text-sm font-bold text-foreground leading-none">{fmt(cost, currency)}</div>
        </div>
      </div>

      {/* Hours bar + variance */}
      <div className="px-3 pb-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-600">{hoursPct}% hours used</span>
          <span className="text-[9px] font-medium" style={{ color: varColor }}>
            var {totalV >= 0 ? "+" : ""}{fmt(totalV, currency)}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--app-text-primary)10" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(hoursPct, 100)}%`, backgroundColor: hoursColor }} />
        </div>
      </div>
    </div>
  );
}
