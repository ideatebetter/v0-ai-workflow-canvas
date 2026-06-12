"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type NodeChange,
} from "@xyflow/react";

import type { AtlasNode, FileExtension, FileNodeData, UploadedFile, WorkspaceSettings, Canvas, CanvasComment, MoodboardNodeData, CanvasFramework, FileVersion, FileActivity, SavedPresentationFlow, CanvasPage } from "@/lib/atlas-types";
import { INITIAL_FILE_NODES, INITIAL_EDGES, getFileCategoryFromExtension, DEFAULT_WORKSPACE_SETTINGS, WORKSPACE_MEMBERS, SUPPORTED_EXTENSIONS } from "@/lib/atlas-types";
import { AtlasCanvas } from "./atlas-canvas";
import { AtlasToolbar } from "./atlas-toolbar";
import { CanvasSideToolbar } from "./canvas-side-toolbar";
import { FileDetailModal } from "./file-detail-modal";
import type { AIPromptNodeData } from "./nodes/ai-prompt-node";
import { UploadDialog } from "./upload-dialog";
import { UploadProgress } from "./upload-progress";
import { WorkspaceSettingsDialog } from "./workspace-settings";

import { MoodboardExpanded } from "./moodboard-expanded";
import { PresentationViewer } from "./presentation-viewer";
import { SaveFrameworkDialog } from "./save-template-dialog";
import { FrameworkCreatorDialog } from "./framework-creator-dialog";
import { FrameworkLibraryPanel } from "./framework-library-panel";
import { FrameworkRunDialog } from "./framework-run-dialog";
import { CanvasNodeActionsProvider } from "./canvas-node-actions-context";
import { AddNodeMenu } from "./add-node-menu";
import { SageExpandedModal } from "./sage-expanded-modal";
import { MoveToCanvasDialog } from "./copy-to-canvas-dialog";
import { NodeContextMenu } from "./node-context-menu";
import { SyncFileDialog } from "./sync-file-dialog";
import { SyncMultipleDialog } from "./sync-multiple-dialog";

interface AtlasEditorProps {
  canvas: Canvas;
  onCanvasChange: (canvas: Canvas) => void;
  onSaveFramework?: (framework: CanvasFramework) => void;
  onBack: () => void;
  workspaceSettings: WorkspaceSettings;
  onWorkspaceSettingsChange: (settings: WorkspaceSettings) => void;
  canvases?: Canvas[];
  frameworks?: CanvasFramework[];
  onRemoveFramework?: (frameworkId: string) => void;
  targetNodeId?: string | null;
  onCopyNodesToCanvas?: (targetCanvasId: string, nodes: AtlasNode[], mode: "move" | "copy") => void;
  onCreateCanvasWithNodes?: (canvasName: string, nodes: AtlasNode[], mode: "move" | "copy") => void;
  onDeleteNodesFromCanvas?: (nodeIds: string[]) => void;
  onSyncFiles?: (sourceNodeId: string, targetNodeId: string, targetCanvasId: string) => void;
  onUnsyncFile?: (nodeId: string) => void;
  recentCanvases?: Canvas[];
  onSwitchCanvas?: (canvasId: string) => void;
}

// Auto-layout configuration — tweak these to adjust placement behaviour
const LAYOUT_CONFIG = {
  direction: "horizontal" as const, // left-to-right
  gap: 48,                          // px between nodes
  originX: 100,                     // x of the first node when canvas is empty
  originY: 100,                     // y axis all new nodes share
};

// Fallback width used when a node hasn't been measured by the DOM yet
const DEFAULT_NODE_WIDTH = 220;

// Returns the position for the next appended node.
// Uses measured node.width when available so mixed-width nodes are handled correctly.
function getNextPosition(existingNodes: AtlasNode[]): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: LAYOUT_CONFIG.originX, y: LAYOUT_CONFIG.originY };
  }
  const rightmost = existingNodes.reduce((maxX, n) => {
    const w = (n.width ?? DEFAULT_NODE_WIDTH);
    return Math.max(maxX, n.position.x + w);
  }, -Infinity);
  return { x: rightmost + LAYOUT_CONFIG.gap, y: LAYOUT_CONFIG.originY };
}

// Multi-node batch placement (used for paste and drag-drop file uploads).
// Lays out `count` nodes left-to-right starting from `startPosition`,
// or appended after existing nodes when no startPosition is given.
function findFreePositions(
  existingNodes: AtlasNode[],
  count: number,
  startPosition?: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const base = startPosition ?? getNextPosition(existingNodes);
  return Array.from({ length: count }, (_, i) => ({
    x: base.x + i * (DEFAULT_NODE_WIDTH + LAYOUT_CONFIG.gap),
    y: base.y,
  }));
}

// Returns the normalized pages array for a canvas, creating a default page if needed
function getPagesFromCanvas(canvas: Canvas): CanvasPage[] {
  if (canvas.pages && canvas.pages.length > 0) return canvas.pages;
  return [{ id: "page-1", name: "Page 1", nodes: canvas.nodes, edges: canvas.edges }];
}

// Deduplicate nodes by id — last occurrence wins so newer positions are preserved
function deduplicateNodes<T extends { id: string }>(nodes: T[]): T[] {
  const seen = new Map<string, T>();
  for (const n of nodes) seen.set(n.id, n);
  return Array.from(seen.values());
}

