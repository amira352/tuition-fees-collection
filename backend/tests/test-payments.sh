#!/bin/bash
# Tests POST /api/payments.
#
# Run reset-payment-tests.sql in Supabase first, every time - these tests
# depend on the three TEST fees being back at their full balance.
#
# Usage:
#   ./test-payments.sh admin@cib.com "YourPassword"

BASE="${BASE_URL:-http://localhost:3000/api}"
EMAIL="$1"
PASSWORD="$2"

PARENT="11111111-1111-1111-1111-111111111111"
FEE_A="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"   # tuition 8500
FEE_B="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"   # bus     2450
FEE_C="cccccccc-cccc-cccc-cccc-cccccccccccc"   # books   1000
FEE_D="dddddddd-dddd-dddd-dddd-dddddddddddd"   # activities 5000, never settled

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo 'Usage: ./test-payments.sh admin@cib.com "YourPassword"'
  exit 1
fi

pass=0
fail=0

field() { python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print(''); raise SystemExit
for k in '$1'.split('.'):
    if isinstance(d, dict):
        d = d.get(k, '')
    else:
        d = ''
print(d if not isinstance(d, (dict, list)) else json.dumps(d))
" 2>/dev/null; }

captured_count() { python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print(0); raise SystemExit
t = d.get('payment', {}).get('payment_tenders', [])
print(sum(1 for x in t if x.get('status') == 'captured'))
" 2>/dev/null; }

check() {
  if [ "$2" = "$3" ]; then
    echo "  PASS  $1  (got $3)"
    pass=$((pass+1))
  else
    echo "  FAIL  $1  (expected $2, got $3)"
    echo "        body: $BODY"
    fail=$((fail+1))
  fi
}

pay() {
  local out
  out=$(curl -s -w '\n%{http_code}' -X POST "$BASE/payments" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$1")
  STATUS=$(echo "$out" | tail -n1)
  BODY=$(echo "$out" | sed '$d')
}

echo ""
echo "Testing $BASE/payments"
echo "============================================================"

TOKEN=$(curl -s -X POST "$BASE/auth/loginUser" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | field token)

if [ -z "$TOKEN" ]; then
  echo "Could not log in. Check the email and password."
  exit 1
fi

# ---------------------------------------------------------------
echo ""
echo "1. Partial payment - 500 against the 8500 tuition fee"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"partial\",
      \"items\":[{\"fee_id\":\"$FEE_A\",\"amount\":500}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":500}]}"
check "partial payment accepted" 201 "$STATUS"

echo ""
echo "2. The balance really moved - 8500 should no longer be payable"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_A\",\"amount\":8500}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":8500}]}"
check "paying the original amount now refused" 400 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

echo ""
echo "3. Paying the exact remainder of 8000 works"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_A\",\"amount\":8000}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":8000}]}"
check "remainder settled" 201 "$STATUS"

# ---------------------------------------------------------------
echo ""
echo "4. Split across two accounts - 1225 + 1225 for the 2450 bus fee"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_B\",\"amount\":2450}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":1225},
                   {\"method\":\"account\",\"account_ref\":\"****1190\",\"amount\":1225}]}"
check "split payment accepted" 201 "$STATUS"
check "both legs captured" 2 "$(echo "$BODY" | captured_count)"

# ---------------------------------------------------------------
echo ""
echo "5. One leg declines - the other must be reversed"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_C\",\"amount\":1000}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":500},
                   {\"method\":\"account\",\"account_ref\":\"DECLINE\",\"amount\":500}]}"
check "declined payment refused" 402 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

echo ""
echo "6. Nothing was left half paid - the full 1000 is still owed"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_C\",\"amount\":1000}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":1000}]}"
check "fee untouched by the failed attempt" 201 "$STATUS"

# ---------------------------------------------------------------
echo ""
echo "7. Cannot pay more than is owed - 9999 against a fee of 5000"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_D\",\"amount\":9999}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":9999}]}"
check "overpayment refused" 400 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

echo ""
echo "8. Fee lines and accounts must add up to the same total"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_D\",\"amount\":1000}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":900}]}"
check "mismatched totals refused" 400 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

echo ""
echo "9. A payment with no fee lines"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",\"items\":[],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":100}]}"
check "empty fee list refused" 400 "$STATUS"

echo ""
echo "10. A payment with no account"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_D\",\"amount\":100}],\"tenders\":[]}"
check "empty account list refused" 400 "$STATUS"

echo ""
echo "11. A negative amount"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_D\",\"amount\":-100}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":-100}]}"
check "negative amount refused" 400 "$STATUS"

echo ""
echo "12. A fee that does not exist"
pay "{\"parentId\":\"$PARENT\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"99999999-9999-9999-9999-999999999999\",\"amount\":100}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":100}]}"
check "unknown fee refused" 400 "$STATUS"

echo ""
echo "13. A fee belonging to somebody else's child"
pay "{\"parentId\":\"5244c527-c48c-4ad5-9190-253d70dfa000\",\"paymentType\":\"full\",
      \"items\":[{\"fee_id\":\"$FEE_D\",\"amount\":100}],
      \"tenders\":[{\"method\":\"account\",\"account_ref\":\"****4821\",\"amount\":100}]}"
check "another parent's fee refused" 400 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

echo ""
echo "14. No token"
out=$(curl -s -w '\n%{http_code}' -X POST "$BASE/payments" \
  -H 'Content-Type: application/json' \
  -d "{\"parentId\":\"$PARENT\",\"items\":[],\"tenders\":[]}")
STATUS=$(echo "$out" | tail -n1)
BODY=$(echo "$out" | sed '$d')
check "missing token refused" 401 "$STATUS"

echo ""
echo "============================================================"
echo "  passed: $pass    failed: $fail"
echo "============================================================"
echo ""
echo "Then check the balances in Supabase:"
echo "  select fee_type, amount, outstanding_amount, status"
echo "    from fees where period = 'TEST' order by fee_type;"
echo ""
echo "  tuition, bus and books should all be 0 / paid."
echo "  activities stays at 5000 / unpaid - the negative tests use it."
echo ""
