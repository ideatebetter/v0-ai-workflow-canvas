import type { Node, Edge } from "@xyflow/react";

// Product types
export type ProductType = "atlas" | "synthesis" | "sage";

// Status types
export type FileStatus = "draft" | "in-review" | "approved";

// File extension types - Design source files
export type DesignFileExtension = ".fig" | ".ai" | ".psd" | ".indd" | ".xd" | ".sketch" | ".afdesign" | ".afphoto" | ".afpub" | ".glyphs" | ".procreate" | ".studio";

// File extension types - Image/raster
export type ImageFileExtension = ".png" | ".jpg" | ".jpeg" | ".webp" | ".tiff" | ".tif" | ".raw" | ".cr2" | ".arw" | ".heic" | ".gif" | ".bmp" | ".avif";

// File extension types - Vector/print-ready
export type VectorFileExtension = ".svg" | ".eps" | ".pdf" | ".pdfx" | ".wmf" | ".emf" | ".dxf";

// File extension types - Video
export type VideoFileExtension = ".mp4" | ".mov" | ".avi" | ".webm" | ".mkv";

// File extension types - Audio
export type AudioFileExtension = ".mp3" | ".wav" | ".aac" | ".flac" | ".ogg" | ".m4a" | ".wma" | ".aiff";

// File extension types - Documents
export type DocumentFileExtension = ".pptx" | ".doc" | ".docx" | ".txt" | ".md";

// All file extensions
export type FileExtension = DesignFileExtension | ImageFileExtension | VectorFileExtension | VideoFileExtension | AudioFileExtension | DocumentFileExtension;

// Supported file extensions for upload validation
export const SUPPORTED_EXTENSIONS: FileExtension[] = [
  // Design source files
  ".fig", ".ai", ".psd", ".indd", ".xd", ".sketch", ".afdesign", ".afphoto", ".afpub", ".glyphs", ".procreate", ".studio",
  // Image/raster
  ".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".raw", ".cr2", ".arw", ".heic", ".gif", ".bmp", ".avif",
  // Vector/print-ready
  ".svg", ".eps", ".pdf", ".pdfx", ".wmf", ".emf", ".dxf",
  // Video
  ".mp4", ".mov", ".avi", ".webm", ".mkv",
  // Audio
  ".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma", ".aiff",
  // Documents
  ".pptx", ".doc", ".docx", ".txt", ".md",
];

// File category from extension
export function getFileCategoryFromExtension(ext: string): "design" | "image" | "vector" | "video" | "audio" | "document" {
  const designExts = [".fig", ".ai", ".psd", ".indd", ".xd", ".sketch", ".afdesign", ".afphoto", ".afpub", ".glyphs", ".procreate", ".studio"];
  const imageExts = [".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".raw", ".cr2", ".arw", ".heic", ".gif", ".bmp", ".avif"];
  const vectorExts = [".svg", ".eps", ".pdf", ".pdfx", ".wmf", ".emf", ".dxf"];
  const videoExts = [".mp4", ".mov", ".avi", ".webm", ".mkv"];
  const audioExts = [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma", ".aiff"];
  
  if (designExts.includes(ext)) return "design";
  if (imageExts.includes(ext)) return "image";
  if (vectorExts.includes(ext)) return "vector";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  return "document";
}

// File type categories
export type FileTypeCategory = "design" | "document" | "video" | "audio" | "image" | "brand";

// Product colors
export const PRODUCT_COLORS: Record<ProductType, string> = {
  atlas: "#534AB7",
  synthesis: "#1D9E75",
  sage: "#BA7517",
};

// Status colors
export const STATUS_COLORS: Record<FileStatus, string> = {
  draft: "#444441",
  "in-review": "#185FA5",
  approved: "#3B6D11",
};

// Product labels
export const PRODUCT_LABELS: Record<ProductType, string> = {
  atlas: "Atlas",
  synthesis: "Synthesis",
  sage: "Sage",
};

// Status labels
export const STATUS_LABELS: Record<FileStatus, string> = {
  draft: "Draft",
  "in-review": "In Review",
  approved: "Approved",
};

// Task item interface
export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  assignee?: WorkspaceMember;
  createdAt?: string;
  dueDate?: string; // YYYY-MM-DD — drives which ribbon day this task appears on
}

// Member role type
export type MemberRole = "owner" | "admin" | "editor" | "viewer";

// Workspace member interface
export interface WorkspaceMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  initials: string;
  role?: MemberRole;
}

// Product configuration
export interface ProductConfig {
  id: ProductType;
  name: string;
  color: string;
  enabled: boolean;
}

// Naming convention token types
export type NamingToken = 
  | "project" 
  | "product" 
  | "type" 
  | "version" 
  | "date" 
  | "author" 
  | "status"
  | "custom";

// Naming convention rule
export interface NamingRule {
  id: string;
  tokens: NamingToken[];
  separator: string;
  dateFormat: "YYYY-MM-DD" | "YYYYMMDD" | "MM-DD-YYYY" | "DD-MM-YYYY";
  caseStyle: "lowercase" | "uppercase" | "titlecase" | "kebab-case" | "snake_case";
  customPrefix?: string;
  customSuffix?: string;
  example?: string;
}

