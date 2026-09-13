import { getInstitutionFees, createFeeForStudent, findFeeForInstitution, updateInstitutionFee }
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

//edit fee
export const editInstitutionFee = async ({
  institutionId,
  feeId,
  feeType,
  period,
  amount,
  currency
}) => {

  // 1. Validate input
  if (!feeType || !feeType.trim()) {
    throw badRequest("Fee type is required");
  }

  if (!period || !period.trim()) {
    throw badRequest("Period is required");
  }

  if (
    amount === undefined ||
    amount === null ||
    amount === ""
  ) {
    throw badRequest("Amount is required");
  }

  if (
    Number.isNaN(Number(amount)) ||
    Number(amount) <= 0
  ) {
    throw badRequest("Amount must be greater than zero");
  }

  if (!currency || !currency.trim()) {
    throw badRequest("Currency is required");
  }


  // 2. Find the fee
  const existingFee =
    await findFeeForInstitution({
      feeId,
      institutionId
    });


  if (!existingFee) {
    throw notFound(
      "Fee not found for this institution"
    );
  }


  // 3. Calculate the new outstanding amount
  const oldAmount = Number(existingFee.amount);

  const oldOutstanding =
    Number(existingFee.outstanding_amount);

  const newAmount = Number(amount);

  /*
   * Keep the amount already paid by the parent.
   *
   * Example:
   *
   * Original fee       = 1000
   * Outstanding        = 600
   * Already paid       = 400
   *
   * New fee amount      = 1200
   * New outstanding     = 800
   */

  const amountAlreadyPaid =
    oldAmount - oldOutstanding;


  const newOutstandingAmount =
    newAmount - amountAlreadyPaid;


  if (newOutstandingAmount < 0) {
    throw badRequest(
      "The new amount cannot be less than the amount already paid"
    );
  }


  // 4. Determine the new status
  let newStatus = "unpaid";

  if (newOutstandingAmount === 0) {
    newStatus = "paid";
  } else if (newOutstandingAmount < newAmount) {
    newStatus = "partially_paid";
  }


  // -----------------------------------------
  // 5. Update the fee
  // -----------------------------------------

  const updatedFee =
    await updateInstitutionFee({
      feeId,
      feeType: feeType.trim(),
      period: period.trim(),
      amount: newAmount,
      currency: currency.trim().toUpperCase(),
      outstandingAmount: newOutstandingAmount,
      status: newStatus
    });


  // -----------------------------------------
  // 6. Return result
  // -----------------------------------------

  return {
    message: "Fee updated successfully",

    student: {
      id: existingFee.children.id,
      name: existingFee.children.name,
      student_code: existingFee.children.student_code
    },

    fee: updatedFee
  };
};