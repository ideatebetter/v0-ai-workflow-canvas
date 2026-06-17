"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FileNodeData } from "@/lib/atlas-types";

interface GeneratedMockup {
  url: string;
}

interface MockupGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceFile: FileNodeData;
  onCreateNodes: (mockups: Array<{ imageUrl: string; name: string }>) => void;
}

const ASPECT_RATIOS = [
  { label: "16:9", value: "landscape_16_9" },
  { label: "1:1", value: "square_hd" },
  { label: "4:5", value: "portrait_4_3" },
  { label: "9:16", value: "portrait_16_9" },
];

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|avif|bmp)(\?.*)?$/i;

function isImageUrl(url: string): boolean {
  try {
    return IMAGE_EXTENSIONS.test(new URL(url).pathname);
  } catch {
    return IMAGE_EXTENSIONS.test(url);
  }
}

// Extract a list of named locations/scenes from a prompt.
// Returns an array when 2+ distinct items are found (e.g. ["Chicago", "LA", "New York"]).
function extractNamedScenes(prompt: string): string[] {
  // Match items listed after a preposition: "in X, Y, and Z" / "at X and Y"
  const prep = /\b(?:in|at|across|for|around)\s+([^.!?]+)/gi;
  let best: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = prep.exec(prompt)) !== null) {
    const items = m[1]
      .split(/,\s*(?:and\s+)?|\s+and\s+/i)
      .map((s) => s.trim())
      .filter((s) => {
        const words = s.split(/\s+/);
        return words.length >= 1 && words.length <= 4 && s.length >= 2 && s.length < 40;
      });
    if (items.length > best.length) best = items;
  }

  return best.length >= 2 ? best : [];
}

// Build N scene-specific prompts by substituting each location into the master prompt.
function buildScenePrompts(masterPrompt: string, scenes: string[]): string[] {
  // Find the preposition + list span in the original prompt
  const prep = /(\b(?:in|at|across|for|around)\s+)([^.!?]+)/i;
  const match = masterPrompt.match(prep);

  if (match) {
    const [fullMatch, prep_, list] = match;
    const listItems = list
      .split(/,\s*(?:and\s+)?|\s+and\s+/i)
      .map((s) => s.trim());
    if (listItems.length >= 2) {
      return scenes.map((scene) =>
        masterPrompt.replace(fullMatch, `${prep_}${scene}`)
      );
    }
  }

  // Fallback: append location as context
  return scenes.map((scene) => `${masterPrompt} — specifically in ${scene}`);
}

