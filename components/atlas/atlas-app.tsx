"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Canvas, WorkspaceSettings, CanvasFramework, WorkspaceMember } from "@/lib/atlas-types";
import { INITIAL_CANVASES, DEFAULT_WORKSPACE_SETTINGS, WORKSPACE_MEMBERS, DEMO_EMAIL, FAKE_MEMBER_IDS } from "@/lib/atlas-types";
import { HomePage } from "./home-page";
import { AtlasEditor } from "./atlas-editor";
import { useAuth } from "@/lib/auth-context";

type View = "home" | "canvas";

const ACTIVE_WORKSPACE_SESSION_KEY = "atlas-active-workspace";
const WORKSPACES_CACHE_SESSION_KEY = "atlas-workspaces-cache";

export function AtlasApp() {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>("home");
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceSettings[]>(() => {
    try {
      const cached = sessionStorage.getItem(WORKSPACES_CACHE_SESSION_KEY);
      if (cached) {
        const parsed: Array<{ id: string; name: string; description: string }> = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((w: any) => ({ ...DEFAULT_WORKSPACE_SETTINGS, id: w.id, name: w.name, description: w.description ?? "", branding: w.branding ?? DEFAULT_WORKSPACE_SETTINGS.branding }));
        }
      }
    } catch { /* ignore */ }
    return [DEFAULT_WORKSPACE_SETTINGS];
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    try {
      const savedId = sessionStorage.getItem(ACTIVE_WORKSPACE_SESSION_KEY);
      if (savedId) return savedId;
    } catch { /* ignore */ }
    return DEFAULT_WORKSPACE_SETTINGS.id;
  });
  const workspaceSettings: WorkspaceSettings = workspaces.find(w => w.id === activeWorkspaceId) ?? workspaces[0];
  const [frameworks, setFrameworks] = useState<CanvasFramework[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoadingCanvases, setIsLoadingCanvases] = useState(true);
  const [isWorkspaceSynced, setIsWorkspaceSynced] = useState(false);
  const [recentCanvasIds, setRecentCanvasIds] = useState<string[]>([]);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const savingCanvasesRef = useRef<Set<string>>(new Set()); // Track canvases currently being saved
  const [deepLinkNodeId, setDeepLinkNodeId] = useState<string | null>(null);

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
          const loadedCanvases: Canvas[] = data.canvases.map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            workspaceId: c.settings?.workspaceId || undefined,
            nodes: c.nodes || [],
            edges: c.edges || [],
            comments: c.settings?.comments || c.comments || [],
            pages: c.settings?.pages || [],
            activePageId: c.settings?.activePageId || undefined,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
          console.log("[v0] Setting canvases:", loadedCanvases.map(c => c.name));
          setCanvases(loadedCanvases);
        } else {
          // No canvases in DB — demo account keeps placeholder data, real users start fresh
          const isDemo = user.email === DEMO_EMAIL;
          console.log("[v0] No canvases in DB,", isDemo ? "using INITIAL_CANVASES (demo)" : "starting fresh");
          setCanvases(isDemo ? INITIAL_CANVASES : []);
        }
      } else {
        console.error("[v0] Failed to load canvases from API:", response.statusText);
        setCanvases(user.email === DEMO_EMAIL ? INITIAL_CANVASES : []);
      }
    } catch (error) {
      console.error("[v0] Error loading canvases:", error);
      setCanvases(user.email === DEMO_EMAIL ? INITIAL_CANVASES : []);
    } finally {
      setIsLoadingCanvases(false);
    }
  }, [user]);


  // Save canvas to API (debounced)
  const saveCanvasToAPI = useCallback(async (canvas: Canvas) => {
    if (!user) return;
    
    // Skip if this canvas is already being saved (prevent double-saves during ID update)
    if (savingCanvasesRef.current.has(canvas.id)) {
      console.log("[v0] Canvas already being saved, skipping:", canvas.id);
      return;
    }
    
    savingCanvasesRef.current.add(canvas.id);
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
            settings: {
              comments: canvas.comments,
              pages: canvas.pages,
              activePageId: canvas.activePageId,
              workspaceId: canvas.workspaceId,
            },
          }),
        });
        console.log("[v0] Update response:", updateResponse.status);
        savingCanvasesRef.current.delete(canvas.id);
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
            settings: { comments: canvas.comments, workspaceId: canvas.workspaceId },
          }),
        });
        
        console.log("[v0] Create response:", response.status);
        if (response.ok) {
          const data = await response.json();
          const newId = data.canvas?.id;
          console.log("[v0] Created canvas with new ID:", newId);
          // Track the new ID as "being saved" to prevent re-detection
          if (newId) {
            savingCanvasesRef.current.add(newId);
          }
          // Update local canvas with database ID
          setCanvases(prev => prev.map(c => 
            c.id === canvas.id ? { ...c, id: newId } : c
          ));
          // Clean up both old and new IDs after state settles
          setTimeout(() => {
            savingCanvasesRef.current.delete(canvas.id);
            if (newId) savingCanvasesRef.current.delete(newId);
          }, 100);
        } else {
          savingCanvasesRef.current.delete(canvas.id);
        }
      }
    } catch (error) {
      console.error("[v0] Error saving canvas:", error);
      savingCanvasesRef.current.delete(canvas.id);
    }
  }, [user]);

  // Handle deep links on mount (?canvas=&node=)
  useEffect(() => {
    setIsHydrated(true);
    try {
      if (sessionStorage.getItem(WORKSPACES_CACHE_SESSION_KEY)) setIsWorkspaceSynced(true);
    } catch { /* ignore */ }
    const params = new URLSearchParams(window.location.search);
    const targetCanvas = params.get("canvas");
    const targetNode = params.get("node");
    if (targetCanvas) {
      setActiveCanvasId(targetCanvas);
      setView("canvas");
      if (targetNode) {
        setDeepLinkNodeId(targetNode);
        // Strip the one-time ?node= param but keep ?canvas= so refresh works
        window.history.replaceState({}, "", `?canvas=${targetCanvas}`);
      }
    }
  }, []);

  // Load canvases when user changes
  useEffect(() => {
    if (!authLoading) {
      loadCanvasesFromAPI();
    }
  }, [user, authLoading, loadCanvasesFromAPI]);

  // Load all workspaces from Supabase on login. Workspace identity lives in Supabase only.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setWorkspaces([DEFAULT_WORKSPACE_SETTINGS]);
      setActiveWorkspaceId(DEFAULT_WORKSPACE_SETTINGS.id);
      setIsWorkspaceSynced(true);
      return;
    }

    const isDemo = user.email === DEMO_EMAIL;
    setIsWorkspaceSynced(false);

    fetch("/api/workspace")
      .then(r => r.ok ? r.json() : null)
      .then(async (data) => {
        const serverWorkspaces: any[] = data?.workspaces ?? [];
        if (serverWorkspaces.length === 0) return;

        // Fetch members for all workspaces in parallel
        const allMembersResults = await Promise.all(
          serverWorkspaces.map(sw =>
            fetch(`/api/workspace/members?workspaceId=${sw.id}`).catch(() => null)
          )
        );
        const allMembersData = await Promise.all(
          allMembersResults.map(r => (r?.ok ? r.json().catch(() => null) : null))
        );

        const toWsMembers = (membersData: any): WorkspaceMember[] =>
          (membersData?.members ?? []).map((m: any) => ({
            id: m.userId,
            name: m.name,
            email: m.email,
            initials: m.initials,
            role: m.role,
          }));

        // Demo account: merge fake placeholder members into the primary workspace only
        const primaryMembers = toWsMembers(allMembersData[0]);
        const primaryMembersFinal = isDemo && primaryMembers.length > 0
          ? (() => {
              const realIds = new Set(primaryMembers.map((m: WorkspaceMember) => m.id));
              const fakes = WORKSPACE_MEMBERS.filter(m => FAKE_MEMBER_IDS.has(m.id) && !realIds.has(m.id));
              return [...primaryMembers, ...fakes];
            })()
          : primaryMembers;

        // Map server workspaces to WorkspaceSettings with real member lists
        const mapped: WorkspaceSettings[] = serverWorkspaces.map((sw: any, i: number) => ({
          ...DEFAULT_WORKSPACE_SETTINGS,
          id: sw.id,
          name: sw.name,
          description: sw.description ?? "",
          branding: sw.settings?.branding ?? DEFAULT_WORKSPACE_SETTINGS.branding,
          members: i === 0 ? primaryMembersFinal : toWsMembers(allMembersData[i]),
        }));

        setWorkspaces(mapped);

        // Cache workspace names/ids so next load is instant (sessionStorage = current session only)
        try {
          sessionStorage.setItem(WORKSPACES_CACHE_SESSION_KEY, JSON.stringify(
            mapped.map(w => ({ id: w.id, name: w.name, description: w.description, branding: w.branding }))
          ));
        } catch { /* ignore */ }

        // Restore last active workspace from sessionStorage
        try {
          const savedId = sessionStorage.getItem(ACTIVE_WORKSPACE_SESSION_KEY);
          if (savedId && mapped.find(w => w.id === savedId)) {
            setActiveWorkspaceId(savedId);
          } else {
            setActiveWorkspaceId(mapped[0].id);
          }
        } catch {
          setActiveWorkspaceId(mapped[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setIsWorkspaceSynced(true));
  }, [user, authLoading]);

  // Persist active workspace across page refreshes (sessionStorage only — no localStorage)
  useEffect(() => {
    if (!isHydrated || activeWorkspaceId === DEFAULT_WORKSPACE_SETTINGS.id) return;
    try { sessionStorage.setItem(ACTIVE_WORKSPACE_SESSION_KEY, activeWorkspaceId); } catch { /* ignore */ }
  }, [activeWorkspaceId, isHydrated]);

  const handleWorkspaceSettingsChange = useCallback((settings: WorkspaceSettings) => {
    setWorkspaces(prev => prev.map(w => w.id === settings.id ? settings : w));
  }, []);

  const handleSaveWorkspaceDetails = useCallback((settings: WorkspaceSettings) => {
    if (!settings.id || settings.id === DEFAULT_WORKSPACE_SETTINGS.id) return;
    fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: settings.id,
        name: settings.name,
        description: settings.description || null,
        settings: settings.branding ? { branding: settings.branding } : undefined,
      }),
    })
      .then(r => r.json().then(d => { if (!r.ok) console.error("Workspace save failed:", d); }))
      .catch(e => console.error("Workspace save error:", e));
  }, []);

  const handleWorkspaceSwitch = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
  }, []);

  const handleCreateWorkspace = useCallback(async (name: string) => {
    if (!user) return;
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);

    if (!res?.ok) return;
    const data = await res.json();
    const sw = data.workspace;
    if (!sw?.id) return;

    const displayName = (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "You";
    const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    const newWorkspace: WorkspaceSettings = {
      ...DEFAULT_WORKSPACE_SETTINGS,
      id: sw.id,
      name: sw.name,
      members: [{ id: user.id, name: displayName, email: user.email ?? "", initials, role: "owner" }],
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
    setActiveWorkspaceId(newWorkspace.id);
  }, [user]);

  const handleDeleteWorkspace = useCallback(async () => {
    if (workspaces.length <= 1) return;
    const isOwner = workspaces.find(w => w.id === activeWorkspaceId)?.members.some(
      m => m.id === user?.id && m.role === "owner"
    );

    if (isOwner) {
      await fetch(`/api/workspace?workspaceId=${activeWorkspaceId}`, { method: "DELETE" }).catch(() => {});
    }

    setWorkspaces(prev => {
      const remaining = prev.filter(w => w.id !== activeWorkspaceId);
      if (remaining.length === 0) return prev;
      setActiveWorkspaceId(remaining[0].id);
      setCanvases(c => c.filter(canvas => canvas.workspaceId !== activeWorkspaceId));
      return remaining;
    });
  }, [activeWorkspaceId, workspaces, user]);

  const handleOpenCanvas = useCallback((canvasId: string) => {
    setActiveCanvasId(canvasId);
    setView("canvas");
    window.history.replaceState({}, "", `?canvas=${canvasId}`);
    setRecentCanvasIds(prev => {
      const filtered = prev.filter(id => id !== canvasId);
      return [canvasId, ...filtered].slice(0, 5);
    });
    // Refresh canvas data from DB so Figma-synced nodes are visible immediately
    if (user) {
      fetch(`/api/canvas?id=${canvasId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data?.canvas) return;
          const c = data.canvas;
          setCanvases(prev => prev.map(canvas =>
            canvas.id === canvasId
              ? {
                  ...canvas,
                  nodes: c.nodes || [],
                  edges: c.edges || [],
                  comments: c.settings?.comments || canvas.comments,
                  pages: c.settings?.pages || canvas.pages,
                  activePageId: c.settings?.activePageId || canvas.activePageId,
                  updatedAt: c.updated_at,
                }
              : canvas
          ));
        })
        .catch(() => {});
    }
  }, [user]);

  const handleBack = useCallback(() => {
    setView("home");
    setActiveCanvasId(null);
    window.history.replaceState({}, "", "/");
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

  // Handle canvases change from home page - detects new canvases and saves them, detects deleted ones and removes them
  const handleCanvasesChange = useCallback((newCanvases: Canvas[] | ((prev: Canvas[]) => Canvas[])) => {
    setCanvases((prev) => {
      const updated = typeof newCanvases === 'function' ? newCanvases(prev) : newCanvases;

      const prevIds = new Set(prev.map(c => c.id));
      const updatedIds = new Set(updated.map(c => c.id));

      // Find new canvases (ones that don't exist in prev) and save them
      const newlyCreated = updated.filter(c => !prevIds.has(c.id));
      if (user && newlyCreated.length > 0) {
        newlyCreated.forEach(canvas => saveCanvasToAPI(canvas));
      }

      // Find deleted canvases (ones in prev but not in updated) and delete from API
      const deleted = prev.filter(c => !updatedIds.has(c.id));
      if (user && deleted.length > 0) {
        deleted.forEach(canvas => {
          fetch(`/api/canvas?id=${canvas.id}`, { method: "DELETE" }).catch(err =>
            console.error("[v0] Failed to delete canvas from API:", err)
          );
        });
      }

      return updated;
    });
  }, [user, saveCanvasToAPI]);

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
  const handleCopyNodesToCanvas = useCallback((targetCanvasId: string, nodes: import("@/lib/atlas-types").AtlasNode[], mode: "move" | "copy", targetPageId?: string) => {
    setCanvases((prev) =>
      prev.map((canvas) => {
        if (canvas.id !== targetCanvasId) return canvas;

        // Determine which destination page we're inserting into so we can check for name conflicts.
        let destinationNodes: import("@/lib/atlas-types").AtlasNode[] = [];
        if (canvas.pages && canvas.pages.length > 0) {
          const pageIndex = targetPageId
            ? canvas.pages.findIndex(p => p.id === targetPageId)
            : 0;
          const idx = pageIndex >= 0 ? pageIndex : 0;
          destinationNodes = canvas.pages[idx]?.nodes || [];
        } else {
          destinationNodes = canvas.nodes || [];
        }

        const existingLabels = new Set(
          destinationNodes
            .map(n => ((n.data as any).label || "").toLowerCase())
            .filter(Boolean)
        );

        // Normalize the group so its top-left lands at (120, 120), preserving relative positions.
        const minX = Math.min(...nodes.map((n) => n.position.x));
        const minY = Math.min(...nodes.map((n) => n.position.y));
        const ANCHOR = 120;

        const newNodes = nodes.map((node) => {
          const nodeData = node.data as any;
          const nodeLabel: string = nodeData.label || "";
          const hasDuplicate = nodeLabel && existingLabels.has(nodeLabel.toLowerCase());

          return {
            ...node,
            id: `${node.id}-${mode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            position: {
              x: node.position.x - minX + ANCHOR,
              y: node.position.y - minY + ANCHOR,
            },
            selected: false,
            data: hasDuplicate
              ? { ...node.data, label: `${nodeLabel} (copy)` }
              : node.data,
          };
        });

        // If the canvas has pages, insert into the specified page (or first page as fallback)
        if (canvas.pages && canvas.pages.length > 0) {
          const pageIndex = targetPageId
            ? canvas.pages.findIndex(p => p.id === targetPageId)
            : 0;
          const idx = pageIndex >= 0 ? pageIndex : 0;
          const updatedPages = canvas.pages.map((page, i) =>
            i === idx ? { ...page, nodes: [...page.nodes, ...newNodes] } : page
          );
          return { ...canvas, pages: updatedPages };
        }

        // No pages structure — add to canvas root
        return { ...canvas, nodes: [...canvas.nodes, ...newNodes] };
      })
    );
  }, []);

  // Handle creating a new canvas and transferring nodes to it
  const handleCreateCanvasWithNodes = useCallback(async (canvasName: string, nodes: import("@/lib/atlas-types").AtlasNode[], mode: "move" | "copy") => {
    const newCanvasId = `canvas-${Date.now()}`;
    // Normalize the group to start at (120, 120), preserving relative positions
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const minY = Math.min(...nodes.map((n) => n.position.y));
    const ANCHOR = 120;
    const newNodes = nodes.map((node) => ({
      ...node,
      id: `${node.id}-${mode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: node.position.x - minX + ANCHOR,
        y: node.position.y - minY + ANCHOR,
      },
      selected: false,
    }));
    
    const newCanvas: import("@/lib/atlas-types").Canvas = {
      id: newCanvasId,
      name: canvasName,
      workspaceId: activeWorkspaceId,
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
            settings: { comments: [], workspaceId: activeWorkspaceId },
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

  // Helper: apply a node transform to all nodes in a canvas (including pages)
  function mapAllNodes(
    canvas: import("@/lib/atlas-types").Canvas,
    fn: (node: import("@/lib/atlas-types").AtlasNode) => import("@/lib/atlas-types").AtlasNode
  ): import("@/lib/atlas-types").Canvas {
    return {
      ...canvas,
      nodes: canvas.nodes.map(fn),
      pages: canvas.pages?.map(p => ({ ...p, nodes: p.nodes.map(fn) })),
    };
  }

  // Handle syncing two files together
  const handleSyncFiles = useCallback((sourceNodeId: string, targetNodeId: string, targetCanvasId: string) => {
    const syncGroupId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setCanvases((prev) => {
      // Find if either node already has a syncGroupId (search across all pages)
      let existingSyncGroupId: string | null = null;
      outer: for (const canvas of prev) {
        const allNodes = canvas.pages && canvas.pages.length > 0
          ? canvas.pages.flatMap(p => p.nodes)
          : canvas.nodes;
        for (const node of allNodes) {
          if (node.id === sourceNodeId || node.id === targetNodeId) {
            const nodeData = node.data as import("@/lib/atlas-types").FileNodeData;
            if (nodeData.syncGroupId) { existingSyncGroupId = nodeData.syncGroupId; break outer; }
          }
        }
      }

      const finalSyncGroupId = existingSyncGroupId || syncGroupId;

      return prev.map(canvas =>
        mapAllNodes(canvas, node => {
          if (node.id === sourceNodeId || node.id === targetNodeId) {
            return { ...node, data: { ...node.data, syncGroupId: finalSyncGroupId } };
          }
          return node;
        })
      );
    });
  }, []);

  // Handle unsyncing a file
  const handleUnsyncFile = useCallback((nodeId: string) => {
    setCanvases((prev) =>
      prev.map(canvas =>
        mapAllNodes(canvas, node => {
          if (node.id === nodeId) {
            const { syncGroupId: _removed, ...restData } = node.data as import("@/lib/atlas-types").FileNodeData & { syncGroupId?: string };
            return { ...node, data: restData };
          }
          return node;
        })
      )
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
      
      // Collect all nodes from the updated canvas (active page nodes + all pages)
      const allUpdatedNodes = updatedCanvas.pages && updatedCanvas.pages.length > 0
        ? updatedCanvas.pages.flatMap(p => p.nodes)
        : updatedCanvas.nodes;
      const allPrevNodes = previousCanvas.pages && previousCanvas.pages.length > 0
        ? previousCanvas.pages.flatMap(p => p.nodes)
        : previousCanvas.nodes;

      for (const updatedNode of allUpdatedNodes) {
        const nodeData = updatedNode.data as import("@/lib/atlas-types").FileNodeData;
        if (nodeData.syncGroupId) {
          const prevNode = allPrevNodes.find(n => n.id === updatedNode.id);
          if (prevNode) {
            const prevData = prevNode.data as import("@/lib/atlas-types").FileNodeData;
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
      
      // Helper: apply sync data to a single node if it matches a changed sync group
      const applySyncToNode = (node: import("@/lib/atlas-types").AtlasNode): { node: import("@/lib/atlas-types").AtlasNode; changed: boolean } => {
        const nodeData = node.data as import("@/lib/atlas-types").FileNodeData;
        const matchingChange = changedSyncedNodes.find(c => c.syncGroupId === nodeData.syncGroupId);
        if (matchingChange) {
          return {
            node: {
              ...node,
              data: {
                ...node.data,
                uploadedFile: matchingChange.data.uploadedFile,
                versions: matchingChange.data.versions,
                activities: matchingChange.data.activities,
                previewImages: matchingChange.data.previewImages,
                lastModified: matchingChange.data.lastModified,
              },
            },
            changed: true,
          };
        }
        return { node, changed: false };
      };

      // Propagate changes to all canvases (including pages)
      const newCanvases = prev.map((canvas) => {
        if (canvas.id === updatedCanvas.id) {
          return updatedCanvas;
        }

        let hasChanges = false;

        const updatedNodes = canvas.nodes.map(node => {
          const result = applySyncToNode(node);
          if (result.changed) hasChanges = true;
          return result.node;
        });

        const updatedPages = canvas.pages?.map(p => {
          const newPageNodes = p.nodes.map(node => {
            const result = applySyncToNode(node);
            if (result.changed) hasChanges = true;
            return result.node;
          });
          return { ...p, nodes: newPageNodes };
        });

        if (hasChanges) {
          const updatedSyncedCanvas = {
            ...canvas,
            nodes: updatedNodes,
            pages: updatedPages,
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
        onWorkspaceSettingsChange={handleWorkspaceSettingsChange}
        onSaveFramework={handleSaveFramework}
        onRemoveFramework={handleRemoveFramework}
        canvases={canvases}
        frameworks={frameworks}
        targetNodeId={deepLinkNodeId}
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
      onWorkspaceSettingsChange={handleWorkspaceSettingsChange}
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      onWorkspaceSwitch={handleWorkspaceSwitch}
      onWorkspaceCreate={handleCreateWorkspace}
      onDeleteWorkspace={handleDeleteWorkspace}
      onSaveWorkspaceDetails={handleSaveWorkspaceDetails}
      canvases={canvases}
      onCanvasesChange={handleCanvasesChange}
      onSaveAllToCloud={handleSaveAllToCloud}
      isLoadingCanvases={isLoadingCanvases}
      isWorkspaceSynced={isWorkspaceSynced}
      frameworks={frameworks}
      onFrameworksChange={setFrameworks}
      onRemoveFramework={handleRemoveFramework}
      userEmail={user?.email ?? undefined}
    />
  );
}
