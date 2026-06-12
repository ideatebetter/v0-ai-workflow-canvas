"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";
import { SmartHandles } from "./smart-handles";
import type { TextNodeData } from "@/lib/atlas-types";
import { usePresentationNodes } from "./atlas-canvas";

// Text size options - H1, H2, H3, body
const TEXT_SIZES = [
  { value: "h1", label: "H1", fontSize: 32, lineHeight: 1.2, fontWeight: 700 },
  { value: "h2", label: "H2", fontSize: 24, lineHeight: 1.3, fontWeight: 600 },
  { value: "h3", label: "H3", fontSize: 18, lineHeight: 1.4, fontWeight: 600 },
  { value: "body", label: "Body", fontSize: 14, lineHeight: 1.5, fontWeight: 400 },
];

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
  { value: "sans", label: "Aa", fontFamily: "system-ui, Inter, sans-serif" },
  { value: "serif", label: "Aa", fontFamily: "Georgia, serif" },
  { value: "mono", label: "Aa", fontFamily: "ui-monospace, monospace" },
];

// Alignment options
const ALIGN_OPTIONS = [
  { value: "left", icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3H14M2 6.5H10M2 10H14M2 13.5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )},
  { value: "center", icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3H14M4 6.5H12M2 10H14M5 13.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )},
  { value: "right", icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3H14M6 6.5H14M2 10H14M8 13.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )},
];

interface TextFormatting {
  color: string;
  font: string;
  size: string;
  bold: boolean;
  strikethrough: boolean;
  align: string;
}

// Rich text segment with inline formatting
interface TextSegment {
  text: string;
  size: string; // h1, h2, h3, body
}

