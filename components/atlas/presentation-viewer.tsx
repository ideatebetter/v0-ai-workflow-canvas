"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { FileNodeData, TextNodeData } from "@/lib/atlas-types";
import Image from "next/image";

interface PresentationGroup {
  id: string;
  nodeIds: string[];
}

interface PresentationViewerProps {
  nodes: Node[];
  presentationEdges: Edge[];
  presentationGroups: PresentationGroup[];
  onClose: () => void;
  presentationName: string;
  onPresentationNameChange: (name: string) => void;
  workspaceName: string;
  workspaceWordmark?: string;
}

export function PresentationViewer({
  nodes,
  presentationEdges,
  presentationGroups,
  onClose,
  presentationName,
  onPresentationNameChange,
  workspaceName,
  workspaceWordmark,
}: PresentationViewerProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(presentationName);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Slide can be either a single node or a group of nodes
  type Slide = { type: 'single'; nodeId: string } | { type: 'group'; nodeIds: string[] };

  // Build ordered slides from presentation edges
  const slides = React.useMemo<Slide[]>(() => {
    const result: Slide[] = [];
    
    // Get node IDs that are in groups (from presentationGroups data)
    const groupedNodeIds = new Set(presentationGroups.flatMap(g => g.nodeIds));
    
    // Build sequence from edges
    if (presentationEdges.length > 0) {
      const sources = new Set(presentationEdges.map(e => e.source));
      const targets = new Set(presentationEdges.map(e => e.target));
      
      let startNodeId = "";
      for (const source of sources) {
        if (!targets.has(source)) {
          startNodeId = source;
          break;
        }
      }

      if (!startNodeId && presentationEdges.length > 0) {
        startNodeId = presentationEdges[0].source;
      }

      const sequence: string[] = [startNodeId];
      const visited = new Set([startNodeId]);
      let currentId = startNodeId;

      while (true) {
        const nextEdge = presentationEdges.find(e => e.source === currentId && !visited.has(e.target));
        if (!nextEdge) break;
        
        sequence.push(nextEdge.target);
        visited.add(nextEdge.target);
        currentId = nextEdge.target;
      }

      // Add slides based on sequence
      for (const nodeId of sequence) {
        // Skip nodes that are part of a group (they'll be shown via the group node)
        if (groupedNodeIds.has(nodeId)) continue;
        
        // Check if this is a presentation group node
        const node = nodes.find(n => n.id === nodeId);
        if (node?.type === "presentationGroup") {
          const groupData = node.data as { nodeIds?: string[] };
          if (groupData.nodeIds && groupData.nodeIds.length > 0) {
            result.push({ type: 'group', nodeIds: groupData.nodeIds });
          }
        } else {
          result.push({ type: 'single', nodeId });
        }
      }
    }

    // If no edges but we have group nodes, add them as slides
    if (presentationEdges.length === 0 && presentationGroups.length > 0) {
      for (const group of presentationGroups) {
        result.push({ type: 'group', nodeIds: group.nodeIds });
      }
    }

    return result;
  }, [presentationEdges, presentationGroups, nodes]);

  const currentSlide = slides[currentIndex];
  
  // Get node(s) for current slide
  const currentNodes = React.useMemo(() => {
    if (!currentSlide) return [];
    if (currentSlide.type === 'single') {
      const node = nodes.find(n => n.id === currentSlide.nodeId);
      // If it's a presentationGroup node, use its originalNodes data
      if (node?.type === "presentationGroup") {
        const groupData = node.data as { originalNodes?: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }> };
        if (groupData.originalNodes) {
          return groupData.originalNodes.map(orig => ({
            id: orig.id,
            type: orig.type,
            position: orig.position,
            data: orig.data,
          })) as Node[];
        }
      }
      return node ? [node] : [];
    } else {
      // For grouped slides, try to find nodes or use originalNodes from group
      const foundNodes = currentSlide.nodeIds
        .map(id => nodes.find(n => n.id === id))
        .filter((n): n is Node => n !== undefined);
      
      // If we didn't find the nodes (they're inside a group), look in presentationGroup nodes
      if (foundNodes.length === 0) {
        for (const node of nodes) {
          if (node.type === "presentationGroup") {
            const groupData = node.data as { nodeIds?: string[]; originalNodes?: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }> };
            if (groupData.nodeIds?.some(id => currentSlide.nodeIds.includes(id)) && groupData.originalNodes) {
              return groupData.originalNodes.map(orig => ({
                id: orig.id,
                type: orig.type,
                position: orig.position,
                data: orig.data,
              })) as Node[];
            }
          }
        }
      }
      
      return foundNodes;
    }
  }, [currentSlide, nodes]);

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, slides.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger navigation shortcuts while editing the presentation name
      if (isEditingName) {
        if (e.key === "Escape") {
          setIsEditingName(false);
          setEditedName(presentationName);
        }
        return;
      }
      
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onClose, isEditingName, presentationName]);

  if (slides.length === 0 || currentNodes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.95)" }}>
        <div className="text-center">
          <p className="text-white text-lg mb-4">No presentation slides found.</p>
          <p className="text-gray-400 text-sm mb-6">Connect nodes with presentation edges or group images to create a presentation.</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: "#333333" }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Get bento grid layout based on number of images
  const getBentoLayout = (count: number): string => {
    switch (count) {
      case 2:
        return "grid-cols-2 grid-rows-1";
      case 3:
        return "grid-cols-2 grid-rows-2";
      case 4:
        return "grid-cols-2 grid-rows-2";
      case 5:
        return "grid-cols-3 grid-rows-2";
      case 6:
        return "grid-cols-3 grid-rows-2";
      default:
        if (count > 6) return "grid-cols-3 grid-rows-3";
        return "grid-cols-1 grid-rows-1";
    }
  };

  // Get span class for bento items
  const getBentoItemClass = (index: number, total: number): string => {
    if (total === 3 && index === 0) return "row-span-2";
    if (total === 5 && index === 0) return "row-span-2";
    return "";
  };

  // Render a single media item (image or video) in a bento cell
  const renderBentoMedia = (node: Node, index: number, total: number) => {
    const fileData = node.data as FileNodeData;
    const mediaUrl = fileData.uploadedFile?.url || fileData.thumbnail;
    const isVideo = fileData.fileExtension?.match(/^\.(mp4|mov|webm|avi|mkv|m4v)$/i);
    
    return (
      <div 
        key={node.id} 
        className={`relative overflow-hidden rounded-lg ${getBentoItemClass(index, total)}`}
        style={{ backgroundColor: "#1a1a1a" }}
      >
        {isVideo && mediaUrl ? (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : mediaUrl ? (
          <Image
            src={mediaUrl}
            alt={fileData.fileName || "Image"}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl text-gray-500">{fileData.fileExtension?.toUpperCase()}</span>
          </div>
        )}
      </div>
    );
  };

  // Render content based on slide type
  const renderSlideContent = () => {
    if (!currentSlide) return null;

    // Grouped slide - render bento grid
    if (currentSlide.type === 'group' && currentNodes.length > 1) {
      const count = currentNodes.length;
      return (
        <div className="flex flex-col items-center justify-center h-full w-full px-8">
          <div 
            className={`grid ${getBentoLayout(count)} gap-3 w-full max-w-6xl`}
            style={{ height: '65vh' }}
          >
            {currentNodes.map((node, index) => renderBentoMedia(node, index, count))}
          </div>
        </div>
      );
    }

    // Single node slide
    const currentNode = currentNodes[0];
    if (!currentNode) return null;

    if (currentNode.type === "file") {
      const fileData = currentNode.data as FileNodeData;
      const isVideo = fileData.fileExtension?.match(/^\.(mp4|mov|webm|avi|mkv|m4v)$/i);
      const mediaUrl = fileData.uploadedFile?.url || fileData.thumbnail;

      // Video slide
      if (isVideo && mediaUrl) {
        return (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <video
              key={currentNode.id}
              src={mediaUrl}
              controls
              autoPlay
              className="max-w-6xl max-h-[70vh] rounded-lg"
              style={{ backgroundColor: "#000" }}
            />
            <span 
              className="mt-4 text-xs font-normal tracking-wide"
              style={{ 
                fontFamily: "system-ui, Inter, sans-serif",
                color: "rgba(255,255,255,0.35)",
                fontStyle: "italic"
              }}
            >
              {fileData.fileName || fileData.label}
            </span>
          </div>
        );
      }

      // Image slide
      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
          {mediaUrl ? (
            <div className="relative w-full max-w-6xl h-[70vh]">
              <Image
                src={mediaUrl}
                alt={fileData.fileName || "Slide"}
                fill
                className="object-contain rounded-lg"
              />
            </div>
          ) : (
            <div 
              className="w-64 h-64 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              <span className="text-4xl text-gray-500">{fileData.fileExtension?.toUpperCase()}</span>
            </div>
          )}
          <span 
            className="mt-4 text-xs font-normal tracking-wide"
            style={{ 
              fontFamily: "system-ui, Inter, sans-serif",
              color: "rgba(255,255,255,0.35)",
              fontStyle: "italic"
            }}
          >
            {fileData.fileName || fileData.label}
          </span>
        </div>
      );
    }

    if (currentNode.type === "text") {
      const textData = currentNode.data as TextNodeData;
      const formatting = textData.formatting;
      
      // Get plain text for display (strip formatting markers)
      const content = textData.content || textData.label || "";
      const plainText = content
        .replace(/\[\[(h1|h2|h3|body)\]\]/g, "")
        .replace(/\[\[\/(h1|h2|h3|body)\]\]/g, "");
      
      // Calculate optimal font size based on text length
      const textLength = plainText.length;
      let fontSize: number;
      let lineHeight: number;
      let maxWidth: string;
      
      if (textLength < 50) {
        // Very short - headline style
        fontSize = 72;
        lineHeight = 1.1;
        maxWidth = "90%";
      } else if (textLength < 150) {
        // Short - large text
        fontSize = 48;
        lineHeight = 1.2;
        maxWidth = "85%";
      } else if (textLength < 300) {
        // Medium - readable paragraph
        fontSize = 32;
        lineHeight = 1.4;
        maxWidth = "75%";
      } else if (textLength < 600) {
        // Long - smaller but still readable
        fontSize = 24;
        lineHeight = 1.5;
        maxWidth = "70%";
      } else {
        // Very long - compact
        fontSize = 18;
        lineHeight = 1.6;
        maxWidth = "65%";
      }
      
      const fontMap: Record<string, string> = {
        sans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        mono: "'SF Mono', Menlo, Monaco, monospace",
      };
      
      const alignMap: Record<string, string> = {
        left: "text-left",
        center: "text-center",
        right: "text-right",
      };

      const textFont = fontMap[formatting?.font || "sans"];
      const textAlign = alignMap[formatting?.align || "left"];
      const textColor = formatting?.color || "#ffffff";
      const isBold = formatting?.bold;

      return (
        <div 
          className={`flex flex-col justify-center h-full w-full px-16 ${textAlign}`}
          style={{ maxWidth }}
        >
          <div 
            className={`leading-tight ${isBold ? "font-semibold" : "font-normal"}`}
            style={{ 
              color: textColor,
              fontFamily: textFont,
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              letterSpacing: fontSize > 40 ? "-0.02em" : "-0.01em",
              textWrap: "balance",
            }}
          >
            {plainText}
          </div>
        </div>
      );
    }

    // Default render for other node types
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div 
          className="w-64 h-64 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <span className="text-xl text-gray-400">{currentNode.type}</span>
        </div>
        <h2 className="text-2xl font-medium text-white mt-6" style={{ fontFamily: "system-ui, Inter, sans-serif" }}>
          {currentNode.data.label || "Untitled"}
        </h2>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-1">
          {/* Previous arrow */}
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="w-6 h-6 rounded flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <div 
            className="px-2 py-1 rounded text-xs text-gray-400"
            style={{ fontFamily: "system-ui, Inter, sans-serif" }}
          >
            {currentIndex + 1} / {slides.length}
          </div>
          
          {/* Next arrow */}
          <button
            type="button"
            onClick={goNext}
            disabled={currentIndex === slides.length - 1}
            className="w-6 h-6 rounded flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="#888888" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-16 pb-24">
        {renderSlideContent()}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-4">
        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
          {/* Presentation name (editable) */}
          <div className="flex items-center">
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={() => {
                  setIsEditingName(false);
                  if (editedName.trim() && editedName !== presentationName) {
                    onPresentationNameChange(editedName.trim());
                  } else {
                    setEditedName(presentationName);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsEditingName(false);
                    if (editedName.trim() && editedName !== presentationName) {
                      onPresentationNameChange(editedName.trim());
                    }
                  } else if (e.key === "Escape") {
                    setIsEditingName(false);
                    setEditedName(presentationName);
                  }
                }}
                autoFocus
                className="bg-transparent text-xs text-gray-400 border-b border-gray-600 outline-none px-0 py-0.5"
                style={{ fontFamily: "system-ui, Inter, sans-serif", minWidth: "120px" }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {presentationName || "Untitled Presentation"}
              </button>
            )}
          </div>

          {/* Workspace wordmark or name */}
          <div className="flex items-center">
            {workspaceWordmark ? (
              <img 
                src={workspaceWordmark} 
                alt={workspaceName} 
                className="h-4 opacity-40"
              />
            ) : (
              <span 
                className="text-xs text-gray-600"
                style={{ fontFamily: "system-ui, Inter, sans-serif" }}
              >
                {workspaceName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
