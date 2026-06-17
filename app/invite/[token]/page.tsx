"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  isExpired: boolean;
  isValid: boolean;
  workspaces: {
    id: string;
    name: string;
  };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = params.token as string;

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/invitations/accept?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load invitation");
          return;
        }

        setInvitation(data.invitation);
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      const params = new URLSearchParams({
        returnTo: `/invite/${token}`,
        tab: "signup",
        ...(invitation?.email ? { email: invitation.email } : {}),
      });
      router.push(`/auth/login?${params.toString()}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
        return;
      }

      setSuccess(true);

      // Sync the invited workspace name into localStorage so the app shows it immediately
      if (data.workspaceName) {
        try {
          const stored = localStorage.getItem("atlas-workspaces");
          const workspaces = stored ? JSON.parse(stored) : [];
          if (workspaces.length > 0) {
            workspaces[0] = { ...workspaces[0], name: data.workspaceName };
            localStorage.setItem("atlas-workspaces", JSON.stringify(workspaces));
          }
        } catch { /* ignore */ }
      }

      setTimeout(() => router.push("/"), data.alreadyMember ? 0 : 2000);
    } catch {
      setError("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#F0FE00] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex gap-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F0FE00" }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F0FE00" }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F0FE00" }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F0FE00" }} />
          </div>
          <span className="text-white text-xl font-semibold" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Atlas
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-[#222222] rounded-xl p-8">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F0FE00]/10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F0FE00" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Welcome to {invitation?.workspaces?.name}!
              </h1>
              <p className="text-gray-400 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Redirecting you to the workspace...
              </p>
            </div>
          ) : error && !invitation ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Invalid Invitation
              </h1>
              <p className="text-gray-400 text-sm mb-6" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {error}
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: "#F0FE00", color: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Go to Atlas
              </Link>
            </div>
          ) : invitation && !invitation.isValid ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Invitation {invitation.isExpired ? "Expired" : invitation.status === "accepted" ? "Already Used" : "Invalid"}
              </h1>
              <p className="text-gray-400 text-sm mb-6" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {invitation.isExpired 
                  ? "This invitation has expired. Please ask for a new one."
                  : invitation.status === "accepted"
                  ? "This invitation has already been accepted."
                  : "This invitation is no longer valid."}
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: "#F0FE00", color: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Go to Atlas
              </Link>
            </div>
          ) : invitation ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F0FE00]/10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F0FE00" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                You&apos;ve been invited!
              </h1>
              <p className="text-gray-400 text-sm mb-6" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Join <span className="text-white font-medium">{invitation.workspaces?.name}</span> as a{" "}
                <span className="text-[#F0FE00]">{invitation.role}</span>
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {!user ? (
                <div className="space-y-3">
                  <button
                    onClick={handleAccept}
                    className="w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: "#F0FE00", color: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Create Account to Accept
                  </button>
                  <p className="text-gray-500 text-xs" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Already have an account?{" "}
                    <button
                      onClick={() => router.push(`/auth/login?returnTo=/invite/${token}&tab=signin${invitation?.email ? `&email=${invitation.email}` : ""}`)}
                      className="text-gray-300 underline"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              ) : user.email?.toLowerCase() !== invitation.email.toLowerCase() ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg text-left" style={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}>
                    <p className="text-yellow-400 text-xs font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Wrong account</p>
                    <p className="text-gray-400 text-xs" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      You&apos;re signed in as <span className="text-white">{user.email}</span>, but this invite was sent to <span className="text-white">{invitation.email}</span>.
                    </p>
                  </div>
                  <Link
                    href={`/auth/login?returnTo=/invite/${token}`}
                    className="block w-full px-6 py-3 rounded-lg text-sm font-medium text-center transition-colors"
                    style={{ backgroundColor: "#F0FE00", color: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Sign in as {invitation.email}
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full px-6 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#F0FE00", color: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  {accepting ? "Accepting..." : "Accept Invitation"}
                </button>
              )}

              <p className="mt-4 text-gray-500 text-xs" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Invitation sent to {invitation.email}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
