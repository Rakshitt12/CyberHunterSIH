"use client";

import React, { useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/config";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  User,
  Users,
  Phone,
  MapPin,
  DollarSign,
  GitMerge,
  XCircle,
  CheckCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ─── Types mirroring the API response ────────────────────────────────────────
interface ExtractedEntity {
  text: string;
  label: string;
  source_sentence: string;
  start_char: number;
  end_char: number;
  role?: string;
}

interface AliasCandidate {
  candidate: string;
  score: number;
  scorer_used: string;
  action_required: string;
}

interface UploadResult {
  status: string;
  case_id: string;
  raw_text_length: number;
  entities: {
    suspects: ExtractedEntity[];
    complainants: ExtractedEntity[];
    phones: ExtractedEntity[];
    locations: ExtractedEntity[];
    amounts: ExtractedEntity[];
  };
  alias_candidates: Record<string, AliasCandidate[]>;
  message: string;
}

// "approved" = investigator confirmed merge, "rejected" = dismissed, null = pending
type AliasDecision = "approved" | "rejected" | null;
interface AliasDecisionMap {
  [suspectName: string]: { [candidate: string]: AliasDecision };
}

// ─── Small reusable components ────────────────────────────────────────────────

function EntityPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${color}`}>
      {label}: {count}
    </span>
  );
}

function SourceQuote({ sentence }: { sentence: string }) {
  return (
    <blockquote className="mt-1.5 text-[10px] text-slate-400 italic border-l-2 border-blue-700/50 pl-2 leading-relaxed">
      &ldquo;{sentence}&rdquo;
    </blockquote>
  );
}

function AliasCandidateRow({
  suspectName,
  candidate,
  decision,
  onDecide,
}: {
  suspectName: string;
  candidate: AliasCandidate;
  decision: AliasDecision;
  onDecide: (s: string, c: string, d: AliasDecision) => void;
}) {
  const scoreColor =
    candidate.score >= 95 ? "text-red-400" : candidate.score >= 90 ? "text-amber-400" : "text-yellow-500";

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs transition-all ${
        decision === "approved"
          ? "bg-emerald-950/30 border-emerald-500/30"
          : decision === "rejected"
          ? "bg-slate-900 border-slate-800 opacity-40"
          : "bg-slate-950 border-slate-800"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <GitMerge className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="font-mono text-slate-200 truncate">{candidate.candidate}</span>
        <span className={`font-bold font-mono ${scoreColor}`}>{candidate.score}%</span>
        <span className="text-slate-600 hidden sm:inline">via {candidate.scorer_used}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {decision === "approved" ? (
          <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
            <CheckCheck className="w-3 h-3" /> Approved
          </span>
        ) : decision === "rejected" ? (
          <span className="text-slate-500 text-[10px] font-semibold flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        ) : (
          <>
            <button
              onClick={() => onDecide(suspectName, candidate.candidate, "approved")}
              className="px-2 py-0.5 rounded bg-emerald-700/30 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-700/50 text-[10px] font-semibold transition"
            >
              Approve
            </button>
            <button
              onClick={() => onDecide(suspectName, candidate.candidate, "rejected")}
              className="px-2 py-0.5 rounded bg-red-900/20 border border-red-700/20 text-red-400 hover:bg-red-900/40 text-[10px] font-semibold transition"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [caseId, setCaseId] = useState("CASE-2026-DEL-101");
  const [firFile, setFirFile] = useState<File | null>(null);
  const [firText, setFirText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [aliasDecisions, setAliasDecisions] = useState<AliasDecisionMap>({});
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId.trim()) { setError("Please specify a valid Case ID."); return; }
    if (!firFile && !firText.trim()) { setError("Please provide a FIR file or text."); return; }
    setLoading(true); setError(null); setUploadResult(null);
    setConfirmResult(null); setConfirmError(null); setAliasDecisions({});
    try {
      const fd = new FormData();
      if (firFile) fd.append("file", firFile); else fd.append("text", firText);
      const res = await fetch(`${API_BASE_URL}/cases/${encodeURIComponent(caseId.trim())}/upload`, { method: "POST", body: fd });
      if (!res.ok) { const e2 = await res.json().catch(() => null); throw new Error(e2?.detail || `HTTP ${res.status}`); }
      const data: UploadResult = await res.json();
      setUploadResult(data);
      const init: AliasDecisionMap = {};
      for (const [name, cands] of Object.entries(data.alias_candidates ?? {})) {
        init[name] = {};
        for (const c of cands) init[name][c.candidate] = null;
      }
      setAliasDecisions(init);
    } catch (err: any) {
      setError(err.message || "Unexpected error.");
    } finally { setLoading(false); }
  };

  // ── Alias decisions ────────────────────────────────────────────────────────
  const handleAliasDecision = (suspect: string, candidate: string, decision: AliasDecision) => {
    setAliasDecisions(prev => ({ ...prev, [suspect]: { ...prev[suspect], [candidate]: decision } }));
  };

  const pendingAliasCount = Object.values(aliasDecisions).reduce(
    (n, m) => n + Object.values(m).filter(d => d === null).length, 0
  );

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!uploadResult) return;
    setConfirming(true); setConfirmError(null); setConfirmResult(null);
    try {
      const suspects = uploadResult.entities.suspects.map(s => {
        const approvedAlias = Object.entries(aliasDecisions[s.text] ?? {}).find(([, d]) => d === "approved")?.[0] ?? null;
        return { name: s.text, source_sentence: s.source_sentence, alias: approvedAlias };
      });
      const phones = uploadResult.entities.phones.map(p => ({ number: p.text }));
      const locations = uploadResult.entities.locations.map(l => ({ name: l.text }));
      const res = await fetch(
        `${API_BASE_URL}/cases/${encodeURIComponent(uploadResult.case_id)}/confirm-entities`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suspects, phones, accounts: [], locations }) }
      );
      if (!res.ok) { const e2 = await res.json().catch(() => null); throw new Error(e2?.detail || `HTTP ${res.status}`); }
      setConfirmResult(await res.json());
    } catch (err: any) {
      setConfirmError(err.message || "Confirmation failed.");
    } finally { setConfirming(false); }
  };

  const ents = uploadResult?.entities;
  const hasAliases = Object.keys(uploadResult?.alias_candidates ?? {}).length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="border-b border-slate-800 pb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Cyber Hunters</h1>
              <p className="text-sm text-slate-400">AI Criminal Network Analysis &amp; Intelligence Platform</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Backend Online (8001)
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Upload Form ────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Case Ingestion &amp; NER</h2>
              <p className="text-xs text-slate-400 mt-1">Upload FIR to extract entities and detect alias candidates.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Case Identifier *</label>
                <input type="text" required value={caseId} onChange={e => setCaseId(e.target.value)}
                  placeholder="e.g. CASE-2026-DEL-001"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">FIR Document (PDF / TXT)</label>
                <input type="file" accept=".pdf,.txt" onChange={e => { if (e.target.files?.[0]) setFirFile(e.target.files[0]); }}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 file:cursor-pointer bg-slate-950 border border-slate-800 rounded-lg p-1.5" />
              </div>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-2 text-xs text-slate-500 uppercase font-mono">or raw text</span>
                <div className="flex-grow border-t border-slate-800" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Direct FIR Text</label>
                <textarea rows={5} value={firText} onChange={e => setFirText(e.target.value)}
                  placeholder="Paste FIR narrative here..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>
                  : <><UploadCloud className="w-4 h-4" /><span>Ingest &amp; Extract</span></>}
              </button>
            </form>
            {error && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
              </div>
            )}
          </div>

          {/* ── Review & Confirm Panel ─────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-5">

            {!uploadResult ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[420px] space-y-3">
                <FileText className="w-10 h-10 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">No case uploaded yet</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Submit a case on the left to run ingestion and NER. You will review extracted entities and approve or reject alias suggestions before anything is written to the graph.
                </p>
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <EntityPill label="Suspects" count={ents?.suspects.length ?? 0} color="bg-red-500/10 text-red-400 border-red-500/20" />
                    <EntityPill label="Complainants" count={ents?.complainants.length ?? 0} color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />
                    <EntityPill label="Phones" count={ents?.phones.length ?? 0} color="bg-blue-500/10 text-blue-400 border-blue-500/20" />
                    <EntityPill label="Locations" count={ents?.locations.length ?? 0} color="bg-amber-500/10 text-amber-400 border-amber-500/20" />
                    <EntityPill label="Amounts" count={ents?.amounts.length ?? 0} color="bg-purple-500/10 text-purple-400 border-purple-500/20" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{uploadResult.raw_text_length} chars · {uploadResult.case_id}</span>
                </div>

                {/* ── Suspects ─────────────────────────────────────────────── */}
                {(ents?.suspects.length ?? 0) > 0 && (
                  <div className="bg-slate-900 border border-red-900/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <User className="w-4 h-4 text-red-400" />
                      <h3 className="text-sm font-semibold text-white">Suspects / Accused</h3>
                      <span className="ml-auto text-[10px] text-red-400/70 bg-red-950/30 border border-red-900/30 px-2 py-0.5 rounded-full">
                        Written to graph on confirmation
                      </span>
                    </div>
                    <div className="space-y-3">
                      {ents!.suspects.map((s, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{s.text}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-800/30">SUSPECT</span>
                          </div>
                          <SourceQuote sentence={s.source_sentence} />
                          {uploadResult.alias_candidates[s.text]?.length > 0 && (
                            <div className="mt-2.5 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3" />
                                Possible alias — investigator action required before confirmation
                              </div>
                              {uploadResult.alias_candidates[s.text].map(cand => (
                                <AliasCandidateRow
                                  key={cand.candidate}
                                  suspectName={s.text}
                                  candidate={cand}
                                  decision={aliasDecisions[s.text]?.[cand.candidate] ?? null}
                                  onDecide={handleAliasDecision}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Complainants ──────────────────────────────────────────── */}
                {(ents?.complainants.length ?? 0) > 0 && (
                  <div className="bg-slate-900 border border-emerald-900/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-white">Complainants / Victims</h3>
                      <span className="ml-auto text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                        Not written to graph
                      </span>
                    </div>
                    <div className="space-y-2">
                      {ents!.complainants.map((c, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{c.text}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800/30">COMPLAINANT</span>
                          </div>
                          <SourceQuote sentence={c.source_sentence} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Phones & Locations ────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(ents?.phones.length ?? 0) > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <Phone className="w-3.5 h-3.5 text-blue-400" />
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Phone Numbers</h4>
                      </div>
                      {ents!.phones.map((p, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-2">
                          <span className="font-mono text-xs text-blue-300">{p.text}</span>
                          <SourceQuote sentence={p.source_sentence} />
                        </div>
                      ))}
                    </div>
                  )}
                  {(ents?.locations.length ?? 0) > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Locations</h4>
                      </div>
                      {ents!.locations.map((l, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-2">
                          <span className="text-xs text-amber-300">{l.text}</span>
                          <SourceQuote sentence={l.source_sentence} />
                        </div>
                      ))}
                    </div>
                  )}
                  {(ents?.amounts.length ?? 0) > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 sm:col-span-2">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Financial Amounts</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ents!.amounts.map((a, i) => (
                          <span key={i} className="text-xs font-mono bg-purple-950/30 border border-purple-800/30 text-purple-300 px-2 py-1 rounded">{a.text}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pending alias warning */}
                {hasAliases && pendingAliasCount > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span><strong>{pendingAliasCount}</strong> alias candidate{pendingAliasCount !== 1 ? "s" : ""} still pending — approve or reject each before confirming.</span>
                  </div>
                )}

                {/* Confirm button */}
                {!confirmResult && (
                  <div className="flex items-center gap-3">
                    <button onClick={handleConfirm} disabled={confirming || pendingAliasCount > 0}
                      title={pendingAliasCount > 0 ? "Resolve all alias candidates first" : ""}
                      className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30">
                      {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Writing to Neo4j...</span></>
                        : <><CheckCheck className="w-4 h-4" /><span>Confirm &amp; Write to Graph</span></>}
                    </button>
                    <Link href={`/cases/${encodeURIComponent(uploadResult.case_id)}`}
                      className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium rounded-xl text-sm transition flex items-center gap-2">
                      <span>View Graph</span><ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {confirmError && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{confirmError}</span>
                  </div>
                )}

                {/* Confirm success */}
                {confirmResult && (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-emerald-300">Entities Confirmed &amp; Written to Neo4j</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        ["Suspects", confirmResult.written?.suspects],
                        ["Phones", confirmResult.written?.phones],
                        ["Locations", confirmResult.written?.locations],
                        ["Relationships", confirmResult.written?.relationships],
                      ].map(([k, v]) => (
                        <span key={k} className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {k}: <strong className="text-white">{v ?? 0}</strong>
                        </span>
                      ))}
                    </div>
                    <Link href={`/cases/${encodeURIComponent(uploadResult.case_id)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">
                      <span>Open Case Graph</span><ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
