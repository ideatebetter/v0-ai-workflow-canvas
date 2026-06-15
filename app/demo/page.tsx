"use client";

import { useState } from "react";
import { FileDetailModal } from "@/components/atlas/file-detail-modal";
import type { FileNodeData, ImageComment } from "@/lib/atlas-types";
import { WORKSPACE_MEMBERS } from "@/lib/atlas-types";

const MOCK_FILE: FileNodeData = {
  label: "Brand Identity — Final",
  fileName: "brand-identity-final.png",
  product: "design",
  status: "in-review",
  fileExtension: ".png",
  lastModified: new Date().toISOString(),
  previewImages: [
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
  ],
  uploadedFile: {
    url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
    pathname: "brand-identity-final.png",
    size: 1240000,
    uploadedAt: new Date().toISOString(),
  },
  tasks: [
    { id: "t1", title: "Review color palette", completed: true, createdAt: new Date().toISOString() },
    { id: "t2", title: "Check typography hierarchy", completed: false, createdAt: new Date().toISOString() },
  ],
  imageComments: [
    {
      id: "c1",
      x: 25,
      y: 35,
      text: "Love this gradient — can we make it slightly more vibrant?",
      author: WORKSPACE_MEMBERS[1],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "c2",
      x: 70,
      y: 60,
      text: "The logo placement feels a bit cramped here",
      author: WORKSPACE_MEMBERS[2],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  activities: [
    {
      id: "a1",
      type: "upload",
      description: "Initial file upload",
      user: WORKSPACE_MEMBERS[0],
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "a2",
      type: "status-change",
      description: "Changed status to In Review",
      user: WORKSPACE_MEMBERS[0],
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "a3",
      type: "comment",
      description: "Love this gradient — can we make it slightly more vibrant?",
      user: WORKSPACE_MEMBERS[1],
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      metadata: { commentId: "c1", pinNumber: 1 },
    },
    {
      id: "a4",
      type: "comment",
      description: "The logo placement feels a bit cramped here",
      user: WORKSPACE_MEMBERS[2],
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      metadata: { commentId: "c2", pinNumber: 2 },
    },
  ],
  dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  assignees: [WORKSPACE_MEMBERS[0], WORKSPACE_MEMBERS[1]],
};

export default function DemoPage() {
  const [fileData, setFileData] = useState<FileNodeData>(MOCK_FILE);

  return (
    <div style={{ backgroundColor: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <FileDetailModal
        isOpen={true}
        onClose={() => {}}
        fileData={fileData}
        onUpdateFile={(updates) => setFileData((prev) => ({ ...prev, ...updates }))}
        canvasId="demo"
        nodeId="demo-node"
      />
    </div>
  );
}
