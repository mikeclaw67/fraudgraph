/* FraudGraph — Global state management with Zustand */

import { create } from "zustand";

interface AppState {
  schema: "ppp_loans" | "medicaid" | "procurement";
  setSchema: (schema: AppState["schema"]) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  schema: "ppp_loans",
  setSchema: (schema) => set({ schema }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  selectedEntityId: null,
  setSelectedEntityId: (id) => set({ selectedEntityId: id }),
}));

/* Schema display labels for the generalization demo */
export const SCHEMA_LABELS: Record<AppState["schema"], { name: string; entity: string; amount: string; id: string }> = {
  ppp_loans: { name: "PPP / EIDL Loans", entity: "Borrower", amount: "Loan Amount", id: "Borrower ID" },
  medicaid: { name: "Medicaid Claims", entity: "Provider", amount: "Claim Amount", id: "Provider NPI" },
  procurement: { name: "Procurement Contracts", entity: "Contractor", amount: "Contract Value", id: "Contractor ID" },
};