// Naming conventions config
export interface NamingConventions {
  enabled: boolean;
  defaultRule: NamingRule;
  fileTypeRules: Partial<Record<"design" | "image" | "vector" | "video" | "document", NamingRule>>;
}

// Default naming rule
export const DEFAULT_NAMING_RULE: NamingRule = {
  id: "default",
  tokens: ["project", "type", "version"],
  separator: "_",
  dateFormat: "YYYY-MM-DD",
  caseStyle: "kebab-case",
  example: "atlas_logo_v1",
};

// Default naming conventions
export const DEFAULT_NAMING_CONVENTIONS: NamingConventions = {
  enabled: true,
  defaultRule: DEFAULT_NAMING_RULE,
  fileTypeRules: {},
};

// Workspace settings interface
  export interface WorkspaceSettings {
  id: string;
  name: string;
  description?: string;
  members: WorkspaceMember[];
  products: ProductConfig[];
  preferences: {
  defaultProduct: ProductType;
  defaultStatus: FileStatus;
  autoSave: boolean;
  showGrid: boolean;
  };
  namingConventions?: NamingConventions;
  // Branding assets
  branding?: {
    workspaceIcon?: string; // URL to workspace icon
    wordmark?: string; // URL to wordmark/logo
    profilePicture?: string; // URL to user profile picture
  };
  }

// Default workspace members
export const WORKSPACE_MEMBERS: WorkspaceMember[] = [
  { id: "m1", name: "Alex Chen", email: "alex@ideate.com", initials: "AC", role: "owner" },
  { id: "m2", name: "Sarah Miller", email: "sarah@ideate.com", initials: "SM", role: "admin" },
  { id: "m3", name: "James Wilson", email: "james@ideate.com", initials: "JW", role: "editor" },
  { id: "m4", name: "Emily Davis", email: "emily@ideate.com", initials: "ED", role: "editor" },
  { id: "m5", name: "Michael Brown", email: "michael@ideate.com", initials: "MB", role: "viewer" },
];

// Default workspace settings
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  id: "ws-1",
  name: "Ideate Design Team",
  description: "Brand and marketing design workspace",
  members: WORKSPACE_MEMBERS,
  products: [
    { id: "atlas", name: "Atlas", color: "#534AB7", enabled: true },
    { id: "synthesis", name: "Synthesis", color: "#1D9E75", enabled: true },
    { id: "sage", name: "Sage", color: "#BA7517", enabled: true },
  ],
  preferences: {
    defaultProduct: "atlas",
    defaultStatus: "draft",
    autoSave: true,
    showGrid: false,
  },
  namingConventions: DEFAULT_NAMING_CONVENTIONS,
};

// Uploaded file info
export interface UploadedFile {
  url: string; // Blob URL for the file
  pathname: string; // Blob pathname
  size: number; // File size in bytes
  uploadedAt: string; // ISO date string
}

// File version for version history
export interface FileVersion {
  id: string;
  versionName: string;
  previewImages: string[];
  uploadedAt: string;
  uploadedBy: WorkspaceMember;
  notes?: string;
  fileUrl?: string; // URL of the uploaded file for this version
  fileSize?: number; // Size in bytes
}

