"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { DocFrameNodeData } from "@/lib/atlas-types";

export function DocFrameNode({ id, data, selected }: NodeProps) {
  const { title, pageCount, sections, collapsed: initialCollapsed } = data as unknown as DocFrameNodeData;
  const [collapsed, setCollapsed] = useState(!!initialCollapsed);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setNodes } = useReactFlow();

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editingIndex]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && editingIndex !== null) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent, editingIndex]);

  const handleSectionDoubleClick = useCallback((idx: number) => {
    if (editingIndex === idx) return;
    setEditContent(sections[idx].content);
    setEditingIndex(idx);
  }, [editingIndex, sections]);

  const handleSectionSave = useCallback((idx: number) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== id) return n;
      const d = n.data as unknown as DocFrameNodeData;
      const updatedSections = d.sections.map((s, i) =>
        i === idx
          ? { ...s, content: editContent, label: editContent.split("\n")[0].replace(/^#+\s*/, "").slice(0, 60) || s.label }
          : s
      );
      return { ...n, data: { ...n.data, sections: updatedSections } };
    }));
    setEditingIndex(null);
  }, [id, editContent, setNodes]);

  const toggleCollapse = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, data: { ...n.data, collapsed: next } } : n
    ));
  }, [collapsed, id, setNodes]);

  const borderColor = selected ? "#F0FE00" : "#2a2a2a";

  return (
    <div style={{ width: 440, fontFamily: "system-ui, Inter, sans-serif" }}>
      <SmartHandles nodeId={id} />

      {/* Header bar */}
      <div
        onClick={toggleCollapse}
        style={{
          background: "#1a1a1a",
          border: `1.5px solid ${borderColor}`,
          borderRadius: collapsed ? 12 : "12px 12px 0 0",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* PDF icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <rect x="2" y="1" width="9" height="12" rx="1.5" stroke="#ef4444" strokeWidth="1.3"/>
          <path d="M9 1V4H12" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4.5 8H9M4.5 10H7.5" stroke="#ef4444" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>

        {/* Title */}
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </span>

        {/* Page count badge */}
        <span style={{ background: "#222", color: "#777", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>
          {pageCount} {pageCount === 1 ? "page" : "pages"}
        </span>

        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ color: "#555", transition: "transform 0.18s", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink: 0 }}
        >
          <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Section list */}
      {!collapsed && (
        <div
          style={{
            border: `1.5px solid ${borderColor}`,
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
            background: "#111",
            overflow: "hidden",
          }}
        >
          {sections.map((section, idx) => {
            const isEditing = editingIndex === idx;
            const previewLines = section.content.split("\n").filter(l => l.trim());
            const previewBody = previewLines.slice(1).join(" ").trim();

            return (
              <div
                key={section.id}
                className="nodrag"
                onDoubleClick={() => handleSectionDoubleClick(idx)}
                style={{
                  borderBottom: idx < sections.length - 1 ? "1px solid #1c1c1c" : "none",
                  padding: "11px 14px",
                  position: "relative",
                  background: isEditing ? "#161616" : "transparent",
                  cursor: isEditing ? "text" : "default",
                  transition: "background 0.1s",
                }}
              >
                {/* Page badge */}
                <div style={{
                  position: "absolute",
                  top: 10,
                  right: 12,
                  background: "#1e1e1e",
                  color: "#4a4a4a",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 10,
                  letterSpacing: "0.03em",
                  fontFamily: "ui-monospace, monospace",
                }}>
                  p.{section.pageNum}
                </div>

                {isEditing ? (
                  <textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    onBlur={() => handleSectionSave(idx)}
                    onKeyDown={e => {
                      if (e.key === "Escape") { setEditingIndex(null); e.stopPropagation(); }
                      e.stopPropagation();
                    }}
                    className="nodrag"
                    style={{
                      width: "calc(100% - 44px)",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      resize: "none",
                      color: "#e0e0e0",
                      fontSize: 13,
                      lineHeight: 1.6,
                      fontFamily: "system-ui, Inter, sans-serif",
                      minHeight: 80,
                      display: "block",
                    }}
                  />
                ) : (
                  <div style={{ paddingRight: 44 }}>
                    <div style={{ color: "#e0e0e0", fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: previewBody ? 4 : 0 }}>
                      {section.label || `Page ${section.pageNum}`}
                    </div>
                    {previewBody && (
                      <div style={{ color: "#555", fontSize: 12, lineHeight: 1.55 }}>
                        {previewBody.slice(0, 130)}
                        {previewBody.length > 130 && <span style={{ opacity: 0.5 }}> …</span>}
                      </div>
                    )}
                    <div style={{ marginTop: 5, fontSize: 10, color: "#333" }}>
                      Double-click to edit
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
