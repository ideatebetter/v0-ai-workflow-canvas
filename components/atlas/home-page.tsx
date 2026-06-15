"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import type { Canvas, CanvasVisibility, WorkspaceSettings, AtlasNode, CanvasFramework, FrameworkCategory, Project, FileNodeData } from "@/lib/atlas-types";
import { WorkspaceSettingsDialog } from "./workspace-settings";
import { FileDetailModal } from "./file-detail-modal";
import { FrameworkDetailPage, type ParamValues } from "./framework-detail-page";
import { parsePDFToText, splitIntoSections } from "@/lib/pdf-parser";
import { INITIAL_CANVASES, DEFAULT_WORKSPACE_SETTINGS, PRODUCT_COLORS, FRAMEWORK_CATEGORIES, PROJECT_COLORS } from "@/lib/atlas-types";
import { LOGO_SPRINT_FRAMEWORK } from "@/lib/logo-sprint-framework";
import { ReactFlow, Background, useNodesState, useEdgesState, ReactFlowProvider } from "@xyflow/react";
import { FileNode } from "./file-node";
import { CanvasPreview } from "./canvas-preview";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSageConversations, useSageConversation, useSageChatPersistence } from "@/lib/use-sage-conversations";
import "@xyflow/react/dist/style.css";

type SidebarFilter = "all" | "workspace" | "private";
type HomeView = "home" | "canvases" | "community" | "frameworks" | "workspace-canvas" | "settings" | "all-files" | "todos";
type FrameworksFilter = "all" | "mine" | "team" | "drafts";
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
    <div className="w-full h-full bg-background">
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
        <Background className="[&>pattern>circle]:fill-muted-foreground/30" gap={20} />
        
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
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 bg-card border border-border text-foreground"
              style={{
                fontFamily: "system-ui, Inter, sans-serif",
              }}
            >
              {group.canvasName}
              <span className="ml-2 text-muted-foreground">({group.nodeCount})</span>
            </button>
          </div>
        ))}
      </ReactFlow>
      
      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-card border border-border"
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
        <Link
          href="/auth/change-password"
          className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          title="Change password"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </Link>
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

const DEMO_EMAIL = "rahmi@ideatebetter.com";

interface HomePageProps {
  onOpenCanvas: (canvasId: string) => void;
  workspaceSettings: WorkspaceSettings;
  onWorkspaceSettingsChange: (settings: WorkspaceSettings) => void;
  workspaces?: WorkspaceSettings[];
  activeWorkspaceId?: string;
  onWorkspaceSwitch?: (workspaceId: string) => void;
  onWorkspaceCreate?: (name: string) => void;
  onDeleteWorkspace?: () => void;
  canvases: Canvas[];
  onCanvasesChange: (canvases: Canvas[]) => void;
  frameworks?: CanvasFramework[];
  onFrameworksChange?: (frameworks: CanvasFramework[]) => void;
  onRemoveFramework?: (frameworkId: string) => void;
  onSaveAllToCloud?: () => void;
  isLoadingCanvases?: boolean;
  userEmail?: string;
}

