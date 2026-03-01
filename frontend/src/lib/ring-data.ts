/* FraudGraph — Hardcoded mock data for 20 realistic PPP fraud rings */

import type { FraudRing, RingMember, RingType, RiskBreakdown } from "./types";

const FIRST_NAMES = [
  "Marcus", "Diana", "Robert", "Sarah", "James", "Patricia", "Michael", "Angela",
  "William", "Jennifer", "Thomas", "Elizabeth", "David", "Laura", "Steven", "Margaret",
  "Christopher", "Sophia", "Daniel", "Natasha", "Carlos", "Priya", "Ahmed", "Kenji",
  "Vladimir", "Rosa", "Dmitri", "Fatima", "Yusuf", "Mei", "Andre", "Camille",
  "Hector", "Irina", "Jamal", "Lena", "Omar", "Petra", "Quinn", "Sven",
];

const LAST_NAMES = [
  "Chen", "Reeves", "Kline", "Mitchell", "Ortega", "Volkov", "Torres", "Dubois",
  "Park", "Nakamura", "Garcia", "Warren", "Kim", "Petrov", "Huang", "O'Brien",
  "Singh", "Alvarez", "Rossi", "Okafor", "Martinez", "Patel", "Hassan", "Tanaka",
  "Popov", "Gutierrez", "Kozlov", "Rahman", "Ibrahim", "Zhang", "Foster", "Nguyen",
];

const BIZ_PREFIXES = [
  "Atlas", "Bright", "Cascade", "Delta", "Evergreen", "Frontier", "Global", "Harbor",
  "Ironclad", "Jade", "Keystone", "Lakeview", "Meridian", "Nova", "Olympus", "Prime",
  "Quick", "River", "Summit", "True", "United", "Vertex", "West", "Apex",
  "Blue", "Crest", "Dawn", "Eagle", "First", "Grand", "Heritage", "Insight",
];

const BIZ_SUFFIXES = [
  "Consulting LLC", "Services Inc", "Holdings Corp", "Solutions Group", "Enterprises LLC",
  "Capital LLC", "Logistics Inc", "Properties LLC", "Advisors Group", "Digital LLC",
  "Staffing Corp", "Management Inc", "Ventures LLC", "Partners Group", "Associates Inc",
];

const LENDERS = [
  "JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank", "US Bank",
  "PNC Financial", "Cross River Bank", "Celtic Bank", "Customers Bank", "Harvest Small Business",
];

const INVESTIGATORS = [
  "J. Morrison", "K. Pham", "R. Delgado", "S. Abernathy", "T. Washington",
  "M. Kowalski", "A. Friedman",
];

const RED_FLAGS: Record<RingType, string[]> = {
  ADDRESS_FARM: [
    "Shared address with multiple unrelated businesses",
    "Residential address used as business address",
    "Address does not match county commercial records",
    "Property records show single-family residence",
    "Multiple PPP applications filed from same suite number",
  ],
  ACCOUNT_CLUSTER: [
    "Shared bank routing number across unrelated entities",
    "Multiple PPP deposits routed to same account",
    "Account opened within 30 days of first PPP filing",
    "Account holder name does not match business name",
    "Rapid sequential deposits from multiple loan approvals",
  ],
  EIN_RECYCLER: [
    "EIN used on multiple PPP applications",
    "EIN does not match IRS Form 941 records",
    "Rapid sequential filings with same EIN",
    "EIN registered to different entity in IRS database",
    "Multiple businesses claim same EIN across states",
  ],
  STRAW_COMPANY: [
    "Zero employees reported on application",
    "Business age under 6 months at time of filing",
    "Maximum loan amount requested relative to payroll",
    "No matching quarterly tax returns (Form 941) on file",
    "Business registered at known virtual office address",
    "NAICS code inconsistent with stated business activity",
  ],
  THRESHOLD_GAMING: [
    "Loan amount within 2% of $150K review threshold",
    "Amount precisely calibrated to avoid enhanced due diligence",
    "Pattern consistent with threshold awareness",
    "Borrower has multiple loans each just below threshold",
    "Application amount revised downward before submission",
  ],
};

/* Deterministic pseudo-random for reproducible mock data */
function createRng(seed: number) {
  let s = seed;
  return {
    next(min: number, max: number): number {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return min + (s % (max - min + 1));
    },
    pick<T>(arr: readonly T[]): T {
      return arr[this.next(0, arr.length - 1)];
    },
  };
}

