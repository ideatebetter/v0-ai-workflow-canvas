"use client";

import React from "react";

interface UploadItem {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
}

interface UploadProgressProps {
  uploads: UploadItem[];
  onDismiss: () => void;
}

export function UploadProgress({ uploads, onDismiss }: UploadProgressProps) {
  if (uploads.length === 0) return null;

  const completedCount = uploads.filter(u => u.status === "complete").length;
  const errorCount = uploads.filter(u => u.status === "error").length;
  const isAllComplete = completedCount + errorCount === uploads.length;
  const hasErrors = errorCount > 0;

  return (
    <div
      className="fixed bottom-6 left-6 w-80 rounded-xl shadow-2xl overflow-hidden z-50"
      style={{
        backgroundColor: "var(--app-card-elevated)",
        border: "1px solid var(--app-canvas-dot)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--app-canvas-dot)" }}
      >
        <div className="flex items-center gap-2">
          {!isAllComplete ? (
            <div className="w-5 h-5 relative">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="var(--app-canvas-dot)" strokeWidth="2" />
                <path
                  d="M10 2C14.4183 2 18 5.58172 18 10"
                  stroke="var(--app-text-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ) : hasErrors ? (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 3L9 9M9 3L3 9" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(34, 197, 94, 0.2)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          <span className="text-sm font-medium text-foreground">
            {!isAllComplete
              ? `Uploading ${uploads.length} file${uploads.length > 1 ? "s" : ""}...`
              : hasErrors
              ? `${completedCount} uploaded, ${errorCount} failed`
              : `${completedCount} file${completedCount > 1 ? "s" : ""} uploaded`}
          </span>
        </div>
        {isAllComplete && (
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="var(--app-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* File List */}
      <div className="max-h-48 overflow-y-auto">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="flex items-center gap-3 px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--app-border-strong)" }}
          >
            {/* File Icon */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--app-border-strong)" }}>
              {upload.status === "complete" ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8L6.5 11.5L13 4.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : upload.status === "error" ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M5 5L11 11M11 5L5 11" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V8L11 10" stroke="var(--app-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8" cy="8" r="5" stroke="var(--app-text-muted)" strokeWidth="1.5" />
                </svg>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{upload.fileName}</p>
              {upload.status === "uploading" && (
                <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--app-canvas-dot)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${upload.progress}%`,
                      backgroundColor: "var(--app-text-primary)",
                    }}
                  />
                </div>
              )}
              {upload.status === "error" && upload.error && (
                <p className="text-xs text-red-400 mt-0.5 truncate">{upload.error}</p>
              )}
            </div>

            {/* Progress Percentage */}
            {upload.status === "uploading" && (
              <span className="text-xs text-gray-500 flex-shrink-0">{upload.progress}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
