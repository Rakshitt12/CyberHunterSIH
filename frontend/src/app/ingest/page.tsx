"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { confirmEntities, uploadCaseDocument } from "@/api/client";
import type {
  AliasCandidate,
  ExtractedEntity,
  UploadResult,
} from "@/api/client";
import { CsvIntake } from "@/components/intake";
import {
  Upload,
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
  ChevronRight,
} from "lucide-react";

// Shared API types imported from @/api/client (UploadResult,
// ExtractedEntity, AliasCandidate). Below: ingest-local UI state only.

// "approved" = investigator confirmed merge, "rejected" = dismissed, null = pending
type AliasDecision = "approved" | "rejected" | null;
interface AliasDecisionMap {
  [suspectName: string]: { [candidate: string]: AliasDecision };
}

function SourceQuote({ sentence }: { sentence: string }) {
  return (
    <blockquote className="mt-1.5 text-[11px] text-[#8a8d83] italic border-l-2 border-[#b59858] pl-2.5 leading-relaxed">
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
    candidate.score >= 95 ? "text-[#bd7470]" : candidate.score >= 90 ? "text-[#c5bf55]" : "text-[#b59858]";

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 border text-xs transition-all ${
        decision === "approved"
          ? "bg-[#859b7d]/15 border-[#859b7d]/40"
          : decision === "rejected"
          ? "bg-[#121514] border-[rgba(200,200,186,0.12)] opacity-50"
          : "bg-[#181c1a] border-[rgba(200,200,186,0.25)]"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <GitMerge className="w-3.5 h-3.5 text-[#c5bf55] shrink-0" />
        <span className="font-mono text-[#c8c8ba] truncate">{candidate.candidate}</span>
        <span className={`font-bold font-mono ${scoreColor}`}>{candidate.score}%</span>
        <span className="text-[#5e625c] hidden sm:inline text-[9px] uppercase tracking-wider">via {candidate.scorer_used}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {decision === "approved" ? (
          <span className="text-[#859b7d] text-[10px] font-semibold flex items-center gap-1 font-mono">
            <CheckCheck className="w-3 h-3" /> APPROVED
          </span>
        ) : decision === "rejected" ? (
          <span className="text-[#8a8d83] text-[10px] font-semibold flex items-center gap-1 font-mono">
            <XCircle className="w-3 h-3" /> REJECTED
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDecide(suspectName, candidate.candidate, "approved")}
              className="px-2 py-0.5 border border-[#859b7d] text-[#859b7d] hover:bg-[#859b7d]/20 text-[9px] font-mono tracking-wider transition"
            >
              APPROVE
            </button>
            <button
              type="button"
              onClick={() => onDecide(suspectName, candidate.candidate, "rejected")}
              className="px-2 py-0.5 border border-[#8d3d3c] text-[#bd7470] hover:bg-[#8d3d3c]/20 text-[9px] font-mono tracking-wider transition"
            >
              REJECT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IngestPage() {
  const [tab, setTab] = useState<"FIR" | "CDR" | "BANK">("FIR");
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
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!caseId.trim()) { setError("Please specify a valid Case ID."); return; }
    if (!firFile && !firText.trim()) { setError("Please provide an FIR file or text narrative."); return; }
    setLoading(true); setError(null); setUploadResult(null);
    setConfirmResult(null); setConfirmError(null); setAliasDecisions({});
    try {
      const data = await uploadCaseDocument(
        caseId.trim(),
        firFile,
        firText
      );
      setUploadResult(data);
      const init: AliasDecisionMap = {};
      for (const [name, cands] of Object.entries(data.alias_candidates ?? {})) {
        init[name] = {};
        for (const c of cands) init[name][c.candidate] = null;
      }
      setAliasDecisions(init);
    } catch (err: any) {
      setError(err.message || "Unexpected error during ingestion.");
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
      const data = await confirmEntities(uploadResult.case_id, {
        suspects,
        phones,
        accounts: [],
        locations,
      });
      setConfirmResult(data);
    } catch (err: any) {
      setConfirmError(err.message || "Confirmation failed.");
    } finally { setConfirming(false); }
  };

  const ents = uploadResult?.entities;
  const hasAliases = Object.keys(uploadResult?.alias_candidates ?? {}).length > 0;

  return (
    <div className="space-y-6">
      {/* ── Page Intro ── */}
      <section className="case-intro">
        <div>
          <div className="section-code">EVIDENCE INTAKE // FORM 21-A</div>
          <h2>CASE INGESTION &amp; NER EXTRACTION</h2>
          <p>
            Submit First Information Report (FIR) narrative to extract criminal network entities.
            Suspects and alias candidates undergo explicit human confirmation before writing to Neo4j.
          </p>
        </div>
        <div className="case-id-block">
          <span>INTAKE REGISTER</span>
          <b>PROV-CHAIN: VERIFIED</b>
        </div>
      </section>

      <div className="ingestion-tabs">
        {(["FIR", "CDR", "BANK"] as const).map((t) => (
          <button
            key={t}
            className={`ingestion-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "FIR" ? (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Upload Form ────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 intake-panel" style={{ margin: 0, maxWidth: "100%" }}>
          <div className="form-title">
            <span>SOURCE SUBMISSION // FORM 21-A</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label>CASE REFERENCE IDENTIFIER *</label>
              <input
                type="text"
                required
                value={caseId}
                onChange={e => setCaseId(e.target.value)}
                placeholder="e.g. CASE-2026-DEL-101"
                className="dotted-input font-mono"
              />
            </div>

            <div>
              <label>SOURCE DOCUMENT (PDF / TXT)</label>
              <label className="drop-zone file-picker">
                <Upload size={18} />
                <span className="font-mono text-center px-2">
                  {firFile ? firFile.name : "[ SELECT PDF OR TXT SOURCE FILE ]"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files?.[0]) setFirFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[rgba(200,200,186,0.12)]" />
              <span className="flex-shrink mx-3 text-[9px] text-[#5e625c] uppercase font-mono tracking-wider">
                OR RAW NARRATIVE TEXT
              </span>
              <div className="flex-grow border-t border-[rgba(200,200,186,0.12)]" />
            </div>

            <div>
              <label>DIRECT FIR NARRATIVE TEXT</label>
              <textarea
                rows={5}
                value={firText}
                onChange={e => setFirText(e.target.value)}
                placeholder="Paste FIR complaint narrative here..."
                className="dotted-input font-mono"
                style={{ height: "auto", padding: "8px 10px" }}
              />
            </div>

            <div className="form-rule" />

            <button
              type="submit"
              disabled={loading}
              className="commit-button"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>EXTRACTING ENTITIES...</span>
                </>
              ) : (
                <>
                  <span>INGEST &amp; EXTRACT ENTITIES</span>
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="form-message error flex items-start gap-2 mt-4">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Review & Confirm Panel ─────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-5">
          {!uploadResult ? (
            <div className="collision-panel p-10 flex flex-col items-center justify-center text-center min-h-[380px] space-y-3">
              <FileText className="w-9 h-9 text-[#5e625c]" />
              <b className="text-sm font-normal tracking-wide text-[#c8c8ba]">AWAITING SOURCE INGESTION</b>
              <p className="text-xs text-[#8a8d83] max-w-md leading-relaxed">
                Submit an FIR record using the form on the left. The NLP pipeline will extract suspects,
                victim details, burner numbers, locations, and flag alias collision candidates for review.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Bar */}
              <div className="collision-panel p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 border border-[#8d3d3c]/50 bg-[#8d3d3c]/10 text-[#bd7470] text-[10px] font-mono font-semibold">
                    SUSPECTS: {ents?.suspects.length ?? 0}
                  </span>
                  <span className="px-2.5 py-1 border border-[#859b7d]/50 bg-[#859b7d]/10 text-[#859b7d] text-[10px] font-mono font-semibold">
                    COMPLAINANTS: {ents?.complainants.length ?? 0}
                  </span>
                  <span className="px-2.5 py-1 border border-[#bf8069]/50 bg-[#bf8069]/10 text-[#bf8069] text-[10px] font-mono font-semibold">
                    PHONES: {ents?.phones.length ?? 0}
                  </span>
                  <span className="px-2.5 py-1 border border-[#b59858]/50 bg-[#b59858]/10 text-[#b59858] text-[10px] font-mono font-semibold">
                    LOCATIONS: {ents?.locations.length ?? 0}
                  </span>
                  <span className="px-2.5 py-1 border border-[rgba(200,200,186,0.3)] bg-[rgba(200,200,186,0.05)] text-[#c8c8ba] text-[10px] font-mono font-semibold">
                    AMOUNTS: {ents?.amounts.length ?? 0}
                  </span>
                </div>
                <span className="text-[10px] text-[#5e625c] font-mono">
                  {uploadResult.raw_text_length} chars · {uploadResult.case_id}
                </span>
              </div>

              {/* ── Suspects ─────────────────────────────────────────────── */}
              {(ents?.suspects.length ?? 0) > 0 && (
                <section className="collision-panel">
                  <div className="panel-header">
                    <div>
                      <div className="section-code">01 // TARGET ACCUSED</div>
                      <h2>SUSPECTS &amp; ALIAS RESOLUTION</h2>
                    </div>
                    <span className="text-[9px] text-[#bd7470] border border-[#8d3d3c]/50 bg-[#8d3d3c]/10 px-2 py-0.5 font-mono">
                      WRITTEN TO GRAPH ON CONFIRMATION
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {ents!.suspects.map((s, i) => (
                      <div key={i} className="p-3 border border-[rgba(200,200,186,0.15)] bg-[#121514] space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#bd7470]" />
                          <span className="font-semibold text-xs text-[#c8c8ba] font-mono">{s.text}</span>
                          <span className="text-[9px] px-1.5 py-0.5 border border-[#8d3d3c]/40 text-[#bd7470] font-mono">
                            SUSPECT
                          </span>
                        </div>
                        <SourceQuote sentence={s.source_sentence} />
                        {uploadResult.alias_candidates[s.text]?.length > 0 && (
                          <div className="mt-2.5 space-y-1.5 pt-2 border-t border-[rgba(200,200,186,0.1)]">
                            <div className="flex items-center gap-1.5 text-[9px] text-[#c5bf55] font-semibold uppercase tracking-wider font-mono">
                              <AlertTriangle className="w-3 h-3" />
                              ALIAS COLLISION CANDIDATE — CONFIRM OR REJECT
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
                </section>
              )}

              {/* ── Complainants ──────────────────────────────────────────── */}
              {(ents?.complainants.length ?? 0) > 0 && (
                <section className="collision-panel">
                  <div className="panel-header">
                    <div>
                      <div className="section-code">02 // REPORTING PARTIES</div>
                      <h2>COMPLAINANTS &amp; VICTIMS</h2>
                    </div>
                    <span className="text-[9px] text-[#8a8d83] border border-[rgba(200,200,186,0.2)] bg-[rgba(200,200,186,0.03)] px-2 py-0.5 font-mono">
                      ISOLATED (NOT WRITTEN AS SUSPECT)
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {ents!.complainants.map((c, i) => (
                      <div key={i} className="p-3 border border-[rgba(200,200,186,0.12)] bg-[#121514]">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-[#859b7d]" />
                          <span className="font-semibold text-xs text-[#c8c8ba] font-mono">{c.text}</span>
                          <span className="text-[9px] px-1.5 py-0.5 border border-[#859b7d]/40 text-[#859b7d] font-mono">
                            COMPLAINANT
                          </span>
                        </div>
                        <SourceQuote sentence={c.source_sentence} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Phones & Locations ────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(ents?.phones.length ?? 0) > 0 && (
                  <div className="collision-panel p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-[rgba(200,200,186,0.15)]">
                      <Phone className="w-3.5 h-3.5 text-[#bf8069]" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8a8d83] font-mono">
                        Phone Identifiers
                      </span>
                    </div>
                    {ents!.phones.map((p, i) => (
                      <div key={i} className="p-2 border border-[rgba(200,200,186,0.1)] bg-[#121514]">
                        <span className="font-mono text-xs text-[#c8c8ba]">{p.text}</span>
                        <SourceQuote sentence={p.source_sentence} />
                      </div>
                    ))}
                  </div>
                )}

                {(ents?.locations.length ?? 0) > 0 && (
                  <div className="collision-panel p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-[rgba(200,200,186,0.15)]">
                      <MapPin className="w-3.5 h-3.5 text-[#b59858]" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8a8d83] font-mono">
                        Locations
                      </span>
                    </div>
                    {ents!.locations.map((l, i) => (
                      <div key={i} className="p-2 border border-[rgba(200,200,186,0.1)] bg-[#121514]">
                        <span className="text-xs text-[#c8c8ba] font-mono">{l.text}</span>
                        <SourceQuote sentence={l.source_sentence} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Amounts */}
              {(ents?.amounts.length ?? 0) > 0 && (
                <div className="collision-panel p-4 space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-[rgba(200,200,186,0.15)]">
                    <DollarSign className="w-3.5 h-3.5 text-[#c5bf55]" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8a8d83] font-mono">
                      Financial Amounts Mentioned
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ents!.amounts.map((a, i) => (
                      <span
                        key={i}
                        className="text-xs font-mono border border-[#b59858]/40 bg-[#b59858]/10 text-[#d0bd83] px-2.5 py-1"
                      >
                        {a.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Alias Warning */}
              {hasAliases && pendingAliasCount > 0 && (
                <div className="critical-strip" style={{ minHeight: "36px", padding: "6px 12px" }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{pendingAliasCount}</strong> ALIAS CANDIDATE(S) REQUIRE REVIEW BEFORE CONFIRMATION
                  </span>
                </div>
              )}

              {/* Confirm Button */}
              {!confirmResult && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleConfirm}
                    disabled={confirming || pendingAliasCount > 0}
                    title={pendingAliasCount > 0 ? "Resolve all alias candidates first" : ""}
                    className="commit-button flex-1"
                    style={{ justifyContent: "center", padding: "10px 16px" }}
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>WRITING TO NEO4J GRAPH...</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-4 h-4" />
                        <span>CONFIRM &amp; WRITE TO GRAPH (MERGE)</span>
                      </>
                    )}
                  </button>
                  <Link
                    href={`/cases/${encodeURIComponent(uploadResult.case_id)}`}
                    className="table-action"
                    style={{ padding: "10px 14px" }}
                  >
                    <span>VIEW CASE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {confirmError && (
                <div className="form-message error flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{confirmError}</span>
                </div>
              )}

              {/* Confirm Success */}
              {confirmResult && (
                <div className="collision-panel p-5 border-[#859b7d] bg-[#859b7d]/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#859b7d]" />
                    <h3 className="text-sm font-semibold text-[#859b7d] font-mono">
                      ENTITIES CONFIRMED &amp; WRITTEN TO NEO4J GRAPH
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {[
                      ["Suspects", confirmResult.written?.suspects],
                      ["Phones", confirmResult.written?.phones],
                      ["Locations", confirmResult.written?.locations],
                      ["Relationships", confirmResult.written?.relationships],
                    ].map(([k, v]) => (
                      <span key={k} className="px-2.5 py-1 border border-[rgba(200,200,186,0.2)] bg-[#121514] text-[#8a8d83]">
                        {k}: <strong className="text-[#c8c8ba]">{v ?? 0}</strong>
                      </span>
                    ))}
                  </div>
                  <div className="pt-2">
                    <Link
                      href={`/cases/${encodeURIComponent(uploadResult.case_id)}`}
                      className="commit-button"
                      style={{ display: "inline-flex" }}
                    >
                      <span>OPEN INVESTIGATION GRAPH</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      ) : tab === "CDR" ? (
        <CsvIntake
          kind="CDR"
          hint="Call Detail Records persist immediately as CALLED links between phone nodes (MERGE — re-upload safe). Review the parsed rows, then open the case."
          columns={["caller", "callee", "timestamp", "duration"]}
        />
      ) : (
        <CsvIntake
          kind="BANK"
          hint="Bank transactions persist immediately as TRANSFERRED links between account nodes (MERGE — re-upload safe). Review the parsed rows, then open the case."
          columns={["sender", "receiver", "amount", "date"]}
        />
      )}
    </div>
  );
}
