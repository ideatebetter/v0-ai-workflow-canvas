export type DropZone =
  | { kind: "before"; nodeId: string; parentId: string | null }
  | { kind: "into"; nodeId: string }
  | { kind: "after"; nodeId: string; parentId: string | null }
  | { kind: "root-end" }

export function parseDropId(
  id: string | number | null | undefined,
  nodeParentLookup: (nodeId: string) => string | null,
): DropZone | null {
  if (typeof id !== "string") return null
  if (id === "root-end") return { kind: "root-end" }
  const [nodeId, kind] = id.split(":")
  if (!nodeId || !kind) return null
  if (kind === "into") return { kind: "into", nodeId }
  if (kind === "before")
    return { kind: "before", nodeId, parentId: nodeParentLookup(nodeId) }
  if (kind === "after")
    return { kind: "after", nodeId, parentId: nodeParentLookup(nodeId) }
  return null
}

export const buildDropId = {
  before: (nodeId: string) => `${nodeId}:before`,
  into: (nodeId: string) => `${nodeId}:into`,
  after: (nodeId: string) => `${nodeId}:after`,
  rootEnd: "root-end",
}
