"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  ExternalLink,
  GitBranch,
  Layers,
  Network,
  Repeat,
  TrendingUp,
  User,
} from "lucide-react";
import { nodeIcon } from "@/components/inspectors";
import { EmptyState } from "@/components/ui";
import type {
  CaseAnalytics as Analytics,
  CentralityRow,
  CommunityMember,
  CycleRecord,
} from "@/api/types";

type DashTab = "centrality" | "communities" | "cycles" | "cross_case";

function engineTag(a: Analytics): string {
  return a.analytics_engine === "networkx-local"
    ? "LOCAL: NETWORKX + LOUVAIN"
    : "NEO4J GDS";
}

function RankColumn({
  title,
  blurb,
  tag,
  tagColor,
  icon,
  rows,
}: {
  title: string;
  blurb: string;
  tag: string;
  tagColor: string;
  icon: React.ReactNode;
  rows: CentralityRow[];
}) {
  return (
    <div className="border border-[rgba(200,200,186,0.18)] bg-[#121514] p-4 space-y-3">
      <div className="border-b border-[rgba(200,200,186,0.12)] pb-2.5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-xs font-bold text-[#c8c8ba] font-mono">{title}</h3>
          </div>
          <p className="text-[10px] text-[#5e625c] mt-0.5">{blurb}</p>
        </div>
        <span
          className="text-[9px] px-1.5 py-0.2 border font-mono"
          style={{ borderColor: `${tagColor}66`, color: tagColor }}
        >
          {tag}
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="text-xs text-[#5e625c] py-4 text-center font-mono">No scores recorded.</p>
        ) : (
          rows.slice(0, 10).map((item, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-2 border text-xs font-mono transition ${
                item.in_this_case
                  ? "bg-[#181c1a] border-[rgba(200,200,186,0.3)]"
                  : "bg-[#121514] border-[rgba(200,200,186,0.08)] text-[#5e625c]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-4 font-bold text-[10px] ${i === 0 ? "text-[#c5bf55]" : "text-[#5e625c]"}`}>
                  #{i + 1}
                </span>
                <span className="p-0.5 border border-[rgba(200,200,186,0.15)] shrink-0">
                  {nodeIcon(item.nodeType)}
                </span>
                <div className="min-w-0">
                  <span className="font-semibold text-[#c8c8ba] truncate block text-[11px]">
                    {item.identifier}
                  </span>
                  <span className="text-[9px] text-[#5e625c]">{item.nodeType}</span>
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
          ))
        )}
      </div>
    </div>
  );
}

