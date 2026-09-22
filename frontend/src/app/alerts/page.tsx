"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, GitBranch, Repeat } from "lucide-react";
import { getAlerts } from "@/api/client";
import type { AlertItem } from "@/api/types";
import { EmptyState, ErrorState, FilterDropdown, LoadingState } from "@/components/ui";

function AlertCard({ a }: { a: AlertItem }) {
  const Icon = a.alert_type === "BURNER" ? Flame : a.alert_type === "CYCLE" ? Repeat : GitBranch;
  const tone =
    a.severity === "HIGH" ? "border-[#8d3d3c] text-[#bd7470]" : "border-[#b59858] text-[#c5bf55]";
  return (
    <div className={`ledger-card p-4 space-y-2 border ${tone.split(" ")[0]}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${tone.split(" ")[1]}`} />
          <h3 className="text-xs font-bold font-mono text-[#c8c8ba]">
            {a.alert_type.replace("_", " ")} — {a.entity}
          </h3>
        </div>
        <span className={`px-1.5 py-0.2 border text-[9px] font-mono ${tone}`}>
          {a.severity}
        </span>
      </div>
      <p className="text-[11px] text-[#8a8d83]">{a.reason}</p>
      {a.case_id && (
        <p className="text-[10px] font-mono text-[#5e625c]">
          Case: <strong className="text-[#c8c8ba]">{a.case_id}</strong>
        </p>
      )}
      {a.case_id && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/cases/${encodeURIComponent(a.case_id)}?tab=alerts`} className="table-action">
            <span>View Case</span>
          </Link>
          <Link
            href={`/network-analysis?case=${encodeURIComponent(a.case_id)}`}
            className="table-action"
          >
            <span>View Graph</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAlerts(filter || undefined);
      setAlerts(data.alerts || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load alerts.");
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
          <div className="section-code">Central Alert Register // Rule Detections</div>
          <h2>ALERTS</h2>
          <p>
            Burner phones, laundering cycles and cross-case matches aggregated
            from live backend detections. Counts are computed, never hardcoded.
          </p>
        </div>
        <div className="case-id-block">
          <span>Active</span>
          <b>{alerts.length} ALERTS</b>
        </div>
      </section>

      <div className="filter-row">
        <FilterDropdown
          label="Type"
          value={filter}
          options={[
            { value: "", label: "ALL" },
            { value: "BURNER", label: "BURNER PHONE" },
            { value: "CROSS_CASE", label: "CROSS-CASE" },
            { value: "CYCLE", label: "CYCLE" },
          ]}
          onChange={setFilter}
        />
        <button className="table-action" onClick={load}>
          <span>APPLY</span>
        </button>
      </div>

      {loading ? (
        <LoadingState text="AGGREGATING ALERTS..." />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : alerts.length === 0 ? (
        <EmptyState title="NO ALERTS" body="No detections match the current filter." />
      ) : (
        <div className="evidence-grid">
          {alerts.map((a, i) => (
            <AlertCard key={`${a.alert_type}-${a.entity}-${i}`} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
