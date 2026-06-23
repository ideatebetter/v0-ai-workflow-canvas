"use client";

import React, { useState, useEffect } from "react";
import type { CanvasFramework, FrameworkParameter } from "@/lib/atlas-types";

type FileEntry = { url: string; fileName: string; fileType: "image" | "video" };

interface FrameworkRunDialogProps {
  framework: CanvasFramework | null;
  isOpen: boolean;
  onClose: () => void;
  onRun: (
    framework: CanvasFramework,
    paramValues: Record<string, string>,
    fileValues: Record<string, FileEntry[]>
  ) => void;
}

export function FrameworkRunDialog({ framework, isOpen, onClose, onRun }: FrameworkRunDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [fileValues, setFileValues] = useState<Record<string, FileEntry[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && framework) {
      const initial: Record<string, string> = {};
      (framework.parameters ?? []).forEach(p => {
        initial[p.id] = p.defaultValue ?? "";
      });
      setValues(initial);
      setFileValues({});
      setErrors({});
    }
  }, [isOpen, framework]);

  if (!isOpen || !framework) return null;

  const params = framework.parameters ?? [];

  const validate = () => {
    const next: Record<string, string> = {};
    for (const p of params) {
      if (p.required) {
        if (p.type === "file") {
          if (!fileValues[p.id]?.length) next[p.id] = `${p.label} is required`;
        } else if (!values[p.id]?.trim()) {
          next[p.id] = `${p.label} is required`;
        }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRun = () => {
    if (!validate()) return;
    onRun(framework, values, fileValues);
    onClose();
  };

  const paramCount = params.length;
  const nodeCount = framework.nodes.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-start gap-4 flex-shrink-0" style={{ borderBottom: "1px solid #333333" }}>
          {framework.previewImage ? (
            <img src={framework.previewImage} alt="" className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#252525", border: "1px solid #333" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="#555" strokeWidth="1.5"/><path d="M7 10H13M10 7V13" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{framework.name}</h2>
            {framework.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{framework.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{nodeCount} node{nodeCount !== 1 ? "s" : ""}</span>
              {paramCount > 0 && (
                <span className="text-[10px] text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{paramCount} parameter{paramCount !== 1 ? "s" : ""}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Parameters form */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {params.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#252525", border: "1px solid #333" }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4V18M4 11H18" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p className="text-sm text-gray-400 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No parameters to fill in</p>
              <p className="text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>This framework will be added to your canvas as-is.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Fill in the values below. They will be substituted into the framework nodes.
              </p>
              {params.map(param => (
                <ParameterInput
                  key={param.id}
                  param={param}
                  value={values[param.id] ?? ""}
                  files={fileValues[param.id] ?? []}
                  error={errors[param.id]}
                  onChange={val => {
                    setValues(prev => ({ ...prev, [param.id]: val }));
                    if (errors[param.id]) setErrors(prev => ({ ...prev, [param.id]: "" }));
                  }}
                  onFilesChange={files => {
                    setFileValues(prev => ({ ...prev, [param.id]: files }));
                    if (errors[param.id]) setErrors(prev => ({ ...prev, [param.id]: "" }));
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0" style={{ borderTop: "1px solid #333333" }}>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRun}
            className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            style={{ backgroundColor: "#F0FE00", color: "#0a0a0a", fontFamily: "system-ui, Inter, sans-serif" }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M4 2.5L12 7.5L4 12.5V2.5Z" fill="currentColor"/></svg>
            Run Framework
          </button>
        </div>
      </div>
    </div>
  );
}

function ParameterInput({
  param,
  value,
  files,
  error,
  onChange,
  onFilesChange,
}: {
  param: FrameworkParameter;
  value: string;
  files: FileEntry[];
  error?: string;
  onChange: (val: string) => void;
  onFilesChange: (files: FileEntry[]) => void;
}) {
  const labelEl = (
    <label className="block text-sm font-medium text-gray-300 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
      {param.label}
      {param.required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );

  const inputStyle = {
    backgroundColor: "#252525",
    border: `1px solid ${error ? "#ef4444" : "#333333"}`,
    fontFamily: "system-ui, Inter, sans-serif",
  };

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F0FE00]/40";

  return (
    <div>
      {labelEl}
      {param.type === "textarea" && (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={param.placeholder ?? `Enter ${param.label.toLowerCase()}...`}
          rows={3}
          className={`${inputClass} resize-none`}
          style={inputStyle}
        />
      )}
      {param.type === "text" && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={param.placeholder ?? `Enter ${param.label.toLowerCase()}...`}
          className={inputClass}
          style={inputStyle}
        />
      )}
      {param.type === "color" && (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value || "#ffffff"}
            onChange={e => onChange(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
          />
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="#ffffff"
            className={`${inputClass} flex-1`}
            style={inputStyle}
          />
        </div>
      )}
      {param.type === "image" && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={param.placeholder ?? "Paste image URL..."}
          className={inputClass}
          style={inputStyle}
        />
      )}
      {param.type === "file" && (
        <FileUploadInput
          multiple={param.multiple ?? false}
          files={files}
          onChange={onFilesChange}
          inputStyle={inputStyle}
        />
      )}
      {param.type === "select" && (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={inputClass}
          style={inputStyle}
        >
          <option value="">Select an option...</option>
          {(param.options ?? []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
      {error && <p className="mt-1 text-xs text-red-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{error}</p>}
    </div>
  );
}

function FileUploadInput({
  multiple,
  files,
  onChange,
  inputStyle,
}: {
  multiple: boolean;
  files: FileEntry[];
  onChange: (files: FileEntry[]) => void;
  inputStyle: React.CSSProperties;
}) {
  const [loading, setLoading] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);
    const results: FileEntry[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isVideo = file.type.startsWith("video/");
      const reader = new FileReader();
      const url: string = await new Promise(res => {
        reader.onload = e => res(e.target?.result as string ?? "");
        reader.readAsDataURL(file);
      });
      results.push({ url, fileName: file.name, fileType: isVideo ? "video" : "image" });
    }
    onChange(multiple ? [...files, ...results] : results.slice(0, 1));
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <label
        className="flex flex-col items-center justify-center gap-2 w-full py-5 rounded-lg cursor-pointer transition-colors hover:opacity-80"
        style={{ ...inputStyle, border: "1.5px dashed #444" }}
      >
        <input
          type="file"
          accept="image/*,video/*"
          multiple={multiple}
          className="sr-only"
          onChange={e => handleFiles(e.target.files)}
        />
        {loading ? (
          <svg className="animate-spin w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4V14M4 10H16" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {multiple ? "Upload images / videos" : "Upload a file"}
        </span>
      </label>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="relative group rounded-lg overflow-hidden flex-shrink-0"
              style={{ width: 64, height: 64, backgroundColor: "#252525", border: "1px solid #333" }}
            >
              {f.fileType === "image" ? (
                <img src={f.url} alt={f.fileName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 4L15 10L5 16V4Z" fill="#555"/></svg>
                </div>
              )}
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
