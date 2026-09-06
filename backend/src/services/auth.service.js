import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { findBankEmployeeByemail } from "../repositories/bankEmployee.repository.js";
import { findInstitutionByEmail } from "../repositories/institution.repository.js";

export const login = async (email, password) => {
  // Normalize email
  const normalizedEmail = email.trim().toLowerCase();


    // -----------------------------------
    // 1. Search bank employees
    // -----------------------------------
  const bankEmployee =
    await findBankEmployeeByemail(normalizedEmail);

  if (bankEmployee) {
    const passwordMatches = await bcrypt.compare(
      password,
      bankEmployee.password_hash
    );

    if (!passwordMatches) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    const role = "bank_employee";

    const token = jwt.sign(
      {
        userId: bankEmployee.id,
        role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d"
      }
    );

    return {
      token,
      role,
      user: {
        id: bankEmployee.id,
        email: bankEmployee.email,
        branch: bankEmployee.branch
      }
    };
  }

  // -----------------------------------
  // 2. Search institutions
  // -----------------------------------

  const institution =
    await findInstitutionByEmail(normalizedEmail);

  if (institution) {
    const passwordMatches = await bcrypt.compare(
      password,
      institution.password_hash
    );

    if (!passwordMatches) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    const role = "institution";

    const token = jwt.sign(
      {
        userId: institution.id,
        role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d"
      }
    );

    return {
      token,
      role,
      user: {
        id: institution.id,
        name: institution.name,
        type: institution.type,
        email: institution.email
      }
    };
  }

  // Neither table contained this email
  const error = new Error("Invalid email or password");
  error.statusCode = 401;
  throw error;
};