import { supabase } from "../config/supabase.js";


// INSTITUTIONS
export const findInstitutionByIdForAdmin = async (institutionId) => {
  const { data, error } = await supabase
    .from("institutions")
    .select("id, name, type, email")
    .eq("id", institutionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const deleteInstitutionById = async (institutionId) => {
  const { error } = await supabase
    .from("institutions")
    .delete()
    .eq("id", institutionId);

  if (error) {
    throw new Error(error.message);
  }
};


// BANK EMPLOYEES
export const findBankEmployeeByIdForAdmin = async (employeeId) => {
  const { data, error } = await supabase
    .from("bank_employees")
    .select(`
      id,
      email,
      full_name,
      branch,
      role,
      is_active
    `)
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const deactivateBankEmployeeById = async (employeeId) => {
  const { error } = await supabase
    .from("bank_employees")
    .update({
      is_active: false
    })
    .eq("id", employeeId);

  if (error) {
    throw new Error(error.message);
  }
};