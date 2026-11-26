import { banking, railway, ssc, state } from "./questions";
import type { FreeMock } from "./scoring";

// Twelve units per mark keeps thirds and quarters exact until display.
export const FREE_MOCKS: FreeMock[] = [
  { id: "ssc-cgl", name: "SSC CGL Tier I", group: "SSC", minutes: 15, correctUnits: 24, penaltyUnits: 6, penaltyLabel: "−0.5", catalogue: "/category/ssc", questions: ssc },
  { id: "rrb-ntpc", name: "RRB NTPC Graduate CBT 1", group: "Railways", minutes: 18, correctUnits: 12, penaltyUnits: 4, penaltyLabel: "−⅓", catalogue: "/category/railways", questions: railway },
  { id: "ibps-rrb-clerk", name: "IBPS RRB Office Assistant Prelims", group: "Banking", minutes: 15, correctUnits: 12, penaltyUnits: 3, penaltyLabel: "−0.25", catalogue: "/category/banking", questions: banking },
  { id: "rajasthan-cet", name: "Rajasthan CET Graduation", group: "State Exams", minutes: 20, correctUnits: 24, penaltyUnits: 0, penaltyLabel: "0", catalogue: "/category/rajasthan", questions: state },
];
