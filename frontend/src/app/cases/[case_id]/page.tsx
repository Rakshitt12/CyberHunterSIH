"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  getBurnerPhones,
  getCaseAnalytics,
  getCaseGraph,
  getCaseTimeline,
} from "@/api/client";
import type {
  BurnerPhone,
  CaseAnalytics,
  CaseGraph,
  CaseTimeline,
} from "@/api/types";
import CaseHeader from "@/components/case/CaseHeader";
import CaseOverview from "@/components/case/CaseOverview";
import CaseNetwork from "@/components/case/CaseNetwork";
import CaseEvidence from "@/components/case/CaseEvidence";
import CaseAnalyticsView from "@/components/case/CaseAnalytics";
import CaseAlerts from "@/components/case/CaseAlerts";
import { ErrorState } from "@/components/ui";

type Tab = "overview" | "network" | "evidence" | "analytics" | "alerts";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "network", label: "NETWORK" },
  { id: "evidence", label: "EVIDENCE" },
  { id: "analytics", label: "ANALYTICS" },
  { id: "alerts", label: "ALERTS" },
];

// Case workspace (§7/24): tabbed shell with URL-driven tabs (?tab=) so
// refresh, deep links and cross-module navigation all restore state.
// All data is re-fetched from Neo4j on every mount — the database is the
// source of truth, never temporary React state (§2).
function Workspace() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const caseId = (params?.case_id as string) || "";
  const entityParam = search.get("entity");

  const tabParam = search.get("tab");
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : "overview";
  const [dashTab, setDashTab] = useState<"centrality" | "communities" | "cycles" | "cross_case">(
    "centrality"
  );

  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null);
  const [burners, setBurners] = useState<BurnerPhone[]>([]);
  const [timeline, setTimeline] = useState<CaseTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const [g, a, b, t] = await Promise.all([
        getCaseGraph(caseId),
        getCaseAnalytics(caseId).catch(() => null),
        getBurnerPhones(caseId).catch(() => ({ flagged_phones: [] as BurnerPhone[] })),
        getCaseTimeline(caseId).catch(() => null),
      ]);
      setGraph(g);
      setAnalytics(a);
      setBurners(b.flagged_phones ?? a?.burner_phones ?? []);
      setTimeline(t);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load case data.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const goTab = (t: Tab) => {
    const params = new URLSearchParams(search.toString());
    params.set("tab", t);
    router.replace(`/cases/${encodeURIComponent(caseId)}?${params.toString()}`, { scroll: false });
  };

  const viewAnalytics = (d: "centrality" | "communities" | "cycles" | "cross_case") => {
    setDashTab(d);
    goTab("analytics");
    requestAnimationFrame(() => {
      document.getElementById("analytics-dashboard")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <div className="space-y-6">
      <CaseHeader
        caseId={caseId}
        graph={graph}
        analytics={analytics}
        burnerPhones={burners}
        onViewAnalytics={viewAnalytics}
      />

      {error && <ErrorState text={error} onRetry={load} />}

      <div className="archive-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => goTab(t.id)}
            className={tab === t.id ? "nav-active" : ""}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {loading && !graph ? (
        <div className="empty-state">
          <Loader2 size={22} className="animate-spin" />
          <b>LOADING CASE DATA...</b>
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <CaseOverview
              caseId={caseId}
              graph={graph}
              analytics={analytics}
              burnerPhones={burners}
              timeline={timeline}
              onGoTab={goTab}
            />
          )}
          {tab === "network" && (
            <CaseNetwork caseId={caseId} graph={graph} loading={loading} preselectName={entityParam} />
          )}
          {tab === "evidence" && <CaseEvidence caseId={caseId} graph={graph} />}
          {tab === "analytics" && <CaseAnalyticsView analytics={analytics} initialTab={dashTab} />}
          {tab === "alerts" && (
            <CaseAlerts caseId={caseId} analytics={analytics} burnerPhones={burners} />
          )}
        </>
      )}
    </div>
  );
}

export default function CaseWorkspacePage() {
  return (
    <Suspense>
      <Workspace />
    </Suspense>
  );
}
