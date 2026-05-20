"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add User form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<{ email: string; tempPassword: string } | null>(null);

  const isAdmin = user?.email === "rahmi@ideatebetter.com";

  const handleCreateUser = async () => {
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
    } catch {
      setCreateUserError("Failed to create user. Please try again.");
    } finally {
      setCreateUserLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    } else if (!authLoading && user && !isAdmin) {
      router.push("/");
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchWaitlist();
    }
  }, [isAdmin, filter]);

  const fetchWaitlist = async () => {
    try {
      const response = await fetch(`/api/waitlist?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setWaitlist(data.waitlist || []);
      }
    } catch (error) {
      console.error("Failed to fetch waitlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    setUpdatingId(id);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        const entry = waitlist.find(e => e.id === id);
        
        // Show success message
        if (newStatus === "approved") {
          setSuccessMessage(`Invitation sent to ${entry?.email}`);
          // Auto-hide after 5 seconds
          setTimeout(() => setSuccessMessage(null), 5000);
        }
        
        // Update local state
        setWaitlist((prev) =>
          prev.map((entry) =>
            entry.id === id ? { ...entry, status: newStatus } : entry
          )
        );
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F0FE00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const stats = {
    total: waitlist.length,
    pending: waitlist.filter((e) => e.status === "pending").length,
    approved: waitlist.filter((e) => e.status === "approved").length,
    rejected: waitlist.filter((e) => e.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5">
              <div className="w-2 h-2 rounded-full bg-[#F0FE00]" />
              <div className="w-2 h-2 rounded-full bg-[#F0FE00]" />
              <div className="w-2 h-2 rounded-full bg-[#F0FE00]" />
              <div className="w-2 h-2 rounded-full bg-[#F0FE00]" />
            </div>
            <span className="text-xl font-semibold">Atlas Admin</span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to App
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Add User Section */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-2">Add User Directly</h2>
          <p className="text-gray-400 text-sm mb-4">Create a new user account with a temporary password</p>
          
          <div className="flex gap-3 mb-4">
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
              className="flex-1 px-4 py-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] transition-colors disabled:opacity-50"
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
              className="flex-1 px-4 py-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleCreateUser}
              disabled={createUserLoading || !newUserName.trim() || !newUserEmail.trim()}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 bg-[#F0FE00] text-black hover:bg-[#d9e500]"
            >
              {createUserLoading ? "Creating..." : "Create User"}
            </button>
          </div>

          {createUserError && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {createUserError}
            </div>
          )}

          {createUserSuccess && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                User created successfully!
              </div>
              <div className="space-y-1 text-sm">
                <div className="text-gray-300">
                  <span className="text-gray-500">Email:</span> {createUserSuccess.email}
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-gray-500">Temporary Password:</span>
                  <code className="px-3 py-1 rounded bg-black/50 font-mono text-[#F0FE00]">{createUserSuccess.tempPassword}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(createUserSuccess.tempPassword)}
                    className="px-3 py-1 rounded text-sm bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Share this password with the user. They can change it in Settings after logging in.
              </p>
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-2">Access Requests</h1>
        <p className="text-gray-400 mb-8">Manage who can access Atlas</p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total, color: "text-white" },
            { label: "Pending", value: stats.pending, color: "text-yellow-400" },
            { label: "Approved", value: stats.approved, color: "text-green-400" },
            { label: "Rejected", value: stats.rejected, color: "text-red-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4"
            >
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["all", "pending", "approved", "rejected"] as FilterStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-[#F0FE00] text-black"
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Name</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Email</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Company</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Requested</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No requests found
                  </td>
                </tr>
              ) : (
                waitlist.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#2a2a2a] last:border-b-0">
                    <td className="px-6 py-4 font-medium">{entry.name}</td>
                    <td className="px-6 py-4 text-gray-400">{entry.email}</td>
                    <td className="px-6 py-4 text-gray-400">{entry.company || "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          entry.status === "pending"
                            ? "bg-yellow-400/10 text-yellow-400"
                            : entry.status === "approved"
                            ? "bg-green-400/10 text-green-400"
                            : "bg-red-400/10 text-red-400"
                        }`}
                      >
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {entry.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateStatus(entry.id, "approved")}
                              disabled={updatingId === entry.id}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                            >
                              {updatingId === entry.id ? "..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(entry.id, "rejected")}
                              disabled={updatingId === entry.id}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            >
                              {updatingId === entry.id ? "..." : "Reject"}
                            </button>
                          </>
                        )}
                        {entry.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(entry.id, "rejected")}
                            disabled={updatingId === entry.id}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                        {entry.status === "rejected" && (
                          <button
                            type="button"
                            onClick={() => updateStatus(entry.id, "approved")}
                            disabled={updatingId === entry.id}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 z-50">
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-green-400 font-medium text-sm">{successMessage}</p>
            <p className="text-green-400/60 text-xs">They will receive an email to set their password</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="ml-2 text-green-400/60 hover:text-green-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
