# Testing BE-3 — Bank Integration, Accounts & Instalments

Assumes: `wit-mock-services` running on port 8000, your backend running
locally (`npm run dev`), and you've already got a valid JWT for a
`back_office` or `admin` user.

**I never saw `auth.controller.js` / `auth.service.js` / `auth.routes.js`**,
so I don't know your exact login request shape. Use whatever your team's
real login endpoint is to get a token — the middleware I saw expects the
decoded JWT to have `.userId` and `.role`, which is what every example
below relies on. Save it once:

```powershell
$TOKEN = "paste your real token here"
$HEADERS = @{ Authorization = "Bearer $TOKEN" }
```

---

## Item 1 — Bank accounts lookup

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/bank/customers/29511020204536/accounts" -Headers $HEADERS
```
Expect: `{ accounts: [...], cards: [...] }`. Try a national ID that fails MOI validation (any of the mock's documented invalid/blocked IDs) — expect `400 VERIFICATION_FAILED`.

---

## Item 2 — Nothing to run

It's `BE-3-NOTES.md`, a written flag, not code.

---

## Item 3 — Timeout ≠ success

Hardest one to trigger on purpose. Two ways:
- **Stop `wit-mock-services`** entirely, then attempt a payment with a `card`-method tender (once card tenders are wired in — see the open question in `BE-3-NOTES.md`). Expect `502 PAYMENT_OUTCOME_UNKNOWN`, and the payment should stay in whatever "pending" state `createPendingPayment` sets, not `failed`.
- Confirm in your database afterward: the payment row should NOT be marked failed, and no tender should show a reversal.

---

## Item 4 — External bank transfer

Step 1, make a payment with a tender your team's shape supports (e.g. `method: "account"`) — note the returned `payment.id` and the tender's `id`.

Step 2, simulate the other bank's webhook call:
```powershell
$webhookBody = @{ payment_id = "<payment id>"; tender_id = "<tender id>"; provider_ref = "EXT-REF-001"; outcome = "SETTLED" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/api/payments/external-transfers/webhook" -Method Post -Body $webhookBody -ContentType "application/json" -Headers @{ "X-Webhook-Secret" = "<your EXTERNAL_TRANSFER_WEBHOOK_SECRET>" }
```
Expect: payment status updates. Try `outcome = "FAILED"` too and confirm the payment is marked failed.

---

## Item 5 & 6 — EPP eligibility + plan record

```powershell
# Quotes
Invoke-RestMethod -Uri "http://localhost:4000/api/epp/quotes?amount=17100" -Headers $HEADERS

# Create a plan from an already-settled, full, card-tender payment
$eppBody = @{ paymentId = "<a settled payment id with a card tender>"; tenorMonths = 12 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/api/epp" -Method Post -Body $eppBody -ContentType "application/json" -Headers $HEADERS
```
Expect success only if: payment status is `settled`/`captured`, `payment_type` is `full`, and one of its tenders has `method: "card"`. Try it against a `partial` payment or a `cash`/`account`-only payment — expect `422 EPP_REQUIRES_FULL_PAYMENT` or `422 EPP_REQUIRES_CARD`.

Check the response: `interest`, `admin_fee`, `annual_rate`, `total_amount` should all be numbers that came from the mock's own response — not simple hand-calculable round numbers you'd get from a naive formula.

---

## Item 7 — Config-driven tenors

```powershell
$eppBody = @{ paymentId = "<same payment id>"; tenorMonths = 36 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/api/epp" -Method Post -Body $eppBody -ContentType "application/json" -Headers $HEADERS
```
36 isn't in the mock's own supported list (only 3/6/12/18/24), so expect the mock itself to reject it with `UNSUPPORTED_TENOR` — that's a limit of the training mock, not your code. To prove *your* app-level config actually works, try a tenor **not** in your `EPP_ALLOWED_TENORS` list, e.g. `9` — expect your own `422 UNSUPPORTED_TENOR` before it even reaches the mock.

---

## Item 8 — Daily report

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/institutions/<institution id>/reports/daily" -Headers $HEADERS
Invoke-RestMethod -Uri "http://localhost:4000/api/institutions/<institution id>/reports/daily?date=2026-09-08" -Headers $HEADERS
Invoke-RestMethod -Uri "http://localhost:4000/api/institutions/<institution id>/reports/daily?format=csv" -Headers $HEADERS -OutFile report.csv
```
Check: `summary` entries per fee type, `grand_total_collected` equals the sum of each `total_collected`, `total_outstanding` reflects current unpaid balances regardless of date filter.

---

## Item 9 — Error shape

Trigger any error (e.g. a malformed national ID on item 1, or a validation failure on payment creation) and confirm the response is exactly:
```json
{ "code": "...", "message": "...", "field": "..." }
```
flat, no wrapper object, on every single error — old routes and new ones alike.