function generateMembers(ringId: string, ringType: RingType, count: number, seed: number): RingMember[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, i) => {
    const firstName = rng.pick(FIRST_NAMES);
    const lastName = rng.pick(LAST_NAMES);

    let loanAmount: number;
    if (ringType === "THRESHOLD_GAMING") {
      loanAmount = 147000 + rng.next(0, 2900);
    } else if (ringType === "STRAW_COMPANY") {
      loanAmount = 120000 + rng.next(0, 79000);
    } else {
      loanAmount = 45000 + rng.next(0, 155000);
    }

    const employeeCount = ringType === "STRAW_COMPANY" ? 0 : rng.next(1, 35);
    const businessAge = ringType === "STRAW_COMPANY" ? rng.next(1, 5) : rng.next(6, 84);
    const typeFlags = RED_FLAGS[ringType];
    const flagCount = rng.next(1, Math.min(3, typeFlags.length));
    const flags: string[] = [];
    for (let f = 0; f < flagCount; f++) {
      const flag = rng.pick(typeFlags);
      if (!flags.includes(flag)) flags.push(flag);
    }

    return {
      member_id: `${ringId}_m${String(i + 1).padStart(3, "0")}`,
      business_name: `${rng.pick(BIZ_PREFIXES)} ${rng.pick(BIZ_SUFFIXES)}`,
      ein: `${rng.next(10, 99)}-${String(rng.next(1000000, 9999999))}`,
      borrower_name: `${firstName} ${lastName}`,
      loan_amount: loanAmount,
      loan_date: `2020-${String(rng.next(4, 8)).padStart(2, "0")}-${String(rng.next(1, 28)).padStart(2, "0")}`,
      lender: rng.pick(LENDERS),
      status: rng.pick(["FUNDED", "FUNDED", "FUNDED", "UNDER_REVIEW", "FLAGGED"]),
      risk_score: 55 + rng.next(0, 44),
      notes: null,
      red_flags: flags,
      ssn_last4: String(rng.next(1000, 9999)),
      bank_account_last4: String(rng.next(1000, 9999)),
      program: rng.next(0, 3) === 0 ? "EIDL" : "PPP",
      employee_count: employeeCount,
      business_age_months: businessAge,
      all_businesses: [`${rng.pick(BIZ_PREFIXES)} ${rng.pick(BIZ_SUFFIXES)}`],
    };
  });
}

