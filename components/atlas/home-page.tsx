"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { X, Check, ChevronDown, ChevronRight, ChevronLeft, Plus, PlusSquare, Search, Home, Settings, Bell, Send, MessageSquare, Trash2, Pencil, Star, Upload, FileText, Users, User, MoreHorizontal, MoreVertical, Copy, ExternalLink, Filter, Calendar, Clock, Eye, LayoutGrid, List, Folder, FolderOpen, TriangleAlert, ArrowRight, Sparkles, AlertCircle, HelpCircle, Lock, LogOut, Image as ImageIcon, Building2, CheckSquare, Loader2, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import type { Canvas, CanvasVisibility, WorkspaceSettings, AtlasNode, CanvasFramework, FrameworkCategory, Project, FileNodeData } from "@/lib/atlas-types";
import { ShareCanvasDialog } from "./share-canvas-dialog";
import { WorkspaceSettingsDialog } from "./workspace-settings";
import { InviteDialog } from "./invite-dialog";
import { FileDetailModal } from "./file-detail-modal";
import { FrameworkDetailPage, type ParamValues } from "./framework-detail-page";
import { ProjectCreationModal } from "./project-creation-modal";
import { parsePDFToText, splitIntoSections } from "@/lib/pdf-parser";
import { INITIAL_CANVASES, DEFAULT_WORKSPACE_SETTINGS, PRODUCT_COLORS, FRAMEWORK_CATEGORIES, PROJECT_COLORS, DEMO_EMAIL, FAKE_MEMBER_IDS, WORKSPACE_MEMBERS } from "@/lib/atlas-types";
import { ReactFlow, Background, useNodesState, useEdgesState, ReactFlowProvider } from "@xyflow/react";
import { FileNode } from "./file-node";
import { CanvasPreview } from "./canvas-preview";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSageConversations, useSageConversation, useSageChatPersistence } from "@/lib/use-sage-conversations";
import "@xyflow/react/dist/style.css";
import { TimeTrackingPage } from "./time-tracking-page";

type SidebarFilter = "all" | "workspace" | "private";
type HomeView = "home" | "canvases" | "community" | "frameworks" | "workspace-canvas" | "settings" | "all-files" | "todos" | "time-tracking";
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
                <rect x="4" y="4" width="10" height="10" rx="2" stroke="var(--app-text-muted)" strokeWidth="2"/>
                <rect x="18" y="4" width="10" height="10" rx="2" stroke="var(--app-text-muted)" strokeWidth="2"/>
                <rect x="4" y="18" width="10" height="10" rx="2" stroke="var(--app-text-muted)" strokeWidth="2"/>
                <rect x="18" y="18" width="10" height="10" rx="2" stroke="var(--app-text-muted)" strokeWidth="2"/>
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
      <div className="p-3 border-t" style={{ borderColor: "var(--app-border)" }}>
        <div className="animate-pulse h-10 bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-3 border-t" style={{ borderColor: "var(--app-border)" }}>
        <Link
          href="/auth/login"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="p-3 border-t" style={{ borderColor: "var(--app-border)" }}>
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden"
          style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)" }}
        >
          {profilePicture ? (
            <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            user.email?.charAt(0).toUpperCase() || "U"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-foreground truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {user.user_metadata?.display_name || user.email?.split("@")[0]}
          </div>
          <div className="text-xs text-gray-500 truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
            {user.email}
          </div>
        </div>
        <Link
          href="/auth/change-password"
          className="p-1.5 text-gray-500 hover:text-foreground transition-colors rounded-lg hover:bg-white/5"
          title="Change password"
        >
          <Lock className="w-4 h-4" strokeWidth={2} />
        </Link>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/auth/login");
          }}
          className="p-1.5 text-gray-500 hover:text-foreground transition-colors rounded-lg hover:bg-white/5"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}


interface HomePageProps {
  onOpenCanvas: (canvasId: string) => void;
  workspaceSettings: WorkspaceSettings;
  onWorkspaceSettingsChange: (settings: WorkspaceSettings) => void;
  workspaces?: WorkspaceSettings[];
  activeWorkspaceId?: string;
  onWorkspaceSwitch?: (workspaceId: string) => void;
  onWorkspaceCreate?: (name: string) => void;
  onDeleteWorkspace?: () => void;
  onSaveWorkspaceDetails?: (settings: WorkspaceSettings) => void;
  canvases: Canvas[];
  onCanvasesChange: (canvases: Canvas[]) => void;
  frameworks?: CanvasFramework[];
  onFrameworksChange?: (frameworks: CanvasFramework[]) => void;
  onRemoveFramework?: (frameworkId: string) => void;
  onSaveAllToCloud?: () => void;
  isLoadingCanvases?: boolean;
  isWorkspaceSynced?: boolean;
  userEmail?: string;
}