export function MockupGeneratorDialog({
  isOpen,
  onClose,
  sourceFile,
  onCreateNodes,
}: MockupGeneratorDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(2);
  const [aspectRatio, setAspectRatio] = useState("landscape_16_9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMockups, setGeneratedMockups] = useState<GeneratedMockup[]>([]);
  const [selectedMockups, setSelectedMockups] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const sourceImageUrl = sourceFile.uploadedFile?.url || sourceFile.previewImages?.[0];
  const sourceIsRenderable = !!sourceImageUrl && isImageUrl(sourceImageUrl);

  // Detect named scenes as the user types
  const detectedScenes = useMemo(() => extractNamedScenes(prompt), [prompt]);
  const hasMultipleScenes = detectedScenes.length >= 2;

  const effectiveCount = hasMultipleScenes ? Math.min(detectedScenes.length, 4) : count;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    if (!sourceImageUrl) {
      setError("No source image available. Please ensure the file has an uploaded image.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedMockups([]);
    setSelectedMockups(new Set());

    try {
      // When multiple named scenes are detected, build scene-specific prompts
      const scenes = hasMultipleScenes
        ? buildScenePrompts(prompt.trim(), detectedScenes.slice(0, effectiveCount))
        : undefined;

      const response = await fetch("/api/ai/generate-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sourceImageUrl,
          count: effectiveCount,
          aspectRatio: sourceIsRenderable ? undefined : aspectRatio,
          scenes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      setGeneratedMockups(data.images);
      setSelectedMockups(new Set(data.images.map((_: GeneratedMockup, i: number) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleMockupSelection = (index: number) => {
    const next = new Set(selectedMockups);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedMockups(next);
  };

  const handleAddToCanvas = () => {
    const mockupsToAdd = generatedMockups
      .filter((_, i) => selectedMockups.has(i))
      .map((mockup, i) => ({
        imageUrl: mockup.url,
        name: `${sourceFile.label} Mockup ${i + 1}`,
      }));

    onCreateNodes(mockupsToAdd);
    onClose();
    setPrompt("");
    setGeneratedMockups([]);
    setSelectedMockups(new Set());
  };

  const handleClose = () => {
    onClose();
    setPrompt("");
    setGeneratedMockups([]);
    setSelectedMockups(new Set());
    setError(null);
  };

  const font = { fontFamily: "system-ui, Inter, sans-serif" };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl p-0 overflow-hidden"
        style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "#2a2a2a" }}>
          <DialogTitle className="text-xl font-semibold text-white" style={font}>
            Generate Mockups with AI
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Source + Prompt */}
          <div className="flex gap-4">
            {sourceImageUrl && (
              <div className="flex-shrink-0">
                <p className="text-xs text-gray-500 mb-2" style={font}>Source</p>
                <div className="w-20 h-20 rounded-lg overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
                  <img src={sourceImageUrl} alt="Source" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-2" style={font}>
                Describe your mockup
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Put this graphic on bus stop signs in Chicago, Los Angeles, and New York — long exposure shots with a figure in motion"
                className="w-full h-28 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-white/20"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", ...font }}
              />

              {/* Detected scenes hint */}
              {hasMultipleScenes && (
                <div
                  className="mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
                  style={{
                    backgroundColor: "rgba(240, 254, 0, 0.08)",
                    border: "1px solid rgba(240, 254, 0, 0.2)",
                    color: "#F0FE00",
                    ...font,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="#F0FE00" strokeWidth="1.2"/>
                    <path d="M6 4v3M6 8.5v.5" stroke="#F0FE00" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {detectedScenes.length} scenes detected:{" "}
                  <span className="opacity-75">{detectedScenes.slice(0, 4).join(", ")}</span>
                  {" "}— generating {effectiveCount} images
                </div>
              )}
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-end gap-4 flex-wrap">
            {/* Aspect ratio — only useful when no source image (text-only mode) */}
            <div>
              <label className="text-xs block mb-1" style={{ ...font, color: sourceIsRenderable ? "#444" : "#6b7280" }}>
                Format
                {sourceIsRenderable && (
                  <span className="ml-1" style={{ color: "#555" }}>(set by source)</span>
                )}
              </label>
              <div className="flex gap-1">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.value}
                    type="button"
                    disabled={sourceIsRenderable}
                    onClick={() => setAspectRatio(ar.value)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      backgroundColor:
                        !sourceIsRenderable && aspectRatio === ar.value ? "#ffffff" : "#1a1a1a",
                      color:
                        sourceIsRenderable
                          ? "#333"
                          : aspectRatio === ar.value
                          ? "#000"
                          : "#666",
                      border: `1px solid ${
                        !sourceIsRenderable && aspectRatio === ar.value ? "#ffffff" : "#222"
                      }`,
                      cursor: sourceIsRenderable ? "default" : "pointer",
                      ...font,
                    }}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count — hidden when scenes are auto-detected */}
            {!hasMultipleScenes && (
              <div>
                <label className="text-xs text-gray-500 block mb-1" style={font}>Count</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", ...font }}
                >
                  <option value={1}>1 image</option>
                  <option value={2}>2 images</option>
                  <option value={3}>3 images</option>
                  <option value={4}>4 images</option>
                </select>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="ml-auto"
              style={{
                backgroundColor: isGenerating ? "#2a2a2a" : "#ffffff",
                color: isGenerating ? "#666" : "#000",
                ...font,
              }}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Generating {effectiveCount} image{effectiveCount > 1 ? "s" : ""}…
                </span>
              ) : (
                `Generate ${effectiveCount} image${effectiveCount > 1 ? "s" : ""}`
              )}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm text-red-400"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              {error}
            </div>
          )}

          {/* Generated grid */}
          {generatedMockups.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500" style={font}>Click to select / deselect</p>
              <div className={`grid gap-3 ${generatedMockups.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {generatedMockups.map((mockup, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleMockupSelection(index)}
                    className="relative rounded-lg overflow-hidden transition-all"
                    style={{
                      border: selectedMockups.has(index) ? "2px solid white" : "1px solid #2a2a2a",
                    }}
                  >
                    <img src={mockup.url} alt={`Mockup ${index + 1}`} className="w-full object-cover" />
                    {selectedMockups.has(index) && (
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "white" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 7L6 10L11 4" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    {hasMultipleScenes && detectedScenes[index] && (
                      <div
                        className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs"
                        style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff", ...font }}
                      >
                        {detectedScenes[index]}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {generatedMockups.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: "1px solid #2a2a2a" }}>
            <p className="text-sm text-gray-400" style={font}>
              {selectedMockups.size} of {generatedMockups.length} selected
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                style={{ backgroundColor: "transparent", borderColor: "#2a2a2a", color: "#888", ...font }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToCanvas}
                disabled={selectedMockups.size === 0}
                style={{
                  backgroundColor: selectedMockups.size > 0 ? "#ffffff" : "#2a2a2a",
                  color: selectedMockups.size > 0 ? "#000" : "#666",
                  ...font,
                }}
              >
                Add to Canvas
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
