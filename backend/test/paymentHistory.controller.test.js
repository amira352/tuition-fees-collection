import test from "node:test";
import assert from "node:assert/strict";
import { resolveInstitutionId } from "../src/controllers/paymentHistory.controller.js";

// Pure logic, no database, no network - mirrors how validateShape is
// tested in payment.service.test.js.

test("resolveInstitutionId: an institution user is forced onto their own id", () => {
  const user = { role: "institution", userId: "inst-123" };

  assert.equal(resolveInstitutionId(user, undefined), "inst-123");
});

test("resolveInstitutionId: an institution user cannot override with a query param", () => {
  const user = { role: "institution", userId: "inst-123" };

  // Someone else's id sent on the query string must be ignored, not honoured.
  assert.equal(resolveInstitutionId(user, "someone-elses-institution"), "inst-123");
});

test("resolveInstitutionId: back_office keeps whatever institutionId they passed", () => {
  const user = { role: "back_office", userId: "employee-9" };

  assert.equal(resolveInstitutionId(user, "inst-456"), "inst-456");
});

test("resolveInstitutionId: back_office with no filter sees all institutions", () => {
  const user = { role: "back_office", userId: "employee-9" };

  assert.equal(resolveInstitutionId(user, undefined), undefined);
});

test("resolveInstitutionId: admin keeps whatever institutionId they passed", () => {
  const user = { role: "admin", userId: "admin-1" };

  assert.equal(resolveInstitutionId(user, "inst-456"), "inst-456");
});
