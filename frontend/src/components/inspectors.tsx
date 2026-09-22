"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  FolderOpen,
  Info,
  MapPin,
  Phone,
  Shield,
  User,
} from "lucide-react";
import type { GraphEdge, GraphNode } from "@/api/types";

export function nodeIcon(label: string, cls = "w-3.5 h-3.5") {
  switch (label) {
    case "Suspect":
      return <User className={`${cls} text-[#bd7470]`} />;
    case "Phone":
      return <Phone className={`${cls} text-[#bf8069]`} />;
    case "Account":
      return <CreditCard className={`${cls} text-[#859b7d]`} />;
    case "Location":
      return <MapPin className={`${cls} text-[#b59858]`} />;
    case "Case":
      return <FolderOpen className={`${cls} text-[#c5bf55]`} />;
    default:
      return <Info className={`${cls} text-[#8a8d83]`} />;
  }
}

function AttrTable({ props, skip }: { props: GraphNode["properties"]; skip?: string[] }) {
  return (
    <div className="border border-[rgba(200,200,186,0.15)] bg-[#121514] p-2.5 space-y-1 text-xs font-mono">
      {Object.entries(props || {}).map(([k, v]) => {
        if ((skip || []).includes(k)) return null;
        return (
          <div
            key={k}
            className="flex justify-between py-0.5 border-b border-[rgba(200,200,186,0.08)] last:border-0"
          >
            <span className="text-[#5e625c] text-[10px]">{k}:</span>
            <span className="text-[#c8c8ba] text-[10px] truncate max-w-[160px]">
              {String(v ?? "")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SourceBox({ sentence, caseId }: { sentence: string; caseId?: string }) {
  return (
    <div className="p-3 border border-[#b59858]/50 bg-[#b59858]/10 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[#c5bf55] text-[10px] font-semibold uppercase tracking-wider font-mono">
        <Shield className="w-3.5 h-3.5" />
        <span>Proof-of-Source (Evidence Link)</span>
      </div>
      <blockquote style={{ margin: "8px 0", padding: "8px 10px", borderColor: "#b59858" }}>
        &ldquo;{sentence}&rdquo;
      </blockquote>
      {caseId && (
        <p className="text-[9px] text-[#8a8d83] font-mono">
          Sourced from the originating case MENTIONS link for <strong>{caseId}</strong>.
        </p>
      )}
    </div>
  );
}

// ── Entity Inspector (§14): collapsible, action-linked, never dumps all ──
export function EntityInspector({
  node,
  caseId,
  extra,
}: {
  node: GraphNode;
  caseId?: string;
  extra?: React.ReactNode;
}) {
  const props = node.properties || {};
  const sentences = [props.source_sentence].filter(
    (s): s is string => typeof s === "string" && s.length > 0
  );
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 p-3 border border-[rgba(200,200,186,0.15)] bg-[#121514]">
        <div className="p-1.5 border border-[rgba(200,200,186,0.2)] mt-0.5">
          {nodeIcon(node.label)}
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#c8c8ba] font-mono">{node.name}</h3>
          <p className="text-[10px] text-[#5e625c] font-mono mt-0.5">{node.id}</p>
        </div>
      </div>

      {sentences.length > 0 ? (
        <SourceBox sentence={sentences[0]} caseId={caseId} />
      ) : (
        <div className="p-2.5 border border-[rgba(200,200,186,0.12)] bg-[#121514] text-[10px] text-[#5e625c] font-mono">
          No direct source sentence attached to this entity node. Related
          evidence may still exist on its relationships.
        </div>
      )}

      <div className="space-y-1.5 pt-1">
        <span className="text-[9px] font-semibold text-[#8a8d83] uppercase tracking-wider font-mono">
          Node Attributes
        </span>
        <AttrTable props={props} skip={["source_sentence"]} />
      </div>

      {extra}

      {caseId && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/cases/${encodeURIComponent(caseId)}?tab=evidence`} className="table-action">
            <span>View Evidence</span>
          </Link>
          <Link
            href={`/network-analysis?case=${encodeURIComponent(caseId)}&entity=${encodeURIComponent(node.name)}`}
            className="table-action"
          >
            <span>Focus in Graph</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Relationship Inspector (§13): only fields the backend provides ──
export function RelationshipInspector({
  edge,
  nodeName,
}: {
  edge: GraphEdge;
  nodeName: (id: string) => string;
}) {
  const props = edge.properties || {};
  const shown: [string, string][] = [];
  const push = (label: string, v: unknown) => {
    if (v !== null && v !== undefined && String(v).length > 0) shown.push([label, String(v)]);
  };
  push("Type", edge.type);
  push("From", nodeName(edge.source));
  push("To", nodeName(edge.target));
  push("Timestamp", props.timestamp);
  push("Date", props.date);
  push("Duration", props.duration);
  push("Amount", props.amount);
  push("Case", props.case_id);
  Object.entries(props).forEach(([k, v]) => {
    if (["timestamp", "date", "duration", "amount", "case_id", "source_sentence"].includes(k)) return;
    push(k, v);
  });

  return (
    <div className="space-y-3">
      <div className="p-3 border border-[rgba(200,200,186,0.15)] bg-[#121514]">
        <div className="section-code">Relationship // {edge.type}</div>
        <h3 className="text-sm font-bold text-[#c8c8ba] font-mono mt-1">
          {nodeName(edge.source)} → {nodeName(edge.target)}
        </h3>
      </div>
      {typeof props.source_sentence === "string" && props.source_sentence.length > 0 && (
        <SourceBox sentence={props.source_sentence} />
      )}
      <div className="space-y-1.5">
        <span className="text-[9px] font-semibold text-[#8a8d83] uppercase tracking-wider font-mono">
          Relationship Attributes
        </span>
        <div className="border border-[rgba(200,200,186,0.15)] bg-[#121514] p-2.5 space-y-1 text-xs font-mono">
          {shown.map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between py-0.5 border-b border-[rgba(200,200,186,0.08)] last:border-0"
            >
              <span className="text-[#5e625c] text-[10px]">{k}:</span>
              <span className="text-[#c8c8ba] text-[10px] truncate max-w-[160px]">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Graph toolbar (§12) in existing panel-tools language ──
export function GraphToolbar({
  query,
  onQuery,
  nodeFilter,
  onNodeFilter,
  edgeFilter,
  onEdgeFilter,
  onFit,
  onReset,
  resultCount,
}: {
  query: string;
  onQuery: (v: string) => void;
  nodeFilter: string;
  onNodeFilter: (v: string) => void;
  edgeFilter: string;
  onEdgeFilter: (v: string) => void;
  onFit: () => void;
  onReset: () => void;
  resultCount?: number;
}) {
  return (
    <div className="network-toolbar flex flex-wrap items-center gap-2">
      <input
        className="dotted-input"
        style={{ maxWidth: 180 }}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="SEARCH ENTITY..."
      />
      <select className="case-filter" value={nodeFilter} onChange={(e) => onNodeFilter(e.target.value)}>
        <option value="">ENTITY: ALL</option>
        <option value="Suspect">ENTITY: SUSPECT</option>
        <option value="Phone">ENTITY: PHONE</option>
        <option value="Account">ENTITY: ACCOUNT</option>
        <option value="Location">ENTITY: LOCATION</option>
        <option value="Case">ENTITY: CASE</option>
      </select>
      <select className="case-filter" value={edgeFilter} onChange={(e) => onEdgeFilter(e.target.value)}>
        <option value="">RELATIONSHIP: ALL</option>
        <option value="MENTIONS">MENTIONS</option>
        <option value="OWNS">OWNS</option>
        <option value="LOCATED_AT">LOCATED_AT</option>
        <option value="CALLED">CALLED</option>
        <option value="TRANSFERRED">TRANSFERRED</option>
      </select>
      <button className="table-action" onClick={onFit}>
        <span>FIT</span>
      </button>
      <button className="table-action" onClick={onReset}>
        <span>RESET</span>
      </button>
      {typeof resultCount === "number" && (
        <span className="text-[9px] font-mono text-[#5e625c]">{resultCount} MATCHES</span>
      )}
    </div>
  );
}
