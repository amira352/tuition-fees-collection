import bcrypt from "bcryptjs";

import {
  createBankEmployee,
  findBankEmployeeByemail,
  listBankEmployees
} from "../repositories/bankEmployee.repository.js";

import {
  createInstitution,
  findInstitutionByEmail,
  listInstitutions
} from "../repositories/institution.repository.js";

import {
  assertPasswordIsValid,
  generateTemporaryPassword
} from "../utils/password.util.js";

const SALT_ROUNDS = 10;

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const conflict = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

/**
 * An email may only exist once across both tables, otherwise login
 * cannot tell which account the person meant.
 */
const assertEmailIsFree = async (email) => {
  const existingEmployee = await findBankEmployeeByemail(email);

  if (existingEmployee) {
    throw conflict("An account with this email already exists");
  }

  const existingInstitution = await findInstitutionByEmail(email);

  if (existingInstitution) {
    throw conflict("An account with this email already exists");
  }
};

// The database only accepts these two values for institutions.type.
// Checking here turns a database constraint error into a clear 400.
const INSTITUTION_TYPES = ["school", "university"];

const normalizeEmail = (email) => {
  if (!email || typeof email !== "string") {
    throw badRequest("Email is required");
  }

  const normalized = email.trim().toLowerCase();

  // Simple shape check - the real check is that the user can receive the
  // temporary password we send to this address.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw badRequest("Email is not valid");
  }

  return normalized;
};

/**
 * Admin creates a back office user.
 *
 * If the admin supplies a password we check it against the policy.
 * If they do not, we generate a temporary one and return it so the admin
 * can pass it to the user. Either way the account is created with
 * must_change_password = true.
 */
export const createBackOfficeUser = async (
  { email, fullName, branch, password },
  adminId
) => {
  const normalizedEmail = normalizeEmail(email);

  if (!fullName || !fullName.trim()) {
    throw badRequest("Full name is required");
  }

  if (!branch || !branch.trim()) {
    throw badRequest("Branch is required");
  }

  await assertEmailIsFree(normalizedEmail);

  let temporaryPassword = password;

  if (temporaryPassword) {
    assertPasswordIsValid(temporaryPassword);
  } else {
    temporaryPassword = generateTemporaryPassword();
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

  const created = await createBankEmployee({
    email: normalizedEmail,
    passwordHash,
    branch: branch.trim(),
    fullName: fullName.trim(),
    role: "back_office",
    createdBy: adminId
  });

  return {
    user: created,
    temporaryPassword
  };
};

/**
 * Admin creates an institution user.
 */
export const createInstitutionUser = async (
  { email, name, type, password },
  adminId
) => {
  const normalizedEmail = normalizeEmail(email);

  if (!name || !name.trim()) {
    throw badRequest("Institution name is required");
  }

  if (!type || !type.trim()) {
    throw badRequest("Institution type is required");
  }

  const normalizedType = type.trim().toLowerCase();

  if (!INSTITUTION_TYPES.includes(normalizedType)) {
    throw badRequest(
      `Institution type must be one of: ${INSTITUTION_TYPES.join(", ")}`
    );
  }

  await assertEmailIsFree(normalizedEmail);

  let temporaryPassword = password;

  if (temporaryPassword) {
    assertPasswordIsValid(temporaryPassword);
  } else {
    temporaryPassword = generateTemporaryPassword();
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

  const created = await createInstitution({
    name: name.trim(),
    type: normalizedType,
    email: normalizedEmail,
    passwordHash,
    createdBy: adminId
  });

  return {
    institution: created,
    temporaryPassword
  };
};

export const getAllUsers = async () => {
  const [bankEmployees, institutions] = await Promise.all([
    listBankEmployees(),
    listInstitutions()
  ]);

  return {
    bankEmployees,
    institutions
  };
};
