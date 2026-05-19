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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ email: string; password: string } | null>(null);

  const isAdmin = user?.email === "rahmi@ideatebetter.com";

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
    try {
      const response = await fetch("/api/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // If approved and temp password returned, show the modal
        if (newStatus === "approved" && data.tempPassword) {
          const entry = waitlist.find(e => e.id === id);
          setTempPasswordInfo({
            email: entry?.email || "",
            password: data.tempPassword,
          });
          setShowPasswordModal(true);
        }
        
        // Update local state
        setWaitlist((prev) =>
          prev.map((entry) =>
            entry.id === id ? { ...entry, status: newStatus } : entry
          )
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
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

      {/* Temp Password Modal */}
      {showPasswordModal && tempPasswordInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Account Created</h2>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              An account has been created for <span className="text-white font-medium">{tempPasswordInfo.email}</span>. 
              Share these credentials with them:
            </p>
            
            <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 mb-4">
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-white font-mono">{tempPasswordInfo.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Temporary Password</p>
                <p className="text-[#F0FE00] font-mono text-lg">{tempPasswordInfo.password}</p>
              </div>
            </div>
            
            <p className="text-amber-400/80 text-xs mb-4">
              The user will be prompted to change their password on first login.
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Your Atlas account is ready!\n\nEmail: ${tempPasswordInfo.email}\nTemporary Password: ${tempPasswordInfo.password}\n\nLogin at: https://atlas-prototype.com/auth/login\n\nPlease change your password after logging in.`
                  );
                  alert("Copied to clipboard!");
                }}
                className="flex-1 py-2.5 bg-[#2a2a2a] text-white font-medium rounded-lg hover:bg-[#333] transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setTempPasswordInfo(null);
                }}
                className="flex-1 py-2.5 bg-[#F0FE00] text-black font-medium rounded-lg hover:bg-[#d9e500] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
