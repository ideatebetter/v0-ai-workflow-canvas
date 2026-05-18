"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { SageChatbotNodeData } from "@/lib/atlas-types";

// Attachment type for uploaded files
interface ChatAttachment {
  name: string;
  type: string;
  url: string;
  size: number;
}

// Global store for sharing chat state between node and modal
const sageChatStores = new Map<string, {
  messages: UIMessage[];
  sendMessage: (message: { text: string }) => Promise<void>;
  status: string;
  attachments: ChatAttachment[];
  addAttachment: (attachment: ChatAttachment) => void;
  clearAttachments: () => void;
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
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // File upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const { upload } = await import("@vercel/blob/client");
      
      for (const file of Array.from(files)) {
        // Only allow images and text files
        const isImage = file.type.startsWith("image/");
        const isText = file.type.startsWith("text/") || 
                       file.name.endsWith(".txt") || 
                       file.name.endsWith(".md") ||
                       file.name.endsWith(".json");
        
        if (!isImage && !isText) {
          console.warn("[v0] Skipping unsupported file type:", file.type);
          continue;
        }

        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload/client",
        });

        const newAttachment: ChatAttachment = {
          name: file.name,
          type: file.type,
          url: blob.url,
          size: file.size,
        };

        setAttachments(prev => [...prev, newAttachment]);
      }
    } catch (error) {
      console.error("[v0] Error uploading file:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  const addAttachment = useCallback((attachment: ChatAttachment) => {
    setAttachments(prev => [...prev, attachment]);
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Store chat state in global store so modal can access it
  useEffect(() => {
    sageChatStores.set(id, { messages, sendMessage, status, attachments, addAttachment, clearAttachments });
    return () => {
      // Don't delete on unmount - keep messages available for modal
    };
  }, [id, messages, sendMessage, status, attachments, addAttachment, clearAttachments]);
  
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
    if ((!inputValue.trim() && attachments.length === 0) || isLoading) {
      return;
    }
    
    // Build message with attachments context
    let messageToSend = inputValue;
    if (attachments.length > 0) {
      const attachmentInfo = attachments.map(a => {
        if (a.type.startsWith("image/")) {
          return `[Image: ${a.name}](${a.url})`;
        }
        return `[File: ${a.name}](${a.url})`;
      }).join("\n");
      messageToSend = attachments.length > 0 && inputValue.trim() 
        ? `${inputValue}\n\nAttachments:\n${attachmentInfo}`
        : `Attached files:\n${attachmentInfo}`;
    }
    
    setInputValue("");
    setAttachments([]);
    
    try {
      await sendMessage({ text: messageToSend });
    } catch (error) {
      console.error("[v0] Error sending message:", error);
      setInputValue(inputValue);
      setAttachments(attachments);
    }
  }, [inputValue, attachments, isLoading, sendMessage]);

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
      className="group transition-all duration-500 ease-out overflow-hidden"
      style={{
        background: "rgba(28, 28, 30, 0.85)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderRadius: 20,
        border: selected ? "1px solid rgba(240, 254, 0, 0.5)" : "1px solid rgba(255,255,255,0.08)",
        width: 320,
        minHeight: 240,
        boxShadow: selected 
          ? "0 0 0 4px rgba(240, 254, 0, 0.1), 0 25px 50px -12px rgba(0,0,0,0.5)" 
          : "0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset",
      }}
    >
      {/* Header - Apple style minimal */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <img 
            src="/sage-wordmark.svg" 
            alt="Sage" 
            className="h-5 opacity-90"
          />
          <div className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full transition-colors duration-300"
              style={{ 
                backgroundColor: isLoading ? "#F0FE00" : "#30D158",
                boxShadow: isLoading ? "0 0 8px rgba(240, 254, 0, 0.5)" : "0 0 8px rgba(48, 209, 88, 0.4)"
              }}
            />
            <span 
              className="text-[11px] font-medium tracking-tight transition-colors duration-300"
              style={{ 
                color: isLoading ? "rgba(240, 254, 0, 0.8)" : "rgba(255,255,255,0.4)",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
              }}
            >
              {isLoading ? "Thinking" : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Subtle divider */}
      <div className="mx-5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />

      {/* Messages - Clean, spacious */}
      <div className="px-4 py-4 space-y-3 min-h-[160px] max-h-[220px] overflow-y-auto">
        {messages.length > 0 ? (
          messages.slice(-4).map((msg) => {
            const text = getMessageText(msg);
            if (!text) return null;
            return (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="text-[13px] leading-relaxed px-4 py-2.5 max-w-[85%]"
                  style={{
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    backgroundColor: msg.role === "user" 
                      ? "rgba(240, 254, 0, 0.15)" 
                      : "rgba(255,255,255,0.06)",
                    color: msg.role === "user" ? "rgba(240, 254, 0, 0.95)" : "rgba(255,255,255,0.85)",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {text.length > 120 ? text.slice(0, 120) + "..." : text}
                </div>
              </div>
            );
          })
        ) : (
          <div 
            className="flex flex-col items-center justify-center py-8 px-6"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            <p className="text-[13px] text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "-0.01em" }}>
              Your operational intelligence layer.
            </p>
            <p className="text-[11px] text-center mt-1.5" style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.01em" }}>
              Surfaces patterns. Preserves intent. Executes tasks.
            </p>
          </div>
        )}
        
        {/* Typing indicator - Apple style */}
        {isLoading && !messages.length && (
          <div className="flex justify-start">
            <div 
              className="flex items-center gap-1 px-4 py-3 rounded-2xl"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "rgba(240, 254, 0, 0.6)", animationDelay: "0ms", animationDuration: "1s" }}/>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "rgba(240, 254, 0, 0.6)", animationDelay: "200ms", animationDuration: "1s" }}/>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "rgba(240, 254, 0, 0.6)", animationDelay: "400ms", animationDuration: "1s" }}/>
              </div>
            </div>
          </div>
        )}
        
        {/* Suggestion card - Refined */}
        {pendingSuggestion && (
          <div 
            className="mt-3 p-4 rounded-2xl"
            style={{ 
              backgroundColor: "rgba(240, 254, 0, 0.04)",
              border: "1px solid rgba(240, 254, 0, 0.1)"
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span 
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(240, 254, 0, 0.7)", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
              >
                Suggested
              </span>
              <button
                onClick={() => setPendingSuggestion(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {pendingSuggestion.map((pill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: pill.color, color: "#000", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                >
                  {pill.label}
                </span>
              ))}
            </div>
            <button
              onClick={handleCreateFromSuggestion}
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 active:scale-[0.98]"
              style={{ 
                background: "#F0FE00", 
                color: "#000",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              }}
            >
              Add to Canvas
            </button>
          </div>
        )}
      </div>

      {/* Input - Apple style pill */}
      <div className="px-4 pb-4 pt-2 nodrag">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]"
                style={{ backgroundColor: "rgba(240, 254, 0, 0.1)", border: "1px solid rgba(240, 254, 0, 0.2)" }}
              >
                {attachment.type.startsWith("image/") ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[#F0FE00]">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
                    <path d="M2 11l3-3 2 2 4-4 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[#F0FE00]">
                    <path d="M9 2H4C3.44772 2 3 2.44772 3 3V13C3 13.5523 3.44772 14 4 14H12C12.5523 14 13 13.5523 13 13V6L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 2V6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                <span className="text-[#F0FE00] max-w-[80px] truncate">{attachment.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-0.5 hover:bg-white/10 rounded p-0.5 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-[#F0FE00]/60">
                    <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.txt,.md,.json,text/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        
        <div 
          className="flex items-center gap-2 px-3 py-2.5 transition-all duration-200"
          style={{ 
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Attachment button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isLoading || isUploading}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white/10 disabled:opacity-30"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {isUploading ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="animate-spin">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M14 10V12.6667C14 13.403 13.403 14 12.6667 14H3.33333C2.59695 14 2 13.403 2 12.6667V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.3333 5.33333L8 2L4.66667 5.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 2V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          
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
            placeholder="Message Sage..."
            className="flex-1 bg-transparent text-[13px] text-white placeholder-white/30 outline-none nowheel nopan"
            style={{ 
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              letterSpacing: "-0.01em"
            }}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-20 active:scale-90"
            style={{ 
              backgroundColor: (inputValue.trim() || attachments.length > 0) ? "#F0FE00" : "rgba(255,255,255,0.1)",
              color: (inputValue.trim() || attachments.length > 0) ? "#000" : "rgba(255,255,255,0.3)"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Handles - Minimal */}
      <Handle
        type="target"
        position={Position.Left}
        className="!opacity-0 group-hover:!opacity-100 transition-all duration-300 !cursor-pointer"
        style={{ background: "rgba(28, 28, 30, 0.9)", border: "2px solid rgba(240, 254, 0, 0.6)", width: 10, height: 10, borderRadius: 5 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!opacity-0 group-hover:!opacity-100 transition-all duration-300 !cursor-pointer"
        style={{ background: "rgba(28, 28, 30, 0.9)", border: "2px solid rgba(240, 254, 0, 0.6)", width: 10, height: 10, borderRadius: 5 }}
      />
    </div>
  );
}
