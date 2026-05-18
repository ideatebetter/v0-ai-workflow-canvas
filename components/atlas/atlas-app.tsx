"use client";

import { useState, useCallback, useEffect } from "react";
import type { Canvas, WorkspaceSettings, CanvasFramework } from "@/lib/atlas-types";
import { INITIAL_CANVASES, DEFAULT_WORKSPACE_SETTINGS, SAMPLE_FRAMEWORKS } from "@/lib/atlas-types";
import { HomePage } from "./home-page";
import { AtlasEditor } from "./atlas-editor";

type View = "home" | "canvas";

const STORAGE_KEY = "atlas-canvases";
const SETTINGS_STORAGE_KEY = "atlas-workspace-settings";

// Load canvases from localStorage
function loadCanvases(): Canvas[] {
  if (typeof window === "undefined") return INITIAL_CANVASES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with initial canvases to ensure we have defaults
      return parsed.length > 0 ? parsed : INITIAL_CANVASES;
    }
  } catch (e) {
    console.error("Failed to load canvases from localStorage:", e);
  }
  return INITIAL_CANVASES;
}

// Load settings from localStorage
function loadSettings(): WorkspaceSettings {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE_SETTINGS;
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load settings from localStorage:", e);
  }
  return DEFAULT_WORKSPACE_SETTINGS;
}

export function AtlasApp() {
  const [view, setView] = useState<View>("home");
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [canvases, setCanvases] = useState<Canvas[]>(INITIAL_CANVASES);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>(DEFAULT_WORKSPACE_SETTINGS);
  const [frameworks, setFrameworks] = useState<CanvasFramework[]>(SAMPLE_FRAMEWORKS);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    setCanvases(loadCanvases());
    setWorkspaceSettings(loadSettings());
    setIsHydrated(true);
  }, []);

  // Save canvases to localStorage whenever they change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(canvases));
      } catch (e) {
        console.error("Failed to save canvases to localStorage:", e);
      }
    }
  }, [canvases, isHydrated]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(workspaceSettings));
      } catch (e) {
        console.error("Failed to save settings to localStorage:", e);
      }
    }
  }, [workspaceSettings, isHydrated]);

  const handleOpenCanvas = useCallback((canvasId: string) => {
    setActiveCanvasId(canvasId);
    setView("canvas");
  }, []);

  const handleBack = useCallback(() => {
    setView("home");
    setActiveCanvasId(null);
  }, []);

  const handleCanvasChange = useCallback((updatedCanvas: Canvas) => {
    setCanvases((prev) =>
      prev.map((c) => (c.id === updatedCanvas.id ? updatedCanvas : c))
    );
  }, []);

  const handleSaveFramework = useCallback((framework: CanvasFramework) => {
    setFrameworks((prev) => [framework, ...prev]);
  }, []);

  const handleRemoveFramework = useCallback((frameworkId: string) => {
    setFrameworks((prev) => prev.filter((f) => f.id !== frameworkId));
  }, []);

  // Handle copying/moving nodes to a different canvas
  const handleCopyNodesToCanvas = useCallback((targetCanvasId: string, nodes: import("@/lib/atlas-types").AtlasNode[], mode: "move" | "copy") => {
    setCanvases((prev) => 
      prev.map((canvas) => {
        if (canvas.id === targetCanvasId) {
          // Generate new IDs for the copied nodes to avoid conflicts
          const newNodes = nodes.map((node) => ({
            ...node,
            id: `${node.id}-${mode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            position: {
              x: node.position.x + 50,
              y: node.position.y + 50,
            },
            selected: false,
          }));
          return {
            ...canvas,
            nodes: [...canvas.nodes, ...newNodes],
          };
        }
        return canvas;
      })
    );
  }, []);

  // Handle creating a new canvas and transferring nodes to it
  const handleCreateCanvasWithNodes = useCallback((canvasName: string, nodes: import("@/lib/atlas-types").AtlasNode[], mode: "move" | "copy") => {
    const newCanvasId = `canvas-${Date.now()}`;
    const newNodes = nodes.map((node) => ({
      ...node,
      id: `${node.id}-${mode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: node.position.x,
        y: node.position.y,
      },
      selected: false,
    }));
    
    const newCanvas: import("@/lib/atlas-types").Canvas = {
      id: newCanvasId,
      name: canvasName,
      nodes: newNodes,
      edges: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setCanvases((prev) => [...prev, newCanvas]);
  }, []);

  const activeCanvas = canvases.find((c) => c.id === activeCanvasId);

  if (view === "canvas" && activeCanvas) {
    return (
      <AtlasEditor
        canvas={activeCanvas}
        onCanvasChange={handleCanvasChange}
        onBack={handleBack}
        workspaceSettings={workspaceSettings}
        onWorkspaceSettingsChange={setWorkspaceSettings}
        onSaveFramework={handleSaveFramework}
        canvases={canvases}
        onCopyNodesToCanvas={handleCopyNodesToCanvas}
        onCreateCanvasWithNodes={handleCreateCanvasWithNodes}
      />
    );
  }

  return (
    <HomePage
      onOpenCanvas={handleOpenCanvas}
      workspaceSettings={workspaceSettings}
      onWorkspaceSettingsChange={setWorkspaceSettings}
      canvases={canvases}
      onCanvasesChange={setCanvases}
      frameworks={frameworks}
      onFrameworksChange={setFrameworks}
      onRemoveFramework={handleRemoveFramework}
    />
  );
}
