"use client";

import React, { useState, useEffect } from "react";
import type { Canvas, CanvasFramework, FrameworkCategory, FrameworkParameter, FrameworkParamType, WorkspaceMember, AtlasNode } from "@/lib/atlas-types";
import { FRAMEWORK_CATEGORIES } from "@/lib/atlas-types";

type FrameworkVisibility = "private" | "workspace" | "community";

const PARAM_TYPE_LABELS: Record<FrameworkParamType, string> = {
  text: "Short text",
  textarea: "Long text",
  color: "Color",
  image: "Image URL",
  select: "Dropdown",
};

function detectParamIds(nodes: AtlasNode[]): string[] {
  const ids = new Set<string>();
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  for (const node of nodes) {
    const s = JSON.stringify(node.data);
    let m;
    const re = new RegExp(regex.source, "g");
    while ((m = re.exec(s)) !== null) ids.add(m[1]);
  }
  return Array.from(ids);
}

function idToLabel(id: string): string {
  return id.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

interface FrameworkCreatorDialogProps {
  open: boolean;
  onClose: () => void;
  canvas: Canvas;
  currentUser: WorkspaceMember;
  onSaveFramework: (framework: CanvasFramework) => void;
}

export function FrameworkCreatorDialog({ open, onClose, canvas, currentUser, onSaveFramework }: FrameworkCreatorDialogProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(canvas.name);
  const [description, setDescription] = useState(canvas.description || "");
  const [category, setCategory] = useState<FrameworkCategory>("workflow");
  const [visibility, setVisibility] = useState<FrameworkVisibility>("private");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [parameters, setParameters] = useState<FrameworkParameter[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setStep(1);
      setName(canvas.name);
      setDescription(canvas.description || "");
      setVisibility("private");
      setCategory("workflow");
      setTags([]);
      setTagInput("");
      setIsSaving(false);

      // Auto-detect parameters from nodes
      const allNodes = canvas.pages && canvas.pages.length > 0
        ? canvas.pages.flatMap(p => p.nodes)
        : canvas.nodes;
      const detectedIds = detectParamIds(allNodes);
      setParameters(
        detectedIds.map(id => ({
          id,
          label: idToLabel(id),
          type: "text" as FrameworkParamType,
          required: false,
          placeholder: "",
          defaultValue: "",
        }))
      );
    }
  }, [open, canvas]);

  if (!open) return null;

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  const handleAddParameter = () => {
    const newId = `param_${Date.now()}`;
    setParameters(prev => [...prev, {
      id: newId,
      label: "New Parameter",
      type: "text",
      required: false,
      placeholder: "",
      defaultValue: "",
    }]);
  };

  const updateParam = (idx: number, patch: Partial<FrameworkParameter>) => {
    setParameters(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  };

  const removeParam = (idx: number) => {
    setParameters(prev => prev.filter((_, i) => i !== idx));
  };

  const moveParam = (idx: number, dir: -1 | 1) => {
    setParameters(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return next;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async (publish: boolean) => {
    if (!name.trim()) return;
    setIsSaving(true);

    const allNodes = canvas.pages && canvas.pages.length > 0
      ? canvas.pages.flatMap(p => p.nodes)
      : canvas.nodes;

    const framework: CanvasFramework = {
      id: `framework-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category,
      visibility: publish ? (visibility === "private" ? "workspace" : visibility) : visibility,
      previewImage: canvas.previewImage,
      nodes: allNodes,
      edges: canvas.pages && canvas.pages.length > 0
        ? canvas.pages.flatMap(p => p.edges)
        : canvas.edges,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      upvotes: 0,
      upvotedBy: [],
      downloads: 0,
      tags,
      parameters: parameters.length > 0 ? parameters : undefined,
      isPublished: publish,
    };

    await new Promise(resolve => setTimeout(resolve, 400));
    onSaveFramework(framework);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid #333333" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F0FE0015" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="2" width="14" height="14" rx="2" stroke="#F0FE00" strokeWidth="1.5"/>
                <path d="M6 9H12M9 6V12" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {step === 1 ? "Save as Framework" : "Define Parameters"}
              </h2>
              <p className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Step {step} of 2 — {step === 1 ? "Framework details" : "Customizable fields"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Step progress bar */}
        <div className="h-0.5 w-full bg-white/10 flex-shrink-0">
          <div className="h-full bg-[#F0FE00] transition-all" style={{ width: step === 1 ? "50%" : "100%" }} />
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Framework Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Brand Identity Workflow"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0FE00]/40"
                  style={{ backgroundColor: "#252525", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this framework for?"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0FE00]/40 resize-none"
                  style={{ backgroundColor: "#252525", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Visibility</label>
                <div className="flex gap-2">
                  {(["private", "workspace", "community"] as FrameworkVisibility[]).map(v => {
                    const labels: Record<FrameworkVisibility, string> = { private: "Just me", workspace: "My Workspace", community: "Community" };
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVisibility(v)}
                        className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: visibility === v ? "#F0FE0015" : "#252525",
                          border: `1px solid ${visibility === v ? "#F0FE00" : "#333333"}`,
                          color: visibility === v ? "#F0FE00" : "#888888",
                          fontFamily: "system-ui, Inter, sans-serif",
                        }}
                      >
                        {labels[v]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category (community only) */}
              {visibility === "community" && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(FRAMEWORK_CATEGORIES) as FrameworkCategory[]).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className="px-3 py-2 rounded-lg text-xs transition-colors"
                        style={{
                          backgroundColor: category === cat ? "#F0FE00" : "#252525",
                          border: `1px solid ${category === cat ? "#F0FE00" : "#333333"}`,
                          color: category === cat ? "#0a0a0a" : "#888888",
                          fontFamily: "system-ui, Inter, sans-serif",
                        }}
                      >
                        {FRAMEWORK_CATEGORIES[cat].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags (community only) */}
              {visibility === "community" && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Tags <span className="text-gray-500 font-normal">(up to 5)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: "#252525", border: "1px solid #333", color: "#F0FE00", fontFamily: "system-ui, Inter, sans-serif" }}>
                        {tag}
                        <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-white">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
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
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0FE00]/40 disabled:opacity-40"
                      style={{ backgroundColor: "#252525", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                    />
                    <button type="button" onClick={handleAddTag} disabled={!tagInput.trim() || tags.length >= 5} className="px-3 py-2 rounded-lg text-xs text-[#F0FE00] disabled:opacity-40" style={{ backgroundColor: "#252525", border: "1px solid #333333" }}>Add</button>
                  </div>
                </div>
              )}

              {/* Detected parameters preview */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: "#252525", border: "1px solid #333333" }}>
                <div className="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#888" strokeWidth="1.2"/><path d="M7 5V7.5" stroke="#888" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="9.5" r="0.6" fill="#888"/></svg>
                  <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    {parameters.length > 0
                      ? `${parameters.length} parameter${parameters.length !== 1 ? "s" : ""} detected from canvas nodes`
                      : "No {{parameters}} detected — add them manually in Step 2, or use {{param_name}} syntax in your nodes"}
                  </span>
                </div>
                {parameters.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {parameters.map(p => (
                      <span key={p.id} className="px-2 py-0.5 rounded text-[11px] font-mono" style={{ backgroundColor: "#1a1a1a", border: "1px solid #444", color: "#F0FE00" }}>{`{{${p.id}}}`}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Define what users can customize when running this framework. Use <span className="font-mono text-[#F0FE00]">{`{{param_id}}`}</span> in your canvas nodes as placeholders.
              </p>

              {parameters.length === 0 && (
                <div className="py-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#252525", border: "1px solid #333" }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4V16M4 10H16" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <p className="text-sm text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No parameters yet</p>
                </div>
              )}

              {parameters.map((param, idx) => (
                <div key={param.id} className="rounded-lg p-3 space-y-3" style={{ backgroundColor: "#252525", border: "1px solid #333333" }}>
                  <div className="flex items-center gap-2">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5">
                      <button type="button" onClick={() => moveParam(idx, -1)} disabled={idx === 0} className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button type="button" onClick={() => moveParam(idx, 1)} disabled={idx === parameters.length - 1} className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                    {/* Placeholder badge */}
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#1a1a1a", border: "1px solid #444", color: "#F0FE00" }}>{`{{${param.id}}}`}</span>
                    <div className="flex-1" />
                    {/* Required toggle */}
                    <button
                      type="button"
                      onClick={() => updateParam(idx, { required: !param.required })}
                      className="text-[10px] px-2 py-0.5 rounded transition-colors"
                      style={{
                        backgroundColor: param.required ? "#F0FE0020" : "transparent",
                        border: `1px solid ${param.required ? "#F0FE0050" : "#444"}`,
                        color: param.required ? "#F0FE00" : "#666",
                        fontFamily: "system-ui, Inter, sans-serif",
                      }}
                    >
                      {param.required ? "Required" : "Optional"}
                    </button>
                    {/* Delete */}
                    <button type="button" onClick={() => removeParam(idx)} className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Label</label>
                      <input
                        type="text"
                        value={param.label}
                        onChange={e => updateParam(idx, { label: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40"
                        style={{ backgroundColor: "#1a1a1a", border: "1px solid #444", fontFamily: "system-ui, Inter, sans-serif" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Type</label>
                      <select
                        value={param.type}
                        onChange={e => updateParam(idx, { type: e.target.value as FrameworkParamType })}
                        className="w-full px-2 py-1.5 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40"
                        style={{ backgroundColor: "#1a1a1a", border: "1px solid #444", fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        {(Object.keys(PARAM_TYPE_LABELS) as FrameworkParamType[]).map(t => (
                          <option key={t} value={t}>{PARAM_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {param.type === "select" && (
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Options (comma-separated)</label>
                      <input
                        type="text"
                        value={param.options?.join(", ") ?? ""}
                        onChange={e => updateParam(idx, { options: e.target.value.split(",").map(o => o.trim()).filter(Boolean) })}
                        placeholder="Option A, Option B, Option C"
                        className="w-full px-2.5 py-1.5 rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40"
                        style={{ backgroundColor: "#1a1a1a", border: "1px solid #444", fontFamily: "system-ui, Inter, sans-serif" }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Placeholder hint</label>
                    <input
                      type="text"
                      value={param.placeholder ?? ""}
                      onChange={e => updateParam(idx, { placeholder: e.target.value })}
                      placeholder="e.g. Enter client name..."
                      className="w-full px-2.5 py-1.5 rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #444", fontFamily: "system-ui, Inter, sans-serif" }}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddParameter}
                className="w-full py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: "#252525", border: "1px dashed #444", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Add Parameter
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderTop: "1px solid #333333" }}>
          {step === 1 ? (
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Cancel
            </button>
          ) : (
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Back
            </button>
          )}

          <div className="flex items-center gap-2">
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
                style={{ backgroundColor: "#F0FE00", color: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Next: Parameters
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                  style={{ backgroundColor: "#252525", border: "1px solid #444", color: "#ccc", fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  {isSaving ? "Saving..." : "Save as Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  style={{ backgroundColor: "#F0FE00", color: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  {isSaving ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Publishing...</>
                  ) : "Publish to Library"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
