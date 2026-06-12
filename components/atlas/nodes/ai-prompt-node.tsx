"use client";

import { memo, useState, useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { SmartHandles } from "../smart-handles";
import { ChevronDown, Send, X, Loader2, Image } from "lucide-react";

export interface AIPromptNodeData {
  sourceNodeId: string;
  sourceImageUrl: string;
  sourceFileName: string;
}

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1", width: 1024, height: 1024 },
  { label: "16:9", value: "16:9", width: 1024, height: 576 },
  { label: "9:16", value: "9:16", width: 576, height: 1024 },
  { label: "4:3", value: "4:3", width: 1024, height: 768 },
  { label: "3:4", value: "3:4", width: 768, height: 1024 },
  { label: "21:9", value: "21:9", width: 1024, height: 440 },
];

const VARIATION_OPTIONS = [1, 2, 3, 4];

const SUGGESTIONS = [
  "Put this on a billboard in Times Square",
  "Show this on a laptop screen in a coffee shop",
  "Display on a phone mockup with hands holding it",
  "Place on a magazine cover",
  "Show as a poster on a city wall",
];

function AIPromptNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as AIPromptNodeData;
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [variations, setVariations] = useState(2);
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const [showVariationsDropdown, setShowVariationsDropdown] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholderSuggestion = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sourceImageUrl: nodeData.sourceImageUrl,
          variations: variations,
          aspectRatio: aspectRatio,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Generation failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.images && result.images.length > 0) {
        // Handle both URL format (fal.ai) and base64 format (legacy)
        const mockups = result.images.map((img: { url?: string; base64?: string; mediaType?: string }, index: number) => ({
          imageUrl: img.url || `data:${img.mediaType};base64,${img.base64}`,
          name: `${nodeData.sourceFileName} - ${prompt.slice(0, 25)}${prompt.length > 25 ? "..." : ""} (${index + 1})`,
        }));
        
        // Dispatch custom event to handle mockup creation in atlas-editor
        window.dispatchEvent(new CustomEvent("atlas:mockups-generated", {
          detail: {
            promptNodeId: id,
            sourceNodeId: nodeData.sourceNodeId,
            mockups,
            prompt,
          }
        }));
      } else {
        setError("No images were generated");
        setIsGenerating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setIsGenerating(false);
    }
  }, [prompt, aspectRatio, variations, nodeData, isGenerating]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "#1a1a1a",
        border: "1px solid #333",
        width: 380,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <SmartHandles nodeId={id} />

      {/* Header Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid #333" }}
      >
        <div className="flex items-center gap-2">
          {/* Aspect Ratio Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRatioDropdown(!showRatioDropdown);
                setShowVariationsDropdown(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
              style={{
                backgroundColor: "#2a2a2a",
                color: "#fff",
              }}
            >
              <span>{aspectRatio}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showRatioDropdown && (
              <div
                className="absolute top-full left-0 mt-1 py-1 rounded-lg z-50"
                style={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #444",
                  minWidth: 80,
                }}
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => {
                      setAspectRatio(ratio.value);
                      setShowRatioDropdown(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 transition-colors"
                    style={{
                      color: ratio.value === aspectRatio ? "#F0FE00" : "#fff",
                    }}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Variations Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowVariationsDropdown(!showVariationsDropdown);
                setShowRatioDropdown(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
              style={{
                backgroundColor: "#2a2a2a",
                color: "#fff",
              }}
            >
              <Image className="w-3.5 h-3.5" />
              <span>{variations}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showVariationsDropdown && (
              <div
                className="absolute top-full left-0 mt-1 py-1 rounded-lg z-50"
                style={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #444",
                  minWidth: 100,
                }}
              >
                {VARIATION_OPTIONS.map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setVariations(num);
                      setShowVariationsDropdown(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 transition-colors"
                    style={{
                      color: num === variations ? "#F0FE00" : "#fff",
                    }}
                  >
                    {num} {num === 1 ? "image" : "images"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("atlas:close-ai-prompt", {
              detail: { sourceNodeId: nodeData.sourceNodeId }
            }));
          }}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: "#888" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Label */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid #2a2a2a" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span className="text-sm" style={{ color: "#888" }}>
          Generate from {nodeData.sourceFileName}
        </span>
      </div>

      {/* Text Input Area */}
      <div className="p-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Try "${placeholderSuggestion}"`}
          className="w-full resize-none text-sm focus:outline-none"
          style={{
            backgroundColor: "transparent",
            color: "#fff",
            minHeight: 120,
            fontFamily: "system-ui, Inter, sans-serif",
          }}
          disabled={isGenerating}
        />

        {error && (
          <p className="text-xs mt-2" style={{ color: "#ef4444" }}>
            {error}
          </p>
        )}
      </div>

      {/* Bottom Bar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderTop: "1px solid #2a2a2a" }}
      >
        {/* Source thumbnail */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded overflow-hidden"
            style={{ backgroundColor: "#2a2a2a" }}
          >
            {nodeData.sourceImageUrl && (
              <img
                src={nodeData.sourceImageUrl}
                alt="Source"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <span className="text-xs" style={{ color: "#666" }}>
            {nodeData.sourceFileName}
          </span>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: prompt.trim() && !isGenerating ? "#fff" : "#333",
            color: prompt.trim() && !isGenerating ? "#000" : "#666",
            cursor: prompt.trim() && !isGenerating ? "pointer" : "not-allowed",
          }}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" style={{ transform: "rotate(-45deg)" }} />
          )}
        </button>
      </div>
    </div>
  );
}

export const AIPromptNode = memo(AIPromptNodeComponent);
