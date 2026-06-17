"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import type { WorkspaceSettings, MemberRole, ProductConfig, NamingToken, NamingConventions, NamingRule } from "@/lib/atlas-types";
import { DEFAULT_NAMING_CONVENTIONS } from "@/lib/atlas-types";

// Admin emails that can create users
const ADMIN_EMAILS = ["rahmi@ideatebetter.com"];

const NAMING_TOKENS: { id: NamingToken; label: string; example: string }[] = [
  { id: "project", label: "Project Name", example: "atlas" },
  { id: "product", label: "Product", example: "atlas" },
  { id: "type", label: "File Type", example: "logo" },
  { id: "version", label: "Version", example: "v1" },
  { id: "date", label: "Date", example: "2026-05-13" },
  { id: "author", label: "Author Initials", example: "AC" },
  { id: "status", label: "Status", example: "draft" },
  { id: "custom", label: "Custom Text", example: "custom" },
];

const SEPARATORS = [
  { value: "_", label: "Underscore (_)" },
  { value: "-", label: "Hyphen (-)" },
  { value: ".", label: "Period (.)" },
  { value: " ", label: "Space ( )" },
];

const CASE_STYLES = [
  { value: "lowercase", label: "lowercase" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "titlecase", label: "Title Case" },
  { value: "kebab-case", label: "kebab-case" },
  { value: "snake_case", label: "snake_case" },
];

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-05-13)" },
  { value: "YYYYMMDD", label: "YYYYMMDD (20260513)" },
  { value: "MM-DD-YYYY", label: "MM-DD-YYYY (05-13-2026)" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY (13-05-2026)" },
];

interface WorkspaceSettingsProps {
  open: boolean;
  onClose: () => void;
  settings: WorkspaceSettings;
  onSettingsChange: (settings: WorkspaceSettings) => void;
  onMakeFramework?: () => void;
  onDeleteWorkspace?: () => void;
  canDeleteWorkspace?: boolean; // false when it's the only workspace
}

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

interface RealMember {
  id: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  email: string;
  name: string;
  initials: string;
  isOwner: boolean;
}

