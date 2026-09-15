import { supabase } from "../config/supabase.js";


export const findChildByStudentCode = async ({
  institutionId,
  studentCode
}) => {
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("student_code", studentCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const createChild = async ({
  parentId,
  institutionId,
  name,
  studentCode
}) => {
  const { data, error } = await supabase
    .from("children")
    .insert({
      parent_id: parentId,
      institution_id: institutionId,
      name,
      student_code: studentCode
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const findChildById = async ({
  childId,
  institutionId
}) => {
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("id", childId)
    .eq("institution_id", institutionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const deactivateChildById = async (childId) => {
  const { data, error } = await supabase
    .from("children")
    .update({ is_active: false })
    .eq("id", childId)
    .select("id, name, student_code, is_active")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};