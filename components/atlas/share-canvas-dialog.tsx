"use client";

import React, { useState, useRef, useEffect } from "react";
import type { Canvas, WorkspaceSettings } from "@/lib/atlas-types";

type AccessType = "anyone_link" | "specific_people" | "private";
type Permission = "view" | "feedback" | "guided_review" | "edit";
type Expiry = "never" | "7d" | "30d" | "90d";

const PERMISSIONS: { value: Permission; label: string; description: string }[] = [
  { value: "view",          label: "Can view only",                  description: "Read-only access" },
  { value: "feedback",      label: "Can leave feedback",             description: "View + comment" },
  { value: "guided_review", label: "Can review with guided steps",   description: "Step-by-step review flow" },
  { value: "edit",          label: "Can edit (requires account)",    description: "Full editing access" },
];

const ACCESS_OPTIONS: { value: AccessType; label: string }[] = [
  { value: "private",        label: "Only invited people" },
  { value: "anyone_link",    label: "Anyone with a link" },
  { value: "specific_people",label: "Specific people only" },
];

const EXPIRY_OPTIONS: { value: Expiry; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "7d",    label: "7 days" },
  { value: "30d",   label: "30 days" },
  { value: "90d",   label: "90 days" },
];

interface ShareCanvasDialogProps {
  open: boolean;
  onClose: () => void;
  canvas: Canvas;
  workspaceSettings: WorkspaceSettings;
  shareTitle?: string;
  shareDescription?: string;
}

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: "var(--app-border-strong)",
  border: "1px solid var(--app-canvas-dot)",
  fontFamily: "system-ui, Inter, sans-serif",
  color: "var(--app-text-primary)",
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "system-ui, Inter, sans-serif",
};

