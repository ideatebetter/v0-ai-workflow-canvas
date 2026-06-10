"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type NodeChange,
} from "@xyflow/react";

import type { AtlasNode, FileExtension, FileNodeData, UploadedFile, WorkspaceSettings, Canvas, CanvasComment, MoodboardNodeData, CanvasFramework, FileVersion, FileActivity } from "@/lib/atlas-types";
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
  onCopyNodesToCanvas?: (targetCanvasId: string, nodes: AtlasNode[], mode: "move" | "copy") => void;
  onCreateCanvasWithNodes?: (canvasName: string, nodes: AtlasNode[], mode: "move" | "copy") => void;
  onDeleteNodesFromCanvas?: (nodeIds: string[]) => void;
  onSyncFiles?: (sourceNodeId: string, targetNodeId: string, targetCanvasId: string) => void;
  onUnsyncFile?: (nodeId: string) => void;
  recentCanvases?: Canvas[];
  onSwitchCanvas?: (canvasId: string) => void;
}

// Constants for node positioning
const NODE_WIDTH = 220;
const NODE_HEIGHT = 180;
const NODE_GAP = 40;
const GRID_COLS = 4;

// Helper function to find free positions for new nodes that don't overlap with existing ones
function findFreePositions(
  existingNodes: AtlasNode[],
  count: number,
  startPosition?: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  
  // Get bounding boxes of existing nodes
  const existingBounds = existingNodes.map(node => ({
    left: node.position.x,
    right: node.position.x + NODE_WIDTH,
    top: node.position.y,
    bottom: node.position.y + NODE_HEIGHT,
  }));

  // Check if a position overlaps with any existing node
  const isOverlapping = (x: number, y: number) => {
    const newBounds = {
      left: x,
      right: x + NODE_WIDTH,
      top: y,
      bottom: y + NODE_HEIGHT,
    };
    
    // Check against existing nodes and already placed new nodes
    const allBounds = [
      ...existingBounds,
      ...positions.map(p => ({
        left: p.x,
        right: p.x + NODE_WIDTH,
        top: p.y,
        bottom: p.y + NODE_HEIGHT,
      }))
    ];
    
    return allBounds.some(bounds => 
      !(newBounds.right < bounds.left || 
        newBounds.left > bounds.right || 
        newBounds.bottom < bounds.top || 
        newBounds.top > bounds.bottom)
    );
  };

  // Find the bottom-most and right-most positions of existing nodes
  let maxY = 100;
  let maxX = 100;
  for (const node of existingNodes) {
    maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
    maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
  }

  // Start position: either provided, or below existing content
  const baseX = startPosition?.x ?? 100;
  const baseY = startPosition?.y ?? (existingNodes.length > 0 ? maxY + NODE_GAP : 100);

  // Place nodes in a grid pattern, finding non-overlapping positions
  for (let i = 0; i < count; i++) {
    let placed = false;
    
    // First try to place in grid pattern from base position
    const gridX = baseX + (i % GRID_COLS) * (NODE_WIDTH + NODE_GAP);
    const gridY = baseY + Math.floor(i / GRID_COLS) * (NODE_HEIGHT + NODE_GAP);
    
    if (!isOverlapping(gridX, gridY)) {
      positions.push({ x: gridX, y: gridY });
      placed = true;
    }
    
    // If grid position overlaps, search for a free spot
    if (!placed) {
      // Search in expanding rows below existing content
      for (let row = 0; row < 20 && !placed; row++) {
        for (let col = 0; col < GRID_COLS && !placed; col++) {
          const x = 100 + col * (NODE_WIDTH + NODE_GAP);
          const y = maxY + NODE_GAP + row * (NODE_HEIGHT + NODE_GAP);
          
          if (!isOverlapping(x, y)) {
            positions.push({ x, y });
            placed = true;
          }
        }
      }
    }
    
    // Fallback: place at the very bottom
    if (!placed) {
      const fallbackY = maxY + NODE_GAP + positions.length * (NODE_HEIGHT + NODE_GAP);
      positions.push({ x: 100, y: fallbackY });
    }
  }

  return positions;
}

