"use client";

import React, { useState } from "react";
import type { AtlasNode, CanvasComment, FileNodeData, TaskItem } from "@/lib/atlas-types";

const FONT = { fontFamily: "system-ui, Inter, sans-serif" };
const YELLOW = "var(--app-text-primary)";

interface TodoEntry {
  task: TaskItem;
  nodeId: string;
  nodeLabel: string;
}

function collectTodos(nodes: AtlasNode[]): TodoEntry[] {
  const entries: TodoEntry[] = [];
  for (const node of nodes) {
    if (node.type !== "file") continue;
    const d = node.data as FileNodeData;
    const tasks = d.tasks ?? [];
    for (const task of tasks) {
      if (!task.completed) {
        entries.push({ task, nodeId: node.id, nodeLabel: d.label || d.fileName || "File" });
      }
    }
  }
  return entries;
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface ActivitySidePanelProps {
  nodes: AtlasNode[];
  comments: CanvasComment[];
  onClose: () => void;
}

export function ActivitySidePanel({ nodes, comments, onClose }: ActivitySidePanelProps) {
  const [tab, setTab] = useState<"todos" | "activity">("todos");
  const todos = collectTodos(nodes);
  const unresolved = comments.filter(c => !c.resolved);

  return (
    <div
      className="flex flex-col h-full"
      style={{ ...FONT, backgroundColor: "var(--app-card)", borderLeft: "1px solid var(--app-border-strong)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--app-border-strong)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--app-card-elevated)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-muted)" strokeWidth="1.8">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div>
            <div className="text-foreground font-semibold text-sm">Canvas Activity</div>
            <div className="text-[10px] text-gray-500">To-dos &amp; feedback</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--app-text-muted)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex px-4 pt-3 pb-2 gap-1 flex-shrink-0">
        {(["todos", "activity"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: tab === t ? YELLOW : "transparent",
              color: tab === t ? "var(--app-bg-elevated)" : "var(--app-text-muted)",
            }}
          >
            {t === "todos" ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                To-Dos
                {todos.length > 0 && (
                  <span className="min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-semibold px-1"
                    style={{ backgroundColor: tab === t ? "var(--app-bg-elevated)30" : "var(--app-text-primary)18", color: tab === t ? "var(--app-bg-elevated)" : "var(--app-text-secondary)" }}>
                    {todos.length}
                  </span>
                )}
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Activity
                {unresolved.length > 0 && (
                  <span className="min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-semibold px-1"
                    style={{ backgroundColor: tab === t ? "var(--app-bg-elevated)30" : "var(--app-text-primary)18", color: tab === t ? "var(--app-bg-elevated)" : "var(--app-text-secondary)" }}>
                    {unresolved.length}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === "todos" ? (
          <TodosTab todos={todos} />
        ) : (
          <ActivityTab comments={comments} />
        )}
      </div>
    </div>
  );
}

// ── To-Dos tab ──────────────────────────────────────────────────────────────

function TodosTab({ todos }: { todos: TodoEntry[] }) {
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12 px-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-faint)" strokeWidth="1.5">
            <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">No open to-dos</p>
          <p className="text-[10px] text-gray-600 mt-1">Tasks on file nodes will appear here</p>
        </div>
      </div>
    );
  }

  // Group by node
  const byNode = new Map<string, { label: string; todos: TodoEntry[] }>();
  for (const entry of todos) {
    if (!byNode.has(entry.nodeId)) byNode.set(entry.nodeId, { label: entry.nodeLabel, todos: [] });
    byNode.get(entry.nodeId)!.todos.push(entry);
  }

  return (
    <div className="px-4 py-3 space-y-4">
      {[...byNode.entries()].map(([nodeId, group]) => (
        <div key={nodeId}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--app-text-primary)" }} />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate">{group.label}</span>
          </div>
          <div className="space-y-1.5">
            {group.todos.map(({ task }) => (
              <div key={task.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}>
                <div className="w-4 h-4 rounded border flex-shrink-0 mt-0.5" style={{ borderColor: "var(--app-text-faint)", backgroundColor: "transparent" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-gray-200 leading-snug">{task.title}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                          style={{ backgroundColor: task.assignee.color || "var(--app-text-faint)", color: "var(--app-text-primary)" }}>
                          {task.assignee.name.charAt(0)}
                        </div>
                        <span className="text-[9px] text-gray-500">{task.assignee.name}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--app-text-primary)0a", color: "var(--app-text-muted)" }}>
                        Due {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Activity tab ─────────────────────────────────────────────────────────────

function ActivityTab({ comments }: { comments: CanvasComment[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12 px-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--app-card-elevated)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-faint)" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">No comments yet</p>
          <p className="text-[10px] text-gray-600 mt-1">Use comment mode to leave feedback on the canvas</p>
        </div>
      </div>
    );
  }

  const sorted = [...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="px-4 py-3 space-y-2">
      {sorted.map(comment => {
        const isExpanded = expandedId === comment.id;
        const totalReplies = comment.replies?.length ?? 0;

        return (
          <div key={comment.id} className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "var(--app-card-elevated)", border: `1px solid ${comment.resolved ? "var(--app-border-strong)" : "#2e2e2e"}` }}>

            {/* Comment header */}
            <div className="flex items-start gap-2.5 px-3 py-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5"
                style={{ backgroundColor: comment.author?.color || "var(--app-text-faint)", color: "var(--app-text-primary)" }}>
                {comment.author?.name?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-gray-300 truncate">{comment.author?.name ?? "Unknown"}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {comment.resolved && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: "#22c55e18", color: "#22c55e" }}>Resolved</span>
                    )}
                    <span className="text-[9px] text-gray-600 flex-shrink-0">{fmtRelative(comment.createdAt)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">{comment.content}</p>
              </div>
            </div>

            {/* Replies */}
            {totalReplies > 0 && (
              <div style={{ borderTop: "1px solid var(--app-border)" }}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : comment.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                  style={{ ...FONT }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-faint)" strokeWidth="2"
                    className="transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  <span className="text-[9px] text-gray-600">{totalReplies} {totalReplies === 1 ? "reply" : "replies"}</span>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-2.5 space-y-2" style={{ borderTop: "1px solid var(--app-card-elevated)" }}>
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="flex items-start gap-2 pt-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: reply.author?.color || "var(--app-text-faint)", color: "var(--app-text-primary)" }}>
                          {reply.author?.name?.charAt(0) ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-semibold text-gray-400">{reply.author?.name}</span>
                            <span className="text-[8px] text-gray-600">{fmtRelative(reply.createdAt)}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