// File activity/history entry
export interface FileActivity {
  id: string;
  type: "upload" | "comment" | "status-change" | "task-complete" | "version-add";
  description: string;
  user: WorkspaceMember;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// File node data interface
export interface FileNodeData {
  label: string;
  fileName: string;
  product: ProductType;
  status: FileStatus;
  fileExtension: FileExtension;
  lastModified: string;
  previewImages?: string[]; // Array of up to 4 preview image URLs
  tasks?: TaskItem[]; // Task items for this file
  uploadedFile?: UploadedFile; // Uploaded file data from Vercel Blob
  versions?: FileVersion[]; // Version history
  activities?: FileActivity[]; // Activity/update history
  dueDate?: string; // Due date for the file
  assignees?: WorkspaceMember[]; // Team members assigned to this file
  blockers?: number; // Number of blockers
  // Sync-related fields
  syncGroupId?: string; // Files with the same syncGroupId are synced together
  originalNodeId?: string; // The node ID this was copied from (helps identify sync-eligible files)
  // Figma live sync
  figmaSync?: {
    figmaFileKey: string;   // Figma file key (from URL)
    figmaFrameId: string;   // Figma frame/component node ID
    figmaFrameName: string; // Frame name at time of last sync
    lastSynced: string;     // ISO timestamp
  };
}

// Text formatting options
export interface TextFormatting {
  color: string;
  font: "sans" | "serif" | "mono";
  size: "small" | "medium" | "large" | "xlarge";
  bold: boolean;
  strikethrough: boolean;
  align: "left" | "center" | "right";
}

// Text node data interface (simplified single text element)
export interface TextNodeData {
  label: string;
  content: string;
  textType?: "brief" | "note" | "description"; // Optional for backwards compat
  formatting?: TextFormatting;
  lastModified: string;
  author?: WorkspaceMember;
  // Sync support
  syncGroupId?: string;
  originalNodeId?: string;
}

// Sage chatbot node data interface
export interface SageChatbotNodeData {
  label: string;
  messages: SageChatMessage[];
  lastModified: string;
}

// Sage chat message
export interface SageChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Sage overview node data interface with health intelligence
export interface SageOverviewNodeData {
  label: string;
  projectProgress: number; // 0-100
  alignmentScore: number; // 0-100 (legacy, maps to driftScore)
  summary: string;
  lastUpdated: string;
  // Sage Health Intelligence (Section 5)
  healthStatus?: SageHealthStatus;
  driftScore?: number; // 0-100 alignment score
  driftDelta?: number; // Change since last calculation
  intent?: ProjectIntent | null;
  decisions?: Decision[];
  feedback?: FeedbackRecord[];
  unresolvedFeedbackCount?: number;
  conflictCount?: number;
}

// Stakeholder node data interface
export interface StakeholderNodeData {
  label: string;
  stakeholder: WorkspaceMember;
  comprehensionLevel: "low" | "medium" | "high";
  alignmentStatus: "aligned" | "needs-attention" | "misaligned";
  notes: string;
  lastInteraction: string;
  keyInsights: string[];
}

// Capacity & Resourcing node data interface
export interface CapacityNodeData {
  label: string;
  teamMembers: {
    member: WorkspaceMember;
    utilizationRate: number; // 0-100
    currentAllocation: number; // 0-100
    plannedAllocation: number; // 0-100
    benchTime: number; // hours available
    skills: string[];
  }[];
  lastUpdated: string;
}

// Financial Performance node data interface
export interface FinancialNodeData {
  label: string;
  projectMargin: number; // percentage
  budgetConsumed: number; // percentage
  revenueRealized: number; // percentage
  blendedRateEfficiency: number; // percentage
  utilizationAdjustedMargin: number; // percentage
  status: "healthy" | "at-risk" | "underperforming";
  lastUpdated: string;
}

// Project Health node data interface
export interface ProjectHealthNodeData {
  label: string;
  daysSinceClientTouchpoint: number;
  openFeedbackCycles: number;
  revisionCount: number;
  projectPhase: "discovery" | "design" | "development" | "review" | "delivery";
  healthStatus: "on-track" | "needs-attention" | "at-risk";
  lastUpdated: string;
}

// Pipeline & Workload Forecast node data interface
export interface PipelineNodeData {
  label: string;
  forecast30Days: { projectName: string; probability: number; estimatedHours: number }[];
  forecast60Days: { projectName: string; probability: number; estimatedHours: number }[];
  forecast90Days: { projectName: string; probability: number; estimatedHours: number }[];
  currentCapacity: number; // hours available
  projectedLoad: number; // hours needed
  capacityStatus: "available" | "balanced" | "overloaded";
  lastUpdated: string;
}

// Team & Operational Health node data interface
export interface TeamHealthNodeData {
  label: string;
  feedbackLoopVelocity: number; // hours average
  revisionToApprovalRatio: number; // e.g., 2.5 revisions per approval
  timeSavedHours: number; // hours saved by Ideate
  trendDirection: "improving" | "stable" | "declining";
  lastUpdated: string;
}

// Moodboard image position for freeform layout
export interface MoodboardImagePosition {
  x: number; // pixel position from left
  y: number; // pixel position from top
  zIndex: number;
  rotation: number; // degrees of rotation (-15 to 15)
  scale: number; // scale factor (0.6 to 1.2)
}

// Moodboard node data interface - groups multiple images together
export interface MoodboardNodeData {
  label: string;
  images: {
    id: string;
    url: string;
    fileName: string;
    thumbnail?: string;
    fileType?: "image" | "video"; // Track whether this is an image or video
  }[];
  isExpanded: boolean;
  createdAt: string;
freeformPositions?: Record<string, MoodboardImagePosition>; // imageId -> position
  }
  
  // Mockup image node data - AI-generated mockup images
  export interface MockupImageNodeData {
    label: string;
    imageUrl: string;
    sourceFileName?: string;
    prompt?: string;
    generatedAt: string;
  }
  
  // AI Prompt node data - for generating images from source
  export interface AIPromptNodeData {
    sourceNodeId: string;
    sourceImageUrl: string;
    sourceFileName: string;
    onGenerate?: (prompt: string, aspectRatio: string) => void;
    onClose?: () => void;
    onMockupsCreated?: (mockups: Array<{ imageUrl: string; name: string }>) => void;
  }
  
