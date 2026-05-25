"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface AddNodeMenuProps {
  onAddStatusPill: () => void;
  onAddTextNode: () => void;
  onAddSageNode: (sageType: "chatbot" | "overview" | "stakeholder") => void;
  onAddOperationalNode: (opType: "capacity" | "financial" | "projectHealth" | "pipeline" | "teamHealth") => void;
  onUploadFile: (files: FileList) => void;
  onOpenAIGenerate: (type: "mockup" | "collateral") => void;
  onClose: () => void;
  position?: { x: number; y: number };
  sourceNodeId?: string;
  sourceHandlePosition?: "left" | "right";
}

export function AddNodeMenu({
  onAddStatusPill,
  onAddTextNode,
  onAddSageNode,
  onAddOperationalNode,
  onUploadFile,
  onOpenAIGenerate,
  onClose,
  position,
  sourceHandlePosition,
}: AddNodeMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState(position || { x: 200, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.menu-content')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - menuPosition.x,
      y: e.clientY - menuPosition.y,
    });
  }, [menuPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setMenuPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Sync menuPosition when position prop changes
  useEffect(() => {
    if (position) {
      setMenuPosition(position);
    }
  }, [position]);

  const fontStyle = { fontFamily: "system-ui, Inter, sans-serif" };

  if (typeof document === "undefined") return null;
  
  return createPortal(
    <>
      {/* Backdrop to close menu */}
      <div 
        style={{ position: "fixed", inset: 0, zIndex: 45 }}
        onClick={onClose}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      
      {/* Main Menu */}
      <div
        className="bg-card border border-border rounded-lg"
        style={{ 
          width: 180,
          position: "fixed",
          left: menuPosition.x,
          top: menuPosition.y,
          transform: sourceHandlePosition === "left" ? "translateX(-100%)" : "translateX(0)",
          cursor: isDragging ? "grabbing" : "default",
          maxHeight: "80vh",
          overflowY: "auto",
          zIndex: 9999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Drag Handle */}
        <div 
          className="border-b border-border"
          style={{ 
            padding: "8px 12px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          onMouseDown={handleMouseDown}
        >
          <span className="text-muted-foreground" style={{ fontSize: 12, fontWeight: 500, ...fontStyle }}>
            Add Node
          </span>
          <div style={{ display: "flex", gap: 2 }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#666" }} />
            <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#666" }} />
            <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#666" }} />
          </div>
        </div>

        <div className="menu-content" style={{ padding: "4px 0" }}>
          {/* Text - Direct action, no submenu */}
          <button
            type="button"
            onClick={() => { onAddTextNode(); onClose(); }}
            style={{
              width: "100%",
              padding: "8px 12px",
              textAlign: "left",
              fontSize: 14,
              color: "#d1d5db",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...fontStyle,
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#ffffff20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 4H13M5 8H11M4 12H12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            Text
          </button>

          {/* Divider */}
          <div className="h-px mx-2 my-1 bg-border" />

          {/* Status Pill */}
          <button
            type="button"
            onClick={() => { onAddStatusPill(); onClose(); }}
            style={{
              width: "100%",
              padding: "8px 12px",
              textAlign: "left",
              fontSize: 14,
              color: "#d1d5db",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...fontStyle,
            }}
          >
            <div style={{ width: 16, height: 10, borderRadius: 5, backgroundColor: "#e5e5e5" }} />
            Status Pill
          </button>
          
          {/* Divider */}
          <div className="h-px mx-2 my-1 bg-border" />
          
          {/* Sage */}
          <button
            type="button"
            onClick={() => setActiveSubmenu(activeSubmenu === "sage" ? null : "sage")}
            style={{
              width: "100%",
              padding: "8px 12px",
              textAlign: "left",
              fontSize: 14,
              color: "#d1d5db",
              backgroundColor: activeSubmenu === "sage" ? "rgba(255,255,255,0.1)" : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              ...fontStyle,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/sage-logo.svg" alt="Sage" style={{ width: 16, height: 16 }} />
              Sage
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: activeSubmenu === "sage" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <path d="M4.5 3L7.5 6L4.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Divider */}
          <div className="h-px mx-2 my-1 bg-border" />
          
          {/* Ops Data */}
          <button
            type="button"
            onClick={() => setActiveSubmenu(activeSubmenu === "ops" ? null : "ops")}
            style={{
              width: "100%",
              padding: "8px 12px",
              textAlign: "left",
              fontSize: 14,
              color: "#d1d5db",
              backgroundColor: activeSubmenu === "ops" ? "rgba(255,255,255,0.1)" : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              ...fontStyle,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#8b5cf620", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M7 16l4-8 4 4 6-6" />
                </svg>
              </div>
              Ops Data
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: activeSubmenu === "ops" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <path d="M4.5 3L7.5 6L4.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Divider */}
          <div className="h-px mx-2 my-1 bg-border" />
          
          {/* AI Generate */}
          <button
            type="button"
            onClick={() => setActiveSubmenu(activeSubmenu === "ai" ? null : "ai")}
            style={{
              width: "100%",
              padding: "8px 12px",
              textAlign: "left",
              fontSize: 14,
              color: "#d1d5db",
              backgroundColor: activeSubmenu === "ai" ? "rgba(255,255,255,0.1)" : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              ...fontStyle,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#F0FE0020", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L8.5 4.5L12 5L9.5 7.5L10 11L7 9.5L4 11L4.5 7.5L2 5L5.5 4.5L7 1Z" stroke="#F0FE00" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </div>
Generate
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: activeSubmenu === "ai" ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <path d="M4.5 3L7.5 6L4.5 9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Divider */}
          <div className="h-px mx-2 my-1 bg-border" />
          
          {/* File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadFile(e.target.files);
                onClose();
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%",
              padding: "8px 12px",
              textAlign: "left",
              fontSize: 14,
              color: "#d1d5db",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...fontStyle,
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#52525b20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M7 2V12M2 7H12" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            Upload File
          </button>
        </div>
      </div>

      {/* Submenu Panel - appears to the right */}
      {activeSubmenu && (
        <div
          className="bg-card border border-border rounded-lg"
          style={{ 
            width: 160,
            position: "fixed",
            left: menuPosition.x + (sourceHandlePosition === "left" ? -180 : 180) + 8,
            top: menuPosition.y + (activeSubmenu === "sage" ? 90 : activeSubmenu === "ops" ? 145 : 200),
            zIndex: 51,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            padding: "4px 0",
          }}
        >
          {activeSubmenu === "sage" && (
            <>
              <button
                type="button"
                onClick={() => { onAddSageNode("chatbot"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Sage Chat
              </button>
              <button
                type="button"
                onClick={() => { onAddSageNode("overview"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => { onAddSageNode("stakeholder"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Stakeholder
              </button>
            </>
          )}

          {activeSubmenu === "ops" && (
            <>
              <button
                type="button"
                onClick={() => { onAddOperationalNode("capacity"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Capacity
              </button>
              <button
                type="button"
                onClick={() => { onAddOperationalNode("financial"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Financial
              </button>
              <button
                type="button"
                onClick={() => { onAddOperationalNode("projectHealth"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Project Health
              </button>
              <button
                type="button"
                onClick={() => { onAddOperationalNode("pipeline"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Pipeline
              </button>
              <button
                type="button"
                onClick={() => { onAddOperationalNode("teamHealth"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Team Health
              </button>
            </>
          )}

          {activeSubmenu === "ai" && (
            <>
              <button
                type="button"
                onClick={() => { onOpenAIGenerate("mockup"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Generate Mockups
              </button>
              <button
                type="button"
                onClick={() => { onOpenAIGenerate("collateral"); onClose(); }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 13,
                  color: "#d1d5db",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                Generate Collateral
              </button>
            </>
          )}
        </div>
      )}
    </>,
    document.body
  );
}
