"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";
import { getCrossCase } from "@/api/client";
import type { CrossCaseConnection } from "@/api/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";

export default function CrossCaseIntelPage() {
  const [conns, setConns] = useState<CrossCaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCrossCase();
      setConns(data.connections || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load cross-case intel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">Jurisdiction Overlap // Shared-Entity Register</div>
          <h2>CROSS-CASE INTEL</h2>
          <p>
            Entities appearing in more than one case — shared suspects, phones
            and accounts, exactly as the database links them.
          </p>
        </div>
        <div className="case-id-block">
          <span>Connections</span>
          <b>{conns.length} FOUND</b>
        </div>
      </section>

      {loading ? (
        <LoadingState text="SCANNING FOR OVERLAPS..." />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : conns.length === 0 ? (
        <EmptyState title="NO CROSS-CASE CONNECTIONS" body="No entity currently spans multiple cases." />
      ) : (
        <div className="evidence-grid">
          {conns.map((c, i) => (
            <div key={i} className="ledger-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-[#c5bf55]" />
                <h3 className="text-sm font-bold text-[#c8c8ba] font-mono">{c.identifier}</h3>
                <span className="status-tag status-active">{c.entityType.toUpperCase()}</span>
              </div>
              <p className="text-[11px] font-mono text-[#8a8d83]">
                Found in: <strong className="text-[#c8c8ba]">{c.linked_cases.join(", ")}</strong>
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {c.linked_cases.map((cid) => (
                  <Link key={cid} href={`/cases/${encodeURIComponent(cid)}`} className="table-action">
                    <span>View Case</span>
                  </Link>
                ))}
                <Link
                  href={`/network-analysis?case=${encodeURIComponent(c.linked_cases[0])}&entity=${encodeURIComponent(c.identifier)}`}
                  className="table-action"
                >
                  <span>View Graph</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
