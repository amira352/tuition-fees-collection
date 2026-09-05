import { supabase } from "../config/supabase.js";

export const findBankEmployeeByemail = async (email) => {

  const { data, error } = await supabase
    .from("bank_employees")
    .select(`
      id,
      email,
      password_hash,
      branch
    `)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};