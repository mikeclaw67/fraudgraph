/* FraudGraph — Domain schema definitions for the Schema Switcher.
   S8: Added state-specific PPP schemas (California, Minnesota).
   Update when adding new fraud domains or changing entity models. */

export type DomainSchema = {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  entityTypes: { name: string; icon: string; count: number }[];
  relationshipTypes: string[];
  ringExamples: { id: string; name: string; exposure: string; members: number }[];
  smokingGun: string;
  stateFilter?: string; // Optional state filter for PPP schemas
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
    id: "ppp-california",
    name: "PPP-California",
    subtitle: "SBA Crackdown — 111,620 borrowers suspended, $8.6B exposure",
    color: "#E53935",
    stateFilter: "CA",
    entityTypes: [
      { name: "Borrower", icon: "👤", count: 28_450 },
      { name: "Business", icon: "🏢", count: 26_120 },
      { name: "Address", icon: "📍", count: 18_340 },
      { name: "Bank Account", icon: "🏦", count: 22_890 },
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
      { id: "CA-001", name: "Irvine Address Farm", exposure: "$22.4M", members: 11 },
      { id: "CA-002", name: "Inglewood Shell Network", exposure: "$16.4M", members: 9 },
      { id: "CA-003", name: "Fullerton Straw Company Ring", exposure: "$14.8M", members: 8 },
      { id: "CA-004", name: "Pleasanton Multi-Entity Cluster", exposure: "$27.7M", members: 7 },
      { id: "CA-005", name: "Fremont Account Farm", exposure: "$26.0M", members: 7 },
    ],
    smokingGun:
      "11 businesses at 2532 Dupont Dr, Irvine CA filed $22.4M in PPP loans — all within 48 hours, using 3 EINs registered in the previous 90 days. Real SBA data.",
  },
  {
    id: "ppp-minnesota",
    name: "PPP-Minnesota",
    subtitle: "Feeding Our Future — $250M+ USDA fraud scheme",
    color: "#7B1FA2",
    stateFilter: "MN",
    entityTypes: [
      { name: "Borrower", icon: "👤", count: 4_120 },
      { name: "Business", icon: "🏢", count: 3_890 },
      { name: "Address", icon: "📍", count: 2_450 },
      { name: "Bank Account", icon: "🏦", count: 3_210 },
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
      { id: "MN-001", name: "Minneapolis Address Cluster", exposure: "$4.2M", members: 6 },
      { id: "MN-002", name: "St. Paul Shell Network", exposure: "$3.1M", members: 4 },
      { id: "MN-003", name: "Hennepin County Ring", exposure: "$2.8M", members: 5 },
    ],
    smokingGun:
      "6 food distribution nonprofits at the same Minneapolis address claimed $4.2M in COVID relief — matching pattern from the $250M Feeding Our Future fraud case.",
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
