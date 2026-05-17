"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import type { Canvas, CanvasVisibility, WorkspaceSettings, AtlasNode, CanvasFramework, FrameworkCategory, Project } from "@/lib/atlas-types";
import { WorkspaceSettingsDialog } from "./workspace-settings";
import { INITIAL_CANVASES, DEFAULT_WORKSPACE_SETTINGS, PRODUCT_COLORS, SAMPLE_FRAMEWORKS, FRAMEWORK_CATEGORIES, PROJECT_COLORS } from "@/lib/atlas-types";
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, ReactFlowProvider } from "@xyflow/react";
import { FileNode } from "./file-node";
import { CanvasPreview } from "./canvas-preview";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSageConversations, useSageConversation, useSageChatPersistence } from "@/lib/use-sage-conversations";
import "@xyflow/react/dist/style.css";

type SidebarFilter = "all" | "favorites" | "workspace" | "private";
type HomeView = "home" | "canvases" | "favorites" | "community" | "workspace-canvas" | "settings";
type CanvasSubView = "canvases" | "files";

const nodeTypes = { fileNode: FileNode };

interface WorkspaceCanvasViewProps {
  nodes: AtlasNode[];
  groups: { canvasId: string; canvasName: string; startX: number; nodeCount: number }[];
  onOpenCanvas: (canvasId: string) => void;
}

