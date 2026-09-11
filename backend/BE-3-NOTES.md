# BE-3 notes for the team

## Update 2: found and fixed a bigger item-9 gap — auth errors weren't in the flat shape at all

While reviewing the delivery again (no live database involved — pure code
review + unit tests), found that `authenticate()` and `requireRole()` in
`auth.middleware.js` were responding directly with `res.json({ message })`
on every 401/403 — bypassing `errorHandler.js` and the flat
`{ code, message, field }` shape entirely. **This runs on every single
protected route in the API**, so this was the single most common error
shape in the whole system, and it didn't match the contract at all.
Demonstrated with a real executed test before fixing, not just inspection.

Also found: `role.middleware.js`'s `authorizeRoles` was a second,
independent implementation of the exact same check — same logic, and it
would have needed this same fix applied twice, in two places that could
silently drift apart again next time either one changed. Consolidated:
`role.middleware.js` now re-exports `requireRole` under the old name, so
`searchByid.routes.js` (which imports `authorizeRoles`) needed zero
changes and picked up the fix automatically — confirmed by a test that
asserts `authorizeRoles === requireRole`, not just that they behave
similarly today.

8 new tests added for this (`test/auth.middleware.test.js`), using real
`jsonwebtoken` signing — no mocking, no database. **30 tests total now,
all actually run and passing.**

## Update 1: tests + OpenAPI added, one bug found and fixed

`validateShape` (payment.service.js) and `assertEppEligible` (epp.service.js)
are exported specifically so they can be unit-tested without a database or
network — see `backend/test/`. Run them yourself with:
```
node --test test/*.test.js
```
Expect `30 passing`.

**Bug found while doing this**: `createPayment`'s tender loop was calling
`authoriseFromAccount` (the simulated one) for every non-cash tender,
including a `card`-method one — meaning even after a card tender shape
exists, card charges would have silently gone through the fake path
forever, never the real `authoriseCard`. Fixed: the loop now branches on
`tender.method`.

`backend/openapi.yaml` also didn't exist before — added, documenting every
real route in the codebase (not just BE-3's new ones), per item 9's "one
OpenAPI file" requirement, including the real `/auth/loginUser` and
`/auth/change-password` shapes verified directly against
`auth.controller.js`/`auth.service.js`/`auth.routes.js`.

---

## Item 2 — the dev plan's mock assumption is wrong

The development plan describes a T24 SOAP adapter with a WSDL. **The mock
actually provided (`wit-mock-services`) is Python FastAPI over plain
REST/JSON** — no SOAP envelope, no WSDL, no XML anywhere.

`bank.client.js` and `moi.service.js` both already correctly treat it as
REST (plain `axios` calls). Nothing needs to change there. But the plan
apparently has **four tasks resting on the SOAP assumption** — confirm
with whoever owns those tasks before anyone starts writing a SOAP client
against a service that doesn't speak SOAP.

## Item 7 — tenor list, config vs database

`EPP_ALLOWED_TENORS` in `.env` controls what the *application* accepts.
`sql/001_epp_tenor_constraint.sql` widens the matching database CHECK
constraint. **These two need to be kept in sync by hand** — if one changes
without the other, either the app will reject a tenor the database would
accept, or the database will reject one the app tries to insert.

**As of this note, the SQL files have not been run against the real
database yet** — confirmed directly with Fadwa. Item 8 (daily report) will
fail immediately on first use until `002_daily_report_function.sql` runs;
item 7's database-level protection is incomplete (app-level check works,
DB-level doesn't) until `001_epp_tenor_constraint.sql` runs.

## Item 4 — open design question for BE-2, still unresolved

`confirmExternalTransfer()` in `payment.service.js` currently calls
`markPaymentFailed()` on a failed outcome, which fails the **whole**
payment, not just the one tender that failed. For a payment made of
several tenders (a card leg + a transfer leg), that's probably too broad —
this overlaps with BE-2's own ticket item on per-tender status and partial
settlement rules. Flagged here rather than silently redesigning
`payment.repository.js` without that context.

## Item 3/5/6 — blocked on BE-2's tender shape, still unresolved

`validateShape` now accepts `method: "card"` with a full `card` object,
and `createPayment`'s loop correctly routes it to `authoriseCard`. But
none of this can actually succeed until:
1. BE-2 decides whether `payment_tenders` (and the `create_pending_payment`
   Postgres RPC function behind it) can store a `card` object at all, and
2. That RPC function is updated to match.

Until then, sending a `card`-method tender will pass this codebase's
validation, then fail one layer deeper, inside a database function none
of us can see from here.

## Environment issue found while trying to test live

`npm run seed` failed with `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`
even though a real `.env` with real values exists — the seed script's own
output showed `injected env (0) from .env`, meaning zero variables actually
loaded. Not yet diagnosed (paused to do more code-level review instead) —
likely either a file-naming issue (Windows sometimes saves `.env` as
`.env.txt` silently) or the `dotenvx` tool the seed script uses looking in
the wrong working directory. Worth 10 minutes from someone before assuming
the live database testing pass will be straightforward.

## SQL files — need review before running

`sql/001_epp_tenor_constraint.sql` and `sql/002_daily_report_function.sql`
were written from the ERD screenshot shared in planning, not from the real
migration files — the real constraint name in particular is guessed
dynamically in the first script rather than hardcoded, to reduce that risk,
but whoever owns the actual database should read both before executing
them against production data. A read-only safety check to run first:
```sql
SELECT proname FROM pg_proc WHERE proname = 'get_daily_report';
```
If that returns nothing, the report function name is free to use. If it
returns a row, someone already built something with that name — stop and
look before overwriting it.
