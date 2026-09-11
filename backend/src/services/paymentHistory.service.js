import { findPayments } from "../repositories/paymentHistory.repository.js";

const badRequest = (message, field) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.field = field || null;
  return error;
};

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const PAYMENT_STATUSES = ["pending", "completed", "failed"];

// A date on its own means the whole day in local terms. "to=2026-09-09" should
// include everything that happened on the 9th, not stop at midnight.
const asDate = (value, field, endOfDay) => {
  if (!value) {
    return null;
  }

  const text = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
    : value;

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(`${field} is not a valid date`, field);
  }

  return parsed.toISOString();
};

const asCount = (value, field, fallback, max) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const n = Number(value);

  if (!Number.isInteger(n) || n < 0) {
    throw badRequest(`${field} must be a whole number, zero or more`, field);
  }

  return max ? Math.min(n, max) : n;
};

// One row per payment, with the fee lines it covered and where the money came
// from. A failed payment keeps its lines - the point of showing failures is
// being able to say what somebody tried to pay and why it did not go through.
const present = (row) => {
  const lines = (row.payment_items || []).map((item) => {
    const fee = item.fees || {};
    const child = fee.children || {};

    return {
      student: child.name || null,
      student_code: child.student_code || null,
      institution: (child.institutions && child.institutions.name) || null,
      fee_type: fee.fee_type || null,
      period: fee.period || null,
      amount: item.amount
    };
  });

  const receipt = Array.isArray(row.receipts) ? row.receipts[0] : row.receipts;

  return {
    payment_id: row.id,
    date: row.created_at,
    payer: (row.parents && row.parents.name) || null,
    amount: row.amount,
    currency: "EGP",
    payment_type: row.payment_type,
    status: row.status,
    // only ever set on a failed payment
    failure_reason: row.failure_reason || null,
    receipt_number: receipt ? receipt.receipt_number : null,
    lines,
    paid_from: (row.payment_tenders || []).map((tender) => ({
      method: tender.method,
      account: tender.account_ref,
      amount: tender.amount,
      status: tender.status,
      bank_reference: tender.provider_ref
    }))
  };
};

export const getPaymentHistory = async (filters) => {
  const { parentId, childId, institutionId, status, from, to } = filters;

  if (status && !PAYMENT_STATUSES.includes(status)) {
    throw badRequest(
      `status must be one of: ${PAYMENT_STATUSES.join(", ")}`,
      "status"
    );
  }

  const fromISO = asDate(from, "from", false);
  const toISO = asDate(to, "to", true);

  if (fromISO && toISO && fromISO > toISO) {
    throw badRequest("from is after to", "from");
  }

  const limit = asCount(filters.limit, "limit", DEFAULT_LIMIT, MAX_LIMIT);
  const offset = asCount(filters.offset, "offset", 0);

  const { rows, total } = await findPayments({
    parentId,
    childId,
    institutionId,
    status,
    from: fromISO,
    to: toISO,
    limit,
    offset
  });

  const payments = rows.map(present);

  // Only completed payments count towards money collected. Adding failed or
  // pending ones in would overstate it, which is the sort of number somebody
  // reads off a screen and repeats in a meeting.
  const collected = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    payments,
    summary: {
      returned: payments.length,
      total_matching: total,
      collected_on_this_page: collected,
      currency: "EGP"
    },
    page: {
      limit,
      offset,
      has_more: offset + payments.length < total
    }
  };
};
