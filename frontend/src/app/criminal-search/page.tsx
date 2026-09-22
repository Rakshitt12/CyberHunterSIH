"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, GitBranch } from "lucide-react";
import { searchEntities } from "@/api/client";
import type { SearchHit } from "@/api/types";
import { nodeIcon } from "@/components/inspectors";
import { EmptyState, ErrorState, FilterDropdown, LoadingState, SearchBar } from "@/components/ui";

function HitCard({ hit }: { hit: SearchHit }) {
  const primaryCase = hit.cases[0];
  return (
    <div className="ledger-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 border border-[rgba(200,200,186,0.2)] shrink-0">
            {nodeIcon(
              hit.entity_type === "suspect"
                ? "Suspect"
                : hit.entity_type === "phone"
                  ? "Phone"
                  : hit.entity_type === "account"
                    ? "Account"
                    : hit.entity_type === "location"
                      ? "Location"
                      : "Case"
            )}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#c8c8ba] font-mono truncate">
              {hit.identifier}
            </h3>
            {hit.alias && (
              <p className="text-[10px] font-mono text-[#8a8d83]">alias: {hit.alias}</p>
            )}
          </div>
        </div>
        <span className="status-tag status-active shrink-0">{hit.entity_type.toUpperCase()}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {hit.matched_by.map((m) => (
          <span
            key={m}
            className="px-1.5 py-0.2 text-[8px] border border-[#c5bf55]/40 text-[#c5bf55] font-mono"
          >
            MATCHED BY: {m}
          </span>
        ))}
      </div>

      <p className="text-[11px] font-mono text-[#8a8d83]">
        Cases:{" "}
        {hit.cases.length > 0 ? (
          <strong className="text-[#c8c8ba]">{hit.cases.join(", ")}</strong>
        ) : (
          "—"
        )}
      </p>
      {(hit.owners?.length ?? 0) > 0 && (
        <p className="text-[10px] font-mono text-[#5e625c]">
          Linked persons: {hit.owners!.join(", ")}
        </p>
      )}

      {primaryCase && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/cases/${encodeURIComponent(primaryCase)}`} className="table-action">
            <span>View Case</span>
          </Link>
          <Link
            href={`/network-analysis?case=${encodeURIComponent(primaryCase)}&entity=${encodeURIComponent(hit.identifier)}`}
            className="table-action"
          >
            <GitBranch size={11} />
            <span>View Graph</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}

function SearchView() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [entityType, setEntityType] = useState(params.get("type") || "");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (q.trim().length < 2) {
      setError("Enter at least 2 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchEntities(q.trim(), entityType || undefined);
      setResults(data.results || []);
      setSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">Investigation Search // Person & Entity Register</div>
          <h2>CRIMINAL SEARCH</h2>
          <p>
            Database-backed search across suspects, aliases, phones, accounts,
            locations and case IDs. Partial matching supported.
          </p>
        </div>
        <div className="case-id-block">
          <span>Results</span>
          <b>{searched ? `${results.length} HITS` : "—"}</b>
        </div>
      </section>

      <div className="filter-row">
        <div className="flex-1 min-w-[220px]">
          <SearchBar value={q} onChange={setQ} onSubmit={run} placeholder="SEARCH NAME, ALIAS, PHONE, ACCOUNT, LOCATION, CASE..." />
        </div>
        <FilterDropdown
          label="Type"
          value={entityType}
          options={[
            { value: "", label: "ALL TYPES" },
            { value: "suspect", label: "SUSPECT" },
            { value: "phone", label: "PHONE" },
            { value: "account", label: "ACCOUNT" },
            { value: "location", label: "LOCATION" },
            { value: "case", label: "CASE" },
          ]}
          onChange={setEntityType}
        />
      </div>

      {loading ? (
        <LoadingState text="QUERYING NEO4J REGISTER..." />
      ) : error ? (
        <ErrorState text={error} onRetry={run} />
      ) : !searched ? (
        <EmptyState title="NO SEARCH YET" body="Enter a name, number, account, location or case ID above." />
      ) : results.length === 0 ? (
        <EmptyState title="NO MATCHES FOUND" body="No record in the database matches this query." />
      ) : (
        <div className="evidence-grid">
          {results.map((h, i) => (
            <HitCard key={`${h.entity_type}-${h.identifier}-${i}`} hit={h} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CriminalSearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
