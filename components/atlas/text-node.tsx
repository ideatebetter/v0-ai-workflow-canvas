"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SmartHandles } from "./smart-handles";
import type { TextNodeData } from "@/lib/atlas-types";
import { usePresentationNodes } from "./atlas-canvas";

// Color options
const TEXT_COLORS = [
  { value: "#ffffff", label: "White" },
  { value: "#F0FE00", label: "Yellow" },
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Orange" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#6B7280", label: "Gray" },
];

// Font options
const FONT_OPTIONS = [
  { value: "sans", label: "Sans", fontFamily: "system-ui, Inter, sans-serif" },
  { value: "serif", label: "Serif", fontFamily: "Georgia, serif" },
  { value: "mono", label: "Mono", fontFamily: "ui-monospace, monospace" },
];

interface TextFormatting {
  color: string;
  font: string;
  bold: boolean;
  align: string;
}

// Convert old [[h1]]..[[/h1]] markup to Markdown (backwards compatibility)
function legacyToMarkdown(content: string): string {
  if (!content.includes("[[")) return content;
  return content
    .replace(/\[\[h1\]\]([\s\S]*?)\[\[\/h1\]\]/g, "# $1")
    .replace(/\[\[h2\]\]([\s\S]*?)\[\[\/h2\]\]/g, "## $1")
    .replace(/\[\[h3\]\]([\s\S]*?)\[\[\/h3\]\]/g, "### $1")
    .replace(/\[\[body\]\]([\s\S]*?)\[\[\/body\]\]/g, "$1");
}

// Insert Markdown prefix at the start of the line containing the cursor
function insertLinePrefix(textarea: HTMLTextAreaElement, prefix: string, content: string): string {
  const pos = textarea.selectionStart;
  const lineStart = content.lastIndexOf("\n", pos - 1) + 1;
  const lineEnd = content.indexOf("\n", pos);
  const end = lineEnd === -1 ? content.length : lineEnd;
  const line = content.slice(lineStart, end);

  // If line already starts with the same prefix, remove it (toggle)
  if (line.startsWith(prefix)) {
    return content.slice(0, lineStart) + line.slice(prefix.length) + content.slice(end);
  }
  // Otherwise strip any existing heading prefix and add new one
  const stripped = line.replace(/^#{1,3} /, "").replace(/^[-*] /, "").replace(/^\d+\. /, "");
  return content.slice(0, lineStart) + prefix + stripped + content.slice(end);
}

// Wrap selection with inline marker (bold, strikethrough)
function wrapSelection(textarea: HTMLTextAreaElement, marker: string, content: string): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return content;
  const selected = content.slice(start, end);
  if (selected.startsWith(marker) && selected.endsWith(marker)) {
    return content.slice(0, start) + selected.slice(marker.length, -marker.length) + content.slice(end);
  }
  return content.slice(0, start) + marker + selected + marker + content.slice(end);
}

