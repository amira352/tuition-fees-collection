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

const badRequest = (message, field) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.field = field || null;
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

    // NOTE: this validates the SHAPE only — whether payment_tenders in the
    // database can actually store a `card` object at all is BE-2's open
    // question (see BE-3-NOTES.md). Until that's answered, a card tender
    // will pass this check but likely fail at createPendingPayment's RPC call.
    if (tender.method === "card") {
      if (!tender.card || !tender.card.number || !tender.card.expiry_month || !tender.card.expiry_year || !tender.card.cvv) {
        throw badRequest(`Account ${i + 1} is missing full card details`, "tenders");
      }
    }

    if (!isPositiveAmount(tender.amount)) {
      throw badRequest(`Account ${i + 1} needs an amount above zero`, "tenders");
    }
  });
};

/**
 * Takes a payment.
 *
 * Three steps: record it as pending, ask the bank for the money, then
 * apply it to the fees. The bank call sits in the middle on purpose - we
 * never reduce a balance before the money is actually authorised.
 *
 * BE-3 item 3: a timeout is never a success. If the bank client throws with
 * .outcomeUnknown = true, we do NOT mark the payment failed and do NOT
 * reverse anything already approved — we genuinely don't know if this leg
 * went through. The payment and this tender are left exactly as
 * createPendingPayment set them (pending), and the caller gets a distinct
 * error telling them not to retry automatically.
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
  let outcomeUnknown = false;

  for (const tender of storedTenders) {
    // cash is handed over at the counter, there is nothing to authorise
    if (tender.method === "cash") {
      approved.push({ tender_id: tender.id, provider_ref: null });
      continue;
    }

    try {
      // Route by tender method — this branch was missing before: card
      // tenders were silently going through the simulated account path,
      // never through the real bank.client.js authoriseCard(), even once
      // the tender shape supports a card. That's fixed here, but it's
      // still WAITING on the shape itself supporting a `card` object
      // (BE-2's item) — tender.card is undefined until that lands.
      const result =
        tender.method === "card"
          ? await authoriseCard({
              card: tender.card,
              amount: tender.amount,
              orderReference: `${paymentId}-${tender.id}`,
              nationalId: tender.national_id,
              mobile: tender.mobile
            })
          : await authoriseFromAccount({
              accountRef: tender.account_ref,
              amount: tender.amount
            });

      if (!result.approved) {
        declined = { tender, reason: result.reason };
        break;
      }

      approved.push({ tender_id: tender.id, provider_ref: result.providerRef });
    } catch (err) {
      if (err.outcomeUnknown) {
        outcomeUnknown = true;
        break;
      }
      throw err;
    }
  }

  if (outcomeUnknown) {
    // Leave everything as pending — do not reverse, do not fail, do not
    // retry automatically. This is exactly the scenario item 3 exists for.
    const error = new Error(
      "The bank did not confirm or deny this charge. This payment remains pending manual reconciliation — do not retry automatically."
    );
    error.statusCode = 502;
    error.code = "PAYMENT_OUTCOME_UNKNOWN";
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

    await markPaymentFailed(paymentId);

    const error = new Error(
      `Payment declined on account ${declined.tender.account_ref}: ${declined.reason}`
    );
    error.statusCode = 402;
    error.code = "CARD_DECLINED";
    throw error;
  }

  await settlePayment(paymentId, approved);

  return findPaymentById(paymentId);
};

/**
 * BE-3 item 4: the ONE function BE-2 (or a webhook, or a polling job) calls
 * once an external bank transfer's outcome is known. Reuses the existing
 * settlePayment RPC — an async transfer landing is treated the same as a
 * card capturing, at the data layer.
 *
 * NOTE for BE-2: markPaymentFailed currently fails the WHOLE payment, not
 * just this one tender. For a payment that's only ONE leg of several,
 * that's probably too broad — this is your ticket item 5's territory
 * (per-tender status, partial settlement rules). Flagging rather than
 * guessing at a redesign of your repository function.
 */
export const confirmExternalTransfer = async ({ paymentId, tenderId, providerRef, outcome }) => {
  if (outcome === "SETTLED") {
    await settlePayment(paymentId, [{ tender_id: tenderId, provider_ref: providerRef }]);
    return findPaymentById(paymentId);
  }

  await markPaymentFailed(paymentId);
  return findPaymentById(paymentId);
};
