"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Shield,
  Activity,
  User,
  Phone,
  CreditCard,
  MapPin,
  FolderOpen,
  Info,
  Repeat,
  Network,
  Users,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowRight,
  ExternalLink,
  GitBranch,
  Flame,
  PhoneCall,
} from "lucide-react";

// Dynamically import Cytoscape component with SSR disabled
const GraphVisualizer = dynamic(() => import("@/components/GraphVisualizer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[550px] bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
      Loading Cytoscape Graph Canvas...
    </div>
  ),
});

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = (params?.case_id as string) || "";

  const [graphData, setGraphData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [burnerPhoneData, setBurnerPhoneData] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"centrality" | "communities" | "cycles" | "cross_case">("centrality");

  useEffect(() => {
    if (!caseId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [graphRes, analyticsRes, burnerRes] = await Promise.all([
          fetch(`http://localhost:8000/cases/${encodeURIComponent(caseId)}/graph`),
          fetch(`http://localhost:8000/cases/${encodeURIComponent(caseId)}/analytics`),
          fetch(`http://localhost:8000/cases/${encodeURIComponent(caseId)}/burner-phones`),
        ]);

        if (!graphRes.ok) {
          throw new Error(`Graph fetch failed with status ${graphRes.status}`);
        }

        const gJson = await graphRes.json();
        setGraphData(gJson);

        if (analyticsRes.ok) {
          const aJson = await analyticsRes.json();
          setAnalyticsData(aJson);
        }

        if (burnerRes.ok) {
          const bJson = await burnerRes.json();
          setBurnerPhoneData(bJson);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load case data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [caseId]);

  const getNodeIcon = (label: string) => {
    switch (label) {
      case "Suspect":
        return <User className="w-4 h-4 text-red-400" />;
      case "Phone":
        return <Phone className="w-4 h-4 text-blue-400" />;
      case "Account":
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case "Location":
        return <MapPin className="w-4 h-4 text-amber-400" />;
      case "Case":
        return <FolderOpen className="w-4 h-4 text-purple-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const flaggedBurners = burnerPhoneData?.flagged_phones ?? analyticsData?.burner_phones ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Navbar */}
        <header className="border-b border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white font-mono">{caseId}</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Case Network
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Interactive Network Topology &amp; Evidence Linkage</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">Nodes: </span>
              <span className="font-semibold text-white font-mono">{graphData?.node_count ?? 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">Relationships: </span>
              <span className="font-semibold text-white font-mono">{graphData?.edge_count ?? 0}</span>
            </div>
            {analyticsData?.cross_case_links?.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-1.5 font-medium">
                <GitBranch className="w-3.5 h-3.5" />
                <span>{analyticsData.cross_case_links.length} Cross-Case</span>
              </div>
            )}
            {flaggedBurners.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5 font-medium">
                <Flame className="w-3.5 h-3.5" />
                <span>{flaggedBurners.length} Burner Phone</span>
              </div>
            )}
            {analyticsData?.money_laundering_cycles?.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5 font-medium">
                <Repeat className="w-3.5 h-3.5" />
                <span>{analyticsData.money_laundering_cycles.length} Laundering Loop(s)</span>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* HIGH-VISIBILITY INVESTIGATOR ALERT BANNERS (Batch 6 Part A & B)     */}
        {/* ═════════════════════════════════════════════════════════════════════ */}

        {/* Part A: Prominent Cross-Case Link Banner */}
        {analyticsData?.cross_case_links?.length > 0 && (
          <div
            data-testid="cross-case-banner"
            className="p-4 md:p-5 rounded-2xl bg-amber-950/30 border-2 border-amber-500/50 shadow-xl shadow-amber-950/30 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <GitBranch className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                      Cross-Case Intelligence Alert
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {analyticsData.cross_case_links.length} Connected Suspect{analyticsData.cross_case_links.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Suspects in this case are also present in other independent FIRs in the intelligence database.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveTab("cross_case");
                  document.getElementById("analytics-dashboard")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-xs text-amber-200 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 font-medium"
              >
                <span>View Full Cross-Case Graph</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {analyticsData.cross_case_links.map((link: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/30 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{link.identifier}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-300 border border-red-800/40">
                        {link.entityType}
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/90 font-medium">
                      This suspect also appears in:{" "}
                      <span className="font-mono font-bold text-white">
                        {link.other_cases?.join(", ")}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Present in <strong className="text-amber-300">{link.total_cases} distinct cases</strong> across the jurisdiction.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0 items-end">
                    <span className="text-[10px] text-slate-500">Jump to case:</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {link.other_cases?.map((otherCase: string) => (
                        <Link
                          key={otherCase}
                          href={`/cases/${encodeURIComponent(otherCase)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-xs transition"
                          title={`Open ${otherCase}`}
                        >
                          <span>{otherCase}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part B: Explainable Burner-Phone Anomaly Alert Banner */}
        {flaggedBurners.length > 0 && (
          <div
            data-testid="burner-phone-banner"
            className="p-4 md:p-5 rounded-2xl bg-rose-950/30 border-2 border-rose-500/50 shadow-xl shadow-rose-950/30 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Flame className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-rose-300">
                      Rule-Based Anomaly Alert: Possible Burner Phone
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                      {flaggedBurners.length} Flagged
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    High-frequency calling burst followed by complete inactivity — disposable handset profile.
                  </p>
                </div>
              </div>

              <div className="text-[11px] font-mono text-rose-200 bg-rose-950/70 px-3 py-1.5 rounded-lg border border-rose-800/50 flex items-center gap-1.5">
                <span className="text-rose-400 font-bold">Rule:</span>
                <span>&gt;5 calls in first 2h, then zero activity for remainder of record</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {flaggedBurners.map((bp: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-500/30 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-400">
                        <PhoneCall className="w-4 h-4" />
                      </span>
                      <span className="font-mono font-bold text-white text-sm tracking-wider">
                        {bp.phone_number}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      DISPOSABLE HANDSET
                    </span>
                  </div>

                  {/* Plain-English Explainable Rationale */}
                  <div className="bg-rose-950/30 border-l-2 border-rose-500 px-3 py-2 text-xs text-slate-200 rounded-r-lg">
                    <strong className="text-rose-300">Why flagged: </strong>
                    <span>{bp.flag_reason}</span>
                  </div>

                  {/* Explainability Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-1 text-slate-400">
                    <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase">Burst Volume</span>
                      <span className="font-bold text-rose-400 text-xs">{bp.calls_in_burst_window} calls</span>
                    </div>
                    <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase">Subsequent</span>
                      <span className="font-bold text-emerald-400 text-xs">0 calls (Silent)</span>
                    </div>
                    <div className="bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase">Lifespan</span>
                      <span className="font-bold text-slate-200 text-xs">{bp.active_duration_minutes} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Canvas & Detail Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Graph Visualizer Canvas */}
          <div className="lg:col-span-8 h-[600px]">
            {loading ? (
              <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
                Querying Neo4j Subgraph for {caseId}...
              </div>
            ) : graphData?.nodes?.length > 0 ? (
              <GraphVisualizer
                nodes={graphData.nodes}
                edges={graphData.edges}
                onSelectNode={(node: any) => setSelectedNode(node)}
                selectedNodeId={selectedNode?.id}
              />
            ) : (
              <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                <FolderOpen className="w-10 h-10 stroke-[1.5]" />
                <p className="text-slate-300 font-medium">No nodes found in Neo4j for this case</p>
                <p className="text-xs text-slate-500">Go back to Ingest & Extract to add confirmed entities.</p>
                <Link
                  href="/"
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition"
                >
                  Upload Case Data
                </Link>
              </div>
            )}
          </div>

          {/* Side Panel: Node Inspector & Analytics */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Selected Node Details (Proof-of-Source) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Entity Inspector
                </h2>
                {selectedNode && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300">
                    {selectedNode.label}
                  </span>
                )}
              </div>

              {selectedNode ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                      {getNodeIcon(selectedNode.label)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{selectedNode.name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedNode.id}</p>
                    </div>
                  </div>

                  {/* Proof of Source Guarantee Box
                      source_sentence is injected from the MENTIONS relationship
                      for this specific case by the backend — it is NOT read from
                      the Suspect node itself, which would give the wrong evidence
                      if this suspect appears in multiple cases. */}
                  {selectedNode.properties?.source_sentence && (
                    <div className="p-3.5 bg-blue-950/30 border border-blue-500/30 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Proof-of-Source (Evidence Link)</span>
                      </div>
                      <blockquote className="text-xs text-slate-300 italic border-l-2 border-blue-500 pl-2.5 my-1 leading-relaxed">
                        &quot;{selectedNode.properties.source_sentence}&quot;
                      </blockquote>
                      <p className="text-[10px] text-blue-400/80">
                        Sourced from the originating case statement for <strong>{caseId}</strong>.
                      </p>
                    </div>
                  )}

                  {/* Other properties */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Properties
                    </span>
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-1.5 text-xs font-mono">
                      {Object.entries(selectedNode.properties || {}).map(([k, v]) => {
                        if (k === "source_sentence") return null;
                        return (
                          <div key={k} className="flex justify-between py-0.5 border-b border-slate-900 last:border-0">
                            <span className="text-slate-500">{k}:</span>
                            <span className="text-slate-200 truncate max-w-[180px]">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 text-xs space-y-2">
                  <Info className="w-8 h-8 mx-auto stroke-1 text-slate-600" />
                  <p>Click any node on the graph to inspect its properties and proof-of-source evidence link.</p>
                </div>
              )}
            </div>

            {/* Side Panel Quick Analytics Summary */}
            {analyticsData && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold text-white">GDS Analytics Summary</h2>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Neo4j GDS</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Top PageRank Kingpin */}
                  {analyticsData.pagerank?.[0] && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-amber-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Top Kingpin (PageRank)
                        </span>
                        <span className="font-mono text-amber-300 font-bold">
                          {Number(analyticsData.pagerank[0].score).toFixed(4)}
                        </span>
                      </div>
                      <p className="font-semibold text-white text-sm truncate">
                        {analyticsData.pagerank[0].identifier}
                      </p>
                    </div>
                  )}

                  {/* Top Centrality Broker */}
                  {analyticsData.betweenness_centrality?.[0] && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-blue-400 flex items-center gap-1">
                          <Network className="w-3 h-3" /> Key Broker (Betweenness)
                        </span>
                        <span className="font-mono text-blue-300 font-bold">
                          {Number(analyticsData.betweenness_centrality[0].score).toFixed(4)}
                        </span>
                      </div>
                      <p className="font-semibold text-white text-sm truncate">
                        {analyticsData.betweenness_centrality[0].identifier}
                      </p>
                    </div>
                  )}

                  {/* Quick Stat Badges */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <button
                      onClick={() => setActiveTab("communities")}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition"
                    >
                      <span className="text-slate-400 block text-[10px]">Communities</span>
                      <strong className="text-white font-mono text-sm">
                        {Object.keys(analyticsData.louvain_communities ?? {}).length}
                      </strong>
                    </button>
                    <button
                      onClick={() => setActiveTab("cycles")}
                      className={`p-2.5 rounded-lg border text-left transition ${
                        (analyticsData.money_laundering_cycles?.length ?? 0) > 0
                          ? "bg-red-950/30 border-red-900/40 text-red-300 hover:border-red-700"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="block text-[10px]">Laundering Loops</span>
                      <strong className="font-mono text-sm">
                        {analyticsData.money_laundering_cycles?.length ?? 0}
                      </strong>
                    </button>
                  </div>

                  {analyticsData.cross_case_links?.length > 0 && (
                    <button
                      onClick={() => setActiveTab("cross_case")}
                      className="w-full text-left p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 hover:bg-amber-500/20 transition text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                        <span>{analyticsData.cross_case_links.length} Cross-Case Link(s)</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-amber-400" />
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* Full Dedicated GDS Analytics Dashboard Section (Batch 6 - Part B)    */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {analyticsData && (
          <section id="analytics-dashboard" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            
            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Criminal Network Intelligence &amp; Graph Analytics
                  </h2>
                  <p className="text-xs text-slate-400">
                    Computed using Neo4j Graph Data Science (GDS) algorithms across cases, suspects, phones, and transactions.
                  </p>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveTab("centrality")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    activeTab === "centrality"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Centrality &amp; Kingpins</span>
                </button>
                <button
                  onClick={() => setActiveTab("communities")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    activeTab === "communities"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Louvain Communities</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                    {Object.keys(analyticsData.louvain_communities ?? {}).length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("cycles")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    activeTab === "cycles"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Laundering Cycles</span>
                  {(analyticsData.money_laundering_cycles?.length ?? 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-red-900/60 text-red-300 font-bold">
                      {analyticsData.money_laundering_cycles.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("cross_case")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    activeTab === "cross_case"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Cross-Case Links</span>
                  {(analyticsData.cross_case_links?.length ?? 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-amber-900/60 text-amber-300 font-bold">
                      {analyticsData.cross_case_links.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ── TAB 1: Centrality & Kingpin Rankings ──────────────────────────── */}
            {activeTab === "centrality" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* PageRank Column */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-400" />
                          <h3 className="text-sm font-bold text-white">PageRank — Kingpin &amp; Influence</h3>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Ranks nodes by incoming structural influence and asset flows.
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-mono">
                        Algorithm: PageRank
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(analyticsData.pagerank ?? []).length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No PageRank scores available.</p>
                      ) : (
                        analyticsData.pagerank.slice(0, 10).map((item: any, i: number) => {
                          const isTop = i === 0;
                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                                item.in_this_case
                                  ? "bg-slate-900/90 border-blue-500/30"
                                  : "bg-slate-950/60 border-slate-900 text-slate-400"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-5 text-center font-mono font-bold text-xs ${
                                  isTop ? "text-amber-400" : "text-slate-500"
                                }`}>
                                  #{i + 1}
                                </span>
                                <span className="p-1 rounded bg-slate-800 border border-slate-700 shrink-0">
                                  {getNodeIcon(item.nodeType)}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-semibold text-white truncate block">
                                    {item.identifier}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {item.nodeType}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.in_this_case && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    This Case
                                  </span>
                                )}
                                <span className="font-mono font-bold text-amber-400 text-xs">
                                  {Number(item.score).toFixed(4)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Betweenness Centrality Column */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4 text-blue-400" />
                          <h3 className="text-sm font-bold text-white">Betweenness — Intermediaries &amp; Brokers</h3>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Identifies cutpoint bridges connecting otherwise disparate criminal groups.
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-mono">
                        Algorithm: Betweenness
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(analyticsData.betweenness_centrality ?? []).length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No Betweenness scores available.</p>
                      ) : (
                        analyticsData.betweenness_centrality.slice(0, 10).map((item: any, i: number) => {
                          const isTop = i === 0;
                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition ${
                                item.in_this_case
                                  ? "bg-slate-900/90 border-blue-500/30"
                                  : "bg-slate-950/60 border-slate-900 text-slate-400"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-5 text-center font-mono font-bold text-xs ${
                                  isTop ? "text-blue-400" : "text-slate-500"
                                }`}>
                                  #{i + 1}
                                </span>
                                <span className="p-1 rounded bg-slate-800 border border-slate-700 shrink-0">
                                  {getNodeIcon(item.nodeType)}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-semibold text-white truncate block">
                                    {item.identifier}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {item.nodeType}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.in_this_case && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    This Case
                                  </span>
                                )}
                                <span className="font-mono font-bold text-blue-400 text-xs">
                                  {Number(item.score).toFixed(4)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ── TAB 2: Louvain Community Groupings ───────────────────────────── */}
            {activeTab === "communities" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Modularity-based clustering detects dense operational cells and sub-syndicates across the network.
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Total Communities: {Object.keys(analyticsData.louvain_communities ?? {}).length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(analyticsData.louvain_communities ?? {}).map(([cid, members]: [string, any]) => {
                    const hasCaseSuspect = members.some((m: any) => m.in_this_case);
                    return (
                      <div
                        key={cid}
                        className={`bg-slate-950 rounded-xl border p-4 space-y-3 transition ${
                          hasCaseSuspect
                            ? "border-emerald-500/30 bg-emerald-950/10"
                            : "border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-xs font-bold text-white">Community #{cid}</h4>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {hasCaseSuspect && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                                Active In Case
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {members.length} member{members.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {members.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${
                                m.in_this_case
                                  ? "bg-slate-900 border-emerald-500/20"
                                  : "bg-slate-950/80 border-slate-900 text-slate-400"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="p-0.5 shrink-0">
                                  {getNodeIcon(m.nodeType)}
                                </span>
                                <span className="text-slate-200 font-medium truncate">
                                  {m.identifier}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                {m.nodeType}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB 3: Money-Laundering Cycles ──────────────────────────────── */}
            {activeTab === "cycles" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Cycle detection flags closed fund-transfer loops (A &rarr; B &rarr; ... &rarr; A), indicating potential layering and round-tripping.
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Detected Rings: {analyticsData.money_laundering_cycles?.length ?? 0}
                  </span>
                </div>

                {(analyticsData.money_laundering_cycles ?? []).length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-2">
                    <Repeat className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-medium text-slate-300">No Circular Fund Transfers Detected</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      All bank transactions in this case follow linear disbursement patterns. No circular layering loops were discovered in the transaction graph.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analyticsData.money_laundering_cycles.map((cycle: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-red-900/40 rounded-xl p-5 space-y-4 shadow-lg"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-red-950/60 border border-red-900/60 text-red-400">
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                            <h4 className="text-sm font-bold text-white">
                              Laundering Ring #{idx + 1}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800/40 font-semibold font-mono">
                              {cycle.cycle_length} Transfer Hops
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                            <span>Cases:</span>
                            {cycle.cases?.map((c: string, ci: number) => (
                              <span key={ci} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-400">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Visual Transfer Chain */}
                        <div className="overflow-x-auto py-2">
                          <div className="flex items-center gap-2 min-w-max">
                            {cycle.accounts.map((acc: string, ai: number) => {
                              const amount = cycle.amounts?.[ai];
                              const isLast = ai === cycle.accounts.length - 1;
                              return (
                                <React.Fragment key={ai}>
                                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                                    <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="font-mono text-xs font-bold text-white">
                                      {acc}
                                    </span>
                                  </div>
                                  {!isLast && (
                                    <div className="flex flex-col items-center px-1">
                                      {amount !== undefined && (
                                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.5 rounded">
                                          ₹{Number(amount).toLocaleString("en-IN")}
                                        </span>
                                      )}
                                      <ArrowRight className="w-4 h-4 text-red-400" />
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 4: Cross-Case Linkages ──────────────────────────────────── */}
            {activeTab === "cross_case" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Cross-case matching detects suspects or entities that appear across independent FIRs in the system.
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Linked Entities: {analyticsData.cross_case_links?.length ?? 0}
                  </span>
                </div>

                {(analyticsData.cross_case_links ?? []).length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-2">
                    <GitBranch className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-medium text-slate-300">No Cross-Case Links Detected</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      All suspects and entities in this case currently appear only in this case. No overlaps were found with other FIRs in the database.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analyticsData.cross_case_links.map((link: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{link.identifier}</h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {link.entityType}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Present across <strong className="text-amber-300">{link.total_cases} distinct cases</strong> in the intelligence database.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Connected Cases:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {link.other_cases?.map((otherCase: string) => (
                              <Link
                                key={otherCase}
                                href={`/cases/${encodeURIComponent(otherCase)}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-blue-500 text-xs text-blue-400 font-mono transition"
                              >
                                <span>{otherCase}</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </section>
        )}

      </div>
    </div>
  );
}