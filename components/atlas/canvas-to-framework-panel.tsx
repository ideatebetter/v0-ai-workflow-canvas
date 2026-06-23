"use client";

import React, { useState, useEffect } from "react";
import type { AtlasNode, CanvasFramework, FrameworkParamType, WorkspaceMember, FrameworkCategory, FrameworkParameter } from "@/lib/atlas-types";
import { FRAMEWORK_CATEGORIES } from "@/lib/atlas-types";
import type { Canvas } from "@/lib/atlas-types";

type FrameworkVisibility = "private" | "workspace" | "community";

interface NodeEntry {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  label: string;
  description: string;
  targetField?: string;
  paramType?: FrameworkParamType;
  multiple?: boolean;
}

function getNodeDisplayName(node: AtlasNode): string {
  const d = node.data as Record<string, unknown>;
  if (typeof d.label === "string" && d.label) return d.label;
  if (typeof d.fileName === "string" && d.fileName) return d.fileName;
  if (typeof d.name === "string" && d.name) return d.name;
  return `${(node.type ?? "node").charAt(0).toUpperCase() + (node.type ?? "node").slice(1)} node`;
}

function inferParamType(nodeType: string): FrameworkParamType {
  const map: Record<string, FrameworkParamType> = {
    file: "file",
    text: "textarea",
    moodboard: "file",
    briefInput: "file",
  };
  return map[nodeType] ?? "text";
}

function inferTargetField(nodeType: string): string | undefined {
  const map: Record<string, string> = {
    moodboard: "images",
    text: "content",
    file: "uploadedFile",
  };
  return map[nodeType];
}

function inferMultiple(nodeType: string): boolean {
  return nodeType === "moodboard";
}

function NodeTypeDot({ type, color }: { type: string; color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
      style={{ backgroundColor: color }}
    />
  );
}

const VISIBILITY_OPTIONS: { id: FrameworkVisibility; label: string; sub: string }[] = [
  { id: "private", label: "Just me", sub: "Only visible on your account" },
  { id: "workspace", label: "My Workspace", sub: "Shared with your team" },
  { id: "community", label: "Atlas Community", sub: "Public for everyone" },
];

interface CanvasToFrameworkPanelProps {
  canvas: Canvas;
  currentUser: WorkspaceMember;
  selectedCanvasNodes: AtlasNode[];   // nodes currently selected on canvas
  onClearSelection: () => void;       // deselect all canvas nodes
  onClose: () => void;
  onSave: (framework: CanvasFramework) => void;
}