  // ============================================================================
  // SAGE DATA MODEL - Project Intelligence & Reasoning
  // ============================================================================

// Feedback classification using Discern taxonomy
export type FeedbackType = 
  | "aesthetic-preference"      // Subjective visual/style preferences
  | "functional-requirement"    // Objective functionality needs
  | "strategic-direction"       // Business/brand strategy guidance
  | "technical-constraint"      // Technical limitations or requirements
  | "clarification-request"     // Questions needing more info
  | "approval"                  // Explicit sign-off
  | "revision-request";         // Request to modify existing work

// Actor types for audit trail
export type SageActor = "user" | "sage" | "system";

// Project Intent - The guiding north star for a project
export interface ProjectIntent {
  id: string;
  projectId: string;          // References Canvas.id
  statement: string;          // Current intent statement
  createdAt: string;
  updatedAt: string;
  actor: SageActor;
  revisionHistory: IntentRevision[];
}

export interface IntentRevision {
  id: string;
  statement: string;
  createdAt: string;
  actor: SageActor;
  reason?: string;            // Why the intent was updated
}

// Decision Log - Immutable record of project decisions
export interface Decision {
  id: string;
  projectId: string;
  decision: string;           // What was decided
  rationale: string;          // Why it was decided
  actor: SageActor;
  createdAt: string;
  relatedFeedbackIds?: string[];  // Links to feedback that informed this decision
  tags?: string[];
}

// Feedback Record - Classified stakeholder input
export interface FeedbackRecord {
  id: string;
  projectId: string;
  rawInput: string;           // Original feedback text
  type: FeedbackType;         // Classified type
  actionabilityScore: number; // 0-100 score of how actionable the feedback is
  conflictFlag: boolean;      // Whether this conflicts with other feedback
  conflictsWith?: string[];   // IDs of conflicting feedback
  reviewerRole: string;       // Role of the person who gave feedback
  revisionId?: string;        // Which project revision this applies to
  source: "stakeholder" | "client" | "internal" | "sage";
  createdAt: string;
  resolvedAt?: string;        // When/if the feedback was addressed
  resolution?: string;        // How it was resolved
}

// Drift Score - Measures alignment with original intent
export interface DriftRecord {
  id: string;
  projectId: string;
  score: number;              // 0-100 alignment score (100 = perfectly aligned)
  delta: number;              // Change since last calculation
  calculatedAt: string;
  revisionId?: string;
  factors: DriftFactor[];     // What contributed to the score
}

export interface DriftFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

// Status Set - Predefined workflow statuses by project type
export type ProjectType = 
  | "brand-identity"
  | "editorial"
  | "product-design"
  | "environmental"
  | "motion"
  | "web-design"
  | "packaging"
  | "custom";

export interface StatusSet {
  id: string;
  projectId: string;
  projectType: ProjectType;
  statuses: StatusDefinition[];
  createdAt: string;
  createdBy: SageActor;
}

export interface StatusDefinition {
  id: string;
  label: string;
  color: string;
  order: number;
  description?: string;
}

// Predefined status workflows by project type
export const STATUS_WORKFLOWS: Record<ProjectType, StatusDefinition[]> = {
  "brand-identity": [
    { id: "bi-1", label: "Discovery", color: "#93c5fd", order: 0, description: "Research and stakeholder interviews" },
    { id: "bi-2", label: "Strategy", color: "#c4b5fd", order: 1, description: "Brand positioning and messaging" },
    { id: "bi-3", label: "Concepts", color: "#fde047", order: 2, description: "Initial creative directions" },
    { id: "bi-4", label: "Refinement", color: "#fdba74", order: 3, description: "Iterating on chosen direction" },
    { id: "bi-5", label: "Final", color: "#86efac", order: 4, description: "Approved deliverables" },
    { id: "bi-6", label: "Delivered", color: "#e5e5e5", order: 5, description: "Handoff complete" },
  ],
  "editorial": [
    { id: "ed-1", label: "Brief", color: "#93c5fd", order: 0 },
    { id: "ed-2", label: "Outline", color: "#c4b5fd", order: 1 },
    { id: "ed-3", label: "Draft", color: "#fde047", order: 2 },
    { id: "ed-4", label: "Review", color: "#fdba74", order: 3 },
    { id: "ed-5", label: "Revisions", color: "#fca5a5", order: 4 },
    { id: "ed-6", label: "Published", color: "#86efac", order: 5 },
  ],
  "product-design": [
    { id: "pd-1", label: "Research", color: "#93c5fd", order: 0 },
    { id: "pd-2", label: "Wireframes", color: "#c4b5fd", order: 1 },
    { id: "pd-3", label: "Mockups", color: "#fde047", order: 2 },
    { id: "pd-4", label: "Prototype", color: "#fdba74", order: 3 },
    { id: "pd-5", label: "Testing", color: "#fca5a5", order: 4 },
    { id: "pd-6", label: "Development", color: "#86efac", order: 5 },
  ],
  "environmental": [
    { id: "ev-1", label: "Site Analysis", color: "#93c5fd", order: 0 },
    { id: "ev-2", label: "Concept", color: "#c4b5fd", order: 1 },
    { id: "ev-3", label: "Schematic", color: "#fde047", order: 2 },
    { id: "ev-4", label: "Development", color: "#fdba74", order: 3 },
    { id: "ev-5", label: "Documentation", color: "#fca5a5", order: 4 },
    { id: "ev-6", label: "Installation", color: "#86efac", order: 5 },
  ],
  "motion": [
    { id: "mo-1", label: "Pre-production", color: "#93c5fd", order: 0 },
    { id: "mo-2", label: "Storyboard", color: "#c4b5fd", order: 1 },
    { id: "mo-3", label: "Animatic", color: "#fde047", order: 2 },
    { id: "mo-4", label: "Animation", color: "#fdba74", order: 3 },
    { id: "mo-5", label: "Review", color: "#fca5a5", order: 4 },
    { id: "mo-6", label: "Final Render", color: "#86efac", order: 5 },
  ],
  "web-design": [
    { id: "wd-1", label: "Discovery", color: "#93c5fd", order: 0 },
    { id: "wd-2", label: "Wireframes", color: "#c4b5fd", order: 1 },
    { id: "wd-3", label: "Design", color: "#fde047", order: 2 },
    { id: "wd-4", label: "Development", color: "#fdba74", order: 3 },
    { id: "wd-5", label: "QA", color: "#fca5a5", order: 4 },
    { id: "wd-6", label: "Launch", color: "#86efac", order: 5 },
  ],
  "packaging": [
    { id: "pk-1", label: "Brief", color: "#93c5fd", order: 0 },
    { id: "pk-2", label: "Concepts", color: "#c4b5fd", order: 1 },
    { id: "pk-3", label: "Refinement", color: "#fde047", order: 2 },
    { id: "pk-4", label: "Dielines", color: "#fdba74", order: 3 },
    { id: "pk-5", label: "Proofing", color: "#fca5a5", order: 4 },
    { id: "pk-6", label: "Production", color: "#86efac", order: 5 },
  ],
  "custom": [
    { id: "cu-1", label: "To Do", color: "#e5e5e5", order: 0 },
    { id: "cu-2", label: "In Progress", color: "#93c5fd", order: 1 },
    { id: "cu-3", label: "Review", color: "#fde047", order: 2 },
    { id: "cu-4", label: "Done", color: "#86efac", order: 3 },
  ],
};

// Sage Project State - Aggregated project intelligence
export interface SageProjectState {
  projectId: string;
  intent: ProjectIntent | null;
  decisions: Decision[];
  feedback: FeedbackRecord[];
  driftHistory: DriftRecord[];
  statusSet: StatusSet | null;
  currentDriftScore: number;
  unresolvedFeedbackCount: number;
  conflictCount: number;
  lastUpdated: string;
}

// Health status derived from Sage metrics
export type SageHealthStatus = "healthy" | "needs-attention" | "at-risk" | "critical";

export function calculateHealthStatus(state: SageProjectState): SageHealthStatus {
  const { currentDriftScore, unresolvedFeedbackCount, conflictCount } = state;
  
  if (conflictCount > 3 || currentDriftScore < 40) return "critical";
  if (conflictCount > 1 || currentDriftScore < 60 || unresolvedFeedbackCount > 5) return "at-risk";
  if (unresolvedFeedbackCount > 2 || currentDriftScore < 80) return "needs-attention";
  return "healthy";
}

// Color mapping for health status
export const HEALTH_STATUS_COLORS: Record<SageHealthStatus, string> = {
  "healthy": "#86efac",
  "needs-attention": "#fde047",
  "at-risk": "#fdba74",
  "critical": "#fca5a5",
};

// Atlas node type
export type AtlasNodeType = "file" | "statusPill" | "text" | "sageChatbot" | "sageOverview" | "stakeholder" | "capacity" | "financial" | "projectHealth" | "pipeline" | "teamHealth" | "moodboard" | "mockupImage" | "aiPrompt";

// Atlas workflow node - using generic data for multiple node types
export type AtlasNode = Node<FileNodeData | TextNodeData | SageChatbotNodeData | SageOverviewNodeData | StakeholderNodeData | CapacityNodeData | FinancialNodeData | ProjectHealthNodeData | PipelineNodeData | TeamHealthNodeData | MoodboardNodeData | MockupImageNodeData | AIPromptNodeData | Record<string, unknown>, AtlasNodeType>;

// Filter state
export interface FilterState {
  product: ProductType | "all";
  status: FileStatus | "all";
}

// Initial file nodes for the branding project - Left to Right workflow
// Column 1: Brand Guidelines (starting point)
// Column 2: Logo Suite, Feedback Log
// Column 3: Campaign Moodboard, Client Presentation
// Column 4: Hero Photography, Social Templates
// Column 5: Brand Video (final output)
export const INITIAL_FILE_NODES: AtlasNode[] = [
  {
    id: "file-1",
    type: "file",
    position: { x: 50, y: 180 },
    data: {
      label: "Brand Guidelines",
      fileName: "Brand Guidelines.pdf",
      product: "atlas",
      status: "approved",
      fileExtension: ".pdf",
      lastModified: "Updated 2 days ago",
      tasks: [
        { id: "t1", title: "Review color palette", completed: true, assignee: WORKSPACE_MEMBERS[0] },
        { id: "t2", title: "Update typography section", completed: false, assignee: WORKSPACE_MEMBERS[1] },
        { id: "t3", title: "Add logo usage examples", completed: false },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1557683316-973673baf926?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=200&h=200&fit=crop",
      ],
    },
  },
  {
    id: "file-2",
    type: "file",
    position: { x: 350, y: 50 },
    data: {
      label: "Logo Suite",
      fileName: "Logo Suite.ai",
      product: "synthesis",
      status: "approved",
      fileExtension: ".ai",
      lastModified: "Updated 4 days ago",
      tasks: [
        { id: "t4", title: "Export SVG versions", completed: true, assignee: WORKSPACE_MEMBERS[2] },
        { id: "t5", title: "Create favicon set", completed: true, assignee: WORKSPACE_MEMBERS[0] },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1634942537034-2531766767d1?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=200&h=200&fit=crop",
      ],
    },
  },
  {
    id: "file-6",
    type: "file",
    position: { x: 350, y: 310 },
    data: {
      label: "Feedback Log",
      fileName: "Feedback Log.pdf",
      product: "sage",
      status: "in-review",
      fileExtension: ".pdf",
      lastModified: "Updated 3 days ago",
      tasks: [
        { id: "t12", title: "Incorporate client notes", completed: false, assignee: WORKSPACE_MEMBERS[2] },
        { id: "t13", title: "Archive resolved items", completed: true, assignee: WORKSPACE_MEMBERS[3] },
        { id: "t14", title: "Schedule review meeting", completed: false },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=200&fit=crop",
      ],
    },
  },
  {
    id: "file-3",
    type: "file",
    position: { x: 650, y: 50 },
    data: {
      label: "Campaign Moodboard",
      fileName: "Campaign Moodboard.fig",
      product: "synthesis",
      status: "in-review",
      fileExtension: ".fig",
      lastModified: "Updated yesterday",
      tasks: [
        { id: "t6", title: "Add summer vibes section", completed: false, assignee: WORKSPACE_MEMBERS[3] },
        { id: "t7", title: "Review with client", completed: false, assignee: WORKSPACE_MEMBERS[1] },
        { id: "t8", title: "Collect reference images", completed: true },
        { id: "t9", title: "Create mood categories", completed: false, assignee: WORKSPACE_MEMBERS[4] },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=200&fit=crop",
      ],
    },
  },
  {
    id: "file-4",
    type: "file",
    position: { x: 650, y: 310 },
    data: {
      label: "Client Presentation",
      fileName: "Client Presentation.pptx",
      product: "atlas",
      status: "in-review",
      fileExtension: ".pptx",
      lastModified: "Updated 1 day ago",
      tasks: [
        { id: "t10", title: "Add case studies", completed: false, assignee: WORKSPACE_MEMBERS[0] },
        { id: "t11", title: "Include pricing slide", completed: false },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1551434678-e076c223a692?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop",
      ],
    },
  },
  {
    id: "file-5",
    type: "file",
    position: { x: 950, y: 50 },
    data: {
      label: "Hero Photography",
      fileName: "Hero Photography.psd",
      product: "synthesis",
      status: "draft",
      fileExtension: ".psd",
      lastModified: "Updated today",
      tasks: [],
      previewImages: [
        "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
      ],
    },
  },
  {
    id: "file-7",
    type: "file",
    position: { x: 950, y: 310 },
    data: {
      label: "Social Templates",
      fileName: "Social Templates.fig",
      product: "atlas",
      status: "approved",
      fileExtension: ".fig",
      lastModified: "Updated 5 days ago",
      tasks: [
        { id: "t15", title: "Add Instagram stories", completed: true, assignee: WORKSPACE_MEMBERS[4] },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=200&h=200&fit=crop",
      ],
    },
  },
  {
    id: "file-8",
    type: "file",
    position: { x: 1250, y: 180 },
    data: {
      label: "Brand Video",
      fileName: "Brand Video.mp4",
      product: "sage",
      status: "draft",
      fileExtension: ".mp4",
      lastModified: "Updated 6 days ago",
      tasks: [
        { id: "t16", title: "Color grade footage", completed: false, assignee: WORKSPACE_MEMBERS[1] },
        { id: "t17", title: "Add background music", completed: false },
      ],
      previewImages: [
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&h=200&fit=crop",
      ],
    },
  },
];

// Initial edges - Left to Right flow
export const INITIAL_EDGES: Edge[] = [
  // From Brand Guidelines to Column 2
  { id: "e1", source: "file-1", target: "file-2", type: "default", animated: true },
  { id: "e2", source: "file-1", target: "file-6", type: "default", animated: true },
  // From Column 2 to Column 3
  { id: "e3", source: "file-2", target: "file-3", type: "default", animated: true },
  { id: "e4", source: "file-6", target: "file-4", type: "default", animated: true },
  // From Column 3 to Column 4
  { id: "e5", source: "file-3", target: "file-5", type: "default", animated: true },
  { id: "e6", source: "file-4", target: "file-7", type: "default", animated: true },
  // From Column 4 to Brand Video
  { id: "e7", source: "file-5", target: "file-8", type: "default", animated: true },
  { id: "e8", source: "file-7", target: "file-8", type: "default", animated: true },
];

// File type to category mapping
export const FILE_TYPE_CATEGORIES: Record<FileTypeCategory, { label: string; extensions: FileExtension[] }> = {
  design: { label: "Design File", extensions: [".fig", ".psd", ".ai"] },
  document: { label: "Document", extensions: [".pdf", ".pptx"] },
  video: { label: "Video", extensions: [".mp4"] },
  image: { label: "Image", extensions: [".psd"] },
  brand: { label: "Brand Asset", extensions: [".ai", ".indd"] },
};

// Comment interface for Figma-style commenting
export interface CanvasComment {
  id: string;
  position: { x: number; y: number };
  nodeId?: string; // If attached to a specific node
  content: string;
  author: WorkspaceMember;
  createdAt: string;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  content: string;
  author: WorkspaceMember;
  createdAt: string;
}

// Canvas visibility type
export type CanvasVisibility = "workspace" | "private";

// Project interface for grouping canvases
export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string; // Accent color for the project
  createdAt: string;
  updatedAt: string;
  createdBy: WorkspaceMember;
  isExpanded: boolean; // For UI collapse state
}

