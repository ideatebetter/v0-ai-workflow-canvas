import { NextResponse } from "next/server";

// Extract Figma file key from URL formats:
//   figma.com/design/:fileKey/...
//   figma.com/file/:fileKey/...
function extractFileKey(url: string): string | null {
  const m = url.match(/figma\.com\/(?:design|file|proto)\/([^/?#]+)/);
  return m ? m[1] : null;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

// POST /api/figma/import-canvas
// Body: { figmaUrl: string; pat: string }
// Returns: { frames: { id: string; name: string; thumbnailUrl: string | null }[] }
export async function POST(request: Request) {
  try {
    const { figmaUrl, pat } = await request.json();

    if (!figmaUrl || !pat) {
      return NextResponse.json({ error: "figmaUrl and pat are required" }, { status: 400 });
    }

    const fileKey = extractFileKey(figmaUrl);
    if (!fileKey) {
      return NextResponse.json({ error: "Could not extract Figma file key from URL" }, { status: 400 });
    }

    // Fetch file structure (depth=2 gets document → pages → frames)
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, {
      headers: { "X-Figma-Token": pat },
    });

    if (!fileRes.ok) {
      const err = await fileRes.text();
      return NextResponse.json({ error: `Figma API error: ${fileRes.status} — ${err}` }, { status: fileRes.status });
    }

    const fileData = await fileRes.json();

    // Collect all top-level frames from all pages
    const pages: FigmaNode[] = fileData.document?.children ?? [];
    const frames: { id: string; name: string; pageId: string; pageName: string }[] = [];

    for (const page of pages) {
      for (const child of page.children ?? []) {
        if (child.type === "FRAME" || child.type === "COMPONENT" || child.type === "GROUP" || child.type === "SECTION") {
          frames.push({ id: child.id, name: child.name, pageId: page.id, pageName: page.name });
        }
      }
    }

    if (frames.length === 0) {
      return NextResponse.json({ frames: [] });
    }

    // Fetch thumbnails for all frames (Figma images endpoint, max 200 ids per call)
    const thumbnails: Record<string, string> = {};
    const chunkSize = 50;
    for (let i = 0; i < frames.length; i += chunkSize) {
      const chunk = frames.slice(i, i + chunkSize);
      const ids = chunk.map(f => f.id).join(",");
      const imgRes = await fetch(
        `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=2`,
        { headers: { "X-Figma-Token": pat } }
      );
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        Object.assign(thumbnails, imgData.images ?? {});
      }
    }

    const result = frames.map(f => ({
      id: f.id,
      name: f.name,
      pageId: f.pageId,
      pageName: f.pageName,
      thumbnailUrl: thumbnails[f.id] ?? null,
    }));

    return NextResponse.json({ fileKey, frames: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
