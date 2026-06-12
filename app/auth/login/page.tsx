"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Tab = "signin" | "signup";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { display_name: displayName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess("Check your email for a confirmation link to activate your account.");
      setLoading(false);
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
    setEmail("");
    setPassword("");
    setDisplayName("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img src="/atlas-logo.svg" alt="Atlas" className="h-12" />
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => switchTab("signin")}
              className={`flex-1 py-4 px-4 text-sm font-medium transition-colors ${
                activeTab === "signin"
                  ? "text-foreground bg-card border-b-2 border-[#F0FE00]"
                  : "text-muted-foreground hover:text-foreground bg-muted"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchTab("signup")}
              className={`flex-1 py-4 px-4 text-sm font-medium transition-colors ${
                activeTab === "signup"
                  ? "text-foreground bg-card border-b-2 border-[#F0FE00]"
                  : "text-muted-foreground hover:text-foreground bg-muted"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="p-8">
            {activeTab === "signin" ? (
              <>
                <h1 className="text-2xl font-semibold text-foreground mb-2 text-center">Welcome back</h1>
                <p className="text-muted-foreground text-center mb-6">Sign in to your account</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#F0FE00] transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#F0FE00] transition-colors"
                      placeholder="Enter your password"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-muted-foreground hover:text-[#F0FE00] transition-colors"
                    >
                      Forgot your password?
                    </Link>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
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
                <h1 className="text-2xl font-semibold text-foreground mb-2 text-center">Create an account</h1>
                <p className="text-muted-foreground text-center mb-6">Start organizing your creative assets</p>

                {success ? (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-center">
                    <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium mb-1">Check your email</p>
                    <p className="text-sm text-green-500/80">{success}</p>
                    <button
                      type="button"
                      onClick={() => switchTab("signin")}
                      className="mt-4 text-sm text-[#F0FE00] hover:underline"
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-2">
                        Display Name
                      </label>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#F0FE00] transition-colors"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="signup-email" className="block text-sm font-medium text-foreground mb-2">
                        Email
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#F0FE00] transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="signup-password" className="block text-sm font-medium text-foreground mb-2">
                        Password
                      </label>
                      <input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#F0FE00] transition-colors"
                        placeholder="At least 6 characters"
                      />
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#F0FE00", color: "#0a0a0a" }}
                    >
                      {loading ? "Creating account..." : "Create account"}
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