// Project colors
export const PROJECT_COLORS = [
  "#F0FE00", // Yellow (default)
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Orange
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
];

// Presentation group - groups multiple nodes into a single slide
export interface PresentationGroup {
  id: string;
  nodeIds: string[]; // IDs of nodes in this group
  label?: string;
}

// A named, saved presentation flow — edges + groups frozen at save time
export interface SavedPresentationFlow {
  id: string;
  name: string;
  edges: Edge[];
  groups: Array<{
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
  }>;
}

// Presentation group node data
export interface PresentationGroupNodeData {
  label?: string;
  nodeIds: string[];
  thumbnails: string[]; // URLs of thumbnails for preview
  originalNodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>; // Store original nodes for restoration when ungrouping
  [key: string]: unknown;
}

// Canvas interface
export interface Canvas {
  id: string;
  name: string;
  description?: string;
  previewImage?: string;
  projectId?: string; // Optional project grouping
  nodes: AtlasNode[];
  edges: Edge[];
  comments: CanvasComment[];
  createdAt: string;
  updatedAt: string;
  createdBy: WorkspaceMember;
  isFavorite: boolean;
  visibility: CanvasVisibility;
  presentationName?: string; // Optional name for presentation mode
  presentationGroups?: PresentationGroup[]; // Grouped nodes for presentation
  presentationFlows?: SavedPresentationFlow[]; // Saved named presentation flows
}

