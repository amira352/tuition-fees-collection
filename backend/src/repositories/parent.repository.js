import { supabase } from "../config/supabase.js";


export const findParentByNationalIdHmac = async (
  nationalIdHmac
) => {
  const { data, error } = await supabase
    .from("parents")
    .select(`
      id,
      name,
      is_cib_customer
    `)
    .eq("national_id_hmac", nationalIdHmac)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const getParentChildrenWithFees = async (
  parentId
) => {
  const { data, error } = await supabase
    .from("children")
    .select(`
      id,
      name,
      student_code,

      institution:institutions (
        id,
        name,
        type
      ),

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
    .eq("parent_id", parentId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const createParent = async ({
  nationalIdHmac,
  nationalIdEncrypted,
  name
}) => {
  const { data, error } = await supabase
    .from("parents")
    .insert({
      national_id_hmac: nationalIdHmac,
      national_id_encrypted: nationalIdEncrypted,
      name
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};