/* FraudGraph — Mock data for frontend development without backend */

import type { Alert, Case, Entity, GraphNode, GraphEdge } from "./types";

const FRAUD_TYPES = ["ADDR_REUSE", "EIN_REUSE", "STRAW_CO", "THRESHOLD_GAME", "ACCOUNT_SHARE", "NEW_EIN"];
const NAMES = [
  "Marcus Chen", "Diana Reeves", "Robert Kline", "Sarah Mitchell", "James Ortega",
  "Patricia Volkov", "Michael Torres", "Angela Dubois", "William Park", "Jennifer Nakamura",
  "Thomas Garcia", "Elizabeth Warren", "David Kim", "Laura Petrov", "Steven Huang",
  "Margaret O'Brien", "Christopher Singh", "Sophia Alvarez", "Daniel Rossi", "Natasha Okafor",
];
const BUSINESSES = [
  "Atlas Consulting LLC", "Brightpath Services", "Cascade Industries", "Delta Solutions Group",
  "Evergreen Holdings", "Frontier Tech Inc", "Global Ventures Corp", "Harbor Capital LLC",
  "Ironclad Security", "Jade Partners Group", "Keystone Logistics", "Lakeview Properties",
  "Meridian Advisors", "NovaStar Enterprises", "Olympus Digital LLC", "PrimeEdge Solutions",
  "QuickBridge Capital", "Riverstone Holdings", "Summit Point LLC", "TrueNorth Staffing",
];
const STATES = ["CA", "TX", "FL", "NY", "IL", "PA", "OH", "GA", "NC", "MI"];
const LENDERS = ["JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank", "US Bank", "PNC Financial"];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: readonly T[]): T { return arr[rand(0, arr.length - 1)]; }

function severity(score: number) {
  if (score >= 80) return "CRITICAL" as const;
  if (score >= 60) return "HIGH" as const;
  if (score >= 40) return "MEDIUM" as const;
  return "LOW" as const;
}

function triageAction(score: number) {
  if (score >= 80) return "ESCALATE" as const;
  if (score >= 70) return "REVIEW_GRAPH" as const;
  if (score >= 40) return "CROSS_REFERENCE" as const;
  if (score >= 20) return "CHECK_DOCUMENTS" as const;
  return "AUTO_DISMISS" as const;
}

const statuses = ["NEW", "REVIEWING", "ESCALATED", "DISMISSED", "RESOLVED"] as const;

export function generateMockAlerts(count = 50): Alert[] {
  return Array.from({ length: count }, (_, i) => {
    const score = rand(15, 98);
    const numRules = rand(1, 3);
    const rules = Array.from({ length: numRules }, () => pick(FRAUD_TYPES));
    const date = new Date(2025, rand(0, 11), rand(1, 28), rand(0, 23), rand(0, 59));
    return {
      alert_id: `alert_${String(i + 1).padStart(4, "0")}`,
      entity_id: `borrower_${String(rand(1, 500)).padStart(5, "0")}`,
      entity_type: "Borrower",
      risk_score: score,
      severity: severity(score),
      fired_rules: [...new Set(rules)],
      status: pick(statuses),
      triage_action: triageAction(score),
      created_at: date.toISOString(),
      details: { weights: { rules: 0.4, ml: 0.35, graph: 0.25 } },
      assigned_to: Math.random() > 0.6 ? pick(["analyst_jane", "analyst_john", "analyst_sarah"]) : null,
      case_id: Math.random() > 0.8 ? `case_${rand(1, 20)}` : null,
    };
  }).sort((a, b) => b.risk_score - a.risk_score);
}

export function generateMockEntity(id: string): Entity {
  const name = pick(NAMES);
  const business = pick(BUSINESSES);
  const state = pick(STATES);
  const score = rand(20, 95);
  const numAlerts = rand(1, 5);
  return {
    entity_id: id,
    entity_type: "Borrower",
    attributes: {
      borrower_name: name,
      business_name: business,
      ein: `${rand(10, 99)}-${rand(1000000, 9999999)}`,
      business_address: `${rand(100, 9999)} ${pick(["Main St", "Oak Ave", "Commerce Blvd", "Industrial Pkwy", "Enterprise Dr"])}`,
      business_city: pick(["San Francisco", "Houston", "Miami", "New York", "Chicago"]),
      business_state: state,
      employee_count: rand(0, 50),
      business_age_months: rand(1, 120),
      loan_program: pick(["PPP", "EIDL"]),
      loan_amount: rand(10000, 200000),
      loan_date: `2020-${String(rand(4, 12)).padStart(2, "0")}-${String(rand(1, 28)).padStart(2, "0")}`,
      lender_name: pick(LENDERS),
      naics_code: String(rand(100000, 999999)),
      industry: pick(["Software", "Construction", "Healthcare", "Retail", "Food Service", "Transportation"]),
    },
    alerts: generateMockAlerts(numAlerts).map(a => ({ ...a, entity_id: id })),
    alert_count: numAlerts,
    connections: {
      business_ein: `${rand(10, 99)}-${rand(1000000, 9999999)}`,
      bank_routing: String(rand(10000000, 99999999)),
      address: `${rand(100, 9999)} Main St, ${pick(["San Francisco", "Houston", "Miami"])}, ${state}`,
    },
  };
}

