"use client";

import React, { useState, useRef, useEffect } from "react";

interface AtlasToolbarProps {
  canvasName?: string;
  onBack?: () => void;
  onCanvasNameChange?: (name: string) => void;
  onSaveAsFramework?: () => void;
  onCopyToCanvas?: () => void;
  hasSelectedNodes?: boolean;
  hasOtherCanvases?: boolean;
}

export function AtlasToolbar({ canvasName, onBack, onCanvasNameChange, onSaveAsFramework, onCopyToCanvas, hasSelectedNodes, hasOtherCanvases }: AtlasToolbarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(canvasName || "");
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
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
              className="text-sm text-gray-400 hover:text-white transition-colors cursor-text"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              {canvasName}
            </button>
          )}

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
