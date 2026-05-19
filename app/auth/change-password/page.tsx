"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        setError("You must be logged in to change your password");
        setLoading(false);
        return;
      }

      // Try signing in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setError("Current password is incorrect");
        setLoading(false);
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
        },
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      console.error("Password change error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img 
            src="/atlas-logo.svg" 
            alt="Atlas" 
            className="h-12"
          />
        </div>

        <div className="bg-[#141414] rounded-2xl p-8 border border-[#222]">
          <h1 className="text-2xl font-semibold text-white text-center mb-2">
            Change Password
          </h1>
          <p className="text-gray-400 text-center text-sm mb-6">
            {success 
              ? "Password updated successfully!" 
              : "Enter your current password and choose a new one"}
          </p>

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Redirecting to home...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] focus:ring-1 focus:ring-[#F0FE00] transition-colors"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] focus:ring-1 focus:ring-[#F0FE00] transition-colors"
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] focus:ring-1 focus:ring-[#F0FE00] transition-colors"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#F0FE00] text-black font-medium rounded-lg hover:bg-[#d9e500] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full py-3 bg-transparent text-gray-400 font-medium rounded-lg hover:text-white transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
