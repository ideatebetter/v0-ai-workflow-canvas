"use client";

import { useState, useCallback, useEffect } from "react";
import type { Canvas, WorkspaceSettings, CanvasFramework } from "@/lib/atlas-types";
import { INITIAL_CANVASES, DEFAULT_WORKSPACE_SETTINGS, SAMPLE_FRAMEWORKS } from "@/lib/atlas-types";
import { HomePage } from "./home-page";
import { AtlasEditor } from "./atlas-editor";
import { useAuth } from "@/lib/auth-context";

type View = "home" | "canvas";

const SETTINGS_STORAGE_KEY = "atlas-workspace-settings";

// Load settings from localStorage (settings can stay local for now)
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
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>("home");
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>(DEFAULT_WORKSPACE_SETTINGS);
  const [frameworks, setFrameworks] = useState<CanvasFramework[]>(SAMPLE_FRAMEWORKS);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoadingCanvases, setIsLoadingCanvases] = useState(true);
  const [recentCanvasIds, setRecentCanvasIds] = useState<string[]>([]);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load canvases from API
  const loadCanvasesFromAPI = useCallback(async () => {
    if (!user) {
      console.log("[v0] No user, using INITIAL_CANVASES");
      setCanvases(INITIAL_CANVASES);
      setIsLoadingCanvases(false);
      return;
    }

    console.log("[v0] Loading canvases from API for user:", user.id);

    try {
      const response = await fetch("/api/canvas");
      console.log("[v0] API response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("[v0] Loaded canvases from API:", data.canvases?.length || 0);
        if (data.canvases && data.canvases.length > 0) {
          // Transform API response to match Canvas type
          const loadedCanvases: Canvas[] = data.canvases.map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            nodes: c.nodes || [],
            edges: c.edges || [],
            comments: c.comments || [],
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
          console.log("[v0] Setting canvases:", loadedCanvases.map(c => c.name));
          setCanvases(loadedCanvases);
        } else {
          // No canvases in database, use initial canvases
          console.log("[v0] No canvases in DB, using INITIAL_CANVASES");
          setCanvases(INITIAL_CANVASES);
        }
      } else {
        console.error("[v0] Failed to load canvases from API:", response.statusText);
        setCanvases(INITIAL_CANVASES);
      }
    } catch (error) {
      console.error("[v0] Error loading canvases:", error);
      setCanvases(INITIAL_CANVASES);
    } finally {
      setIsLoadingCanvases(false);
    }
  }, [user]);

  // Save canvas to API (debounced)
  const saveCanvasToAPI = useCallback(async (canvas: Canvas) => {
    if (!user) {
      console.log("[v0] No user, skipping save");
      return;
    }

    console.log("[v0] Saving canvas to API:", canvas.name, canvas.id);

    try {
      // Check if canvas exists in database
      const checkResponse = await fetch(`/api/canvas?id=${canvas.id}`);
      const exists = checkResponse.ok;
      console.log("[v0] Canvas exists in DB:", exists);

      if (exists) {
        // Update existing canvas
        console.log("[v0] Updating existing canvas");
        const updateResponse = await fetch("/api/canvas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: canvas.id,
            name: canvas.name,
            description: canvas.description,
            nodes: canvas.nodes,
            edges: canvas.edges,
            settings: { comments: canvas.comments },
          }),
        });
        console.log("[v0] Update response:", updateResponse.status);
      } else {
        // Create new canvas
        console.log("[v0] Creating new canvas");
        const response = await fetch("/api/canvas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: canvas.name,
            description: canvas.description,
            nodes: canvas.nodes,
            edges: canvas.edges,
            settings: { comments: canvas.comments },
          }),
        });
        
        console.log("[v0] Create response:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("[v0] Created canvas with new ID:", data.canvas?.id);
          // Update local canvas with database ID
          setCanvases(prev => prev.map(c => 
            c.id === canvas.id ? { ...c, id: data.canvas.id } : c
          ));
        }
      }
    } catch (error) {
      console.error("[v0] Error saving canvas:", error);
    }
  }, [user]);

  // Load settings and canvases on mount
  useEffect(() => {
    setWorkspaceSettings(loadSettings());
    setIsHydrated(true);
  }, []);

  // Load canvases when user changes
  useEffect(() => {
    if (!authLoading) {
      loadCanvasesFromAPI();
    }
  }, [user, authLoading, loadCanvasesFromAPI]);

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

  // Force save all canvases to cloud
  const handleSaveAllToCloud = useCallback(async () => {
    if (!user) {
      console.log("[v0] No user, cannot save to cloud");
      return;
    }
    
    console.log("[v0] Force saving all canvases to cloud:", canvases.length);
    
    for (const canvas of canvases) {
      await saveCanvasToAPI(canvas);
    }
    
    console.log("[v0] All canvases saved to cloud");
    alert(`Saved ${canvases.length} canvases to cloud!`);
  }, [user, canvases, saveCanvasToAPI]);

  const handleCanvasChange = useCallback((updatedCanvas: Canvas) => {
    setCanvases((prev) =>
      prev.map((c) => (c.id === updatedCanvas.id ? updatedCanvas : c))
    );
    
    // Debounce API save
    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(() => {
      saveCanvasToAPI(updatedCanvas);
    }, 1000); // Save after 1 second of no changes
    setSaveTimeout(timeout);
  }, [saveCanvasToAPI, saveTimeout]);

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
  const handleCreateCanvasWithNodes = useCallback(async (canvasName: string, nodes: import("@/lib/atlas-types").AtlasNode[], mode: "move" | "copy") => {
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
    
    // Save to API if user is logged in
    if (user) {
      try {
        const response = await fetch("/api/canvas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: canvasName,
            nodes: newNodes,
            edges: [],
            settings: { comments: [] },
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          // Update local canvas with database ID
          setCanvases(prev => prev.map(c => 
            c.id === newCanvasId ? { ...c, id: data.canvas.id } : c
          ));
        }
      } catch (error) {
        console.error("Error creating canvas:", error);
      }
    }
  }, [user]);

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
    let canvasesToSave: import("@/lib/atlas-types").Canvas[] = [];
    
    setCanvases((prev) => {
      // First, find what changed in the updated canvas
      const previousCanvas = prev.find(c => c.id === updatedCanvas.id);
      if (!previousCanvas) {
        canvasesToSave = [updatedCanvas];
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
        canvasesToSave = [updatedCanvas];
        return prev.map((c) => (c.id === updatedCanvas.id ? updatedCanvas : c));
      }
      
      // Propagate changes to all canvases
      const newCanvases = prev.map((canvas) => {
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
          const updatedSyncedCanvas = {
            ...canvas,
            nodes: updatedNodes,
            updatedAt: new Date().toISOString(),
          };
          canvasesToSave.push(updatedSyncedCanvas);
          return updatedSyncedCanvas;
        }
        
        return canvas;
      });
      
      // Add the primary canvas to save list
      canvasesToSave.unshift(updatedCanvas);
      
      return newCanvases;
    });
    
    // Debounce API save for all affected canvases
    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(() => {
      canvasesToSave.forEach(canvas => saveCanvasToAPI(canvas));
    }, 1000);
    setSaveTimeout(timeout);
  }, [saveCanvasToAPI, saveTimeout]);

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
> <HomePage
  onOpenCanvas={handleOpenCanvas}
  workspaceSettings={workspaceSettings}
  onWorkspaceSettingsChange={setWorkspaceSettings}
  canvases={canvases}
  onCanvasesChange={setCanvases}
  onSaveAllToCloud={handleSaveAllToCloud}
  isLoadingCanvases={isLoadingCanvases}
      frameworks={frameworks}
      onFrameworksChange={setFrameworks}
      onRemoveFramework={handleRemoveFramework}
    />
  );
}