export function CanvasToFrameworkPanel({
  canvas,
  currentUser,
  selectedCanvasNodes,
  onClearSelection,
  onClose,
  onSave,
}: CanvasToFrameworkPanelProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Input nodes
  const [inputs, setInputs] = useState<NodeEntry[]>([]);
  // Output nodes
  const [outputs, setOutputs] = useState<NodeEntry[]>([]);

  // Step 3 fields
  const [frameworkName, setFrameworkName] = useState(canvas.name);
  const [frameworkDescription, setFrameworkDescription] = useState(canvas.description || "");
  const [visibility, setVisibility] = useState<FrameworkVisibility>("private");
  const [category, setCategory] = useState<FrameworkCategory>("workflow");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [capturePresentationFlow, setCapturePresentationFlow] = useState(false);

  // Nodes pending add (currently selected on canvas, not yet in inputs/outputs)
  const existingIds = new Set([...inputs.map(e => e.nodeId), ...outputs.map(e => e.nodeId)]);
  const pendingNodes = selectedCanvasNodes.filter(n => !existingIds.has(n.id));

  const addPending = () => {
    if (pendingNodes.length === 0) return;
    const newEntries: NodeEntry[] = pendingNodes.map(n => ({
      nodeId: n.id,
      nodeName: getNodeDisplayName(n),
      nodeType: n.type ?? "node",
      label: getNodeDisplayName(n),
      description: "",
      targetField: inferTargetField(n.type ?? ""),
      paramType: inferParamType(n.type ?? ""),
      multiple: inferMultiple(n.type ?? ""),
    }));
    if (step === 1) setInputs(prev => [...prev, ...newEntries]);
    else if (step === 2) setOutputs(prev => [...prev, ...newEntries]);
    onClearSelection();
  };

  const removeEntry = (list: "inputs" | "outputs", nodeId: string) => {
    if (list === "inputs") setInputs(prev => prev.filter(e => e.nodeId !== nodeId));
    else setOutputs(prev => prev.filter(e => e.nodeId !== nodeId));
  };

  const updateEntry = (
    list: "inputs" | "outputs",
    nodeId: string,
    field: "label" | "description",
    value: string
  ) => {
    const setter = list === "inputs" ? setInputs : setOutputs;
    setter(prev => prev.map(e => e.nodeId === nodeId ? { ...e, [field]: value } : e));
  };

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  const allNodes = canvas.pages && canvas.pages.length > 0
    ? canvas.pages.flatMap(p => p.nodes)
    : canvas.nodes ?? [];
  const allEdges = canvas.pages && canvas.pages.length > 0
    ? canvas.pages.flatMap(p => p.edges)
    : canvas.edges ?? [];

  const handleSave = async () => {
    if (!frameworkName.trim()) return;
    setIsSaving(true);

    const parameters: FrameworkParameter[] = inputs.map(e => ({
      id: e.nodeId,
      label: e.label || e.nodeName,
      type: e.paramType ?? inferParamType(e.nodeType),
      required: false,
      placeholder: e.description || undefined,
      tooltip: e.description || undefined,
      multiple: e.multiple,
      targetNodeId: e.nodeId,
      targetField: e.targetField,
    }));

    const framework: CanvasFramework = {
      id: `framework-${Date.now()}`,
      name: frameworkName.trim(),
      description: frameworkDescription.trim(),
      category,
      visibility,
      previewImage: canvas.previewImage,
      nodes: allNodes,
      edges: allEdges,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      upvotes: 0,
      upvotedBy: [],
      downloads: 0,
      tags,
      parameters: parameters.length > 0 ? parameters : undefined,
      isPublished: visibility !== "private",
      presentationFlows: capturePresentationFlow ? (canvas.presentationFlows ?? []) : undefined,
      nodeRoles: {
        inputs: inputs.map(e => ({ nodeId: e.nodeId, label: e.label, description: e.description })),
        outputs: outputs.map(e => ({ nodeId: e.nodeId, label: e.label, description: e.description })),
      },
    };

    await new Promise(r => setTimeout(r, 300));
    onSave(framework);
    setIsSaving(false);
  };

  const stepColor = step === 1 ? "#4ade80" : step === 2 ? "#818cf8" : "#F0FE00";
  const currentList = step === 1 ? inputs : step === 2 ? outputs : [];
  const stepLabel = step === 1 ? "inputs" : "outputs";

  return (
    <div
      className="flex flex-col"
      style={{
        width: 340,
        height: "100%",
        backgroundColor: "#121212",
        borderLeft: "1px solid #222",
        fontFamily: "system-ui, Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid #222" }}
      >
        <div>
          <p className="text-sm font-semibold text-white">Turn into Framework</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#555" }}>
            Step {step} of 3 —{" "}
            {step === 1 ? "Select inputs" : step === 2 ? "Select outputs" : "Publish"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-white/8 transition-colors"
          style={{ color: "#555" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Progress bar — 3 segments */}
      <div className="h-0.5 flex flex-shrink-0" style={{ backgroundColor: "#1e1e1e" }}>
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className="h-full flex-1 transition-all duration-300"
            style={{ backgroundColor: s <= step ? stepColor : "transparent" }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Step 1 & 2: Select nodes on canvas ── */}
        {(step === 1 || step === 2) && (
          <div className="p-4 space-y-4">
            {/* Instruction */}
            <div
              className="p-3 rounded-xl space-y-1"
              style={{ backgroundColor: step === 1 ? "#0f2018" : "#13101f", border: `1px solid ${step === 1 ? "#1a3a26" : "#1e1a36"}` }}
            >
              <p className="text-xs font-medium" style={{ color: stepColor }}>
                {step === 1 ? "Select input nodes" : "Select output nodes"}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#666" }}>
                {step === 1
                  ? "Click nodes on the canvas to mark what users will provide — files, text, references."
                  : "Click nodes on the canvas to mark the deliverables this framework produces."}
              </p>
            </div>

            {/* Pending add banner */}
            {pendingNodes.length > 0 && (
              <button
                type="button"
                onClick={addPending}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                style={{ backgroundColor: `${stepColor}18`, border: `1px solid ${stepColor}50` }}
              >
                <span className="text-xs font-medium" style={{ color: stepColor }}>
                  {pendingNodes.length} node{pendingNodes.length !== 1 ? "s" : ""} selected — tap to add
                </span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: stepColor }}>
                  <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* Added nodes */}
            {currentList.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#444" }}>
                  Added {stepLabel}
                </p>
                {currentList.map(entry => (
                  <div
                    key={entry.nodeId}
                    className="rounded-xl p-3 space-y-2"
                    style={{
                      backgroundColor: step === 1 ? "#0d1f14" : "#0f0f1e",
                      border: `1px solid ${step === 1 ? "#1a3028" : "#1e1a30"}`,
                    }}
                  >
                    {/* Node name + remove */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <NodeTypeDot type={entry.nodeType} color={stepColor} />
                        <span className="text-[11px] truncate" style={{ color: "#666" }}>
                          {entry.nodeName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEntry(step === 1 ? "inputs" : "outputs", entry.nodeId)}
                        className="p-0.5 flex-shrink-0 hover:opacity-80 transition-opacity"
                        style={{ color: "#444" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    {/* Label */}
                    <input
                      type="text"
                      value={entry.label}
                      onChange={e => updateEntry(step === 1 ? "inputs" : "outputs", entry.nodeId, "label", e.target.value)}
                      placeholder={step === 1 ? "Input label (e.g. Logo File)" : "Output label (e.g. Brand Mockups)"}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white placeholder-gray-700 focus:outline-none"
                      style={{ backgroundColor: "#0a0a0a", border: "1px solid #222" }}
                    />
                    {/* Description */}
                    <input
                      type="text"
                      value={entry.description}
                      onChange={e => updateEntry(step === 1 ? "inputs" : "outputs", entry.nodeId, "description", e.target.value)}
                      placeholder={step === 1 ? "What should users provide?" : "What does this output represent?"}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white placeholder-gray-700 focus:outline-none"
                      style={{ backgroundColor: "#0a0a0a", border: "1px solid #222" }}
                    />
                  </div>
                ))}
              </div>
            ) : pendingNodes.length === 0 ? (
              <div
                className="py-8 flex flex-col items-center gap-2 rounded-xl"
                style={{ backgroundColor: "#0e0e0e", border: "1px dashed #222" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${stepColor}15` }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3V13M3 8H13" stroke={stepColor} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-[11px]" style={{ color: "#444" }}>
                  Click nodes on the canvas to add {stepLabel}
                </p>
              </div>
            ) : null}

            {/* Skip hint */}
            {step === 1 && (
              <p className="text-[10px] text-center" style={{ color: "#333" }}>
                No inputs? Hit Continue to skip
              </p>
            )}
            {step === 2 && (
              <p className="text-[10px] text-center" style={{ color: "#333" }}>
                No outputs? Hit Continue to skip
              </p>
            )}
          </div>
        )}

        {/* ── Step 3: Publish ── */}
        {step === 3 && (
          <div className="p-4 space-y-5">
            {/* Summary of selections */}
            {(inputs.length > 0 || outputs.length > 0) && (
              <div className="flex gap-3">
                {inputs.length > 0 && (
                  <div className="flex-1 px-3 py-2 rounded-xl" style={{ backgroundColor: "#0f2018", border: "1px solid #1a3026" }}>
                    <p className="text-[10px] font-medium" style={{ color: "#4ade80" }}>{inputs.length} input{inputs.length !== 1 ? "s" : ""}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#444" }}>what users provide</p>
                  </div>
                )}
                {outputs.length > 0 && (
                  <div className="flex-1 px-3 py-2 rounded-xl" style={{ backgroundColor: "#13101f", border: "1px solid #1e1a36" }}>
                    <p className="text-[10px] font-medium" style={{ color: "#818cf8" }}>{outputs.length} output{outputs.length !== 1 ? "s" : ""}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#444" }}>deliverables</p>
                  </div>
                )}
              </div>
            )}

            {/* Framework name */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "#555" }}>
                Framework name
              </label>
              <input
                type="text"
                value={frameworkName}
                onChange={e => setFrameworkName(e.target.value)}
                placeholder="e.g. Brand Identity Workflow"
                className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-700 focus:outline-none"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #252525" }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "#555" }}>
                Description
              </label>
              <textarea
                value={frameworkDescription}
                onChange={e => setFrameworkDescription(e.target.value)}
                placeholder="What does this framework do? What's the end result?"
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-700 focus:outline-none resize-none"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #252525" }}
              />
            </div>

            {/* Presentation flow capture */}
            {(canvas.presentationFlows?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setCapturePresentationFlow(v => !v)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: capturePresentationFlow ? "#1a1200" : "#1a1a1a",
                  border: `1px solid ${capturePresentationFlow ? "#F0FE0050" : "#252525"}`,
                }}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: capturePresentationFlow ? "#F0FE00" : "#252525", border: capturePresentationFlow ? "none" : "1px solid #444" }}
                >
                  {capturePresentationFlow && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: capturePresentationFlow ? "#fff" : "#666" }}>
                    Capture presentation flow
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#444" }}>
                    {canvas.presentationFlows!.length} flow{canvas.presentationFlows!.length !== 1 ? "s" : ""} — users run this canvas with the same slide order
                  </p>
                </div>
              </button>
            )}

            {/* Visibility */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: "#555" }}>
                Who can use this?
              </label>
              <div className="space-y-1.5">
                {VISIBILITY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVisibility(opt.id)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      backgroundColor: visibility === opt.id ? "#F0FE0010" : "#1a1a1a",
                      border: `1px solid ${visibility === opt.id ? "#F0FE0050" : "#252525"}`,
                    }}
                  >
                    <div className="flex-1">
                      <p className="text-xs font-medium" style={{ color: visibility === opt.id ? "#fff" : "#666" }}>{opt.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#444" }}>{opt.sub}</p>
                    </div>
                    {visibility === opt.id && (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: "#F0FE00", flexShrink: 0 }}>
                        <path d="M2 6.5L5 9.5L11 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Community extras */}
            {visibility === "community" && (
              <>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: "#555" }}>Category</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(FRAMEWORK_CATEGORIES) as FrameworkCategory[]).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className="px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                        style={{
                          backgroundColor: category === cat ? "#F0FE00" : "#1a1a1a",
                          border: `1px solid ${category === cat ? "#F0FE00" : "#252525"}`,
                          color: category === cat ? "#0a0a0a" : "#555",
                        }}
                      >
                        {FRAMEWORK_CATEGORIES[cat].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: "#555" }}>
                    Tags <span className="normal-case font-normal" style={{ color: "#333" }}>(up to 5)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                        style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", color: "#F0FE00" }}
                      >
                        {tag}
                        <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                      placeholder="Add a tag..."
                      disabled={tags.length >= 5}
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-white placeholder-gray-700 focus:outline-none disabled:opacity-40"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #252525" }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || tags.length >= 5}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium disabled:opacity-40"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #252525", color: "#F0FE00" }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderTop: "1px solid #1e1e1e" }}
      >
        <button
          type="button"
          onClick={() => {
            if (step === 1) onClose();
            else setStep(s => (s - 1) as 1 | 2 | 3);
          }}
          className="px-3.5 py-2 rounded-xl text-xs transition-colors hover:text-white"
          style={{ color: "#444" }}
        >
          {step === 1 ? "Cancel" : "Back"}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              onClearSelection();
              setStep(s => (s + 1) as 2 | 3);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            style={{ backgroundColor: stepColor, color: step === 3 ? "#0a0a0a" : step === 1 ? "#0a1a0e" : "#0a0a18" }}
          >
            Continue
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={!frameworkName.trim() || isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all"
            style={{ backgroundColor: "#F0FE00", color: "#0a0a0a" }}
          >
            {isSaving ? (
              <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Saving…</>
            ) : (
              visibility === "community" ? "Publish Framework" : "Save Framework"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
