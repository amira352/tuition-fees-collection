import { supabase } from "../config/supabase.js";

const BASE_FIELDS = `
  id,
  email,
  password_hash,
  branch,
  role,
  full_name,
  must_change_password,
  is_active
`;

export const findBankEmployeeByemail = async (email) => {
  const { data, error } = await supabase
    .from("bank_employees")
    .select(BASE_FIELDS)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const findBankEmployeeById = async (id) => {
  const { data, error } = await supabase
    .from("bank_employees")
    .select(BASE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const createBankEmployee = async ({
  email,
  passwordHash,
  branch,
  fullName,
  role,
  createdBy
}) => {
  const { data, error } = await supabase
    .from("bank_employees")
    .insert({
      email,
      password_hash: passwordHash,
      branch,
      full_name: fullName,
      role,
      must_change_password: true,
      is_active: true,
      created_by: createdBy
    })
    .select(`id, email, branch, role, full_name, must_change_password, is_active`)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateBankEmployeePassword = async (id, passwordHash) => {
  const { data, error } = await supabase
    .from("bank_employees")
    .update({
      password_hash: passwordHash,
      must_change_password: false,
      password_changed_at: new Date().toISOString()
    })
    .eq("id", id)
    .select(`id, email, role`)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const listBankEmployees = async () => {
  const { data, error } = await supabase
    .from("bank_employees")
    .select(`id, email, branch, role, full_name, must_change_password, is_active, created_at`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
