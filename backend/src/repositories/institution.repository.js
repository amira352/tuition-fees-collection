import { supabase } from "../config/supabase.js";

export const findInstitutionByEmail = async (email) => {
  const { data, error } = await supabase
    .from("institutions")
    .select(`
      id,
      name,
      type,
      email,
      password_hash
    `)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};