"use client";

import React, { useState, useCallback } from "react";
import { ReactFlow, Background, Controls, ReactFlowProvider, useNodesState, useEdgesState } from "@xyflow/react";
import type { CanvasFramework, FrameworkParameter, AtlasNode } from "@/lib/atlas-types";
import { CanvasPreview } from "./canvas-preview";
import "@xyflow/react/dist/style.css";

type DetailTab = "app" | "workflow";

interface Props {
  framework: CanvasFramework;
  onBack: () => void;
  onRun: (framework: CanvasFramework, paramValues: Record<string, string>) => void;
  breadcrumbLabel?: string; // e.g. "Frameworks" or "Community"
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

function ParamInput({
  param,
  value,
  onChange,
}: {
  param: FrameworkParameter;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    "w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40 resize-none";
  const style = {
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    fontFamily: "system-ui, Inter, sans-serif",
  };

  if (param.type === "textarea") {
    return (
      <textarea
        rows={3}
        value={value}
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={base}
        style={{ ...style, appearance: "none" }}
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
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#F0FE00"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer flex-shrink-0"
          style={{ backgroundColor: "transparent", border: "1px solid #2a2a2a", padding: 2 }}
        />
        <input
          type="text"
          value={value}
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
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={param.placeholder || (param.type === "image" ? "https://…" : `Enter ${param.label.toLowerCase()}…`)}
      className={base}
      style={style}
    />
  );
}

export function FrameworkDetailPage({ framework, onBack, onRun, breadcrumbLabel = "Frameworks" }: Props) {
  const [tab, setTab] = useState<DetailTab>("app");
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    framework.parameters?.forEach((p) => {
      init[p.id] = p.defaultValue ?? "";
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
        {/* Left: breadcrumb */}
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

        {/* Center: App / Workflow toggle */}
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

        {/* Right: author avatar */}
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
          /* ── APP VIEW ── */
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-3xl mx-auto">
              {/* Title block */}
              <div className="mb-8">
                <h1
                  className="text-white font-bold mb-2"
                  style={{ fontSize: 32, lineHeight: 1.15 }}
                >
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

              {/* Hero Preview */}
              <div
                className="w-full rounded-2xl overflow-hidden mb-8"
                style={{ aspectRatio: "16/9", border: "1px solid #1e1e1e" }}
              >
                <CanvasPreview nodes={framework.nodes} />
              </div>

              {/* Stats row */}
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

              {/* Tags */}
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

              {/* About section */}
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}
              >
                <h3 className="text-white font-medium text-sm mb-3">About this framework</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{framework.description}</p>
                {hasParams && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1e1e1e" }}>
                    <p className="text-gray-500 text-xs mb-3 uppercase tracking-wider">Parameters</p>
                    <div className="space-y-2">
                      {params.map((p) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono"
                            style={{ backgroundColor: "#1a1a1a", color: "#F0FE00", border: "1px solid #2a2a2a" }}
                          >
                            {`{{${p.id}}}`}
                          </span>
                          <span className="text-gray-300 text-sm">{p.label}</span>
                          {p.required && <span className="text-[10px] text-red-400">required</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── WORKFLOW VIEW ── */
          <div className="flex-1 relative">
            <ReactFlowProvider>
              <WorkflowCanvas nodes={framework.nodes} edges={framework.edges} />
            </ReactFlowProvider>
            {/* Read-only banner */}
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

        {/* ── RIGHT PANEL: Run Framework ── */}
        <div
          className="w-72 flex-shrink-0 flex flex-col"
          style={{ borderLeft: "1px solid #1e1e1e", backgroundColor: "#0d0d0d" }}
        >
          <div className="p-5 flex-shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
            <h2 className="text-white font-semibold text-base">Run Framework</h2>
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
                    value={paramValues[param.id] ?? ""}
                    onChange={(v) => setParamValues((prev) => ({ ...prev, [param.id]: v }))}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <div
                  className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: "#1a1a1a" }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4.5 9H13.5M9 4.5V13.5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No parameters</p>
                <p className="text-gray-600 text-xs mt-1">This framework runs as-is</p>
              </div>
            )}
          </div>

          {/* Run button */}
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
