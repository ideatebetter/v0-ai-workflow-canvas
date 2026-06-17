"use client";

import React, { useState, useRef, useEffect } from "react";
import type { FileNodeData, FileVersion, FileActivity, ImageComment, VideoTimestampComment, TaskItem, WorkspaceMember, UploadedFile } from "@/lib/atlas-types";
import { STATUS_COLORS, STATUS_LABELS, WORKSPACE_MEMBERS } from "@/lib/atlas-types";
import { Checkbox } from "@/components/ui/checkbox";
import { upload } from "@vercel/blob/client";
import PSD from "psd.js";

// File type icons (simplified versions)
const FileTypeIcon = ({ extension }: { extension: string }) => {
  const iconColor = {
    ".fig": "#A259FF",
    ".psd": "#31A8FF",
    ".ai": "#FF9A00",
    ".pdf": "#FF0000",
    ".mp4": "#7C3AED",
    ".indd": "#FF3366",
    ".pptx": "#D24726",
    // Audio
    ".mp3": "#1DB954",
    ".wav": "#4A90D9",
    ".aac": "#FF6B35",
    ".flac": "#8B5CF6",
    ".ogg": "#E91E63",
    ".m4a": "#00BCD4",
    ".wma": "#00A4EF",
    ".aiff": "#A855F7",
  }[extension] || "#666666";

  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: iconColor }}
    >
      <span className="text-white text-xs font-bold">
        {extension.replace(".", "").toUpperCase().slice(0, 2)}
      </span>
    </div>
  );
};

