"use client";

import React, { useState, useCallback, useRef } from "react";
import { ReactFlow, Background, Controls, ReactFlowProvider, useNodesState, useEdgesState } from "@xyflow/react";
import type { CanvasFramework, FrameworkParameter, AtlasNode } from "@/lib/atlas-types";
import { CanvasPreview } from "./canvas-preview";
import "@xyflow/react/dist/style.css";

type DetailTab = "app" | "workflow";
export type ParamValues = Record<string, string | File>;

interface Props {
  framework: CanvasFramework;
  onBack: () => void;
  onRun: (framework: CanvasFramework, paramValues: ParamValues) => void;
  breadcrumbLabel?: string;
}

function WorkflowCanvas({ nodes, edges }: { nodes: AtlasNode[]; edges: CanvasFramework["edges"] }) {
  const [flowNodes, , onNodesChange] = useNodesState(nodes as never[]);
  const [flowEdges] = useEdgesState(edges as never[]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodesChange={onNodesChange}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
      minZoom={0.05}
      maxZoom={3}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll
      proOptions={{ hideAttribution: true }}
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <Background color="#1a1a1a" gap={24} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

function FileDropZone({
  param,
  value,
  onChange,
}: {
  param: FrameworkParameter;
  value: File | null;
  onChange: (f: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPDF = param.id.includes("pdf") || param.label.toLowerCase().includes("pdf");
  const accept = isPDF ? ".pdf" : "image/*,.ai,.svg,.eps,.pdf";

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onChange(files[0]);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {value ? (
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
        >
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(240,254,0,0.12)" }}
          >
            {isPDF ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="#F0FE00" strokeWidth="1.2" />
                <path d="M4 5H10M4 7.5H10M4 10H7" stroke="#F0FE00" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="#F0FE00" strokeWidth="1.2" />
                <circle cx="4.5" cy="4.5" r="1.2" fill="#F0FE00" />
                <path d="M1 9L4.5 6L7 8.5L9.5 6.5L13 9" stroke="#F0FE00" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-sm text-white truncate flex-1">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className="w-full rounded-lg flex flex-col items-center justify-center gap-2 py-5 transition-all"
          style={{
            border: `1.5px dashed ${dragging ? "#F0FE00" : "#2a2a2a"}`,
            backgroundColor: dragging ? "rgba(240,254,0,0.05)" : "#111",
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: dragging ? "rgba(240,254,0,0.15)" : "#1a1a1a" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V10M8 2L5 5M8 2L11 5" stroke={dragging ? "#F0FE00" : "#666"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12H14" stroke={dragging ? "#F0FE00" : "#666"} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs text-gray-500">
            Drop file or <span style={{ color: "#F0FE00" }}>browse</span>
          </span>
          {isPDF && (
            <span className="text-[10px] text-gray-600">PDF → auto-creates text nodes</span>
          )}
        </button>
      )}
    </div>
  );
}

function ParamInput({
  param,
  value,
  onChange,
}: {
  param: FrameworkParameter;
  value: string | File | null;
  onChange: (v: string | File | null) => void;
}) {
  const base =
    "w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40 resize-none";
  const style = {
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    fontFamily: "system-ui, Inter, sans-serif",
  };

  if (param.type === "file") {
    return (
      <FileDropZone
        param={param}
        value={value instanceof File ? value : null}
        onChange={onChange}
      />
    );
  }

  if (param.type === "textarea") {
    return (
      <textarea
        rows={3}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={param.placeholder || `Enter ${param.label.toLowerCase()}…`}
        className={base}
        style={style}
      />
    );
  }

  if (param.type === "select" && param.options?.length) {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className={base}
        style={{ ...style, appearance: "none" as never }}
      >
        <option value="">Select…</option>
        {param.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (param.type === "color") {
    const strVal = typeof value === "string" ? value : "";
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={strVal || "#F0FE00"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer flex-shrink-0"
          style={{ backgroundColor: "transparent", border: "1px solid #2a2a2a", padding: 2 }}
        />
        <input
          type="text"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#F0FE00"
          className={`${base} flex-1`}
          style={style}
        />
      </div>
    );
  }

  return (
    <input
      type={param.type === "image" ? "url" : "text"}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={param.placeholder || (param.type === "image" ? "https://…" : `Enter ${param.label.toLowerCase()}…`)}
      className={base}
      style={style}
    />
  );
}

export function FrameworkDetailPage({ framework, onBack, onRun, breadcrumbLabel = "Frameworks" }: Props) {
  const [tab, setTab] = useState<DetailTab>("app");
  const [paramValues, setParamValues] = useState<ParamValues>(() => {
    const init: ParamValues = {};
    framework.parameters?.forEach((p) => {
      if (p.type !== "file") init[p.id] = p.defaultValue ?? "";
    });
    return init;
  });

  const handleRun = useCallback(() => {
    onRun(framework, paramValues);
  }, [framework, paramValues, onRun]);

  const params = framework.parameters ?? [];
  const hasParams = params.length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
    >
      {/* Top Nav */}
      <div
        className="flex items-center justify-between px-5 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid #1e1e1e" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{breadcrumbLabel}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-600">
            <path d="M4 9L8 6L4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-white font-medium">{framework.name}</span>
        </button>

        <div
          className="flex items-center rounded-lg p-1 gap-0.5"
          style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
        >
          <button
            type="button"
            onClick={() => setTab("app")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === "app" ? "text-[#0a0a0a]" : "text-gray-400 hover:text-white"
            }`}
            style={{ backgroundColor: tab === "app" ? "#ffffff" : "transparent" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <rect x="3" y="3" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            App
          </button>
          <button
            type="button"
            onClick={() => setTab("workflow")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === "workflow" ? "text-[#0a0a0a]" : "text-gray-400 hover:text-white"
            }`}
            style={{ backgroundColor: tab === "workflow" ? "#ffffff" : "transparent" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="11.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 7H5.5M8.5 3.8L10.2 6.2M8.5 10.2L10.2 7.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Workflow
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{framework.createdBy.name}</span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium overflow-hidden flex-shrink-0"
            style={{ backgroundColor: "#F0FE00", color: "#0a0a0a" }}
          >
            {framework.createdBy.avatar ? (
              <img src={framework.createdBy.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              framework.createdBy.initials
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {tab === "app" ? (
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-3xl mx-auto">
              <div className="mb-8">
                <h1 className="text-white font-bold mb-2" style={{ fontSize: 32, lineHeight: 1.15 }}>
                  {framework.name}
                </h1>
                <p className="text-gray-400 text-base mb-4" style={{ maxWidth: 520 }}>
                  {framework.description}
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium overflow-hidden"
                    style={{ backgroundColor: "#F0FE00", color: "#0a0a0a" }}
                  >
                    {framework.createdBy.avatar ? (
                      <img src={framework.createdBy.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      framework.createdBy.initials
                    )}
                  </div>
                  <span className="text-sm text-gray-400">{framework.createdBy.name}</span>
                </div>
              </div>

              <div
                className="w-full rounded-2xl overflow-hidden mb-8"
                style={{ aspectRatio: "16/9", border: "1px solid #1e1e1e" }}
              >
                <CanvasPreview nodes={framework.nodes} />
              </div>

              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2.5L8.5 5.5H12L9.5 7.5L10.5 10.5L7 8.5L3.5 10.5L4.5 7.5L2 5.5H5.5L7 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  {framework.upvotes} upvotes
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2V9M7 9L4.5 6.5M7 9L9.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 11H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {framework.downloads} uses
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  {framework.nodes.length} nodes
                </div>
                {hasParams && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M4 7H10M7 4V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    {params.length} parameters
                  </div>
                )}
              </div>

              {framework.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {framework.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs text-gray-400"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Workflow phases summary */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icon: "📋", title: "Brand Strategy", desc: "6 strategy pillars — discovery, audience, values, competition, positioning, visual direction" },
                  { icon: "✏️", title: "Creative Brief", desc: "4 brief cards — project overview, objectives, constraints, deliverables & timeline" },
                  { icon: "🎨", title: "Moodboard", desc: "Visual inspiration board with 6 curated reference images for brand direction" },
                  { icon: "🖼️", title: "Logo & Mockups", desc: "Logo file placeholder + 6 environment mockups: cards, signage, apparel, app, stationery, billboard" },
                ].map((phase) => (
                  <div
                    key={phase.title}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}
                  >
                    <div className="text-xl mb-2">{phase.icon}</div>
                    <div className="text-white text-sm font-medium mb-1">{phase.title}</div>
                    <div className="text-gray-500 text-xs leading-relaxed">{phase.desc}</div>
                  </div>
                ))}
              </div>

              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}
              >
                <h3 className="text-white font-medium text-sm mb-3">3 Presentation Flows Included</h3>
                <div className="space-y-3">
                  {[
                    { label: "Strategy Deck", desc: "Walks through all 6 strategy pillars in sequence", color: "#60a5fa" },
                    { label: "Brief + Moodboard", desc: "Creative brief cards flowing into moodboard review", color: "#a78bfa" },
                    { label: "Full Sprint Walkthrough", desc: "Complete end-to-end: strategy → brief → moodboard → logo → mockups", color: "#F0FE00" },
                  ].map((pf) => (
                    <div key={pf.label} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: pf.color }} />
                      <div>
                        <div className="text-white text-sm font-medium">{pf.label}</div>
                        <div className="text-gray-500 text-xs">{pf.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative">
            <ReactFlowProvider>
              <WorkflowCanvas nodes={framework.nodes} edges={framework.edges} />
            </ReactFlowProvider>
            <div
              className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl flex items-center gap-2.5 pointer-events-none"
              style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid #2a2a2a" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="#888" strokeWidth="1.3" />
                <path d="M7 5V7.5" stroke="#888" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="9.5" r="0.6" fill="#888" />
              </svg>
              <span className="text-xs text-gray-400">Read-only view — run the framework to use it</span>
            </div>
          </div>
        )}

        {/* Right panel */}
        <div
          className="w-72 flex-shrink-0 flex flex-col"
          style={{ borderLeft: "1px solid #1e1e1e", backgroundColor: "#0d0d0d" }}
        >
          <div className="p-5 flex-shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
            <h2 className="text-white font-semibold text-base">Run Framework</h2>
            <p className="text-gray-500 text-xs mt-1">Fill in details to customise the canvas</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {hasParams ? (
              params.map((param) => (
                <div key={param.id}>
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    {param.label}
                    {param.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <ParamInput
                    param={param}
                    value={paramValues[param.id] ?? null}
                    onChange={(v) => setParamValues((prev) => ({ ...prev, [param.id]: v as string | File }))}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm">No parameters</p>
                <p className="text-gray-600 text-xs mt-1">This framework runs as-is</p>
              </div>
            )}
          </div>

          <div className="p-5 flex-shrink-0" style={{ borderTop: "1px solid #1e1e1e" }}>
            <button
              type="button"
              onClick={handleRun}
              className="w-full py-3 rounded-xl text-sm font-semibold text-[#0a0a0a] transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ backgroundColor: "#F0FE00" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 3L13 8L5 13V3Z" fill="currentColor" />
              </svg>
              Run Framework
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