// Sample comments for initial canvas
export const INITIAL_COMMENTS: CanvasComment[] = [
  {
    id: "comment-1",
    position: { x: 480, y: 120 },
    nodeId: "file-2",
    content: "Can we explore a more vibrant color palette for this?",
    author: WORKSPACE_MEMBERS[1],
    createdAt: "2026-05-12T10:30:00Z",
    resolved: false,
    replies: [
      {
        id: "reply-1",
        content: "Good idea! I'll prepare some alternatives.",
        author: WORKSPACE_MEMBERS[0],
        createdAt: "2026-05-12T11:15:00Z",
      },
    ],
  },
  {
    id: "comment-2",
    position: { x: 800, y: 280 },
    content: "Need to align this with the new brand guidelines",
    author: WORKSPACE_MEMBERS[2],
    createdAt: "2026-05-11T14:00:00Z",
    resolved: true,
    replies: [],
  },
];

// Framework category types
export type FrameworkCategory = "workflow" | "branding" | "marketing" | "social" | "presentation" | "other";

// Framework visibility type
export type FrameworkVisibility = "private" | "workspace" | "community";

// Framework interface
export interface CanvasFramework {
  id: string;
  name: string;
  description: string;
  category: FrameworkCategory;
  visibility: FrameworkVisibility;
  previewImage?: string;
  nodes: AtlasNode[];
  edges: Edge[];
  createdAt: string;
  createdBy: WorkspaceMember;
  upvotes: number;
  upvotedBy: string[]; // Array of user IDs who upvoted
  downloads: number;
  tags: string[];
}

