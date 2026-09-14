import {
  issueReceipt as issueReceiptRow,
  findReceiptByPaymentId,
  findReceiptByNumber,
  findReceiptsByParentId
} from "../repositories/receipt.repository.js";

import { createNationalIdHmac } from "../utils/hmac.js";
import { findParentByNationalIdHmac } from "../repositories/parent.repository.js";
import { createNationalIdLookupAudit } from "../repositories/nationalIdAudit.repository.js";

const notFound = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  error.field = null;
  return error;
};

const badRequest = (message, field) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.field = field || null;
  return error;
};

// Turns the nested rows into something a receipt can actually be printed
// from, with one line per fee and one line per account the money came from.
const present = (row) => {
  const payment = row.payments || {};

  const lines = (payment.payment_items || []).map((item) => {
    const fee = item.fees || {};
    const child = fee.children || {};

    // Only what was true at the time of payment. The fee's current balance
    // is deliberately NOT here: it changes every time the fee is paid again,
    // which would make an already-issued receipt show different numbers
    // later. A receipt is proof money moved, not a statement of what is
    // left - that belongs in payment history.
    return {
      student: child.name || null,
      student_code: child.student_code || null,
      institution: (child.institutions && child.institutions.name) || null,
      fee_type: fee.fee_type || null,
      period: fee.period || null,
      paid: item.amount
    };
  });

  const paidFrom = (payment.payment_tenders || []).map((tender) => ({
    method: tender.method,
    // already masked when it was stored - a full card number never reaches
    // this table
    account: tender.account_ref,
    amount: tender.amount,
    status: tender.status,
    bank_reference: tender.provider_ref
  }));

  return {
    receipt_number: row.receipt_number,
    issued_at: row.issued_at,
    issued_by: row.bank_employees
      ? {
          name: row.bank_employees.full_name,
          branch: row.bank_employees.branch
        }
      : null,
    payer: (payment.parents && payment.parents.name) || null,
    payment_id: payment.id,
    payment_type: payment.payment_type,
    paid_on: payment.created_at,
    total: payment.amount,
    currency: "EGP",
    lines,
    paid_from: paidFrom
  };
};

// One row of the results table. Students and schools are collapsed to unique
// lists because a single payment can cover two children at two schools, and
// the table has one line per receipt, not per child.
const summarise = (row) => {
  const payment = row.payments || {};
  const items = payment.payment_items || [];

  const students = [];
  const institutions = [];
  const lines = [];

  for (const item of items) {
    const fee = item.fees || {};
    const child = fee.children || {};
    const school = (child.institutions && child.institutions.name) || null;

    if (child.name && !students.includes(child.name)) {
      students.push(child.name);
    }
    if (school && !institutions.includes(school)) {
      institutions.push(school);
    }

    lines.push({
      student: child.name || null,
      student_code: child.student_code || null,
      institution: school,
      fee_type: fee.fee_type || null,
      period: fee.period || null,
      paid: item.amount
    });
  }

  const methods = [];
  for (const tender of payment.payment_tenders || []) {
    if (tender.method && !methods.includes(tender.method)) {
      methods.push(tender.method);
    }
  }

  return {
    receipt_number: row.receipt_number,
    issued_at: row.issued_at,
    paid_on: payment.created_at,
    total: payment.amount,
    currency: "EGP",
    students,
    institutions,
    methods,
    lines
  };
};

/**
 * Issues the receipt for a payment that has just completed.
 *
 * Called from the payment flow. If the payment is not completed the database
 * function refuses, which is what we want - a receipt is proof the money
 * moved, so it must never exist for a payment that failed or is still pending.
 */
export const issueReceiptForPayment = async (paymentId, employeeId) => {
  await issueReceiptRow(paymentId, employeeId);
  return findReceiptByPaymentId(paymentId).then(present);
};

export const getReceiptForPayment = async (paymentId) => {
  const row = await findReceiptByPaymentId(paymentId);

  if (!row) {
    throw notFound("No receipt has been issued for this payment");
  }

  return present(row);
};

export const getReceiptByNumber = async (receiptNumber) => {
  const row = await findReceiptByNumber(receiptNumber);

  if (!row) {
    throw notFound(`No receipt with number ${receiptNumber}`);
  }

  return present(row);
};

/**
 * Every receipt belonging to the parent with this national ID, newest first.
 *
 * The parent at the counter has lost the slip, so the only thing they can
 * offer is their ID card. Searching by receipt number is already covered by
 * getReceiptByNumber above.
 */
export const searchReceiptsByNationalId = async ({
  nationalId,
  bankEmployeeId,
  limit,
  offset
}) => {
  if (!/^\d{14}$/.test(nationalId)) {
    throw badRequest("A national ID is exactly 14 digits", "nationalId");
  }

  // The plaintext ID is never stored - only a keyed hash of it. So the way to
  // find someone is to hash what was typed the same way the row was written
  // and match on that. Same input, same hash, every time.
  const nationalIdHmac = createNationalIdHmac(nationalId);
  const parent = await findParentByNationalIdHmac(nationalIdHmac);

  // Logged whether or not anybody was found. The audit answers "who looked up
  // whom", and a search that came back empty still happened - if anything it
  // is the more interesting one.
  if (!parent) {
    await createNationalIdLookupAudit({
      bankEmployeeId,
      nationalIdHmac,
      resultFound: false
    });

    throw notFound("No parent is registered with that national ID");
  }

  const { rows, total } = await findReceiptsByParentId(parent.id, {
    limit,
    offset
  });

  await createNationalIdLookupAudit({
    bankEmployeeId,
    nationalIdHmac,
    resultFound: true
  });

  // The national ID is deliberately not echoed back. The screen already has
  // it - the person typed it - and it has no business travelling back out of
  // the server and into a browser cache or a log.
  return {
    payer: { id: parent.id, name: parent.name },
    receipts: rows.map(summarise),
    page: {
      limit,
      offset,
      returned: rows.length,
      total_matching: total
    }
  };
};
