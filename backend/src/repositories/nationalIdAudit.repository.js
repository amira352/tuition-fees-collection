import { supabase } from "../config/supabase.js";


export const createNationalIdLookupAudit = async ({
  bankEmployeeId,
  nationalIdHmac,
  resultFound
}) => {
  const { error } = await supabase
    .from("national_id_lookup_audit")
    .insert({
      bank_employee_id: bankEmployeeId,
      national_id_hmac: nationalIdHmac,
      result_found: resultFound
    });

  if (error) {
    throw new Error(error.message);
  }
};