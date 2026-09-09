"use client";

import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";

interface NodeData {
  id: string;
  label: string;
  name: string;
  properties: Record<string, any>;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

interface GraphVisualizerProps {
  nodes: NodeData[];
  edges: EdgeData[];
  onSelectNode: (node: NodeData | null) => void;
  selectedNodeId?: string | null;
}

// Fixed color scheme per node type
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Suspect:  { bg: "#ef4444", border: "#b91c1c", text: "#fee2e2" }, // Red
  Phone:    { bg: "#3b82f6", border: "#1d4ed8", text: "#dbeafe" }, // Blue
  Account:  { bg: "#10b981", border: "#047857", text: "#d1fae5" }, // Emerald / Green
  Location: { bg: "#f59e0b", border: "#b45309", text: "#fef3c7" }, // Amber / Orange
  Case:     { bg: "#8b5cf6", border: "#6d28d9", text: "#ede9fe" }, // Purple
  Default:  { bg: "#64748b", border: "#475569", text: "#f1f5f9" }, // Slate
};

export default function GraphVisualizer({
  nodes,
  edges,
  onSelectNode,
  selectedNodeId,
}: GraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert API nodes/edges to Cytoscape format
    const cyElements: cytoscape.ElementDefinition[] = [
      ...nodes.map((n) => {
        const color = NODE_COLORS[n.label] || NODE_COLORS.Default;
        return {
          group: "nodes" as const,
          data: {
            id: n.id,
            label: n.label,
            name: n.name || n.label,
            bgColor: color.bg,
            borderColor: color.border,
            textColor: color.text,
            raw: n,
          },
        };
      }),
      ...edges.map((e) => ({
        group: "edges" as const,
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.type,
          raw: e,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(bgColor)",
            "border-color": "data(borderColor)",
            "border-width": 3,
            label: "data(name)",
            color: "#ffffff",
            "font-size": "11px",
            "font-family": "ui-monospace, monospace",
            "text-valign": "bottom",
            "text-margin-y": 6,
            "text-outline-color": "#0f172a",
            "text-outline-width": 2,
            width: 44,
            height: 44,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#f8fafc",
            "border-width": 4,
            "underlay-color": "#38bdf8",
            "underlay-padding": 6,
            "underlay-opacity": 0.5,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#475569",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            color: "#94a3b8",
            "font-size": "9px",
            "text-outline-color": "#020617",
            "text-outline-width": 1.5,
          },
        },
        {
          selector: "edge[label = 'TRANSFERRED']",
          style: {
            "line-color": "#10b981",
            "target-arrow-color": "#10b981",
            width: 2.5,
          },
        },
        {
          selector: "edge[label = 'CALLED']",
          style: {
            "line-color": "#3b82f6",
            "target-arrow-color": "#3b82f6",
            width: 2.5,
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 800,
        nodeRepulsion: () => 80000,
        idealEdgeLength: () => 120,
        edgeElasticity: () => 100,
        gravity: 0.25,
      },
    });

    // Handle node selection
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const rawData = node.data("raw");
      onSelectNode(rawData || null);
    });

    // Handle clicking the background
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        onSelectNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges]);

  // Update selection highlight when selectedNodeId changes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.nodes().unselect();
    if (selectedNodeId) {
      const node = cy.getElementById(selectedNodeId);
      if (node) {
        node.select();
      }
    }
  }, [selectedNodeId]);

  return (
    <div className="relative w-full h-full min-h-[550px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      <div ref={containerRef} className="w-full h-full min-h-[550px]" />
      
      {/* Legend overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-lg flex flex-col gap-1.5 text-xs">
        <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-1">
          Entity Types
        </span>
        {Object.entries(NODE_COLORS)
          .filter(([key]) => key !== "Default")
          .map(([type, colors]) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              />
              <span className="text-slate-300 text-[11px]">{type}</span>
            </div>
          ))}
      </div>

      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400">
        Tip: Scroll to zoom • Drag to pan • Click node for details
      </div>
    </div>
  );
}
