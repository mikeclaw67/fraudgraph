/* FraudGraph — Domain schema definitions for the Schema Switcher.
   Update when adding new fraud domains or changing entity models. */

export type DomainSchema = {
  id: "ppp" | "medicaid" | "procurement";
  name: string;
  subtitle: string;
  color: string;
  entityTypes: { name: string; icon: string; count: number }[];
  relationshipTypes: string[];
  ringExamples: { id: string; name: string; exposure: string; members: number }[];
  smokingGun: string;
};

export const SCHEMAS: DomainSchema[] = [
  {
    id: "ppp",
    name: "PPP / EIDL",
    subtitle: "Paycheck Protection Program & Economic Injury Disaster Loans",
    color: "#2196F3",
    entityTypes: [
      { name: "Borrower", icon: "👤", count: 52_340 },
      { name: "Business", icon: "🏢", count: 48_120 },
      { name: "Address", icon: "📍", count: 31_890 },
      { name: "Bank Account", icon: "🏦", count: 44_710 },
    ],
    relationshipTypes: [
      "APPLIED_FOR",
      "OWNED_BY",
      "REGISTERED_AT",
      "DEPOSITED_TO",
      "SHARED_ADDRESS",
      "SHARED_BANK_ACCOUNT",
    ],
    ringExamples: [
      { id: "R-1042", name: "South FL Shell Network", exposure: "$14.2M", members: 23 },
      { id: "R-1087", name: "TX Identity Factory", exposure: "$8.7M", members: 14 },
      { id: "R-1103", name: "NJ Address Cluster", exposure: "$6.1M", members: 11 },
      { id: "R-1201", name: "GA Payroll Ghost Ring", exposure: "$4.3M", members: 8 },
      { id: "R-1244", name: "CA Multi-EIN Scheme", exposure: "$3.8M", members: 9 },
    ],
    smokingGun:
      "23 businesses registered at the same residential address filed $14.2M in PPP loans within 72 hours — all depositing to 3 bank accounts controlled by one individual.",
  },
  {
    id: "medicaid",
    name: "Medicaid",
    subtitle: "Medicaid Provider Fraud & Phantom Billing Schemes",
    color: "#43A047",
    entityTypes: [
      { name: "Provider", icon: "🩺", count: 12_480 },
      { name: "Claim", icon: "📄", count: 87_340 },
      { name: "Billing Code", icon: "🔢", count: 4_210 },
      { name: "NPI", icon: "🪪", count: 11_890 },
      { name: "Address", icon: "📍", count: 9_760 },
    ],
    relationshipTypes: [
      "BILLED_BY",
      "TREATED_AT",
      "USES_CODE",
      "REGISTERED_NPI",
      "SHARED_ADDRESS",
      "SHARED_NPI",
    ],
    ringExamples: [
      { id: "M-2001", name: "Phantom Clinic Network — Detroit", exposure: "$22.6M", members: 18 },
      { id: "M-2034", name: "Upcoding Ring — South FL", exposure: "$11.4M", members: 7 },
      { id: "M-2078", name: "Patient Mill — Houston", exposure: "$8.9M", members: 12 },
      { id: "M-2112", name: "DME Ghost Billing — Atlanta", exposure: "$5.2M", members: 9 },
    ],
    smokingGun:
      "18 providers sharing 3 NPIs billed $22.6M in home health claims for patients with no visit records — 94% of claims occurred on weekends at addresses zoned as vacant lots.",
  },
  {
    id: "procurement",
    name: "Procurement",
    subtitle: "Federal Contract & Invoice Fraud Detection",
    color: "#FFB300",
    entityTypes: [
      { name: "Vendor", icon: "🏭", count: 8_940 },
      { name: "Contract", icon: "📑", count: 3_210 },
      { name: "Invoice", icon: "💵", count: 41_870 },
      { name: "Bank Account", icon: "🏦", count: 6_340 },
      { name: "Person", icon: "🕵️", count: 47 },
    ],
    relationshipTypes: [
      "AWARDED_TO",
      "INVOICED_BY",
      "PAID_TO",
      "SUBCONTRACTED",
      "SHARED_BANK_ACCOUNT",
      "SHARED_OFFICER",
    ],
    ringExamples: [
      { id: "IT-RING-001", name: "IT Kickback Cluster — GSA", exposure: "$9.0M", members: 5 },
      { id: "P-3001", name: "Bid Rigging Triad — DoD IT", exposure: "$34.1M", members: 6 },
      { id: "P-3045", name: "Invoice Inflation Ring — GSA", exposure: "$12.7M", members: 8 },
      { id: "P-3089", name: "Shell Vendor Carousel — VA", exposure: "$9.3M", members: 11 },
    ],
    smokingGun:
      "3 IT vendors with the same registered agent were awarded $9M in sole-source GSA contracts — all invoices routed through 2 bank accounts opened 48 hours before each award. 1 GSA contracting officer received $630K in wire transfers.",
  },
];
