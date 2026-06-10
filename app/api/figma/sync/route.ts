import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateFigmaSyncToken, tokenFromHeader } from "@/lib/figma-token";
import type { AtlasNode } from "@/lib/atlas-types";
import type { FileNodeData, FileVersion, FileActivity } from "@/lib/atlas-types";

// Body sent by the Figma plugin:
// {
//   canvasId: string,
//   figmaFrameId: string,
//   figmaFrameName: string,
//   figmaFileKey: string,
//   imageData: string,   // base64 PNG
//   nodeId?: string,     // present on updates
// }

export async function POST(request: Request) {
  const token = tokenFromHeader(request);
  const userId = token ? validateFigmaSyncToken(token) : null;
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const body = await request.json();
  const { canvasId, figmaFrameId, figmaFrameName, figmaFileKey, imageData, nodeId } = body;

  if (!canvasId || !figmaFrameId || !imageData) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the canvas belongs to this user
  const { data: canvas, error: canvasErr } = await admin
    .from("canvases")
    .select("*")
    .eq("id", canvasId)
    .eq("user_id", userId)
    .single();

  if (canvasErr || !canvas) {
    return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
  }

  // Upload the PNG to Vercel Blob
  const buffer = Buffer.from(imageData, "base64");
  const blobPath = `atlas/figma-sync/${userId}/${figmaFrameId}-${Date.now()}.png`;
  const blob = await put(blobPath, buffer, { access: "public", contentType: "image/png" });

  const now = new Date().toISOString();
  const nodes: AtlasNode[] = canvas.nodes ?? [];

  // Find existing synced node (by nodeId or by figmaFrameId in figmaSync)
  const existingNode = nodes.find(n =>
    (nodeId && n.id === nodeId) ||
    (n.data as FileNodeData).figmaSync?.figmaFrameId === figmaFrameId
  );

  let resultNodeId: string;
  let updatedNodes: AtlasNode[];

  if (existingNode) {
    // UPDATE: add new version to the existing node
    resultNodeId = existingNode.id;
    const existingData = existingNode.data as FileNodeData;

    const newVersion: FileVersion = {
      id: `fv-${Date.now()}`,
      versionName: `Auto-sync from Figma`,
      previewImages: [blob.url],
      uploadedAt: now,
      uploadedBy: {
        id: "figma-sync",
        name: "Figma Sync",
        avatar: "",
        role: "editor" as const, initials: "FS",
        email: "",
      },
      notes: `Live sync from Figma frame "${figmaFrameName}"`,
      fileUrl: blob.url,
    };

    const newActivity: FileActivity = {
      id: `fa-${Date.now()}`,
      type: "version-add",
      description: `New version synced from Figma`,
      user: {
        id: "figma-sync",
        name: "Figma Sync",
        avatar: "",
        role: "editor" as const, initials: "FS",
        email: "",
      },
      timestamp: now,
    };

    const updatedData: FileNodeData = {
      ...existingData,
      previewImages: [blob.url, ...(existingData.previewImages ?? [])].slice(0, 4),
      lastModified: now,
      versions: [newVersion, ...(existingData.versions ?? [])],
      activities: [newActivity, ...(existingData.activities ?? [])],
      figmaSync: {
        figmaFileKey: figmaFileKey ?? existingData.figmaSync?.figmaFileKey ?? "",
        figmaFrameId,
        figmaFrameName,
        lastSynced: now,
      },
    };

    updatedNodes = nodes.map(n =>
      n.id === resultNodeId ? { ...n, data: updatedData } : n
    );
  } else {
    // CREATE: new file node for this Figma frame
    resultNodeId = `figma-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newNodeData: FileNodeData = {
      label: figmaFrameName,
      fileName: `${figmaFrameName}.fig`,
      product: "atlas",
      status: "draft",
      fileExtension: ".fig",
      lastModified: now,
      previewImages: [blob.url],
      uploadedFile: {
        url: blob.url,
        pathname: blobPath,
        size: buffer.byteLength,
        uploadedAt: now,
      },
      versions: [],
      activities: [
        {
          id: `fa-${Date.now()}`,
          type: "upload",
          description: `Synced from Figma frame "${figmaFrameName}"`,
          user: {
            id: "figma-sync",
            name: "Figma Sync",
            avatar: "",
            role: "editor" as const, initials: "FS",
            email: "",
          },
          timestamp: now,
        },
      ],
      figmaSync: {
        figmaFileKey: figmaFileKey ?? "",
        figmaFrameId,
        figmaFrameName,
        lastSynced: now,
      },
    };

    // Position to the right of all existing nodes
    const rightmost = nodes.reduce((max, n) => Math.max(max, n.position.x + (n.width ?? 220)), 100);
    const newNode: AtlasNode = {
      id: resultNodeId,
      type: "file",
      position: { x: rightmost + 48, y: 100 },
      data: newNodeData,
    };

    updatedNodes = [...nodes, newNode];
  }

  // Persist updated nodes back to the canvas
  const { error: updateErr } = await admin
    .from("canvases")
    .update({ nodes: updatedNodes, updated_at: now })
    .eq("id", canvasId)
    .eq("user_id", userId);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to update canvas" }, { status: 500 });
  }

  return NextResponse.json({ nodeId: resultNodeId, blobUrl: blob.url });
}