export function TextNode({ id, data, selected }: NodeProps) {
  const textData = data as unknown as TextNodeData;
  const presentationNodeIds = usePresentationNodes();
  const isInPresentation = presentationNodeIds.has(id);
  const presentationIndex = presentationNodeIds.get(id) ?? null;
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const rawContent = textData.content || textData.label || "";
  const initialContent = legacyToMarkdown(rawContent);

  const [editContent, setEditContent] = useState(initialContent);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { setNodes } = useReactFlow();

  const [formatting, setFormatting] = useState<TextFormatting>({
    color: (textData as any).formatting?.color || "#ffffff",
    font: (textData as any).formatting?.font || "sans",
    bold: (textData as any).formatting?.bold || false,
    align: (textData as any).formatting?.align || "left",
  });

  const currentFont = FONT_OPTIONS.find(f => f.value === formatting.font) || FONT_OPTIONS[0];

  // Sync when node data changes externally
  useEffect(() => {
    setEditContent(legacyToMarkdown(textData.content || textData.label || ""));
  }, [textData.content, textData.label]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent, isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
        setShowFontPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: editContent.slice(0, 60).replace(/^#+\s*/, "") || "Text",
              content: editContent,
              formatting,
              lastModified: new Date().toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              }),
            },
          };
        }
        return node;
      })
    );
    setIsEditing(false);
  }, [id, editContent, formatting, setNodes]);

  const updateFormatting = useCallback((updates: Partial<TextFormatting>) => {
    const newFormatting = { ...formatting, ...updates };
    setFormatting(newFormatting);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, formatting: newFormatting } } : node
      )
    );
  }, [id, formatting, setNodes]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setEditContent(legacyToMarkdown(textData.content || textData.label || ""));
      setIsEditing(false);
      return;
    }
    // Auto-continue list on Enter
    if (e.key === "Enter" && !e.shiftKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const pos = textarea.selectionStart;
      const lineStart = editContent.lastIndexOf("\n", pos - 1) + 1;
      const line = editContent.slice(lineStart, pos);
      const bulletMatch = line.match(/^([-*]) /);
      const orderedMatch = line.match(/^(\d+)\. /);
      if (bulletMatch) {
        e.preventDefault();
        const insert = "\n" + bulletMatch[1] + " ";
        setEditContent(prev => prev.slice(0, pos) + insert + prev.slice(pos));
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = pos + insert.length;
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      } else if (orderedMatch) {
        e.preventDefault();
        const nextNum = parseInt(orderedMatch[1]) + 1;
        const insert = "\n" + nextNum + ". ";
        setEditContent(prev => prev.slice(0, pos) + insert + prev.slice(pos));
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = pos + insert.length;
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      }
    }
  };

  const applyPrefix = (prefix: string) => {
    if (!textareaRef.current) return;
    const newContent = insertLinePrefix(textareaRef.current, prefix, editContent);
    setEditContent(newContent);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const applyInline = (marker: string) => {
    if (!textareaRef.current) return;
    const newContent = wrapSelection(textareaRef.current, marker, editContent);
    setEditContent(newContent);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const showToolbar = selected || isEditing;
  const shouldShowFull = isHovered || isEditing || selected;

  const containerStyle: React.CSSProperties = {
    minWidth: 120,
    maxWidth: shouldShowFull ? 480 : 240,
    fontFamily: currentFont.fontFamily,
    textAlign: formatting.align as any,
    outline: selected ? "2px solid white" : (isInPresentation ? "2px dashed #F0FE00" : "none"),
    outlineOffset: 4,
    borderRadius: 4,
    transition: "max-width 0.2s ease",
  };

  // Markdown component overrides styled with the node's formatting
  const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
    h1: ({ children }) => (
      <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, color: formatting.color, margin: "0 0 0.4em", fontFamily: currentFont.fontFamily }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3, color: formatting.color, margin: "0 0 0.4em", fontFamily: currentFont.fontFamily }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4, color: formatting.color, margin: "0 0 0.3em", fontFamily: currentFont.fontFamily }}>
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p style={{ fontSize: 14, lineHeight: 1.6, color: formatting.color, margin: "0 0 0.5em", fontFamily: currentFont.fontFamily, fontWeight: formatting.bold ? 700 : 400 }}>
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul style={{ color: formatting.color, paddingLeft: 20, margin: "0 0 0.5em", fontFamily: currentFont.fontFamily, fontSize: 14, lineHeight: 1.6 }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ color: formatting.color, paddingLeft: 20, margin: "0 0 0.5em", fontFamily: currentFont.fontFamily, fontSize: 14, lineHeight: 1.6 }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ color: formatting.color, marginBottom: 2, fontFamily: currentFont.fontFamily, fontSize: 14 }}>
        {children}
      </li>
    ),
    strong: ({ children }) => (
      <strong style={{ color: formatting.color, fontWeight: 700 }}>{children}</strong>
    ),
    del: ({ children }) => (
      <del style={{ color: formatting.color }}>{children}</del>
    ),
    code: ({ children }) => (
      <code style={{ color: formatting.color, background: "rgba(255,255,255,0.1)", padding: "1px 4px", borderRadius: 3, fontSize: 13, fontFamily: "ui-monospace, monospace" }}>
        {children}
      </code>
    ),
    blockquote: ({ children }) => (
      <blockquote style={{ borderLeft: "3px solid rgba(255,255,255,0.3)", paddingLeft: 12, marginLeft: 0, color: formatting.color, opacity: 0.8 }}>
        {children}
      </blockquote>
    ),
  };

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => setIsEditing(true)}
    >
      <SmartHandles nodeId={id} />

      {/* Presentation sequence badge */}
      {presentationIndex !== null && (
        <div style={{ position: "absolute", top: -10, right: -10, zIndex: 20 }}>
          {/* Number — click to focus canvas on this node */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("atlas:focus-presentation-node", { detail: { nodeId: id } }));
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: "#F0FE00",
              color: "#121212",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "system-ui, Inter, sans-serif",
              cursor: "pointer",
              boxShadow: "0 0 0 2px #0a0a0a",
            }}
            title={`Slide ${presentationIndex} — click to focus`}
          >
            {presentationIndex}
          </div>
          {/* X — revealed on node hover, click to remove from sequence */}
          {isHovered && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent("atlas:remove-from-presentation", { detail: { nodeId: id } }));
              }}
              style={{
                position: "absolute",
                top: -5,
                left: -5,
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: "#1a1a1a",
                border: "1px solid #F0FE00",
                color: "#F0FE00",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
              title="Remove from presentation"
            >
              <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                <path d="M5.5 1.5L1.5 5.5M1.5 1.5L5.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Formatting Toolbar */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 flex items-center gap-0.5 px-2 py-1.5 rounded-xl shadow-lg z-50 bg-card border border-border"
          onMouseDown={e => e.preventDefault()}
        >
          {/* Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowColorPicker(!showColorPicker); setShowFontPicker(false); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: formatting.color, borderColor: formatting.color === "#ffffff" ? "#666" : formatting.color }} />
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="text-gray-400"><path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 p-3 rounded-lg shadow-lg z-50 bg-card border border-border">
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 28px)" }}>
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => { updateFormatting({ color: color.value }); setShowColorPicker(false); }}
                      className="w-7 h-7 rounded-full hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.value, border: formatting.color === color.value ? "2px solid white" : "2px solid transparent", boxShadow: color.value === "#ffffff" ? "inset 0 0 0 1px rgba(0,0,0,0.1)" : "none" }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Font Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowFontPicker(!showFontPicker); setShowColorPicker(false); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
              style={{ fontFamily: currentFont.fontFamily }}
            >
              <span className="text-xs font-medium">Aa</span>
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className="text-gray-400"><path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {showFontPicker && (
              <div className="absolute top-full left-0 mt-2 py-1 rounded-lg shadow-lg min-w-[110px] z-50 bg-card border border-border">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => { updateFormatting({ font: font.value }); setShowFontPicker(false); }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${formatting.font === font.value ? "text-foreground" : "text-muted-foreground"}`}
                    style={{ fontFamily: font.fontFamily }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-border mx-0.5" />

          {/* Heading buttons */}
          {(["H1", "H2", "H3"] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => applyPrefix(h === "H1" ? "# " : h === "H2" ? "## " : "### ")}
              className="px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
              title={`${h} heading`}
            >
              {h}
            </button>
          ))}

          <div className="w-px h-6 bg-border mx-0.5" />

          {/* Bold */}
          <button
            type="button"
            onClick={() => formatting.bold ? updateFormatting({ bold: false }) : applyInline("**")}
            className={`p-1.5 rounded-lg transition-colors ${formatting.bold ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            title="Bold"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 2.5H8C9.38071 2.5 10.5 3.61929 10.5 5C10.5 6.38071 9.38071 7.5 8 7.5H3.5V2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 7.5H9C10.3807 7.5 11.5 8.61929 11.5 10C11.5 11.3807 10.3807 12.5 9 12.5H3.5V7.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onClick={() => applyInline("~~")}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Strikethrough"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9.5 3.5C9.5 3.5 8.5 2.5 7 2.5C5.5 2.5 4 3.5 4 5C4 6 4.5 6.5 6 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4.5 10.5C4.5 10.5 5.5 11.5 7 11.5C8.5 11.5 10 10.5 10 9C10 8 9.5 7.5 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="w-px h-6 bg-border mx-0.5" />

          {/* Bullet list */}
          <button
            type="button"
            onClick={() => applyPrefix("- ")}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Bullet list"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2.5" cy="4" r="1.5" fill="currentColor"/>
              <circle cx="2.5" cy="10" r="1.5" fill="currentColor"/>
              <path d="M5.5 4H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5.5 10H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Numbered list */}
          <button
            type="button"
            onClick={() => applyPrefix("1. ")}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Numbered list"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 2H2.5V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1.5 6H3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M1.5 9.5C1.5 9.5 2 8.5 2.5 9C3 9.5 1.5 10.5 1.5 11H3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.5 4H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5.5 10H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="w-px h-6 bg-border mx-0.5" />

          {/* Align */}
          {[
            { v: "left", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 2.5H13M1 6H9M1 9.5H13M1 13H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
            { v: "center", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 2.5H13M3 6H11M1 9.5H13M4 13H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
            { v: "right", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 2.5H13M5 6H13M1 9.5H13M7 13H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
          ].map(({ v, icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => updateFormatting({ align: v })}
              className={`p-1.5 rounded-lg transition-colors ${formatting.align === v ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              title={`Align ${v}`}
            >
              {icon}
            </button>
          ))}
        </div>
      )}

      {/* Text Content */}
      <div className="cursor-text" style={containerStyle}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="nodrag w-full bg-transparent border-none focus:outline-none resize-none"
            style={{
              color: formatting.color,
              fontFamily: currentFont.fontFamily,
              fontSize: 14,
              lineHeight: 1.6,
              fontWeight: formatting.bold ? 700 : 400,
              textAlign: formatting.align as any,
              minHeight: 80,
              minWidth: 240,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
            placeholder={"Type markdown here...\n\n# H1 heading\n## H2 heading\n- bullet point\n1. numbered item"}
          />
        ) : (
          <div className="prose prose-invert max-w-none" style={{ minHeight: 30 }}>
            {shouldShowFull ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {editContent || "*Double-click to edit*"}
              </ReactMarkdown>
            ) : (
              // Compact preview - first line only
              <p style={{ color: formatting.color, fontFamily: currentFont.fontFamily, fontSize: 14, lineHeight: 1.5, margin: 0, opacity: 0.9 }}>
                {editContent.split("\n").find(l => l.trim())?.replace(/^#+\s*/, "").replace(/^\*+\s*/, "").replace(/^-\s+/, "").slice(0, 80) || "Double-click to edit"}
                {editContent.split("\n").filter(l => l.trim()).length > 1 && (
                  <span className="opacity-50 text-xs ml-1">…</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