export function generateMockGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const colors: Record<string, string> = { Borrower: "#6366f1", Business: "#10b981", Address: "#f59e0b", BankAccount: "#ef4444" };

  for (let i = 0; i < 30; i++) {
    const id = `borrower_${String(i + 1).padStart(5, "0")}`;
    nodes.push({ id, label: pick(NAMES), type: "Borrower", size: rand(4, 12), color: colors.Borrower });
    const bizId = `biz_${rand(1000, 9999)}`;
    nodes.push({ id: bizId, label: pick(BUSINESSES), type: "Business", size: rand(4, 8), color: colors.Business });
    edges.push({ id: `e${edges.length}`, source: id, target: bizId, type: "BORROWER_OWNS_BUSINESS" });

    if (i % 5 === 0) {
      const addrId = `addr_${rand(100, 999)}`;
      if (!nodes.find(n => n.id === addrId)) {
        nodes.push({ id: addrId, label: `${rand(100, 9999)} Main St`, type: "Address", size: 5, color: colors.Address });
      }
      edges.push({ id: `e${edges.length}`, source: bizId, target: addrId, type: "BUSINESS_LOCATED_AT" });
    }
    if (i % 7 === 0) {
      const bankId = `bank_${rand(10, 50)}`;
      if (!nodes.find(n => n.id === bankId)) {
        nodes.push({ id: bankId, label: `Routing: ${rand(10000000, 99999999)}`, type: "BankAccount", size: 5, color: colors.BankAccount });
      }
      edges.push({ id: `e${edges.length}`, source: bizId, target: bankId, type: "APPLICATION_DEPOSITED_TO" });
    }
  }
  // Create some shared-address fraud clusters
  const sharedAddr = `addr_shared_1`;
  nodes.push({ id: sharedAddr, label: "1234 Fraud Ave, Miami", type: "Address", size: 10, color: "#ef4444" });
  for (let i = 0; i < 5; i++) {
    const bizId = `biz_fraud_${i}`;
    const borrowerId = `borrower_fraud_${i}`;
    nodes.push({ id: borrowerId, label: pick(NAMES), type: "Borrower", size: 8, color: "#ef4444" });
    nodes.push({ id: bizId, label: pick(BUSINESSES), type: "Business", size: 6, color: "#ef4444" });
    edges.push({ id: `e${edges.length}`, source: borrowerId, target: bizId, type: "BORROWER_OWNS_BUSINESS" });
    edges.push({ id: `e${edges.length}`, source: bizId, target: sharedAddr, type: "BUSINESS_LOCATED_AT" });
  }
  return { nodes, edges };
}

const CASE_STATUSES = ["OPEN", "IN_REVIEW", "ESCALATED", "RESOLVED"] as const;

export function generateMockCases(count = 20): Case[] {
  return Array.from({ length: count }, (_, i) => {
    const status = pick(CASE_STATUSES);
    const created = new Date(2025, rand(0, 11), rand(1, 28));
    const updated = new Date(created.getTime() + rand(0, 14) * 86400000);
    return {
      case_id: `case_${String(i + 1).padStart(3, "0")}`,
      title: `${pick(["Address Farm", "EIN Recycling", "Straw Company", "Threshold Gaming", "Account Sharing"])} Ring #${i + 1}`,
      description: `Investigation into suspected ${pick(["address reuse", "EIN recycling", "straw company", "threshold gaming"])} fraud pattern`,
      status,
      priority: pick(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const),
      assigned_to: pick(["Jane Doe", "John Smith", "Sarah Chen", "Michael Park", null]),
      fraud_type: pick(FRAUD_TYPES),
      alert_ids: Array.from({ length: rand(1, 5) }, () => `alert_${String(rand(1, 100)).padStart(4, "0")}`),
      total_exposure: rand(50000, 500000),
      created_at: created.toISOString(),
      updated_at: updated.toISOString(),
      audit_trail: [
        { action: "CASE_CREATED", actor: pick(["analyst_jane", "analyst_john"]), timestamp: created.toISOString(), details: `Case created with ${rand(1, 5)} alerts` },
        ...(status !== "OPEN" ? [{ action: "STATUS_CHANGED", actor: pick(["analyst_jane", "analyst_john"]), timestamp: updated.toISOString(), details: `Status changed to ${status}` }] : []),
      ],
    };
  });
}
