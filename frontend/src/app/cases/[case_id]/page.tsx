"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { API_BASE_URL } from "@/config";
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
  Loader2,
} from "lucide-react";

// Dynamically import Cytoscape component with SSR disabled
const GraphVisualizer = dynamic(() => import("@/components/GraphVisualizer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[550px] bg-[#141817] border border-[rgba(200,200,186,0.25)] flex items-center justify-center text-[#8a8d83] text-xs font-mono">
      INITIALIZING CYTOSCAPE GRAPH CANVAS...
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
          fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/graph`),
          fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/analytics`),
          fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId)}/burner-phones`),
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
        return <User className="w-3.5 h-3.5 text-[#bd7470]" />;
      case "Phone":
        return <Phone className="w-3.5 h-3.5 text-[#bf8069]" />;
      case "Account":
        return <CreditCard className="w-3.5 h-3.5 text-[#859b7d]" />;
      case "Location":
        return <MapPin className="w-3.5 h-3.5 text-[#b59858]" />;
      case "Case":
        return <FolderOpen className="w-3.5 h-3.5 text-[#c5bf55]" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#8a8d83]" />;
    }
  };

  const flaggedBurners = burnerPhoneData?.flagged_phones ?? analyticsData?.burner_phones ?? [];

  return (
    <div className="space-y-6">
      {/* ── Page Header / Intro ── */}
      <section className="case-intro">
        <div>
          <div className="section-code">CASE WORKSPACE // EVIDENCE TOPOLOGY</div>
          <h2>{caseId} — NETWORK INTELLIGENCE</h2>
          <p>
            Connected criminal topology for {caseId}. Every node retains verifiable Proof-of-Source
            linked to the originating statement for this case in Neo4j.
          </p>
        </div>
        <div className="case-id-block">
          <span>INVESTIGATION CONTEXT</span>
          <b>{caseId}</b>
        </div>
      </section>

      {/* ── Top Navbar & Quick Metrics ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[rgba(200,200,186,0.15)]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="table-action flex items-center gap-1.5"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>CASE INDEX</span>
          </Link>
          <span className="text-[10px] font-mono text-[#8a8d83]">
            NEO4J CE // GRAPH DATA SCIENCE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 border border-[rgba(200,200,186,0.2)] bg-[#121514] text-[#8a8d83]">
            NODES: <strong className="text-[#c8c8ba]">{graphData?.node_count ?? 0}</strong>
          </span>
          <span className="px-2.5 py-1 border border-[rgba(200,200,186,0.2)] bg-[#121514] text-[#8a8d83]">
            RELATIONSHIPS: <strong className="text-[#c8c8ba]">{graphData?.edge_count ?? 0}</strong>
          </span>
          {analyticsData?.cross_case_links?.length > 0 && (
            <span className="px-2.5 py-1 border border-[#b59858]/50 bg-[#b59858]/10 text-[#c5bf55] flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span>{analyticsData.cross_case_links.length} CROSS-CASE</span>
            </span>
          )}
          {flaggedBurners.length > 0 && (
            <span className="px-2.5 py-1 border border-[#8d3d3c]/50 bg-[#8d3d3c]/10 text-[#bd7470] flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>{flaggedBurners.length} BURNER PHONE</span>
            </span>
          )}
          {analyticsData?.money_laundering_cycles?.length > 0 && (
            <span className="px-2.5 py-1 border border-[#8d3d3c]/50 bg-[#8d3d3c]/10 text-[#bd7470] flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              <span>{analyticsData.money_laundering_cycles.length} CYCLE(S)</span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="form-message error flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* HIGH-VISIBILITY INVESTIGATOR ALERT BANNERS                            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}

      {/* Part A: Prominent Cross-Case Link Banner */}
      {analyticsData?.cross_case_links?.length > 0 && (
        <div
          data-testid="cross-case-banner"
          className="collision-panel p-4 border-[#b59858] bg-[#b59858]/10 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b59858]/30 pb-3">
            <div className="flex items-center gap-3">
              <span className="p-1.5 border border-[#b59858] text-[#c5bf55] bg-[#121514]">
                <GitBranch className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#c5bf55] font-mono">
                    CROSS-CASE INTELLIGENCE ALERT
                  </h2>
                  <span className="px-2 py-0.5 border border-[#b59858]/60 bg-[#b59858]/20 text-[#c5bf55] text-[10px] font-bold font-mono">
                    {analyticsData.cross_case_links.length} CONNECTED SUSPECT(S)
                  </span>
                </div>
                <p className="text-[11px] text-[#8a8d83] mt-0.5">
                  Suspects in this case are also present in other independent FIRs in the intelligence database.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab("cross_case");
                document.getElementById("analytics-dashboard")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="table-action flex items-center gap-1.5 text-[10px]"
            >
              <span>VIEW FULL CROSS-CASE GRAPH</span>
              <ArrowRight className="w-3 h-3 text-[#c5bf55]" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {analyticsData.cross_case_links.map((link: any, idx: number) => (
              <div
                key={idx}
                className="p-3 border border-[#b59858]/30 bg-[#121514] flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#c8c8ba] text-xs font-mono">{link.identifier}</span>
                    <span className="px-1.5 py-0.2 border border-[#8d3d3c]/40 text-[#bd7470] text-[9px] font-mono">
                      {link.entityType}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#c5bf55]">
                    Suspect also appears in:{" "}
                    <span className="font-mono font-bold text-[#c8c8ba]">
                      {link.other_cases?.join(", ")}
                    </span>
                  </p>
                  <p className="text-[10px] text-[#5e625c] font-mono">
                    Present in {link.total_cases} distinct cases across jurisdiction.
                  </p>
                </div>

                <div className="flex flex-col gap-1 shrink-0 items-end">
                  <span className="text-[9px] text-[#5e625c] font-mono">JUMP TO:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {link.other_cases?.map((otherCase: string) => (
                      <Link
                        key={otherCase}
                        href={`/cases/${encodeURIComponent(otherCase)}`}
                        className="table-action"
                        style={{ padding: "3px 6px", fontSize: "9px" }}
                        title={`Open ${otherCase}`}
                      >
                        <span>{otherCase}</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-1" />
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
          className="collision-panel p-4 border-[#8d3d3c] bg-[#8d3d3c]/10 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#8d3d3c]/30 pb-3">
            <div className="flex items-center gap-3">
              <span className="p-1.5 border border-[#8d3d3c] text-[#bd7470] bg-[#121514]">
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#bd7470] font-mono">
                    RULE-BASED ANOMALY ALERT: POSSIBLE BURNER PHONE
                  </h2>
                  <span className="px-2 py-0.5 border border-[#8d3d3c]/60 bg-[#8d3d3c]/20 text-[#bd7470] text-[10px] font-bold font-mono">
                    {flaggedBurners.length} FLAGGED
                  </span>
                </div>
                <p className="text-[11px] text-[#8a8d83] mt-0.5">
                  High-frequency calling burst followed by complete inactivity — disposable handset signature.
                </p>
              </div>
            </div>

            <div className="text-[9px] font-mono text-[#8a8d83] border border-[rgba(200,200,186,0.15)] bg-[#121514] px-2.5 py-1">
              RULE: &gt;5 calls in first 2h, then zero activity
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {flaggedBurners.map((bp: any, idx: number) => (
              <div
                key={idx}
                className="p-3 border border-[#8d3d3c]/30 bg-[#121514] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5 text-[#bd7470]" />
                    <span className="font-mono font-bold text-[#c8c8ba] text-xs">
                      {bp.phone_number}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.2 border border-[#8d3d3c]/50 text-[#bd7470] text-[9px] font-mono">
                    DISPOSABLE HANDSET
                  </span>
                </div>

                <div className="border-l-2 border-[#8d3d3c] pl-2.5 text-[11px] text-[#8a8d83]">
                  <strong className="text-[#bd7470]">Why flagged: </strong>
                  <span>{bp.flag_reason}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[9px] font-mono pt-1 text-[#8a8d83]">
                  <div className="border border-[rgba(200,200,186,0.12)] p-1.5 bg-[#181c1a]">
                    <span className="text-[#5e625c] block uppercase">Burst Volume</span>
                    <span className="font-bold text-[#bd7470]">{bp.calls_in_burst_window} calls</span>
                  </div>
                  <div className="border border-[rgba(200,200,186,0.12)] p-1.5 bg-[#181c1a]">
                    <span className="text-[#5e625c] block uppercase">Subsequent</span>
                    <span className="font-bold text-[#859b7d]">0 calls (Silent)</span>
                  </div>
                  <div className="border border-[rgba(200,200,186,0.12)] p-1.5 bg-[#181c1a]">
                    <span className="text-[#5e625c] block uppercase">Lifespan</span>
                    <span className="font-bold text-[#c8c8ba]">{bp.active_duration_minutes} min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Canvas & Detail Side Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Graph Visualizer Canvas */}
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

            <div style={{ height: "600px" }}>
              {loading ? (
                <div className="w-full h-full bg-[#141817] flex flex-col items-center justify-center text-[#8a8d83] text-xs font-mono gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#b59858]" />
                  <span>QUERYING NEO4J SUBGRAPH FOR {caseId}...</span>
                </div>
              ) : graphData?.nodes?.length > 0 ? (
                <GraphVisualizer
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  onSelectNode={(node: any) => setSelectedNode(node)}
                  selectedNodeId={selectedNode?.id}
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

        {/* Side Panel: Evidence Inspector & Proof-of-Source */}
        <div className="lg:col-span-4 space-y-6">
          <section className="collision-panel" style={{ margin: 0 }}>
            <div className="panel-header">
              <div>
                <div className="section-code">02 // EVIDENCE INSPECTOR</div>
                <h2>PROOF-OF-SOURCE LINK</h2>
              </div>
              {selectedNode && (
                <span className="text-[9px] font-mono text-[#c5bf55] border border-[#c5bf55]/30 px-1.5 py-0.5">
                  {selectedNode.label}
                </span>
              )}
            </div>

            <div className="p-4 space-y-4">
              {selectedNode ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 p-3 border border-[rgba(200,200,186,0.15)] bg-[#121514]">
                    <div className="p-1.5 border border-[rgba(200,200,186,0.2)] mt-0.5">
                      {getNodeIcon(selectedNode.label)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#c8c8ba] font-mono">{selectedNode.name}</h3>
                      <p className="text-[10px] text-[#5e625c] font-mono mt-0.5">{selectedNode.id}</p>
                    </div>
                  </div>

                  {/* Proof-of-Source Guarantee Box */}
                  {selectedNode.properties?.source_sentence ? (
                    <div className="p-3 border border-[#b59858]/50 bg-[#b59858]/10 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#c5bf55] text-[10px] font-semibold uppercase tracking-wider font-mono">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Proof-of-Source (Evidence Link)</span>
                      </div>
                      <blockquote style={{ margin: "8px 0", padding: "8px 10px", borderColor: "#b59858" }}>
                        &ldquo;{selectedNode.properties.source_sentence}&rdquo;
                      </blockquote>
                      <p className="text-[9px] text-[#8a8d83] font-mono">
                        Sourced from the originating case MENTIONS link for <strong>{caseId}</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 border border-[rgba(200,200,186,0.12)] bg-[#121514] text-[10px] text-[#5e625c] font-mono">
                      No direct source sentence attached to this entity node.
                    </div>
                  )}

                  {/* Other Properties */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[9px] font-semibold text-[#8a8d83] uppercase tracking-wider font-mono">
                      NODE ATTRIBUTES
                    </span>
                    <div className="border border-[rgba(200,200,186,0.15)] bg-[#121514] p-2.5 space-y-1 text-xs font-mono">
                      {Object.entries(selectedNode.properties || {}).map(([k, v]) => {
                        if (k === "source_sentence") return null;
                        return (
                          <div key={k} className="flex justify-between py-0.5 border-b border-[rgba(200,200,186,0.08)] last:border-0">
                            <span className="text-[#5e625c] text-[10px]">{k}:</span>
                            <span className="text-[#c8c8ba] text-[10px] truncate max-w-[160px]">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-[#5e625c] text-xs space-y-2">
                  <Info className="w-7 h-7 mx-auto stroke-1 text-[#5e625c]" />
                  <p className="text-[11px] text-[#8a8d83]">
                    Click any node on the graph canvas to inspect its attributes and verifiable proof-of-source evidence.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Side Panel Quick Analytics Summary */}
          {analyticsData && (
            <section className="collision-panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <div>
                  <div className="section-code">03 // GDS METRICS</div>
                  <h2>CENTRALITY SUMMARY</h2>
                </div>
                <span className="text-[9px] text-[#5e625c] font-mono">NEO4J GDS</span>
              </div>

              <div className="p-4 space-y-3 text-xs">
                {analyticsData.pagerank?.[0] && (
                  <div className="p-2.5 border border-[rgba(200,200,186,0.15)] bg-[#121514] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-semibold text-[#c5bf55] font-mono flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Top Kingpin (PageRank)
                      </span>
                      <span className="font-mono text-[#c5bf55] font-bold text-[11px]">
                        {Number(analyticsData.pagerank[0].score).toFixed(4)}
                      </span>
                    </div>
                    <p className="font-mono text-[#c8c8ba] text-xs truncate">
                      {analyticsData.pagerank[0].identifier}
                    </p>
                  </div>
                )}

                {analyticsData.betweenness_centrality?.[0] && (
                  <div className="p-2.5 border border-[rgba(200,200,186,0.15)] bg-[#121514] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-semibold text-[#859b7d] font-mono flex items-center gap-1">
                        <Network className="w-3 h-3" /> Key Broker (Betweenness)
                      </span>
                      <span className="font-mono text-[#859b7d] font-bold text-[11px]">
                        {Number(analyticsData.betweenness_centrality[0].score).toFixed(4)}
                      </span>
                    </div>
                    <p className="font-mono text-[#c8c8ba] text-xs truncate">
                      {analyticsData.betweenness_centrality[0].identifier}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
                  <button
                    onClick={() => {
                      setActiveTab("communities");
                      document.getElementById("analytics-dashboard")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="p-2 border border-[rgba(200,200,186,0.15)] bg-[#121514] text-left hover:border-[#c5bf55] transition"
                  >
                    <span className="text-[#5e625c] block text-[9px]">COMMUNITIES</span>
                    <strong className="text-[#c8c8ba] text-xs">
                      {Object.keys(analyticsData.louvain_communities ?? {}).length}
                    </strong>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("cycles");
                      document.getElementById("analytics-dashboard")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="p-2 border border-[rgba(200,200,186,0.15)] bg-[#121514] text-left hover:border-[#bd7470] transition"
                  >
                    <span className="text-[#5e625c] block text-[9px]">LAUNDERING LOOPS</span>
                    <strong className="text-[#bd7470] text-xs">
                      {analyticsData.money_laundering_cycles?.length ?? 0}
                    </strong>
                  </button>
                </div>
              </div>
            </section>
          )}

        </div>

      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* Full Dedicated GDS Analytics Dashboard Section                        */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {analyticsData && (
        <section id="analytics-dashboard" className="collision-panel">
          
          <div className="panel-header">
            <div>
              <div className="section-code">04 // GDS ANALYTICS ENGINE</div>
              <h2>CRIMINAL NETWORK INTELLIGENCE &amp; GRAPH ALGORITHMS</h2>
            </div>
            <span className="text-[9px] font-mono text-[#8a8d83]">NEO4J GDS LIBRARY ONLY</span>
          </div>

          {/* Tab Selector */}
          <div className="archive-nav" style={{ borderTop: "1px solid rgba(200,200,186,0.15)" }}>
            <button
              type="button"
              onClick={() => setActiveTab("centrality")}
              className={activeTab === "centrality" ? "nav-active" : ""}
            >
              <TrendingUp size={12} />
              <span>CENTRALITY &amp; KINGPINS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("communities")}
              className={activeTab === "communities" ? "nav-active" : ""}
            >
              <Layers size={12} />
              <span>LOUVAIN COMMUNITIES ({Object.keys(analyticsData.louvain_communities ?? {}).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cycles")}
              className={activeTab === "cycles" ? "nav-active" : ""}
            >
              <Repeat size={12} />
              <span>LAUNDERING CYCLES ({analyticsData.money_laundering_cycles?.length ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cross_case")}
              className={activeTab === "cross_case" ? "nav-active" : ""}
            >
              <GitBranch size={12} />
              <span>CROSS-CASE LINKS ({analyticsData.cross_case_links?.length ?? 0})</span>
            </button>
          </div>

          <div className="p-5">
            {/* ── TAB 1: Centrality & Kingpin Rankings ──────────────────────────── */}
            {activeTab === "centrality" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* PageRank Column */}
                  <div className="border border-[rgba(200,200,186,0.18)] bg-[#121514] p-4 space-y-3">
                    <div className="border-b border-[rgba(200,200,186,0.12)] pb-2.5 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-[#c5bf55]" />
                          <h3 className="text-xs font-bold text-[#c8c8ba] font-mono">PageRank — Kingpins &amp; Influence</h3>
                        </div>
                        <p className="text-[10px] text-[#5e625c] mt-0.5">
                          Ranks nodes by incoming structural influence and asset flows.
                        </p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 border border-[#c5bf55]/40 text-[#c5bf55] font-mono">
                        GDS: PageRank
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(analyticsData.pagerank ?? []).length === 0 ? (
                        <p className="text-xs text-[#5e625c] py-4 text-center font-mono">No PageRank scores recorded.</p>
                      ) : (
                        analyticsData.pagerank.slice(0, 10).map((item: any, i: number) => {
                          const isTop = i === 0;
                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-2 border text-xs font-mono transition ${
                                item.in_this_case
                                  ? "bg-[#181c1a] border-[rgba(200,200,186,0.3)]"
                                  : "bg-[#121514] border-[rgba(200,200,186,0.08)] text-[#5e625c]"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-4 font-bold text-[10px] ${
                                  isTop ? "text-[#c5bf55]" : "text-[#5e625c]"
                                }`}>
                                  #{i + 1}
                                </span>
                                <span className="p-0.5 border border-[rgba(200,200,186,0.15)] shrink-0">
                                  {getNodeIcon(item.nodeType)}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-semibold text-[#c8c8ba] truncate block text-[11px]">
                                    {item.identifier}
                                  </span>
                                  <span className="text-[9px] text-[#5e625c]">
                                    {item.nodeType}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.in_this_case && (
                                  <span className="px-1.5 py-0.2 text-[8px] border border-[#c5bf55]/40 text-[#c5bf55]">
                                    THIS CASE
                                  </span>
                                )}
                                <span className="font-bold text-[#c5bf55] text-xs">
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
                  <div className="border border-[rgba(200,200,186,0.18)] bg-[#121514] p-4 space-y-3">
                    <div className="border-b border-[rgba(200,200,186,0.12)] pb-2.5 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Network className="w-3.5 h-3.5 text-[#859b7d]" />
                          <h3 className="text-xs font-bold text-[#c8c8ba] font-mono">Betweenness — Intermediaries &amp; Brokers</h3>
                        </div>
                        <p className="text-[10px] text-[#5e625c] mt-0.5">
                          Identifies cutpoint bridges connecting otherwise disparate criminal groups.
                        </p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 border border-[#859b7d]/40 text-[#859b7d] font-mono">
                        GDS: Betweenness
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(analyticsData.betweenness_centrality ?? []).length === 0 ? (
                        <p className="text-xs text-[#5e625c] py-4 text-center font-mono">No Betweenness scores recorded.</p>
                      ) : (
                        analyticsData.betweenness_centrality.slice(0, 10).map((item: any, i: number) => {
                          const isTop = i === 0;
                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-2 border text-xs font-mono transition ${
                                item.in_this_case
                                  ? "bg-[#181c1a] border-[rgba(200,200,186,0.3)]"
                                  : "bg-[#121514] border-[rgba(200,200,186,0.08)] text-[#5e625c]"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-4 font-bold text-[10px] ${
                                  isTop ? "text-[#859b7d]" : "text-[#5e625c]"
                                }`}>
                                  #{i + 1}
                                </span>
                                <span className="p-0.5 border border-[rgba(200,200,186,0.15)] shrink-0">
                                  {getNodeIcon(item.nodeType)}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-semibold text-[#c8c8ba] truncate block text-[11px]">
                                    {item.identifier}
                                  </span>
                                  <span className="text-[9px] text-[#5e625c]">
                                    {item.nodeType}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.in_this_case && (
                                  <span className="px-1.5 py-0.2 text-[8px] border border-[#859b7d]/40 text-[#859b7d]">
                                    THIS CASE
                                  </span>
                                )}
                                <span className="font-bold text-[#859b7d] text-xs">
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
                <div className="flex items-center justify-between font-mono text-xs">
                  <p className="text-[11px] text-[#8a8d83]">
                    Modularity-based clustering detects operational cells and sub-syndicates across the network.
                  </p>
                  <span className="text-[10px] text-[#5e625c]">
                    Total Communities: {Object.keys(analyticsData.louvain_communities ?? {}).length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(analyticsData.louvain_communities ?? {}).map(([cid, members]: [string, any]) => {
                    const hasCaseSuspect = members.some((m: any) => m.in_this_case);
                    return (
                      <div
                        key={cid}
                        className={`border p-3.5 space-y-2.5 transition ${
                          hasCaseSuspect
                            ? "border-[#859b7d]/50 bg-[#859b7d]/10"
                            : "border-[rgba(200,200,186,0.15)] bg-[#121514]"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-[rgba(200,200,186,0.1)] pb-2">
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#859b7d]" />
                            <h4 className="text-xs font-bold text-[#c8c8ba] font-mono">COMMUNITY #{cid}</h4>
                          </div>
                          <div className="flex items-center gap-1">
                            {hasCaseSuspect && (
                              <span className="text-[8px] px-1.5 py-0.2 border border-[#859b7d] text-[#859b7d] font-mono">
                                ACTIVE
                              </span>
                            )}
                            <span className="text-[9px] font-mono text-[#8a8d83]">
                              {members.length} members
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                          {members.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between px-2 py-1 border text-xs font-mono ${
                                m.in_this_case
                                  ? "bg-[#181c1a] border-[rgba(200,200,186,0.25)]"
                                  : "bg-[#121514] border-[rgba(200,200,186,0.06)] text-[#5e625c]"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0">{getNodeIcon(m.nodeType)}</span>
                                <span className="text-[#c8c8ba] font-medium truncate text-[11px]">
                                  {m.identifier}
                                </span>
                              </div>
                              <span className="text-[9px] text-[#5e625c] shrink-0">
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
                <div className="flex items-center justify-between font-mono text-xs">
                  <p className="text-[11px] text-[#8a8d83]">
                    Cycle detection flags closed fund-transfer loops (A &rarr; B &rarr; ... &rarr; A), indicating potential layering and round-tripping.
                  </p>
                  <span className="text-[10px] text-[#5e625c]">
                    Detected Rings: {analyticsData.money_laundering_cycles?.length ?? 0}
                  </span>
                </div>

                {(analyticsData.money_laundering_cycles ?? []).length === 0 ? (
                  <div className="border border-[rgba(200,200,186,0.15)] bg-[#121514] p-8 text-center space-y-2">
                    <Repeat className="w-7 h-7 text-[#5e625c] mx-auto" />
                    <p className="text-xs font-medium text-[#c8c8ba] font-mono">NO CIRCULAR FUND TRANSFERS DETECTED</p>
                    <p className="text-[11px] text-[#5e625c] max-w-md mx-auto">
                      All bank transactions in this case follow linear disbursement patterns. No circular layering loops were discovered in the transaction graph.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analyticsData.money_laundering_cycles.map((cycle: any, idx: number) => (
                      <div
                        key={idx}
                        className="border border-[#8d3d3c]/50 bg-[#8d3d3c]/10 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#8d3d3c]/30 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 border border-[#8d3d3c] text-[#bd7470] bg-[#121514]">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                            <h4 className="text-xs font-bold text-[#bd7470] font-mono">
                              LAUNDERING RING #{idx + 1}
                            </h4>
                            <span className="text-[9px] px-1.5 py-0.2 border border-[#8d3d3c] text-[#bd7470] font-mono">
                              {cycle.cycle_length} TRANSFER HOPS
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8a8d83]">
                            <span>CASES:</span>
                            {cycle.cases?.map((c: string, ci: number) => (
                              <span key={ci} className="px-1.5 py-0.2 border border-[rgba(200,200,186,0.2)] bg-[#121514] text-[#c8c8ba]">
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
                                  <div className="flex items-center gap-1.5 border border-[rgba(200,200,186,0.2)] bg-[#121514] px-2.5 py-1.5">
                                    <CreditCard className="w-3 h-3 text-[#859b7d] shrink-0" />
                                    <span className="font-mono text-xs text-[#c8c8ba]">
                                      {acc}
                                    </span>
                                  </div>
                                  {!isLast && (
                                    <div className="flex flex-col items-center px-1 font-mono">
                                      {amount !== undefined && (
                                        <span className="text-[9px] font-bold text-[#c5bf55]">
                                          ₹{Number(amount).toLocaleString("en-IN")}
                                        </span>
                                      )}
                                      <ArrowRight className="w-3.5 h-3.5 text-[#bd7470]" />
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
                <div className="flex items-center justify-between font-mono text-xs">
                  <p className="text-[11px] text-[#8a8d83]">
                    Cross-case matching detects suspects or entities that appear across independent FIRs in the system.
                  </p>
                  <span className="text-[10px] text-[#5e625c]">
                    Linked Entities: {analyticsData.cross_case_links?.length ?? 0}
                  </span>
                </div>

                {(analyticsData.cross_case_links ?? []).length === 0 ? (
                  <div className="border border-[rgba(200,200,186,0.15)] bg-[#121514] p-8 text-center space-y-2">
                    <GitBranch className="w-7 h-7 text-[#5e625c] mx-auto" />
                    <p className="text-xs font-medium text-[#c8c8ba] font-mono">NO CROSS-CASE OVERLAPS DETECTED</p>
                    <p className="text-[11px] text-[#5e625c] max-w-md mx-auto">
                      All suspects and entities in this case currently appear only in this case. No overlaps were found with other FIRs in the database.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analyticsData.cross_case_links.map((link: any, idx: number) => (
                      <div
                        key={idx}
                        className="border border-[#b59858]/40 bg-[#121514] p-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 border border-[#b59858] text-[#c5bf55]">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-[#c8c8ba] font-mono">{link.identifier}</h4>
                              <span className="px-1.5 py-0.2 border border-[#8d3d3c]/40 text-[#bd7470] text-[9px] font-mono">
                                {link.entityType}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8a8d83] mt-0.5">
                              Present across <strong className="text-[#c5bf55]">{link.total_cases} distinct cases</strong> in the intelligence database.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#5e625c] font-mono">CONNECTED CASES:</span>
                          <div className="flex flex-wrap gap-1">
                            {link.other_cases?.map((otherCase: string) => (
                              <Link
                                key={otherCase}
                                href={`/cases/${encodeURIComponent(otherCase)}`}
                                className="table-action"
                                style={{ padding: "3px 6px", fontSize: "9px" }}
                              >
                                <span>{otherCase}</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-1" />
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

          </div>

        </section>
      )}

    </div>
  );
}
