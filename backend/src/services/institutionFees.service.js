import { getInstitutionFees, createFeeForStudent }
  from "../repositories/fee.repository.js";

import {
  findInstitutionById,
} from "../repositories/institution.repository.js";

import {
  findChildByStudentCode,
} from "../repositories/children.repository.js";


export const getInstitutionFeesService = async (institutionId) => {

  const children =
    await getInstitutionFees(institutionId);

  return {
    institution_id: institutionId,
    children
  };
};


const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};


const notFound = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};


export const createInstitutionFee = async ({
  institutionId,
  studentCode,
  feeType,
  period,
  amount,
  currency
}) => {

  // 1. Validate student code
  if (!studentCode || !studentCode.trim()) {
    throw badRequest("Student code is required");
  }

  // 2. Validate fee information
  if (!feeType || !feeType.trim()) {
    throw badRequest("Fee type is required");
  }

  if (!period || !period.trim()) {
    throw badRequest("Period is required");
  }

  if (amount === undefined || amount === null || amount === "") {
    throw badRequest("Amount is required");
  }

  if (Number.isNaN(Number(amount)) || Number(amount) <= 0) {
    throw badRequest("Amount must be greater than zero");
  }

  if (!currency || !currency.trim()) {
    throw badRequest("Currency is required");
  }

  // 3. Check institution
  // -----------------------------------------

  const institution =
    await findInstitutionById(institutionId);

  if (!institution) {
    throw notFound("Institution not found");
  }

  if (!institution.is_active) {
    throw badRequest("Institution is inactive");
  }


  // 4. Find the student
  const student =
    await findChildByStudentCode({
      institutionId,
      studentCode: studentCode.trim()
    });

  if (!student) {
    throw notFound(
      "Student with this code was not found in this institution"
    );
  }


  // 5. Create the fee
  const fee =
    await createFeeForStudent({
      childId: student.id,
      feeType: feeType.trim(),
      period: period.trim(),
      amount: Number(amount),
      currency: currency.trim().toUpperCase()
    });

  // 6. Return result
  return {
    message: "Fee created successfully",

    student: {
      id: student.id,
      name: student.name,
      student_code: student.student_code
    },

    fee
  };
};