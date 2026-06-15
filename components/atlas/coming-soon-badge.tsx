"use client";

import React from "react";

export function ComingSoonBadge() {
  return (
    <div
      className="flex items-center justify-center gap-1 py-1"
      style={{
        backgroundColor: "rgba(251,191,36,0.07)",
        borderBottom: "1px solid rgba(251,191,36,0.18)",
        fontSize: "9px",
        fontWeight: 600,
        fontFamily: "system-ui, Inter, sans-serif",
        letterSpacing: "0.06em",
        color: "#fbbf24",
      }}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      COMING SOON
    </div>
  );
}
