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
  const [recentCanvasIds, setRecentCanvasIds] = useState<string[]>([]);

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
    // Track recent canvas history (most recent first, max 5)
    setRecentCanvasIds(prev => {
      const filtered = prev.filter(id => id !== canvasId);
      return [canvasId, ...filtered].slice(0, 5);
    });
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

  // Handle syncing two files together
  const handleSyncFiles = useCallback((sourceNodeId: string, targetNodeId: string, targetCanvasId: string) => {
    // Generate a new sync group ID or use existing one
    const syncGroupId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setCanvases((prev) => {
      // First, find if either node already has a syncGroupId
      let existingSyncGroupId: string | null = null;
      
      for (const canvas of prev) {
        for (const node of canvas.nodes) {
          if (node.id === sourceNodeId || node.id === targetNodeId) {
            const nodeData = node.data as import("@/lib/atlas-types").FileNodeData;
            if (nodeData.syncGroupId) {
              existingSyncGroupId = nodeData.syncGroupId;
              break;
            }
          }
        }
        if (existingSyncGroupId) break;
      }
      
      const finalSyncGroupId = existingSyncGroupId || syncGroupId;
      
      return prev.map((canvas) => ({
        ...canvas,
        nodes: canvas.nodes.map((node) => {
          if (node.id === sourceNodeId || node.id === targetNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                syncGroupId: finalSyncGroupId,
              },
            };
          }
          return node;
        }),
      }));
    });
  }, []);

  // Handle unsyncing a file
  const handleUnsyncFile = useCallback((nodeId: string) => {
    setCanvases((prev) => 
      prev.map((canvas) => ({
        ...canvas,
        nodes: canvas.nodes.map((node) => {
          if (node.id === nodeId) {
            const { syncGroupId, ...restData } = node.data as import("@/lib/atlas-types").FileNodeData & { syncGroupId?: string };
            return {
              ...node,
              data: restData,
            };
          }
          return node;
        }),
      }))
    );
  }, []);

  // Propagate file updates to all synced files
  const handleCanvasChangeWithSync = useCallback((updatedCanvas: import("@/lib/atlas-types").Canvas) => {
    setCanvases((prev) => {
      // First, find what changed in the updated canvas
      const previousCanvas = prev.find(c => c.id === updatedCanvas.id);
      if (!previousCanvas) {
        return prev.map((c) => (c.id === updatedCanvas.id ? updatedCanvas : c));
      }
      
      // Find nodes that have changed and have a syncGroupId
      const changedSyncedNodes: Array<{ syncGroupId: string; data: import("@/lib/atlas-types").FileNodeData }> = [];
      
      for (const updatedNode of updatedCanvas.nodes) {
        const nodeData = updatedNode.data as import("@/lib/atlas-types").FileNodeData;
        if (nodeData.syncGroupId) {
          const prevNode = previousCanvas.nodes.find(n => n.id === updatedNode.id);
          if (prevNode) {
            const prevData = prevNode.data as import("@/lib/atlas-types").FileNodeData;
            // Check if relevant sync fields changed (uploadedFile, versions, activities, previewImages)
            if (
              JSON.stringify(nodeData.uploadedFile) !== JSON.stringify(prevData.uploadedFile) ||
              JSON.stringify(nodeData.versions) !== JSON.stringify(prevData.versions) ||
              JSON.stringify(nodeData.activities) !== JSON.stringify(prevData.activities) ||
              JSON.stringify(nodeData.previewImages) !== JSON.stringify(prevData.previewImages)
            ) {
              changedSyncedNodes.push({ syncGroupId: nodeData.syncGroupId, data: nodeData });
            }
          }
        }
      }
      
      // If no synced nodes changed, just update normally
      if (changedSyncedNodes.length === 0) {
        return prev.map((c) => (c.id === updatedCanvas.id ? updatedCanvas : c));
      }
      
      // Propagate changes to all canvases
      return prev.map((canvas) => {
        if (canvas.id === updatedCanvas.id) {
          return updatedCanvas;
        }
        
        // Check if this canvas has any nodes in the changed sync groups
        let hasChanges = false;
        const updatedNodes = canvas.nodes.map((node) => {
          const nodeData = node.data as import("@/lib/atlas-types").FileNodeData;
          const matchingChange = changedSyncedNodes.find(c => c.syncGroupId === nodeData.syncGroupId);
          
          if (matchingChange) {
            hasChanges = true;
            return {
              ...node,
              data: {
                ...node.data,
                uploadedFile: matchingChange.data.uploadedFile,
                versions: matchingChange.data.versions,
                activities: matchingChange.data.activities,
                previewImages: matchingChange.data.previewImages,
                lastModified: matchingChange.data.lastModified,
              },
            };
          }
          return node;
        });
        
        if (hasChanges) {
          return {
            ...canvas,
            nodes: updatedNodes,
            updatedAt: new Date().toISOString(),
          };
        }
        
        return canvas;
      });
    });
  }, []);

  const activeCanvas = canvases.find((c) => c.id === activeCanvasId);

  // Get recent canvases (excluding current, max 5)
  const recentCanvases = recentCanvasIds
    .filter(id => id !== activeCanvasId)
    .map(id => canvases.find(c => c.id === id))
    .filter((c): c is Canvas => c !== undefined)
    .slice(0, 5);

  if (view === "canvas" && activeCanvas) {
    return (
      <AtlasEditor
        canvas={activeCanvas}
        onCanvasChange={handleCanvasChangeWithSync}
        onBack={handleBack}
        workspaceSettings={workspaceSettings}
        onWorkspaceSettingsChange={setWorkspaceSettings}
        onSaveFramework={handleSaveFramework}
        canvases={canvases}
        onCopyNodesToCanvas={handleCopyNodesToCanvas}
        onCreateCanvasWithNodes={handleCreateCanvasWithNodes}
        onSyncFiles={handleSyncFiles}
        onUnsyncFile={handleUnsyncFile}
        recentCanvases={recentCanvases}
        onSwitchCanvas={handleOpenCanvas}
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
