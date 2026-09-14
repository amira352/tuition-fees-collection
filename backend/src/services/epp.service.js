import { getEppQuotes, createEppPlan } from "./bank.client.js";
import { createEppPlanRecord, findEppPlanByPaymentId, getInstitutionEppPlans } from "../repositories/eppPlan.repository.js";
import { findPaymentById } from "../repositories/payment.repository.js";

// BE-3 item 7: read from config, not a hardcoded whitelist — CIB publishes
// 3-60 months. Set EPP_ALLOWED_TENORS in .env to widen this without a
// code change. Also see sql/001_epp_tenor_constraint.sql, which loosens
// the matching database CHECK constraint — this app-level list and that
// SQL constraint should be kept in sync by hand.
export const getAllowedTenors = () =>
  (process.env.EPP_ALLOWED_TENORS || "3,6,12,18,24")
    .split(",")
    .map((s) => parseInt(s.trim(), 10));

export const quoteInstalments = async (amount) => {
  return getEppQuotes(amount);
};

/**
 * BE-3 items 5 & 6, split out from createInstalmentPlan specifically so it
 * can be unit-tested with plain objects — no database, no network, no
 * mocking required. See backend/test/epp.service.test.js.
 *
 *  - Credit card only, full payment only — a payment split across several
 *    tenders or fees is explicitly rejected, not left to chance.
 *  - Checked against the payment's actual status, not just "has a
 *    provider ref" — a pending charge could have one before it's
 *    actually settled, which is exactly the bug this closes.
 *  - Does NOT check "already has a plan" — that needs a database read,
 *    so it stays in the async function below.
 *
 * NOTE: "completed" is this system's real success status for a payment
 * (confirmed directly from settle_payment's own SQL — it sets
 * status = 'completed', never 'settled' or 'captured'). An earlier version
 * of this check used the wrong status names, carried over by mistake from
 * a different backend, and would have rejected every genuinely successful
 * payment. Found and fixed by actually running a real card payment through
 * and reading the real error it produced.
 */
export const assertEppEligible = (payment, tenorMonths) => {
  const allowedTenors = getAllowedTenors();

  if (!allowedTenors.includes(tenorMonths)) {
    const error = new Error(`tenor_months must be one of: ${allowedTenors.join(", ")}`);
    error.statusCode = 422;
    error.code = "UNSUPPORTED_TENOR";
    error.field = "tenorMonths";
    throw error;
  }

  if (!payment) {
    const error = new Error("Payment not found");
    error.statusCode = 404;
    error.code = "PAYMENT_NOT_FOUND";
    throw error;
  }

  if (payment.status !== "completed") {
    const error = new Error(
      `Payment must be completed before it can be converted to instalments (currently ${payment.status})`
    );
    error.statusCode = 409;
    error.code = "PAYMENT_NOT_CONVERTIBLE";
    error.field = "paymentId";
    throw error;
  }

  if (payment.payment_type !== "full") {
    const error = new Error(
      "A payment split across several fees or tenders is not EPP-eligible — only a single full-amount card payment can be converted"
    );
    error.statusCode = 422;
    error.code = "EPP_REQUIRES_FULL_PAYMENT";
    error.field = "paymentId";
    throw error;
  }

  const cardTender = payment.payment_tenders.find((t) => t.method === "card");
  if (!cardTender) {
    const error = new Error("Instalment plans can only be created from a card payment");
    error.statusCode = 422;
    error.code = "EPP_REQUIRES_CARD";
    error.field = "paymentId";
    throw error;
  }

  return cardTender;
};

/**
 * BE-3 items 5 & 6, the async orchestration: look the payment up, apply
 * the eligibility rules above, check for an existing plan, then call the
 * bank and store the result. interest / admin_fee / annual_rate /
 * total_amount all come straight from the bank's response — never
 * recalculated here.
 */
export const createInstalmentPlan = async ({ paymentId, tenorMonths }) => {
  const payment = await findPaymentById(paymentId);
  const cardTender = assertEppEligible(payment, tenorMonths);

  const existing = await findEppPlanByPaymentId(paymentId);
  if (existing) {
    const error = new Error("This payment already has an instalment plan");
    error.statusCode = 409;
    error.code = "ALREADY_CONVERTED";
    throw error;
  }

  // Debit-vs-credit eligibility itself is enforced by the mock (returns
  // CARD_NOT_ELIGIBLE, forwarded by bank.client.js's createEppPlan) — refused
  // at the API, not left to the frontend to hide the button.
  const result = await createEppPlan({ providerPaymentId: cardTender.provider_ref, tenorMonths });

  return createEppPlanRecord({
    paymentId,
    providerPlanId: result.plan_id,
    tenorMonths: result.tenor_months,
    principal: result.principal,
    interest: result.interest_amount,
    adminFee: result.admin_fee,
    totalAmount: result.total_payable,
    monthlyInstalment: result.monthly_installment,
    startDate: result.first_due_date,
    annualRate: result.annual_rate
  });
};

// ADDED — GET /api/institutions/:id/epp-plans
export const listInstitutionEppPlans = async (institutionId) => {
  const plans = await getInstitutionEppPlans(institutionId);
  return { institution_id: institutionId, plans };
};