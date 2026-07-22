"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlignLeft, ChevronRight, ChevronLeft, TrendingUp, Sparkles, Plus, ArrowRight, LayoutGrid, FolderOpen } from "lucide-react";

type OpType = "capacity" | "financial" | "projectHealth" | "pipeline" | "teamHealth";

interface AddNodeMenuProps {
  onAddStatusPill: () => void;
  onAddTextNode: () => void;
  onAddSageNode: (sageType: "chatbot" | "overview" | "stakeholder") => void;
  onAddOperationalNode: (opType: OpType, scope: "org" | "project", projectId?: string, projectName?: string) => void;
  onUploadFile: (files: FileList) => void;
  onOpenAIGenerate: (type: "mockup" | "collateral", sourceNodeId?: string) => void;
  onAddLink?: (url: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
  sourceNodeId?: string;
  sourceHandlePosition?: "left" | "right";
}

const PROJECTS = [
  { id: "nike",      name: "Nike Running",       color: "#3a6bb5" },
  { id: "google",    name: "Google Brand Sprint", color: "#2e8b57" },
  { id: "deloitte",  name: "Deloitte Digital",   color: "#c27030" },
  { id: "levis",     name: "Levi's Identity",     color: "#8b3a8b" },
  { id: "patagonia", name: "Patagonia Social",    color: "#2e6b4f" },
];

const OP_NODES: { key: OpType; label: string }[] = [
  { key: "capacity",      label: "Capacity" },
  { key: "financial",     label: "Financial" },
  { key: "projectHealth", label: "Project Health" },
  { key: "pipeline",      label: "Pipeline" },
  { key: "teamHealth",    label: "Team Health" },
];

export function AddNodeMenu({
  onAddStatusPill,
  onAddTextNode,
  onAddSageNode,
  onAddOperationalNode,
  onUploadFile,
  onOpenAIGenerate,
  onAddLink,
  onClose,
  position,
  sourceHandlePosition,
}: AddNodeMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState(position || { x: 200, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState("");

  // Ops multi-level state
  const [opsLevel, setOpsLevel] = useState<"root" | "org" | "project-list" | "project-nodes">("root");
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; color: string } | null>(null);

  // Reset ops level when ops submenu closes
  useEffect(() => {
    if (activeSubmenu !== "ops") {
      setOpsLevel("root");
      setSelectedProject(null);
    }
  }, [activeSubmenu]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.menu-content')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - menuPosition.x, y: e.clientY - menuPosition.y });
  }, [menuPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setMenuPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (position) setMenuPosition(position);
  }, [position]);

  const fontStyle = { fontFamily: "system-ui, Inter, sans-serif" };

  const menuItemStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 13,
    color: "var(--app-text-primary)",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    ...fontStyle,
  };

