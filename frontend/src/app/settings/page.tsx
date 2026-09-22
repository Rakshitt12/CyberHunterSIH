"use client";

import React, { useEffect, useState } from "react";
import { getHealth } from "@/api/client";
import type { HealthStatus } from "@/api/types";
import { ErrorState, LoadingState } from "@/components/ui";

// Settings (§32): functional only where meaningful. Backend/database
// status is live; graph preferences persist to this browser only
// (stated explicitly — no fake persistence claims).
const PREF_KEY = "cyberhunters.graphPrefs";

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({ showLabels: true, coseAnimation: true });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setHealth(await getHealth());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Backend unreachable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) setPrefs({ ...prefs, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePrefs = (next: typeof prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">Configuration // System Register</div>
          <h2>SETTINGS</h2>
          <p>Live backend status plus this workstation&apos;s display preferences.</p>
        </div>
      </section>

      <section className="collision-panel">
        <div className="panel-header">
          <div>
            <div className="section-code">Backend Status</div>
            <h2>SERVICE &amp; DATABASE</h2>
          </div>
          <button className="table-action" onClick={load}>
            <span>REFRESH</span>
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <LoadingState text="PROBING BACKEND..." />
          ) : error ? (
            <ErrorState text={error} onRetry={load} />
          ) : (
            health && (
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  ["SERVICE", `${health.service} — ${health.status.toUpperCase()}`],
                  ["GRAPH DATABASE", `NEO4J — ${health.database.toUpperCase()}`],
                  ["API ORIGIN", "SAME-ORIGIN VIA /api/* REWRITE"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between py-1 border-b border-[rgba(200,200,186,0.08)] last:border-0"
                  >
                    <span className="text-[#5e625c] text-[10px]">{k}</span>
                    <span className="text-[#c8c8ba] text-[11px] font-bold">{v}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      <section className="collision-panel">
        <div className="panel-header">
          <div>
            <div className="section-code">Graph Preferences</div>
            <h2>DISPLAY (THIS BROWSER ONLY)</h2>
          </div>
        </div>
        <div className="p-4 space-y-2 text-xs font-mono text-[#c8c8ba]">
          {(
            [
              ["showLabels", "Show entity labels on canvas"],
              ["coseAnimation", "Animate force-directed layout"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={() => savePrefs({ ...prefs, [key]: !prefs[key] })}
              />
              {label}
            </label>
          ))}
          <p className="text-[10px] text-[#5e625c]">
            Stored in this browser&apos;s local storage only — not synced to the server.
          </p>
        </div>
      </section>

      <section className="collision-panel">
        <div className="panel-header">
          <div>
            <div className="section-code">Application Information</div>
            <h2>CYBER HUNTERS</h2>
          </div>
        </div>
        <div className="p-4 text-[11px] font-mono text-[#8a8d83] space-y-1">
          <p>AI-powered criminal network analysis — SIH 2026.</p>
          <p>Backend: FastAPI + Neo4j (GDS with local NetworkX fallback).</p>
          <p>Evidence model: source sentences live on MENTIONS relationships.</p>
        </div>
      </section>
    </div>
  );
}
