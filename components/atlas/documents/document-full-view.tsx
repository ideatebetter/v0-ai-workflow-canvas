"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useDocumentsStore } from "@/lib/documents/store"
import type { DocumentNode } from "@/lib/documents/types"
import { DocumentEditor } from "./document-editor"

interface Props {
  docId: string
}

export function DocumentFullView({ docId }: Props) {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const node = useDocumentsStore(
    (s) => s.tree[docId] as DocumentNode | undefined,
  )

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--app-bg)" }}
    >
      <header
        className="flex items-center gap-3 px-6 py-3 border-b sticky top-0 z-10 backdrop-blur"
        style={{
          borderColor: "var(--app-border)",
          backgroundColor: "var(--app-bg-elevated)",
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-foreground transition-colors"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back
        </Link>
        <span className="text-gray-600">/</span>
        <span
          className="text-sm text-foreground truncate"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          {node?.title || "Untitled"}
        </span>
      </header>
      {hydrated && node ? (
        <DocumentEditor docId={docId} mode="full" />
      ) : hydrated ? (
        <NotFoundInline docId={docId} />
      ) : (
        <div className="mx-auto max-w-[720px] px-6 py-16">
          <div className="h-9 w-64 bg-white/5 rounded animate-pulse mb-6" />
          <div className="h-4 w-full bg-white/5 rounded animate-pulse mb-2" />
          <div className="h-4 w-11/12 bg-white/5 rounded animate-pulse mb-2" />
          <div className="h-4 w-4/5 bg-white/5 rounded animate-pulse" />
        </div>
      )}
    </div>
  )
}

function NotFoundInline({ docId }: { docId: string }) {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16">
      <h1
        className="text-2xl font-semibold text-foreground mb-2"
        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
      >
        Document not found
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        No document exists with id <code className="px-1 py-0.5 bg-white/10 rounded text-xs">{docId}</code>.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-foreground bg-white/10 hover:bg-white/15 rounded-md px-3 py-1.5 transition-colors"
        style={{ fontFamily: "system-ui, Inter, sans-serif" }}
      >
        Back to home
      </Link>
    </div>
  )
}
