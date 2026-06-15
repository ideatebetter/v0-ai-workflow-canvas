"use client";

import React from "react"

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type NodeTypes,
  type Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { WorkflowNodeType, WorkflowNode } from "@/lib/workflow-types";
import {
  AITextNode,
  AIImageNode,
  ConditionNode,
  MemoryNode,
  GitHubNode,
  OutputNode,
  TextInputNode,
  MergeNode,
} from "./nodes";

const nodeTypes: NodeTypes = {
  aiText: AITextNode,
  aiImage: AIImageNode,
  condition: ConditionNode,
  memory: MemoryNode,
  github: GitHubNode,
  output: OutputNode,
  textInput: TextInputNode,
  merge: MergeNode,
};

const defaultNodeData: Record<WorkflowNodeType, object> = {
  aiText: {
    label: "AI Text",
    provider: "openai",
    model: "gpt-4o",
    prompt: "",
    systemPrompt: "",
    temperature: 0.7,
  },
  aiImage: {
    label: "AI Image",
    provider: "google",
    prompt: "",
    size: "1024x1024",
  },
  condition: {
    label: "Condition",
    condition: "",
    operator: "contains",
    value: "",
  },
  memory: {
    label: "Memory",
    memoryKey: "",
    operation: "read",
    dataType: "text",
    defaultValue: "",
  },
  github: {
    label: "GitHub",
    githubUrl: "",
    branch: "main",
    fetchReadme: true,
    fetchStructure: true,
    fetchKeyFiles: false,
  },
  output: {
    label: "Output",
    outputType: "readme-md",
    agentType: undefined,
    customFilename: "",
    customTemplate: "",
  },
  textInput: {
    label: "Text Input",
    text: "",
  },
  merge: {
    label: "Merge",
    separator: "\n\n",
  },
};

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState>[1];
  onEdgesChange: ReturnType<typeof useEdgesState>[1];
  onConnect: (connection: Connection) => void;
  onNodesUpdate: (nodes: WorkflowNode[]) => void;
  onEdgesUpdate: (edges: Edge[]) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodesUpdate,
}: WorkflowCanvasProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const connectingNodeId = useRef<string | null>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isDark = mounted ? resolvedTheme === "dark" : true;

  // Update edge styles when theme changes without remounting
  const themedEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        strokeWidth: 2,
        stroke: isDark ? "#52525b" : "#a1a1aa",
      },
    }));
  }, [edges, isDark]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as WorkflowNodeType;
      if (!type) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: event.clientX - bounds.left - 140,
        y: event.clientY - bounds.top - 20,
      };

      const newNode: WorkflowNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: defaultNodeData[type] as WorkflowNode["data"],
      };

      onNodesUpdate([...nodes, newNode]);
    },
    [nodes, onNodesUpdate]
  );

  const handleConnect = useCallback(
    (params: Connection) => {
      onConnect(params);
    },
    [onConnect]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full transition-colors duration-200">
      <ReactFlow
        nodes={nodes}
        edges={themedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.3,
          maxZoom: 0.85,
        }}
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: "default",
          style: { strokeWidth: 2, stroke: isDark ? "#52525b" : "#a1a1aa" },
          animated: true,
        }}
        className="bg-workflow-bg transition-colors duration-200"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color={isDark ? "#27272a" : "#d4d4d8"}
        />
        <MiniMap
          nodeColor={isDark ? "#3f3f46" : "#a1a1aa"}
          maskColor={isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.7)"}
        />
      </ReactFlow>
    </div>
  );
}
