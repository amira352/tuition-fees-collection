import test from "node:test";
import assert from "node:assert/strict";
import { errorHandler } from "../src/middleware/errorHandler.js";

// A minimal fake res that records what got sent, instead of a real Express response.
function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    }
  };
  return res;
}

test("errorHandler: produces the flat {code, message, field} shape, no wrapper", () => {
  const err = Object.assign(new Error("Something specific went wrong"), {
    statusCode: 422,
    code: "VALIDATION_ERROR",
    field: "amount"
  });
  const res = fakeRes();

  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.body, { code: "VALIDATION_ERROR", message: "Something specific went wrong", field: "amount" });
});

test("errorHandler: defaults field to null when not set on the error", () => {
  const err = Object.assign(new Error("Not found"), { statusCode: 404, code: "NOT_FOUND" });
  const res = fakeRes();

  errorHandler(err, {}, res, () => {});

  assert.equal(res.body.field, null);
});

test("errorHandler: derives a sensible default code from the status when .code isn't set (old throw sites)", () => {
  const err = Object.assign(new Error("Declined"), { statusCode: 402 }); // no .code — mimics an older throw site
  const res = fakeRes();

  errorHandler(err, {}, res, () => {});

  assert.equal(res.body.code, "PAYMENT_DECLINED");
});

test("errorHandler: hides the real message on a 500, to avoid leaking internals", () => {
  const err = new Error("some raw database connection string leaked here");
  const res = fakeRes();

  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Internal server error");
});
