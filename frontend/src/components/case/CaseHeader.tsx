"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Flame,
  GitBranch,
  PhoneCall,
  Repeat,
} from "lucide-react";
import type { BurnerPhone, CaseAnalytics, CaseGraph } from "@/api/types";

export function engineLabel(a: CaseAnalytics | null): string {
  if (!a) return "ANALYTICS: PENDING";
  return a.analytics_engine === "networkx-local"
    ? "ANALYTICS: LOCAL (NETWORKX + LOUVAIN)"
    : "ANALYTICS: NEO4J GDS";
}

export default function CaseHeader({
  caseId,
  graph,
  analytics,
  burnerPhones,
  onViewAnalytics,
}: {
  caseId: string;
  graph: CaseGraph | null;
  analytics: CaseAnalytics | null;
  burnerPhones: BurnerPhone[];
  onViewAnalytics: (tab: "centrality" | "communities" | "cycles" | "cross_case") => void;
}) {
  const xlinks = analytics?.cross_case_links ?? [];
  const cycles = analytics?.money_laundering_cycles ?? [];

  return (
    <>
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

      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[rgba(200,200,186,0.15)]">
        <div className="flex items-center gap-3">
          <Link
            href="/cases"
            className="table-action flex items-center gap-1.5"
            title="Return to case repository"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>CASE INDEX</span>
          </Link>
          <span className="text-[10px] font-mono text-[#8a8d83]">
            NEO4J — CONNECTED // {engineLabel(analytics)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 border border-[rgba(200,200,186,0.2)] bg-[#121514] text-[#8a8d83]">
            NODES: <strong className="text-[#c8c8ba]">{graph?.node_count ?? 0}</strong>
          </span>
          <span className="px-2.5 py-1 border border-[rgba(200,200,186,0.2)] bg-[#121514] text-[#8a8d83]">
            RELATIONSHIPS: <strong className="text-[#c8c8ba]">{graph?.edge_count ?? 0}</strong>
          </span>
          {xlinks.length > 0 && (
            <span className="px-2.5 py-1 border border-[#b59858]/50 bg-[#b59858]/10 text-[#c5bf55] flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span>{xlinks.length} CROSS-CASE</span>
            </span>
          )}
          {burnerPhones.length > 0 && (
            <span className="px-2.5 py-1 border border-[#8d3d3c]/50 bg-[#8d3d3c]/10 text-[#bd7470] flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>{burnerPhones.length} BURNER PHONE</span>
            </span>
          )}
          {cycles.length > 0 && (
            <span className="px-2.5 py-1 border border-[#8d3d3c]/50 bg-[#8d3d3c]/10 text-[#bd7470] flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              <span>{cycles.length} CYCLE(S)</span>
            </span>
          )}
        </div>
      </div>

      {xlinks.length > 0 && (
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
                    {xlinks.length} CONNECTED SUSPECT(S)
                  </span>
                </div>
                <p className="text-[11px] text-[#8a8d83] mt-0.5">
                  Suspects in this case are also present in other independent FIRs in the intelligence database.
                </p>
              </div>
            </div>

            <button
              onClick={() => onViewAnalytics("cross_case")}
              className="table-action flex items-center gap-1.5 text-[10px]"
            >
              <span>VIEW FULL CROSS-CASE GRAPH</span>
              <ArrowRight className="w-3 h-3 text-[#c5bf55]" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {xlinks.map((link, idx) => (
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
                    {link.other_cases?.map((otherCase) => (
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

      {burnerPhones.length > 0 && (
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
                    {burnerPhones.length} FLAGGED
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
            {burnerPhones.map((bp, idx) => (
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
    </>
  );
}
