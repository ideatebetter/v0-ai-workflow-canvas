"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import type { WorkspaceSettings, MemberRole } from "@/lib/atlas-types";

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  settings: WorkspaceSettings;
  onSettingsChange: (settings: WorkspaceSettings) => void;
}

export function InviteDialog({ open, onClose, settings, onSettingsChange }: InviteDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setRole("viewer");
    setError(null);
    setInviteLink(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const handleInvite = useCallback(async () => {
    if (!email.trim() || !user) return;
    setLoading(true);
    setError(null);
    setInviteLink(null);

    try {
      const workspaceRes = await fetch("/api/workspace");
      const workspaceData = workspaceRes.ok ? await workspaceRes.json() : null;
      const workspaceId = workspaceData?.workspace?.id;
      if (!workspaceId) {
        setError("Could not resolve workspace. Make sure you're signed in and try again.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          email: email.toLowerCase(),
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send invitation");
        return;
      }

      setInviteLink(data.inviteLink);

      onSettingsChange({
        ...settings,
        members: [
          ...settings.members,
          {
            id: `pending-${Date.now()}`,
            name: email.split("@")[0],
            email,
            initials: email.slice(0, 2).toUpperCase(),
            role,
          },
        ],
      });

      setEmail("");
    } catch {
      setError("Failed to send invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, role, user, settings, onSettingsChange]);

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{
          backgroundColor: "#111111",
          border: "1px solid #222222",
          borderRadius: "16px",
          maxWidth: "420px",
          width: "90vw",
        }}
      >
        <div className="p-6">
          {/* Header */}
          <h2
            className="text-white font-semibold text-base mb-1"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            Invite to {settings.name}
          </h2>
          <p
            className="text-xs text-gray-500 mb-5"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            They'll receive a link to join this workspace.
          </p>

          {/* Form */}
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); setInviteLink(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="Email address"
              disabled={loading}
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
            />

            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                disabled={loading}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm text-white focus:outline-none disabled:opacity-50"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                <option value="viewer">Viewer — can view canvases</option>
                <option value="editor">Editor — can edit canvases</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>

            {error && (
              <p className="text-xs px-1" style={{ color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                {error}
              </p>
            )}

            {!user && (
              <p className="text-xs px-1" style={{ color: "#eab308", fontFamily: "system-ui, Inter, sans-serif" }}>
                Sign in to invite team members.
              </p>
            )}

            <button
              type="button"
              onClick={handleInvite}
              disabled={loading || !email.trim() || !user}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ backgroundColor: "#F0FE00", color: "#121212", fontFamily: "system-ui, Inter, sans-serif" }}
            >
              {loading ? "Sending…" : "Send Invite"}
            </button>
          </div>

          {/* Invite link */}
          {inviteLink && (
            <div
              className="mt-4 rounded-xl p-4 space-y-2"
              style={{ backgroundColor: "#0d1a0d", border: "1px solid #1a3a1a" }}
            >
              <p className="text-xs font-medium" style={{ color: "#4ade80", fontFamily: "system-ui, Inter, sans-serif" }}>
                Invite sent! Share this link:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-2 py-1.5 rounded-lg text-xs text-gray-300 focus:outline-none select-all"
                  style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", fontFamily: "monospace" }}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: copied ? "#0a3a1a" : "#1a3a1a",
                    color: copied ? "#4ade80" : "#4ade80",
                    border: "1px solid #1a4a1a",
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
