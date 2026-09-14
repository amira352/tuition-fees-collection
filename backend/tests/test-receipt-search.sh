#!/bin/bash
# Receipt search by national ID.
# Run from backend/:   ./tests/test-receipt-search.sh
#
# Set NATIONAL_ID to a parent that actually exists in your database.

BASE="http://localhost:3000/api"
EMAIL="${EMAIL:-admin@cib.com}"
PASSWORD="${PASSWORD:-TestAdmin123}"
NATIONAL_ID="${NATIONAL_ID:-29805150101023}"

pass=0
fail=0

check () {
  if [ "$2" = "$3" ]; then
    echo "  ok    $1"
    pass=$((pass + 1))
  else
    echo "  FAIL  $1 - wanted '$3', got '$2'"
    fail=$((fail + 1))
  fi
}

echo "logging in"
TOKEN=$(curl -s -X POST "$BASE/auth/loginUser" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")

if [ -z "$TOKEN" ]; then
  echo "could not log in - is the server running?"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

echo
echo "1. a real national ID"
BODY=$(curl -s -H "$AUTH" "$BASE/receipts/search?nationalId=$NATIONAL_ID")
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/receipts/search?nationalId=$NATIONAL_ID")
check "returns 200" "$CODE" "200"
check "has a payer name" \
  "$(echo "$BODY" | python3 -c "import sys,json;print(bool(json.load(sys.stdin)['payer']['name']))")" "True"
check "does not echo the national ID" \
  "$(echo "$BODY" | grep -c "$NATIONAL_ID")" "0"
echo "  found $(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['page']['total_matching'])") receipt(s)"

echo
echo "2. rubbish input"
check "13 digits is 400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/receipts/search?nationalId=1234567890123")" "400"
check "letters is 400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/receipts/search?nationalId=abcdefghijklmn")" "400"
check "nothing at all is 400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/receipts/search")" "400"

echo
echo "3. valid shape, nobody there"
check "unknown parent is 404" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/receipts/search?nationalId=29805150109999")" "404"

echo
echo "4. the route is not swallowed by /:receiptNumber"
check "'search' was not read as a receipt number" \
  "$(curl -s -H "$AUTH" "$BASE/receipts/search?nationalId=$NATIONAL_ID" | grep -c 'No receipt with number')" "0"

echo
echo "5. no token"
check "401 without a token" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/receipts/search?nationalId=$NATIONAL_ID")" "401"

echo
echo "6. paging"
check "limit is respected" \
  "$(curl -s -H "$AUTH" "$BASE/receipts/search?nationalId=$NATIONAL_ID&limit=1" \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['page']['limit'])")" "1"
check "limit is capped at 100" \
  "$(curl -s -H "$AUTH" "$BASE/receipts/search?nationalId=$NATIONAL_ID&limit=5000" \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['page']['limit'])")" "100"
check "a silly limit falls back to 20" \
  "$(curl -s -H "$AUTH" "$BASE/receipts/search?nationalId=$NATIONAL_ID&limit=abc" \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['page']['limit'])")" "20"

echo
echo "-----------------------------"
echo "passed $pass, failed $fail"
[ "$fail" -eq 0 ] || exit 1
