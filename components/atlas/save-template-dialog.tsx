"use client";

import React, { useState } from "react";
import type { Canvas, CanvasFramework, FrameworkCategory, WorkspaceMember } from "@/lib/atlas-types";
import { FRAMEWORK_CATEGORIES } from "@/lib/atlas-types";

type FrameworkVisibility = "private" | "workspace" | "community";

const VISIBILITY_OPTIONS: { id: FrameworkVisibility; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "private",
    label: "Just Me",
    description: "Only visible to you",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 15C3 12.2386 5.23858 10 8 10H10C12.7614 10 15 12.2386 15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "workspace",
    label: "My Workspace",
    description: "Shared with your team",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1 14C1 11.7909 2.79086 10 5 10H7C7.7684 10 8.4692 10.2889 9 10.7639C9.5308 10.2889 10.2316 10 11 10H13C15.2091 10 17 11.7909 17 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "community",
    label: "Atlas Community",
    description: "Public for all users",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 9H16" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 2C10.6569 4.33333 11.5 6.66667 11.5 9C11.5 11.3333 10.6569 13.6667 9 16" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 2C7.34315 4.33333 6.5 6.66667 6.5 9C6.5 11.3333 7.34315 13.6667 9 16" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
];

interface SaveFrameworkDialogProps {
  open: boolean;
  onClose: () => void;
  canvas: Canvas;
  currentUser: WorkspaceMember;
  onSaveFramework: (framework: CanvasFramework) => void;
}

export function SaveFrameworkDialog({
  open,
  onClose,
  canvas,
  currentUser,
  onSaveFramework,
}: SaveFrameworkDialogProps) {
  const [name, setName] = useState(canvas.name);
  const [description, setDescription] = useState(canvas.description || "");
  const [category, setCategory] = useState<FrameworkCategory>("workflow");
  const [visibility, setVisibility] = useState<FrameworkVisibility>("private");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!open) return null;

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);

    const framework: CanvasFramework = {
      id: `framework-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      category,
      visibility,
      previewImage: canvas.previewImage,
      nodes: canvas.nodes,
      edges: canvas.edges,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      upvotes: 0,
      upvotedBy: [],
      downloads: 0,
      tags,
    };

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (onSaveFramework) {
      onSaveFramework(framework);
    } else {
      console.log("[v0] Framework saved:", framework.name, framework);
    }
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg rounded-xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: "1px solid var(--app-canvas-dot)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#F0FE0015" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="14" height="14" rx="2" stroke="#F0FE00" strokeWidth="1.5"/>
                <path d="M7 10H13M10 7V13" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2
                className="text-lg font-semibold text-foreground"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Save as Framework
              </h2>
              <p
                className="text-sm text-gray-400"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Create a reusable framework from this canvas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Template Name */}
          <div>
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              Framework Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter framework name"
              className="w-full px-4 py-2.5 rounded-lg text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0FE00]/50"
              style={{
                backgroundColor: "var(--app-border-strong)",
                border: "1px solid var(--app-canvas-dot)",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this framework is for..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0FE00]/50 resize-none"
              style={{
                backgroundColor: "var(--app-border-strong)",
                border: "1px solid var(--app-canvas-dot)",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            />
          </div>

          {/* Visibility */}
          <div>
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              Who can access this framework?
            </label>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVisibility(option.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    visibility === option.id
                      ? "text-foreground"
                      : "text-gray-400 hover:text-foreground hover:bg-white/5"
                  }`}
                  style={{
                    backgroundColor: visibility === option.id ? "#F0FE0015" : "var(--app-border-strong)",
                    border: `1px solid ${visibility === option.id ? "#F0FE00" : "var(--app-canvas-dot)"}`,
                  }}
                >
                  <div
                    className={`flex-shrink-0 ${
                      visibility === option.id ? "text-[#F0FE00]" : "text-gray-500"
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      {option.label}
                    </div>
                    <div
                      className="text-xs text-gray-500"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      {option.description}
                    </div>
                  </div>
                  {visibility === option.id && (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 text-[#F0FE00]">
                      <path d="M4 9L7.5 12.5L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Category - Only show for community templates */}
          {visibility === "community" && (
          <div>
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(FRAMEWORK_CATEGORIES) as FrameworkCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    category === cat
                      ? "text-[var(--app-bg)] font-medium"
                      : "text-gray-400 hover:text-foreground hover:bg-white/5"
                  }`}
                  style={{
                    backgroundColor: category === cat ? "#F0FE00" : "var(--app-border-strong)",
                    border: `1px solid ${category === cat ? "#F0FE00" : "var(--app-canvas-dot)"}`,
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
                >
                  {FRAMEWORK_CATEGORIES[cat].label}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Tags - Only for community templates */}
          {visibility === "community" && (
          <div>
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              Tags <span className="text-gray-500 font-normal">(up to 5)</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm"
                  style={{
                    backgroundColor: "var(--app-border-strong)",
                    border: "1px solid var(--app-canvas-dot)",
                    color: "#F0FE00",
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-foreground transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                disabled={tags.length >= 5}
                className="flex-1 px-4 py-2 rounded-lg text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0FE00]/50 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--app-border-strong)",
                  border: "1px solid var(--app-canvas-dot)",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--app-border-strong)",
                  border: "1px solid var(--app-canvas-dot)",
                  color: "#F0FE00",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                Add
              </button>
            </div>
          </div>
          )}

          {/* Preview info */}
          <div
            className="p-3 rounded-lg flex items-center gap-3"
            style={{ backgroundColor: "var(--app-border-strong)", border: "1px solid var(--app-canvas-dot)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="9" r="7" stroke="var(--app-text-muted)" strokeWidth="1.5"/>
              <path d="M9 6V9.5" stroke="var(--app-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="12" r="0.75" fill="var(--app-text-muted)"/>
            </svg>
            <p
              className="text-sm text-gray-400"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              {visibility === "community" 
                ? `Your framework will include ${canvas.nodes.length} nodes and be attributed to you in the community.`
                : visibility === "workspace"
                ? `Your framework will include ${canvas.nodes.length} nodes and be available to your workspace members.`
                : `Your framework will include ${canvas.nodes.length} nodes and be saved to your private frameworks.`
              }
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--app-canvas-dot)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-foreground hover:bg-white/10 transition-colors"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--app-bg)] transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{
              backgroundColor: "#F0FE00",
              fontFamily: "system-ui, Inter, sans-serif",
            }}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 10V13C14 13.552 13.552 14 13 14H3C2.448 14 2 13.552 2 13V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 2V10M8 2L5 5M8 2L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {visibility === "community" ? "Publish Framework" : "Save Framework"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
