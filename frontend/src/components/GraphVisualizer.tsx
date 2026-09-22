"use client";

import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import type { GraphEdge as EdgeData, GraphNode as NodeData } from "@/api/types";

interface GraphVisualizerProps {
  nodes: NodeData[];
  edges: EdgeData[];
  onSelectNode: (node: NodeData | null) => void;
  selectedNodeId?: string | null;
  // Edge inspection (§13): tap an edge to open the Relationship Inspector.
  onSelectEdge?: (edge: EdgeData | null) => void;
  selectedEdgeId?: string | null;
  // Graph controls (§12): null = show all.
  nodeTypeFilter?: string[] | null;
  edgeTypeFilter?: string[] | null;
  // Focus a node by id (centers + selects). Consumed via focusSignal bumps.
  focusId?: string | null;
  focusSignal?: number;
  // Increment to FIT the viewport to visible elements.
  fitSignal?: number;
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
  onSelectEdge,
  selectedEdgeId,
  nodeTypeFilter,
  edgeTypeFilter,
  focusId,
  focusSignal,
  fitSignal,
}: GraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  // Callback refs: event handlers registered once at init always call
  // the latest props without re-creating the Cytoscape instance.
  const selectNodeRef = useRef(onSelectNode);
  selectNodeRef.current = onSelectNode;
  const selectEdgeRef = useRef(onSelectEdge);
  selectEdgeRef.current = onSelectEdge;

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
        {
          selector: "edge:selected",
          style: {
            "line-color": "#f8fafc",
            "target-arrow-color": "#f8fafc",
            width: 3.5,
            "underlay-color": "#38bdf8",
            "underlay-padding": 4,
            "underlay-opacity": 0.5,
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
      selectEdgeRef.current?.(null);
      selectNodeRef.current(rawData || null);
    });

    // Handle edge selection → Relationship Inspector
    cy.on("tap", "edge", (evt) => {
      const edge = evt.target;
      const rawData = edge.data("raw");
      selectNodeRef.current(null);
      selectEdgeRef.current?.(rawData || null);
    });

    // Handle clicking the background
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        selectNodeRef.current(null);
        selectEdgeRef.current?.(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges]);

  // Update selection highlight when selectedNodeId / selectedEdgeId change
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.elements().unselect();
    if (selectedNodeId) {
      const node = cy.getElementById(selectedNodeId);
      if (node && node.isNode()) {
        node.select();
      }
    }
    if (selectedEdgeId) {
      const edge = cy.getElementById(selectedEdgeId);
      if (edge && edge.isEdge()) {
        edge.select();
      }
    }
  }, [selectedNodeId, selectedEdgeId]);

  // Apply entity / relationship type filters (§12)
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const show =
          !nodeTypeFilter || nodeTypeFilter.length === 0
            ? true
            : nodeTypeFilter.includes(n.data("label"));
        n.style("display", show ? "element" : "none");
      });
      cy.edges().forEach((e) => {
        const typeOk =
          !edgeTypeFilter || edgeTypeFilter.length === 0
            ? true
            : edgeTypeFilter.includes(e.data("label"));
        const endsVisible =
          e.source().style("display") !== "none" &&
          e.target().style("display") !== "none";
        e.style("display", typeOk && endsVisible ? "element" : "none");
      });
    });
  }, [nodeTypeFilter, edgeTypeFilter, nodes, edges]);

  // Focus a node (§12): center viewport + select + notify
  useEffect(() => {
    if (!cyRef.current || !focusId || focusSignal === undefined) return;
    const cy = cyRef.current;
    const node = cy.getElementById(focusId);
    if (node && node.isNode()) {
      node.style("display", "element");
      cy.center(node);
      node.select();
      selectEdgeRef.current?.(null);
      selectNodeRef.current(node.data("raw") || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal]);

  // FIT viewport (§12)
  useEffect(() => {
    if (!cyRef.current || fitSignal === undefined || fitSignal === 0) return;
    cyRef.current.fit(undefined, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  return (
    <div className="relative w-full h-full min-h-[550px] bg-[#141817] border border-[rgba(200,200,186,0.25)] overflow-hidden">
      <div ref={containerRef} className="w-full h-full min-h-[550px]" />
      
      {/* Legend overlay */}
      <div className="absolute top-4 left-4 bg-[rgba(15,18,17,0.92)] border border-[rgba(200,200,186,0.2)] p-3 shadow-lg flex flex-col gap-1.5 text-xs font-mono">
        <span className="font-semibold text-[#c8c8ba] text-[10px] uppercase tracking-wider mb-1">
          Entity Types
        </span>
        {Object.entries(NODE_COLORS)
          .filter(([key]) => key !== "Default")
          .map(([type, colors]) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              />
              <span className="text-[#8a8d83] text-[10px]">{type}</span>
            </div>
          ))}
      </div>

      <div className="canvas-footer" style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(18,21,20,0.9)", borderTop: "1px solid rgba(200,200,186,0.12)" }}>
        <span>GRAPH INTERACTION: SCROLL ZOOM // DRAG PAN</span>
        <span>CLICK NODE OR EDGE TO INSPECT</span>
      </div>
    </div>
  );
}

