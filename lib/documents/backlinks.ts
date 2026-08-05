import type { Canvas, DocumentCanvasNodeData } from "@/lib/atlas-types"

export interface Backlink {
  canvasId: string
  canvasName: string
  nodeId: string
  pageId?: string | null
}

export function findBacklinks(canvases: Canvas[], docId: string): Backlink[] {
  const out: Backlink[] = []
  for (const canvas of canvases) {
    // Search node buckets: top-level canvas.nodes plus every page's nodes.
    const buckets: Array<{ pageId: string | null; nodes: Canvas["nodes"] }> = [
      { pageId: null, nodes: canvas.nodes ?? [] },
    ]
    if (canvas.pages) {
      for (const page of canvas.pages) {
        buckets.push({ pageId: page.id, nodes: page.nodes ?? [] })
      }
    }
    for (const bucket of buckets) {
      for (const node of bucket.nodes) {
        if (node.type !== "document") continue
        const d = node.data as unknown as DocumentCanvasNodeData
        if (d?.docId === docId) {
          out.push({
            canvasId: canvas.id,
            canvasName: canvas.name,
            nodeId: node.id,
            pageId: bucket.pageId,
          })
        }
      }
    }
  }
  return out
}

export function countBacklinks(canvases: Canvas[], docId: string): number {
  return findBacklinks(canvases, docId).length
}
