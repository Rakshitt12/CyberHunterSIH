// Centralized API layer — every page imports from here instead of
// scattering raw fetch calls. Same-origin through the /api rewrite proxy.
import { API_BASE_URL } from "@/config";
import type {
  AlertItem,
  BurnerInfo,
  CaseAnalytics,
  CaseGraph,
  CaseSummary,
  CaseTimeline,
  CrossCaseConnection,
  DocumentEntry,
  HealthStatus,
  PathResult,
  SearchResponse,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail =
      body && typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/health");
}

export function getCases(): Promise<{ cases: CaseSummary[] }> {
  return request<{ cases: CaseSummary[] }>("/cases");
}

export function getCaseGraph(caseId: string): Promise<CaseGraph> {
  return request<CaseGraph>(`/cases/${encodeURIComponent(caseId)}/graph`);
}

export function getCaseAnalytics(caseId: string): Promise<CaseAnalytics> {
  return request<CaseAnalytics>(`/cases/${encodeURIComponent(caseId)}/analytics`);
}

export function getBurnerPhones(caseId: string): Promise<BurnerInfo> {
  return request<BurnerInfo>(`/cases/${encodeURIComponent(caseId)}/burner-phones`);
}

export function getCaseTimeline(caseId: string): Promise<CaseTimeline> {
  return request<CaseTimeline>(`/cases/${encodeURIComponent(caseId)}/timeline`);
}

export interface UploadResult {
  status: string;
  case_id: string;
  raw_text_length: number;
  record_count?: number;
  entities: {
    suspects: ExtractedEntity[];
    complainants: ExtractedEntity[];
    phones: ExtractedEntity[];
    locations: ExtractedEntity[];
    amounts: ExtractedEntity[];
  };
  alias_candidates: Record<string, AliasCandidate[]>;
  data?: { filename?: string; record_count?: number; records?: Record<string, unknown>[] };
  message?: string;
}

export interface ExtractedEntity {
  text: string;
  label: string;
  source_sentence: string;
  start_char: number;
  end_char: number;
  role?: string;
}

export interface AliasCandidate {
  candidate: string;
  score: number;
  scorer_used?: string;
  action_required?: string;
}

export function uploadCaseDocument(
  caseId: string,
  file: File | null,
  text: string
): Promise<UploadResult> {
  const fd = new FormData();
  if (file) fd.append("file", file);
  else fd.append("text", text);
  return request<UploadResult>(
    `/cases/${encodeURIComponent(caseId)}/upload`,
    { method: "POST", body: fd }
  );
}

export interface ConfirmPayload {
  suspects: { name: string; source_sentence: string; alias: string | null }[];
  phones: { number: string; owner?: string | null }[];
  accounts: { account_number: string; bank_name?: string; owner?: string | null }[];
  locations: { name: string; region?: string; suspect?: string | null }[];
}

export function confirmEntities(
  caseId: string,
  payload: ConfirmPayload
): Promise<{ status: string; case_id: string; written: Record<string, number>; message: string }> {
  return request(`/cases/${encodeURIComponent(caseId)}/confirm-entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function ingestCdr(
  caseId: string,
  file: File
): Promise<{ status: string; case_id: string; data: { record_count: number; records: Record<string, unknown>[] } }> {
  const fd = new FormData();
  fd.append("case_id", caseId);
  fd.append("file", file);
  return request("/ingest/cdr", { method: "POST", body: fd });
}

export function ingestBank(
  caseId: string,
  file: File
): Promise<{ status: string; case_id: string; data: { record_count: number; records: Record<string, unknown>[] } }> {
  const fd = new FormData();
  fd.append("case_id", caseId);
  fd.append("file", file);
  return request("/ingest/bank", { method: "POST", body: fd });
}

export function searchEntities(
  q: string,
  entityType?: string
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q });
  if (entityType) params.set("entity_type", entityType);
  return request<SearchResponse>(`/search?${params.toString()}`);
}

export function findPath(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string
): Promise<PathResult> {
  const params = new URLSearchParams({
    from_type: fromType,
    from_id: fromId,
    to_type: toType,
    to_id: toId,
  });
  return request<PathResult>(`/paths?${params.toString()}`);
}

export function getDocuments(filters?: {
  case_id?: string;
  doc_type?: string;
  q?: string;
}): Promise<{ document_count: number; documents: DocumentEntry[] }> {
  const params = new URLSearchParams();
  if (filters?.case_id) params.set("case_id", filters.case_id);
  if (filters?.doc_type) params.set("doc_type", filters.doc_type);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();
  return request(`/documents${qs ? `?${qs}` : ""}`);
}

export function getCrossCase(): Promise<{
  connection_count: number;
  connections: CrossCaseConnection[];
}> {
  return request("/cross-case");
}

export function getAlerts(alertType?: string): Promise<{
  alert_count: number;
  alerts: AlertItem[];
}> {
  return request(alertType ? `/alerts?alert_type=${alertType}` : "/alerts");
}
