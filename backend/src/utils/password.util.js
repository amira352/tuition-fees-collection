import crypto from "crypto";

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Checks a password against the policy.
 * Returns an array of problems. An empty array means the password is fine.
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
 */
export const generateTemporaryPassword = (length = 12) => {
  // No characters that are easy to misread when read out or typed by hand.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  const bytes = crypto.randomBytes(length);

  let password = "";

  for (let i = 0; i < length; i += 1) {
    password += alphabet[bytes[i] % alphabet.length];
  }

  return password;
};
