"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { SageChatbotNodeData } from "@/lib/atlas-types";

// Global store for sharing chat state between node and modal
const sageChatStores = new Map<string, {
  messages: UIMessage[];
  sendMessage: (message: { text: string }) => Promise<void>;
  status: string;
}>();

export function getSageChatStore(nodeId: string) {
  return sageChatStores.get(nodeId);
}

interface SageAction {
  action: string;
  pills?: Array<{ label: string; color: string; index: number }>;
  arrangement?: string;
  title?: string;
  content?: string;
  projectType?: string;
  suggestion?: Array<{ label: string; color: string }>;
}

function getColorHex(colorName: string): string {
  const colors: Record<string, string> = {
    gray: "#e5e5e5",
    blue: "#93c5fd",
    green: "#86efac",
    yellow: "#fde047",
    orange: "#fdba74",
    red: "#fca5a5",
    purple: "#c4b5fd",
    pink: "#f9a8d4",
  };
  return colors[colorName] || colorName; // Return as-is if already hex
}

export function SageChatbotNode({ id, data, selected, positionAbsoluteX, positionAbsoluteY }: NodeProps) {
  const nodeData = data as SageChatbotNodeData;
  const [inputValue, setInputValue] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState<Array<{ label: string; color: string }> | null>(null);
  
  // Emit event for parent to handle actions
  const emitSageAction = useCallback((action: SageAction) => {
    window.dispatchEvent(new CustomEvent("sage:action", {
      detail: {
        action,
        nodeId: id,
        position: { x: positionAbsoluteX || 0, y: positionAbsoluteY || 0 },
      },
    }));
  }, [id, positionAbsoluteX, positionAbsoluteY]);
  
  const { messages, sendMessage, status } = useChat({
    id: `sage-${id}`,
    transport: new DefaultChatTransport({ api: "/api/sage" }),
    onToolCall: async ({ toolCall }) => {
      const args = toolCall.args as Record<string, unknown>;
      
      if (toolCall.toolName === "createStatusPills") {
        const pills = (args.pills as Array<{ label: string; color: string }>).map((pill, index) => ({
          label: pill.label,
          color: getColorHex(pill.color as string),
          index,
        }));
        emitSageAction({
          action: "createStatusPills",
          pills,
          arrangement: (args.arrangement as string) || "horizontal",
        });
      } else if (toolCall.toolName === "createTextNote") {
        emitSageAction({
          action: "createTextNote",
          title: args.title as string,
          content: args.content as string,
        });
      }
    },
  });

  // Store chat state in global store so modal can access it
  useEffect(() => {
    sageChatStores.set(id, { messages, sendMessage, status });
    return () => {
      // Don't delete on unmount - keep messages available for modal
    };
  }, [id, messages, sendMessage, status]);
  
  // Process tool results from messages to detect suggestions
  React.useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.parts) {
      for (const part of lastMessage.parts) {
        if (part.type === "tool-invocation" && part.toolInvocation?.state === "result") {
          const result = part.toolInvocation.result as SageAction;
          if (result?.action === "suggestWorkflow" && result.suggestion) {
            setPendingSuggestion(result.suggestion);
          }
        }
      }
    }
  }, [messages]);
  
  const isLoading = status === "streaming" || status === "submitted";

  // Helper to extract text from UIMessage parts (AI SDK 6 format)
  const getMessageText = useCallback((msg: typeof messages[0]): string => {
    if (!msg.parts || !Array.isArray(msg.parts)) return "";
    return msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }, []);

  // Handle creating pills from a suggestion
  const handleCreateFromSuggestion = useCallback(() => {
    if (pendingSuggestion) {
      emitSageAction({
        action: "createStatusPills",
        pills: pendingSuggestion.map((pill, index) => ({ ...pill, index })),
        arrangement: "horizontal",
      });
      setPendingSuggestion(null);
    }
  }, [pendingSuggestion, emitSageAction]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) {
      return;
    }
    const messageToSend = inputValue;
    setInputValue("");
    try {
      // In AI SDK 6, sendMessage takes { text } not { content }
      await sendMessage({ text: messageToSend });
    } catch (error) {
      console.error("[v0] Error sending message:", error);
      setInputValue(messageToSend); // Restore input on error
    }
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleSend();
  }, [handleSend]);

  return (
    <div
      className="group rounded-2xl transition-all duration-300 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1c1c1c 0%, #141414 100%)",
        border: selected ? "1.5px solid #F0FE00" : "1px solid rgba(255,255,255,0.08)",
        width: 300,
        minHeight: 220,
        boxShadow: selected 
          ? "0 0 30px rgba(240, 254, 0, 0.15), 0 8px 32px rgba(0,0,0,0.4)" 
          : "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ 
          background: "linear-gradient(180deg, rgba(240, 254, 0, 0.04) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }}
      >
        <div className="flex items-center gap-2">
          <img 
            src="/sage-wordmark.svg" 
            alt="Sage" 
            className="h-5"
          />
          <div 
            className="w-2 h-2 rounded-full"
            style={{ 
              backgroundColor: isLoading ? "#F0FE00" : "#22c55e",
              animation: isLoading ? "pulse 1.5s infinite" : "none"
            }}
          />
          <span className="text-[10px] text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {isLoading ? "Processing..." : "Online"}
          </span>
        </div>
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="19" cy="12" r="1"/>
            <circle cx="5" cy="12" r="1"/>
          </svg>
        </div>
      </div>

      {/* Messages */}
      <div className="px-3 py-3 space-y-2.5 min-h-[140px] max-h-[200px] overflow-y-auto">
        {messages.length > 0 ? (
          messages.slice(-4).map((msg) => {
            const text = getMessageText(msg);
            if (!text) return null;
            return (
              <div
                key={msg.id}
                className={`text-xs leading-relaxed px-3 py-2 rounded-xl ${
                  msg.role === "user"
                    ? "ml-6"
                    : "mr-6"
                }`}
                style={{
                  backgroundColor: msg.role === "user" 
                    ? "rgba(255,255,255,0.06)" 
                    : "rgba(240, 254, 0, 0.08)",
                  color: msg.role === "user" ? "#e5e5e5" : "#d4d4d4",
                  fontFamily: "system-ui, Inter, sans-serif",
                  border: msg.role === "assistant" ? "1px solid rgba(240, 254, 0, 0.12)" : "none",
                }}
              >
                {text.length > 120 ? text.slice(0, 120) + "..." : text}
              </div>
            );
          })
        ) : (
          <div 
            className="flex flex-col items-center justify-center py-6 px-4 text-center"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, rgba(240, 254, 0, 0.15) 0%, rgba(240, 254, 0, 0.05) 100%)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0FE00" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your operational intelligence layer
            </p>
            <p className="text-[10px] text-gray-600 mt-1">
              Surfaces patterns, preserves intent, executes tasks
            </p>
          </div>
        )}
        {isLoading && !messages.length && (
          <div className="flex items-center gap-2 px-3 py-2 mr-6 rounded-xl" style={{ backgroundColor: "rgba(240, 254, 0, 0.08)", border: "1px solid rgba(240, 254, 0, 0.12)" }}>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F0FE00] animate-bounce" style={{ animationDelay: "0ms" }}/>
              <div className="w-1.5 h-1.5 rounded-full bg-[#F0FE00] animate-bounce" style={{ animationDelay: "150ms" }}/>
              <div className="w-1.5 h-1.5 rounded-full bg-[#F0FE00] animate-bounce" style={{ animationDelay: "300ms" }}/>
            </div>
            <span className="text-xs text-[#F0FE00]" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Thinking</span>
          </div>
        )}
        
        {/* Show pending suggestion with action buttons */}
        {pendingSuggestion && (
          <div className="mt-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(240, 254, 0, 0.06)", border: "1px solid rgba(240, 254, 0, 0.15)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-white font-medium" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Suggested Statuses
              </div>
              <button
                onClick={() => setPendingSuggestion(null)}
                className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {pendingSuggestion.map((pill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: pill.color, color: "#000" }}
                >
                  {pill.label}
                </span>
              ))}
            </div>
            <button
              onClick={handleCreateFromSuggestion}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
              style={{ 
                background: "linear-gradient(135deg, #F0FE00 0%, #d4e600 100%)", 
                color: "#000",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            >
              Add to Canvas
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div 
        className="px-3 pb-3 pt-2 nodrag" 
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
          style={{ 
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              e.stopPropagation();
              setInputValue(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Ask Sage anything..."
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none nowheel nopan"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={isLoading || !inputValue.trim()}
            className="p-1.5 rounded-lg transition-all disabled:opacity-30"
            style={{ 
              backgroundColor: inputValue.trim() ? "rgba(240, 254, 0, 0.15)" : "transparent",
              color: "#F0FE00" 
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{ background: "#141414", border: "2px solid #F0FE00", width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{ background: "#141414", border: "2px solid #F0FE00", width: 10, height: 10 }}
      />
    </div>
  );
}
