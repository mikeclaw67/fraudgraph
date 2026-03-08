/* FraudGraph — Ring-first type definitions for fraud investigation platform */

export type RingType = "ADDRESS_FARM" | "ACCOUNT_CLUSTER" | "EIN_RECYCLER" | "STRAW_COMPANY" | "THRESHOLD_GAMING";
export type RingStatus = "NEW" | "DETECTED" | "UNDER_REVIEW" | "CASE_OPENED" | "REFERRED" | "CLOSED" | "DISMISSED";
export type CaseStatus = "OPEN" | "UNDER_REVIEW" | "REFERRED_TO_DOJ" | "CLOSED";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TriageTier = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type Schema = "ppp_loans" | "medicaid" | "procurement";

export interface RingMember {
  member_id: string;
  business_name: string;
  ein: string;
  borrower_name: string;
  loan_amount: number;
  loan_date: string;
  lender: string;
  status: string;
  risk_score: number;
  notes: string | null;
  red_flags: string[];
  ssn_last4: string;
  bank_account_last4: string;
  program: string;
  employee_count: number;
  business_age_months: number;
  all_businesses: string[];
}

export interface RiskBreakdown {
  rules: number;
  ml: number;
  graph: number;
  firedRules: string[];
  mlLabel: string;
}

export interface FraudRing {
  ring_id: string;
  ring_type: RingType;
  common_element: string;
  common_element_detail: string;
  members: RingMember[];
  member_count: number;
  total_exposure: number;
  avg_risk_score: number;
  status: RingStatus;
  assigned_to: string | null;
  detected_at: string;
  updated_at: string;
  risk_breakdown?: RiskBreakdown;
  case_id?: string | null;
  triageTier?: TriageTier;
  autoAssigned?: boolean;
  autoCaseId?: string | null;
}

export interface CaseNote {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface EvidenceItem {
  id: string;
  label: string;
  checked: boolean;
  auto_populated: boolean;
}

export type ChecklistStatus = "PENDING" | "COMPLETE" | "NA";
export type ReviewStatus = "NONE" | "UNDER_REVIEW" | "APPROVED" | "RETURNED";

export interface ChecklistItem {
  item_key: string;
  label: string;
  required: boolean;
  status: ChecklistStatus;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface AuditEntry {
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

export interface InvestigationCase {
  case_id: string;
  ring_type: RingType;
  ring_ids: string[];
  common_element: string;
  member_count: number;
  total_exposure: number;
  investigator: string | null;
  status: CaseStatus;
  doj_status: string | null;
  last_updated: string;
  created_at: string;
  notes: CaseNote[];
  evidence_checklist: EvidenceItem[];
  audit_trail: AuditEntry[];
  reviewer?: string | null;
  review_status?: ReviewStatus;
  review_notes?: string | null;
  sar_filed?: boolean;
  checklist?: ChecklistItem[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  size: number;
  color: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface AnalyticsData {
  total_rings: number;
  unreviewed: number;
  in_progress: number;
  total_exposure: number;
  referral_rate: number;
  avg_ring_size: number;
  detections_over_time: { date: string; count: number; resolved: number }[];
  rings_by_type: { type: string; count: number; exposure: number }[];
  risk_distribution: { range: string; count: number }[];
  state_breakdown: { state: string; rings: number; exposure: number }[];
}

/* Legacy types — kept for backward compatibility with old pages */

export type AlertStatus = "NEW" | "REVIEWING" | "ESCALATED" | "DISMISSED" | "RESOLVED";

export interface Alert {
  alert_id: string;
  entity_id: string;
  entity_type: string;
  risk_score: number;
  severity: Severity;
  fired_rules: string[];
  status: AlertStatus;
  triage_action: string;
  created_at: string;
  details: Record<string, unknown>;
  assigned_to: string | null;
  case_id: string | null;
}

export interface Entity {
  entity_id: string;
  entity_type: string;
  attributes: Record<string, unknown>;
  alerts: Alert[];
  alert_count: number;
  connections: Record<string, string>;
}

export interface Case {
  case_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  fraud_type: string;
  alert_ids: string[];
  total_exposure: number;
  created_at: string;
  updated_at: string;
  audit_trail: AuditEntry[];
}

export interface AlertsResponse {
  alerts: Alert[];
  pagination: { page: number; page_size: number; total: number };
}

export interface EntityResponse {
  entity: Entity;
}

export interface EntitySearchResponse {
  entities: Entity[];
  pagination: { page: number; page_size: number; total: number };
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CasesResponse {
  cases: Case[];
  pagination: { page: number; page_size: number; total: number };
}

export interface CaseCreate {
  title: string;
  description?: string;
  ring_ids?: string[];
  priority?: string;
}

export interface CaseUpdate {
  status?: string;
  assigned_to?: string | null;
  notes?: string;
}

/* ── Analytics API response types ─────────────────────────────────── */

export interface DashboardKpi {
  totalRingsDetected: number;
  totalExposure: number;
  casesReferred: number;
  avgDaysToTriage: number;
}

export interface PipelineFunnel {
  detected: number;
  reviewed: number;
  caseOpened: number;
  referred: number;
}

export interface WeeklyDetection {
  week: string;
  count: number;
}

export interface GeoEntry {
  exposure: number;
  rings: number;
}

export interface DashboardResponse {
  kpi: DashboardKpi;
  exposureByType: Record<string, number>;
  weeklyDetections: WeeklyDetection[];
  pipelineFunnel: PipelineFunnel;
  geographicDistribution: Record<string, GeoEntry>;
}

export interface OutcomesAssumptions {
  recoveryRate: number;
  convictionRate: number;
  annualPerInvestigatorCost: number;
}

export interface OutcomesResponse {
  convictions: number;
  convictionRate: number;
  expectedRecoveries: number;
  referralRate: number;
  investigationCost: number;
  roi: number;
  costPerCase: number;
  avgDaysToReferral: number;
  period: string;
  assumptions: OutcomesAssumptions;
}

export interface FraudDomainEntry {
  exposure: number;
  percentage: number;
  rings: number;
}

export interface SeverityEntry {
  rings: number;
  exposure: number;
}

export interface FraudDistributionResponse {
  byType: Record<string, FraudDomainEntry>;
  bySeverity: Record<string, SeverityEntry>;
}

export interface InvestigatorData {
  name: string;
  role: string;
  openCases: number;
  totalExposure: number;
  estimatedRoi: number;
  caseReferrals: number;
  avgDaysToReferral: number;
}

export interface TeamCapacity {
  used: number;
  max: number;
  utilizationPercent: number;
}

export interface WorkloadResponse {
  investigators: InvestigatorData[];
  teamCapacity: TeamCapacity;
}

export interface AgingBucket {
  count: number;
  severity: string;
  totalExposure?: number;
}

export interface CaseBlocker {
  caseId: string;
  title: string;
  exposure: number;
  daysAged: number;
  reason: string;
}

export interface CaseAgingResponse {
  byStatus: {
    OPEN: Record<string, AgingBucket>;
    UNDER_REVIEW: Record<string, AgingBucket>;
  };
  topBlockers: CaseBlocker[];
}
