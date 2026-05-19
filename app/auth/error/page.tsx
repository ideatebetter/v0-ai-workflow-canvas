"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthErrorPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleTokenInHash = async () => {
      // Check if there's actually a token in the hash (invitation link landed here by mistake)
      const hash = window.location.hash;
      
      if (hash && hash.includes("access_token")) {
        const supabase = createClient();
        
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

          if (!error) {
            // If this is an invite, redirect to password change
            if (type === "invite" || type === "recovery") {
              router.push("/auth/change-password");
              return;
            }
            router.push("/");
            return;
          }
        }
      }
      
      setIsProcessing(false);
    };

    handleTokenInHash();
  }, [router]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F0FE00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex gap-0.5">
            <div className="w-2 h-2 rounded-full bg-[#F0FE00]" />
            <div className="w-2 h-2 rounded-full bg-[#F0FE00]" />
            <div className="w-2 h-2 rounded-full bg-[#F0FE00]" />
            <div className="w-2 h-2 rounded-full bg-[#F0FE00]" />
          </div>
          <span className="text-white text-2xl font-semibold tracking-tight">Atlas</span>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-semibold text-white mb-2">Authentication Error</h1>
          <p className="text-gray-400 mb-6">
            Something went wrong during authentication. Please try again.
          </p>

          <Link
            href="/auth/login"
            className="inline-block py-3 px-6 rounded-lg font-medium transition-all"
            style={{ backgroundColor: "#F0FE00", color: "#0a0a0a" }}
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
