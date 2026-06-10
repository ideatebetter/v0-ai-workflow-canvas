"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import type { WorkspaceSettings, MemberRole, ProductConfig, NamingToken, NamingConventions } from "@/lib/atlas-types";
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
}

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export function WorkspaceSettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
  onMakeFramework,
}: WorkspaceSettingsProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const { user } = useAuth();

  // Admin: Create user state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<{ email: string; tempPassword: string } | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; email: string; name: string; createdAt: string; lastSignIn: string | null }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || "");

  // Figma sync token
  const [figmaToken, setFigmaToken] = useState<string | null>(null);
  const [figmaTokenCopied, setFigmaTokenCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/figma/token")
      .then(r => r.json())
      .then(d => { if (d.token) setFigmaToken(d.token); })
      .catch(() => {});
  }, [open]);

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
      // First ensure user has a workspace
      const workspaceRes = await fetch("/api/workspace");
      const workspaceData = await workspaceRes.json();
      
      if (!workspaceRes.ok || !workspaceData.workspace) {
        setInviteError("Failed to get workspace. Please try again.");
        return;
      }

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspaceData.workspace.id,
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Failed to send invitation");
        return;
      }

      // Show the invite link
      setInviteLink(data.inviteLink);
      
      // Add to local members list as pending
      const newMember = {
        id: `pending-${Date.now()}`,
        name: inviteEmail.split("@")[0],
        email: inviteEmail,
        initials: inviteEmail.slice(0, 2).toUpperCase(),
        role: inviteRole,
      };
      
      onSettingsChange({
        ...settings,
        members: [...settings.members, newMember],
      });
      
      setInviteEmail("");
    } catch {
      setInviteError("Failed to send invitation. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }, [inviteEmail, inviteRole, user, settings, onSettingsChange]);

  const handleRoleChange = (memberId: string, role: MemberRole) => {
    onSettingsChange({
      ...settings,
      members: settings.members.map((m) =>
        m.id === memberId ? { ...m, role } : m
      ),
    });
  };

  const handleRemoveMember = (memberId: string) => {
    onSettingsChange({
      ...settings,
      members: settings.members.filter((m) => m.id !== memberId),
    });
  };

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
              </h3>
              
              {/* Invite */}
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null);
                    setInviteLink(null);
                  }}
                  placeholder="Email address"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  disabled={inviteLoading}
                  className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333333",
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                  disabled={inviteLoading}
                  className="px-3 py-2 rounded-lg text-sm text-white focus:outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333333",
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
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
                  style={{
                    backgroundColor: "#F0FE00",
                    color: "#121212",
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
                >
                  {inviteLoading ? "..." : "Invite"}
                </button>
              </div>
              {inviteError && (
                <div className="p-2 rounded-lg text-xs mb-3" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                  {inviteError}
                </div>
              )}
              {inviteLink && (
                <div className="p-2 rounded-lg mb-3" style={{ backgroundColor: "rgba(240, 254, 0, 0.05)", border: "1px solid rgba(240, 254, 0, 0.2)" }}>
                  <div className="flex items-center gap-2">
                    <input type="text" value={inviteLink} readOnly className="flex-1 px-2 py-1 rounded text-xs text-gray-300 focus:outline-none" style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "monospace" }} />
                    <button type="button" onClick={() => navigator.clipboard.writeText(inviteLink)} className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: "#2a2a2a", color: "#F0FE00" }}>Copy</button>
                  </div>
                </div>
              )}
              {!user && (
                <div className="p-2 rounded-lg text-xs mb-3" style={{ backgroundColor: "rgba(234, 179, 8, 0.1)", border: "1px solid rgba(234, 179, 8, 0.2)", color: "#eab308", fontFamily: "system-ui, Inter, sans-serif" }}>
                  Sign in to invite team members
                </div>
              )}

              {/* Member List - Compact */}
              <div className="flex flex-wrap gap-2">
                {settings.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "#1a1a1a" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ backgroundColor: "#333333" }}
                    >
                      {member.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white font-medium" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                          {member.name}
                        </span>
                        <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                          {ROLE_LABELS[member.role || "viewer"]}
                        </span>
                      </div>
                    </div>
                    {member.role !== "owner" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors ml-1"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #222222" }} />

            {/* Products Section */}
            <div>
              <h3
                className="text-white font-semibold text-base mb-4 flex items-center gap-2"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-400">
                  <path d="M15.75 11.25V6.75C15.7497 6.48706 15.6803 6.22882 15.5487 6.00177C15.4172 5.77472 15.2282 5.58697 15 5.4575L9.75 2.4575C9.52146 2.32775 9.26291 2.25879 9 2.25879C8.73709 2.25879 8.47854 2.32775 8.25 2.4575L3 5.4575C2.77181 5.58697 2.58285 5.77472 2.45127 6.00177C2.31969 6.22882 2.25033 6.48706 2.25 6.75V11.25C2.25033 11.5129 2.31969 11.7712 2.45127 11.9982C2.58285 12.2253 2.77181 12.413 3 12.5425L8.25 15.5425C8.47854 15.6722 8.73709 15.7412 9 15.7412C9.26291 15.7412 9.52146 15.6722 9.75 15.5425L15 12.5425C15.2282 12.413 15.4172 12.2253 15.5487 11.9982C15.6803 11.7712 15.7497 11.5129 15.75 11.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Products
              </h3>
              <div className="flex flex-wrap gap-2">
                {settings.products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductToggle(product.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      product.enabled ? "ring-1 ring-white/20" : "opacity-50"
                    }`}
                    style={{ backgroundColor: "#1a1a1a" }}
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: product.color }}
                    />
                    <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      {product.name}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${product.enabled ? "bg-green-500" : "bg-gray-600"}`} />
                  </button>
                ))}
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
                  <div className="flex flex-col gap-3">
                  {/* Figma Sync */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-lg"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#0a1a3a" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 7.4 4.1 8.6 5.1 9.4C4.1 9.8 3.5 10.8 3.5 12C3.5 13.4 4.6 14.5 6 14.5C7 14.5 7.9 14 8.4 13.1C8.9 14 9.8 14.5 10.8 14.5C12.2 14.5 13.3 13.4 13.3 12C13.3 10.8 12.7 9.8 11.7 9.4C12.7 8.6 13.3 7.4 13.3 6C13.3 3.5 11.3 1.5 8.8 1.5H8Z" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Figma Sync</div>
                      <div className="text-xs text-gray-500 mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        Paste this token into the Ideate Figma plugin to sync frames.
                      </div>
                      {figmaToken ? (
                        <div className="flex items-center gap-2">
                          <code
                            className="flex-1 text-xs px-2 py-1 rounded truncate"
                            style={{ background: "#111", color: "#60a5fa", fontFamily: "monospace", border: "1px solid #222" }}
                          >
                            {figmaToken.slice(0, 20)}…
                          </code>
                          <button
                            type="button"
                            onClick={copyFigmaToken}
                            className="flex-shrink-0 text-xs px-3 py-1 rounded transition-colors"
                            style={{
                              background: figmaTokenCopied ? "#0a3a1a" : "#222",
                              color: figmaTokenCopied ? "#4ade80" : "#aaa",
                              border: "1px solid #333",
                            }}
                          >
                            {figmaTokenCopied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600">Loading…</div>
                      )}
                    </div>
                  </div>

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
                  </div>{/* end flex-col gap-3 */}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
