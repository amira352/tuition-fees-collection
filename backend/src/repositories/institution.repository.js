import { supabase } from "../config/supabase.js";

const BASE_FIELDS = `
  id,
  name,
  type,
  email,
  password_hash,
  must_change_password,
  is_active
`;

// Same reasoning as bankEmployee.repository.js - no password_hash here, so
// there is nothing to forget to strip.
const PROFILE_FIELDS = `
  id,
  name,
  type,
  email,
  must_change_password,
  is_active,
  created_at,
  password_changed_at
`;

// For the Institution Profile page (phone/avatar/joined date) — a
// different shape than PROFILE_FIELDS above, which is for the generic
// /auth/me identity+security payload and has no reason to know about
// contact/branding fields.
const CONTACT_PROFILE_FIELDS = `
  id,
  name,
  type,
  email,
  phone,
  avatar_base64,
  is_active,
  created_at
`;

export const findInstitutionByEmail = async (email) => {
  const { data, error } = await supabase
    .from("institutions")
    .select(BASE_FIELDS)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const findInstitutionById = async (id) => {
  const { data, error } = await supabase
    .from("institutions")
    .select(BASE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const findInstitutionProfile = async (id) => {
  const { data, error } = await supabase
    .from("institutions")
    .select(PROFILE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const createInstitution = async ({
  name,
  type,
  email,
  passwordHash,
  createdBy
}) => {
  const { data, error } = await supabase
    .from("institutions")
    .insert({
      name,
      type,
      email,
      password_hash: passwordHash,
      must_change_password: true,
      is_active: true,
      created_by: createdBy
    })
    .select(`id, name, type, email, must_change_password, is_active`)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateInstitutionPassword = async (id, passwordHash) => {
  const { data, error } = await supabase
    .from("institutions")
    .update({
      password_hash: passwordHash,
      must_change_password: false,
      password_changed_at: new Date().toISOString()
    })
    .eq("id", id)
    .select(`id, email, name`)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const findInstitutionProfileById = async (id) => {
  const { data, error } = await supabase
    .from("institutions")
    .select(CONTACT_PROFILE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateInstitutionPhone = async (id, phone) => {
  const { data, error } = await supabase
    .from("institutions")
    .update({ phone })
    .eq("id", id)
    .select(CONTACT_PROFILE_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateInstitutionAvatar = async (id, avatarBase64) => {
  const { data, error } = await supabase
    .from("institutions")
    .update({ avatar_base64: avatarBase64 })
    .eq("id", id)
    .select(CONTACT_PROFILE_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const listInstitutions = async () => {
  const { data, error } = await supabase
    .from("institutions")
    .select(`id, name, type, email, must_change_password, is_active, created_at`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
