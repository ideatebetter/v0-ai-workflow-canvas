"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { UIMessage } from "@ai-sdk/react";

import { getSageChatStore } from "./sage-chatbot-node";

// Attachment type for uploaded files
interface ChatAttachment {
  name: string;
  type: string;
  url: string;
  size: number;
}

interface SageAction {
  action: string;
  suggestion?: Array<{ label: string; color: string }>;
}

interface SageExpandedModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeType: "sageChatbot" | "sageOverview" | "stakeholder";
}

export function SageExpandedModal({
  isOpen,
  onClose,
  nodeId,
  nodeType,
}: SageExpandedModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState<Array<{ label: string; color: string }> | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get shared chat state from the node's store
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<string>("ready");
  const sendMessageRef = useRef<((message: { text: string }) => Promise<void>) | null>(null);

  // Poll for updates from the shared store
  useEffect(() => {
    const updateFromStore = () => {
      const store = getSageChatStore(nodeId);
      if (store) {
        setMessages(store.messages);
        setStatus(store.status);
        sendMessageRef.current = store.sendMessage;
      }
    };

    // Initial load
    updateFromStore();

    // Poll for updates while modal is open
    const interval = setInterval(updateFromStore, 100);
    return () => clearInterval(interval);
  }, [nodeId]);

  // Process tool results from messages to detect suggestions
  useEffect(() => {
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // File upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  }, []);

  // Process files for upload (used by both file input and drag-drop)
  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const { upload } = await import("@vercel/blob/client");
      
      for (const file of files) {
        // Allow images, text files, and PDFs
        const isImage = file.type.startsWith("image/");
        const isPDF = file.type === "application/pdf" || file.name.endsWith(".pdf");
        const isText = file.type.startsWith("text/") || 
                       file.name.endsWith(".txt") || 
                       file.name.endsWith(".md") ||
                       file.name.endsWith(".json");
        
        if (!isImage && !isText && !isPDF) {
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

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const isLoading = status === "streaming" || status === "submitted";

  const getMessageText = useCallback((msg: typeof messages[0]): string => {
    if (!msg.parts || !Array.isArray(msg.parts)) return "";
    return msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }, []);

  const handleCreateFromSuggestion = useCallback(async () => {
    if (pendingSuggestion && sendMessageRef.current) {
      // Send a confirmation message which will trigger the node to create pills
      await sendMessageRef.current({ text: "Yes, add those statuses to my canvas" });
      setPendingSuggestion(null);
    }
  }, [pendingSuggestion]);

  const handleSend = useCallback(async () => {
    if ((!inputValue.trim() && attachments.length === 0) || isLoading || !sendMessageRef.current) return;
    
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
      await sendMessageRef.current({ text: messageToSend });
    } catch (error) {
      console.error("[v0] Error sending message:", error);
      setInputValue(inputValue);
    }
  }, [inputValue, attachments, isLoading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!isOpen) return null;

  const getTitle = () => {
    switch (nodeType) {
      case "sageChatbot": return "Sage Assistant";
      case "sageOverview": return "Project Overview";
      case "stakeholder": return "Stakeholder Analysis";
      default: return "Sage";
    }
  };

  const getIcon = () => {
    switch (nodeType) {
      case "sageChatbot":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0FE00" strokeWidth="2">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z" />
            <circle cx="12" cy="10" r="3" />
            <path d="M7 20.662V19c0-2.21 2.239-4 5-4s5 1.79 5 4v1.662" />
          </svg>
        );
      case "sageOverview":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0FE00" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18 17l-5-5-4 4-3-3" />
          </svg>
        );
      case "stakeholder":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F0FE00" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col ${isDragOver ? "ring-2 ring-[#F0FE00]" : ""}`}
        style={{
          backgroundColor: isDragOver ? "rgba(240, 254, 0, 0.02)" : "#0a0a0a",
          border: isDragOver ? "1px solid rgba(240, 254, 0, 0.5)" : "1px solid #F0FE0030",
          boxShadow: "0 0 60px rgba(240, 254, 0, 0.1)",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl pointer-events-none" style={{ background: "rgba(240, 254, 0, 0.05)" }}>
            <div className="text-[#F0FE00] text-base font-medium flex items-center gap-3">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
                <path d="M14 10V12.6667C14 13.403 13.403 14 12.6667 14H3.33333C2.59695 14 2 13.403 2 12.6667V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.3333 5.33333L8 2L4.66667 5.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 2V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Drop files here
            </div>
          </div>
        )}
        
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between border-b shrink-0"
          style={{ borderColor: "#F0FE0020", backgroundColor: "#111111" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#F0FE0015" }}
            >
              {getIcon()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {getTitle()}
              </h2>
              <p className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Your creative AI assistant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="#888888" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px]">
          {messages.length > 0 ? (
            messages.map((msg) => {
              const text = getMessageText(msg);
              if (!text) return null;
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-white/10 text-white rounded-br-md"
                        : "text-gray-300 rounded-bl-md"
                    }`}
                    style={{
                      backgroundColor: msg.role === "assistant" ? "#F0FE0010" : undefined,
                      fontFamily: "system-ui, Inter, sans-serif",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {text}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "#F0FE0015" }}
              >
                {getIcon()}
              </div>
              <h3 className="text-lg font-medium text-white mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                How can I help?
              </h3>
              <p className="text-sm text-gray-500 max-w-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Ask me to create status workflows, suggest project structures, add notes, or help organize your creative project.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {["Create statuses for my project", "Suggest a workflow", "Add a project note"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="px-3 py-1.5 rounded-full text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    style={{ border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-2xl rounded-bl-md text-sm"
                style={{ backgroundColor: "#F0FE0010" }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F0FE00] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-[#F0FE00] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-[#F0FE00] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-[#F0FE00]" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Sage is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pending Suggestion */}
          {pendingSuggestion && (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: "#F0FE0015", border: "1px solid #F0FE0040" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-white font-medium" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Suggested Statuses
                </div>
                <button
                  onClick={() => setPendingSuggestion(null)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M11 3L3 11M3 3L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {pendingSuggestion.map((pill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: pill.color, color: "#000" }}
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-400 mb-3" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Reply to modify, or click below to add to canvas
              </div>
              <button
                onClick={handleCreateFromSuggestion}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
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

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          className="px-5 py-4 border-t shrink-0"
          style={{ borderColor: "#F0FE0020", backgroundColor: "#111111" }}
        >
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: "rgba(240, 254, 0, 0.1)", border: "1px solid rgba(240, 254, 0, 0.2)" }}
                >
                  {attachment.type.startsWith("image/") ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#F0FE00]">
                      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
                      <path d="M2 11l3-3 2 2 4-4 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#F0FE00]">
                      <path d="M9 2H4C3.44772 2 3 2.44772 3 3V13C3 13.5523 3.44772 14 4 14H12C12.5523 14 13 13.5523 13 13V6L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 2V6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <span className="text-[#F0FE00] max-w-[150px] truncate">{attachment.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="ml-1 hover:bg-white/10 rounded p-1 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#F0FE00]/60">
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
            accept="image/*,.txt,.md,.json,.pdf,text/*,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          
          <div className="flex items-center gap-3">
            {/* Attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="p-3 rounded-xl transition-all disabled:opacity-50 hover:bg-white/10"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              title="Attach files"
            >
              {isUploading ? (
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="animate-spin text-[#F0FE00]">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                  <path d="M14 10V12.6667C14 13.403 13.403 14 12.6667 14H3.33333C2.59695 14 2 13.403 2 12.6667V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M11.3333 5.33333L8 2L4.66667 5.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 2V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Sage anything..."
              className="flex-1 bg-white/5 text-sm text-white placeholder-gray-500 px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#F0FE00]/30"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
              className="p-3 rounded-xl transition-all disabled:opacity-50 hover:brightness-110"
              style={{ backgroundColor: "#F0FE00" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
