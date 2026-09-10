import test from "node:test";
import assert from "node:assert/strict";
import { assertEppEligible, getAllowedTenors } from "../src/services/epp.service.js";

const settledCardPayment = {
  status: "settled",
  payment_type: "full",
  payment_tenders: [{ method: "card", provider_ref: "pay_123" }]
};

test("assertEppEligible: accepts a settled, full, card payment with an allowed tenor", () => {
  const cardTender = assertEppEligible(settledCardPayment, 12);
  assert.equal(cardTender.provider_ref, "pay_123");
});

test("assertEppEligible: rejects a tenor not in the allowed list", () => {
  assert.throws(
    () => assertEppEligible(settledCardPayment, 9),
    (err) => {
      assert.equal(err.code, "UNSUPPORTED_TENOR");
      assert.equal(err.statusCode, 422);
      return true;
    }
  );
});

test("assertEppEligible: rejects a missing payment", () => {
  assert.throws(
    () => assertEppEligible(null, 12),
    (err) => {
      assert.equal(err.code, "PAYMENT_NOT_FOUND");
      return true;
    }
  );
});

test("assertEppEligible: rejects a payment that isn't settled yet — this is the bug fix from 'has a provider ref' to 'is actually settled'", () => {
  const pendingPayment = { ...settledCardPayment, status: "pending" };
  assert.throws(
    () => assertEppEligible(pendingPayment, 12),
    (err) => {
      assert.equal(err.code, "PAYMENT_NOT_CONVERTIBLE");
      assert.equal(err.statusCode, 409);
      return true;
    }
  );
});

test("assertEppEligible: rejects a partial payment — split-across-tenders is not EPP-eligible", () => {
  const partialPayment = { ...settledCardPayment, payment_type: "partial" };
  assert.throws(
    () => assertEppEligible(partialPayment, 12),
    (err) => {
      assert.equal(err.code, "EPP_REQUIRES_FULL_PAYMENT");
      return true;
    }
  );
});

test("assertEppEligible: rejects a payment with no card tender (e.g. cash/account only)", () => {
  const cashOnlyPayment = { ...settledCardPayment, payment_tenders: [{ method: "cash" }] };
  assert.throws(
    () => assertEppEligible(cashOnlyPayment, 12),
    (err) => {
      assert.equal(err.code, "EPP_REQUIRES_CARD");
      return true;
    }
  );
});

test("assertEppEligible: accepts a card tender even alongside other tender methods, as long as ONE is a card", () => {
  const mixedPayment = {
    ...settledCardPayment,
    payment_type: "full", // per validateShape, mixed methods can still be one "full" payment_type
    payment_tenders: [{ method: "cash" }, { method: "card", provider_ref: "pay_456" }]
  };
  const cardTender = assertEppEligible(mixedPayment, 6);
  assert.equal(cardTender.provider_ref, "pay_456");
});

test("getAllowedTenors: reads from EPP_ALLOWED_TENORS env var", () => {
  const original = process.env.EPP_ALLOWED_TENORS;
  process.env.EPP_ALLOWED_TENORS = "3,9,27";
  assert.deepEqual(getAllowedTenors(), [3, 9, 27]);
  process.env.EPP_ALLOWED_TENORS = original;
});

test("getAllowedTenors: falls back to a sensible default when unset", () => {
  const original = process.env.EPP_ALLOWED_TENORS;
  delete process.env.EPP_ALLOWED_TENORS;
  assert.deepEqual(getAllowedTenors(), [3, 6, 12, 18, 24]);
  process.env.EPP_ALLOWED_TENORS = original;
});
