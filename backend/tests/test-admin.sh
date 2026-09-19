#!/bin/bash
# Tests the admin + forced password change feature end to end.
#
# Usage:
#   chmod +x test-admin.sh
#   ./test-admin.sh admin@cib.com "YourAdminPassword"
#
# The server must already be running in another terminal (npm run dev).

BASE="${BASE_URL:-http://localhost:3000/api}"
ADMIN_EMAIL="$1"
ADMIN_PASS="$2"

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASS" ]; then
  echo 'Usage: ./test-admin.sh admin@cib.com "YourAdminPassword"'
  exit 1
fi

pass=0
fail=0

# Pull one field out of a JSON body
field() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1','') if not isinstance(d.get('$1'),dict) else json.dumps(d.get('$1')))" 2>/dev/null; }

check() { # check <label> <expected status> <actual status>
  if [ "$2" = "$3" ]; then
    echo "  PASS  $1  (got $3)"
    pass=$((pass+1))
  else
    echo "  FAIL  $1  (expected $2, got $3)"
    fail=$((fail+1))
  fi
}

# Sends a request. Sets $STATUS and $BODY.
req() { # req <method> <path> <token-or-empty> <json-or-empty>
  local args=(-s -w '\n%{http_code}' -X "$1" "$BASE$2" -H 'Content-Type: application/json')
  [ -n "$3" ] && args+=(-H "Authorization: Bearer $3")
  [ -n "$4" ] && args+=(-d "$4")
  local out
  out=$(curl "${args[@]}")
  STATUS=$(echo "$out" | tail -n1)
  BODY=$(echo "$out" | sed '$d')
}

echo ""
echo "Testing against $BASE"
echo "============================================================"

# ---------------------------------------------------------------
echo ""
echo "1. Admin logs in"
req POST /auth/loginUser "" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}"
check "admin login" 200 "$STATUS"
ADMIN_TOKEN=$(echo "$BODY" | field token)
ADMIN_ROLE=$(echo "$BODY" | field role)
echo "        role = $ADMIN_ROLE"

if [ -z "$ADMIN_TOKEN" ]; then
  echo ""
  echo "  Could not log in. Response was:"
  echo "  $BODY"
  echo ""
  echo "  Stopping - nothing else can be tested without an admin token."
  exit 1
fi

if [ "$ADMIN_ROLE" != "admin" ]; then
  echo ""
  echo "  This account logged in but its role is '$ADMIN_ROLE', not 'admin'."
  echo "  The admin routes will reject it. Fix the role in Supabase first."
  exit 1
fi

# ---------------------------------------------------------------
echo ""
echo "2. Admin creates a back office user"
STAMP=$(date +%s)
NEW_EMAIL="test.user.$STAMP@cib.com"
req POST /admin/users/back-office "$ADMIN_TOKEN" \
  "{\"email\":\"$NEW_EMAIL\",\"fullName\":\"Test User\",\"branch\":\"HQ\"}"
check "create back office user" 201 "$STATUS"
TEMP_PASS=$(echo "$BODY" | field temporaryPassword)
echo "        email = $NEW_EMAIL"
echo "        temp  = $TEMP_PASS"

if [ -z "$TEMP_PASS" ]; then
  echo "  No temporary password returned. Response: $BODY"
  exit 1
fi

# ---------------------------------------------------------------
echo ""
echo "3. Same email twice is refused"
req POST /admin/users/back-office "$ADMIN_TOKEN" \
  "{\"email\":\"$NEW_EMAIL\",\"fullName\":\"Duplicate\",\"branch\":\"HQ\"}"
check "duplicate email rejected" 409 "$STATUS"

# ---------------------------------------------------------------
echo ""
echo "4. Password shorter than 8 characters is refused"
req POST /admin/users/back-office "$ADMIN_TOKEN" \
  "{\"email\":\"short.$STAMP@cib.com\",\"fullName\":\"Short\",\"branch\":\"HQ\",\"password\":\"abc\"}"
check "short password rejected" 400 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

echo ""
echo "4b. Password with no number is refused"
req POST /admin/users/back-office "$ADMIN_TOKEN" \
  "{\"email\":\"nonum.$STAMP@cib.com\",\"fullName\":\"No Number\",\"branch\":\"HQ\",\"password\":\"abcdefgh!\"}"
check "password without a number rejected" 400 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

echo ""
echo "4c. Password with no special character is refused"
req POST /admin/users/back-office "$ADMIN_TOKEN" \
  "{\"email\":\"nospec.$STAMP@cib.com\",\"fullName\":\"No Special\",\"branch\":\"HQ\",\"password\":\"abcdefg123\"}"