function AtlasEditorInner({ canvas, onCanvasChange, onBack, workspaceSettings, onWorkspaceSettingsChange, onSaveFramework, canvases, frameworks, onRemoveFramework, targetNodeId, onCopyNodesToCanvas, onCreateCanvasWithNodes, onDeleteNodesFromCanvas, onSyncFiles, onUnsyncFile, recentCanvases, onSwitchCanvas }: AtlasEditorProps) {
  // --- Multi-page state ---
  const [pages, setPages] = useState<CanvasPage[]>(() => getPagesFromCanvas(canvas));
  const [activePageId, setActivePageId] = useState<string>(() => {
    if (canvas.activePageId) return canvas.activePageId;
    const ps = getPagesFromCanvas(canvas);
    return ps[0].id;
  });
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const activePageRef = useRef(activePageId);
  activePageRef.current = activePageId;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  // Get the initial nodes/edges from the active page
  const initialPage = getPagesFromCanvas(canvas).find(p => p.id === (canvas.activePageId ?? getPagesFromCanvas(canvas)[0].id)) ?? getPagesFromCanvas(canvas)[0];

  const [nodes, setNodes, onNodesChange] = useNodesState<AtlasNode>(deduplicateNodes(initialPage.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialPage.edges);
  const [comments, setComments] = useState<CanvasComment[]>(canvas.comments || []);
  const isInitialMount = useRef(true);
  const lastCanvasNodeCount = useRef(initialPage.nodes.length);
  const [selectedNode, setSelectedNode] = useState<AtlasNode | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showSaveFrameworkDialog, setShowSaveFrameworkDialog] = useState(false);
  const [showFrameworkCreator, setShowFrameworkCreator] = useState(false);
  const [linkCopiedNodeId, setLinkCopiedNodeId] = useState<string | null>(null);
  const [showFrameworkLibrary, setShowFrameworkLibrary] = useState(false);
  const [runFramework, setRunFramework] = useState<CanvasFramework | null>(null);
  const [showMoveToCanvasDialog, setShowMoveToCanvasDialog] = useState(false);
  const [moveToCanvasMode, setMoveToCanvasMode] = useState<"move" | "copy">("move");
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    nodes: AtlasNode[];
  } | null>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncTargetNode, setSyncTargetNode] = useState<AtlasNode | null>(null);
  const [showSyncMultipleDialog, setShowSyncMultipleDialog] = useState(false);
  const [syncMultipleNodes, setSyncMultipleNodes] = useState<AtlasNode[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Array<{
    id: string;
    fileName: string;
    progress: number;
    status: "uploading" | "complete" | "error";
    error?: string;
  }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Comment mode state
  const [commentMode, setCommentMode] = useState(false);
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  
  // File detail modal state
  const [detailModalNodeId, setDetailModalNodeId] = useState<string | null>(null);

  // Mockup generator state - now using aiPrompt node
  const [activeAIPromptNodeId, setActiveAIPromptNodeId] = useState<string | null>(null);

  // Moodboard state
  const [expandedMoodboardId, setExpandedMoodboardId] = useState<string | null>(null);

// Presentation state
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationEdges, setPresentationEdges] = useState<Edge[]>([]);

  // Version conflict dialog state
  const [versionConflict, setVersionConflict] = useState<{
    existingNode: AtlasNode;
    newFile: {
      fileName: string;
      extension: string;
      uploadedFile: UploadedFile;
      previewUrl?: string;
      isVideo?: boolean;
    };
    position: { x: number; y: number };
  } | null>(null);
  // Store full group data so we can restore groups when re-entering presentation mode
  const [presentationGroups, setPresentationGroups] = useState<Array<{
    id: string;
    nodeIds: string[];
    label?: string;
    thumbnails: string[];
    originalNodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
  }>>([]);
  const [isPresenting, setIsPresenting] = useState(false);

  // Saved presentation flows
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [savingFlow, setSavingFlow] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");

  // Clipboard state for copy/paste
  const [copiedNodes, setCopiedNodes] = useState<AtlasNode[]>([]);

  // Double-click add menu state
  const [showDoubleClickMenu, setShowDoubleClickMenu] = useState(false);
  const [doubleClickPosition, setDoubleClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [doubleClickMenuScreenPosition, setDoubleClickMenuScreenPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Create AI Prompt node connected to source file
  const createAIPromptNode = useCallback((sourceNodeId: string, fileData: FileNodeData) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;
    
    const promptNodeId = `ai-prompt-${Date.now()}`;
    // For image files, use the uploaded URL directly. For non-image files (PSD, AI, PDF, etc.)
    // the uploaded URL is a raw binary that the generation model can't ingest — use previewImages instead.
    const isImageFile = /\.(png|jpg|jpeg|gif|webp|avif|bmp)$/i.test(fileData.fileExtension || "");
    const sourceImageUrl = isImageFile
      ? (fileData.uploadedFile?.url || fileData.previewImages?.[0] || "")
      : (fileData.previewImages?.[0] || "");
    
    // Position the prompt node to the right of source
    const promptNode: AtlasNode = {
      id: promptNodeId,
      type: "aiPrompt",
      position: {
        x: sourceNode.position.x + 320,
        y: sourceNode.position.y,
      },
      data: {
        sourceNodeId,
        sourceImageUrl,
        sourceFileName: fileData.label || fileData.fileName || "Untitled",
      },
    };
    
    // Create edge from source to prompt node
    const connectingEdge: Edge = {
      id: `edge-${sourceNodeId}-${promptNodeId}`,
      source: sourceNodeId,
      target: promptNodeId,
      style: { stroke: "#666", strokeWidth: 2 },
    };
    
    setNodes(nds => [...nds, promptNode]);
    setEdges(eds => [...eds, connectingEdge]);
    setActiveAIPromptNodeId(promptNodeId);
  }, [nodes, setNodes, setEdges]);
  
  // Listen for mockup generation events from file nodes
  // Deep link: select and open the target node once nodes are loaded
  useEffect(() => {
    if (!targetNodeId) return;
    const node = nodes.find(n => n.id === targetNodeId);
    if (!node) return;
    setNodes(nds => nds.map(n => ({ ...n, selected: n.id === targetNodeId })));
    if (node.type === "file") setDetailModalNodeId(targetNodeId);
  // Run once on mount — intentionally omit `nodes` to avoid re-running on every nodes change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetNodeId]);

  useEffect(() => {
    const handleMockupEvent = (e: CustomEvent<{ nodeId: string; fileData: FileNodeData }>) => {
      createAIPromptNode(e.detail.nodeId, e.detail.fileData);
    };

    window.addEventListener("atlas:generate-mockup", handleMockupEvent as EventListener);
    return () => {
      window.removeEventListener("atlas:generate-mockup", handleMockupEvent as EventListener);
    };
  }, [createAIPromptNode]);
  
  // Listen for mockups generated events from AI prompt node
  useEffect(() => {
    const handleMockupsGenerated = (e: CustomEvent<{
      promptNodeId: string;
      sourceNodeId: string;
      mockups: Array<{ imageUrl: string; name: string }>;
      prompt: string;
    }>) => {
      const { promptNodeId, sourceNodeId, mockups, prompt } = e.detail;
      
      // Generate IDs upfront so they're consistent between nodes and edges
      const timestamp = Date.now();
      const mockupIds = mockups.map((_, index) => `mockup-${timestamp}-${index}`);
      
      // Use setNodes callback to access current nodes state (avoids stale closure)
      setNodes(currentNodes => {
        // Find the source node from current state
        const sourceNode = currentNodes.find(n => n.id === sourceNodeId);
        // Also find the prompt node to get its position (which is near the source)
        const promptNode = currentNodes.find(n => n.id === promptNodeId);
        
        if (!sourceNode) return currentNodes;
        
        // Use prompt node position if available (it's positioned next to source), otherwise fallback to source
        const baseX = promptNode?.position.x || (sourceNode.position.x + 320);
        const baseY = promptNode?.position.y || sourceNode.position.y;
        
        // Create mockup image nodes
        const newMockupNodes: AtlasNode[] = mockups.map((mockup, index) => ({
          id: mockupIds[index],
          type: "mockupImage" as const,
          position: { 
            x: baseX, 
            y: baseY + (index * 280)
          },
          data: {
            label: mockup.name,
            imageUrl: mockup.imageUrl,
            sourceFileName: (sourceNode.data as FileNodeData).fileName,
            prompt: prompt,
            generatedAt: "Just now",
          },
        }));
        
        // Return updated nodes: remove prompt node, add mockup nodes
        return [
          ...currentNodes.filter(n => n.id !== promptNodeId),
          ...newMockupNodes
        ];
      });
      
      // Remove prompt edges immediately, then defer mockup edges by one frame so
      // ReactFlow has time to register the new mockup nodes before validating edges.
      setEdges(currentEdges =>
        currentEdges.filter(e => e.source !== promptNodeId && e.target !== promptNodeId)
      );

      requestAnimationFrame(() => {
        const newEdges: Edge[] = mockupIds.map((mockupId) => ({
          id: `mockup-edge-${sourceNodeId}-${mockupId}`,
          source: sourceNodeId,
          target: mockupId,
          type: "default",
          style: { stroke: "#888", strokeWidth: 1.5, strokeDasharray: "6 4" },
          animated: false,
        }));
        setEdges(currentEdges => [...currentEdges, ...newEdges]);
      });
      
      setActiveAIPromptNodeId(null);
    };

    window.addEventListener("atlas:mockups-generated", handleMockupsGenerated as EventListener);
    return () => {
      window.removeEventListener("atlas:mockups-generated", handleMockupsGenerated as EventListener);
    };
  }, [setNodes, setEdges]);
  
  // Listen for close AI prompt events
  useEffect(() => {
    const handleClosePrompt = (e: CustomEvent<{ sourceNodeId?: string }>) => {
      // Find the aiPrompt node by sourceNodeId from the event, or fall back to activeAIPromptNodeId
      setNodes(nds => {
        const promptNode = nds.find(n =>
          n.type === "aiPrompt" &&
          (e.detail?.sourceNodeId
            ? (n.data as AIPromptNodeData).sourceNodeId === e.detail.sourceNodeId
            : n.id === activeAIPromptNodeId)
        );
        if (!promptNode) return nds;
        setEdges(eds => eds.filter(ed => ed.source !== promptNode.id && ed.target !== promptNode.id));
        setActiveAIPromptNodeId(null);
        return nds.filter(n => n.id !== promptNode.id);
      });
    };

    window.addEventListener("atlas:close-ai-prompt", handleClosePrompt as EventListener);
    return () => {
      window.removeEventListener("atlas:close-ai-prompt", handleClosePrompt as EventListener);
    };
  }, [activeAIPromptNodeId, setNodes, setEdges]);

  // Current user (first member for demo)
  const currentUser = workspaceSettings.members[0] || WORKSPACE_MEMBERS[0];

  // Sync canvas changes back to parent
  // Helper: build updated pages array with current nodes/edges written into the active page
  const buildUpdatedPages = useCallback((currentNodes: AtlasNode[], currentEdges: typeof edges, currentPages: CanvasPage[], currentActivePageId: string): CanvasPage[] => {
    return currentPages.map(p => p.id === currentActivePageId ? { ...p, nodes: currentNodes, edges: currentEdges } : p);
  }, []);

  const syncCanvas = useCallback((updatedComments?: CanvasComment[]) => {
    const updatedPages = buildUpdatedPages(nodes, edges, pagesRef.current, activePageRef.current);
    onCanvasChange({
      ...canvas,
      nodes,
      edges,
      pages: updatedPages,
      activePageId: activePageRef.current,
      comments: updatedComments || comments,
      updatedAt: new Date().toISOString(),
    });
  }, [canvas, nodes, edges, comments, onCanvasChange, buildUpdatedPages]);

  // Merge nodes added externally (e.g. Figma sync) into local state without overwriting local edits
  useEffect(() => {
    const activePage = (canvas.pages ?? []).find(p => p.id === activePageRef.current);
    const sourceNodes = activePage?.nodes ?? canvas.nodes;
    const incomingCount = sourceNodes.length;
    if (incomingCount <= lastCanvasNodeCount.current) return;
    lastCanvasNodeCount.current = incomingCount;
    setNodes(current => {
      // Track all IDs (existing + already-queued adds) to prevent any duplicate from sourceNodes itself
      const allIds = new Set(current.map(n => n.id));
      const added: typeof current = [];
      for (const n of sourceNodes) {
        if (!allIds.has(n.id)) {
          allIds.add(n.id);
          added.push(n);
        }
      }
      return added.length > 0 ? [...current, ...added] : current;
    });
  }, [canvas.nodes, canvas.pages]);

  // Auto-save nodes and edges when they change (debounced); skip the very first render
  // so opening a canvas doesn't immediately overwrite externally-added nodes in the DB.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      if (nodes.length > 0 || edges.length > 0) {
        const updatedPages = buildUpdatedPages(nodes, edges, pagesRef.current, activePageRef.current);
        onCanvasChange({
          ...canvas,
          nodes,
          edges,
          pages: updatedPages,
          activePageId: activePageRef.current,
          comments,
          updatedAt: new Date().toISOString(),
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges]); // Only trigger on nodes/edges changes, not canvas/comments to avoid loops

  // Page switching: save current page, load the target page
  const switchPage = useCallback((targetPageId: string) => {
    if (targetPageId === activePageRef.current) return;
    const updatedPages = pagesRef.current.map(p => p.id === activePageRef.current ? { ...p, nodes, edges } : p);
    const targetPage = updatedPages.find(p => p.id === targetPageId);
    if (!targetPage) return;
    setPages(updatedPages);
    pagesRef.current = updatedPages;
    setNodes(deduplicateNodes(targetPage.nodes));
    setEdges(targetPage.edges);
    setActivePageId(targetPageId);
    activePageRef.current = targetPageId;
    lastCanvasNodeCount.current = targetPage.nodes.length;
    onCanvasChange({ ...canvas, pages: updatedPages, activePageId: targetPageId, nodes: targetPage.nodes, edges: targetPage.edges, updatedAt: new Date().toISOString() });
  }, [nodes, edges, canvas, onCanvasChange, setNodes, setEdges]);

  // Add a new page
  const handleAddPage = useCallback(() => {
    const newPage: CanvasPage = {
      id: `page-${Date.now()}`,
      name: `Page ${pagesRef.current.length + 1}`,
      nodes: [],
      edges: [],
    };
    const updatedPages = [...pagesRef.current.map(p => p.id === activePageRef.current ? { ...p, nodes, edges } : p), newPage];
    setPages(updatedPages);
    pagesRef.current = updatedPages;
    setNodes([]);
    setEdges([]);
    setActivePageId(newPage.id);
    activePageRef.current = newPage.id;
    lastCanvasNodeCount.current = 0;
    onCanvasChange({ ...canvas, pages: updatedPages, activePageId: newPage.id, nodes: [], edges: [], updatedAt: new Date().toISOString() });
  }, [nodes, edges, canvas, onCanvasChange, setNodes, setEdges]);

  // Delete a page
  const handleDeletePage = useCallback((pageId: string) => {
    if (pagesRef.current.length <= 1) return;
    const savedPages = pagesRef.current.map(p => p.id === activePageRef.current ? { ...p, nodes, edges } : p);
    const remainingPages = savedPages.filter(p => p.id !== pageId);
    const deletedIdx = savedPages.findIndex(p => p.id === pageId);
    const newActiveId = pageId === activePageRef.current
      ? remainingPages[Math.max(0, deletedIdx - 1)].id
      : activePageRef.current;
    const targetPage = remainingPages.find(p => p.id === newActiveId)!;
    setPages(remainingPages);
    pagesRef.current = remainingPages;
    if (pageId === activePageRef.current) {
      setNodes(deduplicateNodes(targetPage.nodes));
      setEdges(targetPage.edges);
      lastCanvasNodeCount.current = targetPage.nodes.length;
    }
    setActivePageId(newActiveId);
    activePageRef.current = newActiveId;
    onCanvasChange({ ...canvas, pages: remainingPages, activePageId: newActiveId, nodes: targetPage.nodes, edges: targetPage.edges, updatedAt: new Date().toISOString() });
  }, [nodes, edges, canvas, onCanvasChange, setNodes, setEdges]);

  // Rename a page
  const handleRenamePage = useCallback((pageId: string, newName: string) => {
    const trimmed = newName.trim() || "Untitled Page";
    setPages(prev => {
      const updated = prev.map(p => p.id === pageId ? { ...p, name: trimmed } : p);
      pagesRef.current = updated;
      onCanvasChange({ ...canvas, pages: updated, updatedAt: new Date().toISOString() });
      return updated;
    });
    setRenamingPageId(null);
  }, [canvas, onCanvasChange]);

  // Listen for Sage action events
  useEffect(() => {
    const handleSageActionEvent = (e: CustomEvent<{
      action: { 
        action: string; 
        pills?: Array<{ label: string; color: string; index: number }>; 
        arrangement?: string;
        title?: string;
        content?: string;
      };
      nodeId: string;
      position: { x: number; y: number };
    }>) => {
      const { action, position } = e.detail;
      
      if (action.action === "createStatusPills" && action.pills) {
        const spacing = 200;
        const arrangement = action.arrangement || "horizontal";
        
        const newNodes: AtlasNode[] = action.pills.map((pill, index) => {
          let pos: { x: number; y: number };
          
          if (arrangement === "horizontal") {
            pos = { x: position.x + 320 + (index * spacing), y: position.y };
          } else if (arrangement === "vertical") {
            pos = { x: position.x + 320, y: position.y + (index * 80) };
          } else {
            // grid - 3 columns
            const col = index % 3;
            const row = Math.floor(index / 3);
            pos = { x: position.x + 320 + (col * spacing), y: position.y + (row * 80) };
          }
          
          return {
            id: `status-sage-${Date.now()}-${index}`,
            type: "statusPill",
            position: pos,
            data: {
              label: pill.label,
              color: pill.color,
            },
          };
        });
        
        setNodes((nds) => [...nds, ...newNodes]);
      } else if (action.action === "createTextNote" && action.title) {
        const newNode: AtlasNode = {
          id: `text-sage-${Date.now()}`,
          type: "text",
          position: { x: position.x + 320, y: position.y },
          data: {
            label: action.title,
            content: action.content || "",
            lastModified: new Date().toISOString(),
            formatting: {
              color: "#ffffff",
              font: "sans",
              size: "medium",
              bold: false,
              strikethrough: false,
              align: "left",
            },
          },
        };
        setNodes((nds) => [...nds, newNode]);
      }
    };

    window.addEventListener("sage:action", handleSageActionEvent as EventListener);
    return () => window.removeEventListener("sage:action", handleSageActionEvent as EventListener);
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "default",
            animated: true,
            style: { strokeWidth: 2, stroke: "#52525b", strokeDasharray: "5 5" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Copy selected nodes to clipboard
  const handleCopyNodes = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
    }
  }, [nodes]);

  // Paste copied nodes with offset
  const handlePasteNodes = useCallback(() => {
    if (copiedNodes.length === 0) return;

    const PASTE_OFFSET = 50;
    
    // Find positions that don't overlap with existing nodes
    const pastePositions = findFreePositions(
      nodes,
      copiedNodes.length,
      {
        x: copiedNodes[0].position.x + PASTE_OFFSET,
        y: copiedNodes[0].position.y + PASTE_OFFSET,
      }
    );

    const newNodes: AtlasNode[] = copiedNodes.map((node, index) => ({
      ...node,
      id: `${node.type}-${Date.now()}-${index}`,
      position: pastePositions[index] || {
        x: node.position.x + PASTE_OFFSET * (index + 1),
        y: node.position.y + PASTE_OFFSET * (index + 1),
      },
      selected: true,
      data: {
        ...node.data,
        label: node.data.label ? `${node.data.label} (copy)` : node.data.label,
      },
    }));

    // Deselect existing nodes and add new ones selected
    setNodes(nds => [
      ...nds.map(n => ({ ...n, selected: false })),
      ...newNodes,
    ]);
  }, [copiedNodes, nodes, setNodes]);

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.key === 'c') {
        e.preventDefault();
        handleCopyNodes();
      } else if (modifierKey && e.key === 'v') {
        e.preventDefault();
        handlePasteNodes();
      } else if (modifierKey && e.shiftKey && e.key === 'c') {
        // Cmd/Ctrl + Shift + C to copy to another canvas
        e.preventDefault();
        const selectedNodes = nodes.filter(node => node.selected);
        if (selectedNodes.length > 0) {
          setMoveToCanvasMode("copy");
          setShowMoveToCanvasDialog(true);
        }
      } else if (modifierKey && e.shiftKey && e.key === 'm') {
        // Cmd/Ctrl + Shift + M to move to another canvas
        e.preventDefault();
        const selectedNodes = nodes.filter(node => node.selected);
        if (selectedNodes.length > 0) {
          setMoveToCanvasMode("move");
          setShowMoveToCanvasDialog(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyNodes, handlePasteNodes, nodes, canvases]);

  const handleNodesUpdate = useCallback(
    (newNodes: AtlasNode[]) => {
      setNodes(newNodes);
    },
    [setNodes]
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Partial<FileNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
      );
    },
    [setNodes]
  );

  const handleAddNode = useCallback(
    (extension: FileExtension, position?: { x: number; y: number }, sourceNodeId?: string) => {
      const today = new Date();
      const formattedDate = today.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const nodeId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const nodePosition = position ?? getNextPosition(nodes);

      const newNode: AtlasNode = {
        id: nodeId,
        type: "file",
        position: nodePosition,
        data: {
          label: "Untitled File",
          fileName: `Untitled File${extension}`,
          product: "atlas",
          status: "draft",
          fileExtension: extension,
          lastModified: formattedDate,
        },
      };
      setNodes((nds) => [...nds, newNode]);

      // If source node provided, create an edge
      if (sourceNodeId) {
        setEdges((eds) => [...eds, {
          id: `edge-${sourceNodeId}-${nodeId}`,
          source: sourceNodeId,
          target: nodeId,
        }]);
      }
    },
    [nodes.length, setNodes, setEdges]
  );

  const handleAddStatusPill = useCallback((position?: { x: number; y: number }, sourceNodeId?: string) => {
    const nodeId = `status-${Date.now()}`;
    const nodePosition = position ?? getNextPosition(nodes);

    const newNode: AtlasNode = {
      id: nodeId,
      type: "statusPill",
      position: nodePosition,
      selected: true, // Select the new node
      data: {
        label: "Status",
        color: "#e5e5e5",
      },
    };
    // Deselect all other nodes and add the new one selected
    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);

    // If source node provided, create an edge
    if (sourceNodeId) {
      setEdges((eds) => [...eds, {
        id: `edge-${sourceNodeId}-${nodeId}`,
        source: sourceNodeId,
        target: nodeId,
      }]);
    }

    // Center view on the new node
    window.dispatchEvent(new CustomEvent("atlas:center-on-node", {
      detail: { nodeId, position: nodePosition }
    }));
  }, [nodes.length, setNodes, setEdges]);

  const handleAddTextNode = useCallback(
    (position?: { x: number; y: number }, sourceNodeId?: string) => {
      const today = new Date();
      const formattedDate = today.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const nodeId = `text-${Date.now()}`;
      const nodePosition = position ?? getNextPosition(nodes);

      const newNode: AtlasNode = {
        id: nodeId,
        type: "text",
        position: nodePosition,
        selected: true,
        data: {
          label: "Text",
          content: "",
          lastModified: formattedDate,
          formatting: {
            color: "#ffffff",
            font: "sans",
            size: "medium",
            bold: false,
            strikethrough: false,
            align: "left",
          },
        },
      };
      setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);

      // If source node provided, create an edge
      if (sourceNodeId) {
        setEdges((eds) => [...eds, {
          id: `edge-${sourceNodeId}-${nodeId}`,
          source: sourceNodeId,
          target: nodeId,
        }]);
      }

      // Center view on the new node
      window.dispatchEvent(new CustomEvent("atlas:center-on-node", {
        detail: { nodeId, position: nodePosition }
      }));
    },
    [nodes.length, setNodes, setEdges]
  );

  const handleAddSageNode = useCallback(
    (sageType: "chatbot" | "overview" | "stakeholder", position?: { x: number; y: number }, sourceNodeId?: string) => {
      const nodeId = `sage-${Date.now()}`;
      const nodePosition = position ?? getNextPosition(nodes);

      let newNode: AtlasNode;

      if (sageType === "chatbot") {
        newNode = {
          id: nodeId,
          type: "sageChatbot",
          position: nodePosition,
          selected: true,
          data: {
            label: "Sage Chat",
            messages: [],
            lastModified: new Date().toISOString(),
          },
        };
      } else if (sageType === "overview") {
        newNode = {
          id: nodeId,
          type: "sageOverview",
          position: nodePosition,
          selected: true,
          data: {
            label: "Project Overview",
            projectProgress: 65,
            alignmentScore: 78,
            summary: "Project is progressing well with most stakeholders aligned. Focus on completing the remaining design reviews.",
            lastUpdated: "just now",
          },
        };
      } else {
        // stakeholder
        newNode = {
          id: nodeId,
          type: "stakeholder",
          position: nodePosition,
          selected: true,
          data: {
            label: "Stakeholder",
            stakeholder: WORKSPACE_MEMBERS[0],
            comprehensionLevel: "medium",
            alignmentStatus: "aligned",
            notes: "Key decision maker for brand direction",
            lastInteraction: "2 days ago",
            keyInsights: [
              "Prefers modern, minimal aesthetics",
              "Values consistency across touchpoints",
            ],
          },
        };
      }

      setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);

      // If source node provided, create an edge
      if (sourceNodeId) {
        setEdges((eds) => [...eds, {
          id: `edge-${sourceNodeId}-${nodeId}`,
          source: sourceNodeId,
          target: nodeId,
        }]);
      }

      // Center view on the new node
      window.dispatchEvent(new CustomEvent("atlas:center-on-node", {
        detail: { nodeId, position: nodePosition }
      }));
    },
    [nodes.length, setNodes, setEdges]
  );

  const handleAddOperationalNode = useCallback(
    (opType: "capacity" | "financial" | "projectHealth" | "pipeline" | "teamHealth", position?: { x: number; y: number }, sourceNodeId?: string) => {
      const nodeId = `op-${Date.now()}`;
      const nodePosition = position ?? getNextPosition(nodes);

      let newNode: AtlasNode;

      if (opType === "capacity") {
        newNode = {
          id: nodeId,
          type: "capacity",
          position: nodePosition,
          selected: true,
          data: {
            label: "Capacity & Resourcing",
            teamMembers: WORKSPACE_MEMBERS.slice(0, 3).map((m, idx) => ({
              member: m,
              utilizationRate: 75 + idx * 8,
              currentAllocation: 80 + idx * 5,
              plannedAllocation: 85,
              benchTime: idx === 0 ? 12 : 0,
              skills: ["UI Design", "Branding"],
            })),
            lastUpdated: "just now",
          },
        };
      } else if (opType === "financial") {
        newNode = {
          id: nodeId,
          type: "financial",
          position: nodePosition,
          selected: true,
          data: {
            label: "Financial Performance",
            projectMargin: 28,
            budgetConsumed: 65,
            revenueRealized: 72,
            blendedRateEfficiency: 94,
            utilizationAdjustedMargin: 24,
            status: "healthy",
            lastUpdated: "just now",
          },
        };
      } else if (opType === "projectHealth") {
        newNode = {
          id: nodeId,
          type: "projectHealth",
          position: nodePosition,
          selected: true,
          data: {
            label: "Project Health",
            daysSinceClientTouchpoint: 3,
            openFeedbackCycles: 2,
            revisionCount: 4,
            projectPhase: "design",
            healthStatus: "on-track",
            lastUpdated: "just now",
          },
        };
      } else if (opType === "pipeline") {
        newNode = {
          id: nodeId,
          type: "pipeline",
          position: nodePosition,
          selected: true,
          data: {
            label: "Pipeline Forecast",
            forecast30Days: [
              { projectName: "Acme Rebrand", probability: 85, estimatedHours: 120 },
              { projectName: "TechCorp Website", probability: 60, estimatedHours: 80 },
            ],
            forecast60Days: [
              { projectName: "StartupX Identity", probability: 40, estimatedHours: 60 },
            ],
            forecast90Days: [],
            currentCapacity: 320,
            projectedLoad: 260,
            capacityStatus: "balanced",
            lastUpdated: "just now",
          },
        };
      } else {
        // teamHealth
        newNode = {
          id: nodeId,
          type: "teamHealth",
          position: nodePosition,
          selected: true,
          data: {
            label: "Team Health",
            feedbackLoopVelocity: 18,
            revisionToApprovalRatio: 2.3,
            timeSavedHours: 42,
            trendDirection: "improving",
            lastUpdated: "just now",
          },
        };
      }

      setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);

      // If source node provided, create an edge
      if (sourceNodeId) {
        setEdges((eds) => [...eds, {
          id: `edge-${sourceNodeId}-${nodeId}`,
          source: sourceNodeId,
          target: nodeId,
        }]);
      }

      // Center view on the new node
      window.dispatchEvent(new CustomEvent("atlas:center-on-node", {
        detail: { nodeId, position: nodePosition }
      }));
    },
    [nodes.length, setNodes, setEdges]
  );

  // Handle creating a moodboard from selected nodes
  const handleCreateMoodboard = useCallback(
    (nodeIds: string[]) => {
      // Get the selected file nodes
      const selectedNodes = nodes.filter(n => nodeIds.includes(n.id) && n.type === "file");
      if (selectedNodes.length < 2) return;

      // Calculate center position of selected nodes
      const avgX = selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodes.length;
      const avgY = selectedNodes.reduce((sum, n) => sum + n.position.y, 0) / selectedNodes.length;

      // Extract images from selected nodes
      const images = selectedNodes.map(node => {
        const fileData = node.data as FileNodeData;
        const isVideo = fileData.fileType === "video" || fileData.fileExtension?.match(/^\.(mp4|mov|webm|avi|mkv|m4v)$/i);
        return {
          id: node.id,
          url: fileData.uploadedFile?.url || fileData.thumbnail || "",
          fileName: fileData.fileName || fileData.label || "Image",
          thumbnail: fileData.thumbnail,
          fileType: isVideo ? "video" as const : "image" as const,
        };
      }).filter(img => img.url);

      // Create moodboard node
      const moodboardNode: AtlasNode = {
        id: `moodboard-${Date.now()}`,
        type: "moodboard",
        position: { x: avgX, y: avgY },
        data: {
          label: `Moodboard (${images.length})`,
          images,
          isExpanded: false,
          createdAt: new Date().toISOString(),
        } as MoodboardNodeData,
      };

      // Remove the original nodes and add the moodboard
      setNodes(nds => [
        ...nds.filter(n => !nodeIds.includes(n.id)),
        moodboardNode,
      ]);

      // Remove edges connected to the grouped nodes
      setEdges(eds => eds.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
    },
    [nodes, setNodes, setEdges]
  );

  // Handle clicking a moodboard to expand it
  const handleMoodboardClick = useCallback(
    (nodeId: string) => {
      setExpandedMoodboardId(nodeId);
    },
    []
  );

  // Handle ungrouping a moodboard back into individual nodes
  const handleUngroupMoodboard = useCallback(
    () => {
      if (!expandedMoodboardId) return;
      
      const moodboardNode = nodes.find(n => n.id === expandedMoodboardId);
      if (!moodboardNode || moodboardNode.type !== "moodboard") return;

      const moodboardData = moodboardNode.data as MoodboardNodeData;
      const basePosition = moodboardNode.position;

      // Create individual file nodes from the moodboard images
      const newNodes: AtlasNode[] = moodboardData.images.map((img, index) => {
        // Detect file extension from filename
        const extMatch = img.fileName.match(/\.([a-zA-Z0-9]+)$/);
        const extension = extMatch ? `.${extMatch[1].toLowerCase()}` : ".png";
        
        // Determine file type based on extension
        const videoExtensions = [".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v"];
        const audioExtensions = [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma", ".aiff"];
        const isVideoFile = videoExtensions.includes(extension);
        const isAudioFile = audioExtensions.includes(extension);
        const fileType = isVideoFile ? "video" : (isAudioFile ? "audio" : "image");
        const fileCategory = isVideoFile ? "video" : (isAudioFile ? "audio" : "image");
        
        // For images, use the URL as preview; for video/audio, don't set previewImages
        const previewImages = !isVideoFile && !isAudioFile ? [img.url] : undefined;
        
        return {
          id: `file-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
          type: "file" as const,
          position: {
            x: basePosition.x + (index % 3) * 250,
            y: basePosition.y + Math.floor(index / 3) * 200,
          },
          data: {
            label: img.fileName.replace(/\.[^.]+$/, ""), // Remove extension from label
            fileName: img.fileName,
            fileType,
            fileExtension: extension as FileExtension,
            fileCategory,
            status: "approved",
            product: "brand",
            thumbnail: img.thumbnail || img.url,
            lastModified: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            connectedNodes: 0,
            tasks: [],
            uploadedFile: { url: img.url, pathname: img.fileName, size: 0, uploadedAt: new Date().toISOString() },
            previewImages,
          } as FileNodeData,
        };
      });

      // Remove moodboard and add individual nodes
      setNodes(nds => [
        ...nds.filter(n => n.id !== expandedMoodboardId),
        ...newNodes,
      ]);

      setExpandedMoodboardId(null);
    },
    [expandedMoodboardId, nodes, setNodes]
  );

  // Handle presentation edge connection
  const handlePresentationConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      
      const newEdge: Edge = {
        id: `presentation-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: "default",
      };
      
      setPresentationEdges(eds => [...eds, newEdge]);
    },
    []
  );

  // Create presentation group from selected nodes (like moodboard - combines into one node)
  const handleCreatePresentationGroup = useCallback((nodeIds: string[]) => {
    if (nodeIds.length < 2) return;

    // Deduplicate and ignore any IDs already in an existing group
    const alreadyGrouped = new Set(presentationGroups.flatMap(g => g.nodeIds));
    const freshIds = [...new Set(nodeIds)].filter(id => !alreadyGrouped.has(id));
    if (freshIds.length < 2) return;

    const groupId = `presentationGroup-${Date.now()}`;

    // Get the selected nodes
    const selectedNodes = nodes.filter(n => freshIds.includes(n.id));
    if (selectedNodes.length < 2) return;
    
    // Calculate center position of selected nodes
    const avgX = selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodes.length;
    const avgY = selectedNodes.reduce((sum, n) => sum + n.position.y, 0) / selectedNodes.length;
    
    // Extract thumbnails from file nodes
    const thumbnails = selectedNodes
      .map(n => {
        const fileData = n.data as { thumbnail?: string; uploadedFile?: { url?: string } };
        return fileData.thumbnail || fileData.uploadedFile?.url || "";
      })
      .filter(url => url);
    
    // Store original nodes for restoration when leaving presentation mode
    const originalNodes = selectedNodes.map(n => ({
      id: n.id,
      type: n.type || "file",
      position: { ...n.position },
      data: { ...n.data } as Record<string, unknown>,
    }));
    
    // Create the presentation group node
    const groupNode: AtlasNode = {
      id: groupId,
      type: "presentationGroup",
      position: { x: avgX, y: avgY },
      data: {
        label: `Slide Group (${freshIds.length} images)`,
        nodeIds: freshIds,
        thumbnails,
        originalNodes,
      },
    };

    // Store the full group data for persistence across mode changes
    setPresentationGroups(groups => [...groups, {
      id: groupId,
      nodeIds: freshIds,
      label: `Slide Group (${freshIds.length})`,
      thumbnails,
      originalNodes,
    }]);

    // Remove original nodes and add the group node
    setNodes(nds => [
      ...nds.filter(n => !freshIds.includes(n.id)),
      groupNode,
    ]);

    // Remove edges connected to the grouped nodes
    setEdges(eds => eds.filter(e => !freshIds.includes(e.source) && !freshIds.includes(e.target)));
  }, [nodes, setNodes, setEdges, presentationGroups]);

  // Handle ungrouping a presentation group
  const handleUngroupPresentation = useCallback((groupId: string) => {
    const groupNode = nodes.find(n => n.id === groupId && n.type === "presentationGroup");
    if (!groupNode) return;
    const groupData = groupNode.data as import("@/lib/atlas-types").PresentationGroupNodeData;
    const originalNodes = groupData.originalNodes ?? [];

    // Restore original nodes (fall back to current thumbnails if no originalNodes)
    const restoredNodes: AtlasNode[] = originalNodes.length > 0
      ? originalNodes.map(orig => ({
          id: orig.id,
          type: orig.type as AtlasNode["type"],
          position: orig.position,
          data: orig.data as AtlasNode["data"],
        }))
      : (groupData.nodeIds ?? []).map((nid, i) => ({
          id: nid,
          type: "file" as const,
          position: {
            x: groupNode.position.x + (i % 3) * 240,
            y: groupNode.position.y + Math.floor(i / 3) * 200,
          },
          data: { label: `Node ${i + 1}`, fileName: `node-${i + 1}`, fileExtension: ".png", fileCategory: "image", status: "draft", product: "brand", tasks: [], connectedNodes: 0, previewImages: [], uploadedFile: { url: groupData.thumbnails?.[i] ?? "", pathname: "", size: 0, uploadedAt: "" } } as AtlasNode["data"],
        }));

    setNodes(nds => [
      ...nds.filter(n => n.id !== groupId),
      ...restoredNodes,
    ]);
    setPresentationGroups(groups => groups.filter(g => g.id !== groupId));
  }, [nodes, setNodes, setPresentationGroups]);

  // Listen for ungroup events dispatched from presentation-group-node
  useEffect(() => {
    const handler = (e: CustomEvent<{ groupId: string }>) => {
      handleUngroupPresentation(e.detail.groupId);
    };
    window.addEventListener("atlas:ungroup-presentation", handler as EventListener);
    return () => window.removeEventListener("atlas:ungroup-presentation", handler as EventListener);
  }, [handleUngroupPresentation]);

  // Start presentation
  const handleStartPresentation = useCallback(() => {
    if (presentationEdges.length > 0 || presentationGroups.length > 0) {
      setIsPresenting(true);
    }
  }, [presentationEdges, presentationGroups]);

  // Load a saved flow's edges/groups into the builder view (for highlighting / playing)
  const handleSelectFlow = useCallback((id: string | null) => {
    setSelectedFlowId(id);
    if (id === null) {
      setPresentationEdges([]);
      setPresentationGroups([]);
    } else {
      const flow = (canvas.presentationFlows ?? []).find(f => f.id === id);
      if (flow) {
        setPresentationEdges(flow.edges);
        setPresentationGroups(flow.groups);
      }
    }
  }, [canvas.presentationFlows]);

  // Persist current builder edges/groups as a named flow on the canvas
  const handleSaveFlow = useCallback((name: string) => {
    const id = `flow-${Date.now()}`;
    const newFlow: SavedPresentationFlow = {
      id,
      name: name.trim() || "Untitled Flow",
      edges: [...presentationEdges],
      groups: [...presentationGroups],
    };
    onCanvasChange({ ...canvas, presentationFlows: [...(canvas.presentationFlows ?? []), newFlow] });
    // Select the newly saved flow so its edges stay highlighted
    setSelectedFlowId(id);
  }, [canvas, onCanvasChange, presentationEdges, presentationGroups]);

  // Remove a saved flow from the canvas
  const handleDeleteFlow = useCallback((id: string) => {
    onCanvasChange({ ...canvas, presentationFlows: (canvas.presentationFlows ?? []).filter(f => f.id !== id) });
    if (selectedFlowId === id) {
      setSelectedFlowId(null);
      setPresentationEdges([]);
      setPresentationGroups([]);
    }
  }, [canvas, onCanvasChange, selectedFlowId]);

  // Handle presentation mode change - ungroup when exiting, re-group when entering
  const handlePresentationModeChange = useCallback((enabled: boolean) => {
    setPresentationMode(enabled);
    
    if (enabled) {
      // Entering presentation mode - re-create group nodes from stored data
      if (presentationGroups.length > 0) {
        // Collect all node IDs that should be grouped
        const nodeIdsToGroup = new Set(presentationGroups.flatMap(g => g.nodeIds));
        
        // Create group nodes from stored data
        const groupNodesToAdd: AtlasNode[] = presentationGroups.map(group => ({
          id: group.id,
          type: "presentationGroup",
          position: group.originalNodes.length > 0 
            ? { 
                x: group.originalNodes.reduce((sum, n) => sum + n.position.x, 0) / group.originalNodes.length,
                y: group.originalNodes.reduce((sum, n) => sum + n.position.y, 0) / group.originalNodes.length,
              }
            : { x: 0, y: 0 },
          data: {
            label: group.label,
            nodeIds: group.nodeIds,
            thumbnails: group.thumbnails,
            originalNodes: group.originalNodes,
          },
        }));
        
        // Remove individual nodes and any stale group nodes, then add reconstructed group nodes.
        // Stale group nodes can exist if presentation mode was exited without full cleanup
        // (e.g. closing PresentationViewer directly).
        setNodes(nds => [
          ...nds.filter(n => !nodeIdsToGroup.has(n.id) && n.type !== "presentationGroup"),
          ...groupNodesToAdd,
        ]);
      }
    } else {
      // Exiting presentation mode - restore original nodes, clear groups and edges
      const groupNodes = nodes.filter(n => n.type === "presentationGroup");
      setSelectedFlowId(null);
      setSavingFlow(false);
      // Always clear presentation edges when exiting
      setPresentationEdges([]);
      
      if (groupNodes.length > 0) {
        // Collect all original nodes to restore
        const nodesToRestore: AtlasNode[] = [];
        const groupNodeIds: string[] = [];
        
        for (const groupNode of groupNodes) {
          groupNodeIds.push(groupNode.id);
          const groupData = groupNode.data as { 
            label?: string;
            nodeIds?: string[];
            thumbnails?: string[];
            originalNodes?: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
          };
          
          if (groupData.originalNodes) {
            for (const original of groupData.originalNodes) {
              nodesToRestore.push({
                id: original.id,
                type: original.type,
                position: original.position,
                data: original.data,
              } as AtlasNode);
            }
          }
        }
        
        // Clear all presentation groups - they are dissolved when exiting
        setPresentationGroups([]);
        
        // Remove group nodes and add back original nodes
        setNodes(nds => [
          ...nds.filter(n => !groupNodeIds.includes(n.id)),
          ...nodesToRestore,
        ]);
      } else {
        // No group nodes but might have stored groups - clear them too
        setPresentationGroups([]);
      }
    }
  }, [nodes, setNodes, presentationGroups]);

  const handleDoubleClickCanvas = useCallback(
    (position: { x: number; y: number }, screenPosition: { x: number; y: number }) => {
      // Store both the canvas position (for placing the node) and screen position (for menu placement)
      setDoubleClickPosition(position);
      setDoubleClickMenuScreenPosition({ x: screenPosition.x + 10, y: screenPosition.y + 10 });
      setShowDoubleClickMenu(true);
    },
    []
  );

  // Close the double-click menu
  const closeDoubleClickMenu = useCallback(() => {
    setShowDoubleClickMenu(false);
    setDoubleClickPosition(null);
  }, []);

  const handleFilesUploaded = useCallback(
    (files: Array<{
      fileName: string;
      extension: FileExtension;
      uploadedFile: UploadedFile;
      previewUrl?: string;
    }>) => {
      // Find free positions that don't overlap with existing nodes
      const freePositions = findFreePositions(nodes, files.length);
      
      const baseTimestamp = Date.now();
      const newNodes: AtlasNode[] = files.map((file, index) => {
        const label = file.fileName.replace(file.extension, "");
        const isImage = file.extension.match(/^\.(png|jpg|jpeg|gif|webp|avif)$/i);
        // Only use previewUrl for images - videos and other files should use default previews
        const previewImages = isImage && file.previewUrl ? [file.previewUrl] : undefined;
        
        return {
          id: `file-${baseTimestamp}-${index}-${Math.random().toString(36).substring(2, 9)}`,
          type: "file" as const,
          position: freePositions[index] || { x: 100 + index * 260, y: 100 },
          data: {
            label,
            fileName: file.fileName,
            product: "atlas" as const,
            status: "draft" as const,
            fileExtension: file.extension,
            fileType: isImage ? "image" : "document",
            fileCategory: isImage ? "image" : "document",
            lastModified: "Updated just now",
            uploadedFile: file.uploadedFile,
            previewImages,
            tasks: [],
          },
        };
      });

      setNodes((nds) => {
        const existingIds = new Set(nds.map(n => n.id));
        return [...nds, ...newNodes.filter(n => !existingIds.has(n.id))];
      });
    },
    [setNodes, nodes]
  );

  // Handle files dropped directly onto canvas
  const handleFileDrop = useCallback(
    async (files: FileList, position: { x: number; y: number }) => {
      const uploadedResults: Array<{
        fileName: string;
        extension: FileExtension;
        uploadedFile: UploadedFile;
        previewUrl?: string;
      }> = [];

      // Filter supported files first
      const supportedFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(extension as FileExtension)) {
          supportedFiles.push(file);
        }
      }

      if (supportedFiles.length === 0) return;

      // Initialize upload progress for all files
      const initialProgress = supportedFiles.map((file, index) => ({
        id: `upload-${Date.now()}-${index}`,
        fileName: file.name,
        progress: 0,
        status: "uploading" as const,
      }));
      setUploadProgress(initialProgress);

      for (let i = 0; i < supportedFiles.length; i++) {
        const file = supportedFiles[i];
        const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        const uploadId = initialProgress[i].id;

        // Update progress to show we're starting this file
        setUploadProgress(prev => prev.map(p => 
          p.id === uploadId ? { ...p, progress: 5 } : p
        ));

        // Check file size - Vercel serverless functions have a ~4.5MB body size limit
        // Use client-side direct upload for ALL files to avoid this limit entirely
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`[v0] File: ${file.name}, Size: ${fileSizeMB.toFixed(2)}MB`);
        
        // Always use client-side direct upload to Blob (bypasses server size limits)
        try {
          console.log(`[v0] Using client direct upload for ${file.name}`);
          const { upload } = await import("@vercel/blob/client");
          
          const uploadResult = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/upload/client",
            onUploadProgress: (progress) => {
              setUploadProgress(prev => prev.map(p => 
                p.id === uploadId ? { ...p, progress: Math.round(progress.percentage) } : p
              ));
            },
          });
            
            // Update progress to complete
            setUploadProgress(prev => prev.map(p => 
              p.id === uploadId ? { ...p, progress: 100, status: "complete" } : p
            ));

            const isImage = extension.match(/^\.(png|jpg|jpeg|gif|webp|avif)$/i);
            const isVideo = extension.match(/^\.(mp4|mov|webm|avi|mkv|m4v)$/i);

            uploadedResults.push({
              fileName: file.name,
              extension: extension as FileExtension,
              uploadedFile: {
                url: uploadResult.url,
                pathname: uploadResult.pathname,
                size: file.size,
                uploadedAt: new Date().toISOString(),
              },
              previewUrl: isImage ? uploadResult.url : undefined,
              isVideo: !!isVideo,
            });
            continue; // Move to next file
          } catch (clientError) {
            console.error("[v0] Client upload failed:", clientError);
            const errorMessage = clientError instanceof Error ? clientError.message : "Upload failed";
            failedFiles.push({ name: file.name, error: errorMessage });
            setUploadProgress(prev => prev.map(p => 
              p.id === uploadId ? { ...p, status: "error", error: errorMessage } : p
            ));
          }
      }

      // Create nodes for uploaded files, positioned to avoid overlapping
      if (uploadedResults.length > 0) {
        // Check for files with the same name (potential version conflicts)
        const filesToCreate: typeof uploadedResults = [];
        
        for (const file of uploadedResults) {
          const fileName = file.fileName;
          // Find existing file node with the same filename
          const existingNode = nodes.find(
            (node) => node.type === "file" && (node.data as FileNodeData).fileName === fileName
          );
          
          if (existingNode) {
            // Show version conflict dialog for the first conflict
            setVersionConflict({
              existingNode,
              newFile: file,
              position,
            });
            // For simplicity, only handle one conflict at a time
            // Remaining files will be created as new nodes
            continue;
          }
          
          filesToCreate.push(file);
        }
        
        // Create new nodes for files without conflicts
        if (filesToCreate.length > 0) {
          const freePositions = findFreePositions(nodes, filesToCreate.length, position);
          const dropTimestamp = Date.now();

          const newNodes: AtlasNode[] = filesToCreate.map((file, index) => {
            const label = file.fileName.replace(file.extension, "");
            const isImage = file.extension.match(/^\.(png|jpg|jpeg|gif|webp|avif)$/i);
            const previewImages = isImage && file.previewUrl ? [file.previewUrl] : undefined;

            return {
              id: `file-${dropTimestamp}-${index}-${Math.random().toString(36).substring(2, 9)}`,
              type: "file" as const,
              position: freePositions[index] || { x: position.x + index * 260, y: position.y },
              selected: index === 0, // Select the first uploaded file
              data: {
                label,
                fileName: file.fileName,
                product: "atlas" as const,
                status: "draft" as const,
                fileExtension: file.extension,
                fileType: isImage ? "image" : (file.isVideo ? "video" : "document"),
                fileCategory: isImage ? "image" : (file.isVideo ? "video" : "document"),
                lastModified: "Updated just now",
                uploadedFile: file.uploadedFile,
                previewImages,
                tasks: [],
              },
            };
          });

          // Deselect other nodes and add new ones (dedup by ID to guard against double-add)
          setNodes((nds) => {
            const existingIds = new Set(nds.map(n => n.id));
            return [...nds.map(n => ({ ...n, selected: false })), ...newNodes.filter(n => !existingIds.has(n.id))];
          });

          // Center view on the first new node
          if (newNodes.length > 0) {
            const firstNode = newNodes[0];
            window.dispatchEvent(new CustomEvent("atlas:center-on-node", {
              detail: { nodeId: firstNode.id, position: firstNode.position }
            }));
          }
        }
      }
    },
    [setNodes, nodes]
  );

  // Handle version conflict resolution - add as new version
  const handleAddAsVersion = useCallback(() => {
    if (!versionConflict) return;
    
    const { existingNode, newFile } = versionConflict;
    const fileData = existingNode.data as FileNodeData;
    
    // Build current versions array
    const currentVersions = fileData.versions || [];
    let versionsToUpdate = [...currentVersions];
    
    // If no versions exist yet, create initial version from current state
    if (versionsToUpdate.length === 0 && fileData.uploadedFile) {
      versionsToUpdate.push({
        id: `v-${Date.now()}-initial`,
        versionName: fileData.label,
        previewImages: fileData.previewImages || [],
        uploadedAt: fileData.uploadedFile.uploadedAt || fileData.lastModified || new Date().toISOString(),
        uploadedBy: WORKSPACE_MEMBERS[0],
        fileUrl: fileData.uploadedFile.url,
        fileSize: fileData.uploadedFile.size,
      });
    }
    
    // Create new version
    const versionNumber = versionsToUpdate.length + 1;
    const isImage = newFile.extension.match(/^\.(png|jpg|jpeg|gif|webp|avif)$/i);
    const newVersion: FileVersion = {
      id: `v-${Date.now()}`,
      versionName: `${fileData.label} V ${versionNumber}.0`,
      previewImages: isImage && newFile.previewUrl ? [newFile.previewUrl] : fileData.previewImages || [],
      uploadedAt: new Date().toISOString(),
      uploadedBy: WORKSPACE_MEMBERS[0],
      fileUrl: newFile.uploadedFile.url,
      fileSize: newFile.uploadedFile.size,
    };
    
    // Create activity entry
    const newActivity: FileActivity = {
      id: `a-${Date.now()}`,
      type: "version-add",
      description: `Uploaded new version V ${versionNumber}.0`,
      user: WORKSPACE_MEMBERS[0],
      timestamp: new Date().toISOString(),
    };
    
    // Update the existing node with new version
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === existingNode.id) {
          const currentData = node.data as FileNodeData;
          return {
            ...node,
            data: {
              ...currentData,
              versions: [...versionsToUpdate, newVersion],
              activities: [...(currentData.activities || []), newActivity],
              uploadedFile: newFile.uploadedFile,
              previewImages: isImage && newFile.previewUrl 
                ? [newFile.previewUrl, ...(currentData.previewImages || []).slice(0, 3)]
                : currentData.previewImages,
              lastModified: "Updated just now",
            },
          };
        }
        return node;
      })
    );
    
    setVersionConflict(null);
  }, [versionConflict, setNodes]);

  // Handle version conflict resolution - create as separate file
  const handleCreateSeparate = useCallback(() => {
    if (!versionConflict) return;
    
    const { newFile, position } = versionConflict;
    const label = newFile.fileName.replace(newFile.extension, "");
    const isImage = newFile.extension.match(/^\.(png|jpg|jpeg|gif|webp|avif)$/i);
    const previewImages = isImage && newFile.previewUrl ? [newFile.previewUrl] : undefined;
    
    // Find a free position
    const freePositions = findFreePositions(nodes, 1, position);
    
    const newNode: AtlasNode = {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: "file" as const,
      position: freePositions[0] || position,
      data: {
        label,
        fileName: newFile.fileName,
        product: "atlas" as const,
        status: "draft" as const,
        fileExtension: newFile.extension as FileExtension,
        fileType: isImage ? "image" : (newFile.isVideo ? "video" : "document"),
        fileCategory: isImage ? "image" : (newFile.isVideo ? "video" : "document"),
        lastModified: "Updated just now",
        uploadedFile: newFile.uploadedFile,
        previewImages,
        tasks: [],
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    setVersionConflict(null);
  }, [versionConflict, setNodes, nodes]);

  // Wrapper handlers that use the double-click position then close the menu
  const handleDoubleClickAddStatusPill = useCallback(() => {
    if (doubleClickPosition) {
      handleAddStatusPill(doubleClickPosition);
    }
    closeDoubleClickMenu();
  }, [doubleClickPosition, handleAddStatusPill, closeDoubleClickMenu]);

  const handleDoubleClickAddTextNode = useCallback(() => {
    if (doubleClickPosition) {
      handleAddTextNode(doubleClickPosition);
    }
    closeDoubleClickMenu();
  }, [doubleClickPosition, handleAddTextNode, closeDoubleClickMenu]);

  const handleDoubleClickAddSageNode = useCallback((sageType: "chatbot" | "overview" | "stakeholder") => {
    if (doubleClickPosition) {
      handleAddSageNode(sageType, doubleClickPosition);
    }
    closeDoubleClickMenu();
  }, [doubleClickPosition, handleAddSageNode, closeDoubleClickMenu]);

  const handleDoubleClickAddOperationalNode = useCallback((opType: "capacity" | "financial" | "projectHealth" | "pipeline" | "teamHealth") => {
    if (doubleClickPosition) {
      handleAddOperationalNode(opType, doubleClickPosition);
    }
    closeDoubleClickMenu();
  }, [doubleClickPosition, handleAddOperationalNode, closeDoubleClickMenu]);

  const handleDoubleClickUploadFile = useCallback((files: FileList) => {
    if (doubleClickPosition) {
      handleFileDrop(files, doubleClickPosition);
    }
    closeDoubleClickMenu();
  }, [doubleClickPosition, handleFileDrop, closeDoubleClickMenu]);

const handleDoubleClickOpenAIGenerate = useCallback((type: "mockup" | "collateral") => {
  if (type === "mockup") {
    const fileNode = nodes.find(n => n.type === "file" && (n.data as FileNodeData).uploadedFile?.url);
    if (fileNode) {
      createAIPromptNode(fileNode.id, fileNode.data as FileNodeData);
    } else {
      alert("Please upload an image first to generate mockups from.");
    }
  } else if (type === "collateral") {
    alert("Collateral generation coming soon!");
  }
  closeDoubleClickMenu();
}, [nodes, createAIPromptNode, closeDoubleClickMenu]);

  const handleNodesChangeWrapper = useCallback(
    (changes: NodeChange<AtlasNode>[]) => {
      onNodesChange(changes);

      for (const change of changes) {
        if (change.type === "select" && change.selected) {
          const node = nodes.find((n) => n.id === change.id);
          if (node) {
            setSelectedNode(node);
          }
        } else if (change.type === "select" && !change.selected) {
          if (selectedNode?.id === change.id) {
            setSelectedNode(null);
          }
        }
      }
    },
    [onNodesChange, nodes, selectedNode]
  );

  // Comment handlers
  const handleCanvasClick = useCallback((position: { x: number; y: number }) => {
    if (commentMode) {
      setNewCommentPosition(position);
      setSelectedCommentId(null);
    }
  }, [commentMode]);

  const handleCommentSelect = useCallback((commentId: string | null) => {
    setSelectedCommentId(commentId);
    setNewCommentPosition(null);
  }, []);

  const handleCommentAdd = useCallback((content: string, position: { x: number; y: number }) => {
    const newComment: CanvasComment = {
      id: `comment-${Date.now()}`,
      position,
      content,
      author: currentUser,
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
    };
    
    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    setNewCommentPosition(null);
    setCommentMode(false);
    setSelectedCommentId(newComment.id);
    syncCanvas(updatedComments);
  }, [comments, currentUser, syncCanvas]);

  const handleCommentUpdate = useCallback((updatedComment: CanvasComment) => {
    const updatedComments = comments.map(c => 
      c.id === updatedComment.id ? updatedComment : c
    );
    setComments(updatedComments);
    syncCanvas(updatedComments);
  }, [comments, syncCanvas]);

  const handleCommentDelete = useCallback((commentId: string) => {
    const updatedComments = comments.filter(c => c.id !== commentId);
    setComments(updatedComments);
    setSelectedCommentId(null);
    syncCanvas(updatedComments);
  }, [comments, syncCanvas]);

  const handleCancelNewComment = useCallback(() => {
    setNewCommentPosition(null);
  }, []);

  const handleCommentModeChange = useCallback((enabled: boolean) => {
    setCommentMode(enabled);
    if (!enabled) {
      setNewCommentPosition(null);
    }
    setSelectedCommentId(null);
  }, []);

  const handleCopyNodeLink = useCallback((nodeId: string) => {
    const url = `${window.location.origin}?canvas=${canvas.id}&node=${nodeId}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopiedNodeId(nodeId);
      setTimeout(() => setLinkCopiedNodeId(null), 2000);
    });
  }, [canvas.id]);

  return (
    <CanvasNodeActionsProvider value={{ onCopyNodeLink: handleCopyNodeLink }}>
    <div className="h-screen flex flex-col" style={{ backgroundColor: "#0a0a0a" }}>
      <AtlasToolbar
        canvasName={canvas.name}
        onBack={onBack}
        onCanvasNameChange={(name) => onCanvasChange({ ...canvas, name })}
        onSaveAsFramework={() => setShowFrameworkCreator(true)}
        onBrowseFrameworks={() => setShowFrameworkLibrary(true)}
        onCopyToCanvas={() => {
          setMoveToCanvasMode("copy");
          setShowMoveToCanvasDialog(true);
        }}
        hasSelectedNodes={nodes.some(node => node.selected)}
        hasOtherCanvases={canvases && canvases.length > 1}
        recentCanvases={recentCanvases}
        onSwitchCanvas={onSwitchCanvas}
        pages={pages}
        activePageId={activePageId}
        onSwitchPage={switchPage}
        onAddPage={handleAddPage}
        onRenamePage={handleRenamePage}
      />

      <div className="flex-1 flex overflow-hidden relative" style={{ marginTop: 0 }}>
        <AtlasCanvas
          nodes={nodes}
          edges={edges}
          searchQuery={searchQuery}
          comments={comments}
          commentMode={commentMode}
          newCommentPosition={newCommentPosition}
          selectedCommentId={selectedCommentId}
          currentUser={currentUser}
          onNodesChange={handleNodesChangeWrapper}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesUpdate={handleNodesUpdate}
          onDoubleClick={handleDoubleClickCanvas}
          onRightClick={handleDoubleClickCanvas}
          onCanvasClick={handleCanvasClick}
          onCommentSelect={handleCommentSelect}
          onCommentAdd={handleCommentAdd}
          onCommentUpdate={handleCommentUpdate}
          onCommentDelete={handleCommentDelete}
          onCancelNewComment={handleCancelNewComment}
          onNodeDoubleClick={setDetailModalNodeId}
          onFileDrop={handleFileDrop}
          onUploadFile={(files, position) => {
            // Use center of canvas if no position provided
            const uploadPosition = position || { x: 400, y: 300 };
            handleFileDrop(files, uploadPosition);
          }}
          onAddStatusPill={handleAddStatusPill}
          onAddTextNode={handleAddTextNode}
          onAddSageNode={handleAddSageNode}
onAddOperationalNode={handleAddOperationalNode}
  onOpenAIGenerate={(type, sourceNodeId) => {
    if (type === "mockup") {
      // When triggered from a connector dot, use that specific node's data.
      // Fallback to first file node for toolbar-triggered generation.
      const fileNode = sourceNodeId
        ? nodes.find(n => n.id === sourceNodeId && n.type === "file")
        : nodes.find(n => n.type === "file" && (n.data as FileNodeData).uploadedFile?.url);
      if (fileNode) {
        createAIPromptNode(fileNode.id, fileNode.data as FileNodeData);
      } else {
        alert("Please upload an image first to generate mockups from.");
      }
    } else if (type === "collateral") {
      const nodeId = `text-${Date.now()}`;
      const sourceNode = sourceNodeId ? nodes.find(n => n.id === sourceNodeId) : null;
      const nodePosition = sourceNode
        ? { x: sourceNode.position.x + 320, y: sourceNode.position.y }
        : { x: 400, y: 300 };
      setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), {
        id: nodeId,
        type: "text",
        position: nodePosition,
        selected: true,
        data: {
          label: "Collateral Generation",
          content: "Collateral generation coming soon. Use this node to plan your collateral needs.",
          lastModified: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          formatting: { color: "#ffffff", font: "sans", size: "medium", bold: false, strikethrough: false, align: "left" },
        },
      }]);
      if (sourceNodeId) {
        setEdges(eds => [...eds, { id: `edge-${sourceNodeId}-${nodeId}`, source: sourceNodeId, target: nodeId }]);
      }
    }
  }}
  onCreateMoodboard={handleCreateMoodboard}
          onMoodboardClick={handleMoodboardClick}
presentationMode={presentationMode}
  presentationEdges={presentationEdges}
  onPresentationConnect={handlePresentationConnect}
  onCreatePresentationGroup={handleCreatePresentationGroup}
  onNodeContextMenu={(event, selectedNodes) => {
    setContextMenu({
      position: { x: event.clientX, y: event.clientY },
      nodes: selectedNodes,
    });
  }}
  />

<CanvasSideToolbar
        onAddStatusPill={handleAddStatusPill}
        onAddTextNode={() => handleAddTextNode()}
  onAddSageNode={handleAddSageNode}
  onAddOperationalNode={handleAddOperationalNode}
  onUploadFile={(files) => handleFileDrop(files, { x: 400, y: 300 })}
  onOpenAIGenerate={(type) => {
    if (type === "mockup") {
      const fileNode = nodes.find(n => n.type === "file" && (n.data as FileNodeData).uploadedFile?.url);
      if (fileNode) {
        createAIPromptNode(fileNode.id, fileNode.data as FileNodeData);
      } else {
        alert("Please upload an image first to generate mockups from.");
      }
    } else if (type === "collateral") {
      const nodeId = `text-${Date.now()}`;
      setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), {
        id: nodeId,
        type: "text",
        position: { x: 400, y: 300 },
        selected: true,
        data: {
          label: "Collateral Generation",
          content: "Collateral generation coming soon. Use this node to plan your collateral needs.",
          lastModified: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          formatting: { color: "#ffffff", font: "sans", size: "medium", bold: false, strikethrough: false, align: "left" },
        },
      }]);
    }
  }}
  onSettingsClick={() => setShowSettingsDialog(true)}
  onSearchChange={setSearchQuery}
  searchQuery={searchQuery}
  commentMode={commentMode}
  onCommentModeChange={handleCommentModeChange}
  commentCount={comments.filter(c => !c.resolved).length}
  presentationMode={presentationMode}
  onPresentationModeChange={handlePresentationModeChange}
  onStartPresentation={handleStartPresentation}
  presentationEdgeCount={new Set(presentationEdges.flatMap(e => [e.source, e.target])).size}
  hasPlayableFlow={selectedFlowId !== null || presentationEdges.length > 0 || presentationGroups.length > 0}
  />

      {/* Saved presentation flows panel — top-right of canvas, shown in builder mode */}
      {presentationMode && (
        <div className="absolute top-4 z-40 flex flex-col gap-2 items-end" style={{ right: 80 }}>
          {(canvas.presentationFlows ?? []).map(flow => (
            <div key={flow.id} className="group flex items-center gap-1">
              {/* Delete button, visible on hover */}
              <button
                type="button"
                onClick={() => handleDeleteFlow(flow.id)}
                className="invisible group-hover:visible w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                title="Delete flow"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M6 2L2 6M2 2L6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              {/* Flow chip */}
              <button
                type="button"
                onClick={() => handleSelectFlow(selectedFlowId === flow.id ? null : flow.id)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: selectedFlowId === flow.id ? "#F0FE00" : "rgba(255,255,255,0.08)",
                  color: selectedFlowId === flow.id ? "#121212" : "rgba(255,255,255,0.7)",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="2" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4 12H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M7 10V12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {flow.name}
              </button>
            </div>
          ))}

          {/* Save current builder flow */}
          {presentationEdges.length > 0 && selectedFlowId === null && (
            savingFlow ? (
              <div
                className="flex items-center gap-2 h-9 px-3 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                <input
                  autoFocus
                  value={newFlowName}
                  onChange={e => setNewFlowName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { handleSaveFlow(newFlowName); setSavingFlow(false); setNewFlowName(""); }
                    if (e.key === "Escape") { setSavingFlow(false); setNewFlowName(""); }
                  }}
                  placeholder="Flow name…"
                  className="bg-transparent outline-none text-xs text-foreground placeholder-muted-foreground w-28"
                />
                <button
                  type="button"
                  onClick={() => { handleSaveFlow(newFlowName); setSavingFlow(false); setNewFlowName(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => { setSavingFlow(false); setNewFlowName(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M8 2L2 8M2 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSavingFlow(true)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs transition-colors"
                style={{
                  backgroundColor: "transparent",
                  border: "1px dashed rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Save flow
              </button>
            )
          )}
        </div>
      )}

      </div>

      {/* Double-click Add Node Menu */}
      {showDoubleClickMenu && (
        <AddNodeMenu
          onAddStatusPill={handleDoubleClickAddStatusPill}
          onAddTextNode={handleDoubleClickAddTextNode}
          onAddSageNode={handleDoubleClickAddSageNode}
          onAddOperationalNode={handleDoubleClickAddOperationalNode}
          onUploadFile={handleDoubleClickUploadFile}
          onOpenAIGenerate={handleDoubleClickOpenAIGenerate}
          onClose={closeDoubleClickMenu}
          position={doubleClickMenuScreenPosition}
        />
      )}

      {/* Upload Progress Indicator */}
      <UploadProgress 
        uploads={uploadProgress} 
        onDismiss={() => setUploadProgress([])} 
      />

      {/* Upload Dialog */}
      <UploadDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onFilesUploaded={handleFilesUploaded}
      />

      {/* Settings Dialog */}
      <WorkspaceSettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        settings={workspaceSettings}
        onSettingsChange={onWorkspaceSettingsChange}
        onMakeFramework={() => {
          setShowSettingsDialog(false);
          setShowFrameworkCreator(true);
        }}
      />

      {/* Save as Framework Dialog (legacy — kept for backwards compat) */}
      <SaveFrameworkDialog
        open={showSaveFrameworkDialog}
        onClose={() => setShowSaveFrameworkDialog(false)}
        canvas={canvas}
        currentUser={{
          ...workspaceSettings.members[0],
          avatar: workspaceSettings.branding?.profilePicture || workspaceSettings.members[0].avatar,
        }}
        onSaveFramework={(framework) => {
          if (onSaveFramework) onSaveFramework(framework);
          setShowSaveFrameworkDialog(false);
        }}
      />

      {/* Framework Creator Dialog (new — 2-step with parameters) */}
      <FrameworkCreatorDialog
        open={showFrameworkCreator}
        onClose={() => setShowFrameworkCreator(false)}
        canvas={canvas}
        currentUser={{
          ...workspaceSettings.members[0],
          avatar: workspaceSettings.branding?.profilePicture || workspaceSettings.members[0].avatar,
        }}
        onSaveFramework={(framework) => {
          if (onSaveFramework) onSaveFramework(framework);
          setShowFrameworkCreator(false);
        }}
      />

      {/* Framework Library Panel */}
      <FrameworkLibraryPanel
        isOpen={showFrameworkLibrary}
        onClose={() => setShowFrameworkLibrary(false)}
        frameworks={frameworks ?? []}
        currentUserId={workspaceSettings.members[0].id}
        onRun={(fw) => {
          setShowFrameworkLibrary(false);
          setRunFramework(fw);
        }}
        onDelete={onRemoveFramework}
      />

      {/* Framework Run Dialog */}
      <FrameworkRunDialog
        framework={runFramework}
        isOpen={runFramework !== null}
        onClose={() => setRunFramework(null)}
        onRun={(fw, paramValues) => {
          const ts = Date.now();
          const idMap = new Map<string, string>();
          fw.nodes.forEach((n, i) => idMap.set(n.id, `fw-${ts}-${i}`));

          // Clone nodes and replace {{param}} placeholders
          const newNodes = fw.nodes.map(node => {
            let dataStr = JSON.stringify(node.data);
            for (const [pid, val] of Object.entries(paramValues)) {
              dataStr = dataStr.split(`{{${pid}}}`).join(val.replace(/\\/g, "\\\\").replace(/"/g, '\\"'));
            }
            return { ...node, id: idMap.get(node.id)!, data: JSON.parse(dataStr), selected: true };
          });

          // Position below existing nodes
          const existingNodes = nodes;
          const maxY = existingNodes.reduce((m, n) => Math.max(m, n.position.y + (n.height ?? 200)), 0);
          const minFwX = fw.nodes.reduce((m, n) => Math.min(m, n.position.x), Infinity);
          const offsetY = existingNodes.length > 0 ? maxY + 120 : 100;
          const offsetX = 100 - (isFinite(minFwX) ? minFwX : 0);

          const positionedNodes = newNodes.map(n => ({
            ...n,
            position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
          }));

          const newEdges = fw.edges.map((e, i) => ({
            ...e,
            id: `fw-edge-${ts}-${i}`,
            source: idMap.get(e.source) ?? e.source,
            target: idMap.get(e.target) ?? e.target,
          }));

          setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...positionedNodes]);
          setEdges(eds => [...eds, ...newEdges]);
          setRunFramework(null);
        }}
      />

      {/* Node Context Menu */}
      {contextMenu && (
        <NodeContextMenu
          position={contextMenu.position}
          selectedCount={contextMenu.nodes.length}
          onClose={() => setContextMenu(null)}
          onMoveToCanvas={() => {
            setMoveToCanvasMode("move");
            setShowMoveToCanvasDialog(true);
          }}
          onDuplicateToCanvas={() => {
            setMoveToCanvasMode("copy");
            setShowMoveToCanvasDialog(true);
          }}
          onDuplicate={() => {
            // Duplicate nodes in place
            const newNodes = contextMenu.nodes.map(node => ({
              ...node,
              id: `${node.id}-dup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              position: {
                x: node.position.x + 30,
                y: node.position.y + 30,
              },
              selected: true,
            }));
            setNodes(nds => [
              ...nds.map(n => ({ ...n, selected: false })),
              ...newNodes,
            ]);
          }}
          onDelete={() => {
            const nodeIdsToDelete = contextMenu.nodes.map(n => n.id);
            setNodes(nds => nds.filter(n => !nodeIdsToDelete.includes(n.id)));
            setEdges(eds => eds.filter(e => !nodeIdsToDelete.includes(e.source) && !nodeIdsToDelete.includes(e.target)));
          }}
          hasOtherCanvases={!!(canvases && canvases.length > 1)}
          onOrganize={() => {
            const selectedNodes = contextMenu.nodes;
            if (selectedNodes.length < 2) return;

            // Uniform grid constants — consistent spacing, no overlap
            const CELL_WIDTH = 280;
            const CELL_HEIGHT = 340;
            const GAP_X = 32;
            const GAP_Y = 32;
            const COLS = Math.ceil(Math.sqrt(selectedNodes.length));

            // Anchor to the top-left corner of the current bounding box
            let minX = Infinity, minY = Infinity;
            for (const node of selectedNodes) {
              minX = Math.min(minX, node.position.x);
              minY = Math.min(minY, node.position.y);
            }

            // Sort by reading order (top-to-bottom, left-to-right)
            const sortedNodes = [...selectedNodes].sort((a, b) => {
              const rowA = Math.round(a.position.y / 50);
              const rowB = Math.round(b.position.y / 50);
              if (rowA !== rowB) return rowA - rowB;
              return a.position.x - b.position.x;
            });

            const updates: Record<string, { x: number; y: number }> = {};
            sortedNodes.forEach((node, i) => {
              const col = i % COLS;
              const row = Math.floor(i / COLS);
              updates[node.id] = {
                x: minX + col * (CELL_WIDTH + GAP_X),
                y: minY + row * (CELL_HEIGHT + GAP_Y),
              };
            });

            setNodes(nds => nds.map(node => {
              const pos = updates[node.id];
              return pos ? { ...node, position: pos } : node;
            }));

            setContextMenu(null);
          }}
          onSyncNode={() => {
            if (contextMenu.nodes.length === 1 && (contextMenu.nodes[0].type === "file" || contextMenu.nodes[0].type === "text")) {
              setSyncTargetNode(contextMenu.nodes[0]);
              setShowSyncDialog(true);
            }
          }}
          onSyncMultiple={() => {
            const syncableNodes = contextMenu.nodes.filter(n => n.type === "file" || n.type === "text");
            if (syncableNodes.length > 0) {
              setSyncMultipleNodes(syncableNodes);
              setShowSyncMultipleDialog(true);
            }
          }}
          isSyncableNode={contextMenu.nodes.length === 1 && (contextMenu.nodes[0].type === "file" || contextMenu.nodes[0].type === "text")}
          hasSyncableNodes={contextMenu.nodes.some(n => n.type === "file" || n.type === "text")}
          isSynced={contextMenu.nodes.length === 1 && !!((contextMenu.nodes[0].data as any).syncGroupId)}
          onCopyLink={contextMenu.nodes.length === 1 ? () => handleCopyNodeLink(contextMenu.nodes[0].id) : undefined}
        />
      )}

      {/* Move to Canvas Dialog */}
      {canvases && onCopyNodesToCanvas && (
        <MoveToCanvasDialog
          isOpen={showMoveToCanvasDialog}
          onClose={() => setShowMoveToCanvasDialog(false)}
          canvases={canvases}
          currentCanvasId={canvas.id}
          selectedNodes={contextMenu?.nodes || nodes.filter(node => node.selected)}
          defaultMode={moveToCanvasMode}
          onTransferToCanvas={(targetCanvasId, nodesToTransfer, mode) => {
            onCopyNodesToCanvas(targetCanvasId, nodesToTransfer, mode);
            if (mode === "move") {
              // Remove nodes from current canvas
              const nodeIds = nodesToTransfer.map(n => n.id);
              setNodes(nds => nds.filter(n => !nodeIds.includes(n.id)));
              setEdges(eds => eds.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
            }
          }}
          onCreateCanvasAndTransfer={(canvasName, nodesToTransfer, mode) => {
            if (onCreateCanvasWithNodes) {
              onCreateCanvasWithNodes(canvasName, nodesToTransfer, mode);
              if (mode === "move") {
                // Remove nodes from current canvas
                const nodeIds = nodesToTransfer.map(n => n.id);
                setNodes(nds => nds.filter(n => !nodeIds.includes(n.id)));
                setEdges(eds => eds.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
              }
            }
          }}
        />
      )}

      {/* Sync File Dialog */}
      {canvases && syncTargetNode && (
        <SyncFileDialog
          isOpen={showSyncDialog}
          onClose={() => {
            setShowSyncDialog(false);
            setSyncTargetNode(null);
          }}
          canvases={canvases}
          currentCanvasId={canvas.id}
          selectedNode={syncTargetNode}
          onSyncFiles={(targetNodeId, targetCanvasId) => {
            if (onSyncFiles) {
              onSyncFiles(syncTargetNode.id, targetNodeId, targetCanvasId);
            }
            setShowSyncDialog(false);
            setSyncTargetNode(null);
            setContextMenu(null);
          }}
          onUnsync={onUnsyncFile ? () => {
            onUnsyncFile(syncTargetNode.id);
            setShowSyncDialog(false);
            setSyncTargetNode(null);
            setContextMenu(null);
          } : undefined}
        />
      )}

      {/* Sync Multiple Dialog */}
      {canvases && syncMultipleNodes.length > 0 && (
        <SyncMultipleDialog
          isOpen={showSyncMultipleDialog}
          onClose={() => {
            setShowSyncMultipleDialog(false);
            setSyncMultipleNodes([]);
          }}
          canvases={canvases}
          currentCanvasId={canvas.id}
          selectedNodes={syncMultipleNodes}
          onSyncMultiple={(syncPairs) => {
            if (onSyncFiles) {
              for (const pair of syncPairs) {
                onSyncFiles(pair.sourceId, pair.targetId, pair.targetCanvasId);
              }
            }
            setShowSyncMultipleDialog(false);
            setSyncMultipleNodes([]);
            setContextMenu(null);
          }}
        />
      )}

      {/* File Detail Modal */}
      {detailModalNodeId && (() => {
        const node = nodes.find(n => n.id === detailModalNodeId && n.type === "file");
        if (!node) return null;
        const fileData = node.data as FileNodeData;
        return (
          <FileDetailModal
            isOpen={true}
            onClose={() => setDetailModalNodeId(null)}
            fileData={fileData}
            canvasId={canvas.id}
            nodeId={detailModalNodeId}
            onUpdateFile={(updates) => {
              setNodes(nds => nds.map(n =>
                n.id === detailModalNodeId
                  ? { ...n, data: { ...n.data, ...updates } }
                  : n
              ));
            }}
          />
        );
      })()}

      {/* Sage Expanded Modal */}
      {detailModalNodeId && (() => {
        const node = nodes.find(n => n.id === detailModalNodeId);
        const sageTypes = ["sageChatbot", "sageOverview", "stakeholder"];
        if (!node || !sageTypes.includes(node.type || "")) return null;
        return (
          <SageExpandedModal
            isOpen={true}
            onClose={() => setDetailModalNodeId(null)}
            nodeId={node.id}
            nodeType={node.type as "sageChatbot" | "sageOverview" | "stakeholder"}
          />
        );
      })()}

{/* Version Conflict Dialog */}
      {versionConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div 
            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            style={{ 
              backgroundColor: "#1C1C1E",
              border: "1px solid #2C2C2E",
            }}
          >
            <h2 
              className="text-lg font-semibold mb-2"
              style={{ color: "#FFFFFF", fontFamily: "system-ui, Inter, sans-serif" }}
            >
              File Already Exists
            </h2>
            <p 
              className="text-sm mb-6"
              style={{ color: "#8E8E93", fontFamily: "system-ui, Inter, sans-serif" }}
            >
              A file named <span className="font-medium text-white">{versionConflict.newFile.fileName}</span> already exists on this canvas. Would you like to add this as a new version or create a separate file?
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAddAsVersion}
                className="w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: "#F0FE00",
                  color: "#000000",
                  fontFamily: "system-ui, Inter, sans-serif"
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2V10M8 2L5 5M8 2L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 12V13H13V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add as New Version
              </button>
              
              <button
                type="button"
                onClick={handleCreateSeparate}
                className="w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: "#2C2C2E",
                  color: "#FFFFFF",
                  fontFamily: "system-ui, Inter, sans-serif"
                }}
              >
                Create Separate File
              </button>
              
              <button
                type="button"
                onClick={() => setVersionConflict(null)}
                className="w-full py-2 text-sm transition-colors"
                style={{ 
                  color: "#8E8E93",
                  fontFamily: "system-ui, Inter, sans-serif"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moodboard Expanded View */}
      {expandedMoodboardId && (() => {
        const moodboardNode = nodes.find(n => n.id === expandedMoodboardId);
        if (!moodboardNode || moodboardNode.type !== "moodboard") return null;
        return (
          <MoodboardExpanded
            data={moodboardNode.data as MoodboardNodeData}
            onClose={() => setExpandedMoodboardId(null)}
            onUngroup={handleUngroupMoodboard}
            onDataChange={(newData) => {
              setNodes(prevNodes => prevNodes.map(n => 
                n.id === expandedMoodboardId 
                  ? { ...n, data: newData }
                  : n
              ));
            }}
          />
        );
      })()}

      {/* Presentation Viewer */}
      {isPresenting && (
<PresentationViewer
  nodes={nodes}
  presentationEdges={presentationEdges}
  presentationGroups={presentationGroups}
  onClose={() => {
  setIsPresenting(false);
  handlePresentationModeChange(false);
  }}
  presentationName={canvas.presentationName || "Untitled Presentation"}
  onPresentationNameChange={(name) => {
  onCanvasChange({ ...canvas, presentationName: name });
  }}
  workspaceName={workspaceSettings.name}
  />
      )}

      {/* Page Tab Bar */}
      {!isPresenting && (
        <div
          className="flex items-center gap-0 px-2 select-none flex-shrink-0 overflow-x-auto"
          style={{ backgroundColor: "#111111", borderTop: "1px solid #1e1e1e", height: 36, fontFamily: "system-ui, Inter, sans-serif" }}
        >
          {pages.map((page, idx) => {
            const isActive = page.id === activePageId;
            const isRenaming = renamingPageId === page.id;
            return (
              <div
                key={page.id}
                className="flex items-center group flex-shrink-0"
                style={{ position: "relative" }}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    defaultValue={page.name}
                    onBlur={e => handleRenamePage(page.id, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleRenamePage(page.id, (e.target as HTMLInputElement).value);
                      if (e.key === "Escape") setRenamingPageId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="px-2 py-0.5 text-xs rounded outline-none"
                    style={{ backgroundColor: "#2a2a2a", color: "#fff", border: "1px solid #3a82f6", width: 90, fontFamily: "system-ui, Inter, sans-serif" }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => switchPage(page.id)}
                    onDoubleClick={() => setRenamingPageId(page.id)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs transition-colors"
                    style={{
                      color: isActive ? "#fff" : "#666",
                      borderBottom: isActive ? "2px solid #3a82f6" : "2px solid transparent",
                      backgroundColor: isActive ? "#1a1a1a" : "transparent",
                      height: 35,
                      fontFamily: "system-ui, Inter, sans-serif",
                    }}
                  >
                    {idx + 1 <= 9 && (
                      <span style={{ color: isActive ? "#3a82f6" : "#444", fontSize: 9, fontWeight: 600 }}>{idx + 1}</span>
                    )}
                    <span>{page.name}</span>
                    {pages.length > 1 && (
                      <span
                        onClick={e => { e.stopPropagation(); handleDeletePage(page.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:text-red-400"
                        style={{ fontSize: 10, color: "#555", cursor: "pointer", lineHeight: 1 }}
                        role="button"
                        aria-label="Delete page"
                      >
                        ×
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
          {/* Add page button */}
          <button
            type="button"
            onClick={handleAddPage}
            className="flex items-center justify-center px-2 transition-colors hover:text-white"
            style={{ color: "#555", height: 35, flexShrink: 0 }}
            title="Add page"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* "Link copied" toast */}
      {linkCopiedNodeId && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium pointer-events-none"
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #F0FE0040",
            color: "#F0FE00",
            fontFamily: "system-ui, Inter, sans-serif",
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7L5 10L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Link copied to clipboard
        </div>
      )}
    </div>
    </CanvasNodeActionsProvider>
  );
}

export function AtlasEditor(props: AtlasEditorProps) {
  return (
    <ReactFlowProvider>
      <AtlasEditorInner {...props} />
    </ReactFlowProvider>
  );
}
