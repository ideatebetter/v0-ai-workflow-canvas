"use client";

import React, { useState, useRef, useEffect } from "react";
import type { Canvas } from "@/lib/atlas-types";

interface AtlasToolbarProps {
  canvasName?: string;
  onBack?: () => void;
  onCanvasNameChange?: (name: string) => void;
  onSaveAsFramework?: () => void;
  onCopyToCanvas?: () => void;
  hasSelectedNodes?: boolean;
  hasOtherCanvases?: boolean;
  recentCanvases?: Canvas[];
  onSwitchCanvas?: (canvasId: string) => void;
}

export function AtlasToolbar({ 
  canvasName, 
  onBack, 
  onCanvasNameChange, 
  onSaveAsFramework, 
  onCopyToCanvas, 
  hasSelectedNodes, 
  hasOtherCanvases,
  recentCanvases,
  onSwitchCanvas,
}: AtlasToolbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(canvasName || "");
  const [showMenu, setShowMenu] = useState(false);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const recentDropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (recentDropdownRef.current && !recentDropdownRef.current.contains(event.target as Node)) {
        setShowRecentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(canvasName || "");
  }, [canvasName]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = () => {
    if (editValue.trim() && onCanvasNameChange) {
      onCanvasNameChange(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(canvasName || "");
      setIsEditing(false);
    }
  };

  const handleMouseEnter = () => {
    if (!isEditing && recentCanvases && recentCanvases.length > 0) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowRecentDropdown(true);
      }, 200); // Small delay to prevent accidental triggers
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Delay hiding to allow mouse to move to dropdown
    hoverTimeoutRef.current = setTimeout(() => {
      setShowRecentDropdown(false);
    }, 150);
  };

  const handleDropdownMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleDropdownMouseLeave = () => {
    setShowRecentDropdown(false);
  };

  return (
    <div className="fixed top-4 left-4 z-50 flex items-center gap-3">
      {/* Atlas Logo - clickable to go home */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center opacity-80 hover:opacity-100 transition-opacity"
      >
        <img 
          src="/atlas-logo.svg" 
          alt="Atlas" 
          className="h-5"
          style={{ width: "auto" }}
        />
      </button>

      {/* Separator and Canvas Name */}
      {canvasName && (
        <>
          <span className="text-gray-600">|</span>
          <div 
            className="relative"
            ref={recentDropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="text-sm text-white bg-transparent border-b border-gray-500 focus:border-white focus:outline-none px-0 py-0.5 min-w-[100px]"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-sm text-gray-400 hover:text-white transition-colors cursor-text flex items-center gap-1.5"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {canvasName}
                {recentCanvases && recentCanvases.length > 0 && (
                  <svg 
                    width="10" 
                    height="10" 
                    viewBox="0 0 10 10" 
                    fill="none" 
                    className={`transition-transform ${showRecentDropdown ? 'rotate-180' : ''}`}
                  >
                    <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}

            {/* Recent Canvases Dropdown */}
            {showRecentDropdown && recentCanvases && recentCanvases.length > 0 && !isEditing && (
              <div
                className="absolute top-full left-0 mt-2 py-1 rounded-xl shadow-2xl min-w-[220px]"
                style={{ 
                  backgroundColor: "rgba(26, 26, 26, 0.95)", 
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(20px)",
                }}
                onMouseEnter={handleDropdownMouseEnter}
                onMouseLeave={handleDropdownMouseLeave}
              >
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Recent Canvases
                </div>
                {recentCanvases.map((canvas, index) => (
                  <button
                    key={canvas.id}
                    type="button"
                    onClick={() => {
                      onSwitchCanvas?.(canvas.id);
                      setShowRecentDropdown(false);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-500">
                        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M5 6H11M5 8H11M5 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{canvas.name}</div>
                      <div className="text-[10px] text-gray-500">{canvas.nodes.length} items</div>
                    </div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">
                      {index === 0 ? "Previous" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Canvas Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
              </svg>
            </button>

            {showMenu && (
              <div
                className="absolute top-full left-0 mt-2 py-1 rounded-lg shadow-lg min-w-[180px]"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSaveAsFramework?.();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5.5 8H10.5M8 5.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Save as Framework
                </button>
                {hasOtherCanvases && (
                  <>
                    <div className="h-px mx-2 my-1" style={{ backgroundColor: "#333333" }} />
                    <button
                      type="button"
                      onClick={() => {
                        onCopyToCanvas?.();
                        setShowMenu(false);
                      }}
                      disabled={!hasSelectedNodes}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                        hasSelectedNodes 
                          ? "text-gray-300 hover:bg-white/10 hover:text-white" 
                          : "text-gray-600 cursor-not-allowed"
                      }`}
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M11 5V4C11 3.17157 10.3284 2.5 9.5 2.5H4C3.17157 2.5 2.5 3.17157 2.5 4V9.5C2.5 10.3284 3.17157 11 4 11H5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      Copy to Canvas
                      {!hasSelectedNodes && (
                        <span className="text-[10px] text-gray-500 ml-auto">Select nodes first</span>
                      )}
                    </button>
                  </>
                )}
                <div className="h-px mx-2 my-1" style={{ backgroundColor: "#333333" }} />
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Rename Canvas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