check "password without a special character rejected" 400 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

# ---------------------------------------------------------------
echo ""
echo "5. Invalid institution type is refused"
req POST /admin/users/institution "$ADMIN_TOKEN" \
  "{\"email\":\"bad.$STAMP@cib.com\",\"name\":\"Bad College\",\"type\":\"college\"}"
check "bad institution type rejected" 400 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

# ---------------------------------------------------------------
echo ""
echo "6. New user logs in with the temporary password"
req POST /auth/loginUser "" "{\"email\":\"$NEW_EMAIL\",\"password\":\"$TEMP_PASS\"}"
check "new user login" 200 "$STATUS"
USER_TOKEN=$(echo "$BODY" | field token)
MUST=$(echo "$BODY" | field mustChangePassword)
check "mustChangePassword is true" True "$MUST"

# ---------------------------------------------------------------
echo ""
echo "7. That token cannot be used for anything else"
req GET /admin/users "$USER_TOKEN" ""
check "scoped token blocked from admin route" 403 "$STATUS"
echo "        message: $(echo "$BODY" | field message)"

# ---------------------------------------------------------------
echo ""
echo "8. New password must meet the policy"
req POST /auth/change-password "$USER_TOKEN" \
  "{\"currentPassword\":\"$TEMP_PASS\",\"newPassword\":\"abc\",\"confirmPassword\":\"abc\"}"
check "short new password rejected" 400 "$STATUS"

req POST /auth/change-password "$USER_TOKEN" \
  "{\"currentPassword\":\"$TEMP_PASS\",\"newPassword\":\"abcdefghi\",\"confirmPassword\":\"abcdefghi\"}"
check "new password without a number rejected" 400 "$STATUS"

req POST /auth/change-password "$USER_TOKEN" \
  "{\"currentPassword\":\"$TEMP_PASS\",\"newPassword\":\"abcdefg123\",\"confirmPassword\":\"abcdefg123\"}"
check "new password without a special character rejected" 400 "$STATUS"

echo ""
echo "9. Confirmation must match"
req POST /auth/change-password "$USER_TOKEN" \
  "{\"currentPassword\":\"$TEMP_PASS\",\"newPassword\":\"GoodPass123!\",\"confirmPassword\":\"OtherPass123!\"}"
check "mismatched confirmation rejected" 400 "$STATUS"

echo ""
echo "10. Wrong current password is refused"
req POST /auth/change-password "$USER_TOKEN" \
  "{\"currentPassword\":\"WrongPass123\",\"newPassword\":\"GoodPass123!\",\"confirmPassword\":\"GoodPass123!\"}"
check "wrong current password rejected" 401 "$STATUS"

# ---------------------------------------------------------------
echo ""
echo "11. Changing the password works"
req POST /auth/change-password "$USER_TOKEN" \
  "{\"currentPassword\":\"$TEMP_PASS\",\"newPassword\":\"GoodPass123!\",\"confirmPassword\":\"GoodPass123!\"}"
check "password changed" 200 "$STATUS"

# ---------------------------------------------------------------
echo ""
echo "12. Logging in again is no longer forced to change"
req POST /auth/loginUser "" "{\"email\":\"$NEW_EMAIL\",\"password\":\"GoodPass123!\"}"
check "login with new password" 200 "$STATUS"
MUST2=$(echo "$BODY" | field mustChangePassword)
check "mustChangePassword is now false" False "$MUST2"
FULL_TOKEN=$(echo "$BODY" | field token)

# ---------------------------------------------------------------
echo ""
echo "13. Back office user still cannot reach admin routes"
req GET /admin/users "$FULL_TOKEN" ""
check "non-admin blocked from admin route" 403 "$STATUS"

# ---------------------------------------------------------------
echo ""
echo "14. Old temporary password no longer works"
req POST /auth/loginUser "" "{\"email\":\"$NEW_EMAIL\",\"password\":\"$TEMP_PASS\"}"
check "old password rejected" 401 "$STATUS"

# ---------------------------------------------------------------
echo ""
echo "15. No token at all is refused"
req GET /admin/users "" ""
check "missing token rejected" 401 "$STATUS"

echo ""
echo "============================================================"
echo "  passed: $pass    failed: $fail"
echo "============================================================"
echo ""
echo "Clean up when you are done, in Supabase:"
echo "  delete from bank_employees where email like 'test.user.%@cib.com';"
echo ""
