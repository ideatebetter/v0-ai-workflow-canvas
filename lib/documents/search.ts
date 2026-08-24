import type { DocBlock, DocContent, TreeNode, TreeState } from "./types"
import { ancestorChain } from "./tree"

export interface SearchResult {
  node: TreeNode
  breadcrumb: string[]
  matchIn: "title" | "body" | "both"
}

const collectText = (block: DocBlock, into: string[]): void => {
  if (typeof block.text === "string") into.push(block.text)
  if (block.content) for (const child of block.content) collectText(child, into)
}

export const contentToPlainText = (content: DocContent | undefined): string => {
  if (!content) return ""
  const parts: string[] = []
  for (const block of content.content) collectText(block, parts)
  return parts.join(" ")
}

const nodeTitle = (node: TreeNode): string =>
  node.type === "folder" ? node.name : node.title

export function searchDocuments(
  state: TreeState,
  rawQuery: string,
): SearchResult[] {
  const q = rawQuery.trim().toLowerCase()
  if (q.length === 0) return []

  const results: SearchResult[] = []
  for (const node of Object.values(state)) {
    const title = nodeTitle(node).toLowerCase()
    const inTitle = title.includes(q)
    let inBody = false
    if (node.type === "document") {
      const body = contentToPlainText(node.content).toLowerCase()
      inBody = body.includes(q)
    }
    if (!inTitle && !inBody) continue

    const breadcrumb = ancestorChain(state, node.id).map((a) => nodeTitle(a) || "Untitled")

    results.push({
      node,
      breadcrumb,
      matchIn: inTitle && inBody ? "both" : inTitle ? "title" : "body",
    })
  }

  results.sort((a, b) => {
    if (a.matchIn !== b.matchIn) {
      const rank = { title: 0, both: 1, body: 2 } as const
      return rank[a.matchIn] - rank[b.matchIn]
    }
    return nodeTitle(a.node).localeCompare(nodeTitle(b.node))
  })

  return results
}