export function ShareCanvasDialog({
  open,
  onClose,
  canvas,
  workspaceSettings,
  shareTitle = "Share Board",
  shareDescription,
}: ShareCanvasDialogProps) {
  const [emailInput, setEmailInput]       = useState("");
  const [accessType, setAccessType]       = useState<AccessType>("private");
  const [permission, setPermission]       = useState<Permission | "">("");
  const [expiry, setExpiry]               = useState<Expiry>("never");
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [linkCopied, setLinkCopied]       = useState(false);
  const [generatedUrl, setGeneratedUrl]   = useState("");
  const [permOpen, setPermOpen]           = useState(false);
  const [accessOpen, setAccessOpen]       = useState(false);
  const [expiryOpen, setExpiryOpen]       = useState(false);
  const permRef   = useRef<HTMLDivElement>(null);
  const accessRef = useRef<HTMLDivElement>(null);
  const expiryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setEmailInput(""); setAccessType("private"); setPermission(""); setExpiry("never");
      setLinkGenerated(false); setLinkCopied(false); setGeneratedUrl("");
      setPermOpen(false); setAccessOpen(false); setExpiryOpen(false);
    }
  }, [open]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (permRef.current   && !permRef.current.contains(e.target as Node))   setPermOpen(false);
      if (accessRef.current && !accessRef.current.contains(e.target as Node)) setAccessOpen(false);
      if (expiryRef.current && !expiryRef.current.contains(e.target as Node)) setExpiryOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  if (!open) return null;

  const currentUser = workspaceSettings.members[0];
  const avatar      = workspaceSettings.branding?.profilePicture || currentUser?.avatar;
  const ownerName   = currentUser?.name || "You";
  const canGenerate = permission !== "";

  const permLabel   = PERMISSIONS.find(p => p.value === permission)?.label ?? "";
  const accessLabel = ACCESS_OPTIONS.find(a => a.value === accessType)?.label ?? "";
  const expiryLabel = EXPIRY_OPTIONS.find(e => e.value === expiry)?.label ?? "Never";

  function handleGenerateLink() {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const url  = `${base}/canvas/${canvas.id}?access=${permission}&exp=${expiry}`;
    setGeneratedUrl(url);
    setLinkGenerated(true);
  }

  function handleCopyLink() {
    const url = generatedUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/canvas/${canvas.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const ChevronDown = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
      <path d="M2 4L6 8L10 4" stroke="var(--app-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const DropdownMenu = ({
    children, style,
  }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div
      className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 py-1"
      style={{
        backgroundColor: "var(--app-border-strong)",
        border: "1px solid var(--app-canvas-dot)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        ...style,
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--app-card-elevated)",
          border: "1px solid var(--app-canvas-dot)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5 flex items-start justify-between flex-shrink-0" style={{ borderBottom: "1px solid var(--app-border-strong)" }}>
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-semibold text-foreground" style={LABEL_STYLE}>
              {shareTitle}
            </h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed" style={LABEL_STYLE}>
              {shareDescription ??
                <>Generate a public link to share &lsquo;{canvas.name}&rsquo;. Anyone with the link can access it based on the permissions you set.</>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 1.5L11.5 11.5M11.5 1.5L1.5 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">

          {/* Email input */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide" style={LABEL_STYLE}>
              Invite by email
            </label>
            <input
              type="text"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="example@email.com, example2@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40"
              style={INPUT_STYLE}
            />
          </div>

          {/* Access type + Permission row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Access Type */}
            <div ref={accessRef}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide" style={LABEL_STYLE}>
                Access Type
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setAccessOpen(v => !v); setPermOpen(false); setExpiryOpen(false); }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40"
                  style={INPUT_STYLE}
                >
                  <span className="truncate text-gray-300" style={LABEL_STYLE}>{accessLabel}</span>
                  <ChevronDown />
                </button>
                {accessOpen && (
                  <DropdownMenu>
                    {ACCESS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setAccessType(opt.value); setAccessOpen(false); }}
                        className="w-full px-3.5 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                        style={LABEL_STYLE}
                      >
                        {accessType === opt.value && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="var(--app-text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        <span className={`${accessType === opt.value ? "text-foreground" : "text-gray-400"} ${accessType === opt.value ? "" : "ml-4"}`}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Permission */}
            <div ref={permRef}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide" style={LABEL_STYLE}>
                Permission
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setPermOpen(v => !v); setAccessOpen(false); setExpiryOpen(false); }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40"
                  style={INPUT_STYLE}
                >
                  <span className={`truncate ${permission ? "text-gray-300" : "text-gray-600"}`} style={LABEL_STYLE}>
                    {permLabel || "Select a permission"}
                  </span>
                  <ChevronDown />
                </button>
                {permOpen && (
                  <DropdownMenu>
                    {PERMISSIONS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => { setPermission(p.value); setPermOpen(false); }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-white/5 transition-colors flex items-start gap-2"
                        style={LABEL_STYLE}
                      >
                        <div className="w-4 flex-shrink-0 pt-0.5">
                          {permission === p.value && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="var(--app-text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className={`text-sm ${permission === p.value ? "text-foreground" : "text-gray-300"}`}>{p.label}</div>
                          <div className="text-[11px] text-gray-600 mt-0.5">{p.description}</div>
                        </div>
                      </button>
                    ))}
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Who has access */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide" style={LABEL_STYLE}>
              Who has access
            </p>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-medium"
                style={{ backgroundColor: "var(--app-canvas-dot)", color: "var(--app-text-primary)" }}
              >
                {avatar ? (
                  <img src={avatar} alt={ownerName} className="w-full h-full object-cover" />
                ) : (
                  <span style={LABEL_STYLE}>{currentUser?.initials || ownerName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <div className="text-sm text-foreground" style={LABEL_STYLE}>{ownerName}</div>
                <div className="text-xs text-gray-500" style={LABEL_STYLE}>Owner</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="2.5" y="6" width="8" height="5.5" rx="1" stroke="var(--app-text-faint)" strokeWidth="1.2"/>
                <path d="M4.5 6V4.5C4.5 3.4 5.4 2.5 6.5 2.5C7.6 2.5 8.5 3.4 8.5 4.5V6" stroke="var(--app-text-faint)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span className="text-xs text-gray-600" style={LABEL_STYLE}>Only you have access</span>
            </div>
          </div>

          {/* Link expires */}
          <div ref={expiryRef}>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide" style={LABEL_STYLE}>
              Link expires
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setExpiryOpen(v => !v); setPermOpen(false); setAccessOpen(false); }}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/40"
                style={INPUT_STYLE}
              >
                <span className="text-gray-300" style={LABEL_STYLE}>{expiryLabel}</span>
                <ChevronDown />
              </button>
              {expiryOpen && (
                <DropdownMenu>
                  {EXPIRY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setExpiry(opt.value); setExpiryOpen(false); }}
                      className="w-full px-3.5 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                      style={LABEL_STYLE}
                    >
                      {expiry === opt.value && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="var(--app-text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      <span className={`${expiry === opt.value ? "text-foreground" : "text-gray-400"} ${expiry === opt.value ? "" : "ml-4"}`}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Generated link */}
          {linkGenerated && generatedUrl && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ backgroundColor: "var(--app-border-strong)", border: "1px solid var(--app-canvas-dot)" }}
            >
              <span className="text-xs text-gray-500 flex-1 truncate" style={LABEL_STYLE}>{generatedUrl}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: linkCopied ? "rgba(240,254,0,0.15)" : "var(--app-canvas-dot)",
                  color: linkCopied ? "var(--app-text-primary)" : "var(--app-text-primary)",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                {linkCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex-shrink-0 space-y-2">
          <div
            className={`flex rounded-xl overflow-hidden transition-opacity ${canGenerate ? "" : "opacity-40"}`}
            style={{ backgroundColor: "var(--app-text-primary)" }}
          >
            <button
              type="button"
              onClick={canGenerate ? handleGenerateLink : undefined}
              disabled={!canGenerate}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors"
              style={{ color: "var(--app-bg)", fontFamily: "system-ui, Inter, sans-serif" }}
            >
              {linkGenerated ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M2 7.5L5.5 11L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Link Generated
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M6 9L4 11C3.2 11.8 1.8 11.8 1 11C0.2 10.2 0.2 8.8 1 8L4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M9 6L11 4C11.8 3.2 13.2 3.2 14 4C14.8 4.8 14.8 6.2 14 7L11 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M5.5 9.5L9.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Generate Public Link
                </>
              )}
            </button>
            {linkGenerated && (
              <>
                <div style={{ width: "1px", backgroundColor: "rgba(0,0,0,0.12)" }} />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 flex items-center justify-center transition-opacity hover:opacity-70"
                  title="Copy link"
                >
                  {linkCopied ? (
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M2 7.5L5.5 11L13 4" stroke="var(--app-bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <rect x="1.5" y="4.5" width="8" height="9" rx="1.5" stroke="var(--app-bg)" strokeWidth="1.3"/>
                      <path d="M5.5 4.5V3C5.5 2.17 6.17 1.5 7 1.5H12C12.83 1.5 13.5 2.17 13.5 3V9C13.5 9.83 12.83 10.5 12 10.5H10.5" stroke="var(--app-bg)" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
          {!canGenerate && (
            <p className="text-[11px] text-gray-600 text-center" style={LABEL_STYLE}>
              Select a permission to generate a link
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
