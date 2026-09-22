"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { getCaseTimeline, getCases } from "@/api/client";
import type { CaseSummary, CaseTimeline } from "@/api/types";
import { EmptyState, ErrorState, FilterDropdown, LoadingState } from "@/components/ui";

function TimelineView() {
  const params = useSearchParams();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [caseId, setCaseId] = useState(params.get("case") || "");
  const [data, setData] = useState<CaseTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCases()
      .then((d) => {
        setCases(d.cases || []);
        if (!params.get("case") && (d.cases || []).length > 0) {
          setCaseId(d.cases[0].case_id);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    getCaseTimeline(caseId)
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load timeline.")
      )
      .finally(() => setLoading(false));
  }, [caseId]);

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">Chronology // Location Register</div>
          <h2>TIMELINE &amp; LOCATION</h2>
          <p>
            Events derive strictly from timestamped calls and transfers in the
            database. Locations come from recorded LOCATED_AT links — no
            fabricated coordinates.
          </p>
        </div>
        <div className="case-id-block">
          <span>Events</span>
          <b>{data ? `${data.event_count} LOGGED` : "—"}</b>
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

      {loading ? (
        <LoadingState text="ASSEMBLING CHRONOLOGY..." />
      ) : error ? (
        <ErrorState text={error} />
      ) : !data || data.events.length === 0 ? (
        <EmptyState title="NO TIMESTAMPED EVENTS" body="This case has no calls or transfers with recorded timestamps." />
      ) : (
        <section className="collision-panel">
          <div className="panel-header">
            <div>
              <div className="section-code">Chronology // {caseId}</div>
              <h2>EVENT SEQUENCE</h2>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {data.events.map((e, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 p-2.5 border border-[rgba(200,200,186,0.12)] bg-[#121514]">
                <span className="font-mono text-[10px] text-[#5e625c] w-28 shrink-0">{e.at}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 border shrink-0 ${
                    e.kind === "CALL"
                      ? "border-[#bf8069]/50 text-[#bf8069]"
                      : "border-[#859b7d]/50 text-[#859b7d]"
                  }`}
                >
                  {e.kind}
                </span>
                <span className="font-mono text-xs text-[#c8c8ba]">{e.summary}</span>
                <span className="text-[10px] font-mono text-[#5e625c]">
                  {e.kind === "CALL"
                    ? `${e.details.duration ?? ""}s`
                    : `₹${Number(e.details.amount ?? 0).toLocaleString("en-IN")}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data && data.locations.length > 0 && (
        <section className="collision-panel">
          <div className="panel-header">
            <div>
              <div className="section-code">Locations // {caseId}</div>
              <h2>RECORDED LOCATIONS</h2>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.locations.map((l, i) => (
              <div key={i} className="p-3 border border-[rgba(200,200,186,0.15)] bg-[#121514]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#b59858]" />
                  <span className="font-mono text-xs font-bold text-[#c8c8ba]">{l.location}</span>
                </div>
                <p className="text-[10px] font-mono text-[#5e625c] mt-1">
                  Associated: {l.suspect}
                  {l.region ? ` · ${l.region}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function TimelineLocationPage() {
  return (
    <Suspense>
      <TimelineView />
    </Suspense>
  );
}
