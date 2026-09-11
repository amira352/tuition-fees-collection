import test from "node:test";
import assert from "node:assert/strict";
import { validateShape } from "../src/services/payment.service.js";

test("validateShape: accepts a valid cash payment", () => {
  assert.doesNotThrow(() =>
    validateShape({
      parentId: "parent-1",
      items: [{ fee_id: "fee-1", amount: 100 }],
      tenders: [{ method: "cash", amount: 100 }]
    })
  );
});

test("validateShape: rejects a missing parentId", () => {
  assert.throws(
    () => validateShape({ items: [{ fee_id: "fee-1", amount: 100 }], tenders: [{ method: "cash", amount: 100 }] }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, "VALIDATION_ERROR");
      assert.equal(err.field, "parentId");
      return true;
    }
  );
});

test("validateShape: rejects empty items", () => {
  assert.throws(
    () => validateShape({ parentId: "p1", items: [], tenders: [{ method: "cash", amount: 100 }] }),
    (err) => {
      assert.equal(err.field, "items");
      return true;
    }
  );
});

test("validateShape: rejects a fee line with a zero amount", () => {
  assert.throws(() =>
    validateShape({
      parentId: "p1",
      items: [{ fee_id: "fee-1", amount: 0 }],
      tenders: [{ method: "cash", amount: 100 }]
    })
  );
});

test("validateShape: rejects an unknown tender method", () => {
  assert.throws(
    () =>
      validateShape({
        parentId: "p1",
        items: [{ fee_id: "fee-1", amount: 100 }],
        tenders: [{ method: "bitcoin", amount: 100 }]
      }),
    (err) => {
      assert.equal(err.field, "tenders");
      return true;
    }
  );
});

test("validateShape: rejects an account tender missing account_ref", () => {
  assert.throws(() =>
    validateShape({
      parentId: "p1",
      items: [{ fee_id: "fee-1", amount: 100 }],
      tenders: [{ method: "account", amount: 100 }]
    })
  );
});

test("validateShape: rejects a card tender with incomplete card details", () => {
  assert.throws(() =>
    validateShape({
      parentId: "p1",
      items: [{ fee_id: "fee-1", amount: 100 }],
      tenders: [{ method: "card", amount: 100, card: { number: "4111111111111111" } }] // missing expiry/cvv
    })
  );
});

test("validateShape: accepts a card tender with complete card details", () => {
  assert.doesNotThrow(() =>
    validateShape({
      parentId: "p1",
      items: [{ fee_id: "fee-1", amount: 100 }],
      tenders: [
        {
          method: "card",
          amount: 100,
          card: { number: "4111111111111111", expiry_month: 12, expiry_year: 2030, cvv: "123" }
        }
      ]
    })
  );
});

test("validateShape: accepts multiple tenders split across methods (a card leg + a cash leg)", () => {
  assert.doesNotThrow(() =>
    validateShape({
      parentId: "p1",
      items: [{ fee_id: "fee-1", amount: 200 }],
      tenders: [
        { method: "cash", amount: 100 },
        { method: "card", amount: 100, card: { number: "4111111111111111", expiry_month: 12, expiry_year: 2030, cvv: "123" } }
      ]
    })
  );
});