export function HomePage({ onOpenCanvas, workspaceSettings, onWorkspaceSettingsChange, workspaces = [], activeWorkspaceId, onWorkspaceSwitch, onWorkspaceCreate, onDeleteWorkspace, canvases, onCanvasesChange, frameworks: externalFrameworks, onFrameworksChange, onRemoveFramework, onSaveAllToCloud, isLoadingCanvases, userEmail }: HomePageProps) {
  const isDemoAccount = userEmail === DEMO_EMAIL;
  const onSettingsChange = onWorkspaceSettingsChange;
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateWorkspaceDialog, setShowCreateWorkspaceDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
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
  const [allFilesCollapsedCollections, setAllFilesCollapsedCollections] = useState<Set<string>>(new Set());
  const [allFilesExpandedCanvases, setAllFilesExpandedCanvases] = useState<Set<string>>(new Set());
  const [fileDetail, setFileDetail] = useState<{ nodeId: string; canvasId: string } | null>(null);
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
            workspaceId: activeWorkspaceId,
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
  const [localFrameworks, setLocalFrameworks] = useState<CanvasFramework[]>([LOGO_SPRINT_FRAMEWORK]);
  const frameworks = externalFrameworks ?? localFrameworks;
  const setFrameworks = onFrameworksChange ?? setLocalFrameworks;
  const [selectedCategory, setSelectedCategory] = useState<FrameworkCategory | "all">("all");
  const [frameworksFilter, setFrameworksFilter] = useState<FrameworksFilter>("all");
  const [viewingFramework, setViewingFramework] = useState<CanvasFramework | null>(null);
  const [selectedRibbonDay, setSelectedRibbonDay] = useState<number>(17); // Today is index 17
  const [ribbonViewMode, setRibbonViewMode] = useState<"ribbon" | "calendar">("ribbon");
  const [todosSectionCollapsed, setTodosSectionCollapsed] = useState(false);
  const [ribbonMinimized, setRibbonMinimized] = useState(false);
  const currentUserId = workspaceSettings.members[0]?.id || "user-1";

  // Canvases with no workspaceId are legacy — treat them as belonging to the first workspace
  const primaryWorkspaceId = workspaces[0]?.id ?? activeWorkspaceId;

  // All canvases scoped to the active workspace (used for every display operation below)
  const workspaceCanvases = useMemo(() =>
    canvases.filter(c => (c.workspaceId ?? primaryWorkspaceId) === activeWorkspaceId),
    [canvases, primaryWorkspaceId, activeWorkspaceId]
  );

  // Collect all todos from workspace canvases (all pages), keyed by the date they were created (YYYY-MM-DD)
  const todosByDate = useMemo(() => {
    const map: Record<string, Array<{ task: import("@/lib/atlas-types").TaskItem; fileName: string; canvasName: string; canvasId: string; nodeId: string }>> = {};
    const today = new Date().toISOString().slice(0, 10);
    workspaceCanvases.forEach(canvas => {
      // Collect nodes from all pages (or from canvas.nodes for single-page canvases)
      const allNodes = canvas.pages && canvas.pages.length > 0
        ? canvas.pages.flatMap(p => p.nodes)
        : canvas.nodes;
      allNodes.forEach(node => {
        const data = node.data as import("@/lib/atlas-types").FileNodeData;
        if (!Array.isArray(data?.tasks)) return;
        data.tasks.forEach(task => {
          const day = task.dueDate ?? (task.createdAt ? task.createdAt.slice(0, 10) : today);
          if (!map[day]) map[day] = [];
          map[day].push({ task, fileName: data.label || data.fileName || "Untitled", canvasName: canvas.name, canvasId: canvas.id, nodeId: node.id });
        });
      });
    });
    return map;
  }, [workspaceCanvases]);

  // All todos flat list (for All To-Dos page)
  const allTodosFlat = useMemo(() => {
    const list: Array<{ task: import("@/lib/atlas-types").TaskItem; fileName: string; canvasName: string; canvasId: string; nodeId: string; projectName: string; projectId: string | undefined }> = [];
    workspaceCanvases.forEach(canvas => {
      const project = projects.find(p => p.id === canvas.projectId);
      const allNodes = canvas.pages && canvas.pages.length > 0
        ? canvas.pages.flatMap(p => p.nodes)
        : canvas.nodes;
      allNodes.forEach(node => {
        const data = node.data as import("@/lib/atlas-types").FileNodeData;
        if (!Array.isArray(data?.tasks)) return;
        data.tasks.forEach(task => {
          list.push({ task, fileName: data.label || data.fileName || "Untitled", canvasName: canvas.name, canvasId: canvas.id, nodeId: node.id, projectName: project?.name || "No Collection", projectId: canvas.projectId });
        });
      });
    });
    return list;
  }, [workspaceCanvases, projects]);

  // Toggle task completion across canvases (handles multi-page nodes too)
  const handleToggleTask = useCallback((canvasId: string, nodeId: string, taskId: string) => {
    const toggleNode = (n: import("@/lib/atlas-types").AtlasNode) => {
      if (n.id !== nodeId) return n;
      const data = n.data as import("@/lib/atlas-types").FileNodeData;
      return { ...n, data: { ...data, tasks: (data.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) } };
    };
    onCanvasesChange(canvases.map(c => {
      if (c.id !== canvasId) return c;
      return {
        ...c,
        nodes: c.nodes.map(toggleNode),
        pages: c.pages?.map(p => ({ ...p, nodes: p.nodes.map(toggleNode) })),
      };
    }));
  }, [canvases, onCanvasesChange]);

  // All file-type nodes across workspace canvases, for the global todo file picker
  const allFileNodes = useMemo(() => {
    const list: Array<{ canvasId: string; canvasName: string; nodeId: string; fileName: string }> = [];
    workspaceCanvases.forEach(canvas => {
      const nodes = canvas.pages && canvas.pages.length > 0
        ? canvas.pages.flatMap(p => p.nodes)
        : canvas.nodes;
      nodes.forEach(node => {
        if (node.type !== "file") return;
        const data = node.data as import("@/lib/atlas-types").FileNodeData;
        list.push({ canvasId: canvas.id, canvasName: canvas.name, nodeId: node.id, fileName: data.label || data.fileName || "Untitled" });
      });
    });
    return list;
  }, [workspaceCanvases]);

  // 28-day ribbon: green every day, turns yellow on days that have tasks due
  const ribbonDays = useMemo(() => {
    const todayIndex = 17;
    const today = new Date();
    return Array.from({ length: 28 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - todayIndex + i);
      const dateStr = date.toISOString().slice(0, 10);
      const tasksOnDay = todosByDate[dateStr] ?? [];
      const isFuture = i > todayIndex;
      if (tasksOnDay.length === 0) {
        return { status: "smooth", title: "All Clear", description: "No deadlines", tags: [] as string[], isFuture };
      }
      const names = tasksOnDay.slice(0, 3).map(t => (t.task as any).text || t.fileName);
      return {
        status: "minor",
        title: `${tasksOnDay.length} task${tasksOnDay.length > 1 ? "s" : ""} due`,
        description: names.join(", "),
        tags: names.slice(0, 2),
        isFuture,
      };
    });
  }, [todosByDate]);

  const handleAddGlobalTodo = useCallback((canvasId: string, nodeId: string, task: import("@/lib/atlas-types").TaskItem) => {
    const addToNode = (n: import("@/lib/atlas-types").AtlasNode) => {
      if (n.id !== nodeId) return n;
      const data = n.data as import("@/lib/atlas-types").FileNodeData;
      return { ...n, data: { ...data, tasks: [...(data.tasks || []), task] } };
    };
    onCanvasesChange(canvases.map(c => {
      if (c.id !== canvasId) return c;
      return {
        ...c,
        nodes: c.nodes.map(addToNode),
        pages: c.pages?.map(p => ({ ...p, nodes: p.nodes.map(addToNode) })),
      };
    }));
  }, [canvases, onCanvasesChange]);

  // Combine all workspace nodes with canvas grouping
  const workspaceNodesData = useMemo(() => {
    const visibleCanvases = workspaceCanvases.filter(c => c.visibility === "workspace");
    const allNodes: AtlasNode[] = [];
    const canvasGroups: { canvasId: string; canvasName: string; startX: number; nodeCount: number }[] = [];
    
    let currentX = 0;
    const groupSpacing = 400;
    const nodeSpacing = 280;
    
    visibleCanvases.forEach((canvas) => {
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
  }, [workspaceCanvases, activeWorkspaceId]);

  const filteredCanvases = useMemo(() => {
    // Only show canvases belonging to the active workspace
    // (legacy canvases with no workspaceId belong to the first/primary workspace)
    let filtered = canvases.filter(c => {
      const cWorkspace = c.workspaceId ?? primaryWorkspaceId;
      return cWorkspace === activeWorkspaceId;
    });

    // Apply sidebar filter
    if (sidebarFilter === "workspace") {
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

    // Sort: favorites first, then by most recently updated
    return filtered.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [canvases, sidebarFilter, searchQuery]);

  const handleCreateCanvas = () => {
    if (!newCanvasName.trim()) return;

    const newCanvas: Canvas = {
      id: `canvas-${Date.now()}`,
      name: newCanvasName.trim(),
      projectId: newCanvasProjectId,
      workspaceId: activeWorkspaceId,
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

  // Load collections from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem("atlas-collections");
      if (stored) setProjects(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Persist collections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("atlas-collections", JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

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

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
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
    return canvases
      .filter(c => {
        const cWorkspace = c.workspaceId ?? primaryWorkspaceId;
        return c.projectId === projectId && cWorkspace === activeWorkspaceId;
      })
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  };

  const getUngroupedCanvases = () => {
    return canvases
      .filter(c => {
        const cWorkspace = c.workspaceId ?? primaryWorkspaceId;
        return !c.projectId && cWorkspace === activeWorkspaceId;
      })
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
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
  const [todoFilterStatus, setTodoFilterStatus] = useState<"all" | "completed" | "incomplete">("all");
  const [todoFilterCanvas, setTodoFilterCanvas] = useState<string>("all");
  const [todoFilterProject, setTodoFilterProject] = useState<string>("all");
  const [todoFilterUser, setTodoFilterUser] = useState<string>("all");
  const [todoFilterDate, setTodoFilterDate] = useState<string>("all");
  const [showNewGlobalTodo, setShowNewGlobalTodo] = useState(false);
  const [newGlobalTodoTitle, setNewGlobalTodoTitle] = useState("");
  const [newGlobalTodoNodeId, setNewGlobalTodoNodeId] = useState<string>("");
  const [newGlobalTodoCanvasId, setNewGlobalTodoCanvasId] = useState<string>("");
  const [newGlobalTodoDueDate, setNewGlobalTodoDueDate] = useState<string>("");
  const [newGlobalTodoAssigneeId, setNewGlobalTodoAssigneeId] = useState<string>("");
  const [collectionMenuCanvasId, setCollectionMenuCanvasId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const deleteCanvas = (canvasId: string) => {
    onCanvasesChange(canvases.filter((c) => c.id !== canvasId));
    setCanvasToDelete(null);
  };

  const handleSetCanvasCollection = (canvasId: string, projectId: string | undefined) => {
    onCanvasesChange(canvases.map(c => c.id === canvasId ? { ...c, projectId } : c));
    setCollectionMenuCanvasId(null);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    onCanvasesChange(canvases.map(c => c.projectId === projectId ? { ...c, projectId: undefined } : c));
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
      workspaceId: activeWorkspaceId,
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

  const handleRunFromDetail = async (framework: CanvasFramework, paramValues: ParamValues) => {
    const ts = Date.now();
    // Always close the detail page and open the canvas — even if PDF parsing fails
    let committedCanvasId: string | null = null;
    try {
    const stringValues: Record<string, string> = {};
    Object.entries(paramValues).forEach(([k, v]) => {
      if (typeof v === "string") stringValues[k] = v;
    });

    // Apply {{param}} substitution (string params only)
    const substituteParams = (nodes: CanvasFramework["nodes"]) =>
      nodes.map((node) => {
        let dataStr = JSON.stringify(node.data);
        Object.entries(stringValues).forEach(([paramId, val]) => {
          const escaped = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          dataStr = dataStr.split(`{{${paramId}}}`).join(escaped);
        });
        return { ...node, data: JSON.parse(dataStr) };
      });

    const idMap = new Map<string, string>();
    // First pass: build the ID map so presentation groups can remap their nodeIds
    framework.nodes.forEach((n, i) => {
      idMap.set(n.id, `fw-${ts}-${i}`);
    });
    const baseNodes = substituteParams(framework.nodes).map((n, i) => {
      const newId = `fw-${ts}-${i}`;
      const data = n.data as Record<string, unknown>;
      // Remap nodeIds inside presentation group nodes to the new IDs
      const remappedData = n.type === "presentationGroup" && Array.isArray(data.nodeIds)
        ? { ...data, nodeIds: (data.nodeIds as string[]).map(id => idMap.get(id) ?? id) }
        : data;
      return { ...n, id: newId, data: remappedData };
    });

    const newEdges = framework.edges.map((e) => ({
      ...e,
      id: `fwe-${ts}-${Math.random().toString(36).slice(2, 7)}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));

    // Extra nodes generated from uploaded files
    const extraNodes: CanvasFramework["nodes"] = [];
    const extraEdges: CanvasFramework["edges"] = [];

    // Helper: create text nodes from PDF sections — prefix avoids key collisions between multiple PDFs
    const makePDFNodes = async (
      file: File,
      startX: number,
      startY: number,
      textType: "brief" | "description",
      prefix: string,
    ) => {
      try {
        const pages = await parsePDFToText(file);
        const fullText = pages.map((p) => p.text).join("\n\n");
        const sections = splitIntoSections(fullText, 8);
        const now = new Date().toISOString();
        sections.forEach((section, idx) => {
          const nodeId = `fw-${prefix}-${ts}-${idx}`;
          extraNodes.push({
            id: nodeId,
            type: "text",
            position: { x: startX, y: startY + idx * 260 },
            selected: false,
            data: {
              label: `${file.name.replace(".pdf", "")} — Section ${idx + 1}`,
              content: section,
              textType,
              lastModified: now,
            },
          } as CanvasFramework["nodes"][0]);
          if (idx > 0) {
            extraEdges.push({
              id: `fwe-${prefix}-${ts}-${idx}`,
              source: `fw-${prefix}-${ts}-${idx - 1}`,
              target: nodeId,
              type: "default",
            });
          }
        });
      } catch {
        // PDF parse failed — silently skip
      }
    };

    // Handle strategy PDF
    const strategyPDF = paramValues["strategy_pdf"];
    if (strategyPDF instanceof File && strategyPDF.name.endsWith(".pdf")) {
      await makePDFNodes(strategyPDF, -600, 280, "brief", "strategy");
    }

    // Handle brief PDF
    const briefPDF = paramValues["brief_pdf"];
    if (briefPDF instanceof File && briefPDF.name.endsWith(".pdf")) {
      await makePDFNodes(briefPDF, -600, 2000, "brief", "brief");
    }

    // Handle logo file — inject as the logo node's preview image
    const logoFile = paramValues["logo_file"];
    let logoDataUrl: string | undefined;
    if (logoFile instanceof File) {
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(logoFile);
      });
    }

    const allNodes = [
      ...baseNodes.map((n) => {
        // Inject logo preview if this is the logo file node
        if (logoDataUrl && n.data && (n.data as Record<string, unknown>).fileExtension === ".ai") {
          return {
            ...n,
            data: {
              ...(n.data as Record<string, unknown>),
              previewImages: [logoDataUrl],
              fileName: logoFile instanceof File ? logoFile.name : "brand-logo",
            },
          };
        }
        return n;
      }),
      ...extraNodes,
    ];

    // Remap presentation flows: replace framework node IDs with the new canvas node IDs
    const remappedFlows = (framework.presentationFlows ?? []).map(flow => ({
      ...flow,
      id: `${flow.id}-${ts}`,
      edges: flow.edges.map(e => ({
        ...e,
        id: `${e.id}-${ts}`,
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
      })),
      groups: flow.groups.map(g => ({
        ...g,
        nodeIds: g.nodeIds.map(id => idMap.get(id) ?? id),
        originalNodes: g.originalNodes.map(orig => ({
          ...orig,
          id: idMap.get(orig.id) ?? orig.id,
        })),
      })),
    }));

    const newCanvas: Canvas = {
      id: `canvas-${ts}`,
      name: stringValues["brand_name"] ? `${stringValues["brand_name"]} — Logo Sprint` : framework.name,
      description: framework.description,
      previewImage: framework.previewImage,
      workspaceId: activeWorkspaceId,
      nodes: allNodes,
      edges: [...newEdges, ...extraEdges],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: workspaceSettings.members[0],
      isFavorite: false,
      visibility: "workspace",
      presentationFlows: remappedFlows.length > 0 ? remappedFlows : undefined,
    };
      onCanvasesChange([...canvases, newCanvas]);
      setFrameworks(prev => prev.map(f =>
        f.id === framework.id ? { ...f, downloads: f.downloads + 1 } : f
      ));
      committedCanvasId = newCanvas.id;
    } catch (err) {
      console.error("[framework] run failed, opening with base nodes only", err);
      // Fall back: create canvas with just the substituted framework nodes (no PDF extras)
      const fallbackTs = Date.now();
      const fallbackIdMap = new Map<string, string>();
      const fallbackNodes = framework.nodes.map((n, i) => {
        const newId = `fw-${fallbackTs}-${i}`;
        fallbackIdMap.set(n.id, newId);
        return { ...n, id: newId };
      });
      const fallbackEdges = framework.edges.map((e) => ({
        ...e,
        id: `fwe-${fallbackTs}-${Math.random().toString(36).slice(2, 7)}`,
        source: fallbackIdMap.get(e.source) ?? e.source,
        target: fallbackIdMap.get(e.target) ?? e.target,
      }));
      const fallbackCanvas: Canvas = {
        id: `canvas-${fallbackTs}`,
        name: framework.name,
        description: framework.description,
        previewImage: framework.previewImage,
        workspaceId: activeWorkspaceId,
        nodes: fallbackNodes,
        edges: fallbackEdges,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: workspaceSettings.members[0],
        isFavorite: false,
        visibility: "workspace",
      };
      onCanvasesChange([...canvases, fallbackCanvas]);
      committedCanvasId = fallbackCanvas.id;
    } finally {
      setViewingFramework(null);
      if (committedCanvasId) onOpenCanvas(committedCanvasId);
    }
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

  // Frameworks page: all user-owned frameworks with optional filter
  const filteredMyFrameworks = useMemo(() => {
    return frameworks.filter(f => {
      if (frameworksFilter === "mine") return f.visibility === "private" || f.createdBy?.id === currentUserId;
      if (frameworksFilter === "team") return f.visibility === "workspace";
      if (frameworksFilter === "drafts") return f.isPublished === false;
      // "all" — show everything available (own frameworks + team + community templates)
      return true;
    }).filter(f => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
    });
  }, [frameworks, frameworksFilter, searchQuery, currentUserId]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const timeAgo = (dateString: string) => {
    if (!dateString) return "";
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Sidebar */}
      <div
        className="w-64 flex flex-col border-r"
        style={{ backgroundColor: "#111111", borderColor: "#222222" }}
      >
        {/* Workspace Header */}
        <div className="p-4 border-b relative" style={{ borderColor: "#222222" }}>
          <button
            type="button"
            onClick={() => setShowWorkspaceSwitcher(prev => !prev)}
            className="w-full flex items-center gap-3 rounded-lg hover:bg-white/5 transition-colors -mx-1 px-1 py-1"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0"
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
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-white truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {workspaceSettings.name}
              </div>
              <div className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {workspaceSettings.members.length} Member{workspaceSettings.members.length !== 1 ? "s" : ""}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-gray-500">
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Workspace Switcher Dropdown */}
          {showWorkspaceSwitcher && (
            <div className="fixed inset-0 z-40" onClick={() => setShowWorkspaceSwitcher(false)} />
          )}
          {showWorkspaceSwitcher && (
            <div
              className="absolute left-2 right-2 top-full mt-1 rounded-xl border z-50 py-1 shadow-xl"
              style={{ backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" }}
            >
              <div className="px-3 py-1.5">
                <span className="text-[11px] text-gray-600 uppercase tracking-wide">Workspaces</span>
              </div>
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    onWorkspaceSwitch?.(ws.id);
                    setShowWorkspaceSwitcher(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: "#F0FE00", color: "#121212" }}
                  >
                    {ws.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{ws.name}</div>
                    <div className="text-xs text-gray-500">{ws.members.length} member{ws.members.length !== 1 ? "s" : ""}</div>
                  </div>
                  {ws.id === activeWorkspaceId && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-yellow-400">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
              <div className="border-t my-1" style={{ borderColor: "#2a2a2a" }} />
              <button
                type="button"
                onClick={() => {
                  setShowWorkspaceSwitcher(false);
                  setShowCreateWorkspaceDialog(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-md flex items-center justify-center border border-dashed flex-shrink-0" style={{ borderColor: "#444" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2.5V9.5M2.5 6H9.5" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-sm text-gray-400">Create workspace</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* Main Nav */}
          <nav className="space-y-0.5 mb-6">
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
              onClick={() => setActiveView("all-files")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "all-files" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4C2 2.89543 2.89543 2 4 2H8L10 4H14C15.1046 4 16 4.89543 16 6V14C16 15.1046 15.1046 16 14 16H4C2.89543 16 2 15.1046 2 14V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 10H12M9 7V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              All Files
            </button>
            <button
              type="button"
              onClick={() => setActiveView("todos")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "todos" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5.5 7L7 8.5L10.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.5 11H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              All To-Dos
              {allTodosFlat.filter(d => !d.task.completed).length > 0 && (
                <span className="ml-auto text-xs rounded-full px-1.5 py-0.5" style={{ backgroundColor: "#2a2a2a", color: "#888", fontFamily: "system-ui, Inter, sans-serif" }}>
                  {allTodosFlat.filter(d => !d.task.completed).length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveView("frameworks")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "frameworks" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Frameworks
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

          {/* Workspace / Private filters */}
          <div className="mb-6">
            <div
              className="px-3 pb-1.5 pt-2 text-[11px] font-medium text-gray-600 tracking-wide uppercase"
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
              className="px-3 pb-1.5 pt-2 text-[11px] font-medium text-gray-600 tracking-wide uppercase"
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
            {activeView === "all-files" && "All Files"}
            {activeView === "frameworks" && "Frameworks"}
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
                        <div className="font-medium">New Collection</div>
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

        {activeView === "todos" ? (
          /* All To-Dos page */
          (() => {
            const today = new Date().toISOString().slice(0, 10);
            const members = workspaceSettings.members || [];
            let displayed = allTodosFlat;
            if (todoFilterStatus === "completed") displayed = displayed.filter(d => d.task.completed);
            if (todoFilterStatus === "incomplete") displayed = displayed.filter(d => !d.task.completed);
            if (todoFilterCanvas !== "all") displayed = displayed.filter(d => d.canvasId === todoFilterCanvas);
            if (todoFilterProject !== "all") displayed = displayed.filter(d => (d.projectId ?? "none") === todoFilterProject);
            if (todoFilterUser !== "all") displayed = displayed.filter(d => d.task.assignee?.id === todoFilterUser);
            if (todoFilterDate === "today") displayed = displayed.filter(d => (d.task.dueDate ?? today) === today);
            else if (todoFilterDate === "overdue") displayed = displayed.filter(d => d.task.dueDate && d.task.dueDate < today && !d.task.completed);
            else if (todoFilterDate === "upcoming") displayed = displayed.filter(d => d.task.dueDate && d.task.dueDate > today);
            else if (todoFilterDate === "no-date") displayed = displayed.filter(d => !d.task.dueDate);

            const uniqueCanvases = Array.from(new Map(canvases.map(c => [c.id, c])).values());
            const uniqueProjects = projects;

            return (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4" style={{ borderBottom: "1px solid #222222" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>All To-Dos</h2>
                    <button
                      type="button"
                      onClick={() => { setShowNewGlobalTodo(v => !v); setNewGlobalTodoTitle(""); setNewGlobalTodoNodeId(""); setNewGlobalTodoCanvasId(""); setNewGlobalTodoDueDate(""); setNewGlobalTodoAssigneeId(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ backgroundColor: showNewGlobalTodo ? "#F0FE00" : "#1a1a1a", color: showNewGlobalTodo ? "#000" : "#aaa", fontFamily: "system-ui, Inter, sans-serif", border: "1px solid " + (showNewGlobalTodo ? "transparent" : "#2a2a2a") }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      New To-Do
                    </button>
                  </div>

                  {/* New To-Do Form */}
                  {showNewGlobalTodo && (
                    <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}>
                      <div className="flex flex-col gap-3">
                        {/* Title */}
                        <input
                          type="text"
                          autoFocus
                          placeholder="To-do title"
                          value={newGlobalTodoTitle}
                          onChange={e => setNewGlobalTodoTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Escape") setShowNewGlobalTodo(false);
                          }}
                          className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none"
                          style={{ fontFamily: "system-ui, Inter, sans-serif", borderBottom: "1px solid #2a2a2a", paddingBottom: "8px" }}
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          {/* File picker */}
                          <div className="flex-1 min-w-[180px]">
                            <select
                              value={newGlobalTodoNodeId ? `${newGlobalTodoCanvasId}||${newGlobalTodoNodeId}` : ""}
                              onChange={e => {
                                const [cId, nId] = e.target.value.split("||");
                                setNewGlobalTodoCanvasId(cId || "");
                                setNewGlobalTodoNodeId(nId || "");
                              }}
                              className="w-full px-3 py-2 rounded-lg text-xs border-0 outline-none"
                              style={{ backgroundColor: "#1a1a1a", color: newGlobalTodoNodeId ? "#fff" : "#666", fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              <option value="">Assign to a file…</option>
                              {allFileNodes.map(f => (
                                <option key={`${f.canvasId}||${f.nodeId}`} value={`${f.canvasId}||${f.nodeId}`}>
                                  {f.fileName} · {f.canvasName}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Due date */}
                          <input
                            type="date"
                            value={newGlobalTodoDueDate}
                            onChange={e => setNewGlobalTodoDueDate(e.target.value)}
                            className="px-3 py-2 rounded-lg text-xs border-0 outline-none"
                            style={{ backgroundColor: "#1a1a1a", color: newGlobalTodoDueDate ? "#fff" : "#666", fontFamily: "system-ui, Inter, sans-serif", colorScheme: "dark" }}
                          />
                          {/* Assignee */}
                          {workspaceSettings.members?.length > 0 && (
                            <select
                              value={newGlobalTodoAssigneeId}
                              onChange={e => setNewGlobalTodoAssigneeId(e.target.value)}
                              className="px-3 py-2 rounded-lg text-xs border-0 outline-none"
                              style={{ backgroundColor: "#1a1a1a", color: newGlobalTodoAssigneeId ? "#fff" : "#666", fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              <option value="">Assignee</option>
                              {workspaceSettings.members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={!newGlobalTodoTitle.trim() || !newGlobalTodoNodeId}
                            onClick={() => {
                              const assignee = workspaceSettings.members?.find(m => m.id === newGlobalTodoAssigneeId) || undefined;
                              const task: import("@/lib/atlas-types").TaskItem = {
                                id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                title: newGlobalTodoTitle.trim(),
                                completed: false,
                                assignee,
                                createdAt: new Date().toISOString(),
                                dueDate: newGlobalTodoDueDate || undefined,
                              };
                              handleAddGlobalTodo(newGlobalTodoCanvasId, newGlobalTodoNodeId, task);
                              setNewGlobalTodoTitle("");
                              setNewGlobalTodoNodeId("");
                              setNewGlobalTodoCanvasId("");
                              setNewGlobalTodoDueDate("");
                              setNewGlobalTodoAssigneeId("");
                              setShowNewGlobalTodo(false);
                            }}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-opacity"
                            style={{ backgroundColor: "#F0FE00", color: "#000", fontFamily: "system-ui, Inter, sans-serif", opacity: (!newGlobalTodoTitle.trim() || !newGlobalTodoNodeId) ? 0.4 : 1 }}
                          >
                            Add To-Do
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNewGlobalTodo(false)}
                            className="px-4 py-1.5 rounded-lg text-xs transition-colors"
                            style={{ color: "#666", fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filter Bar */}
                  <div className="flex flex-wrap gap-2">
                    {/* Status filter */}
                    <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                      {(["all", "incomplete", "completed"] as const).map(s => (
                        <button key={s} type="button" onClick={() => setTodoFilterStatus(s)}
                          className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                          style={{ backgroundColor: todoFilterStatus === s ? "#2a2a2a" : "transparent", color: todoFilterStatus === s ? "#fff" : "#888", fontFamily: "system-ui, Inter, sans-serif" }}
                        >
                          {s === "all" ? "All" : s === "incomplete" ? "Open" : "Done"}
                        </button>
                      ))}
                    </div>
                    {/* Collection filter */}
                    {uniqueProjects.length > 0 && (
                      <select value={todoFilterProject} onChange={e => setTodoFilterProject(e.target.value)}
                        className="px-3 py-1 rounded-lg text-xs border-0 outline-none"
                        style={{ backgroundColor: "#1a1a1a", color: todoFilterProject === "all" ? "#888" : "#fff", fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        <option value="all">All Collections</option>
                        {uniqueProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="none">No Collection</option>
                      </select>
                    )}
                    {/* Canvas filter */}
                    <select value={todoFilterCanvas} onChange={e => setTodoFilterCanvas(e.target.value)}
                      className="px-3 py-1 rounded-lg text-xs border-0 outline-none"
                      style={{ backgroundColor: "#1a1a1a", color: todoFilterCanvas === "all" ? "#888" : "#fff", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <option value="all">All Canvases</option>
                      {uniqueCanvases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {/* User filter */}
                    {members.length > 0 && (
                      <select value={todoFilterUser} onChange={e => setTodoFilterUser(e.target.value)}
                        className="px-3 py-1 rounded-lg text-xs border-0 outline-none"
                        style={{ backgroundColor: "#1a1a1a", color: todoFilterUser === "all" ? "#888" : "#fff", fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        <option value="all">All Users</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    )}
                    {/* Date filter */}
                    <select value={todoFilterDate} onChange={e => setTodoFilterDate(e.target.value)}
                      className="px-3 py-1 rounded-lg text-xs border-0 outline-none"
                      style={{ backgroundColor: "#1a1a1a", color: todoFilterDate === "all" ? "#888" : "#fff", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <option value="all">Any Date</option>
                      <option value="today">Today</option>
                      <option value="overdue">Overdue</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="no-date">No Due Date</option>
                    </select>
                    {/* Clear filters */}
                    {(todoFilterStatus !== "all" || todoFilterCanvas !== "all" || todoFilterProject !== "all" || todoFilterUser !== "all" || todoFilterDate !== "all") && (
                      <button type="button" onClick={() => { setTodoFilterStatus("all"); setTodoFilterCanvas("all"); setTodoFilterProject("all"); setTodoFilterUser("all"); setTodoFilterDate("all"); }}
                        className="px-3 py-1 rounded-lg text-xs transition-colors"
                        style={{ color: "#888", fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
                {/* Todo List */}
                <div className="flex-1 overflow-y-auto">
                  {displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="4" width="20" height="20" rx="3" stroke="#444" strokeWidth="2"/><path d="M9 14l3 3 7-7" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div className="text-white font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No to-dos found</div>
                      <div className="text-gray-500 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Add to-dos on files in your canvases</div>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "#1a1a1a" }}>
                      {displayed.map(({ task, fileName, canvasName, canvasId, nodeId, projectName }) => {
                        const dueDateColor = task.dueDate
                          ? task.dueDate < today && !task.completed ? "#F87171"
                          : task.dueDate === today ? "#F0FE00"
                          : task.dueDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10) ? "#FB923C"
                          : "#888"
                          : "#888";
                        const dueDateLabel = task.dueDate
                          ? task.dueDate === today ? "Today"
                          : task.dueDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10) ? "Tomorrow"
                          : task.dueDate < today ? `${Math.round((new Date(today).getTime() - new Date(task.dueDate).getTime()) / 86400000)}d overdue`
                          : new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : null;
                        return (
                          <div key={`${canvasId}-${nodeId}-${task.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.02] transition-colors">
                            <button
                              type="button"
                              onClick={() => handleToggleTask(canvasId, nodeId, task.id)}
                              className="flex-shrink-0 w-4 h-4 rounded-sm border transition-colors"
                              style={{ borderColor: task.completed ? "#4ADE80" : "#444", backgroundColor: task.completed ? "rgba(74,222,128,0.15)" : "transparent" }}
                            >
                              {task.completed && (
                                <svg viewBox="0 0 10 10" fill="none" style={{ color: "#4ADE80" }}>
                                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif", color: task.completed ? "#555" : "#fff", textDecoration: task.completed ? "line-through" : "none" }}>
                                  {task.title}
                                </span>
                                {dueDateLabel && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: dueDateColor, backgroundColor: dueDateColor + "15", fontFamily: "system-ui, Inter, sans-serif" }}>
                                    {dueDateLabel}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{projectName}</span>
                                <span className="text-[10px] text-gray-700">·</span>
                                <span className="text-[10px] text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{canvasName}</span>
                                <span className="text-[10px] text-gray-700">·</span>
                                <span className="text-[10px] text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{fileName}</span>
                              </div>
                            </div>
                            {task.assignee && (
                              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: "#2a2a2a", color: "#888", fontFamily: "system-ui, Inter, sans-serif" }}>
                                {task.assignee.initials}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : activeView === "all-files" ? (
          /* All Files - Google Drive-style list view */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Column Headers */}
            <div
              className="flex items-center gap-0 px-6 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider select-none"
              style={{ borderBottom: "1px solid #222222", fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <div className="flex-1 min-w-0">Name</div>
              <div className="w-36 flex-shrink-0">Owner</div>
              <div className="w-40 flex-shrink-0">Location</div>
              <div className="w-44 flex-shrink-0">Last Modified</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Collections */}
              {projects.map((project) => {
                const collapsed = allFilesCollapsedCollections.has(project.id);
                const projectCanvases = getProjectCanvases(project.id);
                return (
                  <div key={project.id}>
                    {/* Collection row */}
                    <button
                      type="button"
                      onClick={() => setAllFilesCollapsedCollections(prev => {
                        const next = new Set(prev);
                        if (next.has(project.id)) next.delete(project.id); else next.add(project.id);
                        return next;
                      })}
                      className="w-full flex items-center gap-0 px-6 py-2 text-sm text-gray-200 hover:bg-white/5 transition-colors"
                      style={{ borderBottom: "1px solid #1a1a1a", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <svg
                          width="12" height="12" viewBox="0 0 12 12" fill="none"
                          className={`flex-shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`}
                        >
                          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                          <path d="M2 4.5C2 3.67157 2.67157 3 3.5 3H5.5L7 5H12.5C13.3284 5 14 5.67157 14 6.5V11.5C14 12.3284 13.3284 13 12.5 13H3.5C2.67157 13 2 12.3284 2 11.5V4.5Z" fill={project.color} fillOpacity="0.2" stroke={project.color} strokeWidth="1.5"/>
                        </svg>
                        <span className="truncate font-medium">{project.name}</span>
                        <span className="text-xs text-gray-600 ml-1 flex-shrink-0">{projectCanvases.length} canvases</span>
                      </div>
                      <div className="w-36 flex-shrink-0 text-xs text-gray-600">—</div>
                      <div className="w-40 flex-shrink-0 text-xs text-gray-600">Collection</div>
                      <div className="w-44 flex-shrink-0 text-xs text-gray-600 text-left">{timeAgo(project.updatedAt)}</div>
                    </button>
                    {/* Canvases under collection */}
                    {!collapsed && projectCanvases.map((canvas) => {
                      const canvasExpanded = allFilesExpandedCanvases.has(canvas.id);
                      const fileNodes = getCanvasFiles(canvas);
                      return (
                        <div key={canvas.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (fileNodes.length > 0) {
                                setAllFilesExpandedCanvases(prev => {
                                  const next = new Set(prev);
                                  if (next.has(canvas.id)) next.delete(canvas.id); else next.add(canvas.id);
                                  return next;
                                });
                              } else {
                                onOpenCanvas(canvas.id);
                              }
                            }}
                            className="w-full flex items-center gap-0 pl-14 pr-6 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                            style={{ borderBottom: "1px solid #1a1a1a", fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              {fileNodes.length > 0 ? (
                                <svg
                                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                                  className={`flex-shrink-0 transition-transform ${canvasExpanded ? "rotate-90" : ""}`}
                                >
                                  <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <div className="w-3 flex-shrink-0" />
                              )}
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                                <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                              <span className="truncate">{canvas.name}</span>
                            </div>
                            <div className="w-36 flex-shrink-0 text-xs text-gray-600 truncate">{canvas.createdBy?.name ?? "—"}</div>
                            <div className="w-40 flex-shrink-0 text-xs text-gray-600 truncate">{project.name}</div>
                            <div className="w-44 flex-shrink-0 text-xs text-gray-600 text-left">{formatDate(canvas.updatedAt)}</div>
                          </button>
                          {/* File nodes under canvas */}
                          {canvasExpanded && fileNodes.map((node, idx) => (
                            <button
                              key={`${node.id}-${idx}`}
                              type="button"
                              onClick={() => setFileDetail({ nodeId: node.id, canvasId: canvas.id })}
                              className="w-full flex items-center gap-0 pl-24 pr-6 py-1.5 text-sm text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
                              style={{ borderBottom: "1px solid #1a1a1a", fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                                  <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className="truncate">{(node.data as { label?: string; fileName?: string }).label || (node.data as { label?: string; fileName?: string }).fileName || "Untitled"}</span>
                              </div>
                              <div className="w-36 flex-shrink-0 text-xs text-gray-600 truncate">{canvas.createdBy?.name ?? "—"}</div>
                              <div className="w-40 flex-shrink-0 text-xs text-gray-600 truncate">{canvas.name}</div>
                              <div className="w-44 flex-shrink-0 text-xs text-gray-600 text-left">{formatDate(canvas.updatedAt)}</div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* Uncollected canvases */}
              {getUngroupedCanvases().length > 0 && (
                <>
                  {projects.length > 0 && (
                    <div
                      className="px-6 py-2 text-xs font-medium text-gray-600 uppercase tracking-wider"
                      style={{ borderBottom: "1px solid #1a1a1a", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      Uncollected
                    </div>
                  )}
                  {getUngroupedCanvases().map((canvas) => {
                    const canvasExpanded = allFilesExpandedCanvases.has(canvas.id);
                    const fileNodes = getCanvasFiles(canvas);
                    return (
                      <div key={canvas.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (fileNodes.length > 0) {
                              setAllFilesExpandedCanvases(prev => {
                                const next = new Set(prev);
                                if (next.has(canvas.id)) next.delete(canvas.id); else next.add(canvas.id);
                                return next;
                              });
                            } else {
                              onOpenCanvas(canvas.id);
                            }
                          }}
                          className="w-full flex items-center gap-0 px-6 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                          style={{ borderBottom: "1px solid #1a1a1a", fontFamily: "system-ui, Inter, sans-serif" }}
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            {fileNodes.length > 0 ? (
                              <svg
                                width="12" height="12" viewBox="0 0 12 12" fill="none"
                                className={`flex-shrink-0 transition-transform ${canvasExpanded ? "rotate-90" : ""}`}
                              >
                                <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : (
                              <div className="w-3 flex-shrink-0" />
                            )}
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                              <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span className="truncate">{canvas.name}</span>
                          </div>
                          <div className="w-36 flex-shrink-0 text-xs text-gray-600 truncate">{canvas.createdBy?.name ?? "—"}</div>
                          <div className="w-40 flex-shrink-0 text-xs text-gray-600">No collection</div>
                          <div className="w-44 flex-shrink-0 text-xs text-gray-600 text-left">{formatDate(canvas.updatedAt)}</div>
                        </button>
                        {canvasExpanded && fileNodes.map((node, idx) => (
                          <button
                            key={`${node.id}-${idx}`}
                            type="button"
                            onClick={() => setFileDetail({ nodeId: node.id, canvasId: canvas.id })}
                            className="w-full flex items-center gap-0 pl-14 pr-6 py-1.5 text-sm text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
                            style={{ borderBottom: "1px solid #1a1a1a", fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                                <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span className="truncate">{(node.data as { label?: string; fileName?: string }).label || (node.data as { label?: string; fileName?: string }).fileName || "Untitled"}</span>
                            </div>
                            <div className="w-36 flex-shrink-0 text-xs text-gray-600 truncate">{canvas.createdBy?.name ?? "—"}</div>
                            <div className="w-40 flex-shrink-0 text-xs text-gray-600 truncate">{canvas.name}</div>
                            <div className="w-44 flex-shrink-0 text-xs text-gray-600 text-left">{formatDate(canvas.updatedAt)}</div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
              {/* Empty state */}
              {projects.length === 0 && canvases.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 9C4 7.34315 5.34315 6 7 6H12L15 10H22C23.6569 10 25 11.3431 25 13V22C25 23.6569 23.6569 25 22 25H7C5.34315 25 4 23.6569 4 22V9Z" stroke="#444" strokeWidth="2"/></svg>
                  </div>
                  <div className="text-white font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No files yet</div>
                  <div className="text-gray-500 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Create a canvas and add files to see them here</div>
                </div>
              )}
            </div>
          </div>
        ) : activeView === "frameworks" ? (
          /* My Frameworks View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter Tabs */}
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #222222" }}>
              {(["all", "mine", "team", "drafts"] as FrameworksFilter[]).map((f) => {
                const labels: Record<FrameworksFilter, string> = { all: "All", mine: "Created by me", team: "Team", drafts: "Drafts" };
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrameworksFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      frameworksFilter === f ? "text-[#0a0a0a]" : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                    style={{
                      backgroundColor: frameworksFilter === f ? "#F0FE00" : "#1a1a1a",
                      border: `1px solid ${frameworksFilter === f ? "#F0FE00" : "#333333"}`,
                      fontFamily: "system-ui, Inter, sans-serif",
                    }}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>

            {/* Frameworks Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredMyFrameworks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div
                    className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                  >
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="3" y="3" width="9" height="9" rx="2" stroke="#666" strokeWidth="2"/>
                      <rect x="16" y="3" width="9" height="9" rx="2" stroke="#666" strokeWidth="2"/>
                      <rect x="3" y="16" width="9" height="9" rx="2" stroke="#666" strokeWidth="2"/>
                      <rect x="16" y="16" width="9" height="9" rx="2" stroke="#666" strokeWidth="2"/>
                    </svg>
                  </div>
                  <p className="text-white font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No frameworks yet</p>
                  <p className="text-gray-500 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Open a canvas and use "Save as Framework" to create one
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMyFrameworks.map((framework) => (
                    <div
                      key={framework.id}
                      className="group rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: "#141414", border: "1px solid #222222" }}
                    >
                      {/* Preview */}
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <CanvasPreview nodes={framework.nodes} />
                        {/* Visibility Badge */}
                        <div
                          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "rgba(0,0,0,0.7)",
                            color: framework.visibility === "private" ? "#888" : framework.visibility === "workspace" ? "#60a5fa" : "#F0FE00",
                            fontFamily: "system-ui, Inter, sans-serif",
                          }}
                        >
                          {framework.visibility === "private" ? "Private" : framework.visibility === "workspace" ? "Workspace" : "Community"}
                        </div>
                        {framework.isPublished === false && (
                          <div
                            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#888", fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            Draft
                          </div>
                        )}
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
                          className="text-gray-400 text-sm line-clamp-2 mb-3"
                          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                        >
                          {framework.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                            <span>{framework.nodes.length} nodes</span>
                            {framework.parameters && framework.parameters.length > 0 && (
                              <span>{framework.parameters.length} params</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {onRemoveFramework && (
                              <button
                                type="button"
                                onClick={() => onRemoveFramework(framework.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                title="Delete framework"
                              >
                                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                                  <path d="M2 4H14M5.5 4V2.5C5.5 2.22386 5.72386 2 6 2H10C10.2761 2 10.5 2.22386 10.5 2.5V4M12.5 4V13.5C12.5 13.7761 12.2761 14 12 14H4C3.72386 14 3.5 13.7761 3.5 13.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenFramework(framework)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#0a0a0a] transition-colors hover:opacity-90"
                              style={{ backgroundColor: "#F0FE00", fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              Run
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeView === "community" ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="rounded-xl p-6" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
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
              <div className="rounded-xl p-6" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
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
              <div className="rounded-xl p-6" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
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

              {/* Preferences */}
              <div className="rounded-xl p-6" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
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
              <div className="rounded-xl p-6" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
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

              {/* Data & Sync Section — removed */}
              {false && <div className="rounded-xl p-6" style={{ backgroundColor: "#141414", border: "1px solid #222222" }}>
                <h3 className="text-white font-medium text-sm flex items-center gap-2 mb-4" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                    <path d="M4 10C4 10 5.5 6 8 6C10.5 6 12 10 12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M4 6C4 6 5.5 10 8 10C10.5 10 12 6 12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M2 8H4M12 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Data & Sync
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                    <div>
                      <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Sync All Canvases to Cloud</span>
                      <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {isLoadingCanvases ? "Loading..." : `${canvases.length} canvas${canvases.length !== 1 ? "es" : ""} ready to sync`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onSaveAllToCloud}
                      disabled={isLoadingCanvases || !onSaveAllToCloud}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ 
                        backgroundColor: "#F0FE00", 
                        color: "#000",
                        fontFamily: "system-ui, Inter, sans-serif" 
                      }}
                    >
                      Sync Now
                    </button>
                  </div>
                  
                  {/* Export Backup */}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                    <div>
                      <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Export Local Backup</span>
                      <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        Download your current data as a JSON file
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Export current canvases to JSON file
                        const exportData = {
                          exportedAt: new Date().toISOString(),
                          canvases: canvases,
                          settings: workspaceSettings,
                        };
                        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `atlas-backup-${new Date().toISOString().split("T")[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ 
                        backgroundColor: "#2a2a2a", 
                        color: "#fff",
                        border: "1px solid #333",
                        fontFamily: "system-ui, Inter, sans-serif" 
                      }}
                    >
                      Export
                    </button>
                  </div>
                  
                  {/* Import from Local Storage */}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                    <div>
                      <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Restore from Local Storage</span>
                      <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        Load canvases saved in this browser
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const stored = localStorage.getItem("atlas-canvases");
                          if (stored) {
                            const localCanvases = JSON.parse(stored);
                            if (localCanvases && localCanvases.length > 0) {
                              const confirmed = window.confirm(
                                `Found ${localCanvases.length} canvas(es) in local storage:\n\n${localCanvases.map((c: any) => `• ${c.name}`).join("\n")}\n\nReplace current canvases with these?`
                              );
                              if (confirmed) {
                                onCanvasesChange(localCanvases);
                                alert("Canvases restored from local storage! Click 'Sync Now' to save them to the cloud.");
                              }
                            } else {
                              alert("No canvases found in local storage.");
                            }
                          } else {
                            alert("No canvases found in local storage.");
                          }
                        } catch (e) {
                          console.error("Failed to restore from localStorage:", e);
                          alert("Failed to read local storage data.");
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ 
                        backgroundColor: "#2a2a2a", 
                        color: "#fff",
                        border: "1px solid #333",
                        fontFamily: "system-ui, Inter, sans-serif" 
                      }}
                    >
                      Restore
                    </button>
                  </div>
                  
                  {/* Import from File */}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                    <div>
                      <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Import from File</span>
                      <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        Load canvases from a JSON backup file
                      </p>
                    </div>
                    <label
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-[#333]"
                      style={{ 
                        backgroundColor: "#2a2a2a", 
                        color: "#fff",
                        border: "1px solid #333",
                        fontFamily: "system-ui, Inter, sans-serif" 
                      }}
                    >
                      Import
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const content = event.target?.result as string;
                              let importedCanvases;
                              
                              // Try to parse - could be raw array or export object
                              const parsed = JSON.parse(content);
                              if (Array.isArray(parsed)) {
                                importedCanvases = parsed;
                              } else if (parsed.canvases && Array.isArray(parsed.canvases)) {
                                importedCanvases = parsed.canvases;
                              } else {
                                alert("Invalid file format. Expected canvases array.");
                                return;
                              }
                              
                              const confirmed = window.confirm(
                                `Found ${importedCanvases.length} canvas(es):\n\n${importedCanvases.map((c: any) => `• ${c.name}`).join("\n")}\n\nReplace current canvases with these?`
                              );
                              if (confirmed) {
                                onCanvasesChange(importedCanvases);
                                alert("Canvases imported! Click 'Sync Now' to save them to the cloud.");
                              }
                            } catch (err) {
                              console.error("Failed to parse import file:", err);
                              alert("Failed to parse file. Make sure it's valid JSON.");
                            }
                          };
                          reader.readAsText(file);
                          e.target.value = ""; // Reset input
                        }}
                      />
                    </label>
                  </div>
                  
                  {/* Paste JSON directly */}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a" }}>
                    <div>
                      <span className="text-sm text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Paste JSON Data</span>
                      <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        Paste canvas data directly from clipboard
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const jsonText = window.prompt("Paste your canvas JSON data:");
                        if (!jsonText) return;
                        
                        try {
                          let importedCanvases;
                          const parsed = JSON.parse(jsonText);
                          if (Array.isArray(parsed)) {
                            importedCanvases = parsed;
                          } else if (parsed.canvases && Array.isArray(parsed.canvases)) {
                            importedCanvases = parsed.canvases;
                          } else {
                            alert("Invalid format. Expected canvases array.");
                            return;
                          }
                          
                          const confirmed = window.confirm(
                            `Found ${importedCanvases.length} canvas(es):\n\n${importedCanvases.slice(0, 10).map((c: any) => `• ${c.name}`).join("\n")}${importedCanvases.length > 10 ? `\n... and ${importedCanvases.length - 10} more` : ""}\n\nReplace current canvases with these?`
                          );
                          if (confirmed) {
                            onCanvasesChange(importedCanvases);
                            alert("Canvases imported! Click 'Sync Now' to save them to the cloud.");
                          }
                        } catch (err) {
                          console.error("Failed to parse JSON:", err);
                          alert("Failed to parse JSON. Make sure it's valid.");
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ 
                        backgroundColor: "#2a2a2a", 
                        color: "#fff",
                        border: "1px solid #333",
                        fontFamily: "system-ui, Inter, sans-serif" 
                      }}
                    >
                      Paste
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 px-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    Syncing ensures your canvases are saved to the cloud and accessible across all devices and domains.
                  </p>
                </div>
              </div>}
            </div>
          </div>
        ) : activeView === "home" ? (
          <>
            {/* Scrollable Content - Ribbon and Canvas Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Fault Management Ribbon */}
              <div className="mb-6">
                <div
                  className="rounded-xl p-6"
                  style={{ backgroundColor: "#141414", border: "1px solid #222222" }}
                >
                  {/* Header */}
                  <div className={`flex items-center justify-between ${ribbonMinimized ? "" : "mb-5"}`}>
                    <button
                      type="button"
                      className="flex items-start gap-2 text-left group"
                      onClick={() => setRibbonMinimized(v => !v)}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        className={`mt-[3px] flex-shrink-0 text-gray-500 group-hover:text-gray-300 transition-transform transition-colors ${ribbonMinimized ? "-rotate-90" : ""}`}
                      >
                        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        <h3
                          className="text-white font-semibold text-base group-hover:text-gray-200 transition-colors"
                          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                        >
                          Fault Management Ribbon
                        </h3>
                      </div>
                    </button>
                    {/* Legend and View Toggle */}
                    {!ribbonMinimized && <div className="flex items-center gap-6">
                      {/* Legend */}
                      <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#4ADE80" }} />
                          <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Smooth</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FCD34D" }} />
                          <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Minor</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FB923C" }} />
                          <span className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Moderate</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#F87171" }} />
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
                    </div>}
                  </div>

                  {!ribbonMinimized && (ribbonViewMode === "ribbon" ? (
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
                    const todayIndex = 17;

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
                        className="rounded-lg p-5"
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
                              className="text-sm text-gray-400 mb-4"
                              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              {getStatusSummary()}
                            </div>

                            {/* Status */}
                            <div className="flex items-start gap-2 mb-4">
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

                        {/* To-Dos for this day */}
                        {(() => {
                          const dayKey = selectedDate.toISOString().slice(0, 10);
                          const dayTodos = todosByDate[dayKey] || [];
                          if (dayTodos.length === 0) return null;
                          const openCount = dayTodos.filter(d => !d.task.completed).length;
                          return (
                            <div className="mt-4 pt-4" style={{ borderTop: "1px solid #2a2a2a" }}>
                              <button
                                type="button"
                                onClick={() => setTodosSectionCollapsed(v => !v)}
                                className="flex items-center gap-2 w-full mb-3 group"
                              >
                                <svg
                                  width="10" height="10" viewBox="0 0 10 10" fill="none"
                                  style={{ color: "#6b7280", flexShrink: 0, transition: "transform 0.15s", transform: todosSectionCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                                >
                                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className="text-xs font-medium text-gray-500 group-hover:text-gray-400 transition-colors" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                  To-Dos ({openCount} open)
                                </span>
                              </button>
                              {!todosSectionCollapsed && (
                                <div className="flex flex-col gap-2.5">
                                  {dayTodos.map(({ task, fileName, canvasId, nodeId }) => (
                                    <div key={task.id} className="flex items-start gap-2.5">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTask(canvasId, nodeId, task.id)}
                                        className="mt-0.5 flex-shrink-0 w-3.5 h-3.5 rounded-sm border transition-colors"
                                        style={{ borderColor: task.completed ? "#4ADE80" : "#444", backgroundColor: task.completed ? "rgba(74,222,128,0.15)" : "transparent" }}
                                      >
                                        {task.completed && (
                                          <svg viewBox="0 0 10 10" fill="none" style={{ color: "#4ADE80" }}>
                                            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        )}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs" style={{ fontFamily: "system-ui, Inter, sans-serif", textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "#666" : "#fff" }}>
                                          {task.title}
                                        </span>
                                        <span className="text-[10px] text-gray-500 ml-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                          {fileName}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                  </>
                  ) : (
                  /* Calendar View */
                  (() => {
                    const today = new Date();
                    const todayIndex = 17;

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
                  ))}
                </div>
              </div>

              {/* Collection detail view */}
              {selectedCollectionId && projects.find(p => p.id === selectedCollectionId) ? (
                <>
                  {/* Back header */}
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => setSelectedCollectionId(null)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      All Collections
                    </button>
                    <span className="text-gray-700">/</span>
                    <h2 className="text-base font-bold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      {projects.find(p => p.id === selectedCollectionId)!.name}
                    </h2>
                    <span className="text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      {getProjectCanvases(selectedCollectionId).length} {getProjectCanvases(selectedCollectionId).length === 1 ? "canvas" : "canvases"}
                    </span>
                  </div>
                  {/* Collection canvases grid */}
                  {getProjectCanvases(selectedCollectionId).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="text-white font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No canvases in this collection</div>
                      <div className="text-gray-500 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Add canvases using the folder icon on any canvas card</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {getProjectCanvases(selectedCollectionId).map((canvas) => (
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
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-gray-500 text-xs" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {formatDate(canvas.updatedAt)}
                      </div>
                      {projects.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(collectionMenuCanvasId === canvas.id ? null : canvas.id); }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-white/10"
                            style={{
                              color: canvas.projectId ? projects.find(p => p.id === canvas.projectId)?.color ?? "#888" : "#666",
                              fontFamily: "system-ui, Inter, sans-serif",
                            }}
                            title="Set collection"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M1 3.5C1 2.948 1.448 2.5 2 2.5H3.5L4.5 4H9C9.552 4 10 4.448 10 5V9C10 9.552 9.552 10 9 10H2C1.448 10 1 9.552 1 9V3.5Z" stroke="currentColor" strokeWidth="1.2"/>
                            </svg>
                            <span className="max-w-[70px] truncate">
                              {canvas.projectId ? (projects.find(p => p.id === canvas.projectId)?.name ?? "") : "Add to collection"}
                            </span>
                          </button>
                          {collectionMenuCanvasId === canvas.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(null); }} />
                              <div
                                className="absolute bottom-full right-0 mb-1 py-1 rounded-lg shadow-xl z-50 min-w-[160px]"
                                style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, undefined); }}
                                  className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                                  No collection
                                </button>
                                {projects.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, p.id); }}
                                    className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                  >
                                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                                    <span className="truncate">{p.name}</span>
                                    {canvas.projectId === p.id && (
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-auto flex-shrink-0"><path d="M2 5L4 7L8 3" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Collections horizontal scroll */}
                  {projects.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Collections</h2>
                        <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{projects.length} {projects.length === 1 ? "collection" : "collections"}</span>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
                        {projects.map((project) => {
                          const projectCanvases = getProjectCanvases(project.id);
                          return (
                            <div
                              key={project.id}
                              className="group/collectioncard flex-shrink-0 w-44 cursor-pointer"
                              onClick={() => setSelectedCollectionId(project.id)}
                            >
                              <div
                                className="relative w-44 h-32 rounded-xl overflow-hidden"
                                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                              >
                                {projectCanvases.length === 0 ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" opacity="0.3">
                                      <path d="M4 9C4 7.34315 5.34315 6 7 6H12L15 10H27C28.6569 10 30 11.3431 30 13V25C30 26.6569 28.6569 28 27 28H7C5.34315 28 4 26.6569 4 25V9Z" stroke="white" strokeWidth="2"/>
                                    </svg>
                                  </div>
                                ) : projectCanvases.length === 1 ? (
                                  <div className="w-full h-full">
                                    <CanvasPreview nodes={projectCanvases[0].nodes} />
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 grid-rows-2 gap-px w-full h-full">
                                    {projectCanvases.slice(0, 4).map((c, i) => (
                                      <div key={i} className="overflow-hidden" style={{ backgroundColor: "#111111" }}>
                                        <CanvasPreview nodes={c.nodes} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                                  className="absolute top-2 right-2 hidden group-hover/collectioncard:flex p-1 rounded-lg items-center justify-center"
                                  style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              </div>
                              <div className="mt-2">
                                <div className="text-sm font-bold text-white truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{project.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{projectCanvases.length} {projectCanvases.length === 1 ? "canvas" : "canvases"} • {timeAgo(project.updatedAt)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Uncollected canvases */}
                  {filteredCanvases.filter(c => !c.projectId).length > 0 ? (
                    <>
                      {projects.length > 0 && (
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-base font-bold text-white" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Canvases</h2>
                          <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{filteredCanvases.filter(c => !c.projectId).length} {filteredCanvases.filter(c => !c.projectId).length === 1 ? "canvas" : "canvases"}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCanvases.filter(c => !c.projectId).map((canvas) => (
                          <div
                            key={canvas.id}
                            className="group rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-white/20"
                            style={{ backgroundColor: "#1a1a1a" }}
                            onClick={() => onOpenCanvas(canvas.id)}
                          >
                            <div className="aspect-[16/10] overflow-hidden relative">
                              <CanvasPreview nodes={canvas.nodes} />
                              <div className="absolute top-2 right-2 flex gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(canvas.id); }} className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                                  <svg width="16" height="16" viewBox="0 0 18 18" fill={canvas.isFavorite ? "#F0FE00" : "none"} xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 2L11.09 6.26L16 6.97L12.5 10.34L13.18 15.25L9 13.05L4.82 15.25L5.5 10.34L2 6.97L6.91 6.26L9 2Z" stroke={canvas.isFavorite ? "#F0FE00" : "#ffffff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setCanvasToDelete(canvas.id); }} className="p-1.5 rounded-lg hover:bg-red-500/20" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4H14M5.333 4V2.667C5.333 2.298 5.632 2 6 2H10C10.368 2 10.667 2.298 10.667 2.667V4M12.667 4V13.333C12.667 13.702 12.368 14 12 14H4C3.632 14 3.333 13.702 3.333 13.333V4H12.667Z" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-white font-medium text-sm truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{canvas.name}</div>
                                {canvas.collaborators && canvas.collaborators.length > 0 && (
                                  <div className="flex -space-x-1.5 ml-2 flex-shrink-0">
                                    {canvas.collaborators.slice(0, 3).map((collaborator) => (
                                      <div key={collaborator.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[#1a1a1a]" style={{ backgroundColor: collaborator.avatar ? "transparent" : "#333333", color: "#ffffff", fontFamily: "system-ui, Inter, sans-serif" }} title={collaborator.name}>
                                        {collaborator.avatar ? <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full rounded-full object-cover" /> : collaborator.initials}
                                      </div>
                                    ))}
                                    {canvas.collaborators.length > 3 && (
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[#1a1a1a]" style={{ backgroundColor: "#252525", color: "#888888", fontFamily: "system-ui, Inter, sans-serif" }}>+{canvas.collaborators.length - 3}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-gray-500 text-xs" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{formatDate(canvas.updatedAt)}</div>
                                {projects.length > 0 && (
                                  <div className="relative">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(collectionMenuCanvasId === canvas.id ? null : canvas.id); }} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-white/10" style={{ color: canvas.projectId ? projects.find(p => p.id === canvas.projectId)?.color ?? "#888" : "#666", fontFamily: "system-ui, Inter, sans-serif" }} title="Set collection">
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3.5C1 2.948 1.448 2.5 2 2.5H3.5L4.5 4H9C9.552 4 10 4.448 10 5V9C10 9.552 9.552 10 9 10H2C1.448 10 1 9.552 1 9V3.5Z" stroke="currentColor" strokeWidth="1.2"/></svg>
                                      <span className="max-w-[70px] truncate">{canvas.projectId ? (projects.find(p => p.id === canvas.projectId)?.name ?? "") : "Add to collection"}</span>
                                    </button>
                                    {collectionMenuCanvasId === canvas.id && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(null); }} />
                                        <div className="absolute bottom-full right-0 mb-1 py-1 rounded-lg shadow-xl z-50 min-w-[160px]" style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}>
                                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, undefined); }} className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                                            No collection
                                          </button>
                                          {projects.map(p => (
                                            <button key={p.id} type="button" onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, p.id); }} className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                                              <span className="truncate">{p.name}</span>
                                              {canvas.projectId === p.id && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-auto flex-shrink-0"><path d="M2 5L4 7L8 3" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : filteredCanvases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="4" width="20" height="20" rx="3" stroke="#444" strokeWidth="2"/><path d="M10 14H18M14 10V18" stroke="#444" strokeWidth="2" strokeLinecap="round"/></svg>
                      </div>
                      <div className="text-white font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No canvases yet</div>
                      <div className="text-gray-500 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Create your first canvas to get started</div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </>
        ) : activeView === "canvases" ? (
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
            {canvasSubView === "canvases" ? (
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
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-gray-500 text-xs" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {formatDate(canvas.updatedAt)}
                      </div>
                      {projects.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(collectionMenuCanvasId === canvas.id ? null : canvas.id); }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-white/10"
                            style={{
                              color: canvas.projectId ? projects.find(p => p.id === canvas.projectId)?.color ?? "#888" : "#666",
                              fontFamily: "system-ui, Inter, sans-serif",
                            }}
                            title="Set collection"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M1 3.5C1 2.948 1.448 2.5 2 2.5H3.5L4.5 4H9C9.552 4 10 4.448 10 5V9C10 9.552 9.552 10 9 10H2C1.448 10 1 9.552 1 9V3.5Z" stroke="currentColor" strokeWidth="1.2"/>
                            </svg>
                            <span className="max-w-[70px] truncate">
                              {canvas.projectId ? (projects.find(p => p.id === canvas.projectId)?.name ?? "") : "Add to collection"}
                            </span>
                          </button>
                          {collectionMenuCanvasId === canvas.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(null); }} />
                              <div
                                className="absolute bottom-full right-0 mb-1 py-1 rounded-lg shadow-xl z-50 min-w-[160px]"
                                style={{ backgroundColor: "#1a1a1a", border: "1px solid #333333" }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, undefined); }}
                                  className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                                  No collection
                                </button>
                                {projects.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, p.id); }}
                                    className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                  >
                                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                                    <span className="truncate">{p.name}</span>
                                    {canvas.projectId === p.id && (
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-auto flex-shrink-0"><path d="M2 5L4 7L8 3" stroke="#F0FE00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
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
                {"No canvases yet"}
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
                                  getCanvasFiles(canvas).map((node, nodeIndex) => (
                                    <button
                                      key={`${node.id}-${nodeIndex}`}
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
                              getCanvasFiles(canvas).map((node, nodeIndex) => (
                                <button
                                  key={`${node.id}-${nodeIndex}`}
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
            onClick={() => { setShowNewCanvasDialog(false); setNewCanvasProjectId(undefined); setNewCanvasName(""); }}
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
                onClick={() => { setShowNewCanvasDialog(false); setNewCanvasProjectId(undefined); setNewCanvasName(""); }}
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

              {/* Collection Selection */}
              {projects.length > 0 && (
                <div>
                  <label
                    className="block text-xs text-gray-500 mb-1.5"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Collection (Optional)
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
                    <option value="">No collection</option>
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
                onClick={() => { setShowNewCanvasDialog(false); setNewCanvasProjectId(undefined); setNewCanvasName(""); }}
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

      {/* New Collection Dialog */}
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
                New Collection
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
                  Collection Name
                </label>
                <input
                  type="text"
                  placeholder="My Collection"
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
                Create Collection
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
        onDeleteWorkspace={onDeleteWorkspace}
        canDeleteWorkspace={(workspaces?.length ?? 1) > 1}
      />

      {/* Create Workspace Dialog */}
      {showCreateWorkspaceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="rounded-2xl border p-6 w-full max-w-sm mx-4 shadow-2xl"
            style={{ backgroundColor: "#161616", borderColor: "#2a2a2a" }}
          >
            <h2 className="text-base font-semibold text-white mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Create workspace
            </h2>
            <p className="text-sm text-gray-500 mb-5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Set up a new workspace to collaborate with a different team.
            </p>
            <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Workspace name
            </label>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={e => setNewWorkspaceName(e.target.value)}
              placeholder="e.g. Marketing Team"
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter" && newWorkspaceName.trim()) {
                  onWorkspaceCreate?.(newWorkspaceName.trim());
                  setNewWorkspaceName("");
                  setShowCreateWorkspaceDialog(false);
                }
                if (e.key === "Escape") {
                  setNewWorkspaceName("");
                  setShowCreateWorkspaceDialog(false);
                }
              }}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none mb-5"
              style={{ backgroundColor: "#1e1e1e", border: "1px solid #333", fontFamily: "system-ui, Inter, sans-serif" }}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setNewWorkspaceName(""); setShowCreateWorkspaceDialog(false); }}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newWorkspaceName.trim()}
                onClick={() => {
                  if (!newWorkspaceName.trim()) return;
                  onWorkspaceCreate?.(newWorkspaceName.trim());
                  setNewWorkspaceName("");
                  setShowCreateWorkspaceDialog(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                style={{ backgroundColor: "#F0FE00", color: "#121212", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

{/* Framework Detail Page */}
      {viewingFramework && (
        <FrameworkDetailPage
          framework={viewingFramework}
          onBack={() => setViewingFramework(null)}
          onRun={handleRunFromDetail}
          breadcrumbLabel={viewingFramework.visibility === "community" ? "Community" : "Frameworks"}
        />
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
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #2a2a2a" }}>
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
            className="px-6 py-4 flex items-center gap-3"
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
              <svg width="20" height="20" viewBox="0 0 647.22 647.22" fill="none">
                <rect fill="#000" x="0" y="265.27" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                <rect fill="#000" x="265.27" y="533.28" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                <rect fill="#000" x="265.27" y="355.52" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                <rect fill="#000" x="265.27" y="177.76" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                <rect fill="#000" x="533.28" y="268.01" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                <rect fill="#000" x="456.15" y="79.07" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                <rect fill="#000" x="268.01" y="0" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                <rect fill="#000" x="79.07" y="77.13" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
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
                Intelligence layer for design operations
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
          <div className="h-80 overflow-y-auto px-4 py-5 space-y-4">
            {/* Welcome message - always shown */}
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "#F0FE00" }}
              >
                <svg width="14" height="14" viewBox="0 0 647.22 647.22" fill="none">
                  <rect fill="#000" x="0" y="265.27" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                  <rect fill="#000" x="265.27" y="533.28" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                  <rect fill="#000" x="265.27" y="355.52" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                  <rect fill="#000" x="265.27" y="177.76" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                  <rect fill="#000" x="533.28" y="268.01" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                  <rect fill="#000" x="456.15" y="79.07" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                  <rect fill="#000" x="268.01" y="0" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                  <rect fill="#000" x="79.07" y="77.13" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                </svg>
              </div>
              <div
                className="flex-1 px-4 py-3 rounded-xl rounded-tl-sm"
                style={{ backgroundColor: "#1e1e1e" }}
              >
                <p
                  className="text-sm text-gray-300 leading-relaxed"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  Sage is active. I maintain shared understanding across your goals, decisions, and revisions so your team stays aligned as work evolves.
                </p>
                <p
                  className="text-sm text-gray-300 mt-2"
                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                >
                  I can help you:
                </p>
                <ul className="mt-1 space-y-1">
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "#F0FE00" }}>•</span> Surface and classify feedback across the project
                  </li>
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "#F0FE00" }}>•</span> Flag when work has drifted from stated intent
                  </li>
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "#F0FE00" }}>•</span> Log and retrieve key decisions as they&apos;re made
                  </li>
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "#F0FE00" }}>•</span> Execute canvas actions through natural language
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
                      <svg width="14" height="14" viewBox="0 0 647.22 647.22" fill="none">
                        <rect fill="#000" x="0" y="265.27" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                        <rect fill="#000" x="265.27" y="533.28" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                        <rect fill="#000" x="265.27" y="355.52" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                        <rect fill="#000" x="265.27" y="177.76" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                        <rect fill="#000" x="533.28" y="268.01" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                        <rect fill="#000" x="456.15" y="79.07" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                        <rect fill="#000" x="268.01" y="0" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                        <rect fill="#000" x="79.07" y="77.13" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
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
                  <svg width="14" height="14" viewBox="0 0 647.22 647.22" fill="none">
                    <rect fill="#000" x="0" y="265.27" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                    <rect fill="#000" x="265.27" y="533.28" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                    <rect fill="#000" x="265.27" y="355.52" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                    <rect fill="#000" x="265.27" y="177.76" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                    <rect fill="#000" x="533.28" y="268.01" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                    <rect fill="#000" x="456.15" y="79.07" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                    <rect fill="#000" x="268.01" y="0" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
                    <rect fill="#000" x="79.07" y="77.13" width="113.94" height="113.94" rx="31.65" ry="31.65"/>
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
            className="px-4 py-4"
            style={{ borderTop: "1px solid #2a2a2a" }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
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

      {/* File Detail Modal — opened from All Files list view */}
      {fileDetail && (() => {
        const detailCanvas = canvases.find(c => c.id === fileDetail.canvasId);
        const detailNode = detailCanvas?.nodes.find(n => n.id === fileDetail.nodeId);
        if (!detailCanvas || !detailNode) return null;
        return (
          <FileDetailModal
            isOpen={true}
            onClose={() => setFileDetail(null)}
            fileData={detailNode.data as FileNodeData}
            onUpdateFile={(updates) => {
              onCanvasesChange(canvases.map(c =>
                c.id === fileDetail.canvasId
                  ? { ...c, nodes: c.nodes.map(n => n.id === fileDetail.nodeId ? { ...n, data: { ...n.data, ...updates } } : n) }
                  : c
              ));
            }}
          />
        );
      })()}
    </div>
  );
}
