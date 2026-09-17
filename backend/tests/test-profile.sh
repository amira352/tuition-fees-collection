#!/bin/bash
# GET /api/auth/me
# Run from backend/:  ./tests/test-profile.sh admin@cib.com "TestAdmin123"

BASE="http://localhost:3000/api"
EMAIL="${1:-admin@cib.com}"
PASSWORD="${2:-TestAdmin123}"

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

get () { echo "$BODY" | python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }

echo "logging in as $EMAIL"
TOKEN=$(curl -s -X POST "$BASE/auth/loginUser" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")

if [ -z "$TOKEN" ]; then
  echo "could not log in - is the server running?"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"
BODY=$(curl -s -H "$AUTH" "$BASE/auth/me")

echo
echo "1. it answers"
check "returns 200" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$BASE/auth/me")" "200"

echo
echo "2. the password hash never leaves the server"
check "no password_hash anywhere in the body" "$(echo "$BODY" | grep -c 'password_hash')" "0"
check "no bcrypt hash in the body"            "$(echo "$BODY" | grep -c '\$2[aby]\$')"   "0"

echo
echo "3. identity"
check "has a display name"  "$(get "bool(d['identity']['display_name'])")" "True"
check "has an email"        "$(get "bool(d['identity']['email'])")"        "True"
check "has a role label"    "$(get "bool(d['identity']['role_label'])")"   "True"
echo "        $(get "d['identity']['display_name'] + ' - ' + d['identity']['role_label']")"

echo
echo "4. access"
check "scope is network for bank staff" "$(get "d['access']['scope']")" "network"
check "has at least one permission"     "$(get "len(d['access']['permissions']) > 0")" "True"
echo "        $(get "', '.join(p['key'] for p in d['access']['permissions'])")"

echo
echo "5. security"
check "session expiry is present"   "$(get "bool(d['security']['session_expires_at'])")" "True"
check "mfa is reported as disabled" "$(get "d['security']['mfa']['enabled']")"           "False"
check "is_active is true"           "$(get "d['security']['is_active']")"                "True"
echo "        password changed: $(get "d['security']['password_changed_at'] or 'never'")"

echo
echo "6. no token"
check "401 without a token" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/auth/me")" "401"
check "401 with a rubbish token" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer nonsense' "$BASE/auth/me")" "401"

echo
echo "-----------------------------"
echo "passed $pass, failed $fail"
[ "$fail" -eq 0 ] || exit 1
