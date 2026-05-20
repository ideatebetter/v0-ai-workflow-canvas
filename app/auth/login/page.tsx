"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Tab = "signin" | "request-access";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Request access form fields
  const [requestName, setRequestName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestCompany, setRequestCompany] = useState("");
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: requestName,
          email: requestEmail,
          company: requestCompany,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit request");
      } else {
        setSuccess("Your request has been submitted! We'll notify you when your access is approved.");
        setRequestName("");
        setRequestEmail("");
        setRequestCompany("");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
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

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#2a2a2a]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-4 px-4 text-sm font-medium transition-colors ${
                activeTab === "signin"
                  ? "text-white bg-[#1a1a1a] border-b-2 border-[#F0FE00]"
                  : "text-gray-400 hover:text-white bg-[#141414]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("request-access");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-4 px-4 text-sm font-medium transition-colors ${
                activeTab === "request-access"
                  ? "text-white bg-[#1a1a1a] border-b-2 border-[#F0FE00]"
                  : "text-gray-400 hover:text-white bg-[#141414]"
              }`}
            >
              Request Access
            </button>
          </div>

          <div className="p-8">
            {activeTab === "signin" ? (
              <>
                <h1 className="text-2xl font-semibold text-white mb-2 text-center">Welcome back</h1>
                <p className="text-gray-400 text-center mb-6">Sign in to your account</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] transition-colors"
                      placeholder="Enter your password"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-gray-400 hover:text-[#F0FE00] transition-colors"
                    >
                      Forgot your password?
                    </Link>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#F0FE00", color: "#0a0a0a" }}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold text-white mb-2 text-center">Get Access</h1>
                <p className="text-gray-400 text-center mb-6">Join the waitlist to get access to Atlas</p>

                {success ? (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-center">
                    <svg className="w-12 h-12 mx-auto mb-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium mb-1">Request Submitted!</p>
                    <p className="text-sm text-green-400/80">{success}</p>
                  </div>
                ) : (
                  <form onSubmit={handleRequestAccess} className="space-y-4">
                    <div>
                      <label htmlFor="request-name" className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        id="request-name"
                        type="text"
                        value={requestName}
                        onChange={(e) => setRequestName(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] transition-colors"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label htmlFor="request-email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        id="request-email"
                        type="email"
                        value={requestEmail}
                        onChange={(e) => setRequestEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] transition-colors"
                        placeholder="you@company.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="request-company" className="block text-sm font-medium text-gray-300 mb-2">
                        Company
                      </label>
                      <input
                        id="request-company"
                        type="text"
                        value={requestCompany}
                        onChange={(e) => setRequestCompany(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-[#F0FE00] transition-colors"
                        placeholder="Your company name (optional)"
                      />
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#F0FE00", color: "#0a0a0a" }}
                    >
                      {loading ? "Submitting..." : "Request Access"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