function AtlasEditorInner({ canvas, onCanvasChange, onBack, workspaceSettings, onWorkspaceSettingsChange, onSaveFramework, canvases, onCopyNodesToCanvas, onCreateCanvasWithNodes, onDeleteNodesFromCanvas, onSyncFiles, onUnsyncFile, recentCanvases, onSwitchCanvas }: AtlasEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<AtlasNode>(canvas.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(canvas.edges);
  const [comments, setComments] = useState<CanvasComment[]>(canvas.comments || []);
  const [selectedNode, setSelectedNode] = useState<AtlasNode | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showSaveFrameworkDialog, setShowSaveFrameworkDialog] = useState(false);
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
      
      // Update edges separately using the same IDs
      setEdges(currentEdges => {
        const newEdges: Edge[] = mockupIds.map((mockupId) => ({
          id: `edge-${sourceNodeId}-${mockupId}`,
          source: sourceNodeId,
          target: mockupId,
          style: { stroke: "#F0FE00", strokeWidth: 2 },
          animated: true,
        }));
        
        return [
          ...currentEdges.filter(e => e.source !== promptNodeId && e.target !== promptNodeId),
          ...newEdges
        ];
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
  const syncCanvas = useCallback((updatedComments?: CanvasComment[]) => {
    onCanvasChange({
      ...canvas,
      nodes,
      edges,
      comments: updatedComments || comments,
      updatedAt: new Date().toISOString(),
    });
  }, [canvas, nodes, edges, comments, onCanvasChange]);

  // Auto-save nodes and edges when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only save if there are actual changes (compare by length as a quick check)
      if (nodes.length > 0 || edges.length > 0) {
        onCanvasChange({
          ...canvas,
          nodes,
          edges,
          comments,
          updatedAt: new Date().toISOString(),
        });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [nodes, edges]); // Only trigger on nodes/edges changes, not canvas/comments to avoid loops

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
      const nodePosition = position || { x: 100 + nodes.length * 50, y: 100 + nodes.length * 30 };

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
    const nodePosition = position || { x: 150 + nodes.length * 30, y: 80 + nodes.length * 20 };

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
      const nodePosition = position || { x: 150 + nodes.length * 30, y: 100 + nodes.length * 20 };

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
      const nodePosition = position || { x: 150 + nodes.length * 30, y: 100 + nodes.length * 20 };

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
      const nodePosition = position || { x: 150 + nodes.length * 30, y: 100 + nodes.length * 20 };

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

  // Start presentation
  const handleStartPresentation = useCallback(() => {
    if (presentationEdges.length > 0 || presentationGroups.length > 0) {
      setIsPresenting(true);
    }
  }, [presentationEdges, presentationGroups]);

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

      setNodes((nds) => [...nds, ...newNodes]);
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
          
          const newNodes: AtlasNode[] = filesToCreate.map((file, index) => {
            const label = file.fileName.replace(file.extension, "");
            const isImage = file.extension.match(/^\.(png|jpg|jpeg|gif|webp|avif)$/i);
            const previewImages = isImage && file.previewUrl ? [file.previewUrl] : undefined;
            const dropTimestamp = Date.now();
            
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

          // Deselect other nodes and add new ones
          setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), ...newNodes]);

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

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: "#0a0a0a" }}>
      <AtlasToolbar
        canvasName={canvas.name}
        onBack={onBack}
        onCanvasNameChange={(name) => onCanvasChange({ ...canvas, name })}
        onSaveAsFramework={() => setShowSaveFrameworkDialog(true)}
        onCopyToCanvas={() => {
          setMoveToCanvasMode("copy");
          setShowMoveToCanvasDialog(true);
        }}
        hasSelectedNodes={nodes.some(node => node.selected)}
        hasOtherCanvases={canvases && canvases.length > 1}
        recentCanvases={recentCanvases}
        onSwitchCanvas={onSwitchCanvas}
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
  />

        
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
          setShowSaveFrameworkDialog(true);
        }}
      />

      {/* Save as Framework Dialog */}
      <SaveFrameworkDialog
        open={showSaveFrameworkDialog}
        onClose={() => setShowSaveFrameworkDialog(false)}
        canvas={canvas}
        currentUser={{
          ...workspaceSettings.members[0],
          // Use branding profile picture if available
          avatar: workspaceSettings.branding?.profilePicture || workspaceSettings.members[0].avatar,
        }}
        onSaveFramework={(framework) => {
          if (onSaveFramework) {
            onSaveFramework(framework);
          } else {
            // Default behavior: log framework save (could be extended to persist locally)
            console.log("[v0] Framework saved:", framework.name);
          }
          setShowSaveFrameworkDialog(false);
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
    </div>
  );
}

export function AtlasEditor(props: AtlasEditorProps) {
  return (
    <ReactFlowProvider>
      <AtlasEditorInner {...props} />
    </ReactFlowProvider>
  );
}
