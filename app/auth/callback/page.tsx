"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      
      // Check if there's a hash fragment with tokens (from email invite links)
      const hash = window.location.hash;
      
      if (hash && hash.includes("access_token")) {
        // Parse the hash fragment
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");
        
        if (accessToken && refreshToken) {
          // Set the session from the tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Failed to set session:", error);
            setErrorMessage(error.message);
            setStatus("error");
            return;
          }

          // If this is a recovery (password reset), redirect to reset password page
          if (type === "recovery") {
            setStatus("success");
            router.push("/auth/reset-password");
            return;
          }
          
          // If this is an invite, redirect to change password page
          if (type === "invite") {
            setStatus("success");
            router.push("/auth/change-password");
            return;
          }

          setStatus("success");
          router.push("/");
          return;
        }
      }

      // Check for code in search params (OAuth flow)
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Failed to exchange code:", error);
          setErrorMessage(error.message);
          setStatus("error");
          return;
        }
        setStatus("success");
        router.push("/");
        return;
      }

      // No valid auth params found
      setErrorMessage("No authentication parameters found");
      setStatus("error");
    };

    handleCallback();
  }, [router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F0FE00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Completing sign in...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
          <p className="text-gray-400 mb-6">
            {errorMessage || "Something went wrong during authentication. Please try again."}
          </p>
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-[#F0FE00] text-black font-medium rounded-lg hover:bg-[#d9e500] transition-colors"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return null;
}
