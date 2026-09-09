import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { authenticate, requireRole } from "../src/middleware/auth.middleware.js";

// Pure crypto — no database, no network. A real secret + real jwt.sign(),
// not a fake token, so this exercises the actual verification path.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-unit-tests-only";

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(payload) { res.body = payload; return res; }
  };
  return res;
}

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
}

test("authenticate: rejects a missing Authorization header with the flat shape", () => {
  const res = fakeRes();
  authenticate()({ headers: {} }, res, () => assert.fail("next() should not be called"));

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { code: "MISSING_TOKEN", message: "Authorization token is required", field: null });
});

test("authenticate: rejects a garbage token with the flat shape", () => {
  const res = fakeRes();
  authenticate()({ headers: { authorization: "Bearer not-a-real-token" } }, res, () => assert.fail("next() should not be called"));

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, "INVALID_TOKEN");
  assert.equal(res.body.field, null);
});

test("authenticate: accepts a valid token and attaches req.user", () => {
  const token = sign({ userId: "u1", role: "back_office" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = fakeRes();
  let nextCalled = false;

  authenticate()(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.userId, "u1");
  assert.equal(req.user.role, "back_office");
});

test("authenticate: rejects a password_change-scoped token on a normal route, with the flat shape", () => {
  const token = sign({ userId: "u1", role: "back_office", scope: "password_change" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = fakeRes();

  authenticate()(req, res, () => assert.fail("next() should not be called"));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "PASSWORD_CHANGE_REQUIRED");
});

test("authenticate: DOES allow a password_change-scoped token when the route opts in", () => {
  const token = sign({ userId: "u1", role: "back_office", scope: "password_change" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = fakeRes();
  let nextCalled = false;

  authenticate({ allowPasswordChangeScope: true })(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
});

test("requireRole: rejects a role not in the allowed list, with the flat shape", () => {
  const req = { user: { userId: "u1", role: "institution" } };
  const res = fakeRes();

  requireRole("back_office", "admin")(req, res, () => assert.fail("next() should not be called"));

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { code: "FORBIDDEN", message: "You do not have permission to perform this action", field: null });
});

test("requireRole: allows a role that IS in the list", () => {
  const req = { user: { userId: "u1", role: "admin" } };
  const res = fakeRes();
  let nextCalled = false;

  requireRole("back_office", "admin")(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
});

test("role.middleware.js: authorizeRoles is now the SAME function as requireRole, not a second drifting copy", async () => {
  const { authorizeRoles } = await import("../src/middleware/role.middleware.js");
  assert.equal(authorizeRoles, requireRole);
});
