import { supabase } from "../config/supabase.js";


export const upsertFee = async ({
  childId,
  feeType,
  period,
  amount,
  currency,
  discountPercentage,
  netAmount,
  description
}) => {
  const { data, error } = await supabase
    .from("fees")
    .upsert(
      {
        child_id: childId,
        fee_type: feeType,
        period,
        amount,
        currency,
        outstanding_amount: amount,
        status: "unpaid",
        discount_percentage: discountPercentage,
        net_amount: netAmount,
        description: description || null
      },
      {
        onConflict: "child_id,fee_type,period"
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const getInstitutionFees = async (institutionId) => {
  const { data, error } = await supabase
    .from("children")
    .select(`
      id,
      name,
      student_code,
      parent_id,
      fees (
        id,
        fee_type,
        period,
        amount,
        currency,
        outstanding_amount,
        status
      )
    `)
    .eq("institution_id", institutionId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const createFeeForStudent = async ({
  childId,
  feeType,
  period,
  amount,
  currency
}) => {

  const { data, error } = await supabase
    .from("fees")
    .insert({
      child_id: childId,
      fee_type: feeType,
      period,
      amount,
      currency,
      outstanding_amount: amount,
      status: "unpaid"
    })
    .select(`
      id,
      child_id,
      fee_type,
      period,
      amount,
      currency,
      outstanding_amount,
      status,
      created_at
    `)
    .single();

if (error) {
  if (
    error.code === "23505" &&
    error.message.includes('unique constraint "unique_fee"')
  ) {
    const duplicateError = new Error(
      "This fee already exists for this student"
    );

    duplicateError.statusCode = 409;

    throw duplicateError;
  }

  throw new Error(error.message);
}

  return data;
};

// Find a fee that belongs to a child enrolled
// in the specified institution
export const findFeeForInstitution = async ({
  feeId,
  institutionId
}) => {

  const { data, error } = await supabase
    .from("fees")
    .select(`
      id,
      child_id,
      fee_type,
      period,
      amount,
      currency,
      outstanding_amount,
      status,
      created_at,
      children!inner (
        id,
        name,
        student_code,
        institution_id
      )
    `)
    .eq("id", feeId)
    .eq("children.institution_id", institutionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


// Update the fee
export const updateInstitutionFee = async ({
  feeId,
  feeType,
  period,
  amount,
  currency,
  outstandingAmount,
  status
}) => {

  const { data, error } = await supabase
    .from("fees")
    .update({
      fee_type: feeType,
      period,
      amount,
      currency,
      outstanding_amount: outstandingAmount,
      status
    })
    .eq("id", feeId)
    .select(`
      id,
      child_id,
      fee_type,
      period,
      amount,
      currency,
      outstanding_amount,
      status,
      created_at
    `)
    .single();

  if (error) {

    if (
      error.code === "23505" &&
      error.message.includes('unique constraint "unique_fee"')
    ) {

      const duplicateError = new Error(
        "This fee already exists for this student"
      );

      duplicateError.statusCode = 409;

      throw duplicateError;
    }

    throw new Error(error.message);
  }

  return data;
};