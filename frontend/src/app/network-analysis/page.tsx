"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCaseGraph, getCases } from "@/api/client";
import type { CaseGraph, CaseSummary } from "@/api/types";
import CaseNetwork from "@/components/case/CaseNetwork";
import { EmptyState, ErrorState, FilterDropdown, LoadingState } from "@/components/ui";

// Central graph workspace (§11): accepts ?case=, ?entity= (focus/select)
// and ?focus= (comma-separated node ids to highlight a path) from Cases,
// Document Analysis, Criminal Search, Connection Finder and Alerts.
// Graph data is fetched from the backend on every load (§2).
function Workspace() {
  const search = useSearchParams();
  const router = useRouter();
  const caseParam = search.get("case") || "";
  const entityParam = search.get("entity");
  const focusParam = search.get("focus");

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [caseId, setCaseId] = useState(caseParam);
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCases()
      .then((d) => {
        setCases(d.cases || []);
        if (!caseParam && (d.cases || []).length > 0) {
          setCaseId(d.cases[0].case_id);
        }
      })
      .catch(() => undefined);
  }, [caseParam]);

  useEffect(() => {
    if (caseParam) setCaseId(caseParam);
  }, [caseParam]);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    getCaseGraph(caseId)
      .then(setGraph)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load graph.")
      )
      .finally(() => setLoading(false));
  }, [caseId]);

  const pick = (cid: string) => {
    setCaseId(cid);
    const params = new URLSearchParams(search.toString());
    params.set("case", cid);
    params.delete("entity");
    params.delete("focus");
    router.replace(`/network-analysis?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">Graph Workspace // Central Canvas</div>
          <h2>NETWORK ANALYSIS</h2>
          <p>
            Case graph loaded live from Neo4j. Arrive here from any module —
            the case, entity and path context travel in the URL.
          </p>
        </div>
        <div className="case-id-block">
          <span>Active Context</span>
          <b>{caseId || "—"}</b>
        </div>
      </section>

      <div className="filter-row">
        <FilterDropdown
          label="Case"
          value={caseId}
          options={cases.map((c) => ({ value: c.case_id, label: c.case_id }))}
          onChange={pick}
        />
        {focusParam && (
          <span className="text-[10px] font-mono text-[#c5bf55]">
            PATH FOCUS: {focusParam.split(",").length} NODES
          </span>
        )}
      </div>

      {error ? (
        <ErrorState text={error} onRetry={() => caseId && getCaseGraph(caseId).then(setGraph).catch(() => undefined)} />
      ) : !caseId ? (
        <LoadingState text="LOADING CASE REGISTER..." />
      ) : (
        <CaseNetwork
          caseId={caseId}
          graph={graph}
          loading={loading}
          preselectName={entityParam}
          highlightIds={focusParam ? focusParam.split(",").filter(Boolean) : null}
        />
      )}
      {!error && graph && graph.nodes.length === 0 && !loading && (
        <EmptyState
          title="NO GRAPH FOR THIS CASE"
          body="This case has no persisted entities yet."
          actionHref="/ingest"
          actionLabel="Go to Data Ingestion"
        />
      )}
    </div>
  );
}

export default function NetworkAnalysisPage() {
  return (
    <Suspense>
      <Workspace />
    </Suspense>
  );
}
