"use client";

import React, { useEffect, useState } from "react";
import { getBurnerPhones, getCaseAnalytics, getCaseGraph, getCases } from "@/api/client";
import type { CaseAnalytics, CaseGraph, CaseSummary } from "@/api/types";
import { EmptyState, ErrorState, FilterDropdown, LoadingState } from "@/components/ui";

const SECTIONS = [
  { id: "info", label: "Case Information" },
  { id: "entities", label: "Entities" },
  { id: "network", label: "Network Summary" },
  { id: "evidence", label: "Evidence" },
  { id: "analytics", label: "Analytics" },
  { id: "alerts", label: "Alerts" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function ReportsPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [caseId, setCaseId] = useState("");
  const [picked, setPicked] = useState<Record<SectionId, boolean>>({
    info: true,
    entities: true,
    network: true,
    evidence: true,
    analytics: true,
    alerts: true,
  });
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
  const [burners, setBurners] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getCases()
      .then((d) => {
        setCases(d.cases || []);
        if ((d.cases || []).length > 0) setCaseId(d.cases[0].case_id);
      })
      .catch(() => undefined);
  }, []);

  const generate = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    setReady(false);
    try {
      const [g, a, b] = await Promise.all([
        getCaseGraph(caseId),
        getCaseAnalytics(caseId).catch(() => null),
        getBurnerPhones(caseId).catch(() => ({ flagged_phones: [] as { phone_number: string }[] })),
      ]);
      setGraph(g);
      setAnalytics(a);
      setBurners((b.flagged_phones ?? []).map((f) => f.phone_number));
      setReady(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Report generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const exportHtml = () => {
    if (!graph) return;
    const rows = [
      picked.info && `<h2>Case Information</h2><p>${caseId}</p>`,
      picked.entities &&
        `<h2>Entities</h2><ul>${graph.nodes.map((n) => `<li>${n.label}: ${n.name}</li>`).join("")}</ul>`,
      picked.network &&
        `<h2>Network Summary</h2><p>${graph.node_count} nodes, ${graph.edge_count} relationships.</p>`,
      picked.evidence &&
        `<h2>Evidence</h2><ul>${graph.edges
          .filter((e) => e.type === "MENTIONS")
          .map((e) => `<li>${String(e.properties.source_sentence ?? "")}</li>`)
          .join("")}</ul>`,
      picked.analytics &&
        analytics &&
        `<h2>Analytics (${analytics.analytics_engine ?? "unknown engine"})</h2><p>Cycles: ${
          analytics.money_laundering_cycles?.length ?? 0
        }, cross-case links: ${analytics.cross_case_links?.length ?? 0}.</p>`,
      picked.alerts && `<h2>Alerts</h2><p>Burner phones: ${burners.join(", ") || "none"}.</p>`,
    ]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob(
      [`<html><head><title>Case Report ${caseId}</title></head><body><h1>CYBER HUNTERS — CASE REPORT ${caseId}</h1>${rows}</body></html>`],
      { type: "text/html" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${caseId}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">Case Dossier // Report Register</div>
          <h2>REPORTS</h2>
          <p>Assemble a case dossier from live data — preview, print or export. Only recorded data appears.</p>
        </div>
        <div className="case-id-block">
          <span>Dossier Case</span>
          <b>{caseId || "—"}</b>
        </div>
      </section>

      <div className="filter-row">
        <FilterDropdown
          label="Case"
          value={caseId}
          options={cases.map((c) => ({ value: c.case_id, label: c.case_id }))}
          onChange={setCaseId}
        />
      </div>

      <section className="collision-panel">
        <div className="panel-header">
          <div>
            <div className="section-code">Sections</div>
            <h2>SELECT SECTIONS</h2>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {SECTIONS.map((s) => (
            <label key={s.id} className="flex items-center gap-2 font-mono text-xs text-[#c8c8ba] cursor-pointer">
              <input
                type="checkbox"
                checked={picked[s.id]}
                onChange={() => setPicked({ ...picked, [s.id]: !picked[s.id] })}
              />
              {s.label}
            </label>
          ))}
        </div>
        <div className="p-4 pt-0 flex flex-wrap gap-2">
          <button className="commit-button" onClick={generate}>
            <span>GENERATE REPORT</span>
          </button>
          {ready && (
            <>
              <button className="table-action" onClick={() => window.print()}>
                <span>PRINT</span>
              </button>
              <button className="table-action" onClick={exportHtml}>
                <span>EXPORT HTML</span>
              </button>
            </>
          )}
        </div>
      </section>

      {loading ? (
        <LoadingState text="ASSEMBLING DOSSIER..." />
      ) : error ? (
        <ErrorState text={error} onRetry={generate} />
      ) : ready && graph ? (
        <section className="collision-panel">
          <div className="panel-header">
            <div>
              <div className="section-code">Preview // {caseId}</div>
              <h2>CASE DOSSIER PREVIEW</h2>
            </div>
          </div>
          <div className="p-4 space-y-4 text-xs font-mono text-[#c8c8ba]">
            {picked.info && (
              <div>
                <b className="text-[#c5bf55]">CASE INFORMATION</b>
                <p className="text-[#8a8d83] mt-1">{caseId}</p>
              </div>
            )}
            {picked.entities && (
              <div>
                <b className="text-[#c5bf55]">ENTITIES ({graph.nodes.length})</b>
                <ul className="mt-1 space-y-0.5 text-[#8a8d83]">
                  {graph.nodes.slice(0, 20).map((n) => (
                    <li key={n.id}>
                      {n.label}: {n.name}
                    </li>
                  ))}
                  {graph.nodes.length > 20 && <li>…and {graph.nodes.length - 20} more</li>}
                </ul>
              </div>
            )}
            {picked.network && (
              <div>
                <b className="text-[#c5bf55]">NETWORK SUMMARY</b>
                <p className="text-[#8a8d83] mt-1">
                  {graph.node_count} nodes, {graph.edge_count} relationships.
                </p>
              </div>
            )}
            {picked.evidence && (
              <div>
                <b className="text-[#c5bf55]">EVIDENCE</b>
                {graph.edges
                  .filter((e) => e.type === "MENTIONS")
                  .map((e) => (
                    <blockquote
                      key={e.id}
                      className="mt-1.5 text-[11px] text-[#8a8d83] italic border-l-2 border-[#b59858] pl-2.5"
                    >
                      &ldquo;{String(e.properties.source_sentence ?? "")}&rdquo;
                    </blockquote>
                  ))}
              </div>
            )}
            {picked.analytics && analytics && (
              <div>
                <b className="text-[#c5bf55]">ANALYTICS ({analytics.analytics_engine ?? "—"})</b>
                <p className="text-[#8a8d83] mt-1">
                  Cycles: {analytics.money_laundering_cycles?.length ?? 0} · Cross-case:{" "}
                  {analytics.cross_case_links?.length ?? 0} · Communities:{" "}
                  {Object.keys(analytics.louvain_communities ?? {}).length}
                </p>
              </div>
            )}
            {picked.alerts && (
              <div>
                <b className="text-[#c5bf55]">ALERTS</b>
                <p className="text-[#8a8d83] mt-1">
                  Burner phones: {burners.join(", ") || "none detected"}.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <EmptyState title="NO REPORT YET" body="Select a case and sections, then generate." />
      )}
    </div>
  );
}
