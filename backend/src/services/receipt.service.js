import {
  issueReceipt as issueReceiptRow,
  findReceiptByPaymentId,
  findReceiptByNumber
} from "../repositories/receipt.repository.js";

const notFound = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  error.field = null;
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
