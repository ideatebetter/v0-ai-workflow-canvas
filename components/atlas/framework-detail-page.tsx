"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { ReactFlow, Background, ReactFlowProvider, Panel, MarkerType, useNodesState, type NodeTypes } from "@xyflow/react";
import type { CanvasFramework, FrameworkParameter, AtlasNode } from "@/lib/atlas-types";
import { CanvasPreview } from "./canvas-preview";
import { FileNode } from "./file-node";
import { MockupImageNode } from "./nodes/mockup-image-node";
import "@xyflow/react/dist/style.css";

type DetailTab = "app" | "workflow";
export type ParamValues = Record<string, string | File | File[]>;

interface Props {
  framework: CanvasFramework;
  onBack: () => void;
  onRun: (framework: CanvasFramework, paramValues: ParamValues) => void;
  breadcrumbLabel?: string;
}

const PREVIEW_NODE_TYPES: NodeTypes = {
  file: FileNode as never,
  mockupImage: MockupImageNode as never,
};

function WorkflowCanvas({
  nodes,
  edges,
  presentationFlows,
}: {
  nodes: AtlasNode[];
  edges: CanvasFramework["edges"];
  presentationFlows?: CanvasFramework["presentationFlows"];
}) {
  const [flowNodes, , onNodesChange] = useNodesState(nodes as never[]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  const activeFlow = presentationFlows?.find((f) => f.id === activeFlowId);

  // Compute display edges directly from props so ReactFlow always sees the latest value
  const displayEdges = useMemo(() => {
    type AnyEdge = Record<string, unknown>;
    const styledBase = (edges as AnyEdge[]).map((e) => ({
      ...e,
      type: "default",
      style: { strokeWidth: 2, stroke: "var(--app-canvas-dot)", strokeDasharray: "5 5", opacity: activeFlow ? 0.2 : 1 },
      animated: false,
    }));
    if (!activeFlow) return styledBase as never[];
    const flowEdges = activeFlow.edges.map((e) => ({
      ...(e as AnyEdge),
      id: `pf-${e.id}`,
      type: "default",
      animated: true,
      style: { strokeWidth: 1.5, stroke: "#F0FE00" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#F0FE00", width: 14, height: 14 },
    }));
    return [...styledBase, ...flowEdges] as never[];
  }, [edges, activeFlow]);

  const flows = presentationFlows ?? [];

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={displayEdges}
      onNodesChange={onNodesChange}
      nodeTypes={PREVIEW_NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 0.8 }}
      minZoom={0.05}
      maxZoom={3}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll
      proOptions={{ hideAttribution: true }}
      style={{ backgroundColor: "var(--app-bg)" }}
    >
      <Background color="var(--app-card-elevated)" gap={24} />

      {flows.length > 0 && (
        <Panel position="top-right">
          <div
            className="flex flex-col gap-1.5 p-1.5 rounded-xl"
            style={{ backgroundColor: "rgba(20,20,20,0.85)", backdropFilter: "blur(12px)", border: "1px solid var(--app-border-strong)" }}
          >
            <p className="text-[9px] uppercase tracking-widest text-gray-500 px-1.5 pb-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Presentation Flows
            </p>
            {flows.map((flow) => {
              const isActive = flow.id === activeFlowId;
              return (
                <button
                  key={flow.id}
                  type="button"
                  onClick={() => setActiveFlowId(isActive ? null : flow.id)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all"
                  style={{
                    fontFamily: "system-ui, Inter, sans-serif",
                    fontSize: 11,
                    backgroundColor: isActive ? "#F0FE00" : "var(--app-card-elevated)",
                    color: isActive ? "var(--app-bg)" : "var(--app-text-secondary)",
                    border: `1px solid ${isActive ? "#F0FE00" : "var(--app-canvas-dot)"}`,
                  }}
                >
                  {/* Play icon */}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2.5 1.5L8.5 5L2.5 8.5V1.5Z" fill="currentColor" />
                  </svg>
                  {flow.name}
                </button>
              );
            })}
          </div>
        </Panel>
      )}
    </ReactFlow>
  );
}

function FileDropZone({
  param,
  value,
  onChange,
  tall = false,
}: {
  param: FrameworkParameter;
  value: File | string | null;
  onChange: (f: File | string | null) => void;
  tall?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [manualMode, setManualMode] = useState(typeof value === "string");
  const inputRef = useRef<HTMLInputElement>(null);

  const isPDF = false;
  const accept = "image/*,.pdf,.ai,.svg,.eps";

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onChange(files[0]);
  };

  if (manualMode && isPDF) {
    return (
      <div className="space-y-2">
        <textarea
          rows={6}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type or paste your content here — it will become text nodes on the canvas…"
          className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder-gray-500 focus:outline-none focus:ring-1 resize-none"
          style={{
            backgroundColor: "var(--app-card-elevated)",
            border: "1px solid var(--app-border-strong)",
            fontFamily: "system-ui, Inter, sans-serif",
            outline: "none",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(240,254,0,0.4)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--app-border-strong)"; }}
        />
        <button
          type="button"
          onClick={() => { setManualMode(false); onChange(null); }}
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-foreground transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 2L3 5L6 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Upload a file instead
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {value instanceof File ? (
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
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
          <span className="text-sm text-foreground truncate flex-1">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-gray-500 hover:text-foreground transition-colors flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : (
        <div className={tall ? "h-full flex flex-col" : "space-y-2"}>
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
            className={`w-full rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all ${tall ? "flex-1" : "py-3"}`}
            style={{
              border: `1.5px dashed ${dragging ? "#F0FE00" : "var(--app-border-strong)"}`,
              backgroundColor: dragging ? "rgba(240,254,0,0.05)" : "var(--app-bg-elevated)",
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: dragging ? "rgba(240,254,0,0.15)" : "var(--app-card-elevated)" }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 2V10M8 2L5 5M8 2L11 5" stroke={dragging ? "#F0FE00" : "var(--app-text-faint)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12H14" stroke={dragging ? "#F0FE00" : "var(--app-text-faint)"} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xs text-gray-500">
              Drop file or <span style={{ color: "#F0FE00" }}>browse</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

const DOC_PARAM_IDS = ["onboarding_docs", "strategy_pdf", "concept_1_brief", "concept_2_brief", "concept_3_brief"];

function MultiFileDropZone({
  param,
  files,
  onChange,
  tall = false,
}: {
  param: FrameworkParameter;
  files: File[];
  onChange: (files: File[]) => void;
  tall?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasManualMode = DOC_PARAM_IDS.includes(param.id);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const next = [...files];
    Array.from(incoming).forEach(f => {
      if (!next.some(existing => existing.name === f.name && existing.size === f.size)) {
        next.push(f);
      }
    });
    onChange(next);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  if (manualMode) {
    return (
      <div className={tall ? "h-full flex flex-col" : "space-y-2"}>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Paste or type your content here…"
          className={`w-full rounded-lg text-sm text-foreground placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40 resize-none ${tall ? "flex-1" : "h-32"}`}
          style={{ backgroundColor: "var(--app-bg-elevated)", border: "1.5px dashed var(--app-border-strong)", padding: "12px", fontFamily: "system-ui, Inter, sans-serif" }}
        />
        <button
          type="button"
          onClick={() => setManualMode(false)}
          className="text-[11px] text-gray-500 hover:text-foreground transition-colors"
        >
          ← back to file upload
        </button>
      </div>
    );
  }

  return (
    <div className={tall ? "h-full flex flex-col" : "space-y-2"}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`w-full rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all ${tall ? "flex-1" : "py-3"}`}
        style={{
          border: `1.5px dashed ${dragging ? "#F0FE00" : "var(--app-border-strong)"}`,
          backgroundColor: dragging ? "rgba(240,254,0,0.05)" : "var(--app-bg-elevated)",
        }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: dragging ? "rgba(240,254,0,0.15)" : "var(--app-card-elevated)" }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V10M8 2L5 5M8 2L11 5" stroke={dragging ? "#F0FE00" : "var(--app-text-faint)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12H14" stroke={dragging ? "#F0FE00" : "var(--app-text-faint)"} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-xs text-gray-500">
          Drop files or <span style={{ color: "#F0FE00" }}>browse</span>
        </span>
        {hasManualMode && (
          <span
            className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors mt-0.5"
            onClick={(e) => { e.stopPropagation(); setManualMode(true); }}
          >
            or <span style={{ color: "#F0FE00" }}>input manually</span>
          </span>
        )}
      </button>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
              style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
            >
              <div
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(240,254,0,0.10)" }}
              >
                {file.type.startsWith("image/") ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="12" height="12" rx="2" stroke="#F0FE00" strokeWidth="1.2" />
                    <circle cx="4.5" cy="4.5" r="1.2" fill="#F0FE00" />
                    <path d="M1 9L4.5 6L7 8.5L9.5 6.5L13 9" stroke="#F0FE00" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="#F0FE00" strokeWidth="1.2" />
                    <path d="M4 5H10M4 7.5H10M4 10H7" stroke="#F0FE00" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-gray-300 truncate flex-1">{file.name}</span>
              <span className="text-[10px] text-gray-600 flex-shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-gray-600 hover:text-foreground transition-colors flex-shrink-0 ml-1"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
          <p className="text-[10px] text-gray-600 text-right">{files.length} file{files.length !== 1 ? "s" : ""} selected</p>
        </div>
      )}
    </div>
  );
}

function ParamInput({
  param,
  value,
  onChange,
  tall = false,
}: {
  param: FrameworkParameter;
  value: string | File | File[] | null;
  onChange: (v: string | File | File[] | null) => void;
  tall?: boolean;
}) {
  const base =
    "w-full px-3 py-1.5 rounded-lg text-sm text-foreground placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40 resize-none";
  const style = {
    backgroundColor: "var(--app-card-elevated)",
    border: "1px solid var(--app-border-strong)",
    fontFamily: "system-ui, Inter, sans-serif",
  };

  if (param.type === "file" && param.multiple) {
    return (
      <div className={tall ? "h-full flex flex-col" : ""}>
        <MultiFileDropZone
          param={param}
          files={Array.isArray(value) ? value : []}
          onChange={onChange}
          tall={tall}
        />
      </div>
    );
  }

  if (param.type === "file") {
    return (
      <div className={tall ? "h-full flex flex-col" : ""}>
        <FileDropZone
          param={param}
          value={value instanceof File ? value : typeof value === "string" ? value : null}
          onChange={onChange}
          tall={tall}
        />
      </div>
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
          style={{ backgroundColor: "transparent", border: "1px solid var(--app-border-strong)", padding: 2 }}
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
      if (p.type === "file" && p.multiple) init[p.id] = [];
      else if (p.type !== "file") init[p.id] = p.defaultValue ?? "";
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
      style={{ backgroundColor: "var(--app-bg)", fontFamily: "system-ui, Inter, sans-serif" }}
    >
      {/* Top Nav */}
      <div
        className="flex items-center justify-between px-5 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--app-card-elevated)" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{breadcrumbLabel}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-600">
            <path d="M4 9L8 6L4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-foreground font-medium">{framework.name}</span>
        </button>

        <div
          className="flex items-center rounded-lg p-1 gap-0.5"
          style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
        >
          <button
            type="button"
            onClick={() => setTab("app")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === "app" ? "text-[var(--app-bg)]" : "text-gray-400 hover:text-foreground"
            }`}
            style={{ backgroundColor: tab === "app" ? "var(--app-text-primary)" : "transparent" }}
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
              tab === "workflow" ? "text-[var(--app-bg)]" : "text-gray-400 hover:text-foreground"
            }`}
            style={{ backgroundColor: tab === "workflow" ? "var(--app-text-primary)" : "transparent" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="11.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 7H5.5M8.5 3.8L10.2 6.2M8.5 10.2L10.2 7.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Canvas
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{framework.createdBy.name}</span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium overflow-hidden flex-shrink-0"
            style={{ backgroundColor: "#F0FE00", color: "var(--app-bg)" }}
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
          <div className="flex-1 overflow-y-auto">
            <div className="px-8 py-8">

              {/* Top: Canvas preview (left) + Hero info (right) */}
              <div className="flex gap-8 mb-10 items-start">
                {/* Canvas preview */}
                <div
                  className="rounded-2xl overflow-hidden flex-shrink-0"
                  style={{ width: "45%", aspectRatio: "4/3", border: "1px solid var(--app-card-elevated)" }}
                >
                  <CanvasPreview nodes={framework.nodes} edges={framework.edges} />
                </div>

                {/* Hero info */}
                <div className="flex-1 flex flex-col">
                  <div>
                    <h1 className="text-foreground font-bold mb-1.5" style={{ fontSize: 22, lineHeight: 1.2 }}>
                      {framework.name}
                    </h1>
                    <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                      {framework.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-5 mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M7 2.5L8.5 5.5H12L9.5 7.5L10.5 10.5L7 8.5L3.5 10.5L4.5 7.5L2 5.5H5.5L7 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                        </svg>
                        {framework.upvotes} upvotes
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M7 2V9M7 9L4.5 6.5M7 9L9.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M2 11H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        {framework.downloads} uses
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                          <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                          <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                          <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                        {framework.nodes.length} nodes
                      </div>
                    </div>

                    {/* Tags */}
                    {framework.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {framework.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 rounded-full text-xs text-gray-400"
                            style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Run CTA — below tags */}
                    <button
                      type="button"
                      onClick={handleRun}
                      className="px-5 py-2 rounded-xl text-sm font-semibold text-[var(--app-bg)] transition-all hover:opacity-90 active:scale-[0.98] flex items-center gap-2 mb-4"
                      style={{ backgroundColor: "#F0FE00" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M5 3L13 8L5 13V3Z" fill="currentColor" />
                      </svg>
                      Run Framework
                    </button>

                    {/* What's included */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {[
                        { title: "Brand Strategy", desc: "6 strategy pillars — discovery, audience, values, competition, positioning, visual direction" },
                        { title: "Creative Brief", desc: "4 brief cards — project overview, objectives, constraints, deliverables & timeline" },
                        { title: "Moodboard", desc: "Visual inspiration board with 6 curated reference images for brand direction" },
                        { title: "Logo & Mockups", desc: "Logo file placeholder + 6 environment mockups: cards, signage, apparel, app, stationery, billboard" },
                      ].map((phase) => (
                        <div
                          key={phase.title}
                          className="rounded-lg p-2.5"
                          style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-card-elevated)" }}
                        >
                          <div className="text-foreground text-[11px] font-medium mb-0.5">{phase.title}</div>
                          <div className="text-gray-500 text-[10px] leading-relaxed">{phase.desc}</div>
                        </div>
                      ))}
                    </div>

                    {/* Presentation Flows */}
                    <div
                      className="rounded-lg p-2.5"
                      style={{ backgroundColor: "var(--app-bg-elevated)", border: "1px solid var(--app-card-elevated)" }}
                    >
                      <div className="text-foreground text-[11px] font-medium mb-1.5">3 Presentation Flows Included</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {[
                          { label: "Strategy Deck", desc: "Walks through all 6 strategy pillars in sequence", color: "#60a5fa" },
                          { label: "Full Sprint Walkthrough", desc: "Complete end-to-end: strategy → brief → moodboard → logo → mockups", color: "#F0FE00" },
                          { label: "Brief + Moodboard", desc: "Creative brief cards flowing into moodboard review", color: "#a78bfa" },
                        ].map((pf) => (
                          <div key={pf.label} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: pf.color }} />
                            <div>
                              <div className="text-foreground text-[10px] font-medium">{pf.label}</div>
                              <div className="text-gray-500 text-[10px] leading-relaxed">{pf.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Framework Inputs grid */}
              {hasParams && params.some(p => p.type === "file" || p.type === "image") && (
                <div>
                  {/* Brand Name above the grid */}
                  {params.filter(p => p.type === "text").map(param => (
                    <div key={param.id} className="mb-4" style={{ maxWidth: 320 }}>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                        <span>{param.label}</span>
                        {param.required && <span className="text-red-400">*</span>}
                      </label>
                      <ParamInput
                        param={param}
                        value={paramValues[param.id] ?? null}
                        onChange={(v) => setParamValues((prev) => ({ ...prev, [param.id]: v as string | File | File[] }))}
                      />
                    </div>
                  ))}
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Framework Inputs</p>
                  <div className="grid grid-cols-4 gap-4">
                    {params
                      .filter(p => p.type === "file" || p.type === "image")
                      .map(param => (
                        <div key={param.id} className="flex flex-col">
                          <div className="flex flex-col rounded-xl overflow-hidden" style={{ minHeight: 160 }}>
                            <ParamInput
                              param={param}
                              value={paramValues[param.id] ?? null}
                              onChange={(v) => setParamValues((prev) => ({ ...prev, [param.id]: v as string | File | File[] }))}
                              tall
                            />
                          </div>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-sm text-gray-300">{param.label}</span>
                            {param.tooltip && (
                              <span className="relative group inline-flex items-center">
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-gray-600 cursor-help">
                                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                                  <path d="M6 5V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                  <circle cx="6" cy="3.5" r="0.6" fill="currentColor" />
                                </svg>
                                <span
                                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-52 rounded-lg px-3 py-2 text-[11px] leading-relaxed text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                  style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)", boxShadow: "0 4px 16px rgba(0,0,0,0.6)" }}
                                >
                                  {param.tooltip}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex-1 relative">
            <ReactFlowProvider>
              <WorkflowCanvas nodes={framework.nodes} edges={framework.edges} presentationFlows={framework.presentationFlows} />
            </ReactFlowProvider>
            <div
              className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl flex items-center gap-2.5 pointer-events-none"
              style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid var(--app-border-strong)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="var(--app-text-muted)" strokeWidth="1.3" />
                <path d="M7 5V7.5" stroke="var(--app-text-muted)" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="9.5" r="0.6" fill="var(--app-text-muted)" />
              </svg>
              <span className="text-xs text-gray-400">Read-only view — run the framework to use it</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
