import { describe, expect, it } from "vitest"
import { createDocumentsStore } from "./store"
import { searchDocuments } from "./search"

const makeStore = () => createDocumentsStore()

describe("searchDocuments", () => {
  it("returns nothing for empty queries", () => {
    const store = makeStore()
    store.getState().createDocument({ title: "Anything" })
    expect(searchDocuments(store.getState().tree, "")).toEqual([])
    expect(searchDocuments(store.getState().tree, "   ")).toEqual([])
  })

  it("matches on document title, case-insensitive", () => {
    const store = makeStore()
    const id = store.getState().createDocument({ title: "Brand Guidelines" })
    const results = searchDocuments(store.getState().tree, "brand")
    expect(results.map((r) => r.node.id)).toEqual([id])
    expect(results[0]?.matchIn).toBe("title")
  })

  it("matches on document body plain text", () => {
    const store = makeStore()
    const id = store.getState().createDocument({
      title: "Meeting",
      content: {
        type: "doc",
        content: [
          {
            id: "b1",
            type: "paragraph",
            content: [{ id: "t1", type: "text", text: "Discuss the roadmap for Q3." }],
          },
        ],
      },
    })
    const results = searchDocuments(store.getState().tree, "roadmap")
    expect(results.map((r) => r.node.id)).toEqual([id])
    expect(results[0]?.matchIn).toBe("body")
  })

  it("matches on folder name", () => {
    const store = makeStore()
    const id = store.getState().createFolder({ name: "Marketing" })
    const results = searchDocuments(store.getState().tree, "market")
    expect(results.map((r) => r.node.id)).toEqual([id])
  })

  it("returns ancestor breadcrumb path", () => {
    const store = makeStore()
    const outer = store.getState().createFolder({ name: "Design" })
    const inner = store.getState().createFolder({ parentId: outer, name: "Systems" })
    const doc = store.getState().createDocument({ parentId: inner, title: "Colors" })
    const results = searchDocuments(store.getState().tree, "colors")
    expect(results).toHaveLength(1)
    expect(results[0]?.breadcrumb).toEqual(["Design", "Systems"])
  })

  it("ranks title matches ahead of body-only matches", () => {
    const store = makeStore()
    const bodyOnly = store.getState().createDocument({
      title: "Weekly",
      content: {
        type: "doc",
        content: [
          {
            id: "b1",
            type: "paragraph",
            content: [{ id: "t1", type: "text", text: "typescript refactor" }],
          },
        ],
      },
    })
    const titleMatch = store.getState().createDocument({ title: "TypeScript notes" })
    const results = searchDocuments(store.getState().tree, "typescript")
    expect(results.map((r) => r.node.id)).toEqual([titleMatch, bodyOnly])
  })
})
