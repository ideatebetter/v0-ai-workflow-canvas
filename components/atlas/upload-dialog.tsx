"use client";

import React, { useState, useCallback, useRef } from "react";
import { Layers, Image as ImageIcon, PenTool, Video, Music, FileText, Upload, AlertCircle, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { FileExtension, ProductType, UploadedFile } from "@/lib/atlas-types";
import { SUPPORTED_EXTENSIONS, getFileCategoryFromExtension } from "@/lib/atlas-types";

interface UploadedFileInfo {
  file: File;
  preview?: string;
  status: "pending" | "uploading" | "complete" | "error";
  progress: number;
  result?: UploadedFile & { fileName: string; extension: string };
  error?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onFilesUploaded: (files: Array<{
    fileName: string;
    extension: FileExtension;
    uploadedFile: UploadedFile;
    previewUrl?: string;
  }>) => void;
}

export function UploadDialog({ open, onClose, onFilesUploaded }: UploadDialogProps) {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadedFileInfo[] = [];
    const errors: string[] = [];
    
    for (const file of Array.from(fileList)) {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      
      // Check for unsupported file types
      if (!SUPPORTED_EXTENSIONS.includes(extension as FileExtension)) {
        errors.push(`"${file.name}" has unsupported format (${extension || "no extension"})`);
        continue;
      }

      // Check for empty files
      if (file.size === 0) {
        errors.push(`"${file.name}" is empty`);
        continue;
      }

      const fileInfo: UploadedFileInfo = {
        file,
        status: "pending",
        progress: 0,
      };

      // Create preview for images
      const category = getFileCategoryFromExtension(extension);
      if (category === "image" && file.type.startsWith("image/")) {
        fileInfo.preview = URL.createObjectURL(file);
      }

      newFiles.push(fileInfo);
    }

    if (errors.length > 0) {
      setValidationErrors(prev => [...prev, ...errors]);
      // Auto-clear errors after 5 seconds
      setTimeout(() => {
        setValidationErrors([]);
      }, 5000);
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const uploadFiles = useCallback(async () => {
    setIsUploading(true);
    const uploadedResults: Array<{
      fileName: string;
      extension: FileExtension;
      uploadedFile: UploadedFile;
      previewUrl?: string;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const fileInfo = files[i];
      if (fileInfo.status === "complete") continue;

      // Update status to uploading
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: "uploading" as const, progress: 10 } : f
      ));

      try {
        const formData = new FormData();
        formData.append("file", fileInfo.file);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map((f, idx) => 
            idx === i && f.progress < 90 ? { ...f, progress: f.progress + 10 } : f
          ));
        }, 100);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const result = await response.json();

        // Update status to complete
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: "complete" as const, progress: 100, result } : f
        ));

        // For public blobs, use the direct URL
        const isImage = result.extension.match(/^\.(png|jpg|jpeg|gif|webp|avif)$/i);
        const isPDF = result.extension === ".pdf";

        let previewUrl: string | undefined = isImage ? result.url : undefined;
        if (isPDF) {
          const { renderPDFFirstPageToDataURL } = await import("@/lib/pdf-parser");
          const dataUrl = await renderPDFFirstPageToDataURL(fileInfo.file);
          if (dataUrl) previewUrl = dataUrl;
        }

        uploadedResults.push({
          fileName: result.fileName,
          extension: result.extension as FileExtension,
          uploadedFile: {
            url: result.url, // Public blobs are directly accessible
            pathname: result.pathname,
            size: result.size,
            uploadedAt: result.uploadedAt,
          },
          previewUrl,
        });
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: "error" as const, error: (error as Error).message } : f
        ));
      }
    }

    setIsUploading(false);

    if (uploadedResults.length > 0) {
      onFilesUploaded(uploadedResults);
      // Clear files and close after a short delay
      setTimeout(() => {
        setFiles([]);
        onClose();
      }, 500);
    }
  }, [files, onFilesUploaded, onClose]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      // Revoke preview URL if exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const handleClose = useCallback(() => {
    // Clean up preview URLs
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setValidationErrors([]);
    onClose();
  }, [files, onClose]);

  const getCategoryIcon = (extension: string) => {
    const category = getFileCategoryFromExtension(extension);
    switch (category) {
      case "design":
        return <Layers className="w-5 h-5" strokeWidth={1.5} style={{ color: "#A78BFA" }} />;
      case "image":
        return <ImageIcon className="w-5 h-5" strokeWidth={1.5} style={{ color: "#34D399" }} />;
      case "vector":
        return <PenTool className="w-5 h-5" strokeWidth={1.5} style={{ color: "#F472B6" }} />;
      case "video":
        return <Video className="w-5 h-5" strokeWidth={1.5} style={{ color: "#60A5FA" }} />;
      case "audio":
        return <Music className="w-5 h-5" strokeWidth={1.5} style={{ color: "#1DB954" }} />;
      default:
        return <FileText className="w-5 h-5" strokeWidth={1.5} style={{ color: "#9CA3AF" }} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 border-0"
        style={{ 
          background: "#1C1C1E",
          borderRadius: 16,
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle 
            className="text-lg font-semibold text-foreground"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            Upload Files
          </DialogTitle>
        </DialogHeader>

        {/* Drop Zone */}
        <div className="px-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-gray-600 hover:border-gray-500 hover:bg-white/5"}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept={SUPPORTED_EXTENSIONS.join(",")}
            />
            
            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "#2C2C2E" }}
              >
                <Upload className="w-6 h-6" strokeWidth={2} style={{ color: "#8E8E93" }} />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
                  Drop files here or click to browse
                </p>
                <p className="text-xs mt-1" style={{ color: "#8E8E93", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                  Design files, images, vectors, videos, and audio
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="px-6 py-3">
            <div 
              className="p-3 rounded-lg border"
              style={{ 
                backgroundColor: "rgba(239, 68, 68, 0.1)", 
                borderColor: "rgba(239, 68, 68, 0.3)" 
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} style={{ color: "#EF4444" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-400 mb-1" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
                    {validationErrors.length === 1 ? "File could not be added" : `${validationErrors.length} files could not be added`}
                  </p>
                  <ul className="text-xs text-red-300 space-y-0.5">
                    {validationErrors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {validationErrors.length > 3 && (
                      <li>...and {validationErrors.length - 3} more</li>
                    )}
                  </ul>
                </div>
                <button
                  onClick={() => setValidationErrors([])}
                  className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "#EF4444" }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="px-6 py-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {files.map((fileInfo, index) => {
                const extension = fileInfo.file.name.slice(fileInfo.file.name.lastIndexOf(".")).toLowerCase();
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: "#2C2C2E" }}
                  >
                    {/* Preview or Icon */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#3C3C3E" }}>
                      {fileInfo.preview ? (
                        <img src={fileInfo.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getCategoryIcon(extension)
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
                        {fileInfo.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: "#8E8E93" }}>
                          {formatFileSize(fileInfo.file.size)}
                        </span>
                        {fileInfo.status === "error" && (
                          <span className="text-xs text-red-400">{fileInfo.error}</span>
                        )}
                      </div>
                      {fileInfo.status === "uploading" && (
                        <Progress value={fileInfo.progress} className="h-1 mt-2" />
                      )}
                    </div>

                    {/* Status / Remove */}
                    <div className="flex-shrink-0">
                      {fileInfo.status === "complete" ? (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" strokeWidth={2} style={{ color: "#22C55E" }} />
                        </div>
                      ) : fileInfo.status === "error" ? (
                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                          <X className="w-3.5 h-3.5" strokeWidth={2} style={{ color: "#EF4444" }} />
                        </div>
                      ) : fileInfo.status === "uploading" ? (
                        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "#8E8E93" }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Supported Formats Info */}
        <div className="px-6 py-3 border-t" style={{ borderColor: "#2C2C2E" }}>
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: "#6B7280" }}>
            <div>
              <span className="font-medium text-gray-400">Design:</span> .fig, .ai, .psd, .xd, .sketch
            </div>
            <div>
              <span className="font-medium text-gray-400">Images:</span> .png, .jpg, .webp, .gif
            </div>
            <div>
              <span className="font-medium text-gray-400">Vector:</span> .svg, .eps, .pdf
            </div>
            <div>
              <span className="font-medium text-gray-400">Video:</span> .mp4, .mov
            </div>
            <div>
              <span className="font-medium text-gray-400">Audio:</span> .mp3, .wav, .aac, .flac
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex justify-end gap-3 border-t" style={{ borderColor: "#2C2C2E" }}>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-gray-400 hover:text-foreground hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={files.length === 0 || isUploading || files.every(f => f.status === "complete")}
            className="bg-indigo-600 hover:bg-indigo-700 text-foreground disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
