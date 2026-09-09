import {
  authoriseFromAccount,
  authoriseCard,
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

import { issueReceipt } from "../repositories/receipt.repository.js";

import { fingerprintRequest } from "../utils/fingerprint.js";

const badRequest = (message, field) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.field = field || null;
  return error;
};

const conflict = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = "IDEMPOTENCY_CONFLICT";
  error.field = null;
  return error;
};

const isPositiveAmount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

// Only the shape is checked here. Whether the amounts are actually payable
// against the fees is the database's job, because it holds the lock.
// Exported specifically so it can be unit-tested without a database or
// network — see backend/test/payment.service.test.js.
export const validateShape = ({ parentId, items, tenders }) => {
  if (!parentId) {
    throw badRequest("parentId is required", "parentId");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("Select at least one fee to pay", "items");
  }

  if (!Array.isArray(tenders) || tenders.length === 0) {
    throw badRequest("Select at least one account to pay from", "tenders");
  }

  items.forEach((item, i) => {
    if (!item.fee_id) {
      throw badRequest(`Fee line ${i + 1} is missing fee_id`, "items");
    }

    if (!isPositiveAmount(item.amount)) {
      throw badRequest(`Fee line ${i + 1} needs an amount above zero`, "items");
    }
  });

  tenders.forEach((tender, i) => {
    if (!["account", "cash", "card"].includes(tender.method)) {
      throw badRequest(`Account ${i + 1} must be "account", "cash", or "card"`, "tenders");
    }

    if (tender.method === "account" && !tender.account_ref) {
      throw badRequest(`Account ${i + 1} is missing account_ref`, "tenders");
    }

    // Card details are read from the request and handed straight to the bank.
    // They are never written to payment_tenders - storing a CVV is forbidden
    // under PCI DSS, and a PAN needs the whole system to be PCI compliant.
    // What gets stored is what comes back: the masked number and the bank's
    // own payment id.
    if (tender.method === "card") {
      if (!tender.card || !tender.card.number || !tender.card.expiry_month ||
          !tender.card.expiry_year || !tender.card.cvv) {
        throw badRequest(`Account ${i + 1} is missing full card details`, "tenders");
      }
    }

    if (!isPositiveAmount(tender.amount)) {
      throw badRequest(`Account ${i + 1} needs an amount above zero`, "tenders");
    }
  });
};

// What the idempotency fingerprint is taken over. Deliberately not the raw
// request: a card number never goes into a hash. The last four digits are
// enough to tell two different cards apart, which is all the fingerprint
// needs to do.
const fingerprintInput = ({ parentId, items, tenders, paymentType }) => ({
  parentId,
  paymentType,
  items,
  tenders: tenders.map((t) => ({
    method: t.method,
    account_ref: t.account_ref || null,
    amount: t.amount,
    card_last4: t.card && t.card.number
      ? String(t.card.number).replace(/\D/g, "").slice(-4)
      : null
  }))
});

/**
 * Records the payment, asks the bank for the money, then applies it to the
 * fees. The bank call sits in the middle on purpose - we never reduce a
 * balance before the money is actually authorised.
 *
 * A timeout is never a success. If the bank client throws with
 * .outcomeUnknown = true we do NOT mark the payment failed and do NOT
 * reverse anything already approved - we genuinely do not know whether that
 * leg went through. The payment and its tenders are left pending and the
 * caller gets a distinct error telling them not to retry automatically.
 */
const runPayment = async (
  { parentId, items, tenders, paymentType },
  employeeId
) => {
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
  let outcomeUnknown = false;

  for (const stored of storedTenders) {
    // cash is handed over at the counter, there is nothing to authorise
    if (stored.method === "cash") {
      approved.push({ tender_id: stored.id, provider_ref: null });
      continue;
    }

    // The card itself never came back from the database - it is not stored
    // there. Match the saved tender to the one in the request by amount and
    // position so we can hand the bank the details the caller sent.
    const fromRequest =
      tenders.find(
        (t) => t.method === stored.method && Number(t.amount) === Number(stored.amount)
      ) || {};

    try {
      const result =
        stored.method === "card"
          ? await authoriseCard({
              card: fromRequest.card,
              amount: stored.amount,
              orderReference: `${paymentId}-${stored.id}`,
              nationalId: fromRequest.national_id,
              mobile: fromRequest.mobile
            })
          : await authoriseFromAccount({
              accountRef: stored.account_ref,
              amount: stored.amount
            });

      if (!result.approved) {
        declined = { tender: stored, reason: result.reason };
        break;
      }

      approved.push({ tender_id: stored.id, provider_ref: result.providerRef });
    } catch (err) {
      if (err.outcomeUnknown) {
        outcomeUnknown = true;
        break;
      }
      throw err;
    }
  }

  if (outcomeUnknown) {
    // Leave everything pending - do not reverse, do not fail, do not retry.
    const error = new Error(
      "The bank did not confirm or deny this charge. This payment remains pending manual reconciliation - do not retry automatically."
    );
    error.statusCode = 502;
    error.code = "PAYMENT_OUTCOME_UNKNOWN";
    error.field = null;
    error.details = { payment_id: paymentId };
    throw error;
  }

  if (declined) {
    // put back whatever we already took, then fail the whole payment.
    // no fee is left half settled.
    for (const done of approved) {
      if (done.provider_ref) {
        await reverseAuthorisation(done.provider_ref);
      }
    }

    const where = declined.tender.account_ref || declined.tender.method;

    await markPaymentFailed(paymentId, `Declined on ${where}: ${declined.reason}`);

    const error = new Error(
      `Payment declined on account ${declined.tender.account_ref}: ${declined.reason}`
    );
    error.statusCode = 402;
    error.code = "CARD_DECLINED";
    error.field = null;
    throw error;
  }

  await settlePayment(paymentId, approved);

  // The money has moved, so a receipt exists from here on. If issuing it
  // fails the payment is still good - issue_receipt is safe to call again
  // later, and a missing receipt is a smaller problem than a rolled back
  // payment that actually went through.
  try {
    await issueReceipt(paymentId, employeeId);
  } catch (err) {
    console.error(`receipt not issued for payment ${paymentId}:`, err.message);
  }

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

  const fingerprint = fingerprintRequest(fingerprintInput(request));

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
    // A declined card should not burn the key - the agent needs to be able
    // to retry with it. But an UNKNOWN outcome must keep the key held:
    // the money may already have left the account, and letting the same key
    // start a second payment is exactly the double charge we are here to
    // stop. Manual reconciliation clears it, not a retry.
    if (error.code !== "PAYMENT_OUTCOME_UNKNOWN") {
      await releaseKey(idempotencyKey);
    }

    throw error;
  }
};

/**
 * Called once an external bank transfer's outcome is known - by a webhook,
 * or by a polling job. Reuses settlePayment: at the data layer, a transfer
 * landing is the same thing as a card capturing.
 *
 * Note: markPaymentFailed fails the WHOLE payment, not just this tender.
 * For a payment made of several legs that is too broad. Left as is rather
 * than redesigned in a merge - see the open question in BE-3-NOTES.md.
 */
export const confirmExternalTransfer = async ({
  paymentId,
  tenderId,
  providerRef,
  outcome
}) => {
  if (outcome === "SETTLED") {
    await settlePayment(paymentId, [
      { tender_id: tenderId, provider_ref: providerRef }
    ]);
    return findPaymentById(paymentId);
  }

  await markPaymentFailed(paymentId, "The external transfer did not settle");
  return findPaymentById(paymentId);
};
