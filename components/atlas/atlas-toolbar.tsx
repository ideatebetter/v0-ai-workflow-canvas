"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, MoreVertical, LayoutGrid, PlusSquare, Copy, Pencil } from "lucide-react";
import type { Canvas, CanvasPage } from "@/lib/atlas-types";

interface AtlasToolbarProps {
  canvasName?: string;
  onBack?: () => void;
  onCanvasNameChange?: (name: string) => void;
  onSaveAsFramework?: () => void;
  onCopyToCanvas?: () => void;
  hasSelectedNodes?: boolean;
  hasOtherCanvases?: boolean;
  recentCanvases?: Canvas[];
  onSwitchCanvas?: (canvasId: string) => void;
  pages?: CanvasPage[];
  activePageId?: string;
  onSwitchPage?: (pageId: string) => void;
  onAddPage?: () => void;
  onRenamePage?: (pageId: string, newName: string) => void;
  onBrowseFrameworks?: () => void;
}

export function AtlasToolbar({
  canvasName,
  onBack,
  onCanvasNameChange,
  onSaveAsFramework,
  onCopyToCanvas,
  hasSelectedNodes,
  hasOtherCanvases,
  recentCanvases,
  onSwitchCanvas,
  pages,
  activePageId,
  onSwitchPage,
  onAddPage,
  onRenamePage,
  onBrowseFrameworks,
}: AtlasToolbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(canvasName || "");
  const [showMenu, setShowMenu] = useState(false);
  const [showPagesDropdown, setShowPagesDropdown] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageValue, setEditingPageValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const recentDropdownRef = useRef<HTMLDivElement>(null);

  const hasPages = pages && pages.length > 0;
  const activePage = pages?.find(p => p.id === activePageId);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (recentDropdownRef.current && !recentDropdownRef.current.contains(event.target as Node)) {
        setShowPagesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(canvasName || "");
  }, [canvasName]);

  const handleSave = () => {
    if (editValue.trim() && onCanvasNameChange) {
      onCanvasNameChange(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(canvasName || "");
      setIsEditing(false);
    }
  };

  const togglePagesDropdown = () => {
    if (!isEditing && hasPages) {
      setShowPagesDropdown(prev => !prev);
      setEditingPageId(null);
    }
  };

  const startEditingPage = (page: CanvasPage) => {
    setEditingPageId(page.id);
    setEditingPageValue(page.name);
    setTimeout(() => pageInputRef.current?.select(), 0);
  };

  const savePageName = (pageId: string) => {
    const trimmed = editingPageValue.trim();
    if (trimmed) onRenamePage?.(pageId, trimmed);
    setEditingPageId(null);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent, pageId: string) => {
    if (e.key === "Enter") savePageName(pageId);
    if (e.key === "Escape") setEditingPageId(null);
    e.stopPropagation();
  };

  return (
    <>
    <div className="fixed top-4 left-4 z-50 flex items-center gap-3">
      {/* Atlas Logo */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center opacity-80 hover:opacity-100 transition-opacity"
      >
        <img src="/atlas-logo.svg" alt="Atlas" className="h-5" style={{ width: "auto" }} />
      </button>

      {canvasName && (
        <>
          <span className="text-muted-foreground">|</span>

          {/* Canvas name + pages dropdown */}
          <div
            className="relative"
            ref={recentDropdownRef}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="text-sm text-foreground bg-transparent border-b border-muted-foreground focus:border-foreground focus:outline-none px-0 py-0.5 min-w-[100px]"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-text"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  {canvasName}
                </button>
                {hasPages && (
                  <>
                    <span className="text-muted-foreground/40">/</span>
                    <button
                      type="button"
                      onClick={togglePagesDropdown}
                      className="text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      {activePage?.name ?? "Page 1"}
                      <ChevronDown
                        className={`w-2.5 h-2.5 transition-transform ${showPagesDropdown ? "rotate-180" : ""}`}
                        strokeWidth={1.5}
                      />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Pages dropdown */}
            {showPagesDropdown && hasPages && !isEditing && (
              <div
                className="absolute top-full left-0 mt-2 py-1 rounded-xl shadow-2xl min-w-[200px] bg-card border border-border"
                style={{ backdropFilter: "blur(20px)" }}
              >
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Pages
                </div>
                {pages!.map((page, idx) => {
                  const isActive = page.id === activePageId;
                  const isEditingThis = editingPageId === page.id;
                  return (
                    <div
                      key={page.id}
                      className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/50"
                      style={{
                        backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                        color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                      }}
                    >
                      <span className="text-[10px] text-muted-foreground/50 w-3 flex-shrink-0 text-right">{idx + 1}</span>
                      {isEditingThis ? (
                        <input
                          ref={pageInputRef}
                          autoFocus
                          value={editingPageValue}
                          onChange={e => setEditingPageValue(e.target.value)}
                          onBlur={() => savePageName(page.id)}
                          onKeyDown={e => handlePageInputKeyDown(e, page.id)}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 text-sm bg-transparent border-b border-muted-foreground focus:border-foreground focus:outline-none"
                          style={{ fontFamily: "system-ui, Inter, sans-serif", color: "var(--foreground)", minWidth: 0 }}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (isActive) {
                                startEditingPage(page);
                              } else {
                                onSwitchPage?.(page.id);
                                setShowPagesDropdown(false);
                              }
                            }}
                            className="flex-1 text-left text-sm truncate hover:text-foreground transition-colors"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            {page.name}
                          </button>
                          {isActive && (
                            <Check className="w-3 h-3 flex-shrink-0 text-blue-400" strokeWidth={1.5} />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                <div className="h-px mx-2 my-1 bg-border" />
                <button
                  type="button"
                  onClick={() => {
                    onAddPage?.();
                    setShowPagesDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2.5"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  <span className="w-3 flex-shrink-0" />
                  <Plus className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                  New Page
                </button>
              </div>
            )}
          </div>

          {/* 3-dots canvas menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute top-full left-0 mt-2 py-1 rounded-lg shadow-lg min-w-[180px] bg-card border border-border">
                <button
                  type="button"
                  onClick={() => { onBrowseFrameworks?.(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  <LayoutGrid className="w-4 h-4" strokeWidth={1.3} />
                  Browse Frameworks
                </button>
                <button
                  type="button"
                  onClick={() => { onSaveAsFramework?.(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  <PlusSquare className="w-4 h-4" strokeWidth={1.5} />
                  Save as Framework
                </button>
                {hasOtherCanvases && (
                  <>
                    <div className="h-px mx-2 my-1 bg-border" />
                    <button
                      type="button"
                      onClick={() => { onCopyToCanvas?.(); setShowMenu(false); }}
                      disabled={!hasSelectedNodes}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${hasSelectedNodes ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "text-muted-foreground/50 cursor-not-allowed"}`}
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                      Copy to Canvas
                      {!hasSelectedNodes && <span className="text-[10px] text-muted-foreground ml-auto">Select nodes first</span>}
                    </button>
                  </>
                )}
                <div className="h-px mx-2 my-1 bg-border" />
                <button
                  type="button"
                  onClick={() => { setIsEditing(true); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  <Pencil className="w-4 h-4" strokeWidth={1.5} />
                  Rename Canvas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
}
