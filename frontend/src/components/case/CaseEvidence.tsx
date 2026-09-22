"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { EmptyState, SectionHeader } from "@/components/ui";
import type { CaseGraph } from "@/api/types";

// Evidence section (§15): DIRECT source evidence (MENTIONS.source_sentence
// per suspect for THIS case) separated from RELATED evidence (call /
// transfer records tagged to the case). Never implies nodes without
// sentences have direct evidence.
export default function CaseEvidence({
  caseId,
  graph,
}: {
  caseId: string;
  graph: CaseGraph | null;
}) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const nameById = new Map(nodes.map((n) => [n.id, n.name] as const));

  const mentions = edges.filter((e) => e.type === "MENTIONS");
  const calls = edges.filter((e) => e.type === "CALLED");
  const transfers = edges.filter((e) => e.type === "TRANSFERRED");

  if (!graph || (mentions.length === 0 && calls.length === 0 && transfers.length === 0)) {
    return (
      <EmptyState
        title="NO EVIDENCE RECORDED"
        body="Confirm extracted entities or import CDR / bank records to attach evidence to this case."
        actionHref="/ingest"
        actionLabel="Go to Data Ingestion"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="collision-panel">
        <SectionHeader
          code="EVIDENCE // DIRECT SOURCE"
          title={`VERIFIED STATEMENTS — ${mentions.length}`}
          right={<span>{caseId}</span>}
        />
        <div className="p-4 space-y-3">
          {mentions.length === 0 && (
            <p className="muted-copy">No direct source sentences for this case.</p>
          )}
          {mentions.map((e) => (
            <div key={e.id} className="p-3 border border-[#b59858]/50 bg-[#b59858]/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#c5bf55] text-[10px] font-semibold uppercase tracking-wider font-mono">
                <Shield className="w-3.5 h-3.5" />
                <span>Direct evidence — {nameById.get(e.target) ?? "Suspect"}</span>
              </div>
              <blockquote style={{ margin: "8px 0", padding: "8px 10px", borderColor: "#b59858" }}>
                &ldquo;{String(e.properties.source_sentence ?? "")}&rdquo;
              </blockquote>
            </div>
          ))}
        </div>
      </section>

      <section className="collision-panel">
        <SectionHeader
          code="EVIDENCE // RELATED RECORDS"
          title={`CALLS & TRANSFERS — ${calls.length + transfers.length}`}
        />
        <div className="p-4 space-y-2">
          {calls.length === 0 && transfers.length === 0 && (
            <p className="muted-copy">No call or transfer records tagged to this case.</p>
          )}
          {calls.map((e) => (
            <div key={e.id} className="relation-bar">
              <span className="text-[#bf8069] font-mono text-[10px]">CALL</span>
              <span className="font-mono text-xs text-[#c8c8ba]">
                {nameById.get(e.source)} → {nameById.get(e.target)}
              </span>
              <span className="text-[10px] font-mono text-[#5e625c]">
                {String(e.properties.timestamp ?? "")} · {String(e.properties.duration ?? "")}s
              </span>
            </div>
          ))}
          {transfers.map((e) => (
            <div key={e.id} className="relation-bar">
              <span className="text-[#859b7d] font-mono text-[10px]">TRANSFER</span>
              <span className="font-mono text-xs text-[#c8c8ba]">
                {nameById.get(e.source)} → {nameById.get(e.target)}
              </span>
              <span className="text-[10px] font-mono text-[#5e625c]">
                ₹{Number(e.properties.amount ?? 0).toLocaleString("en-IN")} · {String(e.properties.date ?? "")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/network-analysis?case=${encodeURIComponent(caseId)}`} className="table-action">
          <span>View Network</span>
          <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
