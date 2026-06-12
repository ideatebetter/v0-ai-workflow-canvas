"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import type { CanvasFramework, FrameworkCategory } from "@/lib/atlas-types";
import { FRAMEWORK_CATEGORIES } from "@/lib/atlas-types";

type LibraryFilter = "all" | "mine" | "team" | "drafts";

interface FrameworkLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  frameworks: CanvasFramework[];
  currentUserId: string;
  onRun: (framework: CanvasFramework) => void;
  onDelete?: (frameworkId: string) => void;
}

export function FrameworkLibraryPanel({ isOpen, onClose, frameworks, currentUserId, onRun, onDelete }: FrameworkLibraryPanelProps) {
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<FrameworkCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = useMemo(() => {
    return frameworks.filter(f => {
      if (filter === "mine" && f.createdBy.id !== currentUserId) return false;
      if (filter === "team" && f.visibility === "private") return false;
      if (filter === "drafts" && f.isPublished !== false) return false;
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.tags.some(t => t.includes(q));
      }
      return true;
    });
  }, [frameworks, filter, categoryFilter, search, currentUserId]);

  const filterLabels: Record<LibraryFilter, string> = {
    all: "All",
    mine: "Created by me",
    team: "Team",
    drafts: "Drafts",
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 z-50 flex flex-col transition-transform duration-300"
        style={{
          width: 380,
          backgroundColor: "#111111",
          borderLeft: "1px solid #2a2a2a",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F0FE0015" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="#F0FE00" strokeWidth="1.3"/>
                <path d="M4.5 7H9.5M7 4.5V9.5" stroke="#F0FE00" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Framework Library</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#252525", border: "1px solid #333", color: "#888", fontFamily: "system-ui, Inter, sans-serif" }}>
              {frameworks.length}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search frameworks..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", fontFamily: "system-ui, Inter, sans-serif" }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-4 pb-2 flex gap-1 flex-shrink-0">
          {(Object.keys(filterLabels) as LibraryFilter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="px-2.5 py-1 rounded-md text-[11px] transition-colors"
              style={{
                backgroundColor: filter === f ? "#F0FE0015" : "transparent",
                border: `1px solid ${filter === f ? "#F0FE0040" : "transparent"}`,
                color: filter === f ? "#F0FE00" : "#666",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {/* Category pills */}
        <div className="px-4 pb-3 flex gap-1.5 flex-wrap flex-shrink-0">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className="px-2 py-0.5 rounded text-[10px] transition-colors"
            style={{
              backgroundColor: categoryFilter === "all" ? "#F0FE00" : "#1a1a1a",
              border: "1px solid " + (categoryFilter === "all" ? "#F0FE00" : "#333"),
              color: categoryFilter === "all" ? "#0a0a0a" : "#666",
              fontFamily: "system-ui, Inter, sans-serif",
            }}
          >
            All
          </button>
          {(Object.keys(FRAMEWORK_CATEGORIES) as FrameworkCategory[]).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className="px-2 py-0.5 rounded text-[10px] transition-colors"
              style={{
                backgroundColor: categoryFilter === cat ? "#F0FE00" : "#1a1a1a",
                border: "1px solid " + (categoryFilter === cat ? "#F0FE00" : "#333"),
                color: categoryFilter === cat ? "#0a0a0a" : "#666",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            >
              {FRAMEWORK_CATEGORIES[cat].label}
            </button>
          ))}
        </div>

        {/* Framework list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="3" stroke="#444" strokeWidth="1.5"/><path d="M8 11H14M11 8V14" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p className="text-sm text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No frameworks found</p>
              <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Try adjusting your filters</p>
            </div>
          )}

          {filtered.map(framework => (
            <FrameworkCard
              key={framework.id}
              framework={framework}
              isExpanded={expandedId === framework.id}
              onToggleExpand={() => setExpandedId(prev => prev === framework.id ? null : framework.id)}
              onRun={onRun}
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function FrameworkCard({
  framework,
  isExpanded,
  onToggleExpand,
  onRun,
  onDelete,
  currentUserId,
}: {
  framework: CanvasFramework;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRun: (f: CanvasFramework) => void;
  onDelete?: (id: string) => void;
  currentUserId: string;
}) {
  const paramCount = framework.parameters?.length ?? 0;
  const isOwn = framework.createdBy.id === currentUserId;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
    >
      {/* Thumbnail */}
      {framework.previewImage ? (
        <div className="h-28 overflow-hidden">
          <img src={framework.previewImage} alt={framework.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center" style={{ backgroundColor: "#141414" }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="10" height="10" rx="2" stroke="#333" strokeWidth="1.5"/>
            <rect x="18" y="4" width="10" height="10" rx="2" stroke="#333" strokeWidth="1.5"/>
            <rect x="4" y="18" width="10" height="10" rx="2" stroke="#333" strokeWidth="1.5"/>
            <rect x="18" y="18" width="10" height="10" rx="2" stroke="#333" strokeWidth="1.5"/>
          </svg>
        </div>
      )}

      {/* Body */}
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-white truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{framework.name}</span>
          {!framework.isPublished && (
            <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: "#252525", border: "1px solid #444", color: "#888", fontFamily: "system-ui, Inter, sans-serif" }}>Draft</span>
          )}
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mb-2.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {framework.description || "No description"}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Creator */}
          <div className="flex items-center gap-1.5">
            {framework.createdBy.avatar ? (
              <img src={framework.createdBy.avatar} alt={framework.createdBy.name} className="w-4 h-4 rounded-full object-cover" />
            ) : (
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: "#252525", color: "#888" }}>{framework.createdBy.initials?.slice(0, 1)}</div>
            )}
            <span className="text-[10px] text-gray-500 truncate max-w-[80px]" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{framework.createdBy.name}</span>
          </div>

          <span className="text-[10px] text-gray-600">·</span>
          <span className="text-[10px] text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{framework.nodes.length} nodes</span>

          {paramCount > 0 && (
            <>
              <span className="text-[10px] text-gray-600">·</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "#F0FE0010", border: "1px solid #F0FE0030", color: "#F0FE00", fontFamily: "system-ui, Inter, sans-serif" }}>
                {paramCount} param{paramCount !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mb-3 space-y-2">
            {paramCount > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Parameters</p>
                <div className="flex flex-wrap gap-1">
                  {framework.parameters!.map(p => (
                    <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "#252525", border: "1px solid #444", color: "#ccc" }}>{p.label}{p.required ? "*" : ""}</span>
                  ))}
                </div>
              </div>
            )}
            {framework.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {framework.tags.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#252525", border: "1px solid #333", color: "#666" }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRun(framework)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            style={{ backgroundColor: "#F0FE00", color: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2L10 6L3 10V2Z" fill="currentColor"/></svg>
            Run
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="py-1.5 px-2.5 rounded-lg text-xs transition-colors"
            style={{
              backgroundColor: isExpanded ? "#252525" : "transparent",
              border: "1px solid #333",
              color: "#888",
              fontFamily: "system-ui, Inter, sans-serif",
            }}
          >
            {isExpanded ? "Less" : "More"}
          </button>
          {isOwn && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(framework.id)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors"
              style={{ border: "1px solid #333" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
