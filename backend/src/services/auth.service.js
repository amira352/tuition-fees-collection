import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { findBankEmployeeByemail } from "../repositories/bankEmployee.repository.js";


export const loginBankEmployee = async (email, password) => {

  // Find employee
  const employee = await findBankEmployeeByemail(email);

  if (!employee) {
    throw new Error("Invalid credentials");
  }

  // Compare entered password with hashed password
  const passwordMatches = await bcrypt.compare(
    password,
    employee.password_hash
  );

  if (!passwordMatches) {
    throw new Error("Invalid credentials");
  }

  // Create JWT token
  const token = jwt.sign(
    {
      id: employee.id,
      branch: employee.branch,
      role: "bank_employee"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );

  // Return employee data without password
  return {
    token,

    employee: {
      id: employee.id,
      email: employee.email,
      branch: employee.branch
    }
  };
};