// Parse content into segments (format: [[h1]]text[[/h1]] or plain text)
// defaultSize is used for text that has no explicit formatting
function parseContent(content: string, defaultSize: string = "body"): TextSegment[] {
  if (!content) return [{ text: "", size: defaultSize }];
  
  const segments: TextSegment[] = [];
  const regex = /\[\[(h1|h2|h3|body)\]\]([\s\S]*?)\[\[\/\1\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      const plainText = content.slice(lastIndex, match.index);
      if (plainText) segments.push({ text: plainText, size: defaultSize });
    }
    // Add formatted segment
    segments.push({ text: match[2], size: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < content.length) {
    segments.push({ text: content.slice(lastIndex), size: defaultSize });
  }

  return segments.length > 0 ? segments : [{ text: content, size: defaultSize }];
}

// Serialize segments back to content string
function serializeSegments(segments: TextSegment[]): string {
  return segments.map(seg => {
    if (seg.size === "body") return seg.text;
    return `[[${seg.size}]]${seg.text}[[/${seg.size}]]`;
  }).join("");
}

// Get plain text from content (for truncation)
function getPlainText(content: string): string {
  return content.replace(/\[\[(h1|h2|h3|body)\]\]/g, "").replace(/\[\[\/(h1|h2|h3|body)\]\]/g, "");
}

export function TextNode({ id, data, selected }: NodeProps) {
  const textData = data as TextNodeData;
  const presentationNodeIds = usePresentationNodes();
  const isInPresentation = presentationNodeIds.has(id);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(textData.content || textData.label);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showAlignPicker, setShowAlignPicker] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const { setNodes } = useReactFlow();

  // Get formatting from data or use defaults
  const [formatting, setFormatting] = useState<TextFormatting>({
    color: (textData as any).formatting?.color || "#ffffff",
    font: (textData as any).formatting?.font || "sans",
    size: (textData as any).formatting?.size || "body",
    bold: (textData as any).formatting?.bold || false,
    strikethrough: (textData as any).formatting?.strikethrough || false,
    align: (textData as any).formatting?.align || "left",
  });

  const currentSize = TEXT_SIZES.find(s => s.value === formatting.size) || TEXT_SIZES[3];
  const currentFont = FONT_OPTIONS.find(f => f.value === formatting.font) || FONT_OPTIONS[0];

  // Parse content for rich text display - use formatting.size as default
  const segments = parseContent(editContent, formatting.size);
  const plainText = getPlainText(editContent);
  const isLongText = plainText.length > 100;
  const truncatedText = isLongText ? plainText.slice(0, 100) + "..." : plainText;
  const shouldShowFull = isHovered || isEditing || selected;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent, isEditing, formatting]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
        setShowFontPicker(false);
        setShowSizePicker(false);
        setShowAlignPicker(false);
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
              label: editContent.trim() || "Text",
              content: editContent,
              formatting,
              lastModified: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
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
    // Save formatting immediately
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              formatting: newFormatting,
            },
          };
        }
        return node;
      })
    );
  }, [id, formatting, setNodes]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditContent(textData.content || textData.label);
      setIsEditing(false);
    }
  };

  // Apply size formatting to selected text in textarea
  const applyInlineSize = useCallback((size: string) => {
    if (!textareaRef.current) {
      // No selection, apply to whole content as default size
      updateFormatting({ size });
      return;
    }
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
      // No selection, apply to whole content as default size
      updateFormatting({ size });
      return;
    }

    const selectedText = editContent.slice(start, end);
    if (!selectedText) return;

    // Wrap selected text with size markers
    const wrappedText = `[[${size}]]${selectedText}[[/${size}]]`;
    const newContent = editContent.slice(0, start) + wrappedText + editContent.slice(end);
    
    setEditContent(newContent);
    
    // Restore cursor position after the wrapped text
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + wrappedText.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
    
    setShowSizePicker(false);
  }, [editContent, updateFormatting]);

  const showToolbar = selected || isEditing;

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => setIsEditing(true)}
    >
      <SmartHandles nodeId={id} />

      {/* FigJam-style Formatting Toolbar */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-lg z-50 bg-card border border-border"
        >
          {/* Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowFontPicker(false);
                setShowSizePicker(false);
                setShowAlignPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div
                className="w-5 h-5 rounded-full border-2"
                style={{ backgroundColor: formatting.color, borderColor: formatting.color === "#ffffff" ? "#666" : formatting.color }}
              />
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-400">
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showColorPicker && (
              <div
                className="absolute top-full left-0 mt-2 p-3 rounded-lg shadow-lg z-50 bg-card border border-border"
              >
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 28px)" }}>
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        updateFormatting({ color: color.value });
                        setShowColorPicker(false);
                      }}
                      className="w-7 h-7 rounded-full hover:scale-110 transition-transform flex-shrink-0"
                      style={{
                        backgroundColor: color.value,
                        border: formatting.color === color.value ? "2px solid white" : "2px solid transparent",
                        boxShadow: color.value === "#ffffff" ? "inset 0 0 0 1px rgba(0,0,0,0.1)" : "none",
                      }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Font Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFontPicker(!showFontPicker);
                setShowColorPicker(false);
                setShowSizePicker(false);
                setShowAlignPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
              style={{ fontFamily: currentFont.fontFamily }}
            >
              <span className="text-sm font-medium">Aa</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-400">
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showFontPicker && (
              <div
                className="absolute top-full left-0 mt-2 py-1 rounded-lg shadow-lg min-w-[120px] z-50 bg-card border border-border"
              >
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => {
                      updateFormatting({ font: font.value });
                      setShowFontPicker(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${formatting.font === font.value ? "text-foreground" : "text-muted-foreground"}`}
                    style={{ fontFamily: font.fontFamily }}
                  >
                    {font.value === "sans" ? "Sans-serif" : font.value === "serif" ? "Serif" : "Monospace"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Size Picker - H1, H2, H3, Body */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSizePicker(!showSizePicker);
                setShowColorPicker(false);
                setShowFontPicker(false);
                setShowAlignPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white min-w-[70px]"
            >
              <span className="text-sm font-medium">{currentSize.label}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-400 ml-auto">
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showSizePicker && (
              <div
                className="absolute top-full left-0 mt-2 py-1 rounded-lg shadow-lg min-w-[100px] z-50 bg-card border border-border"
              >
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                  {isEditing ? "Select text first" : "Default size"}
                </div>
                {TEXT_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        applyInlineSize(size.value);
                      } else {
                        updateFormatting({ size: size.value });
                      }
                      setShowSizePicker(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between ${formatting.size === size.value ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <span style={{ fontSize: Math.min(size.fontSize, 18), fontWeight: size.fontWeight }}>{size.label}</span>
                    <span className="text-[10px] text-muted-foreground">{size.fontSize}px</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Bold */}
          <button
            type="button"
            onClick={() => updateFormatting({ bold: !formatting.bold })}
            className={`p-2 rounded-lg transition-colors ${formatting.bold ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 2.5H8C9.38071 2.5 10.5 3.61929 10.5 5C10.5 6.38071 9.38071 7.5 8 7.5H3.5V2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 7.5H9C10.3807 7.5 11.5 8.61929 11.5 10C11.5 11.3807 10.3807 12.5 9 12.5H3.5V7.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onClick={() => updateFormatting({ strikethrough: !formatting.strikethrough })}
            className={`p-2 rounded-lg transition-colors ${formatting.strikethrough ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9.5 3.5C9.5 3.5 8.5 2.5 7 2.5C5.5 2.5 4 3.5 4 5C4 6 4.5 6.5 6 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4.5 10.5C4.5 10.5 5.5 11.5 7 11.5C8.5 11.5 10 10.5 10 9C10 8 9.5 7.5 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Alignment */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAlignPicker(!showAlignPicker);
                setShowColorPicker(false);
                setShowFontPicker(false);
                setShowSizePicker(false);
              }}
              className="flex items-center gap-1 p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {ALIGN_OPTIONS.find(a => a.value === formatting.align)?.icon}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-400">
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showAlignPicker && (
              <div
                className="absolute top-full right-0 mt-2 flex gap-1 p-1.5 rounded-lg shadow-lg z-50"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
              >
                {ALIGN_OPTIONS.map((align) => (
                  <button
                    key={align.value}
                    type="button"
                    onClick={() => {
                      updateFormatting({ align: align.value });
                      setShowAlignPicker(false);
                    }}
                    className={`p-2 rounded-lg transition-colors ${formatting.align === align.value ? "bg-white/20 text-white" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
                  >
                    {align.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text Content */}
      <div
        className="cursor-text transition-all duration-300"
        style={{
          minWidth: 100,
          maxWidth: shouldShowFull ? 400 : 220,
          outline: selected ? "2px solid white" : (isInPresentation ? "2px dashed #F0FE00" : "none"),
          outlineOffset: 4,
          borderRadius: 4,
        }}
      >
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
              fontSize: currentSize.fontSize,
              lineHeight: currentSize.lineHeight,
              fontWeight: formatting.bold ? 700 : currentSize.fontWeight,
              textDecoration: formatting.strikethrough ? "line-through" : "none",
              textAlign: formatting.align as any,
              minHeight: 60,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
            placeholder="Type something..."
          />
        ) : (
          <div
            className="transition-all duration-300"
            style={{
              textAlign: formatting.align as any,
              minHeight: 30,
            }}
          >
            {shouldShowFull ? (
              // Show rich text with segments
              segments.map((seg, idx) => {
                const segmentSize = TEXT_SIZES.find(s => s.value === seg.size) || TEXT_SIZES[3];
                return (
                  <span
                    key={idx}
                    className="whitespace-pre-wrap break-words"
                    style={{
                      color: formatting.color,
                      fontFamily: currentFont.fontFamily,
                      fontSize: segmentSize.fontSize,
                      lineHeight: segmentSize.lineHeight,
                      fontWeight: formatting.bold ? 700 : segmentSize.fontWeight,
                      textDecoration: formatting.strikethrough ? "line-through" : "none",
                      display: seg.size === "h1" || seg.size === "h2" || seg.size === "h3" ? "block" : "inline",
                      marginBottom: seg.size === "h1" || seg.size === "h2" || seg.size === "h3" ? "0.5em" : 0,
                    }}
                  >
                    {seg.text || (idx === 0 ? "Double-click to edit" : "")}
                  </span>
                );
              })
            ) : (
              // Show truncated preview with correct size
              <div
                className="whitespace-pre-wrap break-words"
                style={{
                  color: formatting.color,
                  fontFamily: currentFont.fontFamily,
                  fontSize: currentSize.fontSize,
                  lineHeight: currentSize.lineHeight,
                  fontWeight: formatting.bold ? 700 : currentSize.fontWeight,
                  textDecoration: formatting.strikethrough ? "line-through" : "none",
                  opacity: 0.9,
                }}
              >
                {truncatedText || "Double-click to edit"}
              </div>
            )}
            {/* Show "more" indicator when collapsed and has more text */}
            {!shouldShowFull && isLongText && (
              <div 
                className="text-[10px] mt-1 opacity-50"
                style={{ color: formatting.color }}
              >
                Hover to expand
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
