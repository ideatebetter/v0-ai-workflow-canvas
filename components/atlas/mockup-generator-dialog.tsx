"use client";

import React, { useState } from "react";
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
  { label: "Widescreen", value: "landscape_16_9", display: "16:9" },
  { label: "Square", value: "square_hd", display: "1:1" },
  { label: "Portrait", value: "portrait_4_3", display: "4:5" },
  { label: "Billboard", value: "portrait_16_9", display: "9:16" },
];

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
      const response = await fetch("/api/ai/generate-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sourceImageUrl,
          count,
          aspectRatio,
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
    const newSelection = new Set(selectedMockups);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedMockups(newSelection);
  };

  const handleAddToCanvas = () => {
    const mockupsToAdd = generatedMockups
      .filter((_, index) => selectedMockups.has(index))
      .map((mockup, index) => ({
        imageUrl: mockup.url,
        name: `${sourceFile.label} Mockup ${index + 1}`,
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl p-0 overflow-hidden"
        style={{
          backgroundColor: "#141414",
          border: "1px solid #2a2a2a",
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "#2a2a2a" }}>
          <DialogTitle
            className="text-xl font-semibold text-white"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            Generate Mockups with AI
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Source Preview */}
          <div className="flex gap-4">
            {sourceImageUrl && (
              <div className="flex-shrink-0">
                <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Source
                </p>
                <div
                  className="w-20 h-20 rounded-lg overflow-hidden"
                  style={{ border: "1px solid #2a2a2a" }}
                >
                  <img
                    src={sourceImageUrl}
                    alt="Source"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Prompt Input */}
            <div className="flex-1">
              <label
                className="text-xs text-gray-500 block mb-2"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Describe your mockup suite
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Create a series of long exposure billboards showcasing this graphic in major US cities at night — New York, Chicago, LA, Miami..."
                className="w-full h-28 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-white/20"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-end gap-4">
            {/* Aspect ratio */}
            <div>
              <label
                className="text-xs text-gray-500 block mb-1"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Format
              </label>
              <div className="flex gap-1">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.value}
                    type="button"
                    onClick={() => setAspectRatio(ar.value)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      backgroundColor: aspectRatio === ar.value ? "#ffffff" : "#1a1a1a",
                      color: aspectRatio === ar.value ? "#000000" : "#888888",
                      border: `1px solid ${aspectRatio === ar.value ? "#ffffff" : "#2a2a2a"}`,
                      fontFamily: "system-ui, Inter, sans-serif",
                    }}
                  >
                    {ar.display}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <label
                className="text-xs text-gray-500 block mb-1"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Count
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                <option value={1}>1 image</option>
                <option value={2}>2 images</option>
                <option value={3}>3 images</option>
                <option value={4}>4 images</option>
              </select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="ml-auto"
              style={{
                backgroundColor: isGenerating ? "#2a2a2a" : "#ffffff",
                color: isGenerating ? "#666666" : "#000000",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Generating {count} image{count > 1 ? "s" : ""}...
                </span>
              ) : (
                `Generate ${count} image${count > 1 ? "s" : ""}`
              )}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm text-red-400"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              {error}
            </div>
          )}

          {/* Generated Mockups */}
          {generatedMockups.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Click to select / deselect
              </p>
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
                    <img
                      src={mockup.url}
                      alt={`Mockup ${index + 1}`}
                      className="w-full aspect-video object-cover"
                    />
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
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {generatedMockups.length > 0 && (
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderTop: "1px solid #2a2a2a" }}
          >
            <p className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              {selectedMockups.size} of {generatedMockups.length} selected
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                style={{
                  backgroundColor: "transparent",
                  borderColor: "#2a2a2a",
                  color: "#888888",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToCanvas}
                disabled={selectedMockups.size === 0}
                style={{
                  backgroundColor: selectedMockups.size > 0 ? "#ffffff" : "#2a2a2a",
                  color: selectedMockups.size > 0 ? "#000000" : "#666666",
                  fontFamily: "system-ui, Inter, sans-serif",
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
