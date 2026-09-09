/**
 * Mock data for the institution dashboard.
 * The backend only exposes /auth/loginUser today, so these figures are
 * hard-coded — but kept internally consistent:
 *   collected + outstanding === total fees
 *   the fee-type breakdown sums to the collected total
 */

export const PERIOD_LABEL = "Sep 1 – Sep 30, 2026";

export const CHART_COLORS = {
  navy: "#245fa9",
  teal: "#2f9c99",
  amber: "#e0a13c",
  slate: "#8ea3bd",
  green: "#1f9d6b",
  muted: "#cdd9e8",
};

export const kpis = [
  { key: "total", label: "Total Fees", value: 1_250_000, money: true, delta: 12, tone: "navy" },
  { key: "collected", label: "Total Collected", value: 969_250, money: true, delta: 18, tone: "green" },
  { key: "outstanding", label: "Outstanding", value: 280_750, money: true, delta: -8, tone: "amber" },
  { key: "partial", label: "Partially Paid", value: 125_400, money: true, delta: 5, tone: "teal" },
  { key: "students", label: "Number of Students", value: 1_248, money: false, delta: 2, tone: "slate" },
];

export const collectionTrend = [
  { day: "27 Aug", amount: 74_200 },
  { day: "28 Aug", amount: 88_600 },
  { day: "29 Aug", amount: 96_400 },
  { day: "30 Aug", amount: 118_900 },
  { day: "31 Aug", amount: 132_500 },
  { day: "01 Sep", amount: 154_800 },
  { day: "02 Sep", amount: 173_050 },
];

// Sums to 969,250 (the collected total)
export const feeTypeBreakdown = [
  { name: "Tuition", amount: 601_000, color: CHART_COLORS.navy },
  { name: "Bus Transport", amount: 174_500, color: CHART_COLORS.teal },
  { name: "Books & Lab", amount: 116_300, color: CHART_COLORS.amber },
  { name: "Activities", amount: 77_450, color: CHART_COLORS.slate },
];

// Portion of the 1,250,000 total fees
export const paymentStatus = [
  { name: "Collected", amount: 969_250, color: CHART_COLORS.green },
  { name: "Outstanding", amount: 280_750, color: CHART_COLORS.muted },
];

export const recentActivity = [
  {
    id: 1,
    icon: "upload",
    tone: "success",
    title: "Fee schedule uploaded",
    detail: "1,248 student records processed",
    time: "2 hours ago",
  },
  {
    id: 2,
    icon: "payment",
    tone: "success",
    title: "Payment received",
    detail: "EGP 12,000 from Youssef Aly",
    time: "3 hours ago",
  },
  {
    id: 3,
    icon: "warning",
    tone: "warning",
    title: "25 rows failed validation",
    detail: "fees_september.csv",
    time: "5 hours ago",
  },
  {
    id: 4,
    icon: "report",
    tone: "info",
    title: "Monthly report ready",
    detail: "Collection summary — September 2026",
    time: "8 hours ago",
  },
  {
    id: 5,
    icon: "plan",
    tone: "neutral",
    title: "Instalment plan activated",
    detail: "3-payment EPP plan for 42 students",
    time: "1 day ago",
  },
];

export const recentPayments = [
  { id: 1, dateTime: "02 Sep, 10:24 AM", student: "Youssef Aly", feeType: "Tuition Fee", amount: 12_000, method: "Card", status: "paid" },
  { id: 2, dateTime: "02 Sep, 09:17 AM", student: "Mariam Ahmed", feeType: "Bus Transport", amount: 3_500, method: "Bank Transfer", status: "paid" },
  { id: 3, dateTime: "01 Sep, 04:32 PM", student: "Seif El-Din", feeType: "Books & Lab", amount: 4_200, method: "Card", status: "pending" },
  { id: 4, dateTime: "01 Sep, 02:11 PM", student: "Fatma Hassan", feeType: "Activities", amount: 2_800, method: "Bank Transfer", status: "paid" },
  { id: 5, dateTime: "01 Sep, 11:05 AM", student: "Omar Khaled", feeType: "Tuition Fee", amount: 12_000, method: "Card", status: "paid" },
];
