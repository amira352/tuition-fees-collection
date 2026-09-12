/**
 * Mock data for the institution EPP (instalment) Plans page.
 *
 * The real backend (POST /api/epp, GET /api/epp/quotes) only lets
 * back_office/admin convert one already-settled, full, card payment into an
 * instalment plan with the bank — there's no "list my institution's EPP
 * plans" endpoint for the institution role. This is illustrative until
 * product/backend define what institutions should actually see here.
 */

import { CHART_COLORS } from "./dashboardData";

const TENOR_COLORS = {
  3: CHART_COLORS.slate,
  6: CHART_COLORS.amber,
  12: CHART_COLORS.teal,
  18: CHART_COLORS.navy,
  24: CHART_COLORS.green,
};

const STATUS_COLORS = {
  active: CHART_COLORS.navy,
  completed: CHART_COLORS.green,
  overdue: "#c94b4b",
};

export const eppPlans = [
  { id: 1, student: "Youssef Aly", feeType: "Tuition", principal: 24_000, tenorMonths: 12, monthlyInstalment: 2_150, annualRate: 14.5, startDate: "2026-02-01", installmentsPaid: 7, status: "active" },
  { id: 2, student: "Mariam Ahmed", feeType: "Tuition", principal: 18_000, tenorMonths: 6, monthlyInstalment: 3_150, annualRate: 13.5, startDate: "2026-05-01", installmentsPaid: 6, status: "completed" },
  { id: 3, student: "Seif El-Din", feeType: "Bus Transport", principal: 6_000, tenorMonths: 3, monthlyInstalment: 2_100, annualRate: 12, startDate: "2026-07-01", installmentsPaid: 1, status: "overdue" },
  { id: 4, student: "Fatma Hassan", feeType: "Tuition", principal: 32_000, tenorMonths: 18, monthlyInstalment: 1_980, annualRate: 15, startDate: "2025-11-01", installmentsPaid: 10, status: "active" },
  { id: 5, student: "Omar Khaled", feeType: "Books & Lab", principal: 9_000, tenorMonths: 6, monthlyInstalment: 1_580, annualRate: 13, startDate: "2026-04-01", installmentsPaid: 6, status: "completed" },
  { id: 6, student: "Nour Sami", feeType: "Tuition", principal: 45_000, tenorMonths: 24, monthlyInstalment: 2_150, annualRate: 16, startDate: "2025-09-01", installmentsPaid: 12, status: "active" },
  { id: 7, student: "Karim Adel", feeType: "Activities", principal: 4_200, tenorMonths: 3, monthlyInstalment: 1_470, annualRate: 12, startDate: "2026-08-01", installmentsPaid: 0, status: "overdue" },
  { id: 8, student: "Laila Farouk", feeType: "Tuition", principal: 21_000, tenorMonths: 12, monthlyInstalment: 1_880, annualRate: 14, startDate: "2026-01-01", installmentsPaid: 9, status: "active" },
];

export const eppSummary = {
  activePlans: eppPlans.filter((p) => p.status === "active").length,
  completedPlans: eppPlans.filter((p) => p.status === "completed").length,
  overduePlans: eppPlans.filter((p) => p.status === "overdue").length,
  totalFinanced: eppPlans.reduce((sum, p) => sum + p.principal, 0),
  // Expected collections this month — completed plans are done paying.
  monthlyCollections: eppPlans
    .filter((p) => p.status !== "completed")
    .reduce((sum, p) => sum + p.monthlyInstalment, 0),
};

export const eppKpis = [
  { key: "active", label: "Active Plans", value: eppSummary.activePlans, money: false, delta: 8, tone: "navy" },
  { key: "completed", label: "Completed Plans", value: eppSummary.completedPlans, money: false, delta: 15, tone: "green" },
  { key: "overdue", label: "Overdue Plans", value: eppSummary.overduePlans, money: false, delta: -20, tone: "amber" },
  { key: "financed", label: "Total Financed", value: eppSummary.totalFinanced, money: true, delta: 11, tone: "teal" },
];

function groupBy(items, keyFn, colorFor) {
  const totals = new Map();
  for (const item of items) {
    const key = keyFn(item);
    totals.set(key, (totals.get(key) || 0) + item.principal);
  }
  return [...totals.entries()].map(([key, amount]) => ({
    name: key,
    amount,
    color: colorFor(key),
  }));
}

export const financedByTenor = groupBy(
  eppPlans,
  (p) => `${p.tenorMonths} months`,
  (key) => TENOR_COLORS[parseInt(key, 10)] || CHART_COLORS.muted,
).sort((a, b) => parseInt(a.name, 10) - parseInt(b.name, 10));

const STATUS_LABEL = { active: "Active", completed: "Completed", overdue: "Overdue" };
export const financedByStatus = groupBy(
  eppPlans,
  (p) => STATUS_LABEL[p.status],
  (key) => STATUS_COLORS[key.toLowerCase()] || CHART_COLORS.muted,
);