// File type colors for Adobe files
const FILE_TYPE_COLORS: Record<string, string> = {
  ".psd": "#31A8FF",
  ".ai": "#FF9A00",
  ".indd": "#FF3366",
  ".xd": "#FF61F6",
  ".sketch": "#FDAD00",
  ".fig": "#A259FF",
  ".pdf": "#FF0000",
};

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
    } else if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1).split("?")[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function getGoogleDocsEmbedUrl(url: string): string {
  return url.replace(/\/edit.*$/, "/preview").replace(/\/pub.*$/, "/preview");
}

// Adobe File Preview Component with PSD.js support
function AdobeFilePreview({ fileData }: { fileData: FileNodeData }) {
  const [psdPreview, setPsdPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to load PSD preview
    if (fileData.fileExtension === ".psd" && fileData.uploadedFile?.url) {
      setLoading(true);
      setError(null);
      
      fetch(fileData.uploadedFile.url)
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const psd = new PSD(new Uint8Array(buffer));
          psd.parse();
          const png = psd.image.toPng();
          setPsdPreview(png.src);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to parse PSD:", err);
          setError("Could not generate preview");
          setLoading(false);
        });
    }
  }, [fileData.fileExtension, fileData.uploadedFile?.url]);

  const fileColor = FILE_TYPE_COLORS[fileData.fileExtension] || "#666";
  
  // AI files are PDF-based, try rendering as iframe
  if (fileData.fileExtension === ".ai" && fileData.uploadedFile?.url) {
    return (
      <div className="mb-8 rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="relative" style={{ backgroundColor: "#0d0d0d" }}>
          <iframe
            src={fileData.uploadedFile.url}
            title={fileData.label}
            className="w-full border-0"
            style={{ height: "50vh", minHeight: "300px" }}
          />
        </div>
        <div className="p-3 flex items-center justify-between border-t" style={{ borderColor: "#2a2a2a" }}>
          <div className="flex items-center gap-2">
            <FileTypeIcon extension={fileData.fileExtension} />
            <span className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              {fileData.fileName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={fileData.uploadedFile.url}
              download={fileData.fileName}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: fileColor, border: `1px solid ${fileColor}40` }}
            >
              Download
            </a>
          </div>
        </div>
      </div>
    );
  }

  // PSD files with psd.js preview
  if (fileData.fileExtension === ".psd") {
    return (
      <div className="mb-8 rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="relative flex items-center justify-center p-4" style={{ backgroundColor: "#0d0d0d", minHeight: "200px" }}>
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-t-[#31A8FF] border-r-[#31A8FF] border-b-transparent border-l-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Generating preview...
              </span>
            </div>
          ) : psdPreview ? (
            <img
              src={psdPreview}
              alt={fileData.label}
              className="max-w-full max-h-[50vh] object-contain rounded-lg"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
            />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${fileColor}20` }}
              >
                <FileTypeIcon extension={fileData.fileExtension} />
              </div>
              <p className="text-sm text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {error}
              </p>
            </div>
          ) : null}
        </div>
        <div className="p-3 flex items-center justify-between border-t" style={{ borderColor: "#2a2a2a" }}>
          <div className="flex items-center gap-2">
            <FileTypeIcon extension={fileData.fileExtension} />
            <span className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              {fileData.fileName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {fileData.uploadedFile?.url && (
              <a
                href={fileData.uploadedFile.url}
                download={fileData.fileName}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: fileColor, border: `1px solid ${fileColor}40` }}
              >
                Download
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default placeholder for other Adobe files (INDD, XD, Sketch, Figma)
  return (
    <div className="mb-8 rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
      <div 
        className="relative flex flex-col items-center justify-center py-12 px-8"
        style={{ backgroundColor: "#0d0d0d" }}
      >
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: `${fileColor}20` }}
        >
          <FileTypeIcon extension={fileData.fileExtension} />
        </div>
        <p className="text-lg font-medium text-white mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {fileData.fileName}
        </p>
        <p className="text-sm text-gray-500 text-center max-w-xs mb-4" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          Preview not available for {fileData.fileExtension.replace(".", "").toUpperCase()} files
        </p>
        {fileData.uploadedFile?.url && (
          <a
            href={fileData.uploadedFile.url}
            download={fileData.fileName}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:brightness-110"
            style={{ backgroundColor: fileColor, color: "#000" }}
          >
            Download File
          </a>
        )}
      </div>
      <div className="p-3 flex items-center justify-between border-t" style={{ borderColor: "#2a2a2a" }}>
        <div className="flex items-center gap-2">
          <FileTypeIcon extension={fileData.fileExtension} />
          <span className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {fileData.fileExtension.replace(".", "").toUpperCase()} File
          </span>
        </div>
        <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {fileData.uploadedFile?.size ? `${(fileData.uploadedFile.size / (1024 * 1024)).toFixed(1)} MB` : ""}
        </span>
      </div>
    </div>
  );
}

function VideoPlayerWithComments({
  fileData,
  onUpdateFile,
}: {
  fileData: FileNodeData;
  onUpdateFile?: (updates: Partial<FileNodeData>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCommentMode, setIsCommentMode] = useState(false);
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [pendingPos, setPendingPos] = useState(0);
  const [pendingText, setPendingText] = useState("");
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);

  const videoComments = fileData.videoComments || [];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = pct * duration;

    if (isCommentMode) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = time;
        setIsPlaying(false);
      }
      setCurrentTime(time);
      setPendingTimestamp(time);
      setPendingPos(pct * 100);
      setPendingText("");
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    }
  };

  const handleAddComment = () => {
    if (pendingTimestamp === null || !pendingText.trim() || !onUpdateFile) return;
    const newComment: VideoTimestampComment = {
      id: `vc-${Date.now()}`,
      timestamp: pendingTimestamp,
      text: pendingText.trim(),
      author: WORKSPACE_MEMBERS[0],
      createdAt: new Date().toISOString(),
    };
    const newActivity: FileActivity = {
      id: `a-${Date.now()}`,
      type: "comment",
      description: pendingText.trim(),
      user: WORKSPACE_MEMBERS[0],
      timestamp: new Date().toISOString(),
      metadata: { videoTimestamp: pendingTimestamp },
    };
    onUpdateFile({
      videoComments: [...videoComments, newComment],
      activities: [...(fileData.activities || []), newActivity],
    });
    setPendingTimestamp(null);
    setPendingText("");
    setIsCommentMode(false);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mb-8 rounded-xl overflow-visible" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
      {/* Video */}
      <div className="relative rounded-t-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
        <video
          ref={videoRef}
          src={fileData.uploadedFile?.url}
          className="w-full h-full object-contain"
          playsInline
          onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
          onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          <track kind="captions" />
        </video>
      </div>

      {/* Controls */}
      <div className="px-3 pt-3 pb-3 border-t" style={{ borderColor: "#2a2a2a" }}>
        {/* Timeline with comment ticks */}
        <div className="relative mb-3" style={{ paddingBottom: 4 }}>
          <div
            ref={timelineRef}
            className="relative h-2 rounded-full"
            style={{
              backgroundColor: "#333",
              cursor: isCommentMode ? "crosshair" : "pointer",
            }}
            onClick={handleTimelineClick}
          >
            {/* Progress fill */}
            <div
              className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
              style={{ width: `${progress}%`, backgroundColor: "#F0FE00" }}
            />

            {/* Existing comment ticks */}
            {videoComments.map((comment) => {
              const pct = duration > 0 ? (comment.timestamp / duration) * 100 : 0;
              return (
                <div
                  key={comment.id}
                  style={{
                    position: "absolute",
                    left: `${pct}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#7C3AED",
                    border: "2px solid #1a1a1a",
                    zIndex: 5,
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHoveredCommentId(comment.id)}
                  onMouseLeave={() => setHoveredCommentId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current) {
                      videoRef.current.currentTime = comment.timestamp;
                      setCurrentTime(comment.timestamp);
                    }
                  }}
                >
                  {hoveredCommentId === comment.id && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 10px)",
                        left: pct > 65 ? "auto" : "50%",
                        right: pct > 65 ? "50%" : "auto",
                        transform: pct > 65 ? "none" : "translateX(-50%)",
                        width: 200,
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #3a3a3a",
                        borderRadius: 8,
                        padding: "8px 10px",
                        zIndex: 30,
                        pointerEvents: "none",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                        fontFamily: "system-ui, Inter, sans-serif",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div
                          style={{
                            width: 18, height: 18, borderRadius: "50%",
                            backgroundColor: comment.author.avatarColor || "#666",
                            color: "#fff", fontSize: 9, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {comment.author.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <span style={{ fontSize: 10, color: "#888" }}>{comment.author.name.split(" ")[0]}</span>
                        <span style={{ fontSize: 10, color: "#555", marginLeft: "auto" }}>{formatTime(comment.timestamp)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "#e0e0e0", margin: 0 }}>{comment.text}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pending marker */}
            {pendingTimestamp !== null && (
              <div
                style={{
                  position: "absolute",
                  left: `${pendingPos}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#F0FE00",
                  border: "2px solid #1a1a1a",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          {/* Pending comment popup */}
          {pendingTimestamp !== null && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 16px)",
                left: pendingPos > 55 ? "auto" : `${Math.max(pendingPos, 2)}%`,
                right: pendingPos > 55 ? `${Math.max(100 - pendingPos, 2)}%` : "auto",
                width: 230,
                backgroundColor: "#1a1a1a",
                border: "1px solid #3a3a3a",
                borderRadius: 8,
                padding: 10,
                zIndex: 40,
                boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
                Comment at {formatTime(pendingTimestamp)}
              </div>
              <input
                autoFocus
                type="text"
                value={pendingText}
                onChange={(e) => setPendingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddComment();
                  if (e.key === "Escape") setPendingTimestamp(null);
                }}
                placeholder="Add a comment…"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#e0e0e0",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setPendingTimestamp(null)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #3a3a3a", backgroundColor: "transparent", color: "#888", fontSize: 12, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!pendingText.trim()}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    backgroundColor: pendingText.trim() ? "#F0FE00" : "#2a2a2a",
                    color: pendingText.trim() ? "#000" : "#666",
                    fontSize: 12, fontWeight: 600,
                    cursor: pendingText.trim() ? "pointer" : "default",
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={() => {
                if (!videoRef.current) return;
                if (isPlaying) { videoRef.current.pause(); } else { videoRef.current.play(); }
              }}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="5" y="4" width="3" height="12" rx="1" />
                  <rect x="12" y="4" width="3" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6 4L16 10L6 16V4Z" />
                </svg>
              )}
            </button>
            {/* Time */}
            <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Comment count */}
            {videoComments.length > 0 && (
              <span className="text-xs flex items-center gap-1" style={{ color: "#7C3AED", fontFamily: "system-ui, Inter, sans-serif" }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4C2 2.89543 2.89543 2 4 2H12C13.1046 2 14 2.89543 14 4V9C14 10.1046 13.1046 11 12 11H5L2 14V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {videoComments.length}
              </span>
            )}
            {/* Comment mode toggle */}
            <button
              type="button"
              onClick={() => { setIsCommentMode((v) => !v); setPendingTimestamp(null); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: isCommentMode ? "#F0FE00" : "rgba(255,255,255,0.08)",
                color: isCommentMode ? "#000" : "#aaa",
                border: isCommentMode ? "none" : "1px solid #3a3a3a",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 4C2 2.89543 2.89543 2 4 2H12C13.1046 2 14 2.89543 14 4V9C14 10.1046 13.1046 11 12 11H5L2 14V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isCommentMode ? "Click timeline…" : "Comment"}
            </button>
            {/* File name + size */}
            <div className="flex items-center gap-2">
              <FileTypeIcon extension={fileData.fileExtension} />
              <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {fileData.uploadedFile?.size ? `${(fileData.uploadedFile.size / (1024 * 1024)).toFixed(1)} MB` : fileData.fileName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileData: FileNodeData;
  onUpdateFile?: (updates: Partial<FileNodeData>) => void;
  canvasId?: string;
  nodeId?: string;
}

export function FileDetailModal({ isOpen, onClose, fileData, onUpdateFile, canvasId, nodeId }: FileDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "todos" | "history">("overview");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(fileData.label);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [newTodoAssignee, setNewTodoAssignee] = useState<WorkspaceMember | null>(null);
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [showDueDateInput, setShowDueDateInput] = useState<string | null>(null); // taskId or "new"
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const handleCopyLink = () => {
    if (!canvasId || !nodeId) return;
    const url = `${window.location.origin}?canvas=${canvasId}&node=${nodeId}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };
  const [uploadProgress, setUploadProgress] = useState(0);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sync editedTitle and reset version selection when fileData changes
  useEffect(() => {
    setEditedTitle(fileData.label);
    setSelectedVersionId(null);
  }, [fileData.label]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSave = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== fileData.label && onUpdateFile) {
      // Also update fileName to keep them in sync
      const newFileName = trimmedTitle + fileData.fileExtension;
      onUpdateFile({ label: trimmedTitle, fileName: newFileName });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === "Escape") {
      setEditedTitle(fileData.label);
      setIsEditingTitle(false);
    }
  };

  const handleImageAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating) return;
    e.stopPropagation();
    const img = imageRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      setPendingPin({ x, y });
      setNewCommentText("");
    }
  };

  const handleAddImageComment = () => {
    if (!pendingPin || !newCommentText.trim() || !onUpdateFile) return;
    const existingComments = fileData.imageComments || [];
    const newComment: ImageComment = {
      id: `imgc-${Date.now()}`,
      x: pendingPin.x,
      y: pendingPin.y,
      text: newCommentText.trim(),
      author: WORKSPACE_MEMBERS[0],
      createdAt: new Date().toISOString(),
    };
    const newActivity: FileActivity = {
      id: `a-${Date.now()}`,
      type: "comment",
      description: newCommentText.trim(),
      user: WORKSPACE_MEMBERS[0],
      timestamp: new Date().toISOString(),
      metadata: { commentId: newComment.id, pinNumber: existingComments.length + 1 },
    };
    onUpdateFile({
      imageComments: [...existingComments, newComment],
      activities: [...(fileData.activities || []), newActivity],
    });
    setPendingPin(null);
    setNewCommentText("");
    setIsAnnotating(false);
  };

  if (!isOpen) return null;

  // Build versions array - use stored versions or create initial version from current file
  const versions: FileVersion[] = fileData.versions && fileData.versions.length > 0 
    ? fileData.versions 
    : fileData.uploadedFile 
      ? [{
          id: "v-initial",
          versionName: fileData.label,
          previewImages: fileData.previewImages || [],
          uploadedAt: fileData.uploadedFile.uploadedAt || fileData.lastModified,
          uploadedBy: WORKSPACE_MEMBERS[0],
          fileUrl: fileData.uploadedFile.url,
          fileSize: fileData.uploadedFile.size,
        }]
      : [];

  const selectedVersion = selectedVersionId ? versions.find(v => v.id === selectedVersionId) ?? null : null;
  const previewUrl = selectedVersion
    ? (selectedVersion.previewImages?.[0] || selectedVersion.fileUrl)
    : (fileData.previewImages?.[0] || fileData.uploadedFile?.url);

  // Sample activity history if not provided
  const activities: FileActivity[] = fileData.activities || [
    {
      id: "a1",
      type: "version-add",
      description: "Uploaded new version V 3.0",
      user: WORKSPACE_MEMBERS[0],
      timestamp: "2026-05-12T09:15:00Z",
    },
    {
      id: "a2",
      type: "status-change",
      description: "Changed status to In Review",
      user: WORKSPACE_MEMBERS[1],
      timestamp: "2026-05-11T16:30:00Z",
    },
    {
      id: "a3",
      type: "comment",
      description: "Added feedback on color palette",
      user: WORKSPACE_MEMBERS[2],
      timestamp: "2026-05-10T11:00:00Z",
    },
    {
      id: "a4",
      type: "task-complete",
      description: "Completed task: Review typography",
      user: WORKSPACE_MEMBERS[0],
      timestamp: "2026-05-09T14:45:00Z",
    },
    {
      id: "a5",
      type: "upload",
      description: "Initial file upload",
      user: WORKSPACE_MEMBERS[0],
      timestamp: "2026-05-06T10:00:00Z",
    },
  ];

  const tasks = Array.isArray(fileData.tasks) ? fileData.tasks : [];
  // Derive team members from task assignees (unique members who have been assigned tasks)
  const taskAssignees = tasks
    .filter(task => task && task.assignee)
    .map(task => task.assignee as WorkspaceMember);
  // Get unique assignees by ID
  const uniqueAssignees = Array.from(
    new Map(taskAssignees.map(a => [a.id, a])).values()
  );
  // Use file-level assignees if set, otherwise fall back to task assignees
  const assignees = fileData.assignees && fileData.assignees.length > 0 
    ? fileData.assignees 
    : uniqueAssignees;
  const dueDate = fileData.dueDate || "";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    return `${Math.floor(diffDays / 7)} weeks ago`;
  };

  const handleTaskToggle = (taskId: string) => {
    if (onUpdateFile) {
      const currentTasks = fileData.tasks || [];
      const updatedTasks = currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );
      onUpdateFile({ tasks: updatedTasks });
    }
  };

  const handleAddTodo = () => {
    if (!newTodoTitle.trim() || !onUpdateFile) return;
    
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTodoTitle.trim(),
      completed: false,
      assignee: newTodoAssignee || undefined,
      createdAt: new Date().toISOString(),
      dueDate: newTodoDueDate || undefined,
    };

    const currentTasks = fileData.tasks || [];
    onUpdateFile({ tasks: [...currentTasks, newTask] });
    setNewTodoTitle("");
    setNewTodoAssignee(null);
    setNewTodoDueDate("");
    setIsAddingTodo(false);
  };

  const handleAssignTask = (taskId: string, member: WorkspaceMember | null) => {
    if (onUpdateFile) {
      const currentTasks = fileData.tasks || [];
      const updatedTasks = currentTasks.map((task) =>
        task.id === taskId ? { ...task, assignee: member || undefined } : task
      );
      onUpdateFile({ tasks: updatedTasks });
    }
    setShowAssigneeDropdown(null);
  };

  const handleSetDueDate = (taskId: string, date: string) => {
    if (onUpdateFile) {
      const currentTasks = fileData.tasks || [];
      const updatedTasks = currentTasks.map((task) =>
        task.id === taskId ? { ...task, dueDate: date || undefined } : task
      );
      onUpdateFile({ tasks: updatedTasks });
    }
    setShowDueDateInput(null);
  };

  const formatDueDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.getTime() === today.getTime()) return { label: "Today", color: "#F0FE00" };
    if (d.getTime() === tomorrow.getTime()) return { label: "Tomorrow", color: "#FB923C" };
    if (d < today) return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "#F87171" };
    return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "#888" };
  };

  const handleStatusChange = (newStatus: FileNodeData["status"]) => {
    if (onUpdateFile) {
      onUpdateFile({ status: newStatus });
    }
    setShowStatusDropdown(false);
  };

  const handleDueDateChange = (newDate: string) => {
    if (onUpdateFile) {
      onUpdateFile({ dueDate: newDate });
    }
    setShowDatePicker(false);
  };

  const handleVersionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateFile) return;

    setIsUploadingVersion(true);
    setUploadProgress(0);

    try {
      // Upload to Vercel Blob
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload/client",
        onUploadProgress: (progress) => {
          setUploadProgress(Math.round(progress.percentage));
        },
      });

      // Create preview URL for images
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? blob.url : undefined;

      // Get current versions or create initial version from current file
      const currentVersions = fileData.versions || [];
      
      // If no versions exist, create version 1 from current file state
      let versionsToUpdate = [...currentVersions];
      if (versionsToUpdate.length === 0 && fileData.uploadedFile) {
        versionsToUpdate.push({
          id: `v-${Date.now()}-initial`,
          versionName: fileData.label,
          previewImages: fileData.previewImages || [],
          uploadedAt: fileData.lastModified || new Date().toISOString(),
          uploadedBy: WORKSPACE_MEMBERS[0],
          fileUrl: fileData.uploadedFile.url,
          fileSize: fileData.uploadedFile.size,
        });
      }

      // Create new version
      const versionNumber = versionsToUpdate.length + 1;
      const newVersion: FileVersion = {
        id: `v-${Date.now()}`,
        versionName: `${fileData.label} V ${versionNumber}.0`,
        previewImages: previewUrl ? [previewUrl] : fileData.previewImages || [],
        uploadedAt: new Date().toISOString(),
        uploadedBy: WORKSPACE_MEMBERS[0], // TODO: Use actual logged in user
        fileUrl: blob.url,
        fileSize: file.size,
      };

      // Create activity entry
      const newActivity: FileActivity = {
        id: `a-${Date.now()}`,
        type: "version-add",
        description: `Uploaded new version V ${versionNumber}.0`,
        user: WORKSPACE_MEMBERS[0],
        timestamp: new Date().toISOString(),
      };

      // Update file with new version as current
      const uploadedFile: UploadedFile = {
        url: blob.url,
        pathname: blob.pathname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      onUpdateFile({
        versions: [...versionsToUpdate, newVersion],
        activities: [...(fileData.activities || []), newActivity],
        uploadedFile,
        previewImages: previewUrl ? [previewUrl, ...(fileData.previewImages || []).slice(0, 3)] : fileData.previewImages,
        lastModified: new Date().toISOString(),
      });

    } catch (error) {
      console.error("Error uploading version:", error);
    } finally {
      setIsUploadingVersion(false);
      setUploadProgress(0);
      // Reset file input
      if (versionInputRef.current) {
        versionInputRef.current.value = "";
      }
    }
  };

  const getActivityIcon = (type: FileActivity["type"]) => {
    switch (type) {
      case "upload":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V10M8 2L5 5M8 2L11 5M3 12V13H13V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "comment":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4C2 2.89543 2.89543 2 4 2H12C13.1046 2 14 2.89543 14 4V9C14 10.1046 13.1046 11 12 11H5L2 14V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "status-change":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "task-complete":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 8L7 10L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "version-add":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const visibleVersions = versions.slice(carouselIndex, carouselIndex + 3);
  const canScrollLeft = carouselIndex > 0;
  const canScrollRight = carouselIndex + 3 < versions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}
      >
        {/* Header buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {/* Copy link button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ backgroundColor: linkCopied ? "rgba(240,254,0,0.12)" : "rgba(255,255,255,0.05)" }}
            title="Copy link to this file"
          >
            {linkCopied ? (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M3 7.5L6 10.5L12 4.5" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M6 9L9 6" stroke="#888888" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8.5 3.5L9.75 2.25C10.5784 1.42157 11.9216 1.42157 12.75 2.25C13.5784 3.07843 13.5784 4.42157 12.75 5.25L11.5 6.5" stroke="#888888" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M6.5 11.5L5.25 12.75C4.42157 13.5784 3.07843 13.5784 2.25 12.75C1.42157 11.9216 1.42157 10.5784 2.25 9.75L3.5 8.5" stroke="#888888" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={() => {
              if (fileData.uploadedFile?.url) {
                const link = document.createElement("a");
                link.href = fileData.uploadedFile.url;
                link.download = fileData.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                alert("No file available for download");
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            title="Download file"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 12V13C3 13.5523 3.44772 14 4 14H12C12.5523 14 13 13.5523 13 13V12" stroke="#888888" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="#888888" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[85vh] p-8">
          {/* Title - Editable */}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="text-2xl font-semibold text-white mb-6 bg-transparent border-b-2 border-blue-500 outline-none w-full"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            />
          ) : (
            <h2
              className="text-2xl font-semibold text-white mb-6 cursor-pointer hover:text-gray-300 transition-colors group flex items-center gap-2"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename"
            >
              {fileData.label}
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none" 
                className="opacity-0 group-hover:opacity-50 transition-opacity"
              >
                <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </h2>
          )}

          {/* Image Preview - show for image files or any node with a previewImage (e.g. Figma sync) */}
          {([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"].includes(fileData.fileExtension) || (fileData.previewImages && fileData.previewImages.length > 0)) && (fileData.uploadedFile?.url || (fileData.previewImages && fileData.previewImages.length > 0)) && (
            <div className="mb-8 rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div
                className="relative flex items-center justify-center p-4"
                style={{ backgroundColor: "#0d0d0d", cursor: isAnnotating ? "crosshair" : "default" }}
                onClick={handleImageAreaClick}
              >
                {/* Annotate mode toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAnnotating((v) => !v);
                    setPendingPin(null);
                  }}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors z-10"
                  style={{
                    backgroundColor: isAnnotating ? "#F0FE00" : "rgba(255,255,255,0.08)",
                    color: isAnnotating ? "#000" : "#aaa",
                    border: isAnnotating ? "none" : "1px solid #3a3a3a",
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
                  title={isAnnotating ? "Exit comment mode" : "Add a comment"}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4C2 2.89543 2.89543 2 4 2H12C13.1046 2 14 2.89543 14 4V9C14 10.1046 13.1046 11 12 11H5L2 14V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isAnnotating ? "Click to pin" : "Comment"}
                </button>

                {/* Image wrapped in relative container for pin positioning */}
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt={selectedVersion ? selectedVersion.versionName : fileData.label}
                    className="max-w-full max-h-[50vh] object-contain rounded-lg"
                    style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3)", display: "block" }}
                    draggable={false}
                  />

                  {/* Existing comment pins */}
                  {(fileData.imageComments || []).map((comment, index) => (
                    <div
                      key={comment.id}
                      style={{
                        position: "absolute",
                        left: `${comment.x}%`,
                        top: `${comment.y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: 10,
                      }}
                      onMouseEnter={() => setHoveredCommentId(comment.id)}
                      onMouseLeave={() => setHoveredCommentId(null)}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: "#F0FE00",
                          color: "#000",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px solid rgba(0,0,0,0.5)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                          cursor: "default",
                          fontFamily: "system-ui, Inter, sans-serif",
                        }}
                      >
                        {index + 1}
                      </div>
                      {/* Tooltip on hover */}
                      {hoveredCommentId === comment.id && (
                        <div
                          style={{
                            position: "absolute",
                            left: comment.x > 60 ? "auto" : "calc(100% + 8px)",
                            right: comment.x > 60 ? "calc(100% + 8px)" : "auto",
                            top: comment.y > 70 ? "auto" : 0,
                            bottom: comment.y > 70 ? 0 : "auto",
                            width: 200,
                            backgroundColor: "#1a1a1a",
                            border: "1px solid #3a3a3a",
                            borderRadius: 8,
                            padding: "8px 10px",
                            zIndex: 30,
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                backgroundColor: comment.author.avatarColor || "#666",
                                color: "#fff",
                                fontSize: 9,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontFamily: "system-ui, Inter, sans-serif",
                              }}
                            >
                              {comment.author.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <span style={{ fontSize: 11, color: "#888", fontFamily: "system-ui, Inter, sans-serif" }}>
                              {comment.author.name.split(" ")[0]}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: "#e0e0e0", margin: 0, fontFamily: "system-ui, Inter, sans-serif" }}>
                            {comment.text}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pending pin with comment input */}
                  {pendingPin && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${pendingPin.x}%`,
                        top: `${pendingPin.y}%`,
                        transform: "translate(-50%, -50%)",
                        zIndex: 20,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: "#F0FE00",
                          color: "#000",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px solid rgba(0,0,0,0.5)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                          fontFamily: "system-ui, Inter, sans-serif",
                          animation: "pinDrop 0.15s ease-out",
                        }}
                      >
                        {(fileData.imageComments || []).length + 1}
                      </div>
                      {/* Comment input popup */}
                      <div
                        style={{
                          position: "absolute",
                          left: pendingPin.x > 60 ? "auto" : "calc(100% + 8px)",
                          right: pendingPin.x > 60 ? "calc(100% + 8px)" : "auto",
                          top: pendingPin.y > 70 ? "auto" : 0,
                          bottom: pendingPin.y > 70 ? 0 : "auto",
                          width: 220,
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #3a3a3a",
                          borderRadius: 8,
                          padding: 10,
                          zIndex: 30,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        }}
                      >
                        <input
                          autoFocus
                          type="text"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddImageComment();
                            if (e.key === "Escape") { setPendingPin(null); setIsAnnotating(false); }
                          }}
                          placeholder="Add a comment…"
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            color: "#e0e0e0",
                            fontSize: 13,
                            fontFamily: "system-ui, Inter, sans-serif",
                            marginBottom: 8,
                          }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => { setPendingPin(null); }}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: "1px solid #3a3a3a",
                              backgroundColor: "transparent",
                              color: "#888",
                              fontSize: 12,
                              cursor: "pointer",
                              fontFamily: "system-ui, Inter, sans-serif",
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddImageComment}
                            disabled={!newCommentText.trim()}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: "none",
                              backgroundColor: newCommentText.trim() ? "#F0FE00" : "#2a2a2a",
                              color: newCommentText.trim() ? "#000" : "#666",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: newCommentText.trim() ? "pointer" : "default",
                              fontFamily: "system-ui, Inter, sans-serif",
                            }}
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {selectedVersion && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#a0a0a0", fontFamily: "system-ui, Inter, sans-serif" }}>
                    {selectedVersion.versionName}
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between border-t" style={{ borderColor: "#2a2a2a" }}>
                <div className="flex items-center gap-2">
                  <FileTypeIcon extension={fileData.fileExtension} />
                  <span className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    {selectedVersion ? selectedVersion.versionName : fileData.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {(fileData.imageComments || []).length > 0 && (
                    <span className="text-xs text-gray-500 flex items-center gap-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4C2 2.89543 2.89543 2 4 2H12C13.1046 2 14 2.89543 14 4V9C14 10.1046 13.1046 11 12 11H5L2 14V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {(fileData.imageComments || []).length} comment{(fileData.imageComments || []).length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    {(selectedVersion?.fileSize ?? fileData.uploadedFile?.size) ? `${((selectedVersion?.fileSize ?? fileData.uploadedFile?.size ?? 0) / (1024 * 1024)).toFixed(1)} MB` : ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Video Player with timestamp comments */}
          {[".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v"].includes(fileData.fileExtension) && fileData.uploadedFile?.url && (
            <VideoPlayerWithComments fileData={fileData} onUpdateFile={onUpdateFile} />
          )}

          {/* Audio Player - Only show for audio files */}

          {/* PDF Preview - Only show for PDF files */}
          {fileData.fileExtension === ".pdf" && fileData.uploadedFile?.url && (
            <div className="mb-8 rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div className="relative" style={{ backgroundColor: "#0d0d0d" }}>
                <iframe
                  src={fileData.uploadedFile.url}
                  title={fileData.label}
                  className="w-full border-0"
                  style={{ height: "60vh", minHeight: "400px" }}
                />
              </div>
              <div className="p-3 flex items-center justify-between border-t" style={{ borderColor: "#2a2a2a" }}>
                <div className="flex items-center gap-2">
                  <FileTypeIcon extension={fileData.fileExtension} />
                  <span className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    {fileData.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={fileData.uploadedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                    style={{ color: "#FF0000", border: "1px solid #FF000040" }}
                  >
                    Open in New Tab
                  </a>
                  <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    {fileData.uploadedFile.size ? `${(fileData.uploadedFile.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Adobe Design Files Preview - PSD, AI, INDD */}
          {[".psd", ".ai", ".indd", ".xd", ".sketch", ".fig"].includes(fileData.fileExtension) && (
            <AdobeFilePreview fileData={fileData} />
          )}
          {[".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma", ".aiff"].includes(fileData.fileExtension) && fileData.uploadedFile?.url && (
            <div className="mb-8 rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              {/* Waveform visualization */}
              <div 
                className="p-6 flex items-center justify-center"
                style={{ backgroundColor: "#0d0d0d" }}
              >
                <div className="flex items-end justify-center gap-0.5 h-20 w-full max-w-md">
                  {[...Array(48)].map((_, i) => {
                    const height = 20 + Math.sin(i * 0.3) * 30 + Math.random() * 20;
                    return (
                      <div
                        key={i}
                        className="w-1.5 rounded-full"
                        style={{
                          height: `${height}%`,
                          backgroundColor: "#1DB954",
                          opacity: 0.6 + Math.random() * 0.4,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              
              {/* Audio controls */}
              <div className="p-4 border-t" style={{ borderColor: "#2a2a2a" }}>
                <audio
                  src={fileData.uploadedFile.url}
                  controls
                  className="w-full"
                  style={{ 
                    height: 40,
                    borderRadius: 8,
                  }}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
              
              {/* File info */}
              <div className="px-4 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#1DB954" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M5 11V5L7 6V10L5 11Z" fill="white"/>
                      <path d="M8 10V6L10 7V9L8 10Z" fill="white"/>
                      <path d="M11 9V7L12 7.5V8.5L11 9Z" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    {fileData.fileName}
                  </span>
                </div>
                <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  {fileData.uploadedFile.size ? `${(fileData.uploadedFile.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                </span>
              </div>
            </div>
          )}

          {/* Link Preview - YouTube, Google Docs, Figma, Generic */}
          {fileData.linkUrl && fileData.linkType && (
            <div className="mb-8 rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              {fileData.linkType === "youtube" && (() => {
                const embedUrl = getYouTubeEmbedUrl(fileData.linkUrl!);
                return embedUrl ? (
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                    <iframe
                      src={embedUrl}
                      title="YouTube video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    />
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Could not embed YouTube video.{" "}
                    <a href={fileData.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#F0FE00" }}>Open in new tab</a>
                  </div>
                );
              })()}

              {fileData.linkType === "googledoc" && (
                <>
                  <iframe
                    src={getGoogleDocsEmbedUrl(fileData.linkUrl!)}
                    title="Google Doc preview"
                    style={{ width: "100%", height: 480, border: "none", display: "block" }}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #2a2a2a" }}>
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 2V8H20" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 13H16M8 17H13" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span className="text-sm text-gray-300" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{fileData.label}</span>
                    </div>
                    <a
                      href={fileData.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                      style={{ color: "#4285F4", border: "1px solid #4285F440", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      Open in Google Docs
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </>
              )}

              {fileData.linkType === "figma" && (
                <div className="p-6 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M8 24C10.2091 24 12 22.2091 12 20V16H8C5.79086 16 4 17.7909 4 20C4 22.2091 5.79086 24 8 24Z" fill="#0ACF83"/>
                      <path d="M4 12C4 9.79086 5.79086 8 8 8H12V16H8C5.79086 16 4 14.2091 4 12Z" fill="#A259FF"/>
                      <path d="M4 4C4 1.79086 5.79086 0 8 0H12V8H8C5.79086 8 4 6.20914 4 4Z" fill="#F24E1E"/>
                      <path d="M12 0H16C18.2091 0 20 1.79086 20 4C20 6.20914 18.2091 8 16 8H12V0Z" fill="#FF7262"/>
                      <path d="M20 12C20 14.2091 18.2091 16 16 16C13.7909 16 12 14.2091 12 12C12 9.79086 13.7909 8 16 8C18.2091 8 20 9.79086 20 12Z" fill="#1ABCFE"/>
                    </svg>
                    <span className="text-sm text-gray-300" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Figma Design</span>
                  </div>
                  <a
                    href={fileData.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
                    style={{ color: "#A259FF", border: "1px solid #A259FF40", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Open in Figma
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                </div>
              )}

              {fileData.linkType === "generic" && (
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1C4.13 1 1 4.13 1 8C1 11.87 4.13 15 8 15C11.87 15 15 11.87 15 8C15 4.13 11.87 1 8 1Z" stroke="#888" strokeWidth="1.2"/>
                      <path d="M5 8H11M8 5V11" stroke="#888" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <a
                      href={fileData.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm truncate max-w-xs hover:underline"
                      style={{ color: "#a1a1aa", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      {fileData.linkUrl}
                    </a>
                  </div>
                  <a
                    href={fileData.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                    style={{ color: "#d1d5db", border: "1px solid #333", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Open Link
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Metadata Row */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Status - Clickable Dropdown */}
            <div className="relative">
              <div className="text-sm text-gray-500 mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Status
              </div>
              <button
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white cursor-pointer transition-opacity hover:opacity-80"
                style={{ backgroundColor: STATUS_COLORS[fileData.status] }}
              >
                {STATUS_LABELS[fileData.status]}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {/* Status Dropdown */}
              {showStatusDropdown && (
                <div 
                  className="absolute top-full left-0 mt-2 py-1 rounded-lg shadow-xl z-20 min-w-[140px]"
                  style={{ backgroundColor: "#2C2C2E", border: "1px solid #3C3C3E" }}
                >
                  {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(status)}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[status] }}
                      />
                      <span className="text-white">{STATUS_LABELS[status]}</span>
                      {fileData.status === status && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto">
                          <path d="M3 7L6 10L11 4" stroke="#F0FE00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Due Date - Clickable Date Picker */}
            <div className="relative">
              <div className="text-sm text-gray-500 mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Due Date
              </div>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 1V3M11 1V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {dueDate ? (
                  <span>{new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                ) : (
                  <span className="text-gray-500">Set date</span>
                )}
              </button>
              
              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div 
                  className="absolute top-full left-0 mt-2 p-3 rounded-lg shadow-xl z-20"
                  style={{ backgroundColor: "#2C2C2E", border: "1px solid #3C3C3E" }}
                >
                  <input
                    type="date"
                    defaultValue={dueDate ? new Date(dueDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="bg-transparent text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-[#F0FE00]"
                    style={{ colorScheme: "dark" }}
                  />
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => handleDueDateChange("")}
                      className="mt-2 w-full text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Clear date
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Team Members - Derived from task assignees */}
            <div>
              <div className="text-sm text-gray-500 mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Team Members
              </div>
              {assignees.length > 0 ? (
                <div className="space-y-1.5">
                  {assignees.slice(0, 3).map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                        style={{ backgroundColor: member.avatarColor || "#666666" }}
                      >
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-sm text-gray-300" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {member.name.split(" ")[0]} {member.name.split(" ")[1]?.[0]}.
                      </span>
                    </div>
                  ))}
                  {assignees.length > 3 && (
                    <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      +{assignees.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Assign tasks to add members
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
            {(["overview", "todos", "history"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-[#2a2a2a] text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {tab === "overview" ? "Version History" : tab === "todos" ? `To-Dos (${tasks.length})` : "Activity"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div>
              {/* Hidden file input for version upload */}
              <input
                ref={versionInputRef}
                type="file"
                className="hidden"
                onChange={handleVersionUpload}
                accept="*/*"
              />

              {/* Upload New Version Button */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Version History ({versions.length})
                </h3>
                <button
                  type="button"
                  onClick={() => versionInputRef.current?.click()}
                  disabled={isUploadingVersion}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ 
                    backgroundColor: "#F0FE00", 
                    color: "#000000",
                    fontFamily: "system-ui, Inter, sans-serif"
                  }}
                >
                  {isUploadingVersion ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="32" />
                      </svg>
                      Uploading {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2V10M8 2L5 5M8 2L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 12V13H13V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      New Version
                    </>
                  )}
                </button>
              </div>

              {/* Version History Carousel */}
              <div className="relative">
                {/* Carousel Navigation */}
                {canScrollLeft && (
                  <button
                    type="button"
                    onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M10 4L6 8L10 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
                {canScrollRight && (
                  <button
                    type="button"
                    onClick={() => setCarouselIndex(Math.min(versions.length - 3, carouselIndex + 1))}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4L10 8L6 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}

                {/* Version Cards */}
                <div className="grid grid-cols-3 gap-4">
                  {visibleVersions.map((version) => {
                    const isSelected = selectedVersionId === version.id;
                    return (
                    <div
                      key={version.id}
                      onClick={() => setSelectedVersionId(prev => prev === version.id ? null : version.id)}
                      className="rounded-xl overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer"
                      style={{ backgroundColor: "#1a1a1a", border: isSelected ? "1px solid #6b7280" : "1px solid #2a2a2a", outline: isSelected ? "2px solid #4b5563" : "none", outlineOffset: "1px" }}
                    >
                      {/* Preview Image */}
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <img
                          src={version.previewImages[0]}
                          alt={version.versionName}
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      </div>
                      
                      {/* Version Info */}
                      <div className="p-3 flex items-center gap-2">
                        <FileTypeIcon extension={fileData.fileExtension} />
                        <div>
                          <div className="text-sm font-medium text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                            {version.versionName}
                          </div>
                          <div className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                            Updated {formatDate(version.uploadedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );})}
                </div>

                {/* Carousel Dots */}
                {versions.length > 3 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {Array.from({ length: Math.ceil(versions.length / 3) }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCarouselIndex(i * 3)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          Math.floor(carouselIndex / 3) === i ? "bg-white" : "bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "todos" && (
            <div className="space-y-3">
              {/* Existing Tasks */}
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: task.completed ? "#1a1a1a" : "#1f1f1f", 
                    border: "1px solid #2a2a2a" 
                  }}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleTaskToggle(task.id)}
                    className="data-[state=checked]:bg-[#F0FE00] data-[state=checked]:border-[#F0FE00] data-[state=checked]:text-black border-gray-600"
                  />
                  <span
                    className={`flex-1 text-sm ${task.completed ? "text-gray-500 line-through" : "text-gray-200"}`}
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    {task.title}
                  </span>
                  
                  {/* Due Date */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDueDateInput(showDueDateInput === task.id ? null : task.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-white/5"
                      style={{ color: task.dueDate ? formatDueDate(task.dueDate).color : "#555", fontFamily: "system-ui, Inter, sans-serif" }}
                      title={task.dueDate ? "Change due date" : "Set due date"}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                        <rect x="1" y="2" width="10" height="9" rx="1.5"/>
                        <path d="M4 1v2M8 1v2M1 5h10" strokeLinecap="round"/>
                      </svg>
                      {task.dueDate ? formatDueDate(task.dueDate).label : ""}
                    </button>
                    {showDueDateInput === task.id && (
                      <div className="absolute right-0 top-full mt-1 p-2 rounded-lg shadow-lg z-50" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                        <input
                          type="date"
                          defaultValue={task.dueDate || ""}
                          autoFocus
                          onChange={(e) => handleSetDueDate(task.id, e.target.value)}
                          className="text-xs text-gray-200 bg-transparent border-none focus:outline-none"
                          style={{ colorScheme: "dark" }}
                        />
                        {task.dueDate && (
                          <button
                            type="button"
                            onClick={() => handleSetDueDate(task.id, "")}
                            className="block w-full text-left text-xs text-gray-500 hover:text-gray-300 mt-1 px-1"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            Clear date
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Assignee Button with Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAssigneeDropdown(showAssigneeDropdown === task.id ? null : task.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                      style={{ 
                        backgroundColor: task.assignee?.avatarColor || "#2a2a2a",
                        color: task.assignee ? "white" : "#666666",
                        border: task.assignee ? "none" : "1px dashed #444444"
                      }}
                      title={task.assignee ? task.assignee.name : "Assign"}
                    >
                      {task.assignee ? (
                        task.assignee.name.split(" ").map(n => n[0]).join("")
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M2.5 12C2.5 9.5 4.5 8 7 8C9.5 8 11.5 9.5 11.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                    
                    {/* Assignee Dropdown */}
                    {showAssigneeDropdown === task.id && (
                      <div
                        className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[160px]"
                        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                      >
                        {task.assignee && (
                          <button
                            type="button"
                            onClick={() => handleAssignTask(task.id, null)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-white/5 transition-colors"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            Unassign
                          </button>
                        )}
                        {WORKSPACE_MEMBERS.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleAssignTask(task.id, member)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white"
                              style={{ backgroundColor: member.avatarColor || "#666666" }}
                            >
                              {member.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            {member.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Add Todo Form */}
              {isAddingTodo ? (
                <div
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: "#1f1f1f", border: "1px solid #2a2a2a" }}
                >
                  <Checkbox disabled className="border-gray-600 opacity-50" />
                  <input
                    type="text"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTodo();
                      if (e.key === "Escape") {
                        setIsAddingTodo(false);
                        setNewTodoTitle("");
                        setNewTodoAssignee(null);
                      }
                    }}
                    placeholder="What needs to be done?"
                    autoFocus
                    className="flex-1 text-sm text-gray-200 bg-transparent border-none focus:outline-none placeholder-gray-500"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  />
                  
                  {/* New Todo Due Date */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDueDateInput(showDueDateInput === "new" ? null : "new")}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-white/5"
                      style={{ color: newTodoDueDate ? formatDueDate(newTodoDueDate).color : "#555", fontFamily: "system-ui, Inter, sans-serif" }}
                      title="Set due date"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                        <rect x="1" y="2" width="10" height="9" rx="1.5"/>
                        <path d="M4 1v2M8 1v2M1 5h10" strokeLinecap="round"/>
                      </svg>
                      {newTodoDueDate ? formatDueDate(newTodoDueDate).label : "Due"}
                    </button>
                    {showDueDateInput === "new" && (
                      <div className="absolute right-0 top-full mt-1 p-2 rounded-lg shadow-lg z-50" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                        <input
                          type="date"
                          value={newTodoDueDate}
                          autoFocus
                          onChange={(e) => { setNewTodoDueDate(e.target.value); setShowDueDateInput(null); }}
                          className="text-xs text-gray-200 bg-transparent border-none focus:outline-none"
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* New Todo Assignee */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAssigneeDropdown(showAssigneeDropdown === "new" ? null : "new")}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                      style={{ 
                        backgroundColor: newTodoAssignee?.avatarColor || "#2a2a2a",
                        color: newTodoAssignee ? "white" : "#666666",
                        border: newTodoAssignee ? "none" : "1px dashed #444444"
                      }}
                      title={newTodoAssignee ? newTodoAssignee.name : "Assign"}
                    >
                      {newTodoAssignee ? (
                        newTodoAssignee.name.split(" ").map(n => n[0]).join("")
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M2.5 12C2.5 9.5 4.5 8 7 8C9.5 8 11.5 9.5 11.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                    
                    {showAssigneeDropdown === "new" && (
                      <div
                        className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[160px]"
                        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                      >
                        {WORKSPACE_MEMBERS.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setNewTodoAssignee(member);
                              setShowAssigneeDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white"
                              style={{ backgroundColor: member.avatarColor || "#666666" }}
                            >
                              {member.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            {member.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleAddTodo}
                    disabled={!newTodoTitle.trim()}
                    className="px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ 
                      backgroundColor: newTodoTitle.trim() ? "#F0FE00" : "#2a2a2a",
                      color: newTodoTitle.trim() ? "#000000" : "#666666",
                      fontFamily: "system-ui, Inter, sans-serif"
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTodo(false);
                      setNewTodoTitle("");
                      setNewTodoAssignee(null);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTodo(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/5 text-gray-500 hover:text-gray-300"
                  style={{ border: "1px dashed #2a2a2a" }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Add a to-do
                  </span>
                </button>
              )}
              
              {/* Empty state only when no tasks and not adding */}
              {tasks.length === 0 && !isAddingTodo && (
                <div className="text-center py-4 text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  No tasks added yet
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-3">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400"
                      style={{ backgroundColor: "#1a1a1a" }}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    {index < activities.length - 1 && (
                      <div className="w-0.5 flex-1 mt-2" style={{ backgroundColor: "#2a2a2a" }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium text-white"
                        style={{ backgroundColor: activity.user.avatarColor || "#666666" }}
                      >
                        {activity.user.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="text-sm font-medium text-gray-200" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {activity.user.name.split(" ")[0]}
                      </span>
                      <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {formatDate(activity.timestamp)}
                      </span>
                    </div>
                    {activity.type === "comment" && activity.metadata?.pinNumber ? (
                      <div className="ml-7 flex items-start gap-2">
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            backgroundColor: "#F0FE00",
                            color: "#000",
                            fontSize: 10,
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: 2,
                            fontFamily: "system-ui, Inter, sans-serif",
                          }}
                        >
                          {String(activity.metadata.pinNumber)}
                        </span>
                        <p className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                          {activity.description}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 ml-7" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
