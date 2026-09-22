"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, GitBranch } from "lucide-react";
import { getDocuments } from "@/api/client";
import type { DocumentEntry } from "@/api/types";
import { EmptyState, ErrorState, FilterDropdown, LoadingState, SearchBar } from "@/components/ui";

function DocCard({ doc }: { doc: DocumentEntry }) {
  const [showSentences, setShowSentences] = useState(false);
  return (
    <div className="ledger-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 border border-[rgba(200,200,186,0.2)] shrink-0">
            <FileText className="w-3.5 h-3.5 text-[#8a8d83]" />
          </span>
          <div className="min-w-0">
            <div className="card-code">{doc.case_id}</div>
            <h3 className="text-sm font-bold text-[#c8c8ba] font-mono truncate">
              {doc.description || doc.case_id}
            </h3>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {doc.doc_types.map((t) => (
            <span key={t} className="status-tag status-active">
              {t}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[11px] font-mono text-[#8a8d83]">
        Extracted: {doc.suspect_count} suspects · {doc.phone_count} phones ·{" "}
        {doc.account_count} accounts · {doc.call_count} calls · {doc.transfer_count} transfers
      </p>

      {doc.evidence_sentences.length > 0 && (
        <button className="table-action" onClick={() => setShowSentences(!showSentences)}>
          <span>
            {showSentences ? "HIDE ENTITIES" : `VIEW ENTITIES (${doc.evidence_sentences.length})`}
          </span>
        </button>
      )}
      {showSentences && (
        <div className="space-y-1.5">
          {doc.evidence_sentences.map((s, i) => (
            <blockquote
              key={i}
              className="text-[11px] text-[#8a8d83] italic border-l-2 border-[#b59858] pl-2.5 leading-relaxed"
            >
              &ldquo;{s}&rdquo;
            </blockquote>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link href={`/cases/${encodeURIComponent(doc.case_id)}?tab=evidence`} className="table-action">
          <span>View Evidence</span>
        </Link>
        <Link
          href={`/network-analysis?case=${encodeURIComponent(doc.case_id)}`}
          className="table-action"
        >
          <GitBranch size={11} />
          <span>View Graph</span>
          <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}

export default function DocumentAnalysisPage() {
  const [docs, setDocs] = useState<DocumentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [cases, setCases] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDocuments({
        q: q.trim() || undefined,
        case_id: caseFilter || undefined,
        doc_type: typeFilter || undefined,
      });
      setDocs(data.documents || []);
      setCases((prev) => {
        const ids = Array.from(new Set((data.documents || []).map((d) => d.case_id)));
        return Array.from(new Set([...prev, ...ids]));
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">Evidence Register // Document Index</div>
          <h2>DOCUMENT ANALYSIS</h2>
          <p>
            Every case carrying persisted evidence is one document entry — FIR
            statements, call records and bank transactions.
          </p>
        </div>
        <div className="case-id-block">
          <span>Documents</span>
          <b>{docs.length} ON FILE</b>
        </div>
      </section>

      <div className="filter-row">
        <div className="flex-1 min-w-[220px]">
          <SearchBar value={q} onChange={setQ} onSubmit={load} placeholder="SEARCH CASE ID OR EVIDENCE TEXT..." />
        </div>
        <FilterDropdown
          label="Case"
          value={caseFilter}
          options={[{ value: "", label: "ALL CASES" }, ...cases.map((c) => ({ value: c, label: c }))]}
          onChange={(v) => {
            setCaseFilter(v);
          }}
        />
        <FilterDropdown
          label="Type"
          value={typeFilter}
          options={[
            { value: "", label: "ALL TYPES" },
            { value: "FIR", label: "FIR" },
            { value: "CDR", label: "CDR" },
            { value: "BANK", label: "BANK" },
          ]}
          onChange={(v) => {
            setTypeFilter(v);
          }}
        />
        <button className="table-action" onClick={load}>
          <span>APPLY</span>
        </button>
      </div>

      {loading ? (
        <LoadingState text="LOADING DOCUMENT REGISTER..." />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : docs.length === 0 ? (
        <EmptyState title="NO DOCUMENTS FOUND" body="No evidence matches the current filters." />
      ) : (
        <div className="evidence-grid">
          {docs.map((d) => (
            <DocCard key={d.case_id} doc={d} />
          ))}
        </div>
      )}
    </div>
  );
}
