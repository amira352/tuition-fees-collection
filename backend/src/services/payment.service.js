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

import {
  claimKey,
  findKey,
  completeKey,
  releaseKey
} from "../repositories/idempotency.repository.js";

import { fingerprintRequest } from "../utils/fingerprint.js";

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const conflict = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
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
 * Records the payment, asks the bank for the money, then applies it to the
 * fees. The bank call sits in the middle on purpose - we never reduce a
 * balance before the money is actually authorised.
 */
const runPayment = async ({ parentId, items, tenders, paymentType }, employeeId) => {
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

/**
 * Takes a payment.
 *
 * If the caller sends an Idempotency-Key we make sure the same request can
 * never charge twice - a slow response and an impatient second click is the
 * usual way that happens.
 */
export const createPayment = async (
  { parentId, items, tenders, paymentType = "full", idempotencyKey },
  employeeId
) => {
  validateShape({ parentId, items, tenders });

  const request = { parentId, items, tenders, paymentType };

  if (!idempotencyKey) {
    return runPayment(request, employeeId);
  }

  const fingerprint = fingerprintRequest(request);

  // claim the key before doing any work. if two requests arrive together
  // only one can win the insert, and the loser reads back the winner's result
  const claimed = await claimKey(idempotencyKey, fingerprint);

  if (!claimed) {
    const existing = await findKey(idempotencyKey);

    if (!existing) {
      throw conflict("That payment is still being processed. Try again shortly");
    }

    if (existing.request_fingerprint !== fingerprint) {
      throw conflict("This key has already been used for a different payment");
    }

    if (existing.status === "completed") {
      return findPaymentById(existing.payment_id);
    }

    throw conflict("That payment is still being processed. Try again shortly");
  }

  try {
    const payment = await runPayment(request, employeeId);
    await completeKey(idempotencyKey, payment.id);
    return payment;
  } catch (error) {
    // a declined card should not burn the key, or the agent could never
    // retry with the same one
    await releaseKey(idempotencyKey);
    throw error;
  }
};
