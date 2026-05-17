"use client";

import React, { useState, useRef } from "react";
import type { FileNodeData, FileVersion, FileActivity, TaskItem, WorkspaceMember, UploadedFile } from "@/lib/atlas-types";
import { STATUS_COLORS, STATUS_LABELS, WORKSPACE_MEMBERS } from "@/lib/atlas-types";
import { Checkbox } from "@/components/ui/checkbox";
import { upload } from "@vercel/blob/client";

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

interface FileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileData: FileNodeData;
  onUpdateFile?: (updates: Partial<FileNodeData>) => void;
}

export function FileDetailModal({ isOpen, onClose, fileData, onUpdateFile }: FileDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "todos" | "history">("overview");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState<string | null>(null);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [newTodoAssignee, setNewTodoAssignee] = useState<WorkspaceMember | null>(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    };
    
    const currentTasks = fileData.tasks || [];
    onUpdateFile({ tasks: [...currentTasks, newTask] });
    setNewTodoTitle("");
    setNewTodoAssignee(null);
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
          {/* Title */}
          <h2
            className="text-2xl font-semibold text-white mb-6"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            {fileData.label}
          </h2>

          {/* Image Preview - Only show for image files */}
          {[".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"].includes(fileData.fileExtension) && (fileData.uploadedFile?.url || (fileData.previewImages && fileData.previewImages.length > 0)) && (
            <div className="mb-8 rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div className="relative flex items-center justify-center p-4" style={{ backgroundColor: "#0d0d0d" }}>
                <img
                  src={fileData.uploadedFile?.url || fileData.previewImages?.[0]}
                  alt={fileData.label}
                  className="max-w-full max-h-[50vh] object-contain rounded-lg"
                  style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
                />
              </div>
              <div className="p-3 flex items-center justify-between border-t" style={{ borderColor: "#2a2a2a" }}>
                <div className="flex items-center gap-2">
                  <FileTypeIcon extension={fileData.fileExtension} />
                  <span className="text-sm text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    {fileData.fileName}
                  </span>
                </div>
                <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  {fileData.uploadedFile?.size ? `${(fileData.uploadedFile.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                </span>
              </div>
            </div>
          )}

          {/* Video Player - Only show for video files */}
          {[".mp4", ".mov", ".avi", ".webm", ".mkv"].includes(fileData.fileExtension) && fileData.uploadedFile?.url && (
            <div className="mb-8 rounded-xl overflow-hidden" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div className="relative aspect-video">
                <video
                  src={fileData.uploadedFile.url}
                  controls
                  className="w-full h-full object-contain bg-black"
                  style={{ maxHeight: "400px" }}
                  playsInline
                >
                  <track kind="captions" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-3 flex items-center justify-between border-t" style={{ borderColor: "#2a2a2a" }}>
                <div className="flex items-center gap-2">
                  <FileTypeIcon extension={fileData.fileExtension} />
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

          {/* Audio Player - Only show for audio files */}
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
                  {visibleVersions.map((version) => (
                    <div
                      key={version.id}
                      className="rounded-xl overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
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
                  ))}
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
                    <p className="text-sm text-gray-400 ml-7" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      {activity.description}
                    </p>
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
