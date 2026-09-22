// Central TypeScript contracts mirroring the FastAPI responses.
// No `any` shortcuts — every view renders from these shapes.

export interface CaseSummary {
  case_id: string;
  description: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
  name: string;
  properties: Record<string, string | number | boolean | null>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, string | number | boolean | null>;
}

export interface CaseGraph {
  case_id: string;
  node_count: number;
  edge_count: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CentralityRow {
  nodeType: string;
  identifier: string;
  case_id: string | null;
  score: number;
  in_this_case: boolean;
}

export interface CommunityMember {
  nodeType: string;
  identifier: string;
  case_id: string | null;
  in_this_case: boolean;
}

export interface CycleRecord {
  accounts: string[];
  amounts: (number | null)[];
  cases: (string | null)[];
  cycle_length: number;
}

export interface CrossCaseLink {
  entityType: string;
  identifier: string;
  other_cases: string[];
  total_cases: number;
}

export interface CaseAnalytics {
  case_id: string;
  analytics_engine?: string;
  gds_warning?: string;
  betweenness_centrality: CentralityRow[];
  pagerank: CentralityRow[];
  louvain_communities: Record<string, CommunityMember[]>;
  money_laundering_cycles: CycleRecord[];
  cross_case_links: CrossCaseLink[];
  burner_phones: BurnerPhone[];
}

export interface BurnerPhone {
  phone_number: string;
  total_calls: number;
  calls_in_burst_window: number;
  burst_window_hours: number;
  calls_after_window: number;
  first_call: string;
  last_call: string;
  active_duration_minutes: number;
  flag_reason: string;
}

export interface BurnerInfo {
  case_id: string;
  rule: string;
  flagged_phones: BurnerPhone[];
}

export interface SearchHit {
  entity_type: "suspect" | "phone" | "account" | "location" | "case";
  identifier: string;
  alias?: string | null;
  bank_name?: string | null;
  description?: string | null;
  matched_by: string[];
  cases: string[];
  owners?: string[];
  suspects?: string[];
  evidence_count?: number;
  suspect_count?: number;
}

export interface SearchResponse {
  query: string;
  result_count: number;
  results: SearchHit[];
}

export interface PathResult {
  found: boolean;
  from: { entity_type: string; identifier: string };
  to: { entity_type: string; identifier: string };
  message?: string;
  hop_count?: number;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}

export interface TimelineEvent {
  kind: "CALL" | "TRANSFER";
  at: string;
  summary: string;
  details: Record<string, string | number | null>;
}

export interface CaseTimeline {
  case_id: string;
  event_count: number;
  events: TimelineEvent[];
  locations: { suspect: string; location: string; region: string | null }[];
}

export interface DocumentEntry {
  case_id: string;
  description: string | null;
  doc_types: ("FIR" | "CDR" | "BANK")[];
  suspect_count: number;
  phone_count: number;
  account_count: number;
  call_count: number;
  transfer_count: number;
  evidence_sentences: string[];
}

export interface CrossCaseConnection {
  entityType: string;
  identifier: string;
  linked_cases: string[];
  case_count: number;
}

export interface AlertItem {
  alert_type: "BURNER" | "CYCLE" | "CROSS_CASE";
  severity: "HIGH" | "MEDIUM";
  case_id: string | null;
  entity: string | null;
  reason: string;
  evidence: Record<string, unknown>;
}

export interface HealthStatus {
  status: "healthy" | "degraded";
  service: string;
  database: "connected" | "disconnected";
}

export type EntityType = "suspect" | "phone" | "account" | "location";
