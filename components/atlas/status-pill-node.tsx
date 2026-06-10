"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface StatusPillData {
  label: string;
  color: string;
}

const PRESET_COLORS = [
  { name: "Gray", value: "#e5e5e5" },
  { name: "Blue", value: "#93c5fd" },
  { name: "Green", value: "#86efac" },
  { name: "Yellow", value: "#fde047" },
  { name: "Orange", value: "#fdba74" },
  { name: "Red", value: "#fca5a5" },
  { name: "Purple", value: "#c4b5fd" },
  { name: "Pink", value: "#f9a8d4" },
];

export function StatusPillNode({ id, data, selected }: NodeProps) {
  const pillData = data as StatusPillData;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(pillData.label);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      // Update the label through React Flow's data update
      if (editValue.trim() && editValue !== pillData.label) {
        pillData.label = editValue.trim();
      }
    } else if (e.key === "Escape") {
      setEditValue(pillData.label);
      setIsEditing(false);
    }
  }, [editValue, pillData]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== pillData.label) {
      pillData.label = editValue.trim();
    }
  }, [editValue, pillData]);

  const handleColorChange = useCallback((color: string) => {
    pillData.color = color;
    setShowColorPicker(false);
  }, [pillData]);

  return (
    <div className="relative group">
      {/* Connection handles - visible on hover */}
      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0 group-hover:opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #525252", width: 20, height: 20 }}
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          window.dispatchEvent(new CustomEvent("atlas:handle-click", {
            detail: { 
              nodeId: id,
              handleType: "target",
              position: { x: rect.left, y: rect.top + rect.height / 2 }
            }
          }));
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0 group-hover:opacity-100 transition-all !cursor-pointer"
        style={{ background: "#1a1a1a", border: "2px solid #525252", width: 20, height: 20 }}
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          window.dispatchEvent(new CustomEvent("atlas:handle-click", {
            detail: { 
              nodeId: id,
              handleType: "source",
              position: { x: rect.right, y: rect.top + rect.height / 2 }
            }
          }));
        }}
      />

      {/* Main Pill */}
      <div
        className="relative px-8 py-4 rounded-full cursor-move transition-all"
        style={{
          backgroundColor: pillData.color || "#e5e5e5",
          minWidth: 180,
          outline: selected ? "2px solid white" : "none",
          outlineOffset: 2,
        }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Left resize handle - visual only */}
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        />

        {/* Right resize handle - visual only */}
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        />

        {/* Label */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="nodrag w-full bg-transparent text-center text-lg font-semibold text-black focus:outline-none"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          />
        ) : (
          <div
            className="text-center text-lg font-semibold text-black select-none"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            {pillData.label}
          </div>
        )}
      </div>

      {/* Color picker dot */}
      <div className="nodrag relative" ref={colorPickerRef}>
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
          style={{ backgroundColor: pillData.color || "#e5e5e5" }}
          title="Change color"
        />

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div
            className="absolute right-0 top-full mt-2 p-2 rounded-lg shadow-lg grid grid-cols-4 gap-1.5 z-50"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
          >
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleColorChange(color.value)}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                  pillData.color === color.value ? "ring-2 ring-white ring-offset-1 ring-offset-[#1a1a1a]" : ""
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit hint */}
      {selected && !isEditing && (
        <div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap"
          style={{
            backgroundColor: "#333333",
            color: "#999999",
            fontFamily: "system-ui, Inter, sans-serif",
          }}
        >
          Double-click to edit
        </div>
      )}
    </div>
  );
}
