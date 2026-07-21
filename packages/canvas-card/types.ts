// Minimal shape the canvas card + preview need. Extend to fit your project.

export interface AtlasNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  data: Record<string, unknown>;
}

export interface CanvasCardEdge {
  id: string;
  source: string;
  target: string;
}

export interface Collaborator {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
}

export interface Canvas {
  id: string;
  name: string;
  nodes: AtlasNode[];
  updatedAt: string; // ISO date string
  isFavorite?: boolean;
  collaborators?: Collaborator[];
}
