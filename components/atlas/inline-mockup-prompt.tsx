"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface GeneratedMockup {
  url: string;
}

interface InlineMockupPromptProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  sourceImageUrl: string;
  sourceFileName: string;
  onMockupsGenerated: (mockups: Array<{ imageUrl: string; name: string }>) => void;
}

export function InlineMockupPrompt({
  isOpen,
  onClose,
  position,
  sourceImageUrl,
  sourceFileName,
  onMockupsGenerated,
}: InlineMockupPromptProps) {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sourceImageUrl,
          count,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();

      const mockups = data.images.map((mockup: GeneratedMockup, index: number) => ({
        imageUrl: mockup.url,
        name: `${sourceFileName} Mockup ${index + 1}`,
      }));

      onMockupsGenerated(mockups);
      onClose();
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  const fontStyle = { fontFamily: "system-ui, Inter, sans-serif" };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Prompt Box */}
      <div
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 9999,
          backgroundColor: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 12,
          padding: 12,
          width: 340,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: "#F0FE00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1L8.5 4.5L12 5L9.5 7.5L10 11L7 9.5L4 11L4.5 7.5L2 5L5.5 4.5L7 1Z"
                stroke="#121212"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", ...fontStyle }}>
            Generate Mockup
          </span>
        </div>

        {/* Source preview + input */}
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid #333",
              flexShrink: 0,
            }}
          >
            <img
              src={sourceImageUrl}
              alt="Source"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Show this on a billboard in Times Square..."
            disabled={isGenerating}
            style={{
              flex: 1,
              backgroundColor: "#0d0d0d",
              border: "1px solid #333",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              color: "#fff",
              outline: "none",
              ...fontStyle,
            }}
          />
        </div>

        {/* Count selector */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              style={{
                flex: 1,
                padding: "5px 0",
                borderRadius: 6,
                backgroundColor: count === n ? "#F0FE00" : "#0d0d0d",
                border: `1px solid ${count === n ? "#F0FE00" : "#333"}`,
                fontSize: 12,
                fontWeight: 500,
                color: count === n ? "#121212" : "#888",
                cursor: "pointer",
                ...fontStyle,
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              fontSize: 12,
              color: "#ef4444",
              marginBottom: 10,
              ...fontStyle,
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              backgroundColor: "transparent",
              border: "1px solid #333",
              fontSize: 12,
              color: "#888",
              cursor: "pointer",
              ...fontStyle,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              backgroundColor: isGenerating || !prompt.trim() ? "#333" : "#F0FE00",
              border: "none",
              fontSize: 12,
              fontWeight: 500,
              color: isGenerating || !prompt.trim() ? "#666" : "#121212",
              cursor: isGenerating || !prompt.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              ...fontStyle,
            }}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Generating {count}...
              </>
            ) : (
              `Generate ${count}`
            )}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