/* 20 hardcoded fraud rings with realistic PPP/EIDL data */
const RING_DEFINITIONS: {
  ring_id: string;
  ring_type: RingType;
  common_element: string;
  common_element_detail: string;
  member_count: number;
  total_exposure: number;
  avg_risk_score: number;
  status: "NEW" | "DETECTED" | "UNDER_REVIEW" | "CASE_OPENED" | "REFERRED" | "CLOSED" | "DISMISSED";
  assigned_to: string | null;
  detected_at: string;
  riskBreakdown?: RiskBreakdown;
}[] = [
  {
    ring_id: "ring_001",
    ring_type: "ADDRESS_FARM",
    common_element: "123 Main St, Milwaukee WI 53202",
    common_element_detail: "47 businesses filed PPP applications from the same address. Property records show a single-family 1,200 sq ft residence. No commercial zoning permit on file.",
    member_count: 47,
    total_exposure: 6820000,
    avg_risk_score: 94,
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-02-28T08:14:00Z",
    riskBreakdown: { rules: 88, ml: 78, graph: 74, firedRules: ["ADDR_REUSE", "STRAW_CO", "ACCOUNT_SHARE"], mlLabel: "Isolation Forest anomaly" },
  },
  {
    ring_id: "ring_002",
    ring_type: "ADDRESS_FARM",
    common_element: "2200 Peachtree Rd NE, Atlanta GA 30309",
    common_element_detail: "52 businesses share this address — a UPS Store mailbox location. All applications filed within a 6-week window. No legitimate commercial tenants.",
    member_count: 52,
    total_exposure: 7540000,
    avg_risk_score: 91,
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-02-27T14:32:00Z",
    riskBreakdown: { rules: 82, ml: 76, graph: 72, firedRules: ["ADDR_REUSE", "STRAW_CO", "ACCOUNT_SHARE"], mlLabel: "Isolation Forest anomaly" },
  },
  {
    ring_id: "ring_003",
    ring_type: "ACCOUNT_CLUSTER",
    common_element: "Routing #072403473, Acct ending 8291",
    common_element_detail: "31 PPP loans deposited into the same bank account at Fifth Third Bank. Account opened 2 weeks before first PPP application. Account holder is not listed as owner on any application.",
    member_count: 31,
    total_exposure: 4530000,
    avg_risk_score: 89,
    status: "UNDER_REVIEW",
    assigned_to: "J. Morrison",
    detected_at: "2025-02-25T11:07:00Z",
    riskBreakdown: { rules: 78, ml: 68, graph: 55, firedRules: ["EIN_REUSE", "STRAW_CO"], mlLabel: "Isolation Forest anomaly" },
  },
  {
    ring_id: "ring_004",
    ring_type: "ADDRESS_FARM",
    common_element: "4501 Industrial Pkwy, Detroit MI 48210",
    common_element_detail: "38 businesses registered at this address. County records show a vacant warehouse. No active business licenses at this location since 2018.",
    member_count: 38,
    total_exposure: 5510000,
    avg_risk_score: 92,
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-02-26T09:45:00Z",
    riskBreakdown: { rules: 62, ml: 74, graph: 82, firedRules: ["ACCOUNT_SHARE", "NEW_EIN"], mlLabel: "Isolation Forest anomaly" },
  },
  {
    ring_id: "ring_005",
    ring_type: "ADDRESS_FARM",
    common_element: "1100 S Miami Ave #3200, Miami FL 33130",
    common_element_detail: "41 businesses filed from Suite 3200 — a Regus virtual office. None have physical presence at this address. IP analysis shows applications submitted from 3 distinct devices.",
    member_count: 41,
    total_exposure: 5950000,
    avg_risk_score: 90,
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-02-24T16:22:00Z",
    riskBreakdown: { rules: 55, ml: 48, graph: 35, firedRules: ["THRESHOLD_GAME", "NEW_EIN"], mlLabel: "Isolation Forest anomaly" },
  },
  {
    ring_id: "ring_006",
    ring_type: "ADDRESS_FARM",
    common_element: "555 Market St Ste 200, San Francisco CA 94105",
    common_element_detail: "33 businesses share this co-working space address. All registered within 60 days of PPP launch. NAICS codes span 14 different industries from the same suite.",
    member_count: 33,
    total_exposure: 4790000,
    avg_risk_score: 87,
    status: "UNDER_REVIEW",
    assigned_to: "K. Pham",
    detected_at: "2025-02-22T10:18:00Z",
  },
  {
    ring_id: "ring_007",
    ring_type: "ACCOUNT_CLUSTER",
    common_element: "Routing #031201467, Acct ending 5543",
    common_element_detail: "22 PPP loans from unrelated businesses deposited to the same account at PNC Bank. Total deposits exceed $3M. Account flagged by FinCEN SAR in Q3 2020.",
    member_count: 22,
    total_exposure: 3180000,
    avg_risk_score: 86,
    status: "UNDER_REVIEW",
    assigned_to: "R. Delgado",
    detected_at: "2025-02-20T13:55:00Z",
  },
  {
    ring_id: "ring_008",
    ring_type: "ACCOUNT_CLUSTER",
    common_element: "Routing #061092387, Acct ending 7104",
    common_element_detail: "27 PPP disbursements to a single Wells Fargo account. Account holder has no matching SSN in PPP database. Funds transferred out within 48 hours of each deposit.",
    member_count: 27,
    total_exposure: 3920000,
    avg_risk_score: 93,
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-02-23T07:30:00Z",
  },
  {
    ring_id: "ring_009",
    ring_type: "EIN_RECYCLER",
    common_element: "EIN 84-3729104",
    common_element_detail: "12 separate PPP applications reference this EIN. IRS records show EIN registered to a dissolved LLC in Nevada. Applications filed across 4 states using different business names.",
    member_count: 12,
    total_exposure: 1740000,
    avg_risk_score: 88,
    status: "REFERRED",
    assigned_to: "S. Abernathy",
    detected_at: "2025-02-15T09:12:00Z",
  },
  {
    ring_id: "ring_010",
    ring_type: "EIN_RECYCLER",
    common_element: "EIN 27-8391054",
    common_element_detail: "18 applications share this EIN. The EIN was originally issued to a defunct restaurant in New Jersey. Each application claims a different industry and address.",
    member_count: 18,
    total_exposure: 2610000,
    avg_risk_score: 85,
    status: "UNDER_REVIEW",
    assigned_to: "T. Washington",
    detected_at: "2025-02-18T14:40:00Z",
  },
  {
    ring_id: "ring_011",
    ring_type: "EIN_RECYCLER",
    common_element: "EIN 91-2048573",
    common_element_detail: "7 PPP applications use this Washington state EIN. IRS Form 941 records show zero quarterly filings for the past 3 years. All 7 applications requested maximum allowable amount.",
    member_count: 7,
    total_exposure: 1020000,
    avg_risk_score: 82,
    status: "DISMISSED",
    assigned_to: "M. Kowalski",
    detected_at: "2025-02-10T11:28:00Z",
  },
  {
    ring_id: "ring_012",
    ring_type: "EIN_RECYCLER",
    common_element: "EIN 58-6204831",
    common_element_detail: "24 applications reference this Georgia-issued EIN. Original entity was a non-profit that lost tax-exempt status in 2019. Applications span PPP rounds 1 and 2.",
    member_count: 24,
    total_exposure: 3480000,
    avg_risk_score: 87,
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-02-21T08:55:00Z",
  },
  {
    ring_id: "ring_013",
    ring_type: "STRAW_COMPANY",
    common_element: "Zero employees, max loan, <6mo old",
    common_element_detail: "8 businesses with identical characteristics: 0 reported employees, incorporated within 90 days of PPP launch, and each requested maximum loan amounts. All filed through the same lender.",
    member_count: 8,
    total_exposure: 1190000,
    avg_risk_score: 95,
    status: "REFERRED",
    assigned_to: "J. Morrison",
    detected_at: "2025-02-12T15:33:00Z",
  },
  {
    ring_id: "ring_014",
    ring_type: "STRAW_COMPANY",
    common_element: "Same-day incorporation, same agent",
    common_element_detail: "11 LLCs incorporated on the same day through the same registered agent in Delaware. All filed PPP applications within 72 hours of incorporation. Zero revenue history.",
    member_count: 11,
    total_exposure: 1620000,
    avg_risk_score: 96,
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-02-26T12:15:00Z",
  },
  {
    ring_id: "ring_015",
    ring_type: "STRAW_COMPANY",
    common_element: "Identical NAICS 541511, virtual offices",
    common_element_detail: "14 companies all claiming NAICS 541511 (Custom Computer Programming) with 0 employees, registered at virtual office addresses across 5 states. No GitHub, LinkedIn, or web presence for any.",
    member_count: 14,
    total_exposure: 2030000,
    avg_risk_score: 91,
    status: "UNDER_REVIEW",
    assigned_to: "A. Friedman",
    detected_at: "2025-02-19T10:42:00Z",
  },
  {
    ring_id: "ring_016",
    ring_type: "THRESHOLD_GAMING",
    common_element: "$147K–$149.9K loan amounts",
    common_element_detail: "15 applications with loan amounts between $147,000 and $149,900 — all just below the $150,000 threshold that triggers enhanced due diligence review. Statistical probability: <0.001%.",
    member_count: 15,
    total_exposure: 2230000,
    avg_risk_score: 83,
    status: "UNDER_REVIEW",
    assigned_to: "K. Pham",
    detected_at: "2025-02-17T09:20:00Z",
  },
  {
    ring_id: "ring_017",
    ring_type: "THRESHOLD_GAMING",
    common_element: "$149,000 exact amount pattern",
    common_element_detail: "9 applications all requesting exactly $149,000. All filed through the same lender branch in Houston. 6 of 9 borrowers have prior fraud convictions.",
    member_count: 9,
    total_exposure: 1341000,
    avg_risk_score: 79,
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-02-25T16:48:00Z",
  },
  {
    ring_id: "ring_018",
    ring_type: "THRESHOLD_GAMING",
    common_element: "$148.5K–$149.9K, same IP block",
    common_element_detail: "6 applications from the same /24 IP address block, all requesting $148,500–$149,900. Digital fingerprinting suggests the same browser and device submitted all applications.",
    member_count: 6,
    total_exposure: 894000,
    avg_risk_score: 76,
    status: "DISMISSED",
    assigned_to: "R. Delgado",
    detected_at: "2025-02-08T14:05:00Z",
  },
  {
    ring_id: "ring_019",
    ring_type: "ACCOUNT_CLUSTER",
    common_element: "Routing #053201829, Acct ending 3362",
    common_element_detail: "16 PPP disbursements to a single SunTrust account. Account opened by a non-applicant 5 days before first loan approval. All 16 businesses share the same registered agent.",
    member_count: 16,
    total_exposure: 2320000,
    avg_risk_score: 84,
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-02-23T11:37:00Z",
  },
  {
    ring_id: "ring_020",
    ring_type: "ADDRESS_FARM",
    common_element: "789 Commerce Dr Ste 100, Houston TX 77001",
    common_element_detail: "29 businesses registered at this address. Street view shows a single-room barbershop. Tax records show property assessed at $45,000. No commercial lease on file.",
    member_count: 29,
    total_exposure: 4210000,
    avg_risk_score: 88,
    status: "REFERRED",
    assigned_to: "T. Washington",
    detected_at: "2025-02-14T08:50:00Z",
  },
];

export const FRAUD_RINGS: FraudRing[] = RING_DEFINITIONS.map((def, idx) => ({
  ...def,
  updated_at: def.detected_at,
  members: generateMembers(def.ring_id, def.ring_type, def.member_count, (idx + 1) * 7919),
}));

export { INVESTIGATORS };
