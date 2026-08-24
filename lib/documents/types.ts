export type NodeId = string

export interface FolderNode {
  id: NodeId
  type: "folder"
  parentId: NodeId | null
  name: string
  order: string
  collapsed: boolean
  createdAt: number
  updatedAt: number
}

export interface DocumentNode {
  id: NodeId
  type: "document"
  parentId: NodeId | null
  title: string
  icon: string | null
  order: string
  content: DocContent
  createdAt: number
  updatedAt: number
}

export type TreeNode = FolderNode | DocumentNode

export type TreeState = Record<NodeId, TreeNode>

export interface DocBlock {
  id: NodeId
  type: string
  attrs?: Record<string, unknown>
  content?: DocBlock[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export interface DocContent {
  type: "doc"
  content: DocBlock[]
}

export interface TreeNodeWithChildren {
  node: TreeNode
  depth: number
  children: TreeNodeWithChildren[]
}

export interface DocumentCanvasNodeData {
  docId: NodeId
  displayMode: "card" | "panel"
}

export const emptyDocContent = (): DocContent => ({
  type: "doc",
  content: [],
})
