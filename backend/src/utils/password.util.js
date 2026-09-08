import crypto from "crypto";

export const MIN_PASSWORD_LENGTH = 8;

// Accepted as "special characters" when someone chooses a password.
// Kept deliberately wide so we do not reject a perfectly good password.
const SPECIAL_CHARACTERS = "!@#$%^&*()-_=+[]{};:'\",.<>/?\\|`~";

/**
 * Checks a password against the policy.
 * Returns an array of problems. An empty array means the password is fine.
 *
 * Policy:
 *   - at least 8 characters
 *   - at least one number
 *   - at least one special character
 *   - no leading or trailing space
 */
export const getPasswordProblems = (password) => {
  const problems = [];

  if (typeof password !== "string" || password.length === 0) {
    problems.push("Password is required");
    return problems;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }

  const hasNumber = password.split("").some((c) => c >= "0" && c <= "9");

  if (!hasNumber) {
    problems.push("Password must contain at least one number");
  }

  const hasSpecial = password
    .split("")
    .some((c) => SPECIAL_CHARACTERS.includes(c));

  if (!hasSpecial) {
    problems.push("Password must contain at least one special character");
  }

  if (password.trim().length !== password.length) {
    problems.push("Password must not start or end with a space");
  }

  return problems;
};

/**
 * Throws a 400 error if the password does not meet the policy.
 */
export const assertPasswordIsValid = (password) => {
  const problems = getPasswordProblems(password);

  if (problems.length > 0) {
    const error = new Error(problems.join(". "));
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Builds a temporary password for a new account.
 * The admin hands this to the user, who must then change it on first login.
 *
 * The result always satisfies the policy above: it is built with one
 * character from each required group before the rest is filled in, then
 * shuffled so the guaranteed characters are not always in the same place.
 *
 * Characters that are easy to misread when written down or read out
 * (0/O, 1/l/I) are left out on purpose.
 */
export const generateTemporaryPassword = (length = 12) => {
  if (length < 8) {
    throw new Error("Temporary password must be at least 8 characters");
  }

  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";

  // A narrow set here, so the password survives being copied into an
  // email, a terminal or a JSON body without needing to be escaped.
  const specials = "!@#$%*?";

  const everything = lower + upper + digits + specials;

  const pick = (set) => set[crypto.randomInt(set.length)];

  const characters = [
    pick(lower),
    pick(upper),
    pick(digits),
    pick(specials)
  ];

  while (characters.length < length) {
    characters.push(pick(everything));
  }

  // Fisher-Yates shuffle, using crypto randomness rather than Math.random
  for (let i = characters.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }

  return characters.join("");
};
