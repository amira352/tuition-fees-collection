import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  findBankEmployeeByemail,
  findBankEmployeeById,
  updateBankEmployeePassword
} from "../repositories/bankEmployee.repository.js";

import {
  findInstitutionByEmail,
  findInstitutionById,
  updateInstitutionPassword
} from "../repositories/institution.repository.js";

import { assertPasswordIsValid } from "../utils/password.util.js";

const SALT_ROUNDS = 10;

const invalidCredentials = () => {
  const error = new Error("Invalid email or password");
  error.statusCode = 401;
  return error;
};

/**
 * Signs a token.
 *
 * A user who still has to change their password gets a token with
 * scope "password_change". The auth middleware only accepts that scope on
 * the change-password route, so the account cannot be used for anything
 * else until a new password is set.
 */
const signToken = (payload, mustChangePassword) => {
  const claims = { ...payload };

  if (mustChangePassword) {
    claims.scope = "password_change";
  }

  return jwt.sign(claims, process.env.JWT_SECRET, {
    expiresIn: mustChangePassword
      ? "15m"
      : process.env.JWT_EXPIRES_IN || "1d"
  });
};

export const login = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

  // -----------------------------------
  // 1. Search bank employees
  // -----------------------------------
  const bankEmployee = await findBankEmployeeByemail(normalizedEmail);

  if (bankEmployee) {
    const passwordMatches = await bcrypt.compare(
      password,
      bankEmployee.password_hash
    );

    if (!passwordMatches) {
      throw invalidCredentials();
    }

    if (bankEmployee.is_active === false) {
      const error = new Error("This account has been deactivated");
      error.statusCode = 403;
      throw error;
    }

    // An admin is a bank employee whose role is 'admin'.
    const role = bankEmployee.role || "back_office";

    const mustChangePassword = bankEmployee.must_change_password === true;

    const token = signToken(
      { userId: bankEmployee.id, role },
      mustChangePassword
    );

    return {
      token,
      role,
      mustChangePassword,
      user: {
        id: bankEmployee.id,
        email: bankEmployee.email,
        fullName: bankEmployee.full_name,
        branch: bankEmployee.branch
      }
    };
  }

  // -----------------------------------
  // 2. Search institutions
  // -----------------------------------
  const institution = await findInstitutionByEmail(normalizedEmail);

  if (institution) {
    const passwordMatches = await bcrypt.compare(
      password,
      institution.password_hash
    );

    if (!passwordMatches) {
      throw invalidCredentials();
    }

    if (institution.is_active === false) {
      const error = new Error("This account has been deactivated");
      error.statusCode = 403;
      throw error;
    }

    const role = "institution";

    const mustChangePassword = institution.must_change_password === true;

    const token = signToken(
      { userId: institution.id, role },
      mustChangePassword
    );

    return {
      token,
      role,
      mustChangePassword,
      user: {
        id: institution.id,
        name: institution.name,
        type: institution.type,
        email: institution.email
      }
    };
  }

  // Neither table contained this email
  throw invalidCredentials();
};

/**
 * Changes the password of the signed-in user.
 *
 * Used both for the forced change after an admin created the account, and
 * for a normal voluntary change later on.
 */
export const changePassword = async (
  { userId, role },
  { currentPassword, newPassword, confirmPassword }
) => {
  if (!currentPassword) {
    const error = new Error("Current password is required");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword !== confirmPassword) {
    const error = new Error("New password and confirmation do not match");
    error.statusCode = 400;
    throw error;
  }

  assertPasswordIsValid(newPassword);

  if (newPassword === currentPassword) {
    const error = new Error(
      "New password must be different from the current password"
    );
    error.statusCode = 400;
    throw error;
  }

  const isInstitution = role === "institution";

  const account = isInstitution
    ? await findInstitutionById(userId)
    : await findBankEmployeeById(userId);

  if (!account) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  const currentMatches = await bcrypt.compare(
    currentPassword,
    account.password_hash
  );

  if (!currentMatches) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  if (isInstitution) {
    await updateInstitutionPassword(userId, newHash);
  } else {
    await updateBankEmployeePassword(userId, newHash);
  }

  // Issue a full token so the user can carry on without logging in again.
  const token = signToken({ userId, role }, false);

  return {
    token,
    role,
    mustChangePassword: false
  };
};
