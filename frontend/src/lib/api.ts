/* FraudGraph — API client for all backend communication */

import type {
  AlertsResponse,
  EntityResponse,
  EntitySearchResponse,
  GraphResponse,
  CasesResponse,
  Case,
  CaseCreate,
  CaseUpdate,
  Severity,
  AlertStatus,
  FraudRing,
  InvestigationCase,
  ChecklistStatus,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/* --- Alerts --- */

export interface AlertFilters {
  page?: number;
  page_size?: number;
  severity?: Severity | "ALL";
  status?: AlertStatus | "ALL";
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export async function getAlerts(filters: AlertFilters = {}): Promise<AlertsResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.severity && filters.severity !== "ALL") params.set("severity", filters.severity);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  const qs = params.toString();
  return fetchJSON<AlertsResponse>(`/api/alerts${qs ? `?${qs}` : ""}`);
}

/* --- Entities --- */

export async function getEntity(entityId: string): Promise<EntityResponse> {
  return fetchJSON<EntityResponse>(`/api/entity/${encodeURIComponent(entityId)}`);
}

export async function searchEntities(q: string, page = 1): Promise<EntitySearchResponse> {
  const params = new URLSearchParams({ q, page: String(page) });
  return fetchJSON<EntitySearchResponse>(`/api/entity?${params}`);
}

/* --- Graph --- */

export interface GraphFilters {
  node_type?: string;
  limit?: number;
  fraud_only?: boolean;
}

export async function getGraph(filters: GraphFilters = {}): Promise<GraphResponse> {
  const params = new URLSearchParams();
  if (filters.node_type) params.set("node_type", filters.node_type);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.fraud_only) params.set("fraud_only", "true");
  const qs = params.toString();
  return fetchJSON<GraphResponse>(`/api/graph${qs ? `?${qs}` : ""}`);
}

/* --- Cases --- */

export async function getCases(
  status?: string,
  page = 1,
  page_size = 50
): Promise<CasesResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(page_size) });
  if (status) params.set("status", status);
  return fetchJSON<CasesResponse>(`/api/cases?${params}`);
}

export async function getCase(caseId: string): Promise<{ case: Case }> {
  return fetchJSON<{ case: Case }>(`/api/cases/${encodeURIComponent(caseId)}`);
}

export async function createCase(data: CaseCreate): Promise<{ case: Case }> {
  return fetchJSON<{ case: Case }>("/api/cases", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCase(caseId: string, data: CaseUpdate): Promise<{ case: Case }> {
  return fetchJSON<{ case: Case }>(`/api/cases/${encodeURIComponent(caseId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/* --- Rings --- */

export async function getRing(ringId: string): Promise<{ ring: FraudRing }> {
  return fetchJSON<{ ring: FraudRing }>(`/api/rings/${encodeURIComponent(ringId)}`);
}

export async function createRingCase(ringId: string): Promise<{ case: InvestigationCase }> {
  return fetchJSON<{ case: InvestigationCase }>(`/api/rings/${encodeURIComponent(ringId)}/case`, {
    method: "POST",
  });
}

/* --- Investigation Cases --- */

export async function getInvestigationCase(caseId: string): Promise<{ case: InvestigationCase }> {
  return fetchJSON<{ case: InvestigationCase }>(`/api/cases/${encodeURIComponent(caseId)}`);
}

export async function addCaseNote(
  caseId: string,
  content: string
): Promise<{ case: InvestigationCase }> {
  return fetchJSON<{ case: InvestigationCase }>(
    `/api/cases/${encodeURIComponent(caseId)}/notes`,
    { method: "POST", body: JSON.stringify({ content }) }
  );
}

export async function updateCaseStatus(
  caseId: string,
  status: string
): Promise<{ case: InvestigationCase }> {
  return fetchJSON<{ case: InvestigationCase }>(
    `/api/cases/${encodeURIComponent(caseId)}`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

export function downloadReferralPackage(caseId: string): void {
  const url = `${API}/api/cases/${encodeURIComponent(caseId)}/referral-package`;
  window.open(url, "_blank");
}

/* --- Checklist --- */

export async function updateChecklistItem(
  caseId: string,
  itemKey: string,
  status: ChecklistStatus,
  completedBy: string = "investigator",
  notes?: string
): Promise<{ case: InvestigationCase }> {
  return fetchJSON<{ case: InvestigationCase }>(
    `/api/cases/${encodeURIComponent(caseId)}/checklist/${encodeURIComponent(itemKey)}`,
    { method: "PATCH", body: JSON.stringify({ status, completed_by: completedBy, notes: notes ?? null }) }
  );
}

/* --- Review loop --- */

export async function submitForReview(
  caseId: string,
  reviewer: string = "senior_investigator"
): Promise<{ case: InvestigationCase }> {
  return fetchJSON<{ case: InvestigationCase }>(
    `/api/cases/${encodeURIComponent(caseId)}/submit-review`,
    { method: "POST", body: JSON.stringify({ reviewer }) }
  );
}

export async function approveCase(
  caseId: string
): Promise<{ case: InvestigationCase }> {
  return fetchJSON<{ case: InvestigationCase }>(
    `/api/cases/${encodeURIComponent(caseId)}/approve`,
    { method: "POST" }
  );
}

export async function returnCase(
  caseId: string,
  notes: string
): Promise<{ case: InvestigationCase }> {
  return fetchJSON<{ case: InvestigationCase }>(
    `/api/cases/${encodeURIComponent(caseId)}/return`,
    { method: "POST", body: JSON.stringify({ notes }) }
  );
}

/* --- WebSocket --- */

export function connectAlertWebSocket(onMessage: (alert: unknown) => void): WebSocket | null {
  if (typeof window === "undefined") return null;
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/alerts";
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {
      // ignore non-JSON messages
    }
  };
  return ws;
}

/* --- Analytics --- */

export async function getAnalyticsDashboard(): Promise<import("./types").DashboardResponse> {
  return fetchJSON<import("./types").DashboardResponse>("/api/analytics/dashboard");
}

export async function getAnalyticsOutcomes(): Promise<import("./types").OutcomesResponse> {
  return fetchJSON<import("./types").OutcomesResponse>("/api/analytics/outcomes");
}

export async function getAnalyticsFraudDistribution(): Promise<import("./types").FraudDistributionResponse> {
  return fetchJSON<import("./types").FraudDistributionResponse>("/api/analytics/fraud-distribution");
}

export async function getAnalyticsWorkload(): Promise<import("./types").WorkloadResponse> {
  return fetchJSON<import("./types").WorkloadResponse>("/api/analytics/investigator-workload");
}

export async function getAnalyticsCaseAging(): Promise<import("./types").CaseAgingResponse> {
  return fetchJSON<import("./types").CaseAgingResponse>("/api/analytics/case-aging");
}

/* --- SWR fetcher --- */

export const swrFetcher = <T>(path: string): Promise<T> => fetchJSON<T>(path);
