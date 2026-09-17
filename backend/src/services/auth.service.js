import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  findBankEmployeeByemail,
  findBankEmployeeById,
  findBankEmployeeProfile,
  updateBankEmployeePassword
} from "../repositories/bankEmployee.repository.js";

import {
  findInstitutionByEmail,
  findInstitutionById,
  findInstitutionProfile,
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

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const ROLE_LABELS = {
  admin: "System Administrator",
  back_office: "Back Office Agent",
  institution: "Institution"
};

// What each role is actually allowed to do, written to match the route
// guards rather than stored in a table. A stored list would drift the first
// time somebody changes a requireRole and forgets the copy - and a profile
// page that lies about permissions is worse than one that shows none.
const PERMISSIONS = {
  admin: [
    { key: "national_id_lookup", label: "National ID lookup" },
    { key: "collect_fees", label: "Manual fee collection" },
    { key: "issue_receipts", label: "Issue official receipts" },
    { key: "epp_plans", label: "EPP plan activation" },
    { key: "view_all_payments", label: "View all payment history" },
    { key: "manage_staff", label: "Create back-office staff" },
    { key: "manage_institutions", label: "Register institutions" }
  ],
  back_office: [
    { key: "national_id_lookup", label: "National ID lookup" },
    { key: "collect_fees", label: "Manual fee collection" },
    { key: "issue_receipts", label: "Issue official receipts" },
    { key: "epp_plans", label: "EPP plan activation" },
    { key: "view_all_payments", label: "View all payment history" }
  ],
  institution: [
    { key: "upload_fees", label: "Upload fee files" },
    { key: "view_own_payments", label: "View payments for this institution" }
  ]
};

const accountNotFound = () => {
  const error = new Error("Account not found");
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  return error;
};

/**
 * Everything the profile page shows about whoever is signed in.
 *
 * Works for all three roles. The token only carries a user id and a role, so
 * without this the page has nothing to display after a refresh.
 *
 * `exp` comes off the verified token, which means the session expiry needs no
 * database round trip - it is already in the thing the caller sent us.
 */
export const getProfile = async ({ userId, role, exp }) => {
  const isInstitution = role === "institution";

  const account = isInstitution
    ? await findInstitutionProfile(userId)
    : await findBankEmployeeProfile(userId);

  if (!account) {
    throw accountNotFound();
  }

  const effectiveRole = isInstitution ? "institution" : account.role || "back_office";

  return {
    identity: {
      id: account.id,
      display_name: isInstitution ? account.name : account.full_name,
      email: account.email,
      role: effectiveRole,
      role_label: ROLE_LABELS[effectiveRole] || effectiveRole,
      branch: isInstitution ? null : account.branch || null,
      institution_type: isInstitution ? account.type || null : null,
      member_since: account.created_at || null
    },

    access: {
      // An institution only ever sees its own rows. Bank staff see the whole
      // network. Same rule the dashboard and payment history already use.
      scope: isInstitution ? "institution" : "network",
      is_admin: effectiveRole === "admin",
      permissions: PERMISSIONS[effectiveRole] || []
    },

    security: {
      // null means the password has never been changed since the admin
      // created the account, which is worth showing rather than hiding.
      password_changed_at: account.password_changed_at || null,
      must_change_password: account.must_change_password === true,
      is_active: account.is_active !== false,
      session_expires_at: exp ? new Date(exp * 1000).toISOString() : null,

      // Reported honestly. There is no second factor anywhere in this system,
      // so the page says so instead of showing a badge that means nothing.
      mfa: {
        enabled: false,
        reason: "Two-factor authentication is not implemented in this system"
      }
    }
  };
};