// Analytics section (§16): Centrality / Communities / Cycles / Cross-Case
// in separate tabs — never dumped simultaneously. Neutral terminology
// (Influence Ranking, Network Intermediaries) and a dynamic engine tag.
export default function CaseAnalytics({
  analytics,
  initialTab,
}: {
  analytics: Analytics | null;
  initialTab?: DashTab;
}) {
  const [tab, setTab] = useState<DashTab>(initialTab ?? "centrality");

  React.useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  if (!analytics) {
    return <EmptyState title="NO ANALYTICS AVAILABLE" body="Analytics could not be computed for this case." />;
  }
  const a = analytics;
  const communities = a.louvain_communities ?? {};
  const cycles: CycleRecord[] = a.money_laundering_cycles ?? [];
  const xlinks = a.cross_case_links ?? [];

  const jump = (t: DashTab) => {
    setTab(t);
    document.getElementById("analytics-dashboard")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {a.gds_warning && (
        <div className="form-message error flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{a.gds_warning}</span>
        </div>
      )}

      <section className="collision-panel" style={{ margin: 0 }}>
        <div className="panel-header">
          <div>
            <div className="section-code">03 // CENTRALITY SUMMARY</div>
            <h2>INFLUENCE &amp; INTERMEDIARIES</h2>
          </div>
          <span className="text-[9px] text-[#5e625c] font-mono">{engineTag(a)}</span>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {a.pagerank?.[0] && (
            <div className="p-2.5 border border-[rgba(200,200,186,0.15)] bg-[#121514] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-semibold text-[#c5bf55] font-mono flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Influence Ranking (PageRank)
                </span>
                <span className="font-mono text-[#c5bf55] font-bold text-[11px]">
                  {Number(a.pagerank[0].score).toFixed(4)}
                </span>
              </div>
              <p className="font-mono text-[#c8c8ba] text-xs truncate">
                {a.pagerank[0].identifier}
              </p>
            </div>
          )}

          {a.betweenness_centrality?.[0] && (
            <div className="p-2.5 border border-[rgba(200,200,186,0.15)] bg-[#121514] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-semibold text-[#859b7d] font-mono flex items-center gap-1">
                  <Network className="w-3 h-3" /> Network Intermediary (Betweenness)
                </span>
                <span className="font-mono text-[#859b7d] font-bold text-[11px]">
                  {Number(a.betweenness_centrality[0].score).toFixed(4)}
                </span>
              </div>
              <p className="font-mono text-[#c8c8ba] text-xs truncate">
                {a.betweenness_centrality[0].identifier}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
            <button
              onClick={() => jump("communities")}
              className="p-2 border border-[rgba(200,200,186,0.15)] bg-[#121514] text-left hover:border-[#c5bf55] transition"
            >
              <span className="text-[#5e625c] block text-[9px]">COMMUNITIES</span>
              <strong className="text-[#c8c8ba] text-xs">
                {Object.keys(communities).length}
              </strong>
            </button>
            <button
              onClick={() => jump("cycles")}
              className="p-2 border border-[rgba(200,200,186,0.15)] bg-[#121514] text-left hover:border-[#bd7470] transition"
            >
              <span className="text-[#5e625c] block text-[9px]">LAUNDERING LOOPS</span>
              <strong className="text-[#bd7470] text-xs">{cycles.length}</strong>
            </button>
          </div>
        </div>
      </section>

      <section id="analytics-dashboard" className="collision-panel">
        <div className="panel-header">
          <div>
            <div className="section-code">04 // ANALYTICS ENGINE</div>
            <h2>NETWORK INTELLIGENCE &amp; GRAPH ALGORITHMS</h2>
          </div>
          <span className="text-[9px] font-mono text-[#8a8d83]">{engineTag(a)}</span>
        </div>

        <div className="archive-nav" style={{ borderTop: "1px solid rgba(200,200,186,0.15)" }}>
          <button type="button" onClick={() => setTab("centrality")} className={tab === "centrality" ? "nav-active" : ""}>
            <TrendingUp size={12} />
            <span>CENTRALITY</span>
          </button>
          <button type="button" onClick={() => setTab("communities")} className={tab === "communities" ? "nav-active" : ""}>
            <Layers size={12} />
            <span>LOUVAIN COMMUNITIES ({Object.keys(communities).length})</span>
          </button>
          <button type="button" onClick={() => setTab("cycles")} className={tab === "cycles" ? "nav-active" : ""}>
            <Repeat size={12} />
            <span>LAUNDERING CYCLES ({cycles.length})</span>
          </button>
          <button type="button" onClick={() => setTab("cross_case")} className={tab === "cross_case" ? "nav-active" : ""}>
            <GitBranch size={12} />
            <span>CROSS-CASE LINKS ({xlinks.length})</span>
          </button>
        </div>

        <div className="p-5">
          {tab === "centrality" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RankColumn
                title="PageRank — Influence Ranking"
                blurb="Ranks nodes by incoming structural influence and asset flows."
                tag={a.analytics_engine === "networkx-local" ? "LOCAL: PageRank" : "GDS: PageRank"}
                tagColor="#c5bf55"
                icon={<TrendingUp className="w-3.5 h-3.5 text-[#c5bf55]" />}
                rows={a.pagerank ?? []}
              />
              <RankColumn
                title="Betweenness — Network Intermediaries"
                blurb="Identifies cutpoint bridges connecting otherwise disparate groups."
                tag={a.analytics_engine === "networkx-local" ? "LOCAL: Betweenness" : "GDS: Betweenness"}
                tagColor="#859b7d"
                icon={<Network className="w-3.5 h-3.5 text-[#859b7d]" />}
                rows={a.betweenness_centrality ?? []}
              />
            </div>
          )}

          {tab === "communities" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <p className="text-[11px] text-[#8a8d83]">
                  Modularity-based clustering detects operational cells and sub-syndicates across the network.
                </p>
                <span className="text-[10px] text-[#5e625c]">
                  Total Communities: {Object.keys(communities).length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(communities).map(([cid, members]: [string, CommunityMember[]]) => {
                  const counts = { suspects: 0, phones: 0, accounts: 0 };
                  members.forEach((m) => {
                    if (m.nodeType === "Suspect") counts.suspects += 1;
                    else if (m.nodeType === "Phone") counts.phones += 1;
                    else if (m.nodeType === "Account") counts.accounts += 1;
                  });
                  const hasCaseSuspect = members.some((m) => m.in_this_case);
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
                        <span className="text-[9px] font-mono text-[#8a8d83]">
                          {members.length} entities
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[#5e625c]">
                        {counts.suspects} suspects · {counts.phones} phones · {counts.accounts} accounts
                      </p>
                      <details>
                        <summary className="table-action inline-block cursor-pointer">
                          <span>VIEW MEMBERS</span>
                        </summary>
                        <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 mt-2">
                          {members.map((m, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between px-2 py-1 border text-xs font-mono ${
                                m.in_this_case
                                  ? "bg-[#181c1a] border-[rgba(200,200,186,0.25)]"
                                  : "bg-[#121514] border-[rgba(200,200,186,0.06)] text-[#5e625c]"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0">{nodeIcon(m.nodeType)}</span>
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
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "cycles" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <p className="text-[11px] text-[#8a8d83]">
                  Cycle detection flags closed fund-transfer loops (A &rarr; B &rarr; ... &rarr; A), indicating potential layering and round-tripping.
                </p>
                <span className="text-[10px] text-[#5e625c]">
                  Detected Rings: {cycles.length}
                </span>
              </div>

              {cycles.length === 0 ? (
                <div className="border border-[rgba(200,200,186,0.15)] bg-[#121514] p-8 text-center space-y-2">
                  <Repeat className="w-7 h-7 text-[#5e625c] mx-auto" />
                  <p className="text-xs font-medium text-[#c8c8ba] font-mono">NO CIRCULAR FUND TRANSFERS DETECTED</p>
                  <p className="text-[11px] text-[#5e625c] max-w-md mx-auto">
                    All bank transactions in this case follow linear disbursement patterns. No circular layering loops were discovered in the transaction graph.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cycles.map((cycle, idx) => (
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
                      </div>

                      <div className="overflow-x-auto py-2">
                        <div className="flex items-center gap-2 min-w-max">
                          {cycle.accounts.map((acc, ai) => {
                            const amount = cycle.amounts?.[ai];
                            const isLast = ai === cycle.accounts.length - 1;
                            return (
                              <React.Fragment key={ai}>
                                <div className="flex items-center gap-1.5 border border-[rgba(200,200,186,0.2)] bg-[#121514] px-2.5 py-1.5">
                                  <CreditCard className="w-3 h-3 text-[#859b7d] shrink-0" />
                                  <span className="font-mono text-xs text-[#c8c8ba]">{acc}</span>
                                </div>
                                {!isLast && (
                                  <div className="flex flex-col items-center px-1 font-mono">
                                    {amount !== undefined && amount !== null && (
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

          {tab === "cross_case" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <p className="text-[11px] text-[#8a8d83]">
                  Cross-case matching detects suspects or entities that appear across independent FIRs in the system.
                </p>
                <span className="text-[10px] text-[#5e625c]">
                  Linked Entities: {xlinks.length}
                </span>
              </div>

              {xlinks.length === 0 ? (
                <div className="border border-[rgba(200,200,186,0.15)] bg-[#121514] p-8 text-center space-y-2">
                  <GitBranch className="w-7 h-7 text-[#5e625c] mx-auto" />
                  <p className="text-xs font-medium text-[#c8c8ba] font-mono">NO CROSS-CASE OVERLAPS DETECTED</p>
                  <p className="text-[11px] text-[#5e625c] max-w-md mx-auto">
                    All suspects and entities in this case currently appear only in this case. No overlaps were found with other FIRs in the database.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {xlinks.map((link, idx) => (
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
                          {link.other_cases?.map((otherCase) => (
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
    </div>
  );
}
