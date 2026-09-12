import { supabase } from "../config/supabase.js";


export const upsertFee = async ({
  childId,
  feeType,
  period,
  amount,
  currency
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
        status: "unpaid"
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