export function HomePage({ onOpenCanvas, workspaceSettings, onWorkspaceSettingsChange, workspaces = [], activeWorkspaceId, onWorkspaceSwitch, onWorkspaceCreate, onDeleteWorkspace, onSaveWorkspaceDetails, canvases, onCanvasesChange, frameworks: externalFrameworks, onFrameworksChange, onRemoveFramework, onSaveAllToCloud, isLoadingCanvases, isWorkspaceSynced, userEmail }: HomePageProps) {
  const { user: authUser } = useAuth();
  const isDemoAccount = userEmail === DEMO_EMAIL;
  const onSettingsChange = onWorkspaceSettingsChange;
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showCreateWorkspaceDialog, setShowCreateWorkspaceDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");
  const [activeView, setActiveView] = useState<HomeView>("home");

  // Theme toggle — resolvedTheme reflects the actual applied theme even when
  // themeSetting is "system". Guard the toggle UI behind a mounted flag so
  // SSR/CSR don't diverge (next-themes returns undefined on the server).
  const { resolvedTheme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => { setThemeMounted(true); }, []);

  // Figma integration state (settings page)
  const [figmaPatInput, setFigmaPatInput] = useState(workspaceSettings.figmaPat ?? "");
  const [figmaPluginToken, setFigmaPluginToken] = useState<string | null>(null);
  const [figmaPluginTokenCopied, setFigmaPluginTokenCopied] = useState(false);

  // Restore activeView from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    const validViews: HomeView[] = ["home", "canvases", "community", "frameworks", "workspace-canvas", "settings", "all-files", "todos", "time-tracking"];
    if (viewParam && validViews.includes(viewParam as HomeView)) {
      setActiveView(viewParam as HomeView);
    }
  }, []);

  // Keep URL in sync with activeView (skip first render so the mount effect reads URL before we overwrite it)
  const viewSyncFirstRender = useRef(true);
  useEffect(() => {
    if (viewSyncFirstRender.current) {
      viewSyncFirstRender.current = false;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (activeView === "home") {
      params.delete("view");
    } else {
      params.set("view", activeView);
    }
    const search = params.toString();
    window.history.replaceState({}, "", search ? `?${search}` : window.location.pathname);
  }, [activeView]);

  const [canvasSubView, setCanvasSubView] = useState<CanvasSubView>("canvases");
  const [showNewCanvasDialog, setShowNewCanvasDialog] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showProjectCreationModal, setShowProjectCreationModal] = useState(false);
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
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [shareCanvasId, setShareCanvasId] = useState<string | null>(null);

  // Real Supabase member count for sidebar (loaded on mount)
  // Settings page — real Supabase member management
  const [settingsSupabaseWorkspaceId, setSettingsSupabaseWorkspaceId] = useState<string | null>(null);
  type SettingsMember = { id: string; userId: string; role: string; email: string; name: string; initials: string; isOwner: boolean };
  const [settingsRealMembers, setSettingsRealMembers] = useState<SettingsMember[]>([]);
  const [settingsMembersLoading, setSettingsMembersLoading] = useState(false);
  const [settingsMemberError, setSettingsMemberError] = useState<string | null>(null);
  const [settingsTransferConfirmId, setSettingsTransferConfirmId] = useState<string | null>(null);
  type PendingInvitation = { id: string; email: string; role: string; createdAt: string; expiresAt: string };
  const [settingsPendingInvitations, setSettingsPendingInvitations] = useState<PendingInvitation[]>([]);
  const [settingsResendingId, setSettingsResendingId] = useState<string | null>(null);
  const [settingsResendSuccessId, setSettingsResendSuccessId] = useState<string | null>(null);

  const loadSettingsMembers = useCallback(async (wsId: string) => {
    setSettingsMembersLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/workspace/members?workspaceId=${wsId}`),
        fetch(`/api/invitations?workspaceId=${wsId}`),
      ]);
      if (membersRes.ok) setSettingsRealMembers((await membersRes.json()).members ?? []);
      if (invitesRes.ok) {
        const inv = (await invitesRes.json()).invitations ?? [];
        setSettingsPendingInvitations(inv.map((i: { id: string; email: string; role: string; created_at: string; expires_at: string }) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.created_at, expiresAt: i.expires_at })));
      }
    } catch { /* fall back to localStorage members */ }
    finally { setSettingsMembersLoading(false); }
  }, []);

  useEffect(() => {
    if (activeView !== "settings") return;
    setSettingsMemberError(null);
    setSettingsTransferConfirmId(null);
    setSettingsPendingInvitations([]);
    setSettingsRealMembers([]);

    // Load Figma plugin token
    setFigmaPluginToken(null);
    fetch("/api/figma/token")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (d.token) setFigmaPluginToken(d.token); })
      .catch(() => {});

    // workspaceSettings.id is the Supabase UUID for all workspaces
    const wsId = workspaceSettings.id;
    if (!wsId || wsId === "ws-1") return; // skip default placeholder

    setSettingsSupabaseWorkspaceId(wsId);
    loadSettingsMembers(wsId);
  }, [activeView, workspaceSettings.id, loadSettingsMembers]);

  const [showDeleteConfirmInline, setShowDeleteConfirmInline] = useState(false);
  const [deleteConfirmTextInline, setDeleteConfirmTextInline] = useState("");
  // Use external frameworks if provided, otherwise use local state
  const [localFrameworks, setLocalFrameworks] = useState<CanvasFramework[]>([]);
  const frameworks = externalFrameworks ?? localFrameworks;
  const setFrameworks = onFrameworksChange ?? setLocalFrameworks;
  const [selectedCategory, setSelectedCategory] = useState<FrameworkCategory | "all">("all");
  const [frameworksFilter, setFrameworksFilter] = useState<FrameworksFilter>("all");
  const [viewingFramework, setViewingFramework] = useState<CanvasFramework | null>(null);
  const [selectedRibbonDay, setSelectedRibbonDay] = useState<number>(17); // Today is index 17; drives ribbon center + left panel
  const [ribbonView, setRibbonView] = useState<"list" | "calendar">("list");
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0); // months shifted from current month
  const currentUserId = workspaceSettings.members[0]?.id || "user-1";

  // Canvases with no workspaceId (legacy) or a stale workspaceId from a different
  // browser session belong to the first/primary workspace.
  const primaryWorkspaceId = workspaces[0]?.id ?? activeWorkspaceId;
  const knownWorkspaceIds = useMemo(() => new Set(workspaces.map(w => w.id)), [workspaces]);

  // All canvases scoped to the active workspace (used for every display operation below).
  // Returns empty while workspace sync is in flight to prevent cross-workspace canvas flash.
  const workspaceCanvases = useMemo(() => {
    if (!isWorkspaceSynced) return [];
    return canvases.filter(c => {
      const effectiveId = (c.workspaceId && knownWorkspaceIds.has(c.workspaceId))
        ? c.workspaceId
        : primaryWorkspaceId;
      return effectiveId === activeWorkspaceId;
    });
  }, [canvases, primaryWorkspaceId, activeWorkspaceId, knownWorkspaceIds, isWorkspaceSynced]);

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

  // 28-day ribbon: demo accounts get rich filler data; real accounts derive from task due dates
  const DEMO_RIBBON_DAYS = [
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
    // Week 3 - Current week (today is index 17)
    { status: "moderate", title: "Late Feedback", description: "Client review comments came in after deadline", tags: ["Catching Up", "Overtime"], isFuture: false },
    { status: "moderate", title: "Asset Gap", description: "Missing product photos for catalog", tags: ["Sourcing", "Urgent"], isFuture: false },
    { status: "minor", title: "Minor Tweak", description: "Small adjustments to icon set requested", tags: ["Quick Fix", "Easy"], isFuture: false },
    { status: "smooth", title: "All Clear", description: "Final presentations approved by creative director", tags: ["Approved", "Ready"], isFuture: false }, // TODAY (index 17)
    { status: "minor", title: "Review Scheduled", description: "Client presentation scheduled for tomorrow", tags: ["Prepared", "Confident"], isFuture: true },
    { status: "minor", title: "Handoff Prep", description: "Preparing final deliverables package", tags: ["In Progress", "On Schedule"], isFuture: true },
    { status: "smooth", title: "Wrap Up", description: "Project retrospective and documentation", tags: ["Closing", "Learnings"], isFuture: true },
    // Week 4 - Future (projected)
    { status: "minor", title: "New Brief", description: "Phase 2 briefing with expanded scope", tags: ["Upcoming", "Planning"], isFuture: true },
    { status: "high", title: "Team Overload", description: "Multiple critical projects competing for the same resources", tags: ["Escalated", "Conflict"], isFuture: true },
    { status: "minor", title: "Vendor Kickoff", description: "Motion graphics vendor onboarding", tags: ["New Partner", "Setup"], isFuture: true },
    { status: "high", title: "Budget Shortfall Alert", description: "Q3 allocations require executive intervention", tags: ["At Risk", "Urgent"], isFuture: true },
    { status: "minor", title: "Training Day", description: "New design system workshop", tags: ["Learning", "Team"], isFuture: true },
    { status: "smooth", title: "Sprint Start", description: "Phase 2 development begins", tags: ["Fresh Start", "Energized"], isFuture: true },
    { status: "smooth", title: "Check-in", description: "Weekly client sync scheduled", tags: ["Routine", "Aligned"], isFuture: true },
  ];

  const ribbonDays = useMemo(() => {
    if (isDemoAccount) return DEMO_RIBBON_DAYS;
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
  }, [isDemoAccount, todosByDate]);

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
    // Block display until workspace identity is confirmed from Supabase
    if (!isWorkspaceSynced) return [];

    // Only show canvases belonging to the active workspace
    // (legacy canvases with no workspaceId belong to the first/primary workspace)
    let filtered = canvases.filter(c => {
      const cWorkspace = (c.workspaceId && knownWorkspaceIds.has(c.workspaceId))
        ? c.workspaceId
        : primaryWorkspaceId;
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

    // Sort: pinned first, then by most recently updated
    return filtered.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [canvases, sidebarFilter, searchQuery, isWorkspaceSynced, knownWorkspaceIds, primaryWorkspaceId, activeWorkspaceId]);

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
        const cWorkspace = (c.workspaceId && knownWorkspaceIds.has(c.workspaceId))
          ? c.workspaceId
          : primaryWorkspaceId;
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
        const cWorkspace = (c.workspaceId && knownWorkspaceIds.has(c.workspaceId))
          ? c.workspaceId
          : primaryWorkspaceId;
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

  // Returns "light" if logo is predominantly light-coloured (needs dark bg) or "dark" (needs light bg)
  const detectLogoTone = (dataUrl: string): Promise<"light" | "dark"> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const SIZE = 64;
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("light");
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        let lightPx = 0, darkPx = 0, total = 0;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 20) continue; // skip transparent pixels
          const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          if (brightness > 180) lightPx++;
          else if (brightness < 80) darkPx++;
          total++;
        }
        if (total === 0) return resolve("light");
        // "light" = logo is predominantly white/light → needs dark bg
        // "dark"  = logo is dark or colorful → needs light bg only if mostly black
        const lightRatio = lightPx / total;
        const darkRatio = darkPx / total;
        // White logos: mostly light pixels. Black logos: mostly dark. Color logos → default to black bg
        resolve(lightRatio > 0.55 ? "light" : darkRatio > 0.55 ? "dark" : "light");
      };
      img.onerror = () => resolve("light");
      img.src = dataUrl;
    });

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

    // Handle strategy PDF or manual text
    const strategyPDF = paramValues["strategy_pdf"];
    if (strategyPDF instanceof File && strategyPDF.name.endsWith(".pdf")) {
      await makePDFNodes(strategyPDF, -600, 280, "brief", "strategy");
    } else if (typeof strategyPDF === "string" && strategyPDF.trim()) {
      const now = new Date().toISOString();
      extraNodes.push({
        id: `fw-strategy-${ts}-0`,
        type: "text",
        position: { x: -600, y: 280 },
        selected: false,
        data: { label: "Brand Strategy", content: strategyPDF, textType: "brief", lastModified: now },
      } as CanvasFramework["nodes"][0]);
    }

    // Handle brief PDF or manual text
    const briefPDF = paramValues["brief_pdf"];
    if (briefPDF instanceof File && briefPDF.name.endsWith(".pdf")) {
      await makePDFNodes(briefPDF, -600, 2000, "brief", "brief");
    } else if (typeof briefPDF === "string" && briefPDF.trim()) {
      const now = new Date().toISOString();
      extraNodes.push({
        id: `fw-brief-${ts}-0`,
        type: "text",
        position: { x: -600, y: 2000 },
        selected: false,
        data: { label: "Creative Brief", content: briefPDF, textType: "brief", lastModified: now },
      } as CanvasFramework["nodes"][0]);
    }

    // Handle logo file — read + detect tone for contrasting background mockup
    const logoFileParam = paramValues["logo_file"];
    const logoFile = Array.isArray(logoFileParam) ? logoFileParam[0] : (logoFileParam instanceof File ? logoFileParam : undefined);
    let logoDataUrl: string | undefined;
    let logoTone: "light" | "dark" = "light";
    if (logoFile instanceof File) {
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(logoFile);
      });
      logoTone = await detectLogoTone(logoDataUrl);
    }

    // Contrasting background: light logo → black bg, dark/color logo → white bg
    const contrastBg = logoTone === "light" ? "pure black" : "pure white";
    const contrastDesc = logoTone === "light"
      ? "black background, brand identity shot — logo appears bright against dark"
      : "white background, brand identity shot — logo appears crisp against light";

    // Map each mockup node to a Flux Kontext prompt — Sage enhances these at runtime
    const logoFileName = logoFile instanceof File ? logoFile.name : "logo";
    const mockupNodePrompts: Record<string, string> = {
      [idMap.get("ls-mockup-1") ?? ""]: "Show this logo as an app icon sitting in the macOS dock on a MacBook desktop",
      [idMap.get("ls-mockup-2") ?? ""]: "Show this logo on the front of a business card with a clean minimal design, product photography",
      [idMap.get("ls-mockup-3") ?? ""]: "Show this logo as a small embroidered badge on the breast pocket area of a premium white t-shirt, flat lay",
      [idMap.get("ls-mockup-4") ?? ""]: `Place this logo centered on a ${contrastBg} background, ${contrastDesc}`,
      [idMap.get("ls-mockup-5") ?? ""]: "Place this logo on a large exterior building sign, architectural photography, golden hour lighting",
    };
    // Remove the empty-string key that appears when no mapping exists
    delete mockupNodePrompts[""];

    const logoFileCanvasId = idMap.get("ls-logo-file") ?? "";

    // Stagger aiPrompt auto-generation by 15s per node to stay under rate limits
    const STAGGER_MS = 15_000;
    let mockupNodeIndex = 0;

    const allNodes = [
      ...baseNodes.map((n) => {
        const d = n.data as Record<string, unknown>;

        // Logo file node: inject preview when logo provided, or convert to briefInput when not
        if (d.fileExtension === ".ai") {
          if (logoDataUrl) {
            return {
              ...n,
              data: {
                ...d,
                previewImages: [logoDataUrl],
                fileName: logoFileName,
              },
            };
          } else {
            // No logo provided — show a file drop input node on canvas
            return {
              ...n,
              type: "briefInput",
              data: { label: d.label ?? "Logo File", cardKey: "brand-discovery", mode: "idle", fields: {} },
            };
          }
        }

        // When a logo is provided, replace each mockupImage node with a pre-filled aiPrompt node
        // that auto-enhances and generates via Flux Kontext on mount
        if (logoDataUrl && mockupNodePrompts[n.id]) {
          const nodeDelay = mockupNodeIndex * STAGGER_MS;
          mockupNodeIndex++;
          return {
            ...n,
            type: "aiPrompt",
            data: {
              sourceNodeId: logoFileCanvasId,
              sourceImageUrl: logoDataUrl,
              sourceFileName: logoFileName,
              initialPrompt: mockupNodePrompts[n.id],
              autoGenerate: true,
              autoGenerateDelay: nodeDelay,
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
    <div className="flex h-screen" style={{ backgroundColor: "var(--app-bg)" }}>
      {/* Sidebar */}
      <div
        className="w-64 flex flex-col border-r"
        style={{ backgroundColor: "var(--app-bg-elevated)", borderColor: "var(--app-border)" }}
      >
        {/* Workspace Header */}
        <div className="p-4 border-b relative" style={{ borderColor: "var(--app-border)" }}>
          <button
            type="button"
            onClick={() => setShowWorkspaceSwitcher(prev => !prev)}
            className="w-full flex items-center gap-3 rounded-lg hover:bg-white/5 transition-colors -mx-1 px-1 py-1"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0"
              style={{ backgroundColor: workspaceSettings.branding?.workspaceIcon ? "transparent" : "var(--app-text-primary)", color: "var(--app-bg-elevated)" }}
              suppressHydrationWarning
            >
              {workspaceSettings.branding?.workspaceIcon ? (
                <img
                  src={workspaceSettings.branding.workspaceIcon}
                  alt={workspaceSettings.name}
                  className="max-w-full max-h-full object-contain p-0.5"
                />
              ) : (
                isWorkspaceSynced ? workspaceSettings.name.charAt(0) : ""
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-foreground truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {isWorkspaceSynced ? workspaceSettings.name : <span className="inline-block w-24 h-3 bg-white/10 rounded animate-pulse" />}
              </div>
              <div className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                {isWorkspaceSynced ? `${workspaceSettings.members.length} Member${workspaceSettings.members.length !== 1 ? "s" : ""}` : <span className="inline-block w-12 h-2.5 bg-white/10 rounded animate-pulse" />}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" strokeWidth={1.5} />
          </button>

          {/* Workspace Switcher Dropdown */}
          {showWorkspaceSwitcher && (
            <div className="fixed inset-0 z-40" onClick={() => setShowWorkspaceSwitcher(false)} />
          )}
          {showWorkspaceSwitcher && (
            <div
              className="absolute left-2 right-2 top-full mt-1 rounded-xl border z-50 py-1 shadow-xl"
              style={{ backgroundColor: "var(--app-card-elevated)", borderColor: "var(--app-border-strong)" }}
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
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: ws.branding?.workspaceIcon ? "transparent" : "var(--app-text-primary)", color: "var(--app-bg-elevated)" }}
                  >
                    {ws.branding?.workspaceIcon ? (
                      <img src={ws.branding.workspaceIcon} alt={ws.name} className="w-full h-full object-contain" />
                    ) : (
                      ws.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{ws.name}</div>
                    <div className="text-xs text-gray-500">{ws.members.length} member{ws.members.length !== 1 ? "s" : ""}</div>
                  </div>
                  {ws.id === activeWorkspaceId && (
                    <Check className="w-3.5 h-3.5 flex-shrink-0 text-yellow-400" strokeWidth={1.5} />
                  )}
                </button>
              ))}
              <div className="border-t my-1" style={{ borderColor: "var(--app-border-strong)" }} />
              <button
                type="button"
                onClick={() => {
                  setShowWorkspaceSwitcher(false);
                  setShowCreateWorkspaceDialog(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-md flex items-center justify-center border border-dashed flex-shrink-0" style={{ borderColor: "var(--app-text-faint)" }}>
                  <Plus className="w-3 h-3" strokeWidth={1.5} style={{ color: "var(--app-text-muted)" }} />
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
                activeView === "home" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <Home className="w-4 h-4" strokeWidth={1.5} />
              Home
            </button>
            <button
              type="button"
              onClick={() => { setSidebarFilter("all"); setActiveView("canvases"); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "canvases" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
              All Canvases
            </button>
            <button
              type="button"
              onClick={() => setActiveView("all-files")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "all-files" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <FolderOpen className="w-4 h-4" strokeWidth={1.5} />
              All Files
            </button>
            <button
              type="button"
              onClick={() => setActiveView("todos")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "todos" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <List className="w-4 h-4" strokeWidth={1.5} />
              All To-Dos
              {allTodosFlat.filter(d => !d.task.completed).length > 0 && (
                <span className="ml-auto text-xs rounded-full px-1.5 py-0.5" style={{ backgroundColor: "var(--app-border-strong)", color: "var(--app-text-muted)", fontFamily: "system-ui, Inter, sans-serif" }}>
                  {allTodosFlat.filter(d => !d.task.completed).length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveView("time-tracking")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "time-tracking" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <Clock className="w-4 h-4" strokeWidth={1.5} />
              Time Tracking
            </button>
            <button
              type="button"
              onClick={() => setActiveView("frameworks")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "frameworks" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
              Frameworks
            </button>
            <button
              type="button"
              onClick={() => setActiveView("community")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "community" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <Users className="w-4 h-4" strokeWidth={1.5} />
              Community
            </button>
            <button
              type="button"
              onClick={() => setActiveView("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === "settings" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <Settings className="w-4 h-4" strokeWidth={1.5} />
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
                activeView === "workspace-canvas" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <Users className="w-4 h-4" strokeWidth={1.5} />
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
                sidebarFilter === "private" ? "bg-white/10 text-foreground" : "text-gray-400 hover:text-foreground hover:bg-white/5"
              }`}
              style={{ fontFamily: "system-ui, Inter, sans-serif" }}
            >
              <Lock className="w-4 h-4" strokeWidth={1.5} />
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
          style={{ borderColor: "var(--app-border)" }}
        >
          <div
            className="text-lg font-medium text-foreground"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            {activeView === "home" && "Home"}
            {activeView === "canvases" && "All Canvases"}
            {activeView === "all-files" && "All Files"}
            {activeView === "frameworks" && "Frameworks"}
            {activeView === "community" && "Community"}
            {activeView === "workspace-canvas" && "All Workspace"}
            {activeView === "settings" && "Settings"}
            {activeView === "time-tracking" && "Time Tracking"}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-4 py-2 rounded-lg text-sm text-foreground placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30"
                style={{
                  backgroundColor: "var(--app-card-elevated)",
                  border: "1px solid var(--app-canvas-dot)",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              />
            </div>

            {/* Member count */}
            <button
              type="button"
              onClick={() => setShowSettingsDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
              style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
            >
              <User className="w-4 h-4" strokeWidth={1.5} />
              {workspaceSettings.members.length}
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-foreground hover:bg-white/5 transition-colors"
              style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
            >
              {themeMounted ? (
                resolvedTheme === "dark"
                  ? <Sun className="w-4 h-4" strokeWidth={1.5} />
                  : <Moon className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Sun className="w-4 h-4 opacity-0" strokeWidth={1.5} />
              )}
            </button>

            {/* Invite */}
            <button
              type="button"
              onClick={() => setShowInviteDialog(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground transition-colors hover:bg-white/10"
              style={{
                backgroundColor: "var(--app-card-elevated)",
                border: "1px solid var(--app-canvas-dot)",
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
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--app-bg-elevated)] transition-colors hover:opacity-90"
                style={{ backgroundColor: "var(--app-text-primary)" }}
                title="Create new"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>

              {/* Create Dropdown */}
              {showCreateMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowCreateMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-2 py-2 rounded-xl shadow-xl z-50 min-w-[220px]"
                    style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        setShowProjectCreationModal(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-foreground transition-colors flex items-center gap-3"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "var(--app-border-strong)" }}
                      >
                        <PlusSquare className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--app-text-primary)" }} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">New Project</div>
                        <div className="text-xs text-gray-500">Brief, team, timeline &amp; estimate</div>
                      </div>
                    </button>

                    <div style={{ height: 1, margin: "4px 12px", backgroundColor: "var(--app-border-strong)" }} />

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        setShowNewCanvasDialog(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-foreground transition-colors flex items-center gap-3"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "var(--app-border-strong)" }}
                      >
                        <PlusSquare className="w-4 h-4" strokeWidth={1.5} style={{ color: "#3B82F6" }} />
                      </div>
                      <div>
                        <div className="font-medium">New Canvas</div>
                        <div className="text-xs text-gray-500">Blank canvas</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        setShowNewProjectDialog(true);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-foreground transition-colors flex items-center gap-3"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "var(--app-border-strong)" }}
                      >
                        <FolderOpen className="w-4 h-4" strokeWidth={1.5} style={{ color: "#10B981" }} />
                      </div>
                      <div>
                        <div className="font-medium">New Collection</div>
                        <div className="text-xs text-gray-500">Group canvases together</div>
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
                <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--app-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>All To-Dos</h2>
                    <button
                      type="button"
                      onClick={() => { setShowNewGlobalTodo(v => !v); setNewGlobalTodoTitle(""); setNewGlobalTodoNodeId(""); setNewGlobalTodoCanvasId(""); setNewGlobalTodoDueDate(""); setNewGlobalTodoAssigneeId(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ backgroundColor: showNewGlobalTodo ? "var(--app-text-primary)" : "var(--app-card-elevated)", color: showNewGlobalTodo ? "#000" : "var(--app-text-secondary)", fontFamily: "system-ui, Inter, sans-serif", border: "1px solid " + (showNewGlobalTodo ? "transparent" : "var(--app-border-strong)") }}
                    >
                      <Plus className="w-3 h-3" strokeWidth={1.5} />
                      New To-Do
                    </button>
                  </div>

                  {/* New To-Do Form */}
                  {showNewGlobalTodo && (
                    <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border-strong)" }}>
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
                          className="w-full bg-transparent text-sm text-foreground placeholder-gray-600 outline-none"
                          style={{ fontFamily: "system-ui, Inter, sans-serif", borderBottom: "1px solid var(--app-border-strong)", paddingBottom: "8px" }}
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
                              style={{ backgroundColor: "var(--app-card-elevated)", color: newGlobalTodoNodeId ? "var(--app-text-primary)" : "var(--app-text-faint)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                            style={{ backgroundColor: "var(--app-card-elevated)", color: newGlobalTodoDueDate ? "var(--app-text-primary)" : "var(--app-text-faint)", fontFamily: "system-ui, Inter, sans-serif", colorScheme: "dark" }}
                          />
                          {/* Assignee */}
                          {workspaceSettings.members?.length > 0 && (
                            <select
                              value={newGlobalTodoAssigneeId}
                              onChange={e => setNewGlobalTodoAssigneeId(e.target.value)}
                              className="px-3 py-2 rounded-lg text-xs border-0 outline-none"
                              style={{ backgroundColor: "var(--app-card-elevated)", color: newGlobalTodoAssigneeId ? "var(--app-text-primary)" : "var(--app-text-faint)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                            style={{ backgroundColor: "var(--app-text-primary)", color: "#000", fontFamily: "system-ui, Inter, sans-serif", opacity: (!newGlobalTodoTitle.trim() || !newGlobalTodoNodeId) ? 0.4 : 1 }}
                          >
                            Add To-Do
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNewGlobalTodo(false)}
                            className="px-4 py-1.5 rounded-lg text-xs transition-colors"
                            style={{ color: "var(--app-text-faint)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                    <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                      {(["all", "incomplete", "completed"] as const).map(s => (
                        <button key={s} type="button" onClick={() => setTodoFilterStatus(s)}
                          className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                          style={{ backgroundColor: todoFilterStatus === s ? "var(--app-border-strong)" : "transparent", color: todoFilterStatus === s ? "var(--app-text-primary)" : "var(--app-text-muted)", fontFamily: "system-ui, Inter, sans-serif" }}
                        >
                          {s === "all" ? "All" : s === "incomplete" ? "Open" : "Done"}
                        </button>
                      ))}
                    </div>
                    {/* Collection filter */}
                    {uniqueProjects.length > 0 && (
                      <select value={todoFilterProject} onChange={e => setTodoFilterProject(e.target.value)}
                        className="px-3 py-1 rounded-lg text-xs border-0 outline-none"
                        style={{ backgroundColor: "var(--app-card-elevated)", color: todoFilterProject === "all" ? "var(--app-text-muted)" : "var(--app-text-primary)", fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        <option value="all">All Collections</option>
                        {uniqueProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="none">No Collection</option>
                      </select>
                    )}
                    {/* Canvas filter */}
                    <select value={todoFilterCanvas} onChange={e => setTodoFilterCanvas(e.target.value)}
                      className="px-3 py-1 rounded-lg text-xs border-0 outline-none"
                      style={{ backgroundColor: "var(--app-card-elevated)", color: todoFilterCanvas === "all" ? "var(--app-text-muted)" : "var(--app-text-primary)", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <option value="all">All Canvases</option>
                      {uniqueCanvases.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {/* User filter */}
                    {members.length > 0 && (
                      <select value={todoFilterUser} onChange={e => setTodoFilterUser(e.target.value)}
                        className="px-3 py-1 rounded-lg text-xs border-0 outline-none"
                        style={{ backgroundColor: "var(--app-card-elevated)", color: todoFilterUser === "all" ? "var(--app-text-muted)" : "var(--app-text-primary)", fontFamily: "system-ui, Inter, sans-serif" }}
                      >
                        <option value="all">All Users</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    )}
                    {/* Date filter */}
                    <select value={todoFilterDate} onChange={e => setTodoFilterDate(e.target.value)}
                      className="px-3 py-1 rounded-lg text-xs border-0 outline-none"
                      style={{ backgroundColor: "var(--app-card-elevated)", color: todoFilterDate === "all" ? "var(--app-text-muted)" : "var(--app-text-primary)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                        style={{ color: "var(--app-text-muted)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                      <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}>
                        <CheckSquare className="w-7 h-7" strokeWidth={2} style={{ color: "var(--app-text-faint)" }} />
                      </div>
                      <div className="text-foreground font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No to-dos found</div>
                      <div className="text-gray-500 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Add to-dos on files in your canvases</div>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "var(--app-card-elevated)" }}>
                      {displayed.map(({ task, fileName, canvasName, canvasId, nodeId, projectName }) => {
                        const dueDateColor = task.dueDate
                          ? task.dueDate < today && !task.completed ? "#F87171"
                          : task.dueDate === today ? "var(--app-text-primary)"
                          : task.dueDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10) ? "#FB923C"
                          : "var(--app-text-muted)"
                          : "var(--app-text-muted)";
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
                              style={{ borderColor: task.completed ? "#4ADE80" : "var(--app-text-faint)", backgroundColor: task.completed ? "rgba(74,222,128,0.15)" : "transparent" }}
                            >
                              {task.completed && (
                                <Check className="w-full h-full" strokeWidth={1.5} style={{ color: "#4ADE80" }} />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif", color: task.completed ? "var(--app-text-faint)" : "var(--app-text-primary)", textDecoration: task.completed ? "line-through" : "none" }}>
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
                              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: "var(--app-border-strong)", color: "var(--app-text-muted)", fontFamily: "system-ui, Inter, sans-serif" }}>
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
              style={{ borderBottom: "1px solid var(--app-border)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                      style={{ borderBottom: "1px solid var(--app-card-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <ChevronRight
                          className={`w-3 h-3 flex-shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`}
                          strokeWidth={1.5}
                        />
                        <FolderOpen className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} style={{ color: project.color }} />
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
                            className="w-full flex items-center gap-0 pl-14 pr-6 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-foreground transition-colors"
                            style={{ borderBottom: "1px solid var(--app-card-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              {fileNodes.length > 0 ? (
                                <ChevronRight
                                  className={`w-3 h-3 flex-shrink-0 transition-transform ${canvasExpanded ? "rotate-90" : ""}`}
                                  strokeWidth={1.5}
                                />
                              ) : (
                                <div className="w-3 flex-shrink-0" />
                              )}
                              <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
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
                              className="w-full flex items-center gap-0 pl-24 pr-6 py-1.5 text-sm text-gray-500 hover:bg-white/5 hover:text-foreground transition-colors"
                              style={{ borderBottom: "1px solid var(--app-card-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
                            >
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
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
                      style={{ borderBottom: "1px solid var(--app-card-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                          className="w-full flex items-center gap-0 px-6 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-foreground transition-colors"
                          style={{ borderBottom: "1px solid var(--app-card-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                            className="w-full flex items-center gap-0 pl-14 pr-6 py-1.5 text-sm text-gray-500 hover:bg-white/5 hover:text-foreground transition-colors"
                            style={{ borderBottom: "1px solid var(--app-card-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
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
                  <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}>
                    <FolderOpen className="w-7 h-7" strokeWidth={2} style={{ color: "var(--app-text-faint)" }} />
                  </div>
                  <div className="text-foreground font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No files yet</div>
                  <div className="text-gray-500 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Create a canvas and add files to see them here</div>
                </div>
              )}
            </div>
          </div>
        ) : activeView === "frameworks" ? (
          /* My Frameworks View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter Tabs */}
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--app-border)" }}>
              {(["all", "mine", "team", "drafts"] as FrameworksFilter[]).map((f) => {
                const labels: Record<FrameworksFilter, string> = { all: "All", mine: "Created by me", team: "Team", drafts: "Drafts" };
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrameworksFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      frameworksFilter === f ? "text-[var(--app-bg)]" : "text-gray-400 hover:text-foreground hover:bg-white/5"
                    }`}
                    style={{
                      backgroundColor: frameworksFilter === f ? "var(--app-text-primary)" : "var(--app-card-elevated)",
                      border: `1px solid ${frameworksFilter === f ? "var(--app-text-primary)" : "var(--app-canvas-dot)"}`,
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
                    style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
                  >
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="3" y="3" width="9" height="9" rx="2" stroke="var(--app-text-faint)" strokeWidth="2"/>
                      <rect x="16" y="3" width="9" height="9" rx="2" stroke="var(--app-text-faint)" strokeWidth="2"/>
                      <rect x="3" y="16" width="9" height="9" rx="2" stroke="var(--app-text-faint)" strokeWidth="2"/>
                      <rect x="16" y="16" width="9" height="9" rx="2" stroke="var(--app-text-faint)" strokeWidth="2"/>
                    </svg>
                  </div>
                  <p className="text-foreground font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No frameworks yet</p>
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
                      style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}
                    >
                      {/* Preview */}
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <CanvasPreview nodes={framework.nodes} />
                        {/* Visibility Badge */}
                        <div
                          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "rgba(0,0,0,0.7)",
                            color: framework.visibility === "private" ? "var(--app-text-muted)" : framework.visibility === "workspace" ? "#60a5fa" : "var(--app-text-primary)",
                            fontFamily: "system-ui, Inter, sans-serif",
                          }}
                        >
                          {framework.visibility === "private" ? "Private" : framework.visibility === "workspace" ? "Workspace" : "Community"}
                        </div>
                        {framework.isPublished === false && (
                          <div
                            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "var(--app-text-muted)", fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            Draft
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3
                          className="text-foreground font-semibold text-base mb-1 truncate"
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
                              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--app-bg)] transition-colors hover:opacity-90"
                              style={{ backgroundColor: "var(--app-text-primary)", fontFamily: "system-ui, Inter, sans-serif" }}
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
            <div className="px-6 py-4 flex items-center gap-3 overflow-x-auto" style={{ borderBottom: "1px solid var(--app-border)" }}>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === "all" 
                    ? "text-[var(--app-bg)]" 
                    : "text-gray-400 hover:text-foreground hover:bg-white/5"
                }`}
                style={{
                  backgroundColor: selectedCategory === "all" ? "var(--app-text-primary)" : "var(--app-card-elevated)",
                  border: `1px solid ${selectedCategory === "all" ? "var(--app-text-primary)" : "var(--app-canvas-dot)"}`,
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
                      ? "text-[var(--app-bg)]" 
                      : "text-gray-400 hover:text-foreground hover:bg-white/5"
                  }`}
                  style={{
                    backgroundColor: selectedCategory === cat ? "var(--app-text-primary)" : "var(--app-card-elevated)",
                    border: `1px solid ${selectedCategory === cat ? "var(--app-text-primary)" : "var(--app-canvas-dot)"}`,
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
                    style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
                  >
                    <PlusSquare className="w-7 h-7" strokeWidth={2} style={{ color: "var(--app-text-muted)" }} />
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
                        style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}
                      >
                        {/* Preview */}
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <CanvasPreview nodes={framework.nodes} />
                          {/* Category Badge */}
                          <div
                            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: "rgba(0,0,0,0.7)", 
                              color: "var(--app-text-primary)",
                              fontFamily: "system-ui, Inter, sans-serif",
                            }}
                          >
                            {FRAMEWORK_CATEGORIES[framework.category].label}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h3
                            className="text-foreground font-semibold text-base mb-1 truncate"
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
                                <span className="text-xs font-medium" style={{ color: "var(--app-bg-elevated)" }}>
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
                                  backgroundColor: "var(--app-border-strong)",
                                  color: "var(--app-text-muted)",
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
                                    : "text-gray-400 hover:text-foreground hover:bg-white/5"
                                }`}
                                style={{
                                  backgroundColor: hasUpvoted ? "rgba(240, 254, 0, 0.1)" : "transparent",
                                  fontFamily: "system-ui, Inter, sans-serif",
                                }}
                              >
                                <Star className="w-4 h-4" strokeWidth={1.5} fill={hasUpvoted ? "currentColor" : "none"} />
                                {framework.upvotes}
                              </button>

                              {/* Downloads */}
                              <div
                                className="flex items-center gap-1.5 text-sm text-gray-500"
                                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                              >
                                <Upload className="w-3.5 h-3.5 rotate-180" strokeWidth={1.5} />
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
                                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                </button>
                              )}
                              {/* Open Framework Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenFramework(framework)}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--app-bg)] transition-colors hover:opacity-90"
                                style={{
                                  backgroundColor: "var(--app-text-primary)",
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
        ) : activeView === "time-tracking" ? (
          <TimeTrackingPage members={workspaceSettings.members} />
        ) : activeView === "settings" ? (
          /* All Settings View - Single Page */
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl space-y-8">
              {/* Page Header */}
              <div>
                <h2 className="text-foreground font-semibold text-xl" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Workspace Settings
                </h2>
                <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Manage your workspace branding, team, and preferences
                </p>
              </div>

              {/* Workspace Details */}
              <div className="rounded-xl p-6" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}>
                <h3 className="text-foreground font-medium text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <Building2 className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  Workspace Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Name</label>
                    <input
                      type="text"
                      value={workspaceSettings.name}
                      onChange={(e) => onSettingsChange({ ...workspaceSettings, name: e.target.value })}
                      onBlur={(e) => onSaveWorkspaceDetails?.({ ...workspaceSettings, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-white/30"
                      style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", fontFamily: "system-ui, Inter, sans-serif" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>ID</label>
                    <div className="px-3 py-2 rounded-lg text-sm text-gray-500" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", fontFamily: "monospace" }}>
                      {workspaceSettings.id}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Description</label>
                    <textarea
                      value={workspaceSettings.description || ""}
                      onChange={(e) => onSettingsChange({ ...workspaceSettings, description: e.target.value })}
                      onBlur={(e) => onSaveWorkspaceDetails?.({ ...workspaceSettings, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                      style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", fontFamily: "system-ui, Inter, sans-serif" }}
                    />
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="rounded-xl p-6" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}>
                <h3 className="text-foreground font-medium text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
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
                    <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center overflow-hidden mb-2" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px dashed var(--app-canvas-dot)" }}>
                      {workspaceSettings.branding?.workspaceIcon ? (
                        <img src={workspaceSettings.branding.workspaceIcon} alt="Icon" className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <span className="text-xl font-bold" style={{ color: "var(--app-text-primary)" }}>{workspaceSettings.name.charAt(0)}</span>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-white/10" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", color: "var(--app-text-primary)" }}>
                      <Upload className="w-3 h-3" strokeWidth={1.5} />
                      Icon
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const { upload } = await import("@vercel/blob/client"); const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload/client" }); const updated = { ...workspaceSettings, branding: { ...workspaceSettings.branding, workspaceIcon: blob.url } }; onWorkspaceSettingsChange(updated); onSaveWorkspaceDetails?.(updated); } catch (error) { console.error("Upload failed:", error); } }} />
                    </label>
                    <div className="text-[10px] text-gray-500 mt-1">Square</div>
                  </div>
                  {/* Wordmark */}
                  <div className="text-center">
                    <div className="w-32 h-16 mx-auto rounded-xl flex items-center justify-center overflow-hidden mb-2" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px dashed var(--app-canvas-dot)" }}>
                      {workspaceSettings.branding?.wordmark ? (
                        <img src={workspaceSettings.branding.wordmark} alt="Wordmark" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-500">No wordmark</span>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-white/10" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", color: "var(--app-text-primary)" }}>
                      <Upload className="w-3 h-3" strokeWidth={1.5} />
                      Wordmark
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const { upload } = await import("@vercel/blob/client"); const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload/client" }); const updated = { ...workspaceSettings, branding: { ...workspaceSettings.branding, wordmark: blob.url } }; onWorkspaceSettingsChange(updated); onSaveWorkspaceDetails?.(updated); } catch (error) { console.error("Upload failed:", error); } }} />
                    </label>
                    <div className="text-[10px] text-gray-500 mt-1">Horizontal</div>
                  </div>
                  {/* Profile */}
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center overflow-hidden mb-2" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px dashed var(--app-canvas-dot)" }}>
                      {workspaceSettings.branding?.profilePicture ? (
                        <img src={workspaceSettings.branding.profilePicture} alt="Profile" className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <User className="w-6 h-6" strokeWidth={2} style={{ color: "var(--app-text-muted)" }} />
                      )}
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-white/10" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", color: "var(--app-text-primary)" }}>
                      <Upload className="w-3 h-3" strokeWidth={1.5} />
                      Photo
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const { upload } = await import("@vercel/blob/client"); const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload/client" }); const updated = { ...workspaceSettings, branding: { ...workspaceSettings.branding, profilePicture: blob.url } }; onWorkspaceSettingsChange(updated); onSaveWorkspaceDetails?.(updated); } catch (error) { console.error("Upload failed:", error); } }} />
                    </label>
                    <div className="text-[10px] text-gray-500 mt-1">Square</div>
                  </div>
                </div>
              </div>

              {/* Figma Integration */}
              <div className="rounded-xl p-6" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}>
                <h3 className="text-foreground font-medium text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-400">
                    <path d="M6 1.5H4.5C3.4 1.5 2.5 2.4 2.5 3.5C2.5 4.6 3.4 5.5 4.5 5.5H6V1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 5.5H7.5C8.6 5.5 9.5 4.6 9.5 3.5C9.5 2.4 8.6 1.5 7.5 1.5H6V5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 5.5H4.5C3.4 5.5 2.5 6.4 2.5 7.5C2.5 8.6 3.4 9.5 4.5 9.5C5.6 9.5 6 8.6 6 7.5V5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 9.5V7.5C6 8.6 6.9 9.5 8 9.5C9.1 9.5 10 8.6 10 7.5C10 6.4 9.1 5.5 8 5.5H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 9.5C9.1 9.5 10 10.4 10 11.5C10 12.6 9.1 13.5 8 13.5C6.9 13.5 6 12.6 6 11.5V9.5H8Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Figma Integration
                </h3>
                <div className="space-y-4">
                  {/* Plugin sync token */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      Plugin Sync Token
                    </label>
                    <p className="text-xs text-gray-600 mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      Paste into the <strong className="text-gray-400">Sync with Ideate</strong> Figma plugin to enable live frame syncing.
                    </p>
                    {figmaPluginToken ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs px-3 py-2 rounded-lg select-all overflow-hidden" style={{ background: "var(--app-bg)", color: "#60a5fa", fontFamily: "monospace", border: "1px solid var(--app-border-strong)", wordBreak: "break-all", display: "block", lineHeight: 1.6 }}>
                          {figmaPluginToken}
                        </code>
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(figmaPluginToken); setFigmaPluginTokenCopied(true); setTimeout(() => setFigmaPluginTokenCopied(false), 2000); }}
                          className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all"
                          style={{ background: figmaPluginTokenCopied ? "#0a3a1a" : "var(--app-text-primary)", color: figmaPluginTokenCopied ? "#4ade80" : "#000", border: "none", minWidth: 64 }}
                        >
                          {figmaPluginTokenCopied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-600 animate-pulse" />
                        <span className="text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Loading token…</span>
                      </div>
                    )}
                  </div>

                  {/* Personal Access Token */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      Personal Access Token (PAT)
                    </label>
                    <p className="text-xs text-gray-600 mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      Required to sync Figma frames into canvases. Generate one at{" "}
                      <a href="https://www.figma.com/settings#personal-access-tokens" target="_blank" rel="noreferrer" className="underline" style={{ color: "#60a5fa" }}>figma.com/settings</a>.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={figmaPatInput}
                        onChange={e => {
                          setFigmaPatInput(e.target.value);
                          const updated = { ...workspaceSettings, figmaPat: e.target.value.trim() };
                          onSettingsChange(updated);
                          onSaveWorkspaceDetails?.(updated);
                        }}
                        placeholder="figd_…"
                        className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
                        style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", color: "#e5e5e5", fontFamily: "monospace" }}
                      />
                      {figmaPatInput.trim() && (
                        <div className="flex items-center gap-1.5 text-xs flex-shrink-0" style={{ color: "#22c55e", fontFamily: "system-ui, Inter, sans-serif" }}>
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                          Saved
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="rounded-xl p-6" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-foreground font-medium text-sm flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    <Users className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    Team Members
                    {settingsMembersLoading && <span className="text-xs text-gray-600 font-normal">Loading…</span>}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowInviteDialog(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <Plus className="w-3 h-3" strokeWidth={1.5} />
                    Invite
                  </button>
                </div>

                {settingsMemberError && (
                  <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                    {settingsMemberError}
                  </div>
                )}

                <div className="space-y-1">
                  {settingsMembersLoading ? (
                    <div className="space-y-1">
                      {[1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg animate-pulse" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                          <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--app-border-strong)" }} />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 rounded" style={{ backgroundColor: "var(--app-border-strong)", width: "40%" }} />
                            <div className="h-2.5 rounded" style={{ backgroundColor: "var(--app-border)", width: "60%" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {!settingsMembersLoading && (() => {
                    const members: SettingsMember[] = settingsRealMembers;
                    const realMemberIds = new Set(members.map(m => m.userId));
                    // Fake members only appear in the primary (first) workspace for the demo account
                    const fakeMembers = isDemoAccount && workspaceSettings.id === workspaces[0]?.id
                      ? WORKSPACE_MEMBERS.filter(m => FAKE_MEMBER_IDS.has(m.id) && !realMemberIds.has(m.id))
                      : [];

                    const currentUserMember = members.find(m => m.email === userEmail);
                    const isCurrentUserOwner = currentUserMember?.isOwner ?? false;
                    const isCurrentUserAdminOrOwner = isCurrentUserOwner || currentUserMember?.role === "admin";

                    return <>
                    {members.map(member => {
                      const isCurrentUser = member.email === userEmail;
                      const canChangeRole = isCurrentUserAdminOrOwner && !member.isOwner && !isCurrentUser;
                      const canRemove = isCurrentUserAdminOrOwner && !member.isOwner && !isCurrentUser;
                      const canTransfer = isCurrentUserOwner && !member.isOwner && !isCurrentUser;
                      const confirmingTransfer = settingsTransferConfirmId === member.userId;
                      const ROLE_LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };

                      return (
                        <div key={member.userId}>
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-foreground" style={{ backgroundColor: "var(--app-canvas-dot)" }}>
                              {member.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm text-foreground font-medium truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{member.name}</span>
                                {isCurrentUser && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "var(--app-border-strong)", color: "var(--app-text-muted)", fontFamily: "system-ui, Inter, sans-serif" }}>You</span>}
                              </div>
                              {member.email && <div className="text-xs text-gray-500 truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{member.email}</div>}
                            </div>

                            {canChangeRole ? (
                              <select
                                value={member.role}
                                onChange={async (e) => {
                                  if (!settingsSupabaseWorkspaceId) return;
                                  const newRole = e.target.value;
                                  setSettingsRealMembers(prev => prev.map(m => m.userId === member.userId ? { ...m, role: newRole } : m));
                                  const res = await fetch("/api/workspace/members", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ workspaceId: settingsSupabaseWorkspaceId, userId: member.userId, role: newRole }),
                                  });
                                  if (!res.ok) {
                                    setSettingsMemberError((await res.json()).error || "Failed to update role");
                                    loadSettingsMembers(settingsSupabaseWorkspaceId);
                                  }
                                }}
                                className="text-xs rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-white/20"
                                style={{ backgroundColor: "var(--app-border-strong)", border: "1px solid var(--app-border-strong)", fontFamily: "system-ui, Inter, sans-serif" }}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                              </select>
                            ) : (
                              <span className="text-xs text-gray-500 px-2 flex-shrink-0" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                {ROLE_LABELS[member.role] ?? member.role}
                              </span>
                            )}

                            {canTransfer && (
                              <button
                                type="button"
                                title="Transfer ownership"
                                onClick={() => setSettingsTransferConfirmId(confirmingTransfer ? null : member.userId)}
                                className="flex-shrink-0 p-1.5 rounded transition-colors"
                                style={{ color: confirmingTransfer ? "var(--app-text-primary)" : "var(--app-text-faint)", backgroundColor: confirmingTransfer ? "#F0FE0015" : "transparent" }}
                              >
                                <ArrowRight className="w-3 h-3" strokeWidth={1.4} />
                              </button>
                            )}

                            {canRemove && (
                              <button
                                type="button"
                                title="Remove member"
                                onClick={async () => {
                                  if (!settingsSupabaseWorkspaceId) return;
                                  setSettingsRealMembers(prev => prev.filter(m => m.userId !== member.userId));
                                  const res = await fetch(`/api/workspace/members?workspaceId=${settingsSupabaseWorkspaceId}&userId=${member.userId}`, { method: "DELETE" });
                                  if (!res.ok) {
                                    setSettingsMemberError((await res.json()).error || "Failed to remove member");
                                    loadSettingsMembers(settingsSupabaseWorkspaceId);
                                  }
                                }}
                                className="flex-shrink-0 p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              >
                                <X className="w-3 h-3" strokeWidth={1.5} />
                              </button>
                            )}
                            {!canRemove && !canTransfer && <div className="w-[28px] flex-shrink-0" />}
                          </div>

                          {confirmingTransfer && (
                            <div className="mx-1 mb-1 px-3 py-2.5 rounded-lg flex items-center justify-between gap-3" style={{ backgroundColor: "#1a1500", border: "1px solid #3a3000" }}>
                              <p className="text-xs" style={{ color: "var(--app-text-primary)", fontFamily: "system-ui, Inter, sans-serif" }}>
                                Transfer ownership to <strong>{member.name}</strong>? You&apos;ll become an Admin.
                              </p>
                              <div className="flex gap-2 flex-shrink-0">
                                <button type="button" onClick={() => setSettingsTransferConfirmId(null)} className="text-xs px-2.5 py-1 rounded-lg" style={{ backgroundColor: "var(--app-border-strong)", color: "var(--app-text-secondary)", fontFamily: "system-ui, Inter, sans-serif" }}>Cancel</button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!settingsSupabaseWorkspaceId) return;
                                    setSettingsTransferConfirmId(null);
                                    const res = await fetch("/api/workspace/members", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ workspaceId: settingsSupabaseWorkspaceId, userId: member.userId, action: "transfer-ownership" }),
                                    });
                                    if (!res.ok) setSettingsMemberError((await res.json()).error || "Failed to transfer ownership");
                                    else loadSettingsMembers(settingsSupabaseWorkspaceId);
                                  }}
                                  className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                                  style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
                                >Confirm</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {fakeMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-foreground" style={{ backgroundColor: "var(--app-canvas-dot)" }}>
                          {member.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-foreground font-medium truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{member.name}</span>
                          {member.email && <div className="text-xs text-gray-500 truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{member.email}</div>}
                        </div>
                        <span className="text-xs text-gray-500 px-2 flex-shrink-0 capitalize" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{member.role}</span>
                        <div className="w-[28px] flex-shrink-0" />
                      </div>
                    ))}
                    </>;
                  })()}
                </div>

                {/* Pending Invitations */}
                {settingsPendingInvitations.length > 0 && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--app-border)" }}>
                    <p className="text-xs font-medium mb-2" style={{ color: "var(--app-text-muted)", fontFamily: "system-ui, Inter, sans-serif" }}>
                      Pending Invitations
                    </p>
                    <div className="space-y-1">
                      {settingsPendingInvitations.map(inv => {
                        const isResending = settingsResendingId === inv.id;
                        const didResend = settingsResendSuccessId === inv.id;
                        const ROLE_LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };
                        return (
                          <div key={inv.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: "var(--app-border)", color: "var(--app-text-muted)" }}>
                              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.4} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: "var(--app-text-secondary)", fontFamily: "system-ui, Inter, sans-serif" }}>{inv.email}</div>
                              <div className="text-xs" style={{ color: "var(--app-text-faint)", fontFamily: "system-ui, Inter, sans-serif" }}>{ROLE_LABELS[inv.role] ?? inv.role} · Expires {new Date(inv.expiresAt).toLocaleDateString()}</div>
                            </div>
                            <button
                              type="button"
                              disabled={isResending || didResend}
                              onClick={async () => {
                                setSettingsResendingId(inv.id);
                                setSettingsResendSuccessId(null);
                                try {
                                  const res = await fetch("/api/invitations", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ invitationId: inv.id }),
                                  });
                                  if (res.ok) {
                                    setSettingsResendSuccessId(inv.id);
                                    setTimeout(() => setSettingsResendSuccessId(null), 3000);
                                    if (settingsSupabaseWorkspaceId) loadSettingsMembers(settingsSupabaseWorkspaceId);
                                  } else {
                                    setSettingsMemberError((await res.json()).error || "Failed to resend");
                                  }
                                } catch { setSettingsMemberError("Failed to resend invitation"); }
                                finally { setSettingsResendingId(null); }
                              }}
                              className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                              style={{
                                backgroundColor: didResend ? "#0f2a0f" : "var(--app-border)",
                                color: didResend ? "#4ade80" : isResending ? "var(--app-text-faint)" : "var(--app-text-secondary)",
                                border: `1px solid ${didResend ? "#166534" : "var(--app-canvas-dot)"}`,
                                fontFamily: "system-ui, Inter, sans-serif",
                              }}
                            >
                              {isResending ? "Sending…" : didResend ? "Sent ✓" : "Resend"}
                            </button>
                            <button
                              type="button"
                              title="Revoke invitation"
                              onClick={async () => {
                                setSettingsPendingInvitations(prev => prev.filter(i => i.id !== inv.id));
                                const res = await fetch(`/api/invitations?id=${inv.id}`, { method: "DELETE" });
                                if (!res.ok) {
                                  setSettingsMemberError((await res.json()).error || "Failed to revoke invitation");
                                  if (settingsSupabaseWorkspaceId) loadSettingsMembers(settingsSupabaseWorkspaceId);
                                }
                              }}
                              className="flex-shrink-0 p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            >
                              <X className="w-3 h-3" strokeWidth={1.5} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Preferences */}
              <div className="rounded-xl p-6" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}>
                <h3 className="text-foreground font-medium text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <List className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  Preferences
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Default Product</label>
                    <select
                      value={workspaceSettings.preferences.defaultProduct}
                      onChange={(e) => onSettingsChange({ ...workspaceSettings, preferences: { ...workspaceSettings.preferences, defaultProduct: e.target.value as any } })}
                      className="w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none"
                      style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                      className="w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none"
                      style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <option value="draft">Draft</option>
                      <option value="in-review">In Review</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                    <span className="text-sm text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Auto-save</span>
                    <button
                      type="button"
                      onClick={() => onSettingsChange({ ...workspaceSettings, preferences: { ...workspaceSettings.preferences, autoSave: !workspaceSettings.preferences.autoSave } })}
                      className={`w-9 h-5 rounded-full transition-colors ${workspaceSettings.preferences.autoSave ? "bg-foreground" : "bg-gray-600"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${workspaceSettings.preferences.autoSave ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                    <span className="text-sm text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Show Grid</span>
                    <button
                      type="button"
                      onClick={() => onSettingsChange({ ...workspaceSettings, preferences: { ...workspaceSettings.preferences, showGrid: !workspaceSettings.preferences.showGrid } })}
                      className={`w-9 h-5 rounded-full transition-colors ${workspaceSettings.preferences.showGrid ? "bg-foreground" : "bg-gray-600"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${workspaceSettings.preferences.showGrid ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Naming Conventions - Link to Dialog for full editor */}
              <div className="rounded-xl p-6" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground font-medium text-sm flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                    <List className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    Naming Conventions
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSettingsDialog(true)}
                    className="text-xs text-gray-400 hover:text-foreground transition-colors flex items-center gap-1"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    Edit
                    <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "var(--app-bg)", border: "1px solid var(--app-border)" }}>
                  <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Preview: </span>
                  <span className="text-sm text-foreground font-mono">project_logo_v1<span className="text-gray-500">.fig</span></span>
                </div>
              </div>

              {/* Data & Sync Section — removed */}
              {false && <div className="rounded-xl p-6" style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}>
                <h3 className="text-foreground font-medium text-sm flex items-center gap-2 mb-4" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  <ArrowRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  Data & Sync
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                    <div>
                      <span className="text-sm text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Sync All Canvases to Cloud</span>
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
                        backgroundColor: "var(--app-text-primary)", 
                        color: "#000",
                        fontFamily: "system-ui, Inter, sans-serif" 
                      }}
                    >
                      Sync Now
                    </button>
                  </div>
                  
                  {/* Export Backup */}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                    <div>
                      <span className="text-sm text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Export Local Backup</span>
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
                        backgroundColor: "var(--app-border-strong)", 
                        color: "var(--app-text-primary)",
                        border: "1px solid var(--app-canvas-dot)",
                        fontFamily: "system-ui, Inter, sans-serif" 
                      }}
                    >
                      Export
                    </button>
                  </div>
                  
                  {/* Import from Local Storage */}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                    <div>
                      <span className="text-sm text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Restore from Local Storage</span>
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
                        backgroundColor: "var(--app-border-strong)", 
                        color: "var(--app-text-primary)",
                        border: "1px solid var(--app-canvas-dot)",
                        fontFamily: "system-ui, Inter, sans-serif" 
                      }}
                    >
                      Restore
                    </button>
                  </div>
                  
                  {/* Import from File */}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                    <div>
                      <span className="text-sm text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Import from File</span>
                      <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        Load canvases from a JSON backup file
                      </p>
                    </div>
                    <label
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-[var(--app-canvas-dot)]"
                      style={{ 
                        backgroundColor: "var(--app-border-strong)", 
                        color: "var(--app-text-primary)",
                        border: "1px solid var(--app-canvas-dot)",
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
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                    <div>
                      <span className="text-sm text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Paste JSON Data</span>
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
                        backgroundColor: "var(--app-border-strong)", 
                        color: "var(--app-text-primary)",
                        border: "1px solid var(--app-canvas-dot)",
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

              {/* Danger Zone */}
              {onDeleteWorkspace && (workspaces?.length ?? 1) > 1 && (
                <div className="rounded-xl p-6" style={{ backgroundColor: "var(--app-card)", border: "1px solid #2a1515" }}>
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                    <TriangleAlert className="w-3.5 h-3.5" strokeWidth={1.3} style={{ color: "#ef4444" }} />
                    Danger Zone
                  </h3>

                  {!showDeleteConfirmInline ? (
                    <button
                      type="button"
                      onClick={() => { setShowDeleteConfirmInline(true); setDeleteConfirmTextInline(""); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left w-full hover:bg-red-950/30"
                      style={{ backgroundColor: "#1a0d0d", border: "1px solid #3a1a1a" }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#ef444415" }}>
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.4} style={{ color: "#ef4444" }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>Delete Workspace</div>
                        <div className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Permanently delete this workspace and all its canvases</div>
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#1a0d0d", border: "1px solid #3a1a1a" }}>
                      <p className="text-sm font-medium" style={{ color: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}>
                        This will permanently delete <span className="font-bold">{workspaceSettings.name}</span> and all its canvases. This cannot be undone.
                      </p>
                      <p className="text-xs text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        Type <span className="font-mono font-semibold text-foreground">delete {workspaceSettings.name}</span> to confirm
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmTextInline}
                        onChange={e => setDeleteConfirmTextInline(e.target.value)}
                        placeholder={`delete ${workspaceSettings.name}`}
                        autoFocus
                        className="w-full px-3 py-2 rounded-lg text-sm text-foreground placeholder-gray-600 outline-none"
                        style={{
                          backgroundColor: "var(--app-bg)",
                          border: `1px solid ${deleteConfirmTextInline === `delete ${workspaceSettings.name}` ? "#ef4444" : "var(--app-border-strong)"}`,
                          fontFamily: "system-ui, Inter, sans-serif",
                        }}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setShowDeleteConfirmInline(false); setDeleteConfirmTextInline(""); }}
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium"
                          style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", color: "var(--app-text-secondary)", fontFamily: "system-ui, Inter, sans-serif" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={deleteConfirmTextInline !== `delete ${workspaceSettings.name}`}
                          onClick={() => { onDeleteWorkspace(); setShowDeleteConfirmInline(false); setDeleteConfirmTextInline(""); }}
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{
                            backgroundColor: deleteConfirmTextInline === `delete ${workspaceSettings.name}` ? "#ef4444" : "#2a1a1a",
                            color: deleteConfirmTextInline === `delete ${workspaceSettings.name}` ? "var(--app-text-primary)" : "var(--app-text-faint)",
                            border: "none",
                            cursor: deleteConfirmTextInline === `delete ${workspaceSettings.name}` ? "pointer" : "not-allowed",
                            fontFamily: "system-ui, Inter, sans-serif",
                          }}
                        >
                          Delete Workspace
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeView === "home" ? (
          <>
            {/* Scrollable Content - Ribbon and Canvas Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Pulse */}
              <div className="mb-6">
                <h3 className="text-sm text-gray-400 mb-3" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Pulse</h3>
                {(() => {
                  const todayIndex = 17;
                  const focusedIndex = selectedRibbonDay;
                  const focusedStatus = ribbonDays[focusedIndex]?.status || "smooth";
                  const isFocusedToday = focusedIndex === todayIndex;

                  // Count blockers (high days) in 7 days leading up to focused day
                  const past7 = ribbonDays.slice(Math.max(0, focusedIndex - 6), focusedIndex + 1);
                  const blockerCount = past7.filter(d => d.status === "high").length;

                  type StatusLevel = "healthy" | "caution" | "critical";
                  const statusLevel: StatusLevel =
                    focusedStatus === "smooth" ? "healthy" :
                    focusedStatus === "high" ? "critical" : "caution";

                  const statusConfig: Record<StatusLevel, { label: string; color: string; description: string; projects: string }> = {
                    healthy: {
                      label: "Healthy",
                      color: "#4ADE80",
                      description: "Stable operations with capacity for growth",
                      projects: "Smooth",
                    },
                    caution: {
                      label: "Caution",
                      color: "#FCD34D",
                      description: "Performance maintained, but pressure points emerging",
                      projects: `${Math.max(1, blockerCount)} Blocker${Math.max(1, blockerCount) === 1 ? "" : "s"}`,
                    },
                    critical: {
                      label: "Critical",
                      color: "#F87171",
                      description: "Unsustainable conditions requiring immediate action",
                      projects: `${Math.max(3, blockerCount)} Blockers`,
                    },
                  };
                  const cfg = statusConfig[statusLevel];

                  // Figma tokens for the vertical calendar bars
                  const barColorMap: Record<string, string> = {
                    smooth: "#00db75",
                    minor: "#fdd33b",
                    moderate: "#fdd33b",
                    high: "#e52a05",
                  };
                  const todayBorderMap: Record<string, string> = {
                    smooth: "#00b963",
                    minor: "#c9a52a",
                    moderate: "#c9a52a",
                    high: "#b41d02",
                  };
                  // Fixed pixel widths: 146 (today) → 64 (furthest), linear taper
                  const widthByOffset: Record<number, number> = {
                    [-3]: 64, [-2]: 92, [-1]: 120, [0]: 146,
                    [1]: 120, [2]: 92, [3]: 64,
                  };

                  // 7-day window centered on the focused day
                  const dayOffsets = [-3, -2, -1, 0, 1, 2, 3];
                  const now = new Date();
                  const days = dayOffsets.map(offset => {
                    const idx = focusedIndex + offset;
                    const day = ribbonDays[idx];
                    const daysFromActualToday = idx - todayIndex;
                    const date = new Date(now);
                    date.setDate(now.getDate() + daysFromActualToday);
                    const isActualToday = idx === todayIndex;
                    return {
                      idx,
                      offset,
                      isActualToday,
                      status: day?.status || "smooth",
                      label: isActualToday
                        ? "Today"
                        : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                    };
                  });

                  // Todos: if focused on today, show priority (overdue + upcoming); otherwise show tasks due on the focused day
                  const focusedDate = new Date(now);
                  focusedDate.setDate(now.getDate() + (focusedIndex - todayIndex));
                  const focusedDateStr = focusedDate.toISOString().slice(0, 10);
                  const todayTodos = isFocusedToday
                    ? allTodosFlat
                        .filter(t => !t.task.completed && t.task.dueDate)
                        .sort((a, b) => (a.task.dueDate || "").localeCompare(b.task.dueDate || ""))
                        .slice(0, 3)
                    : (todosByDate[focusedDateStr] || [])
                        .filter(t => !t.task.completed)
                        .slice(0, 3);

                  // Range label: first and last visible day
                  const firstDate = days[0]?.idx !== undefined ? (() => { const d = new Date(now); d.setDate(now.getDate() + (days[0].idx - todayIndex)); return d; })() : now;
                  const lastDate = days[days.length - 1]?.idx !== undefined ? (() => { const d = new Date(now); d.setDate(now.getDate() + (days[days.length - 1].idx - todayIndex)); return d; })() : now;
                  const sameMonth = firstDate.getMonth() === lastDate.getMonth();
                  const rangeLabel = sameMonth
                    ? `${firstDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${lastDate.getDate()}`
                    : `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

                  // Left panel "Today" header — shows Today if focused on today, otherwise the date
                  const focusedHeader = isFocusedToday
                    ? "Today"
                    : focusedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

                  // Calendar view: month grid with colored day circles
                  const monthAnchor = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
                  const calYear = monthAnchor.getFullYear();
                  const calMonth = monthAnchor.getMonth();
                  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                  // Convert to Mon-first (0=Mon, 6=Sun) — JS getDay is Sun-first
                  const firstWeekday = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
                  const calendarHeader = monthAnchor.toLocaleDateString('en-US', { month: 'long' });
                  type CalCell = { day: number; status: string | null; isToday: boolean; isFuture: boolean; idx: number } | null;
                  const calendarCells: CalCell[] = [];
                  for (let i = 0; i < firstWeekday; i++) calendarCells.push(null);
                  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                  for (let d = 1; d <= daysInMonth; d++) {
                    const cellDate = new Date(calYear, calMonth, d);
                    const cellMs = cellDate.getTime();
                    const daysFromToday = Math.round((cellMs - todayMs) / (1000 * 60 * 60 * 24));
                    const idx = todayIndex + daysFromToday;
                    const rd = ribbonDays[idx];
                    calendarCells.push({
                      day: d,
                      status: rd?.status ?? null,
                      isToday: cellMs === todayMs,
                      isFuture: cellMs > todayMs,
                      idx,
                    });
                  }

                  return (
                    <div className="grid grid-cols-[2fr_1fr] gap-4">
                      {/* Left column */}
                      <div className="flex flex-col gap-4 h-full">
                        {/* Today status card */}
                        <div
                          className="rounded-xl p-6 relative overflow-hidden"
                          style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}
                        >
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: `radial-gradient(ellipse 60% 90% at 75% 50%, ${cfg.color}33 0%, transparent 65%)`,
                            }}
                          />
                          <div className="relative flex items-center justify-between gap-6">
                            <div className="min-w-0">
                              <h4 className="text-foreground font-semibold text-base mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }} suppressHydrationWarning>{focusedHeader}</h4>
                              <p className="text-sm text-gray-400 max-w-xs mb-6" style={{ fontFamily: "system-ui, Inter, sans-serif" }} suppressHydrationWarning>
                                {cfg.description}
                              </p>
                              <div>
                                <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Projects</div>
                                <div className="text-sm text-foreground font-medium" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{cfg.projects}</div>
                              </div>
                            </div>
                            <div
                              className="text-5xl font-semibold flex-shrink-0"
                              style={{ color: cfg.color, fontFamily: "system-ui, Inter, sans-serif", textShadow: `0 0 40px ${cfg.color}55` }}
                              suppressHydrationWarning
                            >
                              {cfg.label}
                            </div>
                          </div>
                        </div>

                        {/* To-Dos card */}
                        <div
                          className="rounded-xl p-6 flex-1"
                          style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-foreground font-semibold text-base" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>To-Dos</h4>
                            <button
                              type="button"
                              onClick={() => setActiveView("todos")}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-foreground hover:bg-[var(--app-card-elevated)] transition-colors"
                              title="Add task"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                          {todayTodos.length === 0 ? (
                            <div className="text-sm text-gray-500 py-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                              No tasks due today
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {todayTodos.map(({ task, canvasId, nodeId }) => {
                                let dueLabel: { text: string; color: string } | null = null;
                                if (task.dueDate) {
                                  const due = new Date(task.dueDate);
                                  const t = new Date();
                                  t.setHours(0, 0, 0, 0);
                                  due.setHours(0, 0, 0, 0);
                                  const dayDiff = Math.floor((due.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
                                  if (dayDiff < 0) {
                                    dueLabel = {
                                      text: dayDiff === -1 ? "Due Yesterday" : `Due ${Math.abs(dayDiff)} days ago`,
                                      color: "#F87171",
                                    };
                                  } else if (dayDiff === 0) {
                                    dueLabel = { text: "Due Today", color: "#FCD34D" };
                                  } else if (dayDiff === 1) {
                                    dueLabel = { text: "Due Tomorrow", color: "var(--app-text-muted)" };
                                  } else if (dayDiff <= 7) {
                                    dueLabel = { text: `Due in ${dayDiff} days`, color: "var(--app-text-muted)" };
                                  } else {
                                    dueLabel = {
                                      text: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                                      color: "var(--app-text-muted)",
                                    };
                                  }
                                }
                                return (
                                  <div key={task.id} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTask(canvasId, nodeId, task.id)}
                                        className="flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center"
                                        style={{
                                          borderColor: task.completed ? "#4ADE80" : "var(--app-text-faint)",
                                          backgroundColor: task.completed ? "rgba(74,222,128,0.15)" : "transparent",
                                        }}
                                      >
                                        {task.completed && (
                                          <Check className="w-2.5 h-2.5" strokeWidth={1.5} style={{ color: "#4ADE80" }} />
                                        )}
                                      </button>
                                      <span
                                        className="text-sm truncate"
                                        style={{
                                          fontFamily: "system-ui, Inter, sans-serif",
                                          textDecoration: task.completed ? "line-through" : "none",
                                          color: task.completed ? "var(--app-text-faint)" : "var(--app-text-primary)",
                                        }}
                                      >
                                        {task.title || "Untitled task"}
                                      </span>
                                    </div>
                                    {dueLabel && (
                                      <span
                                        className="text-xs font-medium flex-shrink-0"
                                        style={{
                                          color: dueLabel.color,
                                          fontFamily: "system-ui, Inter, sans-serif",
                                        }}
                                      >
                                        {dueLabel.text}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveView("todos")}
                            className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                          >
                            See All
                          </button>
                        </div>
                      </div>

                      {/* Right column - vertical calendar (Figma spec) */}
                      <div
                        className="rounded-xl p-5 h-full flex flex-col"
                        style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}
                      >
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => ribbonView === "calendar"
                                ? setCalendarMonthOffset(o => o - 1)
                                : setSelectedRibbonDay(d => Math.max(0, d - 7))}
                              className="text-gray-500 hover:text-foreground transition-colors"
                              aria-label={ribbonView === "calendar" ? "Previous month" : "Previous week"}
                            >
                              <ChevronLeft className="w-3 h-3" strokeWidth={1.5} />
                            </button>
                            <h4 className="text-foreground font-bold text-2xl leading-none" style={{ fontFamily: "Inter, system-ui, sans-serif" }} suppressHydrationWarning>
                              {ribbonView === "calendar" ? calendarHeader : rangeLabel}
                            </h4>
                            <button
                              type="button"
                              onClick={() => ribbonView === "calendar"
                                ? setCalendarMonthOffset(o => o + 1)
                                : setSelectedRibbonDay(d => Math.min(ribbonDays.length - 1, d + 7))}
                              className="text-gray-500 hover:text-foreground transition-colors"
                              aria-label={ribbonView === "calendar" ? "Next month" : "Next week"}
                            >
                              <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--app-card-elevated)" }}>
                            <button
                              type="button"
                              onClick={() => setRibbonView("calendar")}
                              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: ribbonView === "calendar" ? "var(--app-border-strong)" : "transparent",
                                color: ribbonView === "calendar" ? "var(--app-text-primary)" : "var(--app-text-muted)",
                              }}
                              title="Calendar view"
                            >
                              <LayoutGrid className="w-4 h-4" strokeWidth={0} fill="currentColor" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRibbonView("list")}
                              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: ribbonView === "list" ? "var(--app-border-strong)" : "transparent",
                                color: ribbonView === "list" ? "var(--app-text-primary)" : "var(--app-text-muted)",
                              }}
                              title="List view"
                            >
                              <List className="w-4 h-4" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                        {ribbonView === "list" ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 mx-auto w-full" style={{ maxWidth: 320 }}>
                          {days.map((day) => {
                            const isFocused = day.offset === 0;
                            const isPast = day.idx < todayIndex;
                            const barWidth = widthByOffset[day.offset] ?? 100;
                            const barHeight = isFocused ? 44 : 38;
                            const baseColor = barColorMap[day.status] || "#00db75";
                            const borderColor = todayBorderMap[day.status] || "#00b963";
                            const labelColor = isFocused
                              ? "var(--app-text-primary)"
                              : isPast
                              ? "rgba(164,164,164,0.4)"
                              : "#a4a4a4";
                            return (
                              <button
                                key={day.idx}
                                type="button"
                                onClick={() => setSelectedRibbonDay(day.idx)}
                                className="relative w-full flex items-center justify-center group"
                                style={{ height: barHeight }}
                              >
                                <span
                                  className="absolute whitespace-nowrap text-right text-base font-medium leading-none transition-colors"
                                  style={{
                                    right: `calc(50% + ${barWidth / 2}px + 20px)`,
                                    color: labelColor,
                                    fontFamily: "Inter, system-ui, sans-serif",
                                  }}
                                  suppressHydrationWarning
                                >
                                  {day.label}
                                </span>
                                <div
                                  className="rounded-[8px] transition-transform group-hover:scale-[1.03]"
                                  style={{
                                    width: barWidth,
                                    height: barHeight,
                                    backgroundColor: isPast
                                      ? `${baseColor}66`
                                      : baseColor,
                                    border: isFocused ? `3px solid ${borderColor}` : "none",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </button>
                            );
                          })}
                        </div>
                        ) : (
                          <div className="flex-1 flex flex-col mx-auto w-full" style={{ maxWidth: 360 }}>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => (
                                <div key={d} className="text-center text-[10px] font-semibold tracking-wide text-gray-500" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
                                  {d}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 flex-1 content-start">
                              {calendarCells.map((cell, i) => {
                                if (!cell) return <div key={`e-${i}`} />;
                                const isPast = !cell.isToday && !cell.isFuture;
                                const bg = isPast
                                  ? "var(--app-border-strong)"
                                  : cell.status === "smooth"
                                  ? "#00db75"
                                  : cell.status === "high"
                                  ? "#e52a05"
                                  : cell.status === "minor" || cell.status === "moderate"
                                  ? "#fdd33b"
                                  : "var(--app-border-strong)";
                                const textColor = isPast ? "#7a7a7a" : "var(--app-bg)";
                                return (
                                  <button
                                    key={`d-${cell.day}`}
                                    type="button"
                                    onClick={() => setSelectedRibbonDay(cell.idx)}
                                    className="w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-transform hover:scale-110"
                                    style={{
                                      backgroundColor: bg,
                                      color: textColor,
                                      fontFamily: "Inter, system-ui, sans-serif",
                                      outline: cell.isToday ? "2px solid var(--app-text-primary)" : "none",
                                      outlineOffset: cell.isToday ? "2px" : undefined,
                                    }}
                                  >
                                    {cell.day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>


              {/* Collection detail view */}
              {selectedCollectionId && projects.find(p => p.id === selectedCollectionId) ? (
                <>
                  {/* Back header */}
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => setSelectedCollectionId(null)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-foreground transition-colors text-sm"
                      style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      All Collections
                    </button>
                    <span className="text-gray-700">/</span>
                    <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      {projects.find(p => p.id === selectedCollectionId)!.name}
                    </h2>
                    <span className="text-xs text-gray-600" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                      {getProjectCanvases(selectedCollectionId).length} {getProjectCanvases(selectedCollectionId).length === 1 ? "canvas" : "canvases"}
                    </span>
                  </div>
                  {/* Collection canvases grid */}
                  {getProjectCanvases(selectedCollectionId).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="text-foreground font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No canvases in this collection</div>
                      <div className="text-gray-500 text-sm" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Add canvases using the folder icon on any canvas card</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {getProjectCanvases(selectedCollectionId).map((canvas) => (
                <div
                  key={canvas.id}
                  className="group rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-white/20"
                  style={{ backgroundColor: "var(--app-card-elevated)" }}
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
                        title={canvas.isFavorite ? "Unpin" : "Pin to top"}
                      >
                        <Star className="w-4 h-4" strokeWidth={1.5} fill={canvas.isFavorite ? "var(--app-text-primary)" : "none"} style={{ color: "var(--app-text-primary)" }} />
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
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} style={{ color: "#ef4444" }} />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-foreground font-medium text-sm truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {canvas.name}
                      </div>
                      {/* Collaborator Avatars */}
                      {canvas.collaborators && canvas.collaborators.length > 0 && (
                        <div className="flex -space-x-1.5 ml-2 flex-shrink-0">
                          {canvas.collaborators.slice(0, 3).map((collaborator) => (
                            <div
                              key={collaborator.id}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[var(--app-card-elevated)]"
                              style={{
                                backgroundColor: collaborator.avatar ? "transparent" : "var(--app-canvas-dot)",
                                color: "var(--app-text-primary)",
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
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[var(--app-card-elevated)]"
                              style={{
                                backgroundColor: "var(--app-border-strong)",
                                color: "var(--app-text-muted)",
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
                              color: canvas.projectId ? projects.find(p => p.id === canvas.projectId)?.color ?? "var(--app-text-muted)" : "var(--app-text-faint)",
                              fontFamily: "system-ui, Inter, sans-serif",
                            }}
                            title="Set collection"
                          >
                            <FolderOpen className="w-3 h-3" strokeWidth={1.2} />
                            <span className="max-w-[70px] truncate">
                              {canvas.projectId ? (projects.find(p => p.id === canvas.projectId)?.name ?? "") : "Add to collection"}
                            </span>
                          </button>
                          {collectionMenuCanvasId === canvas.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(null); }} />
                              <div
                                className="absolute bottom-full right-0 mb-1 py-1 rounded-lg shadow-xl z-50 min-w-[160px]"
                                style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, undefined); }}
                                  className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/10 hover:text-foreground transition-colors flex items-center gap-2"
                                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                >
                                  <X className="w-3 h-3" strokeWidth={1.2} />
                                  No collection
                                </button>
                                {projects.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, p.id); }}
                                    className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/10 hover:text-foreground transition-colors flex items-center gap-2"
                                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                  >
                                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                                    <span className="truncate">{p.name}</span>
                                    {canvas.projectId === p.id && (
                                      <Check className="w-2.5 h-2.5 ml-auto flex-shrink-0" strokeWidth={1.5} style={{ color: "var(--app-text-primary)" }} />
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
                        <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Collections</h2>
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
                                style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
                              >
                                {projectCanvases.length === 0 ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FolderOpen className="w-8 h-8" strokeWidth={2} style={{ color: "white", opacity: 0.3 }} />
                                  </div>
                                ) : projectCanvases.length === 1 ? (
                                  <div className="w-full h-full">
                                    <CanvasPreview nodes={projectCanvases[0].nodes} />
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 grid-rows-2 gap-px w-full h-full">
                                    {projectCanvases.slice(0, 4).map((c, i) => (
                                      <div key={i} className="overflow-hidden" style={{ backgroundColor: "var(--app-bg-elevated)" }}>
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
                                  <X className="w-3 h-3" strokeWidth={1.5} style={{ color: "#ef4444" }} />
                                </button>
                              </div>
                              <div className="mt-2">
                                <div className="text-sm font-bold text-foreground truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{project.name}</div>
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
                          <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>Canvases</h2>
                          <span className="text-xs text-gray-500" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{filteredCanvases.filter(c => !c.projectId).length} {filteredCanvases.filter(c => !c.projectId).length === 1 ? "canvas" : "canvases"}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCanvases.filter(c => !c.projectId).map((canvas) => (
                          <div
                            key={canvas.id}
                            className="group rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-white/20"
                            style={{ backgroundColor: "var(--app-card-elevated)" }}
                            onClick={() => onOpenCanvas(canvas.id)}
                          >
                            <div className="aspect-[16/10] overflow-hidden relative">
                              <CanvasPreview nodes={canvas.nodes} />
                              <div className="absolute top-2 right-2 flex gap-1 transition-opacity opacity-0 group-hover:opacity-100">
                                <button type="button" onClick={(e) => { e.stopPropagation(); setShareCanvasId(canvas.id); }} className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} title="Share canvas">
                                  <Send className="w-4 h-4" strokeWidth={1.4} stroke="white" />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(canvas.id); }} className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                                  <Star className="w-4 h-4" strokeWidth={1.5} fill={canvas.isFavorite ? "var(--app-text-primary)" : "none"} style={{ color: "var(--app-text-primary)" }} />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setCanvasToDelete(canvas.id); }} className="p-1.5 rounded-lg hover:bg-red-500/20" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                                  <Trash2 className="w-4 h-4" strokeWidth={1.5} style={{ color: "#ef4444" }} />
                                </button>
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-foreground font-medium text-sm truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{canvas.name}</div>
                                {canvas.collaborators && canvas.collaborators.length > 0 && (
                                  <div className="flex -space-x-1.5 ml-2 flex-shrink-0">
                                    {canvas.collaborators.slice(0, 3).map((collaborator) => (
                                      <div key={collaborator.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[var(--app-card-elevated)]" style={{ backgroundColor: collaborator.avatar ? "transparent" : "var(--app-canvas-dot)", color: "var(--app-text-primary)", fontFamily: "system-ui, Inter, sans-serif" }} title={collaborator.name}>
                                        {collaborator.avatar ? <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full rounded-full object-cover" /> : collaborator.initials}
                                      </div>
                                    ))}
                                    {canvas.collaborators.length > 3 && (
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[var(--app-card-elevated)]" style={{ backgroundColor: "var(--app-border-strong)", color: "var(--app-text-muted)", fontFamily: "system-ui, Inter, sans-serif" }}>+{canvas.collaborators.length - 3}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-gray-500 text-xs" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>{formatDate(canvas.updatedAt)}</div>
                                {projects.length > 0 && (
                                  <div className="relative">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(collectionMenuCanvasId === canvas.id ? null : canvas.id); }} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-white/10" style={{ color: canvas.projectId ? projects.find(p => p.id === canvas.projectId)?.color ?? "var(--app-text-muted)" : "var(--app-text-faint)", fontFamily: "system-ui, Inter, sans-serif" }} title="Set collection">
                                      <FolderOpen className="w-3 h-3" strokeWidth={1.2} />
                                      <span className="max-w-[70px] truncate">{canvas.projectId ? (projects.find(p => p.id === canvas.projectId)?.name ?? "") : "Add to collection"}</span>
                                    </button>
                                    {collectionMenuCanvasId === canvas.id && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(null); }} />
                                        <div className="absolute bottom-full right-0 mb-1 py-1 rounded-lg shadow-xl z-50 min-w-[160px]" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}>
                                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, undefined); }} className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/10 hover:text-foreground transition-colors flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                            <X className="w-3 h-3" strokeWidth={1.2} />
                                            No collection
                                          </button>
                                          {projects.map(p => (
                                            <button key={p.id} type="button" onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, p.id); }} className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/10 hover:text-foreground transition-colors flex items-center gap-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                                              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                                              <span className="truncate">{p.name}</span>
                                              {canvas.projectId === p.id && <Check className="w-2.5 h-2.5 ml-auto flex-shrink-0" strokeWidth={1.5} style={{ color: "var(--app-text-primary)" }} />}
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
                  ) : isWorkspaceSynced && filteredCanvases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}>
                        <PlusSquare className="w-7 h-7" strokeWidth={2} style={{ color: "var(--app-text-faint)" }} />
                      </div>
                      <div className="text-foreground font-medium mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>No canvases yet</div>
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
              <div className="px-6 py-3 flex items-center gap-1" style={{ borderBottom: "1px solid var(--app-border)" }}>
                <button
                  type="button"
                  onClick={() => setCanvasSubView("canvases")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    canvasSubView === "canvases" 
                      ? "bg-white/10 text-foreground" 
                      : "text-gray-500 hover:text-foreground hover:bg-white/5"
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
                      ? "bg-white/10 text-foreground" 
                      : "text-gray-500 hover:text-foreground hover:bg-white/5"
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
                  style={{ backgroundColor: "var(--app-card)", border: "1px solid var(--app-border)" }}
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
                        title={canvas.isFavorite ? "Unpin" : "Pin to top"}
                      >
                        <Star className="w-4 h-4" strokeWidth={1.5} fill={canvas.isFavorite ? "var(--app-text-primary)" : "none"} style={{ color: "var(--app-text-primary)" }} />
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
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} style={{ color: "#ef4444" }} />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-foreground font-medium text-sm truncate" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                        {canvas.name}
                      </div>
                      {/* Collaborator Avatars */}
                      {canvas.collaborators && canvas.collaborators.length > 0 && (
                        <div className="flex -space-x-1.5 ml-2 flex-shrink-0">
                          {canvas.collaborators.slice(0, 3).map((collaborator) => (
                            <div
                              key={collaborator.id}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[var(--app-card-elevated)]"
                              style={{
                                backgroundColor: collaborator.avatar ? "transparent" : "var(--app-canvas-dot)",
                                color: "var(--app-text-primary)",
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
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium ring-1 ring-[var(--app-card-elevated)]"
                              style={{
                                backgroundColor: "var(--app-border-strong)",
                                color: "var(--app-text-muted)",
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
                              color: canvas.projectId ? projects.find(p => p.id === canvas.projectId)?.color ?? "var(--app-text-muted)" : "var(--app-text-faint)",
                              fontFamily: "system-ui, Inter, sans-serif",
                            }}
                            title="Set collection"
                          >
                            <FolderOpen className="w-3 h-3" strokeWidth={1.2} />
                            <span className="max-w-[70px] truncate">
                              {canvas.projectId ? (projects.find(p => p.id === canvas.projectId)?.name ?? "") : "Add to collection"}
                            </span>
                          </button>
                          {collectionMenuCanvasId === canvas.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setCollectionMenuCanvasId(null); }} />
                              <div
                                className="absolute bottom-full right-0 mb-1 py-1 rounded-lg shadow-xl z-50 min-w-[160px]"
                                style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, undefined); }}
                                  className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/10 hover:text-foreground transition-colors flex items-center gap-2"
                                  style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                >
                                  <X className="w-3 h-3" strokeWidth={1.2} />
                                  No collection
                                </button>
                                {projects.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleSetCanvasCollection(canvas.id, p.id); }}
                                    className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/10 hover:text-foreground transition-colors flex items-center gap-2"
                                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                                  >
                                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                                    <span className="truncate">{p.name}</span>
                                    {canvas.projectId === p.id && (
                                      <Check className="w-2.5 h-2.5 ml-auto flex-shrink-0" strokeWidth={1.5} style={{ color: "var(--app-text-primary)" }} />
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
          ) : isWorkspaceSynced ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <div
                className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
                style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="10" height="10" rx="2" stroke="var(--app-text-muted)" strokeWidth="2"/>
                  <rect x="18" y="4" width="10" height="10" rx="2" stroke="var(--app-text-muted)" strokeWidth="2"/>
                  <rect x="4" y="18" width="10" height="10" rx="2" stroke="var(--app-text-muted)" strokeWidth="2"/>
                  <rect x="18" y="18" width="10" height="10" rx="2" stroke="var(--app-text-muted)" strokeWidth="2"/>
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
                  backgroundColor: "var(--app-text-primary)",
                  color: "var(--app-bg-elevated)",
                  fontFamily: "system-ui, Inter, sans-serif",
                }}
              >
                New canvas
              </button>
            </div>
          ) : null}
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
                                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-foreground hover:bg-white/5 transition-colors"
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
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-foreground hover:bg-white/5 transition-colors"
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
                      style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
                    >
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 8C4 6.34315 5.34315 5 7 5H11L14 8H21C22.6569 8 24 9.34315 24 11V20C24 21.6569 22.6569 23 21 23H7C5.34315 23 4 21.6569 4 20V8Z" stroke="var(--app-text-muted)" strokeWidth="2"/>
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
            style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-semibold text-foreground"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                New Canvas
              </h2>
              <button
                type="button"
                onClick={() => { setShowNewCanvasDialog(false); setNewCanvasProjectId(undefined); setNewCanvasName(""); }}
                className="text-gray-500 hover:text-foreground transition-colors"
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
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30"
                  style={{
                    backgroundColor: "var(--app-bg)",
                    border: "1px solid var(--app-canvas-dot)",
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
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-white/30 appearance-none cursor-pointer"
                    style={{
                      backgroundColor: "var(--app-bg)",
                      border: "1px solid var(--app-canvas-dot)",
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
                        ? "text-foreground"
                        : "text-gray-500"
                    }`}
                    style={{
                      backgroundColor: newCanvasVisibility === "workspace" ? "var(--app-canvas-dot)" : "var(--app-bg)",
                      border: "1px solid var(--app-canvas-dot)",
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
                        ? "text-foreground"
                        : "text-gray-500"
                    }`}
                    style={{
                      backgroundColor: newCanvasVisibility === "private" ? "var(--app-canvas-dot)" : "var(--app-bg)",
                      border: "1px solid var(--app-canvas-dot)",
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
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-foreground transition-colors"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCanvas}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "var(--app-text-primary)",
                  color: "var(--app-bg-elevated)",
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
            style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-semibold text-foreground"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                New Collection
              </h2>
              <button
                type="button"
                onClick={() => setShowNewProjectDialog(false)}
                className="text-gray-500 hover:text-foreground transition-colors"
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
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30"
                  style={{
                    backgroundColor: "var(--app-bg)",
                    border: "1px solid var(--app-canvas-dot)",
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
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-foreground transition-colors"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "var(--app-text-primary)",
                  color: "var(--app-bg-elevated)",
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
            style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)" }}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H21M8 6V4C8 3.448 8.448 3 9 3H15C15.552 3 16 3.448 16 4V6M19 6V20C19 20.552 18.552 21 18 21H6C5.448 21 5 20.552 5 20V6H19Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-foreground text-center mb-2" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Delete Canvas
            </h2>
            <p className="text-gray-400 text-sm text-center mb-6" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
              Are you sure you want to delete &quot;{canvases.find(c => c.id === canvasToDelete)?.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCanvasToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-foreground transition-colors"
                style={{ backgroundColor: "var(--app-border-strong)", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteCanvas(canvasToDelete)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-foreground transition-colors hover:bg-red-600"
                style={{ backgroundColor: "#ef4444", fontFamily: "system-ui, Inter, sans-serif" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Canvas Dialog */}
      {shareCanvasId && (() => {
        const shareCanvas = canvases.find(c => c.id === shareCanvasId);
        return shareCanvas ? (
          <ShareCanvasDialog
            open={!!shareCanvasId}
            onClose={() => setShareCanvasId(null)}
            canvas={shareCanvas}
            workspaceSettings={workspaceSettings}
          />
        ) : null;
      })()}

      {/* Workspace Settings Dialog */}
      <WorkspaceSettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        settings={workspaceSettings}
        onSettingsChange={onWorkspaceSettingsChange}
        onDeleteWorkspace={onDeleteWorkspace}
        canDeleteWorkspace={(workspaces?.length ?? 1) > 1}
      />

      <InviteDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        settings={workspaceSettings}
        onSettingsChange={onWorkspaceSettingsChange}
      />

      {/* Create Workspace Dialog */}
      {showCreateWorkspaceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="rounded-2xl border p-6 w-full max-w-sm mx-4 shadow-2xl"
            style={{ backgroundColor: "var(--app-card-elevated)", borderColor: "var(--app-border-strong)" }}
          >
            <h2 className="text-base font-semibold text-foreground mb-1" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
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
              className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground outline-none mb-5"
              style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-canvas-dot)", fontFamily: "system-ui, Inter, sans-serif" }}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setNewWorkspaceName(""); setShowCreateWorkspaceDialog(false); }}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-foreground hover:bg-white/5 transition-colors"
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
                style={{ backgroundColor: "var(--app-text-primary)", color: "var(--app-bg-elevated)", fontFamily: "system-ui, Inter, sans-serif" }}
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
          backgroundColor: "var(--app-card)",
          border: "1px solid var(--app-border-strong)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        {showSageChat ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="var(--app-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
            backgroundColor: "var(--app-card)",
            border: "1px solid var(--app-border-strong)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            width: showChatHistory ? "600px" : "384px",
            transition: "width 0.2s ease-in-out",
          }}
        >
          {/* Chat History Sidebar */}
          {showChatHistory && (
            <div
              className="w-52 flex-shrink-0 flex flex-col"
              style={{ borderRight: "1px solid var(--app-border-strong)" }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--app-border-strong)" }}>
                <span className="text-xs font-medium text-gray-400" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
                  Chat History
                </span>
                <button
                  onClick={handleNewChat}
                  className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  style={{ color: "var(--app-text-primary)", fontFamily: "system-ui, Inter, sans-serif" }}
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
                        className="text-xs text-foreground truncate"
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
            style={{ borderBottom: "1px solid var(--app-border-strong)" }}
          >
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Chat History"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={showChatHistory ? "var(--app-text-primary)" : "var(--app-text-muted)"} strokeWidth="1.5">
                <path d="M2 4h12M2 8h12M2 12h8" />
              </svg>
            </button>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--app-text-primary)" }}
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
                className="text-foreground font-semibold text-sm"
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
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--app-text-muted)" strokeWidth="1.5">
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
                style={{ backgroundColor: "var(--app-text-primary)" }}
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
                style={{ backgroundColor: "var(--app-card-elevated)" }}
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
                    <span style={{ color: "var(--app-text-primary)" }}>•</span> Surface and classify feedback across the project
                  </li>
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "var(--app-text-primary)" }}>•</span> Flag when work has drifted from stated intent
                  </li>
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "var(--app-text-primary)" }}>•</span> Log and retrieve key decisions as they&apos;re made
                  </li>
                  <li
                    className="text-sm text-gray-400 flex items-center gap-2"
                    style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                  >
                    <span style={{ color: "var(--app-text-primary)" }}>•</span> Execute canvas actions through natural language
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
                      style={{ backgroundColor: "var(--app-text-primary)" }}
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
                      style={{ backgroundColor: "var(--app-card-elevated)" }}
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
                        className="text-sm text-foreground leading-relaxed"
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
                  style={{ backgroundColor: "var(--app-text-primary)" }}
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
                  style={{ backgroundColor: "var(--app-card-elevated)" }}
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
            style={{ borderTop: "1px solid var(--app-border-strong)" }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ backgroundColor: "var(--app-card-elevated)", border: "1px solid var(--app-border-strong)" }}
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
                className="flex-1 bg-transparent text-sm text-foreground placeholder-gray-500 focus:outline-none"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
                disabled={sageStatus === "streaming"}
              />
              <button
                type="submit"
                disabled={!sageInput.trim() || sageStatus === "streaming"}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                style={{ backgroundColor: sageInput.trim() ? "var(--app-text-primary)" : "var(--app-canvas-dot)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14 2L7 9M14 2L10 14L7 9M14 2L2 6L7 9"
                    stroke={sageInput.trim() ? "var(--app-bg-elevated)" : "var(--app-text-muted)"}
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

      {/* Project Creation Modal */}
      {showProjectCreationModal && (() => {
        const displayName =
          (authUser?.user_metadata?.display_name as string | undefined) ||
          authUser?.email?.split("@")[0] ||
          "You";
        const initials = displayName.slice(0, 2).toUpperCase();
        return (
          <ProjectCreationModal
            onClose={() => setShowProjectCreationModal(false)}
            workspaceMembers={workspaceSettings.members}
            currentUserId={authUser?.id ?? "guest"}
            currentUserName={displayName}
            currentUserEmail={authUser?.email ?? userEmail ?? ""}
            currentUserInitials={initials}
            workspaceId={activeWorkspaceId}
            frameworks={frameworks}
            canvases={canvases}
            onOpenCanvas={onOpenCanvas}
            onCanvasesChange={onCanvasesChange}
          />
        );
      })()}
    </div>
  );
}
