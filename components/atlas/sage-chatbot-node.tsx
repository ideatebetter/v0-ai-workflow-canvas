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
      className="group rounded-xl transition-all duration-200"
      style={{
        backgroundColor: "#1a1a1a",
        border: selected ? "2px solid #F0FE00" : "1px solid #F0FE0030",
        width: 280,
        minHeight: 200,
      }}
>
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={{ borderColor: "#F0FE0020" }}
      >
        <img 
          src="/sage-logo.svg" 
          alt="Sage" 
          className="w-6 h-6"
        />
        <span className="text-sm font-medium text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          Sage
        </span>
      </div>

      {/* Messages */}
      <div className="p-2 space-y-2 max-h-[180px] overflow-y-auto">
        {messages.length > 0 ? (
          messages.slice(-4).map((msg) => {
            const text = getMessageText(msg);
            if (!text) return null;
            return (
              <div
                key={msg.id}
                className={`text-xs px-2 py-1.5 rounded-lg ${
                  msg.role === "user"
                    ? "bg-white/5 text-gray-300 ml-4"
                    : "text-gray-400 mr-4"
                }`}
                style={{
                  backgroundColor: msg.role === "assistant" ? "#F0FE0010" : undefined,
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                {text.length > 120 ? text.slice(0, 120) + "..." : text}
              </div>
            );
          })
        ) : (
          <div className="text-xs text-gray-500 text-center py-4 px-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Your AI creative assistant. Ask Sage to generate status labels, organize assets, or brainstorm ideas for your project.
          </div>
        )}
        {isLoading && (
          <div className="text-xs text-[#F0FE00] px-2 py-1.5 mr-4" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Sage is thinking...
          </div>
        )}
        
        {/* Show pending suggestion with action buttons */}
        {pendingSuggestion && (
          <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: "#F0FE0015", border: "1px solid #F0FE0040" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-white font-medium" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Suggested Statuses
              </div>
              <button
                onClick={() => setPendingSuggestion(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {pendingSuggestion.map((pill, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: pill.color, color: "#000" }}
                >
                  {pill.label}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-gray-400 mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Reply to modify, or click below to add to canvas
            </div>
            <button
              onClick={handleCreateFromSuggestion}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
              style={{ 
                backgroundColor: "#F0FE00", 
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
      <div className="p-2 border-t nodrag" style={{ borderColor: "#F0FE0020" }}>
        <div className="flex items-center gap-2">
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
            placeholder="Ask Sage..."
            className="flex-1 bg-white/5 text-xs text-white placeholder-gray-500 px-2 py-1.5 rounded-md outline-none nowheel nopan"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={isLoading || !inputValue.trim()}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50"
            style={{ color: "#F0FE00" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #F0FE00", width: 12, height: 12 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!opacity-0 group-hover:!opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #F0FE00", width: 12, height: 12 }}
      />
    </div>
  );
}