// Framework categories with labels
export const FRAMEWORK_CATEGORIES: Record<FrameworkCategory, { label: string; icon: string }> = {
  workflow: { label: "Workflow", icon: "flow" },
  branding: { label: "Branding", icon: "palette" },
  marketing: { label: "Marketing", icon: "megaphone" },
  social: { label: "Social Media", icon: "share" },
  presentation: { label: "Presentation", icon: "slides" },
  other: { label: "Other", icon: "grid" },
};

// Sample community frameworks
export const SAMPLE_FRAMEWORKS: CanvasFramework[] = [
  {
    id: "framework-1",
    name: "Brand Identity Kit",
    description: "Complete brand identity workflow with logo variations, color palettes, and typography guidelines.",
    category: "branding",
    visibility: "community",
    previewImage: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop",
    nodes: [],
    edges: [],
    createdAt: "2026-04-15T10:00:00Z",
    createdBy: {
      id: "user-community-1",
      name: "Sarah Chen",
      email: "sarah@example.com",
      initials: "SC",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      role: "Designer",
    },
    upvotes: 234,
    upvotedBy: [],
    downloads: 1205,
    tags: ["branding", "identity", "logo", "colors"],
  },
  {
    id: "framework-2",
    name: "Social Campaign Planner",
    description: "Plan and organize your social media campaigns with this visual workflow framework.",
    category: "social",
    visibility: "community",
    previewImage: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&h=400&fit=crop",
    nodes: [],
    edges: [],
    createdAt: "2026-04-20T14:30:00Z",
    createdBy: {
      id: "user-community-2",
      name: "Marcus Johnson",
      email: "marcus@example.com",
      initials: "MJ",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      role: "Marketing Lead",
    },
    upvotes: 189,
    upvotedBy: [],
    downloads: 892,
    tags: ["social", "campaign", "planning", "content"],
  },
  {
    id: "framework-3",
    name: "Product Launch Workflow",
    description: "End-to-end product launch planning with milestones, assets, and team coordination.",
    category: "workflow",
    visibility: "community",
    previewImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
    nodes: [],
    edges: [],
    createdAt: "2026-05-01T09:00:00Z",
    createdBy: {
      id: "user-community-3",
      name: "Emily Park",
      email: "emily@example.com",
      initials: "EP",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      role: "Product Manager",
    },
    upvotes: 312,
    upvotedBy: [],
    downloads: 1567,
    tags: ["launch", "product", "workflow", "planning"],
  },
  {
    id: "framework-4",
    name: "Marketing Brief Framework",
    description: "Structured creative brief framework for marketing campaigns with stakeholder sections.",
    category: "marketing",
    visibility: "community",
    previewImage: "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=600&h=400&fit=crop",
    nodes: [],
    edges: [],
    createdAt: "2026-05-05T11:00:00Z",
    createdBy: {
      id: "user-community-4",
      name: "David Kim",
      email: "david@example.com",
      initials: "DK",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      role: "Creative Director",
    },
    upvotes: 156,
    upvotedBy: [],
    downloads: 734,
    tags: ["brief", "marketing", "creative", "campaign"],
  },
  {
    id: "framework-5",
    name: "Pitch Deck Builder",
    description: "Visual canvas for building compelling pitch decks with story flow and slide planning.",
    category: "presentation",
    visibility: "community",
    previewImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop",
    nodes: [],
    edges: [],
    createdAt: "2026-05-08T16:00:00Z",
    createdBy: {
      id: "user-community-5",
      name: "Lisa Wang",
      email: "lisa@example.com",
      initials: "LW",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop",
      role: "Founder",
    },
    upvotes: 278,
    upvotedBy: [],
    downloads: 1123,
    tags: ["pitch", "deck", "presentation", "startup"],
  },
];

