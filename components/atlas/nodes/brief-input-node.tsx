"use client";

import React, { useCallback, useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { SmartHandles } from "../smart-handles";

// ─── Card field config ────────────────────────────────────────────────────────

type FieldType = "text" | "textarea";

interface Field {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
}

interface CardConfig {
  accent: string;
  fields: Field[];
}

const CARD_CONFIGS: Record<string, CardConfig> = {
  "brand-discovery": {
    accent: "#3b82f6",
    fields: [
      { key: "what", label: "What is the brand?", type: "textarea", placeholder: "Describe the company, what it does, and who it serves…" },
      { key: "mission", label: "Mission", type: "text", placeholder: "To [do what] for [whom]" },
      { key: "vision", label: "Vision", type: "text", placeholder: "To become [aspirational state] by [timeframe]" },
      { key: "why", label: "Why does this brand exist?", type: "textarea", placeholder: "The deeper belief that drives the business beyond profit…" },
    ],
  },
  "target-audience": {
    accent: "#3b82f6",
    fields: [
      { key: "primary_name", label: "Primary Persona", type: "text", placeholder: "Name, age, role…" },
      { key: "primary_desc", label: "Motivations & Frustrations", type: "textarea", placeholder: "What drives them, what they struggle with…" },
      { key: "secondary", label: "Secondary Persona", type: "textarea", placeholder: "Brief description of secondary segment…" },
      { key: "insight", label: "Key Audience Insight", type: "textarea", placeholder: "A quote or synthesised insight from research…" },
    ],
  },
  "brand-values": {
    accent: "#3b82f6",
    fields: [
      { key: "values", label: "Core Values", type: "textarea", placeholder: "1. [Value] — definition\n2. [Value] — definition\n3. [Value] — definition" },
      { key: "adjectives", label: "Brand Personality Adjectives", type: "text", placeholder: "Bold, warm, precise, approachable…" },
      { key: "voice", label: "Voice & Tone", type: "textarea", placeholder: "How the brand speaks — formal or informal, warm or authoritative…" },
      { key: "not", label: "What the brand is NOT", type: "textarea", placeholder: "Three things the brand explicitly rejects…" },
    ],
  },
  "competitive-landscape": {
    accent: "#3b82f6",
    fields: [
      { key: "competitors", label: "Direct Competitors", type: "textarea", placeholder: "Brand / Strength / Weakness / Visual territory…" },
      { key: "whitespace", label: "Market White Space", type: "textarea", placeholder: "The opportunity for differentiation…" },
      { key: "benchmarks", label: "Benchmark Brands (outside category)", type: "textarea", placeholder: "Brands admired for specific reasons…" },
    ],
  },
  "positioning-statement": {
    accent: "#3b82f6",
    fields: [
      { key: "oneliner", label: "The One-Liner", type: "text", placeholder: "For [audience], [brand] is the [category] that [benefit] because [reason]." },
      { key: "expanded", label: "Expanded Positioning", type: "textarea", placeholder: "What the brand stands for and how it differs from competitors…" },
      { key: "proof", label: "Proof Points", type: "textarea", placeholder: "1. [Evidence]\n2. [Evidence]\n3. [Evidence]" },
      { key: "promise", label: "Brand Promise", type: "text", placeholder: "The promise the brand makes to every customer…" },
    ],
  },
  "visual-direction": {
    accent: "#3b82f6",
    fields: [
      { key: "principles", label: "Design Principles", type: "textarea", placeholder: "1. [Principle] — rationale\n2. [Principle] — rationale" },
      { key: "color", label: "Color Direction", type: "text", placeholder: "Warm/cool, saturated/muted, colors to avoid…" },
      { key: "typography", label: "Typography Direction", type: "text", placeholder: "Geometric/humanist/slab — heading & body guidance…" },
      { key: "form", label: "Logo Form Language", type: "text", placeholder: "Wordmark / Lettermark / Emblem / Abstract / Combination mark" },
    ],
  },
  "project-overview": {
    accent: "#f59e0b",
    fields: [
      { key: "project", label: "Project", type: "textarea", placeholder: "Logo design for [brand], a [industry] company…" },
      { key: "background", label: "Background", type: "textarea", placeholder: "Brief company background and why this sprint exists…" },
      { key: "scope", label: "Scope of Work", type: "textarea", placeholder: "Primary logo, mark variant, colour palette, typography, guidelines…" },
      { key: "stakeholders", label: "Key Stakeholders", type: "textarea", placeholder: "Creative Director: [name]\nBrand Lead: [name]\nFinal Approver: [name]" },
    ],
  },
  "design-objectives": {
    accent: "#f59e0b",
    fields: [
      { key: "goal", label: "Primary Goal", type: "textarea", placeholder: "Create a logo that positions [brand] as…" },
      { key: "criteria", label: "Success Criteria", type: "textarea", placeholder: "Works at 16px and 3m wide\nSingle colour (black & white)\nDifferentiates from competitors…" },
      { key: "tension", label: "Design Tension to Navigate", type: "textarea", placeholder: "The core creative challenge, e.g. approachable but authoritative…" },
      { key: "nonneg", label: "Non-Negotiables", type: "textarea", placeholder: "Anything that cannot change — symbol, colour, name treatment…" },
    ],
  },
  "creative-constraints": {
    accent: "#f59e0b",
    fields: [
      { key: "technical", label: "Technical Constraints", type: "textarea", placeholder: "Sizes, file formats, colour limits, backgrounds…" },
      { key: "brand", label: "Brand Constraints", type: "textarea", placeholder: "Existing elements to retain, trademark considerations…" },
      { key: "timeline", label: "Timeline", type: "textarea", placeholder: "Concepts: [date]\nRefinement: [date]\nFinal: [date]" },
      { key: "budget", label: "Budget / Revisions", type: "text", placeholder: "Number of concepts, rounds of revisions included…" },
    ],
  },
  "deliverables-timeline": {
    accent: "#f59e0b",
    fields: [
      { key: "deliverables", label: "Deliverables", type: "textarea", placeholder: "Round 1: 3 concepts\nRound 2: 2 refined directions\nFinal: master files, export kit, guidelines…" },
      { key: "timeline", label: "Sprint Timeline", type: "textarea", placeholder: "Week 1: Brief sign-off\nWeek 2: Concept presentation\nWeek 3: Refinement\nWeek 4: Final delivery" },
    ],
  },
};

// ─── Data shape ───────────────────────────────────────────────────────────────

export interface BriefInputNodeData {
  label: string;
  cardKey: string;
  mode: "idle" | "file" | "url" | "manual";
  uploadedFileName?: string;
  uploadedFileUrl?: string;
  url?: string;
  fields?: Record<string, string>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";

export function BriefInputNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as BriefInputNodeData;
  const { setNodes } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlDraft, setUrlDraft] = useState(nodeData.url || "");

  const config = CARD_CONFIGS[nodeData.cardKey];
  const accent = config?.accent ?? "#3b82f6";
  const mode = nodeData.mode ?? "idle";
  const fields = nodeData.fields ?? {};

  const update = useCallback((patch: Partial<BriefInputNodeData>) => {
    setNodes(nds =>
      nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)
    );
  }, [id, setNodes]);

  const updateField = useCallback((key: string, value: string) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id
          ? { ...n, data: { ...n.data, fields: { ...(n.data as any).fields, [key]: value } } }
          : n
      )
    );
  }, [id, setNodes]);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    update({ mode: "file", uploadedFileName: file.name });
  }, [update]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    update({ mode: "file", uploadedFileName: file.name });
  }, [update]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasContent = mode !== "idle";
  const filledFieldCount = Object.values(fields).filter(v => v.trim()).length;
  const totalFields = config?.fields.length ?? 0;

  return (
    <div
      style={{
        width: 340,
        background: "rgba(20, 20, 22, 0.98)",
        border: selected
          ? `1.5px solid ${accent}`
          : `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: selected
          ? `0 0 0 3px ${accent}22, 0 8px 32px rgba(0,0,0,0.4)`
          : "0 4px 16px rgba(0,0,0,0.3)",
        fontFamily: FONT,
      }}
    >
      <SmartHandles nodeId={id} />

      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: `linear-gradient(135deg, ${accent}14 0%, transparent 100%)`,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: `${accent}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M3 4H13M3 8H10M3 12H7" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", flex: 1, letterSpacing: "-0.01em" }}>
          {nodeData.label}
        </span>
        {mode === "manual" && totalFields > 0 && (
          <span style={{ fontSize: 10, color: filledFieldCount === totalFields ? "#22c55e" : "#555", fontWeight: 500 }}>
            {filledFieldCount}/{totalFields}
          </span>
        )}
        {mode !== "idle" && (
          <button
            type="button"
            onClick={() => update({ mode: "idle" })}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 6,
              fontSize: 10,
              color: "#555",
              fontFamily: FONT,
            }}
            title="Change input method"
          >
            ← Change
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 14 }}>

        {/* ── IDLE STATE ── */}
        {mode === "idle" && (
          <div>
            {/* Drop / link options */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {/* Drop file */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                style={{
                  flex: 1,
                  padding: "14px 10px",
                  background: isDragging ? `${accent}18` : "rgba(255,255,255,0.03)",
                  border: `1.5px dashed ${isDragging ? accent : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto", display: "block" }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinejoin="round"/>
                    <polyline points="14 2 14 8 20 8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinejoin="round"/>
                    <line x1="12" y1="18" x2="12" y2="12" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
                    <polyline points="9 15 12 12 15 15" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Drop a file</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>PDF, DOC, DOCX</div>
              </button>

              {/* Enter link */}
              <button
                type="button"
                onClick={() => update({ mode: "url" })}
                style={{
                  flex: 1,
                  padding: "14px 10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1.5px dashed rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto", display: "block" }}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Enter a link</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>Notion, Docs, Drive…</div>
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Input manually */}
            <button
              type="button"
              onClick={() => update({ mode: "manual" })}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: `${accent}12`,
                border: `1px solid ${accent}30`,
                borderRadius: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: FONT,
              }}
            >
              <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>Input Manually</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* ── FILE STATE ── */}
        {mode === "file" && (
          <div>
            {nodeData.uploadedFileName ? (
              <div
                style={{
                  padding: "12px 14px",
                  background: "rgba(34, 197, 94, 0.07)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round"/>
                  <polyline points="14 2 14 8 20 8" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#fff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nodeData.uploadedFileName}
                  </div>
                  <div style={{ fontSize: 10, color: "#22c55e", marginTop: 1 }}>File attached</div>
                </div>
                <button
                  type="button"
                  onClick={() => update({ uploadedFileName: undefined, mode: "idle" })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 2 }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: 24,
                  background: isDragging ? `${accent}12` : "rgba(255,255,255,0.02)",
                  border: `2px dashed ${isDragging ? accent : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 10,
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px", display: "block" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 8 12 3 7 8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="3" x2="12" y2="15" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Drop file here or click to browse</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>PDF, DOC, DOCX</div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* ── URL STATE ── */}
        {mode === "url" && (
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500, display: "block", marginBottom: 6 }}>
              Document or page URL
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="url"
                value={urlDraft}
                onChange={e => setUrlDraft(e.target.value)}
                placeholder="https://notion.so/…  or  docs.google.com/…"
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  fontFamily: FONT,
                  outline: "none",
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && urlDraft.trim()) {
                    update({ url: urlDraft.trim() });
                  }
                }}
                onClick={e => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={() => { if (urlDraft.trim()) update({ url: urlDraft.trim() }); }}
                style={{
                  padding: "9px 14px",
                  background: accent,
                  border: "none",
                  borderRadius: 8,
                  color: "#000",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: urlDraft.trim() ? "pointer" : "not-allowed",
                  opacity: urlDraft.trim() ? 1 : 0.4,
                  fontFamily: FONT,
                  flexShrink: 0,
                }}
              >
                Save
              </button>
            </div>
            {nodeData.url && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" fill="#22c55e"/>
                  <path d="M5 8L7 10L11 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <a
                  href={nodeData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: accent, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
                  onClick={e => e.stopPropagation()}
                >
                  {nodeData.url}
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── MANUAL STATE ── */}
        {mode === "manual" && config && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {config.fields.map(field => (
              <div key={field.key}>
                <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={fields[field.key] || ""}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 12,
                      fontFamily: FONT,
                      resize: "vertical",
                      outline: "none",
                      lineHeight: 1.5,
                      boxSizing: "border-box",
                    }}
                    onClick={e => e.stopPropagation()}
                    onFocus={e => { e.currentTarget.style.borderColor = `${accent}60`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  />
                ) : (
                  <input
                    type="text"
                    value={fields[field.key] || ""}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 12,
                      fontFamily: FONT,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onClick={e => e.stopPropagation()}
                    onFocus={e => { e.currentTarget.style.borderColor = `${accent}60`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
