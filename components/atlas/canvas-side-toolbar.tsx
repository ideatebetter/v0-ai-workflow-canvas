"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, LayoutGrid, Presentation, X, Search, Plus, Settings, Send } from "lucide-react";
import { AddNodeMenu } from "./add-node-menu";

interface CanvasSideToolbarProps {
  onAddStatusPill: () => void;
  onAddTextNode: () => void;
  onAddSageNode: (sageType: "chatbot" | "overview" | "stakeholder") => void;
  onAddOperationalNode: (opType: "capacity" | "financial" | "projectHealth" | "pipeline" | "teamHealth", scope: "org" | "project", projectId?: string, projectName?: string) => void;
  onUploadFile: (files: FileList) => void;
  onOpenAIGenerate: (type: "mockup" | "collateral") => void;
  onAddLink?: (url: string) => void;
  onSettingsClick: () => void;
  onShareClick?: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  commentMode: boolean;
  onCommentModeChange: (enabled: boolean) => void;
  commentCount: number;
  presentationMode: boolean;
  onPresentationModeChange: (enabled: boolean) => void;
  onStartPresentation: () => void;
  presentationEdgeCount: number;
  hasPlayableFlow: boolean;
  onActivityClick: () => void;
  activityOpen: boolean;
  todoCount: number;
  activityCount: number;
}

export function CanvasSideToolbar({
  onAddStatusPill,
  onAddTextNode,
  onAddSageNode,
  onAddOperationalNode,
  onUploadFile,
  onOpenAIGenerate,
  onAddLink,
  onSettingsClick,
  onShareClick,
  onSearchChange,
  searchQuery,
  commentMode,
  onCommentModeChange,
  commentCount,
  presentationMode,
  onPresentationModeChange,
  onStartPresentation,
  presentationEdgeCount,
  hasPlayableFlow,
  onActivityClick,
  activityOpen,
  todoCount,
  activityCount,
}: CanvasSideToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuPosition, setAddMenuPosition] = useState({ x: 0, y: 0 });
  const [showSearch, setShowSearch] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        if (!searchQuery) {
          setShowSearch(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  const handleOpenAddMenu = () => {
    if (addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      // Position menu to the left of the button, ensure it stays on screen
      const menuWidth = 180;
      const x = Math.max(10, rect.left - menuWidth - 20);
      const y = Math.max(10, rect.top);
      const newPos = { x, y };
      console.log("[v0] Menu position:", newPos, "button rect:", rect);
      setAddMenuPosition(newPos);
    }
    setShowAddMenu(true);
  };

  return (
    <div
      className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 rounded-xl z-40 bg-card border border-border shadow-lg"
    >
      {/* Comment Mode Toggle */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onCommentModeChange(!commentMode)}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            commentMode ? "text-[var(--app-bg-elevated)]" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          style={{
            backgroundColor: commentMode ? "var(--app-text-primary)" : "transparent",
          }}
          title={commentMode ? "Exit comment mode" : "Add comment (click anywhere on canvas)"}
        >
          <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
        </button>
        
        {/* Comment count badge */}
        {commentCount > 0 && !commentMode && (
          <div
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-medium px-1"
            style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)" }}
          >
            {commentCount}
          </div>
        )}
      </div>

      {/* Activity Panel */}
      <div className="relative">
        <button
          type="button"
          onClick={onActivityClick}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            activityOpen ? "text-[var(--app-bg-elevated)]" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          style={{ backgroundColor: activityOpen ? "var(--app-text-primary)" : "transparent" }}
          title="Canvas activity & to-dos"
        >
          <LayoutGrid className="w-4 h-4" strokeWidth={1.8} />
        </button>
        {/* Badge: todos + unresolved comments */}
        {(todoCount + activityCount > 0) && !activityOpen && (
          <div
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-medium px-1"
            style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)" }}
          >
            {todoCount + activityCount}
          </div>
        )}
      </div>

      {/* Presentation Mode */}
      <div className="relative">
        {/* Main presentation button */}
        <button
          type="button"
          onClick={() => {
            if (presentationMode) {
              if (hasPlayableFlow) {
                onStartPresentation();
              } else {
                onPresentationModeChange(false);
              }
            } else {
              onPresentationModeChange(true);
            }
          }}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            presentationMode ? "text-[var(--app-bg-elevated)]" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          style={{
            backgroundColor: presentationMode ? "var(--app-text-primary)" : "transparent",
          }}
          title={presentationMode ? (hasPlayableFlow ? "Start presentation" : "Exit presentation mode") : "Build presentation"}
        >
          <Presentation className="w-5 h-5" strokeWidth={1.5} />
        </button>
        
        {/* Exit button when in presentation mode */}
        {presentationMode && (
          <button
            type="button"
            onClick={() => onPresentationModeChange(false)}
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[var(--app-bg-elevated)] hover:scale-110 transition-transform"
            style={{ backgroundColor: "var(--app-text-primary)" }}
            title="Exit presentation builder"
          >
            <X className="w-2 h-2" strokeWidth={1.5} />
          </button>
        )}
        
        {/* Presentation edge count badge */}
        {presentationEdgeCount > 0 && presentationMode && (
          <div
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-medium px-1"
            style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)" }}
          >
            {presentationEdgeCount}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative" ref={searchRef}>
        <button
          type="button"
          onClick={() => setShowSearch(!showSearch)}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            showSearch ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Search canvas"
        >
          <Search className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {showSearch && (
          <div
            className="absolute right-full mr-2 top-0 flex items-center rounded-lg overflow-hidden bg-card border border-border"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search nodes..."
              className="w-48 px-3 py-2 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px mx-1 bg-border" />

      {/* Add Node */}
      <div className="relative">
        <button
          ref={addButtonRef}
          type="button"
          onClick={handleOpenAddMenu}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            showAddMenu ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Add node"
        >
          <Plus className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      {/* Draggable Add Node Menu */}
      {showAddMenu && (
        <AddNodeMenu
          onAddStatusPill={onAddStatusPill}
          onAddTextNode={onAddTextNode}
          onAddSageNode={onAddSageNode}
          onAddOperationalNode={onAddOperationalNode}
          onUploadFile={onUploadFile}
          onOpenAIGenerate={onOpenAIGenerate}
          onAddLink={onAddLink}
          onClose={() => setShowAddMenu(false)}
          position={addMenuPosition}
        />
      )}

      {/* Divider */}
      <div className="h-px mx-1 bg-border" />

      {/* Settings */}
      <button
        type="button"
        onClick={onSettingsClick}
        className="flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Settings"
      >
        <Settings className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Share */}
      {onShareClick && (
        <>
          <div className="h-px mx-1 bg-border" />
          <button
            type="button"
            onClick={onShareClick}
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95"
            title="Share this canvas"
          >
            <Send className="w-4 h-4" strokeWidth={1.4} />
          </button>
        </>
      )}

      {/* Comment mode indicator */}
      {commentMode && (
        <div
          className="absolute -left-36 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg whitespace-nowrap"
          style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)" }}
        >
          <span className="text-xs font-medium" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Click to comment
          </span>
        </div>
      )}
    </div>
  );
}