function WorkspaceCanvasView({ nodes, groups, onOpenCanvas }: WorkspaceCanvasViewProps) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  
  return (
    <div className="w-full h-full" style={{ backgroundColor: "#0A0A0A" }}>
      <ReactFlow
        nodes={flowNodes}
        edges={[]}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.3,
          maxZoom: 1,
        }}
        minZoom={0.1}
        maxZoom={4}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a1a" gap={20} />
        <Controls 
          className="!bg-[#1a1a1a] !border-[#2a2a2a] !rounded-lg"
          style={{ button: { backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" } }}
        />
        
        {/* Canvas Group Labels */}
        {groups.map((group) => (
          <div
            key={group.canvasId}
            className="absolute"
            style={{
              left: group.startX,
              top: 0,
              transform: "translateY(-10px)",
              pointerEvents: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => onOpenCanvas(group.canvasId)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: "#ffffff",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            >
              {group.canvasName}
              <span className="ml-2 text-gray-500">({group.nodeCount})</span>
            </button>
          </div>
        ))}
      </ReactFlow>
      
      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="10" height="10" rx="2" stroke="#666666" strokeWidth="2"/>
                <rect x="18" y="4" width="10" height="10" rx="2" stroke="#666666" strokeWidth="2"/>
                <rect x="4" y="18" width="10" height="10" rx="2" stroke="#666666" strokeWidth="2"/>
                <rect x="18" y="18" width="10" height="10" rx="2" stroke="#666666" strokeWidth="2"/>
              </svg>
            </div>
            <p
              className="text-gray-500 text-sm"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              No workspace canvases with files yet
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function UserSection({ profilePicture }: { profilePicture?: string }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="p-3 border-t" style={{ borderColor: "#222222" }}>
        <div className="animate-pulse h-10 bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-3 border-t" style={{ borderColor: "#222222" }}>
        <Link
          href="/auth/login"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: "#F0FE00", color: "#121212", fontFamily: "system-ui, Inter, sans-serif" }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="p-3 border-t" style={{ borderColor: "#222222" }}>
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden"
          style={{ backgroundColor: "#F0FE00", color: "#121212" }}
        >
          {profilePicture ? (
            <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            user.email?.charAt(0).toUpperCase() || "U"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {user.user_metadata?.display_name || user.email?.split("@")[0]}
          </div>
          <div className="text-xs text-gray-500 truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {user.email}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/auth/login");
          }}
          className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          title="Sign out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface HomePageProps {
  onOpenCanvas: (canvasId: string) => void;
  workspaceSettings: WorkspaceSettings;
  onWorkspaceSettingsChange: (settings: WorkspaceSettings) => void;
  canvases: Canvas[];
  onCanvasesChange: (canvases: Canvas[]) => void;
  frameworks?: CanvasFramework[];
  onFrameworksChange?: (frameworks: CanvasFramework[]) => void;
  onRemoveFramework?: (frameworkId: string) => void;
}

export function HomePage({ onOpenCanvas, workspaceSettings, onWorkspaceSettingsChange, canvases, onCanvasesChange, frameworks: externalFrameworks, onFrameworksChange, onRemoveFramework }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");
  const [activeView, setActiveView] = useState<HomeView>("home");
  const [canvasSubView, setCanvasSubView] = useState<CanvasSubView>("canvases");
  const [showNewCanvasDialog, setShowNewCanvasDialog] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState("");
  const [newCanvasVisibility, setNewCanvasVisibility] = useState<CanvasVisibility>("workspace");
  const [newCanvasProjectId, setNewCanvasProjectId] = useState<string | undefined>(undefined);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedFilesProjects, setExpandedFilesProjects] = useState<Set<string>>(new Set());
  const [expandedFilesCanvases, setExpandedFilesCanvases] = useState<Set<string>>(new Set());
const [showSageChat, setShowSageChat] = useState(false);
  const [sageInput, setSageInput] = useState("");
  const [showChatHistory, setShowChatHistory] = useState(false);
  
  // Sage conversation persistence
  const { currentConversationId, setCurrentConversationId } = useSageChatPersistence("home");
  const { conversations, createConversation, deleteConversation, refresh: refreshConversations } = useSageConversations();
  const { messages: loadedMessages, saveMessages } = useSageConversation(currentConversationId);
  const lastSavedMessageCount = useRef(0);
  
  // Sage AI Chat
  const { messages: sageMessages, sendMessage: sendSageMessage, status: sageStatus, setMessages } = useChat({
    id: currentConversationId || "home-sage-chat",
    transport: new DefaultChatTransport({ api: "/api/sage" }),
  });
  
  // Load messages when conversation changes
  useEffect(() => {
    if (loadedMessages.length > 0 && currentConversationId) {
      // Convert loaded messages to useChat format
      const formattedMessages = loadedMessages.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        parts: msg.parts || [{ type: "text" as const, text: msg.content }],
      }));
      setMessages(formattedMessages);
      lastSavedMessageCount.current = loadedMessages.length;
    }
  }, [loadedMessages, currentConversationId, setMessages]);
  
  // Save messages when they change
  useEffect(() => {
    if (sageMessages.length > lastSavedMessageCount.current && currentConversationId && sageStatus === "ready") {
      const newMessages = sageMessages.slice(lastSavedMessageCount.current);
      if (newMessages.length > 0) {
        saveMessages(newMessages.map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : "",
          parts: m.parts,
        })));
        lastSavedMessageCount.current = sageMessages.length;
        refreshConversations();
      }
    }
  }, [sageMessages, currentConversationId, sageStatus, saveMessages, refreshConversations]);
  
  const handleSageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sageInput.trim() || sageStatus === "streaming") return;
    
    // Create conversation if this is the first message
    if (!currentConversationId) {
      const conv = await createConversation(sageInput.substring(0, 50));
      if (conv) {
        setCurrentConversationId(conv.id);
      }
    }
    
    sendSageMessage({ text: sageInput });
    setSageInput("");
  };
  
  const handleNewChat = async () => {
    const conv = await createConversation();
    if (conv) {
      setCurrentConversationId(conv.id);
      setMessages([]);
      lastSavedMessageCount.current = 0;
    }
  };
  
  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    lastSavedMessageCount.current = 0;
    setShowChatHistory(false);
  };
  
  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setMessages([]);
      lastSavedMessageCount.current = 0;
    }
  };
  
  // Track processed tool call IDs to avoid duplicate processing
  const processedToolCalls = useRef<Set<string>>(new Set());
  
  // Watch for tool calls in messages
  useEffect(() => {
    // Check ALL messages for tool calls, not just the last one
    for (const message of sageMessages) {
      if (message.role !== "assistant") continue;
      
      // Check for tool calls in parts
      const toolParts = message.parts?.filter(
        (part): part is { type: "tool-invocation"; toolInvocation: { toolName: string; toolCallId: string; result?: unknown; state?: string } } => 
          part.type === "tool-invocation"
      ) || [];
      
      for (const part of toolParts) {
        const toolCallId = part.toolInvocation?.toolCallId;
        const state = part.toolInvocation?.state;
        
        // Only process completed tool calls that haven't been processed yet
        if (!toolCallId || state !== "output-available" || processedToolCalls.current.has(toolCallId)) {
          continue;
        }
        
        const result = part.toolInvocation?.result as Record<string, unknown> | undefined;
        if (!result) continue;
        
        processedToolCalls.current.add(toolCallId);
        
        if (result.action === "createNewCanvas" && result.canvasId) {
          // Create the canvas
          const canvasId = result.canvasId as string;
          const newCanvas: Canvas = {
            id: canvasId,
            name: (result.name as string) || "New Canvas",
            description: (result.description as string) || "",
            nodes: (result.initialNodes as Canvas["nodes"]) || [],
            edges: [],
            visibility: "workspace",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          onCanvasesChange([...canvases, newCanvas]);
          
          // Automatically open the canvas after creation
          setTimeout(() => {
            setShowSageChat(false);
            onOpenCanvas(canvasId);
          }, 300);
        } else if (result.action === "openCanvas" && result.navigateTo) {
          const navigateTo = result.navigateTo as string;
          
          if (navigateTo.startsWith("search:")) {
            // Search for canvas by name
            const searchName = navigateTo.slice(7).toLowerCase();
            const found = canvases.find(c => c.name.toLowerCase().includes(searchName));
            if (found) {
              setShowSageChat(false);
              onOpenCanvas(found.id);
            }
          } else {
            // Direct canvas ID
            setShowSageChat(false);
            onOpenCanvas(navigateTo);
          }
        }
      }
    }
  }, [sageMessages, canvases, onCanvasesChange, onOpenCanvas]);
  
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  // Use external frameworks if provided, otherwise use local state
  const [localFrameworks, setLocalFrameworks] = useState<CanvasFramework[]>(SAMPLE_FRAMEWORKS);
  const frameworks = externalFrameworks ?? localFrameworks;
  const setFrameworks = onFrameworksChange ?? setLocalFrameworks;
  const [selectedCategory, setSelectedCategory] = useState<FrameworkCategory | "all">("all");
  const [viewingFramework, setViewingFramework] = useState<CanvasFramework | null>(null);
  const [selectedRibbonDay, setSelectedRibbonDay] = useState<number>(17); // Today is index 17
  const [ribbonViewMode, setRibbonViewMode] = useState<"ribbon" | "calendar">("ribbon");
  const currentUserId = workspaceSettings.members[0]?.id || "user-1";

  // Combine all workspace nodes with canvas grouping
  const workspaceNodesData = useMemo(() => {
    const workspaceCanvases = canvases.filter(c => c.visibility === "workspace");
    const allNodes: AtlasNode[] = [];
    const canvasGroups: { canvasId: string; canvasName: string; startX: number; nodeCount: number }[] = [];
    
    let currentX = 0;
    const groupSpacing = 400;
    const nodeSpacing = 280;
    
    workspaceCanvases.forEach((canvas) => {
      if (canvas.nodes.length === 0) return;
      
      const startX = currentX;
      canvasGroups.push({
        canvasId: canvas.id,
        canvasName: canvas.name,
        startX,
        nodeCount: canvas.nodes.length,
      });
      
      canvas.nodes.forEach((node, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        allNodes.push({
          ...node,
          id: `${canvas.id}-${node.id}`,
          position: {
            x: startX + col * nodeSpacing,
            y: row * 260 + 60,
          },
          data: {
            ...node.data,
            canvasName: canvas.name,
          },
        });
      });
      
      const rows = Math.ceil(canvas.nodes.length / 3);
      currentX += Math.min(canvas.nodes.length, 3) * nodeSpacing + groupSpacing;
    });
    
    return { nodes: allNodes, groups: canvasGroups };
  }, [canvases]);

  const recentCanvases = useMemo(() => {
    return [...canvases]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [canvases]);

  const favoriteCanvases = useMemo(() => {
    return canvases.filter((c) => c.isFavorite);
  }, [canvases]);

  const filteredCanvases = useMemo(() => {
    let filtered = canvases;

    // Apply view/sidebar filter
    if (activeView === "favorites" || sidebarFilter === "favorites") {
      filtered = filtered.filter((c) => c.isFavorite);
    } else if (sidebarFilter === "workspace") {
      filtered = filtered.filter((c) => c.visibility === "workspace");
    } else if (sidebarFilter === "private") {
      filtered = filtered.filter((c) => c.visibility === "private");
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [canvases, sidebarFilter, searchQuery, activeView]);

  const handleCreateCanvas = () => {
    if (!newCanvasName.trim()) return;

    const newCanvas: Canvas = {
      id: `canvas-${Date.now()}`,
      name: newCanvasName.trim(),
      projectId: newCanvasProjectId,
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: workspaceSettings.members[0],
      isFavorite: false,
      visibility: newCanvasVisibility,
    };

    onCanvasesChange([...canvases, newCanvas]);
    setShowNewCanvasDialog(false);
    setNewCanvasName("");
    setNewCanvasProjectId(undefined);
    onOpenCanvas(newCanvas.id);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: newProjectName.trim(),
      color: newProjectColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: workspaceSettings.members[0],
      isExpanded: true,
    };

    setProjects([...projects, newProject]);
    setShowNewProjectDialog(false);
    setNewProjectName("");
    setNewProjectColor(PROJECT_COLORS[0]);
  };

  const toggleProjectExpanded = (projectId: string) => {
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p
    ));
  };

  const getProjectCanvases = (projectId: string) => {
    return canvases.filter(c => c.projectId === projectId);
  };

  const getUngroupedCanvases = () => {
    return canvases.filter(c => !c.projectId);
  };

  const toggleFilesProjectExpanded = (projectId: string) => {
    setExpandedFilesProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const toggleFilesCanvasExpanded = (canvasId: string) => {
    setExpandedFilesCanvases(prev => {
      const next = new Set(prev);
      if (next.has(canvasId)) {
        next.delete(canvasId);
      } else {
        next.add(canvasId);
      }
      return next;
    });
  };

  const getCanvasFiles = (canvas: Canvas) => {
    return canvas.nodes.filter(node => node.type === "file");
  };

  const toggleFavorite = (canvasId: string) => {
    onCanvasesChange(
      canvases.map((c) =>
        c.id === canvasId ? { ...c, isFavorite: !c.isFavorite } : c
      )
    );
  };

  const [canvasToDelete, setCanvasToDelete] = useState<string | null>(null);
  
const deleteCanvas = (canvasId: string) => {
    onCanvasesChange(canvases.filter((c) => c.id !== canvasId));
    setCanvasToDelete(null);
  };

  const handleUpvoteFramework = (frameworkId: string) => {
    setFrameworks(prev => prev.map(f => {
      if (f.id !== frameworkId) return f;
      const hasUpvoted = f.upvotedBy.includes(currentUserId);
      return {
        ...f,
        upvotes: hasUpvoted ? f.upvotes - 1 : f.upvotes + 1,
        upvotedBy: hasUpvoted 
          ? f.upvotedBy.filter(id => id !== currentUserId)
          : [...f.upvotedBy, currentUserId],
      };
    }));
  };

  const handleOpenFramework = (framework: CanvasFramework) => {
    setViewingFramework(framework);
  };

  const handleDuplicateFramework = (framework: CanvasFramework) => {
    // Create a new canvas from the framework
    const newCanvas: Canvas = {
      id: `canvas-${Date.now()}`,
      name: `${framework.name} (Copy)`,
      description: framework.description,
      previewImage: framework.previewImage,
      nodes: framework.nodes,
      edges: framework.edges,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: workspaceSettings.members[0],
      isFavorite: false,
      visibility: "workspace",
    };
    onCanvasesChange([...canvases, newCanvas]);
    // Increment download count
    setFrameworks(prev => prev.map(f => 
      f.id === framework.id ? { ...f, downloads: f.downloads + 1 } : f
    ));
    setViewingFramework(null);
    onOpenCanvas(newCanvas.id);
  };

  // Community page only shows frameworks with visibility: "community"
  const filteredFrameworks = useMemo(() => {
    console.log("[v0] filteredFrameworks - total frameworks:", frameworks.length, "with visibility:", frameworks.map(f => ({ name: f.name, visibility: f.visibility })));
    return frameworks.filter(f => {
      // Only show community-visible frameworks in the Community page
      if (f.visibility !== "community") return false;
      if (selectedCategory !== "all" && f.category !== selectedCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return f.name.toLowerCase().includes(query) || 
               f.description.toLowerCase().includes(query) ||
               f.tags.some(tag => tag.includes(query));
      }
      return true;
    }).sort((a, b) => b.upvotes - a.upvotes);
  }, [frameworks, selectedCategory, searchQuery]);
  
  // Private frameworks (visibility: "private") - only visible to the creator
  const privateFrameworks = useMemo(() => {
    return frameworks.filter(f => f.visibility === "private");
  }, [frameworks]);
  
  // Workspace frameworks (visibility: "workspace") - visible to team members
  const workspaceFrameworks = useMemo(() => {
    return frameworks.filter(f => f.visibility === "workspace");
  }, [frameworks]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Sidebar */}
      <div
        className="w-64 flex flex-col border-r"
        style={{ backgroundColor: "#111111", borderColor: "#222222" }}
      >
        {/* Workspace Header */}
        <div className="p-4 border-b" style={{ borderColor: "#222222" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold overflow-hidden"
              style={{ backgroundColor: workspaceSettings.branding?.workspaceIcon ? "transparent" : "#F0FE00", color: "#121212" }}
            >
              {workspaceSettings.branding?.workspaceIcon ? (
                <img
                  src={workspaceSettings.branding.workspaceIcon}
                  alt={workspaceSettings.name}
                  className="max-w-full max-h-full object-contain p-0.5"
                />
              ) : (
                workspaceSettings.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-medium text-white truncate"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {workspaceSettings.name}
              </div>
              <div
                className="text-xs text-gray-500"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {workspaceSettings.members.length} Member{workspaceSettings.members.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Main Nav */}
          <nav className="space-y-1 mb-6">
            <button
              type="button"
              onClick={() => setActiveView("home")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "home" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.25 6.75L9 2.25L15.75 6.75V14.25C15.75 14.6478 15.592 15.0294 15.3107 15.3107C15.0294 15.592 14.6478 15.75 14.25 15.75H3.75C3.35218 15.75 2.97064 15.592 2.68934 15.3107C2.40804 15.0294 2.25 14.6478 2.25 14.25V6.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.75 15.75V9H11.25V15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Home
            </button>
            <button
              type="button"
              onClick={() => { setSidebarFilter("all"); setActiveView("canvases"); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "canvases" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="10" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="2" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="10" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              All Canvases
            </button>
            <button
              type="button"
              onClick={() => { setSidebarFilter("favorites"); setActiveView("favorites"); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "favorites" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2L11.09 6.26L16 6.97L12.5 10.34L13.18 15.25L9 13.05L4.82 15.25L5.5 10.34L2 6.97L6.91 6.26L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Favorites
            </button>
            <button
              type="button"
              onClick={() => setActiveView("community")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "community" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="14" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 9C11.5 9 13 10.5 13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 9C6.5 9 5 10.5 5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Community
            </button>
            <button
              type="button"
              onClick={() => setActiveView("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "settings" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.55 11.25C14.4333 11.5166 14.3979 11.8123 14.4482 12.0992C14.4985 12.3861 14.6323 12.6517 14.8333 12.8625L14.8875 12.9167C15.0489 13.078 15.1768 13.2696 15.2641 13.4804C15.3514 13.6912 15.3964 13.917 15.3964 14.1451C15.3964 14.3731 15.3514 14.5989 15.2641 14.8097C15.1768 15.0205 15.0489 15.2122 14.8875 15.3735C14.7262 15.5349 14.5345 15.6628 14.3237 15.7501C14.1129 15.8374 13.8871 15.8824 13.6591 15.8824C13.431 15.8824 13.2052 15.8374 12.9944 15.7501C12.7836 15.6628 12.5919 15.5349 12.4306 15.3735L12.3764 15.3193C12.1656 15.1183 11.9 14.9846 11.6131 14.9343C11.3262 14.884 11.0305 14.9194 10.764 15.036C10.5028 15.1469 10.2813 15.3324 10.1267 15.5696C9.97213 15.8068 9.89122 16.0849 9.89396 16.3685V16.5C9.89396 16.9602 9.71117 17.4016 9.38611 17.7267C9.06104 18.0517 8.61962 18.2345 8.15943 18.2345C7.69923 18.2345 7.25781 18.0517 6.93275 17.7267C6.60768 17.4016 6.4249 16.9602 6.4249 16.5V16.431C6.41718 16.1399 6.32742 15.8569 6.16609 15.6174C6.00476 15.3779 5.77869 15.1919 5.51358 15.0819C5.24708 14.9653 4.95139 14.9299 4.66449 14.9802C4.3776 15.0305 4.11196 15.1642 3.90115 15.3652L3.84694 15.4194C3.68563 15.5808 3.49396 15.7087 3.28317 15.796C3.07238 15.8833 2.84656 15.9283 2.61854 15.9283C2.39052 15.9283 2.1647 15.8833 1.95391 15.796C1.74312 15.7087 1.55145 15.5808 1.39014 15.4194C1.22873 15.2581 1.10087 15.0665 1.01356 14.8557C0.926249 14.6449 0.881272 14.4191 0.881272 14.191C0.881272 13.963 0.926249 13.7372 1.01356 13.5264C1.10087 13.3156 1.22873 13.1239 1.39014 12.9626L1.44435 12.9084C1.64533 12.6976 1.77908 12.432 1.82936 12.1451C1.87965 11.8582 1.84422 11.5625 1.72762 11.296C1.61668 11.0348 1.43116 10.8133 1.19399 10.6587C0.956815 10.5041 0.678688 10.4232 0.395077 10.426H0.263687C-0.196508 10.426 -0.637924 10.2432 -0.962992 9.91813C-1.28806 9.59307 -1.47084 9.15165 -1.47084 8.69145C-1.47084 8.23126 -1.28806 7.78984 -0.962992 7.46478C-0.637924 7.13971 -0.196508 6.95693 0.263687 6.95693H0.332774C0.623912 6.94921 0.906917 6.85945 1.14641 6.69812C1.38591 6.53679 1.57192 6.31072 1.68192 6.04561C1.79852 5.77911 1.83395 5.48342 1.78366 5.19652C1.73338 4.90963 1.59963 4.64399 1.39865 4.43318L1.34444 4.37897C1.18303 4.21766 1.05517 4.02599 0.967863 3.8152C0.880553 3.60441 0.835576 3.37859 0.835576 3.15057C0.835576 2.92255 0.880553 2.69673 0.967863 2.48594C1.05517 2.27515 1.18303 2.08348 1.34444 1.92217C1.50575 1.76076 1.69742 1.6329 1.90821 1.54559C2.119 1.45828 2.34482 1.4133 2.57284 1.4133C2.80086 1.4133 3.02668 1.45828 3.23747 1.54559C3.44826 1.6329 3.63993 1.76076 3.80124 1.92217L3.85545 1.97638C4.06626 2.17736 4.3319 2.31111 4.61879 2.36139C4.90569 2.41168 5.20138 2.37625 5.46788 2.25965H5.51358C5.7748 2.14871 5.99631 1.9632 6.15093 1.72602C6.30555 1.48885 6.38646 1.21072 6.38372 0.927114V0.795724C6.38372 0.335528 6.5665 -0.105888 6.89157 -0.430956C7.21664 -0.756024 7.65806 -0.938805 8.11825 -0.938805C8.57845 -0.938805 9.01987 -0.756024 9.34493 -0.430956C9.67 -0.105888 9.85278 0.335528 9.85278 0.795724V0.864811C9.85004 1.14842 9.93095 1.42655 10.0856 1.66372C10.2402 1.9009 10.4617 2.08641 10.7229 2.19735C10.9894 2.31395 11.2851 2.34938 11.572 2.29909C11.8589 2.24881 12.1245 2.11506 12.3353 1.91408L12.3895 1.85987C12.5508 1.69846 12.7425 1.5706 12.9533 1.48329C13.1641 1.39598 13.3899 1.351 13.6179 1.351C13.846 1.351 14.0718 1.39598 14.2826 1.48329C14.4934 1.5706 14.685 1.69846 14.8463 1.85987C15.0077 2.02118 15.1356 2.21285 15.2229 2.42364C15.3102 2.63443 15.3552 2.86025 15.3552 3.08827C15.3552 3.31629 15.3102 3.54211 15.2229 3.7529C15.1356 3.96369 15.0077 4.15536 14.8463 4.31667L14.7921 4.37088C14.5911 4.58169 14.4574 4.84733 14.4071 5.13422C14.3568 5.42112 14.3923 5.71681 14.5088 5.98331V6.02901C14.6198 6.29023 14.8053 6.51174 15.0425 6.66636C15.2796 6.82098 15.5578 6.90189 15.8414 6.89915H15.9728C16.433 6.89915 16.8744 7.08193 17.1994 7.407C17.5245 7.73207 17.7073 8.17349 17.7073 8.63368C17.7073 9.09388 17.5245 9.5353 17.1994 9.86036C16.8744 10.1854 16.433 10.3682 15.9728 10.3682H15.9037C15.6201 10.3655 15.3419 10.4464 15.1048 10.601C14.8676 10.7556 14.6821 10.9771 14.5712 11.2383C14.4546 11.5048 14.4191 11.8005 14.4694 12.0874C14.5197 12.3743 14.6535 12.6399 14.8544 12.8507L14.9086 12.9049C15.07 13.0662 15.1979 13.2579 15.2852 13.4687C15.3725 13.6795 15.4175 13.9053 15.4175 14.1333C15.4175 14.3614 15.3725 14.5872 15.2852 14.798C15.1979 15.0087 15.07 15.2004 14.9086 15.3617C14.7473 15.5231 14.5556 15.651 14.3448 15.7383C14.134 15.8256 13.9082 15.8706 13.6802 15.8706C13.4522 15.8706 13.2263 15.8256 13.0156 15.7383C12.8048 15.651 12.6131 15.5231 12.4518 15.3617L12.3976 15.3075C12.1868 15.1065 11.9211 14.9728 11.6342 14.9225C11.3473 14.8722 11.0516 14.9076 10.7851 15.0242H10.7394C10.4782 15.1352 10.2567 15.3207 10.1021 15.5579C9.94746 15.7951 9.86655 16.0732 9.86929 16.3568V16.4882C9.86929 16.9484 9.68651 17.3898 9.36144 17.7149C9.03637 18.0399 8.59496 18.2227 8.13476 18.2227C7.67457 18.2227 7.23315 18.0399 6.90808 17.7149C6.58301 17.3898 6.40023 16.9484 6.40023 16.4882V16.419C6.39749 16.1354 6.31658 15.8573 6.16196 15.6201C6.00734 15.383 5.78583 15.1975 5.52461 15.0865C5.25811 14.9699 4.96242 14.9345 4.67553 14.9848C4.38863 15.0351 4.12299 15.1688 3.91218 15.3698L3.85797 15.424C3.69666 15.5854 3.50499 15.7133 3.2942 15.8006C3.08341 15.8879 2.85759 15.9329 2.62957 15.9329C2.40155 15.9329 2.17573 15.8879 1.96494 15.8006C1.75415 15.7133 1.56248 15.5854 1.40117 15.424C1.23976 15.2627 1.1119 15.071 1.02459 14.8602C0.937282 14.6494 0.892305 14.4236 0.892305 14.1956C0.892305 13.9676 0.937282 13.7417 1.02459 13.531C1.1119 13.3202 1.23976 13.1285 1.40117 12.9672L1.45538 12.913C1.65636 12.7022 1.79011 12.4365 1.84039 12.1496C1.89068 11.8627 1.85525 11.567 1.73865 11.3005V11.2548C1.62771 10.9936 1.44219 10.7721 1.20502 10.6175C0.967845 10.4629 0.689718 10.382 0.406107 10.3847H0.27472C-0.185476 10.3847 -0.626892 10.2019 -0.951959 9.87686C-1.27703 9.5518 -1.45981 9.11038 -1.45981 8.65018C-1.45981 8.18999 -1.27703 7.74857 -0.951959 7.4235C-0.626892 7.09843 -0.185476 6.91565 0.27472 6.91565H0.343807C0.627418 6.91839 0.905545 6.83748 1.14272 6.68286C1.37989 6.52824 1.5654 6.30673 1.67635 6.04551" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Settings
            </button>
          </nav>

          {/* My Frameworks Section - Shows private and workspace frameworks */}
          {(privateFrameworks.length > 0 || workspaceFrameworks.length > 0) && (
            <div className="mb-6">
              <div
                className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                My Frameworks
              </div>
              <div className="space-y-1">
                {privateFrameworks.map((framework) => (
                  <div
                    key={framework.id}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors truncate"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="5" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4 5V3.5C4 2.11929 5.11929 1 6.5 1H7.5C8.88071 1 10 2.11929 10 3.5V5" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <span className="truncate">{framework.name}</span>
                  </div>
                ))}
                {workspaceFrameworks.map((framework) => (
                  <div
                    key={framework.id}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors truncate"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="9" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 12C2 10.3431 3.34315 9 5 9C6.65685 9 8 10.3431 8 12" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6 12C6 10.3431 7.34315 9 9 9C10.6569 9 12 10.3431 12 12" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <span className="truncate">{framework.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favorites Section */}
          {favoriteCanvases.length > 0 && (
            <div className="mb-6">
              <div
                className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Favorites
              </div>
              <div className="space-y-1">
                {favoriteCanvases.map((canvas) => (
                  <button
                    key={canvas.id}
                    type="button"
                    onClick={() => onOpenCanvas(canvas.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors truncate"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span className="truncate">{canvas.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects Section */}
          {projects.length > 0 && (
            <div className="mb-6">
              <div
                className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Projects
              </div>
              <div className="space-y-1">
                {projects.map((project) => (
                  <div key={project.id}>
                    <button
                      type="button"
                      onClick={() => toggleProjectExpanded(project.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <svg 
                        width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform ${project.isExpanded ? "rotate-90" : ""}`}
                      >
                        <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="truncate flex-1 text-left">{project.name}</span>
                      <span className="text-xs text-gray-600">{getProjectCanvases(project.id).length}</span>
                    </button>
                    {project.isExpanded && (
                      <div className="ml-4 space-y-0.5">
                        {getProjectCanvases(project.id).map((canvas) => (
                          <button
                            key={canvas.id}
                            type="button"
                            onClick={() => onOpenCanvas(canvas.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-colors truncate"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            <span className="truncate">{canvas.name}</span>
                          </button>
                        ))}
                        {getProjectCanvases(project.id).length === 0 && (
                          <div className="px-3 py-1.5 text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                            No canvases
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Canvases */}
          <div className="mb-6">
            <div
              className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              Recent Canvases
            </div>
            <div className="space-y-1">
              {recentCanvases.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  No canvases yet
                </div>
              ) : (
                recentCanvases.map((canvas) => (
                  <button
                    key={canvas.id}
                    type="button"
                    onClick={() => onOpenCanvas(canvas.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors truncate"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span className="truncate">{canvas.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Workspace / Private filters */}
          <div className="mb-6">
            <div
              className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              Workspace
            </div>
            <button
              type="button"
              onClick={() => { setSidebarFilter("workspace"); setActiveView("workspace-canvas"); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "workspace-canvas" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <ellipse cx="9" cy="9" rx="3" ry="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 9H16" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3.5 5H14.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3.5 13H14.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              All Workspace
            </button>
          </div>

          <div>
            <div
              className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              Private
            </div>
            <button
              type="button"
              onClick={() => setSidebarFilter("private")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                sidebarFilter === "private" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 8V5C6 3.34315 7.34315 2 9 2C10.6569 2 12 3.34315 12 5V8" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              All Private
            </button>
          </div>
        </div>

        {/* User Section */}
        <UserSection profilePicture={workspaceSettings.branding?.profilePicture} />
        
        {/* Bottom actions */}
        <div className="p-3 border-t" style={{ borderColor: "#222222" }}>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 9.75H9.75V15H8.25V9.75H3V8.25H8.25V3H9.75V8.25H15V9.75Z" fill="currentColor"/>
              </svg>
            </button>
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 6V9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="12" r="0.75" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#222222" }}
        >
          <div
            className="text-lg font-medium text-white"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            {activeView === "home" && "Home"}
            {activeView === "canvases" && "All Canvases"}
            {activeView === "favorites" && "Favorites"}
            {activeView === "community" && "Community"}
            {activeView === "workspace-canvas" && "All Workspace"}
            {activeView === "settings" && "Settings"}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333333",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              />
            </div>

            {/* Member count */}
            <button
              type="button"
              onClick={() => setShowSettingsDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 14C2 11.2386 4.68629 9 8 9C11.3137 9 14 11.2386 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {workspaceSettings.members.length}
            </button>

            {/* Invite */}
            <button
              type="button"
              onClick={() => setShowSettingsDialog(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:bg-white/10"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333333",
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            >
              Invite
            </button>

            {/* Create New Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[#121212] transition-colors hover:opacity-90"
                style={{ backgroundColor: "#F0FE00" }}
                title="Create new"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Create Dropdown */}
              {showCreateMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowCreateMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-2 py-2 rounded-xl shadow-xl z-50 min-w-[200px]"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        setShowNewProjectDialog(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "#252525" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 4.5C2 3.67157 2.67157 3 3.5 3H5.5L7 5H12.5C13.3284 5 14 5.67157 14 6.5V11.5C14 12.3284 13.3284 13 12.5 13H3.5C2.67157 13 2 12.3284 2 11.5V4.5Z" stroke="#F0FE00" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">New Project</div>
                        <div className="text-xs text-gray-500">Group canvases together</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        setShowNewCanvasDialog(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "#252525" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="2" y="2" width="12" height="12" rx="2" stroke="#3B82F6" strokeWidth="1.5"/>
                          <path d="M5.5 8H10.5M8 5.5V10.5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">New Canvas</div>
                        <div className="text-xs text-gray-500">Create a blank canvas</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {activeView === "community" ? (
          /* Community Frameworks View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Category Filter Bar */}
            <div className="px-6 py-4 flex items-center gap-3 overflow-x-auto" style={{ borderBottom: "1px solid #222222" }}>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === "all" 
                    ? "text-[#0a0a0a]" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                style={{
                  backgroundColor: selectedCategory === "all" ? "#F0FE00" : "#1a1a1a",
                  border: `1px solid ${selectedCategory === "all" ? "#F0FE00" : "#333333"}`,
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
All Frameworks
                </button>
                {(Object.keys(FRAMEWORK_CATEGORIES) as FrameworkCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat 
                      ? "text-[#0a0a0a]" 
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                  style={{
                    backgroundColor: selectedCategory === cat ? "#F0FE00" : "#1a1a1a",
                    border: `1px solid ${selectedCategory === cat ? "#F0FE00" : "#333333"}`,
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
                >
                  {FRAMEWORK_CATEGORIES[cat].label}
                </button>
              ))}
            </div>

{/* Frameworks Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                  {filteredFrameworks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div
                    className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                  >
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="4" y="4" width="20" height="20" rx="3" stroke="#666666" strokeWidth="2"/>
                      <path d="M10 14H18M14 10V18" stroke="#666666" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    No frameworks found
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredFrameworks.map((framework) => {
                    const hasUpvoted = framework.upvotedBy.includes(currentUserId);
                    return (
                      <div
                        key={framework.id}
                        className="group rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: "#141414", border: "1px solid #222222" }}
                      >
                        {/* Preview */}
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <CanvasPreview nodes={framework.nodes} />
                          {/* Category Badge */}
                          <div
                            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: "rgba(0,0,0,0.7)", 
                              color: "#F0FE00",
                              fontFamily: "system-ui, Inter, sans-serif",
                            }}
                          >
                            {FRAMEWORK_CATEGORIES[framework.category].label}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h3
                            className="text-white font-semibold text-base mb-1 truncate"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
{framework.name}
                          </h3>
                          <p
                            className="text-gray-400 text-sm line-clamp-2"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            {framework.description}
                          </p>

                          {/* Creator */}
                          <div className="flex items-center gap-2 mb-3">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden"
                              style={{ backgroundColor: "#E2FF66" }}
                            >
                              {framework.createdBy.avatar ? (
                                <img
                                  src={framework.createdBy.avatar}
                                  alt={framework.createdBy.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-medium" style={{ color: "#121212" }}>
                                  {framework.createdBy.initials}
                                </span>
                              )}
                            </div>
                            <span
                              className="text-sm text-gray-400"
                              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              {framework.createdBy.name}
                            </span>
                          </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {framework.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded text-xs"
                                style={{
                                  backgroundColor: "#252525",
                                  color: "#888888",
                                  fontFamily: "system-ui, Inter, sans-serif",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center justify-between gap-4 mt-3">
                            <div className="flex items-center gap-4">
                              {/* Upvote Button */}
                              <button
                                type="button"
                                onClick={() => handleUpvoteFramework(framework.id)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                                  hasUpvoted 
                                    ? "text-[#F0FE00]" 
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                                style={{
                                  backgroundColor: hasUpvoted ? "rgba(240, 254, 0, 0.1)" : "transparent",
                                  fontFamily: "system-ui, Inter, sans-serif",
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path
                                    d="M8 3L10 7H14L11 10L12 14L8 11.5L4 14L5 10L2 7H6L8 3Z"
                                    fill={hasUpvoted ? "currentColor" : "none"}
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                {framework.upvotes}
                              </button>

                              {/* Downloads */}
                              <div
                                className="flex items-center gap-1.5 text-sm text-gray-500"
                                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                              >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M7 2V9M7 9L4 6M7 9L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M2 11H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                {framework.downloads}
                              </div>
                            </div>

{/* Actions */}
                            <div className="flex items-center gap-2 ml-auto">
                              {/* Delete Button - only show for user's own frameworks */}
                              {framework.createdBy.id === currentUserId && onRemoveFramework && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveFramework(framework.id)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                  title="Remove framework"
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 4H14M5.5 4V2.5C5.5 2.22386 5.72386 2 6 2H10C10.2761 2 10.5 2.22386 10.5 2.5V4M12.5 4V13.5C12.5 13.7761 12.2761 14 12 14H4C3.72386 14 3.5 13.7761 3.5 13.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              )}
                              {/* Open Framework Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenFramework(framework)}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#0a0a0a] transition-colors hover:opacity-90"
                                style={{
                                  backgroundColor: "#F0FE00",
                                  fontFamily: "system-ui, Inter, sans-serif",
                                }}
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeView === "workspace-canvas" ? (
          /* Workspace Canvas View - All nodes from all workspace canvases */
          <div className="flex-1 relative">
            <ReactFlowProvider>
              <WorkspaceCanvasView 
                nodes={workspaceNodesData.nodes}
                groups={workspaceNodesData.groups}
                onOpenCanvas={onOpenCanvas}
              />
            </ReactFlowProvider>
          </div>
        ) : activeView === "settings" ? (
          /* All Settings View - Single Page */
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl space-y-8">
              {/* Page Header */}
              <div>
                <h2 className="text-white font-semibold text-xl" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Workspace Settings
                </h2>
                <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Manage your workspace branding, team, and preferences
                </p>
              </div>

              {/* Workspace Details */}
              <div className="rounded-xl p-5" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
                <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                    <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  Workspace Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Name</label>
                    <input
                      type="text"
                      value={workspaceSettings.name}
                      onChange={(e) => onSettingsChange({ ...workspaceSettings, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>ID</label>
                    <div className="px-3 py-2 rounded-lg text-sm text-gray-500" style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "monospace" }}>
                      {workspaceSettings.id}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Description</label>
                    <textarea
                      value={workspaceSettings.description || ""}
                      onChange={(e) => onSettingsChange({ ...workspaceSettings, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                    />
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="rounded-xl p-5" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
                <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
                    <path d="M14 10L11 7L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Branding
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {/* Workspace Icon */}
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center overflow-hidden mb-2" style={{ backgroundColor: "#1a1a1a", border: "1px dashed #333333" }}>
                      {workspaceSettings.branding?.workspaceIcon ? (
                        <img src={workspaceSettings.branding.workspaceIcon} alt="Icon" className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <span className="text-xl font-bold" style={{ color: "#F0FE00" }}>{workspaceSettings.name.charAt(0)}</span>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-white/10" style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", color: "#ffffff" }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.3334 5.33333L8.00002 2L4.66669 5.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 2V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Icon
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const { upload } = await import("@vercel/blob/client"); const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload/client" }); onWorkspaceSettingsChange({ ...workspaceSettings, branding: { ...workspaceSettings.branding, workspaceIcon: blob.url } }); } catch (error) { console.error("Upload failed:", error); } }} />
                    </label>
                    <div className="text-[10px] text-gray-500 mt-1">Square</div>
                  </div>
                  {/* Wordmark */}
                  <div className="text-center">
                    <div className="w-32 h-16 mx-auto rounded-xl flex items-center justify-center overflow-hidden mb-2" style={{ backgroundColor: "#1a1a1a", border: "1px dashed #333333" }}>
                      {workspaceSettings.branding?.wordmark ? (
                        <img src={workspaceSettings.branding.wordmark} alt="Wordmark" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-500">No wordmark</span>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-white/10" style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", color: "#ffffff" }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.3334 5.33333L8.00002 2L4.66669 5.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 2V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Wordmark
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const { upload } = await import("@vercel/blob/client"); const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload/client" }); onWorkspaceSettingsChange({ ...workspaceSettings, branding: { ...workspaceSettings.branding, wordmark: blob.url } }); } catch (error) { console.error("Upload failed:", error); } }} />
                    </label>
                    <div className="text-[10px] text-gray-500 mt-1">Horizontal</div>
                  </div>
                  {/* Profile */}
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center overflow-hidden mb-2" style={{ backgroundColor: "#1a1a1a", border: "1px dashed #333333" }}>
                      {workspaceSettings.branding?.profilePicture ? (
                        <img src={workspaceSettings.branding.profilePicture} alt="Profile" className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="12" r="5" stroke="#666666" strokeWidth="2"/><path d="M6 28C6 22.4772 10.4772 18 16 18C21.5228 18 26 22.4772 26 28" stroke="#666666" strokeWidth="2" strokeLinecap="round"/></svg>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-white/10" style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", color: "#ffffff" }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.3334 5.33333L8.00002 2L4.66669 5.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 2V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Photo
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const { upload } = await import("@vercel/blob/client"); const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload/client" }); onWorkspaceSettingsChange({ ...workspaceSettings, branding: { ...workspaceSettings.branding, profilePicture: blob.url } }); } catch (error) { console.error("Upload failed:", error); } }} />
                    </label>
                    <div className="text-[10px] text-gray-500 mt-1">Square</div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="rounded-xl p-5" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
                <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                    <path d="M11 14V12.6667C11 11.9594 10.719 11.2811 10.219 10.781C9.71896 10.281 9.04058 10 8.33333 10H3.33333C2.62609 10 1.94781 10.281 1.44772 10.781C0.947621 11.2811 0.666664 11.9594 0.666664 12.6667V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="5.83333" cy="4.66667" r="2.66667" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M15.3333 14V12.6667C15.3329 12.0758 15.1362 11.5019 14.7742 11.0349C14.4122 10.5679 13.9054 10.2344 13.3333 10.0867" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.6667 2.08667C11.2403 2.23354 11.7487 2.56714 12.1118 3.03488C12.4748 3.50262 12.6719 4.07789 12.6719 4.67C12.6719 5.26211 12.4748 5.83738 12.1118 6.30512C11.7487 6.77286 11.2403 7.10646 10.6667 7.25333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Team Members
                </h3>
                <div className="flex flex-wrap gap-2">
                  {workspaceSettings.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: "#333333" }}>
                        {member.initials}
                      </div>
                      <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{member.name}</span>
                      <span className="text-xs text-gray-500">{member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : member.role === "editor" ? "Editor" : "Viewer"}</span>
                    </div>
                  ))}
                  <button type="button" onClick={() => setShowSettingsDialog(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/10" style={{ backgroundColor: "#1a1a1a", border: "1px dashed #333333", color: "#888888" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    Invite
                  </button>
                </div>
              </div>

              {/* Products */}
              <div className="rounded-xl p-5" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
                <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                    <path d="M14 10V6C13.9997 5.76628 13.9405 5.53674 13.8278 5.33491C13.7152 5.13309 13.5528 4.96619 13.3556 4.85L8.66667 2.07222C8.46901 1.95578 8.24258 1.89448 8.01111 1.89448C7.77965 1.89448 7.55322 1.95578 7.35556 2.07222L2.66667 4.85C2.46946 4.96619 2.30708 5.13309 2.19444 5.33491C2.0818 5.53674 2.02251 5.76628 2.02222 6V10C2.02251 10.2337 2.0818 10.4633 2.19444 10.6651C2.30708 10.8669 2.46946 11.0338 2.66667 11.15L7.35556 13.9278C7.55322 14.0442 7.77965 14.1055 8.01111 14.1055C8.24258 14.1055 8.46901 14.0442 8.66667 13.9278L13.3556 11.15C13.5528 11.0338 13.7152 10.8669 13.8278 10.6651C13.9405 10.4633 13.9997 10.2337 14 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Products
                </h3>
                <div className="flex flex-wrap gap-2">
                  {workspaceSettings.products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        const updatedProducts = workspaceSettings.products.map(p => p.id === product.id ? { ...p, enabled: !p.enabled } : p);
                        onSettingsChange({ ...workspaceSettings, products: updatedProducts });
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${product.enabled ? "ring-1 ring-white/20" : "opacity-50"}`}
                      style={{ backgroundColor: "#1a1a1a" }}
                    >
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: product.color }} />
                      <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{product.name}</span>
                      <div className={`w-2 h-2 rounded-full ${product.enabled ? "bg-green-500" : "bg-gray-600"}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div className="rounded-xl p-5" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
                <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                    <path d="M2.66667 4H13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.66667 8H13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.66667 12H13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Preferences
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Default Product</label>
                    <select
                      value={workspaceSettings.preferences.defaultProduct}
                      onChange={(e) => onSettingsChange({ ...workspaceSettings, preferences: { ...workspaceSettings.preferences, defaultProduct: e.target.value as any } })}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      {workspaceSettings.products.filter(p => p.enabled).map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Default Status</label>
                    <select
                      value={workspaceSettings.preferences.defaultStatus}
                      onChange={(e) => onSettingsChange({ ...workspaceSettings, preferences: { ...workspaceSettings.preferences, defaultStatus: e.target.value as any } })}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <option value="draft">Draft</option>
                      <option value="in-review">In Review</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                    <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Auto-save</span>
                    <button
                      type="button"
                      onClick={() => onSettingsChange({ ...workspaceSettings, preferences: { ...workspaceSettings.preferences, autoSave: !workspaceSettings.preferences.autoSave } })}
                      className={`w-9 h-5 rounded-full transition-colors ${workspaceSettings.preferences.autoSave ? "bg-[#F0FE00]" : "bg-gray-600"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${workspaceSettings.preferences.autoSave ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                    <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Show Grid</span>
                    <button
                      type="button"
                      onClick={() => onSettingsChange({ ...workspaceSettings, preferences: { ...workspaceSettings.preferences, showGrid: !workspaceSettings.preferences.showGrid } })}
                      className={`w-9 h-5 rounded-full transition-colors ${workspaceSettings.preferences.showGrid ? "bg-[#F0FE00]" : "bg-gray-600"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${workspaceSettings.preferences.showGrid ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Naming Conventions - Link to Dialog for full editor */}
              <div className="rounded-xl p-5" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium text-sm flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                      <path d="M2 4H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 8H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Naming Conventions
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSettingsDialog(true)}
                    className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Edit
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
                <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "#0a0a0a", border: "1px solid #222222" }}>
                  <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Preview: </span>
                  <span className="text-sm text-white font-mono">project_logo_v1<span className="text-gray-500">.fig</span></span>
                </div>
              </div>
            </div>
          </div>
        ) : activeView === "home" ? (
          <>
            {/* Scrollable Content - Ribbon and Canvas Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Fault Management Ribbon */}
              <div className="mb-6">
                <div
                  className="rounded-xl p-5"
                  style={{ backgroundColor: "#141414", border: "1px solid #222222" }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3
                        className="text-white font-semibold text-base"
                        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        Fault Management Ribbon
                      </h3>
                      <p
                        className="text-gray-500 text-sm mt-0.5"
                        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        7 active client engagements
                      </p>
                    </div>
                    {/* Legend and View Toggle */}
                    <div className="flex items-center gap-6">
                      {/* Legend */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#4ADE80" }} />
                          <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Smooth</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FCD34D" }} />
                          <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Minor</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FB923C" }} />
                          <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Moderate</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#F87171" }} />
                          <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>High</span>
                        </div>
                      </div>
                      
                      {/* View Toggle */}
                      <div className="flex items-center rounded-lg p-0.5" style={{ backgroundColor: "#1a1a1a" }}>
                        <button
                          type="button"
                          onClick={() => setRibbonViewMode("ribbon")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            ribbonViewMode === "ribbon" 
                              ? "bg-[#2a2a2a] text-white" 
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="4" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.4"/>
                            <rect x="1" y="7" width="14" height="2" rx="0.5" fill="currentColor"/>
                            <rect x="1" y="10" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.4"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRibbonViewMode("calendar")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            ribbonViewMode === "calendar" 
                              ? "bg-[#2a2a2a] text-white" 
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                            <path d="M2 6h12" stroke="currentColor" strokeWidth="1.25"/>
                            <path d="M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
                            <rect x="4" y="8" width="2" height="2" rx="0.5" fill="currentColor"/>
                            <rect x="7" y="8" width="2" height="2" rx="0.5" fill="currentColor"/>
                            <rect x="10" y="8" width="2" height="2" rx="0.5" fill="currentColor"/>
                            <rect x="4" y="11" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
                            <rect x="7" y="11" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {ribbonViewMode === "ribbon" ? (
                  <>
                  {/* Timeline Ribbon */}
                  <div className="relative mb-3">
                    {/* Today marker */}
                    <div className="absolute top-0 left-[60%] -translate-x-1/2 -translate-y-full pb-1">
                      <div
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: "#333333", color: "#ffffff", fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        Today
                      </div>
                    </div>
                    
                    {/* Ribbon data for each day */}
                  {(() => {
                    const todayIndex = 17; // Today is day 18 (index 17)
                    
                    // Sample data for 28 days - design agency scenarios
                    // Past days (index 0-16) show what happened
                    // Today (index 17) shows current status
                    // Future days (index 18-27) show predictions based on scheduled work
                    const ribbonDays = [
                      // Week 1 (14-20 days ago) - Past
                      { status: "smooth", title: "All Clear", description: "Brand strategy kickoff completed successfully", tags: ["On Track", "Client Happy"], isFuture: false },
                      { status: "smooth", title: "Milestone Hit", description: "Logo concepts delivered on time", tags: ["Delivered", "Approved"], isFuture: false },
                      { status: "smooth", title: "Great Feedback", description: "Client loved initial moodboards", tags: ["Positive Review", "Moving Forward"], isFuture: false },
                      { status: "smooth", title: "Team Aligned", description: "Internal design review went smoothly", tags: ["Aligned", "No Revisions"], isFuture: false },
                      { status: "smooth", title: "Assets Ready", description: "Photography assets received from vendor", tags: ["Complete", "High Quality"], isFuture: false },
                      { status: "minor", title: "Small Delay", description: "Font licensing taking longer than expected", tags: ["Pending", "Low Priority"], isFuture: false },
                      { status: "moderate", title: "Revision Request", description: "Client requested color palette changes", tags: ["In Progress", "2nd Round"], isFuture: false },
                      // Week 2 (7-13 days ago) - Past
                      { status: "minor", title: "Feedback Pending", description: "Awaiting client sign-off on typography", tags: ["Waiting", "Follow Up"], isFuture: false },
                      { status: "minor", title: "Resource Shuffle", description: "Designer reassigned from another project", tags: ["Adjusting", "On Track"], isFuture: false },
                      { status: "moderate", title: "Budget Discussion", description: "Scope creep requiring additional budget approval", tags: ["Negotiating", "Pending"], isFuture: false },
                      { status: "moderate", title: "Timeline Slip", description: "Print vendor delayed delivery by 2 days", tags: ["Delayed", "External"], isFuture: false },
                      { status: "high", title: "Critical Blocker", description: "Stakeholder approval delayed - Executive out of office", tags: ["Blocked", "Escalated"], isFuture: false },
                      { status: "moderate", title: "Technical Issue", description: "File compatibility issues with client systems", tags: ["Resolving", "IT Support"], isFuture: false },
                      { status: "moderate", title: "Rework Needed", description: "Brand guidelines require additional sections", tags: ["Extra Work", "Scoped"], isFuture: false },
                      // Week 3 - Current week
                      { status: "moderate", title: "Late Feedback", description: "Client review comments came in after deadline", tags: ["Catching Up", "Overtime"], isFuture: false },
                      { status: "moderate", title: "Asset Gap", description: "Missing product photos for catalog", tags: ["Sourcing", "Urgent"], isFuture: false },
                      { status: "minor", title: "Minor Tweak", description: "Small adjustments to icon set requested", tags: ["Quick Fix", "Easy"], isFuture: false },
                      { status: "smooth", title: "All Clear", description: "Final presentations approved by creative director", tags: ["Approved", "Ready"], isFuture: false }, // TODAY
                      // Future days - Predictive based on scheduled work and current project status
                      { status: "minor", title: "Client Presentation Due", description: "Final brand presentation scheduled - team is prepared but client has history of last-minute changes", tags: ["Scheduled", "Risk: Scope Creep"], isFuture: true },
                      { status: "minor", title: "Deliverables Deadline", description: "Final asset package due - currently 85% complete, may need overtime to finish", tags: ["At Risk", "Tight Timeline"], isFuture: true },
                      { status: "smooth", title: "Buffer Day", description: "No major deliverables - time allocated for revisions if needed", tags: ["Flexible", "Catch-up"], isFuture: true },
                      // Week 4 - Future (projected risks)
                      { status: "minor", title: "Phase 2 Kickoff", description: "New phase begins - scope not yet finalized, pending client approval", tags: ["Pending Approval", "Planning"], isFuture: true },
                      { status: "moderate", title: "Resource Conflict", description: "Lead designer scheduled on overlapping project - capacity at 120%", tags: ["Overbooked", "Need Coverage"], isFuture: true },
                      { status: "minor", title: "Vendor Dependency", description: "Motion graphics delivery expected - vendor has been reliable but external dependency", tags: ["External", "Monitoring"], isFuture: true },
                      { status: "moderate", title: "Budget Review", description: "Q3 allocation meeting - Phase 2 funding not yet confirmed", tags: ["Financial Risk", "Pending"], isFuture: true },
                      { status: "minor", title: "Team Training", description: "New design system workshop - reduced capacity for client work", tags: ["Reduced Capacity", "Investment"], isFuture: true },
                      { status: "smooth", title: "Sprint Planning", description: "Phase 2 sprint begins - assuming approvals come through on schedule", tags: ["Optimistic", "Dependent"], isFuture: true },
                      { status: "smooth", title: "Client Sync", description: "Weekly check-in - good opportunity to address any accumulated concerns", tags: ["Routine", "Communication"], isFuture: true },
                    ];

                    const statusColors: Record<string, string> = {
                      smooth: "#4ADE80",
                      minor: "#FCD34D", 
                      moderate: "#FB923C",
                      high: "#F87171"
                    };

                    return (
                      <>
                        {/* Ribbon squares */}
                        <div className="flex gap-1 pt-6">
                          {ribbonDays.map((day, i) => (
                            <div
                              key={`day-${i}`}
                              onClick={() => setSelectedRibbonDay(i)}
                              className={`flex-1 h-8 rounded relative cursor-pointer transition-all hover:opacity-80 ${
                                i === selectedRibbonDay 
                                  ? "ring-2 ring-white ring-offset-1 ring-offset-[#141414]" 
                                  : i === todayIndex
                                  ? "opacity-60"
                                  : "opacity-40"
                              }`}
                              style={{ backgroundColor: statusColors[day.status] }}
                              title={`${day.title}: ${day.description}`}
                            >
                              {i === todayIndex && i !== selectedRibbonDay && (
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </div>
                          ))}
                        </div>
                      </> 
                    );
                  })()}
                  </div>

                  {/* Week labels - dynamic dates */}
                  {(() => {
                    const today = new Date();
                    const formatWeekDate = (weeksOffset: number) => {
                      const date = new Date(today);
                      date.setDate(today.getDate() + (weeksOffset * 7));
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    };
                    return (
                      <div className="flex text-xs text-gray-500 mb-4" style={{ fontFamily: "system-ui, Inter, sans-serif" }} suppressHydrationWarning>
                        <div className="flex-1" suppressHydrationWarning>{formatWeekDate(-2)}</div>
                        <div className="flex-1 text-center" suppressHydrationWarning>{formatWeekDate(-1)}</div>
                        <div className="flex-1 text-center" suppressHydrationWarning>{formatWeekDate(0)}</div>
                        <div className="flex-1 text-right" suppressHydrationWarning>{formatWeekDate(1)}</div>
                      </div>
                    );
                  })()}

                  {/* Selected Day Detail Card */}
                  {(() => {
                    const todayIndex = 17;
                    
                    const ribbonDays = [
                      // Week 1 (14-20 days ago) - Past
                      { status: "smooth", title: "All Clear", description: "Brand strategy kickoff completed successfully", tags: ["On Track", "Client Happy"], isFuture: false },
                      { status: "smooth", title: "Milestone Hit", description: "Logo concepts delivered on time", tags: ["Delivered", "Approved"], isFuture: false },
                      { status: "smooth", title: "Great Feedback", description: "Client loved initial moodboards", tags: ["Positive Review", "Moving Forward"], isFuture: false },
                      { status: "smooth", title: "Team Aligned", description: "Internal design review went smoothly", tags: ["Aligned", "No Revisions"], isFuture: false },
                      { status: "smooth", title: "Assets Ready", description: "Photography assets received from vendor", tags: ["Complete", "High Quality"], isFuture: false },
                      { status: "minor", title: "Small Delay", description: "Font licensing taking longer than expected", tags: ["Pending", "Low Priority"], isFuture: false },
                      { status: "moderate", title: "Revision Request", description: "Client requested color palette changes", tags: ["In Progress", "2nd Round"], isFuture: false },
                      // Week 2 (7-13 days ago) - Past
                      { status: "minor", title: "Feedback Pending", description: "Awaiting client sign-off on typography", tags: ["Waiting", "Follow Up"], isFuture: false },
                      { status: "minor", title: "Resource Shuffle", description: "Designer reassigned from another project", tags: ["Adjusting", "On Track"], isFuture: false },
                      { status: "moderate", title: "Budget Discussion", description: "Scope creep requiring additional budget approval", tags: ["Negotiating", "Pending"], isFuture: false },
                      { status: "moderate", title: "Timeline Slip", description: "Print vendor delayed delivery by 2 days", tags: ["Delayed", "External"], isFuture: false },
                      { status: "high", title: "Critical Blocker", description: "Stakeholder approval delayed - Executive out of office", tags: ["Blocked", "Escalated"], isFuture: false },
                      { status: "moderate", title: "Technical Issue", description: "File compatibility issues with client systems", tags: ["Resolving", "IT Support"], isFuture: false },
                      { status: "moderate", title: "Rework Needed", description: "Brand guidelines require additional sections", tags: ["Extra Work", "Scoped"], isFuture: false },
                      // Week 3 - Current week
                      { status: "moderate", title: "Late Feedback", description: "Client review comments came in after deadline", tags: ["Catching Up", "Overtime"], isFuture: false },
                      { status: "moderate", title: "Asset Gap", description: "Missing product photos for catalog", tags: ["Sourcing", "Urgent"], isFuture: false },
                      { status: "minor", title: "Minor Tweak", description: "Small adjustments to icon set requested", tags: ["Quick Fix", "Easy"], isFuture: false },
                      { status: "smooth", title: "All Clear", description: "Final presentations approved by creative director", tags: ["Approved", "Ready"], isFuture: false }, // TODAY
                      // Future days - Predictive
                      { status: "minor", title: "Client Presentation Due", description: "Final brand presentation scheduled - team is prepared but client has history of last-minute changes", tags: ["Scheduled", "Risk: Scope Creep"], isFuture: true },
                      { status: "minor", title: "Deliverables Deadline", description: "Final asset package due - currently 85% complete, may need overtime to finish", tags: ["At Risk", "Tight Timeline"], isFuture: true },
                      { status: "smooth", title: "Buffer Day", description: "No major deliverables - time allocated for revisions if needed", tags: ["Flexible", "Catch-up"], isFuture: true },
                      // Week 4 - Future
                      { status: "minor", title: "Phase 2 Kickoff", description: "New phase begins - scope not yet finalized, pending client approval", tags: ["Pending Approval", "Planning"], isFuture: true },
                      { status: "moderate", title: "Resource Conflict", description: "Lead designer scheduled on overlapping project - capacity at 120%", tags: ["Overbooked", "Need Coverage"], isFuture: true },
                      { status: "minor", title: "Vendor Dependency", description: "Motion graphics delivery expected - vendor has been reliable but external dependency", tags: ["External", "Monitoring"], isFuture: true },
                      { status: "moderate", title: "Budget Review", description: "Q3 allocation meeting - Phase 2 funding not yet confirmed", tags: ["Financial Risk", "Pending"], isFuture: true },
                      { status: "minor", title: "Team Training", description: "New design system workshop - reduced capacity for client work", tags: ["Reduced Capacity", "Investment"], isFuture: true },
                      { status: "smooth", title: "Sprint Planning", description: "Phase 2 sprint begins - assuming approvals come through on schedule", tags: ["Optimistic", "Dependent"], isFuture: true },
                      { status: "smooth", title: "Client Sync", description: "Weekly check-in - good opportunity to address any accumulated concerns", tags: ["Routine", "Communication"], isFuture: true },
                    ];

                    const selectedDay = ribbonDays[selectedRibbonDay];
                    const daysFromToday = selectedRibbonDay - todayIndex;
                    
                    // Calculate the actual date for the selected day
                    const selectedDate = new Date();
                    selectedDate.setDate(selectedDate.getDate() + daysFromToday);
                    const formattedDate = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

                    const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode; phaseText: string; futurePhaseText: string }> = {
                      smooth: {
                        color: "#4ADE80",
                        bgColor: "rgba(74, 222, 128, 0.2)",
                        icon: (
                          <svg className="mt-0.5" style={{ color: "#4ADE80" }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M5.5 8L7 9.5L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ),
                        phaseText: "Completed",
                        futurePhaseText: "Low Risk"
                      },
                      minor: {
                        color: "#FCD34D",
                        bgColor: "rgba(252, 211, 77, 0.2)",
                        icon: (
                          <svg className="mt-0.5" style={{ color: "#FCD34D" }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M8 5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
                          </svg>
                        ),
                        phaseText: "Resolved",
                        futurePhaseText: "Monitor"
                      },
                      moderate: {
                        color: "#FB923C",
                        bgColor: "rgba(251, 146, 60, 0.2)",
                        icon: (
                          <svg className="mt-0.5" style={{ color: "#FB923C" }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                            <path d="M8 6V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
                          </svg>
                        ),
                        phaseText: "Was Disrupted",
                        futurePhaseText: "High Risk"
                      },
                      high: {
                        color: "#F87171",
                        bgColor: "rgba(248, 113, 113, 0.2)",
                        icon: (
                          <svg className="mt-0.5" style={{ color: "#F87171" }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M8 5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
                          </svg>
                        ),
                        phaseText: "Was Blocked",
                        futurePhaseText: "Critical Risk"
                      }
                    };

                    const config = statusConfig[selectedDay.status];
                    const isToday = selectedRibbonDay === todayIndex;
                    const isFuture = selectedDay.isFuture;

                    // Determine the label text
                    let dateLabel = formattedDate;
                    if (isToday) {
                      dateLabel = "Today";
                    } else if (daysFromToday === -1) {
                      dateLabel = "Yesterday";
                    } else if (daysFromToday === 1) {
                      dateLabel = "Tomorrow";
                    }

                    // Status summary based on time
                    const getStatusSummary = () => {
                      if (isToday) {
                        if (selectedDay.status === "smooth") return "All systems running smoothly";
                        if (selectedDay.status === "minor") return "Minor issues being addressed";
                        if (selectedDay.status === "moderate") return "Moderate disruptions";
                        return "Critical issues detected";
                      } else if (isFuture) {
                        if (selectedDay.status === "smooth") return "Low risk day - no major concerns predicted";
                        if (selectedDay.status === "minor") return "Minor risk - deliverable or dependency scheduled";
                        if (selectedDay.status === "moderate") return "Elevated risk - potential blockers identified";
                        return "High risk - critical dependencies or conflicts";
                      } else {
                        if (selectedDay.status === "smooth") return "Day completed without issues";
                        if (selectedDay.status === "minor") return "Minor issues were resolved";
                        if (selectedDay.status === "moderate") return "Day had moderate disruptions";
                        return "Critical blocker occurred";
                      }
                    };

                    return (
                      <div
                        className="rounded-lg p-4"
                        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="text-xs font-medium text-gray-500"
                                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                              >
                                {dateLabel}
                              </div>
                              {isFuture && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{ backgroundColor: "rgba(147, 51, 234, 0.2)", color: "#A855F7" }}
                                >
                                  Forecast
                                </span>
                              )}
                              {!isToday && !isFuture && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{ backgroundColor: "rgba(100, 100, 100, 0.2)", color: "#888888" }}
                                >
                                  Past
                                </span>
                              )}
                            </div>
                            <div
                              className="text-sm text-gray-400 mb-3"
                              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              {getStatusSummary()}
                            </div>

                            {/* Status */}
                            <div className="flex items-start gap-2 mb-3">
                              {config.icon}
                              <div>
                                <div
                                  className="font-medium text-sm"
                                  style={{ color: config.color, fontFamily: "system-ui, Inter, sans-serif" }}
                                >
                                  {selectedDay.title}
                                </div>
                                <div
                                  className="text-white text-sm mt-0.5"
                                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                >
                                  {selectedDay.description}
                                </div>
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {selectedDay.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 rounded text-xs font-medium"
                                  style={{ backgroundColor: config.bgColor, color: config.color }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div
                            className="text-sm text-gray-400 text-right"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            {isToday ? "Active" : isFuture ? config.futurePhaseText : config.phaseText}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  </>
                  ) : (
                  /* Calendar View */
                  (() => {
                    const today = new Date();
                    const todayIndex = 17;
                    
                    // Same ribbon data for calendar view
                    const ribbonDays = [
                      { status: "smooth", title: "All Clear", description: "Brand strategy kickoff completed successfully", tags: ["On Track", "Client Happy"], isFuture: false },
                      { status: "smooth", title: "Milestone Hit", description: "Logo concepts delivered on time", tags: ["Delivered", "Approved"], isFuture: false },
                      { status: "smooth", title: "Great Feedback", description: "Client loved initial moodboards", tags: ["Positive Review", "Moving Forward"], isFuture: false },
                      { status: "smooth", title: "Team Aligned", description: "Internal design review went smoothly", tags: ["Aligned", "No Revisions"], isFuture: false },
                      { status: "smooth", title: "Assets Ready", description: "Photography assets received from vendor", tags: ["Complete", "High Quality"], isFuture: false },
                      { status: "minor", title: "Small Delay", description: "Font licensing taking longer than expected", tags: ["Pending", "Low Priority"], isFuture: false },
                      { status: "moderate", title: "Revision Request", description: "Client requested color palette changes", tags: ["In Progress", "2nd Round"], isFuture: false },
                      { status: "minor", title: "Feedback Pending", description: "Awaiting client sign-off on typography", tags: ["Waiting", "Follow Up"], isFuture: false },
                      { status: "minor", title: "Resource Shuffle", description: "Designer reassigned from another project", tags: ["Adjusting", "On Track"], isFuture: false },
                      { status: "moderate", title: "Budget Discussion", description: "Scope creep requiring additional budget approval", tags: ["Negotiating", "Pending"], isFuture: false },
                      { status: "moderate", title: "Timeline Slip", description: "Print vendor delayed delivery by 2 days", tags: ["Delayed", "External"], isFuture: false },
                      { status: "high", title: "Critical Blocker", description: "Stakeholder approval delayed - Executive out of office", tags: ["Blocked", "Escalated"], isFuture: false },
                      { status: "moderate", title: "Technical Issue", description: "File compatibility issues with client systems", tags: ["Resolving", "IT Support"], isFuture: false },
                      { status: "moderate", title: "Rework Needed", description: "Brand guidelines require additional sections", tags: ["Extra Work", "Scoped"], isFuture: false },
                      { status: "moderate", title: "Late Feedback", description: "Client review comments came in after deadline", tags: ["Catching Up", "Overtime"], isFuture: false },
                      { status: "moderate", title: "Asset Gap", description: "Missing product photos for catalog", tags: ["Sourcing", "Urgent"], isFuture: false },
                      { status: "minor", title: "Minor Tweak", description: "Small adjustments to icon set requested", tags: ["Quick Fix", "Easy"], isFuture: false },
                      { status: "smooth", title: "All Clear", description: "Final presentations approved by creative director", tags: ["Approved", "Ready"], isFuture: false },
                      { status: "minor", title: "Client Presentation Due", description: "Final brand presentation scheduled", tags: ["Scheduled", "Risk: Scope Creep"], isFuture: true },
                      { status: "minor", title: "Deliverables Deadline", description: "Final asset package due", tags: ["At Risk", "Tight Timeline"], isFuture: true },
                      { status: "smooth", title: "Buffer Day", description: "No major deliverables", tags: ["Flexible", "Catch-up"], isFuture: true },
                      { status: "minor", title: "Phase 2 Kickoff", description: "New phase begins", tags: ["Pending Approval", "Planning"], isFuture: true },
                      { status: "moderate", title: "Resource Conflict", description: "Lead designer scheduled on overlapping project", tags: ["Overbooked", "Need Coverage"], isFuture: true },
                      { status: "minor", title: "Vendor Dependency", description: "Motion graphics delivery expected", tags: ["External", "Monitoring"], isFuture: true },
                      { status: "moderate", title: "Budget Review", description: "Q3 allocation meeting", tags: ["Financial Risk", "Pending"], isFuture: true },
                      { status: "minor", title: "Team Training", description: "New design system workshop", tags: ["Reduced Capacity", "Investment"], isFuture: true },
                      { status: "smooth", title: "Sprint Planning", description: "Phase 2 sprint begins", tags: ["Optimistic", "Dependent"], isFuture: true },
                      { status: "smooth", title: "Client Sync", description: "Weekly check-in", tags: ["Routine", "Communication"], isFuture: true },
                    ];
                    
                    const statusColors: Record<string, string> = {
                      smooth: "#4ADE80",
                      minor: "#FCD34D",
                      moderate: "#FB923C",
                      high: "#F87171"
                    };
                    
                    // Get start of the 4-week period (today - 17 days to align with ribbon)
                    const startDate = new Date(today);
                    startDate.setDate(today.getDate() - todayIndex);
                    
                    // Find the Monday of that week
                    const dayOfWeek = startDate.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const calendarStart = new Date(startDate);
                    calendarStart.setDate(startDate.getDate() + mondayOffset);
                    
                    // Generate 5 weeks of calendar data
                    const weeks: { date: Date; dayIndex: number | null; day: typeof ribbonDays[0] | null }[][] = [];
                    let currentDate = new Date(calendarStart);
                    
                    for (let week = 0; week < 5; week++) {
                      const weekDays: { date: Date; dayIndex: number | null; day: typeof ribbonDays[0] | null }[] = [];
                      for (let d = 0; d < 7; d++) {
                        const diffFromStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        const dayIndex = diffFromStart >= 0 && diffFromStart < 28 ? diffFromStart : null;
                        weekDays.push({
                          date: new Date(currentDate),
                          dayIndex,
                          day: dayIndex !== null ? ribbonDays[dayIndex] : null
                        });
                        currentDate.setDate(currentDate.getDate() + 1);
                      }
                      weeks.push(weekDays);
                    }
                    
                    const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    
                    return (
                      <div className="space-y-4">
                        {/* Month header */}
                        <div className="text-center mb-4">
                          <span className="text-white font-medium" style={{ fontFamily: "system-ui, Inter, sans-serif" }} suppressHydrationWarning>
                            {monthYear}
                          </span>
                        </div>
                        
                        {/* Calendar grid */}
                        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
                          {/* Day headers */}
                          <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: "#2a2a2a" }}>
                            {weekDays.map((day) => (
                              <div
                                key={day}
                                className="p-2 text-center text-xs font-medium text-gray-500"
                                style={{ backgroundColor: "#1a1a1a", fontFamily: "system-ui, Inter, sans-serif" }}
                              >
                                {day}
                              </div>
                            ))}
                          </div>
                          
                          {/* Calendar cells */}
                          <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: "#2a2a2a" }}>
                            {weeks.flat().map((cell, i) => {
                              const isToday = cell.date.toDateString() === today.toDateString();
                              const isSelected = cell.dayIndex === selectedRibbonDay;
                              const hasData = cell.day !== null;
                              
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => cell.dayIndex !== null && setSelectedRibbonDay(cell.dayIndex)}
                                  disabled={!hasData}
                                  className={`relative p-2 min-h-[72px] text-left transition-all ${
                                    hasData ? "cursor-pointer hover:bg-[#252525]" : "cursor-default opacity-50"
                                  } ${isSelected ? "ring-2 ring-inset ring-white" : ""}`}
                                  style={{ backgroundColor: "#1a1a1a" }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={`text-xs ${isToday ? "bg-white text-black px-1.5 py-0.5 rounded-full font-medium" : "text-gray-400"}`}
                                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                      suppressHydrationWarning
                                    >
                                      {cell.date.getDate()}
                                    </span>
                                    {hasData && (
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: statusColors[cell.day!.status] }}
                                      />
                                    )}
                                  </div>
                                  {hasData && (
                                    <div
                                      className="text-[10px] text-gray-500 line-clamp-2 leading-tight"
                                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                    >
                                      {cell.day!.title}
                                    </div>
                                  )}
                                  {cell.day?.isFuture && (
                                    <div className="absolute bottom-1 right-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 opacity-60" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Selected day detail card (same as ribbon view) */}
                        {(() => {
                          const selectedDay = ribbonDays[selectedRibbonDay];
                          const daysFromToday = selectedRibbonDay - todayIndex;
                          const selectedDate = new Date();
                          selectedDate.setDate(selectedDate.getDate() + daysFromToday);
                          const formattedDate = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                          
                          const statusConfig: Record<string, { color: string; bgColor: string }> = {
                            smooth: { color: "#4ADE80", bgColor: "rgba(74, 222, 128, 0.2)" },
                            minor: { color: "#FCD34D", bgColor: "rgba(252, 211, 77, 0.2)" },
                            moderate: { color: "#FB923C", bgColor: "rgba(251, 146, 60, 0.2)" },
                            high: { color: "#F87171", bgColor: "rgba(248, 113, 113, 0.2)" }
                          };
                          
                          const config = statusConfig[selectedDay.status];
                          const isSelectedToday = selectedRibbonDay === todayIndex;
                          
                          let dateLabel = formattedDate;
                          if (isSelectedToday) dateLabel = "Today";
                          else if (daysFromToday === -1) dateLabel = "Yesterday";
                          else if (daysFromToday === 1) dateLabel = "Tomorrow";
                          
                          return (
                            <div
                              className="rounded-lg p-4 mt-4"
                              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                  {dateLabel}
                                </span>
                                {selectedDay.isFuture && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "rgba(147, 51, 234, 0.2)", color: "#A855F7" }}>
                                    Forecast
                                  </span>
                                )}
                              </div>
                              <div className="font-medium text-sm mb-1" style={{ color: config.color, fontFamily: "system-ui, Inter, sans-serif" }}>
                                {selectedDay.title}
                              </div>
                              <div className="text-white text-sm mb-3" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                {selectedDay.description}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {selectedDay.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 rounded text-xs font-medium"
                                    style={{ backgroundColor: config.bgColor, color: config.color }}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()
                  )}
                </div>
              </div>

              {/* Canvas Grid */}
              {filteredCanvases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "#1a1a1a" }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="10" height="10" rx="2" stroke="#444444" strokeWidth="2"/>
                  <rect x="18" y="4" width="10" height="10" rx="2" stroke="#444444" strokeWidth="2"/>
                  <rect x="4" y="18" width="10" height="10" rx="2" stroke="#444444" strokeWidth="2"/>
                  <rect x="18" y="18" width="10" height="10" rx="2" stroke="#444444" strokeWidth="2"/>
                </svg>
              </div>
              <div className="text-white font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                No canvases yet
              </div>
              <div className="text-gray-500 text-sm mb-4" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                Create your first canvas to get started
              </div>
              <button
                type="button"
                onClick={() => setShowNewCanvasDialog(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "#F0FE00",
                  color: "#121212",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                New canvas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCanvases.map((canvas) => (
                <div
                  key={canvas.id}
                  className="group rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-white/20"
                  style={{ backgroundColor: "#1a1a1a" }}
                  onClick={() => onOpenCanvas(canvas.id)}
                >
                  {/* Canvas Preview */}
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <CanvasPreview nodes={canvas.nodes} />
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(canvas.id);
                        }}
                        className="p-1.5 rounded-lg"
                        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 18 18" fill={canvas.isFavorite ? "#F0FE00" : "none"} xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 2L11.09 6.26L16 6.97L12.5 10.34L13.18 15.25L9 13.05L4.82 15.25L5.5 10.34L2 6.97L6.91 6.26L9 2Z" stroke={canvas.isFavorite ? "#F0FE00" : "#ffffff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCanvasToDelete(canvas.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/20"
                        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 4H14M5.333 4V2.667C5.333 2.298 5.632 2 6 2H10C10.368 2 10.667 2.298 10.667 2.667V4M12.667 4V13.333C12.667 13.702 12.368 14 12 14H4C3.632 14 3.333 13.702 3.333 13.333V4H12.667Z" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium text-sm truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {canvas.name}
                      </div>
                      {/* Collaborator Avatars */}
                      {canvas.collaborators && canvas.collaborators.length > 0 && (
                        <div className="flex -space-x-1.5 ml-2 flex-shrink-0">
                          {canvas.collaborators.slice(0, 3).map((collaborator) => (
                            <div
                              key={collaborator.id}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[#1a1a1a]"
                              style={{
                                backgroundColor: collaborator.avatar ? "transparent" : "#333333",
                                color: "#ffffff",
                                fontFamily: "system-ui, Inter, sans-serif",
                              }}
                              title={collaborator.name}
                            >
                              {collaborator.avatar ? (
                                <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                collaborator.initials
                              )}
                            </div>
                          ))}
                          {canvas.collaborators.length > 3 && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[#1a1a1a]"
                              style={{
                                backgroundColor: "#252525",
                                color: "#888888",
                                fontFamily: "system-ui, Inter, sans-serif",
                              }}
                            >
                              +{canvas.collaborators.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      {formatDate(canvas.updatedAt)}
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
          </>
        ) : (activeView === "canvases" || activeView === "favorites") ? (
          /* Canvas/Files View with Tab Switcher */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Switcher - Only show on canvases view, not favorites */}
            {activeView === "canvases" && (
              <div className="px-6 py-3 flex items-center gap-1" style={{ borderBottom: "1px solid #222222" }}>
                <button
                  type="button"
                  onClick={() => setCanvasSubView("canvases")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    canvasSubView === "canvases" 
                      ? "bg-white/10 text-white" 
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                  }`}
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  Canvases
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasSubView("files")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    canvasSubView === "files" 
                      ? "bg-white/10 text-white" 
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                  }`}
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  Files
                </button>
              </div>
            )}

            {/* Content Area */}
            {(activeView === "favorites" || canvasSubView === "canvases") ? (
              <div className="flex-1 overflow-y-auto p-6">
              {filteredCanvases.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCanvases.map((canvas) => (
                <div
                  key={canvas.id}
                  onClick={() => onOpenCanvas(canvas.id)}
                  className="group cursor-pointer rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: "#141414", border: "1px solid #222222" }}
                >
                  {/* Preview */}
                  <div className="aspect-video relative overflow-hidden">
                    <CanvasPreview nodes={canvas.nodes} />
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(canvas.id);
                        }}
                        className="p-1.5 rounded-lg"
                        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 18 18" fill={canvas.isFavorite ? "#F0FE00" : "none"} xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 2L11.09 6.26L16 6.97L12.5 10.34L13.18 15.25L9 13.05L4.82 15.25L5.5 10.34L2 6.97L6.91 6.26L9 2Z" stroke={canvas.isFavorite ? "#F0FE00" : "#ffffff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCanvasToDelete(canvas.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-500/20"
                        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 4H14M5.333 4V2.667C5.333 2.298 5.632 2 6 2H10C10.368 2 10.667 2.298 10.667 2.667V4M12.667 4V13.333C12.667 13.702 12.368 14 12 14H4C3.632 14 3.333 13.702 3.333 13.333V4H12.667Z" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium text-sm truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {canvas.name}
                      </div>
                      {/* Collaborator Avatars */}
                      {canvas.collaborators && canvas.collaborators.length > 0 && (
                        <div className="flex -space-x-1.5 ml-2 flex-shrink-0">
                          {canvas.collaborators.slice(0, 3).map((collaborator) => (
                            <div
                              key={collaborator.id}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[#1a1a1a]"
                              style={{
                                backgroundColor: collaborator.avatar ? "transparent" : "#333333",
                                color: "#ffffff",
                                fontFamily: "system-ui, Inter, sans-serif",
                              }}
                              title={collaborator.name}
                            >
                              {collaborator.avatar ? (
                                <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                collaborator.initials
                              )}
                            </div>
                          ))}
                          {canvas.collaborators.length > 3 && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[#1a1a1a]"
                              style={{
                                backgroundColor: "#252525",
                                color: "#888888",
                                fontFamily: "system-ui, Inter, sans-serif",
                              }}
                            >
                              +{canvas.collaborators.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      {formatDate(canvas.updatedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <div
                className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="10" height="10" rx="2" stroke="#666666" strokeWidth="2"/>
                  <rect x="18" y="4" width="10" height="10" rx="2" stroke="#666666" strokeWidth="2"/>
                  <rect x="4" y="18" width="10" height="10" rx="2" stroke="#666666" strokeWidth="2"/>
                  <rect x="18" y="18" width="10" height="10" rx="2" stroke="#666666" strokeWidth="2"/>
                </svg>
              </div>
              <p
                className="text-gray-500 text-sm mb-4"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {activeView === "favorites" ? "No favorite canvases yet" : "No canvases yet"}
              </p>
              <button
                type="button"
                onClick={() => setShowNewCanvasDialog(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "#F0FE00",
                  color: "#121212",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                New canvas
              </button>
            </div>
          )}
              </div>
            ) : (
              /* Files Tree View */
              <div className="flex-1 overflow-y-auto p-6">
                {/* Projects with their canvases and files */}
                {projects.map((project) => (
                  <div key={project.id} className="mb-2">
                    {/* Project Row */}
                    <button
                      type="button"
                      onClick={() => toggleFilesProjectExpanded(project.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <svg 
                        width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform flex-shrink-0 ${expandedFilesProjects.has(project.id) ? "rotate-90" : ""}`}
                      >
                        <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                        <path d="M2 4.5C2 3.67157 2.67157 3 3.5 3H5.5L7 5H12.5C13.3284 5 14 5.67157 14 6.5V11.5C14 12.3284 13.3284 13 12.5 13H3.5C2.67157 13 2 12.3284 2 11.5V4.5Z" fill={project.color} fillOpacity="0.2" stroke={project.color} strokeWidth="1.5"/>
                      </svg>
                      <span className="truncate flex-1 text-left font-medium">{project.name}</span>
                      <span className="text-xs text-gray-500">{getProjectCanvases(project.id).length} canvases</span>
                    </button>

                    {/* Project's Canvases */}
                    {expandedFilesProjects.has(project.id) && (
                      <div className="ml-5 border-l border-gray-800 pl-2">
                        {getProjectCanvases(project.id).map((canvas) => (
                          <div key={canvas.id}>
                            {/* Canvas Row */}
                            <button
                              type="button"
                              onClick={() => toggleFilesCanvasExpanded(canvas.id)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-white/5 transition-colors"
                              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              <svg 
                                width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                                className={`transition-transform flex-shrink-0 ${expandedFilesCanvases.has(canvas.id) ? "rotate-90" : ""}`}
                              >
                                <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                                <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                              <span className="truncate flex-1 text-left">{canvas.name}</span>
                              <span className="text-xs text-gray-600">{getCanvasFiles(canvas).length} files</span>
                            </button>

                            {/* Canvas's Files */}
                            {expandedFilesCanvases.has(canvas.id) && (
                              <div className="ml-5 border-l border-gray-800 pl-2">
                                {getCanvasFiles(canvas).length === 0 ? (
                                  <div className="px-3 py-1.5 text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                    No files
                                  </div>
                                ) : (
                                  getCanvasFiles(canvas).map((node) => (
                                    <button
                                      key={node.id}
                                      type="button"
                                      onClick={() => onOpenCanvas(canvas.id)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                                        <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      <span className="truncate">{(node.data as { label?: string }).label || "Untitled"}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {getProjectCanvases(project.id).length === 0 && (
                          <div className="px-3 py-1.5 text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                            No canvases
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Ungrouped Canvases */}
                {getUngroupedCanvases().length > 0 && (
                  <div className="mb-2">
                    <div
                      className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      Ungrouped Canvases
                    </div>
                    {getUngroupedCanvases().map((canvas) => (
                      <div key={canvas.id}>
                        {/* Canvas Row */}
                        <button
                          type="button"
                          onClick={() => toggleFilesCanvasExpanded(canvas.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-white/5 transition-colors"
                          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                        >
                          <svg 
                            width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                            className={`transition-transform flex-shrink-0 ${expandedFilesCanvases.has(canvas.id) ? "rotate-90" : ""}`}
                          >
                            <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                            <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                          <span className="truncate flex-1 text-left">{canvas.name}</span>
                          <span className="text-xs text-gray-600">{getCanvasFiles(canvas).length} files</span>
                        </button>

                        {/* Canvas's Files */}
                        {expandedFilesCanvases.has(canvas.id) && (
                          <div className="ml-5 border-l border-gray-800 pl-2">
                            {getCanvasFiles(canvas).length === 0 ? (
                              <div className="px-3 py-1.5 text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                No files
                              </div>
                            ) : (
                              getCanvasFiles(canvas).map((node) => (
                                <button
                                  key={node.id}
                                  type="button"
                                  onClick={() => onOpenCanvas(canvas.id)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                                    <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  <span className="truncate">{(node.data as { label?: string }).label || "Untitled"}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {projects.length === 0 && canvases.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div
                      className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
                      style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                    >
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 8C4 6.34315 5.34315 5 7 5H11L14 8H21C22.6569 8 24 9.34315 24 11V20C24 21.6569 22.6569 23 21 23H7C5.34315 23 4 21.6569 4 20V8Z" stroke="#666666" strokeWidth="2"/>
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      No files yet
                    </p>
                    <p className="text-gray-600 text-xs" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      Create a canvas and upload files to see them here
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* New Canvas Dialog */}
      {showNewCanvasDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNewCanvasDialog(false)}
          />
          <div
            className="relative w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-semibold text-white"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                New Canvas
              </h2>
              <button
                type="button"
                onClick={() => setShowNewCanvasDialog(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs text-gray-500 mb-1.5"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  Canvas Name
                </label>
                <input
                  type="text"
                  placeholder="Untitled"
                  value={newCanvasName}
                  onChange={(e) => setNewCanvasName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCanvas()}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30"
                  style={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #333333",
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
                  autoFocus
                />
              </div>

              {/* Project Selection */}
              {projects.length > 0 && (
                <div>
                  <label
                    className="block text-xs text-gray-500 mb-1.5"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Project (Optional)
                  </label>
                  <select
                    value={newCanvasProjectId || ""}
                    onChange={(e) => setNewCanvasProjectId(e.target.value || undefined)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30 appearance-none cursor-pointer"
                    style={{
                      backgroundColor: "#0a0a0a",
                      border: "1px solid #333333",
                      fontFamily: "system-ui, Inter, sans-serif",
                    }}
                  >
                    <option value="">No project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  className="block text-xs text-gray-500 mb-1.5"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  Visibility
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCanvasVisibility("workspace")}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      newCanvasVisibility === "workspace"
                        ? "text-white"
                        : "text-gray-500"
                    }`}
                    style={{
                      backgroundColor: newCanvasVisibility === "workspace" ? "#333333" : "#0a0a0a",
                      border: "1px solid #333333",
                      fontFamily: "system-ui, Inter, sans-serif",
                    }}
                  >
                    Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCanvasVisibility("private")}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      newCanvasVisibility === "private"
                        ? "text-white"
                        : "text-gray-500"
                    }`}
                    style={{
                      backgroundColor: newCanvasVisibility === "private" ? "#333333" : "#0a0a0a",
                      border: "1px solid #333333",
                      fontFamily: "system-ui, Inter, sans-serif",
                    }}
                  >
                    Private
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowNewCanvasDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCanvas}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "#F0FE00",
                  color: "#121212",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowNewProjectDialog(false)}
          />
          <div
            className="relative w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-semibold text-white"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                New Project
              </h2>
              <button
                type="button"
                onClick={() => setShowNewProjectDialog(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs text-gray-500 mb-1.5"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="My Project"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30"
                  style={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #333333",
                    fontFamily: "system-ui, Inter, sans-serif",
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label
                  className="block text-xs text-gray-500 mb-1.5"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewProjectColor(color)}
                      className="w-8 h-8 rounded-lg transition-all"
                      style={{
                        backgroundColor: color,
                        border: newProjectColor === color ? "2px solid white" : "2px solid transparent",
                        transform: newProjectColor === color ? "scale(1.1)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowNewProjectDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "#F0FE00",
                  color: "#121212",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {canvasToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setCanvasToDelete(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-xl p-6"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H21M8 6V4C8 3.448 8.448 3 9 3H15C15.552 3 16 3.448 16 4V6M19 6V20C19 20.552 18.552 21 18 21H6C5.448 21 5 20.552 5 20V6H19Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-white text-center mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Delete Canvas
            </h2>
            <p className="text-gray-400 text-sm text-center mb-6" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Are you sure you want to delete &quot;{canvases.find(c => c.id === canvasToDelete)?.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCanvasToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{ backgroundColor: "#252525", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteCanvas(canvasToDelete)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:bg-red-600"
                style={{ backgroundColor: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Settings Dialog */}
      <WorkspaceSettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        settings={workspaceSettings}
        onSettingsChange={onWorkspaceSettingsChange}
      />

{/* Framework Preview Modal */}
        {viewingFramework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setViewingFramework(null)}
          />
          
          {/* Modal */}
          <div
            className="relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "#0f0f0f", border: "1px solid #2a2a2a" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid #222222" }}>
              <div className="flex items-center gap-4">
                {viewingFramework.createdBy.avatar ? (
                  <img
                    src={viewingFramework.createdBy.avatar}
                    alt={viewingFramework.createdBy.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: "#333333", color: "#ffffff" }}
                  >
                    {viewingFramework.createdBy.initials}
                  </div>
                )}
                <div>
                  <h2
                    className="text-white font-semibold text-lg"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    {viewingFramework.name}
                  </h2>
                  <p
                    className="text-gray-400 text-sm"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    by {viewingFramework.createdBy.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingFramework(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

{/* Preview Area */}
              <div className="flex-1 overflow-hidden relative min-h-[300px]">
                <CanvasPreview nodes={viewingFramework.nodes} />

              {/* Duplicate Banner */}
              <div 
                className="absolute bottom-0 left-0 right-0 p-4"
                style={{ 
                  background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)",
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(240, 254, 0, 0.15)" }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="6" width="11" height="11" rx="2" stroke="#F0FE00" strokeWidth="1.5"/>
                        <path d="M14 6V5C14 3.89543 13.1046 3 12 3H5C3.89543 3 3 3.89543 3 5V12C3 13.1046 3.89543 14 5 14H6" stroke="#F0FE00" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <div>
                      <p
                        className="text-white text-sm font-medium"
                        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        Want to edit this framework?
                      </p>
                      <p
                        className="text-gray-400 text-xs"
                        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        Duplicate it to your workspace to make changes
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDuplicateFramework(viewingFramework)}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#0a0a0a] transition-colors hover:opacity-90 flex items-center gap-2 flex-shrink-0"
                    style={{
                      backgroundColor: "#F0FE00",
                      fontFamily: "system-ui, Inter, sans-serif",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M11 5V4C11 3.17157 10.3284 2.5 9.5 2.5H4C3.17157 2.5 2.5 3.17157 2.5 4V9.5C2.5 10.3284 3.17157 11 4 11H5" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    Duplicate to Workspace
                  </button>
                </div>
              </div>
            </div>

            {/* Footer with details */}
            <div className="p-5" style={{ borderTop: "1px solid #222222" }}>
              <p
                className="text-gray-300 text-sm mb-4"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {viewingFramework.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {viewingFramework.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg text-xs"
                      style={{
                        backgroundColor: "#1a1a1a",
                        color: "#888888",
                        border: "1px solid #2a2a2a",
                        fontFamily: "system-ui, Inter, sans-serif",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center gap-1.5 text-sm text-gray-400"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M8 3L10 7H14L11 10L12 14L8 11.5L4 14L5 10L2 7H6L8 3Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {viewingFramework.upvotes} upvotes
                  </div>
                  <div
                    className="flex items-center gap-1.5 text-sm text-gray-400"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 2V9M7 9L4 6M7 9L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 11H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {viewingFramework.downloads} downloads
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sage AI Bot FAB */}
      <button
        type="button"
        onClick={() => setShowSageChat(!showSageChat)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 z-50"
        style={{
          backgroundColor: "#141414",
          border: "1px solid #2a2a2a",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        {showSageChat ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="#F0FE00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <img src="/sage-logo.svg" alt="Sage" className="w-7 h-7" />
        )}
      </button>

      {/* Sage Chat Panel */}
      {showSageChat && (
        <div
          className="fixed bottom-24 right-6 rounded-2xl overflow-hidden shadow-2xl z-50 flex"
          style={{
            backgroundColor: "#141414",
            border: "1px solid #2a2a2a",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            width: showChatHistory ? "600px" : "384px",
            transition: "width 0.2s ease-in-out",
          }}
        >
          {/* Chat History Sidebar */}
          {showChatHistory && (
            <div
              className="w-52 flex-shrink-0 flex flex-col"
              style={{ borderRight: "1px solid #2a2a2a" }}
            >
              <div className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid #2a2a2a" }}>
                <span className="text-xs font-medium text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Chat History
                </span>
                <button
                  onClick={handleNewChat}
                  className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  style={{ color: "#F0FE00", fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  + New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    No conversations yet
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        currentConversationId === conv.id ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                      onClick={() => handleSelectConversation(conv.id)}
                    >
                      <p
                        className="text-xs text-white truncate"
                        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        {conv.title}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 3h8M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M9 3v6.5a1 1 0 01-1 1H4a1 1 0 01-1-1V3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col" style={{ width: "384px" }}>
          {/* Chat Header */}
          <div
            className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Chat History"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={showChatHistory ? "#F0FE00" : "#888"} strokeWidth="1.5">
                <path d="M2 4h12M2 8h12M2 12h8" />
              </svg>
            </button>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#F0FE00" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2L12.09 7.26L18 8L14 12L15.18 18L10 15.27L4.82 18L6 12L2 8L7.91 7.26L10 2Z" fill="#121212"/>
              </svg>
            </div>
            <div className="flex-1">
              <h4
                className="text-white font-semibold text-sm"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Sage
              </h4>
              <p
                className="text-gray-500 text-xs"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                AI Design Assistant
              </p>
            </div>
            <button
              onClick={handleNewChat}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              title="New Chat"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#888" strokeWidth="1.5">
                <path d="M8 3v10M3 8h10" />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4">
            {/* Welcome message - always shown */}
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "#F0FE00" }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2L12.09 7.26L18 8L14 12L15.18 18L10 15.27L4.82 18L6 12L2 8L7.91 7.26L10 2Z" fill="#121212"/>
                </svg>
              </div>
              <div
                className="flex-1 p-3 rounded-xl rounded-tl-sm"
                style={{ backgroundColor: "#1e1e1e" }}
              >
                <p
                  className="text-sm text-gray-300 leading-relaxed"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  Hey! I&apos;m Sage, your AI design assistant. I can help you with:
                </p>
                <ul className="mt-2 space-y-1">
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "#F0FE00" }}>•</span> Organizing your design files
                  </li>
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "#F0FE00" }}>•</span> Finding assets across canvases
                  </li>
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "#F0FE00" }}>•</span> Project status summaries
                  </li>
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "#F0FE00" }}>•</span> Design system suggestions
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Dynamic messages */}
            {sageMessages.map((message) => (
              <div key={message.id} className="flex gap-3">
                {message.role === "assistant" ? (
                  <>
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: "#F0FE00" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2L12.09 7.26L18 8L14 12L15.18 18L10 15.27L4.82 18L6 12L2 8L7.91 7.26L10 2Z" fill="#121212"/>
                      </svg>
                    </div>
                    <div
                      className="flex-1 p-3 rounded-xl rounded-tl-sm"
                      style={{ backgroundColor: "#1e1e1e" }}
                    >
                      <p
                        className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
                        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        {message.parts?.map((part, i) => {
                          if (part.type === "text") return part.text;
                          return null;
                        }).filter(Boolean).join("") || (typeof message.content === "string" ? message.content : "")}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1" />
                    <div
                      className="p-3 rounded-xl rounded-tr-sm max-w-[80%]"
                      style={{ backgroundColor: "#F0FE0020", border: "1px solid #F0FE0040" }}
                    >
                      <p
                        className="text-sm text-white leading-relaxed"
                        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        {typeof message.content === "string" ? message.content : ""}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {sageStatus === "streaming" && (
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: "#F0FE00" }}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 2L12.09 7.26L18 8L14 12L15.18 18L10 15.27L4.82 18L6 12L2 8L7.91 7.26L10 2Z" fill="#121212"/>
                  </svg>
                </div>
                <div
                  className="flex-1 p-3 rounded-xl rounded-tl-sm"
                  style={{ backgroundColor: "#1e1e1e" }}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={handleSageSubmit}
            className="p-4"
            style={{ borderTop: "1px solid #2a2a2a" }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
            >
              <input
                type="text"
                value={sageInput}
                onChange={(e) => setSageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && sageInput.trim() && sageStatus !== "streaming") {
                    e.preventDefault();
                    handleSageSubmit(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Ask Sage anything..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                disabled={sageStatus === "streaming"}
              />
              <button
                type="submit"
                disabled={!sageInput.trim() || sageStatus === "streaming"}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                style={{ backgroundColor: sageInput.trim() ? "#F0FE00" : "#333333" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14 2L7 9M14 2L10 14L7 9M14 2L2 6L7 9"
                    stroke={sageInput.trim() ? "#121212" : "#666666"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </form>
          </div>
        </div>
      )}
    </div>
  );
}