  const backButtonStyle: React.CSSProperties = {
    ...menuItemStyle,
    color: "var(--app-text-muted)",
    fontSize: 12,
    borderBottom: "1px solid var(--app-border)",
    marginBottom: 2,
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 45 }}
        onClick={onClose}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Main Menu */}
      <div
        style={{
          width: 180,
          position: "fixed",
          left: menuPosition.x,
          top: menuPosition.y,
          transform: sourceHandlePosition === "left" ? "translateX(-100%)" : "translateX(0)",
          cursor: isDragging ? "grabbing" : "default",
          maxHeight: "80vh",
          overflowY: "auto",
          zIndex: 9999,
          backgroundColor: "var(--app-bg-elevated)",
          border: "1px solid var(--app-border)",
          borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Drag handle */}
        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--app-border)",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          onMouseDown={handleMouseDown}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--app-text-muted)", ...fontStyle }}>Add Node</span>
          <div style={{ display: "flex", gap: 2 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "var(--app-text-faint)" }} />)}
          </div>
        </div>

        <div className="menu-content" style={{ padding: "4px 0" }}>
          {/* Text */}
          <button type="button" onClick={() => { onAddTextNode(); onClose(); }} style={{ ...menuItemStyle, fontSize: 14 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "var(--app-text-primary)20", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--app-text-primary)" }}>
              <AlignLeft className="w-3 h-3" strokeWidth={1.5} />
            </div>
            Text
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "var(--app-border)" }} />

          {/* Status Pill */}
          <button type="button" onClick={() => { onAddStatusPill(); onClose(); }} style={{ ...menuItemStyle, fontSize: 14 }}>
            <div style={{ width: 16, height: 10, borderRadius: 5, backgroundColor: "#e5e5e5" }} />
            Status Pill
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "var(--app-border)" }} />

          {/* Sage */}
          <button
            type="button"
            onClick={() => setActiveSubmenu(activeSubmenu === "sage" ? null : "sage")}
            style={{ ...menuItemStyle, fontSize: 14, justifyContent: "space-between", backgroundColor: activeSubmenu === "sage" ? "var(--app-hover)" : "transparent" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/sage-logo.svg" alt="Sage" style={{ width: 16, height: 16 }} />
              Sage
            </span>
            <ChevronRight
              className="w-3 h-3"
              strokeWidth={1.5}
              style={{ color: "var(--app-text-muted)", transform: activeSubmenu === "sage" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
            />
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "var(--app-border)" }} />

          {/* Ops Data */}
          <button
            type="button"
            onClick={() => setActiveSubmenu(activeSubmenu === "ops" ? null : "ops")}
            style={{ ...menuItemStyle, fontSize: 14, justifyContent: "space-between", backgroundColor: activeSubmenu === "ops" ? "var(--app-hover)" : "transparent" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#8b5cf620", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
                <TrendingUp className="w-2.5 h-2.5" strokeWidth={2} />
              </div>
              Ops Data
            </span>
            <ChevronRight
              className="w-3 h-3"
              strokeWidth={1.5}
              style={{ color: "var(--app-text-muted)", transform: activeSubmenu === "ops" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
            />
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "var(--app-border)" }} />

          {/* AI Generate */}
          <button
            type="button"
            onClick={() => setActiveSubmenu(activeSubmenu === "ai" ? null : "ai")}
            style={{ ...menuItemStyle, fontSize: 14, justifyContent: "space-between", backgroundColor: activeSubmenu === "ai" ? "var(--app-hover)" : "transparent" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#F0FE0020", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--app-text-primary)" }}>
                <Sparkles className="w-2.5 h-2.5" strokeWidth={1.2} />
              </div>
              Generate
            </span>
            <ChevronRight
              className="w-3 h-3"
              strokeWidth={1.5}
              style={{ color: "var(--app-text-muted)", transform: activeSubmenu === "ai" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
            />
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "var(--app-border)" }} />

          {/* Upload File */}
          <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.length) { onUploadFile(e.target.files); onClose(); } }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...menuItemStyle, fontSize: 14 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "var(--app-canvas-dot)20", display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa" }}>
              <Plus className="w-2.5 h-2.5" strokeWidth={1.5} />
            </div>
            Upload File
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "var(--app-border)" }} />

          {/* Add Link */}
          <button
            type="button"
            onClick={() => { setShowLinkInput(v => !v); setLinkInputValue(""); setTimeout(() => linkInputRef.current?.focus(), 50); }}
            style={{ ...menuItemStyle, fontSize: 14, backgroundColor: showLinkInput ? "var(--app-hover)" : "transparent" }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "var(--app-canvas-dot)20", display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa" }}>
              <ArrowRight className="w-2.5 h-2.5" strokeWidth={1.5} />
            </div>
            Add Link
          </button>

          {showLinkInput && (
            <div style={{ padding: "4px 12px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                ref={linkInputRef}
                type="url"
                value={linkInputValue}
                onChange={e => setLinkInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && linkInputValue.trim()) { onAddLink?.(linkInputValue.trim()); onClose(); }
                  else if (e.key === "Escape") setShowLinkInput(false);
                }}
                placeholder="Paste a URL…"
                style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", fontSize: 12, backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", borderRadius: 6, color: "var(--app-text-primary)", outline: "none", ...fontStyle }}
              />
              <button
                type="button"
                disabled={!linkInputValue.trim()}
                onClick={() => { if (linkInputValue.trim()) { onAddLink?.(linkInputValue.trim()); onClose(); } }}
                style={{ width: "100%", padding: "6px 0", fontSize: 12, backgroundColor: linkInputValue.trim() ? "var(--app-text-primary)" : "var(--app-border)", color: linkInputValue.trim() ? "var(--app-bg)" : "var(--app-text-faint)", border: "none", borderRadius: 6, cursor: linkInputValue.trim() ? "pointer" : "default", fontWeight: 600, ...fontStyle }}
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submenu Panel */}
      {activeSubmenu && (
        <div
          style={{
            width: 180,
            position: "fixed",
            left: menuPosition.x + (sourceHandlePosition === "left" ? -188 : 188),
            top: menuPosition.y + (activeSubmenu === "sage" ? 90 : activeSubmenu === "ops" ? 145 : 200),
            zIndex: 51,
            backgroundColor: "var(--app-bg-elevated)",
            border: "1px solid var(--app-border)",
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            padding: "4px 0",
          }}
        >
          {/* Sage submenu */}
          {activeSubmenu === "sage" && (
            <>
              {(["chatbot", "overview", "stakeholder"] as const).map(t => (
                <button key={t} type="button" onClick={() => { onAddSageNode(t); onClose(); }} style={menuItemStyle}>
                  {t === "chatbot" ? "Sage Chat" : t === "overview" ? "Overview" : "Stakeholder"}
                </button>
              ))}
            </>
          )}

          {/* Ops Data submenu — multi-level */}
          {activeSubmenu === "ops" && (
            <>
              {/* Level 1: choose scope */}
              {opsLevel === "root" && (
                <>
                  <div style={{ padding: "6px 12px 4px", fontSize: 11, color: "var(--app-text-faint)", ...fontStyle, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Data scope
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpsLevel("org")}
                    style={{ ...menuItemStyle, justifyContent: "space-between" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2} style={{ color: "#8b5cf6" }} />
                      Organizational
                    </span>
                    <ChevronRight className="w-3 h-3" strokeWidth={1.5} style={{ color: "var(--app-text-muted)" }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpsLevel("project-list")}
                    style={{ ...menuItemStyle, justifyContent: "space-between" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FolderOpen className="w-3.5 h-3.5" strokeWidth={2} style={{ color: "#8b5cf6" }} />
                      Project
                    </span>
                    <ChevronRight className="w-3 h-3" strokeWidth={1.5} style={{ color: "var(--app-text-muted)" }} />
                  </button>
                </>
              )}

              {/* Level 2a: organizational node types */}
              {opsLevel === "org" && (
                <>
                  <button type="button" onClick={() => setOpsLevel("root")} style={backButtonStyle}>
                    <ChevronLeft className="w-3 h-3" strokeWidth={1.5} style={{ color: "var(--app-text-muted)" }} />
                    Organizational
                  </button>
                  {OP_NODES.map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => { onAddOperationalNode(key, "org"); onClose(); }} style={menuItemStyle}>
                      {label}
                    </button>
                  ))}
                </>
              )}

              {/* Level 2b: project list */}
              {opsLevel === "project-list" && (
                <>
                  <button type="button" onClick={() => setOpsLevel("root")} style={backButtonStyle}>
                    <ChevronLeft className="w-3 h-3" strokeWidth={1.5} style={{ color: "var(--app-text-muted)" }} />
                    Select project
                  </button>
                  {PROJECTS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedProject(p); setOpsLevel("project-nodes"); }}
                      style={{ ...menuItemStyle, justifyContent: "space-between" }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      </span>
                      <ChevronRight className="w-3 h-3" strokeWidth={1.5} style={{ color: "var(--app-text-muted)" }} />
                    </button>
                  ))}
                </>
              )}

              {/* Level 3: node types for selected project */}
              {opsLevel === "project-nodes" && selectedProject && (
                <>
                  <button type="button" onClick={() => setOpsLevel("project-list")} style={backButtonStyle}>
                    <ChevronLeft className="w-3 h-3" strokeWidth={1.5} style={{ color: "var(--app-text-muted)" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: selectedProject.color }} />
                    {selectedProject.name}
                  </button>
                  {OP_NODES.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { onAddOperationalNode(key, "project", selectedProject.id, selectedProject.name); onClose(); }}
                      style={menuItemStyle}
                    >
                      {label}
                    </button>
                  ))}
                </>
              )}
            </>
          )}

          {/* AI Generate submenu */}
          {activeSubmenu === "ai" && (
            <>
              <button type="button" onClick={() => { onOpenAIGenerate("mockup"); onClose(); }} style={menuItemStyle}>Generate Mockups</button>
              <button type="button" onClick={() => { onOpenAIGenerate("collateral"); onClose(); }} style={menuItemStyle}>Generate Collateral</button>
            </>
          )}
        </div>
      )}
    </>,
    document.body
  );
}
