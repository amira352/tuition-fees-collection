import {
  authoriseFromAccount,
  reverseAuthorisation
} from "./bank.client.js";

import {
  createPendingPayment,
  findTendersByPayment,
  settlePayment,
  markPaymentFailed,
  findPaymentById
} from "../repositories/payment.repository.js";

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const isPositiveAmount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

// Only the shape is checked here. Whether the amounts are actually payable
// against the fees is the database's job, because it holds the lock.
const validateShape = ({ parentId, items, tenders }) => {
  if (!parentId) {
    throw badRequest("parentId is required");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("Select at least one fee to pay");
  }

  if (!Array.isArray(tenders) || tenders.length === 0) {
    throw badRequest("Select at least one account to pay from");
  }

  items.forEach((item, i) => {
    if (!item.fee_id) {
      throw badRequest(`Fee line ${i + 1} is missing fee_id`);
    }

    if (!isPositiveAmount(item.amount)) {
      throw badRequest(`Fee line ${i + 1} needs an amount above zero`);
    }
  });

  tenders.forEach((tender, i) => {
    if (tender.method !== "account" && tender.method !== "cash") {
      throw badRequest(`Account ${i + 1} must be "account" or "cash"`);
    }

    if (tender.method === "account" && !tender.account_ref) {
      throw badRequest(`Account ${i + 1} is missing account_ref`);
    }

    if (!isPositiveAmount(tender.amount)) {
      throw badRequest(`Account ${i + 1} needs an amount above zero`);
    }
  });
};

/**
 * Takes a payment.
 *
 * Three steps: record it as pending, ask the bank for the money, then
 * apply it to the fees. The bank call sits in the middle on purpose - we
 * never reduce a balance before the money is actually authorised.
 */
export const createPayment = async (
  { parentId, items, tenders, paymentType = "full" },
  employeeId
) => {
  validateShape({ parentId, items, tenders });

  const paymentId = await createPendingPayment({
    parentId,
    employeeId,
    paymentType,
    items,
    tenders
  });

  const storedTenders = await findTendersByPayment(paymentId);

  const approved = [];
  let declined = null;

  for (const tender of storedTenders) {
    // cash is handed over at the counter, there is nothing to authorise
    if (tender.method === "cash") {
      approved.push({ tender_id: tender.id, provider_ref: null });
      continue;
    }

    const result = await authoriseFromAccount({
      accountRef: tender.account_ref,
      amount: tender.amount
    });

    if (!result.approved) {
      declined = { tender, reason: result.reason };
      break;
    }

    approved.push({ tender_id: tender.id, provider_ref: result.providerRef });
  }

  if (declined) {
    // put back whatever we already took, then fail the whole payment.
    // no fee is left half settled.
    for (const done of approved) {
      if (done.provider_ref) {
        await reverseAuthorisation(done.provider_ref);
      }
    }

    await markPaymentFailed(paymentId);

    const error = new Error(
      `Payment declined on account ${declined.tender.account_ref}: ${declined.reason}`
    );
    error.statusCode = 402;
    throw error;
  }

  await settlePayment(paymentId, approved);

  return findPaymentById(paymentId);
};
