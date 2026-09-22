"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderOpen, Info, Loader2 } from "lucide-react";
import GraphVisualizer from "@/components/GraphVisualizer";
import { EntityInspector, GraphToolbar, RelationshipInspector } from "@/components/inspectors";
import type { CaseGraph, GraphEdge, GraphNode } from "@/api/types";

// Network section (§11/12/13/14): toolbar (search, entity/relationship
// filters, FIT, RESET), canvas, entity + relationship inspectors.
// Preselected node name (from ?entity=) is focused on load.
export default function CaseNetwork({
  caseId,
  graph,
  loading,
  preselectName,
  highlightIds,
}: {
  caseId: string;
  graph: CaseGraph | null;
  loading: boolean;
  preselectName?: string | null;
  highlightIds?: string[] | null;
}) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [query, setQuery] = useState("");
  const [nodeFilter, setNodeFilter] = useState("");
  const [edgeFilter, setEdgeFilter] = useState("");
  const [fitSignal, setFitSignal] = useState(0);
  const [focusSignal, setFocusSignal] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);

  const nodes = useMemo(() => graph?.nodes ?? [], [graph]);
  const edges = useMemo(() => graph?.edges ?? [], [graph]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    nodes.forEach((n) => m.set(n.id, n.name));
    return (id: string) => m.get(id) ?? id;
  }, [nodes]);

  const matchCount = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    return nodes.filter((n) => n.name.toLowerCase().includes(q)).length;
  }, [nodes, query]);

  // Highlight a path passed via ?focus= (Connection Finder).
  const highlightKey = (highlightIds ?? []).join(",");
  useEffect(() => {
    if (!highlightKey || nodes.length === 0) return;
    const t = setTimeout(() => {
      const picked = highlightIds!
        .map((id) => nodes.find((n) => n.id === id))
        .filter((n): n is GraphNode => !!n);
      if (picked.length > 0) {
        setSelectedNode(picked[0]);
        setFocusId(picked[0].id);
        setFocusSignal((s) => s + 1);
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightKey, nodes.length === 0]);

  // Pre-select entity passed via ?entity= (cross-module navigation).
  useEffect(() => {
    if (!preselectName || nodes.length === 0) return;
    const hit =
      nodes.find((n) => n.name.toLowerCase() === preselectName.toLowerCase()) ??
      nodes.find((n) => n.name.toLowerCase().includes(preselectName.toLowerCase()));
    if (hit) {
      setFocusId(hit.id);
      setFocusSignal((s) => s + 1);
    }
  }, [preselectName, nodes]);

  // Toolbar search centers the first match.
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || nodes.length === 0) return;
    const t = setTimeout(() => {
      const hit = nodes.find((n) => n.name.toLowerCase().includes(q));
      if (hit) {
        setFocusId(hit.id);
        setFocusSignal((s) => s + 1);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query, nodes]);

  const reset = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setQuery("");
    setNodeFilter("");
    setEdgeFilter("");
    setFitSignal((s) => s + 1);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8">
        <section className="topology-panel-archive" style={{ margin: 0 }}>
          <div className="panel-header">
            <div>
              <div className="section-code">01 // TOPOLOGY CANVAS</div>
              <h2>CONNECTED ENTITY GRAPH: {caseId}</h2>
            </div>
            <div className="panel-tools">
              <span>LAYOUT: FORCE-DIRECTED COSE</span>
            </div>
          </div>

          <div className="px-4 pt-3">
            <GraphToolbar
              query={query}
              onQuery={setQuery}
              nodeFilter={nodeFilter}
              onNodeFilter={setNodeFilter}
              edgeFilter={edgeFilter}
              onEdgeFilter={setEdgeFilter}
              onFit={() => setFitSignal((s) => s + 1)}
              onReset={reset}
              resultCount={matchCount}
            />
          </div>

          <div style={{ height: "600px" }}>
            {loading ? (
              <div className="w-full h-full bg-[#141817] flex flex-col items-center justify-center text-[#8a8d83] text-xs font-mono gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#b59858]" />
                <span>QUERYING NEO4J SUBGRAPH FOR {caseId}...</span>
              </div>
            ) : nodes.length > 0 ? (
              <GraphVisualizer
                nodes={nodes}
                edges={edges}
                onSelectNode={(node) => setSelectedNode(node)}
                selectedNodeId={selectedNode?.id}
                onSelectEdge={(edge) => setSelectedEdge(edge)}
                selectedEdgeId={selectedEdge?.id}
                nodeTypeFilter={nodeFilter ? [nodeFilter] : null}
                edgeTypeFilter={edgeFilter ? [edgeFilter] : null}
                focusId={focusId}
                focusSignal={focusSignal}
                fitSignal={fitSignal}
              />
            ) : (
              <div className="w-full h-full bg-[#141817] flex flex-col items-center justify-center text-[#8a8d83] text-xs font-mono gap-2 p-8 text-center">
                <FolderOpen className="w-9 h-9 text-[#5e625c]" />
                <b className="text-sm font-normal text-[#c8c8ba]">NO ENTITIES RECORDED FOR THIS CASE</b>
                <p className="max-w-md text-[#5e625c]">
                  Ingest an FIR record to populate nodes and relationships for this investigation.
                </p>
                <Link href="/ingest" className="commit-button mt-3" style={{ display: "inline-flex" }}>
                  <span>GO TO DATA INGESTION</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <section className="collision-panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div>
              <div className="section-code">
                {selectedEdge ? "02B // RELATIONSHIP INSPECTOR" : "02 // EVIDENCE INSPECTOR"}
              </div>
              <h2>{selectedEdge ? "RELATIONSHIP LINK" : "PROOF-OF-SOURCE LINK"}</h2>
            </div>
            {selectedNode && (
              <span className="text-[9px] font-mono text-[#c5bf55] border border-[#c5bf55]/30 px-1.5 py-0.5">
                {selectedNode.label}
              </span>
            )}
          </div>

          <div className="p-4 space-y-4">
            {selectedEdge ? (
              <RelationshipInspector edge={selectedEdge} nodeName={nameById} />
            ) : selectedNode ? (
              <EntityInspector node={selectedNode} caseId={caseId} />
            ) : (
              <div className="py-8 text-center text-[#5e625c] text-xs space-y-2">
                <Info className="w-7 h-7 mx-auto stroke-1 text-[#5e625c]" />
                <p className="text-[11px] text-[#8a8d83]">
                  Click any node or edge on the graph canvas to inspect its attributes and verifiable proof-of-source evidence.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
