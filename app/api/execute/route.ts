import { NextResponse } from "next/server";
import { generateText } from "ai";
import type { Edge } from "@xyflow/react";
import type {
  WorkflowNode,
  AITextNodeData,
  GitHubNodeData,
  MemoryNodeData,
  ConditionNodeData,
  OutputNodeData,
  TextInputNodeData,
  MergeNodeData,
  ExecutionResult,
  WorkflowNodeType,
} from "@/lib/workflow-types";
import { AGENT_TEMPLATES } from "@/lib/workflow-types";
import { getDb } from "@/lib/db";

interface ExecutionContext {
  nodeOutputs: Map<string, string>;
  workflowId?: string;
}

async function fetchGitHub(data: GitHubNodeData): Promise<string> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  return result.output || result.error || "Failed to fetch GitHub data";
}

async function generateAIText(data: AITextNodeData, input: string): Promise<string> {
  const modelMap: Record<string, string> = {
    openai: `openai/${data.model || "gpt-4o"}`,
    google: `google/${data.model || "gemini-2.0-flash"}`,
    xai: `xai/${data.model || "grok-3"}`,
  };

  const prompt = data.prompt.replace(/\{\{input\}\}/g, input);

  const { text } = await generateText({
    model: modelMap[data.provider] || "openai/gpt-4o",
    prompt,
    system: data.systemPrompt || undefined,
    temperature: data.temperature ?? 0.7,
  });

  return text;
}

function evaluateCondition(data: ConditionNodeData, input: string): boolean {
  const value = data.value;

  switch (data.operator) {
    case "contains":
      return input.toLowerCase().includes(value.toLowerCase());
    case "equals":
      return input === value;
    case "notEquals":
      return input !== value;
    case "greaterThan":
      return Number(input) > Number(value);
    case "lessThan":
      return Number(input) < Number(value);
    case "isEmpty":
      return !input || input.trim() === "";
    case "isNotEmpty":
      return !!input && input.trim() !== "";
    default:
      return false;
  }
}

function formatOutput(data: OutputNodeData, input: string): string {
  if (data.outputType === "agents-md" && data.agentType) {
    const template = AGENT_TEMPLATES[data.agentType];
    return `${template.header}\n${input}`;
  }

  if (data.outputType === "custom" && data.customTemplate) {
    return data.customTemplate.replace(/\{\{content\}\}/g, input);
  }

  if (data.outputType === "github-wiki") {
    return `# Wiki Documentation\n\n${input}`;
  }

  if (data.outputType === "readme-md") {
    return `# README\n\n${input}`;
  }

  return input;
}

function getNodeInputs(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: Edge[],
  context: ExecutionContext
): string[] {
  const incomingEdges = edges.filter((e) => e.target === nodeId);
  const inputs: string[] = [];

  for (const edge of incomingEdges) {
    const output = context.nodeOutputs.get(edge.source);
    if (output !== undefined) {
      inputs.push(output);
    }
  }

  return inputs;
}

function topologicalSort(nodes: WorkflowNode[], edges: Edge[]): WorkflowNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }

  // Build graph
  for (const edge of edges) {
    const current = inDegree.get(edge.target) || 0;
    inDegree.set(edge.target, current + 1);
    adjList.get(edge.source)?.push(edge.target);
  }

  // Find nodes with no incoming edges
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const sorted: WorkflowNode[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) {
      sorted.push(node);
    }

    for (const neighbor of adjList.get(nodeId) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return sorted;
}

export async function POST(request: Request) {
  try {
    const { nodes, edges, workflowId } = await request.json();

    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ error: "No nodes to execute" }, { status: 400 });
    }

    const context: ExecutionContext = {
      nodeOutputs: new Map(),
      workflowId,
    };

    const results: ExecutionResult[] = [];
    const sortedNodes = topologicalSort(nodes, edges);
    let finalOutput = "";

    for (const node of sortedNodes) {
      const inputs = getNodeInputs(node.id, nodes, edges, context);
      const combinedInput = inputs.join("\n\n");
      let output = "";
      let error: string | undefined;

      try {
        switch (node.type as WorkflowNodeType) {
          case "textInput": {
            const data = node.data as TextInputNodeData;
            output = data.text;
            break;
          }

          case "github": {
            const data = node.data as GitHubNodeData;
            output = await fetchGitHub(data);
            break;
          }

          case "aiText": {
            const data = node.data as AITextNodeData;
            output = await generateAIText(data, combinedInput);
            break;
          }

          case "condition": {
            const data = node.data as ConditionNodeData;
            const result = evaluateCondition(data, combinedInput);
            output = result ? "true" : "false";
            // For condition nodes, we need to handle branching
            // The output propagates through the appropriate handle
            break;
          }

          case "merge": {
            const data = node.data as MergeNodeData;
            const separator = data.separator
              .replace(/\\n/g, "\n")
              .replace(/\\t/g, "\t");
            output = inputs.join(separator);
            break;
          }

          case "memory": {
            const data = node.data as MemoryNodeData;
            if (data.operation === "write") {
              // Store the input in memory
              output = combinedInput;
            } else {
              // Read from memory (simplified - would need actual DB call)
              output = data.defaultValue || combinedInput;
            }
            break;
          }

          case "output": {
            const data = node.data as OutputNodeData;
            output = formatOutput(data, combinedInput);
            finalOutput = output;
            break;
          }

          default:
            output = combinedInput;
        }
      } catch (e) {
        error = e instanceof Error ? e.message : "Execution failed";
        output = "";
      }

      context.nodeOutputs.set(node.id, output);
      results.push({
        nodeId: node.id,
        nodeType: node.type as WorkflowNodeType,
        output,
        error,
        timestamp: new Date(),
      });
    }

    // If no output node, use the last node's output
    if (!finalOutput && results.length > 0) {
      finalOutput = results[results.length - 1].output || "";
    }

    // Save execution to database if workflowId is provided
    if (workflowId) {
      try {
        const sql = getDb();
        await sql`
          INSERT INTO workflow_executions (workflow_id, status, final_output, started_at, completed_at)
          VALUES (${workflowId}, 'completed', ${finalOutput}, NOW(), NOW())
        `;
      } catch (dbError) {
        console.error("Failed to save execution history:", dbError);
      }
    }

    return NextResponse.json({
      status: "completed",
      results,
      finalOutput,
    });
  } catch (error) {
    console.error("Execution error:", error);

    // Save failed execution to database if workflowId is provided
    const { workflowId } = await request.json().catch(() => ({}));
    if (workflowId) {
      try {
        const sql = getDb();
        await sql`
          INSERT INTO workflow_executions (workflow_id, status, error, started_at, completed_at)
          VALUES (${workflowId}, 'failed', ${error instanceof Error ? error.message : "Execution failed"}, NOW(), NOW())
        `;
      } catch (dbError) {
        console.error("Failed to save execution history:", dbError);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}
