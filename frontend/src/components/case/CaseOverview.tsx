"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type {
  BurnerPhone,
  CaseAnalytics,
  CaseGraph,
  CaseTimeline,
} from "@/api/types";

// Overview section (§7): compact summaries only — counts, top signals,
// recent activity. Full detail lives in the Network / Evidence /
// Analytics / Alerts tabs.
export default function CaseOverview({
  caseId,
  graph,
  analytics,
  burnerPhones,
  timeline,
  onGoTab,
}: {
  caseId: string;
  graph: CaseGraph | null;
  analytics: CaseAnalytics | null;
  burnerPhones: BurnerPhone[];
  timeline: CaseTimeline | null;
  onGoTab: (t: "network" | "evidence" | "analytics" | "alerts") => void;
}) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const byLabel: Record<string, number> = {};
  nodes.forEach((n) => {
    byLabel[n.label] = (byLabel[n.label] ?? 0) + 1;
  });
  const evidenceCount = edges.filter((e) => e.type === "MENTIONS").length;
  const cycles = analytics?.money_laundering_cycles ?? [];
  const xlinks = analytics?.cross_case_links ?? [];
  const alertTotal = burnerPhones.length + cycles.length + xlinks.length;
  const recent = (timeline?.events ?? []).slice(-3).reverse();

  const Stat = ({ k, v, tab }: { k: string; v: number; tab?: "network" | "evidence" | "analytics" | "alerts" }) => (
    <button
      onClick={() => tab && onGoTab(tab)}
      className="p-3 border border-[rgba(200,200,186,0.15)] bg-[#121514] text-left hover:border-[#c5bf55] transition"
    >
      <span className="text-[#5e625c] block text-[9px] font-mono uppercase">{k}</span>
      <strong className="text-[#c8c8ba] text-lg font-mono">{v}</strong>
    </button>
  );

  return (
    <div className="space-y-6">
      <section className="collision-panel">
        <div className="panel-header">
          <div>
            <div className="section-code">OVERVIEW // CASE FILE SUMMARY</div>
            <h2>{caseId}</h2>
          </div>
          <div className="panel-tools">
            <span>
              {analytics?.analytics_engine === "networkx-local"
                ? "ANALYTICS: LOCAL"
                : "ANALYTICS: NEO4J GDS"}
            </span>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
          <Stat k="Suspects" v={byLabel.Suspect ?? 0} tab="network" />
          <Stat k="Evidence Links" v={evidenceCount} tab="evidence" />
          <Stat k="Network Edges" v={edges.length} tab="network" />
          <Stat k="Active Alerts" v={alertTotal} tab="alerts" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="collision-panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div>
              <div className="section-code">ENTITY ROSTER</div>
              <h2>RECORDED ENTITIES</h2>
            </div>
          </div>
          <div className="p-4 space-y-1.5 text-xs font-mono">
            {["Suspect", "Phone", "Account", "Location"].map((l) => (
              <div key={l} className="flex justify-between py-1 border-b border-[rgba(200,200,186,0.08)] last:border-0">
                <span className="text-[#5e625c] text-[10px]">{l}s</span>
                <span className="text-[#c8c8ba] text-[11px] font-bold">{byLabel[l] ?? 0}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="collision-panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div>
              <div className="section-code">RECENT ACTIVITY</div>
              <h2>LATEST TIMESTAMPED EVENTS</h2>
            </div>
            <div className="panel-tools">
              <span>{timeline?.event_count ?? 0} EVENTS</span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {recent.length === 0 && (
              <p className="muted-copy">No timestamped calls or transfers in this case.</p>
            )}
            {recent.map((e, i) => (
              <div key={i} className="relation-bar">
                <span
                  className={`font-mono text-[10px] ${e.kind === "CALL" ? "text-[#bf8069]" : "text-[#859b7d]"}`}
                >
                  {e.kind}
                </span>
                <span className="font-mono text-xs text-[#c8c8ba]">{e.summary}</span>
                <span className="text-[10px] font-mono text-[#5e625c]">{e.at}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="table-action" onClick={() => onGoTab("network")}>
          <span>Open Network</span>
          <ArrowRight size={11} />
        </button>
        <Link href={`/network-analysis?case=${encodeURIComponent(caseId)}`} className="table-action">
          <span>Full Workspace</span>
        </Link>
      </div>
    </div>
  );
}
