"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Eye, EyeOff, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

export interface FigmaFrameInfo {
  id: string;
  name: string;
  pageId: string;
  pageName: string;
  thumbnailUrl: string | null;
}

export interface FigmaImportConfig {
  fileKey: string;
  selectedFrames: FigmaFrameInfo[];
  importMode: "separate" | "hero-badge";
}

interface FigmaImportModalProps {
  onClose: () => void;
  onImport: (config: FigmaImportConfig) => void;
  initialPat?: string;
}

const PAT_STORAGE_KEY = "figma-pat";

export function FigmaImportModal({ onClose, onImport, initialPat }: FigmaImportModalProps) {
  const [figmaUrl, setFigmaUrl] = useState("");
  const [pat, setPat] = useState(() => initialPat ?? (typeof localStorage !== "undefined" ? localStorage.getItem(PAT_STORAGE_KEY) ?? "" : ""));
  const [patVisible, setPatVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [frames, setFrames] = useState<FigmaFrameInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState<"separate" | "hero-badge">("hero-badge");
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());

  // Derive pages from frames
  const pages = useMemo(() => {
    const pageMap = new Map<string, { pageId: string; pageName: string; frames: FigmaFrameInfo[] }>();
    for (const f of frames) {
      if (!pageMap.has(f.pageId)) {
        pageMap.set(f.pageId, { pageId: f.pageId, pageName: f.pageName, frames: [] });
      }
      pageMap.get(f.pageId)!.frames.push(f);
    }
    return Array.from(pageMap.values());
  }, [frames]);

  async function handleLoad() {
    if (!figmaUrl.trim() || !pat.trim()) {
      setError("Figma URL and personal access token are required.");
      return;
    }
    setLoading(true);
    setError(null);
    setFrames([]);
    setSelectedIds(new Set());
    setFileKey(null);

    try {
      localStorage.setItem(PAT_STORAGE_KEY, pat.trim());
      const res = await fetch("/api/figma/import-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaUrl: figmaUrl.trim(), pat: pat.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      const loadedFrames: FigmaFrameInfo[] = data.frames ?? [];
      setFrames(loadedFrames);
      setFileKey(data.fileKey ?? null);
      // Default: select all frames
      setSelectedIds(new Set(loadedFrames.map((f) => f.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Figma file.");
    } finally {
      setLoading(false);
    }
  }

  function toggleFrame(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage(pageFrames: FigmaFrameInfo[]) {
    const allSelected = pageFrames.every((f) => selectedIds.has(f.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const f of pageFrames) next.delete(f.id);
      } else {
        for (const f of pageFrames) next.add(f.id);
      }
      return next;
    });
  }

  function togglePageCollapse(pageId: string) {
    setCollapsedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }

  function handleImport() {
    if (!fileKey) return;
    const selectedFrames = frames.filter((f) => selectedIds.has(f.id));
    if (selectedFrames.length === 0) return;
    onImport({ fileKey, selectedFrames, importMode });
  }

  const selectedCount = selectedIds.size;
  const hasFrames = frames.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 520, maxHeight: "85vh", fontFamily: "system-ui, Inter, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg width="20" height="22" viewBox="0 0 32 36" fill="none" style={{ flexShrink: 0 }}>
              <path d="M8 36C10.7614 36 13 33.7614 13 31V26H8C5.23858 26 3 28.2386 3 31C3 33.7614 5.23858 36 8 36Z" fill="#0ACF83"/>
              <path d="M3 20C3 17.2386 5.23858 15 8 15H13V25H8C5.23858 25 3 22.7614 3 20Z" fill="#A259FF"/>
              <path d="M3 9C3 6.23858 5.23858 4 8 4H13V14H8C5.23858 14 3 11.7614 3 9Z" fill="#F24E1E"/>
              <path d="M13 4H18C20.7614 4 23 6.23858 23 9C23 11.7614 20.7614 14 18 14H13V4Z" fill="#FF7262"/>
              <path d="M23 20C23 22.7614 20.7614 25 18 25C15.2386 25 13 22.7614 13 20C13 17.2386 15.2386 15 18 15C20.7614 15 23 17.2386 23 20Z" fill="#1ABCFE"/>
            </svg>
            <span className="font-semibold text-foreground text-sm">Import from Figma</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Inputs */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0 space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Figma file URL</label>
            <input
              type="url"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              placeholder="https://www.figma.com/design/..."
              className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-border"
              onKeyDown={(e) => { if (e.key === "Enter") handleLoad(); }}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Personal access token</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={patVisible ? "text" : "password"}
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="figd_..."
                  className="w-full px-3 py-2 pr-9 text-sm bg-muted rounded-lg border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-border"
                  onKeyDown={(e) => { if (e.key === "Enter") handleLoad(); }}
                />
                <button
                  type="button"
                  onClick={() => setPatVisible(!patVisible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {patVisible ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleLoad}
                disabled={loading || !figmaUrl.trim() || !pat.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
                style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg)" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Frame browser */}
        {hasFrames && (
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-0">
            {pages.map((page) => {
              const allPageSelected = page.frames.every((f) => selectedIds.has(f.id));
              const somePageSelected = page.frames.some((f) => selectedIds.has(f.id));
              const collapsed = collapsedPages.has(page.pageId);

              return (
                <div key={page.pageId}>
                  {/* Page header */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => togglePageCollapse(page.pageId)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {collapsed ? <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} /> : <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />}
                    </button>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                      onChange={() => togglePage(page.frames)}
                      className="w-3.5 h-3.5 accent-foreground cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground">{page.pageName}</span>
                    <span className="text-xs text-muted-foreground">({page.frames.length})</span>
                  </div>

                  {/* Frames grid */}
                  {!collapsed && (
                    <div className="grid grid-cols-3 gap-2 ml-5">
                      {page.frames.map((frame) => {
                        const checked = selectedIds.has(frame.id);
                        return (
                          <button
                            key={frame.id}
                            type="button"
                            onClick={() => toggleFrame(frame.id)}
                            className="relative text-left rounded-lg overflow-hidden border transition-all"
                            style={{
                              borderColor: checked ? "var(--app-text-primary)" : "var(--border)",
                              backgroundColor: "var(--app-card-elevated)",
                            }}
                          >
                            {/* Thumbnail */}
                            <div
                              className="w-full"
                              style={{ aspectRatio: "4/3", backgroundColor: "var(--app-bg)", overflow: "hidden" }}
                            >
                              {frame.thumbnailUrl ? (
                                <img
                                  src={frame.thumbnailUrl}
                                  alt={frame.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg width="20" height="22" viewBox="0 0 32 36" fill="none" opacity={0.3}>
                                    <path d="M8 36C10.7614 36 13 33.7614 13 31V26H8C5.23858 26 3 28.2386 3 31C3 33.7614 5.23858 36 8 36Z" fill="#0ACF83"/>
                                    <path d="M3 20C3 17.2386 5.23858 15 8 15H13V25H8C5.23858 25 3 22.7614 3 20Z" fill="#A259FF"/>
                                    <path d="M3 9C3 6.23858 5.23858 4 8 4H13V14H8C5.23858 14 3 11.7614 3 9Z" fill="#F24E1E"/>
                                    <path d="M13 4H18C20.7614 4 23 6.23858 23 9C23 11.7614 20.7614 14 18 14H13V4Z" fill="#FF7262"/>
                                    <path d="M23 20C23 22.7614 20.7614 25 18 25C15.2386 25 13 22.7614 13 20C13 17.2386 15.2386 15 18 15C20.7614 15 23 17.2386 23 20Z" fill="#1ABCFE"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            {/* Label */}
                            <div className="px-2 py-1.5">
                              <p className="text-xs text-foreground truncate">{frame.name}</p>
                            </div>
                            {/* Check indicator */}
                            {checked && (
                              <div
                                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "var(--app-text-primary)" }}
                              >
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 4L3 5.5L6.5 2" stroke="var(--app-bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!hasFrames && !loading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
            <svg width="36" height="40" viewBox="0 0 32 36" fill="none" opacity={0.25} className="mb-3">
              <path d="M8 36C10.7614 36 13 33.7614 13 31V26H8C5.23858 26 3 28.2386 3 31C3 33.7614 5.23858 36 8 36Z" fill="#0ACF83"/>
              <path d="M3 20C3 17.2386 5.23858 15 8 15H13V25H8C5.23858 25 3 22.7614 3 20Z" fill="#A259FF"/>
              <path d="M3 9C3 6.23858 5.23858 4 8 4H13V14H8C5.23858 14 3 11.7614 3 9Z" fill="#F24E1E"/>
              <path d="M13 4H18C20.7614 4 23 6.23858 23 9C23 11.7614 20.7614 14 18 14H13V4Z" fill="#FF7262"/>
              <path d="M23 20C23 22.7614 20.7614 25 18 25C15.2386 25 13 22.7614 13 20C13 17.2386 15.2386 15 18 15C20.7614 15 23 17.2386 23 20Z" fill="#1ABCFE"/>
            </svg>
            <p className="text-sm text-muted-foreground">Paste a Figma URL and your personal access token, then click Load to browse frames.</p>
          </div>
        )}

        {/* Footer */}
        {hasFrames && (
          <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-3">
            {/* Import mode */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setImportMode("hero-badge")}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors"
                style={{
                  borderColor: importMode === "hero-badge" ? "var(--app-text-primary)" : "var(--border)",
                  backgroundColor: importMode === "hero-badge" ? "rgba(255,255,255,0.06)" : "transparent",
                  color: importMode === "hero-badge" ? "var(--app-text-primary)" : "var(--app-text-muted)",
                }}
              >
                One node (hero + badge)
              </button>
              <button
                type="button"
                onClick={() => setImportMode("separate")}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors"
                style={{
                  borderColor: importMode === "separate" ? "var(--app-text-primary)" : "var(--border)",
                  backgroundColor: importMode === "separate" ? "rgba(255,255,255,0.06)" : "transparent",
                  color: importMode === "separate" ? "var(--app-text-primary)" : "var(--app-text-muted)",
                }}
              >
                Separate nodes
              </button>
            </div>

            {/* Import button */}
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg)" }}
            >
              Import {selectedCount} frame{selectedCount !== 1 ? "s" : ""}
              {importMode === "hero-badge" && selectedCount > 1 ? " as one node" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
