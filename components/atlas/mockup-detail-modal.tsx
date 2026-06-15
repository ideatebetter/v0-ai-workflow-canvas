"use client";

import React, { useEffect } from "react";
import type { MockupImageNodeData } from "./nodes/mockup-image-node";

interface MockupDetailModalProps {
  data: MockupImageNodeData;
  onClose: () => void;
}

export function MockupDetailModal({ data, onClose }: MockupDetailModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = data.imageUrl;
    link.download = `${data.label}.png`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 flex gap-4 max-w-6xl w-full mx-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image panel */}
        <div
          className="flex-1 rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: "#0d0d0d", maxHeight: "85vh" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt={data.label}
            style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain", display: "block" }}
          />
        </div>

        {/* Sidebar */}
        <div
          className="flex flex-col gap-4 w-72 flex-shrink-0 rounded-2xl p-5"
          style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}
        >
          {/* Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1e1e1e" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0FE00" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5" fill="#F0FE00" stroke="none"/>
                  <polyline points="21 15 16 10 5 21" stroke="#F0FE00"/>
                </svg>
              </div>
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "system-ui, Inter, sans-serif" }}>
                AI Mockup
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              style={{ color: "#666" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 3L3 11M3 3L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Title */}
          <div>
            <p
              className="text-sm font-semibold leading-snug"
              style={{ color: "#fff", fontFamily: "system-ui, Inter, sans-serif" }}
            >
              {data.label}
            </p>
            <p className="text-xs mt-1" style={{ color: "#555", fontFamily: "system-ui, Inter, sans-serif" }}>
              {data.generatedAt}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px" style={{ backgroundColor: "#222" }} />

          {/* Prompt */}
          {data.prompt && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "#666", fontFamily: "system-ui, Inter, sans-serif" }}>
                PROMPT
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.8)", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {data.prompt}
              </p>
            </div>
          )}

          {/* Source */}
          {data.sourceFileName && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "#666", fontFamily: "system-ui, Inter, sans-serif" }}>
                SOURCE
              </p>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#1e1e1e" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#888" strokeWidth="1.3">
                  <rect x="2" y="1" width="8" height="10" rx="1"/>
                  <path d="M8 1L10 3" strokeLinejoin="round"/>
                  <path d="M4 6H8M4 8H7" strokeLinecap="round"/>
                </svg>
                <span className="text-xs truncate" style={{ color: "#999", fontFamily: "system-ui, Inter, sans-serif" }}>
                  {data.sourceFileName}
                </span>
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: "#F0FE00", color: "#121212", fontFamily: "system-ui, Inter, sans-serif" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M7 2v8M4 7l3 3 3-3M2 12h10" strokeLinecap="round"/>
            </svg>
            <span className="text-sm font-semibold">Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
