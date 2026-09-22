"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/config";
import {
  FolderOpen,
  ShieldCheck,
  Upload,
  Search,
  ArrowRight,
  AlertTriangle,
  FileSearch,
  ChevronRight,
  GitBranch,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface CaseSummary {
  case_id: string;
  description: string | null;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/cases`);
      if (!res.ok) {
        throw new Error(`Failed to fetch cases (HTTP ${res.status})`);
      }
      const data = await res.json();
      setCases(data.cases || []);
    } catch (err: any) {
      setError(err.message || "Failed to connect to backend service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.case_id.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [cases, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ── Topline Notification ── */}
      <div className="dashboard-topline">
        <span className="demo-label">
          CYBER HUNTERS INTELLIGENCE SYSTEM // CENTRAL CONTROL REGISTER
        </span>
        <button
          onClick={fetchCases}
          disabled={loading}
          className="table-action flex items-center gap-1.5"
          style={{ padding: "4px 8px" }}
          title="Refresh case register from Neo4j"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          <span>SYNC CASES</span>
        </button>
      </div>

      {/* ── Page Header / Intro ── */}
      <section className="case-intro">
        <div>
          <div className="section-code">CONTROL ROOM // INVESTIGATION REGISTER</div>
          <h2>INVESTIGATION DASHBOARD</h2>
          <p>
            High-level command register for criminal-network investigations. All previously ingested
            cases are tracked below in graph storage with evidence provenance and GDS analytics.
          </p>
        </div>
        <div className="case-id-block">
          <span>SYSTEM STATUS</span>
          <b>GRAPH: ONLINE</b>
        </div>
      </section>

      {/* ── Key Metrics Grid ── */}
      <section className="ledger-grid dashboard-metrics-grid">
        <div className="ledger-card metric-list">
          <div className="card-code">01 // INGESTED CASES</div>
          <div className="metric-icon">
            <FolderOpen size={15} />
          </div>
          <div className="dashboard-metric">
            <span>{loading ? "..." : cases.length}</span>
            <label>REGISTERED CASES</label>
          </div>
          <p className="muted-copy">Persisted in Neo4j graph storage.</p>
        </div>

        <div className="ledger-card status-card">
          <div className="card-code">02 // GRAPH DATABASE</div>
          <div className="status-row" style={{ margin: "14px 0 10px" }}>
            <span className="status-dot" />
            <span className="text-xs font-mono">NEO4J CE + GDS</span>
          </div>
          <p className="muted-copy">Port 7687 / Bolt protocol verified.</p>
        </div>

        <div className="ledger-card integrity-card">
          <div className="card-code">03 // PROOF-OF-SOURCE</div>
          <div className="metric-icon" style={{ borderColor: "rgba(133,155,125,0.6)", color: "var(--green)" }}>
            <ShieldCheck size={15} />
          </div>
          <div className="dashboard-metric">
            <span style={{ color: "var(--green)" }}>100%</span>
            <label>EVIDENCE LINKED</label>
          </div>
          <p className="muted-copy">Per-case source sentence guarantee.</p>
        </div>

        <div className="ledger-card metric-list">
          <div className="card-code">04 // QUICK ACTIONS</div>
          <div className="pt-3 space-y-1.5">
            <Link
              href="/ingest"
              className="shortcut-button w-full"
              style={{ padding: "8px 10px" }}
            >
              <Upload size={13} />
              <span>INGEST NEW FIR</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Case Register Table ── */}
      <section className="collision-panel">
        <div className="panel-header">
          <div>
            <div className="section-code">05 // CASE REGISTER</div>
            <h2>INDEXED INVESTIGATIONS</h2>
          </div>
          <div className="panel-tools">
            <Link href="/ingest" className="commit-button" style={{ margin: 0, padding: "5px 10px" }}>
              <Upload size={12} />
              <span>INTAKE NEW CASE</span>
            </Link>
          </div>
        </div>

        <div className="case-filter">
          <Search size={13} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FILTER BY CASE IDENTIFIER..."
          />
        </div>

        {error && (
          <div className="form-message error m-4 flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{error} — Ensure backend ingestion service is running on {API_BASE_URL}</span>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CASE IDENTIFIER</th>
                <th>DESCRIPTION / TITLE</th>
                <th>INTELLIGENCE STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <Loader2 className="w-5 h-5 animate-spin text-[#b59858]" />
                      <b>QUERYING GRAPH REPOSITORY...</b>
                    </div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <FolderOpen size={17} />
                      </div>
                      <b>NO CASES REGISTERED IN SYSTEM</b>
                      <p>
                        Begin an investigation by submitting an FIR document or text narrative.
                        Extracted entities will be written to Neo4j.
                      </p>
                      <Link
                        href="/ingest"
                        className="commit-button mt-3"
                        style={{ display: "inline-flex" }}
                      >
                        <Upload size={12} />
                        <span>OPEN DATA INGESTION</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.case_id}>
                    <td>
                      <b className="font-mono text-[#c8c8ba]">{c.case_id}</b>
                    </td>
                    <td>
                      <span className="text-[#8a8d83]">
                        {c.description || `Investigation record for ${c.case_id}`}
                      </span>
                    </td>
                    <td>
                      <span className="status-tag status-active font-mono text-[9px]">
                        INGESTED &amp; INDEXED
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/cases/${encodeURIComponent(c.case_id)}`}
                        className="table-action"
                      >
                        <span>OPEN CASE GRAPH</span>
                        <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Quick System Shortcuts ── */}
      <section className="collision-panel">
        <div className="panel-header">
          <div>
            <div className="section-code">06 // INVESTIGATOR WORKSPACES</div>
            <h2>SYSTEM DIRECTORY</h2>
          </div>
        </div>
        <div className="shortcut-grid">
          <Link href="/ingest" className="shortcut-button">
            <Upload size={14} />
            <span>Data Ingestion</span>
            <ChevronRight size={12} />
          </Link>
          <Link href="/criminal-search" className="shortcut-button">
            <Search size={14} />
            <span>Criminal Search</span>
            <ChevronRight size={12} />
          </Link>
          <Link href="/network-analysis" className="shortcut-button">
            <GitBranch size={14} />
            <span>Network Analysis</span>
            <ChevronRight size={12} />
          </Link>
          <Link href="/document-analysis" className="shortcut-button">
            <FileSearch size={14} />
            <span>Document Analysis</span>
            <ChevronRight size={12} />
          </Link>
        </div>
      </section>
    </div>
  );
}
