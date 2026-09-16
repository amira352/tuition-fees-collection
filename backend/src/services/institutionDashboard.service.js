import { getInstitutionFees } from "../repositories/fee.repository.js";
import { findPayments } from "../repositories/paymentHistory.repository.js";

const TIMEZONE = process.env.REPORT_TIMEZONE || "Africa/Cairo";

const dayKey = (isoString) =>
  new Date(isoString).toLocaleDateString("en-CA", {
    timeZone: TIMEZONE,
  }); // "YYYY-MM-DD"

const dayLabel = (isoString) =>
  new Date(isoString).toLocaleDateString("en-US", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
  }); // "27 Aug"

const periodLabel = () => {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const fmt = (date, withYear) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: withYear ? "numeric" : undefined,
    });

  return `${fmt(start, false)} – ${fmt(end, true)}`;
};

const flattenFees = (children = []) =>
  children.flatMap((child) =>
    (child.fees || []).map((fee) => {
      const amount = Number(fee.amount || 0);
      const outstanding = Number(fee.outstanding_amount ?? amount);

      return {
        childIsActive: child.is_active !== false,
        feeType: fee.fee_type,
        status: fee.status,
        amount,
        outstanding,
        paid: Math.max(0, amount - outstanding),
      };
    })
  );

const buildKpis = (children, fees) => {
  const total = fees.reduce((sum, fee) => sum + fee.amount, 0);

  const collected = fees.reduce((sum, fee) => sum + fee.paid, 0);

  const outstanding = fees.reduce(
    (sum, fee) => sum + fee.outstanding,
    0
  );

  const partial = fees
    .filter((fee) => fee.status === "partially_paid")
    .reduce((sum, fee) => sum + fee.outstanding, 0);

  const students = children.filter(
    (child) => child.is_active !== false
  ).length;

  return [
    {
      key: "total",
      label: "Total Fees",
      value: total,
      money: true,
      delta: null,
    },
    {
      key: "collected",
      label: "Total Collected",
      value: collected,
      money: true,
      delta: null,
    },
    {
      key: "outstanding",
      label: "Outstanding",
      value: outstanding,
      money: true,
      delta: null,
    },
    {
      key: "partial",
      label: "Partially Paid",
      value: partial,
      money: true,
      delta: null,
    },
    {
      key: "students",
      label: "Number of Students",
      value: students,
      money: false,
      delta: null,
    },
  ];
};

const buildFeeTypeBreakdown = (fees) => {
  const totals = new Map();

  for (const fee of fees) {
    const key = fee.feeType || "Other";

    totals.set(
      key,
      (totals.get(key) || 0) + fee.paid
    );
  }

  return [...totals.entries()].map(([name, amount]) => ({
    name,
    amount,
  }));
};

const buildPaymentStatus = (collected, outstanding) => [
  {
    name: "Collected",
    amount: collected,
  },
  {
    name: "Outstanding",
    amount: outstanding,
  },
];

const buildCollectionTrend = (payments) => {
  const totalsByDay = new Map();

  for (const payment of payments) {
    const key = dayKey(payment.created_at);

    totalsByDay.set(
      key,
      (totalsByDay.get(key) || 0) +
        Number(payment.amount || 0)
    );
  }

  const days = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);

    date.setDate(date.getDate() - i);

    const key = dayKey(date.toISOString());

    days.push({
      day: dayLabel(date.toISOString()),
      amount: totalsByDay.get(key) || 0,
    });
  }

  return days;
};

const formatDateTime = (isoString) =>
  new Date(isoString).toLocaleString("en-US", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const buildRecentPayments = (payments) =>
  payments.map((payment) => {
    const firstItem = payment.payment_items?.[0];
    const fee = firstItem?.fees;

    return {
      id: payment.id,
      dateTime: formatDateTime(payment.created_at),
      student: fee?.children?.name || "Unknown",
      feeType: fee?.fee_type || "N/A",
      amount: Number(payment.amount || 0),
      method: payment.payment_method,
      status: payment.status,
    };
  });

export const getInstitutionDashboard = async (institutionId) => {
  const children = await getInstitutionFees(institutionId);

  const fees = flattenFees(children);

  const collected = fees.reduce(
    (sum, fee) => sum + fee.paid,
    0
  );

  const outstanding = fees.reduce(
    (sum, fee) => sum + fee.outstanding,
    0
  );

  const now = new Date();

  const sevenDaysAgo = new Date(now);

  sevenDaysAgo.setDate(
    sevenDaysAgo.getDate() - 6
  );

  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { rows: trendPayments } = await findPayments({
    institutionId,
    status: "completed",
    from: sevenDaysAgo.toISOString(),
    to: now.toISOString(),
    limit: 500,
    offset: 0,
  });

  const { rows: recentPayments } = await findPayments({
    institutionId,
    limit: 5,
    offset: 0,
  });

  return {
    periodLabel: periodLabel(),

    kpis: buildKpis(children, fees),

    collectionTrend:
      buildCollectionTrend(trendPayments),

    feeTypeBreakdown:
      buildFeeTypeBreakdown(fees),

    paymentStatus:
      buildPaymentStatus(
        collected,
        outstanding
      ),

    recentPayments:
      buildRecentPayments(recentPayments),
  };
};