// Initial canvases
export const INITIAL_CANVASES: Canvas[] = [
  {
    id: "canvas-1",
    name: "Brand Refresh 2026",
    description: "Main branding project for Q2 refresh",
    previewImage: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop",
    nodes: INITIAL_FILE_NODES,
    edges: INITIAL_EDGES,
    comments: INITIAL_COMMENTS,
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-13T14:30:00Z",
    createdBy: WORKSPACE_MEMBERS[0],
    collaborators: [WORKSPACE_MEMBERS[0], WORKSPACE_MEMBERS[1], WORKSPACE_MEMBERS[2]],
    isFavorite: true,
    visibility: "workspace",
  },
  {
    id: "canvas-2",
    name: "Social Media Kit",
    description: "Templates for social media campaigns",
    previewImage: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&h=400&fit=crop",
    nodes: [],
    edges: [],
    comments: [],
    createdAt: "2026-05-05T09:00:00Z",
    updatedAt: "2026-05-12T16:45:00Z",
    createdBy: WORKSPACE_MEMBERS[1],
    collaborators: [WORKSPACE_MEMBERS[1], WORKSPACE_MEMBERS[3]],
    isFavorite: false,
    visibility: "workspace",
  },
  {
    id: "canvas-3",
    name: "Product Launch Assets",
    description: "Design assets for upcoming product launch",
    previewImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
    nodes: [],
    edges: [],
    comments: [],
    createdAt: "2026-05-08T11:30:00Z",
    updatedAt: "2026-05-11T10:15:00Z",
    createdBy: WORKSPACE_MEMBERS[0],
    collaborators: [WORKSPACE_MEMBERS[0], WORKSPACE_MEMBERS[2], WORKSPACE_MEMBERS[4]],
    isFavorite: true,
    visibility: "private",
  },
];
