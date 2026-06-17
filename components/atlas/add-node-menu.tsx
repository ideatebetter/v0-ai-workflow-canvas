"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

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
    color: "#d1d5db",
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
    color: "#888",
    fontSize: 12,
    borderBottom: "1px solid #222",
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
          backgroundColor: "#111111",
          border: "1px solid #222222",
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
            borderBottom: "1px solid #222",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          onMouseDown={handleMouseDown}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: "#888888", ...fontStyle }}>Add Node</span>
          <div style={{ display: "flex", gap: 2 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#666" }} />)}
          </div>
        </div>

        <div className="menu-content" style={{ padding: "4px 0" }}>
          {/* Text */}
          <button type="button" onClick={() => { onAddTextNode(); onClose(); }} style={{ ...menuItemStyle, fontSize: 14 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#ffffff20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 4H13M5 8H11M4 12H12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            Text
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "#222" }} />

          {/* Status Pill */}
          <button type="button" onClick={() => { onAddStatusPill(); onClose(); }} style={{ ...menuItemStyle, fontSize: 14 }}>
            <div style={{ width: 16, height: 10, borderRadius: 5, backgroundColor: "#e5e5e5" }} />
            Status Pill
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "#222" }} />

          {/* Sage */}
          <button
            type="button"
            onClick={() => setActiveSubmenu(activeSubmenu === "sage" ? null : "sage")}
            style={{ ...menuItemStyle, fontSize: 14, justifyContent: "space-between", backgroundColor: activeSubmenu === "sage" ? "rgba(255,255,255,0.1)" : "transparent" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/sage-logo.svg" alt="Sage" style={{ width: 16, height: 16 }} />
              Sage
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: activeSubmenu === "sage" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <path d="M4.5 3L7.5 6L4.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "#222" }} />

          {/* Ops Data */}
          <button
            type="button"
            onClick={() => setActiveSubmenu(activeSubmenu === "ops" ? null : "ops")}
            style={{ ...menuItemStyle, fontSize: 14, justifyContent: "space-between", backgroundColor: activeSubmenu === "ops" ? "rgba(255,255,255,0.1)" : "transparent" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#8b5cf620", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 6-6" />
                </svg>
              </div>
              Ops Data
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: activeSubmenu === "ops" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <path d="M4.5 3L7.5 6L4.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "#222" }} />

          {/* AI Generate */}
          <button
            type="button"
            onClick={() => setActiveSubmenu(activeSubmenu === "ai" ? null : "ai")}
            style={{ ...menuItemStyle, fontSize: 14, justifyContent: "space-between", backgroundColor: activeSubmenu === "ai" ? "rgba(255,255,255,0.1)" : "transparent" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#F0FE0020", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L8.5 4.5L12 5L9.5 7.5L10 11L7 9.5L4 11L4.5 7.5L2 5L5.5 4.5L7 1Z" stroke="#F0FE00" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              </div>
              Generate
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: activeSubmenu === "ai" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <path d="M4.5 3L7.5 6L4.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "#222" }} />

          {/* Upload File */}
          <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.length) { onUploadFile(e.target.files); onClose(); } }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...menuItemStyle, fontSize: 14 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#52525b20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M7 2V12M2 7H12" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            Upload File
          </button>

          <div style={{ height: 1, margin: "4px 8px", backgroundColor: "#222" }} />

          {/* Add Link */}
          <button
            type="button"
            onClick={() => { setShowLinkInput(v => !v); setLinkInputValue(""); setTimeout(() => linkInputRef.current?.focus(), 50); }}
            style={{ ...menuItemStyle, fontSize: 14, backgroundColor: showLinkInput ? "rgba(255,255,255,0.06)" : "transparent" }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#52525b20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M9 4l3 3-3 3" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", fontSize: 12, backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#d1d5db", outline: "none", ...fontStyle }}
              />
              <button
                type="button"
                disabled={!linkInputValue.trim()}
                onClick={() => { if (linkInputValue.trim()) { onAddLink?.(linkInputValue.trim()); onClose(); } }}
                style={{ width: "100%", padding: "6px 0", fontSize: 12, backgroundColor: linkInputValue.trim() ? "#F0FE00" : "#222", color: linkInputValue.trim() ? "#000" : "#555", border: "none", borderRadius: 6, cursor: linkInputValue.trim() ? "pointer" : "default", fontWeight: 600, ...fontStyle }}
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
            backgroundColor: "#111111",
            border: "1px solid #222222",
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
                  <div style={{ padding: "6px 12px 4px", fontSize: 11, color: "#555", ...fontStyle, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Data scope
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpsLevel("org")}
                    style={{ ...menuItemStyle, justifyContent: "space-between" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                      </svg>
                      Organizational
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpsLevel("project-list")}
                    style={{ ...menuItemStyle, justifyContent: "space-between" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      Project
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </>
              )}

              {/* Level 2a: organizational node types */}
              {opsLevel === "org" && (
                <>
                  <button type="button" onClick={() => setOpsLevel("root")} style={backButtonStyle}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 3L4.5 6L7.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 3L4.5 6L7.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  ))}
                </>
              )}

              {/* Level 3: node types for selected project */}
              {opsLevel === "project-nodes" && selectedProject && (
                <>
                  <button type="button" onClick={() => setOpsLevel("project-list")} style={backButtonStyle}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 3L4.5 6L7.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
