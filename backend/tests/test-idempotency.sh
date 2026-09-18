#!/bin/bash
# Tests the Idempotency-Key handling on POST /api/payments.
#
# Run reset-idempotency-tests.sql in Supabase first, every time.
#
# The mock bank must be running on the feature/backoffice-customer-lookup
# branch - every non-cash leg is charged against a real source id now.
#
# Usage:
#   ./tests/test-idempotency.sh admin@cib.com "YourPassword"

BASE="${BASE_URL:-http://localhost:3000/api}"
MOCK="${MOCK_URL:-http://localhost:8000}"
EMAIL="$1"
PASSWORD="$2"

PARENT="11111111-1111-1111-1111-111111111111"
FEE_E="eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"   # 3000, settled by steps 1-3
FEE_F="ffffffff-ffff-ffff-ffff-ffffffffffff"   # 500, kept unpaid for the decline test

ACC="acc_mona_current"
BLOCKED="card_ahmed_visa"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo 'Usage: ./tests/test-idempotency.sh admin@cib.com "YourPassword"'
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
    d = d.get(k, '') if isinstance(d, dict) else ''
print(d if not isinstance(d, (dict, list)) else json.dumps(d))
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

# pay <idempotency-key-or-empty> <json>
pay() {
  local args=(-s -w '\n%{http_code}' -X POST "$BASE/payments"
              -H "Authorization: Bearer $TOKEN"
              -H 'Content-Type: application/json')
  [ -n "$1" ] && args+=(-H "Idempotency-Key: $1")
  args+=(-d "$2")
  local out
  out=$(curl "${args[@]}")
  STATUS=$(echo "$out" | tail -n1)
  BODY=$(echo "$out" | sed '$d')
}

body_for() {
  echo "{\"parentId\":\"$PARENT\",\"paymentType\":\"partial\",
         \"items\":[{\"fee_id\":\"$FEE_E\",\"amount\":$1}],
         \"tenders\":[{\"method\":\"account\",\"account_ref\":\"$ACC\",\"amount\":$1}]}"
}

echo ""
echo "Testing Idempotency-Key on $BASE/payments"
echo "============================================================"

echo "resetting the mock bank's balances"
curl -s -X POST "$MOCK/api/v1/admin/reset" -H "X-API-Key: wit-intern-2026" > /dev/null \
  || echo "  (could not reach the mock at $MOCK - is it running?)"

TOKEN=$(curl -s -X POST "$BASE/auth/loginUser" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | field token)

if [ -z "$TOKEN" ]; then
  echo "Could not log in."
  exit 1
fi

KEY="test-key-$(date +%s)-$RANDOM"

echo ""
echo "1. First request with a key - pay 1000 of the 3000 fee"
pay "$KEY" "$(body_for 1000)"
check "first payment accepted" 201 "$STATUS"
FIRST_ID=$(echo "$BODY" | field payment.id)
echo "        payment: $FIRST_ID"

echo ""
echo "2. The same key and the same body again - the double click"
pay "$KEY" "$(body_for 1000)"
check "replay accepted" 201 "$STATUS"
SECOND_ID=$(echo "$BODY" | field payment.id)
echo "        payment: $SECOND_ID"
check "replay returned the original payment" "$FIRST_ID" "$SECOND_ID"

echo ""
echo "3. It was only charged once - 2000 should still be owed"
pay "" "$(body_for 2000)"
check "exactly 2000 left to pay" 201 "$STATUS"

echo ""
echo "4. The same key with a different amount"
pay "$KEY" "$(body_for 500)"
check "reused key with a different body refused" 409 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

echo ""
echo "5. A fresh key is a genuine new payment, not a replay"
NEW_KEY="test-key-$(date +%s)-$RANDOM-b"
pay "$NEW_KEY" "$(body_for 100)"
check "new key refused - the fee is settled" 400 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

echo ""
echo "6. A declined payment releases its key so it can be retried"
RETRY_KEY="test-key-$(date +%s)-$RANDOM-c"
pay "$RETRY_KEY" "{\"parentId\":\"$PARENT\",\"paymentType\":\"partial\",
   \"items\":[{\"fee_id\":\"$FEE_F\",\"amount\":100}],
   \"tenders\":[{\"method\":\"account\",\"account_ref\":\"DECLINE\",\"amount\":100}]}"
check "declined" 402 "$STATUS"

pay "$RETRY_KEY" "{\"parentId\":\"$PARENT\",\"paymentType\":\"partial\",
   \"items\":[{\"fee_id\":\"$FEE_F\",\"amount\":100}],
   \"tenders\":[{\"method\":\"account\",\"account_ref\":\"DECLINE\",\"amount\":100}]}"
check "same key usable again after a decline" 402 "$STATUS"
echo "        (409 here would mean a declined card burns the key)"

echo ""
echo "7. A blocked card releases its key too"
echo "   (the bank refusing a source is a decline, not an unknown outcome)"
BLOCK_KEY="test-key-$(date +%s)-$RANDOM-d"
pay "$BLOCK_KEY" "{\"parentId\":\"$PARENT\",\"paymentType\":\"partial\",
   \"items\":[{\"fee_id\":\"$FEE_F\",\"amount\":100}],
   \"tenders\":[{\"method\":\"card\",\"account_ref\":\"$BLOCKED\",\"amount\":100}]}"
check "blocked card refused" 422 "$STATUS"

pay "$BLOCK_KEY" "{\"parentId\":\"$PARENT\",\"paymentType\":\"partial\",
   \"items\":[{\"fee_id\":\"$FEE_F\",\"amount\":100}],
   \"tenders\":[{\"method\":\"card\",\"account_ref\":\"$BLOCKED\",\"amount\":100}]}"
check "same key usable again after a blocked card" 422 "$STATUS"
echo "        (409 here would mean a blocked card burns the key)"

echo ""
echo "============================================================"
echo "  passed: $pass    failed: $fail"
echo "============================================================"
echo ""
