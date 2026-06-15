"use client";

import React, { useState } from "react";

interface ParseFileDialogProps {
  fileName: string;
  fileType: "pdf" | "text";
  onParseAsSingle: () => Promise<void>;
  onParseAsMultiple: () => Promise<void>;
  onSkip: () => void;
}

export function ParseFileDialog({ fileName, fileType, onParseAsSingle, onParseAsMultiple, onSkip }: ParseFileDialogProps) {
  const [loading, setLoading] = useState<"single" | "multiple" | null>(null);

  const handleParseAsSingle = async () => {
    setLoading("single");
    try { await onParseAsSingle(); } finally { setLoading(null); }
  };

  const handleParseAsMultiple = async () => {
    setLoading("multiple");
    try { await onParseAsMultiple(); } finally { setLoading(null); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />
      <div
        className="relative z-10 rounded-2xl shadow-2xl p-6 w-[380px] border border-border"
        style={{ background: "#1a1a1a" }}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-4 mx-auto" style={{ background: "#2a2a2a" }}>
          {fileType === "pdf" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="#FF0000" fillOpacity="0.15"/>
              <path d="M7 17V7H14L17 10V17H7Z" stroke="#FF5555" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M14 7V10H17" stroke="#FF5555" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M9 13H15M9 15H13" stroke="#FF5555" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="#3B82F6" fillOpacity="0.15"/>
              <path d="M7 17V7H17V17H7Z" stroke="#3B82F6" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M9 11H15M9 13H15M9 15H13" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          )}
        </div>

        <h2 className="text-center text-white font-semibold text-base mb-1">Parse into text nodes?</h2>
        <p className="text-center text-muted-foreground text-sm mb-5">
          <span className="text-white/70 font-medium">{fileName}</span> can be extracted into editable text nodes on your canvas.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleParseAsSingle}
            disabled={!!loading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-white/30 hover:bg-white/5 transition-all text-left disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#2a2a2a" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="white" strokeWidth="1.3"/><path d="M4 6H12M4 9H10" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {loading === "single" ? "Parsing…" : "Single text node"}
              </div>
              <div className="text-xs text-muted-foreground">All content in one editable node</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleParseAsMultiple}
            disabled={!!loading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-white/30 hover:bg-white/5 transition-all text-left disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#2a2a2a" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="white" strokeWidth="1.3"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="white" strokeWidth="1.3"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="white" strokeWidth="1.3"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="white" strokeWidth="1.3"/></svg>
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {loading === "multiple" ? "Parsing…" : "Multiple text nodes"}
              </div>
              <div className="text-xs text-muted-foreground">One node per section or page</div>
            </div>
          </button>

          <button
            type="button"
            onClick={onSkip}
            disabled={!!loading}
            className="w-full px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
          >
            Just add as file node
          </button>
        </div>
      </div>
    </div>
  );
}
