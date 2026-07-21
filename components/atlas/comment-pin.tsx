"use client";

import React, { useState, useRef, useEffect } from "react";
import type { CanvasComment, CommentReply, WorkspaceMember } from "@/lib/atlas-types";
import { WORKSPACE_MEMBERS } from "@/lib/atlas-types";

interface CommentPinProps {
  comment: CanvasComment;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (comment: CanvasComment) => void;
  onDelete: () => void;
  currentUser: WorkspaceMember;
}

export function CommentPin({ comment, isSelected, onSelect, onUpdate, onDelete, currentUser }: CommentPinProps) {
  const [replyText, setReplyText] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Don't close if clicking on the pin itself
        const target = event.target as HTMLElement;
        if (!target.closest(`[data-comment-id="${comment.id}"]`)) {
          // We don't close here, let parent handle selection
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [comment.id]);

  const handleReply = () => {
    if (!replyText.trim()) return;

    const newReply: CommentReply = {
      id: `reply-${Date.now()}`,
      content: replyText.trim(),
      author: currentUser,
      createdAt: new Date().toISOString(),
    };

    onUpdate({
      ...comment,
      replies: [...comment.replies, newReply],
    });
    setReplyText("");
  };

  const handleResolve = () => {
    onUpdate({
      ...comment,
      resolved: !comment.resolved,
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      data-comment-id={comment.id}
      className="z-30"
      style={{
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Pin marker */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${
          comment.resolved ? "opacity-50" : ""
        }`}
        style={{
          backgroundColor: isSelected ? "var(--app-text-primary)" : comment.author.avatar ? "transparent" : "var(--app-text-primary)",
          border: isSelected ? "2px solid #F0FE00" : "2px solid var(--app-border-strong)",
          boxShadow: isSelected ? "0 0 0 4px rgba(240, 254, 0, 0.3)" : "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {comment.author.avatar ? (
          <img
            src={comment.author.avatar}
            alt={comment.author.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--app-bg-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
          >
            {comment.author.initials}
          </span>
        )}
        
        {/* Reply count badge */}
        {comment.replies.length > 0 && !isSelected && (
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium"
            style={{ backgroundColor: "var(--app-canvas-dot)", color: "var(--app-text-primary)" }}
          >
            {comment.replies.length}
          </div>
        )}

        {/* Resolved checkmark */}
        {comment.resolved && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#22c55e" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </button>

      {/* Comment thread panel */}
      {isSelected && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-2 w-72 rounded-xl overflow-hidden shadow-2xl"
          style={{
            backgroundColor: "var(--app-card)",
            border: "1px solid var(--app-border-strong)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--app-border-strong)" }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResolve}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  comment.resolved
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/10 text-gray-400 hover:text-foreground"
                }`}
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {comment.resolved ? "Resolved" : "Resolve"}
              </button>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.75 3.5H12.25M11.0833 3.5V11.6667C11.0833 12.25 10.5 12.8333 9.91667 12.8333H4.08333C3.5 12.8333 2.91667 12.25 2.91667 11.6667V3.5M4.66667 3.5V2.33333C4.66667 1.75 5.25 1.16667 5.83333 1.16667H8.16667C8.75 1.16667 9.33333 1.75 9.33333 2.33333V3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="max-h-64 overflow-y-auto p-3 space-y-3">
            {/* Original comment */}
            <div className="flex gap-2">
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-medium"
                style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)" }}
              >
                {comment.author.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium text-foreground"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    {comment.author.name}
                  </span>
                  <span
                    className="text-[10px] text-gray-500"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    {formatTime(comment.createdAt)}
                  </span>
                </div>
                <p
                  className="text-sm text-gray-300 mt-0.5 leading-relaxed"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  {comment.content}
                </p>
              </div>
            </div>

            {/* Replies */}
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex gap-2 pl-4">
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-medium"
                  style={{ backgroundColor: "var(--app-canvas-dot)", color: "var(--app-text-primary)" }}
                >
                  {reply.author.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium text-foreground"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      {reply.author.name}
                    </span>
                    <span
                      className="text-[10px] text-gray-500"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      {formatTime(reply.createdAt)}
                    </span>
                  </div>
                  <p
                    className="text-sm text-gray-400 mt-0.5 leading-relaxed"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    {reply.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply input */}
          <div
            className="p-2"
            style={{ borderTop: "1px solid var(--app-border-strong)" }}
          >
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
                placeholder="Reply..."
                className="flex-1 bg-transparent text-xs text-foreground placeholder-gray-500 focus:outline-none"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              />
              <button
                type="button"
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="p-1 rounded transition-colors disabled:opacity-30"
                style={{ color: replyText.trim() ? "var(--app-text-primary)" : "var(--app-text-muted)" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.25 1.75L6.125 7.875M12.25 1.75L8.75 12.25L6.125 7.875M12.25 1.75L1.75 5.25L6.125 7.875" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NewCommentInputProps {
  position: { x: number; y: number };
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export function NewCommentInput({ position, onSubmit, onCancel }: NewCommentInputProps) {
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
    }
  };

  return (
    <div
      className="z-40"
      style={{
        transform: "translate(-50%, -50%)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Pin preview */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center mb-2 mx-auto"
        style={{
          backgroundColor: "var(--app-text-primary)",
          border: "2px solid #F0FE00",
          boxShadow: "0 0 0 4px rgba(240, 254, 0, 0.3), 0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 3V11M3 7H11" stroke="var(--app-bg-elevated)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Input panel */}
      <div
        className="w-64 rounded-xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: "var(--app-card)",
          border: "1px solid var(--app-border-strong)",
        }}
      >
        <div className="p-3">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onCancel();
            }}
            placeholder="Add a comment..."
            className="w-full bg-transparent text-sm text-foreground placeholder-gray-500 focus:outline-none"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          />
        </div>
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--app-border-strong)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-foreground transition-colors"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
            style={{
              backgroundColor: content.trim() ? "var(--app-text-primary)" : "var(--app-canvas-dot)",
              color: content.trim() ? "var(--app-bg-elevated)" : "var(--app-text-muted)",
              fontFamily: "system-ui, Inter, sans-serif",
            }}
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