export function WorkspaceSettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
  onMakeFramework,
  onDeleteWorkspace,
  canDeleteWorkspace = true,
}: WorkspaceSettingsProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const { user } = useAuth();

  // Real Supabase members state
  const [supabaseWorkspaceId, setSupabaseWorkspaceId] = useState<string | null>(null);
  const [realMembers, setRealMembers] = useState<RealMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [transferConfirmUserId, setTransferConfirmUserId] = useState<string | null>(null);

  // Admin: Create user state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<{ email: string; tempPassword: string } | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; email: string; name: string; createdAt: string; lastSignIn: string | null }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || "");

  // Derive permission from real Supabase members when loaded, fall back to localStorage
  const currentRealMember = realMembers.find(m => m.userId === user?.id);
  const currentLocalMember = settings.members.find(m => m.id === user?.id || m.email === user?.email);
  const effectiveRole = currentRealMember?.role ?? currentLocalMember?.role;
  const isCurrentUserOwner = currentRealMember?.isOwner ?? (currentLocalMember?.role === "owner");
  const isAdminOrOwner = effectiveRole === "owner" || effectiveRole === "admin" || !!isAdmin;

  // Figma sync token
  const [figmaToken, setFigmaToken] = useState<string | null>(null);
  const [figmaTokenCopied, setFigmaTokenCopied] = useState(false);
  const [figmaTokenError, setFigmaTokenError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFigmaToken(null);
    setFigmaTokenError(false);
    fetch("/api/figma/token")
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => { if (d.token) setFigmaToken(d.token); else throw new Error("no token"); })
      .catch(() => setFigmaTokenError(true));
  }, [open]);

  // Load real Supabase members whenever the dialog opens
  const loadRealMembers = useCallback(async (wsId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/workspace/members?workspaceId=${wsId}`);
      if (res.ok) {
        const data = await res.json();
        setRealMembers(data.members ?? []);
      }
    } catch {
      // silently fall back to localStorage members
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    setMemberActionError(null);
    setTransferConfirmUserId(null);
    const wsId = settings.id;
    if (wsId && wsId !== "ws-1") {
      setSupabaseWorkspaceId(wsId);
      loadRealMembers(wsId);
    }
  }, [open, user, settings.id, loadRealMembers]);

  function copyFigmaToken() {
    if (!figmaToken) return;
    navigator.clipboard.writeText(figmaToken).then(() => {
      setFigmaTokenCopied(true);
      setTimeout(() => setFigmaTokenCopied(false), 2000);
    });
  }

  // Fetch all users for admin
  useEffect(() => {
    if (open && isAdmin) {
      setLoadingUsers(true);
      fetch("/api/admin/users")
        .then(res => res.json())
        .then(data => {
          if (data.users) {
            setAllUsers(data.users);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingUsers(false));
    }
  }, [open, isAdmin]);

  const handleCreateUser = useCallback(async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !isAdmin) return;

    setCreateUserLoading(true);
    setCreateUserError(null);
    setCreateUserSuccess(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateUserError(data.error || "Failed to create user");
        return;
      }

      setCreateUserSuccess({
        email: data.user.email,
        tempPassword: data.tempPassword,
      });
      setNewUserName("");
      setNewUserEmail("");

      // Refresh user list
      const usersRes = await fetch("/api/admin/users");
      const usersData = await usersRes.json();
      if (usersData.users) {
        setAllUsers(usersData.users);
      }
    } catch {
      setCreateUserError("Failed to create user. Please try again.");
    } finally {
      setCreateUserLoading(false);
    }
  }, [newUserName, newUserEmail, isAdmin]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !user) return;

    setInviteLoading(true);
    setInviteError(null);
    setInviteLink(null);

    try {
      const wsId = settings.id && settings.id !== "ws-1" ? settings.id : supabaseWorkspaceId;
      if (!wsId) {
        setInviteError("Could not resolve workspace. Make sure you're signed in and try again.");
        return;
      }

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: wsId, email: inviteEmail.toLowerCase(), role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to send invitation");
        return;
      }

      setInviteLink(data.inviteLink);
      setInviteEmail("");
    } catch {
      setInviteError("Failed to send invitation. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }, [inviteEmail, inviteRole, user, supabaseWorkspaceId]);

  const handleRoleChange = useCallback(async (userId: string, role: MemberRole) => {
    setMemberActionError(null);
    if (!supabaseWorkspaceId) return;

    // Optimistic update
    setRealMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m));

    const res = await fetch("/api/workspace/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: supabaseWorkspaceId, userId, role }),
    });

    if (!res.ok) {
      const data = await res.json();
      setMemberActionError(data.error || "Failed to update role");
      // Revert optimistic update
      if (supabaseWorkspaceId) loadRealMembers(supabaseWorkspaceId);
    }
  }, [supabaseWorkspaceId, loadRealMembers]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    setMemberActionError(null);
    if (!supabaseWorkspaceId) return;

    // Optimistic update
    setRealMembers(prev => prev.filter(m => m.userId !== userId));

    const res = await fetch(
      `/api/workspace/members?workspaceId=${supabaseWorkspaceId}&userId=${userId}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      const data = await res.json();
      setMemberActionError(data.error || "Failed to remove member");
      // Revert
      if (supabaseWorkspaceId) loadRealMembers(supabaseWorkspaceId);
    }
  }, [supabaseWorkspaceId, loadRealMembers]);

  const handleTransferOwnership = useCallback(async (userId: string) => {
    setMemberActionError(null);
    setTransferConfirmUserId(null);
    if (!supabaseWorkspaceId) return;

    const res = await fetch("/api/workspace/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: supabaseWorkspaceId, userId, action: "transfer-ownership" }),
    });

    if (!res.ok) {
      const data = await res.json();
      setMemberActionError(data.error || "Failed to transfer ownership");
    } else {
      // Reload to reflect new ownership
      loadRealMembers(supabaseWorkspaceId);
    }
  }, [supabaseWorkspaceId, loadRealMembers]);

  const handleProductToggle = (productId: string) => {
    onSettingsChange({
      ...settings,
      products: settings.products.map((p) =>
        p.id === productId ? { ...p, enabled: !p.enabled } : p
      ),
    });
  };

  const handlePreferenceChange = <K extends keyof WorkspaceSettings["preferences"]>(
    key: K,
    value: WorkspaceSettings["preferences"][K]
  ) => {
    onSettingsChange({
      ...settings,
      preferences: { ...settings.preferences, [key]: value },
    });
  };

  const namingConventions = settings.namingConventions || DEFAULT_NAMING_CONVENTIONS;

  const handleNamingChange = (updates: Partial<NamingConventions>) => {
    onSettingsChange({
      ...settings,
      namingConventions: { ...namingConventions, ...updates },
    });
  };

  const handleDefaultRuleChange = (updates: Partial<NamingRule>) => {
    onSettingsChange({
      ...settings,
      namingConventions: {
        ...namingConventions,
        defaultRule: { ...namingConventions.defaultRule, ...updates },
      },
    });
  };

  const addToken = (token: NamingToken) => {
    const currentTokens = namingConventions.defaultRule.tokens;
    if (!currentTokens.includes(token) || token === "custom") {
      handleDefaultRuleChange({ tokens: [...currentTokens, token] });
    }
  };

  const removeToken = (index: number) => {
    const currentTokens = [...namingConventions.defaultRule.tokens];
    currentTokens.splice(index, 1);
    handleDefaultRuleChange({ tokens: currentTokens });
  };

  const generateExample = (): string => {
    const { tokens, separator, caseStyle } = namingConventions.defaultRule;
    const parts = tokens.map((token) => {
      const tokenDef = NAMING_TOKENS.find((t) => t.id === token);
      return tokenDef?.example || token;
    });
    let result = parts.join(separator);
    
    switch (caseStyle) {
      case "lowercase":
        return result.toLowerCase();
      case "uppercase":
        return result.toUpperCase();
      case "titlecase":
        return result.split(separator).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(separator);
      case "kebab-case":
        return result.toLowerCase().replace(new RegExp(`\\${separator}`, 'g'), '-');
      case "snake_case":
        return result.toLowerCase().replace(new RegExp(`\\${separator}`, 'g'), '_');
      default:
        return result;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{
          backgroundColor: "#111111",
          border: "1px solid #222222",
          borderRadius: "16px",
          maxWidth: "720px",
          width: "90vw",
          maxHeight: "85vh",
        }}
        onCloseAutoFocus={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
      >
        <div className="flex flex-col h-[600px]">
          {/* Header */}
          <div
            className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid #222222" }}
          >
            <h2
              className="text-white font-semibold text-lg"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              Settings
            </h2>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-8">

            {/* Figma Sync */}
            <div>
              <h3
                className="text-white font-semibold text-base mb-4 flex items-center gap-2"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-400">
                  <path d="M6 1.5H4.5C3.4 1.5 2.5 2.4 2.5 3.5C2.5 4.6 3.4 5.5 4.5 5.5H6V1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 5.5H7.5C8.6 5.5 9.5 4.6 9.5 3.5C9.5 2.4 8.6 1.5 7.5 1.5H6V5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 5.5H4.5C3.4 5.5 2.5 6.4 2.5 7.5C2.5 8.6 3.4 9.5 4.5 9.5C5.6 9.5 6 8.6 6 7.5V5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 9.5V7.5C6 8.6 6.9 9.5 8 9.5C9.1 9.5 10 8.6 10 7.5C10 6.4 9.1 5.5 8 5.5H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 9.5C9.1 9.5 10 10.4 10 11.5C10 12.6 9.1 13.5 8 13.5C6.9 13.5 6 12.6 6 11.5V9.5H8Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Figma Sync
              </h3>
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: "#161616", border: "1px solid #2a2a2a" }}
              >
                <p className="text-xs text-gray-500 mb-3" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Copy this token and paste it into the <strong className="text-gray-400">Sync with Ideate</strong> Figma plugin to enable live frame syncing.
                </p>
                {figmaTokenError ? (
                  <p className="text-xs text-red-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Failed to load token — make sure you&apos;re signed in.
                  </p>
                ) : figmaToken ? (
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 text-xs px-3 py-2 rounded-lg select-all overflow-hidden"
                      style={{
                        background: "#0d0d0d",
                        color: "#60a5fa",
                        fontFamily: "monospace",
                        border: "1px solid #2a2a2a",
                        wordBreak: "break-all",
                        display: "block",
                        lineHeight: 1.6,
                      }}
                    >
                      {figmaToken}
                    </code>
                    <button
                      type="button"
                      onClick={copyFigmaToken}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all"
                      style={{
                        background: figmaTokenCopied ? "#0a3a1a" : "#F0FE00",
                        color: figmaTokenCopied ? "#4ade80" : "#000",
                        border: "none",
                        minWidth: 64,
                      }}
                    >
                      {figmaTokenCopied ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 4V3C4 2.4 4.4 2 5 2H9C9.6 2 10 2.4 10 3V7C10 7.6 9.6 8 9 8H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-600 animate-pulse" />
                    <span className="text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Loading token…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Workspace Details Section */}
            <div>
              <h3
                className="text-white font-semibold text-base mb-4 flex items-center gap-2"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-400">
                  <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Workspace Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs text-gray-500 mb-1.5"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                    style={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333333",
                      fontFamily: "system-ui, Inter, sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs text-gray-500 mb-1.5"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Workspace ID
                  </label>
                  <div
                    className="px-3 py-2 rounded-lg text-sm text-gray-500"
                    style={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333333",
                      fontFamily: "monospace",
                    }}
                  >
                    {settings.id}
                  </div>
                </div>
                <div className="col-span-2">
                  <label
                    className="block text-xs text-gray-500 mb-1.5"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Description
                  </label>
                  <textarea
                    value={settings.description || ""}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, description: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                    style={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333333",
                      fontFamily: "system-ui, Inter, sans-serif",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #222222" }} />

            {/* Team Members Section */}
            <div>
              <h3
                className="text-white font-semibold text-base mb-4 flex items-center gap-2"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-400">
                  <path d="M12.75 15.75V14.25C12.75 13.4544 12.4339 12.6913 11.8713 12.1287C11.3087 11.5661 10.5456 11.25 9.75 11.25H3.75C2.95435 11.25 2.19129 11.5661 1.62868 12.1287C1.06607 12.6913 0.75 13.4544 0.75 14.25V15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.75 8.25C8.40685 8.25 9.75 6.90685 9.75 5.25C9.75 3.59315 8.40685 2.25 6.75 2.25C5.09315 2.25 3.75 3.59315 3.75 5.25C3.75 6.90685 5.09315 8.25 6.75 8.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Team Members
                {membersLoading && (
                  <span className="text-xs text-gray-600 font-normal" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Loading…</span>
                )}
              </h3>

              {memberActionError && (
                <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                  {memberActionError}
                </div>
              )}

              {/* Member List — uses real Supabase data when loaded */}
              <div className="space-y-1 mb-5">
                {(realMembers.length > 0 ? realMembers : settings.members.map(m => ({
                  id: m.id,
                  userId: m.id,
                  role: m.role as MemberRole,
                  joinedAt: "",
                  email: m.email ?? "",
                  name: m.name,
                  initials: m.initials,
                  isOwner: m.role === "owner",
                }))).map((member) => {
                  const isCurrentUser = member.userId === user?.id || member.email === user?.email;
                  const canChangeRole = isAdminOrOwner && !member.isOwner && !isCurrentUser;
                  const canRemove = isAdminOrOwner && !member.isOwner && !isCurrentUser;
                  const canTransfer = isCurrentUserOwner && !member.isOwner && !isCurrentUser;
                  const confirmingTransfer = transferConfirmUserId === member.userId;

                  return (
                    <div key={member.userId} className="space-y-0">
                      <div
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                        style={{ backgroundColor: "#1a1a1a" }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white"
                          style={{ backgroundColor: "#333333" }}
                        >
                          {member.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-white font-medium truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                              {member.name}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "#2a2a2a", color: "#888", fontFamily: "system-ui, Inter, sans-serif" }}>
                                You
                              </span>
                            )}
                          </div>
                          {member.email && (
                            <div className="text-xs text-gray-500 truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                              {member.email}
                            </div>
                          )}
                        </div>

                        {/* Role selector or label */}
                        {canChangeRole ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.userId, e.target.value as MemberRole)}
                            className="text-xs rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                            style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a", fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="text-xs text-gray-500 px-2 flex-shrink-0" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                            {ROLE_LABELS[member.role] ?? member.role}
                          </span>
                        )}

                        {/* Transfer ownership button */}
                        {canTransfer && (
                          <button
                            type="button"
                            onClick={() => setTransferConfirmUserId(confirmingTransfer ? null : member.userId)}
                            title="Transfer ownership"
                            className="flex-shrink-0 p-1.5 rounded transition-colors"
                            style={{ color: confirmingTransfer ? "#F0FE00" : "#555", backgroundColor: confirmingTransfer ? "#F0FE0015" : "transparent" }}
                          >
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                              <path d="M7 1L10 4M10 4L7 7M10 4H4C2.9 4 2 4.9 2 6V13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}

                        {/* Remove member button */}
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.userId)}
                            className="flex-shrink-0 p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Remove member"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                        {!canRemove && !canTransfer && <div className="w-[28px] flex-shrink-0" />}
                      </div>

                      {/* Transfer ownership confirmation inline */}
                      {confirmingTransfer && (
                        <div className="mx-1 mb-1 px-3 py-2.5 rounded-lg flex items-center justify-between gap-3" style={{ backgroundColor: "#1a1500", border: "1px solid #3a3000" }}>
                          <p className="text-xs" style={{ color: "#F0FE00", fontFamily: "system-ui, Inter, sans-serif" }}>
                            Transfer ownership to <strong>{member.name}</strong>? You'll become an Admin.
                          </p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setTransferConfirmUserId(null)}
                              className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                              style={{ backgroundColor: "#2a2a2a", color: "#aaa", fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTransferOwnership(member.userId)}
                              className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors"
                              style={{ backgroundColor: "#F0FE00", color: "#111", fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Invite New Member */}
              <div className="pt-4" style={{ borderTop: "1px solid #222222" }}>
                <p className="text-xs text-gray-500 mb-3" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Invite someone new
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); setInviteLink(null); }}
                    placeholder="Email address"
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    disabled={inviteLoading}
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                    disabled={inviteLoading}
                    className="px-3 py-2 rounded-lg text-sm text-white focus:outline-none disabled:opacity-50"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={inviteLoading || !inviteEmail.trim() || !user}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#F0FE00", color: "#121212", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    {inviteLoading ? "..." : "Invite"}
                  </button>
                </div>
                {!user && (
                  <p className="text-xs mt-2" style={{ color: "#eab308", fontFamily: "system-ui, Inter, sans-serif" }}>
                    Sign in to invite team members
                  </p>
                )}
                {inviteError && (
                  <div className="p-2 rounded-lg text-xs mt-2" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                    {inviteError}
                  </div>
                )}
                {inviteLink && (
                  <div className="p-2 rounded-lg mt-2" style={{ backgroundColor: "rgba(240, 254, 0, 0.05)", border: "1px solid rgba(240, 254, 0, 0.2)" }}>
                    <p className="text-xs text-gray-400 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Share this invite link:</p>
                    <div className="flex items-center gap-2">
                      <input type="text" value={inviteLink} readOnly className="flex-1 px-2 py-1 rounded text-xs text-gray-300 focus:outline-none" style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "monospace" }} />
                      <button type="button" onClick={() => navigator.clipboard.writeText(inviteLink)} className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: "#2a2a2a", color: "#F0FE00" }}>Copy</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #222222" }} />

            {/* Preferences Section */}
            <div>
              <h3
                className="text-white font-semibold text-base mb-4 flex items-center gap-2"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-400">
                  <path d="M3 4.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 9H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 13.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Preferences
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Default Product
                  </label>
                  <select
                    value={settings.preferences.defaultProduct}
                    onChange={(e) => handlePreferenceChange("defaultProduct", e.target.value as ProductConfig["id"])}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    {settings.products.filter(p => p.enabled).map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Default Status
                  </label>
                  <select
                    value={settings.preferences.defaultStatus}
                    onChange={(e) => handlePreferenceChange("defaultStatus", e.target.value as "draft" | "in-review" | "approved")}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <option value="draft">Draft</option>
                    <option value="in-review">In Review</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                  <div className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Auto-save</div>
                  <Switch checked={settings.preferences.autoSave} onCheckedChange={(checked) => handlePreferenceChange("autoSave", checked)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                  <div className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Show Grid</div>
                  <Switch checked={settings.preferences.showGrid} onCheckedChange={(checked) => handlePreferenceChange("showGrid", checked)} />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #222222" }} />

            {/* Naming Conventions Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-white font-semibold text-base flex items-center gap-2"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-400">
                    <path d="M2.25 4.5H15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.25 9H11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.25 13.5H8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Naming Conventions
                </h3>
                <Switch
                  checked={namingConventions.enabled}
                  onCheckedChange={(checked) => handleNamingChange({ enabled: checked })}
                />
              </div>

              <div className="space-y-4">
                {/* Token Builder - Compact */}
                <div
                  className="p-3 rounded-lg min-h-[40px] flex flex-wrap gap-2 items-center"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
                >
                  {namingConventions.defaultRule.tokens.map((token, index) => (
                    <div key={`${token}-${index}`} className="flex items-center">
                      {index > 0 && (
                        <span className="text-gray-500 mx-1 text-sm">{namingConventions.defaultRule.separator}</span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: "#F0FE00", color: "#121212", fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        {NAMING_TOKENS.find((t) => t.id === token)?.label || token}
                        <button type="button" onClick={() => removeToken(index)} className="hover:opacity-70">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </span>
                    </div>
                  ))}
                  {namingConventions.defaultRule.tokens.length === 0 && (
                    <span className="text-gray-500 text-xs">Add tokens to build your naming pattern</span>
                  )}
                </div>

                {/* Add Token - Inline */}
                <div className="flex flex-wrap gap-1.5">
                  {NAMING_TOKENS.map((token) => (
                    <button
                      key={token.id}
                      type="button"
                      onClick={() => addToken(token.id)}
                      className="px-2 py-1 rounded text-xs transition-colors hover:bg-white/10"
                      style={{ backgroundColor: "#2a2a2a", color: "#ffffff", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      + {token.label}
                    </button>
                  ))}
                </div>

                {/* Options Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Separator</label>
                    <select
                      value={namingConventions.defaultRule.separator}
                      onChange={(e) => handleDefaultRuleChange({ separator: e.target.value })}
                      className="w-full px-2 py-1.5 rounded text-sm text-white focus:outline-none"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      {SEPARATORS.map((sep) => (
                        <option key={sep.value} value={sep.value}>{sep.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Case Style</label>
                    <select
                      value={namingConventions.defaultRule.caseStyle}
                      onChange={(e) => handleDefaultRuleChange({ caseStyle: e.target.value as "lowercase" | "uppercase" | "titlecase" | "kebab-case" | "snake_case" })}
                      className="w-full px-2 py-1.5 rounded text-sm text-white focus:outline-none"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      {CASE_STYLES.map((style) => (
                        <option key={style.value} value={style.value}>{style.label}</option>
                      ))}
                    </select>
                  </div>
                  {namingConventions.defaultRule.tokens.includes("date") && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Date Format</label>
                      <select
                        value={namingConventions.defaultRule.dateFormat}
                        onChange={(e) => handleDefaultRuleChange({ dateFormat: e.target.value as "YYYY-MM-DD" | "YYYYMMDD" | "MM-DD-YYYY" | "DD-MM-YYYY" })}
                        className="w-full px-2 py-1.5 rounded text-sm text-white focus:outline-none"
                        style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        {DATE_FORMATS.map((format) => (
                          <option key={format.value} value={format.value}>{format.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="p-3 rounded-lg" style={{ backgroundColor: "#0a0a0a", border: "1px solid #222222" }}>
                  <span className="text-xs text-gray-500 mr-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Preview:</span>
                  <span className="text-sm text-white font-mono">{generateExample() || "filename"}<span className="text-gray-500">.fig</span></span>
                </div>
              </div>
            </div>

            {/* Canvas Actions - At the end */}
            {isAdmin && (
              <>
                <div style={{ borderTop: "1px solid #222222" }} />
                <div>
                  <h3
                    className="text-white font-semibold text-base mb-4 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-400">
                      <path d="M14.25 15.75V14.25C14.25 13.0074 13.2426 12 12 12H6C4.75736 12 3.75 13.0074 3.75 14.25V15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 9C10.6569 9 12 7.65685 12 6C12 4.34315 10.6569 3 9 3C7.34315 3 6 4.34315 6 6C6 7.65685 7.34315 9 9 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15.75 6.75L15.75 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17.625 8.625H13.875" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Admin: Add User
                  </h3>
                  
                  {/* Create User Form */}
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => {
                          setNewUserName(e.target.value);
                          setCreateUserError(null);
                          setCreateUserSuccess(null);
                        }}
                        placeholder="Full Name"
                        disabled={createUserLoading}
                        className="px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/50 disabled:opacity-50"
                        style={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333333",
                          fontFamily: "system-ui, Inter, sans-serif",
                        }}
                      />
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => {
                          setNewUserEmail(e.target.value);
                          setCreateUserError(null);
                          setCreateUserSuccess(null);
                        }}
                        placeholder="Email address"
                        disabled={createUserLoading}
                        className="px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#F0FE00]/50 disabled:opacity-50"
                        style={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333333",
                          fontFamily: "system-ui, Inter, sans-serif",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateUser}
                      disabled={createUserLoading || !newUserName.trim() || !newUserEmail.trim()}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: "#F0FE00",
                        color: "#121212",
                        fontFamily: "system-ui, Inter, sans-serif",
                      }}
                    >
                      {createUserLoading ? "Creating User..." : "Create User & Send Credentials"}
                    </button>
                  </div>

                  {createUserError && (
                    <div className="p-3 rounded-lg text-sm mb-3" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                      {createUserError}
                    </div>
                  )}

                  {createUserSuccess && (
                    <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                      <div className="text-sm text-green-400 font-medium mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        User created successfully!
                      </div>
                      <div className="space-y-1 text-xs text-gray-300" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        <div><span className="text-gray-500">Email:</span> {createUserSuccess.email}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Temp Password:</span>
                          <code className="px-2 py-0.5 rounded bg-black/50 font-mono">{createUserSuccess.tempPassword}</code>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(createUserSuccess.tempPassword)}
                            className="px-2 py-0.5 rounded text-xs hover:bg-white/10 transition-colors"
                            style={{ color: "#F0FE00" }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        Share this password with the user. They can change it in Settings after logging in.
                      </div>
                    </div>
                  )}

                  {/* User List */}
                  <div className="mt-4">
                    <div className="text-xs text-gray-500 mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      All Users ({allUsers.length})
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {loadingUsers ? (
                        <div className="text-xs text-gray-500 py-2">Loading users...</div>
                      ) : allUsers.length === 0 ? (
                        <div className="text-xs text-gray-500 py-2">No users found</div>
                      ) : (
                        allUsers.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg"
                            style={{ backgroundColor: "#1a1a1a" }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                                style={{ backgroundColor: "#333333" }}
                              >
                                {u.name?.slice(0, 2).toUpperCase() || u.email?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                  {u.name}
                                </div>
                                <div className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                  {u.email}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                              {u.lastSignIn ? `Last login: ${new Date(u.lastSignIn).toLocaleDateString()}` : "Never logged in"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Canvas Actions */}
            {onMakeFramework && (
              <>
                <div style={{ borderTop: "1px solid #222222" }} />
                <div>
                  <h3
                    className="text-white font-semibold text-base mb-4 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Canvas Actions
                  </h3>
                  <button
                  type="button"
                    onClick={onMakeFramework}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-white/5 text-left"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#F0FE0015" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <rect x="3" y="3" width="14" height="14" rx="2" stroke="#F0FE00" strokeWidth="1.5"/>
                        <path d="M7 10H13M10 7V13" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Make Framework</div>
                      <div className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Save this canvas as a reusable framework</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-500">
                      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </>
            )}

            {/* Danger Zone — admins/owners only */}
            {isAdminOrOwner && onDeleteWorkspace && (
              <>
                <div style={{ borderTop: "1px solid #2a1515" }} />
                <div>
                  <h3
                    className="font-semibold text-base mb-4 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif", color: "#ef4444" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2L14 13H2L8 2Z" stroke="#ef4444" strokeWidth="1.3" strokeLinejoin="round"/>
                      <path d="M8 6V9" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round"/>
                      <circle cx="8" cy="11" r="0.6" fill="#ef4444"/>
                    </svg>
                    Danger Zone
                  </h3>

                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canDeleteWorkspace) return;
                        setShowDeleteConfirm(true);
                        setDeleteConfirmText("");
                      }}
                      disabled={!canDeleteWorkspace}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left w-full"
                      style={{
                        backgroundColor: "#1a0d0d",
                        border: "1px solid #3a1a1a",
                        opacity: canDeleteWorkspace ? 1 : 0.4,
                        cursor: canDeleteWorkspace ? "pointer" : "not-allowed",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "#ef444415" }}
                      >
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                          <path d="M5 6H15L14 17H6L5 6Z" stroke="#ef4444" strokeWidth="1.4" strokeLinejoin="round"/>
                          <path d="M3 6H17" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round"/>
                          <path d="M8 3H12" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round"/>
                          <path d="M8 10V14M12 10V14" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                          Delete Workspace
                        </div>
                        <div className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                          {canDeleteWorkspace
                            ? "Permanently delete this workspace and all its canvases"
                            : "Cannot delete — this is your only workspace"}
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div
                      className="rounded-xl p-4 space-y-3"
                      style={{ backgroundColor: "#1a0d0d", border: "1px solid #3a1a1a" }}
                    >
                      <p className="text-sm font-medium" style={{ color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                        This will permanently delete <span className="font-bold">{settings.name}</span> and all its canvases. This cannot be undone.
                      </p>
                      <p className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        Type <span className="font-mono font-semibold text-white">delete {settings.name}</span> to confirm
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        placeholder={`delete ${settings.name}`}
                        autoFocus
                        className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
                        style={{
                          backgroundColor: "#0d0d0d",
                          border: `1px solid ${deleteConfirmText === `delete ${settings.name}` ? "#ef4444" : "#2a2a2a"}`,
                          fontFamily: "system-ui, Inter, sans-serif",
                        }}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: "#1e1e1e",
                            border: "1px solid #333",
                            color: "#aaa",
                            fontFamily: "system-ui, Inter, sans-serif",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={deleteConfirmText !== `delete ${settings.name}`}
                          onClick={() => {
                            onDeleteWorkspace();
                            onClose();
                          }}
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{
                            backgroundColor: deleteConfirmText === `delete ${settings.name}` ? "#ef4444" : "#2a1a1a",
                            color: deleteConfirmText === `delete ${settings.name}` ? "#fff" : "#555",
                            border: "none",
                            cursor: deleteConfirmText === `delete ${settings.name}` ? "pointer" : "not-allowed",
                            fontFamily: "system-ui, Inter, sans-serif",
                          }}
                        >
                          Delete Workspace
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
