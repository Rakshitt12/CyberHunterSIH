"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";
import { getCases } from "@/api/client";
import type { CaseSummary } from "@/api/types";
import { EmptyState, ErrorState, LoadingState, SearchBar } from "@/components/ui";

function CaseCard({ c }: { c: CaseSummary }) {
  return (
    <div className="ledger-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="card-code">{c.case_id}</div>
          <h3 className="text-sm font-bold text-[#c8c8ba] font-mono mt-1">
            {c.description || c.case_id}
          </h3>
        </div>
        <span className="status-tag status-active">RECORDED</span>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link href={`/cases/${encodeURIComponent(c.case_id)}`} className="table-action">
          <span>Open Case</span>
        </Link>
        <Link
          href={`/network-analysis?case=${encodeURIComponent(c.case_id)}`}
          className="table-action"
        >
          <GitBranch size={11} />
          <span>View Network</span>
        </Link>
      </div>
    </div>
  );
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCases();
      setCases(data.cases || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = query.trim()
    ? cases.filter(
        (c) =>
          c.case_id.toLowerCase().includes(query.toLowerCase()) ||
          (c.description || "").toLowerCase().includes(query.toLowerCase())
      )
    : cases;

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">Case Repository // Master Register</div>
          <h2>ALL INGESTED CASES</h2>
          <p>
            Authoritative list of every case persisted in Neo4j — via FIR,
            CDR, bank ingestion or case upload. {cases.length} on record.
          </p>
        </div>
        <div className="case-id-block">
          <span>Repository Total</span>
          <b>{cases.length} CASES</b>
        </div>
      </section>

      <div className="filter-row">
        <div className="flex-1 min-w-[220px]">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={() => undefined}
            placeholder="FILTER BY CASE IDENTIFIER..."
          />
        </div>
        <Link href="/ingest" className="commit-button">
          <span>New Intake</span>
          <ArrowRight size={11} />
        </Link>
      </div>

      {loading ? (
        <LoadingState text="LOADING CASE REGISTER..." />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={cases.length === 0 ? "NO CASES INGESTED" : "NO MATCHES FOUND"}
          body={
            cases.length === 0
              ? "Ingest an FIR, CDR or bank record to open the first case file."
              : "No case matches the current filter."
          }
          actionHref="/ingest"
          actionLabel="Go to Data Ingestion"
        />
      ) : (
        <div className="evidence-grid">
          {filtered.map((c) => (
            <CaseCard key={c.case_id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
