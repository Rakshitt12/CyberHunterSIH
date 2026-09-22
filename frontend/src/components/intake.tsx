"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { ingestBank, ingestCdr } from "@/api/client";

// CDR / BANK intake panel (§8): upload → parse records → review →
// persist (the backend persists on upload via MERGE) → open case.
// Uses the same intake visual language as the FIR workflow.
export function CsvIntake({
  kind,
  hint,
  columns,
}: {
  kind: "CDR" | "BANK";
  hint: string;
  columns: string[];
}) {
  const [caseId, setCaseId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    case_id: string;
    record_count: number;
    records: Record<string, unknown>[];
  } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const submit = async () => {
    if (!caseId.trim()) {
      setError("Please specify a valid Case ID.");
      return;
    }
    if (!file) {
      setError(`Please attach a ${kind} CSV file.`);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res =
        kind === "CDR"
          ? await ingestCdr(caseId.trim(), file)
          : await ingestBank(caseId.trim(), file);
      setResult({
        case_id: res.case_id,
        record_count: res.data.record_count,
        records: res.data.records || [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="intake-panel space-y-4">
      <div className="panel-header">
        <div>
          <div className="section-code">
            {kind} Intake // {kind === "CDR" ? "Call Records" : "Transactions"}
          </div>
          <h2>{kind} CSV IMPORT</h2>
        </div>
      </div>
      <p className="muted-copy">{hint}</p>
      <p className="text-[10px] font-mono text-[#5e625c]">
        EXPECTED COLUMNS: {columns.join(" · ")}
      </p>

      <div className="upload-pair">
        <input
          className="dotted-input flex-1"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          placeholder="CASE IDENTIFIER..."
        />
        <label className="file-picker">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <span>{file ? file.name : `ATTACH ${kind} CSV...`}</span>
        </label>
      </div>

      {error && (
        <div className="form-message error">
          <span>{error}</span>
        </div>
      )}

      <button className="commit-button" onClick={submit} disabled={loading}>
        {loading ? <Loader2 size={12} className="animate-spin" /> : null}
        <span>{loading ? "IMPORTING..." : `IMPORT ${kind} RECORDS`}</span>
      </button>

      {result && (
        <div className="form-message success space-y-2">
          <div className="flex items-center gap-2 text-[#859b7d] text-xs font-mono">
            <CheckCircle2 size={14} />
            <span>
              {result.record_count} {kind} RECORDS PERSISTED TO {result.case_id} (MERGE — RE-UPLOAD SAFE)
            </span>
          </div>
          <button className="table-action" onClick={() => setExpanded(!expanded)}>
            <span>{expanded ? "HIDE RECORDS" : `REVIEW ${result.record_count} RECORDS`}</span>
          </button>
          {expanded && (
            <div className="table-wrap max-h-64 overflow-auto">
              <table>
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.records.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td key={c}>{String(r[c.toLowerCase()] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/cases/${encodeURIComponent(result.case_id)}`} className="table-action">
              <span>Open Case</span>
            </Link>
            <Link
              href={`/network-analysis?case=${encodeURIComponent(result.case_id)}`}
              className="table-action"
            >
              <span>View Network</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
