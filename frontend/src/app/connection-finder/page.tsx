"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, GitBranch, Unplug } from "lucide-react";
import { findPath } from "@/api/client";
import type { PathResult } from "@/api/types";
import { nodeIcon } from "@/components/inspectors";
import { EmptyState, ErrorState, FilterDropdown, LoadingState } from "@/components/ui";

const TYPES = [
  { value: "suspect", label: "SUSPECT" },
  { value: "phone", label: "PHONE" },
  { value: "account", label: "ACCOUNT" },
  { value: "location", label: "LOCATION" },
];

function EntityField({
  title,
  type,
  setType,
  id,
  setId,
}: {
  title: string;
  type: string;
  setType: (v: string) => void;
  id: string;
  setId: (v: string) => void;
}) {
  return (
    <div className="intake-panel space-y-3">
      <div className="section-code">{title}</div>
      <FilterDropdown label="Type" value={type} options={TYPES} onChange={setType} />
      <input
        className="dotted-input w-full"
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder="EXACT IDENTIFIER (NAME / NUMBER...)"
      />
    </div>
  );
}

export default function ConnectionFinderPage() {
  const [fromType, setFromType] = useState("suspect");
  const [fromId, setFromId] = useState("");
  const [toType, setToType] = useState("suspect");
  const [toId, setToId] = useState("");
  const [result, setResult] = useState<PathResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!fromId.trim() || !toId.trim()) {
      setError("Both entity identifiers are required.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await findPath(fromType, fromId.trim(), toType, toId.trim()));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Path search failed.");
    } finally {
      setLoading(false);
    }
  };

  const edgeCase =
    result?.found
      ? (result.edges ?? [])
          .map((e) => e.properties.case_id)
          .find((c): c is string => typeof c === "string" && c.length > 0)
      : undefined;
  const focusIds = result?.found ? (result.nodes ?? []).map((n) => n.id).join(",") : "";

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">Traversal // Shortest-Path Register</div>
          <h2>CONNECTION FINDER</h2>
          <p>
            Test whether two entities connect through the persisted graph.
            Only real Neo4j paths are reported — never invented.
          </p>
        </div>
        <div className="case-id-block">
          <span>Result</span>
          <b>{result ? (result.found ? `${result.hop_count} HOPS` : "NO PATH") : "—"}</b>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EntityField title="Entity A" type={fromType} setType={setFromType} id={fromId} setId={setFromId} />
        <EntityField title="Entity B" type={toType} setType={setToType} id={toId} setId={setToId} />
      </div>
      <button className="commit-button" onClick={run}>
        <GitBranch size={12} />
        <span>FIND CONNECTION</span>
      </button>

      {loading ? (
        <LoadingState text="TRAVERSING GRAPH..." />
      ) : error ? (
        <ErrorState text={error} onRetry={run} />
      ) : result && !result.found ? (
        <div className="collision-panel p-8 text-center space-y-2">
          <Unplug className="w-7 h-7 text-[#5e625c] mx-auto" />
          <p className="text-xs font-medium text-[#c8c8ba] font-mono">NO CONNECTION FOUND</p>
          <p className="text-[11px] text-[#5e625c] max-w-md mx-auto">{result.message}</p>
        </div>
      ) : result?.found ? (
        <section className="collision-panel">
          <div className="panel-header">
            <div>
              <div className="section-code">Connection Found // {result.hop_count} hops</div>
              <h2>
                {result.from.identifier} → {result.to.identifier}
              </h2>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {(result.nodes ?? []).map((n, i) => (
              <div key={n.id}>
                <div className="flex items-center gap-2 p-2.5 border border-[rgba(200,200,186,0.2)] bg-[#121514]">
                  <span className="p-1 border border-[rgba(200,200,186,0.15)]">{nodeIcon(n.label)}</span>
                  <div>
                    <div className="font-mono text-xs font-bold text-[#c8c8ba]">{n.name}</div>
                    <div className="text-[9px] font-mono text-[#5e625c]">{n.label}</div>
                  </div>
                </div>
                {i < (result.edges ?? []).length && (
                  <div className="flex items-center gap-2 pl-6 py-1 text-[10px] font-mono text-[#c5bf55]">
                    <span className="border-l-2 border-[#b59858] pl-2">
                      ── {result.edges![i].type} ──↓
                    </span>
                  </div>
                )}
              </div>
            ))}
            {edgeCase && (
              <div className="pt-2">
                <Link
                  href={`/network-analysis?case=${encodeURIComponent(edgeCase)}&focus=${encodeURIComponent(focusIds)}`}
                  className="table-action"
                >
                  <span>View Graph</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </div>
        </section>
      ) : (
        <EmptyState title="NO QUERY YET" body="Choose two entities and run the traversal." />
      )}
    </div>
  );
}
